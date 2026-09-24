import { Component, OnInit } from '@angular/core';
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
 * Calificar: cada niño es una tarjeta con su estado; la valoración se elige
 * con un toque sobre la escala del jardín y la observación es opcional.
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

  public tarea: any = null;
  public estudiantes: any[] = [];
  public escala: any[] = [];
  public hilos: any[] = [];

  public pestana: 'estudiantes' | 'preguntas' = 'estudiantes';
  public filtroEstado = 'todos';
  public filtroTexto = '';

  /** Borradores de observación y respuesta, por fila / por hilo. */
  public observaciones: { [idFila: string]: string } = {};
  public respuestas: { [idPregunta: string]: string } = {};
  public guardandoFila: { [idFila: string]: boolean } = {};

  // Admite undefined para que el template maneje un estado desconocido sin romperse
  readonly ESTADOS: { [clave: string]: { texto: string, clase: string } | undefined } = {
    pendiente: { texto: 'Pendiente', clase: 'estado-pendiente' },
    enviada: { texto: 'Enviada por el acudiente', clase: 'estado-enviada' },
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

  asignarEstudiantes(filas: any[]) {
    this.estudiantes = filas;
    this.observaciones = {};
    filas.forEach(f => this.observaciones[f.id] = f.observacion || '');
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
      (this.filtroEstado === 'todos' || e.estado === this.filtroEstado) &&
      (!filtro || (e.nombre_estudiante || '').toLowerCase().includes(filtro))
    );
  }

  contar(estado: string): number {
    return this.estudiantes.filter(e => e.estado === estado).length;
  }

  calificar(fila: any, valor: any) {
    this.enviarCalificacion(fila, 'calificada', valor.id);
  }

  marcarNoEntregada(fila: any) {
    this.enviarCalificacion(fila, 'no_entregada', null);
  }

  async devolverPendiente(fila: any) {
    const result = await Swal.fire({
      title: '¿Quitar la calificación?',
      text: `${fila.nombre_estudiante} vuelve a quedar pendiente.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, quitar',
      cancelButtonText: 'Cancelar'
    });
    if (result.isConfirmed) {
      this.enviarCalificacion(fila, 'pendiente', null);
    }
  }

  guardarObservacion(fila: any) {
    // La observación se guarda sin cambiar el estado que tenga la fila
    this.enviarCalificacion(fila, fila.estado, fila.id_valor_parametro_calificacion);
  }

  private enviarCalificacion(fila: any, estado: string, idValor: any) {
    this.guardandoFila[fila.id] = true;
    this.xEstudianteService.calificar({
      id: fila.id,
      estado: estado,
      id_valor_parametro_calificacion: idValor,
      observacion: this.observaciones[fila.id] || null,
    }).subscribe({
      next: () => {
        this.guardandoFila[fila.id] = false;
        this.recargarEstudiantes();
      },
      error: () => { this.guardandoFila[fila.id] = false; }
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