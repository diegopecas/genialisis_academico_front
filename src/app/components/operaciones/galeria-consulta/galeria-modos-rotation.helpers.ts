/**
 * Helpers compartidos para aplicar rotación visual a imágenes en los modos.
 * El Map<guid, ángulo> viene del componente padre.
 */

/**
 * Devuelve la rotación de una imagen específica (0 si no está en el map).
 */
export function obtenerRotacion(rotaciones: Map<string, number>, guid: string): number {
  return rotaciones.get(guid) || 0;
}

/**
 * Devuelve el style CSS para aplicar la rotación. Escala al 75% cuando es 90°/270°
 * para que la imagen rotada quepa dentro del contenedor sin recortes severos.
 */
export function obtenerEstiloRotacion(rotaciones: Map<string, number>, guid: string): { [k: string]: string } {
  const angulo = obtenerRotacion(rotaciones, guid);
  if (angulo === 0) return {};
  const escala = (angulo === 90 || angulo === 270) ? 0.75 : 1;
  return {
    transform: `rotate(${angulo}deg) scale(${escala})`,
    transition: 'transform 0.4s ease',
  };
}
