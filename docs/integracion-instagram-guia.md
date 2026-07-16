# Integración Instagram — Guía de Implementación

## Arquitectura General

El módulo permite publicar en la cuenta de Instagram del tenant las imágenes y videos que ya están cargados en una galería. Se opera desde **Galerías → Gestionar imágenes**: se seleccionan los medios y se publica.

Usa la **Instagram API con Instagram Login** (host `graph.instagram.com`), no el flujo por Página de Facebook. Es una decisión con consecuencias: los tokens de un flujo no sirven en el otro.

**3 tipos de publicación:**

| Tipo | Endpoint | Selección requerida | Salida |
|---|---|---|---|
| **Feed** | `POST /instagram/publicar` | 1 a 10 imágenes, sin videos | Imagen única o carrusel |
| **Historia** | `POST /instagram/publicar-historia` | 1 o más imágenes, sin videos | Una historia por imagen (24h) |
| **Reel** | `POST /instagram/publicar-reel` | Exactamente 1 video | Reel (+ feed con `share_to_feed`) |

**Diferencia clave con Google Calendar:** allá el backend hace el OAuth completo (`/google-calendar/autorizar` → callback → guarda `refresh_token`). Aquí **no hay flujo OAuth**. El backend solo sabe *refrescar* un token vigente; el token inicial se genera a mano en la consola de Meta y se inserta directo en la BD. Es la diferencia más importante de esta integración y la causa de que un token perdido no se pueda recuperar por código.

---

## 1. Consola de Meta

### 1.1 App

- App de Meta: **GENIALISIS Platform** — `1992075778404246` (= `META_APP_ID` en `master.env.php`)
- App de Instagram (vive dentro de la anterior): **GENIALISIS Platform-IG** — `981985638071396`
- Clave secreta de la app de Instagram: visible con "Mostrar" en la pantalla de configuración

> Los dos identificadores son distintos y no son intercambiables. `META_APP_ID` / `META_APP_SECRET` los usa **WhatsApp** (`wa-onboarding.service.php`), no Instagram. Si algún día se necesita `ig_exchange_token`, el `client_secret` que pide es la **Clave secreta de la app de Instagram**.

### 1.2 Requisitos de la cuenta

- Cuenta de Instagram **profesional** (Empresa o Creador)
- Cuenta **pública**
- Agregada a la app en la sección 1 de la pantalla de configuración

### 1.3 Generar el token

Ruta: `developers.facebook.com` → GENIALISIS Platform → **Instagram → Configuración de la API con inicio de sesión de empresa de Instagram**

> **No** usar "Configuración de la API con inicio de sesión con Facebook". Genera un token para `graph.facebook.com`, que este código no usa.

1. Sección **"1. Generar tokens de acceso"** → **"Agregar cuenta"** (si la cuenta no aparece)
2. Iniciar sesión con el Instagram del tenant, aceptar permisos
3. Anotar el **`ig_user_id`**: el número bajo el @usuario en la lista (empieza por `17841...`)
4. **"Generar token"** → marcar "I Understand" → copiar el token (empieza por `IGAA...`)

> El token se muestra **una sola vez**. No queda registrado en ningún lado de Meta ni del sistema.

### 1.4 Modo de la app

Development es suficiente mientras la cuenta esté agregada a la app. La revisión de la app (sección 4) solo hace falta si se va a publicar en cuentas de terceros que no estén en la app.

---

## 2. Base de Datos

### 2.1 Configuración por tenant

```sql
CREATE TABLE `instagram_config` (
  `id` char(36) NOT NULL,
  `id_tenant` int(11) NOT NULL,
  `ig_user_id` varchar(32) NOT NULL,
  `access_token` text NOT NULL,
  `token_expira_en` datetime DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_instagram_config_tenant` (`id_tenant`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

Carga inicial (manual, una vez por tenant):

```sql
INSERT INTO instagram_config
  (id, id_tenant, ig_user_id, access_token, token_expira_en, activo)
VALUES
  (UUID(), <id_tenant>, '<ig_user_id>', '<token>',
   DATE_ADD(NOW(), INTERVAL 60 DAY), 1);
```

- `UNIQUE KEY` por `id_tenant`: una sola cuenta de Instagram por tenant
- `activo = 1` es obligatorio — `obtenerConfig()` filtra por `id_tenant AND activo = 1`
- No hay columnas `app_id` / `app_secret`: por diseño, esas credenciales nunca viven en la BD

### 2.2 Publicaciones

```sql
CREATE TABLE `instagram_publicaciones` (
  `id` char(36) NOT NULL,
  `id_tenant` int(11) NOT NULL,
  `id_galeria` char(36) NOT NULL,
  `ig_container_id` varchar(64) DEFAULT NULL,
  `ig_media_id` varchar(64) DEFAULT NULL,
  `caption` text DEFAULT NULL,
  `cantidad_imagenes` int(11) NOT NULL DEFAULT 0,
  `tipo` varchar(20) NOT NULL DEFAULT 'feed',
  `estado` varchar(20) NOT NULL DEFAULT 'pendiente',
  `error_detalle` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_instagram_pub_tenant` (`id_tenant`),
  KEY `idx_instagram_pub_galeria` (`id_tenant`,`id_galeria`),
  KEY `idx_instagram_pub_estado` (`id_tenant`,`estado`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

Estados: `pendiente` → `publicada` | `error`. La fila se crea *antes* de llamar a Meta, para que un corte deje rastro.

### 2.3 Trazabilidad de medios publicados

```sql
CREATE TABLE `instagram_publicacion_imagenes` (
  `id` char(36) NOT NULL,
  `id_tenant` int(11) NOT NULL,
  `id_publicacion` char(36) NOT NULL,
  `id_galeria` char(36) NOT NULL,
  `id_imagen` char(36) NOT NULL,
  `tipo` varchar(20) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_ig_pub_img_galeria` (`id_tenant`,`id_galeria`),
  KEY `idx_ig_pub_img_imagen` (`id_tenant`,`id_imagen`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

Alimenta el mapa que marca en el front qué imágenes ya salieron y en qué tipo.

### 2.4 Columna en galerías

```sql
ALTER TABLE `galeria_imagenes`
  ADD COLUMN `tipo_media` varchar(20) NOT NULL DEFAULT 'imagen' AFTER `id_tenant`;
```

Distingue `imagen` de `video`. **Es la que decide si el botón de Reel se habilita.** El `DEFAULT 'imagen'` es silencioso: un video guardado antes de que esta columna existiera queda marcado como imagen y el botón nunca se activa.

---

## 3. Backend PHP

### 3.1 Archivos

```
services/
  └── instagram.service.php        (todo: config, token, normalización, publicación)

routes/
  └── instagram.routes.php         (rutas con tenant + JWT)

index.php                          (rutas públicas /ig-media y /ig-video)
config/master.env.php              (IG_MEDIA_SIGN_SECRET)
galeria_privada/<tenant>/          (medios originales)
galeria_privada/tmp/<tenant>/      (temporales normalizados)
```

### 3.2 Cómo llegan los medios a Meta

Meta **no recibe archivos**: recibe una URL y la descarga él mismo. Las galerías son privadas, así que el servicio expone URLs temporales firmadas:

```
GET /ig-media/{tenant}/{file}?exp={timestamp}&sig={hmac}   (imágenes, TTL 600s)
GET /ig-video/{tenant}?p={ruta}&exp={timestamp}&sig={hmac} (videos, TTL 1800s)
```

Firma: `hash_hmac('sha256', "{tenant}|{archivo}|{exp}", IG_MEDIA_SIGN_SECRET)`

**Estas dos rutas deben ser públicas** (resueltas en `index.php` antes de la validación de tenant/JWT), porque Meta descarga sin headers. Es el mismo patrón del callback de Google Calendar, por la misma razón: un tercero llega sin `X-Tenant`.

> `IG_MEDIA_SIGN_SECRET` es global, no por tenant, y no tiene nada que ver con Meta: protege nuestras propias URLs. Si se pierde, se genera una nueva y ya (`php -r "echo bin2hex(random_bytes(32));"`).

### 3.3 Tokens

- **No hay flujo OAuth.** El único endpoint de token que existe es `refresh_access_token` (`grant_type=ig_refresh_token`), que solo necesita un token vigente — por eso no lleva App Secret.
- El token dura **60 días**. `refrescarSiNecesario()` lo renueva cuando quedan **≤10 días** (`$umbralRefrescoDias`), y cada refresco reinicia los 60.
- El refresco es **perezoso**: solo corre si alguien llama un endpoint de Instagram dentro de esa ventana. Si el módulo no se usa entre el día 50 y el 60, el token muere.
- `POST /instagram/refrescar-token` fuerza el refresco. **Recomendado: cron semanal** para no depender del tráfico.
- Si el token expira, no hay recuperación por código: toca repetir la sección 1.3.

### 3.4 Normalización de imágenes (GD)

| Destino | Dimensión |
|---|---|
| Feed | 1080 × 1080 (1:1) |
| Historia | 1080 × 1920 (9:16) |

La foto se muestra completa sobre fondo difuminado — no se recorta. El resultado va a `galeria_privada/tmp/<tenant>/` y se borra en el `finally`.

Los videos **no** se normalizan: se sirve el original. Debe cumplir el formato de Reel (hasta 90s, vertical 9:16, MP4/MOV) o Meta lo rechaza.

### 3.5 Flujo de publicación en Meta

```
1. Crear contenedor    POST /{ig-user-id}/media
                       (carrusel: un contenedor hijo por imagen + uno padre)
2. Esperar listo       GET /{creation-id}?fields=status_code
                       (imágenes: 8 intentos x 2s | reel: 30 x 10s = ~5 min)
3. Publicar            POST /{ig-user-id}/media_publish
4. Permalink           GET /{media-id}?fields=permalink
```

### 3.6 Robustez (aprendido en producción)

- **Conexión PDO propia con ping/reconexión** (`self::db()`). El proceso es largo (GD + subidas a Meta) y MySQL cierra por inactividad: *"server has gone away"*. No usar `Flight::db()` aquí.
- **`register_shutdown_function`** marca la publicación como error si PHP muere a mitad.
- **Historias con rate limit**: pausa de 5s entre cada una, 3 reintentos con espera creciente (6s × intento).
- `@set_time_limit(0)` en los tres endpoints de publicación.

### 3.7 Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/instagram/estado` | Configurado, ig_user_id, días restantes del token |
| GET | `/instagram/imagenes-publicadas/@id_galeria` | Mapa `{id_imagen: [tipos]}` |
| POST | `/instagram/publicar` | Feed (1-10 imágenes) |
| POST | `/instagram/publicar-historia` | Historias (1..n imágenes) |
| POST | `/instagram/publicar-reel` | Reel (1 video) |
| POST | `/instagram/refrescar-token` | Fuerza el refresco |
| GET | `/ig-media/{tenant}/{file}` | **Pública.** Sirve imagen temporal firmada |
| GET | `/ig-video/{tenant}` | **Pública.** Sirve video firmado |

---

## 4. Frontend Angular

### 4.1 Services

```
services/
  └── instagram.service.ts    (estado, imagenesPublicadas, publicar,
                               publicarHistoria, publicarReel)
```

### 4.2 Componente

`galerias/gestionar-imagenes/` — tres botones, cada uno con su regla de habilitación:

```typescript
puedePublicarFeed      n >= 1 && n <= 10 && videosSeleccionados === 0
puedePublicarHistoria  n >= 1            && videosSeleccionados === 0
puedePublicarReel      n === 1           && videosSeleccionados === 1
```

donde `videosSeleccionados` cuenta los que tienen `tipoMedia === 'video'`, mapeado desde `img.tipo_media` del backend.

### 4.3 Comportamiento

- Al cargar la galería se consulta `obtenerImagenesPublicadas()` y se marca cada tarjeta con lo que ya salió
- Confirmación con SweetAlert2 antes de publicar; el caption es editable en el diálogo del feed
- `publicandoInstagram` bloquea los tres botones durante la operación
- Al terminar, enlace directo al permalink de Instagram

---

## 5. Flujo completo resumido

```
[Instalación, una vez por tenant]
  → Consola de Meta → Instagram → API con inicio de sesión de empresa
  → Agregar cuenta → Generar token → copiar (se muestra una sola vez)
  → INSERT INTO instagram_config (id_tenant, ig_user_id, access_token, ...)
  → Verificar: GET /instagram/estado → configurado: true

[Uso diario]
  → Galerías → Gestionar imágenes → seleccionar → "Publicar en feed"
  → Angular: POST /instagram/publicar {id_galeria, ids, caption}
  → PHP: obtenerConfig() → refrescarSiNecesario() (si quedan ≤10 días)
  → PHP: registra publicación 'pendiente'
  → PHP: normaliza con GD a 1080x1080 → tmp/<tenant>/
  → PHP: genera URL firmada /ig-media/... (TTL 600s)
  → PHP: POST /{ig-user-id}/media (Meta descarga la URL)
  → PHP: poll del contenedor hasta FINISHED
  → PHP: POST /{ig-user-id}/media_publish → media_id
  → PHP: marca 'publicada', registra imágenes, borra temporales
  → Angular: muestra permalink

[Mantenimiento]
  → Cron semanal → POST /instagram/refrescar-token
```

---

## 6. Diagnóstico

| Síntoma | Causa probable |
|---|---|
| `configurado: false` | No hay fila en `instagram_config`, o `activo = 0`, o `id_tenant` equivocado |
| Botón "Publicar como Reel" no se activa | El video tiene `tipo_media = 'imagen'` en BD (subido antes del delta). Verificar: `SELECT id, url, tipo_media FROM galeria_imagenes WHERE id_galeria = '...'` |
| `Falta definir IG_MEDIA_SIGN_SECRET` | No está en `config/master.env.php` |
| Meta no descarga la imagen | `/ig-media` no quedó como ruta pública en `index.php`, o la URL expiró (TTL 600s) |
| `No se pudo refrescar el token` | El token ya expiró. No hay vuelta atrás por código: regenerar en la consola |
| Reel rechazado | El video no cumple formato (>90s, no vertical, códec) |
| "server has gone away" | Se está usando `Flight::db()` en vez de `self::db()` |

---

## 7. Puntos frágiles conocidos

1. **El token es el único dato del sistema que no se puede recuperar ni regenerar por código.** No está en scripts, ni en el repo, ni en la consola de Meta después de generarlo. Si se pierde la fila de `instagram_config`, hay que rehacer la sección 1.3 a mano.
2. **`01-LimpiarGenialisis.sql` hace `TRUNCATE instagram_config`** (bloque de credenciales sensibles, junto a `wa_config` y `google_configuracion`). Es correcto — no debe heredarse entre tenants — pero significa que este paso va *después* de la limpieza.
3. **`Script-782` (cambio de `id_tenant`)** actualiza `instagram_config` sin la cláusula de nulos que llevan las demás tablas. Si la fila tiene un tenant distinto a `@tenant_old`, queda huérfana.
4. **El refresco depende de que alguien use el módulo.** Sin cron, un tenant que no publique en dos meses pierde la conexión en silencio.
