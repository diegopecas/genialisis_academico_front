import { Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DashboardGerencialService } from '../../../../../services/dashboard-gerencial.service';
import { AlimentacionService } from '../../../../../services/alimentacion.service';
import Swal from 'sweetalert2';

type VistaOperativo = 'kpis' | 'asistencia' | 'colaboradores' | 'alimentacion';

type DireccionOrden = 'asc' | 'desc';
type ColumnaAsistencia =
  | 'nombre_completo'
  | 'hora_ingreso'
  | 'hora_salida'
  | 'estado'
  | 'ultima_asistencia'
  | 'dias_habiles_ausente'
  | 'recordatorio_fecha';

type ColumnaColaborador =
  | 'nombre_completo'
  | 'nombre_cargo'
  | 'hora_entrada'
  | 'hora_inicio_descanso'
  | 'hora_fin_descanso'
  | 'hora_salida'
  | 'estado';

type ColumnaAlimentacion =
  | 'nombre_producto'
  | 'detalle_producto'
  | 'cantidad_presentes'
  | 'porcentaje_vs_activos'
  | 'porcentaje_vs_asistieron'
  | 'cantidad_ausentes';

@Component({
  selector: 'app-dashboard-operativo',
  templateUrl: './dashboard-operativo.component.html',
  styleUrl: './dashboard-operativo.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class DashboardOperativoComponent implements OnInit, OnChanges, OnDestroy {

  @Input() fecha: string = '';
  @Input() esFechaHoy: boolean = true;

  // Vista actual
  public vista: VistaOperativo = 'kpis';

  // ==== KPIs (contadores del tab) ====
  private readonly INTERVALO_AUTO_REFRESH_MS = 2 * 60 * 1000;
  private intervaloAutoRefresh: any = null;
  public autoRefreshActivo = true;
  public ultimaActualizacion: Date | null = null;
  public cargandoResumen = false;

  public resumen: any = {
    fecha: '',
    asistencia: {
      total_asistieron: 0,
      total_asistieron_permanentes: 0,
      total_asistieron_temporales: 0,
      total_presentes_ahora: 0,
      total_salieron: 0,
      total_activos: 0,
      total_activos_permanentes: 0,
      total_activos_temporales: 0,
      porcentaje: 0,
      porcentaje_permanentes: 0,
      porcentaje_temporales: 0,
      es_hoy: true,
      por_grupo: [] as any[]
    },
    colaboradores: {
      total_activos: 0,
      presentes: 0,
      ingresaron: 0,
      salieron: 0,
      en_descanso: 0,
      tarde: 0,
      no_ingresaron: 0,
      porcentaje: 0,
      es_hoy: true
    },
    alimentacion: {
      mensuales_servidos: 0,
      mensuales_contratados: 0,
      mensuales_porcentaje: 0,
      diarios_servidos: 0,
      diarios_porcentaje: 0,
      total_asistieron: 0,
      total_servicios: 0,
      por_horario: [] as any[]
    }
  };

  // ==== ALIMENTACIÓN ====
  public cargandoDetalleAlimentacion = false;
  public detalleAlimentacion: any[] = [];
  public resumenProductos: any[] = [];
  public productosExpandidos: { [key: string]: boolean } = {};

  public columnaOrdenAlim: ColumnaAlimentacion = 'cantidad_presentes';
  public direccionOrdenAlim: DireccionOrden = 'desc';
  // ==== ASISTENCIA ====
  public cargandoDetalleAsistencia = false;
  public detalleAsistencia: any = {
    fecha: '',
    total: 0,
    registros: [] as any[]
  };
  public gruposDetalleAsistencia: any[] = [];
  public gruposExpandidos: { [id: string]: boolean } = {};

  public columnaOrdenAsistencia: ColumnaAsistencia = 'nombre_completo';
  public direccionOrdenAsistencia: DireccionOrden = 'asc';

  private readonly prioridadEstadoAsistencia: { [key: string]: number } = {
    'En el jardín': 1,
    'Salió': 2,
    'No asistió': 3
  };

  // ==== COLABORADORES ====
  public cargandoDetalleColaboradores = false;
  public detalleColaboradores: any = {
    fecha: '',
    total: 0,
    registros: [] as any[]
  };
  public colaboradoresOrdenados: any[] = [];
  public resumenColaboradores = { en_jornada: 0, en_descanso: 0, salieron: 0, no_marcaron: 0 };

  public columnaOrdenColab: ColumnaColaborador = 'nombre_completo';
  public direccionOrdenColab: DireccionOrden = 'asc';

  private readonly prioridadEstadoColab: { [key: string]: number } = {
    'En jornada': 1,
    'En descanso': 2,
    'Marcó entrada': 3,
    'Salió': 4,
    'No marcó': 5
  };

  constructor(
    private dashboardGerencialService: DashboardGerencialService,
    private alimentacionService: AlimentacionService
  ) { }

  ngOnInit(): void {
    this.cargarResumen();
    this.iniciarAutoRefresh();
  }

  ngOnDestroy(): void {
    this.detenerAutoRefresh();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['fecha'] && !changes['fecha'].firstChange) {
      this.cargarResumen();
      if (this.vista === 'asistencia') this.cargarDetalleAsistencia();
      if (this.vista === 'colaboradores') this.cargarDetalleColaboradores();
      if (this.vista === 'alimentacion') this.cargarDetalleAlimentacion();
      this.reiniciarAutoRefresh();
    }
    if (changes['esFechaHoy'] && !changes['esFechaHoy'].firstChange) {
      this.reiniciarAutoRefresh();
    }
  }

  fechaAyer(): string {
    const ayer = new Date();
    ayer.setDate(ayer.getDate() - 1);
    const year = ayer.getFullYear();
    const month = String(ayer.getMonth() + 1).padStart(2, '0');
    const day = String(ayer.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // =========================================
  // AUTO-REFRESH DE KPIs
  // =========================================
  iniciarAutoRefresh(): void {
    this.detenerAutoRefresh();
    if (!this.autoRefreshActivo || !this.esFechaHoy || this.vista !== 'kpis') {
      return;
    }
    this.intervaloAutoRefresh = setInterval(() => {
      this.cargarResumen(true);
    }, this.INTERVALO_AUTO_REFRESH_MS);
  }

  detenerAutoRefresh(): void {
    if (this.intervaloAutoRefresh) {
      clearInterval(this.intervaloAutoRefresh);
      this.intervaloAutoRefresh = null;
    }
  }

  reiniciarAutoRefresh(): void {
    this.detenerAutoRefresh();
    this.iniciarAutoRefresh();
  }

  toggleAutoRefresh(): void {
    this.autoRefreshActivo = !this.autoRefreshActivo;
    this.reiniciarAutoRefresh();
  }

  // =========================================
  // CARGA DE KPIs
  // =========================================
  cargarResumen(silencioso: boolean = false) {
    if (!silencioso) {
      this.cargandoResumen = true;
    }
    this.dashboardGerencialService.obtenerResumen(this.fecha, silencioso).subscribe({
      next: (response: any) => {
        this.resumen = response.body;
        this.cargandoResumen = false;
        this.ultimaActualizacion = new Date();
      },
      error: () => {
        this.cargandoResumen = false;
        if (!silencioso) {
          Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo cargar el resumen' });
        }
      }
    });
  }

  refrescarKpis() {
    this.cargarResumen();
  }

  // =========================================
  // NAVEGACIÓN ENTRE VISTAS
  // =========================================
  abrirDetalleAsistencia() {
    this.vista = 'asistencia';
    this.detenerAutoRefresh();
    this.cargarDetalleAsistencia();
  }

  abrirDetalleColaboradores() {
    this.vista = 'colaboradores';
    this.detenerAutoRefresh();
    this.cargarDetalleColaboradores();
  }

  abrirDetalleAlimentacion() {
    this.vista = 'alimentacion';
    this.detenerAutoRefresh();
    this.cargarDetalleAlimentacion();
  }

  volverAKpis() {
    this.vista = 'kpis';
    // Limpiar detalles
    this.detalleAsistencia = { fecha: '', total: 0, registros: [] };
    this.gruposDetalleAsistencia = [];
    this.gruposExpandidos = {};
    this.detalleColaboradores = { fecha: '', total: 0, registros: [] };
    this.colaboradoresOrdenados = [];
    this.resumenColaboradores = { en_jornada: 0, en_descanso: 0, salieron: 0, no_marcaron: 0 };
    this.detalleAlimentacion = [];
    this.resumenProductos = [];
    this.productosExpandidos = {};
    // Solo reactivar el auto-refresh; no recargamos manualmente
    // (los KPIs siguen siendo válidos al volver)
    this.iniciarAutoRefresh();
  }

  // =========================================
  // DETALLE ASISTENCIA
  // =========================================
  cargarDetalleAsistencia() {
    this.cargandoDetalleAsistencia = true;
    this.dashboardGerencialService.obtenerAsistenciaDetalle(this.fecha).subscribe({
      next: (response: any) => {
        this.detalleAsistencia = response.body;
        this.agruparAsistencia();
        this.cargandoDetalleAsistencia = false;
      },
      error: () => {
        this.cargandoDetalleAsistencia = false;
        Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo cargar el detalle de asistencia' });
      }
    });
  }

  private agruparAsistencia() {
    const mapa: { [idGrupo: string]: any } = {};
    (this.detalleAsistencia.registros || []).forEach((r: any) => {
      if (!mapa[r.id_grupo]) {
        mapa[r.id_grupo] = {
          id_grupo: r.id_grupo,
          nombre_grupo: r.nombre_grupo,
          color: r.color,
          icono: r.icono,
          orden_grupo: r.orden_grupo,
          estudiantes: [],
          resumen: { presentes: 0, salieron: 0, ausentes: 0 }
        };
      }
      mapa[r.id_grupo].estudiantes.push(r);
      if (r.estado === 'En el jardín') mapa[r.id_grupo].resumen.presentes++;
      else if (r.estado === 'Salió') mapa[r.id_grupo].resumen.salieron++;
      else if (r.estado === 'No asistió') mapa[r.id_grupo].resumen.ausentes++;
    });

    this.gruposDetalleAsistencia = Object.values(mapa).sort((a: any, b: any) => {
      const oa = a.orden_grupo ?? 9999;
      const ob = b.orden_grupo ?? 9999;
      if (oa !== ob) return oa - ob;
      return a.nombre_grupo.localeCompare(b.nombre_grupo);
    });

    this.aplicarOrdenAsistencia();

    if (Object.keys(this.gruposExpandidos).length === 0) {
      this.gruposDetalleAsistencia.forEach((g: any) => this.gruposExpandidos[g.id_grupo] = true);
    }
  }

  toggleGrupoDetalle(idGrupo: string) {
    this.gruposExpandidos[idGrupo] = !this.gruposExpandidos[idGrupo];
  }

  ordenarAsistencia(columna: ColumnaAsistencia) {
    if (this.columnaOrdenAsistencia === columna) {
      this.direccionOrdenAsistencia = this.direccionOrdenAsistencia === 'asc' ? 'desc' : 'asc';
    } else {
      this.columnaOrdenAsistencia = columna;
      this.direccionOrdenAsistencia = 'asc';
    }
    this.aplicarOrdenAsistencia();
  }

  private aplicarOrdenAsistencia() {
    const factor = this.direccionOrdenAsistencia === 'asc' ? 1 : -1;
    this.gruposDetalleAsistencia.forEach((grupo: any) => {
      grupo.estudiantes.sort((a: any, b: any) => this.compararAsistencia(a, b) * factor);
    });
  }

  private compararAsistencia(a: any, b: any): number {
    switch (this.columnaOrdenAsistencia) {
      case 'nombre_completo':
        return (a.nombre_completo || '').localeCompare(b.nombre_completo || '');
      case 'hora_ingreso':
        return this.compararStringsConVacio(a.hora_ingreso, b.hora_ingreso, this.direccionOrdenAsistencia);
      case 'hora_salida':
        return this.compararStringsConVacio(a.hora_salida, b.hora_salida, this.direccionOrdenAsistencia);
      case 'estado':
        const pa = this.prioridadEstadoAsistencia[a.estado] ?? 99;
        const pb = this.prioridadEstadoAsistencia[b.estado] ?? 99;
        if (pa !== pb) return pa - pb;
        return (a.nombre_completo || '').localeCompare(b.nombre_completo || '');
      case 'ultima_asistencia':
        return this.compararUltimaAsistencia(a.ultima_asistencia, b.ultima_asistencia);
      case 'dias_habiles_ausente':
        return this.compararNumeroConNull(a.dias_habiles_ausente, b.dias_habiles_ausente, this.direccionOrdenAsistencia);
      case 'recordatorio_fecha':
        return this.compararStringsConVacio(
          a.recordatorio?.fecha_envio,
          b.recordatorio?.fecha_envio,
          this.direccionOrdenAsistencia
        );
      default:
        return 0;
    }
  }

  private compararUltimaAsistencia(a: any, b: any): number {
    const ra = this.rangoUltimaAsistencia(a);
    const rb = this.rangoUltimaAsistencia(b);
    if (ra !== rb) {
      return this.direccionOrdenAsistencia === 'asc' ? ra - rb : rb - ra;
    }
    if (ra === 1) {
      const sa = a === 'Ayer' ? this.fechaAyer() : a;
      const sb = b === 'Ayer' ? this.fechaAyer() : b;
      return String(sa).localeCompare(String(sb));
    }
    return 0;
  }

  private rangoUltimaAsistencia(v: any): number {
    if (v === null || v === undefined || v === '') return 3;
    if (v === 'Nunca') return 2;
    return 1;
  }

  iconoOrdenAsistencia(columna: ColumnaAsistencia): string {
    if (this.columnaOrdenAsistencia !== columna) return 'fa-sort';
    return this.direccionOrdenAsistencia === 'asc' ? 'fa-sort-up' : 'fa-sort-down';
  }

  // =========================================
  // DETALLE COLABORADORES
  // =========================================
  cargarDetalleColaboradores() {
    this.cargandoDetalleColaboradores = true;
    this.dashboardGerencialService.obtenerColaboradoresDetalle(this.fecha).subscribe({
      next: (response: any) => {
        this.detalleColaboradores = response.body;
        this.procesarColaboradores();
        this.cargandoDetalleColaboradores = false;
      },
      error: () => {
        this.cargandoDetalleColaboradores = false;
        Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo cargar el detalle de colaboradores' });
      }
    });
  }

  private procesarColaboradores() {
    this.colaboradoresOrdenados = [...(this.detalleColaboradores.registros || [])];
    this.resumenColaboradores = { en_jornada: 0, en_descanso: 0, salieron: 0, no_marcaron: 0 };
    this.colaboradoresOrdenados.forEach((c: any) => {
      switch (c.estado) {
        case 'En jornada':
        case 'Marcó entrada':
          this.resumenColaboradores.en_jornada++;
          break;
        case 'En descanso':
          this.resumenColaboradores.en_descanso++;
          break;
        case 'Salió':
          this.resumenColaboradores.salieron++;
          break;
        case 'No marcó':
          this.resumenColaboradores.no_marcaron++;
          break;
      }
    });
    this.aplicarOrdenColab();
  }

  ordenarColab(columna: ColumnaColaborador) {
    if (this.columnaOrdenColab === columna) {
      this.direccionOrdenColab = this.direccionOrdenColab === 'asc' ? 'desc' : 'asc';
    } else {
      this.columnaOrdenColab = columna;
      this.direccionOrdenColab = 'asc';
    }
    this.aplicarOrdenColab();
  }

  private aplicarOrdenColab() {
    const factor = this.direccionOrdenColab === 'asc' ? 1 : -1;
    this.colaboradoresOrdenados.sort((a: any, b: any) => this.compararColab(a, b) * factor);
  }

  private compararColab(a: any, b: any): number {
    switch (this.columnaOrdenColab) {
      case 'nombre_completo':
        return (a.nombre_completo || '').localeCompare(b.nombre_completo || '');
      case 'nombre_cargo':
        return (a.nombre_cargo || '').localeCompare(b.nombre_cargo || '');
      case 'hora_entrada':
        return this.compararStringsConVacio(a.hora_entrada, b.hora_entrada, this.direccionOrdenColab);
      case 'hora_inicio_descanso':
        return this.compararStringsConVacio(a.hora_inicio_descanso, b.hora_inicio_descanso, this.direccionOrdenColab);
      case 'hora_fin_descanso':
        return this.compararStringsConVacio(a.hora_fin_descanso, b.hora_fin_descanso, this.direccionOrdenColab);
      case 'hora_salida':
        return this.compararStringsConVacio(a.hora_salida, b.hora_salida, this.direccionOrdenColab);
      case 'estado':
        const pa = this.prioridadEstadoColab[a.estado] ?? 99;
        const pb = this.prioridadEstadoColab[b.estado] ?? 99;
        if (pa !== pb) return pa - pb;
        return (a.nombre_completo || '').localeCompare(b.nombre_completo || '');
      default:
        return 0;
    }
  }

  iconoOrdenColab(columna: ColumnaColaborador): string {
    if (this.columnaOrdenColab !== columna) return 'fa-sort';
    return this.direccionOrdenColab === 'asc' ? 'fa-sort-up' : 'fa-sort-down';
  }

  // =========================================
  // DETALLE ALIMENTACIÓN
  // =========================================
  cargarDetalleAlimentacion() {
    this.cargandoDetalleAlimentacion = true;
    this.alimentacionService.obtenerAlimentacionPorFecha(this.fecha).subscribe({
      next: (response: any) => {
        this.detalleAlimentacion = (response || []).map((item: any) => ({
          ...item,
          // 3 estados:
          // 'asistio'  → presente=1 y aún en el jardín
          // 'salio'    → presente=1 pero ya se fue
          // 'ausente'  → presente=0 (no asistió, solo aplica a mensuales)
          estado_alim: item.presente === 1
            ? (item.ya_salio === 1 ? 'salio' : 'asistio')
            : 'ausente'
        }));
        this.generarResumenProductos();
        this.cargandoDetalleAlimentacion = false;
      },
      error: () => {
        this.cargandoDetalleAlimentacion = false;
        this.detalleAlimentacion = [];
        this.resumenProductos = [];
        Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo cargar el detalle de alimentación' });
      }
    });
  }

  // Agrupa el listado plano por producto y calcula los % vs activos y vs asistieron
  // Reutiliza los totales del resumen del padre (ya cargados en this.resumen.asistencia)
  private generarResumenProductos() {
    const totalActivos = this.resumen?.asistencia?.total_activos || 0;
    const totalAsistieron = this.resumen?.asistencia?.total_asistieron || 0;

    const mapa = new Map<string, any>();

    this.detalleAlimentacion.forEach((item: any) => {
      const clave = item.nombre_producto;
      if (mapa.has(clave)) {
        const r = mapa.get(clave)!;
        if (item.presente === 1) r.cantidad_presentes++;
        else r.cantidad_ausentes++;
        r.registros_detalle.push(item);
      } else {
        mapa.set(clave, {
          id_producto: item.id_producto,
          nombre_producto: item.nombre_producto,
          detalle_producto: item.detalle_producto || '',
          cantidad_presentes: item.presente === 1 ? 1 : 0,
          cantidad_ausentes: item.presente === 1 ? 0 : 1,
          porcentaje_vs_activos: 0,
          porcentaje_vs_asistieron: 0,
          es_mensual: false, // se determina abajo según existencia de ausentes
          registros_detalle: [item]
        });
      }
    });

    this.resumenProductos = Array.from(mapa.values()).map((r: any) => {
      r.porcentaje_vs_activos = totalActivos > 0
        ? (r.cantidad_presentes / totalActivos) * 100
        : 0;
      r.porcentaje_vs_asistieron = totalAsistieron > 0
        ? (r.cantidad_presentes / totalAsistieron) * 100
        : 0;
      // Si tiene ausentes registrados, es mensual (los diarios nunca generan ausentes)
      r.es_mensual = r.cantidad_ausentes > 0;
      return r;
    });

    this.aplicarOrdenAlim();
  }

  toggleProductoExpandido(nombreProducto: string) {
    this.productosExpandidos[nombreProducto] = !this.productosExpandidos[nombreProducto];
  }

  productoEstaExpandido(nombreProducto: string): boolean {
    return !!this.productosExpandidos[nombreProducto];
  }

  ordenarAlim(columna: ColumnaAlimentacion) {
    if (this.columnaOrdenAlim === columna) {
      this.direccionOrdenAlim = this.direccionOrdenAlim === 'asc' ? 'desc' : 'asc';
    } else {
      this.columnaOrdenAlim = columna;
      // Numéricas → desc por defecto; texto → asc
      const esNumerica = columna === 'cantidad_presentes'
        || columna === 'cantidad_ausentes'
        || columna === 'porcentaje_vs_activos'
        || columna === 'porcentaje_vs_asistieron';
      this.direccionOrdenAlim = esNumerica ? 'desc' : 'asc';
    }
    this.aplicarOrdenAlim();
  }

  private aplicarOrdenAlim() {
    const factor = this.direccionOrdenAlim === 'asc' ? 1 : -1;
    this.resumenProductos.sort((a: any, b: any) => this.compararAlim(a, b) * factor);
  }

  private compararAlim(a: any, b: any): number {
    switch (this.columnaOrdenAlim) {
      case 'nombre_producto':
        return (a.nombre_producto || '').localeCompare(b.nombre_producto || '');
      case 'detalle_producto':
        return (a.detalle_producto || '').localeCompare(b.detalle_producto || '');
      case 'cantidad_presentes':
        return (a.cantidad_presentes || 0) - (b.cantidad_presentes || 0);
      case 'porcentaje_vs_activos':
        return (a.porcentaje_vs_activos || 0) - (b.porcentaje_vs_activos || 0);
      case 'porcentaje_vs_asistieron':
        return (a.porcentaje_vs_asistieron || 0) - (b.porcentaje_vs_asistieron || 0);
      case 'cantidad_ausentes':
        return (a.cantidad_ausentes || 0) - (b.cantidad_ausentes || 0);
      default:
        return 0;
    }
  }

  iconoOrdenAlim(columna: ColumnaAlimentacion): string {
    if (this.columnaOrdenAlim !== columna) return 'fa-sort';
    return this.direccionOrdenAlim === 'asc' ? 'fa-sort-up' : 'fa-sort-down';
  }

  hayAusentesAlim(): boolean {
    return this.resumenProductos.some((r: any) => r.cantidad_ausentes > 0);
  }

  // =========================================
  // HELPERS
  // =========================================
  private compararStringsConVacio(a: any, b: any, direccion: DireccionOrden): number {
    const aVacio = !a;
    const bVacio = !b;
    if (aVacio && bVacio) return 0;
    if (aVacio) return direccion === 'asc' ? 1 : -1;
    if (bVacio) return direccion === 'asc' ? -1 : 1;
    return String(a).localeCompare(String(b));
  }

  private compararNumeroConNull(a: any, b: any, direccion: DireccionOrden): number {
    const aNull = a === null || a === undefined;
    const bNull = b === null || b === undefined;
    if (aNull && bNull) return 0;
    if (aNull) return direccion === 'asc' ? 1 : -1;
    if (bNull) return direccion === 'asc' ? -1 : 1;
    return Number(a) - Number(b);
  }
}