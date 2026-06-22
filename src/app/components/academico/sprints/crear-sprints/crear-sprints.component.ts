import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, HostListener } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import Swal from 'sweetalert2';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../../../common/header/header.component';
import { TablasComponent } from '../../../../common/tablas/tablas.component';
import { SprintsService } from '../../../../services/sprints.service';
import { TareasXSprintsService } from '../../../../services/tareas-x-sprints.service';
import { DiasXSprintService } from '../../../../services/dias-x-sprint.service';
import { CalendariosService } from '../../../../services/calendarios.service';
import { CortesAcademicosService } from '../../../../services/cortes-academicos.service';
import { GruposService } from '../../../../services/grupos.service';
import { AreasAcademicasService } from '../../../../services/areas-academicas.service';
import { ActividadesAcademicasService } from '../../../../services/actividades-academicas.service';
import { HorariosService } from '../../../../services/horarios.service';
import { LogrosService } from '../../../../services/logros.service';
import { EstadosTareasService } from '../../../../services/estados-tareas.service';
import { forkJoin, Observable, firstValueFrom } from 'rxjs';
import { Chart, ChartConfiguration, ChartType, registerables } from 'chart.js';

Chart.register(...registerables);

declare var bootstrap: any;

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
  selector: 'app-crear-sprints',
  templateUrl: './crear-sprints.component.html',
  styleUrl: './crear-sprints.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, TablasComponent]
})
export class CrearSprintsComponent implements OnInit, AfterViewInit {
  @ViewChild('graficoLogrosUnificado') graficoLogrosUnificadoCanvas!: ElementRef<HTMLCanvasElement>;

  public titulo = "Configuración de Sprint";
  public id = "0";
  public accion = "";
  public editable = false;
  public nuevo = false;
  public submitted = false;

  // Filtros generales
  public filtroGrupo = "";
  public filtroArea = "";

  // Modal de actividades
  private modalInstance: any = null;
  public actividadesDisponibles: any[] = [];
  public actividadesSeleccionadas: any[] = [];
  public actividadSubmitted = false;
  public actividadesBusqueda = '';
  public filtroGrupoModal = '';
  public filtroAreaModal = '';
  public filtroEsferaModal = '';

  // Gráfico unificado
  private graficoLogrosUnificado: Chart | null = null;

  // Análisis de tiempo
  public analisisTiempo: any = null;

  // Vista de capacidad
  public vistaCapacidad: 'grid' | 'tabla' = 'grid';

  // Listas para combos
  public listas = {
    cortesAcademicos: [] as any[],
    grupos: [] as any[],
    areas: [] as any[],
    estadosTareas: [] as any[],
    esferas: [] as any[]
  }

  // Datos del sprint
  public model = {
    id: 0 as any,
    anio: new Date().getFullYear(),
    numero_sprint: null as any,
    nombre_sprint: "",
    fecha_inicial: "",
    fecha_final: "",
    total_dias_habiles: 0,
    id_corte_academico: "",
    actual: false,
    es_evaluacion: false
  };

  // Días por sprint
  public diasPorSprint: any[] = [];

  // Tareas del sprint
  public tareasDelSprint: any[] = [];
  public todasLasTareas: any[] = [];
  public titulosTareas: any[] = [];

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

  // Horarios para límites
  public horariosData: any[] = [];
  public limitesConfig: any = {};
  
  // Filtrado de áreas en horarios
  public areasSeleccionadasFiltroHorarios: { [key: string]: boolean } = {};

  // Control de capacidad
  public ordenCapacidad = {
    campo: 'porcentaje' as 'porcentaje' | 'grupo' | 'area' | 'actividades',
    direccion: 'desc' as 'asc' | 'desc'
  };
  public itemsCapacidadFiltrados: any[] = [];
  public dropdownOrdenAbierto = false;

  // Modal de horarios
  private modalHorariosInstance: any = null;
  // Modal de horarios

  public accionesTabla = [
    { id: 'cambiar_estado', label: 'Cambiar Estado', icono: '/assets/images/cambio_estado.png' }
  ];
  public diasSemana = [
    { id: 1, nombre: 'Lunes' },
    { id: 2, nombre: 'Martes' },
    { id: 3, nombre: 'Miércoles' },
    { id: 4, nombre: 'Jueves' },
    { id: 5, nombre: 'Viernes' }
  ];
  public horasDelDia: string[] = []; // Se calculará dinámicamente

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private sprintsService: SprintsService,
    private tareasXSprintsService: TareasXSprintsService,
    private diasXSprintService: DiasXSprintService,
    private calendariosService: CalendariosService,
    private cortesAcademicosService: CortesAcademicosService,
    private gruposService: GruposService,
    private areasAcademicasService: AreasAcademicasService,
    private actividadesAcademicasService: ActividadesAcademicasService,
    private horariosService: HorariosService,
    private logrosService: LogrosService,
    private estadosTareasService: EstadosTareasService
  ) { }

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.accion = params['accion'];
      this.id = params['id'];
      console.log("CrearSprintsComponent", this.accion, this.id);

      switch (this.accion) {
        case 'crear':
          this.titulo = "Crear Sprint Académico";
          this.editable = true;
          this.nuevo = true;
          this.consultarListas();
          break;
        case 'editar':
          this.titulo = "Editar Sprint Académico";
          this.editable = true;
          this.nuevo = false;
          this.consultarListas();
          this.obtenerSprint(this.id);
          break;
        case 'consultar':
          this.titulo = "Consultar Sprint Académico";
          this.editable = false;
          this.nuevo = false;
          this.consultarListas();
          this.obtenerSprint(this.id);
          break;
      }
    });
  }

  ngAfterViewInit() {
    if (!this.nuevo) {
      setTimeout(() => {
        this.cargarAnalisisLogros();
        this.actualizarGraficoUnificado();
      }, 500);
    }
  }

  consultarListas() {
    forkJoin({
      cortes: this.cortesAcademicosService.obtenerTodos(),
      grupos: this.gruposService.obtenerTodos(),
      areas: this.areasAcademicasService.obtenerTodos(),
      estados: this.estadosTareasService.obtenerTodos(),
      horarios: this.horariosService.obtenerTodos()
    }).subscribe({
      next: (responses: any) => {
        this.listas.cortesAcademicos = responses.cortes.body || [];
        this.listas.grupos = responses.grupos.body || [];
        this.listas.areas = responses.areas.body || [];
        this.listas.estadosTareas = responses.estados.body || [];
        this.horariosData = responses.horarios.body || [];

        console.log("Listas cargadas:", this.listas);
      },
      error: (error: any) => {
        console.error("Error cargando listas:", error);
      }
    });
  }

  obtenerSprint(id: string) {
    this.sprintsService.obtenerById(id).subscribe({
      next: (response: any) => {
        const sprint = response.body[0];
        this.model = {
          ...sprint,
          actual: sprint.actual === 1,
          es_evaluacion: sprint.es_evaluacion === 1
        };

        if (this.accion === 'editar') {
          this.titulo = `Editar: ${this.model.nombre_sprint}`;
        } else if (this.accion === 'consultar') {
          this.titulo = `Consultar: ${this.model.nombre_sprint}`;
        }

        this.obtenerDiasSprint();
        this.obtenerTareasSprint();
        this.cargarAnalisisTiempo();
      },
      error: (error: any) => {
        console.error("Error obteniendo sprint:", error);
      }
    });
  }

  obtenerDiasSprint() {
    this.diasXSprintService.obtenerBySprintId(this.id).subscribe({
      next: (response: any) => {
        this.diasPorSprint = response.body || [];
        console.log("Días del sprint:", this.diasPorSprint);
      },
      error: (error: any) => {
        console.error("Error obteniendo días del sprint:", error);
      }
    });
  }

  obtenerTareasSprint() {
    this.tareasXSprintsService.obtenerBySprintIdDetallado(this.id).subscribe({
      next: (response: any) => {
        const tareas = response.body || [];

        // Procesar tareas para unificar formato
        this.tareasDelSprint = tareas.map((tarea: any) => ({
          ...tarea,
          estado_nombre: tarea.nombre_estado,
          id_grupo: tarea.ids_grupos && tarea.ids_grupos.length > 0 ? tarea.ids_grupos[0] : null,
          id_area: tarea.ids_areas && tarea.ids_areas.length > 0 ? tarea.ids_areas[0] : null
        }));

        // Guardar copia de todas las tareas sin filtrar
        this.todasLasTareas = [...this.tareasDelSprint];

        // Aplicar filtros globales
        this.aplicarFiltrosGlobales();

        // Crear títulos de la tabla
        this.crearTitulosTareas();

        // Cargar análisis si no es nuevo
        if (!this.nuevo && this.graficoLogrosUnificadoCanvas) {
          setTimeout(() => {
            this.actualizarGraficoUnificado();
          }, 100);
        }

        // Cargar análisis de tiempo
        this.cargarAnalisisTiempo();
      },
      error: (error: any) => {
        console.error('Error obteniendo tareas del sprint:', error);
        Swal.fire({
          title: 'Error',
          text: 'No se pudieron cargar las tareas del sprint.',
          icon: 'error',
          confirmButtonText: 'Aceptar'
        });
        this.tareasDelSprint = [];
        this.todasLasTareas = [];
        this.calcularEstadisticas();
        this.crearTitulosTareas();
      }
    });
  }

  calcularEstadisticas() {
    // Inicializar estadísticas
    this.estadisticas = {
      totalTareas: this.tareasDelSprint.length,
      tareasEjecutadas: 0,
      porcentajeGeneral: 0,
      porGrupo: [],
      porArea: [],
      logrosAtendidosSprint: [],
      logrosAtendidosCorte: [],
      logrosTotales: []
    };

    if (this.tareasDelSprint.length === 0) {
      return;
    }

    // Calcular tareas ejecutadas
    this.estadisticas.tareasEjecutadas = this.tareasDelSprint.filter(t => t.id_estado_tarea === 2).length;

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

    this.tareasDelSprint.forEach(tarea => {
      let gruposParaProcesar: string[] = [];

      // Obtener grupos de diferentes fuentes
      if (tarea.grupos) {
        gruposParaProcesar = tarea.grupos.split(', ').map((g: string) => g.trim());
      } else if (tarea.ids_grupos && tarea.ids_grupos.length > 0) {
        gruposParaProcesar = tarea.ids_grupos.map((id: string) => this.obtenerNombreGrupo(id)).filter(Boolean);
      }

      gruposParaProcesar.forEach((grupo: string) => {
        if (!estadisticasPorGrupo[grupo]) {
          estadisticasPorGrupo[grupo] = { total: 0, ejecutadas: 0 };
        }
        estadisticasPorGrupo[grupo].total++;
        if (tarea.id_estado_tarea === 2) {
          estadisticasPorGrupo[grupo].ejecutadas++;
        }
      });
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

    this.tareasDelSprint.forEach(tarea => {
      let areasParaProcesar: string[] = [];

      // Obtener áreas de diferentes fuentes
      if (tarea.areas) {
        areasParaProcesar = tarea.areas.split(', ').map((a: string) => a.trim());
      } else if (tarea.ids_areas && tarea.ids_areas.length > 0) {
        areasParaProcesar = tarea.ids_areas.map((id: string) => this.obtenerNombreArea(id)).filter(Boolean);
      }

      areasParaProcesar.forEach((area: string) => {
        if (!estadisticasPorArea[area]) {
          estadisticasPorArea[area] = { total: 0, ejecutadas: 0 };
        }
        estadisticasPorArea[area].total++;
        if (tarea.id_estado_tarea === 2) {
          estadisticasPorArea[area].ejecutadas++;
        }
      });
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

  calcularDiasHabiles() {
    if (!this.model.fecha_inicial || !this.model.fecha_final) {
      this.model.total_dias_habiles = 0;
      this.diasPorSprint = [];
      return;
    }

    if (new Date(this.model.fecha_final) < new Date(this.model.fecha_inicial)) {
      this.model.total_dias_habiles = 0;
      this.diasPorSprint = [];
      Swal.fire({
        title: 'Error en fechas',
        text: 'La fecha final debe ser mayor o igual a la fecha inicial',
        icon: 'error',
        confirmButtonText: 'Aceptar'
      });
      return;
    }

    this.calendariosService.obtenerDiasHabiles(this.model.fecha_inicial, this.model.fecha_final).subscribe({
      next: (response: any) => {
        const diasHabiles = response.body || [];
        this.model.total_dias_habiles = diasHabiles.length;

        const diasSemana = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
        const conteo: { [key: string]: number } = {};

        for (let i = 1; i <= 7; i++) {
          conteo[i] = 0;
        }

        diasHabiles.forEach((dia: any) => {
          if (dia.id_dia_semana >= 1 && dia.id_dia_semana <= 7) {
            conteo[dia.id_dia_semana]++;
          }
        });

        this.diasPorSprint = Object.keys(conteo)
          .filter(key => conteo[parseInt(key)] > 0)
          .map(key => ({
            id_dia_semana: parseInt(key),
            nombre_dia: diasSemana[parseInt(key)],
            total_dias: conteo[parseInt(key)]
          }))
          .sort((a, b) => a.id_dia_semana - b.id_dia_semana);

        console.log('Días hábiles calculados:', this.model.total_dias_habiles);
        console.log('Distribución por día:', this.diasPorSprint);

        if (this.model.total_dias_habiles === 0) {
          Swal.fire({
            title: 'Sin días hábiles',
            text: 'El período seleccionado no contiene días hábiles. Por favor, ajuste las fechas.',
            icon: 'warning',
            confirmButtonText: 'Aceptar'
          });
        }
      },
      error: (error: any) => {
        console.error('Error al calcular días hábiles:', error);
        Swal.fire({
          title: 'Error',
          text: 'No se pudo calcular los días hábiles.',
          icon: 'warning',
          confirmButtonText: 'Aceptar'
        });
      }
    });
  }

  async validarReglasSprint(): Promise<boolean> {
    try {
      if (this.model.total_dias_habiles <= 0) {
        Swal.fire({
          title: 'Días hábiles insuficientes',
          text: 'El sprint debe tener al menos 1 día hábil',
          icon: 'error',
          confirmButtonText: 'Aceptar'
        });
        return false;
      }

      const sprintsSolapados = await this.verificarSolapamiento();
      if (sprintsSolapados && sprintsSolapados.length > 0) {
        const nombres = sprintsSolapados.map((s: any) => `<li>${s.nombre_sprint} (${this.formatearFecha(s.fecha_inicial)} - ${this.formatearFecha(s.fecha_final)})</li>`).join('');
        Swal.fire({
          title: 'Error de solapamiento',
          html: `Las fechas se solapan con los siguientes sprints:<br><ul style="text-align: left;">${nombres}</ul>Por favor, ajuste las fechas para evitar conflictos.`,
          icon: 'error',
          confirmButtonText: 'Aceptar'
        });
        return false;
      }

      const existeNumero = await this.verificarNumeroUnico();
      if (existeNumero) {
        Swal.fire({
          title: 'Número de sprint duplicado',
          text: `Ya existe un sprint #${this.model.numero_sprint} en el año ${this.model.anio}`,
          icon: 'error',
          confirmButtonText: 'Aceptar'
        });
        return false;
      }

      if (this.model.es_evaluacion) {
        const existeEvaluacion = await this.verificarSprintEvaluacion();
        if (existeEvaluacion) {
          const result = await Swal.fire({
            title: 'Sprint de evaluación duplicado',
            text: 'Ya existe un sprint de evaluación para este corte académico. ¿Desea continuar de todos modos?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, continuar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#F5A623',
            cancelButtonColor: '#2C2C2C'
          });
          if (!result.isConfirmed) {
            return false;
          }
        }
      }

      const ordenValido = await this.validarOrdenCronologico();
      if (!ordenValido) {
        return false;
      }

      if (this.accion === 'editar' && this.tareasDelSprint.length > 0) {
        const tareasEjecutadas = this.tareasDelSprint.filter(t =>
          t.fecha_ejecucion &&
          (new Date(t.fecha_ejecucion) < new Date(this.model.fecha_inicial) ||
            new Date(t.fecha_ejecucion) > new Date(this.model.fecha_final))
        );

        if (tareasEjecutadas.length > 0) {
          const result = await Swal.fire({
            title: 'Tareas fuera de rango',
            html: `Hay ${tareasEjecutadas.length} tarea(s) ejecutada(s) que quedarían fuera del nuevo rango de fechas.<br>¿Desea continuar?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, continuar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#F5A623',
            cancelButtonColor: '#2C2C2C'
          });
          if (!result.isConfirmed) {
            return false;
          }
        }
      }

      return true;
    } catch (error) {
      console.error('Error en validaciones:', error);
      Swal.fire({
        title: 'Error',
        text: 'Ocurrió un error al validar los datos del sprint',
        icon: 'error',
        confirmButtonText: 'Aceptar'
      });
      return false;
    }
  }

  async verificarSolapamiento(): Promise<any[]> {
    try {
      const response = await firstValueFrom(
        this.sprintsService.verificarSolapamiento(
          this.model.fecha_inicial,
          this.model.fecha_final,
          this.accion === 'editar' ? this.id : undefined
        )
      );
      return (response.body as any[]) || [];
    } catch (error) {
      console.error('Error verificando solapamiento:', error);
      return [];
    }
  }

  async verificarNumeroUnico(): Promise<boolean> {
    try {
      const response = await firstValueFrom(
        this.sprintsService.verificarNumeroUnico(
          this.model.anio,
          this.model.numero_sprint,
          this.accion === 'editar' ? this.id : undefined
        )
      );
      const data = response.body as any;
      return data?.existe || false;
    } catch (error) {
      console.error('Error verificando número único:', error);
      return false;
    }
  }

  async verificarSprintEvaluacion(): Promise<boolean> {
    try {
      const response = await firstValueFrom(
        this.sprintsService.verificarSprintEvaluacion(
          this.model.id_corte_academico,
          this.accion === 'editar' ? this.id : undefined
        )
      );
      const data = response.body as any;
      return data?.existe || false;
    } catch (error) {
      console.error('Error verificando sprint evaluación:', error);
      return false;
    }
  }

  async validarOrdenCronologico(): Promise<boolean> {
    try {
      const response = await firstValueFrom(
        this.sprintsService.obtenerPorAnio(this.model.anio)
      );
      const sprints = (response.body as any[]) || [];

      const otrosSprints = sprints.filter((s: any) =>
        s.id != this.id && s.numero_sprint != this.model.numero_sprint
      );

      for (const sprint of otrosSprints) {
        if (sprint.numero_sprint < this.model.numero_sprint &&
          new Date(sprint.fecha_final) > new Date(this.model.fecha_inicial)) {
          Swal.fire({
            title: 'Orden cronológico incorrecto',
            html: `El Sprint #${this.model.numero_sprint} no puede iniciar antes de que termine el Sprint #${sprint.numero_sprint}<br>
                   Sprint #${sprint.numero_sprint} termina: ${this.formatearFecha(sprint.fecha_final)}`,
            icon: 'error',
            confirmButtonText: 'Aceptar'
          });
          return false;
        }

        if (sprint.numero_sprint > this.model.numero_sprint &&
          new Date(sprint.fecha_inicial) < new Date(this.model.fecha_final)) {
          Swal.fire({
            title: 'Orden cronológico incorrecto',
            html: `El Sprint #${this.model.numero_sprint} no puede terminar después de que inicie el Sprint #${sprint.numero_sprint}<br>
                   Sprint #${sprint.numero_sprint} inicia: ${this.formatearFecha(sprint.fecha_inicial)}`,
            icon: 'error',
            confirmButtonText: 'Aceptar'
          });
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Error validando orden cronológico:', error);
      return true;
    }
  }

  async actualizarSprintActual(): Promise<void> {
    if (this.model.actual) {
      try {
        await firstValueFrom(
          this.sprintsService.desactivarSprintsActuales(
            this.accion === 'editar' ? this.id : undefined
          )
        );
      } catch (error) {
        console.error('Error actualizando sprint actual:', error);
      }
    }
  }

  formatearFecha(fecha: string): string {
    const f = new Date(fecha);
    return f.toLocaleDateString('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  async grabar() {
    this.submitted = true;

    if (!this.formularioValido()) {
      Swal.fire({
        title: 'Formulario incompleto',
        text: 'Por favor complete todos los campos obligatorios.',
        icon: 'warning',
        confirmButtonText: 'Aceptar'
      });
      return;
    }

    const esValido = await this.validarReglasSprint();
    if (!esValido) {
      return;
    }

    Swal.fire({
      title: 'Procesando',
      text: 'Guardando sprint...',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    if (this.model.actual) {
      await this.actualizarSprintActual();
    }

    if (this.accion === "crear") {
      this.sprintsService.crear(this.model).subscribe({
        next: (response: any) => {
          console.log("Sprint creado:", response);
          const idSprint = response.id;

          if (idSprint) {
            this.guardarDiasPorSprint(idSprint);

            Swal.fire({
              title: 'Sprint creado con éxito',
              text: 'El sprint académico ha sido registrado correctamente.',
              icon: "success",
              showCancelButton: false,
              focusConfirm: true,
              confirmButtonText: "Aceptar",
              confirmButtonColor: '#F5A623'
            }).then(() => {
              this.router.navigate(['/academico/sprints/editar/', idSprint]);
            });
          }
        },
        error: (error: any) => {
          console.error("Error creando sprint:", error);
          Swal.fire({
            title: 'Error al crear el sprint',
            text: 'Ha ocurrido un error al intentar crear el sprint.',
            icon: "error",
            confirmButtonText: "Aceptar"
          });
        }
      });
    }

    if (this.accion === "editar") {
      this.sprintsService.actualizar(this.model).subscribe({
        next: (response: any) => {
          console.log("Sprint actualizado:", response);

          this.actualizarDiasPorSprint(this.id);

          Swal.fire({
            title: 'Sprint actualizado con éxito',
            text: 'Los cambios han sido guardados correctamente.',
            icon: "success",
            confirmButtonText: "Aceptar",
            confirmButtonColor: '#F5A623'
          });
        },
        error: (error: any) => {
          console.error("Error actualizando sprint:", error);
          Swal.fire({
            title: 'Error al actualizar el sprint',
            text: 'Ha ocurrido un error al intentar actualizar el sprint.',
            icon: "error",
            confirmButtonText: "Aceptar"
          });
        }
      });
    }
  }

  guardarDiasPorSprint(idSprint: any) {
    this.diasPorSprint.forEach(dia => {
      if (dia.total_dias > 0) {
        const body = {
          id_sprint: idSprint,
          id_dia_semana: dia.id_dia_semana,
          total_dias: dia.total_dias
        };

        this.diasXSprintService.crear(body).subscribe({
          next: (response: any) => {
            console.log(`Día ${dia.nombre_dia} guardado:`, response);
          },
          error: (error: any) => {
            console.error(`Error guardando día ${dia.nombre_dia}:`, error);
          }
        });
      }
    });
  }

  async actualizarDiasPorSprint(idSprint: any) {
    try {
      await firstValueFrom(
        this.diasXSprintService.eliminarPorSprint(idSprint)
      );
      this.guardarDiasPorSprint(idSprint);
    } catch (error) {
      console.error('Error actualizando días del sprint:', error);
    }
  }

  formularioValido(): boolean {
    return !!(
      this.model.anio &&
      this.model.numero_sprint &&
      this.model.nombre_sprint &&
      this.model.fecha_inicial &&
      this.model.fecha_final &&
      this.model.id_corte_academico &&
      this.model.total_dias_habiles > 0
    );
  }

  volver() {
    if (this.editable && this.formularioModificado()) {
      Swal.fire({
        title: '¿Está seguro de salir?',
        text: 'Los cambios no guardados se perderán',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#F5A623',
        cancelButtonColor: '#2C2C2C',
        confirmButtonText: 'Sí, salir',
        cancelButtonText: 'Cancelar'
      }).then((result) => {
        if (result.isConfirmed) {
          this.router.navigate(['academico/sprints/']);
        }
      });
    } else {
      this.router.navigate(['academico/sprints/']);
    }
  }

  formularioModificado(): boolean {
    return !!(
      this.model.numero_sprint ||
      this.model.nombre_sprint ||
      this.model.fecha_inicial ||
      this.model.fecha_final ||
      this.model.id_corte_academico
    );
  }

  abrirModalActividades() {
    if (!this.model.id_corte_academico) {
      Swal.fire({
        title: 'Seleccione un corte académico',
        text: 'Debe seleccionar primero el corte académico del sprint.',
        icon: 'warning',
        confirmButtonText: 'Aceptar'
      });
      return;
    }

    this.actividadSubmitted = false;
    this.actividadesSeleccionadas = [];
    this.actividadesBusqueda = '';
    this.filtroGrupoModal = this.filtroGrupo;
    this.filtroAreaModal = this.filtroArea;
    this.filtroEsferaModal = '';

    this.cargarActividadesDisponibles();

    const modalElement = document.getElementById('modalActividades');
    if (modalElement) {
      this.modalInstance = new bootstrap.Modal(modalElement);
      this.modalInstance.show();
    }
  }

  /**
   * Se ejecuta cuando cambian grupo o área en el modal.
   * Limpia selección y recarga actividades solo si ambos están seleccionados.
   */
  onGrupoAreaModalChange() {
    this.actividadesSeleccionadas = [];
    this.filtroEsferaModal = '';
    this.actividadesBusqueda = '';

    if (this.filtroGrupoModal && this.filtroAreaModal) {
      this.cargarActividadesDisponibles();
    } else {
      this.actividadesDisponibles = [];
    }
  }

  cargarActividadesDisponibles() {
    const params: any = {
      id_corte: this.model.id_corte_academico
    };

    if (this.filtroGrupoModal) {
      params.id_grupo = this.filtroGrupoModal;
    }

    if (this.filtroAreaModal) {
      params.id_area = this.filtroAreaModal;
    }

    if (this.filtroEsferaModal) {
      params.id_esfera = this.filtroEsferaModal;
    }

    this.actividadesAcademicasService.obtenerPorFiltros(params).subscribe({
      next: (response: any) => {
        this.actividadesDisponibles = response.body || [];
        console.log("Actividades disponibles filtradas:", this.actividadesDisponibles);

        const esferasSet = new Set<string>();
        this.actividadesDisponibles.forEach((act: any) => {
          if (act.esferas) {
            act.esferas.split(',').forEach((esfera: string) => {
              esferasSet.add(esfera.trim());
            });
          }
        });

        this.listas.esferas = Array.from(esferasSet).map(nombre => ({
          id: nombre,
          nombre: nombre
        })).sort((a, b) => a.nombre.localeCompare(b.nombre));
      },
      error: (error: any) => {
        console.error("Error cargando actividades:", error);
        this.actividadesAcademicasService.obtenerTodos().subscribe({
          next: (response: any) => {
            this.actividadesDisponibles = response.body || [];
          }
        });
      }
    });
  }

  get actividadesFiltradas() {
    let actividades = [...this.actividadesDisponibles];

    // Filtro por búsqueda de texto
    if (this.actividadesBusqueda) {
      const busqueda = this.actividadesBusqueda.toLowerCase().trim();
      actividades = actividades.filter((act: any) =>
        act.titulo.toLowerCase().includes(busqueda) ||
        (act.descripcion && act.descripcion.toLowerCase().includes(busqueda)) ||
        (act.nivel_uno && act.nivel_uno.toLowerCase().includes(busqueda)) ||
        (act.nivel_dos && act.nivel_dos.toLowerCase().includes(busqueda))
      );
    }

    // Filtro por esfera de desarrollo en el modal
    if (this.filtroEsferaModal) {
      actividades = actividades.filter((act: any) =>
        act.esferas && act.esferas.includes(this.filtroEsferaModal)
      );
    }

    // Ordenar actividades por título
    return actividades.sort((a, b) => a.titulo.localeCompare(b.titulo));
  }

  toggleActividadSeleccion(actividad: any) {
    const index = this.actividadesSeleccionadas.findIndex(a => a.id === actividad.id);
    if (index === -1) {
      this.actividadesSeleccionadas.push(actividad);
    } else {
      this.actividadesSeleccionadas.splice(index, 1);
    }
  }

  isActividadSeleccionada(actividad: any): boolean {
    return this.actividadesSeleccionadas.some(a => a.id === actividad.id);
  }

  cerrarModalActividades() {
    if (this.modalInstance) {
      this.modalInstance.hide();
    }
    this.actividadesSeleccionadas = [];
    this.actividadesBusqueda = '';
  }

  crearTitulosTareas() {
    this.titulosTareas = [
      {
        clave: 'id',
        alias: 'ID',
        alinear: 'centrado',
      },
      {
        clave: 'titulo_actividad',
        alias: 'Actividad',
        alinear: 'izquierda',
      },
      {
        clave: 'minutos_duracion',
        alias: 'Duración (min)',
        alinear: 'centrado',
      },
      {
        clave: 'estado_nombre',
        alias: 'Estado',
        alinear: 'centrado',
      },
      {
        clave: 'observaciones',
        alias: 'Observaciones',
        alinear: 'izquierda',
      },
      {
        clave: 'fecha_ejecucion',
        alias: 'Fecha Ejecución',
        alinear: 'centrado',
      }
    ];
  }

  seleccionarTarea(event: any) {
    console.log("Tarea seleccionada:", event);

    if (event.accion === 'eliminar') {
      this.eliminarTarea(event.id);
    } else if (event.accion === 'cambiar_estado') {
      this.cambiarEstadoTarea(event.id, event.registro);
    }
  }

  eliminarTarea(idTarea: any) {
    Swal.fire({
      title: '¿Está seguro?',
      text: '¿Desea eliminar esta tarea del sprint?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#F5A623',
      cancelButtonColor: '#2C2C2C',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.tareasXSprintsService.eliminar({ id: idTarea }).subscribe({
          next: () => {
            Swal.fire({
              title: 'Eliminada',
              text: 'La tarea ha sido eliminada del sprint.',
              icon: 'success',
              confirmButtonColor: '#F5A623'
            });
            this.obtenerTareasSprint();
            this.cargarAnalisisTiempo(); // Recargar análisis de capacidad

            // Actualizar gráficos de logros
            setTimeout(() => {
              this.cargarAnalisisLogros().then(() => {
                this.actualizarGraficoUnificado();
              });
            }, 300);
          },
          error: (error: any) => {
            console.error('Error al eliminar tarea:', error);
            Swal.fire({
              title: 'Error',
              text: 'No se pudo eliminar la tarea.',
              icon: 'error'
            });
          }
        });
      }
    });
  }

  aplicarFiltrosTareas() {
    if (!this.todasLasTareas || this.todasLasTareas.length === 0) {
      this.tareasDelSprint = [];
      this.calcularEstadisticas();
      return;
    }

    let tareasFiltradas = [...this.todasLasTareas];

    // Filtro por grupo
    if (this.filtroGrupo) {
      const nombreGrupo = this.obtenerNombreGrupo(this.filtroGrupo);
      tareasFiltradas = tareasFiltradas.filter(t =>
        t.id_grupo == this.filtroGrupo ||
        (t.grupos && t.grupos.includes(nombreGrupo)) ||
        (t.ids_grupos && t.ids_grupos.includes(this.filtroGrupo.toString()))
      );
    }

    // Filtro por área
    if (this.filtroArea) {
      const nombreArea = this.obtenerNombreArea(this.filtroArea);
      tareasFiltradas = tareasFiltradas.filter(t =>
        t.id_area == this.filtroArea ||
        (t.areas && t.areas.includes(nombreArea)) ||
        (t.ids_areas && t.ids_areas.includes(this.filtroArea.toString()))
      );
    }

    this.tareasDelSprint = tareasFiltradas;
    this.calcularEstadisticas();
  }

  calcularLimitesActividades() {
    if (!this.filtroGrupo || !this.filtroArea || this.diasPorSprint.length === 0) {
      this.limitesConfig = {};
      return;
    }

    const horariosRelevantes = this.horariosData.filter(h =>
      h.id_grupo == this.filtroGrupo && h.id_area_academica == this.filtroArea
    );

    if (horariosRelevantes.length === 0) {
      this.limitesConfig = {
        mensaje: 'No hay horarios configurados para este grupo y área.',
        limite: 0
      };
      return;
    }

    let totalMinutos = 0;
    horariosRelevantes.forEach(horario => {
      const diasEnSprint = this.diasPorSprint.find(d => d.id_dia_semana === horario.id_dia_semana);
      if (diasEnSprint) {
        totalMinutos += horario.total_minutos * diasEnSprint.total_dias;
      }
    });

    const duracionPromedio = 45;
    const limiteActividades = Math.floor(totalMinutos / duracionPromedio);

    this.limitesConfig = {
      totalMinutos: totalMinutos,
      limiteActividades: limiteActividades,
      mensaje: `Tiempo disponible: ${totalMinutos} minutos (≈ ${limiteActividades} actividades de ${duracionPromedio} min)`
    };

    const actividadesActuales = this.tareasDelSprint.length;
    if (actividadesActuales > limiteActividades) {
      this.limitesConfig.alerta = `¡Atención! Hay ${actividadesActuales} actividades asignadas, superando el límite recomendado de ${limiteActividades}.`;
    }
  }

  getClasePorcentaje(porcentaje: number): string {
    if (porcentaje >= 80) return 'bg-success';
    if (porcentaje >= 50) return 'bg-warning';
    return 'bg-danger';
  }

  // Métodos para el gráfico unificado
  async actualizarGraficoUnificado() {
    if (!this.graficoLogrosUnificadoCanvas) {
      return;
    }

    const mostrarPorAreas = !this.filtroGrupo && !this.filtroArea;

    if (mostrarPorAreas) {
      const [datosSprint, datosCorte] = await Promise.all([
        this.obtenerAnalisisPorAreasSprint(),
        this.obtenerAnalisisPorAreasCorte()
      ]);

      if (datosSprint && datosCorte) {
        // Actualizar estadísticas cuando se muestran áreas
        const totalLogrosAreas = datosSprint.total_logros || 0;
        const logrosAtendidosSprint = datosSprint.total_logros_atendidos || 0;
        const logrosAtendidosCorte = datosCorte.total_logros_atendidos || 0;

        // Si las estadísticas de logros no se han cargado, usar los datos de áreas
        if (this.estadisticas.logrosTotales.length === 0) {
          // Crear un array de logros ficticios basado en el total
          this.estadisticas.logrosTotales = Array(totalLogrosAreas).fill({});
          this.estadisticas.logrosAtendidosSprint = Array(logrosAtendidosSprint).fill({});
          this.estadisticas.logrosAtendidosCorte = Array(logrosAtendidosCorte).fill({});
        }

        this.crearGraficoAreasUnificado(datosSprint.areas, datosCorte.areas);
      }
    } else {
      const [datosSprint, datosCorte] = await Promise.all([
        this.obtenerAnalisisLogrosSprint(),
        this.obtenerAnalisisLogrosCorte()
      ]);

      if (datosSprint && datosCorte) {
        let logrosSprint = datosSprint.logros || [];
        let logrosCorte = datosCorte.logros || [];

        if (this.filtroGrupo) {
          logrosSprint = logrosSprint.filter((l: any) => l.id_grupo == this.filtroGrupo);
          logrosCorte = logrosCorte.filter((l: any) => l.id_grupo == this.filtroGrupo);
        }
        if (this.filtroArea) {
          logrosSprint = logrosSprint.filter((l: any) => l.id_area_academica == this.filtroArea);
          logrosCorte = logrosCorte.filter((l: any) => l.id_area_academica == this.filtroArea);
        }

        this.crearGraficoLogrosUnificado(logrosSprint, logrosCorte);

        this.estadisticas.logrosTotales = logrosSprint;
        this.estadisticas.logrosAtendidosSprint = logrosSprint.filter((l: any) => l.cantidad_actividades > 0);
        this.estadisticas.logrosAtendidosCorte = logrosCorte.filter((l: any) => l.cantidad_actividades > 0);
      }
    }
  }

  private crearGraficoLogrosUnificado(logrosSprint: any[], logrosCorte: any[]) {
    if (logrosSprint.length === 0) {
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
            backgroundColor: '#F5A623',
            borderColor: '#F5A623',
            borderWidth: 1,
            barThickness: 30,
            order: 2
          },
          {
            label: 'Corte Completo',
            data: datosActividadesCorte,
            backgroundColor: '#2C2C2C',
            borderColor: '#2C2C2C',
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
            text: `Análisis Comparativo: ${this.model.nombre_sprint} vs Corte Completo`,
            font: {
              size: 16,
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
            backgroundColor: '#F5A623',
            borderColor: '#F5A623',
            borderWidth: 1,
            barThickness: 40,
            order: 2
          },
          {
            label: 'Corte Completo',
            data: datosActividadesCorte,
            backgroundColor: '#2C2C2C',
            borderColor: '#2C2C2C',
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
              size: 16,
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
    this.filtroArea = area.id_area.toString();
    this.aplicarFiltrosGlobales();

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

    this.logrosService.obtenerActividadesDeLogroEnSprint(logro.id, this.id).subscribe({
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
          confirmButtonText: 'Cerrar'
        });
      },
      error: (error) => {
        console.error('Error obteniendo actividades:', error);
      }
    });
  }

  // Métodos auxiliares para obtener datos
  async obtenerAnalisisLogrosSprint(): Promise<AnalisisLogrosResponse | null> {
    if (!this.id) {
      return null;
    }

    try {
      const response = await firstValueFrom(
        this.logrosService.obtenerAnalisisPorSprint(this.id)
      );
      return response.body as AnalisisLogrosResponse;
    } catch (error) {
      console.error('Error obteniendo análisis del sprint:', error);
      return null;
    }
  }

  async obtenerAnalisisLogrosCorte(): Promise<AnalisisLogrosResponse | null> {
    if (!this.model.id_corte_academico) {
      return null;
    }

    try {
      const response = await firstValueFrom(
        this.logrosService.obtenerAnalisisPorCorte(this.model.id_corte_academico)
      );
      return response.body as AnalisisLogrosResponse;
    } catch (error) {
      console.error('Error obteniendo análisis del corte:', error);
      return null;
    }
  }

  async obtenerAnalisisPorAreasSprint(): Promise<AnalisisAreasResponse | null> {
    if (!this.id) {
      return null;
    }

    try {
      const response = await firstValueFrom(
        this.logrosService.obtenerAnalisisPorAreasSprint(this.id)
      );
      return response.body as AnalisisAreasResponse;
    } catch (error) {
      console.error('Error obteniendo análisis por áreas del sprint:', error);
      return null;
    }
  }

  async obtenerAnalisisPorAreasCorte(): Promise<AnalisisAreasResponse | null> {
    if (!this.model.id_corte_academico) {
      return null;
    }

    try {
      const response = await firstValueFrom(
        this.logrosService.obtenerAnalisisPorAreasCorte(this.model.id_corte_academico)
      );
      return response.body as AnalisisAreasResponse;
    } catch (error) {
      console.error('Error obteniendo análisis por áreas del corte:', error);
      return null;
    }
  }

  obtenerNombreGrupo(idGrupo: any): string {
    const grupo = this.listas.grupos.find(g => g.id == idGrupo);
    return grupo ? grupo.nombre : '';
  }

  obtenerNombreArea(idArea: any): string {
    const area = this.listas.areas.find(a => a.id == idArea);
    return area ? area.nombre : '';
  }

  async cargarAnalisisLogros(): Promise<void> {
    if (!this.id || !this.model.id_corte_academico) {
      return;
    }

    try {
      // Cargar análisis en paralelo
      const [responseSprint, responseCorte] = await Promise.all([
        firstValueFrom(this.logrosService.obtenerAnalisisPorSprint(this.id)),
        firstValueFrom(this.logrosService.obtenerAnalisisPorCorte(this.model.id_corte_academico))
      ]);

      const datosSprint = responseSprint.body as AnalisisLogrosResponse;
      const datosCorte = responseCorte.body as AnalisisLogrosResponse;

      if (datosSprint && datosCorte) {
        // Aplicar filtros a los logros si están activos
        let logrosSprint = datosSprint.logros || [];
        let logrosCorte = datosCorte.logros || [];

        // Filtrar por grupo si está activo
        if (this.filtroGrupo) {
          logrosSprint = logrosSprint.filter((l: any) => l.id_grupo == this.filtroGrupo);
          logrosCorte = logrosCorte.filter((l: any) => l.id_grupo == this.filtroGrupo);
        }

        // Filtrar por área si está activo
        if (this.filtroArea) {
          logrosSprint = logrosSprint.filter((l: any) => l.id_area_academica == this.filtroArea);
          logrosCorte = logrosCorte.filter((l: any) => l.id_area_academica == this.filtroArea);
        }

        // Actualizar estadísticas de logros
        this.estadisticas.logrosTotales = logrosSprint;
        this.estadisticas.logrosAtendidosSprint = logrosSprint.filter((l: any) => l.cantidad_actividades > 0);
        this.estadisticas.logrosAtendidosCorte = logrosCorte.filter((l: any) => l.cantidad_actividades > 0);

        console.log('Análisis de logros cargado (filtrado):', {
          totalLogros: this.estadisticas.logrosTotales.length,
          atendidosSprint: this.estadisticas.logrosAtendidosSprint.length,
          atendidosCorte: this.estadisticas.logrosAtendidosCorte.length,
          filtroGrupo: this.filtroGrupo,
          filtroArea: this.filtroArea
        });
      }
    } catch (error) {
      console.error('Error cargando análisis de logros:', error);
    }
  }

  // Métodos para análisis de tiempo
  cargarAnalisisTiempo() {
    if (!this.id || this.nuevo) {
      return;
    }

    this.sprintsService.obtenerAnalisisTiempoSprint(this.id).subscribe({
      next: (response) => {
        this.analisisTiempo = response.body as any;

        // Aplicar ordenamiento y filtros iniciales
        this.aplicarOrdenamientoCapacidad();

        console.log('Análisis de tiempo cargado:', this.analisisTiempo);

        // Mostrar alerta si hay grupos excedidos
        if (this.analisisTiempo && this.analisisTiempo.resumen.grupos_excedidos.length > 0) {
          this.mostrarAlertaTiempoExcedido();
        }
      },
      error: (error) => {
        console.error('Error cargando análisis de tiempo:', error);
      }
    });
  }

  // Método para cambiar ordenamiento
  cambiarOrdenCapacidad(campo: 'porcentaje' | 'grupo' | 'area' | 'actividades', direccion?: 'asc' | 'desc') {
    if (direccion) {
      this.ordenCapacidad.direccion = direccion;
    } else {
      // Si es el mismo campo, cambiar dirección
      if (this.ordenCapacidad.campo === campo) {
        this.ordenCapacidad.direccion = this.ordenCapacidad.direccion === 'asc' ? 'desc' : 'asc';
      } else {
        // Si es diferente campo, usar dirección por defecto
        this.ordenCapacidad.direccion = campo === 'grupo' || campo === 'area' ? 'asc' : 'desc';
      }
    }

    this.ordenCapacidad.campo = campo;
    this.aplicarOrdenamientoCapacidad();
  }

  // Método para aplicar ordenamiento con filtros globales integrados
  aplicarOrdenamientoCapacidad() {
    if (!this.analisisTiempo || !this.analisisTiempo.analisis_por_grupo_area) {
      this.itemsCapacidadFiltrados = [];
      return;
    }

    let items = [...this.analisisTiempo.analisis_por_grupo_area];

    // Aplicar filtros globales
    if (this.filtroGrupo) {
      const nombreGrupo = this.obtenerNombreGrupo(this.filtroGrupo);
      items = items.filter(item =>
        item.nombre_grupo === nombreGrupo ||
        item.id_grupo == this.filtroGrupo
      );
    }

    if (this.filtroArea) {
      const nombreArea = this.obtenerNombreArea(this.filtroArea);
      items = items.filter(item =>
        item.nombre_area === nombreArea ||
        item.id_area == this.filtroArea
      );
    }

    // Aplicar ordenamiento
    items.sort((a, b) => {
      let valorA, valorB;

      switch (this.ordenCapacidad.campo) {
        case 'porcentaje':
          valorA = a.porcentaje_usado;
          valorB = b.porcentaje_usado;
          break;
        case 'grupo':
          valorA = a.nombre_grupo.toLowerCase();
          valorB = b.nombre_grupo.toLowerCase();
          break;
        case 'area':
          valorA = a.nombre_area.toLowerCase();
          valorB = b.nombre_area.toLowerCase();
          break;
        case 'actividades':
          valorA = a.cantidad_actividades;
          valorB = b.cantidad_actividades;
          break;
        default:
          valorA = a.porcentaje_usado;
          valorB = b.porcentaje_usado;
      }

      if (this.ordenCapacidad.direccion === 'asc') {
        return valorA < valorB ? -1 : valorA > valorB ? 1 : 0;
      } else {
        return valorA > valorB ? -1 : valorA < valorB ? 1 : 0;
      }
    });

    this.itemsCapacidadFiltrados = items;
  }

  // Método para obtener texto del ordenamiento actual
  obtenerTextoOrdenamiento(): string {
    const textos = {
      'porcentaje-desc': 'Mayor uso primero',
      'porcentaje-asc': 'Menor uso primero',
      'grupo-asc': 'Por grupo (A-Z)',
      'grupo-desc': 'Por grupo (Z-A)',
      'area-asc': 'Por área (A-Z)',
      'area-desc': 'Por área (Z-A)',
      'actividades-desc': 'Más actividades primero',
      'actividades-asc': 'Menos actividades primero'
    };

    const clave = `${this.ordenCapacidad.campo}-${this.ordenCapacidad.direccion}`;
    return textos[clave as keyof typeof textos] || 'Ordenar';
  }

  mostrarAlertaTiempoExcedido() {
    if (!this.analisisTiempo) return;

    const gruposExcedidos = this.analisisTiempo.resumen.grupos_excedidos;

    Swal.fire({
      title: 'Tiempo excedido en algunos grupos',
      html: `
     <div class="alert alert-warning">
       <p>Los siguientes grupos/áreas han excedido el tiempo disponible:</p>
       <ul class="text-start">
         ${gruposExcedidos.map((g: string) => `<li>${g}</li>`).join('')}
       </ul>
       <p class="mt-3">Revise la distribución de actividades para estos grupos.</p>
     </div>
   `,
      icon: 'warning',
      confirmButtonText: 'Entendido',
      confirmButtonColor: '#F5A623'
    });
  }

  async validarActividadAnteDeAsociar(actividad: any): Promise<boolean> {
    try {
      const response = await firstValueFrom(
        this.sprintsService.validarActividadEnSprint(this.id, actividad.id)
      );

      const validacion: any = response.body;

      if (!validacion || !validacion.puede_agregar) {
        // Mostrar detalle de por qué no se puede agregar
        await this.mostrarDetalleValidacion(validacion);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error validando actividad:', error);
      return true; // En caso de error, permitir continuar
    }
  }

  async mostrarDetalleValidacion(validacion: any) {
    if (!validacion) {
      return;
    }

    let htmlDetalle = `
    <div class="validation-detail">
      <div class="alert alert-info mb-3">
        <h6 class="mb-2"><i class="fas fa-tasks me-2"></i>${validacion.actividad.titulo}</h6>
        <p class="mb-0">
          <i class="fas fa-clock me-1"></i>Duración: ${validacion.actividad.minutos_duracion} minutos
        </p>
      </div>
      
      <h6>Análisis de Impacto por Grupo/Área:</h6>
      <div class="table-responsive">
        <table class="table table-sm table-striped">
          <thead class="table-dark">
            <tr>
              <th>Grupo</th>
              <th>Área</th>
              <th>Actual</th>
              <th>Después</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
  `;

    validacion.validaciones.forEach((v: any) => {
      const statusClass = v.excederia ? 'table-danger' : 'table-success';
      const statusIcon = v.excederia ? '❌' : '✅';
      const statusText = v.excederia ? 'Excedería' : 'OK';

      htmlDetalle += `
      <tr class="${statusClass}">
        <td><strong>${v.grupo}</strong></td>
        <td>${v.area}</td>
        <td>
          ${v.minutos_usados_actual} min<br>
          <small>(${v.porcentaje_actual}%)</small>
        </td>
        <td>
          ${v.minutos_usados_despues} min<br>
          <small>(${v.porcentaje_despues}%)</small>
        </td>
        <td>${statusIcon} ${statusText}</td>
      </tr>
    `;
    });

    htmlDetalle += `
          </tbody>
        </table>
      </div>
  `;

    if (validacion.mensajes.length > 0) {
      htmlDetalle += `
      <div class="alert alert-danger mt-3">
        <h6><i class="fas fa-exclamation-triangle me-2"></i>Problemas Encontrados:</h6>
        <ul class="mb-0">
          ${validacion.mensajes.map((m: string) => `<li>${m}</li>`).join('')}
        </ul>
      </div>
    `;
    }

    htmlDetalle += `</div>`;

    await Swal.fire({
      title: validacion.puede_agregar ? 'Validación Exitosa' : 'Validación Fallida',
      html: htmlDetalle,
      icon: validacion.puede_agregar ? 'success' : 'error',
      width: '900px',
      confirmButtonText: 'Entendido',
      confirmButtonColor: '#F5A623',
      customClass: {
        htmlContainer: 'text-start'
      }
    });
  }

  // Actualizar el método asociarActividades
  async asociarActividades() {
    this.actividadSubmitted = true;

    if (this.actividadesSeleccionadas.length === 0) {
      return;
    }

    // Validar cada actividad antes de asociar
    const actividadesValidas: any[] = [];
    const actividadesInvalidas: any[] = [];

    for (const actividad of this.actividadesSeleccionadas) {
      const esValida = await this.validarActividadAnteDeAsociar(actividad);
      if (esValida) {
        actividadesValidas.push(actividad);
      } else {
        actividadesInvalidas.push(actividad);
      }
    }

    if (actividadesInvalidas.length > 0) {
      const continuar = await Swal.fire({
        title: 'Algunas actividades exceden el tiempo',
        html: `
        <p>${actividadesInvalidas.length} actividad(es) excederían el tiempo disponible.</p>
        <p>¿Desea continuar solo con las ${actividadesValidas.length} actividad(es) válidas?</p>
      `,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, continuar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#F5A623',
        cancelButtonColor: '#2C2C2C'
      });

      if (!continuar.isConfirmed || actividadesValidas.length === 0) {
        return;
      }
    }

    const totalActividades = actividadesValidas.length;

    Swal.fire({
      title: 'Asociando actividades',
      html: `Procesando ${totalActividades} actividad${totalActividades > 1 ? 'es' : ''}...`,
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    const observables = actividadesValidas.map(actividad => {
      const body = {
        id_sprint: this.id,
        id_actividad_academica: actividad.id,
        id_grupo: parseInt(this.filtroGrupoModal),
        id_area_academica: parseInt(this.filtroAreaModal),
        id_estado_tarea: 1,
        id_docente: null,
        fecha_ejecucion: null,
        fecha_registro: new Date().toISOString()
      };

      return this.tareasXSprintsService.crear(body);
    });

    forkJoin(observables).subscribe({
      next: (results) => {
        const asociadas = results.filter(r => r && r.id).length;
        const errores = totalActividades - asociadas;

        let mensaje = '';
        let icon: any = 'success';

        if (asociadas === totalActividades) {
          mensaje = `${asociadas} actividad${asociadas > 1 ? 'es asociadas' : ' asociada'} correctamente.`;
        } else {
          icon = 'warning';
          mensaje = `Proceso completado:<br>`;
          if (asociadas > 0) mensaje += `✓ ${asociadas} actividad${asociadas > 1 ? 'es asociadas' : ' asociada'}<br>`;
          if (errores > 0) mensaje += `✗ ${errores} error${errores > 1 ? 'es' : ''}`;
        }

        if (actividadesInvalidas.length > 0) {
          mensaje += `<br><br>⚠️ ${actividadesInvalidas.length} actividad${actividadesInvalidas.length > 1 ? 'es' : ''} no ${actividadesInvalidas.length > 1 ? 'fueron asociadas' : 'fue asociada'} por exceder el tiempo disponible.`;
        }

        Swal.fire({
          title: 'Proceso completado',
          html: mensaje,
          icon: icon,
          confirmButtonText: 'Aceptar',
          confirmButtonColor: '#F5A623'
        }).then(() => {
          this.cerrarModalActividades();
          this.obtenerTareasSprint();
          this.cargarAnalisisTiempo(); // Recargar análisis de capacidad

          // Actualizar gráficos de logros y capacidad
          setTimeout(() => {
            this.cargarAnalisisLogros().then(() => {
              this.actualizarGraficoUnificado();
            });
          }, 500);
        });
      },
      error: (error) => {
        console.error('Error al asociar actividades:', error);
        Swal.fire({
          title: 'Error',
          text: 'Ocurrió un error al asociar las actividades.',
          icon: 'error',
          confirmButtonText: 'Aceptar'
        }).then(() => {
          this.cerrarModalActividades();
        });
      }
    });
  }

  // Nuevos métodos para la visualización de capacidad
  cambiarVistaCapacidad(vista: 'grid' | 'tabla') {
    this.vistaCapacidad = vista;
  }

  verDetalleGrupoArea(item: any) {
    // Aplicar filtros automáticamente
    this.filtroGrupo = this.listas.grupos.find((g: any) => g.nombre === item.nombre_grupo)?.id || '';
    this.filtroArea = this.listas.areas.find((a: any) => a.nombre === item.nombre_area)?.id || '';

    // Aplicar filtros y actualizar vista
    this.aplicarFiltrosGlobales();

    // Mostrar mensaje con detalle
    Swal.fire({
      title: 'Detalle de Capacidad',
      html: `
       <div class="text-start">
         <p><strong>Grupo:</strong> ${item.nombre_grupo}</p>
         <p><strong>Área:</strong> ${item.nombre_area}</p>
         <hr>
         <div class="row">
           <div class="col-6">
             <p><strong>Tiempo disponible:</strong></p>
             <p>${item.horas_disponibles} horas (${item.minutos_disponibles} minutos)</p>
           </div>
           <div class="col-6">
             <p><strong>Tiempo usado:</strong></p>
             <p>${item.horas_usadas} horas (${item.minutos_usados} minutos)</p>
           </div>
         </div>
         <div class="progress mt-3" style="height: 30px;">
           <div class="progress-bar ${item.porcentaje_usado <= 70 ? 'bg-success' : item.porcentaje_usado <= 90 ? 'bg-warning' : 'bg-danger'}" 
                style="width: ${item.porcentaje_usado > 100 ? 100 : item.porcentaje_usado}%">
             ${item.porcentaje_usado}%
           </div>
         </div>
         <p class="mt-3">
           <strong>Actividades asignadas:</strong> ${item.cantidad_actividades}<br>
           <strong>Tiempo restante:</strong> ${item.minutos_restantes > 0 ? item.minutos_restantes + ' minutos' : 'Sin tiempo disponible'}
         </p>
         ${item.excedido ? '<div class="alert alert-danger mt-3 mb-0"><i class="fas fa-exclamation-triangle me-2"></i>Esta combinación ha excedido el tiempo disponible</div>' : ''}
       </div>
     `,
      icon: 'info',
      confirmButtonText: 'Ver actividades',
      confirmButtonColor: '#F5A623',
      showCancelButton: true,
      cancelButtonText: 'Cerrar',
      cancelButtonColor: '#6c757d'
    }).then((result) => {
      if (!result.isConfirmed) {
        // Si cancela, limpiar filtros
        this.filtroGrupo = '';
        this.filtroArea = '';
        this.aplicarFiltrosGlobales();
      }
    });
  }

  toggleDropdownOrden() {
    this.dropdownOrdenAbierto = !this.dropdownOrdenAbierto;
  }

  // Cerrar dropdown al hacer clic fuera
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const dropdownElement = document.querySelector('.dropdown');
    if (dropdownElement && !dropdownElement.contains(event.target as Node)) {
      this.dropdownOrdenAbierto = false;
    }
  }

  /**
   * Método unificado para aplicar filtros globales
   * Este método centraliza la funcionalidad de filtros y se integra con la capacidad
   */
  aplicarFiltrosGlobales() {
    // Aplicar filtros a las tareas
    this.aplicarFiltrosTareas();

    // Recalcular límites de configuración
    this.calcularLimitesActividades();

    // Aplicar filtros a la capacidad también
    this.aplicarOrdenamientoCapacidad();

    // Recargar análisis de logros si no es nuevo
    if (!this.nuevo) {
      this.cargarAnalisisLogros().then(() => {
        this.actualizarGraficoUnificado();
      });
    }

    console.log('Filtros globales aplicados:', {
      grupo: this.filtroGrupo,
      area: this.filtroArea,
      tareasVisibles: this.tareasDelSprint.length,
      capacidadFiltrada: this.itemsCapacidadFiltrados.length
    });
  }

  // Métodos para modal de horarios
  abrirModalHorarios() {
    // Calcular horas dinámicamente antes de abrir el modal
    this.calcularHorasDelDia();
    
    // Inicializar filtros para todos los grupos
    this.listas.grupos.forEach((grupo: any) => {
      this.inicializarFiltroAreasHorarios(grupo.id);
    });

    const modalElement = document.getElementById('modalHorarios');
    if (modalElement) {
      this.modalHorariosInstance = new bootstrap.Modal(modalElement);
      this.modalHorariosInstance.show();
    }
  }
  calcularHorasDelDia() {
    if (this.horariosData.length === 0) {
      // Si no hay datos, usar horario escolar típico
      this.horasDelDia = ['7:00', '8:00', '9:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'];
      return;
    }

    // Encontrar la hora mínima y máxima de todos los horarios
    let horaMinima = 24 * 60; // minutos desde medianoche
    let horaMaxima = 0;

    this.horariosData.forEach(horario => {
      // Hora inicial
      const [horaIni, minIni] = horario.hora_inicial.split(':').map(Number);
      const minutosInicio = horaIni * 60 + minIni;

      // Hora final
      const [horaFin, minFin] = horario.hora_final.split(':').map(Number);
      const minutosFin = horaFin * 60 + minFin;

      if (minutosInicio < horaMinima) horaMinima = minutosInicio;
      if (minutosFin > horaMaxima) horaMaxima = minutosFin;
    });

    // Generar array de horas cada 30 minutos desde la mínima hasta la máxima
    const horas: string[] = [];

    // Redondear hacia abajo la hora mínima a la media hora más cercana
    const horaInicioRedondeada = Math.floor(horaMinima / 30) * 30;

    // Redondear hacia arriba la hora máxima a la media hora más cercana  
    const horaFinRedondeada = Math.ceil(horaMaxima / 30) * 30;

    for (let minutos = horaInicioRedondeada; minutos < horaFinRedondeada; minutos += 30) {
      const hora = Math.floor(minutos / 60);
      const min = minutos % 60;
      const horaFormateada = `${hora.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
      horas.push(horaFormateada);
    }

    this.horasDelDia = horas;

    console.log('Horas calculadas dinámicamente:', {
      horaMinima: `${Math.floor(horaMinima / 60)}:${(horaMinima % 60).toString().padStart(2, '0')}`,
      horaMaxima: `${Math.floor(horaMaxima / 60)}:${(horaMaxima % 60).toString().padStart(2, '0')}`,
      horasGeneradas: this.horasDelDia
    });
  }
  obtenerDiasGrupo(idGrupo: any): any[] {
    const horariosGrupo = this.horariosData.filter(h => h.id_grupo == idGrupo);
    const diasUnicos = [...new Set(horariosGrupo.map(h => h.id_dia_semana))];
    return this.diasSemana.filter(d => diasUnicos.includes(d.id));
  }

  obtenerTotalHorasGrupo(idGrupo: any): number {
    const horariosGrupo = this.horariosData.filter(h => h.id_grupo == idGrupo);
    const totalMinutos = horariosGrupo.reduce((total, h) => total + h.total_minutos, 0);
    return Math.round(totalMinutos / 60 * 10) / 10; // Redondear a 1 decimal
  }

  getHorarioInfo(idGrupo: any, idDia: any, hora: string): any | null {
    // Convertir hora a minutos para comparar
    const [horaNum, minutosNum] = hora.split(':').map(Number);
    const minutosHoraActual = horaNum * 60 + minutosNum;

    // Buscar el horario que incluya esta hora y esté en el filtro
    const horario = this.horariosFiltradosPorArea.find(h => {
      if (h.id_grupo != idGrupo || h.id_dia_semana != idDia) {
        return false;
      }

      // Convertir horas de BD a minutos
      const [horaIni, minIni] = h.hora_inicial.split(':').map(Number);
      const [horaFin, minFin] = h.hora_final.split(':').map(Number);

      const minutosInicio = horaIni * 60 + minIni;
      const minutosFin = horaFin * 60 + minFin;

      return minutosHoraActual >= minutosInicio && minutosHoraActual < minutosFin;
    });

    if (horario) {
      // Crear formato simple para comparar
      const horaInicioFormato = horario.hora_inicial.substring(0, 5); // "08:00:00" -> "08:00"
      const horaFinFormato = horario.hora_final.substring(0, 5);

      // Convertir hora actual a formato similar
      const horaActualFormato = `${horaNum.toString().padStart(2, '0')}:${minutosNum.toString().padStart(2, '0')}`;

      const [horaFin, minFin] = horario.hora_final.split(':').map(Number);
      const minutosFin = horaFin * 60 + minFin;
      
      // La última celda es cuando la siguiente franja horaria (30 min después) alcanza o supera la hora final
      const siguienteFrama = minutosHoraActual + 30;
      const esUltimaCelda = siguienteFrama >= minutosFin;

      const esInicio = horaActualFormato === horaInicioFormato;

      console.log(`Comparando: ${horaActualFormato} === ${horaInicioFormato} = ${esInicio}`);

      return {
        ...horario,
        esInicio: esInicio,
        esFin: esUltimaCelda,
        duracionCompleta: `${horaInicioFormato} - ${horaFinFormato}`,
        esIntermedio: !esInicio && !esUltimaCelda
      };
    }

    return null;
  }

  getClaseHorario(idGrupo: any, idDia: any, hora: string): string {
    const horarioInfo = this.getHorarioInfo(idGrupo, idDia, hora);
    return horarioInfo ? 'tiene-horario' : 'sin-horario';
  }

  obtenerColorArea(idArea: any): string {
    // Primero buscar en los horarios cargados
    const horario = this.horariosData.find(h => h.id_area_academica == idArea);
    if (horario && horario.area_academica_color) {
      return horario.area_academica_color;
    }
    
    // Si no está en horarios, buscar en la lista de áreas
    const area = this.listas.areas.find(a => a.id == idArea);
    return area?.color || '#FFFFFF';
  }

  inicializarFiltroAreasHorarios(idGrupo: any) {
    // Por defecto, todas las áreas del grupo están seleccionadas
    const areasDelGrupo = this.getAreasDelGrupo(idGrupo);
    areasDelGrupo.forEach((area: any) => {
      this.areasSeleccionadasFiltroHorarios[area.id] = true;
    });
  }

  toggleAreaFiltroHorario(idArea: string) {
    this.areasSeleccionadasFiltroHorarios[idArea] = !this.areasSeleccionadasFiltroHorarios[idArea];
  }

  get horariosFiltradosPorArea(): any[] {
    return this.horariosData.filter(h => this.areasSeleccionadasFiltroHorarios[h.id_area_academica]);
  }

  diasActivosGrupo(idGrupo: any): number {
    const horariosGrupo = this.horariosFiltradosPorArea.filter(h => h.id_grupo == idGrupo);
    const diasUnicos = new Set(horariosGrupo.map(h => h.id_dia_semana));
    return diasUnicos.size;
  }

  horasSemanalesGrupo(idGrupo: any): number {
    const horariosGrupo = this.horariosFiltradosPorArea.filter(h => h.id_grupo == idGrupo);
    const totalMinutos = horariosGrupo.reduce((total, h) => total + h.total_minutos, 0);
    return Math.round(totalMinutos / 60 * 10) / 10;
  }

  calcularPorcentajeUsoHorario(idGrupo: any, idArea: any): number {
    if (!this.analisisTiempo || !this.analisisTiempo.analisis_por_grupo_area) {
      return 0;
    }

    const analisis = this.analisisTiempo.analisis_por_grupo_area.find((item: any) =>
      item.id_grupo == idGrupo && item.id_area == idArea
    );

    return analisis ? Math.round(analisis.porcentaje_usado) : 0;
  }

  getClaseProgresoHorario(porcentaje: number): string {
    if (porcentaje >= 80) return 'bg-success-mini';
    if (porcentaje >= 50) return 'bg-warning-mini';
    return 'bg-danger-mini';
  }

  getTooltipHorario(horarioInfo: any): string {
    const area = this.obtenerNombreArea(horarioInfo.id_area_academica);
    const porcentaje = this.calcularPorcentajeUsoHorario(horarioInfo.id_grupo, horarioInfo.id_area_academica);
    return `${area} - ${horarioInfo.total_minutos} minutos - ${porcentaje}% usado`;
  }

  mostrarDetalleHorario(horarioInfo: any) {
    const area = this.obtenerNombreArea(horarioInfo.id_area_academica);
    const grupo = this.obtenerNombreGrupo(horarioInfo.id_grupo);
    const porcentaje = this.calcularPorcentajeUsoHorario(horarioInfo.id_grupo, horarioInfo.id_area_academica);

    Swal.fire({
      title: 'Detalle de Horario',
      html: `
        <div class="text-start">
          <p><strong>Grupo:</strong> ${grupo}</p>
          <p><strong>Área:</strong> ${area}</p>
          <p><strong>Duración:</strong> ${horarioInfo.total_minutos} minutos</p>
          <p><strong>Uso en el sprint:</strong> ${porcentaje}%</p>
          <div class="progress mt-2" style="height: 20px;">
            <div class="progress-bar ${this.getClaseProgresoHorario(porcentaje).replace('-mini', '')}" 
                 style="width: ${porcentaje}%">
              ${porcentaje}%
            </div>
          </div>
        </div>
      `,
      icon: 'info',
      confirmButtonText: 'Cerrar',
      confirmButtonColor: '#F5A623'
    });
  }

  getAreasDelGrupo(idGrupo: any): any[] {
    const horariosGrupo = this.horariosData.filter(h => h.id_grupo == idGrupo);
    const areasIds = [...new Set(horariosGrupo.map(h => h.id_area_academica))];
    return this.listas.areas.filter(a => areasIds.includes(a.id));
  }

  obtenerUsoPorcentualArea(idGrupo: any, idArea: any): number {
    return this.calcularPorcentajeUsoHorario(idGrupo, idArea);
  }
  cambiarEstadoTarea(id: any, registro: any) {
    // Obtener usuario del sessionStorage
    const usuarioStr = sessionStorage.getItem('usuario');
    const usuario = usuarioStr ? JSON.parse(usuarioStr) : null;

    if (!usuario || !usuario.id) {
      Swal.fire({
        title: 'Sesión no válida',
        text: 'No se pudo identificar el usuario. Por favor, inicie sesión nuevamente.',
        icon: 'warning',
        confirmButtonText: 'Ir al login',
        confirmButtonColor: '#F5A623'
      }).then(() => {
        this.router.navigate(['/login']);
      });
      return;
    }

    // Preparar las opciones del select HTML
    let opcionesHtml = '';
    this.listas.estadosTareas.forEach((estado: any) => {
      const selected = estado.id == registro.id_estado_tarea ? 'selected' : '';
      opcionesHtml += `<option value="${estado.id}" ${selected}>${estado.nombre}</option>`;
    });

    // Mostrar observaciones anteriores si existen
    let observacionesAnteriores = '';
    if (registro.observaciones) {
      observacionesAnteriores = `
      <div class="alert alert-info mb-3">
        <h6 class="mb-2"><i class="fas fa-history me-1"></i>Historial de observaciones:</h6>
        <div style="max-height: 150px; overflow-y: auto;">
          <small>${registro.observaciones.replace(/\n/g, '<br>')}</small>
        </div>
      </div>
    `;
    }

    Swal.fire({
      title: 'Cambiar Estado de Tarea',
      html: `
      <div class="text-start mb-3">
        <p><strong>Actividad:</strong> ${registro.titulo_actividad}</p>
        <p><strong>Estado actual:</strong> ${registro.estado_nombre || registro.nombre_estado}</p>
      </div>
      ${observacionesAnteriores}
      <div class="form-group text-start mb-3">
        <label for="nuevo-estado" class="form-label fw-semibold">Nuevo Estado: <span class="text-danger">*</span></label>
        <select id="nuevo-estado" class="form-select">
          ${opcionesHtml}
        </select>
      </div>
      <div class="form-group text-start">
        <label for="nueva-observacion" class="form-label fw-semibold">Nueva observación (opcional):</label>
        <textarea id="nueva-observacion" class="form-control" rows="3" 
                  placeholder="Ingrese observaciones sobre este cambio de estado..."></textarea>
      </div>
    `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Cambiar Estado',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#F5A623',
      cancelButtonColor: '#6c757d',
      width: '650px',
      preConfirm: () => {
        const nuevoEstado = (document.getElementById('nuevo-estado') as HTMLSelectElement).value;
        const nuevaObservacion = (document.getElementById('nueva-observacion') as HTMLTextAreaElement).value;

        if (!nuevoEstado) {
          Swal.showValidationMessage('Debe seleccionar un estado');
          return false;
        }

        if (nuevoEstado == registro.id_estado_tarea) {
          Swal.showValidationMessage('Debe seleccionar un estado diferente al actual');
          return false;
        }

        return { nuevoEstado, nuevaObservacion };
      }
    }).then((result) => {
      if (result.isConfirmed) {
        const { nuevoEstado, nuevaObservacion } = result.value;

        // Construir el historial de observaciones
        let observacionesCompletas = registro.observaciones || '';

        if (nuevaObservacion && nuevaObservacion.trim()) {
          const fecha = new Date().toLocaleString('es-ES');
          const nombreUsuario = usuario.primer_nombre + ' ' + usuario.primer_apellido;
          const estadoNombre = this.listas.estadosTareas.find((e: any) => e.id == nuevoEstado)?.nombre || 'Estado ' + nuevoEstado;

          const nuevaEntrada = `[${fecha}] ${nombreUsuario} cambió a "${estadoNombre}": ${nuevaObservacion}`;

          // Si hay observaciones anteriores, agregar salto de línea
          if (observacionesCompletas) {
            observacionesCompletas += '\n' + nuevaEntrada;
          } else {
            observacionesCompletas = nuevaEntrada;
          }
        }

        // Preparar datos para actualizar
        const body = {
          id: id,
          id_estado_tarea: nuevoEstado,
          observaciones: observacionesCompletas || null,
          id_usuario_cambio_estado: usuario.id
        };

        // Llamar servicio para actualizar
        this.tareasXSprintsService.actualizarEstado(body).subscribe({
          next: (response: any) => {
            Swal.fire({
              title: 'Estado actualizado',
              text: 'El estado de la tarea ha sido cambiado exitosamente.',
              icon: 'success',
              confirmButtonText: 'Aceptar',
              confirmButtonColor: '#F5A623'
            }).then(() => {
              this.obtenerTareasSprint();
              setTimeout(() => {
                this.cargarAnalisisLogros().then(() => {
                  this.actualizarGraficoUnificado();
                });
              }, 300);
            });
          },
          error: (error: any) => {
            console.error('Error actualizando estado:', error);
            Swal.fire({
              title: 'Error',
              text: 'No se pudo actualizar el estado de la tarea.',
              icon: 'error',
              confirmButtonText: 'Aceptar'
            });
          }
        });
      }
    });
  }

  // Método auxiliar para formatear fecha y hora
  formatearFechaHora(fecha: string): string {
    if (!fecha) return '';
    const f = new Date(fecha);
    return f.toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}