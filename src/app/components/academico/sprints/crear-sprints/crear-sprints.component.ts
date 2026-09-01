import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import Swal from 'sweetalert2';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../../../common/header/header.component';
import { SprintsService } from '../../../../services/sprints.service';
import { DiasXSprintService } from '../../../../services/dias-x-sprint.service';
import { CalendariosService } from '../../../../services/calendarios.service';
import { CortesAcademicosService } from '../../../../services/cortes-academicos.service';
import { GruposService } from '../../../../services/grupos.service';
import { AreasAcademicasService } from '../../../../services/areas-academicas.service';
import { TareasXSprintsService } from '../../../../services/tareas-x-sprints.service';
import { SprintCapacidadComponent } from '../sprint-capacidad/sprint-capacidad.component';
import { SprintTareasComponent } from '../sprint-tareas/sprint-tareas.component';
import { SprintProgresoComponent } from '../sprint-progreso/sprint-progreso.component';
import { forkJoin, firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-crear-sprints',
  templateUrl: './crear-sprints.component.html',
  styleUrl: './crear-sprints.component.scss',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HeaderComponent,
    SprintCapacidadComponent,
    SprintTareasComponent,
    SprintProgresoComponent
  ]
})
export class CrearSprintsComponent implements OnInit {

  public titulo = "Configuración de Sprint";
  public id = "0";
  public accion = "";
  public editable = false;
  public nuevo = false;
  public submitted = false;

  // Pestaña visible y menú de hamburguesa en móvil
  public pestanaActiva: string = 'basico';
  public menuMovilAbierto = false;

  // Un tab se crea la primera vez que se abre y de ahí en adelante solo se
  // oculta, para que no vuelva a pedir sus datos al back cada vez que se entra.
  public tabsAbiertos: { [key: string]: boolean } = { basico: true };

  // Filtros globales. Viven aquí y bajan a los tres tabs por @Input.
  public filtroGrupo = "";
  public filtroArea = "";

  // Listas para combos. Los cortes se piden al abrir porque el formulario
  // básico los necesita; grupos y áreas solo cuando se abre un tab que los usa.
  public listas = {
    cortesAcademicos: [] as any[],
    grupos: [] as any[],
    areas: [] as any[]
  };
  private listasSecundariasCargadas = false;

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
    es_evaluacion: false,
    // Sprint del corte que produce el informe que ve el acudiente
    sprint_informe: false,
    // Marca real de sprint finalizado. Solo lectura: se pone desde el botón
    // "Finalizar Sprint" del listado, que además cancela las tareas pendientes.
    finalizado: 0 as any
  };

  // Fechas con las que se cargó el sprint. Sirven para saber si hay que
  // revisar las tareas ejecutadas al grabar.
  private fechasOriginales = { inicial: '', final: '' };

  // Días por sprint
  public diasPorSprint: any[] = [];

  @ViewChild(SprintCapacidadComponent) sprintCapacidad?: SprintCapacidadComponent;
  @ViewChild(SprintProgresoComponent) sprintProgreso?: SprintProgresoComponent;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private sprintsService: SprintsService,
    private diasXSprintService: DiasXSprintService,
    private calendariosService: CalendariosService,
    private cortesAcademicosService: CortesAcademicosService,
    private gruposService: GruposService,
    private areasAcademicasService: AreasAcademicasService,
    private tareasXSprintsService: TareasXSprintsService
  ) { }

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.accion = params['accion'];
      this.id = params['id'];

      switch (this.accion) {
        case 'crear':
          this.titulo = "Crear Sprint Académico";
          this.editable = true;
          this.nuevo = true;
          this.consultarCortes();
          break;
        case 'editar':
          this.titulo = "Editar Sprint Académico";
          this.editable = true;
          this.nuevo = false;
          this.consultarCortes();
          this.obtenerSprint(this.id);
          break;
        case 'consultar':
          this.titulo = "Consultar Sprint Académico";
          this.editable = false;
          this.nuevo = false;
          this.consultarCortes();
          this.obtenerSprint(this.id);
          break;
      }
    });
  }

  /**
   * Solo los cortes académicos, que es lo único que el formulario básico
   * necesita para poder grabar.
   */
  consultarCortes() {
    this.cortesAcademicosService.obtenerTodos().subscribe({
      next: (response: any) => {
        this.listas.cortesAcademicos = response.body || [];
      },
      error: (error: any) => {
        console.error("Error cargando cortes académicos:", error);
      }
    });
  }

  /**
   * Grupos y áreas se piden una sola vez, la primera vez que se abre un tab
   * distinto de Información Básica.
   */
  cargarListasSecundarias() {
    if (this.listasSecundariasCargadas) {
      return;
    }
    this.listasSecundariasCargadas = true;

    forkJoin({
      grupos: this.gruposService.obtenerTodos(),
      areas: this.areasAcademicasService.obtenerTodos()
    }).subscribe({
      next: (responses: any) => {
        this.listas.grupos = responses.grupos.body || [];
        this.listas.areas = responses.areas.body || [];
      },
      error: (error: any) => {
        console.error("Error cargando grupos y áreas:", error);
        this.listasSecundariasCargadas = false;
      }
    });
  }

  seleccionarPestana(pestana: string) {
    if (pestana !== 'basico') {
      this.cargarListasSecundarias();
    }
    this.tabsAbiertos[pestana] = true;
    this.pestanaActiva = pestana;
    this.menuMovilAbierto = false;
  }

  obtenerSprint(id: string) {
    this.sprintsService.obtenerById(id).subscribe({
      next: (response: any) => {
        const sprint = response.body[0];
        this.model = {
          ...sprint,
          actual: sprint.actual === 1,
          es_evaluacion: sprint.es_evaluacion === 1,
          sprint_informe: Number(sprint.sprint_informe) === 1,
          finalizado: Number(sprint.finalizado)
        };

        this.fechasOriginales = {
          inicial: this.model.fecha_inicial,
          final: this.model.fecha_final
        };

        if (this.accion === 'editar') {
          this.titulo = `Editar: ${this.model.nombre_sprint}`;
        } else if (this.accion === 'consultar') {
          this.titulo = `Consultar: ${this.model.nombre_sprint}`;
        }

        this.obtenerDiasSprint();
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
      },
      error: (error: any) => {
        console.error("Error obteniendo días del sprint:", error);
      }
    });
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
            confirmButtonColor: '#d4af37',
            cancelButtonColor: '#6c757d'
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

      const rangoValido = await this.validarTareasEnRango();
      if (!rangoValido) {
        return false;
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

  /**
   * Avisa si hay tareas ya ejecutadas que quedarían por fuera del nuevo rango
   * de fechas. Las tareas se consultan aquí mismo y solo cuando cambiaron las
   * fechas, porque el tab de tareas ya no se carga al abrir el formulario.
   */
  async validarTareasEnRango(): Promise<boolean> {
    if (this.accion !== 'editar') {
      return true;
    }

    const cambiaronFechas =
      this.model.fecha_inicial !== this.fechasOriginales.inicial ||
      this.model.fecha_final !== this.fechasOriginales.final;

    if (!cambiaronFechas) {
      return true;
    }

    try {
      const response = await firstValueFrom(
        this.tareasXSprintsService.obtenerBySprintIdDetallado(this.id)
      );
      const tareas = (response.body as any[]) || [];

      const tareasEjecutadas = tareas.filter((t: any) =>
        t.fecha_ejecucion &&
        (new Date(t.fecha_ejecucion) < new Date(this.model.fecha_inicial) ||
          new Date(t.fecha_ejecucion) > new Date(this.model.fecha_final))
      );

      if (tareasEjecutadas.length === 0) {
        return true;
      }

      const result = await Swal.fire({
        title: 'Tareas fuera de rango',
        html: `Hay ${tareasEjecutadas.length} tarea(s) ejecutada(s) que quedarían fuera del nuevo rango de fechas.<br>¿Desea continuar?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, continuar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#d4af37',
        cancelButtonColor: '#6c757d'
      });

      return result.isConfirmed;
    } catch (error) {
      console.error('Error validando tareas en rango:', error);
      return true;
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
              confirmButtonColor: '#d4af37'
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
        next: () => {
          this.actualizarDiasPorSprint(this.id);

          this.fechasOriginales = {
            inicial: this.model.fecha_inicial,
            final: this.model.fecha_final
          };

          Swal.fire({
            title: 'Sprint actualizado con éxito',
            text: 'Los cambios han sido guardados correctamente.',
            icon: "success",
            confirmButtonText: "Aceptar",
            confirmButtonColor: '#d4af37'
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
        confirmButtonColor: '#d4af37',
        cancelButtonColor: '#6c757d',
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

  obtenerNombreGrupo(idGrupo: any): string {
    const grupo = this.listas.grupos.find(g => g.id == idGrupo);
    return grupo ? grupo.nombre : '';
  }

  obtenerNombreArea(idArea: any): string {
    const area = this.listas.areas.find(a => a.id == idArea);
    return area ? area.nombre : '';
  }

  /**
   * Los tabs hijos pueden cambiar los filtros (por ejemplo al hacer clic en un
   * tubo de capacidad o en una barra del gráfico). Aquí se centraliza el estado.
   */
  cambiarFiltros(filtros: { grupo: string, area: string }) {
    this.filtroGrupo = filtros.grupo;
    this.filtroArea = filtros.area;
  }

  limpiarFiltros() {
    this.filtroGrupo = '';
    this.filtroArea = '';
  }

  /**
   * Cuando cambian las tareas, capacidad y progreso quedan desactualizados.
   * Solo se refrescan los tabs que ya estén montados.
   */
  refrescarAnalisis() {
    if (this.sprintCapacidad) {
      this.sprintCapacidad.recargar();
    }
    if (this.sprintProgreso) {
      this.sprintProgreso.recargar();
    }
  }
}
