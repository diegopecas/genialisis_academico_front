import { Injectable, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { PermisosService } from './permisos.service';

/**
 * Opción de un submenú de módulo (las tarjetas pequeñas dentro de cada grupo).
 * - `id` es el código que recibe el `seleccionarOpcion` de cada componente.
 * - `ruta` es el destino real; es la que usa el árbol del menú principal.
 * - `imagen` o `icono` (clase de Font Awesome) definen el gráfico de la tarjeta;
 *   `iconoArbol` es el emoji con el que se ve la opción en el árbol.
 * - `permiso` (opcional) gatea la visibilidad; las opciones sin permiso se muestran siempre.
 * - `keywords` (opcional) son términos alternativos para que la búsqueda encuentre la opción
 *   aunque el usuario escriba una palabra distinta al label.
 * - `hijos` son las pantallas que se abren desde esta opción. No se pintan como tarjeta:
 *   existen para que el árbol refleje el siguiente nivel de navegación real.
 * - `labelHtml` lo llena el filtrado con el label y el término resaltado; no se declara a mano.
 */
export interface OpcionMenuModulo {
  id: string;
  label: string;
  alt?: string;
  imagen?: string;
  icono?: string;
  iconoEstilo?: { [propiedad: string]: string };
  iconoArbol?: string;
  ruta?: string;
  permiso?: string;
  columna?: string;
  keywords?: string[];
  hijos?: OpcionMenuModulo[];
  labelHtml?: SafeHtml | string;
  // Solo para las opciones que se pintan como tarjeta simple (pantalla de Administración)
  descripcion?: string;
  claseIcono?: string;
  textoAccion?: string;
}

/**
 * Grupo del menú de un módulo (la tarjeta grande con su submenú).
 * - `permisos` funciona como el `tieneAlguno` de los componentes: basta con tener uno.
 *   Si viene vacío o no viene, el grupo se muestra siempre.
 * - `claseIcono` es la clase de color que ya está en el SCSS de cada módulo
 *   (por ejemplo `actividades`, `inventario`, `apoyo`).
 * - `estilo` son variables CSS puntuales de la tarjeta, como el naranja de Cobros Automáticos.
 */
export interface GrupoMenuModulo {
  id: string;
  titulo: string;
  descripcion: string;
  claseIcono: string;
  alt?: string;
  imagen?: string;
  icono?: string;
  iconoArbol?: string;
  permisos?: string[];
  estilo?: { [propiedad: string]: string };
  keywords?: string[];
  opciones: OpcionMenuModulo[];
  tituloHtml?: SafeHtml | string;
}

/**
 * Módulo del sistema: una pantalla con tarjetas y, cuando aplica, otras pantallas
 * que cuelgan de ella. Es la raíz del árbol del menú principal.
 * - `ruta` es la pantalla del módulo y `rutaLabel` la etiqueta de ese acceso dentro del árbol.
 * - `grupos` son las tarjetas de esa pantalla (lo que consumen los componentes).
 * - `opciones` son pantallas que se alcanzan desde el módulo sin pasar por una tarjeta
 *   con submenú (por ejemplo Auditoría, o las tarjetas simples de CRM).
 * - `submodulos` son ids de otros módulos a los que se llega desde esta pantalla;
 *   el árbol los anida ahí para reflejar la navegación real.
 * - `raiz: false` marca los módulos que no son raíz del árbol porque cuelgan de otro.
 */
export interface ModuloMenu {
  id: string;
  label: string;
  iconoArbol: string;
  imagen?: string;
  permiso?: string;
  ruta?: string;
  rutaLabel?: string;
  rutaPermiso?: string;
  keywords?: string[];
  raiz?: boolean;
  grupos: GrupoMenuModulo[];
  opciones?: OpcionMenuModulo[];
  submodulos?: string[];
  // Datos con los que el módulo se pinta como tarjeta dentro de la pantalla de su padre
  descripcion?: string;
  claseIcono?: string;
  textoAccion?: string;
  idTarjeta?: string;
}

/**
 * Tarjeta simple de una pantalla que no tiene submenús (hoy, la de Administración).
 * `id` es el código que recibe el `seleccionarOpcion` del componente y `keywords`
 * incluye lo que hay dentro de esa pantalla, para que el buscador la encuentre
 * escribiendo por ejemplo "mora" o "usuarios".
 */
export interface TarjetaModulo {
  id: string;
  titulo: string;
  descripcion: string;
  imagen?: string;
  claseIcono: string;
  textoAccion: string;
  permiso?: string;
  keywords: string[];
  tituloHtml?: SafeHtml | string;
}

@Injectable({
  providedIn: 'root'
})
export class MenuModulosService {

  private permisosService = inject(PermisosService);
  private sanitizer = inject(DomSanitizer);

  // ============================================
  // CATÁLOGO ÚNICO
  // Lo consumen las pantallas de módulo (para las tarjetas) y
  // menu-arbol.service.ts (para armar el árbol del menú principal).
  // ============================================

  getModulos(): ModuloMenu[] {
    return [
      {
        id: 'estudiantes',
        label: 'Estudiantes',
        iconoArbol: '🎓',
        imagen: '/assets/images/estudiantes.png',
        permiso: 'estudiantes.ver',
        ruta: '/estudiantes/gestion',
        rutaLabel: 'Gestión de Estudiantes',
        rutaPermiso: 'estudiantes.gestion',
        keywords: ['alumnos', 'niños', 'ninos', 'matricula', 'matrícula', 'estudiantado', 'parvulos'],
        grupos: [
          {
            id: 'estudiantes',
            titulo: 'Estudiantes',
            descripcion: 'Administra los estudiantes, sus grupos, grados, horarios y datos académicos',
            claseIcono: 'estudiantes',
            iconoArbol: '🎓',
            alt: 'Estudiantes',
            imagen: 'assets/images/estudiantes.png',
            permisos: ['estudiantes.administrar', 'estudiantes.listado'],
            keywords: ['alumnos', 'niños', 'ninos', 'matricula'],
            opciones: [
              { id: 'estudiantes', label: 'Gestión', alt: 'Gestión', imagen: 'assets/images/estudiantes.png', iconoArbol: '🎓', ruta: '/estudiantes', permiso: 'estudiantes.listado', keywords: ['alumnos', 'listado', 'matricula', 'estudiantado', 'parvulos'] },
              { id: 'registro-rapido-estudiante', label: 'Registro rápido', alt: 'Registro rápido', imagen: 'assets/images/registro-rapido-estudiante.png', iconoArbol: '⚡', ruta: '/estudiantes/registro-rapido', permiso: 'estudiantes.administrar', keywords: ['registro rapido', 'registro civil', 'nuip', 'matricula', 'foto'] }
            ]
          }
        ]
      },
      {
        id: 'academico',
        label: 'Académico',
        iconoArbol: '🎓',
        imagen: '/assets/images/academico.png',
        permiso: 'academico.ver',
        ruta: '/academico',
        rutaLabel: 'Módulo académico',
        rutaPermiso: 'academico.ver',
        keywords: ['curriculo', 'currículo', 'pedagogico', 'clases', 'ensenanza', 'notas'],
        grupos: [
          {
            id: 'planeacion',
            titulo: 'Planeación',
            descripcion: 'Gestiona logros, indicadores, actividades y sprints',
            claseIcono: 'planeacion',
            iconoArbol: '🗺️',
            alt: 'Planeación',
            imagen: '/assets/images/planeacion.png',
            permisos: ['academico.cortes_academicos', 'academico.indicadores_logros', 'academico.logros', 'academico.selector_actividades', 'academico.sprints'],
            keywords: ['curriculo', 'plan de estudios', 'pensum'],
            opciones: [
              { id: 'cortes-academicos', label: 'Cortes Académicos', alt: 'Cortes Académicos', imagen: '/assets/images/cortes-academicos.png', iconoArbol: '📅', ruta: '/academico/cortes-academicos', permiso: 'academico.cortes_academicos', keywords: ['periodos', 'trimestres', 'bimestres'] },
              { id: 'logros', label: 'Logros', alt: 'Logros', imagen: '/assets/images/logros.png', iconoArbol: '🏆', ruta: '/academico/logros', permiso: 'academico.logros', keywords: ['competencias', 'desempenos'] },
              { id: 'indicadores-logro', label: 'Indicadores de Logros', alt: 'Indicadores', imagen: '/assets/images/indicadores-logros.png', iconoArbol: '🎯', ruta: '/academico/indicadores-logros', permiso: 'academico.indicadores_logros', keywords: ['indicadores', 'desempenos'] },
              {
                id: 'actividades',
                label: 'Actividades',
                alt: 'Actividades',
                imagen: '/assets/images/actividades.png',
                iconoArbol: '📝',
                ruta: '/academico/actividades',
                permiso: 'academico.selector_actividades',
                keywords: ['tareas', 'trabajos', 'clases'],
                hijos: [
                  { id: 'actividades-gestion', label: 'Gestión Actividades', iconoArbol: '📝', ruta: '/academico/actividades/gestion', permiso: 'academico.actividades', keywords: ['tareas', 'trabajos'] },
                  { id: 'actividades-manual', label: 'Mis Actividades', iconoArbol: '✏️', ruta: '/academico/actividades/manual', permiso: 'academico.crear_actividades_manual', keywords: ['crear actividades', 'manual'] },
                  { id: 'actividades-maquina', label: 'Máquina de Actividades', iconoArbol: '🤖', ruta: '/academico/actividades/maquina', permiso: 'academico.maquina_actividades', keywords: ['ia', 'inteligencia artificial', 'generador'] },
                  { id: 'actividades-evaluacion', label: 'Actividades de Evaluación', iconoArbol: '🎯', ruta: '/academico/actividades/evaluacion', permiso: 'academico.actividades_evaluacion', keywords: ['evaluacion', 'examenes'] },
                  { id: 'actividades-importar', label: 'Importar de Sprint', iconoArbol: '📋', ruta: '/academico/actividades/importar', permiso: 'academico.importar_actividades_sprint', keywords: ['importar', 'sprint'] }
                ]
              },
              { id: 'sprints', label: 'Sprints', alt: 'Sprints', imagen: '/assets/images/sprints.png', iconoArbol: '🏃', ruta: '/academico/sprints', permiso: 'academico.sprints', keywords: ['unidades', 'proyectos'] }
            ]
          },
          {
            id: 'estructura',
            titulo: 'Estructura Académica',
            descripcion: 'Configura parámetros, grados, áreas y grupos',
            claseIcono: 'estructura',
            iconoArbol: '🏫',
            alt: 'Estructura Académica',
            imagen: '/assets/images/estructura-academica.png',
            permisos: ['academico.areas_academicas', 'academico.cursos_extra', 'academico.grados', 'academico.grupos', 'academico.parametros_calificaciones', 'academico.pde_items', 'academico.pde_rangos_edad'],
            keywords: ['configuracion', 'salones', 'niveles'],
            opciones: [
              { id: 'parametros-calificaciones', label: 'Parámetros Calificaciones', alt: 'Parámetros', imagen: '/assets/images/parametros-calificaciones.png', iconoArbol: '⚙️', ruta: '/academico/parametros-calificaciones', permiso: 'academico.parametros_calificaciones', keywords: ['escala de notas', 'escala', 'notas'] },
              { id: 'grados', label: 'Grados', alt: 'Grados', imagen: '/assets/images/grados.png', iconoArbol: '📚', ruta: '/academico/grados', permiso: 'academico.grados', keywords: ['niveles', 'cursos'] },
              { id: 'areas-academicas', label: 'Áreas Académicas', alt: 'Áreas Académicas', imagen: '/assets/images/areas-academicas.png', iconoArbol: '📖', ruta: '/academico/areas-academicas', permiso: 'academico.areas_academicas', keywords: ['materias', 'asignaturas'] },
              { id: 'grupos', label: 'Grupos', alt: 'Grupos', imagen: '/assets/images/grupos.png', iconoArbol: '👨‍👩‍👧‍👦', ruta: '/academico/grupos', permiso: 'academico.grupos', keywords: ['salones', 'aulas', 'cursos'] },
              { id: 'cursos-extra', label: 'Cursos Extracurriculares', alt: 'Cursos Extracurriculares', imagen: '/assets/images/cursos-extra.png', iconoArbol: '🎭', ruta: '/academico/cursos-extra', permiso: 'academico.cursos_extra', keywords: ['extracurriculares', 'talleres'] },
              { id: 'pde-rangos-edad', label: 'Rangos de Edad PDE', alt: 'Rangos de Edad', imagen: '/assets/images/pde-rangos-edad.png', iconoArbol: '📏', ruta: '/academico/pde-rangos-edad', permiso: 'academico.pde_rangos_edad', keywords: ['perfil desarrollo', 'rangos', 'edades', 'pde'] },
              { id: 'pde-items', label: 'Ítems Perfil Desarrollo', alt: 'Items PDE', imagen: '/assets/images/pde-items.png', iconoArbol: '🧩', ruta: '/academico/pde-items', permiso: 'academico.pde_items', keywords: ['perfil desarrollo', 'items', 'pruebas', 'pde', 'esferas'] }
            ]
          },
          {
            id: 'informes',
            titulo: 'Informes',
            descripcion: 'Configura cómo sale el boletín del jardín',
            claseIcono: 'informes',
            iconoArbol: '📄',
            alt: 'Informes',
            imagen: '/assets/images/informes-modulo.png',
            permisos: ['academico.informes_configuracion', 'academico.informes_secciones', 'academico.informes_items'],
            keywords: ['boletin', 'boletín', 'informe', 'calificaciones', 'notas', 'secciones'],
            opciones: [
              { id: 'informes-configuracion', label: 'Configuración del Informe', alt: 'Configuración del Informe', imagen: '/assets/images/informes-configuracion.png', iconoArbol: '⚙️', ruta: '/academico/informes/configuracion', permiso: 'academico.informes_configuracion', keywords: ['parametro de evaluacion', 'firmas', 'encabezado', 'ausencias', 'escala'] },
              { id: 'informes-secciones', label: 'Secciones del Informe', alt: 'Secciones del Informe', imagen: '/assets/images/informes-secciones.png', iconoArbol: '🗂️', ruta: '/academico/informes/secciones', permiso: 'academico.informes_secciones', keywords: ['dimensiones', 'esferas', 'inteligencias', 'agrupacion del boletin'] },
              { id: 'informes-items', label: 'Ítems del Informe', alt: 'Ítems del Informe', imagen: '/assets/images/informes-items.png', iconoArbol: '📋', ruta: '/academico/informes/items', permiso: 'academico.informes_items', keywords: ['participacion familiar', 'filas propias', 'familia'] }
            ]
          }
        ]
      },
      {
        id: 'calificaciones',
        label: 'Calificaciones',
        iconoArbol: '⭐',
        imagen: '/assets/images/reporte.png',
        permiso: 'calificaciones.ver',
        ruta: '/calificacion',
        keywords: ['notas', 'evaluacion', 'puntajes', 'calificar'],
        grupos: []
      },
      {
        id: 'asistencia',
        label: 'Asistencia',
        iconoArbol: '✋',
        imagen: '/assets/images/asistencia.png',
        permiso: 'asistencia.ver',
        ruta: '/asistencia',
        keywords: ['inasistencia', 'faltas', 'presente', 'llegadas'],
        grupos: []
      },
      {
        id: 'reportes',
        label: 'Reportes',
        iconoArbol: '📊',
        imagen: '/assets/images/detalle.png',
        permiso: 'reportes.ver',
        ruta: '/reportes',
        rutaLabel: 'Centro de Reportes',
        rutaPermiso: 'reportes.ver',
        keywords: ['informes', 'reporteria', 'estadisticas', 'tablero'],
        grupos: [
          {
            id: 'academicos',
            titulo: 'Académicos',
            descripcion: 'Reportes de calificaciones y seguimiento académico',
            claseIcono: 'academicos',
            iconoArbol: '📚',
            alt: 'Académicos',
            imagen: 'assets/images/academico.png',
            permisos: ['reportes.academicos_estudiante', 'reportes.calificaciones_estudiante', 'reportes.calificaciones_sprint', 'reportes.cobertura_curricular', 'reportes.cursos_extra', 'reportes.ejecucion_tareas', 'reportes.malla_curricular', 'reportes.distribucion_malla', 'reportes.horarios', 'reportes.monitoreo_sprint'],
            keywords: ['notas', 'boletines', 'curriculo', 'pedagogico'],
            opciones: [
              { id: 'academicos-estudiante', label: 'Reportes Académicos', alt: 'Reportes Académicos', imagen: 'assets/images/reporte-academicos-estudiante.png', iconoArbol: '📄', ruta: '/reportes/academicos-estudiante', permiso: 'reportes.academicos_estudiante', keywords: ['boletines', 'notas', 'academico'] },
              { id: 'calificaciones-sprint', label: 'Calificaciones Sprint', alt: 'Calificaciones Sprint', imagen: 'assets/images/calificaciones-sprint.png', iconoArbol: '📝', ruta: '/reportes/calificaciones-sprint', permiso: 'reportes.calificaciones_sprint', keywords: ['notas', 'unidades', 'sprint'] },
              { id: 'calificaciones-estudiante', label: 'Calificaciones Estudiante', alt: 'Calificaciones Estudiante', imagen: 'assets/images/calificaciones-estudiante.png', iconoArbol: '🎯', ruta: '/reportes/calificaciones/estudiante', permiso: 'reportes.calificaciones_estudiante', keywords: ['notas', 'boletin', 'alumno'] },
              { id: 'monitoreo-sprint', label: 'Monitoreo Sprint', alt: 'Monitoreo Sprint', imagen: 'assets/images/reporte-monitoreo-sprint.png', iconoArbol: '🏃', ruta: '/reportes/monitoreo-sprint', permiso: 'reportes.monitoreo_sprint', keywords: ['sprint', 'seguimiento', 'avance'] },
              { id: 'malla-curricular', label: 'Malla Curricular', alt: 'Malla Curricular', imagen: 'assets/images/malla-curricular.png', iconoArbol: '🗺️', ruta: '/reportes/malla-curricular', permiso: 'reportes.malla_curricular', keywords: ['pensum', 'plan de estudios', 'curriculo'] },
              { id: 'cobertura-curricular', label: 'Cobertura Curricular', alt: 'Cobertura Curricular', imagen: 'assets/images/cobertura-curricular.png', iconoArbol: '📈', ruta: '/reportes/cobertura-curricular', permiso: 'reportes.cobertura_curricular', keywords: ['avance', 'curriculo', 'cumplimiento'] },
              { id: 'distribucion-malla', label: 'Distribución de la Malla', alt: 'Distribución de la Malla', imagen: 'assets/images/distribucion-malla.png', iconoArbol: '🧩', ruta: '/reportes/distribucion-malla', permiso: 'reportes.distribucion_malla', keywords: ['malla', 'distribucion', 'logros', 'indicadores', 'cobertura', 'faltantes', 'pensum', 'matriz'] },
              { id: 'horarios', label: 'Horarios', alt: 'Horarios', imagen: 'assets/images/reporte-horarios.png', iconoArbol: '🕐', ruta: '/reportes/horarios', permiso: 'reportes.horarios', keywords: ['franjas', 'clases', 'grupos', 'dias', 'docentes', 'cruces', 'choques', 'semana'] },
              { id: 'ejecucion-tareas', label: 'Ejecución de Tareas', alt: 'Ejecución de Tareas', imagen: 'assets/images/reporte-ejecucion-tareas.png', iconoArbol: '📊', ruta: '/reportes/ejecucion-tareas', permiso: 'reportes.ejecucion_tareas', keywords: ['actividades', 'cumplimiento', 'trabajos'] },
              { id: 'cursos-extra', label: 'Reporte Cursos Extra', alt: 'Reporte Cursos Extra', imagen: 'assets/images/reporte-cursos-extra.png', iconoArbol: '🎭', ruta: '/reportes/cursos-extra', permiso: 'reportes.cursos_extra', keywords: ['extracurriculares', 'talleres', 'inscritos'] }
            ]
          },
          {
            id: 'estudiantes',
            titulo: 'Estudiantes',
            descripcion: 'Información general, asistencia y útiles diarios',
            claseIcono: 'estudiantes',
            iconoArbol: '🎓',
            alt: 'Estudiantes',
            imagen: 'assets/images/estudiantes.png',
            permisos: ['reportes.asistencia', 'reportes.estudiantes_general', 'reportes.utiles_diarios'],
            keywords: ['alumnos', 'niños', 'ninos'],
            opciones: [
              { id: 'estudiantes-general', label: 'Reporte General', alt: 'Reporte General', imagen: 'assets/images/reporte-estudiantes.png', iconoArbol: '📋', ruta: '/reportes/estudiantes-general', permiso: 'reportes.estudiantes_general', keywords: ['listado estudiantes', 'alumnos', 'general'] },
              { id: 'asistencia', label: 'Reporte Asistencia', alt: 'Reporte Asistencia', imagen: 'assets/images/asistencia.png', iconoArbol: '✋', ruta: '/reportes/asistencia', permiso: 'reportes.asistencia', keywords: ['inasistencia', 'faltas', 'llegadas'] },
              { id: 'utiles-diarios', label: 'Útiles y Accesorios Diarios', alt: 'Útiles y Accesorios Diarios', imagen: 'assets/images/utiles-diarios.png', iconoArbol: '🎒', ruta: '/reportes/utiles-diarios', permiso: 'reportes.utiles_diarios', keywords: ['utiles', 'accesorios', 'inventario diario', 'maleta', 'morral', 'que trajo', 'que se llevo', 'chaqueta', 'lonchera', 'termo'] }
            ]
          },
          {
            id: 'financiero',
            titulo: 'Financiero',
            descripcion: 'Control financiero, cartera y pagos recibidos',
            claseIcono: 'financiero',
            iconoArbol: '💵',
            alt: 'Financiero',
            imagen: 'assets/images/finanzas.png',
            permisos: ['reportes.cartera', 'reportes.cobros_realizados', 'reportes.movimientos_financieros', 'reportes.pagos_recibidos', 'reportes.reportes_pago'],
            keywords: ['dinero', 'plata', 'finanzas', 'contabilidad'],
            opciones: [
              { id: 'cartera', label: 'Cartera', alt: 'Cartera', imagen: 'assets/images/cartera.png', iconoArbol: '💰', ruta: '/reportes/cartera', permiso: 'reportes.cartera', keywords: ['deudas', 'cuentas por cobrar', 'morosos', 'cobranza'] },
              { id: 'cobros-realizados', label: 'Cobros Realizados', alt: 'Cobros Realizados', imagen: 'assets/images/cobros-realizados.png', iconoArbol: '🧾', ruta: '/reportes/cobros-realizados', permiso: 'reportes.cobros_realizados', keywords: ['facturado', 'cuentas por cobrar', 'recaudo'] },
              { id: 'pagos-recibidos', label: 'Pagos Recibidos', alt: 'Pagos Recibidos', imagen: 'assets/images/pagos.png', iconoArbol: '💳', ruta: '/reportes/pagos-recibidos', permiso: 'reportes.pagos_recibidos', keywords: ['recaudo', 'abonos', 'comprobantes'] },
              { id: 'reportes-pago', label: 'Reportes de Pago', alt: 'Reportes de Pago', imagen: 'assets/images/reportar-pago.png', iconoArbol: '📑', ruta: '/reportes/reportes-pago', permiso: 'reportes.reportes_pago', keywords: ['soportes', 'consignaciones', 'papas'] },
              { id: 'movimientos-financieros', label: 'Ingresos y Egresos', alt: 'Ingresos y Egresos', imagen: 'assets/images/finanzas.png', iconoArbol: '💹', ruta: '/reportes/movimientos-financieros', permiso: 'reportes.movimientos_financieros', keywords: ['movimientos financieros', 'gastos', 'flujo', 'caja'] }
            ]
          },
          {
            id: 'colaboradores',
            titulo: 'Colaboradores',
            descripcion: 'Reportes de contabilización e historial de actividades',
            claseIcono: 'colaboradores',
            iconoArbol: '🧑‍💼',
            alt: 'Colaboradores',
            imagen: 'assets/images/colaboradores.png',
            permisos: ['reportes.asistencia_colaboradores', 'reportes.contabilizaciones', 'reportes.historial_actividades'],
            keywords: ['docentes', 'profesoras', 'empleados', 'personal', 'equipo'],
            opciones: [
              { id: 'reporte-contabilizaciones', label: 'Reportes de Contabilización', alt: 'Reportes Contabilización', imagen: 'assets/images/reportes_actividades_colaboradores.png', iconoArbol: '🧾', ruta: '/reportes/reporte-contabilizaciones', permiso: 'reportes.contabilizaciones', keywords: ['horas', 'actividades', 'pagos'] },
              { id: 'historial-actividades', label: 'Historial de Actividades', alt: 'Historial Actividades', imagen: 'assets/images/historial_actividades.png', iconoArbol: '📜', ruta: '/reportes/historial-actividades', permiso: 'reportes.historial_actividades', keywords: ['tareas', 'equipo', 'seguimiento'] },
              { id: 'asistencia-colaboradores', label: 'Asistencia Colaboradores', alt: 'Asistencia Colaboradores', imagen: 'assets/images/reporte-asistencia-colaboradores.png', iconoArbol: '📋', ruta: '/reportes/asistencia-colaboradores', permiso: 'reportes.asistencia_colaboradores', keywords: ['faltas', 'ingreso', 'marcacion', 'jornada'] }
            ]
          },
          {
            id: 'administracion',
            titulo: 'Administración',
            descripcion: 'Reportes administrativos generales',
            claseIcono: 'administracion',
            iconoArbol: '🗄️',
            alt: 'Administración',
            imagen: 'assets/images/administracion.png',
            permisos: ['dashboard.gerencial.listado', 'reportes.documentos_registrados', 'reportes.cumplimiento_documental'],
            keywords: ['gerencia', 'documentos', 'tablero'],
            opciones: [
              { id: 'dashboard-gerencial', label: 'Dashboard Gerencial', alt: 'Dashboard Gerencial', imagen: 'assets/images/dashboard-gerencial.png', iconoArbol: '📊', ruta: '/reportes/dashboard-gerencial', permiso: 'dashboard.gerencial.listado', keywords: ['tablero', 'indicadores', 'gerencia'] },
              { id: 'documentos-registrados', label: 'Documentos Registrados', alt: 'Documentos Registrados', imagen: 'assets/images/reporte-documentos.png', iconoArbol: '📎', ruta: '/reportes/documentos-registrados', permiso: 'reportes.documentos_registrados', keywords: ['documentos', 'archivos', 'papeles', 'vencidos', 'vencimientos', 'hoja de vida'] },
              { id: 'cumplimiento-documental', label: 'Cumplimiento Documental', alt: 'Cumplimiento Documental', imagen: 'assets/images/reporte-cumplimiento-documental.png', iconoArbol: '✅', ruta: '/reportes/cumplimiento-documental', permiso: 'reportes.cumplimiento_documental', keywords: ['documentos faltantes', 'que falta', 'pendientes', 'sin subir', 'completitud', 'requisitos'] }
            ]
          },
          {
            id: 'apoyo',
            titulo: 'Apoyo',
            descripcion: 'Control de alimentación y servicios',
            claseIcono: 'apoyo',
            iconoArbol: '🍎',
            alt: 'Apoyo',
            imagen: 'assets/images/apoyo.png',
            permisos: ['reportes.alimentacion'],
            keywords: ['cocina', 'comida', 'servicios'],
            opciones: [
              { id: 'alimentacion', label: 'Alimentación', alt: 'Alimentación', imagen: 'assets/images/alimentacion.png', iconoArbol: '🍎', ruta: '/reportes/alimentacion', permiso: 'reportes.alimentacion', columna: 'col-12', keywords: ['comida', 'onces', 'refrigerios', 'cocina'] }
            ]
          }
        ]
      },
      {
        id: 'operaciones',
        label: 'Operaciones',
        iconoArbol: '⚙️',
        imagen: '/assets/images/operaciones.png',
        permiso: 'operaciones.ver',
        ruta: '/operaciones',
        rutaLabel: 'Módulo Operaciones',
        rutaPermiso: 'operaciones.ver',
        keywords: ['operativo', 'dia a dia', 'gestion diaria'],
        grupos: [
          {
            id: 'actividades',
            titulo: 'Actividades',
            descripcion: 'Medidas, galerías y útiles diarios',
            claseIcono: 'actividades',
            iconoArbol: '🎨',
            alt: 'Actividades',
            imagen: 'assets/images/actividades.png',
            permisos: ['operaciones.galerias', 'operaciones.registro_medidas', 'operaciones.utiles_diarios'],
            keywords: ['fotos', 'talla', 'peso', 'maleta'],
            opciones: [
              { id: 'registro-medidas', label: 'Registro de Medidas', alt: 'Registro de Medidas', imagen: 'assets/images/medidas.png', iconoArbol: '📏', ruta: '/operaciones/registro-medidas', permiso: 'operaciones.registro_medidas', keywords: ['talla', 'peso', 'estatura', 'antropometria'] },
              { id: 'galerias', label: 'Gestión de Galerías', alt: 'Gestión de Galerías', imagen: 'assets/images/galeria.png', iconoArbol: '🖼️', ruta: '/operaciones/galerias', permiso: 'operaciones.galerias', keywords: ['fotos', 'imagenes', 'album', 'videos'] },
              { id: 'utiles-diarios', label: 'Útiles y Accesorios Diarios', alt: 'Útiles y Accesorios Diarios', imagen: 'assets/images/utiles-diarios.png', iconoArbol: '🎒', ruta: '/operaciones/utiles-diarios', permiso: 'operaciones.utiles_diarios', keywords: ['utiles', 'accesorios', 'inventario diario', 'maleta', 'morral', 'que trajo', 'que se llevo', 'chaqueta', 'lonchera', 'termo'] }
            ]
          },
          {
            id: 'inventario',
            titulo: 'Inventario',
            descripcion: 'Movimientos y salidas de productos',
            claseIcono: 'inventario',
            iconoArbol: '📦',
            alt: 'Inventario',
            imagen: 'assets/images/inventario.png',
            permisos: ['operaciones.movimientos_productos', 'operaciones.salidas_alimentacion'],
            keywords: ['bodega', 'stock', 'existencias'],
            opciones: [
              { id: 'movimientos-inventario', label: 'Movimientos de Inventario', alt: 'Movimientos de Inventario', imagen: 'assets/images/movimientos-inventario.png', iconoArbol: '📦', ruta: '/operaciones/movimientos-productos', permiso: 'operaciones.movimientos_productos', keywords: ['entradas', 'salidas', 'stock', 'bodega', 'productos'] },
              { id: 'salidas-alimentacion', label: 'Salidas de Alimentación', alt: 'Salidas de Alimentación', imagen: 'assets/images/salidas_alimentacion.png', iconoArbol: '🍱', ruta: '/operaciones/salidas-alimentacion', permiso: 'operaciones.salidas_alimentacion', keywords: ['comida', 'cocina', 'consumo', 'onces'] }
            ]
          },
          {
            id: 'apoyo',
            titulo: 'Apoyo',
            descripcion: 'Registro, control de limpieza y cocina',
            claseIcono: 'apoyo',
            iconoArbol: '🧼',
            alt: 'Apoyo',
            imagen: 'assets/images/apoyo.png',
            permisos: ['operaciones.asignacion_onces', 'operaciones.disponibilidad_cocina', 'operaciones.edicion_masiva_limpieza', 'operaciones.entrega_alimentacion', 'operaciones.inventario_alimentacion', 'operaciones.registro_masivo_limpieza', 'operaciones.registro_rapido_limpieza', 'operaciones.registros_limpieza', 'operaciones.reporte_aseo', 'operaciones.supervision_limpieza'],
            keywords: ['aseo', 'limpieza', 'cocina', 'alimentacion'],
            opciones: [
              { id: 'registros-limpieza', label: 'Registro de Limpieza', alt: 'Registro de Limpieza', imagen: 'assets/images/limpieza.png', iconoArbol: '🧼', ruta: '/operaciones/registros-limpieza', permiso: 'operaciones.registros_limpieza', keywords: ['aseo', 'desinfeccion', 'areas'] },
              { id: 'registro-rapido-limpieza', label: 'Registro Rápido de Aseo', alt: 'Registro Rápido de Aseo', imagen: 'assets/images/registro_limpieza_rapido.png', iconoArbol: '⚡', ruta: '/operaciones/registro-rapido-limpieza', permiso: 'operaciones.registro_rapido_limpieza', keywords: ['aseo', 'limpieza', 'rapido', 'express'] },
              { id: 'registro-masivo-limpieza', label: 'Registro Masivo de Aseo', alt: 'Registro Masivo de Aseo', imagen: 'assets/images/registro_masivo_limpieza.png', iconoArbol: '📅', ruta: '/operaciones/registro-masivo-limpieza', permiso: 'operaciones.registro_masivo_limpieza', keywords: ['aseo', 'limpieza', 'masivo', 'rango', 'varios dias', 'lote'] },
              { id: 'edicion-masiva-limpieza', label: 'Edición Masiva de Aseo', alt: 'Edición Masiva de Aseo', imagen: 'assets/images/edicion_masiva_limpieza.png', iconoArbol: '✏️', ruta: '/operaciones/edicion-masiva-limpieza', permiso: 'operaciones.edicion_masiva_limpieza', keywords: ['aseo', 'limpieza', 'editar', 'lote', 'corregir', 'borrar'] },
              { id: 'supervision-limpieza', label: 'Supervisión de Aseo', alt: 'Supervisión de Aseo', imagen: 'assets/images/supervision_limpieza.png', iconoArbol: '✅', ruta: '/operaciones/supervision-limpieza', permiso: 'operaciones.supervision_limpieza', keywords: ['aseo', 'limpieza', 'supervisar', 'aprobar'] },
              { id: 'reporte-aseo', label: 'Reporte de Aseo', alt: 'Reporte de Aseo', imagen: 'assets/images/reporte_aseo.png', iconoArbol: '📄', ruta: '/operaciones/reporte-aseo', permiso: 'operaciones.reporte_aseo', keywords: ['aseo', 'limpieza', 'informe', 'pdf'] },
              { id: 'disponibilidad-cocina', label: 'Disponibilidad Cocina', alt: 'Disponibilidad Cocina', imagen: 'assets/images/disponiblidad_cocina.png', iconoArbol: '🍳', ruta: '/operaciones/disponibilidad-cocina', permiso: 'operaciones.disponibilidad_cocina', keywords: ['cocina', 'menu', 'comida'] },
              { id: 'asignacion-onces', label: 'Asignación de Onces', alt: 'Asignación de Onces', imagen: 'assets/images/asignar_alimentacion.png', iconoArbol: '🍱', ruta: '/operaciones/asignacion-onces', permiso: 'operaciones.asignacion_onces', keywords: ['onces', 'refrigerios', 'alimentacion', 'medias nueves'] },
              { id: 'entrega-alimentacion', label: 'Entrega Alimentación', alt: 'Entrega Alimentación', imagen: 'assets/images/entrega_alimentacion.png', iconoArbol: '🍽️', ruta: '/operaciones/entrega-alimentacion', permiso: 'operaciones.entrega_alimentacion', keywords: ['comida', 'almuerzo', 'onces'] },
              { id: 'inventario-alimentacion', label: 'Inventario Alimentación', alt: 'Inventario Alimentación', imagen: 'assets/images/salidas_alimentacion.png', iconoArbol: '📦', ruta: '/operaciones/inventario-alimentacion', permiso: 'operaciones.inventario_alimentacion', keywords: ['stock', 'comida', 'despensa'] }
            ]
          },
          {
            id: 'estudiantes',
            titulo: 'Estudiantes',
            descripcion: 'Gestión y seguimiento de estudiantes',
            claseIcono: 'estudiantes',
            iconoArbol: '🎓',
            alt: 'Estudiantes',
            imagen: 'assets/images/estudiantes.png',
            permisos: ['estudiantes.observaciones.administrar', 'operaciones.actualizacion_datos', 'operaciones.agenda_estudiantes', 'operaciones.asistencia_masiva', 'operaciones.autorizacion_informes', 'operaciones.editar_asistencia', 'operaciones.evaluacion_desarrollo', 'operaciones.inscripcion_cursos_extra', 'operaciones.perfil_desarrollo', 'operaciones.recordatorios_generales', 'operaciones.seguimiento_asistencia'],
            keywords: ['alumnos', 'niños', 'ninos'],
            opciones: [
              { id: 'actualizacion-datos-estudiantes', label: 'Actualización Datos', alt: 'Actualización Datos', imagen: 'assets/images/cambio-estado-estudiantes.png', iconoArbol: '🔄', ruta: '/operaciones/actualizacion-datos-estudiantes', permiso: 'operaciones.actualizacion_datos', keywords: ['datos estudiantes', 'actualizar', 'cambio de estado', 'retiro'] },
              { id: 'agenda-estudiantes', label: 'Agenda de Estudiantes', alt: 'Agenda de Estudiantes', imagen: 'assets/images/agenda-estudiantes.png', iconoArbol: '📒', ruta: '/operaciones/agenda-estudiantes', permiso: 'operaciones.agenda_estudiantes', keywords: ['agenda', 'mi agenda', 'mi dia', 'dia del estudiante', 'que hizo hoy', 'linea de tiempo', 'portal de padres', 'lo que ve el papa'] },
              { id: 'evaluacion-desarrollo', label: 'Evaluación EAD-3', alt: 'Evaluación EAD-3', imagen: 'assets/images/tamizajes.png', iconoArbol: '📈', ruta: '/operaciones/evaluacion-desarrollo', permiso: 'operaciones.evaluacion_desarrollo', keywords: ['ead', 'desarrollo', 'valoracion', 'tamizaje'] },
              { id: 'perfil-desarrollo', label: 'Perfil de Desarrollo', alt: 'Perfil de Desarrollo', imagen: 'assets/images/tamizajes.png', iconoArbol: '🧠', ruta: '/operaciones/perfil-desarrollo', permiso: 'operaciones.perfil_desarrollo', keywords: ['pde', 'perfil', 'desarrollo', 'esferas', 'indice'] },
              { id: 'asistencia-masiva', label: 'Asistencia Masiva', alt: 'Asistencia Masiva', imagen: 'assets/images/asistencia-masiva.png', iconoArbol: '🗓️', ruta: '/operaciones/asistencia-masiva', permiso: 'operaciones.asistencia_masiva', keywords: ['asistencia', 'masiva', 'lote', 'ingreso masivo', 'salida masiva', 'retroactiva', 'dia anterior', 'cargar asistencia'] },
              { id: 'editar-asistencia', label: 'Editar Asistencia', alt: 'Editar Asistencia', imagen: 'assets/images/editar-asistencia.png', iconoArbol: '📝', ruta: '/operaciones/editar-asistencia', permiso: 'operaciones.editar_asistencia', keywords: ['asistencia', 'corregir', 'editar', 'eliminar', 'borrar registro', 'error de hora', 'ajustar asistencia'] },
              { id: 'seguimiento-asistencia', label: 'Seguimiento Asistencia', alt: 'Seguimiento Asistencia', imagen: 'assets/images/seguimiento-asistencia.png', iconoArbol: '📋', ruta: '/operaciones/seguimiento-asistencia', permiso: 'operaciones.seguimiento_asistencia', keywords: ['faltas', 'inasistencia', 'llegadas'] },
              { id: 'recordatorios-generales', label: 'Recordatorios Generales', alt: 'Recordatorios Generales', imagen: 'assets/images/recordatorio-pagos.png', iconoArbol: '📢', ruta: '/operaciones/recordatorios-generales', permiso: 'operaciones.recordatorios_generales', keywords: ['avisos', 'notificaciones', 'whatsapp', 'correo'] },
              { id: 'inscripcion-cursos-extra', label: 'Inscripción Cursos Extra', alt: 'Inscripción Cursos Extra', imagen: 'assets/images/cursos-extra.png', iconoArbol: '🎭', ruta: '/operaciones/inscripcion-cursos-extra', permiso: 'operaciones.inscripcion_cursos_extra', keywords: ['extracurriculares', 'talleres', 'matricula'] },
              { id: 'autorizacion-informes', label: 'Autorización de Informes', alt: 'Autorización de Informes', imagen: 'assets/images/aprobar_informes.png', iconoArbol: '✅', ruta: '/operaciones/autorizacion-informes', permiso: 'operaciones.autorizacion_informes', keywords: ['autorizar', 'aprobar informe', 'aprobar boletin', 'habilitar informes', 'publicar informes', 'liberar informes', 'boletin', 'boletines', 'notas', 'calificaciones', 'portal de padres', 'acudientes', 'corte academico', 'saldo vencido', 'cartera', 'paz y salvo'] },
              { id: 'observaciones-informe', label: 'Informes', alt: 'Observaciones para Informe', imagen: 'assets/images/observaciones.png', iconoArbol: '📝', ruta: '/operaciones/observaciones-informe', permiso: 'estudiantes.observaciones.administrar', keywords: ['observaciones', 'informe', 'boletin', 'descriptivo'] }
            ]
          },
          {
            id: 'notificaciones',
            titulo: 'Notificaciones',
            descripcion: 'Avisos al portal de padres y seguimiento',
            claseIcono: 'notificaciones',
            iconoArbol: '📢',
            alt: 'Notificaciones',
            imagen: 'assets/images/notificaciones.png',
            permisos: ['operaciones.notificaciones_envio', 'operaciones.notificaciones_monitoreo'],
            keywords: ['avisos', 'alertas', 'push', 'mensajes', 'circulares', 'comunicados'],
            opciones: [
              { id: 'notificaciones-envio', label: 'Envío', alt: 'Envío de Notificaciones', imagen: 'assets/images/notificacion-envio.png', iconoArbol: '📨', ruta: '/operaciones/notificaciones-envio', permiso: 'operaciones.notificaciones_envio', keywords: ['notificaciones', 'avisos', 'circulares', 'comunicados', 'push', 'padres'] },
              { id: 'notificaciones-monitoreo', label: 'Monitoreo', alt: 'Monitoreo de Notificaciones', imagen: 'assets/images/notificacion-monitoreo.png', iconoArbol: '📊', ruta: '/operaciones/notificaciones-monitoreo', permiso: 'operaciones.notificaciones_monitoreo', keywords: ['notificaciones', 'seguimiento', 'acuse', 'lectura', 'respuestas'] }
            ]
          },
          {
            id: 'solicitudes',
            titulo: 'Solicitudes acudientes',
            descripcion: 'Lo que piden los papás y hay que cumplir hoy',
            claseIcono: 'solicitudes',
            iconoArbol: '📝',
            alt: 'Solicitudes acudientes',
            imagen: 'assets/images/solicitudes-acudientes.png',
            permisos: ['operaciones.solicitudes_acudientes', 'operaciones.solicitudes_aprobar', 'operaciones.notificaciones_colaboradores'],
            keywords: ['papas', 'padres', 'peticiones', 'compromisos'],
            opciones: [
              { id: 'solicitudes-acudientes', label: 'Compromisos del Día', alt: 'Compromisos del Día', imagen: 'assets/images/compromisos-dia.png', iconoArbol: '📝', ruta: '/operaciones/solicitudes-acudientes', permiso: 'operaciones.solicitudes_acudientes', keywords: ['solicitudes', 'compromisos', 'agenda del dia', 'remedio', 'medicamento', 'recoger', 'salida anticipada', 'dieta', 'recomendaciones', 'papelito'] },
              { id: 'registrar-solicitud', label: 'Registrar Solicitud', alt: 'Registrar Solicitud', imagen: 'assets/images/registrar-solicitud.png', iconoArbol: '✏️', ruta: '/operaciones/solicitudes-acudientes/registrar', permiso: 'operaciones.solicitudes_acudientes', keywords: ['registrar solicitud', 'anotar', 'llamo el papa', 'recepcion', 'crear compromiso'] },
              { id: 'aprobar-solicitudes', label: 'Aprobar Solicitudes', alt: 'Aprobar Solicitudes', imagen: 'assets/images/aprobar-solicitudes.png', iconoArbol: '✅', ruta: '/operaciones/aprobar-solicitudes', permiso: 'operaciones.solicitudes_aprobar', keywords: ['aprobar', 'rechazar', 'pendientes', 'autorizar', 'medicamento', 'formula'] },
              { id: 'mis-alertas', label: 'Mis Alertas', alt: 'Mis Alertas', imagen: 'assets/images/mis-alertas.png', iconoArbol: '🔔', ruta: '/operaciones/mis-alertas', permiso: 'operaciones.notificaciones_colaboradores', keywords: ['alertas', 'avisos', 'bandeja', 'notificaciones', 'recordatorios', 'pendientes'] }
            ]
          },
          {
            id: 'financiero',
            titulo: 'Financiero',
            descripcion: 'Recordatorios de cobro y gestión de pagos',
            claseIcono: 'financiero',
            iconoArbol: '💵',
            alt: 'Financiero',
            imagen: 'assets/images/finanzas.png',
            permisos: ['operaciones.recordatorio_pagos'],
            keywords: ['dinero', 'plata', 'cobros', 'cartera'],
            opciones: [
              { id: 'recordatorio-pagos', label: 'Recordatorio de Pagos', alt: 'Recordatorio de Pagos', imagen: 'assets/images/recordatorio-pagos.png', iconoArbol: '💬', ruta: '/operaciones/recordatorio-pagos', permiso: 'operaciones.recordatorio_pagos', columna: 'col-12', keywords: ['cobro', 'mora', 'cartera', 'whatsapp', 'aviso'] }
            ]
          }
        ]
      },
      {
        id: 'colaboradores',
        label: 'Colaboradores',
        iconoArbol: '🧑‍💼',
        imagen: '/assets/images/colaboradores.png',
        permiso: 'colaboradores.ver',
        ruta: '/colaboradores/gestion',
        rutaLabel: 'Gestión de Colaboradores',
        rutaPermiso: 'colaboradores.gestion',
        keywords: ['empleados', 'personal', 'trabajadores', 'staff', 'docentes', 'profesoras'],
        grupos: [
          {
            id: 'colaboradores',
            titulo: 'Colaboradores',
            descripcion: 'Administra colaboradores, casas asignadas y actividades del equipo',
            claseIcono: 'colaboradores',
            iconoArbol: '👥',
            alt: 'Colaboradores',
            imagen: 'assets/images/colaboradores.png',
            permisos: ['colaboradores.actividades', 'colaboradores.listado'],
            keywords: ['docentes', 'profesoras', 'empleados', 'equipo'],
            opciones: [
              { id: 'colaboradores', label: 'Gestión', alt: 'Gestión', imagen: 'assets/images/colaboradores.png', iconoArbol: '🧑‍💼', ruta: '/colaboradores', permiso: 'colaboradores.listado', columna: 'col-4', keywords: ['listado', 'empleados', 'personal', 'staff'] },
              {
                id: 'actividades-colaboradores',
                label: 'Actividades',
                alt: 'Actividades',
                imagen: 'assets/images/actividades_colaboradores.png',
                iconoArbol: '📋',
                ruta: '/colaboradores/actividades',
                permiso: 'colaboradores.actividades',
                columna: 'col-4',
                keywords: ['tareas', 'equipo', 'agenda'],
                hijos: [
                  { id: 'colaboradores-calendario', label: 'Calendario de Actividades', iconoArbol: '📅', ruta: '/colaboradores/actividades/calendario', permiso: 'colaboradores.calendario', keywords: ['agenda', 'calendario'] },
                  { id: 'colaboradores-aprobacion', label: 'Aprobar Actividades', iconoArbol: '✅', ruta: '/colaboradores/actividades/aprobacion', permiso: 'colaboradores.aprobacion_actividades', keywords: ['aprobar', 'autorizar'] },
                  { id: 'colaboradores-contabilizacion', label: 'Contabilizar Actividades', iconoArbol: '🧮', ruta: '/colaboradores/actividades/contabilizacion', permiso: 'colaboradores.contabilizacion_actividades', keywords: ['contabilizar', 'horas', 'pagos'] }
                ]
              }
            ]
          },
          {
            id: 'asistencia',
            titulo: 'Registro Ingreso / Salida',
            descripcion: 'Registra tu entrada y salida de jornada y descanso con geolocalización',
            claseIcono: 'asistencia',
            iconoArbol: '⏱️',
            icono: 'fas fa-fingerprint',
            keywords: ['marcacion', 'huella', 'entrada', 'salida', 'jornada'],
            opciones: [
              { id: 'registro-ingreso-salida', label: 'Registrar Ahora', icono: 'fas fa-clock', iconoEstilo: { 'font-size': '2rem', 'color': '#d4af37' }, iconoArbol: '⏱️', ruta: '/registro-ingreso-salida', columna: 'col-12', keywords: ['marcar', 'marcacion', 'entrada', 'salida', 'descanso', 'huella'] }
            ]
          },
          {
            id: 'nomina',
            titulo: 'Nómina',
            descripcion: 'Gestiona las nóminas de colaboradores, crea periodos, procesa pagos y genera reportes',
            claseIcono: 'nomina',
            iconoArbol: '💰',
            alt: 'Nómina',
            imagen: 'assets/images/nomina.png',
            permisos: ['colaboradores.nominas'],
            keywords: ['sueldos', 'salarios', 'liquidacion'],
            opciones: [
              { id: 'nominas', label: 'Gestionar Nóminas', alt: 'Nóminas', imagen: 'assets/images/nomina.png', iconoArbol: '💰', ruta: '/colaboradores/nominas', permiso: 'colaboradores.nominas', columna: 'col-12', keywords: ['sueldos', 'salarios', 'pago empleados', 'periodos'] }
            ]
          }
        ]
      },
      {
        id: 'administracion',
        label: 'Administración',
        iconoArbol: '🏛️',
        imagen: '/assets/images/administracion.png',
        permiso: 'administracion.ver',
        ruta: '/administracion',
        rutaLabel: 'Módulo administración',
        rutaPermiso: 'administracion.ver',
        keywords: ['admin', 'configuracion', 'ajustes', 'parametros'],
        submodulos: ['datos-maestros', 'financiero'],
        grupos: [
          {
            id: 'crm',
            titulo: 'CRM - Gestión de Visitas',
            descripcion: 'Administra visitas de prospectos y seguimiento',
            claseIcono: 'crm',
            iconoArbol: '🤝',
            alt: 'CRM',
            imagen: '/assets/images/crm.png',
            permisos: ['administracion.crm'],
            keywords: ['ventas', 'clientes', 'prospectos', 'leads'],
            opciones: [
              { id: 'visitas', label: 'Gestionar Visitas', alt: 'Visitas', imagen: 'assets/images/visitas.png', iconoArbol: '🚶', ruta: '/administracion/crm/visitas', permiso: 'admin.crm_visitas', keywords: ['visitas', 'prospectos'] },
              { id: 'contactos-portal', label: 'Contactos del Portal', alt: 'Contactos Portal', imagen: 'assets/images/contactos_portal.png', iconoArbol: '📞', ruta: '/administracion/crm/contactos-portal', permiso: 'admin.crm_contactos_portal', keywords: ['contactos', 'leads', 'portal'] },
              { id: 'dashboard', label: 'Dashboard', alt: 'Dashboard', imagen: 'assets/images/dashboard_crm.png', iconoArbol: '📊', ruta: '/administracion/crm/dashboard', permiso: 'admin.crm_dashboard', keywords: ['tablero', 'ventas', 'indicadores'] }
            ]
          },
          {
            id: 'operaciones',
            titulo: 'Operaciones',
            descripcion: 'Gestiona entes de control y sus consultas',
            claseIcono: 'operaciones',
            iconoArbol: '⚙️',
            alt: 'Operaciones',
            imagen: '/assets/images/administracion-operaciones.png',
            permisos: ['administracion.operaciones'],
            keywords: ['entes', 'control', 'operaciones'],
            opciones: [
              { id: 'entes-control', label: 'Entes de Control', alt: 'Entes de Control', imagen: '/assets/images/entes-control.png', iconoArbol: '🏛️', ruta: '/administracion/operaciones/entes-control', permiso: 'admin.entes_control', keywords: ['entes', 'control', 'vigilancia', 'secretaria', 'icbf'] },
              { id: 'consulta-entes-control', label: 'Consulta Entes de Control', alt: 'Consulta Entes de Control', imagen: '/assets/images/consulta-entes-control.png', iconoArbol: '🔎', ruta: '/administracion/operaciones/consulta-entes-control', permiso: 'admin.consulta_entes_control', keywords: ['consulta', 'entes', 'control', 'visita', 'documentos'] },
              { id: 'utiles-diarios', label: 'Útiles y Accesorios Diarios', alt: 'Útiles y Accesorios Diarios', imagen: '/assets/images/utiles-diarios.png', iconoArbol: '🎒', ruta: '/administracion/operaciones/utiles-diarios', permiso: 'admin.utiles_diarios', keywords: ['utiles', 'accesorios', 'inventario diario', 'maleta', 'lonchera', 'parametrizar'] },
              { id: 'tipos-solicitud', label: 'Tipos de Solicitud', alt: 'Tipos de Solicitud', imagen: '/assets/images/solicitudes-acudientes.png', iconoArbol: '📝', ruta: '/administracion/operaciones/tipos-solicitud', permiso: 'admin.solicitudes_acudientes', keywords: ['solicitudes', 'compromisos', 'medicamento', 'salida anticipada', 'parametrizar solicitudes'] }
            ]
          },
          {
            id: 'auditoria',
            titulo: 'Auditoría de Registros',
            descripcion: 'Analiza el cumplimiento de registros por grupo',
            claseIcono: 'auditoria',
            iconoArbol: '🔍',
            alt: 'Auditoría',
            imagen: '/assets/images/auditoria.png',
            permisos: ['admin.auditoria'],
            keywords: ['logs', 'registros', 'historial', 'cumplimiento'],
            opciones: [
              { id: 'auditoria-registros', label: 'Auditoría de Registros', alt: 'Auditoría', imagen: '/assets/images/auditoria.png', iconoArbol: '🔍', ruta: '/administracion/auditoria-registros', permiso: 'admin.auditoria', columna: 'col-12', keywords: ['logs', 'registros', 'historial', 'cumplimiento'] }
            ]
          }
        ]
      },
      {
        id: 'datos-maestros',
        label: 'Registro de Datos Maestros',
        iconoArbol: '🗃️',
        imagen: '/assets/images/datos-maestros.png',
        descripcion: 'Gestiona proveedores y productos del sistema',
        claseIcono: 'datos-maestros',
        textoAccion: 'Administrar',
        raiz: false,
        permiso: 'administracion.datos_maestros',
        ruta: '/administracion/datos-maestros',
        rutaLabel: 'Registro de Datos Maestros',
        rutaPermiso: 'administracion.datos_maestros',
        keywords: ['catalogos', 'parametros', 'maestros'],
        grupos: [
          {
            id: 'catalogos',
            titulo: 'Catálogos de Productos',
            descripcion: 'Gestiona productos, servicios y proveedores',
            claseIcono: 'catalogos',
            iconoArbol: '📦',
            alt: 'Catálogos de Productos',
            imagen: 'assets/images/catalogos-productos.png',
            permisos: ['admin.catalogos_productos'],
            keywords: ['inventario', 'compras', 'articulos', 'stock'],
            opciones: [
              { id: 'productos', label: 'Productos', alt: 'Productos', imagen: 'assets/images/productos.png', iconoArbol: '📦', ruta: '/administracion/datos-maestros/productos', permiso: 'admin.productos', keywords: ['inventario', 'articulos', 'insumos'] },
              { id: 'proveedores', label: 'Proveedores', alt: 'Proveedores', imagen: 'assets/images/proveedores.png', iconoArbol: '🚚', ruta: '/administracion/datos-maestros/proveedores', permiso: 'admin.proveedores', keywords: ['terceros', 'compras'] },
              { id: 'productos-servicios', label: 'Productos y Servicios', alt: 'Productos y Servicios', imagen: 'assets/images/productos_servicios.png', iconoArbol: '🛒', ruta: '/administracion/datos-maestros/productos-servicios', permiso: 'admin.productos_servicios', keywords: ['servicios', 'tarifas', 'precios', 'conceptos'] },
              { id: 'productos-mobiliario', label: 'Productos Mobiliario', alt: 'Mobiliario', imagen: 'assets/images/productos-mobiliario.png', iconoArbol: '🪑', ruta: '/administracion/datos-maestros/productos-mobiliario', permiso: 'admin.productos_mobiliario', keywords: ['muebles', 'dotacion'] },
              { id: 'productos-limpieza', label: 'Productos Limpieza', alt: 'Limpieza', imagen: 'assets/images/productos-limpieza.png', iconoArbol: '🧹', ruta: '/administracion/datos-maestros/productos-limpieza', permiso: 'admin.productos_limpieza', keywords: ['aseo', 'insumos'] },
              { id: 'productos-alimentacion', label: 'Productos Alimentación', alt: 'Alimentación', imagen: 'assets/images/productos-alimentacion.png', iconoArbol: '🥗', ruta: '/administracion/datos-maestros/productos-alimentacion', permiso: 'admin.productos_alimentacion', keywords: ['comida', 'cocina', 'insumos'] },
              { id: 'productos-academico', label: 'Productos Académico', alt: 'Académico', imagen: 'assets/images/productos-academico.png', iconoArbol: '📚', ruta: '/administracion/datos-maestros/productos-academico', permiso: 'admin.productos_academico', keywords: ['utiles', 'materiales'] }
            ]
          },
          {
            id: 'infraestructura',
            titulo: 'Infraestructura y Espacios',
            descripcion: 'Administra áreas físicas y elementos del colegio',
            claseIcono: 'infraestructura',
            iconoArbol: '🏗️',
            alt: 'Infraestructura y Espacios',
            imagen: 'assets/images/infraestructura-espacios.png',
            permisos: ['admin.areas_fisicas', 'admin.config_aseo', 'admin.elementos_fisicos'],
            keywords: ['salones', 'planta fisica', 'sedes', 'espacios'],
            opciones: [
              { id: 'areas-fisicas', label: 'Áreas Físicas', alt: 'Áreas Físicas', imagen: 'assets/images/areas_fisicas.png', iconoArbol: '🏗️', ruta: '/administracion/datos-maestros/areas-fisicas', permiso: 'admin.areas_fisicas', keywords: ['espacios', 'salones', 'zonas'] },
              { id: 'elementos-fisicos', label: 'Elementos Físicos', alt: 'Elementos Físicos', imagen: 'assets/images/elementos-fisicos.png', iconoArbol: '🔧', ruta: '/administracion/datos-maestros/elementos-fisicos', permiso: 'admin.elementos_fisicos', keywords: ['activos', 'dotacion', 'equipos'] },
              { id: 'config-aseo', label: 'Configuración de Aseo', alt: 'Configuración de Aseo', imagen: 'assets/images/config_aseo.png', iconoArbol: '🧹', ruta: '/administracion/datos-maestros/config-aseo', permiso: 'admin.config_aseo', keywords: ['aseo', 'limpieza', 'procesos', 'frecuencia', 'tiempos', 'dias'] }
            ]
          },
          {
            id: 'operaciones',
            titulo: 'Operaciones',
            descripcion: 'Gestiona menús y configuraciones operativas',
            claseIcono: 'operaciones',
            iconoArbol: '⚙️',
            alt: 'Operaciones',
            imagen: 'assets/images/operaciones.png',
            permisos: ['admin.gestion_medidas', 'admin.menus'],
            keywords: ['cocina', 'medidas', 'minuta'],
            opciones: [
              {
                id: 'menus',
                label: 'Menús del Restaurante',
                alt: 'Menús',
                imagen: 'assets/images/menu-restaurante.png',
                iconoArbol: '🍽️',
                ruta: '/administracion/datos-maestros/menus',
                permiso: 'admin.menus',
                keywords: ['comida', 'minuta', 'alimentacion'],
                hijos: [
                  { id: 'menus-lista', label: 'Menús Completos', iconoArbol: '📜', ruta: '/administracion/datos-maestros/menus/lista', permiso: 'admin.lista_menus', keywords: ['minuta', 'comida'] },
                  { id: 'menus-items', label: 'Ítems de Menú', iconoArbol: '🍽️', ruta: '/administracion/datos-maestros/menus/items', permiso: 'admin.items_menu', keywords: ['platos', 'comida'] }
                ]
              },
              {
                id: 'gestion-medidas',
                label: 'Gestión de Medidas Corporales',
                alt: 'Medidas Corporales',
                imagen: 'assets/images/medidas.png',
                iconoArbol: '📏',
                ruta: '/administracion/datos-maestros/gestion-medidas',
                permiso: 'admin.gestion_medidas',
                keywords: ['talla', 'peso', 'antropometria'],
                hijos: [
                  { id: 'medidas-categorias', label: 'Categorías', iconoArbol: '📂', ruta: '/administracion/datos-maestros/gestion-medidas/categorias', permiso: 'admin.categorias_medidas', keywords: ['medidas', 'agrupar'] },
                  { id: 'medidas-unidades', label: 'Unidades de Medida', iconoArbol: '📐', ruta: '/administracion/datos-maestros/gestion-medidas/unidades', permiso: 'admin.unidades_medidas', keywords: ['kg', 'cm', 'unidades'] },
                  { id: 'medidas-catalogo', label: 'Medidas', iconoArbol: '📏', ruta: '/administracion/datos-maestros/gestion-medidas/medidas', permiso: 'admin.catalogo_medidas', keywords: ['catalogo', 'medidas corporales'] }
                ]
              }
            ]
          },
          {
            id: 'plantillas',
            titulo: 'Plantillas',
            descripcion: 'Gestiona plantillas institucionales, de WhatsApp y de notificaciones',
            claseIcono: 'plantillas',
            iconoArbol: '📃',
            alt: 'Plantillas',
            imagen: 'assets/images/plantillas.png',
            permisos: ['admin.plantillas', 'admin.plantillas_notificaciones', 'admin.plantillas_whatsapp'],
            keywords: ['contratos', 'minutas', 'mensajes', 'correos', 'textos'],
            opciones: [
              { id: 'plantillas-institucionales', label: 'Institucionales', alt: 'Institucionales', imagen: 'assets/images/plantillas_institucionales.png', iconoArbol: '📃', ruta: '/administracion/datos-maestros/plantillas', permiso: 'admin.plantillas', keywords: ['contratos', 'minutas', 'documentos'] },
              { id: 'plantillas-whatsapp', label: 'WhatsApp', alt: 'WhatsApp', imagen: 'assets/images/plantillas_whatsapp.png', iconoArbol: '💬', ruta: '/administracion/datos-maestros/plantillas-whatsapp', permiso: 'admin.plantillas_whatsapp', keywords: ['mensajes', 'recordatorios', 'wa'] },
              { id: 'plantillas-notificaciones', label: 'Notificaciones', alt: 'Plantillas de Notificaciones', imagen: 'assets/images/plantillas_notificaciones.png', iconoArbol: '📢', ruta: '/administracion/datos-maestros/plantillas-notificaciones', permiso: 'admin.plantillas_notificaciones', keywords: ['plantillas', 'notificaciones', 'avisos', 'circulares', 'textos'] }
            ]
          },
          {
            id: 'configuracion',
            titulo: 'Configuración',
            descripcion: 'Gestiona parámetros globales del sistema',
            claseIcono: 'configuracion',
            iconoArbol: '⚙️',
            alt: 'Configuración',
            imagen: 'assets/images/configuracion.png',
            permisos: ['admin.cargos', 'admin.categorias_documentos', 'admin.conectar_whatsapp', 'admin.configuracion_geofence', 'admin.configuracion_global', 'admin.configuracion_google', 'admin.configuracion_ia', 'admin.datos_estudiantes', 'admin.institucion', 'admin.jornada_laboral', 'admin.tipos_documentos'],
            keywords: ['parametros', 'ajustes', 'setup'],
            opciones: [
              { id: 'configuracion-global', label: 'Configuración Global', alt: 'Configuración Global', imagen: 'assets/images/configuracion.png', iconoArbol: '⚙️', ruta: '/administracion/datos-maestros/configuracion-global', permiso: 'admin.configuracion_global', keywords: ['parametros', 'ajustes'] },
              { id: 'jornada-laboral', label: 'Jornada Laboral', alt: 'Jornada Laboral', imagen: 'assets/images/jornada-laboral.png', iconoArbol: '⏰', ruta: '/administracion/datos-maestros/jornada-laboral', permiso: 'admin.jornada_laboral', keywords: ['jornada', 'horario del jardin', 'hora de entrada', 'hora de salida', 'apertura', 'cierre'] },
              { id: 'cargos', label: 'Cargos', alt: 'Cargos', imagen: 'assets/images/cargos.png', iconoArbol: '💼', ruta: '/administracion/datos-maestros/cargos', permiso: 'admin.cargos', keywords: ['puestos', 'colaboradores'] },
              { id: 'tipos-documentos', label: 'Tipos de Documentos', alt: 'Tipos de Documentos', imagen: 'assets/images/tipos-documentos.png', iconoArbol: '📄', ruta: '/administracion/datos-maestros/tipos-documentos', permiso: 'admin.tipos_documentos', keywords: ['documentos', 'papeles', 'requisitos'] },
              { id: 'categorias-documentos', label: 'Categorías de Documentos', alt: 'Categorías de Documentos', imagen: 'assets/images/categorias-documentos.png', iconoArbol: '🗂️', ruta: '/administracion/datos-maestros/categorias-documentos', permiso: 'admin.categorias_documentos', keywords: ['categorias', 'carpetas', 'clasificacion', 'organizar documentos'] },
              { id: 'configuracion-ia', label: 'Configuración IA', alt: 'Configuración IA', imagen: 'assets/images/configuracion-ia.png', iconoArbol: '🤖', ruta: '/administracion/datos-maestros/configuracion-ia', permiso: 'admin.configuracion_ia', keywords: ['ia', 'inteligencia artificial', 'proveedores'] },
              { id: 'configuracion-google', label: 'Google', alt: 'Google Calendar', imagen: 'assets/images/google.png', iconoArbol: '📅', ruta: '/administracion/datos-maestros/configuracion-google', permiso: 'admin.configuracion_google', keywords: ['google', 'calendar', 'calendario', 'correo'] },
              { id: 'configuracion-geofence', label: 'Zona de asistencia', alt: 'Polígono de la Institución', imagen: 'assets/images/geofence.png', iconoArbol: '📍', ruta: '/administracion/datos-maestros/configuracion-geofence', permiso: 'admin.configuracion_geofence', keywords: ['ubicacion', 'zonas', 'gps', 'geofence', 'geocerca', 'mapa', 'poligono', 'perimetro', 'linderos', 'marcacion', 'coordenadas'] },
              { id: 'datos-estudiantes', label: 'Datos Estudiantes', alt: 'Datos Estudiantes', imagen: 'assets/images/estudiantes.png', iconoArbol: '🎓', ruta: '/administracion/datos-maestros/datos-estudiantes', permiso: 'admin.datos_estudiantes', keywords: ['medicos', 'adicionales', 'campos', 'ficha'] },
              { id: 'institucion', label: 'Institución', alt: 'Institución', imagen: 'assets/images/institucion.png', iconoArbol: '🏫', ruta: '/administracion/datos-maestros/institucion', permiso: 'admin.institucion', keywords: ['jardin', 'colegio', 'datos basicos', 'logo', 'documentos institucionales', 'plan de emergencia'] },
              { id: 'conectar-whatsapp', label: 'Conexión WhatsApp', alt: 'Conexión WhatsApp', imagen: 'assets/images/whatsapp.png', iconoArbol: '🔌', ruta: '/administracion/datos-maestros/conectar-whatsapp', permiso: 'admin.conectar_whatsapp', keywords: ['whatsapp', 'wa', 'conectar', 'qr'] }
            ]
          },
          {
            id: 'seguridad',
            titulo: 'Seguridad',
            descripcion: 'Gestiona usuarios, roles y permisos',
            claseIcono: 'seguridad',
            iconoArbol: '🔐',
            alt: 'Seguridad',
            imagen: 'assets/images/seguridad.png',
            permisos: ['admin.documentacion', 'admin.permisos_rol', 'admin.usuarios', 'admin.roles', 'admin.usuarios_x_rol'],
            keywords: ['accesos', 'claves', 'perfiles', 'roles'],
            opciones: [
              { id: 'usuarios', label: 'Usuarios', alt: 'Usuarios', imagen: 'assets/images/usuarios.png', iconoArbol: '👤', ruta: '/administracion/datos-maestros/usuarios', permiso: 'admin.usuarios', keywords: ['cuentas', 'accesos', 'login', 'claves'] },
              { id: 'roles', label: 'Roles', alt: 'Roles', imagen: 'assets/images/roles.png', iconoArbol: '🎭', ruta: '/administracion/datos-maestros/roles', permiso: 'admin.roles', keywords: ['perfiles', 'cargos de sistema'] },
              { id: 'usuarios-x-rol', label: 'Usuarios por Rol', alt: 'Usuarios por Rol', imagen: 'assets/images/roles.png', iconoArbol: '👥', ruta: '/administracion/datos-maestros/usuarios-x-rol', permiso: 'admin.usuarios_x_rol', keywords: ['asignar usuarios', 'asignacion masiva'] },
              { id: 'permisos', label: 'Permisos por Rol', alt: 'Permisos', imagen: 'assets/images/permisos.png', iconoArbol: '🔐', ruta: '/administracion/datos-maestros/permisos', permiso: 'admin.permisos_rol', keywords: ['roles', 'permisos', 'accesos', 'opciones'] },
              { id: 'documentacion-sistema', label: 'Documentación', alt: 'Documentación', imagen: 'assets/images/documentacion_configuracion.png', iconoArbol: '📖', ruta: '/administracion/datos-maestros/documentacion-sistema', permiso: 'admin.documentacion', keywords: ['ayuda', 'manual', 'opciones del sistema'] }
            ]
          }
        ]
      },
      {
        id: 'financiero',
        label: 'Módulo Financiero',
        iconoArbol: '💵',
        imagen: '/assets/images/finanzas.png',
        descripcion: 'Gestiona ingresos, egresos y reportes financieros',
        claseIcono: 'financiero',
        textoAccion: 'Administrar',
        raiz: false,
        permiso: 'administracion.financiero',
        ruta: '/administracion/financiero',
        rutaLabel: 'Módulo Financiero',
        rutaPermiso: 'administracion.financiero',
        keywords: ['dinero', 'plata', 'finanzas'],
        grupos: [
          {
            id: 'ingresos-egresos',
            titulo: 'Ingresos y Egresos',
            descripcion: 'Gestiona y aprueba movimientos financieros',
            claseIcono: 'ingresos-egresos',
            iconoArbol: '💸',
            alt: 'Ingresos y Egresos',
            imagen: 'assets/images/ingresos-egresos.png',
            keywords: ['caja', 'gastos', 'dinero', 'plata'],
            opciones: [
              { id: 'movimientos', label: 'Gestión Ingresos y Egresos', alt: 'Gestión Movimientos', imagen: 'assets/images/finanzas.png', iconoArbol: '💸', ruta: '/administracion/financiero/movimientos-financieros', permiso: 'admin.movimientos_financieros', keywords: ['ingresos', 'egresos', 'gastos', 'caja', 'movimientos'] },
              { id: 'aprobacion-multiple', label: 'Aprobación Ingresos y Egresos', alt: 'Aprobación', imagen: 'assets/images/aprobar.png', iconoArbol: '✅', ruta: '/administracion/financiero/aprobacion-multiple', permiso: 'admin.aprobacion_multiple', keywords: ['aprobar', 'autorizar', 'movimientos'] }
            ]
          },
          {
            id: 'pagos-institucionales',
            titulo: 'Pagos Institucionales',
            descripcion: 'Registro rápido y contabilización de pagos',
            claseIcono: 'pagos-institucionales',
            iconoArbol: '🧾',
            alt: 'Pagos Institucionales',
            imagen: 'assets/images/pagos-institucionales.png',
            keywords: ['recaudo', 'cobros', 'cartera'],
            opciones: [
              { id: 'registro-pagos-rapido', label: 'Registro Rápido de Pagos', alt: 'Registro Rápido', imagen: 'assets/images/registro-pagos-rapido.png', iconoArbol: '⚡', ruta: '/administracion/financiero/registro-pagos-rapido', permiso: 'admin.registro_pagos_rapido', keywords: ['recaudo', 'pagos', 'abonos', 'masivo'] },
              { id: 'registro-pago-simple', label: 'Pago Rápido de un Estudiante', alt: 'Pago Rápido Estudiante', imagen: 'assets/images/registro-pago-simple.png', iconoArbol: '💵', ruta: '/administracion/financiero/registro-pago-simple', permiso: 'admin.registro_pago_simple', keywords: ['pago', 'abono', 'comprobante', 'recaudo', 'un estudiante', 'foto', 'whatsapp'] },
              { id: 'registro-cobros-rapido', label: 'Registro Rápido de Cobros', alt: 'Registro Rápido de Cobros', imagen: 'assets/images/registro-cobros-rapido.png', iconoArbol: '🧾', ruta: '/administracion/financiero/registro-cobros-rapido', permiso: 'admin.registro_cobros_rapido', keywords: ['cobros', 'cuentas por cobrar', 'generar cuentas', 'facturar', 'masivo', 'pensiones', 'matriculas', 'cartera'] },
              { id: 'anulacion-masiva-cobros', label: 'Anulación Masiva de Cobros', alt: 'Anulación Masiva de Cobros', imagen: 'assets/images/anulacion-masiva-cobros.png', iconoArbol: '🚫', ruta: '/administracion/financiero/anulacion-masiva-cobros', permiso: 'admin.anulacion_masiva_cobros', keywords: ['anular', 'borrar cobros', 'cancelar cuentas', 'cuentas por cobrar', 'masivo', 'corregir cobros', 'cartera'] },
              { id: 'contabilizar-pagos', label: 'Contabilización de Pagos', alt: 'Contabilizar', imagen: 'assets/images/contabilizar.png', iconoArbol: '🧮', ruta: '/administracion/financiero/contabilizacion-multiple', permiso: 'admin.contabilizacion_multiple', keywords: ['contabilizar', 'contabilidad', 'conciliacion'] }
            ]
          },
          {
            id: 'cobros-automaticos',
            titulo: 'Cobros Automáticos',
            descripcion: 'Configura convenios y reglas de cobro automático por asistencia',
            claseIcono: 'cobros-automaticos',
            iconoArbol: '⚡',
            alt: 'Cobros Automáticos',
            imagen: 'assets/images/productos.png',
            estilo: { '--color-principal': '#e65100', '--color-secundario': '#ff9800' },
            keywords: ['reglas', 'convenios', 'mora', 'hora extra'],
            opciones: [
              { id: 'convenios', label: 'Convenios', alt: 'Convenios', imagen: 'assets/images/contratos.png', iconoArbol: '📝', ruta: '/administracion/financiero/convenios', permiso: 'admin.convenios', keywords: ['acuerdos', 'descuentos', 'tarifas'] },
              { id: 'reglas-cobro', label: 'Reglas de Cobro', alt: 'Reglas de Cobro', imagen: 'assets/images/productos.png', iconoArbol: '⚡', ruta: '/administracion/financiero/reglas-cobro-automatico', permiso: 'admin.reglas_cobro_automatico', keywords: ['cobro automatico', 'hora extra', 'asistencia', 'facturacion'] },
              { id: 'mora-configuracion', label: 'Registro Rápido de Mora', alt: 'Registro Rápido de Mora', imagen: 'assets/images/productos.png', iconoArbol: '⏰', ruta: '/administracion/financiero/mora-configuracion', permiso: 'admin.mora_configuracion', keywords: ['mora', 'interes', 'intereses', 'multa', 'recargo', 'sancion', 'cartera vencida', 'tasa', 'atraso', 'moroso', 'masivo'] },
              { id: 'mora-exenciones', label: 'Registro Rápido de Exenciones', alt: 'Registro Rápido de Exenciones', imagen: 'assets/images/productos.png', iconoArbol: '🛡️', ruta: '/administracion/financiero/mora-exenciones', permiso: 'admin.mora_exenciones', keywords: ['mora', 'intereses', 'exencion', 'exonerar', 'perdonar', 'condonar', 'no cobrar', 'acuerdo de pago', 'masivo'] },
              { id: 'mora-ejecuciones', label: 'Proceso de Mora', alt: 'Proceso de Mora', imagen: 'assets/images/productos.png', iconoArbol: '⚙️', ruta: '/administracion/financiero/mora-ejecuciones', permiso: 'admin.mora_ejecuciones', keywords: ['mora', 'intereses', 'proceso', 'liquidacion', 'cron', 'calculo', 'ejecuciones', 'automatico'] }
            ]
          }
        ]
      }
    ];
  }

  /**
   * Devuelve la definición de un módulo por su id.
   */
  getModulo(id: string): ModuloMenu | undefined {
    return this.getModulos().find((modulo) => modulo.id === id);
  }

  /**
   * Devuelve las tarjetas de un módulo. Es lo que consumen las pantallas.
   */
  getGrupos(idModulo: string): GrupoMenuModulo[] {
    return this.getModulo(idModulo)?.grupos ?? [];
  }

  // Accesos por módulo: se conservan para no cambiar la forma en que
  // las pantallas piden sus tarjetas.
  getOperaciones(): GrupoMenuModulo[] { return this.getGrupos('operaciones'); }
  getReportes(): GrupoMenuModulo[] { return this.getGrupos('reportes'); }
  getAcademico(): GrupoMenuModulo[] { return this.getGrupos('academico'); }
  getDatosMaestros(): GrupoMenuModulo[] { return this.getGrupos('datos-maestros'); }
  getFinanciero(): GrupoMenuModulo[] { return this.getGrupos('financiero'); }
  getGestionEstudiantes(): GrupoMenuModulo[] { return this.getGrupos('estudiantes'); }
  getGestionColaboradores(): GrupoMenuModulo[] { return this.getGrupos('colaboradores'); }

  /**
   * Devuelve las tarjetas simples de una pantalla que no tiene submenús: primero los
   * módulos que cuelgan de ella y después sus opciones sueltas. Las keywords de cada
   * tarjeta incluyen lo que hay dentro de esa pantalla.
   */
  getTarjetas(idModulo: string): TarjetaModulo[] {
    const modulo = this.getModulo(idModulo);
    if (!modulo) {
      return [];
    }

    const tarjetas: TarjetaModulo[] = [];

    for (const idSubmodulo of modulo.submodulos ?? []) {
      const submodulo = this.getModulo(idSubmodulo);
      if (!submodulo) {
        continue;
      }
      tarjetas.push({
        id: submodulo.idTarjeta || submodulo.id,
        titulo: submodulo.rutaLabel || submodulo.label,
        descripcion: submodulo.descripcion ?? '',
        imagen: submodulo.imagen,
        claseIcono: submodulo.claseIcono ?? submodulo.id,
        textoAccion: submodulo.textoAccion ?? 'Administrar',
        permiso: submodulo.permiso,
        keywords: [...(submodulo.keywords ?? []), ...this.terminosInternos(submodulo)]
      });
    }

    for (const opcion of modulo.opciones ?? []) {
      tarjetas.push({
        id: opcion.id,
        titulo: opcion.label,
        descripcion: opcion.descripcion ?? '',
        imagen: opcion.imagen,
        claseIcono: opcion.claseIcono ?? opcion.id,
        textoAccion: opcion.textoAccion ?? 'Administrar',
        permiso: opcion.permiso,
        keywords: [...(opcion.keywords ?? [])]
      });
    }

    return tarjetas;
  }

  /**
   * Recorre las tarjetas y opciones de un módulo y devuelve sus textos, para que
   * buscando "mora" o "usuarios" en Administración aparezca el módulo que las contiene.
   */
  private terminosInternos(modulo: ModuloMenu): string[] {
    const terminos: string[] = [];

    const recorrerOpcion = (opcion: OpcionMenuModulo): void => {
      terminos.push(opcion.label);
      terminos.push(...(opcion.keywords ?? []));
      for (const hijo of opcion.hijos ?? []) {
        recorrerOpcion(hijo);
      }
    };

    for (const grupo of modulo.grupos) {
      terminos.push(grupo.titulo);
      terminos.push(...(grupo.keywords ?? []));
      grupo.opciones.forEach(recorrerOpcion);
    }

    (modulo.opciones ?? []).forEach(recorrerOpcion);

    return terminos;
  }

  // ============================================
  // FILTRADO
  // ============================================

  /**
   * Devuelve una copia de los grupos visibles según permisos.
   * Reglas: el grupo se conserva si no declara `permisos` o si el usuario tiene alguno
   * (equivale al `tieneAlguno` que ya usaban los componentes); dentro del grupo se
   * conservan las opciones sin permiso y aquellas cuyo permiso tiene el usuario.
   * Un grupo sin opciones visibles se conserva, igual que hoy, para no cambiar la pantalla.
   */
  filtrarPorPermiso(grupos: GrupoMenuModulo[]): GrupoMenuModulo[] {
    return grupos
      .filter((grupo) => !grupo.permisos || grupo.permisos.length === 0 || grupo.permisos.some((p) => this.permisosService.tienePermiso(p)))
      .map((grupo) => ({
        ...grupo,
        opciones: grupo.opciones.filter((opcion) => !opcion.permiso || this.permisosService.tienePermiso(opcion.permiso))
      }));
  }

  /**
   * Filtra los grupos por el término escrito. Si el grupo coincide por sí mismo
   * (título, descripción o keywords) se conserva completo; si no, se conserva solo
   * con las opciones que coinciden. El término se resalta en el título y en los labels.
   */
  filtrarPorTexto(grupos: GrupoMenuModulo[], termino: string): GrupoMenuModulo[] {
    const resultado: GrupoMenuModulo[] = [];

    for (const grupo of grupos) {
      const grupoCoincide = this.coincideGrupo(grupo, termino);
      const opciones = grupoCoincide
        ? grupo.opciones
        : grupo.opciones.filter((opcion) => this.coincideOpcion(opcion, termino));

      if (!grupoCoincide && opciones.length === 0) {
        continue;
      }

      resultado.push({
        ...grupo,
        tituloHtml: this.resaltar(grupo.titulo, termino),
        opciones: opciones.map((opcion) => ({ ...opcion, labelHtml: this.resaltar(opcion.label, termino) }))
      });
    }

    return resultado;
  }

  /**
   * Deja solo las tarjetas cuyo permiso tiene el usuario. Las que no declaran permiso
   * se muestran siempre.
   */
  filtrarTarjetasPorPermiso(tarjetas: TarjetaModulo[]): TarjetaModulo[] {
    return tarjetas.filter((tarjeta) => !tarjeta.permiso || this.permisosService.tienePermiso(tarjeta.permiso));
  }

  /**
   * Filtra las tarjetas simples por el término escrito, mirando también lo que hay
   * dentro de cada pantalla. Resalta el término en el título.
   */
  filtrarTarjetasPorTexto(tarjetas: TarjetaModulo[], termino: string): TarjetaModulo[] {
    const t = this.normalizar(termino);

    return tarjetas
      .filter((tarjeta) =>
        this.normalizar(tarjeta.titulo).includes(t) ||
        this.normalizar(tarjeta.descripcion).includes(t) ||
        tarjeta.keywords.some((k) => this.normalizar(k).includes(t)))
      .map((tarjeta) => ({ ...tarjeta, tituloHtml: this.resaltar(tarjeta.titulo, termino) }));
  }

  /**
   * Quita tildes y pasa a minúsculas para comparar de forma insensible a acentos.
   */
  private normalizar(texto: string): string {
    return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }

  /**
   * Igual que normalizar, pero carácter por carácter, de modo que la cadena resultante
   * conserva la longitud y las posiciones de la original.
   * Se usa en resaltar() para ubicar la coincidencia sobre el texto aunque tenga tildes.
   */
  private normalizarPosicional(texto: string): string {
    return Array.from(texto)
      .map((c) => c.normalize('NFD').replace(/[\u0300-\u036f]/g, '') || c)
      .join('')
      .toLowerCase();
  }

  private coincideGrupo(grupo: GrupoMenuModulo, termino: string): boolean {
    const t = this.normalizar(termino);
    if (this.normalizar(grupo.titulo).includes(t) || this.normalizar(grupo.descripcion).includes(t)) {
      return true;
    }
    return !!grupo.keywords && grupo.keywords.some((k) => this.normalizar(k).includes(t));
  }

  private coincideOpcion(opcion: OpcionMenuModulo, termino: string): boolean {
    const t = this.normalizar(termino);
    if (this.normalizar(opcion.label).includes(t)) {
      return true;
    }
    if (opcion.alt && this.normalizar(opcion.alt).includes(t)) {
      return true;
    }
    return !!opcion.keywords && opcion.keywords.some((k) => this.normalizar(k).includes(t));
  }

  /**
   * Envuelve la coincidencia en <mark>. Los textos del menú son estáticos,
   * por eso es seguro renderizar el HTML resultante.
   * El estilo va en línea (mismo dorado del menú principal) para no depender
   * del SCSS de ningún componente.
   */
  private resaltar(texto: string, termino: string): SafeHtml | string {
    const buscado = termino.trim();
    if (buscado.length === 0) {
      return texto;
    }

    const indice = this.normalizarPosicional(texto).indexOf(this.normalizarPosicional(buscado));
    if (indice < 0) {
      return texto;
    }

    const antes = texto.substring(0, indice);
    const match = texto.substring(indice, indice + buscado.length);
    const despues = texto.substring(indice + buscado.length);
    return this.sanitizer.bypassSecurityTrustHtml(
      `${antes}<mark style="background:#FFC107;color:#1A1A1A;border-radius:3px;padding:0 2px;font-weight:700;">${match}</mark>${despues}`
    );
  }
}