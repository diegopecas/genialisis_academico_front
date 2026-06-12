import { Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DashboardGerencialService } from '../../../../../services/dashboard-gerencial.service';
import Swal from 'sweetalert2';

type VistaFinanciero = 'kpis' | 'cartera' | 'recaudo' | 'movimientos';

type DireccionOrden = 'asc' | 'desc';

type ColumnaCartera =
  | 'nombre_persona'
  | 'grupo_o_cargo'
  | 'activo'
  | 'cuentas_pendientes'
  | 'cuentas_vencidas'
  | 'saldo_pendiente'
  | 'saldo_vencido'
  | 'dias_max_vencido'
  | 'recordatorio_fecha'
  | 'compromiso_fecha';

type ColumnaRecaudo =
  | 'fecha'
  | 'nombre_persona'
  | 'tipo_persona'
  | 'tipo_pago'
  | 'valor_recibido'
  | 'referencia_bancaria';

type ColumnaMovimiento =
  | 'fecha'
  | 'tipo'
  | 'categoria'
  | 'concepto'
  | 'medio_pago'
  | 'valor'
  | 'estado';

type FiltroEstado = 'todos' | 'activos' | 'inactivos';
type FiltroTipoPersona = 'todos' | 'estudiantes' | 'colaboradores' | 'acudientes';
type FiltroTipoMov = 'todos' | 'ingresos' | 'gastos';
type FiltroEstadoMov = 'todos' | 'aprobados' | 'pendientes' | 'anulados';
type RangoRecaudo = 'hoy' | 'mes' | 'anio';

@Component({
  selector: 'app-dashboard-financiero',
  templateUrl: './dashboard-financiero.component.html',
  styleUrl: './dashboard-financiero.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class DashboardFinancieroComponent implements OnInit, OnChanges, OnDestroy {

  @Input() fecha: string = '';

  public vista: string = 'kpis';

  // ==== Auto-refresh ====
  private readonly INTERVALO_AUTO_REFRESH_MS = 2 * 60 * 1000;
  private intervaloAutoRefresh: any = null;
  public autoRefreshActivo = true;
  public ultimaActualizacion: Date | null = null;
  public cargandoResumen = false;

  private fechaActualCargada: string = '';

  // ==== Cartera ====
  public cartera: any = {
    fecha: '',
    total_facturado: 0,
    total_recaudado: 0,
    saldo_pendiente: 0,
    saldo_vencido: 0,
    porcentaje_vencido: 0,
    saldo_vencido_ayer: 0,
    delta_vencido: 0,
    saldo_mes_actual: { total_cuentas: 0, saldo: 0 },
    saldo_meses_anteriores: { total_cuentas: 0, saldo: 0 },
    saldo_estudiantes: { total_cuentas: 0, saldo: 0 },
    saldo_colaboradores: { total_cuentas: 0, saldo: 0 },
    cuentas_anuladas_mes: { cantidad: 0, total: 0 },
    buckets: {
      por_vencer: { saldo: 0, porcentaje: 0 },
      d_1_30: { saldo: 0, porcentaje: 0 },
      d_31_60: { saldo: 0, porcentaje: 0 },
      d_61_90: { saldo: 0, porcentaje: 0 },
      mas_90: { saldo: 0, porcentaje: 0 }
    }
  };

  // ==== Recaudo ====
  public recaudo: any = {
    fecha: '',
    recaudado_hoy: { cantidad: 0, total: 0 },
    registrado_hoy: { cantidad: 0, total: 0 },
    recaudado_mes: { cantidad: 0, total: 0 },
    recaudado_mes_ayer: 0,
    delta_recaudado_mes: 0,
    recaudado_anio: { cantidad: 0, total: 0 },
    recaudado_mes_corriente: { total: 0 },
    recaudado_mes_anteriores: { total: 0 },
    mes_estudiantes: { cantidad: 0, total: 0 },
    mes_colaboradores: { cantidad: 0, total: 0 },
    anulados_mes: { cantidad: 0, total: 0 },
    por_tipo_pago: [] as any[]
  };

  // ==== Detalle Cartera ====
  public cargandoDetalleCartera = false;
  public morososOriginal: any[] = [];
  public morosos: any[] = [];
  public filtroEstado: FiltroEstado = 'todos';
  public busquedaCartera: string = '';
  public columnaOrdenCartera: ColumnaCartera = 'saldo_vencido';
  public direccionOrdenCartera: DireccionOrden = 'desc';

  // ==== Detalle Recaudo ====
  public cargandoDetalleRecaudo = false;
  public pagosOriginal: any[] = [];
  public pagos: any[] = [];
  public tiposPago: any[] = [];
  public resumenTiposDetalle: any[] = [];
  public rangoRecaudo: RangoRecaudo = 'mes';
  public filtroTipoPersonaRec: FiltroTipoPersona = 'todos';
  public filtroTipoPagoId: string = '';
  public busquedaRecaudo: string = '';
  public columnaOrdenRecaudo: ColumnaRecaudo = 'fecha';
  public direccionOrdenRecaudo: DireccionOrden = 'desc';

  // ==== Movimientos financieros ====
  public movimientos: any = {
    fecha: '',
    ingresos_mes: { cantidad: 0, total: 0 },
    gastos_mes: { cantidad: 0, total: 0 },
    delta_ingresos_mes: 0,
    delta_gastos_mes: 0,
    balance_mes: 0,
    ingresos_anio: { cantidad: 0, total: 0 },
    gastos_anio: { cantidad: 0, total: 0 },
    balance_anio: 0,
    pendientes_aprobacion: { cantidad: 0, total: 0 },
    top_categoria_gasto: null as any,
    top_concepto_gasto: null as any
  };

  // ==== Detalle Movimientos ====
  public cargandoDetalleMovimientos = false;
  public movimientosOriginal: any[] = [];
  public movimientosFiltrados: any[] = [];
  public categoriasMov: any[] = [];
  public mediosPagoMov: any[] = [];
  public rangoMovimientos: RangoRecaudo = 'mes';
  public filtroTipoMov: FiltroTipoMov = 'todos';
  public filtroEstadoMov: FiltroEstadoMov = 'todos';
  public filtroCategoriaMovId: string = '';
  public filtroMedioPagoMovId: string = '';
  public busquedaMov: string = '';
  public columnaOrdenMov: ColumnaMovimiento = 'fecha';
  public direccionOrdenMov: DireccionOrden = 'desc';

  constructor(
    private dashboardGerencialService: DashboardGerencialService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.cargarDatosCompletos();
    this.iniciarAutoRefresh();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['fecha'] && !changes['fecha'].firstChange) {
      const fechaNueva = changes['fecha'].currentValue;
      if (fechaNueva && fechaNueva !== this.fechaActualCargada) {
        this.cargarDatosCompletos();
        // Invalidar caché de detalles
        this.morososOriginal = [];
        this.pagosOriginal = [];
        this.movimientosOriginal = [];
      }
    }
  }

  ngOnDestroy(): void {
    this.detenerAutoRefresh();
  }

  // =========================================
  // AUTO-REFRESH
  // =========================================
  iniciarAutoRefresh(): void {
    this.detenerAutoRefresh();
    if (!this.autoRefreshActivo || this.vista !== 'kpis') return;
    this.intervaloAutoRefresh = setInterval(() => {
      this.cargarCartera(true);
      this.cargarRecaudo(true);
      this.cargarMovimientos(true);
    }, this.INTERVALO_AUTO_REFRESH_MS);
  }

  detenerAutoRefresh(): void {
    if (this.intervaloAutoRefresh) {
      clearInterval(this.intervaloAutoRefresh);
      this.intervaloAutoRefresh = null;
    }
  }

  toggleAutoRefresh(): void {
    this.autoRefreshActivo = !this.autoRefreshActivo;
    if (this.autoRefreshActivo) this.iniciarAutoRefresh();
    else this.detenerAutoRefresh();
  }

  refrescarKpis() {
    this.cargarCartera(false);
    this.cargarRecaudo(false);
    this.cargarMovimientos(false);
  }

  // =========================================
  // CARGA DE DATOS
  // =========================================
  private cargarDatosCompletos(silencioso: boolean = false) {
    this.cargarCartera(silencioso);
    this.cargarRecaudo(silencioso);
    this.cargarMovimientos(silencioso);
    this.fechaActualCargada = this.fecha;
  }

  cargarCartera(silencioso: boolean = false) {
    if (!silencioso) this.cargandoResumen = true;
    this.dashboardGerencialService.obtenerCarteraResumen(this.fecha, silencioso).subscribe({
      next: (response: any) => {
        this.cartera = response.body;
        this.cargandoResumen = false;
        this.ultimaActualizacion = new Date();
      },
      error: () => {
        this.cargandoResumen = false;
        if (!silencioso) {
          Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo cargar el resumen de cartera' });
        }
      }
    });
  }

  cargarRecaudo(silencioso: boolean = false) {
    this.dashboardGerencialService.obtenerRecaudoResumen(this.fecha, silencioso).subscribe({
      next: (response: any) => {
        this.recaudo = response.body;
        this.ultimaActualizacion = new Date();
      },
      error: () => {
        if (!silencioso) {
          Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo cargar el resumen de recaudo' });
        }
      }
    });
  }

  cargarMovimientos(silencioso: boolean = false) {
    this.dashboardGerencialService.obtenerMovimientosResumen(this.fecha, silencioso).subscribe({
      next: (response: any) => {
        this.movimientos = response.body;
        this.ultimaActualizacion = new Date();
      },
      error: () => {
        if (!silencioso) {
          Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo cargar el resumen de movimientos' });
        }
      }
    });
  }

  // =========================================
  // NAVEGACIÓN
  // =========================================
  abrirDetalleCartera() {
    this.vista = 'cartera';
    this.detenerAutoRefresh();
    if (this.morososOriginal.length === 0) {
      this.cargarDetalleCartera();
    } else {
      this.aplicarFiltrosCartera();
    }
  }

  abrirDetalleRecaudo() {
    this.vista = 'recaudo';
    this.detenerAutoRefresh();
    if (this.pagosOriginal.length === 0) {
      this.cargarDetalleRecaudo();
    } else {
      this.aplicarFiltrosRecaudo();
    }
  }

  abrirDetalleMovimientos() {
    this.vista = 'movimientos';
    this.detenerAutoRefresh();
    if (this.movimientosOriginal.length === 0) {
      this.cargarDetalleMovimientos();
    } else {
      this.aplicarFiltrosMovimientos();
    }
  }

  volverAKpis() {
    this.vista = 'kpis';
    this.iniciarAutoRefresh();
  }

  // =========================================
  // DETALLE CARTERA (morosos)
  // =========================================
  cargarDetalleCartera() {
    this.cargandoDetalleCartera = true;
    this.dashboardGerencialService.obtenerCarteraDetalle().subscribe({
      next: (response: any) => {
        this.morososOriginal = response.body?.registros || [];
        this.aplicarFiltrosCartera();
        this.cargandoDetalleCartera = false;
      },
      error: () => {
        this.cargandoDetalleCartera = false;
        Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo cargar el detalle de cartera' });
      }
    });
  }

  cambiarFiltroEstado(filtro: FiltroEstado) {
    this.filtroEstado = filtro;
    this.aplicarFiltrosCartera();
  }

  buscarMorosos() {
    this.aplicarFiltrosCartera();
  }

  private aplicarFiltrosCartera() {
    let lista = [...this.morososOriginal];

    if (this.filtroEstado === 'activos') {
      lista = lista.filter(m => m.activo === 1);
    } else if (this.filtroEstado === 'inactivos') {
      lista = lista.filter(m => m.activo === 0);
    }

    const q = (this.busquedaCartera || '').trim().toLowerCase();
    if (q.length > 0) {
      lista = lista.filter(m =>
        (m.nombre_persona || '').toLowerCase().includes(q) ||
        (m.grupo_o_cargo || '').toLowerCase().includes(q) ||
        (m.numero_identificacion || '').toLowerCase().includes(q)
      );
    }

    const factor = this.direccionOrdenCartera === 'asc' ? 1 : -1;
    lista.sort((a, b) => this.compararCartera(a, b) * factor);

    this.morosos = lista;
  }

  ordenarCartera(columna: ColumnaCartera) {
    if (this.columnaOrdenCartera === columna) {
      this.direccionOrdenCartera = this.direccionOrdenCartera === 'asc' ? 'desc' : 'asc';
    } else {
      this.columnaOrdenCartera = columna;
      const esNumerica = columna === 'cuentas_pendientes'
        || columna === 'cuentas_vencidas'
        || columna === 'saldo_pendiente'
        || columna === 'saldo_vencido'
        || columna === 'dias_max_vencido'
        || columna === 'activo'
        || columna === 'recordatorio_fecha'
        || columna === 'compromiso_fecha';
      this.direccionOrdenCartera = esNumerica ? 'desc' : 'asc';
    }
    this.aplicarFiltrosCartera();
  }

  private compararCartera(a: any, b: any): number {
    switch (this.columnaOrdenCartera) {
      case 'nombre_persona': return (a.nombre_persona || '').localeCompare(b.nombre_persona || '');
      case 'grupo_o_cargo': return (a.grupo_o_cargo || '').localeCompare(b.grupo_o_cargo || '');
      case 'activo': return (a.activo || 0) - (b.activo || 0);
      case 'cuentas_pendientes': return (a.cuentas_pendientes || 0) - (b.cuentas_pendientes || 0);
      case 'cuentas_vencidas': return (a.cuentas_vencidas || 0) - (b.cuentas_vencidas || 0);
      case 'saldo_pendiente': return (a.saldo_pendiente || 0) - (b.saldo_pendiente || 0);
      case 'saldo_vencido': return (a.saldo_vencido || 0) - (b.saldo_vencido || 0);
      case 'dias_max_vencido': return (a.dias_max_vencido || 0) - (b.dias_max_vencido || 0);
      case 'recordatorio_fecha': {
        // Sin recordatorio se ordena al final
        const fa = a.recordatorio?.fecha_envio || '';
        const fb = b.recordatorio?.fecha_envio || '';
        if (!fa && !fb) return 0;
        if (!fa) return 1;
        if (!fb) return -1;
        return fa.localeCompare(fb);
      }
      case 'compromiso_fecha': {
        const fa = a.recordatorio?.fecha_compromiso || '';
        const fb = b.recordatorio?.fecha_compromiso || '';
        if (!fa && !fb) return 0;
        if (!fa) return 1;
        if (!fb) return -1;
        return fa.localeCompare(fb);
      }
      default: return 0;
    }
  }

  iconoOrdenCartera(columna: ColumnaCartera): string {
    if (this.columnaOrdenCartera !== columna) return 'fa-sort';
    return this.direccionOrdenCartera === 'asc' ? 'fa-sort-up' : 'fa-sort-down';
  }

  get totalActivos(): number {
    return this.morososOriginal.filter(m => m.activo === 1).length;
  }
  get totalInactivos(): number {
    return this.morososOriginal.filter(m => m.activo === 0).length;
  }

  irAPerfil(item: any) {
    if (item.id_estudiante) {
      this.router.navigate(['/estudiantes/consultar', item.id_estudiante]);
    } else if (item.id_colaborador) {
      this.router.navigate(['/colaboradores/consultar', item.id_colaborador]);
    }
  }

  // =========================================
  // DETALLE RECAUDO (pagos)
  // =========================================
  cargarDetalleRecaudo() {
    this.cargandoDetalleRecaudo = true;
    this.dashboardGerencialService.obtenerRecaudoDetalle(this.fecha, this.rangoRecaudo).subscribe({
      next: (response: any) => {
        this.pagosOriginal = response.body?.registros || [];
        this.tiposPago = response.body?.tipos_pago || [];
        this.resumenTiposDetalle = response.body?.resumen_tipos || [];
        this.aplicarFiltrosRecaudo();
        this.cargandoDetalleRecaudo = false;
      },
      error: () => {
        this.cargandoDetalleRecaudo = false;
        Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo cargar el detalle de recaudo' });
      }
    });
  }

  cambiarRangoRecaudo(rango: RangoRecaudo) {
    this.rangoRecaudo = rango;
    this.cargarDetalleRecaudo();
  }

  cambiarFiltroTipoPersona(filtro: FiltroTipoPersona) {
    this.filtroTipoPersonaRec = filtro;
    this.aplicarFiltrosRecaudo();
  }

  cambiarFiltroTipoPago() {
    this.aplicarFiltrosRecaudo();
  }

  buscarPagos() {
    this.aplicarFiltrosRecaudo();
  }

  private aplicarFiltrosRecaudo() {
    let lista = [...this.pagosOriginal];

    if (this.filtroTipoPersonaRec === 'estudiantes') {
      lista = lista.filter(p => p.tipo_persona === 'Estudiante');
    } else if (this.filtroTipoPersonaRec === 'colaboradores') {
      lista = lista.filter(p => p.tipo_persona === 'Colaborador');
    } else if (this.filtroTipoPersonaRec === 'acudientes') {
      lista = lista.filter(p => p.tipo_persona === 'Acudiente');
    }

    if (this.filtroTipoPagoId) {
      const id = String(this.filtroTipoPagoId);
      lista = lista.filter(p => String(p.id_tipo_pago) === id);
    }

    const q = (this.busquedaRecaudo || '').trim().toLowerCase();
    if (q.length > 0) {
      lista = lista.filter(p =>
        (p.nombre_persona || '').toLowerCase().includes(q) ||
        (p.referencia_bancaria || '').toLowerCase().includes(q) ||
        (p.tipo_pago || '').toLowerCase().includes(q)
      );
    }

    const factor = this.direccionOrdenRecaudo === 'asc' ? 1 : -1;
    lista.sort((a, b) => this.compararRecaudo(a, b) * factor);

    this.pagos = lista;
  }

  ordenarRecaudo(columna: ColumnaRecaudo) {
    if (this.columnaOrdenRecaudo === columna) {
      this.direccionOrdenRecaudo = this.direccionOrdenRecaudo === 'asc' ? 'desc' : 'asc';
    } else {
      this.columnaOrdenRecaudo = columna;
      const esNumerica = columna === 'valor_recibido';
      this.direccionOrdenRecaudo = esNumerica ? 'desc' : 'asc';
    }
    this.aplicarFiltrosRecaudo();
  }

  private compararRecaudo(a: any, b: any): number {
    switch (this.columnaOrdenRecaudo) {
      case 'fecha': return (a.fecha || '').localeCompare(b.fecha || '');
      case 'nombre_persona': return (a.nombre_persona || '').localeCompare(b.nombre_persona || '');
      case 'tipo_persona': return (a.tipo_persona || '').localeCompare(b.tipo_persona || '');
      case 'tipo_pago': return (a.tipo_pago || '').localeCompare(b.tipo_pago || '');
      case 'valor_recibido': return (a.valor_recibido || 0) - (b.valor_recibido || 0);
      case 'referencia_bancaria': return (a.referencia_bancaria || '').localeCompare(b.referencia_bancaria || '');
      default: return 0;
    }
  }

  iconoOrdenRecaudo(columna: ColumnaRecaudo): string {
    if (this.columnaOrdenRecaudo !== columna) return 'fa-sort';
    return this.direccionOrdenRecaudo === 'asc' ? 'fa-sort-up' : 'fa-sort-down';
  }

  // Total filtrado del detalle de recaudo
  get totalRecaudoFiltrado(): number {
    return this.pagos.reduce((acc, p) => acc + (p.valor_recibido || 0), 0);
  }

  // =========================================
  // DETALLE MOVIMIENTOS
  // =========================================
  cargarDetalleMovimientos() {
    this.cargandoDetalleMovimientos = true;
    this.dashboardGerencialService.obtenerMovimientosDetalle(this.fecha, this.rangoMovimientos).subscribe({
      next: (response: any) => {
        this.movimientosOriginal = response.body?.registros || [];
        this.categoriasMov = response.body?.categorias || [];
        this.mediosPagoMov = response.body?.medios_pago || [];
        this.aplicarFiltrosMovimientos();
        this.cargandoDetalleMovimientos = false;
      },
      error: () => {
        this.cargandoDetalleMovimientos = false;
        Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo cargar el detalle de movimientos' });
      }
    });
  }

  cambiarRangoMovimientos(rango: RangoRecaudo) {
    this.rangoMovimientos = rango;
    this.cargarDetalleMovimientos();
  }

  cambiarFiltroTipoMov(filtro: FiltroTipoMov) {
    this.filtroTipoMov = filtro;
    this.aplicarFiltrosMovimientos();
  }

  cambiarFiltroEstadoMov(filtro: FiltroEstadoMov) {
    this.filtroEstadoMov = filtro;
    this.aplicarFiltrosMovimientos();
  }

  cambiarFiltroCategoriaMov() { this.aplicarFiltrosMovimientos(); }
  cambiarFiltroMedioPagoMov() { this.aplicarFiltrosMovimientos(); }
  buscarMovimientos() { this.aplicarFiltrosMovimientos(); }

  private aplicarFiltrosMovimientos() {
    let lista = [...this.movimientosOriginal];

    if (this.filtroTipoMov === 'ingresos') {
      lista = lista.filter(m => m.tipo === 'Ingreso');
    } else if (this.filtroTipoMov === 'gastos') {
      lista = lista.filter(m => m.tipo === 'Gasto');
    }

    if (this.filtroEstadoMov === 'aprobados') {
      lista = lista.filter(m => m.estado === 'Aprobado');
    } else if (this.filtroEstadoMov === 'pendientes') {
      lista = lista.filter(m => m.estado === 'Pendiente');
    } else if (this.filtroEstadoMov === 'anulados') {
      lista = lista.filter(m => m.estado === 'Anulado');
    }

    if (this.filtroCategoriaMovId) {
      const id = String(this.filtroCategoriaMovId);
      lista = lista.filter(m => String(m.id_categoria) === id);
    }

    if (this.filtroMedioPagoMovId) {
      const id = String(this.filtroMedioPagoMovId);
      lista = lista.filter(m => String(m.id_medio_pago) === id);
    }

    const q = (this.busquedaMov || '').trim().toLowerCase();
    if (q.length > 0) {
      lista = lista.filter(m =>
        (m.concepto || '').toLowerCase().includes(q) ||
        (m.categoria || '').toLowerCase().includes(q) ||
        (m.detalle || '').toLowerCase().includes(q) ||
        (m.referencia_externa || '').toLowerCase().includes(q) ||
        (m.medio_pago || '').toLowerCase().includes(q)
      );
    }

    const factor = this.direccionOrdenMov === 'asc' ? 1 : -1;
    lista.sort((a, b) => this.compararMov(a, b) * factor);

    this.movimientosFiltrados = lista;
  }

  ordenarMov(columna: ColumnaMovimiento) {
    if (this.columnaOrdenMov === columna) {
      this.direccionOrdenMov = this.direccionOrdenMov === 'asc' ? 'desc' : 'asc';
    } else {
      this.columnaOrdenMov = columna;
      this.direccionOrdenMov = columna === 'valor' ? 'desc' : 'asc';
    }
    this.aplicarFiltrosMovimientos();
  }

  private compararMov(a: any, b: any): number {
    switch (this.columnaOrdenMov) {
      case 'fecha': return (a.fecha || '').localeCompare(b.fecha || '');
      case 'tipo': return (a.tipo || '').localeCompare(b.tipo || '');
      case 'categoria': return (a.categoria || '').localeCompare(b.categoria || '');
      case 'concepto': return (a.concepto || '').localeCompare(b.concepto || '');
      case 'medio_pago': return (a.medio_pago || '').localeCompare(b.medio_pago || '');
      case 'valor': return (a.valor || 0) - (b.valor || 0);
      case 'estado': return (a.estado || '').localeCompare(b.estado || '');
      default: return 0;
    }
  }

  iconoOrdenMov(columna: ColumnaMovimiento): string {
    if (this.columnaOrdenMov !== columna) return 'fa-sort';
    return this.direccionOrdenMov === 'asc' ? 'fa-sort-up' : 'fa-sort-down';
  }

  // Totales para el header del detalle
  get totalIngresosFiltrados(): number {
    return this.movimientosFiltrados
      .filter(m => m.tipo === 'Ingreso' && m.estado !== 'Anulado')
      .reduce((acc, m) => acc + (m.valor || 0), 0);
  }
  get totalGastosFiltrados(): number {
    return this.movimientosFiltrados
      .filter(m => m.tipo === 'Gasto' && m.estado !== 'Anulado')
      .reduce((acc, m) => acc + (m.valor || 0), 0);
  }
  get balanceFiltrado(): number {
    return this.totalIngresosFiltrados - this.totalGastosFiltrados;
  }

  // =========================================
  // HELPERS
  // =========================================
  formatoMoneda(valor: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(valor || 0);
  }
}