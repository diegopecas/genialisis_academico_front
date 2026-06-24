# Módulo Chat IA - GENIALISIS
## Resumen de implementación

---

## 1. ARQUITECTURA GENERAL

**Asistente IA conversacional** integrado como botón flotante (estilo WhatsApp) en toda la aplicación. Se alimenta de contexto real del usuario para responder preguntas sobre estudiantes, finanzas, académico y operaciones del jardín.

### Stack
- **IA Principal:** Gemini 2.5 Flash
- **IA Fallback:** Groq (Llama 3.3 70B Versatile)
- **Backend:** PHP + Flight Framework
- **Frontend:** Angular 18 (standalone component)
- **BD:** MySQL

### Flujo de una consulta
```
Usuario envía mensaje
  → Backend valida usuario activo
  → Determina rol (acudiente/docente/admin)
  → Consulta permisos en ia_chat_permisos_usuario
  → Obtiene IDs de estudiantes en tiempo real (según relaciones en BD)
  → Por cada permiso: llama método de contexto correspondiente
  → Une todo en un solo prompt de contexto
  → Envía a Gemini (si falla → Groq, si falla → mensaje fallback)
  → Guarda conversación y mensajes
  → Retorna respuesta
```

---

## 2. ARCHIVOS DEL MÓDULO

### Base de datos (ejecutar en este orden)
| Archivo | Qué hace |
|---------|----------|
| `ia-chat-tables.sql` | Tablas `ia_chat_conversaciones` + `ia_chat_mensajes` |
| `ia-chat-config-extra.sql` | INSERT `groq_api_key` en `configuracion_ia` |
| `ia-chat-permisos.sql` | Tablas `ia_chat_tipos_informacion` + `ia_chat_permisos_usuario` + 6 tipos base + `nombre_asistente` y `descripcion_asistente` en `configuracion_ia` |
| `inserts-lumen.sql` | 3 tipos de grupo + permisos de todos los usuarios de Lumen |
| `inserts-genialisis.sql` | Permisos de todos los usuarios de Genialisis |
| `inserts-jean.sql` | Permisos de todos los usuarios de Jean |

### Backend PHP
| Archivo | Ubicación |
|---------|-----------|
| `ia-chat.service.php` | `services/ia-chat.service.php` |
| `ia-chat.routes.php` | `routes/ia-chat.routes.php` |

### Frontend Angular
| Archivo | Ubicación |
|---------|-----------|
| `ia-chat.service.ts` | `app/services/ia-chat.service.ts` |
| `ia-chat-floating.component.ts` | `app/components/ia-chat-floating/` |
| `ia-chat-floating.component.html` | `app/components/ia-chat-floating/` |
| `ia-chat-floating.component.scss` | `app/components/ia-chat-floating/` |

### Integración en app.component
```typescript
// app.component.ts
import { IaChatFloatingComponent } from './components/ia-chat-floating/ia-chat-floating.component';
// agregar en imports: [..., IaChatFloatingComponent]
```
```html
<!-- app.component.html -->
<router-outlet></router-outlet>
<app-ia-chat-floating></app-ia-chat-floating>
<ngx-spinner>...</ngx-spinner>
```

---

## 3. TABLAS CREADAS

### ia_chat_conversaciones
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | INT PK AUTO | |
| id_persona | INT FK | Persona que inició la conversación |
| rol | VARCHAR | acudiente/docente/admin/inactivo |
| titulo | VARCHAR(80) | Primeros 80 chars del primer mensaje |
| fecha_creacion | DATETIME | |
| fecha_actualizacion | DATETIME | Se actualiza con cada mensaje |
| activo | TINYINT | 1=activa, 0=eliminada (soft delete) |

### ia_chat_mensajes
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | INT PK AUTO | |
| id_conversacion | INT FK | |
| rol_mensaje | ENUM | 'user' o 'assistant' |
| mensaje | TEXT | Contenido del mensaje |
| proveedor | VARCHAR | gemini/groq/fallback/null |
| tiempo_respuesta_ms | INT | Solo para mensajes assistant |
| fecha | DATETIME | |

### ia_chat_tipos_informacion
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | INT PK AUTO | |
| codigo | VARCHAR(50) UK | Identificador único |
| nombre | VARCHAR(100) | Nombre descriptivo |
| descripcion | VARCHAR(255) | |
| requiere_ids_estudiantes | TINYINT | 1=necesita IDs, 0=global |
| activo | TINYINT | |

### ia_chat_permisos_usuario
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | INT PK AUTO | |
| id_persona | INT FK → personas | |
| id_tipo_informacion | INT FK → ia_chat_tipos_informacion | |
| activo | TINYINT | |
| UK | (id_persona, id_tipo_informacion) | Sin duplicados |

---

## 4. CATÁLOGO DE TIPOS DE INFORMACIÓN

| ID | Código | Nombre | Requiere IDs estudiantes |
|----|--------|--------|--------------------------|
| 1 | est_personal | Datos personales de estudiante(s) | Sí |
| 2 | est_academico | Datos académicos de estudiante(s) | Sí |
| 3 | est_financiero | Datos financieros de estudiante(s) | Sí |
| 4 | global_operativo | Datos operativos globales del jardín | No |
| 5 | global_academico | Datos académicos globales del jardín | No |
| 6 | global_financiero | Datos financieros globales del jardín | No |
| 7 | grupo_personal | Datos personales de estudiantes del grupo | Sí |
| 8 | grupo_academico | Datos académicos de estudiantes del grupo | Sí |
| 9 | grupo_financiero | Datos financieros de estudiantes del grupo | Sí |

---

## 5. REGLAS DE PERMISOS

### Papás (acceso_institucional = 0)
- est_personal (1), est_academico (2), est_financiero (3)
- Solo ven datos de SUS hijos (se resuelve en tiempo real desde tabla acudientes)

### Colaboradores (cargo ≠ 9, ≠ 5, ≠ 7)
- grupo_personal (7), grupo_academico (8)
- **Sin acceso financiero**
- IDs de estudiantes se resuelven por relaciones docentes/grupos

### Directora (cargo 5) y Asistente Administrativo (cargo 7)
- Acceso total: los 9 tipos
- IDs de estudiantes: todos los activos

### Admin/Desarrollador (Diego)
- Acceso total: los 9 tipos

### Usuarios inactivos
- El sistema valida `usuarios.activo = 1`
- Si está inactivo: contexto vacío, la IA le dice amablemente que no tiene acceso

### Usuarios sin permisos
- Si no tiene registros en ia_chat_permisos_usuario
- La IA solo responde preguntas generales (horarios, dirección, contacto)

---

## 6. ENDPOINTS API

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/ia-chat/enviar` | Enviar mensaje. Body: `{id_persona, mensaje, id_conversacion?}` |
| GET | `/ia-chat/conversaciones/{id_persona}` | Listar conversaciones del usuario |
| GET | `/ia-chat/conversacion/{id_conversacion}` | Obtener mensajes de una conversación |
| DELETE | `/ia-chat/conversacion/{id_conversacion}` | Eliminar conversación (soft delete) |
| GET | `/ia-chat/admin/log?limite=50&offset=0` | Log de uso + estadísticas (admin) |

---

## 7. CONFIGURACIÓN EN configuracion_ia

| Clave | Valor | Descripción |
|-------|-------|-------------|
| gemini_api_key | (existente) | API key de Google Gemini |
| groq_api_key | gsk_... | API key de Groq (fallback) |
| nombre_asistente | Lumi | Nombre del asistente (parametrizable por jardín) |
| descripcion_asistente | Asistente virtual del Jardín | Descripción del asistente |

---

## 8. COMPORTAMIENTO DEL FRONTEND

- **Botón flotante** (FAB) en esquina inferior derecha, visible solo con usuario logueado
- **Escucha NavigationEnd** del Router para detectar login/logout
- **Se oculta** en pantalla de login (`*ngIf="visible"`)
- **Se resetea** al hacer logout (limpia mensajes, conversaciones, estado)
- **Sugerencias dinámicas** por rol (acudiente/docente/admin)
- **Historial** de conversaciones con opción de cargar y eliminar
- **Auto-scroll** al recibir mensajes
- **Auto-resize** del textarea
- **Typing indicator** mientras espera respuesta
- **Diseño glassmorphism** oscuro, consistente con daily-message

---

## 9. PENDIENTES

- [ ] Reemplazar contextos dummy por queries reales (o stored procedures) en cada método `contextoDummy*`
- [ ] Obtener API key de Groq (console.groq.com)
- [ ] Panel admin Angular para visualizar log y estadísticas
- [ ] Límite de mensajes diarios por usuario
- [ ] Evaluar si docentes_x_grupos existe para resolver IDs de estudiantes por grupo de docente
