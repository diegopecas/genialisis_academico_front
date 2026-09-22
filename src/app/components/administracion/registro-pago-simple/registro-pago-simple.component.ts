import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import Swal from 'sweetalert2';
import { UtilService } from '../../../common/constantes/util.service';
import { HeaderComponent } from '../../../common/header/header.component';
import { DocumentosPersonasService } from '../../../services/documentos-personas.service';
import { ExportarPdfComprobanteService, DatosComprobantePDF } from '../../../services/exportar-pdf-comprobante.service';
import { InstitucionConfigService } from '../../../services/institucion-config.service';
import { PagosRecibidosService } from '../../../services/pagos-recibidos.service';
import { PlantillasService } from '../../../services/plantillas.service';

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
  id_producto_servicio: string;
  nombre_producto_servicio: string;
  clasificacion_producto: string;
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
  banco: string | null;
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

/* Lo que se muestra despues de registrar. Se arma con lo que devuelve el
   backend mas el saldo que tenia el estudiante antes del pago, porque el
   objetivo de la pantalla es cerrar diciendo cuanto queda debiendo. */
interface ResumenRegistro {
  id_pago: string | null;
  valor_registrado: number;
  cuentas_aplicadas: number;
  total_aplicado: number;
  saldo_a_favor: number;
  saldo_anterior: number;
  saldo_nuevo: number;
}

@Component({
  selector: 'app-registro-pago-simple',
  templateUrl: './registro-pago-simple.component.html',
  styleUrl: './registro-pago-simple.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent],
})
export class RegistroPagoSimpleComponent implements OnInit, OnDestroy {
  public titulo = 'Pago Rápido de un Estudiante';
  public regresar = '/administracion/financiero';

  public cargando = false;
  public registrando = false;
  private subscriptions: Subscription[] = [];

  // Datos maestros en memoria (una sola llamada al entrar)
  public tiposPago: TipoPago[] = [];
  private estudiantes: EstudianteRapido[] = [];
  private cuentasPorEstudiante = new Map<string, CuentaPorCobrar[]>();
  private acudientesPorEstudiante = new Map<string, AcudienteResponsable[]>();

  // Comprobante
  public archivo: File | null = null;
  public analizandoIA = false;
  public datosIA: DatosComprobante | null = null;
  public valor_comprobante: number | null = null;
  /* La lectura con IA es opcional: si el proveedor esta fallando o se quiere ir
     mas rapido, se apaga y los datos se digitan. Arranca encendida. */
  public usarIA = true;
  private subIA: Subscription | null = null;

  // Busqueda de estudiante
  public busqueda = '';
  public sugerencias: EstudianteRapido[] = [];
  public estudiante: EstudianteRapido | null = null;
  public cuentasPendientes: CuentaPorCobrar[] = [];
  public acudientes: AcudienteResponsable[] = [];
  public saldoTotal = 0;

  // Datos del pago
  public id_acudiente: string | null = null;
  public id_tipo_pago: string | null = null;
  public fecha = '';
  public referencia_bancaria = '';
  public referenciaVerificada: string | null = null;
  // Total ya registrado en BD para esa referencia (lo llena verificarReferencia).
  public totalReferenciaBD = 0;
  public valor_recibido = 0;
  public valor_recibido_formateado = '';
  public observaciones = '';

  // Distribucion
  public modoDistribucion: 'auto' | 'manual' = 'auto';
  public cuentasAplicadasManual: CuentaAplicada[] = [];
  public modalCuentas: CuentaModalItem[] = [];
  public modalValorRestante = 0;
  // Filtros del modal de cuentas. Las opciones salen de las mismas cuentas
  // que debe el estudiante, no de un catalogo aparte.
  public filtroTextoCuenta = '';
  public filtroProductoCuenta = '';
  public filtroClasificacionCuenta = '';

  // Resultado
  public resumen: ResumenRegistro | null = null;

  // Modal envio (post-registro)
  public telefonosEditables: string[] = [];
  public telefonoAdicional = '';
  public nombreAdicional = '';
  public correoAdicional = '';
  public descargandoPDF = false;

  /* El nombre sale de la configuracion del jardin, no se quema aqui:
     el mismo codigo corre para todos los tenants. */
  private get nombreColegio(): string {
    return this.institucionConfigService.getNombreInstitucion() || 'La institución';
  }

  /* Cuerpos del mensaje de confirmacion. Son el respaldo: si el jardin tiene
     la plantilla sembrada en base, estos valores se reemplazan al iniciar. */
  public plantillaConfirmacion: any = {
    cuerpo_whatsapp: 'Estimad@ *{nombre_destinatario}*,\n\nDe parte de *{nombre_colegio}*, confirmamos la recepción de su pago:\n\n👤 *Estudiante:* {nombre_estudiante}\n💰 *Valor:* {valor}\n📅 *Fecha:* {fecha}\n{linea_referencia}\n\n¡Gracias por su puntualidad y confianza! 🙏',
    linea_referencia_whatsapp: '🔢 *Referencia:* {referencia}',
    cuerpo_correo: 'Estimad@ {nombre_destinatario},\n\nDe parte de {nombre_colegio}, confirmamos la recepción de su pago:\n\nEstudiante: {nombre_estudiante}\nValor: {valor}\nFecha: {fecha}\n{linea_referencia}\n\nGracias por su puntualidad y confianza.',
    linea_referencia_correo: 'Referencia: {referencia}',
    asunto_correo: 'Confirmación de pago - {nombre_estudiante} - {nombre_colegio}'
  };

  constructor(
    private pagosRecibidosService: PagosRecibidosService,
    private documentosService: DocumentosPersonasService,
    private utilService: UtilService,
    private exportarPdfComprobanteService: ExportarPdfComprobanteService,
    private institucionConfigService: InstitucionConfigService,
    private plantillasService: PlantillasService
  ) {}

  ngOnInit(): void {
    this.fecha = new Date().toISOString().split('T')[0];
    this.cargando = true;
    this.cargarPlantilla();
    this.cargarDatos();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub: Subscription) => sub.unsubscribe());
  }

  // ============================================
  // CARGA DE DATOS
  // ============================================

  /**
   * Trae en una sola llamada estudiantes, cuentas pendientes, acudientes y
   * tipos de pago. Es el mismo endpoint del registro rapido: aqui se deja todo
   * en memoria para que la busqueda del estudiante sea instantanea.
   */
  cargarDatos(): void {
    const sub = this.pagosRecibidosService.obtenerDatosRegistroRapido().subscribe({
      next: (response: any) => {
        const data = response.body;
        if (data) {
          this.tiposPago = data.tipos_pagos || [];
          this.estudiantes = data.estudiantes || [];

          this.acudientesPorEstudiante = new Map<string, AcudienteResponsable[]>();
          (data.acudientes || []).forEach((a: AcudienteResponsable) => {
            if (!this.acudientesPorEstudiante.has(a.id_estudiante)) {
              this.acudientesPorEstudiante.set(a.id_estudiante, []);
            }
            this.acudientesPorEstudiante.get(a.id_estudiante)!.push(a);
          });

          this.cuentasPorEstudiante = new Map<string, CuentaPorCobrar[]>();
          (data.cuentas_por_cobrar || []).forEach((c: any) => {
            if (!this.cuentasPorEstudiante.has(c.id_estudiante)) {
              this.cuentasPorEstudiante.set(c.id_estudiante, []);
            }
            this.cuentasPorEstudiante.get(c.id_estudiante)!.push({
              ...c,
              saldo: parseFloat(String(c.saldo)),
              valor: parseFloat(String(c.valor)),
              total_pagado: parseFloat(String(c.total_pagado))
            });
          });
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

  /**
   * Trae la plantilla de confirmacion de pago desde la tabla plantillas.
   * Si no existe la fila o falla la consulta, se conservan los textos de arriba.
   */
  cargarPlantilla(): void {
    const sub = this.plantillasService.obtenerByTipoClave('mensaje', 'confirmacion_pago').subscribe({
      next: (response: any) => {
        const contenido = response.body?.contenido;
        if (!contenido) return;

        Object.keys(this.plantillaConfirmacion).forEach(clave => {
          if (typeof contenido[clave] === 'string' && contenido[clave].trim()) {
            this.plantillaConfirmacion[clave] = contenido[clave];
          }
        });
      },
      error: () => {
        console.warn('No se pudo cargar la plantilla de confirmación de pago, se usan los textos por defecto.');
      }
    });
    this.subscriptions.push(sub);
  }

  // ============================================
  // COMPROBANTE + IA
  // ============================================

  /**
   * Recibe el archivo (subido o tomado con la camara) y lo manda a la IA.
   * Lo que la IA devuelva prellena valor, fecha y referencia; si falla, la
   * docente sigue con los campos en blanco y digita el valor a mano.
   */
  onArchivoSeleccionado(event: any): void {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { Swal.fire('Error', 'El archivo no puede superar 10MB', 'error'); event.target.value = ''; return; }
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!extension || !['pdf', 'jpg', 'jpeg', 'png'].includes(extension)) { Swal.fire('Error', 'Solo se permiten archivos PDF, JPG, JPEG o PNG', 'error'); event.target.value = ''; return; }

    this.archivo = file;
    this.datosIA = null;
    this.valor_comprobante = null;

    // El archivo ya quedo adjunto y se sube al registrar. La lectura con IA
    // solo se dispara si esta encendida.
    if (this.usarIA) this.analizarConIA();
  }

  /**
   * Manda el comprobante a la IA para que llene valor, fecha, referencia y
   * banco. Se puede llamar a mano cuando la lectura automatica esta apagada.
   */
  analizarConIA(): void {
    if (!this.archivo || this.analizandoIA) return;

    this.analizandoIA = true;
    this.subIA = this.pagosRecibidosService.analizarComprobante(this.archivo).subscribe({
      next: (respuesta: any) => {
        this.analizandoIA = false;
        this.subIA = null;
        if (!respuesta.success || !respuesta.datos) {
          // El archivo se conserva y se guarda igual: solo hay que digitar los
          // datos a mano.
          Swal.fire('Advertencia', 'No se pudieron extraer los datos del comprobante. Ingrese el valor y la referencia manualmente; el documento se guarda igual.', 'warning');
          return;
        }
        this.datosIA = respuesta.datos;
        if (respuesta.datos.fecha) this.fecha = respuesta.datos.fecha;
        if (respuesta.datos.referencia) this.referencia_bancaria = String(respuesta.datos.referencia);
        if (respuesta.datos.valor) {
          this.valor_recibido = respuesta.datos.valor;
          this.valor_comprobante = respuesta.datos.valor;
          this.formatearValor();
        }
        this.validarBancoContraTipoPago();
        // La referencia la llena la IA, asi que el usuario nunca pasa por el
        // campo: se verifica aqui para que no se cuele sin revisar.
        this.verificarReferencia();
      },
      error: () => {
        this.analizandoIA = false;
        this.subIA = null;
        // Falla de la IA o del servicio: el comprobante sigue adjunto y se sube
        // al registrar, la docente solo digita los datos.
        Swal.fire('Advertencia', 'No se pudieron extraer los datos del comprobante. Ingrese el valor y la referencia manualmente; el documento se guarda igual.', 'warning');
      },
    });
  }

  /** Corta la espera de la IA: se cancela la peticion y se sigue a mano. */
  cancelarAnalisisIA(): void {
    if (this.subIA) { this.subIA.unsubscribe(); this.subIA = null; }
    this.analizandoIA = false;
  }

  /* Al apagar la lectura automatica se corta lo que este en curso; al
     encenderla con un archivo ya adjunto, se lee de una vez. */
  onUsarIAChange(): void {
    if (!this.usarIA) { this.cancelarAnalisisIA(); return; }
    if (this.archivo && !this.datosIA) this.analizarConIA();
  }

  eliminarArchivo(): void {
    this.cancelarAnalisisIA();
    this.archivo = null;
    this.datosIA = null;
    this.valor_comprobante = null;
    ['archivoComprobante', 'fotoComprobante'].forEach((id: string) => {
      const input = document.getElementById(id) as HTMLInputElement;
      if (input) input.value = '';
    });
  }

  // Compara el banco detectado por la IA en el comprobante contra el nombre del
  // tipo de pago elegido. Solo advierte (no bloquea) si no coinciden.
  private validarBancoContraTipoPago(): void {
    const bancoDetectado = this.datosIA?.banco;
    if (!bancoDetectado || !this.id_tipo_pago) return;

    const tipo = this.tiposPago.find((tp: TipoPago) => tp.id === this.id_tipo_pago);
    if (!tipo || !tipo.nombre) return;

    const banco = this.normalizar(String(bancoDetectado));
    const nombreTipo = this.normalizar(tipo.nombre);

    // Coincide si alguno contiene al otro (ej. "Bancolombia" vs "Bancolombia S.A.")
    const coincide = banco.includes(nombreTipo) || nombreTipo.includes(banco);

    if (!coincide) {
      Swal.fire({
        title: 'Verifique el tipo de pago',
        html: `<div style="text-align:left;">`
          + `El comprobante parece ser de <strong>${bancoDetectado}</strong>, `
          + `pero el tipo de pago seleccionado es <strong>${tipo.nombre}</strong>.<br><br>`
          + `Verifique que el tipo de pago sea el correcto.`
          + `</div>`,
        icon: 'warning',
        confirmButtonText: 'Entendido'
      });
    }
  }

  // ============================================
  // BUSQUEDA DE ESTUDIANTE
  // ============================================

  private normalizar(texto: string): string {
    return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  }

  /**
   * Filtra sobre los estudiantes ya cargados en memoria: nombre, documento o
   * grupo. Se limita la lista para que en el celular no aparezca un chorro de
   * resultados imposible de tocar.
   */
  buscarEstudiante(): void {
    const termino = this.normalizar(this.busqueda);
    if (termino.length < 2) { this.sugerencias = []; return; }

    this.sugerencias = this.estudiantes.filter((e: EstudianteRapido) =>
      this.normalizar(e.nombre_estudiante).includes(termino) ||
      this.normalizar(e.numero_identificacion || '').includes(termino) ||
      this.normalizar(e.grupo_estudiante || '').includes(termino)
    ).slice(0, 10);
  }

  saldoDe(idEstudiante: string): number {
    const cuentas = this.cuentasPorEstudiante.get(idEstudiante) || [];
    return cuentas.reduce((suma: number, c: CuentaPorCobrar) => suma + c.saldo, 0);
  }

  seleccionarEstudiante(est: EstudianteRapido): void {
    this.estudiante = est;
    this.busqueda = est.nombre_estudiante;
    this.sugerencias = [];

    this.cuentasPendientes = this.cuentasPorEstudiante.get(est.id_estudiante) || [];
    this.acudientes = this.acudientesPorEstudiante.get(est.id_estudiante) || [];
    this.saldoTotal = this.cuentasPendientes.reduce((suma: number, c: CuentaPorCobrar) => suma + c.saldo, 0);
    this.id_acudiente = this.acudientes.length > 0 ? this.acudientes[0].id_acudiente : null;

    // Cambiar de estudiante invalida cualquier distribucion armada a mano.
    this.modoDistribucion = 'auto';
    this.cuentasAplicadasManual = [];
  }

  cambiarEstudiante(): void {
    this.estudiante = null;
    this.busqueda = '';
    this.sugerencias = [];
    this.cuentasPendientes = [];
    this.acudientes = [];
    this.saldoTotal = 0;
    this.id_acudiente = null;
    this.modoDistribucion = 'auto';
    this.cuentasAplicadasManual = [];
  }

  // ============================================
  // TIPO DE PAGO
  // ============================================

  /**
   * El tipo de pago es lo primero que se escoge: de el depende que se muestre
   * o no el bloque del comprobante. Si el tipo nuevo no exige documento se
   * suelta el archivo cargado, porque el bloque deja de verse y quedaria un
   * adjunto invisible amarrado al pago.
   */
  onTipoPagoChange(): void {
    const tipoPago = this.tiposPago.find((tp: TipoPago) => tp.id === this.id_tipo_pago);
    if (tipoPago && !tipoPago.requiere_documento) {
      this.eliminarArchivo();
      this.referencia_bancaria = '';
      this.referenciaVerificada = null;
      this.totalReferenciaBD = 0;
      return;
    }
    // El comprobante puede haberse procesado antes de elegir el tipo de pago,
    // por eso la comparacion tambien se hace al cambiarlo.
    this.validarBancoContraTipoPago();
  }

  requiereDocumento(): boolean {
    if (!this.id_tipo_pago) return false;
    const tipoPago = this.tiposPago.find((tp: TipoPago) => tp.id === this.id_tipo_pago);
    return tipoPago ? tipoPago.requiere_documento === 1 : false;
  }

  // ============================================
  // VERIFICACION DE REFERENCIA
  // ============================================

  /**
   * La referencia repetida NO es un error: un mismo comprobante puede repartirse
   * entre hermanos. Lo que se controla es que lo ya registrado en BD mas este
   * pago no supere el valor del comprobante. Solo advierte; nunca bloquea.
   */
  verificarReferencia(): void {
    const referencia = (this.referencia_bancaria || '').trim();
    if (!referencia) {
      this.referenciaVerificada = null;
      this.totalReferenciaBD = 0;
      return;
    }

    // Evita repetir la consulta si la referencia no cambio desde la ultima.
    if (this.referenciaVerificada === referencia) return;
    this.referenciaVerificada = referencia;

    // Solo se envia la referencia: el chequeo de "posible duplicado" del backend
    // no aplica aqui y asi la consulta es mas liviana.
    this.pagosRecibidosService.verificarDuplicado({ referencia_bancaria: referencia }).subscribe({
      next: (respuesta: any) => {
        const pagosPrevios = respuesta?.referencia_existente || [];
        const totalRegistrado = Number(respuesta?.total_referencia || 0);
        this.totalReferenciaBD = totalRegistrado;

        const valorComprobante = Number(this.valor_comprobante || 0);
        const totalAcumulado = totalRegistrado + Number(this.valor_recibido || 0);

        // Con comprobante leido por IA se puede comparar contra su valor.
        if (valorComprobante > 0 && totalAcumulado > valorComprobante) {
          const exceso = totalAcumulado - valorComprobante;
          Swal.fire({
            title: 'El comprobante no alcanza',
            html: `<div style="text-align:left;">`
              + `Comprobante <strong>${referencia}</strong> por <strong>$${this.formatearMoneda(valorComprobante)}</strong>.<br><br>`
              + `Ya registrado: <strong>$${this.formatearMoneda(totalRegistrado)}</strong><br>`
              + `Este pago: <strong>$${this.formatearMoneda(this.valor_recibido)}</strong><br>`
              + `Total: <strong>$${this.formatearMoneda(totalAcumulado)}</strong><br><br>`
              + `Excede en <strong>$${this.formatearMoneda(exceso)}</strong>. Verifique los valores.`
              + `</div>`,
            icon: 'warning',
            confirmButtonText: 'Entendido'
          });
          return;
        }

        // Sin valor de comprobante solo se informa que la referencia ya se uso.
        if (pagosPrevios.length > 0) {
          const nombres = pagosPrevios
            .map((p: any) => `${p.nombre_estudiante || 'N/A'} ($${this.formatearMoneda(Number(p.valor_recibido || 0))})`)
            .join('<br>');
          Swal.fire({
            title: 'Referencia ya utilizada',
            html: `<div style="text-align:left;">`
              + `La referencia <strong>${referencia}</strong> ya tiene pagos registrados por `
              + `<strong>$${this.formatearMoneda(totalRegistrado)}</strong>:<br><br>${nombres}<br><br>`
              + `Si el comprobante cubre a varios estudiantes puede continuar.`
              + `</div>`,
            icon: 'info',
            confirmButtonText: 'Entendido'
          });
        }
      },
      error: (error: any) => {
        // La verificacion es informativa: si falla, no se interrumpe el registro.
        console.error('Error al verificar la referencia:', error);
      }
    });
  }

  // ============================================
  // FORMATO DE MONEDA
  // ============================================

  formatearValor(): void {
    if (!this.valor_recibido) { this.valor_recibido_formateado = ''; return; }
    let parteEntera = this.valor_recibido.toString().split('.')[0];
    parteEntera = parteEntera.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    this.valor_recibido_formateado = parteEntera;
  }

  onInputValor(event: any): void {
    const inputValue = event.target.value.replace(/[^\d]/g, '');
    if (inputValue === '') { this.valor_recibido = 0; this.valor_recibido_formateado = ''; }
    else { this.valor_recibido = parseInt(inputValue, 10); this.formatearValor(); }
    if (this.modoDistribucion === 'manual') { this.cuentasAplicadasManual = []; this.modoDistribucion = 'auto'; }
  }

  formatearMoneda(valor: number): string {
    if (!valor) return '0';
    return valor.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }

  // ============================================
  // DISTRIBUCION
  // ============================================

  /** Automatica: aplica de la cuenta mas antigua a la mas nueva (FIFO). */
  distribuirPagoEnCuentas(): CuentaAplicada[] {
    if (this.modoDistribucion === 'manual' && this.cuentasAplicadasManual.length > 0) {
      return this.cuentasAplicadasManual;
    }
    const cuentasAplicadas: CuentaAplicada[] = [];
    if (!this.valor_recibido || this.valor_recibido <= 0 || this.cuentasPendientes.length === 0) return cuentasAplicadas;

    const cuentasOrdenadas = this.cuentasOrdenadas();

    let valorRestante = this.valor_recibido;
    for (const cuenta of cuentasOrdenadas) {
      if (valorRestante <= 0) break;
      const valorAplicar = Math.min(cuenta.saldo, valorRestante);
      valorRestante -= valorAplicar;
      cuentasAplicadas.push({ id_cuenta_por_cobrar: cuenta.id, valor_aplicado: valorAplicar });
    }
    return cuentasAplicadas;
  }

  private cuentasOrdenadas(): CuentaPorCobrar[] {
    return [...this.cuentasPendientes]
      .sort((a: CuentaPorCobrar, b: CuentaPorCobrar) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
  }

  get totalDistribuido(): number {
    return this.distribuirPagoEnCuentas().reduce((s: number, c: CuentaAplicada) => s + c.valor_aplicado, 0);
  }

  get saldoAFavor(): number {
    if (!this.valor_recibido || this.valor_recibido <= 0) return 0;
    return this.valor_recibido - this.totalDistribuido;
  }

  get saldoDespuesDelPago(): number {
    return this.saldoTotal - this.totalDistribuido;
  }

  distribuirAutoFIFO(): void {
    this.modoDistribucion = 'auto';
    this.cuentasAplicadasManual = [];
  }

  abrirModalDistribucion(): void {
    if (!this.valor_recibido || this.valor_recibido <= 0) {
      Swal.fire('Atención', 'Debe ingresar un valor a pagar mayor a cero.', 'warning'); return;
    }

    this.filtroTextoCuenta = '';
    this.filtroProductoCuenta = '';
    this.filtroClasificacionCuenta = '';

    this.modalCuentas = this.cuentasOrdenadas().map((cuenta: CuentaPorCobrar) => {
      const yaAplicada = this.cuentasAplicadasManual.find((ca: CuentaAplicada) => ca.id_cuenta_por_cobrar === cuenta.id);
      return {
        cuenta, seleccionada: !!yaAplicada,
        valor_aplicado: yaAplicada ? yaAplicada.valor_aplicado : 0,
        valor_aplicado_formateado: yaAplicada ? this.formatearMoneda(yaAplicada.valor_aplicado) : ''
      };
    });
    this.calcularModalRestante();
    const modal = new (window as any).bootstrap.Modal(document.getElementById('modalDistribucionSimple'));
    modal.show();
  }

  /* Opciones de los filtros: se arman con lo que el estudiante debe hoy.
     Asi no hay que traer el catalogo completo de productos. */
  get productosDeCuentas(): string[] {
    const nombres = this.cuentasPendientes
      .map((c: CuentaPorCobrar) => c.nombre_producto_servicio)
      .filter((n: string) => !!n);
    return Array.from(new Set(nombres)).sort();
  }

  get clasificacionesDeCuentas(): string[] {
    const nombres = this.cuentasPendientes
      .map((c: CuentaPorCobrar) => c.clasificacion_producto)
      .filter((n: string) => !!n);
    return Array.from(new Set(nombres)).sort();
  }

  /* Los filtros solo afectan lo que se ve: lo ya aplicado en una cuenta que
     queda oculta se conserva y sigue contando en el total. */
  get modalCuentasFiltradas(): CuentaModalItem[] {
    const texto = this.normalizar(this.filtroTextoCuenta);
    return this.modalCuentas.filter((item: CuentaModalItem) => {
      if (this.filtroProductoCuenta && item.cuenta.nombre_producto_servicio !== this.filtroProductoCuenta) return false;
      if (this.filtroClasificacionCuenta && item.cuenta.clasificacion_producto !== this.filtroClasificacionCuenta) return false;
      if (texto) {
        const contenido = this.normalizar(
          `${item.cuenta.nombre_producto_servicio || ''} ${item.cuenta.detalle || ''} ${item.cuenta.clasificacion_producto || ''}`
        );
        if (!contenido.includes(texto)) return false;
      }
      return true;
    });
  }

  limpiarFiltrosCuentas(): void {
    this.filtroTextoCuenta = '';
    this.filtroProductoCuenta = '';
    this.filtroClasificacionCuenta = '';
  }

  get hayCuentasOcultas(): boolean {
    return this.modalCuentasFiltradas.length < this.modalCuentas.length;
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
    this.modalValorRestante = this.valor_recibido - this.modalTotalAplicado;
  }

  get modalTotalAplicado(): number {
    return this.modalCuentas.filter((i: CuentaModalItem) => i.seleccionada)
      .reduce((s: number, i: CuentaModalItem) => s + i.valor_aplicado, 0);
  }

  aplicarDistribucionManual(): void {
    if (this.modalTotalAplicado <= 0) { Swal.fire('Atención', 'Debe aplicar al menos un valor.', 'warning'); return; }
    if (this.modalTotalAplicado > this.valor_recibido) { Swal.fire('Error', 'El total excede el valor del pago.', 'error'); return; }

    this.cuentasAplicadasManual = this.modalCuentas
      .filter((i: CuentaModalItem) => i.seleccionada && i.valor_aplicado > 0)
      .map((i: CuentaModalItem) => ({ id_cuenta_por_cobrar: i.cuenta.id, valor_aplicado: i.valor_aplicado }));
    this.modoDistribucion = 'manual';

    const modalEl = document.getElementById('modalDistribucionSimple');
    const modal = (window as any).bootstrap.Modal.getInstance(modalEl);
    if (modal) modal.hide();
    this.modalCuentas = [];
  }

  // ============================================
  // REGISTRO
  // ============================================

  get listoParaRegistrar(): boolean {
    if (!this.estudiante || !this.id_tipo_pago || !this.fecha) return false;
    if (!this.valor_recibido || this.valor_recibido <= 0) return false;
    if (this.requiereDocumento() && (!this.archivo || !this.referencia_bancaria)) return false;
    return true;
  }

  private validar(): string[] {
    const errores: string[] = [];
    if (!this.estudiante) errores.push('Debe seleccionar el estudiante');
    if (!this.id_tipo_pago) errores.push('Debe seleccionar un tipo de pago');
    if (!this.fecha) errores.push('Debe ingresar la fecha');
    if (!this.valor_recibido || this.valor_recibido <= 0) errores.push('El valor debe ser mayor a cero');
    if (this.requiereDocumento() && !this.archivo) errores.push('El tipo de pago requiere comprobante adjunto');
    if (this.requiereDocumento() && !this.referencia_bancaria) errores.push('Debe ingresar la referencia bancaria');

    // Tope del comprobante: lo ya registrado en BD con esa referencia mas este
    // pago no puede superar el valor que la IA leyo en el comprobante.
    const valorComprobante = Number(this.valor_comprobante || 0);
    if (valorComprobante > 0 && this.referencia_bancaria) {
      const acumulado = Number(this.totalReferenciaBD || 0) + this.valor_recibido;
      if (acumulado > valorComprobante) {
        errores.push(`Ref "${this.referencia_bancaria}": suma $${this.formatearMoneda(acumulado)} y excede el comprobante ($${this.formatearMoneda(valorComprobante)})`);
      }
    }
    return errores;
  }

  async registrarPago(): Promise<void> {
    const errores = this.validar();
    if (errores.length > 0) {
      Swal.fire({
        title: 'Faltan datos',
        html: '<ul style="text-align:left;">' + errores.map((e: string) => `<li>${e}</li>`).join('') + '</ul>',
        icon: 'error', confirmButtonText: 'Entendido'
      });
      return;
    }

    const distribucion = this.distribuirPagoEnCuentas();
    const totalDistribuido = distribucion.reduce((s: number, c: CuentaAplicada) => s + c.valor_aplicado, 0);
    const saldoAFavor = this.valor_recibido - totalDistribuido;
    const saldoAnterior = this.saldoTotal;

    let html = `<div style="text-align:left;">`
      + `<p><strong>${this.estudiante!.nombre_estudiante}</strong></p>`
      + `<p>Valor: <strong>$${this.formatearMoneda(this.valor_recibido)}</strong> → ${distribucion.length} cuenta(s)`
      + (this.modoDistribucion === 'manual' ? ' <small>(distribución manual)</small>' : '')
      + `</p>`;
    if (saldoAFavor > 0) html += `<p>Saldo a favor: <strong>$${this.formatearMoneda(saldoAFavor)}</strong></p>`;
    html += `<p>Queda debiendo: <strong>$${this.formatearMoneda(saldoAnterior - totalDistribuido)}</strong></p></div>`;

    const confirmacion = await Swal.fire({
      title: 'Confirmar pago', html,
      icon: 'question', showCancelButton: true,
      confirmButtonText: 'Sí, registrar', cancelButtonText: 'Cancelar'
    });
    if (!confirmacion.isConfirmed) return;

    this.registrando = true;

    let idDocumento: string | null = null;
    if (this.archivo) {
      try { idDocumento = await this.subirDocumento(); }
      catch {
        Swal.fire('Error', 'No se pudo subir el comprobante. El pago no se registró.', 'error');
        this.registrando = false; return;
      }
    }

    const pagos = [{
      id_estudiante: this.estudiante!.id_estudiante,
      id_acudiente: this.id_acudiente,
      id_tipo_pago: this.id_tipo_pago,
      fecha: this.fecha,
      referencia_bancaria: this.referencia_bancaria,
      valor_recibido: this.valor_recibido,
      valor_comprobante: this.valor_comprobante || undefined,
      observaciones: this.observaciones,
      id_documento_persona: idDocumento,
      cuentas_aplicadas: distribucion
    }];

    const idUsuario = this.utilService.obtenerIdUsuarioActual();

    this.pagosRecibidosService.registrarMasivo({ pagos, id_usuario_registro: idUsuario }).subscribe({
      next: (respuesta: any) => {
        this.registrando = false;
        if (respuesta.success) {
          const pagoResp = respuesta.pagos?.find((p: any) => p.index === 0);
          this.resumen = {
            id_pago: pagoResp ? pagoResp.id_pago : null,
            valor_registrado: this.valor_recibido,
            cuentas_aplicadas: pagoResp ? Number(pagoResp.cuentas_aplicadas || 0) : distribucion.length,
            total_aplicado: totalDistribuido,
            saldo_a_favor: saldoAFavor,
            saldo_anterior: saldoAnterior,
            saldo_nuevo: saldoAnterior - totalDistribuido
          };
          this.telefonosEditables = this.acudientes.map((a: AcudienteResponsable) => a.telefono || '');
        } else {
          Swal.fire('Advertencia', respuesta.message || 'El pago no se pudo registrar', 'warning');
        }
      },
      error: () => {
        this.registrando = false;
        Swal.fire('Error', 'Hubo un problema al registrar el pago', 'error');
      },
    });
  }

  private subirDocumento(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.archivo || !this.estudiante) { resolve(''); return; }
      const formData = new FormData();
      formData.append('archivo', this.archivo);
      formData.append('id_persona', this.estudiante.id_persona.toString());
      formData.append('codigo_tipo_documento', 'comprobante_pago');
      formData.append('observaciones', `Comprobante de pago - Ref: ${this.referencia_bancaria || 'N/A'}`);
      const idUsuario = this.utilService.obtenerIdUsuarioActual();
      if (idUsuario) formData.append('id_usuario_subio', idUsuario.toString());
      this.documentosService.subirDocumento(formData).subscribe({
        next: (response: any) => resolve(response.id || response.body?.id || 0),
        error: (error: any) => reject(error),
      });
    });
  }

  /** Deja la pantalla lista para el siguiente pago y recarga saldos. */
  nuevoPago(): void {
    this.resumen = null;
    this.archivo = null;
    this.datosIA = null;
    this.valor_comprobante = null;
    this.analizandoIA = false;
    this.id_tipo_pago = null;
    this.fecha = new Date().toISOString().split('T')[0];
    this.referencia_bancaria = '';
    this.referenciaVerificada = null;
    this.totalReferenciaBD = 0;
    this.valor_recibido = 0;
    this.valor_recibido_formateado = '';
    this.observaciones = '';
    this.telefonoAdicional = '';
    this.nombreAdicional = '';
    this.correoAdicional = '';
    this.eliminarArchivo();
    this.cambiarEstudiante();
    this.cargarDatos();
  }

  // ============================================
  // CONFIRMACION AL ACUDIENTE
  // ============================================

  /**
   * Arma el mensaje a partir de la plantilla.
   * canal 'whatsapp' usa el cuerpo con negrillas y emojis; 'correo' el de
   * texto plano. La linea de referencia se quita cuando el pago no la trae.
   */
  private armarMensajeConfirmacion(nombreDestinatario: string, canal: 'whatsapp' | 'correo'): string {
    const cuerpo = canal === 'whatsapp'
      ? this.plantillaConfirmacion.cuerpo_whatsapp
      : this.plantillaConfirmacion.cuerpo_correo;

    const plantillaReferencia = canal === 'whatsapp'
      ? this.plantillaConfirmacion.linea_referencia_whatsapp
      : this.plantillaConfirmacion.linea_referencia_correo;

    const lineaReferencia = this.referencia_bancaria
      ? (plantillaReferencia || '').replace(/\{referencia\}/g, this.referencia_bancaria)
      : '';

    let mensaje = cuerpo || '';
    mensaje = mensaje.replace(/\{nombre_destinatario\}/g, nombreDestinatario);
    mensaje = mensaje.replace(/\{nombre_colegio\}/g, this.nombreColegio);
    mensaje = mensaje.replace(/\{nombre_estudiante\}/g, this.estudiante?.nombre_estudiante || '');
    mensaje = mensaje.replace(/\{valor\}/g, '$' + this.formatearMoneda(this.resumen?.valor_registrado || this.valor_recibido));
    mensaje = mensaje.replace(/\{fecha\}/g, this.formatearFecha(this.fecha));

    /* Sin referencia se elimina la linea completa, con su salto, para no
       dejar un renglon vacio en la mitad del mensaje. */
    mensaje = lineaReferencia
      ? mensaje.replace(/\{linea_referencia\}/g, lineaReferencia)
      : mensaje.replace(/\{linea_referencia\}\n?/g, '');

    return mensaje;
  }

  private armarAsuntoConfirmacion(): string {
    let asunto = this.plantillaConfirmacion.asunto_correo || '';
    asunto = asunto.replace(/\{nombre_estudiante\}/g, this.estudiante?.nombre_estudiante || '');
    asunto = asunto.replace(/\{nombre_colegio\}/g, this.nombreColegio);
    return asunto;
  }

  abrirModalEnvio(): void {
    this.telefonoAdicional = '';
    this.nombreAdicional = '';
    this.correoAdicional = '';
    this.telefonosEditables = this.acudientes.map((a: AcudienteResponsable) => a.telefono || '');
    const modal = new (window as any).bootstrap.Modal(document.getElementById('modalEnvioSimple'));
    modal.show();
  }

  enviarWhatsAppAcudiente(acudiente: AcudienteResponsable, indice: number): void {
    const telefono = this.telefonosEditables[indice];
    if (!telefono) { Swal.fire('Atención', 'Ingrese un número de teléfono.', 'warning'); return; }
    const mensaje = this.armarMensajeConfirmacion(acudiente.nombre_acudiente, 'whatsapp');
    window.open(`https://wa.me/57${this.limpiarTelefono(telefono)}?text=${encodeURIComponent(mensaje)}`, '_blank');
  }

  enviarWhatsAppAdicional(): void {
    if (!this.telefonoAdicional) { Swal.fire('Atención', 'Ingrese un número de teléfono.', 'warning'); return; }
    const nombre = this.nombreAdicional.trim() || 'Señor(a) acudiente';
    const mensaje = this.armarMensajeConfirmacion(nombre, 'whatsapp');
    window.open(`https://wa.me/57${this.limpiarTelefono(this.telefonoAdicional)}?text=${encodeURIComponent(mensaje)}`, '_blank');
  }

  enviarCorreoAcudiente(acudiente: AcudienteResponsable): void {
    if (!acudiente.correo_electronico) {
      Swal.fire('Atención', 'Este acudiente no tiene correo electrónico registrado.', 'warning');
      return;
    }
    const asunto = this.armarAsuntoConfirmacion();
    const cuerpo = this.armarMensajeConfirmacion(acudiente.nombre_acudiente, 'correo');
    const url = `https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(acudiente.correo_electronico)}&su=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`;
    window.open(url, '_blank');
  }

  enviarCorreoAdicional(): void {
    if (!this.correoAdicional) { Swal.fire('Atención', 'Ingrese un correo electrónico.', 'warning'); return; }
    const nombre = this.nombreAdicional.trim() || 'Señor(a) acudiente';
    const asunto = this.armarAsuntoConfirmacion();
    const cuerpo = this.armarMensajeConfirmacion(nombre, 'correo');
    const url = `https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(this.correoAdicional)}&su=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`;
    window.open(url, '_blank');
  }

  // ============================================
  // COMPROBANTE PDF Y COMPARTIR
  // ============================================

  /** true cuando el dispositivo tiene el menu nativo de compartir. */
  get puedeCompartir(): boolean {
    return typeof navigator !== 'undefined' && !!(navigator as any).share;
  }

  /**
   * Abre el menu de compartir del dispositivo con el texto de confirmacion,
   * para mandarlo por WhatsApp, correo o lo que tenga instalado.
   * Si el navegador no lo soporta (escritorio viejo) cae al modal de siempre,
   * que envia por WhatsApp Web o Gmail.
   */
  async compartirConfirmacion(): Promise<void> {
    if (!this.puedeCompartir) { this.abrirModalEnvio(); return; }

    const acudiente = this.acudientes.find((a: AcudienteResponsable) => a.id_acudiente === this.id_acudiente);
    const nombreDestinatario = acudiente ? acudiente.nombre_acudiente : 'Señor(a) acudiente';
    const mensaje = this.armarMensajeConfirmacion(nombreDestinatario, 'whatsapp');

    try {
      await (navigator as any).share({ title: this.armarAsuntoConfirmacion(), text: mensaje });
    } catch (error: any) {
      // AbortError = el usuario cerro el menu de compartir, no es un fallo.
      if (error?.name !== 'AbortError') {
        console.error('Error al compartir la confirmación:', error);
        this.abrirModalEnvio();
      }
    }
  }

  /**
   * Comparte el recibo en PDF por el menu nativo. Si el dispositivo no permite
   * compartir archivos, lo descarga como siempre.
   */
  async compartirRecibo(): Promise<void> {
    if (!this.resumen?.id_pago) {
      Swal.fire('Error', 'No se encontró el ID del pago registrado.', 'error'); return;
    }

    this.descargandoPDF = true;
    try {
      const datosPDF = await this.armarDatosPDF();
      const blob = this.exportarPdfComprobanteService.generarBlob(datosPDF);
      const archivo = new File([blob], `Comprobante_Pago_${datosPDF.pago.id}.pdf`, { type: 'application/pdf' });

      const nav: any = navigator;
      if (this.puedeCompartir && nav.canShare && nav.canShare({ files: [archivo] })) {
        this.descargandoPDF = false;
        try {
          await nav.share({ files: [archivo], title: this.armarAsuntoConfirmacion() });
        } catch (error: any) {
          if (error?.name !== 'AbortError') console.error('Error al compartir el recibo:', error);
        }
        return;
      }

      // Sin soporte para compartir archivos: se descarga.
      this.exportarPdfComprobanteService.generarPDF(datosPDF);
      this.descargandoPDF = false;
    } catch (error: any) {
      console.error('Error al generar el recibo:', error);
      Swal.fire('Error', 'No se pudo generar el comprobante PDF.', 'error');
      this.descargandoPDF = false;
    }
  }

  /** Descarga directa del recibo (se usa desde el modal de envío). */
  async descargarComprobante(): Promise<void> {
    if (!this.resumen?.id_pago) {
      Swal.fire('Error', 'No se encontró el ID del pago registrado.', 'error'); return;
    }

    this.descargandoPDF = true;
    try {
      const datosPDF = await this.armarDatosPDF();
      this.exportarPdfComprobanteService.generarPDF(datosPDF);
      this.descargandoPDF = false;
    } catch (error: any) {
      console.error('Error al generar PDF:', error);
      Swal.fire('Error', 'No se pudieron obtener los datos del comprobante.', 'error');
      this.descargandoPDF = false;
    }
  }

  /* Trae del backend los datos del pago recien registrado y los deja listos
     para el servicio de PDF. Lo usan la descarga y el compartir. */
  private armarDatosPDF(): Promise<DatosComprobantePDF> {
    return new Promise((resolve, reject) => {
      this.pagosRecibidosService.obtenerDatosComprobante(this.resumen!.id_pago).subscribe({
        next: async (response: any) => {
          const datos = response.body;
          if (!datos || !datos.pago) { reject(new Error('Sin datos del comprobante')); return; }

          const logoBase64 = await this.cargarLogoBase64();
          resolve({
            pago: datos.pago,
            estudiante: datos.estudiante,
            acudiente: datos.acudiente,
            tipoPago: datos.tipoPago,
            fechaGeneracion: new Date(),
            logoBase64: logoBase64
          });
        },
        error: (error: any) => reject(error)
      });
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

  trackByEstudiante(index: number, est: EstudianteRapido): string {
    return est.id_estudiante;
  }
}