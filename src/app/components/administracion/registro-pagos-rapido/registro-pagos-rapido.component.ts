import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import Swal from 'sweetalert2';
import { UtilService } from '../../../common/constantes/util.service';
import { HeaderComponent } from '../../../common/header/header.component';
import { DocumentosPersonasService } from '../../../services/documentos-personas.service';
import { ExportarPdfComprobanteService, DatosComprobantePDF } from '../../../services/exportar-pdf-comprobante.service';
import { InstitucionConfigService } from '../../../services/institucion-config.service';
import { PagosRecibidosService } from '../../../services/pagos-recibidos.service';


interface EstudianteRapido {
  id_estudiante: string;
  id_persona: string;
  nombre_estudiante: string;
  numero_identificacion: string;
  grupo_estudiante: string;
}

interface CuentaPorCobrar {
  id: string;
  id_persona: string;
  id_estudiante: string;
  fecha: string;
  valor: number;
  detalle: string;
  nombre_producto_servicio: string;
  total_pagado: number;
  saldo: number;
}

interface AcudienteResponsable {
  id_acudiente: string;
  id_estudiante: string;
  id_persona_acudiente: string;
  nombre_acudiente: string;
  tipo_acudiente: string;
  telefono: string | null;
  correo_electronico: string | null;
}

interface TipoPago {
  id: string;
  nombre: string;
  requiere_documento: number;
}

interface DatosComprobante {
  valor: number | null;
  referencia: string | null;
  fecha: string | null;
}

interface CuentaAplicada {
  id_cuenta_por_cobrar: string;
  valor_aplicado: number;
}

interface CuentaModalItem {
  cuenta: CuentaPorCobrar;
  seleccionada: boolean;
  valor_aplicado: number;
  valor_aplicado_formateado: string;
}

interface FilaPago {
  seleccionado: boolean;
  estudiante: EstudianteRapido;
  saldoTotal: number;
  cuentasPendientes: CuentaPorCobrar[];
  acudientes: AcudienteResponsable[];
  id_acudiente: string | null;
  id_tipo_pago: string | null;
  archivo: File | null;
  analizandoIA: boolean;
  datosIA: DatosComprobante | null;
  fecha: string;
  referencia_bancaria: string;
  valor_recibido: number;
  valor_recibido_formateado: string;
  valor_comprobante: number | null;
  observaciones: string;
  id_documento_persona: string | null;
  modoDistribucion: 'auto' | 'manual';
  cuentasAplicadasManual: CuentaAplicada[];
  registrado: boolean;
  idPagoRegistrado: string | null;
  mensajeWA: string;
  telefonoWA: string;
}

@Component({
  selector: 'app-registro-pagos-rapido',
  templateUrl: './registro-pagos-rapido.component.html',
  styleUrl: './registro-pagos-rapido.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent],
})
export class RegistroPagosRapidoComponent implements OnInit, OnDestroy {
  public titulo = 'Registro Rápido de Pagos';
  public regresar = '/administracion/financiero';

  public tiposPago: TipoPago[] = [];
  public filas: FilaPago[] = [];
  public filasFiltradas: FilaPago[] = [];

  public busqueda = '';
  public mostrarSoloConSaldo = true;
  public mostrarSoloListos = false;
  public filtroGrupo = '';
  public grupos: string[] = [];

  public cargando = false;
  public registrando = false;
  public mostrarRegistrados = false;
  private subscriptions: Subscription[] = [];

  // Modal distribución manual
  public modalFila: FilaPago | null = null;
  public modalCuentas: CuentaModalItem[] = [];
  public modalValorRestante = 0;

  // Modal envío WA (post-registro)
  public envioFila: FilaPago | null = null;
  public telefonosEditables: string[] = [];
  public telefonoAdicional = '';
  public nombreAdicional = '';
  public correoAdicional = '';
  public descargandoPDF = false;

  private nombreColegio = 'Liceo Lumen';

  constructor(
    private pagosRecibidosService: PagosRecibidosService,
    private documentosService: DocumentosPersonasService,
    private utilService: UtilService,
    private router: Router,
    private exportarPdfComprobanteService: ExportarPdfComprobanteService,
    private institucionConfigService: InstitucionConfigService
  ) {}

  ngOnInit(): void {
    this.cargando = true;
    this.cargarDatos();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub: Subscription) => sub.unsubscribe());
  }

  // ============================================
  // CARGA DE DATOS
  // ============================================

  cargarDatos(): void {
    this.mostrarRegistrados = false;
    const sub = this.pagosRecibidosService.obtenerDatosRegistroRapido().subscribe({
      next: (response: any) => {
        const data = response.body;
        if (data) {
          this.tiposPago = data.tipos_pagos || [];

          const acudientesPorEstudiante = new Map<string, AcudienteResponsable[]>();
          (data.acudientes || []).forEach((a: AcudienteResponsable) => {
            if (!acudientesPorEstudiante.has(a.id_estudiante)) {
              acudientesPorEstudiante.set(a.id_estudiante, []);
            }
            acudientesPorEstudiante.get(a.id_estudiante)!.push(a);
          });

          const cuentasPorEstudiante = new Map<string, CuentaPorCobrar[]>();
          (data.cuentas_por_cobrar || []).forEach((c: any) => {
            const idEst = c.id_estudiante;
            if (!cuentasPorEstudiante.has(idEst)) {
              cuentasPorEstudiante.set(idEst, []);
            }
            cuentasPorEstudiante.get(idEst)!.push({
              ...c,
              saldo: parseFloat(String(c.saldo)),
              valor: parseFloat(String(c.valor)),
              total_pagado: parseFloat(String(c.total_pagado))
            });
          });

          const hoy = new Date().toISOString().split('T')[0];

          this.filas = (data.estudiantes || []).map((est: EstudianteRapido) => {
            const cuentas = cuentasPorEstudiante.get(est.id_estudiante) || [];
            const acudientes = acudientesPorEstudiante.get(est.id_estudiante) || [];
            const saldoTotal = cuentas.reduce((sum: number, c: CuentaPorCobrar) => sum + c.saldo, 0);
            const primerAcudiente = acudientes.length > 0 ? acudientes[0].id_acudiente : null;

            return {
              seleccionado: false, estudiante: est, saldoTotal, cuentasPendientes: cuentas, acudientes,
              id_acudiente: primerAcudiente, id_tipo_pago: null, archivo: null, analizandoIA: false,
              datosIA: null, fecha: hoy, referencia_bancaria: '', valor_recibido: 0,
              valor_recibido_formateado: '', valor_comprobante: null, observaciones: '',
              id_documento_persona: null, modoDistribucion: 'auto' as const,
              cuentasAplicadasManual: [], registrado: false, idPagoRegistrado: null,
              mensajeWA: '', telefonoWA: '',
            } as FilaPago;
          });

          const gruposSet = new Set<string>();
          this.filas.forEach((f: FilaPago) => gruposSet.add(f.estudiante.grupo_estudiante || 'Sin grupo'));
          this.grupos = Array.from(gruposSet).sort();
          this.filtrarFilas();
        }
        this.cargando = false;
      },
      error: (error: any) => {
        console.error('Error al cargar datos:', error);
        Swal.fire('Error', 'No se pudieron cargar los datos', 'error');
        this.cargando = false;
      },
    });
    this.subscriptions.push(sub);
  }

  // ============================================
  // FILTROS
  // ============================================

  filtrarFilas(): void {
    let resultado = this.mostrarRegistrados
      ? this.filas.filter((f: FilaPago) => f.registrado)
      : [...this.filas];

    if (!this.mostrarRegistrados) {
      if (this.mostrarSoloConSaldo) resultado = resultado.filter((f: FilaPago) => f.saldoTotal > 0);
      if (this.mostrarSoloListos) resultado = resultado.filter((f: FilaPago) => this.filaListaParaRegistrar(f));
      if (this.busqueda) {
        const termino = this.busqueda.toLowerCase();
        resultado = resultado.filter((f: FilaPago) =>
          f.estudiante.nombre_estudiante.toLowerCase().includes(termino) ||
          (f.estudiante.grupo_estudiante || '').toLowerCase().includes(termino)
        );
      }
      if (this.filtroGrupo) resultado = resultado.filter((f: FilaPago) => (f.estudiante.grupo_estudiante || 'Sin grupo') === this.filtroGrupo);
    }
    this.filasFiltradas = resultado;
  }

  filaListaParaRegistrar(fila: FilaPago): boolean {
    if (!fila.seleccionado || !fila.id_tipo_pago || !fila.fecha) return false;
    if (!fila.valor_recibido || fila.valor_recibido <= 0) return false;
    if (this.requiereDocumento(fila) && (!fila.archivo || !fila.referencia_bancaria)) return false;
    return true;
  }

  toggleMostrarRegistrados(): void {
    this.mostrarRegistrados = !this.mostrarRegistrados;
    this.filtrarFilas();
  }

  get filasRegistradas(): FilaPago[] {
    return this.filas.filter((f: FilaPago) => f.registrado);
  }

  // ============================================
  // TIPO DE PAGO
  // ============================================

  onTipoPagoChange(fila: FilaPago): void {
    const tipoPago = this.tiposPago.find((tp: TipoPago) => tp.id === fila.id_tipo_pago);
    if (tipoPago && !tipoPago.requiere_documento) {
      fila.archivo = null; fila.datosIA = null; fila.valor_comprobante = null;
    }
  }

  requiereDocumento(fila: FilaPago): boolean {
    if (!fila.id_tipo_pago) return false;
    const tipoPago = this.tiposPago.find((tp: TipoPago) => tp.id === fila.id_tipo_pago);
    return tipoPago ? tipoPago.requiere_documento === 1 : false;
  }

  // ============================================
  // COMPROBANTE + IA
  // ============================================

  onArchivoSeleccionado(fila: FilaPago, event: any): void {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { Swal.fire('Error', 'El archivo no puede superar 10MB', 'error'); event.target.value = ''; return; }
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!extension || !['pdf', 'jpg', 'jpeg', 'png'].includes(extension)) { Swal.fire('Error', 'Solo se permiten archivos PDF, JPG, JPEG o PNG', 'error'); event.target.value = ''; return; }

    fila.archivo = file;
    fila.analizandoIA = true;

    this.pagosRecibidosService.analizarComprobante(file).subscribe({
      next: (respuesta: any) => {
        fila.analizandoIA = false;
        if (respuesta.success && respuesta.datos) {
          fila.datosIA = respuesta.datos;
          if (respuesta.datos.fecha) fila.fecha = respuesta.datos.fecha;
          if (respuesta.datos.referencia) fila.referencia_bancaria = String(respuesta.datos.referencia);
          if (respuesta.datos.valor) {
            fila.valor_recibido = respuesta.datos.valor;
            fila.valor_comprobante = respuesta.datos.valor;
            this.formatearValor(fila);
          }
        }
      },
      error: (error: any) => {
        fila.analizandoIA = false;
        Swal.fire('Advertencia', 'No se pudieron extraer los datos del comprobante. Puede ingresar los datos manualmente.', 'warning');
      },
    });
  }

  eliminarArchivo(fila: FilaPago): void {
    fila.archivo = null; fila.datosIA = null; fila.valor_comprobante = null;
    const inputFile = document.getElementById('archivo_' + fila.estudiante.id_estudiante) as HTMLInputElement;
    if (inputFile) inputFile.value = '';
  }

  // ============================================
  // FORMATO DE MONEDA
  // ============================================

  formatearValor(fila: FilaPago): void {
    if (!fila.valor_recibido) { fila.valor_recibido_formateado = ''; return; }
    let parteEntera = fila.valor_recibido.toString().split('.')[0];
    parteEntera = parteEntera.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    fila.valor_recibido_formateado = parteEntera;
  }

  onInputValor(fila: FilaPago, event: any): void {
    const inputValue = event.target.value.replace(/[^\d]/g, '');
    if (inputValue === '') { fila.valor_recibido = 0; fila.valor_recibido_formateado = ''; }
    else { fila.valor_recibido = parseInt(inputValue, 10); this.formatearValor(fila); }
    if (fila.modoDistribucion === 'manual') { fila.cuentasAplicadasManual = []; fila.modoDistribucion = 'auto'; }
  }

  formatearMoneda(valor: number): string {
    if (!valor) return '0';
    return valor.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }

  // ============================================
  // SELECCIÓN
  // ============================================

  seleccionarTodos(event: any): void {
    const seleccionar = event.target.checked;
    this.filasFiltradas.forEach((f: FilaPago) => { f.seleccionado = seleccionar; });
  }

  get filasSeleccionadas(): FilaPago[] {
    return this.filas.filter((f: FilaPago) => f.seleccionado && !f.registrado);
  }

  get totalValorRegistrar(): number {
    return this.filasSeleccionadas.reduce((sum: number, f: FilaPago) => sum + (f.valor_recibido || 0), 0);
  }

  get cantidadSeleccionados(): number {
    return this.filasSeleccionadas.length;
  }

  // ============================================
  // DISTRIBUCIÓN FIFO (automática)
  // ============================================

  distribuirPagoEnCuentas(fila: FilaPago): CuentaAplicada[] {
    if (fila.modoDistribucion === 'manual' && fila.cuentasAplicadasManual.length > 0) {
      return fila.cuentasAplicadasManual;
    }
    const cuentasAplicadas: CuentaAplicada[] = [];
    if (!fila.valor_recibido || fila.valor_recibido <= 0 || fila.cuentasPendientes.length === 0) return cuentasAplicadas;

    const cuentasOrdenadas = [...fila.cuentasPendientes]
      .sort((a: CuentaPorCobrar, b: CuentaPorCobrar) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

    let valorRestante = fila.valor_recibido;
    for (const cuenta of cuentasOrdenadas) {
      if (valorRestante <= 0) break;
      const valorAplicar = Math.min(cuenta.saldo, valorRestante);
      valorRestante -= valorAplicar;
      cuentasAplicadas.push({ id_cuenta_por_cobrar: cuenta.id, valor_aplicado: valorAplicar });
    }
    return cuentasAplicadas;
  }

  getDistribucionResumen(fila: FilaPago): string {
    if (!fila.valor_recibido || fila.valor_recibido <= 0) return '';
    const dist = this.distribuirPagoEnCuentas(fila);
    if (dist.length === 0) return 'Sin cuentas';
    const totalDist = dist.reduce((s: number, c: CuentaAplicada) => s + c.valor_aplicado, 0);
    const saldoFavor = fila.valor_recibido - totalDist;
    let resumen = `${dist.length} cta(s)`;
    if (saldoFavor > 0) resumen += ` | +$${this.formatearMoneda(saldoFavor)}`;
    return resumen;
  }

  // ============================================
  // DISTRIBUCIÓN MANUAL (modal)
  // ============================================

  abrirModalDistribucion(fila: FilaPago): void {
    if (!fila.valor_recibido || fila.valor_recibido <= 0) {
      Swal.fire('Atención', 'Debe ingresar un valor a pagar mayor a cero.', 'warning'); return;
    }
    this.modalFila = fila;
    const cuentasOrdenadas = [...fila.cuentasPendientes]
      .sort((a: CuentaPorCobrar, b: CuentaPorCobrar) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

    this.modalCuentas = cuentasOrdenadas.map((cuenta: CuentaPorCobrar) => {
      const yaAplicada = fila.cuentasAplicadasManual.find((ca: CuentaAplicada) => ca.id_cuenta_por_cobrar === cuenta.id);
      return {
        cuenta, seleccionada: !!yaAplicada,
        valor_aplicado: yaAplicada ? yaAplicada.valor_aplicado : 0,
        valor_aplicado_formateado: yaAplicada ? this.formatearMoneda(yaAplicada.valor_aplicado) : ''
      };
    });
    this.calcularModalRestante();
    const modal = new (window as any).bootstrap.Modal(document.getElementById('modalDistribucion'));
    modal.show();
  }

  toggleCuentaModal(item: CuentaModalItem): void {
    item.seleccionada = !item.seleccionada;
    if (item.seleccionada) {
      const valorAplicar = Math.min(item.cuenta.saldo, this.modalValorRestante + item.valor_aplicado);
      item.valor_aplicado = valorAplicar;
      item.valor_aplicado_formateado = this.formatearMoneda(valorAplicar);
    } else { item.valor_aplicado = 0; item.valor_aplicado_formateado = ''; }
    this.calcularModalRestante();
  }

  onInputValorModal(item: CuentaModalItem, event: any): void {
    const inputValue = event.target.value.replace(/[^\d]/g, '');
    if (inputValue === '') { item.valor_aplicado = 0; item.valor_aplicado_formateado = ''; }
    else {
      let valor = parseInt(inputValue, 10);
      if (valor > item.cuenta.saldo) valor = item.cuenta.saldo;
      item.valor_aplicado = valor;
      item.valor_aplicado_formateado = this.formatearMoneda(valor);
    }
    item.seleccionada = item.valor_aplicado > 0;
    this.calcularModalRestante();
  }

  calcularModalRestante(): void {
    if (!this.modalFila) return;
    const totalAplicado = this.modalCuentas.filter((i: CuentaModalItem) => i.seleccionada)
      .reduce((s: number, i: CuentaModalItem) => s + i.valor_aplicado, 0);
    this.modalValorRestante = this.modalFila.valor_recibido - totalAplicado;
  }

  get modalTotalAplicado(): number {
    return this.modalCuentas.filter((i: CuentaModalItem) => i.seleccionada)
      .reduce((s: number, i: CuentaModalItem) => s + i.valor_aplicado, 0);
  }

  aplicarDistribucionManual(): void {
    if (!this.modalFila) return;
    if (this.modalTotalAplicado <= 0) { Swal.fire('Atención', 'Debe aplicar al menos un valor.', 'warning'); return; }
    if (this.modalTotalAplicado > this.modalFila.valor_recibido) { Swal.fire('Error', 'El total excede el valor del pago.', 'error'); return; }

    this.modalFila.cuentasAplicadasManual = this.modalCuentas
      .filter((i: CuentaModalItem) => i.seleccionada && i.valor_aplicado > 0)
      .map((i: CuentaModalItem) => ({ id_cuenta_por_cobrar: i.cuenta.id, valor_aplicado: i.valor_aplicado }));
    this.modalFila.modoDistribucion = 'manual';

    const modalEl = document.getElementById('modalDistribucion');
    const modal = (window as any).bootstrap.Modal.getInstance(modalEl);
    if (modal) modal.hide();
    this.modalFila = null; this.modalCuentas = [];
  }

  distribuirAutoFIFO(fila: FilaPago): void {
    fila.modoDistribucion = 'auto'; fila.cuentasAplicadasManual = [];
  }

  // ============================================
  // VALIDACIONES
  // ============================================

  validarFilasSeleccionadas(): { valido: boolean; errores: string[] } {
    const errores: string[] = [];
    const filasParaValidar = this.filasSeleccionadas;
    if (filasParaValidar.length === 0) { errores.push('Debe seleccionar al menos un estudiante'); return { valido: false, errores }; }

    filasParaValidar.forEach((fila: FilaPago) => {
      const nombre = fila.estudiante.nombre_estudiante;
      if (!fila.id_tipo_pago) errores.push(`${nombre}: Debe seleccionar un tipo de pago`);
      if (!fila.fecha) errores.push(`${nombre}: Debe ingresar una fecha`);
      if (!fila.valor_recibido || fila.valor_recibido <= 0) errores.push(`${nombre}: El valor debe ser mayor a cero`);
      if (this.requiereDocumento(fila) && !fila.archivo) errores.push(`${nombre}: Requiere comprobante adjunto`);
      if (this.requiereDocumento(fila) && !fila.referencia_bancaria) errores.push(`${nombre}: Debe ingresar la referencia bancaria`);
    });

    const porReferencia = new Map<string, { total: number; valorComprobante: number; nombres: string[] }>();
    filasParaValidar.forEach((fila: FilaPago) => {
      if (fila.referencia_bancaria && fila.valor_comprobante) {
        const ref = String(fila.referencia_bancaria).trim();
        if (!porReferencia.has(ref)) porReferencia.set(ref, { total: 0, valorComprobante: fila.valor_comprobante, nombres: [] });
        const datos = porReferencia.get(ref)!;
        datos.total += fila.valor_recibido;
        datos.nombres.push(fila.estudiante.nombre_estudiante);
      }
    });
    porReferencia.forEach((datos: any, ref: string) => {
      if (datos.total > datos.valorComprobante)
        errores.push(`Ref "${ref}": Suma ($${this.formatearMoneda(datos.total)}) excede comprobante ($${this.formatearMoneda(datos.valorComprobante)})`);
    });
    return { valido: errores.length === 0, errores };
  }

  // ============================================
  // REGISTRO MASIVO
  // ============================================

  async registrarPagos(): Promise<void> {
    const validacion = this.validarFilasSeleccionadas();
    if (!validacion.valido) {
      Swal.fire({ title: 'Errores de validación', html: '<ul style="text-align:left;max-height:300px;overflow-y:auto;">' +
        validacion.errores.map((e: string) => `<li>${e}</li>`).join('') + '</ul>', icon: 'error', confirmButtonText: 'Entendido' });
      return;
    }

    let resumenHtml = `<div style="text-align:left;max-height:350px;overflow-y:auto;">`;
    let totalSaldoAFavor = 0;
    this.filasSeleccionadas.forEach((fila: FilaPago) => {
      const distribucion = this.distribuirPagoEnCuentas(fila);
      const totalDistribuido = distribucion.reduce((s: number, c: CuentaAplicada) => s + c.valor_aplicado, 0);
      const saldoAFavor = fila.valor_recibido - totalDistribuido;
      totalSaldoAFavor += saldoAFavor;
      const modoTag = fila.modoDistribucion === 'manual' ? ' <small class="text-info">(manual)</small>' : '';
      resumenHtml += `<p><strong>${fila.estudiante.nombre_estudiante}</strong>: $${this.formatearMoneda(fila.valor_recibido)} → ${distribucion.length} cuenta(s)${modoTag}`;
      if (saldoAFavor > 0) resumenHtml += ` | Saldo a favor: $${this.formatearMoneda(saldoAFavor)}`;
      resumenHtml += `</p>`;
    });
    resumenHtml += `</div>`;

    let textoConfirmacion = `¿Registrar <strong>${this.cantidadSeleccionados}</strong> pago(s) por <strong>$${this.formatearMoneda(this.totalValorRegistrar)}</strong>?`;
    if (totalSaldoAFavor > 0) textoConfirmacion += `<br><small class="text-muted">Saldo a favor total: $${this.formatearMoneda(totalSaldoAFavor)}</small>`;

    const confirmacion = await Swal.fire({
      title: 'Confirmar registro', html: textoConfirmacion + '<hr>' + resumenHtml,
      icon: 'question', showCancelButton: true, confirmButtonText: 'Sí, registrar', cancelButtonText: 'Cancelar', width: '600px',
    });
    if (!confirmacion.isConfirmed) return;

    this.registrando = true;
    try {
      for (const fila of this.filasSeleccionadas.filter((f: FilaPago) => f.archivo)) {
        try { fila.id_documento_persona = await this.subirDocumento(fila); }
        catch (error: any) {
          Swal.fire('Error', `No se pudo subir el comprobante de ${fila.estudiante.nombre_estudiante}. Proceso cancelado.`, 'error');
          this.registrando = false; return;
        }
      }

      const filasARegistrar = [...this.filasSeleccionadas];
      const pagos = filasARegistrar.map((fila: FilaPago) => ({
        id_estudiante: fila.estudiante.id_estudiante, id_acudiente: fila.id_acudiente,
        id_tipo_pago: fila.id_tipo_pago, fecha: fila.fecha,
        referencia_bancaria: fila.referencia_bancaria, valor_recibido: fila.valor_recibido,
        valor_comprobante: fila.valor_comprobante || undefined,
        observaciones: fila.observaciones || 'Registro rápido de pago',
        id_documento_persona: fila.id_documento_persona,
        cuentas_aplicadas: this.distribuirPagoEnCuentas(fila)
      }));

      const idUsuario = this.utilService.obtenerIdUsuarioActual();

      this.pagosRecibidosService.registrarMasivo({ pagos, id_usuario_registro: idUsuario }).subscribe({
        next: (respuesta: any) => {
          this.registrando = false;
          if (respuesta.success) {
            // Asignar id_pago a cada fila registrada
            filasARegistrar.forEach((fila: FilaPago, idx: number) => {
              fila.registrado = true;
              fila.seleccionado = false;
              const pagoResp = respuesta.pagos?.find((p: any) => p.index === idx);
              fila.idPagoRegistrado = pagoResp ? pagoResp.id_pago : null;
              this.generarMensajeWA(fila);
            });

            const totalCuentas = respuesta.pagos
              ? respuesta.pagos.reduce((s: number, p: any) => s + (p.cuentas_aplicadas || 0), 0) : 0;

            Swal.fire({
              title: '¡Pagos registrados!',
              html: `Se registraron <strong>${respuesta.registrados}</strong> de ${respuesta.total_enviados} pagos.<br>` +
                `Se aplicaron a <strong>${totalCuentas}</strong> cuenta(s) por cobrar.<br><br>` +
                `<small>Puede enviar confirmaciones por WhatsApp desde la tabla.</small>`,
              icon: 'success', confirmButtonText: 'Ver registrados',
            }).then(() => { this.mostrarRegistrados = true; this.filtrarFilas(); });
          } else {
            Swal.fire('Advertencia', respuesta.message || 'Algunos pagos no se pudieron registrar', 'warning');
          }
        },
        error: (error: any) => { this.registrando = false; Swal.fire('Error', 'Hubo un problema al registrar los pagos', 'error'); },
      });
    } catch (error: any) { this.registrando = false; Swal.fire('Error', 'Error inesperado', 'error'); }
  }

  private subirDocumento(fila: FilaPago): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!fila.archivo) { resolve(''); return; }
      const formData = new FormData();
      formData.append('archivo', fila.archivo);
      formData.append('id_persona', fila.estudiante.id_persona.toString());
      formData.append('id_tipo_documento', '32');
      formData.append('observaciones', `Comprobante de pago - Ref: ${fila.referencia_bancaria || 'N/A'}`);
      const idUsuario = this.utilService.obtenerIdUsuarioActual();
      if (idUsuario) formData.append('id_usuario_subio', idUsuario.toString());
      this.documentosService.subirDocumento(formData).subscribe({
        next: (response: any) => resolve(response.id || response.body?.id || 0),
        error: (error: any) => reject(error),
      });
    });
  }

  // ============================================
  // MODAL ENVÍO WA (post-registro)
  // ============================================

  abrirModalEnvio(fila: FilaPago): void {
    this.envioFila = fila;
    this.telefonoAdicional = '';
    this.nombreAdicional = '';
    this.correoAdicional = '';
    this.telefonosEditables = fila.acudientes.map((a: AcudienteResponsable) => a.telefono || '');

    const modal = new (window as any).bootstrap.Modal(document.getElementById('modalEnvioWA'));
    modal.show();
  }

  generarMensajeWA(fila: FilaPago): void {
    const acudiente = fila.acudientes.find((a: AcudienteResponsable) => a.id_acudiente === fila.id_acudiente);
    const nombreDestinatario = acudiente ? acudiente.nombre_acudiente : 'Señor(a) acudiente';

    let mensaje = `Estimad@ *${nombreDestinatario}*,\n\n`;
    mensaje += `De parte de *${this.nombreColegio}*, confirmamos la recepción de su pago:\n\n`;
    mensaje += `👤 *Estudiante:* ${fila.estudiante.nombre_estudiante}\n`;
    mensaje += `💰 *Valor:* $${this.formatearMoneda(fila.valor_recibido)}\n`;
    mensaje += `📅 *Fecha:* ${this.formatearFecha(fila.fecha)}\n`;
    if (fila.referencia_bancaria) mensaje += `🔢 *Referencia:* ${fila.referencia_bancaria}\n`;
    mensaje += `\n¡Gracias por su puntualidad y confianza! 🙏`;

    fila.mensajeWA = mensaje;
    fila.telefonoWA = acudiente?.telefono || '';
  }

  generarMensajeWAParaDestinatario(fila: FilaPago, nombreDestinatario: string): string {
    let mensaje = `Estimad@ *${nombreDestinatario}*,\n\n`;
    mensaje += `De parte de *${this.nombreColegio}*, confirmamos la recepción de su pago:\n\n`;
    mensaje += `👤 *Estudiante:* ${fila.estudiante.nombre_estudiante}\n`;
    mensaje += `💰 *Valor:* $${this.formatearMoneda(fila.valor_recibido)}\n`;
    mensaje += `📅 *Fecha:* ${this.formatearFecha(fila.fecha)}\n`;
    if (fila.referencia_bancaria) mensaje += `🔢 *Referencia:* ${fila.referencia_bancaria}\n`;
    mensaje += `\n¡Gracias por su puntualidad y confianza! 🙏`;
    return mensaje;
  }

  enviarWhatsAppAcudiente(fila: FilaPago, acudiente: AcudienteResponsable, indice: number): void {
    const telefono = this.telefonosEditables[indice];
    if (!telefono) { Swal.fire('Atención', 'Ingrese un número de teléfono.', 'warning'); return; }
    const mensaje = this.generarMensajeWAParaDestinatario(fila, acudiente.nombre_acudiente);
    const telefonoLimpio = this.limpiarTelefono(telefono);
    window.open(`https://wa.me/57${telefonoLimpio}?text=${encodeURIComponent(mensaje)}`, '_blank');
  }

  enviarWhatsAppAdicional(fila: FilaPago): void {
    if (!this.telefonoAdicional) { Swal.fire('Atención', 'Ingrese un número de teléfono.', 'warning'); return; }
    const nombre = this.nombreAdicional.trim() || 'Señor(a) acudiente';
    const mensaje = this.generarMensajeWAParaDestinatario(fila, nombre);
    const telefonoLimpio = this.limpiarTelefono(this.telefonoAdicional);
    window.open(`https://wa.me/57${telefonoLimpio}?text=${encodeURIComponent(mensaje)}`, '_blank');
  }

  enviarCorreoAcudiente(fila: FilaPago, acudiente: AcudienteResponsable): void {
    if (!acudiente.correo_electronico) {
      Swal.fire('Atención', 'Este acudiente no tiene correo electrónico registrado.', 'warning');
      return;
    }
    const asunto = `Confirmación de pago - ${fila.estudiante.nombre_estudiante} - ${this.nombreColegio}`;
    let cuerpo = `Estimad@ ${acudiente.nombre_acudiente},\n\n`;
    cuerpo += `De parte de ${this.nombreColegio}, confirmamos la recepción de su pago:\n\n`;
    cuerpo += `Estudiante: ${fila.estudiante.nombre_estudiante}\n`;
    cuerpo += `Valor: $${this.formatearMoneda(fila.valor_recibido)}\n`;
    cuerpo += `Fecha: ${this.formatearFecha(fila.fecha)}\n`;
    if (fila.referencia_bancaria) cuerpo += `Referencia: ${fila.referencia_bancaria}\n`;
    cuerpo += `\nGracias por su puntualidad y confianza.`;

    const url = `https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(acudiente.correo_electronico)}&su=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`;
    window.open(url, '_blank');
  }

  enviarCorreoAdicional(fila: FilaPago): void {
    if (!this.correoAdicional) { Swal.fire('Atención', 'Ingrese un correo electrónico.', 'warning'); return; }
    const nombre = this.nombreAdicional.trim() || 'Señor(a) acudiente';
    const asunto = `Confirmación de pago - ${fila.estudiante.nombre_estudiante} - ${this.nombreColegio}`;
    let cuerpo = `Estimad@ ${nombre},\n\nDe parte de ${this.nombreColegio}, confirmamos la recepción de su pago:\n\n`;
    cuerpo += `Estudiante: ${fila.estudiante.nombre_estudiante}\nValor: $${this.formatearMoneda(fila.valor_recibido)}\n`;
    cuerpo += `Fecha: ${this.formatearFecha(fila.fecha)}\n`;
    if (fila.referencia_bancaria) cuerpo += `Referencia: ${fila.referencia_bancaria}\n`;
    cuerpo += `\nGracias por su puntualidad y confianza.`;

    const url = `https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(this.correoAdicional)}&su=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`;
    window.open(url, '_blank');
  }

  // ============================================
  // DESCARGA COMPROBANTE PDF
  // ============================================

  async descargarComprobante(fila: FilaPago): Promise<void> {
    if (!fila.idPagoRegistrado) {
      Swal.fire('Error', 'No se encontró el ID del pago registrado.', 'error'); return;
    }

    this.descargandoPDF = true;

    this.pagosRecibidosService.obtenerDatosComprobante(fila.idPagoRegistrado).subscribe({
      next: async (response: any) => {
        try {
          const datos = response.body;
          if (!datos || !datos.pago) {
            Swal.fire('Error', 'No se pudieron obtener los datos del comprobante.', 'error');
            this.descargandoPDF = false; return;
          }

          const logoBase64 = await this.cargarLogoBase64();

          const datosPDF: DatosComprobantePDF = {
            pago: datos.pago,
            estudiante: datos.estudiante,
            acudiente: datos.acudiente,
            tipoPago: datos.tipoPago,
            fechaGeneracion: new Date(),
            logoBase64: logoBase64
          };

          this.exportarPdfComprobanteService.generarPDF(datosPDF);
          this.descargandoPDF = false;
        } catch (error: any) {
          console.error('Error al generar PDF:', error);
          Swal.fire('Error', 'Error al generar el comprobante PDF.', 'error');
          this.descargandoPDF = false;
        }
      },
      error: (error: any) => {
        console.error('Error al obtener datos del comprobante:', error);
        Swal.fire('Error', 'No se pudieron obtener los datos del comprobante.', 'error');
        this.descargandoPDF = false;
      }
    });
  }

  private async cargarLogoBase64(): Promise<string> {
    try {
      const logoUrl = this.institucionConfigService.getLogoUrl();
      const response = await fetch(logoUrl);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error: any) { return ''; }
  }

  // ============================================
  // UTILIDADES
  // ============================================

  limpiarTelefono(telefono: string): string {
    return telefono.replace(/[\s\-\(\)\+]/g, '').replace(/^57/, '');
  }

  private formatearFecha(fecha: string): string {
    try { const [year, month, day] = fecha.split('-'); return `${day}/${month}/${year}`; }
    catch { return fecha; }
  }

  limpiarFormulario(): void {
    this.mostrarRegistrados = false;
    this.cargarDatos();
  }

  trackByEstudiante(index: number, fila: FilaPago): string {
    return fila.estudiante.id_estudiante;
  }
}