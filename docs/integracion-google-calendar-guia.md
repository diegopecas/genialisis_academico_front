# Integración Google Calendar + Tasks — Guía de Implementación

## Arquitectura General

La integración permite sincronizar tareas y actividades del sistema con Google Calendar y Google Tasks. Usa OAuth 2.0 con una cuenta Gmail institucional como organizadora. Los colaboradores reciben invitaciones automáticas.

**3 tipos de sincronización:**
- **Tarea** → Google Tasks API (lista de pendientes, solo fecha límite)
- **Reunión** → Google Calendar API (evento con múltiples asistentes)
- **Evento individual** → Google Calendar API (evento solo para el colaborador)

---

## 1. Google Cloud Console

### 1.1 Crear proyecto
- Ir a https://console.cloud.google.com/
- Iniciar sesión con la cuenta Gmail que será organizadora
- Crear proyecto nuevo (ej: "PSYCRONIA")

### 1.2 Habilitar APIs
Desde Biblioteca de APIs, habilitar:
- **Google Calendar API**
- **Google Tasks API**

### 1.3 Pantalla de consentimiento OAuth
- Tipo: **Usuarios externos**
- Nombre de la app: nombre del proyecto
- Correo de asistencia: el Gmail organizador
- Correo de contacto: el Gmail organizador

### 1.4 Acceso a datos (Scopes)
Agregar 2 permisos:
- `.../auth/calendar.events` (sensible) — Ver y editar eventos
- `.../auth/tasks` (sensible) — Crear, editar, organizar tareas

### 1.5 Usuarios de prueba
Agregar el Gmail organizador como usuario de prueba (obligatorio mientras la app esté en modo "Prueba").

### 1.6 Crear credenciales OAuth
- Tipo: **Aplicación web**
- Orígenes autorizados de JavaScript: `https://app.tudominio.com`
- URIs de redireccionamiento: `https://api.tudominio.com/google-calendar/callback`
- Guardar el **Client ID** y **Client Secret**

---

## 2. Base de Datos

### 2.1 Tabla de configuración
```sql
CREATE TABLE `google_configuracion` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `clave` varchar(100) NOT NULL,
  `valor` longtext DEFAULT NULL,
  `descripcion` varchar(500) DEFAULT NULL,
  `fecha_actualizacion` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_google_configuracion_clave` (`clave`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

INSERT INTO `google_configuracion` (`clave`, `valor`, `descripcion`) VALUES
('client_id', 'TU_CLIENT_ID', 'Client ID de OAuth 2.0'),
('client_secret', 'TU_CLIENT_SECRET', 'Client Secret de OAuth 2.0'),
('redirect_uri', 'https://api.tudominio.com/google-calendar/callback', 'URI callback OAuth'),
('email_organizador', 'tucuenta@gmail.com', 'Correo organizador de eventos'),
('refresh_token', '', 'Token de refresco (se llena al conectar)'),
('access_token', '', 'Token de acceso (se renueva automáticamente)'),
('token_expira_en', '', 'Timestamp de expiración del access token');
```

### 2.2 Catálogo de clases de tarea
```sql
CREATE TABLE `clases_tareas` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(50) NOT NULL,
  `descripcion` varchar(200) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_spanish_ci;

INSERT INTO `clases_tareas` (`id`, `nombre`, `descripcion`) VALUES
(1, 'Tarea', 'Google Tasks del colaborador'),
(2, 'Reunión', 'Evento con múltiples asistentes'),
(3, 'Evento individual', 'Evento individual en el calendario');
```

### 2.3 Campos en tabla de tareas
```sql
ALTER TABLE `tareas_colaboradores`
ADD COLUMN `id_clase_tarea` int(11) DEFAULT 3,
ADD COLUMN `google_event_id` varchar(255) DEFAULT NULL,
ADD COLUMN `correos_asistentes` text DEFAULT NULL;
```

---

## 3. Backend PHP

### 3.1 Archivos
```
services/
  ├── google-configuracion.service.php   (CRUD clave-valor)
  ├── google-calendar.service.php        (OAuth + crear eventos/tareas)
  └── clases-tareas.service.php          (catálogo)

routes/
  └── google.routes.php                  (todas las rutas)
```

### 3.2 Flujo OAuth (multi-tenant)

**Problema:** El callback de Google es una URL fija que no lleva header `X-Tenant`.

**Solución:** Usar el parámetro `state` de OAuth 2.0 para pasar el tenant.

1. El admin pide autorizar → PHP lee `X-Tenant` del header y lo mete en `state`
2. Google redirige al callback con `?code=XXX&state=TENANT`
3. El callback extrae el tenant del `state`, carga manualmente el archivo de config del tenant, crea conexión PDO directa, intercambia el code por tokens y los guarda

**Clave en index.php:** El callback debe ser **ruta pública** (antes de la validación de tenant):

```php
// En index.php, ANTES del bloque de validación de X-Tenant
if (strpos($requestUri, '/google-calendar/callback') !== false) {
    require 'flight/Flight.php';
    require_once __DIR__ . '/services/google-configuracion.service.php';
    require_once __DIR__ . '/services/google-calendar.service.php';

    Flight::route('GET /google-calendar/callback', [GoogleCalendarService::class, 'callback']);

    Flight::start();
    exit(0);
}
```

### 3.3 Tokens

- **access_token**: dura 1 hora, se refresca automáticamente
- **refresh_token**: permanente (se obtiene una sola vez al conectar)
- Antes de cada llamada a Google, se valida si el access_token expiró (con 5 min de margen). Si expiró, se usa el refresh_token para obtener uno nuevo

### 3.4 Crear evento según clase

```
clase 1 (Tarea)    → POST https://tasks.googleapis.com/tasks/v1/lists/@default/tasks
clase 2 (Reunión)  → POST https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=all
clase 3 (Evento)   → POST https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=all
```

Diferencia entre Reunión y Evento: la Reunión agrega como attendees al colaborador + organizador + correos extra del campo `correos_asistentes`. El Evento solo agrega al colaborador.

### 3.5 Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/google-calendar/autorizar` | Genera URL OAuth (requiere tenant) |
| GET | `/google-calendar/callback` | Callback OAuth (ruta pública) |
| GET | `/google-calendar/verificar-conexion` | Verifica si hay refresh_token |
| POST | `/google-calendar/evento-tarea` | Crea evento/tarea según clase |
| POST | `/google-calendar/evento-actividad` | Crea evento desde actividad |

---

## 4. Frontend Angular

### 4.1 Services
```
services/
  ├── google-configuracion.service.ts    (CRUD configuración)
  ├── google-calendar.service.ts         (autorizar, verificar, crear eventos)
  └── clases-tareas.service.ts           (catálogo)
```

### 4.2 Componentes de configuración
- Lista de parámetros (clave-valor) con botón "Conectar Google Calendar"
- Detecta query params del callback para mostrar mensaje de éxito/error
- Muestra estado de conexión (conectado/no conectado)

### 4.3 Formulario de tareas
- Selector de "Clase" (Tarea/Reunión/Evento individual)
- Campo de correos con píldoras (solo visible cuando clase = Reunión)
- Correos se agregan con Enter o coma, se validan con regex

### 4.4 Acciones en tablas
- Botón "Sincronizar Calendar" aparece solo si `google_event_id` está vacío
- Confirmación con SweetAlert2 antes de sincronizar
- Loading spinner durante la llamada
- Al sincronizar, el botón desaparece (ya fue sincronizada)

---

## 5. Flujo completo resumido

```
[Admin] → Configuración Google → "Conectar Google Calendar"
  → Angular llama GET /google-calendar/autorizar
  → PHP devuelve URL de Google con tenant en state
  → Angular redirige a Google
  → Admin autoriza con Gmail
  → Google redirige a /google-calendar/callback?code=XXX&state=TENANT
  → PHP (ruta pública) extrae tenant del state
  → PHP carga config del tenant, intercambia code por tokens, los guarda
  → PHP redirige al frontend con mensaje OK

[Admin] → Gestión de Tiempo → Tareas → "Sincronizar Calendar"
  → Angular llama POST /google-calendar/evento-tarea con id_tarea
  → PHP lee la tarea, verifica clase (1/2/3)
  → PHP obtiene access_token (refresca si expiró)
  → PHP llama a Google Tasks API o Calendar API según clase
  → Google crea el evento/tarea y envía invitación al colaborador
  → PHP guarda google_event_id en la BD
  → El botón de sincronizar desaparece
```
