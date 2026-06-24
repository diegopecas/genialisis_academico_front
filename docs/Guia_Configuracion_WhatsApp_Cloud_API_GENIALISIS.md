# Guía de Configuración — WhatsApp Business Cloud API Multi-Tenant (GENIALISIS)

**Última actualización:** Febrero 10, 2026
**Plataforma:** GENIALISIS — Sistema educativo multi-tenant
**Dominio API:** `api.genialisis.com`

---

## Resumen de Arquitectura

```
Teléfono del papá → WhatsApp → Meta Cloud API → Webhook → BD Maestra → Resuelve Tenant → BD del Jardín → Guarda mensaje
```

- **Webhook URL:** `https://api.genialisis.com/webhooks/whatsapp`
- **Verify Token:** `1234abcd` (almacenado en BD maestra)
- **Archivo webhook:** `/webhook/index.php` (autónomo, NO depende de Flight)
- **Ruta pública en index.php raíz:** detecta `/webhooks/whatsapp` y ejecuta el webhook

---

## Prerequisitos Generales (ya configurados una vez)

### 1. App de Meta Developers
- **URL:** https://developers.facebook.com/apps/
- **App:** "chat wa" (ID: 1974576826626963)
- **Tipo:** Negocios
- **Modo:** Activo (Live, NO Desarrollo)
- **Producto agregado:** WhatsApp

### 2. Meta Business Manager
- **URL:** https://business.facebook.com/
- **Portfolio:** Liceo Lumen
- **Verificación del negocio:** ✅ Verificado
- **Método de pago:** Configurado (Mastercard *2138)

### 3. Configuración básica de la app (Configuración de la app → Básica)
- **URL política de privacidad:** `https://genialisis.com/`
- **Eliminación de datos:** `https://genialisis.com/`
- **Categoría:** Educación
- **Ícono:** Subido (1024x1024)

### 4. BD Maestra (`genialisis-master-prod`)
Tabla `tenants_whatsapp_config`:
```sql
CREATE TABLE tenants_whatsapp_config (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_tenant INT NOT NULL,
  phone_number_id VARCHAR(50) NOT NULL,
  wa_business_account_id VARCHAR(50) DEFAULT NULL,
  display_phone_number VARCHAR(20) DEFAULT NULL,
  access_token TEXT NOT NULL,
  verify_token VARCHAR(200) NOT NULL,
  app_secret VARCHAR(200) DEFAULT NULL,
  api_version VARCHAR(10) DEFAULT 'v23.0',
  activo TINYINT(1) DEFAULT 1,
  fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_phone_number_id (phone_number_id)
);
```

### 5. BD del Tenant (ej: `lumen_academico_prod`)
Tablas necesarias: `wa_contactos`, `wa_conversaciones`, `wa_mensajes`
La tabla `wa_mensajes` debe tener las columnas `canal` e `id_persona_remitente`:
```sql
ALTER TABLE wa_mensajes ADD COLUMN canal ENUM('whatsapp','interno') DEFAULT 'whatsapp' AFTER direccion;
ALTER TABLE wa_mensajes ADD COLUMN id_persona_remitente INT NULL AFTER canal;
```

---

## Pasos para Agregar un Nuevo Jardín (Nuevo Número)

### Paso 1: Preparar el número de teléfono

⚠️ **CRÍTICO:** El número NO puede tener WhatsApp ni WhatsApp Business instalado en un teléfono. Si lo tiene:
1. Abrir WhatsApp Business en el teléfono
2. Ir a Configuración → Cuenta → **Eliminar cuenta**
3. Esperar unos minutos para que Meta libere el número

### Paso 2: Agregar el número en Meta Business Manager

1. Ir a https://business.facebook.com/ → Cuentas de WhatsApp
2. Seleccionar la WABA del jardín (o crear una nueva)
3. Pestaña "Números de teléfono" → Agregar número
4. Verificar el número con código SMS o llamada
5. Anotar:
   - **Phone Number ID** (ej: `1017464821441218`)
   - **WABA ID** (ej: `1133400618157847`)

### Paso 3: Registrar el número en la Cloud API

Ir al Graph API Explorer: https://developers.facebook.com/tools/explorer/

1. Seleccionar app "chat wa"
2. Permisos: `whatsapp_business_management`, `whatsapp_business_messaging`
3. Ejecutar **POST**:
```
{PHONE_NUMBER_ID}/register
```
Con parámetros:
- `messaging_product` = `whatsapp`
- `pin` = `123456` (elegir un PIN de 6 dígitos y anotarlo)

Debe responder: `{ "success": true }`

### Paso 4: Suscribir la app al WABA

⚠️ **CRÍTICO — Sin esto, los mensajes reales NO llegan al webhook (el "Shadow Delivery Problem")**

En el Graph API Explorer, ejecutar **POST**:
```
{WABA_ID}/subscribed_apps
```
Debe responder: `{ "success": true }`

**Verificar con GET:**
```
{WABA_ID}/subscribed_apps
```
Debe mostrar tu app en la lista.

### Paso 5: Configurar webhook en Meta Developers

1. Ir a https://developers.facebook.com/apps/ → "chat wa"
2. **WhatsApp → Configuración** (NO la sección genérica de Webhooks)
3. URL de devolución de llamada: `https://api.genialisis.com/webhooks/whatsapp`
4. Token de verificación: `1234abcd`
5. Clic en **"Verificar y guardar"**
6. En "Campos del webhook", buscar **`messages`** → Activar toggle "Suscribirse"

**También en Webhooks (genérico):**
1. Seleccionar producto: "WhatsApp Business Account"
2. Misma URL y token
3. Campo `messages` → Suscribirse

### Paso 6: Obtener Access Token permanente

1. En Meta Business Manager → Configuración → Usuarios del sistema
2. Crear usuario del sistema (si no existe)
3. Asignar permisos de WhatsApp
4. Generar token permanente
5. Guardar el token (es largo, empieza con `EAAc...`)

### Paso 7: Insertar configuración en BD maestra

```sql
INSERT INTO tenants_whatsapp_config (
  id_tenant, phone_number_id, wa_business_account_id,
  display_phone_number, access_token, verify_token,
  app_secret, api_version, activo
) VALUES (
  {ID_DEL_TENANT},           -- id del tenant en tabla tenants
  '{PHONE_NUMBER_ID}',        -- ej: '1017464821441218'
  '{WABA_ID}',                -- ej: '1133400618157847'
  '+57 XXX XXXXXXX',          -- número visible
  '{ACCESS_TOKEN_PERMANENTE}', -- el token largo
  '1234abcd',                  -- verify token
  '{APP_SECRET}',              -- clave secreta de la app
  'v23.0',
  1
);
```

El `app_secret` se encuentra en: Meta Developers → app → Configuración de la app → Básica → "Clave secreta de la app" → Mostrar.

### Paso 8: Verificar que las tablas WA existen en la BD del tenant

```sql
-- Verificar existencia
SHOW TABLES LIKE 'wa_%';

-- Si no existen, crearlas (ver scripts de creación originales)
-- Verificar columnas nuevas
DESCRIBE wa_mensajes;
-- Debe tener: canal ENUM('whatsapp','interno') y id_persona_remitente INT
```

### Paso 9: Probar

1. Enviar un mensaje de WhatsApp al número del jardín desde otro teléfono
2. Revisar el log: `webhook/webhook_errors.log`
   - ✅ Debe decir: `Mensaje recibido de XXXXXXXXXXX - ID: wamid.xxx`
   - ❌ Si dice `No se encontró tenant para phone_number_id`: revisar el INSERT en BD maestra
3. Revisar la BD del tenant:
```sql
SELECT * FROM wa_mensajes ORDER BY id DESC LIMIT 5;
SELECT * FROM wa_contactos ORDER BY id DESC LIMIT 5;
SELECT * FROM wa_conversaciones ORDER BY id DESC LIMIT 5;
```

---

## Troubleshooting

### El webhook no recibe nada (sin errores en log)

| Causa | Solución |
|-------|----------|
| App no suscrita al WABA | POST `{WABA_ID}/subscribed_apps` en Graph Explorer |
| Campo `messages` no suscrito | Activar en WhatsApp → Configuración → Campos del webhook |
| App en modo Desarrollo | Cambiar a Live en Configuración de la app |
| Número tiene WhatsApp instalado | Eliminar cuenta de WhatsApp del teléfono, luego registrar con POST `{PHONE_NUMBER_ID}/register` |
| Número en estado "Pendiente" | Completar verificación del número |

### El webhook recibe pero no guarda

| Causa | Solución |
|-------|----------|
| Tabla no existe en BD maestra | Crear `tenants_whatsapp_config` |
| Tenant no encontrado | Verificar `phone_number_id` en BD maestra coincide con el de Meta |
| Columna `canal` no existe | Ejecutar ALTER TABLE en BD del tenant |
| Config de tenant no encontrada | Verificar archivo `config/tenants/{codigo}.env.php` existe |

### Verificar estado del número

En Graph API Explorer, GET:
```
{PHONE_NUMBER_ID}?fields=verified_name,code_verification_status,status
```

### Verificar suscripción del WABA

En Graph API Explorer, GET:
```
{WABA_ID}/subscribed_apps
```

---

## Archivos Clave del Backend

| Archivo | Función |
|---------|---------|
| `index.php` (raíz) | Detecta `/webhooks/whatsapp` y redirige |
| `webhook/index.php` | Procesa webhook (autónomo, sin Flight) |
| `config/master.env.php` | Conexión BD maestra |
| `config/tenants/{codigo}.env.php` | Conexión BD del tenant |
| `webhook/webhook_errors.log` | Log de errores y mensajes recibidos |

---

## Datos del Jardín Lumen (Referencia)

| Campo | Valor |
|-------|-------|
| Tenant ID | 1 |
| Código tenant | lumen |
| Phone Number ID | 1017464821441218 |
| WABA ID | 1133400618157847 |
| Número | +57 322 4551070 |
| Nombre visible | Liceo Lumen |
| PIN de registro | 123456 |
| Verify Token | 1234abcd |
| App ID | 1974576826626963 |

---

## Orden de Operaciones (Checklist Rápido)

- [ ] Número libre (sin WhatsApp instalado en teléfono)
- [ ] Número agregado en Meta Business Manager
- [ ] Número verificado (código SMS/llamada)
- [ ] POST `{PHONE_NUMBER_ID}/register` → success: true
- [ ] POST `{WABA_ID}/subscribed_apps` → success: true
- [ ] Webhook URL configurada en WhatsApp → Configuración
- [ ] Campo `messages` suscrito
- [ ] App en modo Live (no Desarrollo)
- [ ] INSERT en `tenants_whatsapp_config` (BD maestra)
- [ ] Tablas `wa_*` creadas en BD del tenant
- [ ] Columnas `canal` e `id_persona_remitente` en `wa_mensajes`
- [ ] Enviar mensaje de prueba → verificar log y BD
