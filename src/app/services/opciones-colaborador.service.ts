import { Injectable } from '@angular/core';

/**
 * Una opción de la ficha del colaborador.
 * `permiso` en null significa visible para todos; `ruta` en null significa que
 * es una acción en sitio (eliminar) y no se puede enlazar desde fuera.
 */
export interface OpcionColaborador {
  id: string;
  label: string;
  icono: string;
  categoria: string;
  permiso: string | null;
  ruta: string | null;
}

/**
 * Catálogo de las opciones de la ficha del colaborador y de las secciones de
 * su formulario de edición.
 *
 * Vive aparte porque lo usan dos pantallas: la ficha (opciones del
 * colaborador) y el buscador del menú, que muestra estas opciones debajo de
 * cada persona encontrada. Una opción nueva se agrega solo aquí y sale en los
 * dos lados.
 */
@Injectable({
  providedIn: 'root',
})
export class OpcionesColaboradorService {

  private opciones: OpcionColaborador[] = [
    { id: 'asistencia', label: 'Asistencia', icono: '/assets/images/asistencia.png', categoria: 'Tiempo y asistencia', permiso: null, ruta: '/colaboradores/asistencia/' },
    { id: 'gestion_tiempo', label: 'Gestión Tiempo', icono: '/assets/images/tiempo.png', categoria: 'Tiempo y asistencia', permiso: null, ruta: '/colaboradores/gestion-tiempo/' },
    { id: 'productos_servicios', label: 'Productos/Servicios', icono: '/assets/images/productos.png', categoria: 'Servicios y cobros', permiso: null, ruta: '/colaboradores/productos-servicios/' },
    { id: 'pagos_recibidos', label: 'Pagos Recibidos', icono: '/assets/images/pagos.png', categoria: 'Servicios y cobros', permiso: null, ruta: '/colaboradores/pagos-recibidos/' },
    { id: 'prestamos', label: 'Préstamos', icono: '/assets/images/prestamos.png', categoria: 'Servicios y cobros', permiso: null, ruta: '/colaboradores/prestamos/' },
    { id: 'contratos', label: 'Contratos', icono: '/assets/images/contratos.png', categoria: 'Servicios y cobros', permiso: 'colaboradores.contratos', ruta: '/colaboradores/contratos/' },
    { id: 'editar', label: 'Editar', icono: '/assets/images/editar.png', categoria: 'Gestión', permiso: null, ruta: '/colaboradores/editar/' },
    { id: 'reportes_correo', label: 'Reportes por Correo', icono: '/assets/images/reportes-correo.png', categoria: 'Gestión', permiso: 'colaboradores.reportes_correo', ruta: '/colaboradores/reportes-correo/' },
    { id: 'eliminar', label: 'Eliminar', icono: '/assets/images/eliminar.png', categoria: 'Gestión', permiso: null, ruta: null },
  ];

  /** Orden de presentación de las categorías */
  private ordenCategorias = ['Tiempo y asistencia', 'Servicios y cobros', 'Gestión'];

  getOpciones(): OpcionColaborador[] {
    return this.opciones;
  }

  getOrdenCategorias(): string[] {
    return this.ordenCategorias;
  }

  /**
   * Opciones enlazables desde fuera de la ficha: las que tienen ruta. Eliminar
   * se queda por fuera porque se confirma dentro de la pantalla.
   */
  getOpcionesNavegables(): OpcionColaborador[] {
    return this.opciones.filter(opcion => !!opcion.ruta);
  }

  /**
   * Secciones del formulario del colaborador. No son pantallas aparte sino
   * partes de la misma pantalla de edición; la sección viaja como parámetro
   * de consulta.
   */
  private secciones = [
    { id: 'datos-personales', label: 'Datos Personales', icono: '/assets/images/editar.png' },
    { id: 'datos-colaborador', label: 'Info. Colaborador', icono: '/assets/images/colaboradores.png' },
    { id: 'documentos', label: 'Documentos', icono: '/assets/images/documentos.png' },
    { id: 'grupos', label: 'Grupos Asignados', icono: '/assets/images/grupos.png' },
    { id: 'areas', label: 'Áreas Académicas', icono: '/assets/images/areas.png' },
    { id: 'horarios', label: 'Horarios', icono: '/assets/images/tiempo.png' },
    { id: 'usuario', label: 'Usuario', icono: '/assets/images/usuario.png' },
  ];

  getSecciones(): { id: string; label: string; icono: string }[] {
    return this.secciones;
  }
}
