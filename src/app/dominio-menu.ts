/**
 * Círculos del menú principal aportados por el dominio del producto.
 * En el NÚCLEO este arreglo permanece vacío.
 * Cada producto derivado (GENIALISIS, Psyncronia, ...) reemplaza este archivo
 * con sus propios círculos; menu.component los renderiza automáticamente.
 * No agregar círculos del núcleo aquí.
 */
export interface MenuCirculo {
  ruta: string;       // ruta de navegación, ej: '/estudiantes'
  label: string;      // texto visible, ej: 'Estudiantes'
  imagen: string;     // src de la imagen, ej: '/assets/images/estudiantes.png'
  clase: string;      // clase CSS de posición, ej: 'circle-1'
  permiso?: string;   // permiso requerido; si se omite, siempre visible
}

export const dominioMenuCirculos: MenuCirculo[] = [];