import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { HeaderComponent } from '../../../common/header/header.component';
import { AmbientesService } from '../../../services/ambientes.service';
import { AreaAcademicaXGrupoService } from '../../../services/area-academica-x-grupo.service';
import { CortesAcademicosService } from '../../../services/cortes-academicos.service';
import { GruposService } from '../../../services/grupos.service';
import { IaMaquinaActividadesService } from '../../../services/ia-maquina-actividades.service';
import { MaterialesXActividadService } from '../../../services/materiales-x-actividad.service';
import { SprintsService } from '../../../services/sprints.service';
import { TiposActividadesAcademicasService } from '../../../services/tipos-actividades-academicas.service';

type ModoGeneracion = 'mecanico' | 'ia' | 'manual';

@Component({
  selector: 'app-crear-actividades-evaluacion',
  templateUrl: './crear-actividades-evaluacion.component.html',
  styleUrl: './crear-actividades-evaluacion.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent]
})
export class CrearActividadesEvaluacionComponent implements OnInit {
  public titulo = "Actividades de Evaluación";
  public pasoActual: number = 1;

  // Texto estándar para descripción mecánica
  private readonly TEXTO_DESCRIPCION_MECANICA = 'Lleve a cabo una actividad que permita evaluar si el niño ha alcanzado la conducta esperada: ';
  private readonly TEXTO_NIVEL_ESTANDAR = 'Se realiza según el nivel del estudiante';

  // Catálogos
  public grupos: any[] = [];
  public cortes: any[] = [];
  public areas: any[] = [];
  public todasLasAreasGrupo: any[] = [];
  public sprints: any[] = [];
  public sprintsEvaluacion: any[] = [];
  public ambientes: any[] = [];
  public productosDisponibles: any[] = [];
  public tiposActividad: any[] = [];

  // Paso 1
  public idGrupo: any = '';
  public idCorte: any = '';
  public idArea: any = '';
  public idSprint: any = '';
  public idTipoActividad: any = '';
  public ambientesSeleccionados: any[] = [];
  public materialesSeleccionados: any[] = [];
  public materialTextoLibre: string = '';
  public busquedaProducto: string = '';

  // Paso 2 - Logros
  public logrosDisponibles: any[] = [];
  public logrosSeleccionados: { [key: number]: boolean } = {};
  public cargandoLogros: boolean = false;
  // Mapa de actividades existentes por logro: { id_logro: [{id_actividad, titulo, descripcion}] }
  public actividadesExistentesPorLogro: { [key: number]: any[] } = {};
  // Snapshot de la config con la que se cargaron los logros, para detectar cambios al volver al paso 1
  private configCargadaLogros: string = '';
  // Snapshot del set de logros seleccionados con el que se generaron las actividades
  private configGeneradasActividades: string = '';

  // Paso 3 - Generación (tabs)
  public modoActivo: ModoGeneracion = 'mecanico';
  public generando: boolean = false;
  public actividadesGeneradas: any[] = [];
  // Filtro por área (compartido en los 3 tabs)
  public filtroArea: any = '';

  // Modal de producto
  public productoModal: any = null;

  // Info contextual
  public nombreGrupo: string = '';
  public nombreCorte: string = '';
  public nombreArea: string = '';
  public nombreSprint: string = '';
  public nombreTipoActividad: string = '';

  constructor(
    private router: Router,
    private gruposService: GruposService,
    private areaXGrupoService: AreaAcademicaXGrupoService,
    private cortesService: CortesAcademicosService,
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
      cortes: this.cortesService.obtenerTodos(),
      sprints: this.sprintsService.obtenerTodos(),
      ambientes: this.ambientesService.obtenerActivos(),
      tipos: this.tiposActividadesService.obtenerTodos(),
      areasGrupo: this.areaXGrupoService.obtenerTodas()
    }).subscribe({
      next: (resp: any) => {
        this.grupos = resp.grupos.body || [];
        this.cortes = resp.cortes.body || [];
        this.ambientes = resp.ambientes.body || [];
        this.tiposActividad = resp.tipos.body || [];
        this.todasLasAreasGrupo = resp.areasGrupo.body || [];
        this.sprints = resp.sprints.body || [];
      },
      error: () => {
        Swal.fire('Error', 'No se pudieron cargar los catálogos.', 'error');
      }
    });
  }

  onGrupoChange() {
    this.idArea = '';
    this.productosDisponibles = [];
    this.materialesSeleccionados = [];
    this.actividadesExistentesPorLogro = {};
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

  onCorteChange() {
    const corte = this.cortes.find((c: any) => c.id == this.idCorte);
    this.nombreCorte = corte?.nombre || '';
    this.sprintsEvaluacion = this.sprints.filter((s: any) =>
      s.es_evaluacion == 1 && s.id_corte_academico == this.idCorte
    );
    if (this.sprintsEvaluacion.length > 0) {
      this.idSprint = this.sprintsEvaluacion[0].id;
      this.onSprintChange();
    } else {
      this.idSprint = '';
      this.nombreSprint = '';
      this.actividadesExistentesPorLogro = {};
    }
  }

  onAreaChange() {
    const area = this.areas.find((a: any) => a.id == this.idArea);
    this.nombreArea = area ? area.nombre : 'Todas las áreas';
  }

  onSprintChange() {
    const sprint = this.sprintsEvaluacion.find((s: any) => s.id == this.idSprint);
    this.nombreSprint = sprint?.nombre_sprint || '';
    // Cargar actividades existentes en este sprint
    if (this.idSprint) {
      this.cargarActividadesExistentesSprint();
    } else {
      this.actividadesExistentesPorLogro = {};
    }
  }

  cargarActividadesExistentesSprint() {
    this.iaMaquinaService.obtenerActividadesPorLogroEnSprint(this.idSprint).subscribe({
      next: (resp: any) => {
        if (resp.success) {
          this.actividadesExistentesPorLogro = resp.actividades_por_logro || {};
        }
      },
      error: () => {
        // No bloqueamos el flujo si falla; solo dejamos el mapa vacío
        this.actividadesExistentesPorLogro = {};
      }
    });
  }

  onTipoActividadChange(idTipo: any) {
    this.idTipoActividad = idTipo;
    const tipo = this.tiposActividad.find((t: any) => t.id == idTipo);
    this.nombreTipoActividad = tipo?.nombre || '';
  }

  // ============ AMBIENTES ============
  toggleAmbiente(ambiente: any) {
    const idx = this.ambientesSeleccionados.findIndex((a: any) => a.id === ambiente.id);
    if (idx >= 0) { this.ambientesSeleccionados.splice(idx, 1); }
    else { this.ambientesSeleccionados.push(ambiente); }
  }
  isAmbienteSeleccionado(ambiente: any): boolean {
    return this.ambientesSeleccionados.some((a: any) => a.id === ambiente.id);
  }

  // ============ MATERIALES ============
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

  // ============ NAVEGACIÓN ============
  paso1Valido(): boolean {
    return !!(this.idGrupo && this.idCorte && this.idSprint && this.idTipoActividad);
  }

  // Snapshot de la config del paso 1 que afecta los logros disponibles
  private getConfigActualLogros(): string {
    return JSON.stringify({
      idGrupo: this.idGrupo,
      idCorte: this.idCorte,
      idArea: this.idArea,
      idSprint: this.idSprint
    });
  }

  // Snapshot del set de logros + tipo/ambientes/materiales con que se generaron las actividades
  private getConfigActualGeneradas(): string {
    const logrosIds = this.getLogrosSeleccionadosArray().map((l: any) => l.id).sort();
    return JSON.stringify({
      logros: logrosIds,
      idTipo: this.idTipoActividad,
      ambientes: this.ambientesSeleccionados.map((a: any) => a.id).sort(),
      materiales: this.materialesSeleccionados.map((m: any) => m.id_producto || m.nombre_material).sort()
    });
  }

  irAPaso2() {
    if (!this.paso1Valido()) {
      Swal.fire('Campos incompletos', 'Selecciona grupo, corte, sprint de evaluación y tipo de actividad.', 'warning');
      return;
    }
    const configActual = this.getConfigActualLogros();
    // Si la config cambió respecto a la última carga, recargamos logros (e invalidamos actividades).
    // Si no cambió, mantenemos la selección actual y las actividades.
    if (configActual !== this.configCargadaLogros) {
      // Si había actividades generadas con otra config, advertir
      if (this.actividadesGeneradas.length > 0) {
        Swal.fire({
          title: 'La configuración cambió',
          text: 'Cambiaste el grupo, corte, área o sprint. Se descartarán los logros y actividades anteriores.',
          icon: 'warning', showCancelButton: true,
          confirmButtonColor: '#F5A623', cancelButtonColor: '#2C2C2C',
          confirmButtonText: 'Sí, recargar', cancelButtonText: 'Cancelar'
        }).then((result) => {
          if (result.isConfirmed) {
            this.actividadesGeneradas = [];
            this.configGeneradasActividades = '';
            this.cargarLogrosEvaluacion();
            this.pasoActual = 2;
          }
        });
        return;
      }
      this.cargarLogrosEvaluacion();
    }
    this.pasoActual = 2;
  }

  cargarLogrosEvaluacion() {
    this.cargandoLogros = true;
    this.logrosDisponibles = [];
    this.logrosSeleccionados = {};

    const datos: any = {
      id_grupo: this.idGrupo,
      id_corte: this.idCorte
    };
    if (this.idArea) {
      datos.id_area = this.idArea;
    }

    this.iaMaquinaService.obtenerLogrosEvaluacion(datos).subscribe({
      next: (resp: any) => {
        this.cargandoLogros = false;
        if (resp.success) {
          this.logrosDisponibles = resp.logros || [];
          // Por defecto seleccionados, EXCEPTO los que ya tienen actividad en el sprint
          this.logrosDisponibles.forEach((l: any) => {
            this.logrosSeleccionados[l.id] = !this.logroYaCubierto(l.id);
          });
          // Guardar snapshot de la config con la que se cargaron
          this.configCargadaLogros = this.getConfigActualLogros();
        } else {
          Swal.fire('Error', resp.error || 'No se pudieron cargar los logros.', 'error');
        }
      },
      error: () => {
        this.cargandoLogros = false;
        Swal.fire('Error', 'No se pudieron cargar los logros del corte.', 'error');
      }
    });
  }

  irAPaso3() {
    if (this.cantidadLogrosSeleccionados() === 0) {
      Swal.fire('Sin logros', 'Selecciona al menos un logro.', 'warning');
      return;
    }
    const configActual = this.getConfigActualGeneradas();
    // Si ya hay actividades generadas y la config (logros + tipo + ambientes + materiales) no cambió, las conservamos.
    // Si cambió o no hay, reseteamos.
    if (this.actividadesGeneradas.length > 0 && configActual !== this.configGeneradasActividades) {
      Swal.fire({
        title: 'Los logros cambiaron',
        text: 'Cambiaste la selección de logros u otra configuración. Se descartarán las actividades generadas anteriormente.',
        icon: 'warning', showCancelButton: true,
        confirmButtonColor: '#F5A623', cancelButtonColor: '#2C2C2C',
        confirmButtonText: 'Continuar', cancelButtonText: 'Cancelar'
      }).then((result) => {
        if (result.isConfirmed) {
          this.actividadesGeneradas = [];
          this.modoActivo = 'mecanico';
          this.filtroArea = '';
          this.configGeneradasActividades = '';
          this.pasoActual = 3;
        }
      });
      return;
    }
    // Si no había actividades, reseteamos el modo a 'mecanico' y auto-generamos
    if (this.actividadesGeneradas.length === 0) {
      this.modoActivo = 'mecanico';
      this.filtroArea = '';
      this.pasoActual = 3;
      // Auto-generar mecánico para que el usuario vea las actividades de inmediato
      this.generarMecanico(true);
      return;
    }
    this.pasoActual = 3;
  }

  irAPaso4() {
    // Red de seguridad: si hay actividades con título vacío en modo mecánico/IA, las completamos
    if (this.modoActivo === 'mecanico' || this.modoActivo === 'ia') {
      this.actividadesGeneradas.forEach((a: any) => {
        if (!a.titulo || !a.titulo.trim()) {
          a.titulo = `Evaluación: ${a.logro_nombre}`;
        }
      });
    }
    const validas = this.actividadesValidasParaGrabar();
    const total = this.actividadesGeneradas.length;
    if (validas.length === 0) {
      Swal.fire('Sin actividades', 'No hay actividades válidas. Genera actividades o llena los títulos antes de continuar.', 'warning');
      return;
    }
    if (validas.length < total) {
      Swal.fire({
        title: `Hay ${total - validas.length} sin título`,
        text: `Solo se grabarán las ${validas.length} actividades con título. ¿Continuar?`,
        icon: 'warning', showCancelButton: true,
        confirmButtonColor: '#F5A623', cancelButtonColor: '#2C2C2C',
        confirmButtonText: 'Sí, continuar', cancelButtonText: 'Cancelar'
      }).then((result) => {
        if (result.isConfirmed) { this.pasoActual = 4; }
      });
      return;
    }
    this.pasoActual = 4;
  }

  volverAPaso(n: number) {
    this.pasoActual = n;
  }

  // ============ LOGROS ============
  logroYaCubierto(idLogro: number): boolean {
    return !!(this.actividadesExistentesPorLogro[idLogro] && this.actividadesExistentesPorLogro[idLogro].length > 0);
  }

  getActividadesExistentesDelLogro(idLogro: number): any[] {
    return this.actividadesExistentesPorLogro[idLogro] || [];
  }

  toggleLogro(idLogro: number) {
    if (this.logroYaCubierto(idLogro)) return; // bloqueado
    this.logrosSeleccionados[idLogro] = !this.logrosSeleccionados[idLogro];
  }
  isLogroSeleccionado(idLogro: number): boolean {
    return !!this.logrosSeleccionados[idLogro];
  }
  seleccionarTodosLogros() {
    this.logrosDisponibles.forEach((l: any) => {
      if (!this.logroYaCubierto(l.id)) {
        this.logrosSeleccionados[l.id] = true;
      }
    });
  }
  deseleccionarTodosLogros() {
    this.logrosDisponibles.forEach((l: any) => this.logrosSeleccionados[l.id] = false);
  }
  cantidadLogrosSeleccionados(): number {
    return this.logrosDisponibles.filter((l: any) => this.logrosSeleccionados[l.id]).length;
  }
  getLogrosSeleccionadosArray(): any[] {
    return this.logrosDisponibles.filter((l: any) => this.logrosSeleccionados[l.id]);
  }

  // Trunca un texto a N caracteres con elipsis
  truncar(texto: string, max: number = 80): string {
    if (!texto) return '';
    const limpio = texto.replace(/<[^>]*>/g, '').trim(); // quitar HTML
    if (limpio.length <= max) return limpio;
    return limpio.substring(0, max) + '...';
  }

  // Agrupa logros por área
  getAreasConLogros(): any[] {
    const mapa: { [key: number]: any } = {};
    this.logrosDisponibles.forEach((l: any) => {
      const idA = l.id_area_academica;
      if (!mapa[idA]) {
        mapa[idA] = { id: idA, nombre: l.area_nombre, logros: [] };
      }
      mapa[idA].logros.push(l);
    });
    return Object.values(mapa);
  }

  // Áreas presentes en los logros seleccionados (para filtro tabs)
  getAreasDeLogrosSeleccionados(): any[] {
    const mapa: { [key: number]: any } = {};
    this.getLogrosSeleccionadosArray().forEach((l: any) => {
      mapa[l.id_area_academica] = { id: l.id_area_academica, nombre: l.area_nombre };
    });
    return Object.values(mapa);
  }

  // ============ TABS ============
  cambiarModo(modo: ModoGeneracion) {
    if (modo === this.modoActivo) return;
    if (this.actividadesGeneradas.length > 0) {
      Swal.fire({
        title: '¿Cambiar modo?',
        text: 'Se descartarán las actividades generadas actualmente.',
        icon: 'warning', showCancelButton: true,
        confirmButtonColor: '#F5A623', cancelButtonColor: '#2C2C2C',
        confirmButtonText: 'Sí, cambiar', cancelButtonText: 'Cancelar'
      }).then((result) => {
        if (result.isConfirmed) {
          this.actividadesGeneradas = [];
          this.modoActivo = modo;
          this.filtroArea = '';
          if (modo === 'manual') { this.iniciarModoManual(); }
        }
      });
    } else {
      this.modoActivo = modo;
      this.filtroArea = '';
      if (modo === 'manual') { this.iniciarModoManual(); }
    }
  }

  // Filtro por área aplicado a las actividades generadas (todos los tabs)
  getActividadesFiltradas(): any[] {
    if (!this.filtroArea) return this.actividadesGeneradas;
    return this.actividadesGeneradas.filter((a: any) => a.id_area_academica == this.filtroArea);
  }

  // ========== MODO MECÁNICO ==========
  generarMecanico(silencioso: boolean = false) {
    const seleccionados = this.getLogrosSeleccionadosArray();
    if (seleccionados.length === 0) {
      if (!silencioso) {
        Swal.fire('Sin logros', 'Selecciona al menos un logro.', 'warning');
      }
      return;
    }

    this.actividadesGeneradas = seleccionados.map((logro: any) => this.construirActividadDesdeLogro(logro, {
      titulo: `Evaluación: ${logro.nombre}`,
      descripcion: this.TEXTO_DESCRIPCION_MECANICA + logro.nombre,
      nivel_uno: this.TEXTO_NIVEL_ESTANDAR,
      nivel_dos: this.TEXTO_NIVEL_ESTANDAR
    }));
    this.configGeneradasActividades = this.getConfigActualGeneradas();

    if (!silencioso) {
      Swal.fire({
        title: '✅ Generadas',
        text: `${this.actividadesGeneradas.length} actividad${this.actividadesGeneradas.length > 1 ? 'es' : ''} de evaluación creada${this.actividadesGeneradas.length > 1 ? 's' : ''}.`,
        icon: 'success', timer: 1500, showConfirmButton: false
      });
    }
  }

  // ========== MODO IA ==========
  generarConIA() {
    const seleccionados = this.getLogrosSeleccionadosArray();
    if (seleccionados.length === 0) {
      Swal.fire('Sin logros', 'Selecciona al menos un logro.', 'warning');
      return;
    }

    this.generando = true;
    Swal.fire({
      title: 'Generando con IA...',
      html: `Creando ${seleccionados.length} actividad${seleccionados.length > 1 ? 'es' : ''} de evaluación...`,
      allowOutsideClick: false,
      didOpen: () => { Swal.showLoading(); }
    });

    const datos = {
      id_grupo: this.idGrupo,
      id_corte: this.idCorte,
      logros_ids: seleccionados.map((l: any) => l.id),
      ambientes: this.ambientesSeleccionados.map((a: any) => ({ id: a.id, nombre: a.nombre })),
      materiales: this.materialesSeleccionados.map((m: any) => ({ id_producto: m.id_producto, nombre: m.nombre_material })),
      id_tipo_actividad: this.idTipoActividad,
      nombre_grupo: this.nombreGrupo
    };

    this.iaMaquinaService.generarActividadesEvaluacion(datos).subscribe({
      next: (resp: any) => {
        this.generando = false;
        Swal.close();
        if (resp.success) {
          this.actividadesGeneradas = (resp.actividades || []).map((act: any) => ({
            id_logro: act.id_logro,
            logro_nombre: act.logro_nombre,
            id_area_academica: act.id_area_academica,
            area_nombre: act.area_nombre,
            titulo: act.titulo,
            descripcion: act.descripcion,
            nivel_uno: act.nivel_uno,
            nivel_dos: act.nivel_dos,
            minutos_duracion: act.minutos_duracion || 45,
            id_tipo_actividad_academica: act.id_tipo_actividad_academica || this.idTipoActividad,
            id_ambiente: act.id_ambiente || (this.ambientesSeleccionados.length === 1 ? this.ambientesSeleccionados[0].id : null),
            materiales_sugeridos: act.materiales_sugeridos || [],
            indicadores_ids: act.indicadores_ids || [],
            indicadores: act.indicadores || []
          }));
          this.configGeneradasActividades = this.getConfigActualGeneradas();
          Swal.fire({
            title: '🪄 Generadas con IA',
            text: `${this.actividadesGeneradas.length} actividad${this.actividadesGeneradas.length > 1 ? 'es' : ''} (${resp.proveedor} · ${resp.tiempo_ms}ms)`,
            icon: 'success', timer: 2000, showConfirmButton: false
          });
        } else {
          Swal.fire('Error', resp.error || 'Error al generar.', 'error');
        }
      },
      error: () => {
        this.generando = false;
        Swal.close();
        Swal.fire('Error', 'No se pudieron generar las actividades con IA.', 'error');
      }
    });
  }

  // ========== MODO MANUAL ==========
  iniciarModoManual() {
    const seleccionados = this.getLogrosSeleccionadosArray();
    if (seleccionados.length === 0) { return; }
    this.actividadesGeneradas = seleccionados.map((logro: any) => this.construirActividadDesdeLogro(logro, {
      titulo: '',
      descripcion: '',
      nivel_uno: this.TEXTO_NIVEL_ESTANDAR,
      nivel_dos: this.TEXTO_NIVEL_ESTANDAR
    }));
    this.configGeneradasActividades = this.getConfigActualGeneradas();
  }

  // Construye la actividad base desde un logro
  private construirActividadDesdeLogro(logro: any, textos: { titulo: string; descripcion: string; nivel_uno: string; nivel_dos: string }): any {
    const indicadoresIds = (logro.indicadores || []).map((ind: any) => ind.id);
    const indicadores = (logro.indicadores || []).map((ind: any) => ({
      id: ind.id,
      nombre: ind.nombre,
      logro_id: logro.id,
      logro_nombre: logro.nombre
    }));
    return {
      id_logro: logro.id,
      logro_nombre: logro.nombre,
      id_area_academica: logro.id_area_academica,
      area_nombre: logro.area_nombre,
      titulo: textos.titulo,
      descripcion: textos.descripcion,
      nivel_uno: textos.nivel_uno,
      nivel_dos: textos.nivel_dos,
      minutos_duracion: 45,
      id_tipo_actividad_academica: this.idTipoActividad,
      id_ambiente: this.ambientesSeleccionados.length === 1 ? this.ambientesSeleccionados[0].id : null,
      materiales_sugeridos: this.materialesSeleccionados.map((m: any) => m.nombre_material),
      indicadores_ids: indicadoresIds,
      indicadores: indicadores
    };
  }

  eliminarActividadGenerada(actividad: any) {
    const idx = this.actividadesGeneradas.indexOf(actividad);
    if (idx < 0) return;
    Swal.fire({
      title: '¿Eliminar?',
      text: `¿Quitar "${actividad.titulo || actividad.logro_nombre}" de la lista?`,
      icon: 'warning', showCancelButton: true,
      confirmButtonColor: '#F5A623', cancelButtonColor: '#2C2C2C',
      confirmButtonText: 'Sí, quitar', cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.actividadesGeneradas.splice(idx, 1);
      }
    });
  }

  actividadesValidasParaGrabar(): any[] {
    return this.actividadesGeneradas.filter((a: any) => a.titulo && a.titulo.trim());
  }

  // ============ HELPERS ============
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
  getEtiquetaModo(): string {
    if (this.modoActivo === 'mecanico') return '🔧 Mecánico';
    if (this.modoActivo === 'ia') return '🪄 Con IA';
    return '✍️ Manual';
  }

  // ============ CONFIRMAR Y GRABAR ============
  confirmarYGrabar() {
    const actividades = this.actividadesValidasParaGrabar();
    if (actividades.length === 0) {
      Swal.fire('Sin actividades', 'No hay actividades válidas.', 'warning');
      return;
    }

    const areaTexto = this.idArea ? this.nombreArea : 'todas las áreas';

    Swal.fire({
      title: '¿Confirmar creación?',
      html: `Se crearán <strong>${actividades.length}</strong> actividad${actividades.length > 1 ? 'es' : ''} de evaluación en el sprint <strong>${this.nombreSprint}</strong> para <strong>${this.nombreGrupo}</strong> (${areaTexto}).`,
      icon: 'question', showCancelButton: true,
      confirmButtonColor: '#F5A623', cancelButtonColor: '#2C2C2C',
      confirmButtonText: 'Sí, crear', cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) { this.ejecutarGrabado(actividades); }
    });
  }

  private ejecutarGrabado(actividades: any[]) {
    Swal.fire({
      title: 'Creando actividades...',
      html: `Grabando ${actividades.length} actividad${actividades.length > 1 ? 'es' : ''}...`,
      allowOutsideClick: false,
      didOpen: () => { Swal.showLoading(); }
    });

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
        id_area_academica: act.id_area_academica,
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

    this.iaMaquinaService.grabarActividadesEvaluacion({
      id_sprint: this.idSprint,
      id_grupo: this.idGrupo,
      actividades: actividadesPayload
    }).subscribe({
      next: (resp: any) => {
        if (resp.success) {
          Swal.fire({
            title: '¡Actividades creadas!',
            html: `Se crearon <strong>${resp.total_creadas}</strong> actividad${resp.total_creadas > 1 ? 'es' : ''} de evaluación.`,
            icon: 'success', confirmButtonColor: '#F5A623', confirmButtonText: 'Aceptar'
          }).then(() => {
            this.actividadesGeneradas = [];
            this.configGeneradasActividades = '';
            this.configCargadaLogros = '';
            this.pasoActual = 1;
          });
        } else {
          Swal.fire('Error', resp.error || 'Error al grabar.', 'error');
        }
      },
      error: () => {
        Swal.fire('Error', 'No se pudieron grabar las actividades.', 'error');
      }
    });
  }

  volver() {
    this.router.navigate(['academico/selector-actividades']);
  }
}