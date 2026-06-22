import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HeaderComponent } from '../../../common/header/header.component';
import { SprintsService } from '../../../services/sprints.service';
import { TareasXSprintsService } from '../../../services/tareas-x-sprints.service';
import { GruposService } from '../../../services/grupos.service';
import { AreaAcademicaXGrupoService } from '../../../services/area-academica-x-grupo.service';
import { InstitucionConfigService } from '../../../services/institucion-config.service';
import { forkJoin } from 'rxjs';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-importar-actividades-sprint',
  templateUrl: './importar-actividades-sprint.component.html',
  styleUrl: './importar-actividades-sprint.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent]
})
export class ImportarActividadesSprintComponent implements OnInit {

  public titulo = 'Importar Actividades desde otro Sprint';

  // Listas completas
  public annos: { id: string; nombre: string }[] = [];
  public todosSprints: any[] = [];
  public todosGrupos: any[] = [];
  public todasAsignacionesAreaGrupo: any[] = [];

  // Sprint destino: sprints >= actual
  public sprintsDestino: any[] = [];
  public sprintDestinoId: any = null;

  // Sprint origen: filtrados por año
  public sprintsFiltradosOrigen: any[] = [];

  // Áreas filtradas por grupo
  public areasFiltradas: any[] = [];

  // Filtros
  public anioSeleccionado: number | null = null;
  public sprintOrigenId: any = null;
  public grupoSeleccionado: any = '';
  public areaSeleccionada: any = '';

  // Tareas
  public tareasOrigen: any[] = [];
  public tareasFiltradas: any[] = [];
  public tareasSeleccionadas: Set<number> = new Set();
  public seleccionarTodas = false;
  public textoBusqueda = '';

  // Acordeón
  public tareaExpandida: number = -1;

  // Estados
  public cargandoInicial = true;
  public cargandoTareas = false;
  public importando = false;

  constructor(
    private router: Router,
    private sprintsService: SprintsService,
    private tareasXSprintsService: TareasXSprintsService,
    private gruposService: GruposService,
    private areaAcademicaXGrupoService: AreaAcademicaXGrupoService,
    private institucionConfigService: InstitucionConfigService
  ) { }

  ngOnInit() {
    this.cargarDatosIniciales();
  }

  cargarDatosIniciales() {
    this.annos = this.institucionConfigService.getAnnosEscolares();
    this.anioSeleccionado = this.institucionConfigService.getAnioAcademicoActual();

    forkJoin({
      sprints: this.sprintsService.obtenerTodos(),
      grupos: this.gruposService.obtenerTodos(),
      areasGrupo: this.areaAcademicaXGrupoService.obtenerTodas()
    }).subscribe({
      next: (responses: any) => {
        this.todosSprints = responses.sprints.body || [];
        this.todosGrupos = responses.grupos.body || [];
        this.todasAsignacionesAreaGrupo = responses.areasGrupo.body || [];
        this.cargandoInicial = false;

        this.configurarSprintsDestino();
        this.filtrarSprintsOrigenPorAnio();
      },
      error: (error: any) => {
        console.error('Error cargando datos iniciales:', error);
        this.cargandoInicial = false;
      }
    });
  }

  /**
   * Configura la lista de sprints destino:
   * - Solo sprints con numero_sprint >= sprint actual
   * - Preselecciona el siguiente al actual, o el actual si es el último
   */
  configurarSprintsDestino() {
    const sprintActual = this.todosSprints.find((s: any) => s.actual === 1);

    if (!sprintActual) {
      // Si no hay sprint actual, mostrar todos
      this.sprintsDestino = [...this.todosSprints];
      if (this.sprintsDestino.length > 0) {
        this.sprintDestinoId = this.sprintsDestino[0].id;
      }
      return;
    }

    // Filtrar sprints del mismo año con numero >= actual
    this.sprintsDestino = this.todosSprints.filter((s: any) =>
      s.anio == sprintActual.anio && s.numero_sprint >= sprintActual.numero_sprint
    ).sort((a: any, b: any) => a.numero_sprint - b.numero_sprint);

    // Preseleccionar: el siguiente al actual si existe, si no el actual
    const siguiente = this.sprintsDestino.find((s: any) =>
      s.numero_sprint === sprintActual.numero_sprint + 1
    );

    this.sprintDestinoId = siguiente ? siguiente.id : sprintActual.id;
  }

  filtrarSprintsOrigenPorAnio() {
    if (!this.anioSeleccionado) {
      this.sprintsFiltradosOrigen = [];
      return;
    }
    // Excluir el sprint destino de la lista de origen
    this.sprintsFiltradosOrigen = this.todosSprints.filter(
      (s: any) => s.anio == this.anioSeleccionado && s.id != this.sprintDestinoId
    );
  }

  onAnioChange() {
    this.sprintOrigenId = null;
    this.limpiarResultados();
    this.filtrarSprintsOrigenPorAnio();
  }

  onSprintDestinoChange() {
    // Al cambiar destino, refiltrar origen para excluirlo
    this.filtrarSprintsOrigenPorAnio();
    this.limpiarResultados();
  }

  onSprintOrigenChange() {
    this.limpiarResultados();
  }

  onGrupoChange() {
    this.areaSeleccionada = '';
    this.areasFiltradas = [];
    this.limpiarResultados();

    if (!this.grupoSeleccionado) return;

    const asignacionesGrupo = this.todasAsignacionesAreaGrupo.filter(
      (a: any) => a.id_grupo == this.grupoSeleccionado
    );
    const areasMap = new Map();
    asignacionesGrupo.forEach((a: any) => {
      if (!areasMap.has(a.id_area_academica)) {
        areasMap.set(a.id_area_academica, {
          id: a.id_area_academica,
          nombre: a.nombre_area
        });
      }
    });
    this.areasFiltradas = Array.from(areasMap.values());
  }

  onAreaChange() {
    this.limpiarResultados();
  }

  limpiarResultados() {
    this.tareasOrigen = [];
    this.tareasFiltradas = [];
    this.tareasSeleccionadas.clear();
    this.seleccionarTodas = false;
    this.textoBusqueda = '';
    this.tareaExpandida = -1;
  }

  consultarTodas() {
    if (!this.sprintOrigenId) {
      Swal.fire({ title: 'Sprint requerido', text: 'Seleccione un sprint origen.', icon: 'warning', confirmButtonColor: '#F5A623' });
      return;
    }
    this.cargarTareas(false);
  }

  consultarNoEjecutadas() {
    if (!this.sprintOrigenId) {
      Swal.fire({ title: 'Sprint requerido', text: 'Seleccione un sprint origen.', icon: 'warning', confirmButtonColor: '#F5A623' });
      return;
    }
    this.cargarTareas(true);
  }

  private cargarTareas(soloNoEjecutadas: boolean) {
    this.cargandoTareas = true;
    this.tareasSeleccionadas.clear();
    this.seleccionarTodas = false;
    this.textoBusqueda = '';
    this.tareaExpandida = -1;

    const idGrupo = this.grupoSeleccionado || undefined;
    const idArea = this.areaSeleccionada || undefined;

    this.tareasXSprintsService.obtenerTareasParaImportar(
      this.sprintOrigenId, idGrupo, idArea, soloNoEjecutadas
    ).subscribe({
      next: (response: any) => {
        this.tareasOrigen = response.body || [];
        this.tareasFiltradas = [...this.tareasOrigen];
        this.cargandoTareas = false;

        if (this.tareasOrigen.length === 0) {
          Swal.fire({
            title: 'Sin resultados',
            text: 'No se encontraron actividades con los filtros seleccionados.',
            icon: 'info',
            confirmButtonColor: '#F5A623'
          });
        }
      },
      error: (error: any) => {
        console.error('Error cargando tareas para importar:', error);
        this.cargandoTareas = false;
        Swal.fire({ title: 'Error', text: 'No se pudieron cargar las actividades.', icon: 'error' });
      }
    });
  }

  filtrarPorTexto() {
    if (!this.textoBusqueda.trim()) {
      this.tareasFiltradas = [...this.tareasOrigen];
      return;
    }
    const busqueda = this.textoBusqueda.toLowerCase().trim();
    this.tareasFiltradas = this.tareasOrigen.filter(t =>
      t.titulo_actividad.toLowerCase().includes(busqueda) ||
      (t.descripcion_actividad && t.descripcion_actividad.toLowerCase().includes(busqueda)) ||
      t.nombre_grupo.toLowerCase().includes(busqueda) ||
      t.nombre_area.toLowerCase().includes(busqueda)
    );
    this.tareaExpandida = -1;
  }

  toggleExpansion(index: number) {
    this.tareaExpandida = this.tareaExpandida === index ? -1 : index;
  }

  toggleSeleccion(tareaId: number, event?: Event) {
    if (event) { event.stopPropagation(); }
    if (this.tareasSeleccionadas.has(tareaId)) {
      this.tareasSeleccionadas.delete(tareaId);
    } else {
      this.tareasSeleccionadas.add(tareaId);
    }
    this.actualizarEstadoSeleccionarTodas();
  }

  onToggleSeleccionarTodas(event: Event) {
    event.stopPropagation();
    if (this.seleccionarTodas) {
      this.tareasSeleccionadas.clear();
      this.seleccionarTodas = false;
    } else {
      this.tareasFiltradas.forEach(t => this.tareasSeleccionadas.add(t.id));
      this.seleccionarTodas = true;
    }
  }

  private actualizarEstadoSeleccionarTodas() {
    this.seleccionarTodas = this.tareasFiltradas.length > 0 &&
      this.tareasSeleccionadas.size === this.tareasFiltradas.length;
  }

  isTareaSeleccionada(tareaId: number): boolean {
    return this.tareasSeleccionadas.has(tareaId);
  }

  async importar() {
    if (!this.sprintDestinoId) {
      Swal.fire({ title: 'Sprint destino requerido', text: 'Seleccione un sprint destino.', icon: 'warning', confirmButtonColor: '#F5A623' });
      return;
    }
    if (this.tareasSeleccionadas.size === 0) {
      Swal.fire({ title: 'Sin selección', text: 'Seleccione al menos una actividad.', icon: 'warning', confirmButtonColor: '#F5A623' });
      return;
    }

    const tareasAImportar = this.tareasOrigen.filter(t => this.tareasSeleccionadas.has(t.id));
    const total = tareasAImportar.length;
    const destino = this.sprintsDestino.find((s: any) => s.id == this.sprintDestinoId);
    const nombreDestino = destino ? destino.nombre_sprint : '';

    const confirmacion = await Swal.fire({
      title: 'Confirmar importación',
      html: `Se importarán <strong>${total}</strong> actividad${total > 1 ? 'es' : ''} al sprint <strong>${nombreDestino}</strong> con estado <strong>Pendiente</strong>.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Importar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#F5A623',
      cancelButtonColor: '#2C2C2C'
    });

    if (!confirmacion.isConfirmed) return;

    this.importando = true;

    Swal.fire({
      title: 'Importando',
      html: `Procesando ${total} actividad${total > 1 ? 'es' : ''}...`,
      allowOutsideClick: false,
      didOpen: () => { Swal.showLoading(); }
    });

    const tareasPayload = tareasAImportar.map(t => ({
      id_actividad_academica: t.id_actividad_academica,
      id_grupo: t.id_grupo,
      id_area_academica: t.id_area_academica
    }));

    this.tareasXSprintsService.importarMasivo(this.sprintDestinoId, tareasPayload).subscribe({
      next: (response: any) => {
        this.importando = false;
        const importadas = response.importadas || 0;
        const errores = response.errores || [];

        let icon: any = 'success';
        let mensaje = `${importadas} actividad${importadas > 1 ? 'es importadas' : ' importada'} correctamente al sprint ${nombreDestino}.`;

        if (errores.length > 0) {
          icon = 'warning';
          mensaje += ` ${errores.length} error${errores.length > 1 ? 'es' : ''}.`;
        }

        Swal.fire({
          title: 'Importación completada',
          text: mensaje,
          icon: icon,
          confirmButtonText: 'Aceptar',
          confirmButtonColor: '#F5A623'
        }).then(() => {
          this.limpiarResultados();
        });
      },
      error: (error: any) => {
        console.error('Error importando:', error);
        this.importando = false;
        Swal.fire({ title: 'Error', text: 'Ocurrió un error durante la importación.', icon: 'error' });
      }
    });
  }

  volver() {
    this.router.navigate(['/academico/selector-actividades']);
  }

  getClaseEstado(idEstado: number): string {
    switch (idEstado) {
      case 1: return 'badge-pendiente';
      case 2: return 'badge-ejecutada';
      case 3: return 'badge-cancelada';
      default: return 'badge-default';
    }
  }

  getNombreSprintDestino(): string {
    const sprint = this.sprintsDestino.find(s => s.id == this.sprintDestinoId);
    return sprint ? `#${sprint.numero_sprint} - ${sprint.nombre_sprint}` : '';
  }
}