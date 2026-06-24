# Agregar una opción al menú

El menú se arma desde `getArbol()` en **`src/app/services/menu-arbol.service.ts`**. Editar ese array es lo único necesario; el componente filtra por permisos y por texto automáticamente.

## El nodo (`MenuNodo`)

```ts
{
  id: 'identificador-unico',   // obligatorio, único en todo el árbol
  label: 'Texto visible',      // obligatorio
  icono: '📦',                 // obligatorio (emoji), se usa si no hay imagen
  imagen?: '/assets/images/x.png', // opcional, PNG (se usa en las raíces)
  ruta?: '/mi-ruta',           // si es una opción navegable (hoja)
  permiso?: 'codigo.permiso',  // opcional; sin permiso => siempre visible
  keywords?: ['sinonimo1'],    // opcional; términos extra para la búsqueda
  hijos?: [ ... ]              // si es un grupo en vez de una hoja
}
```

Regla simple: un nodo **o** tiene `ruta` (hoja navegable) **o** tiene `hijos` (grupo expandible).

## Caso 1: agregar una opción navegable (hoja)

Ubicar el grupo donde corresponde y añadir el objeto dentro de su `hijos`:

```ts
{ id: 'reportes-nuevo', label: 'Mi Reporte', icono: '📈', ruta: '/reportes/mi-reporte', keywords: ['otro nombre'] }
```

## Caso 2: agregar un grupo nuevo

```ts
{
  id: 'mi-grupo',
  label: 'Mi Grupo',
  icono: '🗂️',
  keywords: ['alias'],
  hijos: [
    { id: 'mi-grupo-a', label: 'Opción A', icono: '📄', ruta: '/ruta-a' },
    { id: 'mi-grupo-b', label: 'Opción B', icono: '📄', ruta: '/ruta-b' }
  ]
}
```

Los grupos pueden anidarse cuantos niveles se necesiten (un `hijo` puede tener a su vez `hijos`).

## Reglas importantes

- **`id` único:** no repetir en ningún nodo del árbol (se usa para expandir/colapsar y para `trackBy`).
- **`ruta` con slash inicial** (`/estudiantes`), igual que en el resto del árbol.
- **La ruta debe existir** en `src/app/app.routes.ts`. Si la opción es nueva, primero registrar ahí su `path` (recordando: las rutas específicas van **antes** de las comodín `:id`).
- **Permisos:** si se pone `permiso`, el código debe existir en la tabla de permisos. Sin `permiso`, la opción se muestra siempre. Un grupo se oculta solo si **todos** sus hijos quedan ocultos.
- **`imagen`:** hoy se usa solo en las 8 secciones raíz. Si no se define, se muestra el emoji de `icono`.
- **`keywords`:** términos alternativos para que la búsqueda encuentre la opción aunque se escriba distinto (la búsqueda ignora tildes y mayúsculas). El resaltado solo aplica sobre el `label`.

## Ejemplo completo

Agregar "Becas" como opción navegable dentro de Administración → Financiero:

1. En `app.routes.ts`:

```ts
{ path: 'administracion/financiero/becas', loadComponent: () => import('./components/administracion/financiero/becas/becas.component').then(m => m.BecasComponent), canActivate: [AuthGuard], data: { trackear: true, labelAcceso: 'Becas', iconoAcceso: '🎓' } },
```

2. En `menu-arbol.service.ts`, dentro del `hijos` del grupo `administracion-financiero`:

```ts
{ id: 'administracion-fin-becas', label: 'Becas', icono: '🎓', ruta: '/administracion/financiero/becas', keywords: ['descuentos', 'auxilios'] }
```

Listo: aparece en el menú, respeta permisos y es buscable por "becas", "descuentos" o "auxilios".
