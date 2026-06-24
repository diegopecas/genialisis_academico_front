# GENIALISIS — Arquitectura multi-tenant

Documento del modelo multi-tenant del sistema: cómo se aíslan los datos de cada institución (tenant) sobre una base de datos compartida, y cómo provisionar un tenant nuevo.

## 1. Resumen

GENIALISIS es un SaaS multi-tenant para instituciones educativas. Varios tenants (instituciones) comparten la misma base de datos física, y se separan lógicamente por una columna `id_tenant`. Cuando una base acumula demasiados tenants, se crea otra y los nuevos tenants apuntan a ella. Cada tenant conserva su propio archivo de configuración.

**Stack:** Angular 19 (front) + PHP/Flight (back) + MariaDB 10.11 (GoDaddy). Auth con JWT + header `X-Tenant`.

## 2. Modelo de datos

Las tablas se dividen en dos grupos:

| Grupo | PK `id` | `id_tenant` | Descripción |
|-------|---------|-------------|-------------|
| Datos de tenant | `CHAR(36)` UUID (`DEFAULT uuid()`) | Sí, `INT` | Datos propios de cada institución (personas, colaboradores, finanzas, estudiantes, etc.) |
| Catálogo global | `INT` | No | Catálogos compartidos por todos (paises, generos, estados, tipos universales, etc.) |

**Regla práctica:** si la tabla tiene columna `id_tenant`, se filtra por tenant; si no la tiene, es global y no se filtra.

**UUID:** las tablas de tenant usan `id CHAR(36)` generado por la base con `DEFAULT uuid()` (MariaDB nativo, v1; `UUID_v7()` no está disponible en el servidor). Como `lastInsertId()` no funciona con PK no autoincremental, los métodos `new()` generan el UUID en PHP e insertan el `id` explícito, devolviéndolo.

## 3. Identificación del tenant

El frontend envía el header `X-Tenant` con el código de la institución (ej. `lumen`). En `index.php`:

1. Se lee y sanitiza el header.
2. Se carga `config/tenants/{codigo}.env.php`, que define las credenciales de BD **y** la constante `TENANT_ID` (el id numérico del tenant).
3. Se fija el contexto con `TenantContext::setCodigo($codigo)`.

> **Principio de seguridad:** el `id_tenant` con el que se filtran los datos SIEMPRE proviene del servidor (la constante `TENANT_ID` del `.env.php`), NUNCA del request. El cliente no puede falsificarlo.

## 4. Helper TenantContext

`services/tenant-context.service.php` centraliza el acceso al tenant. Todos los services lo usan en vez de leer la constante directamente.

| Método | Devuelve |
|--------|----------|
| `TenantContext::setCodigo($c)` | Fija el código validado (lo llama `index.php`) |
| `TenantContext::id()` | El `TENANT_ID` numérico. Falla cerrado (HTTP 500) si no está definido o es inválido. |
| `TenantContext::codigo()` | El código string del tenant (ej. `lumen`) |

El comportamiento "falla cerrado" es intencional: si no hay un `TENANT_ID` válido, se corta la petición en vez de devolver datos sin aislar.

## 5. Filtro en los services

Cada service de una tabla de tenant aplica el filtro en todas sus operaciones, usando `TenantContext::id()` con parámetro preparado (`PDO::PARAM_INT`):

- **SELECT:** `WHERE id_tenant = :id_tenant`
- **INSERT:** se incluye `id_tenant` con el valor del contexto
- **UPDATE / DELETE:** se incluye `id_tenant` en el `WHERE` para no afectar datos de otro tenant

Los services de tablas globales no se filtran.

## 6. Autenticación

- La clave de firma JWT vive en `config/jwt.env.php` (constante `JWT_SECRET_KEY`), fuera del código fuente. `jwt.service.php` la lee vía `getSecretKey()` y falla cerrado si no está definida.
- Al iniciar sesión, el token JWT incluye el **tenant** firmado dentro de sus datos (`generarToken($userData, $permisos, $tenant)`).
- `index.php` tiene un `Flight::before('start')` central que, para toda ruta no pública, exige: (a) token válido, y (b) que el tenant firmado en el token coincida con el `X-Tenant` del request. Si no coinciden, responde 403 (`requerirTenant`). Esto impide que un usuario autenticado en un tenant acceda a otro cambiando el header.
- **Rutas públicas** (no exigen token): `/`, `/usuarios-auth` (login) y los endpoints de login biométrico (`/webauthn/auth/opciones`, `/webauthn/auth/verificar`, `/webauthn/disponible`). Además, los webhooks (firma, WhatsApp), el pre-login y el callback de Google Calendar se resuelven antes del router principal y no pasan por esta validación.
- La validación de **permisos por acción** se maneja en el frontend; el backend valida token + tenant, no permiso por ruta. El array de permisos viaja dentro del JWT.

## 7. Frontend

- El header `X-Tenant` lo agrega un interceptor a cada petición.
- El componente de tablas oculta por defecto la columna del `id` (UUID), ya que un UUID no aporta a la vista. El id sigue disponible en los datos para acciones y edición. Para mostrarlo: `[mostrarColumnaId]="true"`.

## 8. Cómo provisionar un tenant nuevo

1. **Registrar el tenant en la base master:** insertar una fila en `tenants` (código único, nombre). El `id` autoincremental que se genere es el `TENANT_ID` de esa institución.
2. **Crear el archivo de configuración:** `config/tenants/{codigo}.env.php` con las credenciales de la BD que le corresponda (la BD compartida vigente) y `define('TENANT_ID', N)` con el id del paso 1.
3. **Asignar accesos de usuarios:** registrar en `usuarios_tenants` (master) qué usuarios pueden entrar a ese tenant.
4. **Datos iniciales:** si el tenant arranca con datos (o si se migran datos existentes), asegurarse de que todas las filas de sus tablas tengan `id_tenant = N`. Un `id_tenant` en NULL o con valor equivocado hace que el filtro no encuentre los datos.
5. **Catálogos globales:** no requieren nada; son compartidos por todos los tenants.

## 9. Notas de operación

- **Verificar coincidencia de tenant:** si un usuario no puede ver sus datos (login correcto pero listados vacíos, o "contraseña incorrecta" con respuesta vacía), revisar que el `id_tenant` real de las filas (`SELECT id_tenant FROM tabla ...`) coincida con el `TENANT_ID` del `.env.php`.
- **Zona horaria:** el servidor corre en UTC; el código sensible a fechas fuerza `America/Bogota`.
- **BD compartida:** al añadir tenants, vigilar el tamaño de la base; cuando convenga, crear una nueva base y apuntar los tenants nuevos a ella vía su `.env.php`.
- **Reversibilidad de la migración UUID:** la migración conservó columnas `*_int_old` (id e FKs INT viejos) como red de seguridad. Se eliminan solo en la limpieza final, cuando el sistema corre estable con UUID.
