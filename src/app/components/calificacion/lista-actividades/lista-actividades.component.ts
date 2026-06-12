import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../../common/header/header.component';
import { SearchPipeGeneral } from '../../../common/pipes/search';
import { ActividadesAcademicasService } from '../../../services/actividades-academicas.service';
import { AreasAcademicasService } from '../../../services/areas-academicas.service';
import { GruposService } from '../../../services/grupos.service';
import { AmbientesService } from '../../../services/ambientes.service';
import { TiposActividadesAcademicasService } from '../../../services/tipos-actividades-academicas.service';
import { IaMaquinaActividadesService } from '../../../services/ia-maquina-actividades.service';
import { SprintsService } from '../../../services/sprints.service';
import { TareasXSprintsService } from '../../../services/tareas-x-sprints.service';
import { LogrosService } from '../../../services/logros.service';
import { CalificacionContextService } from '../../../services/calificacion-context.service';
import { UtilService } from '../../../common/constantes/util.service';
import collect from 'collect.js';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-lista-actividades',
  templateUrl: './lista-actividades.component.html',
  styleUrl: './lista-actividades.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, SearchPipeGeneral]
})
export class ListaActividadesComponent implements OnInit {

  public titulo = "Registro de calificaciones";
  public grupo: any = null;
  public area: any = null;
  public actividadesPendientes: any[] = [];
  public siguienteActividad: any = null;
  public verTodas: boolean = false;
  public buscar: string = '';

  // Modo edición (orden + duración)
  public modoEdicion: boolean = false;
  public guardandoOrden: boolean = false;
  public dragIndex: number = -1;
  public buscarEdicion: string = '';

  // Crear actividad rápida
  public mostrarFormCrear: boolean = false;
  public ambientes: any[] = [];
  public tiposActividad: any[] = [];
  public sprintActual: any = null;
  public logrosDisponibles: any[] = [];
  public sugiriendoIA: boolean = false;
  public busquedaIndicadorForm: string = '';
  public intentoCrear: boolean = false;

  public formActividad = {
    titulo: '',
    descripcion: '',
    nivel_uno: '',
    nivel_dos: '',
    minutos_duracion: 45,
    id_tipo_actividad_academica: '' as any,
    id_ambiente: null as any,
    indicadores_ids: [] as number[],
    indicadores: [] as any[]
  };

  public idGrupo: number = 0;
  public idArea: number = 0;

  // Touch drag state
  private touchStartY: number = 0;
  private touchCurrentElement: HTMLElement | null = null;
  private placeholder: HTMLElement | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private actividadesAcademicasService: ActividadesAcademicasService,
    private areasAcademicasService: AreasAcademicasService,
    private gruposService: GruposService,
    private ambientesService: AmbientesService,
    private tiposActividadesService: TiposActividadesAcademicasService,
    private iaMaquinaService: IaMaquinaActividadesService,
    private sprintsService: SprintsService,
    private tareasXSprintsService: TareasXSprintsService,
    private logrosService: LogrosService,
    private calificacionContext: CalificacionContextService,
    private utilService: UtilService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.idGrupo = +params['idGrupo'];
      this.idArea = +params['idArea'];
      this.cargarDatosIniciales();
    });
  }

  private cargarDatosIniciales(): void {
    this.gruposService.obtenerTodos().subscribe((resp: any) => {
      const grupos = resp.body || [];
      this.grupo = grupos.find((g: any) => g.id == this.idGrupo) || null;
    });

    this.areasAcademicasService.obtenerAreasAcademicasGrupo(this.idGrupo)
      .subscribe((resp: any) => {
        const areas = resp.body || [];
        this.area = areas.find((a: any) => a.id_area_academica == this.idArea) || null;
      });

    this.cargarActividades();
    this.cargarCatalogosCrear();
  }

  private cargarActividades(): void {
    this.actividadesAcademicasService.obtenerByGrupoArea(this.idGrupo, this.idArea)
      .subscribe((response: any) => {
        let actividades = collect(response.body)
          .where("nombre_estado", "Pendiente")
          .all();

        actividades = actividades.map((actividad: any) => ({
          ...actividad,
          titulo: this.limpiarHTML(actividad.titulo),
          descripcion: this.limpiarHTML(actividad.descripcion),
          materiales: this.limpiarHTML(actividad.materiales),
          nivel_uno: this.limpiarHTML(actividad.nivel_uno),
          nivel_dos: this.limpiarHTML(actividad.nivel_dos),
          indicador_logro_nombre: this.limpiarHTML(actividad.indicador_logro_nombre)
        }));

        this.actividadesPendientes = actividades;
        this.siguienteActividad = actividades.length > 0 ? actividades[0] : null;
      });
  }

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

  private cargarCatalogosCrear(): void {
    this.ambientesService.obtenerActivos().subscribe((resp: any) => {
      this.ambientes = resp.body || [];
    });
    this.tiposActividadesService.obtenerTodos().subscribe((resp: any) => {
      this.tiposActividad = resp.body || [];
    });
    this.sprintsService.obtenerTodos().subscribe((resp: any) => {
      const sprints = resp.body || [];
      this.sprintActual = sprints.find((s: any) => s.actual == 1) || null;
    });
  }

  seleccionarActividad(actividad: any): void {
    if (this.modoEdicion) return;
    this.router.navigate([
      '/calificacion/grupo', this.idGrupo,
      'area', this.idArea,
      'actividad', actividad.id_tarea_x_sprint
    ]);
  }

  toggleVerTodas(): void {
    this.verTodas = !this.verTodas;
  }

  // ========================================================================
  // MODO EDICIÓN: Orden + Duración
  // ========================================================================

  activarModoEdicion(): void {
    this.verTodas = true;
    this.modoEdicion = true;
    this.buscarEdicion = '';
  }

  cancelarModoEdicion(): void {
    this.modoEdicion = false;
    this.buscarEdicion = '';
    this.cargarActividades();
  }

  guardarOrdenYDuracion(): void {
    this.guardandoOrden = true;

    const tareas = this.actividadesPendientes.map((a: any, i: number) => ({
      id: a.id_tarea_x_sprint,
      orden_ejecucion: i + 1,
      id_actividad_academica: a.id_actividad_academica,
      minutos_duracion: a.minutos_duracion
    }));

    this.tareasXSprintsService.actualizarOrdenYDuracion(tareas).subscribe({
      next: (resp: any) => {
        this.guardandoOrden = false;
        this.modoEdicion = false;
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Orden y duración guardados', showConfirmButton: false, timer: 1500 });
        this.cargarActividades();
      },
      error: () => {
        this.guardandoOrden = false;
        Swal.fire('Error', 'No se pudo guardar el orden.', 'error');
      }
    });
  }

  // Mover con botones (alternativa al drag)
  moverArriba(index: number): void {
    if (index <= 0) return;
    const temp = this.actividadesPendientes[index];
    this.actividadesPendientes[index] = this.actividadesPendientes[index - 1];
    this.actividadesPendientes[index - 1] = temp;
  }

  moverAbajo(index: number): void {
    if (index >= this.actividadesPendientes.length - 1) return;
    const temp = this.actividadesPendientes[index];
    this.actividadesPendientes[index] = this.actividadesPendientes[index + 1];
    this.actividadesPendientes[index + 1] = temp;
  }

  moverAlInicio(index: number): void {
    if (index <= 0) return;
    const item = this.actividadesPendientes.splice(index, 1)[0];
    this.actividadesPendientes.unshift(item);
  }

  moverAlFinal(index: number): void {
    if (index >= this.actividadesPendientes.length - 1) return;
    const item = this.actividadesPendientes.splice(index, 1)[0];
    this.actividadesPendientes.push(item);
  }

  coincideBusquedaEdicion(actividad: any): boolean {
    if (!this.buscarEdicion || !this.buscarEdicion.trim()) return true;
    const texto = (actividad.titulo || '').toLowerCase();
    return texto.includes(this.buscarEdicion.toLowerCase().trim());
  }

  // Touch Drag & Drop
  onTouchStart(event: TouchEvent, index: number): void {
    this.dragIndex = index;
    this.touchStartY = event.touches[0].clientY;
    this.touchCurrentElement = event.currentTarget as HTMLElement;
    this.touchCurrentElement.classList.add('dragging');
  }

  onTouchMove(event: TouchEvent): void {
    if (this.dragIndex < 0 || !this.touchCurrentElement) return;
    event.preventDefault();

    const touchY = event.touches[0].clientY;
    const container = this.touchCurrentElement.parentElement;
    if (!container) return;

    const items = Array.from(container.querySelectorAll('.ficha-edicion'));
    const currentRect = this.touchCurrentElement.getBoundingClientRect();
    const deltaY = touchY - (currentRect.top + currentRect.height / 2);

    // Determinar si se debe intercambiar
    for (let i = 0; i < items.length; i++) {
      if (i === this.dragIndex) continue;
      const rect = (items[i] as HTMLElement).getBoundingClientRect();
      const midY = rect.top + rect.height / 2;

      if (touchY < midY && i < this.dragIndex) {
        this.reordenar(this.dragIndex, i);
        this.dragIndex = i;
        break;
      } else if (touchY > midY && i > this.dragIndex) {
        this.reordenar(this.dragIndex, i);
        this.dragIndex = i;
        break;
      }
    }
  }

  onTouchEnd(event: TouchEvent): void {
    if (this.touchCurrentElement) {
      this.touchCurrentElement.classList.remove('dragging');
    }
    this.dragIndex = -1;
    this.touchCurrentElement = null;
  }

  // HTML5 Drag (desktop)
  onDragStart(event: DragEvent, index: number): void {
    this.dragIndex = index;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
    }
  }

  onDragOver(event: DragEvent, index: number): void {
    event.preventDefault();
    if (this.dragIndex < 0 || this.dragIndex === index) return;
    this.reordenar(this.dragIndex, index);
    this.dragIndex = index;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragIndex = -1;
  }

  onDragEnd(): void {
    this.dragIndex = -1;
  }

  private reordenar(from: number, to: number): void {
    const item = this.actividadesPendientes.splice(from, 1)[0];
    this.actividadesPendientes.splice(to, 0, item);
  }

  // ========================================================================
  // CREAR ACTIVIDAD RÁPIDA
  // ========================================================================

  abrirFormCrear(): void {
    if (!this.sprintActual) {
      Swal.fire('Sin sprint', 'No hay un sprint actual configurado.', 'warning');
      return;
    }
    this.limpiarFormActividad();
    this.mostrarFormCrear = true;
    this.cargarLogrosParaCrear();
  }

  cerrarFormCrear(): void {
    this.mostrarFormCrear = false;
  }

  private limpiarFormActividad(): void {
    this.intentoCrear = false;
    const bloque = this.calificacionContext.getBloqueActual(this.idGrupo, this.idArea);
    const minutosDefault = bloque ? parseInt(bloque.total_minutos) || 45 : 45;
    this.formActividad = {
      titulo: '',
      descripcion: '',
      nivel_uno: '',
      nivel_dos: '',
      minutos_duracion: minutosDefault,
      id_tipo_actividad_academica: '',
      id_ambiente: null,
      indicadores_ids: [],
      indicadores: []
    };
    this.busquedaIndicadorForm = '';
  }

  private cargarLogrosParaCrear(): void {
    if (!this.grupo || !this.area) return;
    this.logrosService.obtenerByGrupoAreaConIndicadores(this.grupo.id, this.area.id_area_academica)
      .subscribe({
        next: (resp: any) => { this.logrosDisponibles = resp.body || []; },
        error: () => { this.logrosDisponibles = []; }
      });
  }

  formActividadValido(): boolean {
    return !!(this.formActividad.titulo.trim() && this.formActividad.id_tipo_actividad_academica);
  }

  formRequiereIndicador(): boolean {
    return this.logrosDisponibles.length > 0 && this.formActividad.indicadores_ids.length === 0;
  }

  sugerirConIA(): void {
    if (!this.formActividad.titulo.trim()) {
      Swal.fire('Título requerido', 'Escribe al menos el título para sugerir.', 'info');
      return;
    }
    this.sugiriendoIA = true;

    const datos = {
      titulo: this.formActividad.titulo,
      descripcion: this.formActividad.descripcion,
      nivel_uno: this.formActividad.nivel_uno,
      nivel_dos: this.formActividad.nivel_dos,
      id_grupo: this.grupo.id,
      id_area: this.area.id_area_academica,
      id_sprint: this.sprintActual.id,
      nombre_grupo: this.grupo.nombre,
      nombre_area: this.area.nombre_area_academica,
      id_tipo_actividad: this.formActividad.id_tipo_actividad_academica,
      ambientes: this.ambientes.map((a: any) => ({ id: a.id, nombre: a.nombre })),
      materiales: []
    };

    this.iaMaquinaService.sugerirIndividual(datos).subscribe({
      next: (resp: any) => {
        this.sugiriendoIA = false;
        if (resp.success && resp.sugerencia) {
          const s = resp.sugerencia;
          if (!this.formActividad.descripcion && s.descripcion) this.formActividad.descripcion = s.descripcion;
          if (!this.formActividad.nivel_uno && s.nivel_uno) this.formActividad.nivel_uno = s.nivel_uno;
          if (!this.formActividad.nivel_dos && s.nivel_dos) this.formActividad.nivel_dos = s.nivel_dos;
          if (s.minutos_duracion && this.formActividad.minutos_duracion === 45) this.formActividad.minutos_duracion = s.minutos_duracion;
          if (s.id_ambiente && !this.formActividad.id_ambiente) this.formActividad.id_ambiente = s.id_ambiente;
          if (s.id_tipo_actividad_academica && !this.formActividad.id_tipo_actividad_academica) {
            this.formActividad.id_tipo_actividad_academica = s.id_tipo_actividad_academica;
          }
          if (s.indicadores_ids && this.formActividad.indicadores_ids.length === 0) {
            this.formActividad.indicadores_ids = s.indicadores_ids;
            this.formActividad.indicadores = s.indicadores || [];
          }
          Swal.fire({ title: '🪄 Sugerencias aplicadas', icon: 'success', timer: 1500, showConfirmButton: false });
        }
      },
      error: () => {
        this.sugiriendoIA = false;
        Swal.fire('Error', 'No se pudo obtener la sugerencia.', 'error');
      }
    });
  }

  toggleIndicadorForm(indicadorId: number): void {
    const idx = this.formActividad.indicadores_ids.indexOf(indicadorId);
    if (idx >= 0) {
      this.formActividad.indicadores_ids.splice(idx, 1);
      this.formActividad.indicadores = this.formActividad.indicadores.filter((ind: any) => ind.id !== indicadorId);
    } else {
      for (const logro of this.logrosDisponibles) {
        for (const ind of logro.indicadores) {
          if (ind.id === indicadorId) {
            this.formActividad.indicadores_ids.push(indicadorId);
            this.formActividad.indicadores.push({ id: ind.id, nombre: ind.nombre, logro_id: logro.id, logro_nombre: logro.nombre });
            return;
          }
        }
      }
    }
  }

  quitarIndicadorForm(indId: number): void {
    this.formActividad.indicadores_ids = this.formActividad.indicadores_ids.filter((id: number) => id !== indId);
    this.formActividad.indicadores = this.formActividad.indicadores.filter((ind: any) => ind.id !== indId);
  }

  indicadorFormCoincideBusqueda(ind: any): boolean {
    const busqueda = (this.busquedaIndicadorForm || '').toLowerCase().trim();
    if (!busqueda) return true;
    return ind.nombre.toLowerCase().includes(busqueda);
  }

  tieneIndicadoresFormFiltrados(logro: any): boolean {
    return logro.indicadores.some((ind: any) => this.indicadorFormCoincideBusqueda(ind));
  }

  crearYCalificar(): void {
    this.intentoCrear = true;
    if (!this.formActividadValido()) {
      Swal.fire('Campos obligatorios', 'Completa el título y selecciona el tipo de actividad.', 'warning');
      return;
    }
    if (this.formRequiereIndicador()) {
      Swal.fire('Indicador requerido', 'Debes asociar al menos un indicador de logro.', 'warning');
      return;
    }

    Swal.fire({
      title: 'Creando actividad...',
      allowOutsideClick: false,
      didOpen: () => { Swal.showLoading(); }
    });

    const payload = {
      id_sprint: this.sprintActual.id,
      id_grupo: this.grupo.id,
      id_area: this.area.id_area_academica,
      es_tarea_adicional: true,
      actividades: [{
        titulo: this.formActividad.titulo,
        descripcion: this.formActividad.descripcion,
        nivel_uno: this.formActividad.nivel_uno,
        nivel_dos: this.formActividad.nivel_dos,
        minutos_duracion: this.formActividad.minutos_duracion,
        id_tipo_actividad_academica: parseInt(this.formActividad.id_tipo_actividad_academica) || null,
        id_ambiente: this.formActividad.id_ambiente ? parseInt(this.formActividad.id_ambiente) : null,
        indicadores_ids: this.formActividad.indicadores_ids,
        materiales: []
      }]
    };

    this.iaMaquinaService.grabarActividades(payload).subscribe({
      next: (resp: any) => {
        if (resp.success && resp.actividades?.length > 0) {
          Swal.close();
          this.mostrarFormCrear = false;
          const actividadCreada = resp.actividades[0];
          const idTarea = actividadCreada.id_tarea_sprint;
          if (idTarea) {
            this.router.navigate([
              '/calificacion/grupo', this.idGrupo,
              'area', this.idArea,
              'actividad', idTarea
            ]);
          }
        } else {
          Swal.fire('Error', resp.error || 'No se pudo crear.', 'error');
        }
      },
      error: () => {
        Swal.fire('Error', 'No se pudo crear la actividad.', 'error');
      }
    });
  }

  getNombreAmbiente(id: any): string {
    const amb = this.ambientes.find((a: any) => a.id == id);
    return amb?.nombre || '';
  }

  getIconoAmbiente(id: any): string {
    const amb = this.ambientes.find((a: any) => a.id == id);
    return amb?.icono || '📍';
  }
}