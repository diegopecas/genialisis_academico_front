import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EditorTextoEnriquecidoComponent } from '../../../../common/editor-texto-enriquecido/editor-texto-enriquecido.component';
import { normalizarTexto } from '../../../../common/pipes/search';
import { AmbientesService } from '../../../../services/ambientes.service';
import { TiposActividadesAcademicasService } from '../../../../services/tipos-actividades-academicas.service';
import { IaMaquinaActividadesService } from '../../../../services/ia-maquina-actividades.service';
import { TareasXSprintsService } from '../../../../services/tareas-x-sprints.service';
import { LogrosService } from '../../../../services/logros.service';
import Swal from 'sweetalert2';

/** Actividad que queda disponible en la franja después de crearla o importarla. */
export interface ActividadAgregada {
  id_tarea_x_sprint: string;
  titulo: string;
  id_area_academica: string;
  minutos_duracion: number | null;
}

/**
 * Panel para agregar una actividad a una franja de la calificación rápida.
 *
 * Es la misma lógica de "Crear actividad" e "Importar del corte" de la lista
 * de actividades de Calificaciones, pero en vez de navegar a la pantalla de
 * calificar, devuelve la tarea creada para que la calificación rápida la
 * ponga en la franja. Siempre es de grupo: los cursos extracurriculares no
 * entran en la calificación rápida.
 */
@Component({
  selector: 'app-agregar-actividad-rapida',
  templateUrl: './agregar-actividad-rapida.component.html',
  styleUrl: './agregar-actividad-rapida.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, EditorTextoEnriquecidoComponent]
})
export class AgregarActividadRapidaComponent implements OnInit {

  @Input() idGrupo: string = '';
  @Input() nombreGrupo: string = '';
  @Input() idArea: string = '';
  @Input() nombreArea: string = '';
  @Input() idSprint: string = '';
  @Input() minutosDefault: number = 45;

  @Output() creada = new EventEmitter<ActividadAgregada>();
  @Output() cerrar = new EventEmitter<void>();

  public tab: 'crear' | 'importar' = 'crear';

  // Catálogos del formulario
  public ambientes: any[] = [];
  public tiposActividad: any[] = [];
  public logrosDisponibles: any[] = [];
  public logrosCargados: boolean = false;

  // Crear
  public sugiriendoIA: boolean = false;
  public busquedaIndicador: string = '';
  public intentoCrear: boolean = false;
  public guardando: boolean = false;
  public formActividad = {
    titulo: '',
    descripcion: '',
    nivel_uno: '',
    nivel_dos: '',
    minutos_duracion: 45,
    id_tipo_actividad_academica: '' as any,
    id_ambiente: null as any,
    indicadores_ids: [] as string[],
    indicadores: [] as any[]
  };

  // Importar
  public importables: any[] = [];
  public importablesCargados: boolean = false;
  public cargandoImportables: boolean = false;
  public buscarImportar: string = '';
  public importableSeleccionada: any = null;
  public importableExpandida: any = null;

  constructor(
    private ambientesService: AmbientesService,
    private tiposActividadesService: TiposActividadesAcademicasService,
    private iaMaquinaService: IaMaquinaActividadesService,
    private tareasXSprintsService: TareasXSprintsService,
    private logrosService: LogrosService
  ) {}

  ngOnInit(): void {
    this.formActividad.minutos_duracion = this.minutosDefault || 45;

    this.ambientesService.obtenerActivos().subscribe((resp: any) => {
      this.ambientes = resp.body || [];
    });
    this.tiposActividadesService.obtenerTodos().subscribe((resp: any) => {
      this.tiposActividad = resp.body || [];
    });
    this.logrosService.obtenerByGrupoAreaConIndicadores(this.idGrupo, this.idArea).subscribe({
      next: (resp: any) => {
        this.logrosDisponibles = resp.body || [];
        this.logrosCargados = true;
      },
      error: () => {
        this.logrosDisponibles = [];
        this.logrosCargados = true;
      }
    });
  }

  cambiarTab(tab: 'crear' | 'importar'): void {
    this.tab = tab;
    if (tab === 'importar' && !this.importablesCargados) {
      this.cargarImportables();
    }
  }

  cerrarPanel(): void {
    if (this.guardando) return;
    this.cerrar.emit();
  }

  // ========================================================================
  // CREAR
  // ========================================================================

  /** El área está cargada y no tiene ningún logro asociado. */
  areaSinLogros(): boolean {
    return this.logrosCargados && this.logrosDisponibles.length === 0;
  }

  formValido(): boolean {
    return !!(this.formActividad.titulo.trim() && this.formActividad.id_tipo_actividad_academica);
  }

  formRequiereIndicador(): boolean {
    return this.logrosDisponibles.length > 0 && this.formActividad.indicadores_ids.length === 0;
  }

  /** Texto sin etiquetas: el editor enriquecido deja "<p></p>" cuando está vacío. */
  private textoPlano(html: string): string {
    return (html || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ').trim();
  }

  /** La IA necesita al menos el título o la descripción como idea base. */
  tieneIdeaBase(): boolean {
    return !!(this.formActividad.titulo.trim() || this.textoPlano(this.formActividad.descripcion));
  }

  /** Ids de los indicadores que existen para el grupo y área: filtro contra ids inventados por la IA. */
  private idsIndicadoresDisponibles(): string[] {
    const ids: string[] = [];
    for (const logro of this.logrosDisponibles) {
      for (const ind of (logro.indicadores || [])) {
        ids.push(ind.id);
      }
    }
    return ids;
  }

  async sugerirConIA(): Promise<void> {
    if (!this.tieneIdeaBase()) {
      Swal.fire('Escribe la idea', 'Escribe el título o la descripción para sugerir.', 'info');
      return;
    }

    // Reescribir: la IA redacta título y descripción a partir de lo escrito.
    // Conservar: se respeta lo escrito y solo se llena lo vacío.
    const eleccion = await Swal.fire({
      title: '🪄 Sugerir con IA',
      text: '¿La IA reescribe el título y la descripción a partir de lo que escribiste, o conservas tu texto y solo completa lo vacío?',
      icon: 'question',
      showDenyButton: true,
      showCancelButton: true,
      confirmButtonColor: '#F5A623',
      denyButtonColor: '#6c757d',
      cancelButtonColor: '#2C2C2C',
      confirmButtonText: 'Reescribir',
      denyButtonText: 'Conservar lo que escribí',
      cancelButtonText: 'Cancelar'
    });
    if (eleccion.isDismissed) return;
    const reescribir = eleccion.isConfirmed;

    this.sugiriendoIA = true;

    const datos = {
      modo: reescribir ? 'reescribir' : 'completar',
      titulo: this.formActividad.titulo,
      descripcion: this.formActividad.descripcion,
      nivel_uno: this.formActividad.nivel_uno,
      nivel_dos: this.formActividad.nivel_dos,
      id_grupo: this.idGrupo,
      id_curso_extra: null,
      id_area: this.idArea,
      id_sprint: this.idSprint,
      nombre_grupo: this.nombreGrupo,
      nombre_area: this.nombreArea,
      id_tipo_actividad: this.formActividad.id_tipo_actividad_academica,
      ambientes: this.ambientes.map((a: any) => ({ id: a.id, nombre: a.nombre })),
      materiales: []
    };

    this.iaMaquinaService.sugerirIndividual(datos).subscribe({
      next: (resp: any) => {
        this.sugiriendoIA = false;
        if (resp.success && resp.sugerencia) {
          const s = resp.sugerencia;
          // Título y descripción: al reescribir se reemplazan; al conservar solo se llenan si están vacíos
          if (s.titulo && (reescribir || !this.formActividad.titulo.trim())) this.formActividad.titulo = s.titulo;
          if (s.descripcion && (reescribir || !this.textoPlano(this.formActividad.descripcion))) this.formActividad.descripcion = s.descripcion;
          if (!this.formActividad.nivel_uno && s.nivel_uno) this.formActividad.nivel_uno = s.nivel_uno;
          if (!this.formActividad.nivel_dos && s.nivel_dos) this.formActividad.nivel_dos = s.nivel_dos;
          if (s.minutos_duracion && this.formActividad.minutos_duracion === this.minutosDefault) this.formActividad.minutos_duracion = s.minutos_duracion;
          if (s.id_ambiente && !this.formActividad.id_ambiente) this.formActividad.id_ambiente = s.id_ambiente;
          if (s.id_tipo_actividad_academica && !this.formActividad.id_tipo_actividad_academica) {
            this.formActividad.id_tipo_actividad_academica = s.id_tipo_actividad_academica;
          }
          if (s.indicadores_ids && this.formActividad.indicadores_ids.length === 0) {
            // Solo se aceptan indicadores que existan en los logros cargados desde la BD.
            const disponibles = this.idsIndicadoresDisponibles();
            this.formActividad.indicadores_ids = (s.indicadores_ids as string[])
              .filter((id: string) => disponibles.includes(id));
            this.formActividad.indicadores = (s.indicadores || [])
              .filter((ind: any) => this.formActividad.indicadores_ids.includes(ind.id));
          }
          Swal.fire({ title: reescribir ? '🪄 Actividad redactada' : '🪄 Sugerencias aplicadas', icon: 'success', timer: 1500, showConfirmButton: false });
        }
      },
      error: () => {
        this.sugiriendoIA = false;
      }
    });
  }

  toggleIndicador(indicadorId: string): void {
    const idx = this.formActividad.indicadores_ids.indexOf(indicadorId);
    if (idx >= 0) {
      this.formActividad.indicadores_ids.splice(idx, 1);
      this.formActividad.indicadores = this.formActividad.indicadores.filter((ind: any) => ind.id !== indicadorId);
      return;
    }
    for (const logro of this.logrosDisponibles) {
      for (const ind of (logro.indicadores || [])) {
        if (ind.id === indicadorId) {
          this.formActividad.indicadores_ids.push(indicadorId);
          this.formActividad.indicadores.push({ id: ind.id, nombre: ind.nombre, logro_id: logro.id, logro_nombre: logro.nombre });
          return;
        }
      }
    }
  }

  quitarIndicador(indId: string): void {
    this.formActividad.indicadores_ids = this.formActividad.indicadores_ids.filter((id: string) => id !== indId);
    this.formActividad.indicadores = this.formActividad.indicadores.filter((ind: any) => ind.id !== indId);
  }

  indicadorCoincideBusqueda(ind: any): boolean {
    const busqueda = normalizarTexto(this.busquedaIndicador).trim();
    if (!busqueda) return true;
    return normalizarTexto(ind.nombre).includes(busqueda);
  }

  tieneIndicadoresFiltrados(logro: any): boolean {
    return (logro.indicadores || []).some((ind: any) => this.indicadorCoincideBusqueda(ind));
  }

  crear(): void {
    this.intentoCrear = true;
    if (!this.formValido()) {
      Swal.fire('Campos obligatorios', 'Completa el título y selecciona el tipo de actividad.', 'warning');
      return;
    }
    if (this.formRequiereIndicador()) {
      Swal.fire('Indicador requerido', 'Debes asociar al menos un indicador de logro.', 'warning');
      return;
    }
    if (this.guardando) return;
    this.guardando = true;

    const payload = {
      id_sprint: this.idSprint,
      id_grupo: this.idGrupo,
      id_curso_extra: null,
      id_area: this.idArea,
      es_tarea_adicional: true,
      actividades: [{
        titulo: this.formActividad.titulo,
        descripcion: this.formActividad.descripcion,
        nivel_uno: this.formActividad.nivel_uno,
        nivel_dos: this.formActividad.nivel_dos,
        minutos_duracion: this.formActividad.minutos_duracion,
        id_tipo_actividad_academica: this.formActividad.id_tipo_actividad_academica || null,
        id_ambiente: this.formActividad.id_ambiente ? this.formActividad.id_ambiente : null,
        indicadores_ids: this.formActividad.indicadores_ids,
        materiales: []
      }]
    };

    this.iaMaquinaService.grabarActividades(payload).subscribe({
      next: (resp: any) => {
        this.guardando = false;
        const actividad = resp?.success && resp.actividades?.length > 0 ? resp.actividades[0] : null;
        if (!actividad || !actividad.id_tarea_sprint) {
          Swal.fire('Error', resp?.error || 'No se pudo crear la actividad.', 'error');
          return;
        }
        this.creada.emit({
          id_tarea_x_sprint: actividad.id_tarea_sprint,
          titulo: actividad.titulo || this.formActividad.titulo,
          id_area_academica: this.idArea,
          minutos_duracion: this.formActividad.minutos_duracion
        });
      },
      error: () => {
        this.guardando = false;
      }
    });
  }

  // ========================================================================
  // IMPORTAR DEL CORTE
  // ========================================================================

  /**
   * Actividades del mismo grupo y área en los sprints del corte del sprint
   * actual, menos las que ya están pendientes en el sprint actual.
   */
  private cargarImportables(): void {
    this.cargandoImportables = true;
    this.tareasXSprintsService.obtenerParaImportarCorte(this.idSprint, this.idGrupo, this.idArea, null).subscribe({
      next: (resp: any) => {
        this.importables = (resp.body || []).map((act: any) => ({
          ...act,
          titulo_texto: this.textoPlano(act.titulo_actividad)
        }));
        this.importablesCargados = true;
        this.cargandoImportables = false;
      },
      error: () => {
        this.importables = [];
        this.importablesCargados = true;
        this.cargandoImportables = false;
      }
    });
  }

  get importablesVisibles(): any[] {
    const busqueda = normalizarTexto(this.buscarImportar).trim();
    if (!busqueda) return this.importables;
    return this.importables.filter((act: any) =>
      normalizarTexto(act.titulo_texto).includes(busqueda) ||
      normalizarTexto(this.textoPlano(act.descripcion_actividad)).includes(busqueda)
    );
  }

  seleccionarImportable(act: any): void {
    this.importableSeleccionada = this.importableSeleccionada === act ? null : act;
  }

  toggleDescripcion(act: any, event: Event): void {
    event.stopPropagation();
    this.importableExpandida = this.importableExpandida === act ? null : act;
  }

  /** Crea la tarea en el sprint actual con la misma actividad (conserva sus indicadores), marcada como adicional. */
  importar(): void {
    if (!this.importableSeleccionada || this.guardando) return;
    this.guardando = true;
    const seleccionada = this.importableSeleccionada;

    this.tareasXSprintsService.crearLote({
      id_sprint: this.idSprint,
      actividades: [seleccionada.id_actividad_academica],
      id_grupo: this.idGrupo,
      id_area_academica: this.idArea,
      id_curso_extra: null,
      es_tarea_adicional: 1
    }).subscribe({
      next: (resp: any) => {
        this.guardando = false;
        const tarea = resp?.tareas?.length > 0 ? resp.tareas[0] : null;
        if (!tarea || !tarea.id) {
          Swal.fire('Error', resp?.omitidas?.[0]?.motivo || resp?.error || 'No se pudo importar la actividad.', 'error');
          return;
        }
        this.creada.emit({
          id_tarea_x_sprint: tarea.id,
          titulo: tarea.titulo || seleccionada.titulo_actividad,
          id_area_academica: this.idArea,
          minutos_duracion: seleccionada.minutos_duracion ? Number(seleccionada.minutos_duracion) : null
        });
      },
      error: () => {
        this.guardando = false;
      }
    });
  }
}
