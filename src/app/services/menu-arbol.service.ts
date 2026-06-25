import { Injectable } from '@angular/core';

/**
 * Nodo del árbol de menú.
 * - Si tiene `ruta` es una hoja navegable.
 * - Si tiene `hijos` es un grupo expandible.
 * - `permiso` (opcional) gatea la visibilidad; los nodos sin permiso se muestran siempre.
 * - `keywords` (opcional) son términos alternativos para que la búsqueda encuentre el nodo
 *   aunque el usuario escriba una palabra distinta al label.
 */
export interface MenuNodo {
  id: string;
  label: string;
  icono: string;
  imagen?: string;
  ruta?: string;
  permiso?: string;
  keywords?: string[];
  hijos?: MenuNodo[];
}

@Injectable({
  providedIn: 'root'
})
export class MenuArbolService {

  /**
   * Devuelve el árbol completo del menú.
   * Por ahora está declarado en código; más adelante se reemplaza por una
   * consulta a la tabla del menú sin cambiar la firma de este método.
   */
  getArbol(): MenuNodo[] {
    return [
      {
        id: 'estudiantes',
        label: 'Estudiantes',
        icono: '🎓',
        imagen: '/assets/images/estudiantes.png',
        ruta: '/estudiantes',
        permiso: 'estudiantes.listado',
        keywords: ['alumnos', 'niños', 'matricula', 'matrícula', 'estudiantado', 'parvulos']
      },
      {
        id: 'academico',
        label: 'Académico',
        icono: '🎓',
        imagen: '/assets/images/academico.png',
        keywords: ['curriculo', 'currículo', 'pedagogico', 'clases', 'ensenanza', 'notas'],
        hijos: [
          { id: 'academico-inicio', label: 'Panel Académico', icono: '🎓', ruta: '/academico' },
          {
            id: 'academico-estructura',
            label: 'Estructura',
            icono: '🏫',
            hijos: [
              { id: 'academico-grados', label: 'Grados', icono: '📚', ruta: '/academico/grados', keywords: ['niveles', 'cursos'] },
              { id: 'academico-grupos', label: 'Grupos', icono: '👨‍👩‍👧‍👦', ruta: '/academico/grupos', keywords: ['salones', 'aulas', 'cursos'] },
              { id: 'academico-areas', label: 'Áreas Académicas', icono: '📖', ruta: '/academico/areas-academicas', keywords: ['materias', 'asignaturas'] },
              { id: 'academico-cortes', label: 'Cortes Académicos', icono: '📅', ruta: '/academico/cortes-academicos', keywords: ['periodos', 'trimestres', 'bimestres'] },
              { id: 'academico-cursos-extra', label: 'Cursos Extracurriculares', icono: '🎭', ruta: '/academico/cursos-extra', keywords: ['extracurriculares', 'talleres'] }
            ]
          },
          {
            id: 'academico-curriculo',
            label: 'Currículo',
            icono: '🗺️',
            keywords: ['plan de estudios', 'pensum'],
            hijos: [
              { id: 'academico-logros', label: 'Logros', icono: '🏆', ruta: '/academico/logros', keywords: ['competencias', 'desempenos'] },
              { id: 'academico-indicadores', label: 'Indicadores Logros', icono: '🎯', ruta: '/academico/indicadores-logros', keywords: ['indicadores'] },
              { id: 'academico-sprints', label: 'Sprints', icono: '🏃', ruta: '/academico/sprints', keywords: ['unidades', 'proyectos'] },
              { id: 'academico-parametros-calif', label: 'Parámetros Calificaciones', icono: '⚙️', ruta: '/academico/parametros-calificaciones', keywords: ['escala de notas', 'escala'] }
            ]
          },
          {
            id: 'academico-actividades',
            label: 'Actividades',
            icono: '📝',
            keywords: ['tareas', 'trabajos'],
            hijos: [
              { id: 'academico-act-academicas', label: 'Actividades Académicas', icono: '📝', ruta: '/academico/actividades-academicas', keywords: ['tareas', 'trabajos'] },
              { id: 'academico-selector-act', label: 'Selector Actividades', icono: '🎯', ruta: '/academico/selector-actividades' },
              { id: 'academico-maquina-act', label: 'Máquina Actividades', icono: '🤖', ruta: '/academico/maquina-actividades', keywords: ['ia', 'inteligencia artificial', 'generador'] },
              { id: 'academico-crear-act-manual', label: 'Crear Actividades Manual', icono: '✏️', ruta: '/academico/crear-actividades-manual' },
              { id: 'academico-crear-act-eval', label: 'Actividades de Evaluación', icono: '🎯', ruta: '/academico/crear-actividades-evaluacion', keywords: ['evaluacion', 'examenes'] },
              { id: 'academico-importar-sprint', label: 'Importar de Sprint', icono: '📋', ruta: '/academico/importar-actividades-sprint' },
              { id: 'academico-clases-ia', label: 'Clases IA', icono: '🤖', ruta: '/clases-ia', keywords: ['ia', 'inteligencia artificial', 'ingles', 'gini'] }
            ]
          }
        ]
      },
      {
        id: 'calificaciones',
        label: 'Calificaciones',
        icono: '⭐',
        imagen: '/assets/images/reporte.png',
        ruta: '/calificacion',
        keywords: ['notas', 'evaluacion', 'puntajes', 'calificar']
      },
      {
        id: 'asistencia',
        label: 'Asistencia',
        icono: '✋',
        imagen: '/assets/images/asistencia.png',
        ruta: '/asistencia',
        keywords: ['inasistencia', 'faltas', 'presente', 'llegadas']
      },
      {
        id: 'reportes',
        label: 'Reportes',
        icono: '📊',
        imagen: '/assets/images/detalle.png',
        keywords: ['informes', 'reporteria', 'estadisticas', 'tablero'],
        hijos: [
          { id: 'reportes-inicio', label: 'Reportes', icono: '📊', ruta: '/reportes' },
          {
            id: 'reportes-financieros',
            label: 'Financieros',
            icono: '💵',
            keywords: ['dinero', 'plata', 'finanzas'],
            hijos: [
              { id: 'reportes-cartera', label: 'Reporte Cartera', icono: '💰', ruta: '/reportes/cartera', keywords: ['deudas', 'cuentas por cobrar', 'morosos', 'cobranza'] },
              { id: 'reportes-mov-financieros', label: 'Ingresos y Egresos', icono: '💹', ruta: '/reportes/movimientos-financieros', keywords: ['movimientos financieros', 'gastos', 'flujo', 'plata'] },
              { id: 'reportes-pagos', label: 'Reporte Pagos', icono: '💳', ruta: '/reportes/pagos-recibidos', keywords: ['pagos recibidos', 'recaudo'] },
              { id: 'reportes-cobros', label: 'Cobros Realizados', icono: '🧾', ruta: '/reportes/cobros-realizados', keywords: ['cobros', 'recaudo'] },
              { id: 'reportes-reportes-pago', label: 'Reportes de Pago', icono: '📑', ruta: '/reportes/reportes-pago' },
              { id: 'reportes-dashboard-gerencial', label: 'Dashboard Gerencial', icono: '📊', ruta: '/reportes/dashboard-gerencial', permiso: 'dashboard.gerencial.listado', keywords: ['indicadores', 'gerencia', 'tablero'] }
            ]
          },
          {
            id: 'reportes-academicos',
            label: 'Académicos',
            icono: '📚',
            keywords: ['notas', 'boletines'],
            hijos: [
              { id: 'reportes-acad-estudiante', label: 'Reportes Académicos', icono: '📄', ruta: '/reportes/academicos-estudiante', keywords: ['boletines', 'notas'] },
              { id: 'reportes-calif-sprint', label: 'Calificaciones Sprint', icono: '📝', ruta: '/reportes/calificaciones-sprint', keywords: ['notas'] },
              { id: 'reportes-calif-pdm', label: 'Calificaciones PDM', icono: '📝', ruta: '/reportes/calificaciones-pdm', keywords: ['notas'] },
              { id: 'reportes-calif-estudiante', label: 'Calificaciones Estudiante', icono: '🎯', ruta: '/reportes/calificaciones/estudiante', keywords: ['notas', 'boletin'] },
              { id: 'reportes-monitoreo-sprint', label: 'Monitoreo Sprint', icono: '🏃', ruta: '/reportes/monitoreo-sprint' },
              { id: 'reportes-malla', label: 'Malla Curricular', icono: '🗺️', ruta: '/reportes/malla-curricular', keywords: ['plan de estudios', 'pensum'] },
              { id: 'reportes-cobertura', label: 'Cobertura Curricular', icono: '📈', ruta: '/reportes/cobertura-curricular', keywords: ['avance'] },
              { id: 'reportes-cursos-extra', label: 'Reporte Cursos Extra', icono: '🎭', ruta: '/reportes/cursos-extra', keywords: ['extracurriculares', 'talleres'] }
            ]
          },
          {
            id: 'reportes-operativos',
            label: 'Operativos',
            icono: '📋',
            hijos: [
              { id: 'reportes-estudiantes-general', label: 'Reporte Estudiantes', icono: '📋', ruta: '/reportes/estudiantes-general', keywords: ['listado estudiantes', 'alumnos'] },
              { id: 'reportes-asistencia', label: 'Reporte Asistencia', icono: '✋', ruta: '/reportes/asistencia', keywords: ['faltas', 'inasistencia'] },
              { id: 'reportes-alimentacion', label: 'Reporte Alimentación', icono: '🍎', ruta: '/reportes/alimentacion', keywords: ['comida', 'onces', 'refrigerios'] },
              { id: 'reportes-tamizajes', label: 'Tamizajes', icono: '🔬', ruta: '/reportes/tamizajes', keywords: ['salud', 'valoracion'] },
              { id: 'reportes-ejecucion-tareas', label: 'Ejecución de Tareas', icono: '📊', ruta: '/reportes/ejecucion-tareas' }
            ]
          }
        ]
      },
      {
        id: 'operaciones',
        label: 'Operaciones',
        icono: '⚙️',
        imagen: '/assets/images/operaciones.png',
        keywords: ['operativo', 'dia a dia', 'gestion diaria'],
        hijos: [
          { id: 'operaciones-inicio', label: 'Operaciones', icono: '⚙️', ruta: '/operaciones' },
          {
            id: 'operaciones-alimentacion',
            label: 'Alimentación',
            icono: '🍽️',
            keywords: ['comida', 'onces', 'refrigerios', 'cocina'],
            hijos: [
              { id: 'operaciones-salidas-alim', label: 'Salidas Alimentación', icono: '🍱', ruta: '/operaciones/salidas-alimentacion', keywords: ['comida', 'onces'] },
              { id: 'operaciones-entrega-alim', label: 'Entrega Alimentación', icono: '🍽️', ruta: '/operaciones/entrega-alimentacion', keywords: ['comida', 'onces'] },
              { id: 'operaciones-inventario-alim', label: 'Inventario Alimentación', icono: '📦', ruta: '/operaciones/inventario-alimentacion', keywords: ['stock', 'comida'] },
              { id: 'operaciones-disponibilidad-cocina', label: 'Disponibilidad Cocina', icono: '🍳', ruta: '/operaciones/disponibilidad-cocina', keywords: ['cocina', 'menu'] },
              { id: 'operaciones-asignacion-onces', label: 'Asignación de Onces', icono: '🍱', ruta: '/operaciones/asignacion-onces', keywords: ['onces', 'refrigerios'] }
            ]
          },
          {
            id: 'operaciones-productos',
            label: 'Productos',
            icono: '📦',
            keywords: ['inventario', 'stock', 'bodega'],
            hijos: [
              { id: 'operaciones-mov-productos', label: 'Movimientos Productos', icono: '📦', ruta: '/operaciones/movimientos-productos', keywords: ['inventario', 'stock', 'bodega'] },
              { id: 'operaciones-registros-limpieza', label: 'Registros Limpieza', icono: '🧼', ruta: '/operaciones/registros-limpieza', keywords: ['aseo', 'limpieza'] }
            ]
          },
          {
            id: 'operaciones-estudiantes',
            label: 'Estudiantes',
            icono: '🎓',
            keywords: ['alumnos', 'ninos'],
            hijos: [
              { id: 'operaciones-registro-medidas', label: 'Registro Medidas', icono: '📏', ruta: '/operaciones/registro-medidas', keywords: ['talla', 'peso', 'antropometria'] },
              { id: 'operaciones-eval-desarrollo', label: 'Evaluación Desarrollo', icono: '📈', ruta: '/operaciones/evaluacion-desarrollo', keywords: ['ead', 'desarrollo', 'valoracion'] },
              { id: 'operaciones-actualizacion-datos', label: 'Actualización Datos', icono: '🔄', ruta: '/operaciones/actualizacion-datos-estudiantes', keywords: ['datos estudiantes', 'actualizar'] },
              { id: 'operaciones-galerias', label: 'Galerías', icono: '🖼️', ruta: '/operaciones/galerias', keywords: ['fotos', 'imagenes', 'album'] },
              { id: 'operaciones-inscripcion-cursos', label: 'Inscripción Cursos Extra', icono: '🎭', ruta: '/operaciones/inscripcion-cursos-extra', keywords: ['extracurriculares', 'talleres'] },
              { id: 'operaciones-observaciones-informe', label: 'Observaciones para Informe', icono: '📝', ruta: '/operaciones/observaciones-informe', permiso: 'estudiantes.observaciones.administrar', keywords: ['observaciones', 'informe'] }
            ]
          },
          {
            id: 'operaciones-comunicaciones',
            label: 'Comunicaciones y Seguimiento',
            icono: '📢',
            keywords: ['whatsapp', 'avisos', 'notificaciones'],
            hijos: [
              { id: 'operaciones-recordatorio-pagos', label: 'Recordatorio Pagos', icono: '💬', ruta: '/operaciones/recordatorio-pagos', keywords: ['cobro', 'whatsapp'] },
              { id: 'operaciones-seguimiento-asistencia', label: 'Seguimiento Asistencia', icono: '📋', ruta: '/operaciones/seguimiento-asistencia', keywords: ['faltas', 'inasistencia'] },
              { id: 'operaciones-recordatorios-generales', label: 'Recordatorios Generales', icono: '📢', ruta: '/operaciones/recordatorios-generales', keywords: ['avisos', 'notificaciones', 'whatsapp'] }
            ]
          }
        ]
      },
      {
        id: 'colaboradores',
        label: 'Colaboradores',
        icono: '🧑‍💼',
        imagen: '/assets/images/colaboradores.png',
        keywords: ['empleados', 'personal', 'trabajadores', 'staff'],
        hijos: [
          {
            id: 'colaboradores-gestion',
            label: 'Gestión',
            icono: '👥',
            keywords: ['empleados', 'personal'],
            hijos: [
              { id: 'colaboradores-gestion-colab', label: 'Gestión Colaboradores', icono: '👥', ruta: '/gestion-colaboradores', keywords: ['empleados', 'personal', 'staff'] },
              { id: 'colaboradores-listado', label: 'Colaboradores', icono: '🧑‍💼', ruta: '/colaboradores', keywords: ['empleados', 'personal'] }
            ]
          },
          {
            id: 'colaboradores-actividades',
            label: 'Actividades',
            icono: '📋',
            keywords: ['tareas', 'agenda'],
            hijos: [
              { id: 'colaboradores-act-colab', label: 'Actividades Colaboradores', icono: '📋', ruta: '/administracion/actividades-colaboradores', keywords: ['tareas'] },
              { id: 'colaboradores-calendario', label: 'Calendario Colaboradores', icono: '📅', ruta: '/administracion/calendario-colaboradores', keywords: ['agenda'] },
              { id: 'colaboradores-aprobacion-act', label: 'Aprobación Actividades', icono: '✅', ruta: '/administracion/aprobacion-actividades-colaboradores', keywords: ['aprobar'] },
              { id: 'colaboradores-contab-act', label: 'Contabilización Actividades', icono: '🧮', ruta: '/administracion/contabilizacion-actividades-colaboradores', keywords: ['contabilizar'] }
            ]
          },
          {
            id: 'colaboradores-nomina',
            label: 'Nómina',
            icono: '💰',
            keywords: ['sueldos', 'salarios'],
            hijos: [
              { id: 'colaboradores-nominas', label: 'Nóminas', icono: '💰', ruta: '/administracion/nominas', keywords: ['sueldos', 'salarios', 'pago empleados'] }
            ]
          },
          {
            id: 'colaboradores-reportes',
            label: 'Reportes de Colaboradores',
            icono: '📜',
            keywords: ['informes'],
            hijos: [
              { id: 'colaboradores-rep-asistencia', label: 'Asistencia Colaboradores', icono: '📋', ruta: '/reportes/asistencia-colaboradores', keywords: ['faltas', 'ingreso', 'marcacion'] },
              { id: 'colaboradores-rep-contabilizaciones', label: 'Reporte Contabilizaciones', icono: '🧾', ruta: '/reportes/reporte-contabilizaciones' },
              { id: 'colaboradores-rep-historial', label: 'Historial Actividades', icono: '📜', ruta: '/reportes/historial-actividades' }
            ]
          }
        ]
      },
      {
        id: 'administracion',
        label: 'Administración',
        icono: '🏛️',
        imagen: '/assets/images/administracion.png',
        permiso: 'administracion.ver',
        keywords: ['admin', 'configuracion', 'ajustes', 'parametros'],
        hijos: [
          { id: 'administracion-inicio', label: 'Administración', icono: '🏛️', ruta: '/administracion', permiso: 'administracion.ver' },
          { id: 'administracion-datos-maestros', label: 'Datos Maestros', icono: '🗃️', ruta: '/administracion/datos-maestros', permiso: 'administracion.datos_maestros', keywords: ['catalogos', 'parametros'] },
          {
            id: 'administracion-financiero',
            label: 'Financiero',
            icono: '💵',
            keywords: ['dinero', 'plata', 'finanzas'],
            hijos: [
              { id: 'administracion-fin-inicio', label: 'Financiero', icono: '💵', ruta: '/administracion/financiero' },
              { id: 'administracion-fin-movimientos', label: 'Movimientos Financieros', icono: '💸', ruta: '/administracion/financiero/movimientos-financieros', keywords: ['ingresos', 'egresos', 'gastos'] },
              { id: 'administracion-fin-aprobacion', label: 'Aprobación Múltiple', icono: '✅', ruta: '/administracion/financiero/aprobacion-multiple', keywords: ['aprobar'] },
              { id: 'administracion-fin-registro-pagos', label: 'Registro Pagos Rápido', icono: '⚡', ruta: '/administracion/financiero/registro-pagos-rapido', keywords: ['recaudo', 'pagos'] },
              { id: 'administracion-fin-contab-multiple', label: 'Contabilización Múltiple', icono: '🧮', ruta: '/administracion/contabilizacion-multiple', keywords: ['contabilizar'] },
              { id: 'administracion-fin-convenios', label: 'Convenios', icono: '📝', ruta: '/administracion/financiero/convenios', keywords: ['acuerdos', 'descuentos'] },
              { id: 'administracion-fin-reglas-cobro', label: 'Reglas Cobro Automático', icono: '⚡', ruta: '/administracion/financiero/reglas-cobro-automatico', keywords: ['cobro automatico', 'facturacion'] }
            ]
          },
          {
            id: 'administracion-productos',
            label: 'Productos e Inventario',
            icono: '📦',
            keywords: ['inventario', 'stock', 'bodega'],
            hijos: [
              { id: 'administracion-prod', label: 'Productos', icono: '📦', ruta: '/administracion/productos', permiso: 'admin.productos', keywords: ['inventario', 'articulos'] },
              { id: 'administracion-prod-servicios', label: 'Productos y Servicios', icono: '🛒', ruta: '/administracion/productos-servicios', keywords: ['servicios', 'tarifas', 'precios'] },
              { id: 'administracion-prod-alimentacion', label: 'Productos Alimentación', icono: '🥗', ruta: '/administracion/productos-alimentacion', keywords: ['comida'] },
              { id: 'administracion-prod-academico', label: 'Productos Académico', icono: '📚', ruta: '/administracion/productos-academico' },
              { id: 'administracion-prod-mobiliario', label: 'Productos Mobiliario', icono: '🪑', ruta: '/administracion/productos-mobiliario', keywords: ['muebles'] },
              { id: 'administracion-prod-limpieza', label: 'Productos Limpieza', icono: '🧹', ruta: '/administracion/productos-limpieza', keywords: ['aseo'] },
              { id: 'administracion-proveedores', label: 'Proveedores', icono: '🚚', ruta: '/administracion/proveedores', keywords: ['compras'] },
              { id: 'administracion-areas-fisicas', label: 'Áreas Físicas', icono: '🏗️', ruta: '/administracion/areas-fisicas', keywords: ['espacios', 'salones'] },
              { id: 'administracion-elementos-fisicos', label: 'Elementos Físicos', icono: '🔧', ruta: '/administracion/elementos-fisicos', keywords: ['activos'] }
            ]
          },
          {
            id: 'administracion-menus',
            label: 'Alimentación y Menús',
            icono: '🍽️',
            keywords: ['comida', 'minuta', 'alimentacion'],
            hijos: [
              { id: 'administracion-menus-listado', label: 'Menús', icono: '🍽️', ruta: '/administracion/menus', keywords: ['minuta', 'comida'] },
              { id: 'administracion-lista-menus', label: 'Lista Menús', icono: '📜', ruta: '/administracion/lista-menus' },
              { id: 'administracion-items-menu', label: 'Items Menú', icono: '🍽️', ruta: '/administracion/items-menu' }
            ]
          },
          {
            id: 'administracion-medidas',
            label: 'Medidas Corporales',
            icono: '📏',
            keywords: ['talla', 'peso', 'antropometria'],
            hijos: [
              { id: 'administracion-gestion-medidas', label: 'Gestión Medidas', icono: '📏', ruta: '/administracion/gestion-medidas', keywords: ['talla', 'peso'] },
              { id: 'administracion-medidas-categorias', label: 'Categorías Medidas', icono: '📏', ruta: '/administracion/gestion-medidas/categorias' },
              { id: 'administracion-medidas-unidades', label: 'Unidades Medidas', icono: '📐', ruta: '/administracion/gestion-medidas/unidades' },
              { id: 'administracion-medidas-catalogo', label: 'Catálogo Medidas', icono: '📏', ruta: '/administracion/gestion-medidas/medidas' }
            ]
          },
          { id: 'administracion-datos-estudiantes', label: 'Datos Estudiantes', icono: '🎓', ruta: '/administracion/datos-estudiantes', keywords: ['medicos', 'adicionales', 'datos'] },
          {
            id: 'administracion-crm',
            label: 'CRM',
            icono: '🤝',
            keywords: ['ventas', 'clientes', 'prospectos', 'leads'],
            hijos: [
              { id: 'administracion-crm-inicio', label: 'CRM', icono: '🤝', ruta: '/administracion/crm', keywords: ['ventas', 'clientes'] },
              { id: 'administracion-crm-dashboard', label: 'Dashboard CRM', icono: '📊', ruta: '/administracion/crm/dashboard', keywords: ['tablero', 'ventas'] },
              { id: 'administracion-crm-visitas', label: 'CRM Visitas', icono: '🚶', ruta: '/administracion/crm/visitas', keywords: ['visitas'] },
              { id: 'administracion-crm-contactos', label: 'Contactos Portal', icono: '📞', ruta: '/administracion/crm/contactos-portal', keywords: ['contactos', 'leads'] }
            ]
          },
          {
            id: 'administracion-configuracion',
            label: 'Configuración',
            icono: '⚙️',
            keywords: ['ajustes', 'parametros'],
            hijos: [
              { id: 'administracion-config-global', label: 'Configuración Global', icono: '⚙️', ruta: '/administracion/configuracion/configuracion-global', keywords: ['ajustes'] },
              { id: 'administracion-config-plantillas', label: 'Plantillas', icono: '📃', ruta: '/administracion/configuracion/plantillas' },
              { id: 'administracion-config-ia', label: 'Configuración IA', icono: '🤖', ruta: '/administracion/configuracion-ia', keywords: ['ia', 'inteligencia artificial'] },
              { id: 'administracion-config-google', label: 'Configuración Google', icono: '📅', ruta: '/administracion/configuracion-google', keywords: ['google', 'calendar', 'calendario'] },
              { id: 'administracion-config-geofence', label: 'Configuración Geofence', icono: '📍', ruta: '/administracion/configuracion-geofence', keywords: ['ubicacion', 'zonas', 'gps'] },
              { id: 'administracion-cargos', label: 'Cargos', icono: '💼', ruta: '/administracion/cargos', keywords: ['puestos', 'roles'] },
              { id: 'administracion-tipos-documentos', label: 'Tipos Documentos', icono: '📄', ruta: '/administracion/tipos-documentos', keywords: ['documentos'] }
            ]
          },
          {
            id: 'administracion-comunicaciones',
            label: 'Comunicaciones',
            icono: '💬',
            keywords: ['whatsapp', 'mensajes', 'wa'],
            hijos: [
              { id: 'administracion-plantillas-whatsapp', label: 'Plantillas WhatsApp', icono: '💬', ruta: '/administracion/plantillas-whatsapp', keywords: ['whatsapp', 'wa', 'mensajes'] },
              { id: 'administracion-conectar-whatsapp', label: 'Conexión WhatsApp', icono: '🔌', ruta: '/administracion/conectar-whatsapp', keywords: ['whatsapp', 'wa', 'conectar'] }
            ]
          },
          {
            id: 'administracion-seguridad',
            label: 'Seguridad',
            icono: '🔐',
            keywords: ['roles', 'permisos', 'accesos'],
            hijos: [
              { id: 'administracion-permisos', label: 'Permisos por Rol', icono: '🔐', ruta: '/administracion/seguridad/permisos', keywords: ['roles', 'permisos', 'accesos'] },
              { id: 'administracion-auditoria', label: 'Auditoría', icono: '🔍', ruta: '/administracion/auditoria-registros', keywords: ['logs', 'registros', 'historial'] }
            ]
          },
          { id: 'administracion-documentacion', label: 'Documentación', icono: '📖', ruta: '/administracion/documentacion-sistema', keywords: ['ayuda', 'manual'] }
        ]
      }
    ];
  }
}