/**
 * Tipos e interfaces del sistema de modos de galería.
 * Cada modo es un componente standalone que recibe las imágenes y emite eventos.
 */

export interface GalleryImage {
  id: string;
  guid: string;
  url: string;
  urlMedium: string;
  originalUrl: string;
  alt: string;
  loaded?: boolean;
}

/**
 * Configuración de un modo. Cada modo se registra con su id, nombre interno
 * y si requiere todas las imágenes (desactiva scroll infinito) o trabaja con paginación.
 */
export interface GaleriaModoConfig {
  id: number;
  nombreInterno: string;
  requiereTodasLasImagenes: boolean;
}

/**
 * Catálogo de los 30 modos. El orden aquí es el orden "canónico";
 * el shuffle determinístico por año reordena cómo se asignan a los días.
 */
export const MODOS_CATALOGO: GaleriaModoConfig[] = [
  { id: 1,  nombreInterno: 'masonry-clasico',     requiereTodasLasImagenes: false },
  { id: 2,  nombreInterno: 'polaroid',            requiereTodasLasImagenes: false },
  { id: 3,  nombreInterno: 'mosaico-pinterest',   requiereTodasLasImagenes: false },
  { id: 4,  nombreInterno: 'tira-pelicula',       requiereTodasLasImagenes: true  },
  { id: 5,  nombreInterno: 'cards-3d-flip',       requiereTodasLasImagenes: false },
  { id: 6,  nombreInterno: 'postal-viaje',        requiereTodasLasImagenes: false },
  { id: 7,  nombreInterno: 'storybook',           requiereTodasLasImagenes: true  },
  { id: 8,  nombreInterno: 'scrapbook',           requiereTodasLasImagenes: false },
  { id: 9,  nombreInterno: 'periodico-vintage',   requiereTodasLasImagenes: false },
  { id: 10, nombreInterno: 'cuaderno-escolar',    requiereTodasLasImagenes: false },
  { id: 11, nombreInterno: 'burbujas',            requiereTodasLasImagenes: true  },
  { id: 12, nombreInterno: 'confetti',            requiereTodasLasImagenes: true  },
  { id: 13, nombreInterno: 'origami',             requiereTodasLasImagenes: false },
  { id: 14, nombreInterno: 'lluvia-petalos',      requiereTodasLasImagenes: false },
  { id: 15, nombreInterno: 'globos',              requiereTodasLasImagenes: true  },
  { id: 16, nombreInterno: 'galeria-submarina',   requiereTodasLasImagenes: true  },
  { id: 17, nombreInterno: 'cielo-estrellado',    requiereTodasLasImagenes: true  },
  { id: 18, nombreInterno: 'caleidoscopio',       requiereTodasLasImagenes: false },
  { id: 19, nombreInterno: 'linterna-magica',     requiereTodasLasImagenes: false },
  { id: 20, nombreInterno: 'piano-fotos',         requiereTodasLasImagenes: true  },
  { id: 21, nombreInterno: 'vitral-geometrico',   requiereTodasLasImagenes: false },
  { id: 22, nombreInterno: 'tablon-corcho',       requiereTodasLasImagenes: false },
  { id: 23, nombreInterno: 'comic-clasico',       requiereTodasLasImagenes: false },
  { id: 24, nombreInterno: 'galeria-museo',       requiereTodasLasImagenes: false },
  { id: 25, nombreInterno: 'reloj-dia',           requiereTodasLasImagenes: true  },
  { id: 26, nombreInterno: 'pizarra-tiza',        requiereTodasLasImagenes: false },
  { id: 27, nombreInterno: 'cards-instagram',     requiereTodasLasImagenes: false },
  { id: 28, nombreInterno: 'mapa-tesoro',         requiereTodasLasImagenes: true  },
  { id: 29, nombreInterno: 'rompecabezas',        requiereTodasLasImagenes: true  },
  { id: 30, nombreInterno: 'historieta-gemini',   requiereTodasLasImagenes: true  },
];