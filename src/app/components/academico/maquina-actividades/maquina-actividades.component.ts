import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { forkJoin } from 'rxjs';
import { HeaderComponent } from '../../../common/header/header.component';
import { AmbientesService } from '../../../services/ambientes.service';
import { AreaAcademicaXGrupoService } from '../../../services/area-academica-x-grupo.service';
import { AreasAcademicasService } from '../../../services/areas-academicas.service';
import { GruposService } from '../../../services/grupos.service';
import { IaMaquinaActividadesService } from '../../../services/ia-maquina-actividades.service';
import { MaterialesXActividadService } from '../../../services/materiales-x-actividad.service';
import { SprintsService } from '../../../services/sprints.service';
import { TiposActividadesAcademicasService } from '../../../services/tipos-actividades-academicas.service';

@Component({
  selector: 'app-maquina-actividades',
  templateUrl: './maquina-actividades.component.html',
  styleUrl: './maquina-actividades.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent]
})
export class MaquinaActividadesComponent implements OnInit {
  public titulo = "Máquina de Actividades";

  // Paso actual del wizard
  public pasoActual: number = 1;

  // Listas para combos
  public grupos: any[] = [];
  public areas: any[] = [];
  public todasLasAreasGrupo: any[] = [];
  public sprints: any[] = [];
  public ambientes: any[] = [];
  public productosDisponibles: any[] = [];
  public tiposActividad: any[] = [];

  // Selecciones del paso 1
  public idGrupo: any = '';
  public idArea: any = '';
  public idSprint: any = '';
  public idTipoActividad: any = '';
  public ambientesSeleccionados: any[] = [];
  public materialesSeleccionados: any[] = [];
  public materialTextoLibre: string = '';
  public descripcionDocente: string = '';
  public cantidadActividades: number = 3;
  public busquedaProducto: string = '';
  public inventarioAbierto: boolean = false;

  // Paso 2 - Actividades generadas
  public actividadesGeneradas: any[] = [];
  public actividadesSeleccionadas: boolean[] = [];
  public logrosDisponibles: any[] = [];
  public cargandoIA: boolean = false;
  public proveedorIA: string = '';
  public tiempoIA: number = 0;
  public busquedaIndicador: { [key: number]: string } = {};

  // Modal de producto
  public productoModal: any = null;

  // Info contextual
  public nombreGrupo: string = '';
  public nombreArea: string = '';
  public nombreSprint: string = '';

  constructor(
    private router: Router,
    private gruposService: GruposService,
    private areasService: AreasAcademicasService,
    private areaXGrupoService: AreaAcademicaXGrupoService,
    private sprintsService: SprintsService,
    private ambientesService: AmbientesService,
    private materialesService: MaterialesXActividadService,
    private tiposActividadesService: TiposActividadesAcademicasService,
    private iaMaquinaService: IaMaquinaActividadesService
  ) {}

  ngOnInit() {
    this.cargarCatalogos();
  }

  cargarCatalogos() {
    forkJoin({
      grupos: this.gruposService.obtenerTodos(),
      sprints: this.sprintsService.obtenerTodos(),
      ambientes: this.ambientesService.obtenerActivos(),
      tipos: this.tiposActividadesService.obtenerTodos(),
      areasGrupo: this.areaXGrupoService.obtenerTodas()
    }).subscribe({
      next: (resp: any) => {
        this.grupos = resp.grupos.body || [];
        this.ambientes = resp.ambientes.body || [];
        this.tiposActividad = resp.tipos.body || [];
        this.todasLasAreasGrupo = resp.areasGrupo.body || [];

        // Filtrar sprints: solo actual o con fecha_final >= hoy (pendientes/futuros)
        const hoy = new Date().toISOString().split('T')[0];
        const todosSprints = resp.sprints.body || [];
        this.sprints = todosSprints.filter((s: any) =>
          s.actual == 1 || s.fecha_final >= hoy
        );
      },
      error: (err: any) => {
        console.error('Error cargando catálogos', err);
        Swal.fire('Error', 'No se pudieron cargar los catálogos.', 'error');
      }
    });
  }

  onGrupoChange() {
    this.idArea = '';
    this.productosDisponibles = [];
    this.materialesSeleccionados = [];

    if (!this.idGrupo) {
      this.areas = [];
      return;
    }

    const grupo = this.grupos.find((g: any) => g.id == this.idGrupo);
    this.nombreGrupo = grupo?.nombre || '';

    // Filtrar áreas del grupo desde las asignaciones cargadas
    this.areas = this.todasLasAreasGrupo
      .filter((axg: any) => axg.id_grupo == this.idGrupo)
      .map((axg: any) => ({
        id: axg.id_area_academica,
        nombre: axg.nombre_area || axg.nombre_area_academica
      }));

    // Cargar productos filtrados por grupo (via grados_x_grupo, activos)
    this.materialesService.obtenerProductosPorGrupo(this.idGrupo).subscribe({
      next: (resp: any) => {
        this.productosDisponibles = resp.body || [];
      }
    });
  }

  onAreaChange() {
    const area = this.areas.find((a: any) => a.id == this.idArea);
    this.nombreArea = area?.nombre || '';
  }

  onSprintChange() {
    const sprint = this.sprints.find((s: any) => s.id == this.idSprint);
    this.nombreSprint = sprint?.nombre_sprint || '';
  }

  // --- Ambientes (badges seleccionables) ---
  toggleAmbiente(ambiente: any) {
    const idx = this.ambientesSeleccionados.findIndex((a: any) => a.id === ambiente.id);
    if (idx >= 0) {
      this.ambientesSeleccionados.splice(idx, 1);
    } else {
      this.ambientesSeleccionados.push(ambiente);
    }
  }

  isAmbienteSeleccionado(ambiente: any): boolean {
    return this.ambientesSeleccionados.some((a: any) => a.id === ambiente.id);
  }

  // --- Materiales (badges seleccionables + texto libre) ---
  toggleMaterial(producto: any) {
    const idx = this.materialesSeleccionados.findIndex((m: any) => m.id_producto === producto.id);
    if (idx >= 0) {
      this.materialesSeleccionados.splice(idx, 1);
    } else {
      this.materialesSeleccionados.push({
        id_producto: producto.id,
        nombre_material: producto.nombre,
        nombre: producto.nombre,
        descripcion: producto.descripcion,
        imagen: producto.imagen,
        es_producto: true
      });
    }
  }

  isMaterialSeleccionado(producto: any): boolean {
    return this.materialesSeleccionados.some((m: any) => m.id_producto === producto.id);
  }

  agregarMaterialLibre() {
    const texto = this.materialTextoLibre.trim();
    if (!texto) return;

    // Verificar que no exista ya
    const yaExiste = this.materialesSeleccionados.some(
      (m: any) => m.nombre_material.toLowerCase() === texto.toLowerCase()
    );
    if (yaExiste) {
      Swal.fire('Ya existe', 'Ese material ya está en la lista.', 'info');
      return;
    }

    this.materialesSeleccionados.push({
      id_producto: null,
      nombre_material: texto,
      nombre: texto,
      es_producto: false
    });
    this.materialTextoLibre = '';
  }

  agregarMaterialConEnter(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.agregarMaterialLibre();
    }
  }

  quitarMaterial(index: number) {
    this.materialesSeleccionados.splice(index, 1);
  }

  // Modal de producto
  verProducto(material: any) {
    if (material.es_producto) {
      this.productoModal = material;
    }
  }

  cerrarModalProducto() {
    this.productoModal = null;
  }

  // --- Navegación del wizard ---
  paso1Valido(): boolean {
    return !!(this.idGrupo && this.idArea && this.idSprint &&
              this.descripcionDocente.trim().length >= 10 &&
              this.cantidadActividades >= 1 && this.cantidadActividades <= 10);
  }

  irAPaso2() {
    if (!this.paso1Valido()) {
      Swal.fire('Campos incompletos', 'Completa todos los campos obligatorios. La descripción debe tener al menos 10 caracteres.', 'warning');
      return;
    }
    this.generarActividades();
  }

  volverAPaso1() {
    this.pasoActual = 1;
    this.actividadesGeneradas = [];
    this.actividadesSeleccionadas = [];
  }

  volverAPaso2() {
    this.pasoActual = 2;
  }

  // --- Paso 2: Generación IA ---
  generarActividades() {
    this.cargandoIA = true;
    this.pasoActual = 2;

    const datos = {
      id_grupo: this.idGrupo,
      id_area: this.idArea,
      id_sprint: this.idSprint,
      id_tipo_actividad: this.idTipoActividad,
      cantidad: this.cantidadActividades,
      descripcion_docente: this.descripcionDocente,
      nombre_grupo: this.nombreGrupo,
      nombre_area: this.nombreArea,
      ambientes: this.ambientesSeleccionados.map((a: any) => ({ id: a.id, nombre: a.nombre })),
      materiales: this.materialesSeleccionados.map((m: any) => ({
        id_producto: m.id_producto,
        nombre: m.nombre_material
      }))
    };

    this.iaMaquinaService.generarActividades(datos).subscribe({
      next: (resp: any) => {
        this.cargandoIA = false;
        if (resp.success) {
          this.actividadesGeneradas = resp.actividades || [];
          this.logrosDisponibles = resp.logros_disponibles || [];
          this.proveedorIA = resp.proveedor || '';
          this.tiempoIA = resp.tiempo_ms || 0;
          // Todas seleccionadas por defecto
          this.actividadesSeleccionadas = this.actividadesGeneradas.map(() => true);
          // Inicializar buscadores de indicadores
          this.busquedaIndicador = {};
          this.actividadesGeneradas.forEach((_, idx) => { this.busquedaIndicador[idx] = ''; });
        } else {
          Swal.fire('Error', resp.error || 'No se pudieron generar actividades.', 'error');
        }
      },
      error: (err: any) => {
        this.cargandoIA = false;
        console.error('Error generando actividades', err);
        const mensaje = err?.error?.error || 'Error de conexión con el servicio de IA.';
        Swal.fire('Error', mensaje, 'error');
      }
    });
  }

  toggleSeleccionActividad(index: number) {
    this.actividadesSeleccionadas[index] = !this.actividadesSeleccionadas[index];
  }

  seleccionarTodas() {
    this.actividadesSeleccionadas = this.actividadesGeneradas.map(() => true);
  }

  deseleccionarTodas() {
    this.actividadesSeleccionadas = this.actividadesGeneradas.map(() => false);
  }

  cantidadSeleccionadas(): number {
    return this.actividadesSeleccionadas.filter(s => s).length;
  }

  // Editar campo de una actividad generada
  editarCampoActividad(index: number, campo: string, valor: any) {
    this.actividadesGeneradas[index][campo] = valor;
  }

  // Quitar un indicador de una actividad
  quitarIndicadorDeActividad(actIndex: number, indId: number) {
    const act = this.actividadesGeneradas[actIndex];
    act.indicadores_ids = act.indicadores_ids.filter((id: number) => id !== indId);
    act.indicadores = act.indicadores.filter((ind: any) => ind.id !== indId);
  }

  // Toggle indicador: agrega o quita
  toggleIndicadorEnActividad(actIndex: number, indicadorId: number) {
    const act = this.actividadesGeneradas[actIndex];
    const yaExiste = act.indicadores_ids.includes(indicadorId);

    if (yaExiste) {
      // Quitar
      act.indicadores_ids = act.indicadores_ids.filter((id: number) => id !== indicadorId);
      act.indicadores = act.indicadores.filter((ind: any) => ind.id !== indicadorId);
    } else {
      // Agregar
      for (const logro of this.logrosDisponibles) {
        for (const ind of logro.indicadores) {
          if (ind.id === indicadorId) {
            act.indicadores_ids.push(indicadorId);
            act.indicadores.push({
              id: ind.id,
              nombre: ind.nombre,
              logro_id: logro.id,
              logro_nombre: logro.nombre
            });
            return;
          }
        }
      }
    }
  }

  // Agregar indicador a una actividad (mantener por compatibilidad)
  agregarIndicadorAActividad(actIndex: number, indicadorId: number) {
    this.toggleIndicadorEnActividad(actIndex, indicadorId);
  }

  // Filtro de búsqueda de indicadores
  indicadorCoincideBusqueda(ind: any, actIndex: number): boolean {
    const busqueda = (this.busquedaIndicador[actIndex] || '').toLowerCase().trim();
    if (!busqueda) return true;
    return ind.nombre.toLowerCase().includes(busqueda);
  }

  tieneIndicadoresFiltrados(logro: any, actIndex: number): boolean {
    return logro.indicadores.some((ind: any) => this.indicadorCoincideBusqueda(ind, actIndex));
  }

  // --- Paso 3: Confirmar y grabar ---
  irAPaso3() {
    if (this.cantidadSeleccionadas() === 0) {
      Swal.fire('Sin selección', 'Debes seleccionar al menos una actividad.', 'warning');
      return;
    }
    this.pasoActual = 3;
  }

  getActividadesParaGrabar(): any[] {
    return this.actividadesGeneradas.filter((_, i) => this.actividadesSeleccionadas[i]);
  }

  confirmarYGrabar() {
    const actividadesFinales = this.getActividadesParaGrabar();

    if (actividadesFinales.length === 0) {
      Swal.fire('Sin actividades', 'No hay actividades seleccionadas para grabar.', 'warning');
      return;
    }

    Swal.fire({
      title: '¿Confirmar creación?',
      html: `Se crearán <strong>${actividadesFinales.length}</strong> actividad${actividadesFinales.length > 1 ? 'es' : ''} y se asociarán al sprint <strong>${this.nombreSprint}</strong> para <strong>${this.nombreGrupo}</strong> - <strong>${this.nombreArea}</strong>.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#F5A623',
      cancelButtonColor: '#2C2C2C',
      confirmButtonText: 'Sí, crear actividades',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.ejecutarGrabado(actividadesFinales);
      }
    });
  }

  private ejecutarGrabado(actividades: any[]) {
    Swal.fire({
      title: 'Creando actividades...',
      html: `Grabando ${actividades.length} actividad${actividades.length > 1 ? 'es' : ''}...`,
      allowOutsideClick: false,
      didOpen: () => { Swal.showLoading(); }
    });

    // Preparar payload con materiales por actividad
    const actividadesPayload = actividades.map((act: any) => {
      // Construir materiales: los sugeridos por la IA que coincidan con los seleccionados
      const materialesAct: any[] = [];
      if (act.materiales_sugeridos) {
        act.materiales_sugeridos.forEach((nombreMat: string) => {
          const encontrado = this.materialesSeleccionados.find(
            (m: any) => m.nombre_material.toLowerCase() === nombreMat.toLowerCase()
          );
          if (encontrado) {
            materialesAct.push({
              id_producto: encontrado.id_producto,
              nombre_material: encontrado.nombre_material,
              cantidad: 1
            });
          } else {
            // Material sugerido por IA que no estaba en la selección original
            materialesAct.push({
              id_producto: null,
              nombre_material: nombreMat,
              cantidad: 1
            });
          }
        });
      }

      return {
        titulo: act.titulo,
        descripcion: act.descripcion,
        nivel_uno: act.nivel_uno,
        nivel_dos: act.nivel_dos,
        minutos_duracion: act.minutos_duracion,
        id_tipo_actividad_academica: act.id_tipo_actividad_academica,
        id_ambiente: act.id_ambiente,
        indicadores_ids: act.indicadores_ids || [],
        materiales: materialesAct
      };
    });

    const payload = {
      id_sprint: this.idSprint,
      id_grupo: this.idGrupo,
      id_area: this.idArea,
      actividades: actividadesPayload
    };

    this.iaMaquinaService.grabarActividades(payload).subscribe({
      next: (resp: any) => {
        if (resp.success) {
          Swal.fire({
            title: '¡Actividades creadas!',
            html: `Se crearon <strong>${resp.total_creadas}</strong> actividad${resp.total_creadas > 1 ? 'es' : ''} y se asociaron al sprint correctamente.`,
            icon: 'success',
            confirmButtonColor: '#F5A623',
            confirmButtonText: 'Ver Sprint'
          }).then(() => {
            this.router.navigate(['academico/sprints/editar', this.idSprint]);
          });
        } else {
          Swal.fire('Error', resp.error || 'Error al grabar actividades.', 'error');
        }
      },
      error: (err: any) => {
        console.error('Error grabando actividades', err);
        Swal.fire('Error', 'No se pudieron grabar las actividades. Intente nuevamente.', 'error');
      }
    });
  }

  getNombreTipoActividad(id: any): string {
    const tipo = this.tiposActividad.find((t: any) => t.id == id);
    return tipo?.nombre || 'N/A';
  }

  getNombreAmbiente(id: any): string {
    const amb = this.ambientes.find((a: any) => a.id == id);
    return amb?.nombre || 'N/A';
  }

  getIconoAmbiente(id: any): string {
    const amb = this.ambientes.find((a: any) => a.id == id);
    return amb?.icono || '📍';
  }

  // Búsqueda de productos del inventario
  productoCoincideBusqueda(prod: any): boolean {
    const busqueda = (this.busquedaProducto || '').toLowerCase().trim();
    if (!busqueda) return true;
    return prod.nombre.toLowerCase().includes(busqueda);
  }

  incluirTodosProductos() {
    this.productosDisponibles.forEach((prod: any) => {
      if (!this.isMaterialSeleccionado(prod)) {
        this.materialesSeleccionados.push({
          id_producto: prod.id,
          nombre_material: prod.nombre,
          nombre: prod.nombre,
          descripcion: prod.descripcion,
          imagen: prod.imagen,
          es_producto: true
        });
      }
    });
  }

  verProductoDetalle(prod: any) {
    this.productoModal = {
      nombre: prod.nombre,
      nombre_material: prod.nombre,
      descripcion: prod.descripcion,
      imagen: prod.imagen,
      tipo_producto_academico: prod.tipo_producto_academico
    };
  }

  volver() {
    this.router.navigate(['academico/selector-actividades']);
  }
}