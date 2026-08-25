// =====================================================================
// Colores de la grilla de horario · helper compartido
//
// Lo usan todas las pantallas que dibujan horarios. La idea del estilo es:
// el fondo del bloque va con un tinte casi imperceptible y lo que
// identifica el área es una barra lateral en color vivo.
//
// Muchos colores de área son pastel (amarillos, verdes menta) y en una
// barra delgada o en un fondo al 3% se pierden, así que antes de usarlos
// se les sube la saturación y se les baja el brillo.
// =====================================================================

export interface ColorHsl {
  matiz: number;
  saturacion: number;
  luz: number;
}

/** Convierte '#rrggbb' a [r, g, b]. Si no es válido devuelve un gris claro. */
export function colorRgb(color: string | null | undefined): number[] {
  const limpio = (color || '').replace('#', '').trim();
  if (limpio.length !== 6) return [208, 208, 208];

  const r = parseInt(limpio.substring(0, 2), 16);
  const g = parseInt(limpio.substring(2, 4), 16);
  const b = parseInt(limpio.substring(4, 6), 16);

  if (isNaN(r) || isNaN(g) || isNaN(b)) return [208, 208, 208];
  return [r, g, b];
}

/** Pasa un hex a HSL ya intensificado: saturación mínima 70%, brillo máximo 52%. */
export function aHslIntenso(color: string | null | undefined): ColorHsl | null {
  if (!color) return null;

  const [r, g, b] = colorRgb(color).map(c => c / 255);
  const maximo = Math.max(r, g, b);
  const minimo = Math.min(r, g, b);
  const luz = (maximo + minimo) / 2;

  let matiz = 0;
  let saturacion = 0;

  if (maximo !== minimo) {
    const delta = maximo - minimo;
    saturacion = luz > 0.5 ? delta / (2 - maximo - minimo) : delta / (maximo + minimo);

    if (maximo === r) {
      matiz = ((g - b) / delta) + (g < b ? 6 : 0);
    } else if (maximo === g) {
      matiz = ((b - r) / delta) + 2;
    } else {
      matiz = ((r - g) / delta) + 4;
    }
    matiz = matiz * 60;
  }

  // Un gris se deja como está; a lo demás se le sube el color
  return {
    matiz: Math.round(matiz),
    saturacion: Math.round(saturacion === 0 ? 0 : Math.min(Math.max(saturacion, 0.7), 1) * 100),
    luz: Math.round(saturacion === 0 ? luz * 100 : Math.min(luz, 0.52) * 100)
  };
}

/** Color intenso para la barra lateral del bloque. */
export function colorVivo(color: string | null | undefined): string {
  const hsl = aHslIntenso(color);
  if (!hsl) return '#b0b4ba';
  return `hsl(${hsl.matiz}, ${hsl.saturacion}%, ${hsl.luz}%)`;
}

/**
 * Fondo del bloque: un tono muy claro del color, pero OPACO. Tiene que tapar
 * las líneas de la media hora que cruzan la grilla; con un color translúcido
 * las líneas se ven por debajo y el bloque parece rayado.
 */
export function colorFondoBloque(color: string | null | undefined, luz: number = 97): string | null {
  const hsl = aHslIntenso(color);
  if (!hsl) return null;
  if (hsl.saturacion === 0) return '#fbfbfb';
  return `hsl(${hsl.matiz}, ${hsl.saturacion}%, ${luz}%)`;
}

/** Versión desaturada de un color, para fondos de encabezado. */
export function colorSuave(color: string | null | undefined, alpha: number = 0.16): string | null {
  if (!color) return null;
  const rgb = colorRgb(color);
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
}

/**
 * jsPDF no maneja transparencia en los rellenos, así que el tono suave se
 * calcula mezclando el color con blanco.
 */
export function mezclarSobreBlanco(rgb: number[], alpha: number): number[] {
  return rgb.map(canal => Math.round(255 + (canal - 255) * alpha));
}

/** Equivalente en rgb de colorVivo, para el PDF. */
export function intensificarRgb(rgb: number[]): number[] {
  const maximo = Math.max(...rgb);
  const minimo = Math.min(...rgb);

  // Gris: no hay color que intensificar
  if (maximo === minimo) return rgb;

  // Se estira el rango hacia el color puro y se oscurece un poco
  return rgb.map(canal => {
    const estirado = ((canal - minimo) / (maximo - minimo)) * 255;
    return Math.round(estirado * 0.82);
  });
}
