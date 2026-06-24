import { Routes } from '@angular/router';
import { AuthGuard } from './core/auth.guard';
import { PermisosGuard } from './core/permisos.guard';

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

  // Rutas del dominio del producto
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
  { path: 'estudiantes-opciones/:id', loadComponent: () => import('./components/estudiantes/opciones-estudiante/opciones-estudiante.component').then(m => m.OpcionesEstudianteComponent), canActivate: [AuthGuard, PermisosGuard], data: { permiso: 'estudiantes.listado' } },
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
  { path: 'administracion/financiero/reglas-cobro-automatico/:accion/:id', loadComponent: () => import('./components/administracion/reglas-cobro-automatico/crear-regla-cobro/crear-regla-cobro.component').then(m => m.CrearReglaCobroComponent), canActivate: [AuthGuard] },

  // Ruta comodín
  { path: '**', redirectTo: 'login' }
];