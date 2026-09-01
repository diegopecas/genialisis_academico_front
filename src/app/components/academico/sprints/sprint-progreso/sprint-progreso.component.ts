import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { firstValueFrom } from 'rxjs';
import { Chart, ChartConfiguration, ChartType, registerables } from 'chart.js';
import { LogrosService } from '../../../../services/logros.service';
import { TareasXSprintsService } from '../../../../services/tareas-x-sprints.service';

Chart.register(...registerables);

interface AnalisisLogrosResponse {
  sprint_id?: string;
  corte_id?: string;
  total_logros: number;
  logros_atendidos: number;
  porcentaje_cobertura: number;
  logros: any[];
}

interface AnalisisAreasResponse {
  sprint_id?: string;
  corte_id?: string;
  total_logros: number;
  total_logros_atendidos: number;
  porcentaje_cobertura: number;
  areas: any[];
}

@Component({
  selector: 'app-sprint-progreso',
  templateUrl: './sprint-progreso.component.html',
  styleUrl: './sprint-progreso.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class SprintProgresoComponent implements OnInit, AfterViewInit, OnChanges, OnDestroy {

  @ViewChild('graficoLogrosUnificado') graficoLogrosUnificadoCanvas!: ElementRef<HTMLCanvasElement>;

  /** Sprint del que se muestra el progreso */
  @Input() idSprint: any = null;
  /** Corte del sprint, necesario para comparar contra todo el corte */
  @Input() idCorteAcademico: any = '';
  @Input() nombreSprint = '';
  /** Listas que carga el contenedor para no pedirlas dos veces */
  @Input() grupos: any[] = [];
  @Input() areas: any[] = [];
  /** Filtros globales del formulario */
  @Input() filtroGrupo = '';
  @Input() filtroArea = '';

  @Output() filtrosChange = new EventEmitter<{ grupo: string, area: string }>();

  public cargando = false;
  private vistaLista = false;

  // Tareas del sprint. Se piden aquí porque las estadísticas por grupo y por
  // área se calculan sobre ellas.
  public todasLasTareas: any[] = [];
  public tareasFiltradas: any[] = [];

  // Datos crudos que devuelve el back. Se piden una sola vez al abrir el tab y
  // de ahí en adelante los filtros se aplican en memoria, sin volver a
  // consultar.
  private datosLogrosSprint: AnalisisLogrosResponse | null = null;
  private datosLogrosCorte: AnalisisLogrosResponse | null = null;
  private datosAreasSprint: AnalisisAreasResponse | null = null;
  private datosAreasCorte: AnalisisAreasResponse | null = null;

  // Estadísticas
  public estadisticas = {
    totalTareas: 0,
    tareasEjecutadas: 0,
    porcentajeGeneral: 0,
    porGrupo: [] as any[],
    porArea: [] as any[],
    logrosAtendidosSprint: [] as any[],
    logrosAtendidosCorte: [] as any[],
    logrosTotales: [] as any[]
  };

  // Gráfico unificado
  private graficoLogrosUnificado: Chart | null = null;

  constructor(
    private logrosService: LogrosService,
    private tareasXSprintsService: TareasXSprintsService
  ) { }

  ngOnInit(): void {
    this.cargarTareas();
    this.cargarAnalisisLogros();
  }

  ngAfterViewInit(): void {
    this.vistaLista = true;
    // Si los datos ya llegaron mientras se armaba la vista, se pinta de una.
    this.refrescarVista();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Cambiar un filtro NO vuelve al back: todo se recalcula en memoria.
    if (changes['filtroGrupo'] || changes['filtroArea']) {
      this.aplicarFiltros();
      this.refrescarVista();
    }
  }

  ngOnDestroy(): void {
    if (this.graficoLogrosUnificado) {
      this.graficoLogrosUnificado.destroy();
      this.graficoLogrosUnificado = null;
    }
  }

  /** Lo llama el contenedor cuando cambian las tareas del sprint */
  recargar() {
    this.cargarTareas();
    this.cargarAnalisisLogros();
  }

  cargarTareas() {
    if (!this.idSprint) {
      return;
    }

    this.cargando = true;
    this.tareasXSprintsService.obtenerBySprintIdDetallado(this.idSprint).subscribe({
      next: (response: any) => {
        const tareas = response.body || [];

        this.todasLasTareas = tareas.map((tarea: any) => ({
          ...tarea,
          estado_nombre: tarea.nombre_estado,
          // El back entrega id_area_academica; se deja también como id_area
          // porque es el nombre que usa el resto del componente.
          id_area: tarea.id_area_academica
        }));

        this.aplicarFiltros();
        this.cargando = false;
      },
      error: (error: any) => {
        console.error('Error obteniendo tareas del sprint:', error);
        this.todasLasTareas = [];
        this.tareasFiltradas = [];
        this.calcularEstadisticas();
        this.cargando = false;
      }
    });
  }

  obtenerNombreGrupo(idGrupo: any): string {
    const grupo = this.grupos.find(g => g.id == idGrupo);
    return grupo ? grupo.nombre : '';
  }

  obtenerNombreArea(idArea: any): string {
    const area = this.areas.find(a => a.id == idArea);
    return area ? area.nombre : '';
  }

  aplicarFiltros() {
    let tareas = [...this.todasLasTareas];

    if (this.filtroGrupo) {
      tareas = tareas.filter(t => t.id_grupo == this.filtroGrupo);
    }

    if (this.filtroArea) {
      tareas = tareas.filter(t => t.id_area == this.filtroArea);
    }

    this.tareasFiltradas = tareas;
    this.calcularEstadisticas();
  }

  calcularEstadisticas() {
    // Se conservan los logros ya cargados; aquí solo se recalcula lo de tareas.
    this.estadisticas.totalTareas = this.tareasFiltradas.length;
    this.estadisticas.tareasEjecutadas = 0;
    this.estadisticas.porcentajeGeneral = 0;
    this.estadisticas.porGrupo = [];
    this.estadisticas.porArea = [];

    if (this.tareasFiltradas.length === 0) {
      return;
    }

    // Calcular tareas ejecutadas
    this.estadisticas.tareasEjecutadas = this.tareasFiltradas.filter(t => t.id_estado_tarea === 2).length;

    // Calcular porcentaje general
    this.estadisticas.porcentajeGeneral = Math.round(
      (this.estadisticas.tareasEjecutadas / this.estadisticas.totalTareas) * 100
    );

    // Calcular estadísticas por grupo
    this.calcularEstadisticasPorGrupo();

    // Calcular estadísticas por área
    this.calcularEstadisticasPorArea();
  }

  private calcularEstadisticasPorGrupo() {
    const estadisticasPorGrupo: { [key: string]: { total: number, ejecutadas: number } } = {};

    this.tareasFiltradas.forEach(tarea => {
      // Cada tarea pertenece a un solo grupo; si no vino el nombre se resuelve
      // con el id.
      const grupo = tarea.nombre_grupo || this.obtenerNombreGrupo(tarea.id_grupo);

      if (!grupo) {
        return;
      }

      if (!estadisticasPorGrupo[grupo]) {
        estadisticasPorGrupo[grupo] = { total: 0, ejecutadas: 0 };
      }
      estadisticasPorGrupo[grupo].total++;
      if (tarea.id_estado_tarea === 2) {
        estadisticasPorGrupo[grupo].ejecutadas++;
      }
    });

    this.estadisticas.porGrupo = Object.keys(estadisticasPorGrupo)
      .map(grupo => ({
        nombre: grupo,
        total: estadisticasPorGrupo[grupo].total,
        ejecutadas: estadisticasPorGrupo[grupo].ejecutadas,
        porcentaje: estadisticasPorGrupo[grupo].total > 0
          ? Math.round((estadisticasPorGrupo[grupo].ejecutadas / estadisticasPorGrupo[grupo].total) * 100)
          : 0
      }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }

  private calcularEstadisticasPorArea() {
    const estadisticasPorArea: { [key: string]: { total: number, ejecutadas: number } } = {};

    this.tareasFiltradas.forEach(tarea => {
      // Cada tarea pertenece a una sola área; si no vino el nombre se resuelve
      // con el id.
      const area = tarea.nombre_area || this.obtenerNombreArea(tarea.id_area);

      if (!area) {
        return;
      }

      if (!estadisticasPorArea[area]) {
        estadisticasPorArea[area] = { total: 0, ejecutadas: 0 };
      }
      estadisticasPorArea[area].total++;
      if (tarea.id_estado_tarea === 2) {
        estadisticasPorArea[area].ejecutadas++;
      }
    });

    this.estadisticas.porArea = Object.keys(estadisticasPorArea)
      .map(area => ({
        nombre: area,
        total: estadisticasPorArea[area].total,
        ejecutadas: estadisticasPorArea[area].ejecutadas,
        porcentaje: estadisticasPorArea[area].total > 0
          ? Math.round((estadisticasPorArea[area].ejecutadas / estadisticasPorArea[area].total) * 100)
          : 0
      }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }

  getClasePorcentaje(porcentaje: number): string {
    if (porcentaje >= 80) return 'alto';
    if (porcentaje >= 50) return 'medio';
    return 'bajo';
  }

  // =========================================================
  // Análisis de logros
  // =========================================================

  /**
   * Única consulta al back de los cuatro análisis. Se llama al abrir el tab y
   * cuando el contenedor avisa que cambiaron las tareas, nunca al filtrar.
   */
  async cargarAnalisisLogros(): Promise<void> {
    if (!this.idSprint || !this.idCorteAcademico) {
      return;
    }

    try {
      const [logrosSprint, logrosCorte, areasSprint, areasCorte] = await Promise.all([
        this.obtenerAnalisisLogrosSprint(),
        this.obtenerAnalisisLogrosCorte(),
        this.obtenerAnalisisPorAreasSprint(),
        this.obtenerAnalisisPorAreasCorte()
      ]);

      this.datosLogrosSprint = logrosSprint;
      this.datosLogrosCorte = logrosCorte;
      this.datosAreasSprint = areasSprint;
      this.datosAreasCorte = areasCorte;

      this.refrescarVista();
    } catch (error) {
      console.error('Error cargando análisis de logros:', error);
    }
  }

  /** Recalcula tarjetas y gráfico desde lo que ya está en memoria */
  private refrescarVista() {
    if (!this.vistaLista) {
      return;
    }
    this.recalcularLogros();
    this.actualizarGraficoUnificado();
  }

  /** Aplica los filtros a los logros ya cargados, sin ir al back */
  private recalcularLogros() {
    const mostrarPorAreas = !this.filtroGrupo && !this.filtroArea;

    if (mostrarPorAreas) {
      // Vista general: los totales salen del análisis por áreas
      if (this.datosAreasSprint && this.datosAreasCorte) {
        const totalLogrosAreas = this.datosAreasSprint.total_logros || 0;
        const atendidosSprint = this.datosAreasSprint.total_logros_atendidos || 0;
        const atendidosCorte = this.datosAreasCorte.total_logros_atendidos || 0;

        this.estadisticas.logrosTotales = Array(totalLogrosAreas).fill({});
        this.estadisticas.logrosAtendidosSprint = Array(atendidosSprint).fill({});
        this.estadisticas.logrosAtendidosCorte = Array(atendidosCorte).fill({});
      }
      return;
    }

    // Vista filtrada: se recortan los logros ya cargados
    const logrosSprint = this.filtrarLogros(this.datosLogrosSprint?.logros || []);
    const logrosCorte = this.filtrarLogros(this.datosLogrosCorte?.logros || []);

    this.estadisticas.logrosTotales = logrosSprint;
    this.estadisticas.logrosAtendidosSprint = logrosSprint.filter((l: any) => l.cantidad_actividades > 0);
    this.estadisticas.logrosAtendidosCorte = logrosCorte.filter((l: any) => l.cantidad_actividades > 0);
  }

  private filtrarLogros(logros: any[]): any[] {
    let resultado = [...logros];

    if (this.filtroGrupo) {
      resultado = resultado.filter((l: any) => l.id_grupo == this.filtroGrupo);
    }

    if (this.filtroArea) {
      resultado = resultado.filter((l: any) => l.id_area_academica == this.filtroArea);
    }

    return resultado;
  }

  async obtenerAnalisisLogrosSprint(): Promise<AnalisisLogrosResponse | null> {
    if (!this.idSprint) {
      return null;
    }

    try {
      const response = await firstValueFrom(
        this.logrosService.obtenerAnalisisPorSprint(this.idSprint)
      );
      return response.body as AnalisisLogrosResponse;
    } catch (error) {
      console.error('Error obteniendo análisis del sprint:', error);
      return null;
    }
  }

  async obtenerAnalisisLogrosCorte(): Promise<AnalisisLogrosResponse | null> {
    if (!this.idCorteAcademico) {
      return null;
    }

    try {
      const response = await firstValueFrom(
        this.logrosService.obtenerAnalisisPorCorte(this.idCorteAcademico)
      );
      return response.body as AnalisisLogrosResponse;
    } catch (error) {
      console.error('Error obteniendo análisis del corte:', error);
      return null;
    }
  }

  async obtenerAnalisisPorAreasSprint(): Promise<AnalisisAreasResponse | null> {
    if (!this.idSprint) {
      return null;
    }

    try {
      const response = await firstValueFrom(
        this.logrosService.obtenerAnalisisPorAreasSprint(this.idSprint)
      );
      return response.body as AnalisisAreasResponse;
    } catch (error) {
      console.error('Error obteniendo análisis por áreas del sprint:', error);
      return null;
    }
  }

  async obtenerAnalisisPorAreasCorte(): Promise<AnalisisAreasResponse | null> {
    if (!this.idCorteAcademico) {
      return null;
    }

    try {
      const response = await firstValueFrom(
        this.logrosService.obtenerAnalisisPorAreasCorte(this.idCorteAcademico)
      );
      return response.body as AnalisisAreasResponse;
    } catch (error) {
      console.error('Error obteniendo análisis por áreas del corte:', error);
      return null;
    }
  }

  /**
   * Repinta el gráfico con los datos que ya están en memoria. Sin filtros
   * muestra el comparativo por áreas; con filtro muestra el detalle por logros.
   */
  actualizarGraficoUnificado() {
    if (!this.graficoLogrosUnificadoCanvas) {
      return;
    }

    const mostrarPorAreas = !this.filtroGrupo && !this.filtroArea;

    if (mostrarPorAreas) {
      if (this.datosAreasSprint && this.datosAreasCorte) {
        this.crearGraficoAreasUnificado(this.datosAreasSprint.areas, this.datosAreasCorte.areas);
      }
      return;
    }

    if (this.datosLogrosSprint && this.datosLogrosCorte) {
      const logrosSprint = this.filtrarLogros(this.datosLogrosSprint.logros || []);
      const logrosCorte = this.filtrarLogros(this.datosLogrosCorte.logros || []);
      this.crearGraficoLogrosUnificado(logrosSprint, logrosCorte);
    }
  }

  private crearGraficoLogrosUnificado(logrosSprint: any[], logrosCorte: any[]) {
    if (logrosSprint.length === 0) {
      if (this.graficoLogrosUnificado) {
        this.graficoLogrosUnificado.destroy();
        this.graficoLogrosUnificado = null;
      }
      return;
    }

    // Crear un mapa para alinear los datos del corte con los del sprint
    const logrosCorteMap = new Map();
    logrosCorte.forEach(logro => {
      logrosCorteMap.set(logro.id, logro);
    });

    // Filtrar solo los logros que existen en ambos conjuntos
    const logrosAlineados = logrosSprint.map(logroSprint => {
      const logroCorte = logrosCorteMap.get(logroSprint.id);
      return {
        sprint: logroSprint,
        corte: logroCorte || { ...logroSprint, cantidad_actividades: 0 }
      };
    });

    // Preparar labels únicos
    const labels = logrosAlineados.map((item: any) => {
      const nombre = item.sprint.nombre;
      return nombre.length > 40 ? nombre.substring(0, 40) + '...' : nombre;
    });

    // Preparar datos alineados
    const datosActividadesSprint = logrosAlineados.map((item: any) => item.sprint.cantidad_actividades);
    const datosActividadesCorte = logrosAlineados.map((item: any) => item.corte.cantidad_actividades);

    const maxActividades = Math.max(
      ...datosActividadesSprint,
      ...datosActividadesCorte,
      5
    );

    const config: ChartConfiguration = {
      type: 'bar' as ChartType,
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Sprint Actual',
            data: datosActividadesSprint,
            backgroundColor: '#d4af37',
            borderColor: '#d4af37',
            borderWidth: 1,
            barThickness: 30,
            order: 2
          },
          {
            label: 'Corte Completo',
            data: datosActividadesCorte,
            backgroundColor: '#adb5bd',
            borderColor: '#adb5bd',
            borderWidth: 1,
            barThickness: 30,
            order: 1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        onClick: (event, elements) => {
          if (elements.length > 0) {
            const index = elements[0].index;
            const logro = logrosAlineados[index].sprint;
            this.mostrarActividadesLogro(logro);
          }
        },
        plugins: {
          title: {
            display: true,
            text: `Análisis Comparativo: ${this.nombreSprint} vs Corte Completo`,
            font: {
              size: 15,
              weight: 'bold'
            }
          },
          legend: {
            display: true,
            position: 'top' as const,
            labels: {
              usePointStyle: true,
              padding: 20
            }
          },
          tooltip: {
            mode: 'index' as const,
            intersect: false,
            callbacks: {
              title: function (tooltipItems) {
                const index = tooltipItems[0].dataIndex;
                return logrosAlineados[index].sprint.nombre;
              },
              label: function (context) {
                const datasetLabel = context.dataset.label;
                const value = context.parsed.y;

                if (datasetLabel === 'Sprint Actual') {
                  return `Sprint: ${value} actividad${value !== 1 ? 'es' : ''}`;
                } else {
                  const logro = logrosAlineados[context.dataIndex].corte;
                  return [
                    `Corte: ${value} asignación${value !== 1 ? 'es' : ''}`,
                    logro.actividades_unicas ? `(${logro.actividades_unicas} únicas)` : ''
                  ].filter(Boolean);
                }
              },
              afterLabel: function (context) {
                if (context.datasetIndex === 0) {
                  const logro = logrosAlineados[context.dataIndex].sprint;
                  return logro.cantidad_actividades === 0 ? '⚠️ Sin actividades en este sprint' : '📋 Click para ver detalle';
                }
                return '';
              }
            }
          }
        },
        scales: {
          x: {
            ticks: {
              autoSkip: false,
              maxRotation: 45,
              minRotation: 45
            }
          },
          y: {
            beginAtZero: true,
            max: maxActividades + 2,
            ticks: {
              stepSize: 1,
              precision: 0
            },
            title: {
              display: true,
              text: 'Número de Actividades'
            }
          }
        },
        interaction: {
          mode: 'index' as const,
          intersect: false
        },
        onHover: (event, activeElements) => {
          (event.native!.target as HTMLElement).style.cursor =
            activeElements.length > 0 ? 'pointer' : 'default';
        }
      }
    };

    if (this.graficoLogrosUnificado) {
      this.graficoLogrosUnificado.destroy();
    }

    const ctx = this.graficoLogrosUnificadoCanvas.nativeElement.getContext('2d');
    if (ctx) {
      this.graficoLogrosUnificado = new Chart(ctx, config);
    }
  }

  private crearGraficoAreasUnificado(areasSprint: any[], areasCorte: any[]) {
    // Crear un mapa para alinear los datos
    const areasCorteMap = new Map();
    areasCorte.forEach(area => {
      areasCorteMap.set(area.id_area, area);
    });

    // Alinear los datos
    const areasAlineadas = areasSprint.map(areaSprint => {
      const areaCorte = areasCorteMap.get(areaSprint.id_area);
      return {
        sprint: areaSprint,
        corte: areaCorte || { ...areaSprint, total_actividades: 0 }
      };
    });

    const labels = areasAlineadas.map((item: any) => item.sprint.nombre_area);
    const datosActividadesSprint = areasAlineadas.map((item: any) => item.sprint.total_actividades);
    const datosActividadesCorte = areasAlineadas.map((item: any) => item.corte.total_actividades);

    const maxActividades = Math.max(
      ...datosActividadesSprint,
      ...datosActividadesCorte,
      10
    );

    const config: ChartConfiguration = {
      type: 'bar' as ChartType,
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Sprint Actual',
            data: datosActividadesSprint,
            backgroundColor: '#d4af37',
            borderColor: '#d4af37',
            borderWidth: 1,
            barThickness: 40,
            order: 2
          },
          {
            label: 'Corte Completo',
            data: datosActividadesCorte,
            backgroundColor: '#adb5bd',
            borderColor: '#adb5bd',
            borderWidth: 1,
            barThickness: 40,
            order: 1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        onClick: (event, elements) => {
          if (elements.length > 0) {
            const index = elements[0].index;
            const area = areasSprint[index];
            this.mostrarDetalleArea(area);
          }
        },
        plugins: {
          title: {
            display: true,
            text: 'Análisis por Áreas Académicas',
            font: {
              size: 15,
              weight: 'bold'
            }
          },
          legend: {
            display: true,
            position: 'top' as const,
            labels: {
              usePointStyle: true,
              padding: 20
            }
          },
          tooltip: {
            mode: 'index' as const,
            intersect: false,
            callbacks: {
              label: function (context) {
                const datasetLabel = context.dataset.label;
                const value = context.parsed.y;
                const index = context.dataIndex;

                if (datasetLabel === 'Sprint Actual') {
                  const area = areasSprint[index];
                  return [
                    `Sprint: ${value} actividades`,
                    `Logros atendidos: ${area.logros_atendidos}/${area.total_logros}`,
                    `Cobertura: ${area.total_logros > 0 ?
                      Math.round((area.logros_atendidos / area.total_logros) * 100) : 0}%`
                  ];
                } else {
                  const area = areasCorte[index];
                  return [
                    `Corte: ${value} actividades`,
                    `Logros atendidos: ${area.logros_atendidos}/${area.total_logros}`
                  ];
                }
              },
              afterLabel: function () {
                return '📊 Click para ver detalle por logros';
              }
            }
          }
        },
        scales: {
          x: {
            ticks: {
              autoSkip: false,
              maxRotation: 45,
              minRotation: 45
            }
          },
          y: {
            beginAtZero: true,
            max: maxActividades + 5,
            ticks: {
              stepSize: 1,
              precision: 0
            },
            title: {
              display: true,
              text: 'Número de Actividades'
            }
          }
        },
        interaction: {
          mode: 'index' as const,
          intersect: false
        },
        onHover: (event, activeElements) => {
          (event.native!.target as HTMLElement).style.cursor =
            activeElements.length > 0 ? 'pointer' : 'default';
        }
      }
    };

    if (this.graficoLogrosUnificado) {
      this.graficoLogrosUnificado.destroy();
    }

    const ctx = this.graficoLogrosUnificadoCanvas.nativeElement.getContext('2d');
    if (ctx) {
      this.graficoLogrosUnificado = new Chart(ctx, config);
    }
  }

  private mostrarDetalleArea(area: any) {
    // El filtro lo aplica el contenedor y baja de nuevo por @Input
    this.filtrosChange.emit({ grupo: this.filtroGrupo, area: area.id_area.toString() });

    Swal.fire({
      title: 'Filtro aplicado',
      text: `Mostrando logros del área: ${area.nombre_area}`,
      icon: 'info',
      timer: 2000,
      showConfirmButton: false
    });
  }

  mostrarActividadesLogro(logro: any) {
    if (logro.cantidad_actividades === 0) {
      Swal.fire({
        title: 'Sin actividades',
        text: `El logro "${logro.nombre}" no tiene actividades asignadas en este sprint.`,
        icon: 'info',
        confirmButtonText: 'Aceptar'
      });
      return;
    }

    this.logrosService.obtenerActividadesDeLogroEnSprint(logro.id, this.idSprint).subscribe({
      next: (response: any) => {
        const data = response.body;
        const actividades = data.actividades || [];

        let html = `<h5>Actividades para: ${logro.nombre}</h5>`;
        html += '<div class="table-responsive"><table class="table table-sm">';
        html += '<thead><tr><th>Actividad</th><th>Duración</th><th>Estado</th></tr></thead><tbody>';

        actividades.forEach((act: any) => {
          html += `<tr>
          <td>${act.titulo}</td>
          <td>${act.minutos_duracion} min</td>
          <td><span class="badge ${act.id_estado_tarea === 2 ? 'bg-success' : 'bg-warning'}">${act.estado_tarea}</span></td>
        </tr>`;
        });

        html += '</tbody></table></div>';

        Swal.fire({
          title: 'Actividades del Logro',
          html: html,
          width: '800px',
          confirmButtonText: 'Cerrar',
          confirmButtonColor: '#d4af37'
        });
      },
      error: (error) => {
        console.error('Error obteniendo actividades:', error);
      }
    });
  }
}