import { Component, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import Swal from 'sweetalert2';
import { HeaderComponent } from '../../../../common/header/header.component';
import { TareasEstudiantesService } from '../../../../services/tareas-estudiantes.service';
import { TareasEstudiantesXEstudianteService } from '../../../../services/tareas-estudiantes-x-estudiante.service';
import { TareasEstudiantesPreguntasService } from '../../../../services/tareas-estudiantes-preguntas.service';

/**
 * Calificar una tarea y atender su foro.
 *
 * Calificar: una fila por niño. Todo se trabaja en memoria y nada va al
 * backend hasta pulsar Guardar, que envía en un solo arreglo las filas que
 * cambiaron (igual que la calificación de informes). La barra "Calificar a
 * todos" pone la misma valoración a todo el grupo; después se ajustan los
 * niños que se quiera.
 * Preguntas: hilos del foro; cualquiera con el permiso puede responder.
 */
@Component({
  selector: 'app-calificar-tarea-estudiante',
  templateUrl: './calificar-tarea-estudiante.component.html',
  styleUrl: './calificar-tarea-estudiante.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent]
})
export class CalificarTareaEstudianteComponent implements OnInit {

  titulo = 'Calificar Tarea';
  regresar = '/estudiantes/tareas';
  idTarea: any = null;
  cargando = true;
  guardando = false;

  public tarea: any = null;
  public estudiantes: any[] = [];
  public escala: any[] = [];
  public hilos: any[] = [];

  public pestana: 'estudiantes' | 'preguntas' = 'estudiantes';
  public filtroEstado = 'todos';
  public filtroTexto = '';

  /** Borradores de respuesta del foro, por hilo. */
  public respuestas: { [idPregunta: string]: string } = {};

  /**
   * Calificar a todos. Apagado solo llena a los que no tienen calificación
   * ni "no entregada"; prendido pisa a todos.
   */
  public sobrescribir = false;

  /** Copia del estado de trabajo antes de la última acción masiva. */
  private respaldo: any[] | null = null;
  public respaldoDescripcion = '';

  // Admite undefined para que el template maneje un estado desconocido sin romperse
  readonly ESTADOS: { [clave: string]: { texto: string, clase: string } | undefined } = {
    pendiente: { texto: 'Pendiente', clase: 'estado-pendiente' },
    enviada: { texto: 'Enviada', clase: 'estado-enviada' },
    no_entregada: { texto: 'No entregada', clase: 'estado-no-entregada' },
    calificada: { texto: 'Calificada', clase: 'estado-calificada' },
  };

  constructor(
    private tareasService: TareasEstudiantesService,
    private xEstudianteService: TareasEstudiantesXEstudianteService,
    private preguntasService: TareasEstudiantesPreguntasService,
    private route: ActivatedRoute,
  ) { }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.idTarea = params['id'];
      this.cargar();
    });
  }

  cargar() {
    this.cargando = true;
    forkJoin({
      tarea: this.tareasService.obtenerById(this.idTarea),
      estudiantes: this.tareasService.obtenerEstudiantes(this.idTarea),
      escala: this.xEstudianteService.obtenerEscala().pipe(catchError(() => of({ body: [] }))),
      preguntas: this.preguntasService.obtenerPorTarea(this.idTarea).pipe(catchError(() => of({ body: [] }))),
    }).subscribe({
      next: (r: any) => {
        this.tarea = r.tarea.body;
        this.titulo = 'Calificar: ' + (this.tarea?.titulo || '');
        this.escala = r.escala.body || [];
        this.asignarEstudiantes(r.estudiantes.body || []);
        this.hilos = r.preguntas.body || [];
        this.cargando = false;
      },
      error: () => { this.cargando = false; }
    });
  }

  /**
   * Cada fila guarda lo que vino del backend y aparte su estado de trabajo
   * (trabajo_*), que es lo que se edita en pantalla. Comparar los dos dice
   * qué cambió.
   */
  asignarEstudiantes(filas: any[]) {
    this.estudiantes = filas.map(f => ({
      ...f,
      trabajo_estado: f.estado,
      trabajo_id_valor: f.id_valor_parametro_calificacion || null,
      trabajo_observacion: f.observacion || '',
      observacion_abierta: false,
    }));
    this.respaldo = null;
    this.respaldoDescripcion = '';
  }

  recargarEstudiantes() {
    this.tareasService.obtenerEstudiantes(this.idTarea).subscribe((r: any) => this.asignarEstudiantes(r.body || []));
  }

  recargarPreguntas() {
    this.preguntasService.obtenerPorTarea(this.idTarea).subscribe((r: any) => this.hilos = r.body || []);
  }

  // ---------------------------------------------------------------------
  // Calificar
  // ---------------------------------------------------------------------

  get estudiantesVisibles(): any[] {
    const filtro = this.filtroTexto.trim().toLowerCase();
    return this.estudiantes.filter(e =>
      (this.filtroEstado === 'todos' || e.trabajo_estado === this.filtroEstado) &&
      (!filtro || (e.nombre_estudiante || '').toLowerCase().includes(filtro))
    );
  }

  contar(estado: string): number {
    return this.estudiantes.filter(e => e.trabajo_estado === estado).length;
  }

  /**
   * Estado al que vuelve una fila al quitarle la calificación: enviada si el
   * acudiente la marcó, si no pendiente.
   */
  estadoBase(fila: any): string {
    return fila.fecha_envio_acudiente ? 'enviada' : 'pendiente';
  }

  /** Tocar la valoración elegida la quita; tocar otra la cambia. */
  calificar(fila: any, valor: any) {
    if (fila.trabajo_estado === 'calificada' && fila.trabajo_id_valor === valor.id) {
      this.devolverPendiente(fila);
      return;
    }
    fila.trabajo_estado = 'calificada';
    fila.trabajo_id_valor = valor.id;
  }

  /** Alterna "no entregada" en la fila. */
  marcarNoEntregada(fila: any) {
    if (fila.trabajo_estado === 'no_entregada') {
      this.devolverPendiente(fila);
      return;
    }
    fila.trabajo_estado = 'no_entregada';
    fila.trabajo_id_valor = null;
  }

  devolverPendiente(fila: any) {
    fila.trabajo_estado = this.estadoBase(fila);
    fila.trabajo_id_valor = null;
  }

  valorElegido(fila: any, valor: any): boolean {
    return fila.trabajo_estado === 'calificada' && fila.trabajo_id_valor === valor.id;
  }

  alternarObservacion(fila: any) {
    fila.observacion_abierta = !fila.observacion_abierta;
  }

  // ---- Calificar a todos ----

  /** Pone la misma valoración a todos los niños de la tarea. */
  calificarTodos(valor: any) {
    this.guardarRespaldo('Calificar a todos: ' + valor.valor_cualitativo);
    this.estudiantes
      .filter(f => this.sobrescribir || !this.yaResuelta(f))
      .forEach(f => {
        f.trabajo_estado = 'calificada';
        f.trabajo_id_valor = valor.id;
      });
  }

  /** Marca a todos como no entregada. */
  noEntregadaTodos() {
    this.guardarRespaldo('Todos no entregada');
    this.estudiantes
      .filter(f => this.sobrescribir || !this.yaResuelta(f))
      .forEach(f => {
        f.trabajo_estado = 'no_entregada';
        f.trabajo_id_valor = null;
      });
  }

  /** Quita la calificación a todos (no toca las observaciones). */
  limpiarTodos() {
    this.guardarRespaldo('Limpiar todos');
    this.estudiantes.forEach(f => this.devolverPendiente(f));
  }

  /** Ya tiene calificación o "no entregada": sin sobrescribir no se toca. */
  private yaResuelta(fila: any): boolean {
    return fila.trabajo_estado === 'calificada' || fila.trabajo_estado === 'no_entregada';
  }

  private guardarRespaldo(descripcion: string) {
    this.respaldo = this.estudiantes.map(f => ({
      id: f.id,
      estado: f.trabajo_estado,
      id_valor: f.trabajo_id_valor,
    }));
    this.respaldoDescripcion = descripcion;
  }

  get hayDeshacer(): boolean {
    return this.respaldo !== null;
  }

  deshacer() {
    if (!this.respaldo) {
      return;
    }
    const porId = new Map<any, any>(this.respaldo.map(r => [r.id, r] as [any, any]));
    this.estudiantes.forEach(f => {
      const anterior = porId.get(f.id);
      if (anterior) {
        f.trabajo_estado = anterior.estado;
        f.trabajo_id_valor = anterior.id_valor;
      }
    });
    this.respaldo = null;
    this.respaldoDescripcion = '';
  }

  // ---- Cambios y guardado ----

  cambiada(fila: any): boolean {
    return fila.trabajo_estado !== fila.estado
      || (fila.trabajo_id_valor || null) !== (fila.id_valor_parametro_calificacion || null)
      || (fila.trabajo_observacion || '').trim() !== (fila.observacion || '').trim();
  }

  get totalCambios(): number {
    return this.estudiantes.filter(f => this.cambiada(f)).length;
  }

  /**
   * Recargar o cerrar la pestaña con cambios sin guardar: el navegador
   * muestra su propio aviso (el texto no se puede personalizar).
   */
  @HostListener('window:beforeunload', ['$event'])
  avisarAntesDeCerrar(evento: BeforeUnloadEvent) {
    if (!this.guardando && this.totalCambios > 0) {
      evento.preventDefault();
      evento.returnValue = '';
    }
  }

  async descartarCambios() {
    const result = await Swal.fire({
      title: '¿Descartar los cambios?',
      text: `Se pierden ${this.totalCambios} cambio(s) sin guardar.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, descartar',
      cancelButtonText: 'Cancelar'
    });
    if (result.isConfirmed) {
      // Volver a armar desde los datos originales deja el trabajo igual a lo guardado
      this.asignarEstudiantes(this.estudiantes);
    }
  }

  /** Envía en un solo arreglo las filas que cambiaron. */
  guardar() {
    const calificaciones = this.estudiantes
      .filter(f => this.cambiada(f))
      .map(f => ({
        id: f.id,
        estado: f.trabajo_estado,
        id_valor_parametro_calificacion: f.trabajo_estado === 'calificada' ? f.trabajo_id_valor : null,
        observacion: (f.trabajo_observacion || '').trim() || null,
      }));

    if (calificaciones.length === 0) {
      return;
    }

    this.guardando = true;
    this.xEstudianteService.calificarLote({
      id_tarea_estudiante: this.idTarea,
      calificaciones: calificaciones,
    }).subscribe({
      next: () => {
        this.guardando = false;
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: calificaciones.length === 1 ? 'Se guardó 1 calificación' : `Se guardaron ${calificaciones.length} calificaciones`,
          showConfirmButton: false,
          timer: 2500
        });
        this.recargarEstudiantes();
      },
      error: () => { this.guardando = false; }
    });
  }

  // ---------------------------------------------------------------------
  // Preguntas
  // ---------------------------------------------------------------------

  get totalPreguntas(): number {
    return this.hilos.length;
  }

  get sinResponder(): number {
    return this.hilos.filter(h => !(h.respuestas || []).some((r: any) => r.tipo_autor === 'jardin')).length;
  }

  responder(hilo: any) {
    const texto = (this.respuestas[hilo.id] || '').trim();
    if (!texto) {
      return;
    }
    this.preguntasService.crear({
      id_tarea_estudiante: this.idTarea,
      id_pregunta_padre: hilo.id,
      texto: texto,
    }).subscribe({
      next: () => {
        this.respuestas[hilo.id] = '';
        this.recargarPreguntas();
      },
      error: () => { }
    });
  }

  async eliminarMensaje(mensaje: any, esPregunta: boolean) {
    const result = await Swal.fire({
      title: esPregunta ? '¿Eliminar la pregunta?' : '¿Eliminar la respuesta?',
      text: esPregunta ? 'También se ocultan sus respuestas.' : '',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });
    if (result.isConfirmed) {
      this.preguntasService.eliminar({ id: mensaje.id }).subscribe({
        next: () => this.recargarPreguntas(),
        error: () => { }
      });
    }
  }

  iniciales(nombre: string): string {
    return (nombre || '').split(' ').filter(p => !!p).slice(0, 2).map(p => p[0]).join('').toUpperCase();
  }
}