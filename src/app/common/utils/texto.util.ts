import { normalizarTexto } from '../pipes/search';

/**
 * Deja un texto listo para comparar en buscadores: sin tildes, en
 * minúsculas y sin signos (comas, guiones, paréntesis, comillas...), con los
 * espacios reducidos a uno. Así "Papel crepé (rojo)" se encuentra escribiendo
 * "papel crepe rojo".
 */
export function normalizarParaBusqueda(texto: any): string {
  return normalizarTexto(texto)
    .replace(/[^a-z0-9ñ\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** true si el contenido contiene la búsqueda, con las reglas de normalizarParaBusqueda. */
export function coincideBusqueda(contenido: any, busqueda: any): boolean {
  const termino = normalizarParaBusqueda(busqueda);
  if (!termino) return true;
  return normalizarParaBusqueda(contenido).includes(termino);
}

/**
 * Texto sin etiquetas de un HTML (por ejemplo la descripción de una
 * actividad escrita con el CKEditor). Decodifica también las entidades
 * como &nbsp; o &aacute;.
 */
export function textoPlano(html: any): string {
  if (html === null || html === undefined) return '';
  const doc = new DOMParser().parseFromString(String(html), 'text/html');
  return (doc.body.textContent || '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Versión liviana de textoPlano para buscadores que se evalúan en cada ciclo
 * de pantalla: solo quita las etiquetas con una expresión regular, sin
 * armar un documento. No decodifica entidades.
 */
export function quitarEtiquetas(html: any): string {
  if (html === null || html === undefined) return '';
  return String(html).replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ');
}

/** Texto sin etiquetas y recortado, con "..." si se pasa del máximo. */
export function textoPlanoRecortado(html: any, maximo: number): string {
  const texto = textoPlano(html);
  return texto.length > maximo ? texto.substring(0, maximo).trimEnd() + '...' : texto;
}
