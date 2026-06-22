import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import Swal from 'sweetalert2';
import { HeaderComponent } from '../../../../common/header/header.component';
import { SprintsService } from '../../../../services/sprints.service';
import { TareasXSprintsService } from '../../../../services/tareas-x-sprints.service';
import { GruposService } from '../../../../services/grupos.service';
import { AreasAcademicasService } from '../../../../services/areas-academicas.service';
import { ActividadesAcademicasService } from '../../../../services/actividades-academicas.service';
import { HorariosService } from '../../../../services/horarios.service';
import { LogrosService } from '../../../../services/logros.service';
import { DiasXSprintService } from '../../../../services/dias-x-sprint.service';

@Component({
  selector: 'app-configurar-sprint',
  templateUrl: './configurar-sprint.component.html',
  styleUrl: './configurar-sprint.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent]
})
export class ConfigurarSprintComponent implements OnInit {

  public titulo = "Configurar Sprint";
  public idSprint = "0";
  public sprint: any = null;

  // Listas para selectores
  public grupos: any[] = [];
  public areas: any[] = [];

  // Filtros seleccionados
  public filtroGrupo = "";
  public filtroArea = "";

  // Tareas asignadas al sprint para grupo/área seleccionados
  public tareasAsignadas: any[] = [];
  private tareasOriginales: any[] = [];

  // Actividades disponibles para asignar
  public actividadesDisponibles: any[] = [];
  private todasLasActividades: any[] = [];
  public busquedaActividad = '';
  public busquedaTarea = '';
  public filtroAsignacion: 'todas' | 'con_tareas' | 'sin_tareas' = 'todas';
  public filtroEstadoTarea: 'todas' | 'pendientes' | 'ejecutadas' = 'todas';

  // Control de cambios sin guardar
  public hayCambios = false;
  public guardando = false;

  // Análisis de capacidad del backend
  public capacidad: any = null;

  // Días del sprint (para calcular clases)
  public diasPorSprint: any[] = [];

  // Mapa de logros con actividades vinculadas
  public mapaLogros: any[] = [];
  public busquedaLogro = '';
  public ordenLogros: 'nombre' | 'actividades' = 'nombre';

  // Horarios
  public horariosData: any[] = [];
  public diasSemana = [
    { id: 1, nombre: 'Lunes' },
    { id: 2, nombre: 'Martes' },
    { id: 3, nombre: 'Miércoles' },
    { id: 4, nombre: 'Jueves' },
    { id: 5, nombre: 'Viernes' }
  ];

  // Tab activo en móvil
  public tabMovil: 'tareas' | 'actividades' = 'tareas';

  // Control de drag
  public dragIndex: number | null = null;

  // Loading states
  public cargandoTareas = false;
  public cargandoActividades = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private sprintsService: SprintsService,
    private tareasXSprintsService: TareasXSprintsService,
    private gruposService: GruposService,
    private areasAcademicasService: AreasAcademicasService,
    private actividadesAcademicasService: ActividadesAcademicasService,
    private horariosService: HorariosService,
    private logrosService: LogrosService,
    private diasXSprintService: DiasXSprintService
  ) { }

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.idSprint = params['id'];
      this.cargarDatosIniciales();
    });
  }

  cargarDatosIniciales() {
    forkJoin({
      sprint: this.sprintsService.obtenerById(this.idSprint),
      grupos: this.gruposService.obtenerTodos(),
      areas: this.areasAcademicasService.obtenerTodos(),
      horarios: this.horariosService.obtenerTodos(),
      diasSprint: this.diasXSprintService.obtenerBySprintId(this.idSprint)
    }).subscribe({
      next: (responses: any) => {
        const sprintData = responses.sprint.body;
        this.sprint = Array.isArray(sprintData) ? sprintData[0] : sprintData;
        this.titulo = `Configurar: ${this.sprint.nombre_sprint}`;
        this.grupos = responses.grupos.body || [];
        this.areas = responses.areas.body || [];
        this.horariosData = responses.horarios.body || [];
        this.diasPorSprint = responses.diasSprint.body || [];
      },
      error: (error: any) => {
        console.error("Error cargando datos iniciales:", error);
        Swal.fire({
          title: 'Error',
          text: 'No se pudieron cargar los datos del sprint.',
          icon: 'error',
          confirmButtonText: 'Aceptar',
          confirmButtonColor: '#F5A623'
        }).then(() => {
          this.router.navigate(['/academico/sprints']);
        });
      }
    });
  }

  onFiltroChange() {
    if (this.hayCambios) {
      Swal.fire({
        title: 'Cambios sin guardar',
        text: 'Tiene cambios pendientes. ¿Desea descartarlos?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, descartar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#F5A623',
        cancelButtonColor: '#2C2C2C'
      }).then((result) => {
        if (result.isConfirmed) {
          this.hayCambios = false;
          this.cargarDatosFiltrados();
        }
      });
    } else {
      this.cargarDatosFiltrados();
    }
  }

  private cargarDatosFiltrados() {
    if (this.filtroGrupo && this.filtroArea) {
      this.cargarTareasAsignadas();
      this.cargarActividadesDisponibles();
      this.cargarCapacidad();
      this.cargarMapaLogros();
    } else {
      this.tareasAsignadas = [];
      this.tareasOriginales = [];
      this.actividadesDisponibles = [];
      this.todasLasActividades = [];
      this.capacidad = null;
      this.mapaLogros = [];
      this.hayCambios = false;
    }
  }

  cargarTareasAsignadas() {
    this.cargandoTareas = true;
    this.tareasXSprintsService.obtenerPorSprintGrupoArea(this.idSprint, this.filtroGrupo, this.filtroArea).subscribe({
      next: (response: any) => {
        this.tareasAsignadas = (response.body || []).map((t: any, i: number) => ({
          ...t,
          orden_ejecucion: t.orden_ejecucion || (i + 1)
        }));
        this.tareasOriginales = JSON.parse(JSON.stringify(this.tareasAsignadas));
        this.hayCambios = false;
        this.cargandoTareas = false;
        this.recalcularDisponibles();
      },
      error: (error: any) => {
        console.error("Error cargando tareas asignadas:", error);
        this.tareasAsignadas = [];
        this.tareasOriginales = [];
        this.cargandoTareas = false;
      }
    });
  }

  cargarActividadesDisponibles() {
    this.cargandoActividades = true;

    const params: any = {
      id_corte: this.sprint.id_corte_academico,
      id_grupo: this.filtroGrupo,
      id_area: this.filtroArea
    };

    this.actividadesAcademicasService.obtenerPorFiltros(params).subscribe({
      next: (response: any) => {
        this.todasLasActividades = response.body || [];
        this.recalcularDisponibles();
        this.cargandoActividades = false;
      },
      error: (error: any) => {
        console.error("Error cargando actividades:", error);
        this.todasLasActividades = [];
        this.actividadesDisponibles = [];
        this.cargandoActividades = false;
      }
    });
  }

  // Las disponibles son siempre todas (una actividad puede generar N tareas)
  private recalcularDisponibles() {
    this.actividadesDisponibles = [...this.todasLasActividades];
  }

  // Cuenta cuántas veces una actividad está asignada como tarea
  contarVecesAsignada(idActividad: any): number {
    return this.tareasAsignadas.filter((t: any) => t.id_actividad_academica == idActividad).length;
  }

  cargarCapacidad() {
    this.sprintsService.obtenerAnalisisTiempoSprint(this.idSprint).subscribe({
      next: (response: any) => {
        const analisis = response.body as any;
        if (analisis && analisis.analisis_por_grupo_area) {
          this.capacidad = analisis.analisis_por_grupo_area.find((item: any) =>
            item.id_grupo == this.filtroGrupo && item.id_area == this.filtroArea
          ) || null;
        } else {
          this.capacidad = null;
        }
      },
      error: (error: any) => {
        console.error("Error cargando capacidad:", error);
        this.capacidad = null;
      }
    });
  }

  // Carga el mapa de logros → indicadores → actividades vinculadas
  cargarMapaLogros() {
    this.logrosService.obtenerMapaLogrosActividades(
      this.sprint.id_corte_academico,
      this.filtroArea,
      this.filtroGrupo,
      this.idSprint
    ).subscribe({
      next: (response: any) => {
        const data = response.body as any;
        this.mapaLogros = data?.logros || [];
      },
      error: (error: any) => {
        console.error("Error cargando mapa de logros:", error);
        this.mapaLogros = [];
      }
    });
  }

  // === CÁLCULOS EN TIEMPO REAL SOBRE LOGROS ===

  tareasLocalParaLogro(logro: any): number {
    if (!logro.actividades_ids || logro.actividades_ids.length === 0) {
      return 0;
    }
    return this.tareasAsignadas.filter(t =>
      logro.actividades_ids.includes(t.id_actividad_academica)
    ).length;
  }

  get logrosFiltrados(): any[] {
    let resultado = [...this.mapaLogros];

    if (this.busquedaLogro) {
      const busqueda = this.busquedaLogro.toLowerCase().trim();
      resultado = resultado.filter(l => l.nombre.toLowerCase().includes(busqueda));
    }

    if (this.ordenLogros === 'actividades') {
      resultado.sort((a, b) => this.tareasLocalParaLogro(b) - this.tareasLocalParaLogro(a));
    } else {
      resultado.sort((a, b) => a.nombre.localeCompare(b.nombre));
    }

    return resultado;
  }

  get logrosAtendidosLocal(): number {
    return this.mapaLogros.filter(l => this.tareasLocalParaLogro(l) > 0).length;
  }

  get porcentajeLogros(): number {
    if (this.mapaLogros.length === 0) return 0;
    return Math.round((this.logrosAtendidosLocal / this.mapaLogros.length) * 100);
  }

  // Máximo de tareas en corte entre todos los logros (para barras proporcionales)
  get maxTareasCorte(): number {
    if (this.mapaLogros.length === 0) return 0;
    return Math.max(...this.mapaLogros.map(l => l.tareas_corte || 0), 1);
  }

  // Mostrar resumen de logros atendidos vs no atendidos
  verResumenLogros() {
    const atendidos = this.mapaLogros.filter(l => this.tareasLocalParaLogro(l) > 0);
    const sinAtender = this.mapaLogros.filter(l => this.tareasLocalParaLogro(l) === 0);

    let html = '<div style="text-align: left;">';

    if (atendidos.length > 0) {
      html += `<div style="font-weight: 700; font-size: 0.85rem; color: #155724; margin-bottom: 0.5rem;">
        <i class="fas fa-check-circle me-1"></i> Atendidos (${atendidos.length})
      </div>`;
      atendidos.forEach(l => {
        const tareas = this.tareasLocalParaLogro(l);
        html += `<div style="padding: 0.4rem 0.6rem; margin-bottom: 0.3rem; background: rgba(40,167,69,0.08); border-radius: 0.25rem; border-left: 3px solid #28a745; font-size: 0.85rem;">
          ${l.nombre} <span style="font-weight: 700; color: #28a745; margin-left: 0.3rem;">${tareas} tarea${tareas !== 1 ? 's' : ''}</span>
        </div>`;
      });
    }

    if (sinAtender.length > 0) {
      html += `<div style="font-weight: 700; font-size: 0.85rem; color: #721c24; margin-top: 1rem; margin-bottom: 0.5rem;">
        <i class="fas fa-times-circle me-1"></i> Sin atender (${sinAtender.length})
      </div>`;
      sinAtender.forEach(l => {
        html += `<div style="padding: 0.4rem 0.6rem; margin-bottom: 0.3rem; background: rgba(220,53,69,0.05); border-radius: 0.25rem; border-left: 3px solid #dc3545; font-size: 0.85rem; color: #666;">
          ${l.nombre}
        </div>`;
      });
    }

    html += '</div>';

    Swal.fire({
      title: `Logros: ${atendidos.length} / ${this.mapaLogros.length} atendidos`,
      html: html,
      width: '600px',
      confirmButtonText: 'Cerrar',
      confirmButtonColor: '#F5A623'
    });
  }

  verActividadesLogro(logro: any) {
    const actividadesIds = logro.actividades_ids || [];

    if (actividadesIds.length === 0) {
      Swal.fire({
        title: logro.nombre,
        text: 'Este logro no tiene actividades vinculadas.',
        icon: 'info',
        confirmButtonText: 'Cerrar',
        confirmButtonColor: '#F5A623'
      });
      return;
    }

    const actividades = this.todasLasActividades.filter(a => actividadesIds.includes(a.id));
    const tareasLocal = this.tareasLocalParaLogro(logro);

    let html = `
      <div style="text-align: left;">
        <div style="margin-bottom: 0.75rem; font-size: 0.85rem; color: #666;">
          <strong>${tareasLocal}</strong> tarea${tareasLocal !== 1 ? 's' : ''} en este sprint
          <span style="margin: 0 0.5rem;">|</span>
          <strong>${logro.tareas_corte}</strong> en el corte
        </div>
        <div style="max-height: 350px; overflow-y: auto;">`;

    if (actividades.length > 0) {
      actividades.forEach(act => {
        const vecesEnSprint = this.contarVecesAsignada(act.id);
        html += `
          <div style="padding: 0.6rem; border: 1px solid #eee; border-radius: 0.375rem; margin-bottom: 0.4rem; ${vecesEnSprint > 0 ? 'border-left: 3px solid #F5A623;' : ''}">
            <div style="font-weight: 600; font-size: 0.85rem; color: #2C2C2C;">
              ${act.titulo}
              ${vecesEnSprint > 0 ? `<span style="font-size: 0.7rem; background: rgba(245,166,35,0.2); padding: 0.1rem 0.3rem; border-radius: 0.5rem;">×${vecesEnSprint} en sprint</span>` : ''}
            </div>
            ${act.descripcion ? `<div style="font-size: 0.8rem; color: #666; margin-top: 0.25rem;">${act.descripcion.substring(0, 150)}${act.descripcion.length > 150 ? '...' : ''}</div>` : ''}
          </div>`;
      });
    } else {
      html += `<p style="color: #999; font-style: italic;">Las actividades vinculadas no están en el grupo/área seleccionado.</p>`;
    }

    html += `</div></div>`;

    Swal.fire({
      title: logro.nombre,
      html: html,
      width: '650px',
      confirmButtonText: 'Cerrar',
      confirmButtonColor: '#F5A623'
    });
  }

  // === BARRAS DE CAPACIDAD ===

  get minutosUsadosLocal(): number {
    return this.tareasAsignadas.reduce((sum: number, t: any) => sum + (t.minutos_duracion || 0), 0);
  }

  get minutosDisponibles(): number {
    if (!this.capacidad) return 0;
    return this.capacidad.minutos_disponibles || 0;
  }

  get minutosRestantes(): number {
    return Math.max(0, this.minutosDisponibles - this.minutosUsadosLocal);
  }

  get porcentajeTiempo(): number {
    if (!this.minutosDisponibles) return 0;
    return Math.round((this.minutosUsadosLocal / this.minutosDisponibles) * 100);
  }

  get totalClasesEnSprint(): number {
    if (!this.filtroGrupo || !this.filtroArea || this.diasPorSprint.length === 0) return 0;

    const horariosGrupoArea = this.horariosData.filter(h =>
      h.id_grupo == this.filtroGrupo && h.id_area_academica == this.filtroArea
    );

    let totalClases = 0;
    horariosGrupoArea.forEach(horario => {
      const diaSprint = this.diasPorSprint.find(d => d.id_dia_semana == horario.id_dia_semana);
      if (diaSprint) {
        totalClases += diaSprint.total_dias;
      }
    });

    return totalClases;
  }

  get porcentajeClases(): number {
    if (this.totalClasesEnSprint === 0) return 0;
    return Math.round((this.tareasAsignadas.length / this.totalClasesEnSprint) * 100);
  }

  get clasesRestantes(): number {
    return Math.max(0, this.totalClasesEnSprint - this.tareasAsignadas.length);
  }

  getClaseBarra(porcentaje: number): string {
    if (porcentaje > 100) return 'overflow';
    if (porcentaje >= 90) return 'success';
    if (porcentaje >= 50) return 'warning';
    return 'danger';
  }

  // === FILTROS ===

  get actividadesFiltradas(): any[] {
    let resultado = [...this.actividadesDisponibles];

    if (this.filtroAsignacion === 'con_tareas') {
      resultado = resultado.filter((act: any) => this.contarVecesAsignada(act.id) > 0);
    } else if (this.filtroAsignacion === 'sin_tareas') {
      resultado = resultado.filter((act: any) => this.contarVecesAsignada(act.id) === 0);
    }

    if (this.busquedaActividad) {
      const busqueda = this.busquedaActividad.toLowerCase().trim();
      resultado = resultado.filter((act: any) =>
        act.titulo.toLowerCase().includes(busqueda) ||
        (act.descripcion && act.descripcion.toLowerCase().includes(busqueda))
      );
    }

    return resultado;
  }

  get tareasFiltradas(): any[] {
    let resultado = [...this.tareasAsignadas];

    // Filtro por estado
    if (this.filtroEstadoTarea === 'pendientes') {
      resultado = resultado.filter((t: any) => t.id_estado_tarea == 1);
    } else if (this.filtroEstadoTarea === 'ejecutadas') {
      resultado = resultado.filter((t: any) => t.id_estado_tarea == 2);
    }

    // Filtro por texto
    if (this.busquedaTarea) {
      const busqueda = this.busquedaTarea.toLowerCase().trim();
      resultado = resultado.filter((t: any) =>
        t.titulo_actividad.toLowerCase().includes(busqueda) ||
        (t.descripcion_actividad && t.descripcion_actividad.toLowerCase().includes(busqueda)) ||
        (t.nombre_estado && t.nombre_estado.toLowerCase().includes(busqueda))
      );
    }

    return resultado;
  }

  getIndexReal(tarea: any): number {
    return this.tareasAsignadas.indexOf(tarea);
  }

  // === ACCIONES LOCALES ===

  agregarActividad(actividad: any) {
    const siguienteOrden = this.tareasAsignadas.length + 1;

    const nuevaTarea = {
      id: null,
      id_sprint: this.idSprint,
      id_actividad_academica: actividad.id,
      id_grupo: parseInt(this.filtroGrupo),
      id_area_academica: parseInt(this.filtroArea),
      id_estado_tarea: 1,
      orden_ejecucion: siguienteOrden,
      titulo_actividad: actividad.titulo,
      minutos_duracion: actividad.minutos_duracion,
      nombre_estado: 'Pendiente',
      nombre_tipo_actividad: actividad.nombre_tipo_actividad,
      esferas: actividad.esferas,
      descripcion_actividad: actividad.descripcion,
      nivel_uno: actividad.nivel_uno,
      nivel_dos: actividad.nivel_dos,
      _esNueva: true
    };

    this.tareasAsignadas.push(nuevaTarea);
    this.recalcularDisponibles();
    this.hayCambios = true;
  }

  eliminarTarea(tarea: any, index: number) {
    this.tareasAsignadas.splice(index, 1);
    this.tareasAsignadas.forEach((t, i) => {
      t.orden_ejecucion = i + 1;
    });
    this.recalcularDisponibles();
    this.hayCambios = true;
  }

  moverArriba(index: number) {
    if (index <= 0) return;
    this.intercambiarOrden(index, index - 1);
  }

  moverAbajo(index: number) {
    if (index >= this.tareasAsignadas.length - 1) return;
    this.intercambiarOrden(index, index + 1);
  }

  private intercambiarOrden(indexA: number, indexB: number) {
    [this.tareasAsignadas[indexA], this.tareasAsignadas[indexB]] =
      [this.tareasAsignadas[indexB], this.tareasAsignadas[indexA]];

    this.tareasAsignadas.forEach((t, i) => {
      t.orden_ejecucion = i + 1;
    });

    this.hayCambios = true;
  }

  onDragStart(index: number) {
    this.dragIndex = index;
  }

  onDragOver(event: DragEvent, index: number) {
    event.preventDefault();
  }

  onDrop(event: DragEvent, dropIndex: number) {
    event.preventDefault();
    if (this.dragIndex === null || this.dragIndex === dropIndex) {
      this.dragIndex = null;
      return;
    }

    const item = this.tareasAsignadas.splice(this.dragIndex, 1)[0];
    this.tareasAsignadas.splice(dropIndex, 0, item);

    this.tareasAsignadas.forEach((t, i) => {
      t.orden_ejecucion = i + 1;
    });

    this.dragIndex = null;
    this.hayCambios = true;
  }

  onDragEnd() {
    this.dragIndex = null;
  }

  descartarCambios() {
    this.tareasAsignadas = JSON.parse(JSON.stringify(this.tareasOriginales));
    this.recalcularDisponibles();
    this.hayCambios = false;
  }

  // === GUARDAR ===

  guardarCambios() {
    if (!this.hayCambios) return;

    this.guardando = true;

    const estadoFinal = this.tareasAsignadas.map((t, i) => ({
      id_actividad_academica: t.id_actividad_academica,
      orden_ejecucion: i + 1
    }));

    const body = {
      id_sprint: this.idSprint,
      id_grupo: parseInt(this.filtroGrupo),
      id_area_academica: parseInt(this.filtroArea),
      tareas: estadoFinal
    };

    this.tareasXSprintsService.sincronizarTareas(body).subscribe({
      next: (response: any) => {
        this.guardando = false;
        this.hayCambios = false;

        let mensaje = 'Configuración guardada correctamente.';
        const partes = [];
        if (response.creadas > 0) partes.push(`${response.creadas} agregada${response.creadas > 1 ? 's' : ''}`);
        if (response.eliminadas > 0) partes.push(`${response.eliminadas} eliminada${response.eliminadas > 1 ? 's' : ''}`);
        if (response.ordenes_actualizados > 0) partes.push(`${response.ordenes_actualizados} reordenada${response.ordenes_actualizados > 1 ? 's' : ''}`);
        if (partes.length) mensaje = partes.join(', ') + '.';

        Swal.fire({
          title: 'Cambios guardados',
          text: mensaje,
          icon: 'success',
          confirmButtonText: 'Aceptar',
          confirmButtonColor: '#F5A623'
        });

        this.cargarTareasAsignadas();
        this.cargarCapacidad();
        this.cargarMapaLogros();
      },
      error: (error: any) => {
        this.guardando = false;
        console.error('Error al sincronizar:', error);
        Swal.fire({
          title: 'Error',
          text: 'No se pudieron guardar los cambios. Intente nuevamente.',
          icon: 'error',
          confirmButtonText: 'Aceptar',
          confirmButtonColor: '#F5A623'
        });
      }
    });
  }

  // === HORARIO EN SWAL ===

  verHorarios() {
    const horariosGrupo = this.horariosData.filter(h =>
      h.id_grupo == this.filtroGrupo && h.id_area_academica == this.filtroArea
    );

    if (horariosGrupo.length === 0) {
      Swal.fire({
        title: 'Sin horarios',
        text: 'No hay horarios configurados para este grupo y área.',
        icon: 'info',
        confirmButtonText: 'Cerrar',
        confirmButtonColor: '#F5A623'
      });
      return;
    }

    // Agrupar por día
    const diasConHorario: any[] = [];
    this.diasSemana.forEach(dia => {
      const sesiones = horariosGrupo
        .filter(h => h.id_dia_semana == dia.id)
        .sort((a, b) => a.hora_inicial.localeCompare(b.hora_inicial));
      if (sesiones.length > 0) {
        diasConHorario.push({ ...dia, sesiones });
      }
    });

    let html = '<div style="text-align: left;">';

    diasConHorario.forEach(dia => {
      html += `
        <div style="margin-bottom: 1rem;">
          <div style="font-weight: 700; font-size: 0.9rem; color: #2C2C2C; padding: 0.4rem 0.6rem; background: rgba(245,166,35,0.1); border-left: 3px solid #F5A623; border-radius: 0 0.25rem 0.25rem 0; margin-bottom: 0.4rem;">
            ${dia.nombre}
          </div>`;

      dia.sesiones.forEach((sesion: any) => {
        const horaIni = sesion.hora_inicial.substring(0, 5);
        const horaFin = sesion.hora_final.substring(0, 5);
        const color = this.obtenerColorArea(sesion.id_area_academica);
        const nombreArea = this.obtenerNombreArea(sesion.id_area_academica);

        html += `
          <div style="display: flex; align-items: center; gap: 0.75rem; padding: 0.5rem 0.75rem; margin-bottom: 0.3rem; background: #fff; border-radius: 0.375rem; border-left: 4px solid ${color}; box-shadow: 0 1px 3px rgba(0,0,0,0.06);">
            <div style="min-width: 90px; font-weight: 600; font-size: 0.85rem; color: #4A4A4A;">${horaIni} - ${horaFin}</div>
            <div style="flex: 1; font-weight: 600; font-size: 0.85rem; color: #2C2C2C;">${nombreArea}</div>
            <div style="font-size: 0.8rem; color: #F5A623; font-weight: 700;">${sesion.total_minutos} min</div>
          </div>`;
      });

      html += `</div>`;
    });

    // Resumen total
    const totalMinutosSemana = horariosGrupo.reduce((sum: number, h: any) => sum + h.total_minutos, 0);
    const totalSesiones = horariosGrupo.length;

    html += `
      <div style="margin-top: 0.75rem; padding: 0.6rem; background: #f8f9fa; border-radius: 0.375rem; display: flex; gap: 1.5rem; font-size: 0.85rem;">
        <div><strong>${totalSesiones}</strong> sesiones semanales</div>
        <div><strong>${totalMinutosSemana}</strong> min/semana</div>
        <div><strong>${Math.round(totalMinutosSemana / 60 * 10) / 10}</strong> horas/semana</div>
      </div>`;

    html += '</div>';

    const grupo = this.obtenerNombreGrupo(this.filtroGrupo);
    const area = this.obtenerNombreArea(this.filtroArea);

    Swal.fire({
      title: `Horario: ${grupo}`,
      html: html,
      width: '600px',
      confirmButtonText: 'Cerrar',
      confirmButtonColor: '#2C2C2C'
    });
  }

  // === DETALLE SWAL ===

  verDetalleTarea(tarea: any) {
    const docente = tarea.nombre_docente || 'Sin asignar';
    const fechaEjecucion = tarea.fecha_ejecucion ? this.formatearFechaHora(tarea.fecha_ejecucion) : 'No ejecutada';
    const fechaRegistro = tarea.fecha_registro ? this.formatearFechaHora(tarea.fecha_registro) : '-';

    let html = `
      <div style="text-align: left;">
        <div style="margin-bottom: 1rem; padding: 0.75rem; background: #f8f9fa; border-radius: 0.375rem; border-left: 4px solid #F5A623;">
          <strong style="font-size: 1.05rem;">${tarea.titulo_actividad}</strong>
        </div>
        <table style="width: 100%; font-size: 0.9rem;">
          <tr>
            <td style="padding: 0.35rem 0; color: #666; width: 140px;"><i class="fas fa-sort-numeric-up me-2"></i>Orden</td>
            <td style="padding: 0.35rem 0;"><strong>#${tarea.orden_ejecucion || '-'}</strong></td>
          </tr>
          <tr>
            <td style="padding: 0.35rem 0; color: #666;"><i class="fas fa-clock me-2"></i>Duración</td>
            <td style="padding: 0.35rem 0;">${tarea.minutos_duracion} minutos</td>
          </tr>
          <tr>
            <td style="padding: 0.35rem 0; color: #666;"><i class="fas fa-flag me-2"></i>Estado</td>
            <td style="padding: 0.35rem 0;">
              <span style="padding: 0.2rem 0.5rem; border-radius: 0.25rem; font-size: 0.8rem; font-weight: 600; background: ${tarea.id_estado_tarea == 1 ? 'rgba(255,193,7,0.15); color: #856404' : tarea.id_estado_tarea == 2 ? 'rgba(40,167,69,0.15); color: #155724' : 'rgba(220,53,69,0.1); color: #721c24'};">
                ${tarea.nombre_estado}
              </span>
            </td>
          </tr>
          <tr>
            <td style="padding: 0.35rem 0; color: #666;"><i class="fas fa-chalkboard-teacher me-2"></i>Docente</td>
            <td style="padding: 0.35rem 0;">${docente}</td>
          </tr>
          <tr>
            <td style="padding: 0.35rem 0; color: #666;"><i class="fas fa-calendar-check me-2"></i>Ejecución</td>
            <td style="padding: 0.35rem 0;">${fechaEjecucion}</td>
          </tr>
          <tr>
            <td style="padding: 0.35rem 0; color: #666;"><i class="fas fa-calendar-plus me-2"></i>Registro</td>
            <td style="padding: 0.35rem 0;">${fechaRegistro}</td>
          </tr>
        </table>`;

    if (tarea.descripcion_actividad) {
      html += `
        <div style="margin-top: 1rem; padding: 0.75rem; background: #fff3cd; border-radius: 0.375rem;">
          <strong style="font-size: 0.85rem;"><i class="fas fa-align-left me-1"></i> Descripción</strong>
          <p style="margin: 0.5rem 0 0; font-size: 0.85rem;">${tarea.descripcion_actividad}</p>
        </div>`;
    }

    if (tarea.nivel_uno) {
      html += `<div style="margin-top: 0.5rem; font-size: 0.85rem;"><strong>Nivel 1:</strong> ${tarea.nivel_uno}</div>`;
    }
    if (tarea.nivel_dos) {
      html += `<div style="margin-top: 0.25rem; font-size: 0.85rem;"><strong>Nivel 2:</strong> ${tarea.nivel_dos}</div>`;
    }

    if (tarea.observaciones) {
      html += `
        <div style="margin-top: 1rem; padding: 0.75rem; background: #e8f4f8; border-radius: 0.375rem;">
          <strong style="font-size: 0.85rem;"><i class="fas fa-sticky-note me-1"></i> Observaciones</strong>
          <div style="margin-top: 0.5rem; font-size: 0.85rem; max-height: 120px; overflow-y: auto;">
            ${tarea.observaciones.replace(/\n/g, '<br>')}
          </div>
        </div>`;
    }

    html += `</div>`;

    Swal.fire({
      title: 'Detalle de Tarea',
      html: html,
      width: '600px',
      confirmButtonText: 'Cerrar',
      confirmButtonColor: '#F5A623'
    });
  }

  verDetalleActividad(actividad: any) {
    const vecesAsignada = this.contarVecesAsignada(actividad.id);

    let html = `
      <div style="text-align: left;">
        <div style="margin-bottom: 1rem; padding: 0.75rem; background: #f8f9fa; border-radius: 0.375rem; border-left: 4px solid #2C2C2C;">
          <strong style="font-size: 1.05rem;">${actividad.titulo}</strong>
        </div>
        <table style="width: 100%; font-size: 0.9rem;">
          <tr>
            <td style="padding: 0.35rem 0; color: #666; width: 140px;"><i class="fas fa-clock me-2"></i>Duración</td>
            <td style="padding: 0.35rem 0;">${actividad.minutos_duracion} minutos</td>
          </tr>`;

    if (actividad.nombre_tipo_actividad) {
      html += `<tr><td style="padding: 0.35rem 0; color: #666;"><i class="fas fa-tag me-2"></i>Tipo</td><td style="padding: 0.35rem 0;">${actividad.nombre_tipo_actividad}</td></tr>`;
    }
    if (actividad.esferas) {
      html += `<tr><td style="padding: 0.35rem 0; color: #666;"><i class="fas fa-circle-notch me-2"></i>Esferas</td><td style="padding: 0.35rem 0;">${actividad.esferas}</td></tr>`;
    }
    if (actividad.grados) {
      html += `<tr><td style="padding: 0.35rem 0; color: #666;"><i class="fas fa-graduation-cap me-2"></i>Grados</td><td style="padding: 0.35rem 0;">${actividad.grados}</td></tr>`;
    }

    html += `<tr><td style="padding: 0.35rem 0; color: #666;"><i class="fas fa-tasks me-2"></i>Tareas creadas</td><td style="padding: 0.35rem 0;"><strong>${vecesAsignada}</strong> en este sprint</td></tr>`;
    html += `</table>`;

    if (actividad.descripcion) {
      html += `
        <div style="margin-top: 1rem; padding: 0.75rem; background: #fff3cd; border-radius: 0.375rem;">
          <strong style="font-size: 0.85rem;"><i class="fas fa-align-left me-1"></i> Descripción</strong>
          <p style="margin: 0.5rem 0 0; font-size: 0.85rem;">${actividad.descripcion}</p>
        </div>`;
    }

    if (actividad.nivel_uno) {
      html += `<div style="margin-top: 0.5rem; font-size: 0.85rem;"><strong>Nivel 1:</strong> ${actividad.nivel_uno}</div>`;
    }
    if (actividad.nivel_dos) {
      html += `<div style="margin-top: 0.25rem; font-size: 0.85rem;"><strong>Nivel 2:</strong> ${actividad.nivel_dos}</div>`;
    }

    if (actividad.materiales) {
      html += `
        <div style="margin-top: 1rem; padding: 0.75rem; background: #e8f4f8; border-radius: 0.375rem;">
          <strong style="font-size: 0.85rem;"><i class="fas fa-box me-1"></i> Materiales</strong>
          <p style="margin: 0.5rem 0 0; font-size: 0.85rem;">${actividad.materiales}</p>
        </div>`;
    }

    html += `</div>`;

    Swal.fire({
      title: 'Detalle de Actividad',
      html: html,
      width: '600px',
      confirmButtonText: 'Cerrar',
      confirmButtonColor: '#2C2C2C'
    });
  }

  // === HELPERS ===

  obtenerNombreGrupo(idGrupo: any): string {
    const grupo = this.grupos.find(g => g.id == idGrupo);
    return grupo ? grupo.nombre : '';
  }

  obtenerNombreArea(idArea: any): string {
    const area = this.areas.find(a => a.id == idArea);
    return area ? area.nombre : '';
  }

  formatearFecha(fecha: string): string {
    if (!fecha) return '';
    const f = new Date(fecha);
    return f.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  formatearFechaHora(fecha: string): string {
    if (!fecha) return '';
    const f = new Date(fecha);
    return f.toLocaleString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  obtenerColorArea(idArea: any): string {
    const horario = this.horariosData.find(h => h.id_area_academica == idArea);
    if (horario && horario.area_academica_color) return horario.area_academica_color;
    const area = this.areas.find(a => a.id == idArea);
    return area?.color || '#F5A623';
  }

  // === HORARIOS ===

  public horasDelDia: string[] = [];

  calcularHorasDelDia() {
    const horariosGrupo = this.horariosData.filter(h => h.id_grupo == this.filtroGrupo);

    if (horariosGrupo.length === 0) {
      this.horasDelDia = [];
      return;
    }

    let horaMinima = 24 * 60;
    let horaMaxima = 0;

    horariosGrupo.forEach(horario => {
      const [horaIni, minIni] = horario.hora_inicial.split(':').map(Number);
      const [horaFin, minFin] = horario.hora_final.split(':').map(Number);
      const minutosInicio = horaIni * 60 + minIni;
      const minutosFin = horaFin * 60 + minFin;
      if (minutosInicio < horaMinima) horaMinima = minutosInicio;
      if (minutosFin > horaMaxima) horaMaxima = minutosFin;
    });

    const horas: string[] = [];
    const horaInicioRedondeada = Math.floor(horaMinima / 30) * 30;
    const horaFinRedondeada = Math.ceil(horaMaxima / 30) * 30;

    for (let minutos = horaInicioRedondeada; minutos < horaFinRedondeada; minutos += 30) {
      const hora = Math.floor(minutos / 60);
      const min = minutos % 60;
      horas.push(`${hora.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`);
    }

    this.horasDelDia = horas;
  }

  get horariosGrupoFiltrados(): any[] {
    if (!this.filtroGrupo) return [];
    let horarios = this.horariosData.filter(h => h.id_grupo == this.filtroGrupo);
    if (this.filtroArea) {
      horarios = horarios.filter(h => h.id_area_academica == this.filtroArea);
    }
    return horarios;
  }

  getHorarioInfo(idDia: any, hora: string): any | null {
    const [horaNum, minutosNum] = hora.split(':').map(Number);
    const minutosHoraActual = horaNum * 60 + minutosNum;

    const horario = this.horariosGrupoFiltrados.find(h => {
      if (h.id_dia_semana != idDia) return false;
      const [horaIni, minIni] = h.hora_inicial.split(':').map(Number);
      const [horaFin, minFin] = h.hora_final.split(':').map(Number);
      const minutosInicio = horaIni * 60 + minIni;
      const minutosFin = horaFin * 60 + minFin;
      return minutosHoraActual >= minutosInicio && minutosHoraActual < minutosFin;
    });

    if (horario) {
      const horaInicioFormato = horario.hora_inicial.substring(0, 5);
      const horaFinFormato = horario.hora_final.substring(0, 5);
      const horaActualFormato = `${horaNum.toString().padStart(2, '0')}:${minutosNum.toString().padStart(2, '0')}`;
      const [horaFin, minFin] = horario.hora_final.split(':').map(Number);
      const minutosFin = horaFin * 60 + minFin;
      const siguienteFrama = minutosHoraActual + 30;
      const esUltimaCelda = siguienteFrama >= minutosFin;
      const esInicio = horaActualFormato === horaInicioFormato;

      return {
        ...horario,
        esInicio,
        esFin: esUltimaCelda,
        duracionCompleta: `${horaInicioFormato} - ${horaFinFormato}`,
        esIntermedio: !esInicio && !esUltimaCelda
      };
    }
    return null;
  }

  getDiasActivos(): any[] {
    const horariosGrupo = this.horariosGrupoFiltrados;
    const diasUnicos = [...new Set(horariosGrupo.map(h => h.id_dia_semana))];
    return this.diasSemana.filter(d => diasUnicos.includes(d.id));
  }

  volver() {
    if (this.hayCambios) {
      Swal.fire({
        title: '¿Salir sin guardar?',
        text: 'Tiene cambios pendientes que se perderán.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, salir',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#F5A623',
        cancelButtonColor: '#2C2C2C'
      }).then((result) => {
        if (result.isConfirmed) {
          this.router.navigate(['/academico/sprints']);
        }
      });
    } else {
      this.router.navigate(['/academico/sprints']);
    }
  }
}