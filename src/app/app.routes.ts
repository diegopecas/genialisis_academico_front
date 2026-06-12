import { Routes } from '@angular/router';
import { AuthGuard } from './core/auth.guard';
import { PermisosGuard } from './core/permisos.guard';
import { dominioRoutes } from './dominio.routes';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', loadComponent: () => import('./components/login/login.component').then(m => m.LoginComponent) },
  { path: 'menu', loadComponent: () => import('./components/menu/menu.component').then(m => m.MenuComponent), canActivate: [AuthGuard] },
  { path: 'mi-perfil', loadComponent: () => import('./components/mi-perfil/mi-perfil.component').then(m => m.MiPerfilComponent), canActivate: [AuthGuard] },

  // Colaboradores
  { path: 'gestion-colaboradores', loadComponent: () => import('./components/colaboradores/gestion-colaboradores/gestion-colaboradores.component').then(m => m.GestionColaboradoresComponent), canActivate: [AuthGuard], data: { trackear: true, labelAcceso: 'Gestión Colaboradores', iconoAcceso: '👥' } },
  { path: 'colaboradores', loadComponent: () => import('./components/colaboradores/colaboradores.component').then(m => m.ColaboradoresComponent), canActivate: [AuthGuard], data: { trackear: true, labelAcceso: 'Colaboradores', iconoAcceso: '🧑‍💼' } },
  { path: 'colaboradores/:accion/:id', loadComponent: () => import('./components/colaboradores/crear-colaboradores/crear-colaboradores.component').then(m => m.CrearColaboradoresComponent), canActivate: [AuthGuard] },
  { path: 'colaboradores-gestion-tiempo/:id', loadComponent: () => import('./components/colaboradores/gestion-tiempo-colaborador/gestion-tiempo-colaborador.component').then(m => m.GestionTiempoColaboradorComponent), canActivate: [AuthGuard] },
  { path: 'colaboradores-productos-servicios/:id', loadComponent: () => import('./components/colaboradores/productos-servicios/colaboradores-productos-servicios.component').then(m => m.ColaboradoresProductosServiciosComponent), canActivate: [AuthGuard] },
  { path: 'colaboradores-productos-servicios/:accion/:id/:idColaborador', loadComponent: () => import('./components/colaboradores/productos-servicios/crear-colaboradores-productos-servicios/crear-colaboradores-productos-servicios.component').then(m => m.CrearColaboradoresProductosServiciosComponent), canActivate: [AuthGuard] },
  { path: 'colaboradores-pagos-recibidos/:id', loadComponent: () => import('./components/colaboradores/pagos-recibidos/colaboradores-pagos-recibidos.component').then(m => m.ColaboradoresPagosRecibidosComponent), canActivate: [AuthGuard] },
  { path: 'colaboradores-pagos-recibidos/:accion/:id/:idColaborador', loadComponent: () => import('./components/colaboradores/pagos-recibidos/crear-colaboradores-pagos-recibidos/crear-colaboradores-pagos-recibidos.component').then(m => m.CrearColaboradoresPagosRecibidosComponent), canActivate: [AuthGuard] },
  { path: 'colaboradores-pagos-recibidos/comprobante/:id', loadComponent: () => import('./components/colaboradores/pagos-recibidos/comprobante-pago-colaborador-view/comprobante-pago-colaborador-view.component').then(m => m.ComprobantePagoColaboradorViewComponent), canActivate: [AuthGuard] },
  { path: 'colaboradores-prestamos/:id', loadComponent: () => import('./components/colaboradores/prestamos/colaboradores-prestamos.component').then(m => m.ColaboradoresPrestamosComponent), canActivate: [AuthGuard] },
  { path: 'colaboradores-prestamos/:accion/:id/:idColaborador', loadComponent: () => import('./components/colaboradores/prestamos/crear-colaboradores-prestamos/crear-colaboradores-prestamos/crear-colaboradores-prestamos.component').then(m => m.CrearColaboradoresPrestamosComponent), canActivate: [AuthGuard] },
  { path: 'colaboradores-prestamos-pagos/crear/:idPrestamo/:idColaborador', loadComponent: () => import('./components/colaboradores/prestamos/colaboradores-prestamos-pagos/crear-colaboradores-prestamos-pagos.component').then(m => m.CrearColaboradoresPrestamosPagosComponent), canActivate: [AuthGuard] },
  { path: 'colaboradores-contratos/:id', loadComponent: () => import('./components/colaboradores/contratos-colaborador/contratos-colaborador.component').then(m => m.ContratosColaboradorComponent), canActivate: [AuthGuard, PermisosGuard], data: { permiso: 'colaboradores.contratos' } },
  { path: 'colaboradores-contratos/:accion/:id/:idColaborador', loadComponent: () => import('./components/colaboradores/contratos-colaborador/crear-contrato-colaborador/crear-contrato-colaborador.component').then(m => m.CrearContratoColaboradorComponent), canActivate: [AuthGuard, PermisosGuard], data: { permiso: 'colaboradores.contratos.administrar' } },

  // Actividades Colaboradores
  { path: 'administracion/actividades-colaboradores', loadComponent: () => import('./components/colaboradores/actividades-colaboradores/actividades-colaboradores.component').then(m => m.ActividadesColaboradoresComponent), canActivate: [AuthGuard], data: { trackear: true, labelAcceso: 'Actividades Colaboradores', iconoAcceso: '📋' } },
  { path: 'administracion/calendario-colaboradores', loadComponent: () => import('./components/colaboradores/actividades-colaboradores/calendario-colaboradores/calendario-colaboradores.component').then(m => m.CalendarioColaboradoresComponent), canActivate: [AuthGuard], data: { trackear: true, labelAcceso: 'Calendario Colaboradores', iconoAcceso: '📅' } },
  { path: 'administracion/aprobacion-actividades-colaboradores', loadComponent: () => import('./components/colaboradores/actividades-colaboradores/aprobacion-actividades-colaboradores/aprobacion-actividades-colaboradores.component').then(m => m.AprobacionActividadesColaboradoresComponent), canActivate: [AuthGuard], data: { trackear: true, labelAcceso: 'Aprobación Actividades', iconoAcceso: '✅' } },
  { path: 'administracion/contabilizacion-actividades-colaboradores', loadComponent: () => import('./components/colaboradores/actividades-colaboradores/contabilizacion-actividades-colaboradores/contabilizacion-actividades-colaboradores.component').then(m => m.ContabilizacionActividadesColaboradoresComponent), canActivate: [AuthGuard], data: { trackear: true, labelAcceso: 'Contabilización Actividades', iconoAcceso: '🧮' } },

  // Estudiantes
  { path: 'registro', loadComponent: () => import('./components/registro/registro.component').then(m => m.RegistroComponent), canActivate: [AuthGuard] },
  { path: 'salir', loadComponent: () => import('./components/login/login.component').then(m => m.LoginComponent) },

  // Reportes
  { path: 'reportes', loadComponent: () => import('./components/reportes/reportes.component').then(m => m.ReportesComponent), canActivate: [AuthGuard], data: { trackear: true, labelAcceso: 'Reportes', iconoAcceso: '📊' } },
  { path: 'reportes/cartera', loadComponent: () => import('./components/reportes/reporte-cartera/reporte-cartera.component').then(m => m.ReporteCarteraComponent), canActivate: [AuthGuard], data: { trackear: true, labelAcceso: 'Reporte Cartera', iconoAcceso: '💰' } },
  { path: 'reportes/movimientos-financieros', loadComponent: () => import('./components/reportes/reporte-movimientos-financieros/reporte-movimientos-financieros.component').then(m => m.ReporteMovimientosFinancierosComponent), canActivate: [AuthGuard], data: { trackear: true, labelAcceso: 'Ingresos y Egresos', iconoAcceso: '💹' } },
  { path: 'reportes/pagos-recibidos', loadComponent: () => import('./components/reportes/reporte-pagos-recibidos/reporte-pagos-recibidos.component').then(m => m.ReportePagosRecibidosComponent), canActivate: [AuthGuard], data: { trackear: true, labelAcceso: 'Reporte Pagos', iconoAcceso: '💳' } },

  // Reportes de Colaboradores
  { path: 'reportes/reporte-contabilizaciones', loadComponent: () => import('./components/reportes/reporte-contabilizaciones/reporte-contabilizaciones.component').then(m => m.ReporteContabilizacionesComponent), canActivate: [AuthGuard], data: { trackear: true, labelAcceso: 'Reporte Contabilizaciones', iconoAcceso: '🧾' } },

  // Administración
  { path: 'administracion', loadComponent: () => import('./components/administracion/administracion/administracion.component').then(m => m.AdministracionComponent), canActivate: [AuthGuard, PermisosGuard], data: { permiso: 'administracion.ver', trackear: true, labelAcceso: 'Administración', iconoAcceso: '🏛️' } },
  { path: 'administracion/datos-maestros', loadComponent: () => import('./components/administracion/datos-maestros/datos-maestros.component').then(m => m.DatosMaestrosComponent), canActivate: [AuthGuard, PermisosGuard], data: { permiso: 'administracion.datos_maestros', trackear: true, labelAcceso: 'Datos Maestros', iconoAcceso: '🗃️' } },
  { path: 'administracion/financiero', loadComponent: () => import('./components/administracion/financiero/financiero.component').then(m => m.FinancieroComponent), canActivate: [AuthGuard], data: { trackear: true, labelAcceso: 'Financiero', iconoAcceso: '💵' } },
  { path: 'administracion/financiero/movimientos-financieros', loadComponent: () => import('./components/administracion/movimientos-financieros/movimientos-financieros.component').then(m => m.MovimientosFinancierosComponent), canActivate: [AuthGuard], data: { trackear: true, labelAcceso: 'Movimientos Financieros', iconoAcceso: '💸' } },
  { path: 'administracion/financiero/movimientos-financieros/:accion/:id', loadComponent: () => import('./components/administracion/movimientos-financieros/crear-movimiento/crear-movimiento.component').then(m => m.CrearMovimientoComponent), canActivate: [AuthGuard] },
  { path: 'administracion/financiero/aprobacion-multiple', loadComponent: () => import('./components/administracion/aprobacion-multiple-financiero/aprobacion-multiple-financiero.component').then(m => m.AprobacionMultipleFinancieroComponent), canActivate: [AuthGuard], data: { trackear: true, labelAcceso: 'Aprobación Múltiple', iconoAcceso: '✅' } },
  { path: 'administracion/financiero/registro-pagos-rapido', loadComponent: () => import('./components/administracion/registro-pagos-rapido/registro-pagos-rapido.component').then(m => m.RegistroPagosRapidoComponent), canActivate: [AuthGuard], data: { trackear: true, labelAcceso: 'Registro Pagos Rápido', iconoAcceso: '⚡' } },
  { path: 'administracion/contabilizacion-multiple', loadComponent: () => import('./components/administracion/contabilizacion-multiple/contabilizacion-multiple.component').then(m => m.ContabilizacionMultipleComponent), canActivate: [AuthGuard], data: { trackear: true, labelAcceso: 'Contabilización Múltiple', iconoAcceso: '🧮' } },
  { path: 'configuracion', loadComponent: () => import('./components/configuracion/configuracion.component').then(m => m.ConfiguracionComponent), canActivate: [AuthGuard] },
  { path: 'usuarios', loadComponent: () => import('./components/usuarios/usuarios.component').then(m => m.UsuariosComponent), canActivate: [AuthGuard] },

  // Asistencia
  { path: 'administracion/productos-alimentacion', loadComponent: () => import('./components/administracion/productos-alimentacion/productos-alimentacion.component').then(m => m.ProductosAlimentacionComponent), canActivate: [AuthGuard], data: { trackear: true, labelAcceso: 'Productos Alimentación', iconoAcceso: '🥗' } },
  { path: 'administracion/productos-alimentacion/:accion/:id', loadComponent: () => import('./components/administracion/productos-alimentacion/crear-productos-alimentacion/crear-producto-alimentacion.component').then(m => m.CrearProductoAlimentacionComponent), canActivate: [AuthGuard] },
  { path: 'administracion/productos', loadComponent: () => import('./components/administracion/productos/productos.component').then(m => m.ProductosComponent), canActivate: [AuthGuard, PermisosGuard], data: { permiso: 'admin.productos', trackear: true, labelAcceso: 'Productos', iconoAcceso: '📦' } },
  { path: 'administracion/productos/:accion/:id', loadComponent: () => import('./components/administracion/productos/crear-producto/crear-producto.component').then(m => m.CrearProductoComponent), canActivate: [AuthGuard, PermisosGuard], data: { permiso: 'admin.productos' } },
  { path: 'administracion/proveedores', loadComponent: () => import('./components/administracion/proveedores/proveedores.component').then(m => m.ProveedoresComponent), canActivate: [AuthGuard], data: { trackear: true, labelAcceso: 'Proveedores', iconoAcceso: '🚚' } },
  { path: 'administracion/proveedores/:accion/:id', loadComponent: () => import('./components/administracion/proveedores/crear-proveedor/crear-proveedor.component').then(m => m.CrearProveedorComponent), canActivate: [AuthGuard] },
  { path: 'administracion/productos-mobiliario', loadComponent: () => import('./components/administracion/productos-mobiliario/productos-mobiliario.component').then(m => m.ProductosMobiliarioComponent), canActivate: [AuthGuard], data: { trackear: true, labelAcceso: 'Productos Mobiliario', iconoAcceso: '🪑' } },
  { path: 'administracion/productos-mobiliario/:accion/:id', loadComponent: () => import('./components/administracion/productos-mobiliario/crear-producto-mobiliario/crear-producto-mobiliario.component').then(m => m.CrearProductoMobiliarioComponent), canActivate: [AuthGuard] },
  { path: 'administracion/productos-limpieza', loadComponent: () => import('./components/administracion/productos-limpieza/productos-limpieza.component').then(m => m.ProductosLimpiezaComponent), canActivate: [AuthGuard], data: { trackear: true, labelAcceso: 'Productos Limpieza', iconoAcceso: '🧹' } },
  { path: 'administracion/productos-limpieza/:accion/:id', loadComponent: () => import('./components/administracion/productos-limpieza/crear-producto-limpieza/crear-producto-limpieza.component').then(m => m.CrearProductoLimpiezaComponent), canActivate: [AuthGuard] },
  { path: 'administracion/areas-fisicas', loadComponent: () => import('./components/administracion/areas-fisicas/areas-fisicas.component').then(m => m.AreasFisicasComponent), canActivate: [AuthGuard], data: { trackear: true, labelAcceso: 'Áreas Físicas', iconoAcceso: '🏗️' } },
  { path: 'administracion/areas-fisicas/:accion/:id', loadComponent: () => import('./components/administracion/areas-fisicas/crear-area-fisica/crear-area-fisica.component').then(m => m.CrearAreaFisicaComponent), canActivate: [AuthGuard] },
  { path: 'administracion/elementos-fisicos', loadComponent: () => import('./components/administracion/elementos-fisicos/elementos-fisicos.component').then(m => m.ElementosFisicosComponent), canActivate: [AuthGuard], data: { trackear: true, labelAcceso: 'Elementos Físicos', iconoAcceso: '🔧' } },
  { path: 'administracion/elementos-fisicos/:accion/:id', loadComponent: () => import('./components/administracion/elementos-fisicos/crear-elemento-fisico/crear-elemento-fisico.component').then(m => m.CrearElementoFisicoComponent), canActivate: [AuthGuard] },
  { path: 'administracion/cargos', loadComponent: () => import('./components/administracion/cargos/cargos.component').then(m => m.CargosComponent), canActivate: [AuthGuard], data: { trackear: true, labelAcceso: 'Cargos', iconoAcceso: '💼' } },
  { path: 'administracion/cargos/:accion/:id', loadComponent: () => import('./components/administracion/cargos/crear-cargo/crear-cargo.component').then(m => m.CrearCargoComponent), canActivate: [AuthGuard] },
  { path: 'administracion/tipos-documentos', loadComponent: () => import('./components/administracion/tipos-documentos/tipos-documentos.component').then(m => m.TiposDocumentosComponent), canActivate: [AuthGuard], data: { trackear: true, labelAcceso: 'Tipos Documentos', iconoAcceso: '📄' } },
  { path: 'administracion/tipos-documentos/:accion/:id', loadComponent: () => import('./components/administracion/tipos-documentos/crear-tipo-documento/crear-tipo-documento.component').then(m => m.CrearTipoDocumentoComponent), canActivate: [AuthGuard] },
  { path: 'administracion/configuracion-ia', loadComponent: () => import('./components/administracion/configuracion-ia/configuracion-ia.component').then(m => m.ConfiguracionIaComponent), canActivate: [AuthGuard], data: { trackear: true, labelAcceso: 'Configuración IA', iconoAcceso: '🤖' } },
  { path: 'administracion/configuracion-ia/:accion/:id', loadComponent: () => import('./components/administracion/configuracion-ia/editar-configuracion-ia/editar-configuracion-ia.component').then(m => m.EditarConfiguracionIaComponent), canActivate: [AuthGuard] },
  { path: 'administracion/configuracion-google', loadComponent: () => import('./components/administracion/configuracion-google/configuracion-google.component').then(m => m.ConfiguracionGoogleComponent), canActivate: [AuthGuard], data: { trackear: true, labelAcceso: 'Configuración Google', iconoAcceso: '📅' } },
  { path: 'administracion/configuracion-google/:accion/:id', loadComponent: () => import('./components/administracion/configuracion-google/editar-configuracion-google/editar-configuracion-google.component').then(m => m.EditarConfiguracionGoogleComponent), canActivate: [AuthGuard] },
  { path: 'administracion/configuracion/configuracion-global', loadComponent: () => import('./components/administracion/configuracion/configuracion-global/configuracion-global.component').then(m => m.ConfiguracionGlobalComponent), canActivate: [AuthGuard], data: { trackear: true, labelAcceso: 'Configuración Global', iconoAcceso: '⚙️' } },
  { path: 'administracion/configuracion/configuracion-global/:accion/:id', loadComponent: () => import('./components/administracion/configuracion/configuracion-global/editar-configuracion-global/editar-configuracion-global.component').then(m => m.EditarConfiguracionGlobalComponent), canActivate: [AuthGuard] },
  { path: 'administracion/configuracion/plantillas', loadComponent: () => import('./components/administracion/configuracion/plantillas/plantillas.component').then(m => m.PlantillasComponent), canActivate: [AuthGuard], data: { trackear: true, labelAcceso: 'Plantillas', iconoAcceso: '📃' } },
  { path: 'administracion/configuracion/plantillas/:accion/:id', loadComponent: () => import('./components/administracion/configuracion/plantillas/editar-plantilla/editar-plantilla.component').then(m => m.EditarPlantillaComponent), canActivate: [AuthGuard] },

  // CRM
  { path: 'administracion/crm', loadComponent: () => import('./components/administracion/crm/crm.component').then(m => m.CrmComponent), canActivate: [AuthGuard], data: { trackear: true, labelAcceso: 'CRM', iconoAcceso: '🤝' } },
  { path: 'administracion/crm/visitas', loadComponent: () => import('./components/administracion/crm/visitas/visitas.component').then(m => m.VisitasComponent), canActivate: [AuthGuard], data: { trackear: true, labelAcceso: 'CRM Visitas', iconoAcceso: '🚶' } },
  { path: 'administracion/crm/visitas/:accion/:id', loadComponent: () => import('./components/administracion/crm/crear-visita/crear-visita.component').then(m => m.CrearVisitaComponent), canActivate: [AuthGuard] },
  { path: 'administracion/crm/dashboard', loadComponent: () => import('./components/administracion/crm/dashboard-crm/dashboard-crm.component').then(m => m.DashboardCrmComponent), canActivate: [AuthGuard], data: { trackear: true, labelAcceso: 'Dashboard CRM', iconoAcceso: '📊' } },
  { path: 'administracion/crm/contactos-portal', loadComponent: () => import('./components/administracion/crm/contactos-portal/contactos-portal.component').then(m => m.ContactosPortalComponent), canActivate: [AuthGuard], data: { trackear: true, labelAcceso: 'Contactos Portal', iconoAcceso: '📞' } },
  { path: 'administracion/crm/contactos-portal/:accion/:id', loadComponent: () => import('./components/administracion/crm/contactos-portal/gestionar-contacto-portal/gestionar-contacto-portal.component').then(m => m.GestionarContactoPortalComponent), canActivate: [AuthGuard] },

  // Operaciones
  { path: 'operaciones', loadComponent: () => import('./components/operaciones/operaciones.component').then(m => m.OperacionesComponent), canActivate: [AuthGuard], data: { trackear: true, labelAcceso: 'Operaciones', iconoAcceso: '⚙️' } },
  { path: 'operaciones/movimientos-productos', loadComponent: () => import('./components/operaciones/movimientos-productos/movimientos-productos.component').then(m => m.MovimientosProductosComponent), canActivate: [AuthGuard], data: { trackear: true, labelAcceso: 'Movimientos Productos', iconoAcceso: '📦' } },
  { path: 'operaciones/movimientos-productos/:accion/:id', loadComponent: () => import('./components/operaciones/movimientos-productos/crear-movimientos/crear-movimiento-producto.component').then(m => m.CrearMovimientoProductoComponent), canActivate: [AuthGuard] },
  { path: 'operaciones/movimientos-productos/comprobante/:id', loadComponent: () => import('./components/operaciones/movimientos-productos/movimiento-comprobante/movimiento-comprobante.component').then(m => m.MovimientoComprobanteComponent), canActivate: [AuthGuard] },
  { path: 'operaciones/registros-limpieza', loadComponent: () => import('./components/operaciones/registros-limpieza/registros-limpieza.component').then(m => m.RegistrosLimpiezaComponent), canActivate: [AuthGuard], data: { trackear: true, labelAcceso: 'Registros Limpieza', iconoAcceso: '🧼' } },
  { path: 'operaciones/registros-limpieza/:accion/:id', loadComponent: () => import('./components/operaciones/registros-limpieza/crear-registro-limpieza/crear-registro-limpieza.component').then(m => m.CrearRegistroLimpiezaComponent), canActivate: [AuthGuard] },

  // Nóminas
  { path: 'administracion/nominas', loadComponent: () => import('./components/colaboradores/nominas/nominas.component').then(m => m.NominasComponent), canActivate: [AuthGuard], data: { trackear: true, labelAcceso: 'Nóminas', iconoAcceso: '💰' } },
  { path: 'administracion/nominas/:accion/:id', loadComponent: () => import('./components/colaboradores/nominas/crear-nomina/crear-nomina.component').then(m => m.CrearNominaComponent), canActivate: [AuthGuard] },

  // Productos y Servicios
  { path: 'administracion/productos-servicios', loadComponent: () => import('./components/administracion/productos-servicios/listar-productos-servicios.component').then(m => m.ListarProductosServiciosComponent), canActivate: [AuthGuard], data: { trackear: true, labelAcceso: 'Productos y Servicios', iconoAcceso: '🛒' } },
  { path: 'administracion/productos-servicios/:accion/:id', loadComponent: () => import('./components/administracion/productos-servicios/crear-producto-servicio/crear-producto-servicio.component').then(m => m.CrearProductoServicioComponent), canActivate: [AuthGuard] },

  // Seguridad - Permisos por Rol
  { path: 'administracion/seguridad/permisos', loadComponent: () => import('./components/administracion/seguridad/permisos-rol/permisos-rol.component').then(m => m.PermisosRolComponent), canActivate: [AuthGuard], data: { trackear: true, labelAcceso: 'Permisos por Rol', iconoAcceso: '🔐' } },

  // Documentación del Sistema
  { path: 'administracion/documentacion-sistema', loadComponent: () => import('./components/administracion/documentacion-sistema/documentacion-sistema.component').then(m => m.DocumentacionSistemaComponent), canActivate: [AuthGuard], data: { trackear: true, labelAcceso: 'Documentación', iconoAcceso: '📖' } },
  { path: 'registro-ingreso-salida', loadComponent: () => import('./components/colaboradores/registro-ingreso-salida/registro-ingreso-salida.component').then(m => m.RegistroIngresoSalidaComponent), canActivate: [AuthGuard] },
  { path: 'asistencia-colaborador/:id', loadComponent: () => import('./components/colaboradores/asistencia-colaborador/asistencia-colaborador.component').then(m => m.AsistenciaColaboradorComponent), canActivate: [AuthGuard] },
  { path: 'reportes/asistencia-colaboradores', loadComponent: () => import('./components/reportes/reporte-asistencia-colaboradores/reporte-asistencia-colaboradores.component').then(m => m.ReporteAsistenciaColaboradoresComponent), canActivate: [AuthGuard], data: { trackear: true, labelAcceso: 'Asistencia Colaboradores', iconoAcceso: '📋' } },

  // Convenios
  { path: 'administracion/financiero/convenios', loadComponent: () => import('./components/administracion/convenios/convenios.component').then(m => m.ConveniosComponent), canActivate: [AuthGuard], data: { trackear: true, labelAcceso: 'Convenios', iconoAcceso: '📝' } },
  { path: 'administracion/financiero/convenios/:accion/:id', loadComponent: () => import('./components/administracion/convenios/crear-convenio/crear-convenio.component').then(m => m.CrearConvenioComponent), canActivate: [AuthGuard] },

  // Plantillas WhatsApp
  { path: 'administracion/plantillas-whatsapp', loadComponent: () => import('./components/administracion/plantillas-whatsapp/plantillas-whatsapp.component').then(m => m.PlantillasWhatsappComponent), canActivate: [AuthGuard], data: { trackear: true, labelAcceso: 'Plantillas WhatsApp', iconoAcceso: '💬' } },

  // Conexión WhatsApp (Embedded Signup)
  { path: 'administracion/conectar-whatsapp', loadComponent: () => import('./components/administracion/conectar-whatsapp/conectar-whatsapp.component').then(m => m.ConectarWhatsappComponent), canActivate: [AuthGuard], data: { trackear: true, labelAcceso: 'Conexión WhatsApp', iconoAcceso: '🔌' } },

  // Configuración Geofence
  { path: 'administracion/configuracion-geofence', loadComponent: () => import('./components/administracion/configuracion-geofence/configuracion-geofence.component').then(m => m.ConfiguracionGeofenceComponent), canActivate: [AuthGuard], data: { trackear: true, labelAcceso: 'Configuración Geofence', iconoAcceso: '📍' } },

  // Rutas del dominio del producto (vacío en el núcleo; cada producto aporta las suyas)
  ...dominioRoutes,

  // Ruta comodín
  { path: '**', redirectTo: 'login' }
];