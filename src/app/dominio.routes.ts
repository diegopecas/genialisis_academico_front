import { Routes } from '@angular/router';
import { AuthGuard } from './core/auth.guard';
import { PermisosGuard } from './core/permisos.guard';

/**
 * Rutas del dominio EDUCATIVO (producto GENIALISIS para jardines).
 * El núcleo integra este arreglo automáticamente desde app.routes.ts.
 */
export const dominioRoutes: Routes = [

  // Colaboradores
  { path: 'gestion-docentes', loadComponent: () => import('./components/docentes/gestion-docentes/gestion-docentes.component').then(m => m.GestionDocentesComponent), canActivate: [AuthGuard], data: { trackear: true, labelAcceso: 'Gestión Docentes', iconoAcceso: '👩‍🏫' } },
  { path: 'docentes', loadComponent: () => import('./components/docentes/docentes.component').then(m => m.DocentesComponent), canActivate: [AuthGuard], data: { trackear: true, labelAcceso: 'Docentes', iconoAcceso: '👨‍🏫' } },
  { path: 'docentes/:accion/:id', loadComponent: () => import('./components/docentes/crear-docentes/crear-docentes.component').then(m => m.CrearDocentesComponent), canActivate: [AuthGuard] },
  { path: 'casas-docentes', loadComponent: () => import('./components/casas-docentes/casas-docentes.component').then(m => m.CasasDocentesComponent), canActivate: [AuthGuard], data: { trackear: true, labelAcceso: 'Casas Docentes', iconoAcceso: '🏠' } },

  // Estudiantes
  { path: 'estudiantes', loadComponent: () => import('./components/estudiantes/estudiantes.component').then(m => m.EstudiantesComponent), canActivate: [AuthGuard, PermisosGuard], data: { permiso: 'estudiantes.listado', trackear: true, labelAcceso: 'Estudiantes', iconoAcceso: '🎓' } },
  { path: 'estudiantes/:accion/:id', loadComponent: () => import('./components/estudiantes/crear-estudiante/crear-estudiante.component').then(m => m.CrearEstudianteComponent), canActivate: [AuthGuard, PermisosGuard], data: { permiso: 'estudiantes.administrar' } },
  { path: 'estudiantes-servicios/:id', loadComponent: () => import('./components/servicios/servicios/servicios.component').then(m => m.ServiciosComponent), canActivate: [AuthGuard] },
  { path: 'estudiantes-servicios/:accion/:id/:idEstudiante', loadComponent: () => import('./components/servicios/administrar-servicios-estudiante/administrar-servicios-estudiante.component').then(m => m.AdministrarServiciosEstudianteComponent), canActivate: [AuthGuard] },
  { path: 'estudiantes-productos-servicios/:id', loadComponent: () => import('./components/estudiantes/productos-servicios/productos-servicios.component').then(m => m.ProductosServiciosComponent), canActivate: [AuthGuard, PermisosGuard], data: { permiso: 'estudiantes.productos_servicios' } },
  { path: 'estudiantes-productos-servicios/:accion/:id/:idEstudiante', loadComponent: () => import('./components/estudiantes/productos-servicios/crear-productos-servicios/crear-productos-servicios.component').then(m => m.CrearProductosServiciosComponent), canActivate: [AuthGuard, PermisosGuard], data: { permiso: 'estudiantes.productos_servicios.administrar' } },
  { path: 'estudiantes-medidas/:id', loadComponent: () => import('./components/estudiantes/medidas/medidas-estudiantes.component').then(m => m.MedidasEstudiantesComponent), canActivate: [AuthGuard, PermisosGuard], data: { permiso: 'estudiantes.medidas' } },
  { path: 'estudiantes-medidas/:accion/:id/:idEstudiante', loadComponent: () => import('./components/estudiantes/medidas/crear-medidas/crear-medidas.component').then(m => m.CrearMedidasComponent), canActivate: [AuthGuard, PermisosGuard], data: { permiso: 'estudiantes.medidas.administrar' } },
  { path: 'estudiantes-pagos/:id', loadComponent: () => import('./components/estudiantes/pagos/pagos-recibidos.component').then(m => m.PagosRecibidosComponent), canActivate: [AuthGuard, PermisosGuard], data: { permiso: 'estudiantes.pagos' } },
  { path: 'estudiantes-pagos/comprobante/:id', loadComponent: () => import('./components/estudiantes/pagos/comprobante-pago/comprobante-pago-view.component').then(m => m.ComprobantePagoViewComponent), canActivate: [AuthGuard, PermisosGuard], data: { permiso: 'estudiantes.pagos' } },
  { path: 'estudiantes-pagos/:accion/:id/:idEstudiante', loadComponent: () => import('./components/estudiantes/pagos/crear-pagos-recibidos/crear-pagos-recibidos.component').then(m => m.CrearPagosRecibidosComponent), canActivate: [AuthGuard, PermisosGuard], data: { permiso: 'estudiantes.pagos.administrar' } },
  { path: 'estudiantes-observaciones/:id', loadComponent: () => import('./components/estudiantes/observaciones/observaciones-estudiantes.component').then(m => m.ObservacionesEstudiantesComponent), canActivate: [AuthGuard, PermisosGuard], data: { permiso: 'estudiantes.observaciones' } },
  { path: 'estudiantes-observaciones/:accion/:id/:idEstudiante', loadComponent: () => import('./components/estudiantes/observaciones/crear-observaciones/crear-observaciones.component').then(m => m.CrearObservacionesComponent), canActivate: [AuthGuard, PermisosGuard], data: { permiso: 'estudiantes.observaciones.administrar' } },
  { path: 'estudiantes-acudientes/:id', loadComponent: () => import('./components/estudiantes/acudientes/acudientes.component').then(m => m.AcudientesComponent), canActivate: [AuthGuard, PermisosGuard], data: { permiso: 'estudiantes.acudientes' } },
  { path: 'estudiantes-acudientes/:accion/:id/:idEstudiante', loadComponent: () => import('./components/estudiantes/acudientes/crear-acudiente/crear-acudiente.component').then(m => m.CrearAcudienteComponent), canActivate: [AuthGuard, PermisosGuard], data: { permiso: 'estudiantes.acudientes.administrar' } },
  { path: 'estudiantes-vista/:id', loadComponent: () => import('./components/estudiantes/vista-estudiante/vista-estudiante.component').then(m => m.VistaEstudianteComponent), canActivate: [AuthGuard, PermisosGuard], data: { permiso: 'estudiantes.vista_360' } },
  { path: 'estudiantes-onces/:id', loadComponent: () => import('./components/estudiantes/onces-alimentacion/onces-alimentacion.component').then(m => m.OncesAlimentacionComponent), canActivate: [AuthGuard, PermisosGuard], data: { permiso: 'estudiantes.onces' } },
  { path: 'estudiantes-onces/:accion/:id/:idEstudiante', loadComponent: () => import('./components/estudiantes/onces-alimentacion/crear-onces-alimentacion/crear-onces-alimentacion.component').then(m => m.CrearOncesAlimentacionComponent), canActivate: [AuthGuard, PermisosGuard], data: { permiso: 'estudiantes.onces.administrar' } },
  { path: 'estudiantes-contratos/:id', loadComponent: () => import('./components/estudiantes/contratos-estudiantes/contratos-estudiantes.component').then(m => m.ContratosEstudiantesComponent), canActivate: [AuthGuard, PermisosGuard], data: { permiso: 'estudiantes.contratos' } },
  { path: 'estudiantes-contratos/:accion/:id/:idEstudiante', loadComponent: () => import('./components/estudiantes/contratos-estudiantes/crear-contrato/crear-contrato.component').then(m => m.CrearContratoComponent), canActivate: [AuthGuard, PermisosGuard], data: { permiso: 'estudiantes.contratos.administrar' } },
  { path: 'estudiantes-cursos-extra/:id', loadComponent: () => import('./components/estudiantes/cursos-extra-estudiante/cursos-extra-estudiante.component').then(m => m.CursosExtraEstudianteComponent), canActivate: [AuthGuard] },
  { path: 'estudiantes-cursos-extra/:accion/:id/:idEstudiante', loadComponent: () => import('./components/estudiantes/cursos-extra-estudiante/crear-curso-extra-estudiante/crear-curso-extra-estudiante.component').then(m => m.CrearCursoExtraEstudianteComponent), canActivate: [AuthGuard] },

  // Reportes
  { path: 'reportes/academicos-estudiante', loadComponent: () => import('./components/reportes/reportes-academicos-estudiante/reportes-academicos-estudiante.component').then(m => m.ReportesAcademicosEstudianteComponent), canActivate: [AuthGuard], data: { trackear: true, labelAcceso: 'Reportes Académicos', iconoAcceso: '📄' } },
  { path: 'reportes/monitoreo-sprint', loadComponent: () => import('./components/reportes/monitoreo-sprint/monitoreo-sprint.component').then(m => m.MonitoreoSprintComponent), canActivate: [AuthGuard], data: { trackear: true, labelAcceso: 'Monitoreo Sprint', iconoAcceso: '🏃' } },
  { path: 'reportes/calificaciones-sprint', loadComponent: () => import('./components/reportes/calificaciones-sprint-estudiantes/calificaciones-sprint-estudiantes.component').then(m => m.CalificacionesSprintEstudiantesComponent), canActivate: [AuthGuard], data: { trackear: true, labelAcceso: 'Calificaciones Sprint', iconoAcceso: '📝' } },
  { path: 'reportes/calificaciones-pdm', loadComponent: () => import('./components/reportes/consultar-calificaciones-pdm-x-estudiantes/consultar-calificaciones-pdm-x-estudiantes.component').then(m => m.ConsultarCalificacionesPdmXEstudiantesComponent), canActivate: [AuthGuard], data: { trackear: true, labelAcceso: 'Calificaciones PDM', iconoAcceso: '📝' } },
  { path: 'reportes/calificacion-pdm-estudiante/:id', loadComponent: () => import('./components/reportes/consultar-calificaciones-pdm-x-estudiante/consultar-calificaciones-pdm-x-estudiante.component').then(m => m.ConsultarCalificacionesPdmXEstudianteComponent), canActivate: [AuthGuard] },
  { path: 'reportes/calificaciones/estudiante', loadComponent: () => import('./components/reportes/calificaciones-estudiante-detalle/calificaciones-estudiante-detalle.component').then(m => m.CalificacionesEstudianteDetalleComponent), canActivate: [AuthGuard], data: { trackear: true, labelAcceso: 'Calificaciones Estudiante', iconoAcceso: '🎯' } },
  { path: 'reportes/malla-curricular', loadComponent: () => import('./components/reportes/reporte-malla-curricular/reporte-malla-curricular.component').then(m => m.ReporteMallaCurricularComponent), canActivate: [AuthGuard], data: { trackear: true, labelAcceso: 'Malla Curricular', iconoAcceso: '🗺️' } },
  { path: 'reportes/cobertura-curricular', loadComponent: () => import('./components/reportes/reporte-cobertura-curricular/reporte-cobertura-curricular.component').then(m => m.ReporteCoberturaCurricularComponent), canActivate: [AuthGuard], data: { trackear: true, labelAcceso: 'Cobertura Curricular', iconoAcceso: '📈' } },
  { path: 'reportes/alimentacion', loadComponent: () => import('./components/reportes/alimentacion/reporte-alimentacion.component').then(m => m.ReporteAlimentacionComponent), canActivate: [AuthGuard], data: { trackear: true, labelAcceso: 'Reporte Alimentación', iconoAcceso: '🍎' } },
  { path: 'reportes/cobros-realizados', loadComponent: () => import('./components/reportes/reporte-cobros/reporte-cobros.component').then(m => m.ReporteCobrosComponent), canActivate: [AuthGuard], data: { trackear: true, labelAcceso: 'Cobros Realizados', iconoAcceso: '🧾' } },
  { path: 'reportes/estudiantes-general', loadComponent: () => import('./components/reportes/reporte-estudiantes/reporte-estudiantes.component').then(m => m.ReporteEstudiantesComponent), canActivate: [AuthGuard], data: { trackear: true, labelAcceso: 'Reporte Estudiantes', iconoAcceso: '📋' } },
  { path: 'reportes/asistencia', loadComponent: () => import('./components/reportes/reporte-asistencia/reporte-asistencia.component').then(m => m.ReporteAsistenciaComponent), canActivate: [AuthGuard], data: { trackear: true, labelAcceso: 'Reporte Asistencia', iconoAcceso: '✋' } },
  { path: 'reportes/cursos-extra', loadComponent: () => import('./components/reportes/reporte-cursos-extra/reporte-cursos-extra.component').then(m => m.ReporteCursosExtraComponent), canActivate: [AuthGuard], data: { trackear: true, labelAcceso: 'Reporte Cursos Extra', iconoAcceso: '🎭' } },
  { path: 'reportes/tamizajes', loadComponent: () => import('./components/reportes/tamizajes/tamizajes.component').then(m => m.TamizajesComponent), canActivate: [AuthGuard], data: { trackear: true, labelAcceso: 'Tamizajes', iconoAcceso: '🔬' } },
  { path: 'reportes/dashboard-gerencial', loadComponent: () => import('./components/reportes/dashboard-gerencial/dashboard-gerencial.component').then(m => m.DashboardGerencialComponent), canActivate: [AuthGuard, PermisosGuard], data: { permiso: 'dashboard.gerencial.listado', trackear: true, labelAcceso: 'Dashboard Gerencial', iconoAcceso: '📊' } },

  // Reportes de Colaboradores
  { path: 'reportes/historial-actividades', loadComponent: () => import('./components/reportes/historial-actividades/historial-actividades.component').then(m => m.HistorialActividadesComponent), canActivate: [AuthGuard], data: { trackear: true, labelAcceso: 'Historial Actividades', iconoAcceso: '📜' } },
  { path: 'reportes/reportes-pago', loadComponent: () => import('./components/reportes/reporte-reportes-pago/reporte-reportes-pago.component').then(m => m.ReporteReportesPagoComponent), canActivate: [AuthGuard], data: { trackear: true, labelAcceso: 'Reportes de Pago', iconoAcceso: '📑' } },

  // Calificaciones
  {
    path: 'calificacion',
    loadComponent: () => import('./components/calificacion/calificacion.component').then(m => m.CalificacionComponent),
    canActivate: [AuthGuard],
    data: { trackear: true, labelAcceso: 'Calificaciones', iconoAcceso: '⭐' },
    children: [
      { path: '', loadComponent: () => import('./components/calificacion/selector-grupos/selector-grupos.component').then(m => m.SelectorGruposComponent) },
      { path: 'grupo/:idGrupo', loadComponent: () => import('./components/calificacion/selector-areas/selector-areas.component').then(m => m.SelectorAreasComponent), data: { trackear: true, labelAcceso: 'Áreas del Grupo', iconoAcceso: '📚' } },
      { path: 'grupo/:idGrupo/area/:idArea', loadComponent: () => import('./components/calificacion/lista-actividades/lista-actividades.component').then(m => m.ListaActividadesComponent) },
      { path: 'grupo/:idGrupo/area/:idArea/actividad/:idTareaSprint', loadComponent: () => import('./components/calificacion/calificacion-estudiantes/calificacion-estudiantes.component').then(m => m.CalificacionEstudiantesComponent) }
    ]
  },
  { path: 'academico/parametros-calificaciones', loadComponent: () => import('./components/academico/parametros-calificaciones/parametros-calificaciones.component').then(m => m.ParametrosCalificacionesComponent), canActivate: [AuthGuard], data: { trackear: true, labelAcceso: 'Parámetros Calificaciones', iconoAcceso: '⚙️' } },
  { path: 'academico/parametros-calificaciones/:accion/:id', loadComponent: () => import('./components/academico/parametros-calificaciones/crear-parametro-calificaciones/crear-parametro-calificaciones.component').then(m => m.CrearParametroCalificacionesComponent), canActivate: [AuthGuard] },

  // Administración
  { path: 'administracion/auditoria-registros', loadComponent: () => import('./components/administracion/auditoria-registros/auditoria-registros.component').then(m => m.AuditoriaRegistrosComponent), canActivate: [AuthGuard], data: { trackear: true, labelAcceso: 'Auditoría', iconoAcceso: '🔍' } },

  // Asistencia
  { path: 'asistencia', loadComponent: () => import('./components/asistencia/asistencia.component').then(m => m.AsistenciaComponent), canActivate: [AuthGuard], data: { trackear: true, labelAcceso: 'Asistencia', iconoAcceso: '✋' } },
  { path: 'administracion/productos-academico', loadComponent: () => import('./components/administracion/productos-academico/productos-academico.component').then(m => m.ProductosAcademicoComponent), canActivate: [AuthGuard], data: { trackear: true, labelAcceso: 'Productos Académico', iconoAcceso: '📚' } },
  { path: 'administracion/productos-academico/:accion/:id', loadComponent: () => import('./components/administracion/productos-academico/crear-producto-academico/crear-producto-academico.component').then(m => m.CrearProductoAcademicoComponent), canActivate: [AuthGuard] },
  { path: 'administracion/menus', loadComponent: () => import('./components/administracion/menus/menus.component').then(m => m.MenusComponent), canActivate: [AuthGuard], data: { trackear: true, labelAcceso: 'Menús', iconoAcceso: '🍽️' } },
  { path: 'administracion/items-menu', loadComponent: () => import('./components/administracion/menus/items-menu/items-menu.component').then(m => m.ItemsMenuComponent), canActivate: [AuthGuard], data: { trackear: true, labelAcceso: 'Items Menú', iconoAcceso: '🍽️' } },
  { path: 'administracion/items-menu/:accion/:id', loadComponent: () => import('./components/administracion/menus/items-menu/crear-item-menu/crear-item-menu.component').then(m => m.CrearItemMenuComponent), canActivate: [AuthGuard] },
  { path: 'administracion/lista-menus', loadComponent: () => import('./components/administracion/menus/lista-menus/lista-menus.component').then(m => m.ListaMenusComponent), canActivate: [AuthGuard], data: { trackear: true, labelAcceso: 'Lista Menús', iconoAcceso: '📜' } },
  { path: 'administracion/lista-menus/:accion/:id', loadComponent: () => import('./components/administracion/menus/lista-menus/crear-menu/crear-menu.component').then(m => m.CrearMenuComponent), canActivate: [AuthGuard] },

  // Datos Estudiantes (Médicos y Adicionales)
  { path: 'administracion/datos-estudiantes', loadComponent: () => import('./components/administracion/datos-estudiantes/datos-estudiantes.component').then(m => m.DatosEstudiantesComponent), canActivate: [AuthGuard], data: { trackear: true, labelAcceso: 'Datos Estudiantes', iconoAcceso: '🎓' } },
  { path: 'administracion/datos-estudiantes/tipos-datos-medicos', loadComponent: () => import('./components/administracion/datos-estudiantes/tipos-datos-medicos/tipos-datos-medicos.component').then(m => m.TiposDatosMedicosComponent), canActivate: [AuthGuard] },
  { path: 'administracion/datos-estudiantes/tipos-datos-medicos/:accion/:id', loadComponent: () => import('./components/administracion/datos-estudiantes/tipos-datos-medicos/crear-tipo-dato-medico/crear-tipo-dato-medico.component').then(m => m.CrearTipoDatoMedicoComponent), canActivate: [AuthGuard] },
  { path: 'administracion/datos-estudiantes/datos-medicos', loadComponent: () => import('./components/administracion/datos-estudiantes/datos-medicos/datos-medicos-catalogo.component').then(m => m.DatosMedicosCatalogoComponent), canActivate: [AuthGuard] },
  { path: 'administracion/datos-estudiantes/datos-medicos/:accion/:id', loadComponent: () => import('./components/administracion/datos-estudiantes/datos-medicos/crear-dato-medico/crear-dato-medico.component').then(m => m.CrearDatoMedicoComponent), canActivate: [AuthGuard] },
  { path: 'administracion/datos-estudiantes/tipos-datos-adicionales', loadComponent: () => import('./components/administracion/datos-estudiantes/tipos-datos-adicionales/tipos-datos-adicionales.component').then(m => m.TiposDatosAdicionalesComponent), canActivate: [AuthGuard] },
  { path: 'administracion/datos-estudiantes/tipos-datos-adicionales/:accion/:id', loadComponent: () => import('./components/administracion/datos-estudiantes/tipos-datos-adicionales/crear-tipo-dato-adicional/crear-tipo-dato-adicional.component').then(m => m.CrearTipoDatoAdicionalComponent), canActivate: [AuthGuard] },
  { path: 'administracion/datos-estudiantes/datos-adicionales', loadComponent: () => import('./components/administracion/datos-estudiantes/datos-adicionales/datos-adicionales-catalogo.component').then(m => m.DatosAdicionalesCatalogoComponent), canActivate: [AuthGuard] },
  { path: 'administracion/datos-estudiantes/datos-adicionales/:accion/:id', loadComponent: () => import('./components/administracion/datos-estudiantes/datos-adicionales/crear-dato-adicional/crear-dato-adicional.component').then(m => m.CrearDatoAdicionalComponent), canActivate: [AuthGuard] },

  // Gestión de Medidas Corporales
  { path: 'administracion/gestion-medidas', loadComponent: () => import('./components/administracion/gestion-medidas/gestion-medidas.component').then(m => m.GestionMedidasComponent), canActivate: [AuthGuard], data: { trackear: true, labelAcceso: 'Gestión Medidas', iconoAcceso: '📏' } },
  { path: 'administracion/gestion-medidas/categorias', loadComponent: () => import('./components/administracion/gestion-medidas/categorias-medidas/categorias-medidas.component').then(m => m.CategoriasMedidasComponent), canActivate: [AuthGuard], data: { trackear: true, labelAcceso: 'Categorías Medidas', iconoAcceso: '📏' } },
  { path: 'administracion/gestion-medidas/categorias/:accion/:id', loadComponent: () => import('./components/administracion/gestion-medidas/categorias-medidas/crear-categoria-medida/crear-categoria-medida.component').then(m => m.CrearCategoriaMedidaComponent), canActivate: [AuthGuard] },
  { path: 'administracion/gestion-medidas/unidades', loadComponent: () => import('./components/administracion/gestion-medidas/unidades-medidas-corporales/unidades-medidas-corporales.component').then(m => m.UnidadesMedidasCorporalesComponent), canActivate: [AuthGuard], data: { trackear: true, labelAcceso: 'Unidades Medidas', iconoAcceso: '📐' } },
  { path: 'administracion/gestion-medidas/unidades/:accion/:id', loadComponent: () => import('./components/administracion/gestion-medidas/unidades-medidas-corporales/crear-unidad-medida/crear-unidad-medida.component').then(m => m.CrearUnidadMedidaComponent), canActivate: [AuthGuard] },
  { path: 'administracion/gestion-medidas/medidas', loadComponent: () => import('./components/administracion/gestion-medidas/medidas-catalogo/medidas-catalogo.component').then(m => m.MedidasCatalogoComponent), canActivate: [AuthGuard], data: { trackear: true, labelAcceso: 'Catálogo Medidas', iconoAcceso: '📏' } },
  { path: 'administracion/gestion-medidas/medidas/:accion/:id', loadComponent: () => import('./components/administracion/gestion-medidas/medidas-catalogo/crear-medida/crear-medida.component').then(m => m.CrearMedidaComponent), canActivate: [AuthGuard] },

  // Operaciones
  { path: 'operaciones/registro-medidas', loadComponent: () => import('./components/operaciones/registro-medidas/registro-medidas.component').then(m => m.RegistroMedidasComponent), canActivate: [AuthGuard], data: { trackear: true, labelAcceso: 'Registro Medidas', iconoAcceso: '📏' } },
  { path: 'operaciones/salidas-alimentacion', loadComponent: () => import('./components/operaciones/salidas-alimentacion/salidas-alimentacion.component').then(m => m.SalidasAlimentacionComponent), canActivate: [AuthGuard], data: { trackear: true, labelAcceso: 'Salidas Alimentación', iconoAcceso: '🍱' } },
  { path: 'operaciones/salidas-alimentacion/:accion/:id', loadComponent: () => import('./components/operaciones/salidas-alimentacion/crear-salida/crear-salida-alimentacion.component').then(m => m.CrearSalidaAlimentacionComponent), canActivate: [AuthGuard] },
  { path: 'operaciones/disponibilidad-cocina', loadComponent: () => import('./components/operaciones/disponibilidad-cocina/disponibilidad-cocina.component').then(m => m.DisponibilidadCocinaComponent), canActivate: [AuthGuard], data: { trackear: true, labelAcceso: 'Disponibilidad Cocina', iconoAcceso: '🍳' } },
  { path: 'operaciones/galerias', loadComponent: () => import('./components/operaciones/galerias/galerias.component').then(m => m.GaleriasComponent), canActivate: [AuthGuard], data: { trackear: true, labelAcceso: 'Galerías', iconoAcceso: '🖼️' } },
  { path: 'operaciones/galerias/imagenes/:id', loadComponent: () => import('./components/operaciones/galerias/gestionar-imagenes/gestionar-imagenes.component').then(m => m.GestionarImagenesComponent), canActivate: [AuthGuard] },
  { path: 'operaciones/galerias/:accion/:id', loadComponent: () => import('./components/operaciones/galerias/crear-galeria/crear-galeria.component').then(m => m.CrearGaleriaComponent), canActivate: [AuthGuard] },
  { path: 'operaciones/actualizacion-datos-estudiantes', loadComponent: () => import('./components/operaciones/actualizacion-datos-estudiantes/actualizacion-datos-estudiantes.component').then(m => m.ActualizacionDatosEstudiantesComponent), canActivate: [AuthGuard], data: { trackear: true, labelAcceso: 'Actualización Datos', iconoAcceso: '🔄' } },
  { path: 'operaciones/asignacion-onces', loadComponent: () => import('./components/operaciones/asignacion-onces/asignacion-onces.component').then(m => m.AsignacionOncesComponent), canActivate: [AuthGuard], data: { trackear: true, labelAcceso: 'Asignación de Onces', iconoAcceso: '🍱' } },
  { path: 'operaciones/entrega-alimentacion', loadComponent: () => import('./components/operaciones/entrega-alimentacion/entrega-alimentacion.component').then(m => m.EntregaAlimentacionComponent), canActivate: [AuthGuard], data: { trackear: true, labelAcceso: 'Entrega Alimentación', iconoAcceso: '🍽️' } },
  { path: 'operaciones/inventario-alimentacion', loadComponent: () => import('./components/operaciones/inventario-alimentacion/inventario-alimentacion.component').then(m => m.InventarioAlimentacionComponent), canActivate: [AuthGuard], data: { trackear: true, labelAcceso: 'Inventario Alimentación', iconoAcceso: '📦' } },

  // EAD-3: Evaluación de Desarrollo
  { path: 'operaciones/evaluacion-desarrollo', loadComponent: () => import('./components/operaciones/evaluacion-desarrollo/evaluacion-desarrollo.component').then(m => m.EvaluacionDesarrolloComponent), canActivate: [AuthGuard], data: { trackear: true, labelAcceso: 'Evaluación Desarrollo', iconoAcceso: '📈' } },
  { path: 'operaciones/evaluacion-desarrollo/evaluar/:idEstudiante', loadComponent: () => import('./components/operaciones/evaluacion-desarrollo/evaluar-estudiante/evaluar-estudiante.component').then(m => m.EvaluarEstudianteComponent), canActivate: [AuthGuard] },
  { path: 'operaciones/evaluacion-desarrollo/historial/:idEstudiante', loadComponent: () => import('./components/operaciones/evaluacion-desarrollo/historial-evaluaciones/historial-evaluaciones.component').then(m => m.HistorialEvaluacionesComponent), canActivate: [AuthGuard] },

  // Recordatorio de Pagos
  { path: 'operaciones/recordatorio-pagos', loadComponent: () => import('./components/operaciones/recordatorio-pagos/recordatorio-pagos.component').then(m => m.RecordatorioPagosComponent), canActivate: [AuthGuard], data: { trackear: true, labelAcceso: 'Recordatorio Pagos', iconoAcceso: '💬' } },

  // Seguimiento de Asistencia
  { path: 'operaciones/seguimiento-asistencia', loadComponent: () => import('./components/operaciones/seguimiento-asistencia/seguimiento-asistencia.component').then(m => m.SeguimientoAsistenciaComponent), canActivate: [AuthGuard], data: { trackear: true, labelAcceso: 'Seguimiento Asistencia', iconoAcceso: '📋' } },

  // Recordatorios Generales
  { path: 'operaciones/recordatorios-generales', loadComponent: () => import('./components/operaciones/recordatorios-generales/recordatorios-generales.component').then(m => m.RecordatoriosGeneralesComponent), canActivate: [AuthGuard], data: { trackear: true, labelAcceso: 'Recordatorios Generales', iconoAcceso: '📢' } },

  // Inscripción Cursos Extracurriculares
  { path: 'operaciones/inscripcion-cursos-extra', loadComponent: () => import('./components/operaciones/inscripcion-cursos-extra/inscripcion-cursos-extra.component').then(m => m.InscripcionCursosExtraComponent), canActivate: [AuthGuard], data: { trackear: true, labelAcceso: 'Inscripción Cursos Extra', iconoAcceso: '🎭' } },

  // Observaciones para Informe (registro masivo por sprint)
  { path: 'operaciones/observaciones-informe', loadComponent: () => import('./components/operaciones/registro-observaciones-informe/registro-observaciones-informe.component').then(m => m.RegistroObservacionesInformeComponent), canActivate: [AuthGuard, PermisosGuard], data: { trackear: true, labelAcceso: 'Observaciones para Informe', iconoAcceso: '📝', permiso: 'estudiantes.observaciones.administrar' } },

  // Académico
  { path: 'academico', loadComponent: () => import('./components/academico/academico/academico.component').then(m => m.AcademicoComponent), canActivate: [AuthGuard], data: { trackear: true, labelAcceso: 'Académico', iconoAcceso: '🎓' } },
  { path: 'academico/actividades-academicas', loadComponent: () => import('./components/academico/actividades/actividades-academicas.component').then(m => m.ActividadesAcademicasComponent), canActivate: [AuthGuard], data: { trackear: true, labelAcceso: 'Actividades Académicas', iconoAcceso: '📝' } },
  { path: 'academico/actividades-academicas/:accion/:id', loadComponent: () => import('./components/academico/actividades/crear-actividades/crear-actividades-academicas.component').then(m => m.CrearActividadesAcademicasComponent), canActivate: [AuthGuard] },

  // Máquina de Actividades (IA)
  { path: 'academico/selector-actividades', loadComponent: () => import('./components/academico/selector-actividades/selector-actividades.component').then(m => m.SelectorActividadesComponent), canActivate: [AuthGuard], data: { trackear: true, labelAcceso: 'Selector Actividades', iconoAcceso: '🎯' } },
  { path: 'academico/maquina-actividades', loadComponent: () => import('./components/academico/maquina-actividades/maquina-actividades.component').then(m => m.MaquinaActividadesComponent), canActivate: [AuthGuard], data: { trackear: true, labelAcceso: 'Máquina Actividades', iconoAcceso: '🤖' } },
  { path: 'academico/crear-actividades-manual', loadComponent: () => import('./components/academico/crear-actividades-manual/crear-actividades-manual.component').then(m => m.CrearActividadesManualComponent), canActivate: [AuthGuard], data: { trackear: true, labelAcceso: 'Crear Actividades Manual', iconoAcceso: '✏️' } },
  { path: 'academico/crear-actividades-evaluacion', loadComponent: () => import('./components/academico/crear-actividades-evaluacion/crear-actividades-evaluacion.component').then(m => m.CrearActividadesEvaluacionComponent), canActivate: [AuthGuard], data: { trackear: true, labelAcceso: 'Actividades de Evaluación', iconoAcceso: '🎯' } },
  { path: 'academico/importar-actividades-sprint', loadComponent: () => import('./components/academico/importar-actividades-sprint/importar-actividades-sprint.component').then(m => m.ImportarActividadesSprintComponent), canActivate: [AuthGuard], data: { trackear: true, labelAcceso: 'Importar de Sprint', iconoAcceso: '📋' } },
  { path: 'academico/indicadores-logros', loadComponent: () => import('./components/academico/indicadores-logros/indicadores-logros.component').then(m => m.IndicadoresLogrosComponent), canActivate: [AuthGuard], data: { trackear: true, labelAcceso: 'Indicadores Logros', iconoAcceso: '🎯' } },
  { path: 'academico/indicadores-logros/:accion/:id', loadComponent: () => import('./components/academico/indicadores-logros/editar-indicadores-logros/editar-indicadores-logros.component').then(m => m.EditarIndicadoresLogrosComponent), canActivate: [AuthGuard] },
  { path: 'academico/logros', loadComponent: () => import('./components/academico/logros/logros.component').then(m => m.LogrosComponent), canActivate: [AuthGuard], data: { trackear: true, labelAcceso: 'Logros', iconoAcceso: '🏆' } },
  { path: 'academico/logros/:accion/:id', loadComponent: () => import('./components/academico/logros/crear-logros/crear-logros.component').then(m => m.CrearLogrosComponent), canActivate: [AuthGuard] },
  { path: 'academico/sprints', loadComponent: () => import('./components/academico/sprints/sprints.component').then(m => m.SprintsComponent), canActivate: [AuthGuard], data: { trackear: true, labelAcceso: 'Sprints', iconoAcceso: '🏃' } },
  { path: 'academico/sprints/configurar/:id', loadComponent: () => import('./components/academico/sprints/configurar-sprint/configurar-sprint.component').then(m => m.ConfigurarSprintComponent), canActivate: [AuthGuard] },
  { path: 'academico/sprints/:accion/:id', loadComponent: () => import('./components/academico/sprints/crear-sprints/crear-sprints.component').then(m => m.CrearSprintsComponent), canActivate: [AuthGuard] },
  { path: 'academico/grados', loadComponent: () => import('./components/academico/grados/grados.component').then(m => m.GradosComponent), canActivate: [AuthGuard], data: { trackear: true, labelAcceso: 'Grados', iconoAcceso: '📚' } },
  { path: 'academico/grados/:accion/:id', loadComponent: () => import('./components/academico/grados/crear-grado/crear-grado.component').then(m => m.CrearGradoComponent), canActivate: [AuthGuard] },
  { path: 'academico/grupos', loadComponent: () => import('./components/academico/grupos/grupos.component').then(m => m.GruposComponent), canActivate: [AuthGuard], data: { trackear: true, labelAcceso: 'Grupos', iconoAcceso: '👨‍👩‍👧‍👦' } },
  { path: 'academico/grupos/:accion/:id', loadComponent: () => import('./components/academico/grupos/crear-grupo/crear-grupo.component').then(m => m.CrearGrupoComponent), canActivate: [AuthGuard] },

  // Cursos Extracurriculares
  { path: 'academico/cursos-extra', loadComponent: () => import('./components/academico/cursos-extra/cursos-extra.component').then(m => m.CursosExtraComponent), canActivate: [AuthGuard], data: { trackear: true, labelAcceso: 'Cursos Extracurriculares', iconoAcceso: '🎭' } },
  { path: 'academico/cursos-extra/:accion/:id', loadComponent: () => import('./components/academico/cursos-extra/crear-curso-extra/crear-curso-extra.component').then(m => m.CrearCursoExtraComponent), canActivate: [AuthGuard] },
  { path: 'academico/areas-academicas', loadComponent: () => import('./components/academico/areas-academicas/areas-academicas.component').then(m => m.AreasAcademicasComponent), canActivate: [AuthGuard], data: { trackear: true, labelAcceso: 'Áreas Académicas', iconoAcceso: '📖' } },
  { path: 'academico/areas-academicas/:accion/:id', loadComponent: () => import('./components/academico/areas-academicas/crear-area-academica/crear-area-academica.component').then(m => m.CrearAreaAcademicaComponent), canActivate: [AuthGuard] },

  // Cortes Académicos
  { path: 'academico/cortes-academicos', loadComponent: () => import('./components/academico/cortes-academicos/cortes-academicos.component').then(m => m.CortesAcademicosComponent), canActivate: [AuthGuard], data: { trackear: true, labelAcceso: 'Cortes Académicos', iconoAcceso: '📅' } },
  { path: 'academico/cortes-academicos/:accion/:id', loadComponent: () => import('./components/academico/cortes-academicos/crear-corte-academico/crear-corte-academico.component').then(m => m.CrearCorteAcademicoComponent), canActivate: [AuthGuard] },

  // Documentación del Sistema
  { path: 'clases-ia', loadComponent: () => import('./components/clases-ia/clases-ia.component').then(m => m.ClasesIaComponent), canActivate: [AuthGuard], data: { trackear: true, labelAcceso: 'Clases IA', iconoAcceso: '🤖' } },
  { path: 'clases-ia/gini-ingles/:idGrupo', loadComponent: () => import('./components/clases-ia/gini-ingles/gini-ingles.component').then(m => m.GiniInglesComponent), canActivate: [AuthGuard] },
  { path: 'reportes/ejecucion-tareas', loadComponent: () => import('./components/reportes/reporte-ejecucion-tareas/reporte-ejecucion-tareas.component').then(m => m.ReporteEjecucionTareasComponent), canActivate: [AuthGuard], data: { trackear: true, labelAcceso: 'Ejecución de Tareas', iconoAcceso: '📊' } },

  // Reglas de Cobro Automático
  { path: 'administracion/financiero/reglas-cobro-automatico', loadComponent: () => import('./components/administracion/reglas-cobro-automatico/reglas-cobro-automatico.component').then(m => m.ReglasCobroAutomaticoComponent), canActivate: [AuthGuard], data: { trackear: true, labelAcceso: 'Reglas Cobro Automático', iconoAcceso: '⚡' } },
  { path: 'administracion/financiero/reglas-cobro-automatico/:accion/:id', loadComponent: () => import('./components/administracion/reglas-cobro-automatico/crear-regla-cobro/crear-regla-cobro.component').then(m => m.CrearReglaCobroComponent), canActivate: [AuthGuard] }
];