/**
 * Manejo de fechas de Mi Agenda.
 *
 * Vive aparte porque lo necesitan tanto el componente padre (para saber en
 * qué día arranca y qué día consultar) como la cabecera (para pintar el
 * texto y mover el día). Tenerlo repetido en los dos era pedir que un día
 * se corrigiera en uno solo.
 *
 * Todo trabaja en Y-m-d y con el reloj local: nada de toISOString, que
 * convierte a UTC y en Colombia, después de las 7 p. m., devolvería el día
 * siguiente.
 */

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
               'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/** Pasa un Date a Y-m-d sin tocar la zona horaria. */
export function aTexto(d: Date): string {
  const mes = (d.getMonth() + 1).toString().padStart(2, '0');
  const dia = d.getDate().toString().padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
}

/** Hoy en Y-m-d según el reloj del dispositivo. */
export function hoyLocal(): string {
  return aTexto(new Date());
}

/** Suma (o resta, con negativos) días a una fecha en Y-m-d. */
export function sumarDias(fecha: string, dias: number): string {
  const partes = fecha.split('-').map(Number);
  const d = new Date(partes[0], partes[1] - 1, partes[2]);
  d.setDate(d.getDate() + dias);
  return aTexto(d);
}

/** Texto tipo "jueves, 20 de agosto de 2026". */
export function fechaLegible(fecha: string): string {
  if (!fecha) return '';

  const partes = fecha.split('-').map(Number);
  const d = new Date(partes[0], partes[1] - 1, partes[2]);

  return `${DIAS[d.getDay()]}, ${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
}
