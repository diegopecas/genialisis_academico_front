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
        permiso: 'estudiantes.ver',
        imagen: '/assets/images/estudiantes.png',
        keywords: ['alumnos', 'niños', 'matricula', 'matrícula', 'estudiantado', 'parvulos'],
        hijos: [
          {
            id: 'estudiantes-gestion',
            label: 'Gestión',
            icono: '🎓',
            keywords: ['alumnos', 'niños', 'matricula'],
            hijos: [
              { id: 'estudiantes-gestion-estudiantes', label: 'Gestión Estudiantes', icono: '🎓', ruta: '/estudiantes/gestion', permiso: 'estudiantes.gestion', keywords: ['alumnos', 'niños', 'matricula', 'registro rapido', 'registro civil'] },
              { id: 'estudiantes-registro-rapido', label: 'Registro Rápido', icono: '⚡', ruta: '/estudiantes/registro-rapido', permiso: 'estudiantes.administrar', keywords: ['registro rapido', 'registro civil', 'matricula', 'nuip', 'foto'] },
              { id: 'estudiantes-listado', label: 'Estudiantes', icono: '🎓', ruta: '/estudiantes', permiso: 'estudiantes.listado', keywords: ['alumnos', 'niños', 'estudiantado', 'parvulos'] }
            ]
          }
        ]
      },
      {
        id: 'academico',
        label: 'Académico',
        icono: '🎓',
        permiso: 'academico.ver',
        imagen: '/assets/images/academico.png',
        keywords: ['curriculo', 'currículo', 'pedagogico', 'clases', 'ensenanza', 'notas'],
        hijos: [
          { id: 'academico-inicio', label: 'Panel Académico', icono: '🎓', ruta: '/academico', permiso: 'academico.ver' },
          {
            id: 'academico-estructura',
            label: 'Estructura',
            icono: '🏫',
            hijos: [
              { id: 'academico-grados', label: 'Grados', icono: '📚', ruta: '/academico/grados', permiso: 'academico.grados', keywords: ['niveles', 'cursos'] },
              { id: 'academico-grupos', label: 'Grupos', icono: '👨‍👩‍👧‍👦', ruta: '/academico/grupos', permiso: 'academico.grupos', keywords: ['salones', 'aulas', 'cursos'] },
              { id: 'academico-areas', label: 'Áreas Académicas', icono: '📖', ruta: '/academico/areas-academicas', permiso: 'academico.areas_academicas', keywords: ['materias', 'asignaturas'] },
              { id: 'academico-cortes', label: 'Cortes Académicos', icono: '📅', ruta: '/academico/cortes-academicos', permiso: 'academico.cortes_academicos', keywords: ['periodos', 'trimestres', 'bimestres'] },
              { id: 'academico-cursos-extra', label: 'Cursos Extracurriculares', icono: '🎭', ruta: '/academico/cursos-extra', permiso: 'academico.cursos_extra', keywords: ['extracurriculares', 'talleres'] },
              { id: 'academico-pde-rangos', label: 'Rangos de Edad PDE', icono: '📏', ruta: '/academico/pde-rangos-edad', permiso: 'academico.pde_rangos_edad', keywords: ['perfil desarrollo', 'rangos', 'edades', 'pde'] },
              { id: 'academico-pde-items', label: 'Ítems Perfil Desarrollo', icono: '🧩', ruta: '/academico/pde-items', permiso: 'academico.pde_items', keywords: ['perfil desarrollo', 'items', 'pruebas', 'pde', 'esferas'] }
            ]
          },
          {
            id: 'academico-curriculo',
            label: 'Currículo',
            icono: '🗺️',
            keywords: ['plan de estudios', 'pensum'],
            hijos: [
              { id: 'academico-logros', label: 'Logros', icono: '🏆', ruta: '/academico/logros', permiso: 'academico.logros', keywords: ['competencias', 'desempenos'] },
              { id: 'academico-indicadores', label: 'Indicadores Logros', icono: '🎯', ruta: '/academico/indicadores-logros', permiso: 'academico.indicadores_logros', keywords: ['indicadores'] },
              { id: 'academico-sprints', label: 'Sprints', icono: '🏃', ruta: '/academico/sprints', permiso: 'academico.sprints', keywords: ['unidades', 'proyectos'] },
              { id: 'academico-parametros-calif', label: 'Parámetros Calificaciones', icono: '⚙️', ruta: '/academico/parametros-calificaciones', permiso: 'academico.parametros_calificaciones', keywords: ['escala de notas', 'escala'] }
            ]
          },
          {
            id: 'academico-actividades',
            label: 'Actividades',
            icono: '📝',
            keywords: ['tareas', 'trabajos'],
            hijos: [
              { id: 'academico-act-academicas', label: 'Actividades Académicas', icono: '📝', ruta: '/academico/actividades/gestion', permiso: 'academico.actividades', keywords: ['tareas', 'trabajos'] },
              { id: 'academico-selector-act', label: 'Selector Actividades', icono: '🎯', ruta: '/academico/actividades', permiso: 'academico.selector_actividades' },
              { id: 'academico-maquina-act', label: 'Máquina Actividades', icono: '🤖', ruta: '/academico/actividades/maquina', permiso: 'academico.maquina_actividades', keywords: ['ia', 'inteligencia artificial', 'generador'] },
              { id: 'academico-crear-act-manual', label: 'Crear Actividades Manual', icono: '✏️', ruta: '/academico/actividades/manual', permiso: 'academico.crear_actividades_manual' },
              { id: 'academico-crear-act-eval', label: 'Actividades de Evaluación', icono: '🎯', ruta: '/academico/actividades/evaluacion', permiso: 'academico.actividades_evaluacion', keywords: ['evaluacion', 'examenes'] },
              { id: 'academico-importar-sprint', label: 'Importar de Sprint', icono: '📋', ruta: '/academico/actividades/importar', permiso: 'academico.importar_actividades_sprint' },
              { id: 'academico-clases-ia', label: 'Clases IA', icono: '🤖', ruta: '/academico/clases-ia', permiso: 'academico.clases_ia', keywords: ['ia', 'inteligencia artificial', 'ingles', 'gini'] }
            ]
          }
        ]
      },
      {
        id: 'calificaciones',
        label: 'Calificaciones',
        icono: '⭐',
        permiso: 'calificaciones.ver',
        imagen: '/assets/images/reporte.png',
        ruta: '/calificacion',
        keywords: ['notas', 'evaluacion', 'puntajes', 'calificar']
      },
      {
        id: 'asistencia',
        label: 'Asistencia',
        icono: '✋',
        permiso: 'asistencia.ver',
        imagen: '/assets/images/asistencia.png',
        ruta: '/asistencia',
        keywords: ['inasistencia', 'faltas', 'presente', 'llegadas']
      },
      {
        id: 'reportes',
        label: 'Reportes',
        icono: '📊',
        permiso: 'reportes.ver',
        imagen: '/assets/images/detalle.png',
        keywords: ['informes', 'reporteria', 'estadisticas', 'tablero'],
        hijos: [
          { id: 'reportes-inicio', label: 'Reportes', icono: '📊', ruta: '/reportes', permiso: 'reportes.ver' },
          {
            id: 'reportes-financieros',
            label: 'Financieros',
            icono: '💵',
            keywords: ['dinero', 'plata', 'finanzas'],
            hijos: [
              { id: 'reportes-cartera', label: 'Reporte Cartera', icono: '💰', ruta: '/reportes/cartera', permiso: 'reportes.cartera', keywords: ['deudas', 'cuentas por cobrar', 'morosos', 'cobranza'] },
              { id: 'reportes-mov-financieros', label: 'Ingresos y Egresos', icono: '💹', ruta: '/reportes/movimientos-financieros', permiso: 'reportes.movimientos_financieros', keywords: ['movimientos financieros', 'gastos', 'flujo', 'plata'] },
              { id: 'reportes-pagos', label: 'Reporte Pagos', icono: '💳', ruta: '/reportes/pagos-recibidos', permiso: 'reportes.pagos_recibidos', keywords: ['pagos recibidos', 'recaudo'] },
              { id: 'reportes-cobros', label: 'Cobros Realizados', icono: '🧾', ruta: '/reportes/cobros-realizados', permiso: 'reportes.cobros_realizados', keywords: ['cobros', 'recaudo'] },
              { id: 'reportes-reportes-pago', label: 'Reportes de Pago', icono: '📑', ruta: '/reportes/reportes-pago', permiso: 'reportes.reportes_pago' },
              { id: 'reportes-dashboard-gerencial', label: 'Dashboard Gerencial', icono: '📊', ruta: '/reportes/dashboard-gerencial', permiso: 'dashboard.gerencial.listado', keywords: ['indicadores', 'gerencia', 'tablero'] }
            ]
          },
          {
            id: 'reportes-colaboradores',
            label: 'Colaboradores',
            icono: '🧑‍💼',
            keywords: ['empleados', 'personal'],
            hijos: [
              { id: 'reportes-colab-asistencia', label: 'Asistencia Colaboradores', icono: '📋', ruta: '/reportes/asistencia-colaboradores', permiso: 'reportes.asistencia_colaboradores', keywords: ['faltas', 'ingreso', 'marcacion'] },
              { id: 'reportes-colab-contabilizaciones', label: 'Reporte Contabilizaciones', icono: '🧾', ruta: '/reportes/reporte-contabilizaciones', permiso: 'reportes.contabilizaciones' },
              { id: 'reportes-colab-historial', label: 'Historial Actividades', icono: '📜', ruta: '/reportes/historial-actividades', permiso: 'reportes.historial_actividades' }
            ]
          },
          {
            id: 'reportes-academicos',
            label: 'Académicos',
            icono: '📚',
            keywords: ['notas', 'boletines'],
            hijos: [
              { id: 'reportes-acad-estudiante', label: 'Reportes Académicos', icono: '📄', ruta: '/reportes/academicos-estudiante', permiso: 'reportes.academicos_estudiante', keywords: ['boletines', 'notas'] },
              { id: 'reportes-calif-sprint', label: 'Calificaciones Sprint', icono: '📝', ruta: '/reportes/calificaciones-sprint', permiso: 'reportes.calificaciones_sprint', keywords: ['notas'] },
              { id: 'reportes-calif-pdm', label: 'Calificaciones PDM', icono: '📝', ruta: '/reportes/calificaciones-pdm', permiso: 'reportes.calificaciones_pdm', keywords: ['notas'] },
              { id: 'reportes-calif-estudiante', label: 'Calificaciones Estudiante', icono: '🎯', ruta: '/reportes/calificaciones/estudiante', permiso: 'reportes.calificaciones_estudiante', keywords: ['notas', 'boletin'] },
              { id: 'reportes-monitoreo-sprint', label: 'Monitoreo Sprint', icono: '🏃', ruta: '/reportes/monitoreo-sprint', permiso: 'reportes.monitoreo_sprint' },
              { id: 'reportes-malla', label: 'Malla Curricular', icono: '🗺️', ruta: '/reportes/malla-curricular', permiso: 'reportes.malla_curricular', keywords: ['plan de estudios', 'pensum'] },
              { id: 'reportes-cobertura', label: 'Cobertura Curricular', icono: '📈', ruta: '/reportes/cobertura-curricular', permiso: 'reportes.cobertura_curricular', keywords: ['avance'] },
              { id: 'reportes-cursos-extra', label: 'Reporte Cursos Extra', icono: '🎭', ruta: '/reportes/cursos-extra', permiso: 'reportes.cursos_extra', keywords: ['extracurriculares', 'talleres'] }
            ]
          },
          {
            id: 'reportes-operativos',
            label: 'Operativos',
            icono: '📋',
            hijos: [
              { id: 'reportes-estudiantes-general', label: 'Reporte Estudiantes', icono: '📋', ruta: '/reportes/estudiantes-general', permiso: 'reportes.estudiantes_general', keywords: ['listado estudiantes', 'alumnos'] },
              { id: 'reportes-asistencia', label: 'Reporte Asistencia', icono: '✋', ruta: '/reportes/asistencia', permiso: 'reportes.asistencia', keywords: ['faltas', 'inasistencia'] },
              { id: 'reportes-alimentacion', label: 'Reporte Alimentación', icono: '🍎', ruta: '/reportes/alimentacion', permiso: 'reportes.alimentacion', keywords: ['comida', 'onces', 'refrigerios'] },
              { id: 'reportes-tamizajes', label: 'Tamizajes', icono: '🔬', ruta: '/reportes/tamizajes', permiso: 'reportes.tamizajes', keywords: ['salud', 'valoracion'] },
              { id: 'reportes-ejecucion-tareas', label: 'Ejecución de Tareas', icono: '📊', ruta: '/reportes/ejecucion-tareas', permiso: 'reportes.ejecucion_tareas' }
            ]
          }
        ]
      },
      {
        id: 'operaciones',
        label: 'Operaciones',
        icono: '⚙️',
        permiso: 'operaciones.ver',
        imagen: '/assets/images/operaciones.png',
        keywords: ['operativo', 'dia a dia', 'gestion diaria'],
        hijos: [
          { id: 'operaciones-inicio', label: 'Operaciones', icono: '⚙️', ruta: '/operaciones', permiso: 'operaciones.ver' },
          {
            id: 'operaciones-alimentacion',
            label: 'Alimentación',
            icono: '🍽️',
            keywords: ['comida', 'onces', 'refrigerios', 'cocina'],
            hijos: [
              { id: 'operaciones-salidas-alim', label: 'Salidas Alimentación', icono: '🍱', ruta: '/operaciones/salidas-alimentacion', permiso: 'operaciones.salidas_alimentacion', keywords: ['comida', 'onces'] },
              { id: 'operaciones-entrega-alim', label: 'Entrega Alimentación', icono: '🍽️', ruta: '/operaciones/entrega-alimentacion', permiso: 'operaciones.entrega_alimentacion', keywords: ['comida', 'onces'] },
              { id: 'operaciones-inventario-alim', label: 'Inventario Alimentación', icono: '📦', ruta: '/operaciones/inventario-alimentacion', permiso: 'operaciones.inventario_alimentacion', keywords: ['stock', 'comida'] },
              { id: 'operaciones-disponibilidad-cocina', label: 'Disponibilidad Cocina', icono: '🍳', ruta: '/operaciones/disponibilidad-cocina', permiso: 'operaciones.disponibilidad_cocina', keywords: ['cocina', 'menu'] },
              { id: 'operaciones-asignacion-onces', label: 'Asignación de Onces', icono: '🍱', ruta: '/operaciones/asignacion-onces', permiso: 'operaciones.asignacion_onces', keywords: ['onces', 'refrigerios'] }
            ]
          },
          {
            id: 'operaciones-productos',
            label: 'Productos',
            icono: '📦',
            keywords: ['inventario', 'stock', 'bodega'],
            hijos: [
              { id: 'operaciones-mov-productos', label: 'Movimientos Productos', icono: '📦', ruta: '/operaciones/movimientos-productos', permiso: 'operaciones.movimientos_productos', keywords: ['inventario', 'stock', 'bodega'] },
              { id: 'operaciones-registros-limpieza', label: 'Registros Limpieza', icono: '🧼', ruta: '/operaciones/registros-limpieza', permiso: 'operaciones.registros_limpieza', keywords: ['aseo', 'limpieza'] },
              { id: 'operaciones-registro-rapido-limpieza', label: 'Registro Rápido de Aseo', icono: '⚡', ruta: '/operaciones/registro-rapido-limpieza', permiso: 'operaciones.registro_rapido_limpieza', keywords: ['aseo', 'limpieza', 'rapido', 'express'] },
              { id: 'operaciones-registro-masivo-limpieza', label: 'Registro Masivo de Aseo', icono: '📅', ruta: '/operaciones/registro-masivo-limpieza', permiso: 'operaciones.registro_masivo_limpieza', keywords: ['aseo', 'limpieza', 'masivo', 'rango', 'fechas', 'varios dias', 'lote'] },
              { id: 'operaciones-edicion-masiva-limpieza', label: 'Edición Masiva de Aseo', icono: '✏️', ruta: '/operaciones/edicion-masiva-limpieza', permiso: 'operaciones.edicion_masiva_limpieza', keywords: ['aseo', 'limpieza', 'editar', 'edicion', 'masiva', 'lote', 'corregir', 'eliminar', 'borrar'] },
              { id: 'operaciones-supervision-limpieza', label: 'Supervisión de Aseo', icono: '✅', ruta: '/operaciones/supervision-limpieza', permiso: 'operaciones.supervision_limpieza', keywords: ['aseo', 'limpieza', 'supervisar', 'supervision', 'aprobar'] },
              { id: 'operaciones-reporte-aseo', label: 'Reporte de Aseo', icono: '📄', ruta: '/operaciones/reporte-aseo', permiso: 'operaciones.reporte_aseo', keywords: ['aseo', 'limpieza', 'reporte', 'informe', 'pdf'] }
            ]
          },
          {
            id: 'operaciones-estudiantes',
            label: 'Estudiantes',
            icono: '🎓',
            keywords: ['alumnos', 'ninos'],
            hijos: [
              { id: 'operaciones-registro-medidas', label: 'Registro Medidas', icono: '📏', ruta: '/operaciones/registro-medidas', permiso: 'operaciones.registro_medidas', keywords: ['talla', 'peso', 'antropometria'] },
              { id: 'operaciones-eval-desarrollo', label: 'Evaluación Desarrollo', icono: '📈', ruta: '/operaciones/evaluacion-desarrollo', permiso: 'operaciones.evaluacion_desarrollo', keywords: ['ead', 'desarrollo', 'valoracion'] },
              { id: 'operaciones-perfil-desarrollo', label: 'Perfil de Desarrollo', icono: '🧠', ruta: '/operaciones/perfil-desarrollo', permiso: 'operaciones.perfil_desarrollo', keywords: ['pde', 'perfil', 'desarrollo', 'esferas', 'indice'] },
              { id: 'operaciones-actualizacion-datos', label: 'Actualización Datos', icono: '🔄', ruta: '/operaciones/actualizacion-datos-estudiantes', permiso: 'operaciones.actualizacion_datos', keywords: ['datos estudiantes', 'actualizar'] },
              { id: 'operaciones-galerias', label: 'Galerías', icono: '🖼️', ruta: '/operaciones/galerias', permiso: 'operaciones.galerias', keywords: ['fotos', 'imagenes', 'album'] },
              { id: 'operaciones-inscripcion-cursos', label: 'Inscripción Cursos Extra', icono: '🎭', ruta: '/operaciones/inscripcion-cursos-extra', permiso: 'operaciones.inscripcion_cursos_extra', keywords: ['extracurriculares', 'talleres'] },
              { id: 'operaciones-observaciones-informe', label: 'Observaciones para Informe', icono: '📝', ruta: '/operaciones/observaciones-informe', permiso: 'estudiantes.observaciones.administrar', keywords: ['observaciones', 'informe'] }
            ]
          },
          {
            id: 'operaciones-comunicaciones',
            label: 'Comunicaciones y Seguimiento',
            icono: '📢',
            keywords: ['whatsapp', 'avisos', 'notificaciones'],
            hijos: [
              { id: 'operaciones-recordatorio-pagos', label: 'Recordatorio Pagos', icono: '💬', ruta: '/operaciones/recordatorio-pagos', permiso: 'operaciones.recordatorio_pagos', keywords: ['cobro', 'whatsapp'] },
              { id: 'operaciones-seguimiento-asistencia', label: 'Seguimiento Asistencia', icono: '📋', ruta: '/operaciones/seguimiento-asistencia', permiso: 'operaciones.seguimiento_asistencia', keywords: ['faltas', 'inasistencia'] },
              { id: 'operaciones-recordatorios-generales', label: 'Recordatorios Generales', icono: '📢', ruta: '/operaciones/recordatorios-generales', permiso: 'operaciones.recordatorios_generales', keywords: ['avisos', 'notificaciones', 'whatsapp'] }
            ]
          }
        ]
      },
      {
        id: 'colaboradores',
        label: 'Colaboradores',
        icono: '🧑‍💼',
        permiso: 'colaboradores.ver',
        imagen: '/assets/images/colaboradores.png',
        keywords: ['empleados', 'personal', 'trabajadores', 'staff'],
        hijos: [
          {
            id: 'colaboradores-gestion',
            label: 'Gestión',
            icono: '👥',
            keywords: ['empleados', 'personal'],
            hijos: [
              { id: 'colaboradores-gestion-colab', label: 'Gestión Colaboradores', icono: '👥', ruta: '/colaboradores/gestion', permiso: 'colaboradores.gestion', keywords: ['empleados', 'personal', 'staff'] },
              { id: 'colaboradores-listado', label: 'Colaboradores', icono: '🧑‍💼', ruta: '/colaboradores', permiso: 'colaboradores.listado', keywords: ['empleados', 'personal'] },
              { id: 'colaboradores-registro-ingreso-salida', label: 'Registro Ingreso / Salida', icono: '⏱️', ruta: '/registro-ingreso-salida', keywords: ['marcacion', 'entrada', 'salida', 'huella'] }
            ]
          },
          {
            id: 'colaboradores-actividades',
            label: 'Actividades',
            icono: '📋',
            keywords: ['tareas', 'agenda'],
            hijos: [
              { id: 'colaboradores-act-colab', label: 'Actividades Colaboradores', icono: '📋', ruta: '/colaboradores/actividades', permiso: 'colaboradores.actividades', keywords: ['tareas'] },
              { id: 'colaboradores-calendario', label: 'Calendario Colaboradores', icono: '📅', ruta: '/colaboradores/actividades/calendario', permiso: 'colaboradores.calendario', keywords: ['agenda'] },
              { id: 'colaboradores-aprobacion-act', label: 'Aprobación Actividades', icono: '✅', ruta: '/colaboradores/actividades/aprobacion', permiso: 'colaboradores.aprobacion_actividades', keywords: ['aprobar'] },
              { id: 'colaboradores-contab-act', label: 'Contabilización Actividades', icono: '🧮', ruta: '/colaboradores/actividades/contabilizacion', permiso: 'colaboradores.contabilizacion_actividades', keywords: ['contabilizar'] }
            ]
          },
          {
            id: 'colaboradores-nomina',
            label: 'Nómina',
            icono: '💰',
            keywords: ['sueldos', 'salarios'],
            hijos: [
              { id: 'colaboradores-nominas', label: 'Nóminas', icono: '💰', ruta: '/colaboradores/nominas', permiso: 'colaboradores.nominas', keywords: ['sueldos', 'salarios', 'pago empleados'] }
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
            id: 'administracion-operaciones',
            label: 'Operaciones',
            icono: '⚙️',
            keywords: ['operaciones', 'entes', 'control'],
            hijos: [
              { id: 'administracion-oper-inicio', label: 'Operaciones', icono: '⚙️', ruta: '/administracion/operaciones', permiso: 'administracion.operaciones' },
              { id: 'administracion-entes-control', label: 'Entes de Control', icono: '🏛️', ruta: '/administracion/operaciones/entes-control', permiso: 'admin.entes_control', keywords: ['entes', 'control', 'vigilancia', 'secretaria', 'icbf'] },
              { id: 'administracion-consulta-entes-control', label: 'Consulta Entes de Control', icono: '🔎', ruta: '/administracion/operaciones/consulta-entes-control', permiso: 'admin.consulta_entes_control', keywords: ['consulta', 'entes', 'control', 'visita', 'documentos', 'reportes'] }
            ]
          },
          {
            id: 'administracion-financiero',
            label: 'Financiero',
            icono: '💵',
            keywords: ['dinero', 'plata', 'finanzas'],
            hijos: [
              { id: 'administracion-fin-inicio', label: 'Financiero', icono: '💵', ruta: '/administracion/financiero', permiso: 'administracion.financiero' },
              { id: 'administracion-fin-movimientos', label: 'Movimientos Financieros', icono: '💸', ruta: '/administracion/financiero/movimientos-financieros', permiso: 'admin.movimientos_financieros', keywords: ['ingresos', 'egresos', 'gastos'] },
              { id: 'administracion-fin-aprobacion', label: 'Aprobación Múltiple', icono: '✅', ruta: '/administracion/financiero/aprobacion-multiple', permiso: 'admin.aprobacion_multiple', keywords: ['aprobar'] },
              { id: 'administracion-fin-registro-pagos', label: 'Registro Pagos Rápido', icono: '⚡', ruta: '/administracion/financiero/registro-pagos-rapido', permiso: 'admin.registro_pagos_rapido', keywords: ['recaudo', 'pagos'] },
              { id: 'administracion-fin-contab-multiple', label: 'Contabilización Múltiple', icono: '🧮', ruta: '/administracion/financiero/contabilizacion-multiple', permiso: 'admin.contabilizacion_multiple', keywords: ['contabilizar'] },
              { id: 'administracion-fin-convenios', label: 'Convenios', icono: '📝', ruta: '/administracion/financiero/convenios', permiso: 'admin.convenios', keywords: ['acuerdos', 'descuentos'] },
              { id: 'administracion-fin-reglas-cobro', label: 'Reglas Cobro Automático', icono: '⚡', ruta: '/administracion/financiero/reglas-cobro-automatico', permiso: 'admin.reglas_cobro_automatico', keywords: ['cobro automatico', 'facturacion'] }
            ]
          },
          {
            id: 'administracion-productos',
            label: 'Productos e Inventario',
            icono: '📦',
            keywords: ['inventario', 'stock', 'bodega'],
            hijos: [
              { id: 'administracion-prod', label: 'Productos', icono: '📦', ruta: '/administracion/datos-maestros/productos', permiso: 'admin.productos', keywords: ['inventario', 'articulos'] },
              { id: 'administracion-prod-servicios', label: 'Productos y Servicios', icono: '🛒', ruta: '/administracion/datos-maestros/productos-servicios', permiso: 'admin.productos_servicios', keywords: ['servicios', 'tarifas', 'precios'] },
              { id: 'administracion-prod-alimentacion', label: 'Productos Alimentación', icono: '🥗', ruta: '/administracion/datos-maestros/productos-alimentacion', permiso: 'admin.productos_alimentacion', keywords: ['comida'] },
              { id: 'administracion-prod-academico', label: 'Productos Académico', icono: '📚', ruta: '/administracion/datos-maestros/productos-academico', permiso: 'admin.productos_academico' },
              { id: 'administracion-prod-mobiliario', label: 'Productos Mobiliario', icono: '🪑', ruta: '/administracion/datos-maestros/productos-mobiliario', permiso: 'admin.productos_mobiliario', keywords: ['muebles'] },
              { id: 'administracion-prod-limpieza', label: 'Productos Limpieza', icono: '🧹', ruta: '/administracion/datos-maestros/productos-limpieza', permiso: 'admin.productos_limpieza', keywords: ['aseo'] },
              { id: 'administracion-proveedores', label: 'Proveedores', icono: '🚚', ruta: '/administracion/datos-maestros/proveedores', permiso: 'admin.proveedores', keywords: ['compras'] },
              { id: 'administracion-areas-fisicas', label: 'Áreas Físicas', icono: '🏗️', ruta: '/administracion/datos-maestros/areas-fisicas', permiso: 'admin.areas_fisicas', keywords: ['espacios', 'salones'] },
              { id: 'administracion-elementos-fisicos', label: 'Elementos Físicos', icono: '🔧', ruta: '/administracion/datos-maestros/elementos-fisicos', permiso: 'admin.elementos_fisicos', keywords: ['activos'] },
              { id: 'administracion-config-aseo', label: 'Configuración de Aseo', icono: '🧹', ruta: '/administracion/datos-maestros/config-aseo', permiso: 'admin.config_aseo', keywords: ['aseo', 'limpieza', 'procesos', 'configurar', 'masiva', 'tiempos', 'dias'] }
            ]
          },
          {
            id: 'administracion-menus',
            label: 'Alimentación y Menús',
            icono: '🍽️',
            keywords: ['comida', 'minuta', 'alimentacion'],
            hijos: [
              { id: 'administracion-menus-listado', label: 'Menús', icono: '🍽️', ruta: '/administracion/datos-maestros/menus', permiso: 'admin.menus', keywords: ['minuta', 'comida'] },
              { id: 'administracion-lista-menus', label: 'Lista Menús', icono: '📜', ruta: '/administracion/datos-maestros/menus/lista', permiso: 'admin.lista_menus' },
              { id: 'administracion-items-menu', label: 'Items Menú', icono: '🍽️', ruta: '/administracion/datos-maestros/menus/items', permiso: 'admin.items_menu' }
            ]
          },
          {
            id: 'administracion-medidas',
            label: 'Medidas Corporales',
            icono: '📏',
            keywords: ['talla', 'peso', 'antropometria'],
            hijos: [
              { id: 'administracion-gestion-medidas', label: 'Gestión Medidas', icono: '📏', ruta: '/administracion/datos-maestros/gestion-medidas', permiso: 'admin.gestion_medidas', keywords: ['talla', 'peso'] },
              { id: 'administracion-medidas-categorias', label: 'Categorías Medidas', icono: '📏', ruta: '/administracion/datos-maestros/gestion-medidas/categorias', permiso: 'admin.categorias_medidas' },
              { id: 'administracion-medidas-unidades', label: 'Unidades Medidas', icono: '📐', ruta: '/administracion/datos-maestros/gestion-medidas/unidades', permiso: 'admin.unidades_medidas' },
              { id: 'administracion-medidas-catalogo', label: 'Catálogo Medidas', icono: '📏', ruta: '/administracion/datos-maestros/gestion-medidas/medidas', permiso: 'admin.catalogo_medidas' }
            ]
          },
          { id: 'administracion-datos-estudiantes', label: 'Datos Estudiantes', icono: '🎓', ruta: '/administracion/datos-maestros/datos-estudiantes', permiso: 'admin.datos_estudiantes', keywords: ['medicos', 'adicionales', 'datos'] },
          {
            id: 'administracion-crm',
            label: 'CRM',
            icono: '🤝',
            keywords: ['ventas', 'clientes', 'prospectos', 'leads'],
            hijos: [
              { id: 'administracion-crm-inicio', label: 'CRM', icono: '🤝', ruta: '/administracion/crm', permiso: 'administracion.crm', keywords: ['ventas', 'clientes'] },
              { id: 'administracion-crm-dashboard', label: 'Dashboard CRM', icono: '📊', ruta: '/administracion/crm/dashboard', permiso: 'admin.crm_dashboard', keywords: ['tablero', 'ventas'] },
              { id: 'administracion-crm-visitas', label: 'CRM Visitas', icono: '🚶', ruta: '/administracion/crm/visitas', permiso: 'admin.crm_visitas', keywords: ['visitas'] },
              { id: 'administracion-crm-contactos', label: 'Contactos Portal', icono: '📞', ruta: '/administracion/crm/contactos-portal', permiso: 'admin.crm_contactos_portal', keywords: ['contactos', 'leads'] }
            ]
          },
          {
            id: 'administracion-configuracion',
            label: 'Configuración',
            icono: '⚙️',
            keywords: ['ajustes', 'parametros'],
            hijos: [
              { id: 'administracion-config-global', label: 'Configuración Global', icono: '⚙️', ruta: '/administracion/datos-maestros/configuracion-global', permiso: 'admin.configuracion_global', keywords: ['ajustes'] },
              { id: 'administracion-config-plantillas', label: 'Plantillas', icono: '📃', ruta: '/administracion/datos-maestros/plantillas', permiso: 'admin.plantillas' },
              { id: 'administracion-config-ia', label: 'Configuración IA', icono: '🤖', ruta: '/administracion/datos-maestros/configuracion-ia', permiso: 'admin.configuracion_ia', keywords: ['ia', 'inteligencia artificial'] },
              { id: 'administracion-config-google', label: 'Configuración Google', icono: '📅', ruta: '/administracion/datos-maestros/configuracion-google', permiso: 'admin.configuracion_google', keywords: ['google', 'calendar', 'calendario'] },
              { id: 'administracion-config-geofence', label: 'Configuración Geofence', icono: '📍', ruta: '/administracion/datos-maestros/configuracion-geofence', permiso: 'admin.configuracion_geofence', keywords: ['ubicacion', 'zonas', 'gps'] },
              { id: 'administracion-cargos', label: 'Cargos', icono: '💼', ruta: '/administracion/datos-maestros/cargos', permiso: 'admin.cargos', keywords: ['puestos', 'roles'] },
              { id: 'administracion-tipos-documentos', label: 'Tipos Documentos', icono: '📄', ruta: '/administracion/datos-maestros/tipos-documentos', permiso: 'admin.tipos_documentos', keywords: ['documentos'] },
              { id: 'administracion-institucion', label: 'Institución', icono: '🏫', ruta: '/administracion/datos-maestros/institucion', permiso: 'admin.institucion', keywords: ['institucion', 'documentos institucionales', 'plan de emergencia'] }
            ]
          },
          {
            id: 'administracion-comunicaciones',
            label: 'Comunicaciones',
            icono: '💬',
            keywords: ['whatsapp', 'mensajes', 'wa'],
            hijos: [
              { id: 'administracion-plantillas-whatsapp', label: 'Plantillas WhatsApp', icono: '💬', ruta: '/administracion/datos-maestros/plantillas-whatsapp', permiso: 'admin.plantillas_whatsapp', keywords: ['whatsapp', 'wa', 'mensajes'] },
              { id: 'administracion-conectar-whatsapp', label: 'Conexión WhatsApp', icono: '🔌', ruta: '/administracion/datos-maestros/conectar-whatsapp', permiso: 'admin.conectar_whatsapp', keywords: ['whatsapp', 'wa', 'conectar'] }
            ]
          },
          {
            id: 'administracion-seguridad',
            label: 'Seguridad',
            icono: '🔐',
            keywords: ['roles', 'permisos', 'accesos'],
            hijos: [
              { id: 'administracion-permisos', label: 'Permisos por Rol', icono: '🔐', ruta: '/administracion/datos-maestros/permisos', permiso: 'admin.permisos_rol', keywords: ['roles', 'permisos', 'accesos'] },
              { id: 'administracion-usuarios', label: 'Usuarios', icono: '👤', ruta: '/administracion/datos-maestros/usuarios', permiso: 'admin.usuarios', keywords: ['cuentas', 'accesos', 'login', 'claves'] },
              { id: 'administracion-roles', label: 'Roles', icono: '🎭', ruta: '/administracion/datos-maestros/roles', permiso: 'admin.roles', keywords: ['perfiles', 'cargos de sistema'] },
              { id: 'administracion-usuarios-x-rol', label: 'Usuarios por Rol', icono: '👥', ruta: '/administracion/datos-maestros/usuarios-x-rol', permiso: 'admin.usuarios_x_rol', keywords: ['asignar usuarios', 'asignacion masiva'] },
              { id: 'administracion-auditoria', label: 'Auditoría', icono: '🔍', ruta: '/administracion/auditoria-registros', permiso: 'admin.auditoria', keywords: ['logs', 'registros', 'historial'] }
            ]
          },
          { id: 'administracion-documentacion', label: 'Documentación', icono: '📖', ruta: '/administracion/datos-maestros/documentacion-sistema', permiso: 'admin.documentacion', keywords: ['ayuda', 'manual'] }
        ]
      }
    ];
  }
}