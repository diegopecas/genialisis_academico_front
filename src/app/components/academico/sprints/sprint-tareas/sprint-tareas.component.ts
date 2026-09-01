import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { forkJoin, firstValueFrom } from 'rxjs';
import { TablasComponent } from '../../../../common/tablas/tablas.component';
import { SprintsService } from '../../../../services/sprints.service';
import { TareasXSprintsService } from '../../../../services/tareas-x-sprints.service';
import { EstadosTareasService } from '../../../../services/estados-tareas.service';
import { HorariosService } from '../../../../services/horarios.service';
import { ActividadesAcademicasService } from '../../../../services/actividades-academicas.service';

@Component({
  selector: 'app-sprint-tareas',
  templateUrl: './sprint-tareas.component.html',
  styleUrl: './sprint-tareas.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, TablasComponent]
})
export class SprintTareasComponent implements OnInit, OnChanges {

  /** Sprint al que pertenecen las tareas */
  @Input() idSprint: any = null;
  /** Corte del sprint, necesario para filtrar las actividades disponibles */
  @Input() idCorteAcademico: any = '';
  @Input() nombreSprint = '';
  /** Listas que carga el contenedor para no pedirlas dos veces */
  @Input() grupos: any[] = [];
  @Input() areas: any[] = [];
  /** Distribución de días hábiles del sprint, para calcular los límites */
  @Input() diasPorSprint: any[] = [];
  @Input() editable = true;
  /** Filtros globales del formulario */
  @Input() filtroGrupo = '';
  @Input() filtroArea = '';

  @Output() filtrosChange = new EventEmitter<{ grupo: string, area: string }>();
  /** Avisa al contenedor para que refresque capacidad y progreso */
  @Output() tareasCambiaron = new EventEmitter<void>();

  public cargando = false;

  // Tareas del sprint
  public tareasDelSprint: any[] = [];
  public todasLasTareas: any[] = [];
  public titulosTareas: any[] = [];

  public estadosTareas: any[] = [];
  public esferas: any[] = [];

  // Horarios para límites y para el modal de horarios
  public horariosData: any[] = [];
  public limitesConfig: any = {};

  // El análisis de tiempo solo se necesita dentro del modal de horarios,
  // así que se pide la primera vez que se abre.
  public analisisTiempo: any = null;

  // Modal de actividades
  public mostrarModalActividades = false;
  public actividadesDisponibles: any[] = [];
  public actividadesSeleccionadas: any[] = [];
  public actividadSubmitted = false;
  public actividadesBusqueda = '';
  public filtroGrupoModal = '';
  public filtroAreaModal = '';
  public filtroEsferaModal = '';

  // Modal de horarios
  public mostrarModalHorarios = false;
  public areasSeleccionadasFiltroHorarios: { [key: string]: boolean } = {};
  public horasDelDia: string[] = []; // Se calcula dinámicamente

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

  constructor(
    private router: Router,
    private sprintsService: SprintsService,
    private tareasXSprintsService: TareasXSprintsService,
    private estadosTareasService: EstadosTareasService,
    private horariosService: HorariosService,
    private actividadesAcademicasService: ActividadesAcademicasService
  ) { }

  ngOnInit(): void {
    this.crearTitulosTareas();
    this.cargarDatos();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['filtroGrupo'] || changes['filtroArea']) {
      this.aplicarFiltrosTareas();
      this.calcularLimitesActividades();
    }
  }

  /** Lo llama el contenedor cuando algo externo cambia las tareas */
  recargar() {
    this.obtenerTareasSprint();
  }

  /**
   * Todo lo que este tab necesita: las tareas, los estados para el cambio de
   * estado y los horarios para los límites y el modal de horarios.
   */
  cargarDatos() {
    if (!this.idSprint) {
      return;
    }

    this.cargando = true;
    forkJoin({
      tareas: this.tareasXSprintsService.obtenerBySprintIdDetallado(this.idSprint),
      estados: this.estadosTareasService.obtenerTodos(),
      horarios: this.horariosService.obtenerTodos()
    }).subscribe({
      next: (responses: any) => {
        this.estadosTareas = responses.estados.body || [];
        this.horariosData = responses.horarios.body || [];
        this.procesarTareas(responses.tareas.body || []);
        this.cargando = false;
      },
      error: (error: any) => {
        console.error('Error cargando el tab de tareas:', error);
        this.cargando = false;
        Swal.fire({
          title: 'Error',
          text: 'No se pudieron cargar las tareas del sprint.',
          icon: 'error',
          confirmButtonText: 'Aceptar'
        });
      }
    });
  }

  obtenerTareasSprint() {
    if (!this.idSprint) {
      return;
    }

    this.tareasXSprintsService.obtenerBySprintIdDetallado(this.idSprint).subscribe({
      next: (response: any) => {
        this.procesarTareas(response.body || []);
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
      }
    });
  }

  private procesarTareas(tareas: any[]) {
    // Procesar tareas para unificar formato
    const procesadas = tareas.map((tarea: any) => ({
      ...tarea,
      estado_nombre: tarea.nombre_estado,
      id_grupo: tarea.ids_grupos && tarea.ids_grupos.length > 0 ? tarea.ids_grupos[0] : null,
      id_area: tarea.ids_areas && tarea.ids_areas.length > 0 ? tarea.ids_areas[0] : null
    }));

    // Guardar copia de todas las tareas sin filtrar
    this.todasLasTareas = [...procesadas];

    this.aplicarFiltrosTareas();
    this.calcularLimitesActividades();
  }

  obtenerNombreGrupo(idGrupo: any): string {
    const grupo = this.grupos.find(g => g.id == idGrupo);
    return grupo ? grupo.nombre : '';
  }

  obtenerNombreArea(idArea: any): string {
    const area = this.areas.find(a => a.id == idArea);
    return area ? area.nombre : '';
  }

  aplicarFiltrosTareas() {
    if (!this.todasLasTareas || this.todasLasTareas.length === 0) {
      this.tareasDelSprint = [];
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
      confirmButtonColor: '#d4af37',
      cancelButtonColor: '#6c757d',
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
              confirmButtonColor: '#d4af37'
            });
            this.obtenerTareasSprint();
            this.analisisTiempo = null;
            this.tareasCambiaron.emit();
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
        confirmButtonColor: '#d4af37'
      }).then(() => {
        this.router.navigate(['/login']);
      });
      return;
    }

    // Preparar las opciones del select HTML
    let opcionesHtml = '';
    this.estadosTareas.forEach((estado: any) => {
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
      confirmButtonColor: '#d4af37',
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
          const estadoNombre = this.estadosTareas.find((e: any) => e.id == nuevoEstado)?.nombre || 'Estado ' + nuevoEstado;

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
          next: () => {
            Swal.fire({
              title: 'Estado actualizado',
              text: 'El estado de la tarea ha sido cambiado exitosamente.',
              icon: 'success',
              confirmButtonText: 'Aceptar',
              confirmButtonColor: '#d4af37'
            }).then(() => {
              this.obtenerTareasSprint();
              this.tareasCambiaron.emit();
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

  // =========================================================
  // Modal de actividades
  // =========================================================
  abrirModalActividades() {
    if (!this.idCorteAcademico) {
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

    if (this.filtroGrupoModal && this.filtroAreaModal) {
      this.cargarActividadesDisponibles();
    } else {
      this.actividadesDisponibles = [];
    }

    this.mostrarModalActividades = true;
  }

  cerrarModalActividades() {
    this.mostrarModalActividades = false;
    this.actividadesSeleccionadas = [];
    this.actividadesBusqueda = '';
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
      id_corte: this.idCorteAcademico
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

        const esferasSet = new Set<string>();
        this.actividadesDisponibles.forEach((act: any) => {
          if (act.esferas) {
            act.esferas.split(',').forEach((esfera: string) => {
              esferasSet.add(esfera.trim());
            });
          }
        });

        this.esferas = Array.from(esferasSet).map(nombre => ({
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

  async validarActividadAnteDeAsociar(actividad: any): Promise<boolean> {
    try {
      const response = await firstValueFrom(
        this.sprintsService.validarActividadEnSprint(this.idSprint, actividad.id)
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
          <thead>
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
      confirmButtonColor: '#d4af37',
      customClass: {
        htmlContainer: 'text-start'
      }
    });
  }

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
        confirmButtonColor: '#d4af37',
        cancelButtonColor: '#6c757d'
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
        id_sprint: this.idSprint,
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
          confirmButtonColor: '#d4af37'
        }).then(() => {
          this.cerrarModalActividades();
          this.obtenerTareasSprint();
          this.analisisTiempo = null;
          this.tareasCambiaron.emit();
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

  // =========================================================
  // Modal de horarios
  // =========================================================
  abrirModalHorarios() {
    // Calcular horas dinámicamente antes de abrir el modal
    this.calcularHorasDelDia();

    // Inicializar filtros para todos los grupos
    this.grupos.forEach((grupo: any) => {
      this.inicializarFiltroAreasHorarios(grupo.id);
    });

    // El porcentaje de uso que se pinta en cada bloque sale del análisis de
    // tiempo, que solo hace falta aquí.
    if (!this.analisisTiempo && this.idSprint) {
      this.sprintsService.obtenerAnalisisTiempoSprint(this.idSprint).subscribe({
        next: (response) => {
          this.analisisTiempo = response.body as any;
        },
        error: (error) => {
          console.error('Error cargando análisis de tiempo:', error);
        }
      });
    }

    this.mostrarModalHorarios = true;
  }

  cerrarModalHorarios() {
    this.mostrarModalHorarios = false;
  }

  calcularHorasDelDia() {
    if (this.horariosData.length === 0) {
      this.horasDelDia = [];
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
    const area = this.areas.find(a => a.id == idArea);
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

  getAreasDelGrupo(idGrupo: any): any[] {
    const horariosGrupo = this.horariosData.filter(h => h.id_grupo == idGrupo);
    const areasIds = [...new Set(horariosGrupo.map(h => h.id_area_academica))];
    return this.areas.filter(a => areasIds.includes(a.id));
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

  obtenerUsoPorcentualArea(idGrupo: any, idArea: any): number {
    return this.calcularPorcentajeUsoHorario(idGrupo, idArea);
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
      confirmButtonColor: '#d4af37'
    });
  }

  /** Grupo visible dentro del modal de horarios */
  public grupoHorarioActivo: any = null;

  seleccionarGrupoHorario(idGrupo: any) {
    this.grupoHorarioActivo = idGrupo;
  }

  get grupoHorarioSeleccionado(): any {
    if (this.grupoHorarioActivo) {
      return this.grupos.find(g => g.id == this.grupoHorarioActivo);
    }
    return this.grupos.length > 0 ? this.grupos[0] : null;
  }
}
