/**
 * Círculos del menú del dominio EDUCATIVO (producto GENIALISIS para jardines).
 * Las clases circle-N corresponden a las posiciones definidas en menu.component.scss.
 */
export interface MenuCirculo {
  ruta: string;
  label: string;
  imagen: string;
  clase: string;
  permiso?: string;
}

export const dominioMenuCirculos: MenuCirculo[] = [
  { ruta: '/estudiantes', label: 'Estudiantes', imagen: '/assets/images/estudiantes.png', clase: 'circle-1', permiso: 'estudiantes.listado' },
  { ruta: '/calificacion', label: 'Calificaciones', imagen: '/assets/images/reporte.png', clase: 'circle-2' },
  { ruta: '/asistencia', label: 'Asistencia', imagen: '/assets/images/asistencia.png', clase: 'circle-5' },
  { ruta: '/academico', label: 'Académico', imagen: '/assets/images/academico.png', clase: 'circle-8' }
];