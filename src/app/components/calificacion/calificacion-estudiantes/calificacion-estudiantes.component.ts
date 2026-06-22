import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../../common/header/header.component';
import { ActividadesAcademicasService } from '../../../services/actividades-academicas.service';
import { ParametrosCalificacionesService } from '../../../services/parametros-calificaciones.service';
import { ValoresParametrosCalificacionesService } from '../../../services/valores-parametros-calificaciones.service';
import { CalificacionesService } from '../../../services/calificaciones.service';
import { TareasXSprintsService } from '../../../services/tareas-x-sprints.service';
import { TareasXSprintsXEstudianteService } from '../../../services/tareas-x-sprints-x-estudiante.service';
import { CalificacionContextService } from '../../../services/calificacion-context.service';
import { GruposService } from '../../../services/grupos.service';
import { UtilService } from '../../../common/constantes/util.service';
import collect from 'collect.js';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-calificacion-estudiantes',
  templateUrl: './calificacion-estudiantes.component.html',
  styleUrl: './calificacion-estudiantes.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent]
})
export class CalificacionEstudiantesComponent implements OnInit {

  public titulo = "Registro de calificaciones";
  public grupo: any = null;
  public actividadAcademica: any = null;
  public estudiantes: any[] = [];
  public estudiantesAusentes: any[] = [];
  public parametrosCalificaciones: any[] = [];
  public usuario: any = {};

  // Acordeón ausentes
  public ausentesExpandido: boolean = false;

  // Observación general de la tarea
  public observacionTarea: string = '';

  // Horario
  public bloquesHorario: any[] = [];
  public horarioSeleccionado: any = null;

  // Huella del dispositivo (silenciosa)
  private huellaDispositivo: string = '';
  private userAgent: string = '';

  public idGrupo: string = '';
  public idArea: string = '';
  public idTareaSprint: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private gruposService: GruposService,
    private actividadesAcademicasService: ActividadesAcademicasService,
    private parametrosCalificacionesService: ParametrosCalificacionesService,
    private valoresParametrosCalificacionesService: ValoresParametrosCalificacionesService,
    private calificacionesService: CalificacionesService,
    private tareasXSprintsService: TareasXSprintsService,
    private tareasXSprintsXEstudianteService: TareasXSprintsXEstudianteService,
    private calificacionContext: CalificacionContextService,
    private utilService: UtilService
  ) {}

  ngOnInit(): void {
    this.usuario = this.utilService.obtenerUsuarioActual();
    this.generarHuellaDispositivo();

    this.route.params.subscribe(params => {
      this.idGrupo = params['idGrupo'];
      this.idArea = params['idArea'];
      this.idTareaSprint = params['idTareaSprint'];
      this.cargarDatos();
    });
  }

  public get esEvaluacion(): boolean {
    return !!(this.actividadAcademica && Number(this.actividadAcademica.es_evaluacion) === 1);
  }

  private cargarDatos(): void {
    this.gruposService.obtenerTodos().subscribe((resp: any) => {
      const grupos = resp.body || [];
      this.grupo = grupos.find((g: any) => g.id == this.idGrupo) || null;
      this.cargarActividad();
    });

    this.cargarParametrosCalificaciones();
    this.cargarBloquesHorario();
  }

  private cargarBloquesHorario(): void {
    const jsDay = new Date().getDay();
    const diaSemana = jsDay === 0 ? 7 : jsDay;
    this.bloquesHorario = this.calificacionContext.getHorariosAreaDia(this.idGrupo, this.idArea, diaSemana);
    this.horarioSeleccionado = this.calificacionContext.getBloqueActual(this.idGrupo, this.idArea);
  }

  private cargarParametrosCalificaciones(): void {
    this.parametrosCalificacionesService.obtenerTodos().subscribe((response: any) => {
      this.parametrosCalificaciones = response.body;
      this.cargarValoresParametros();
    });
  }

  private cargarValoresParametros(): void {
    this.valoresParametrosCalificacionesService.obtenerTodos().subscribe((responseVal: any) => {
      const valores = collect(responseVal.body);
      this.parametrosCalificaciones.forEach((pc: any) => {
        pc.valores = (valores.where("id_parametros_calificaciones", pc.id) as any).items
          .sort((a: any, b: any) => a.valor_cuantitativo - b.valor_cuantitativo);
      });
    });
  }

  private cargarActividad(): void {
    this.actividadesAcademicasService.obtenerByGrupoArea(this.idGrupo, this.idArea)
      .subscribe((response: any) => {
        const actividades = response.body || [];
        const actividad = actividades.find((a: any) => a.id_tarea_x_sprint == this.idTareaSprint);
        if (actividad) {
          this.actividadAcademica = {
            ...actividad,
            titulo: this.limpiarHTML(actividad.titulo),
            descripcion: this.limpiarHTML(actividad.descripcion),
            materiales: this.limpiarHTML(actividad.materiales),
            nivel_uno: this.limpiarHTML(actividad.nivel_uno),
            nivel_dos: this.limpiarHTML(actividad.nivel_dos),
            indicador_logro_nombre: this.limpiarHTML(actividad.indicador_logro_nombre)
          };
          this.cargarVistaTarea();
          this.cargarObservacionTarea();
        }
      });
  }

  /**
   * Carga estudiantes (presentes y ausentes), calificaciones y observaciones
   * en una sola llamada al backend.
   */
  private cargarVistaTarea(): void {
    this.calificacionesService.obtenerVistaTarea(this.idGrupo, this.idTareaSprint)
      .subscribe((resp: any) => {
        const todos: any[] = resp.body || [];

        const presentes: any[] = [];
        const ausentes: any[] = [];

        todos.forEach((est: any) => {
          const procesado = this.procesarEstudiante(est);
          if (est.presente === 1) {
            presentes.push(procesado);
          } else {
            ausentes.push(procesado);
          }
        });

        this.estudiantes = presentes;
        this.estudiantesAusentes = ausentes;
      });
  }

  /**
   * Toma un estudiante crudo del backend y le anida los parámetros de calificación
   * con su valor seleccionado (si lo tiene).
   */
  private procesarEstudiante(est: any): any {
    // Clonar parámetros para que cada estudiante tenga los suyos
    const parametrosCalificaciones = JSON.parse(
      JSON.stringify(this.parametrosCalificaciones)
    );

    // Mapear calificaciones existentes a los parámetros
    const calificaciones = est.calificaciones || [];
    parametrosCalificaciones.forEach((epc: any) => {
      const cal = calificaciones.find(
        (c: any) => c.id_parametro_calificacion == epc.id
      );
      if (cal) {
        epc.seleccionado = (epc.valores || []).find(
          (v: any) => v.id == cal.id_valor_parametro_calificacion
        );
        epc.guardado = cal.id;
      }
    });

    return {
      id_estudiante: est.id_estudiante,
      primer_nombre: est.primer_nombre,
      segundo_nombre: est.segundo_nombre,
      primer_apellido: est.primer_apellido,
      segundo_apellido: est.segundo_apellido,
      presente: est.presente,
      idTareaEstudiante: est.id_tarea_estudiante || null,
      observacion: est.observacion || '',
      observacionGuardada: est.observacion || '',
      parametrosCalificaciones: parametrosCalificaciones
    };
  }

  // ========== Observación general de la tarea ==========

  private cargarObservacionTarea(): void {
    this.tareasXSprintsService.obtenerById(this.idTareaSprint).subscribe((resp: any) => {
      const tarea = resp.body;
      if (tarea && tarea.length > 0) {
        this.observacionTarea = tarea[0].observaciones || '';
      }
    });
  }

  guardarObservacionTarea(): void {
    this.tareasXSprintsService.actualizarObservacion(this.idTareaSprint, this.observacionTarea)
      .subscribe({
        next: () => {},
        error: () => { Swal.fire({ toast: true, position: 'top-end', icon: 'error', title: 'Error al guardar observación', showConfirmButton: false, timer: 2000 }); }
      });
  }

  // ========== Observaciones por estudiante ==========

  guardarObservacionEstudiante(estudiante: any): void {
    if (estudiante.observacion === estudiante.observacionGuardada) return;

    this.tareasXSprintsXEstudianteService.actualizarObservacion(
      this.idTareaSprint,
      estudiante.id_estudiante,
      estudiante.observacion
    ).subscribe({
      next: (resp: any) => {
        estudiante.observacionGuardada = estudiante.observacion;
        if (resp.id) {
          estudiante.idTareaEstudiante = resp.id;
        }
      },
      error: () => { Swal.fire({ toast: true, position: 'top-end', icon: 'error', title: 'Error al guardar observación', showConfirmButton: false, timer: 2000 }); }
    });
  }

  // ========== Calificación ==========

  private limpiarHTML(html: string): string {
    if (!html) return '';
    let cleanHtml = html
      .replace(/ style="[^"]*"/gi, '')
      .replace(/ class="[^"]*"/gi, '')
      .replace(/<font[^>]*>/gi, '')
      .replace(/<\/font>/gi, '')
      .replace(/<span[^>]*>/gi, '')
      .replace(/<\/span>/gi, '')
      .replace(/&nbsp;/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    cleanHtml = cleanHtml.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    cleanHtml = cleanHtml.replace(/__(.*?)__/g, '<em>$1</em>');
    return cleanHtml;
  }

  calificar(valorParametro: any, parametro: any, estudiante: any): void {
    parametro.seleccionado = valorParametro;
    if (parametro.guardado > 0) {
      this.actualizarCalificacion(parametro.guardado, valorParametro.id);
    } else {
      this.crearCalificacion(
        estudiante.id_estudiante,
        this.actividadAcademica.id_tarea_x_sprint,
        parametro,
        valorParametro.id
      );
      // Crear registro en tareas_x_sprints_x_estudiante si no existe
      if (!estudiante.idTareaEstudiante) {
        this.tareasXSprintsXEstudianteService.crear(
          this.actividadAcademica.id_tarea_x_sprint,
          estudiante.id_estudiante
        ).subscribe((resp: any) => {
          if (resp.id) {
            estudiante.idTareaEstudiante = resp.id;
          }
        });
      }
    }
  }

  private actualizarCalificacion(idCalificacion: string, idValorParametro: string): void {
    this.calificacionesService.actualizarCalificacion(idCalificacion, idValorParametro)
      .subscribe({
        next: () => {},
        error: () => { Swal.fire({ toast: true, position: 'top-end', icon: 'error', title: 'Error al guardar calificación', showConfirmButton: false, timer: 2000 }); }
      });
  }

  private crearCalificacion(idEstudiante: string, idTareaSprint: string, parametro: any, idValorParametro: string): void {
    this.calificacionesService.calificar(
      idEstudiante,
      idTareaSprint,
      parametro.id,
      idValorParametro
    ).subscribe({
      next: (response: any) => {
        parametro.guardado = response;
      },
      error: () => { Swal.fire({ toast: true, position: 'top-end', icon: 'error', title: 'Error al guardar calificación', showConfirmButton: false, timer: 2000 }); }
    });
  }

  iniciarTarea(): void {
    this.tareasXSprintsService.iniciarTarea(
      this.actividadAcademica.id_tarea_x_sprint,
      this.usuario.id_docente,
      this.horarioSeleccionado,
      { userAgent: this.userAgent, huella: this.huellaDispositivo }
    ).subscribe((response: any) => {
      this.actividadAcademica.id_docente_inicia = this.usuario.id_docente;
    });
  }

  finalizarTarea(): void {
    this.tareasXSprintsService.finalizarTarea(
      this.actividadAcademica.id_tarea_x_sprint,
      this.usuario.id_docente
    ).subscribe((response: any) => {
      this.router.navigate(['/calificacion/grupo', this.idGrupo, 'area', this.idArea]);
    });
  }

  toggleAusentes(): void {
    this.ausentesExpandido = !this.ausentesExpandido;
  }

  trackByEstudiante(index: number, est: any): any {
    return est.id_estudiante;
  }

  get rutaRegresar(): string {
    return '/calificacion/grupo/' + this.idGrupo + '/area/' + this.idArea;
  }

  // ========== Huella del dispositivo (silenciosa) ==========

  private generarHuellaDispositivo(): void {
    this.userAgent = navigator.userAgent || '';
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (ctx) {
        canvas.width = 200;
        canvas.height = 50;
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillStyle = '#f60';
        ctx.fillRect(125, 1, 62, 20);
        ctx.fillStyle = '#069';
        ctx.fillText('Lumen fingerprint', 2, 15);
        ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
        ctx.fillText('Lumen fingerprint', 4, 17);
        const dataUrl = canvas.toDataURL();
        this.huellaDispositivo = this.hashSimple(dataUrl + '|' + this.userAgent + '|' + screen.width + 'x' + screen.height + '|' + navigator.language + '|' + new Date().getTimezoneOffset());
      }
    } catch (e) {
      this.huellaDispositivo = this.hashSimple(this.userAgent + '|' + screen.width + 'x' + screen.height);
    }
  }

  private hashSimple(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
  }
}