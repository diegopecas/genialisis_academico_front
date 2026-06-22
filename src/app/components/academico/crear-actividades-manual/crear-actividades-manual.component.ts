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
import { LogrosService } from '../../../services/logros.service';
import { MaterialesXActividadService } from '../../../services/materiales-x-actividad.service';
import { SprintsService } from '../../../services/sprints.service';
import { TiposActividadesAcademicasService } from '../../../services/tipos-actividades-academicas.service';

@Component({
  selector: 'app-crear-actividades-manual',
  templateUrl: './crear-actividades-manual.component.html',
  styleUrl: './crear-actividades-manual.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent]
})
export class CrearActividadesManualComponent implements OnInit {
  public titulo = "Mis Actividades";
  public pasoActual: number = 1;

  // Catálogos
  public grupos: any[] = [];
  public areas: any[] = [];
  public todasLasAreasGrupo: any[] = [];
  public sprints: any[] = [];
  public ambientes: any[] = [];
  public productosDisponibles: any[] = [];
  public tiposActividad: any[] = [];

  // Paso 1
  public idGrupo: any = '';
  public idArea: any = '';
  public idSprint: any = '';
  public idTipoActividad: any = '';
  public ambientesSeleccionados: any[] = [];
  public materialesSeleccionados: any[] = [];
  public materialTextoLibre: string = '';
  public busquedaProducto: string = '';

  // Paso 2 - Formulario de actividad
  public formActividad = {
    titulo: '',
    descripcion: '',
    nivel_uno: '',
    nivel_dos: '',
    minutos_duracion: 45,
    id_tipo_actividad_academica: '' as any,
    id_ambiente: null as any,
    materiales_sugeridos: [] as string[],
    indicadores_ids: [] as string[],
    indicadores: [] as any[]
  };
  public busquedaIndicadorForm: string = '';
  public sugiriendoIA: boolean = false;

  // Actividades agregadas
  public actividadesAgregadas: any[] = [];
  public actividadesSeleccionadas: boolean[] = [];
  public logrosDisponibles: any[] = [];
  public busquedaIndicador: { [key: string]: string } = {};

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
    private iaMaquinaService: IaMaquinaActividadesService,
    private logrosService: LogrosService
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
        const hoy = new Date().toISOString().split('T')[0];
        const todosSprints = resp.sprints.body || [];
        this.sprints = todosSprints.filter((s: any) => s.actual == 1 || s.fecha_final >= hoy);
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
    if (!this.idGrupo) { this.areas = []; return; }
    const grupo = this.grupos.find((g: any) => g.id == this.idGrupo);
    this.nombreGrupo = grupo?.nombre || '';
    this.areas = this.todasLasAreasGrupo
      .filter((axg: any) => axg.id_grupo == this.idGrupo)
      .map((axg: any) => ({ id: axg.id_area_academica, nombre: axg.nombre_area || axg.nombre_area_academica }));
    this.materialesService.obtenerProductosPorGrupo(this.idGrupo).subscribe({
      next: (resp: any) => { this.productosDisponibles = resp.body || []; }
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

  // Ambientes
  toggleAmbiente(ambiente: any) {
    const idx = this.ambientesSeleccionados.findIndex((a: any) => a.id === ambiente.id);
    if (idx >= 0) { this.ambientesSeleccionados.splice(idx, 1); }
    else { this.ambientesSeleccionados.push(ambiente); }
  }
  isAmbienteSeleccionado(ambiente: any): boolean {
    return this.ambientesSeleccionados.some((a: any) => a.id === ambiente.id);
  }

  // Materiales
  toggleMaterial(producto: any) {
    const idx = this.materialesSeleccionados.findIndex((m: any) => m.id_producto === producto.id);
    if (idx >= 0) { this.materialesSeleccionados.splice(idx, 1); }
    else {
      this.materialesSeleccionados.push({
        id_producto: producto.id, nombre_material: producto.nombre, nombre: producto.nombre,
        descripcion: producto.descripcion, imagen: producto.imagen, es_producto: true
      });
    }
  }
  isMaterialSeleccionado(producto: any): boolean {
    return this.materialesSeleccionados.some((m: any) => m.id_producto === producto.id);
  }
  agregarMaterialLibre() {
    const texto = this.materialTextoLibre.trim();
    if (!texto) return;
    if (this.materialesSeleccionados.some((m: any) => m.nombre_material.toLowerCase() === texto.toLowerCase())) {
      Swal.fire('Ya existe', 'Ese material ya está en la lista.', 'info'); return;
    }
    this.materialesSeleccionados.push({ id_producto: null, nombre_material: texto, nombre: texto, es_producto: false });
    this.materialTextoLibre = '';
  }
  agregarMaterialConEnter(event: KeyboardEvent) {
    if (event.key === 'Enter') { event.preventDefault(); this.agregarMaterialLibre(); }
  }
  quitarMaterial(index: number) { this.materialesSeleccionados.splice(index, 1); }
  productoCoincideBusqueda(prod: any): boolean {
    const busqueda = (this.busquedaProducto || '').toLowerCase().trim();
    if (!busqueda) return true;
    return prod.nombre.toLowerCase().includes(busqueda);
  }
  incluirTodosProductos() {
    this.productosDisponibles.forEach((prod: any) => {
      if (!this.isMaterialSeleccionado(prod)) {
        this.materialesSeleccionados.push({
          id_producto: prod.id, nombre_material: prod.nombre, nombre: prod.nombre,
          descripcion: prod.descripcion, imagen: prod.imagen, es_producto: true
        });
      }
    });
  }
  verProducto(material: any) { if (material.es_producto) { this.productoModal = material; } }
  verProductoDetalle(prod: any) {
    this.productoModal = { nombre: prod.nombre, nombre_material: prod.nombre, descripcion: prod.descripcion, imagen: prod.imagen, tipo_producto_academico: prod.tipo_producto_academico };
  }
  cerrarModalProducto() { this.productoModal = null; }

  // Navegación
  paso1Valido(): boolean {
    return !!(this.idGrupo && this.idArea && this.idSprint);
  }

  irAPaso2() {
    if (!this.paso1Valido()) {
      Swal.fire('Campos incompletos', 'Selecciona grupo, área y sprint.', 'warning');
      return;
    }
    // Cargar logros disponibles para indicadores
    this.cargarLogrosDisponibles();
    // Preconfigurar el formulario con selecciones del paso 1
    this.formActividad.id_tipo_actividad_academica = this.idTipoActividad || '';
    this.formActividad.id_ambiente = this.ambientesSeleccionados.length === 1 ? this.ambientesSeleccionados[0].id : null;
    this.pasoActual = 2;
  }

  cargarLogrosDisponibles() {
    this.logrosService.obtenerByGrupoAreaConIndicadores(this.idGrupo, this.idArea)
      .subscribe({
        next: (resp: any) => {
          this.logrosDisponibles = resp.body || [];
        },
        error: () => {
          this.logrosDisponibles = [];
        }
      });
  }

  volverAPaso1() {
    this.pasoActual = 1;
  }

  volverAPaso2() {
    this.pasoActual = 2;
  }

  // Formulario de actividad
  limpiarFormActividad() {
    this.formActividad = {
      titulo: '',
      descripcion: '',
      nivel_uno: '',
      nivel_dos: '',
      minutos_duracion: 45,
      id_tipo_actividad_academica: this.idTipoActividad || '',
      id_ambiente: this.ambientesSeleccionados.length === 1 ? this.ambientesSeleccionados[0].id : null,
      materiales_sugeridos: [],
      indicadores_ids: [],
      indicadores: []
    };
    this.busquedaIndicadorForm = '';
  }

  formActividadValido(): boolean {
    return !!(this.formActividad.titulo.trim());
  }

  // Sugerir con IA
  sugerirConIA() {
    if (!this.formActividad.titulo.trim()) {
      Swal.fire('Título requerido', 'Escribe al menos el título de la actividad para que la IA pueda sugerir.', 'info');
      return;
    }

    this.sugiriendoIA = true;

    const datos = {
      titulo: this.formActividad.titulo,
      descripcion: this.formActividad.descripcion,
      id_grupo: this.idGrupo,
      id_area: this.idArea,
      id_sprint: this.idSprint,
      nombre_grupo: this.nombreGrupo,
      nombre_area: this.nombreArea,
      id_tipo_actividad: this.formActividad.id_tipo_actividad_academica || this.idTipoActividad,
      ambientes: this.ambientesSeleccionados.map((a: any) => ({ id: a.id, nombre: a.nombre })),
      materiales: this.materialesSeleccionados.map((m: any) => ({ id_producto: m.id_producto, nombre: m.nombre_material }))
    };

    this.iaMaquinaService.sugerirIndividual(datos).subscribe({
      next: (resp: any) => {
        this.sugiriendoIA = false;
        if (resp.success && resp.sugerencia) {
          const s = resp.sugerencia;
          // Solo llenar campos vacíos
          if (!this.formActividad.nivel_uno && s.nivel_uno) this.formActividad.nivel_uno = s.nivel_uno;
          if (!this.formActividad.nivel_dos && s.nivel_dos) this.formActividad.nivel_dos = s.nivel_dos;
          if (!this.formActividad.descripcion && s.descripcion) this.formActividad.descripcion = s.descripcion;
          if (s.minutos_duracion && this.formActividad.minutos_duracion === 45) this.formActividad.minutos_duracion = s.minutos_duracion;
          if (s.id_ambiente && !this.formActividad.id_ambiente) this.formActividad.id_ambiente = s.id_ambiente;
          if (s.materiales_sugeridos && this.formActividad.materiales_sugeridos.length === 0) {
            this.formActividad.materiales_sugeridos = s.materiales_sugeridos;
          }
          if (s.indicadores_ids && this.formActividad.indicadores_ids.length === 0) {
            this.formActividad.indicadores_ids = s.indicadores_ids;
            this.formActividad.indicadores = s.indicadores || [];
          }
          Swal.fire({ title: '🪄 Sugerencias aplicadas', text: `Campos completados por IA (${resp.proveedor} · ${resp.tiempo_ms}ms)`, icon: 'success', timer: 2000, showConfirmButton: false });
        }
      },
      error: (err: any) => {
        this.sugiriendoIA = false;
        console.error('Error sugiriendo', err);
        Swal.fire('Error', 'No se pudo obtener la sugerencia de IA.', 'error');
      }
    });
  }

  // Agregar actividad a la lista
  agregarActividad() {
    if (!this.formActividadValido()) {
      Swal.fire('Título requerido', 'Escribe al menos el título de la actividad.', 'warning');
      return;
    }

    const nuevaActividad = {
      titulo: this.formActividad.titulo,
      descripcion: this.formActividad.descripcion,
      nivel_uno: this.formActividad.nivel_uno,
      nivel_dos: this.formActividad.nivel_dos,
      minutos_duracion: this.formActividad.minutos_duracion,
      id_tipo_actividad_academica: this.formActividad.id_tipo_actividad_academica || this.idTipoActividad || null,
      id_ambiente: this.formActividad.id_ambiente ? this.formActividad.id_ambiente : null,
      materiales_sugeridos: [...this.formActividad.materiales_sugeridos],
      indicadores_ids: [...this.formActividad.indicadores_ids],
      indicadores: [...this.formActividad.indicadores]
    };

    this.actividadesAgregadas.push(nuevaActividad);
    this.actividadesSeleccionadas.push(true);
    this.busquedaIndicador[this.actividadesAgregadas.length - 1] = '';
    this.limpiarFormActividad();

    Swal.fire({ title: '✅ Actividad agregada', text: `"${nuevaActividad.titulo}" añadida a la lista.`, icon: 'success', timer: 1500, showConfirmButton: false });
  }

  // Toggle material en el formulario
  toggleMaterialForm(nombreMaterial: string) {
    const idx = this.formActividad.materiales_sugeridos.indexOf(nombreMaterial);
    if (idx >= 0) {
      this.formActividad.materiales_sugeridos.splice(idx, 1);
    } else {
      this.formActividad.materiales_sugeridos.push(nombreMaterial);
    }
  }

  // Indicadores en el formulario
  toggleIndicadorForm(indicadorId: string) {
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

  quitarIndicadorForm(indId: string) {
    this.formActividad.indicadores_ids = this.formActividad.indicadores_ids.filter((id: string) => id !== indId);
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

  // Eliminar actividad de la lista
  eliminarActividad(index: number) {
    Swal.fire({
      title: '¿Eliminar?', text: `¿Quitar "${this.actividadesAgregadas[index].titulo}" de la lista?`,
      icon: 'warning', showCancelButton: true, confirmButtonColor: '#F5A623', cancelButtonColor: '#2C2C2C',
      confirmButtonText: 'Sí, quitar', cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.actividadesAgregadas.splice(index, 1);
        this.actividadesSeleccionadas.splice(index, 1);
      }
    });
  }

  // Indicadores en tarjetas (reutilizado de maquina-actividades)
  quitarIndicadorDeActividad(actIndex: number, indId: string) {
    const act = this.actividadesAgregadas[actIndex];
    act.indicadores_ids = act.indicadores_ids.filter((id: string) => id !== indId);
    act.indicadores = act.indicadores.filter((ind: any) => ind.id !== indId);
  }
  toggleIndicadorEnActividad(actIndex: number, indicadorId: string) {
    const act = this.actividadesAgregadas[actIndex];
    const yaExiste = act.indicadores_ids.includes(indicadorId);
    if (yaExiste) {
      act.indicadores_ids = act.indicadores_ids.filter((id: string) => id !== indicadorId);
      act.indicadores = act.indicadores.filter((ind: any) => ind.id !== indicadorId);
    } else {
      for (const logro of this.logrosDisponibles) {
        for (const ind of logro.indicadores) {
          if (ind.id === indicadorId) {
            act.indicadores_ids.push(indicadorId);
            act.indicadores.push({ id: ind.id, nombre: ind.nombre, logro_id: logro.id, logro_nombre: logro.nombre });
            return;
          }
        }
      }
    }
  }
  indicadorCoincideBusqueda(ind: any, actIndex: number): boolean {
    const busqueda = (this.busquedaIndicador[actIndex] || '').toLowerCase().trim();
    if (!busqueda) return true;
    return ind.nombre.toLowerCase().includes(busqueda);
  }
  tieneIndicadoresFiltrados(logro: any, actIndex: number): boolean {
    return logro.indicadores.some((ind: any) => this.indicadorCoincideBusqueda(ind, actIndex));
  }

  // Paso 3
  cantidadSeleccionadas(): number {
    return this.actividadesSeleccionadas.filter(s => s).length;
  }

  irAPaso3() {
    if (this.actividadesAgregadas.length === 0) {
      Swal.fire('Sin actividades', 'Agrega al menos una actividad.', 'warning');
      return;
    }
    this.pasoActual = 3;
  }

  getActividadesParaGrabar(): any[] {
    return this.actividadesAgregadas.filter((_, i) => this.actividadesSeleccionadas[i]);
  }

  confirmarYGrabar() {
    const actividadesFinales = this.getActividadesParaGrabar();
    if (actividadesFinales.length === 0) {
      Swal.fire('Sin actividades', 'No hay actividades seleccionadas.', 'warning');
      return;
    }

    Swal.fire({
      title: '¿Confirmar creación?',
      html: `Se crearán <strong>${actividadesFinales.length}</strong> actividad${actividadesFinales.length > 1 ? 'es' : ''} en el sprint <strong>${this.nombreSprint}</strong> para <strong>${this.nombreGrupo}</strong> - <strong>${this.nombreArea}</strong>.`,
      icon: 'question', showCancelButton: true, confirmButtonColor: '#F5A623', cancelButtonColor: '#2C2C2C',
      confirmButtonText: 'Sí, crear', cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) { this.ejecutarGrabado(actividadesFinales); }
    });
  }

  private ejecutarGrabado(actividades: any[]) {
    Swal.fire({ title: 'Creando actividades...', html: `Grabando ${actividades.length} actividad${actividades.length > 1 ? 'es' : ''}...`, allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });

    const actividadesPayload = actividades.map((act: any) => {
      const materialesAct: any[] = [];
      if (act.materiales_sugeridos) {
        act.materiales_sugeridos.forEach((nombreMat: string) => {
          const encontrado = this.materialesSeleccionados.find((m: any) => m.nombre_material.toLowerCase() === nombreMat.toLowerCase());
          materialesAct.push({
            id_producto: encontrado?.id_producto || null,
            nombre_material: nombreMat,
            cantidad: 1
          });
        });
      }
      return {
        titulo: act.titulo, descripcion: act.descripcion, nivel_uno: act.nivel_uno, nivel_dos: act.nivel_dos,
        minutos_duracion: act.minutos_duracion, id_tipo_actividad_academica: act.id_tipo_actividad_academica,
        id_ambiente: act.id_ambiente, indicadores_ids: act.indicadores_ids || [], materiales: materialesAct
      };
    });

    this.iaMaquinaService.grabarActividades({
      id_sprint: this.idSprint, id_grupo: this.idGrupo, id_area: this.idArea, actividades: actividadesPayload
    }).subscribe({
      next: (resp: any) => {
        if (resp.success) {
          Swal.fire({ title: '¡Actividades creadas!', html: `Se crearon <strong>${resp.total_creadas}</strong> actividad${resp.total_creadas > 1 ? 'es' : ''} correctamente.`, icon: 'success', confirmButtonColor: '#F5A623', confirmButtonText: 'Aceptar' }).then(() => {
            this.actividadesAgregadas = [];
            this.actividadesSeleccionadas = [];
            this.pasoActual = 1;
          });
        } else { Swal.fire('Error', resp.error || 'Error al grabar.', 'error'); }
      },
      error: () => { Swal.fire('Error', 'No se pudieron grabar las actividades.', 'error'); }
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
  getIconoTipoActividad(id: any): string {
    const tipo = this.tiposActividad.find((t: any) => t.id == id);
    return tipo?.icono || '📌';
  }

  volver() { this.router.navigate(['academico/selector-actividades']); }
}