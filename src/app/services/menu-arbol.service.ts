import { Injectable } from '@angular/core';

/**
 * Nodo del árbol de menú.
 * - Si tiene `ruta` es una hoja navegable.
 * - Si tiene `hijos` es un grupo expandible.
 * - `permiso` (opcional) gatea la visibilidad; los nodos sin permiso se muestran siempre.
 */
export interface MenuNodo {
  id: string;
  label: string;
  icono: string;
  ruta?: string;
  permiso?: string;
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
        ruta: '/estudiantes',
        permiso: 'estudiantes.listado'
      },
      {
        id: 'academico',
        label: 'Académico',
        icono: '🎓',
        hijos: [
          { id: 'academico-inicio', label: 'Panel Académico', icono: '🎓', ruta: '/academico' },
          {
            id: 'academico-estructura',
            label: 'Estructura',
            icono: '🏫',
            hijos: [
              { id: 'academico-grados', label: 'Grados', icono: '📚', ruta: '/academico/grados' },
              { id: 'academico-grupos', label: 'Grupos', icono: '👨‍👩‍👧‍👦', ruta: '/academico/grupos' },
              { id: 'academico-areas', label: 'Áreas Académicas', icono: '📖', ruta: '/academico/areas-academicas' },
              { id: 'academico-cortes', label: 'Cortes Académicos', icono: '📅', ruta: '/academico/cortes-academicos' },
              { id: 'academico-cursos-extra', label: 'Cursos Extracurriculares', icono: '🎭', ruta: '/academico/cursos-extra' }
            ]
          },
          {
            id: 'academico-curriculo',
            label: 'Currículo',
            icono: '🗺️',
            hijos: [
              { id: 'academico-logros', label: 'Logros', icono: '🏆', ruta: '/academico/logros' },
              { id: 'academico-indicadores', label: 'Indicadores Logros', icono: '🎯', ruta: '/academico/indicadores-logros' },
              { id: 'academico-sprints', label: 'Sprints', icono: '🏃', ruta: '/academico/sprints' },
              { id: 'academico-parametros-calif', label: 'Parámetros Calificaciones', icono: '⚙️', ruta: '/academico/parametros-calificaciones' }
            ]
          },
          {
            id: 'academico-actividades',
            label: 'Actividades',
            icono: '📝',
            hijos: [
              { id: 'academico-act-academicas', label: 'Actividades Académicas', icono: '📝', ruta: '/academico/actividades-academicas' },
              { id: 'academico-selector-act', label: 'Selector Actividades', icono: '🎯', ruta: '/academico/selector-actividades' },
              { id: 'academico-maquina-act', label: 'Máquina Actividades', icono: '🤖', ruta: '/academico/maquina-actividades' },
              { id: 'academico-crear-act-manual', label: 'Crear Actividades Manual', icono: '✏️', ruta: '/academico/crear-actividades-manual' },
              { id: 'academico-crear-act-eval', label: 'Actividades de Evaluación', icono: '🎯', ruta: '/academico/crear-actividades-evaluacion' },
              { id: 'academico-importar-sprint', label: 'Importar de Sprint', icono: '📋', ruta: '/academico/importar-actividades-sprint' },
              { id: 'academico-clases-ia', label: 'Clases IA', icono: '🤖', ruta: '/clases-ia' }
            ]
          }
        ]
      },
      {
        id: 'calificaciones',
        label: 'Calificaciones',
        icono: '⭐',
        ruta: '/calificacion'
      },
      {
        id: 'asistencia',
        label: 'Asistencia',
        icono: '✋',
        ruta: '/asistencia'
      },
      {
        id: 'reportes',
        label: 'Reportes',
        icono: '📊',
        hijos: [
          { id: 'reportes-inicio', label: 'Reportes', icono: '📊', ruta: '/reportes' },
          {
            id: 'reportes-financieros',
            label: 'Financieros',
            icono: '💵',
            hijos: [
              { id: 'reportes-cartera', label: 'Reporte Cartera', icono: '💰', ruta: '/reportes/cartera' },
              { id: 'reportes-mov-financieros', label: 'Ingresos y Egresos', icono: '💹', ruta: '/reportes/movimientos-financieros' },
              { id: 'reportes-pagos', label: 'Reporte Pagos', icono: '💳', ruta: '/reportes/pagos-recibidos' },
              { id: 'reportes-cobros', label: 'Cobros Realizados', icono: '🧾', ruta: '/reportes/cobros-realizados' },
              { id: 'reportes-reportes-pago', label: 'Reportes de Pago', icono: '📑', ruta: '/reportes/reportes-pago' },
              { id: 'reportes-dashboard-gerencial', label: 'Dashboard Gerencial', icono: '📊', ruta: '/reportes/dashboard-gerencial', permiso: 'dashboard.gerencial.listado' }
            ]
          },
          {
            id: 'reportes-academicos',
            label: 'Académicos',
            icono: '📚',
            hijos: [
              { id: 'reportes-acad-estudiante', label: 'Reportes Académicos', icono: '📄', ruta: '/reportes/academicos-estudiante' },
              { id: 'reportes-calif-sprint', label: 'Calificaciones Sprint', icono: '📝', ruta: '/reportes/calificaciones-sprint' },
              { id: 'reportes-calif-pdm', label: 'Calificaciones PDM', icono: '📝', ruta: '/reportes/calificaciones-pdm' },
              { id: 'reportes-calif-estudiante', label: 'Calificaciones Estudiante', icono: '🎯', ruta: '/reportes/calificaciones/estudiante' },
              { id: 'reportes-monitoreo-sprint', label: 'Monitoreo Sprint', icono: '🏃', ruta: '/reportes/monitoreo-sprint' },
              { id: 'reportes-malla', label: 'Malla Curricular', icono: '🗺️', ruta: '/reportes/malla-curricular' },
              { id: 'reportes-cobertura', label: 'Cobertura Curricular', icono: '📈', ruta: '/reportes/cobertura-curricular' },
              { id: 'reportes-cursos-extra', label: 'Reporte Cursos Extra', icono: '🎭', ruta: '/reportes/cursos-extra' }
            ]
          },
          {
            id: 'reportes-operativos',
            label: 'Operativos',
            icono: '📋',
            hijos: [
              { id: 'reportes-estudiantes-general', label: 'Reporte Estudiantes', icono: '📋', ruta: '/reportes/estudiantes-general' },
              { id: 'reportes-asistencia', label: 'Reporte Asistencia', icono: '✋', ruta: '/reportes/asistencia' },
              { id: 'reportes-alimentacion', label: 'Reporte Alimentación', icono: '🍎', ruta: '/reportes/alimentacion' },
              { id: 'reportes-tamizajes', label: 'Tamizajes', icono: '🔬', ruta: '/reportes/tamizajes' },
              { id: 'reportes-ejecucion-tareas', label: 'Ejecución de Tareas', icono: '📊', ruta: '/reportes/ejecucion-tareas' }
            ]
          }
        ]
      },
      {
        id: 'operaciones',
        label: 'Operaciones',
        icono: '⚙️',
        hijos: [
          { id: 'operaciones-inicio', label: 'Operaciones', icono: '⚙️', ruta: '/operaciones' },
          {
            id: 'operaciones-alimentacion',
            label: 'Alimentación',
            icono: '🍽️',
            hijos: [
              { id: 'operaciones-salidas-alim', label: 'Salidas Alimentación', icono: '🍱', ruta: '/operaciones/salidas-alimentacion' },
              { id: 'operaciones-entrega-alim', label: 'Entrega Alimentación', icono: '🍽️', ruta: '/operaciones/entrega-alimentacion' },
              { id: 'operaciones-inventario-alim', label: 'Inventario Alimentación', icono: '📦', ruta: '/operaciones/inventario-alimentacion' },
              { id: 'operaciones-disponibilidad-cocina', label: 'Disponibilidad Cocina', icono: '🍳', ruta: '/operaciones/disponibilidad-cocina' },
              { id: 'operaciones-asignacion-onces', label: 'Asignación de Onces', icono: '🍱', ruta: '/operaciones/asignacion-onces' }
            ]
          },
          {
            id: 'operaciones-productos',
            label: 'Productos',
            icono: '📦',
            hijos: [
              { id: 'operaciones-mov-productos', label: 'Movimientos Productos', icono: '📦', ruta: '/operaciones/movimientos-productos' },
              { id: 'operaciones-registros-limpieza', label: 'Registros Limpieza', icono: '🧼', ruta: '/operaciones/registros-limpieza' }
            ]
          },
          {
            id: 'operaciones-estudiantes',
            label: 'Estudiantes',
            icono: '🎓',
            hijos: [
              { id: 'operaciones-registro-medidas', label: 'Registro Medidas', icono: '📏', ruta: '/operaciones/registro-medidas' },
              { id: 'operaciones-eval-desarrollo', label: 'Evaluación Desarrollo', icono: '📈', ruta: '/operaciones/evaluacion-desarrollo' },
              { id: 'operaciones-actualizacion-datos', label: 'Actualización Datos', icono: '🔄', ruta: '/operaciones/actualizacion-datos-estudiantes' },
              { id: 'operaciones-galerias', label: 'Galerías', icono: '🖼️', ruta: '/operaciones/galerias' },
              { id: 'operaciones-inscripcion-cursos', label: 'Inscripción Cursos Extra', icono: '🎭', ruta: '/operaciones/inscripcion-cursos-extra' },
              { id: 'operaciones-observaciones-informe', label: 'Observaciones para Informe', icono: '📝', ruta: '/operaciones/observaciones-informe', permiso: 'estudiantes.observaciones.administrar' }
            ]
          },
          {
            id: 'operaciones-comunicaciones',
            label: 'Comunicaciones y Seguimiento',
            icono: '📢',
            hijos: [
              { id: 'operaciones-recordatorio-pagos', label: 'Recordatorio Pagos', icono: '💬', ruta: '/operaciones/recordatorio-pagos' },
              { id: 'operaciones-seguimiento-asistencia', label: 'Seguimiento Asistencia', icono: '📋', ruta: '/operaciones/seguimiento-asistencia' },
              { id: 'operaciones-recordatorios-generales', label: 'Recordatorios Generales', icono: '📢', ruta: '/operaciones/recordatorios-generales' }
            ]
          }
        ]
      },
      {
        id: 'colaboradores',
        label: 'Colaboradores',
        icono: '🧑‍💼',
        hijos: [
          {
            id: 'colaboradores-gestion',
            label: 'Gestión',
            icono: '👥',
            hijos: [
              { id: 'colaboradores-gestion-colab', label: 'Gestión Colaboradores', icono: '👥', ruta: '/gestion-colaboradores' },
              { id: 'colaboradores-listado', label: 'Colaboradores', icono: '🧑‍💼', ruta: '/colaboradores' }
            ]
          },
          {
            id: 'colaboradores-docentes',
            label: 'Docentes',
            icono: '👩‍🏫',
            hijos: [
              { id: 'colaboradores-gestion-docentes', label: 'Gestión Docentes', icono: '👩‍🏫', ruta: '/gestion-docentes' },
              { id: 'colaboradores-docentes-listado', label: 'Docentes', icono: '👨‍🏫', ruta: '/docentes' },
              { id: 'colaboradores-casas-docentes', label: 'Casas Docentes', icono: '🏠', ruta: '/casas-docentes' }
            ]
          },
          {
            id: 'colaboradores-actividades',
            label: 'Actividades',
            icono: '📋',
            hijos: [
              { id: 'colaboradores-act-colab', label: 'Actividades Colaboradores', icono: '📋', ruta: '/administracion/actividades-colaboradores' },
              { id: 'colaboradores-calendario', label: 'Calendario Colaboradores', icono: '📅', ruta: '/administracion/calendario-colaboradores' },
              { id: 'colaboradores-aprobacion-act', label: 'Aprobación Actividades', icono: '✅', ruta: '/administracion/aprobacion-actividades-colaboradores' },
              { id: 'colaboradores-contab-act', label: 'Contabilización Actividades', icono: '🧮', ruta: '/administracion/contabilizacion-actividades-colaboradores' }
            ]
          },
          {
            id: 'colaboradores-nomina',
            label: 'Nómina',
            icono: '💰',
            hijos: [
              { id: 'colaboradores-nominas', label: 'Nóminas', icono: '💰', ruta: '/administracion/nominas' }
            ]
          },
          {
            id: 'colaboradores-reportes',
            label: 'Reportes de Colaboradores',
            icono: '📜',
            hijos: [
              { id: 'colaboradores-rep-asistencia', label: 'Asistencia Colaboradores', icono: '📋', ruta: '/reportes/asistencia-colaboradores' },
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
        permiso: 'administracion.ver',
        hijos: [
          { id: 'administracion-inicio', label: 'Administración', icono: '🏛️', ruta: '/administracion', permiso: 'administracion.ver' },
          { id: 'administracion-datos-maestros', label: 'Datos Maestros', icono: '🗃️', ruta: '/administracion/datos-maestros', permiso: 'administracion.datos_maestros' },
          {
            id: 'administracion-financiero',
            label: 'Financiero',
            icono: '💵',
            hijos: [
              { id: 'administracion-fin-inicio', label: 'Financiero', icono: '💵', ruta: '/administracion/financiero' },
              { id: 'administracion-fin-movimientos', label: 'Movimientos Financieros', icono: '💸', ruta: '/administracion/financiero/movimientos-financieros' },
              { id: 'administracion-fin-aprobacion', label: 'Aprobación Múltiple', icono: '✅', ruta: '/administracion/financiero/aprobacion-multiple' },
              { id: 'administracion-fin-registro-pagos', label: 'Registro Pagos Rápido', icono: '⚡', ruta: '/administracion/financiero/registro-pagos-rapido' },
              { id: 'administracion-fin-contab-multiple', label: 'Contabilización Múltiple', icono: '🧮', ruta: '/administracion/contabilizacion-multiple' },
              { id: 'administracion-fin-convenios', label: 'Convenios', icono: '📝', ruta: '/administracion/financiero/convenios' },
              { id: 'administracion-fin-reglas-cobro', label: 'Reglas Cobro Automático', icono: '⚡', ruta: '/administracion/financiero/reglas-cobro-automatico' }
            ]
          },
          {
            id: 'administracion-productos',
            label: 'Productos e Inventario',
            icono: '📦',
            hijos: [
              { id: 'administracion-prod', label: 'Productos', icono: '📦', ruta: '/administracion/productos', permiso: 'admin.productos' },
              { id: 'administracion-prod-servicios', label: 'Productos y Servicios', icono: '🛒', ruta: '/administracion/productos-servicios' },
              { id: 'administracion-prod-alimentacion', label: 'Productos Alimentación', icono: '🥗', ruta: '/administracion/productos-alimentacion' },
              { id: 'administracion-prod-academico', label: 'Productos Académico', icono: '📚', ruta: '/administracion/productos-academico' },
              { id: 'administracion-prod-mobiliario', label: 'Productos Mobiliario', icono: '🪑', ruta: '/administracion/productos-mobiliario' },
              { id: 'administracion-prod-limpieza', label: 'Productos Limpieza', icono: '🧹', ruta: '/administracion/productos-limpieza' },
              { id: 'administracion-proveedores', label: 'Proveedores', icono: '🚚', ruta: '/administracion/proveedores' },
              { id: 'administracion-areas-fisicas', label: 'Áreas Físicas', icono: '🏗️', ruta: '/administracion/areas-fisicas' },
              { id: 'administracion-elementos-fisicos', label: 'Elementos Físicos', icono: '🔧', ruta: '/administracion/elementos-fisicos' }
            ]
          },
          {
            id: 'administracion-menus',
            label: 'Alimentación y Menús',
            icono: '🍽️',
            hijos: [
              { id: 'administracion-menus-listado', label: 'Menús', icono: '🍽️', ruta: '/administracion/menus' },
              { id: 'administracion-lista-menus', label: 'Lista Menús', icono: '📜', ruta: '/administracion/lista-menus' },
              { id: 'administracion-items-menu', label: 'Items Menú', icono: '🍽️', ruta: '/administracion/items-menu' }
            ]
          },
          {
            id: 'administracion-medidas',
            label: 'Medidas Corporales',
            icono: '📏',
            hijos: [
              { id: 'administracion-gestion-medidas', label: 'Gestión Medidas', icono: '📏', ruta: '/administracion/gestion-medidas' },
              { id: 'administracion-medidas-categorias', label: 'Categorías Medidas', icono: '📏', ruta: '/administracion/gestion-medidas/categorias' },
              { id: 'administracion-medidas-unidades', label: 'Unidades Medidas', icono: '📐', ruta: '/administracion/gestion-medidas/unidades' },
              { id: 'administracion-medidas-catalogo', label: 'Catálogo Medidas', icono: '📏', ruta: '/administracion/gestion-medidas/medidas' }
            ]
          },
          { id: 'administracion-datos-estudiantes', label: 'Datos Estudiantes', icono: '🎓', ruta: '/administracion/datos-estudiantes' },
          {
            id: 'administracion-crm',
            label: 'CRM',
            icono: '🤝',
            hijos: [
              { id: 'administracion-crm-inicio', label: 'CRM', icono: '🤝', ruta: '/administracion/crm' },
              { id: 'administracion-crm-dashboard', label: 'Dashboard CRM', icono: '📊', ruta: '/administracion/crm/dashboard' },
              { id: 'administracion-crm-visitas', label: 'CRM Visitas', icono: '🚶', ruta: '/administracion/crm/visitas' },
              { id: 'administracion-crm-contactos', label: 'Contactos Portal', icono: '📞', ruta: '/administracion/crm/contactos-portal' }
            ]
          },
          {
            id: 'administracion-configuracion',
            label: 'Configuración',
            icono: '⚙️',
            hijos: [
              { id: 'administracion-config-global', label: 'Configuración Global', icono: '⚙️', ruta: '/administracion/configuracion/configuracion-global' },
              { id: 'administracion-config-plantillas', label: 'Plantillas', icono: '📃', ruta: '/administracion/configuracion/plantillas' },
              { id: 'administracion-config-ia', label: 'Configuración IA', icono: '🤖', ruta: '/administracion/configuracion-ia' },
              { id: 'administracion-config-google', label: 'Configuración Google', icono: '📅', ruta: '/administracion/configuracion-google' },
              { id: 'administracion-config-geofence', label: 'Configuración Geofence', icono: '📍', ruta: '/administracion/configuracion-geofence' },
              { id: 'administracion-cargos', label: 'Cargos', icono: '💼', ruta: '/administracion/cargos' },
              { id: 'administracion-tipos-documentos', label: 'Tipos Documentos', icono: '📄', ruta: '/administracion/tipos-documentos' }
            ]
          },
          {
            id: 'administracion-comunicaciones',
            label: 'Comunicaciones',
            icono: '💬',
            hijos: [
              { id: 'administracion-plantillas-whatsapp', label: 'Plantillas WhatsApp', icono: '💬', ruta: '/administracion/plantillas-whatsapp' },
              { id: 'administracion-conectar-whatsapp', label: 'Conexión WhatsApp', icono: '🔌', ruta: '/administracion/conectar-whatsapp' }
            ]
          },
          {
            id: 'administracion-seguridad',
            label: 'Seguridad',
            icono: '🔐',
            hijos: [
              { id: 'administracion-permisos', label: 'Permisos por Rol', icono: '🔐', ruta: '/administracion/seguridad/permisos' },
              { id: 'administracion-auditoria', label: 'Auditoría', icono: '🔍', ruta: '/administracion/auditoria-registros' }
            ]
          },
          { id: 'administracion-documentacion', label: 'Documentación', icono: '📖', ruta: '/administracion/documentacion-sistema' }
        ]
      }
    ];
  }
}