/**
 * Tipos del módulo Mi Agenda.
 *
 * La forma de EventoAgenda la define el backend (mi-agenda.service.php):
 * todas las fuentes devuelven exactamente estos campos, así que las vistas
 * no necesitan saber de qué módulo salió cada evento para pintarlo.
 *
 * Es la copia del portal de padres para el institucional. Difiere en tres
 * cosas: no hay enlaces "Ver más" hacia otras pantallas, los textos no le
 * hablan al papá y los eventos financieros pueden llegar recortados.
 */

/** Permiso para ver completos los pagos y cobros de la agenda. */
export const PERMISO_FINANZAS_AGENDA = 'operaciones.agenda_estudiantes.finanzas';

export interface EventoAgenda {
  /** Fuente de la que salió el evento: asistencia, actividades, pagos... */
  clave: string;
  /** Subtipo dentro de la fuente: ingreso, salida, mora... */
  tipo: string;
  id: string;
  /** Nulo cuando el evento es del día pero no tiene una hora confiable. */
  fecha_hora: string | null;
  /** HH:mm ya recortada por el backend. Nula si no hay fecha_hora. */
  hora: string | null;
  titulo: string;
  detalle: string | null;
  pie: string | null;
  etiqueta: string | null;
  valor: number | null;
  color: string;
  icono: string;
  nombre_fuente: string;
  /** Posición dentro del día para los eventos sin hora. */
  orden: number;
  meta: any;
}

/**
 * Calificación del estudiante en una actividad. La arma el backend en
 * desarmarCalificaciones() y viaja dentro de meta.calificaciones.
 */
export interface CalificacionAgenda {
  parametro: string;
  cualitativo: string;
  cuantitativo: number | null;
  icono: string;
}

/**
 * Calificaciones que trae un evento. Solo las actividades las mandan, pero
 * se lee de forma genérica: si mañana otra fuente las envía, se pinta igual.
 */
export function calificacionesDe(evento: EventoAgenda | null): CalificacionAgenda[] {
  return Array.isArray(evento?.meta?.calificaciones) ? evento!.meta.calificaciones : [];
}

/** Fotos que trae un evento de galería. El backend las manda en meta. */
export function fotosDe(evento: EventoAgenda | null): FotoAgenda[] {
  return Array.isArray(evento?.meta?.imagenes) ? evento!.meta.imagenes : [];
}

/**
 * Ítems sueltos del evento: los útiles que trajo, las medidas que le
 * tomaron. Cada fuente los mete en meta con la misma forma.
 */
export function itemsDe(evento: EventoAgenda | null): ItemAgenda[] {
  if (!evento?.meta) return [];

  if (Array.isArray(evento.meta.items)) return evento.meta.items;
  if (Array.isArray(evento.meta.no_regresaron)) return evento.meta.no_regresaron;

  return [];
}

/** Un renglón dentro de la tarjeta: un útil, una medida. */
export interface ItemAgenda {
  nombre: string;
  observacion?: string | null;
  icono?: string | null;
}

/**
 * Pago o cobro que el backend recortó porque el usuario no tiene el permiso
 * de finanzas: llega solo el aviso de que hubo un movimiento, sin valor ni
 * nada que descargar, y se pinta tenue.
 */
export function estaRestringido(evento: EventoAgenda | null): boolean {
  return evento?.meta?.restringido === true;
}

/** Una observación con su rótulo, tal como se pinta en la tarjeta. */
export interface NotaAgenda {
  titulo: string;
  texto: string;
}

/**
 * Observaciones que la docente escribió sobre la actividad: una de la clase
 * entera y otra del estudiante. Van rotuladas y separadas de la descripción
 * de la actividad, que cuenta qué se hizo.
 */
export function notasDe(evento: EventoAgenda | null): NotaAgenda[] {
  const notas: NotaAgenda[] = [];

  const grupo = (evento?.meta?.observacion_grupo || '').trim();
  if (grupo) {
    notas.push({ titulo: 'Sobre la clase', texto: grupo });
  }

  const estudiante = (evento?.meta?.observacion_estudiante || '').trim();
  if (estudiante) {
    notas.push({ titulo: 'Sobre el estudiante', texto: estudiante });
  }

  return notas;
}

/** El evento trae fotos, que es lo único que ya no cabe en la tarjeta. */
export function tieneFotos(evento: EventoAgenda | null): boolean {
  return fotosDe(evento).length > 0;
}

/**
 * La actividad trae texto largo: la descripción de lo que se hizo y las
 * observaciones de la docente.
 *
 * En el camino y en las listas eso no cabe — una actividad con las dos
 * observaciones se come la pantalla entera y tapa el resto del día —, así
 * que la tarjeta se queda con lo corto (título, área, calificaciones y quién
 * la registró) y el texto se lee en el detalle. En el libro sí cabe: la hoja
 * está hecha para eso.
 */
export function esActividadExtensa(evento: EventoAgenda | null): boolean {
  if (evento?.clave !== 'actividades') {
    return false;
  }

  return !!(evento.detalle && evento.detalle.trim()) || notasDe(evento).length > 0;
}

/**
 * Descripción de una actividad con el HTML del editor (párrafos, negrillas,
 * listas). El backend solo la manda cuando de verdad trae etiquetas; en
 * evento.detalle va siempre la versión en texto plano, que es la que usan
 * el buscador y las demás reglas. Angular sanea el HTML al pintarlo.
 */
export function descripcionHtml(evento: EventoAgenda | null): string | null {
  if (evento?.clave !== 'actividades') return null;
  const html = evento?.meta?.descripcion_html;
  return typeof html === 'string' && html.trim() !== '' ? html : null;
}

/** El evento tiene algo más que mostrar al abrir el detalle. */
export function tieneDetalle(evento: EventoAgenda | null): boolean {
  return tieneFotos(evento) || esActividadExtensa(evento);
}

/** Imagen de una galería. El front arma la URL a partir del guid. */
export interface FotoAgenda {
  guid: string;
  alt: string;
  tipo_media: string;
}

export interface FuenteAgenda {
  clave: string;
  nombre: string;
  icono: string;
  color: string;
  orden: number;
  total: number;
}

export interface EstudianteAgenda {
  id: string;
  nombre_completo: string;
  id_grupo: string | null;
  nombre_grupo: string | null;
  foto: string | null;
}

export interface AgendaDia {
  id_estudiante: string;
  fecha: string;
  /** Fecha de ingreso del estudiante: tope inferior de la navegación. */
  fecha_minima: string;
  estudiante: EstudianteAgenda;
  eventos: EventoAgenda[];
  fuentes: FuenteAgenda[];
  fuentes_con_error: { clave: string; mensaje: string }[];
  total_eventos: number;
}

export type ModoVista = 'libro' | 'camino' | 'tabs';

export interface ModoVistaConfig {
  id: ModoVista;
  nombre: string;
  icono: string;
}

/** Vistas disponibles. El orden es el que se pinta en el selector. */
export const MODOS_VISTA: ModoVistaConfig[] = [
  { id: 'camino', nombre: 'Camino', icono: '🛤️' },
  { id: 'libro', nombre: 'Libro', icono: '📖' },
  { id: 'tabs', nombre: 'Listas', icono: '🗂️' },
];

/** Clave de localStorage donde se recuerda la vista escogida. */
export const CLAVE_MODO_VISTA = 'mi_agenda_modo_vista';
