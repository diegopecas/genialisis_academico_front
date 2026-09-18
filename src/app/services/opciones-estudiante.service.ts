import { Injectable } from '@angular/core';

/**
 * Una opción de la ficha del estudiante.
 * `permiso` en null significa visible para todos; `ruta` en null significa que
 * es una acción en sitio (el cambio de grupo) y no se puede enlazar desde fuera.
 */
export interface OpcionEstudiante {
  id: string;
  label: string;
  icono: string;
  categoria: string;
  permiso: string | null;
  ruta: string | null;
}

/**
 * Catálogo de las opciones de la ficha del estudiante, del colaborador y de
 * las secciones del formulario del acudiente.
 *
 * Vive aparte porque lo usan dos pantallas: la ficha misma y el buscador del
 * menú, que muestra estas opciones debajo de cada persona encontrada. Tenerlo
 * duplicado haría que una opción nueva apareciera en un lado y en el otro no.
 */
@Injectable({
  providedIn: 'root',
})
export class OpcionesEstudianteService {

  private opciones: OpcionEstudiante[] = [
    { id: 'vista_360', label: 'Vista 360', icono: '/assets/images/vista_360.png', categoria: 'Información', permiso: 'estudiantes.vista_360', ruta: '/estudiantes/vista/' },
    { id: 'registro_acudientes', label: 'Acudientes', icono: '/assets/images/familia.png', categoria: 'Información', permiso: 'estudiantes.acudientes', ruta: '/estudiantes/acudientes/' },
    { id: 'registro_medidas', label: 'Medidas', icono: '/assets/images/medidas.png', categoria: 'Información', permiso: 'estudiantes.medidas', ruta: '/estudiantes/medidas/' },
    { id: 'observaciones', label: 'Observaciones', icono: '/assets/images/observaciones.png', categoria: 'Información', permiso: 'estudiantes.observaciones', ruta: '/estudiantes/observaciones/' },
    { id: 'informes', label: 'Informes', icono: '/assets/images/informes-estudiante.png', categoria: 'Información', permiso: 'estudiantes.informes', ruta: '/estudiantes/informes/' },
    { id: 'estado_cuenta', label: 'Estado de Cuenta', icono: '/assets/images/estado-cuenta.png', categoria: 'Servicios y cobros', permiso: 'estudiantes.estado_cuenta', ruta: '/estudiantes/estado-cuenta/' },
    { id: 'pagos', label: 'Pagos', icono: '/assets/images/pagos.png', categoria: 'Servicios y cobros', permiso: 'estudiantes.pagos', ruta: '/estudiantes/pagos/' },
    { id: 'productos_servicios', label: 'Productos', icono: '/assets/images/productos.png', categoria: 'Servicios y cobros', permiso: 'estudiantes.productos_servicios', ruta: '/estudiantes/productos-servicios/' },
    { id: 'contratos', label: 'Contratos', icono: '/assets/images/contratos.png', categoria: 'Servicios y cobros', permiso: 'estudiantes.contratos', ruta: '/estudiantes/contratos/' },
    { id: 'cursos_extra', label: 'Cursos Extra', icono: '/assets/images/cursos-extra.png', categoria: 'Servicios y cobros', permiso: null, ruta: '/estudiantes/cursos-extra/' },
    { id: 'onces', label: 'Onces', icono: '/assets/images/onces.png', categoria: 'Servicios y cobros', permiso: 'estudiantes.onces', ruta: '/estudiantes/onces/' },
    { id: 'certificados', label: 'Certificados', icono: '/assets/images/certificados.png', categoria: 'Servicios y cobros', permiso: 'estudiantes.certificados', ruta: '/estudiantes/certificados/' },
    { id: 'acudiente_pagos', label: 'Acudiente de Pagos', icono: '/assets/images/acudiente-pagos.png', categoria: 'Servicios y cobros', permiso: 'estudiantes.acudiente_pagos', ruta: '/estudiantes/acudiente-pagos/' },
    { id: 'editar', label: 'Editar', icono: '/assets/images/editar.png', categoria: 'Gestión', permiso: 'estudiantes.administrar', ruta: 'estudiantes/editar/' },
    { id: 'cambiar_grupo', label: 'Cambio Grupo', icono: '/assets/images/cambio_grupo.png', categoria: 'Gestión', permiso: 'estudiantes.cambio_grupo', ruta: null },
  ];

  /** Orden de presentación de las categorías */
  private ordenCategorias = ['Información', 'Servicios y cobros', 'Gestión'];

  getOpciones(): OpcionEstudiante[] {
    return this.opciones;
  }

  getOrdenCategorias(): string[] {
    return this.ordenCategorias;
  }

  /**
   * Opciones enlazables desde fuera de la ficha: las que tienen ruta. El cambio
   * de grupo se queda por fuera porque abre un modal dentro de la pantalla.
   */
  getOpcionesNavegables(): OpcionEstudiante[] {
    return this.opciones.filter(opcion => !!opcion.ruta);
  }

  // -----------------------------------------------------------------
  // Colaborador
  // -----------------------------------------------------------------

  private opcionesColaborador: OpcionEstudiante[] = [
    { id: 'asistencia', label: 'Asistencia', icono: '/assets/images/asistencia.png', categoria: 'Tiempo y asistencia', permiso: null, ruta: '/colaboradores/asistencia/' },
    { id: 'gestion_tiempo', label: 'Gestión Tiempo', icono: '/assets/images/tiempo.png', categoria: 'Tiempo y asistencia', permiso: null, ruta: '/colaboradores/gestion-tiempo/' },
    { id: 'productos_servicios', label: 'Productos/Servicios', icono: '/assets/images/productos.png', categoria: 'Servicios y cobros', permiso: null, ruta: '/colaboradores/productos-servicios/' },
    { id: 'pagos_recibidos', label: 'Pagos Recibidos', icono: '/assets/images/pagos.png', categoria: 'Servicios y cobros', permiso: null, ruta: '/colaboradores/pagos-recibidos/' },
    { id: 'prestamos', label: 'Préstamos', icono: '/assets/images/prestamos.png', categoria: 'Servicios y cobros', permiso: null, ruta: '/colaboradores/prestamos/' },
    { id: 'contratos', label: 'Contratos', icono: '/assets/images/contratos.png', categoria: 'Servicios y cobros', permiso: 'colaboradores.contratos', ruta: '/colaboradores/contratos/' },
    { id: 'editar', label: 'Editar', icono: '/assets/images/editar.png', categoria: 'Gestión', permiso: null, ruta: '/colaboradores/editar/' },
    { id: 'eliminar', label: 'Eliminar', icono: '/assets/images/eliminar.png', categoria: 'Gestión', permiso: null, ruta: null },
  ];

  private ordenCategoriasColaborador = ['Tiempo y asistencia', 'Servicios y cobros', 'Gestión'];

  getOpcionesColaborador(): OpcionEstudiante[] {
    return this.opcionesColaborador;
  }

  getOrdenCategoriasColaborador(): string[] {
    return this.ordenCategoriasColaborador;
  }

  getOpcionesColaboradorNavegables(): OpcionEstudiante[] {
    return this.opcionesColaborador.filter(opcion => !!opcion.ruta);
  }

  // -----------------------------------------------------------------
  // Secciones del formulario del acudiente
  //
  // No son pantallas aparte sino secciones del editor, asi que la ruta es la
  // misma y la seccion viaja como parametro de consulta.
  // -----------------------------------------------------------------

  private seccionesAcudiente = [
    { id: 'datos-personales', label: 'Datos Personales', icono: '/assets/images/editar.png' },
    { id: 'datos-acudiente', label: 'Información Acudiente', icono: '/assets/images/familia.png' },
    { id: 'documentos', label: 'Documentos', icono: '/assets/images/documentos.png' },
    { id: 'usuario', label: 'Usuario', icono: '/assets/images/usuario.png' },
  ];

  getSeccionesAcudiente(): { id: string; label: string; icono: string }[] {
    return this.seccionesAcudiente;
  }

  /**
   * Secciones del formulario del colaborador. Igual que las del acudiente, son
   * partes de la misma pantalla de edición.
   */
  private seccionesColaborador = [
    { id: 'datos-personales', label: 'Datos Personales', icono: '/assets/images/editar.png' },
    { id: 'datos-colaborador', label: 'Info. Colaborador', icono: '/assets/images/colaboradores.png' },
    { id: 'documentos', label: 'Documentos', icono: '/assets/images/documentos.png' },
    { id: 'grupos', label: 'Grupos Asignados', icono: '/assets/images/grupos.png' },
    { id: 'areas', label: 'Áreas Académicas', icono: '/assets/images/areas.png' },
    { id: 'horarios', label: 'Horarios', icono: '/assets/images/tiempo.png' },
    { id: 'usuario', label: 'Usuario', icono: '/assets/images/usuario.png' },
  ];

  getSeccionesColaborador(): { id: string; label: string; icono: string }[] {
    return this.seccionesColaborador;
  }
}
