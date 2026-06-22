import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

import { HeaderComponent } from '../../../common/header/header.component';
import { CuentasPorCobrarService } from '../../../services/cuentas-por-cobrar.service';
import { GruposService } from '../../../services/grupos.service';
import { ExportarPdfCuentasService, DatosCuentasPDF } from '../../../services/exportar-pdf-cuentas.service';
import { InstitucionConfigService } from '../../../services/institucion-config.service';
import { HistorialRecordatoriosPagoService } from '../../../services/historial-recordatorios-pago.service';
import { TareasColaboradoresService } from '../../../services/tareas-colaboradores.service';
import { UtilService } from '../../../common/constantes/util.service';

interface EstudianteCartera {
  id_persona: string;
  id_estudiante: string;
  nombre_estudiante: string;
  numero_identificacion: string;
  grupo_estudiante: string;
  activo: number;
  totalCobrado: number;
  totalPagado: number;
  saldoTotal: number;
  saldoVencido: number;
  saldoPendiente: number;
  valoresMensuales: { [key: string]: any };
  totalSaldoPendiente: number;
  acudientes: AcudientePago[];
  ultimo_recordatorio: string | null;
}

interface AcudientePago {
  id_persona: string;
  id_estudiante: string;
  nombre_estudiante: string;
  id_acudiente: string;
  id_tipo_acudiente: number;
  nombre_tipo_acudiente: string;
  id_persona_acudiente: string;
  nombre_acudiente: string;
  telefono: string;
  correo_electronico: string;
}

@Component({
  selector: 'app-recordatorio-pagos',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent],
  templateUrl: './recordatorio-pagos.component.html',
  styleUrl: './recordatorio-pagos.component.scss'
})
export class RecordatorioPagosComponent implements OnInit, OnDestroy {
  titulo = "Recordatorio de Pagos";

  public cargando: boolean = false;
  public datosDisponibles: boolean = false;
  private subscriptions: Subscription[] = [];

  // Filtros
  public anioSeleccionado: number = new Date().getFullYear();
  public aniosDisponibles: number[] = [];
  public grupoSeleccionado: string = '';
  public busquedaEstudiante: string = '';
  public mostrarSoloConSaldo: boolean = true;

  // Datos
  public grupos: any[] = [];
  public estudiantes: EstudianteCartera[] = [];
  public estudiantesFiltrados: EstudianteCartera[] = [];
  public acudientesPago: AcudientePago[] = [];

  // Ordenamiento
  public columnaOrdenamiento: string = 'totalSaldoPendiente';
  public ordenAscendente: boolean = false;

  // Meses
  public mesesDisponibles = [
    { valor: 1, nombre: 'Enero' },
    { valor: 2, nombre: 'Febrero' },
    { valor: 3, nombre: 'Marzo' },
    { valor: 4, nombre: 'Abril' },
    { valor: 5, nombre: 'Mayo' },
    { valor: 6, nombre: 'Junio' },
    { valor: 7, nombre: 'Julio' },
    { valor: 8, nombre: 'Agosto' },
    { valor: 9, nombre: 'Septiembre' },
    { valor: 10, nombre: 'Octubre' },
    { valor: 11, nombre: 'Noviembre' },
    { valor: 12, nombre: 'Diciembre' }
  ];

  // Modal detalle
  public estudianteSeleccionado: EstudianteCartera | null = null;

  // Tipo de mensaje: 'vencido' | 'seleccion' | 'todos'
  public tipoMensajeSeleccionado: string = 'vencido';
  public mesesSeleccionados: { [key: string]: boolean } = {};
  public telefonosEditables: string[] = [];
  public telefonoAdicional: string = '';
  public nombreAdicional: string = '';
  public correoAdicional: string = '';
  public mostrarDetalleMeses: boolean = false;

  // Mensaje editable
  public mensajeEditable: string = '';

  // Opciones de mensaje
  public tratoCercano: boolean = false;
  public solicitarReunionPresencial: boolean = false;
  public solicitarReunionVirtual: boolean = false;
  public solicitarFechaCompromiso: boolean = false;

  // Nombre del colegio dinámico
  private get nombreColegio(): string {
    return this.institucionConfigService.getNombreInstitucion() || 'La institución';
  }

  // PDF
  public descargandoPDF: boolean = false;

  // Modal historial con compromisos
  public estudianteHistorial: EstudianteCartera | null = null;
  public historialPago: any[] = [];
  public cargandoHistorial: boolean = false;

  constructor(
    private cuentasPorCobrarService: CuentasPorCobrarService,
    private gruposService: GruposService,
    private exportarPdfCuentasService: ExportarPdfCuentasService,
    private institucionConfigService: InstitucionConfigService,
    private historialRecordatoriosService: HistorialRecordatoriosPagoService,
    private tareasColaboradoresService: TareasColaboradoresService,
    private utilService: UtilService
  ) { }

  ngOnInit(): void {
    this.inicializarAnios();
    this.cargarGrupos();
    this.cargarDatos();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  inicializarAnios(): void {
    const anioActual = new Date().getFullYear();
    const anioInicial = 2024;
    this.aniosDisponibles = [];
    for (let anio = anioInicial; anio <= anioActual; anio++) {
      this.aniosDisponibles.push(anio);
    }
    this.anioSeleccionado = anioActual;
  }

  cargarGrupos(): void {
    const sub = this.gruposService.obtenerTodos().subscribe({
      next: (response: any) => {
        this.grupos = response.body || [];
      },
      error: (error) => {
        console.error('Error al cargar grupos:', error);
      }
    });
    this.subscriptions.push(sub);
  }

  cargarDatos(): void {
    this.cargando = true;
    this.datosDisponibles = false;

    const sub = this.cuentasPorCobrarService.obtenerReporteCarteraEstudiantes(this.anioSeleccionado).subscribe({
      next: (response: any) => {
        const data = response.body;
        if (data && data.reporte_estudiantes && data.reporte_valores) {
          this.procesarDatos(data);
          this.datosDisponibles = true;
        }
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error al cargar datos:', error);
        this.cargando = false;
        this.datosDisponibles = false;
      }
    });
    this.subscriptions.push(sub);
  }

  procesarDatos(data: any): void {
    const estudiantesMap = new Map<string, EstudianteCartera>();

    // Inicializar estudiantes
    data.reporte_estudiantes.forEach((est: any) => {
      estudiantesMap.set(est.id_persona, {
        id_persona: est.id_persona,
        id_estudiante: est.id_estudiante,
        nombre_estudiante: est.nombre_estudiante,
        numero_identificacion: est.numero_identificacion,
        grupo_estudiante: est.grupo_estudiante || 'Sin grupo',
        activo: est.activo ?? 1,
        totalCobrado: 0,
        totalPagado: 0,
        saldoTotal: 0,
        saldoVencido: 0,
        saldoPendiente: 0,
        valoresMensuales: {},
        totalSaldoPendiente: 0,
        acudientes: [],
        ultimo_recordatorio: est.ultimo_recordatorio || null
      });
    });

    // Procesar valores
    data.reporte_valores.forEach((valor: any) => {
      const estudiante = estudiantesMap.get(valor.id_persona);
      if (!estudiante) return;

      switch (valor.tipo_valor) {
        case 'Total Cobrado':
          estudiante.totalCobrado = parseFloat(valor.valor) || 0;
          break;
        case 'Total Pagado':
          estudiante.totalPagado = parseFloat(valor.valor) || 0;
          break;
        case 'Saldo Total':
          estudiante.saldoTotal = parseFloat(valor.valor) || 0;
          break;
        case 'Saldo Vencido':
          estudiante.saldoVencido = parseFloat(valor.valor) || 0;
          break;
        case 'Saldo Pendiente':
          estudiante.saldoPendiente = parseFloat(valor.valor) || 0;
          break;
        default:
          // Valores mensuales
          if (valor.mes !== null) {
            if (!estudiante.valoresMensuales[valor.mes]) {
              estudiante.valoresMensuales[valor.mes] = {};
            }
            estudiante.valoresMensuales[valor.mes][valor.tipo_valor] = parseFloat(valor.valor) || 0;
          }
          break;
      }
    });

    // Calcular totalSaldoPendiente por estudiante
    estudiantesMap.forEach(est => {
      est.totalSaldoPendiente = this.calcularTotalSaldoPendiente(est);
    });

    // Procesar acudientes
    this.acudientesPago = data.acudientes_pago || [];

    // Asignar acudientes a estudiantes
    this.acudientesPago.forEach(acu => {
      const estudiante = estudiantesMap.get(acu.id_persona);
      if (estudiante) {
        estudiante.acudientes.push(acu);
      }
    });

    this.estudiantes = Array.from(estudiantesMap.values());
    this.aplicarFiltros();
  }

  calcularTotalSaldoPendiente(estudiante: EstudianteCartera): number {
    let total = 0;
    for (let mes = 1; mes <= 12; mes++) {
      total += this.getSaldoPendienteMes(estudiante, mes);
    }
    return total;
  }

  getSaldoPendienteMes(estudiante: EstudianteCartera, mes: number): number {
    const valoresMes = estudiante.valoresMensuales[mes];
    if (!valoresMes) return 0;
    const nombreMes = this.mesesDisponibles[mes - 1].nombre;
    const saldo = valoresMes[`Saldo ${nombreMes}`] || 0;
    return saldo > 0 ? saldo : 0;
  }

  aplicarFiltros(): void {
    let filtrados = [...this.estudiantes];

    // Solo activos
    filtrados = filtrados.filter(est => est.activo === 1);

    // Filtrar por grupo
    if (this.grupoSeleccionado) {
      const grupoSel = this.grupos.find(g => g.id.toString() === this.grupoSeleccionado);
      if (grupoSel) {
        filtrados = filtrados.filter(est => est.grupo_estudiante === grupoSel.nombre);
      }
    }

    // Filtrar por búsqueda
    if (this.busquedaEstudiante) {
      const busqueda = this.busquedaEstudiante.toLowerCase();
      filtrados = filtrados.filter(est =>
        est.nombre_estudiante.toLowerCase().includes(busqueda)
      );
    }

    // Solo con saldo
    if (this.mostrarSoloConSaldo) {
      filtrados = filtrados.filter(est => est.totalSaldoPendiente > 0);
    }

    this.estudiantesFiltrados = filtrados;
    this.aplicarOrdenamiento();
  }

  aplicarOrdenamiento(): void {
    const multiplicador = this.ordenAscendente ? 1 : -1;
    this.estudiantesFiltrados.sort((a, b) => {
      let valorA: any;
      let valorB: any;

      if (this.columnaOrdenamiento === 'totalSaldoPendiente') {
        valorA = a.totalSaldoPendiente || 0;
        valorB = b.totalSaldoPendiente || 0;
      } else {
        valorA = a[this.columnaOrdenamiento as keyof EstudianteCartera];
        valorB = b[this.columnaOrdenamiento as keyof EstudianteCartera];
      }

      if (typeof valorA === 'string') {
        valorA = valorA.toLowerCase();
        valorB = (valorB as string).toLowerCase();
      }

      if (valorA < valorB) return -1 * multiplicador;
      if (valorA > valorB) return 1 * multiplicador;
      return 0;
    });
  }

  ordenarPor(columna: string): void {
    if (this.columnaOrdenamiento === columna) {
      this.ordenAscendente = !this.ordenAscendente;
    } else {
      this.columnaOrdenamiento = columna;
      this.ordenAscendente = columna === 'nombre_estudiante' || columna === 'grupo_estudiante';
    }
    this.aplicarOrdenamiento();
  }

  cambiarAnio(): void {
    this.cargarDatos();
  }

  buscarEstudiante(): void {
    this.aplicarFiltros();
  }

  resetearFiltros(): void {
    this.grupoSeleccionado = '';
    this.busquedaEstudiante = '';
    this.mostrarSoloConSaldo = true;
    this.aplicarFiltros();
  }

  // Abrir modal de detalle con acudientes
  verDetalle(estudiante: EstudianteCartera): void {
    this.estudianteSeleccionado = estudiante;
    this.tipoMensajeSeleccionado = 'vencido';
    this.telefonoAdicional = '';
    this.nombreAdicional = '';
    this.correoAdicional = '';
    this.mostrarDetalleMeses = false;
    this.tratoCercano = false;
    this.solicitarReunionPresencial = false;
    this.solicitarReunionVirtual = false;
    this.solicitarFechaCompromiso = false;

    this.telefonosEditables = estudiante.acudientes.map(a => a.telefono || '');

    this.mesesSeleccionados = {};
    this.mesesDisponibles.forEach(mes => {
      if (this.getSaldoPendienteMes(estudiante, mes.valor) > 0) {
        this.mesesSeleccionados[mes.valor] = true;
      }
    });

    this.regenerarMensajePago();

    const modal = new (window as any).bootstrap.Modal(document.getElementById('modalRecordatorio'));
    modal.show();
  }

  // Cambio de tipo de mensaje
  onTipoMensajeCambio(): void {
    if (this.tipoMensajeSeleccionado === 'todos' || this.tipoMensajeSeleccionado === 'seleccion') {
      this.mesesDisponibles.forEach(mes => {
        if (this.estudianteSeleccionado && this.getSaldoPendienteMes(this.estudianteSeleccionado, mes.valor) > 0) {
          this.mesesSeleccionados[mes.valor] = true;
        }
      });
    }
    this.regenerarMensajePago();
  }

  // Toggle un mes individual
  toggleMes(mes: number): void {
    this.mesesSeleccionados[mes] = !this.mesesSeleccionados[mes];
    this.regenerarMensajePago();
  }

  // Toggle todos los meses
  toggleTodosLosMeses(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (!this.estudianteSeleccionado) return;
    this.mesesDisponibles.forEach(mes => {
      if (this.getSaldoPendienteMes(this.estudianteSeleccionado!, mes.valor) > 0) {
        this.mesesSeleccionados[mes.valor] = checked;
      }
    });
    this.regenerarMensajePago();
  }

  // Verificar si todos los meses están seleccionados
  todosLosMesesSeleccionados(): boolean {
    if (!this.estudianteSeleccionado) return false;
    return this.mesesDisponibles
      .filter(mes => this.getSaldoPendienteMes(this.estudianteSeleccionado!, mes.valor) > 0)
      .every(mes => this.mesesSeleccionados[mes.valor]);
  }

  // Total de meses seleccionados
  getTotalMesesSeleccionados(): number {
    if (!this.estudianteSeleccionado) return 0;
    let total = 0;
    this.mesesDisponibles.forEach(mes => {
      if (this.mesesSeleccionados[mes.valor]) {
        total += this.getSaldoPendienteMes(this.estudianteSeleccionado!, mes.valor);
      }
    });
    return total;
  }

  // ==================== CONSTRUCCIÓN DE MENSAJE ====================

  regenerarMensajePago(): void {
    if (!this.estudianteSeleccionado) return;
    this.mensajeEditable = this.construirMensajePago(this.estudianteSeleccionado);
  }

  private construirMensajePago(estudiante: EstudianteCartera): string {
    const tu = this.tratoCercano;
    let msg = '';

    msg += tu
      ? `Hola {NOMBRE_DESTINATARIO},\n\n`
      : `Cordial saludo {NOMBRE_DESTINATARIO},\n\n`;

    msg += tu
      ? `Te escribimos desde *${this.nombreColegio}* con relación al estado de cuenta del estudiante *${estudiante.nombre_estudiante}*.\n\n`
      : `Le escribimos desde *${this.nombreColegio}* con relación al estado de cuenta del estudiante *${estudiante.nombre_estudiante}*.\n\n`;

    if (this.tipoMensajeSeleccionado === 'vencido') {
      msg += `*Saldo vencido: ${this.formatearMoneda(estudiante.saldoVencido)}*\n\n`;
    } else {
      let mesesIncluir: number[] = [];

      if (this.tipoMensajeSeleccionado === 'todos') {
        this.mesesDisponibles.forEach(mes => {
          if (this.getSaldoPendienteMes(estudiante, mes.valor) > 0) {
            mesesIncluir.push(mes.valor);
          }
        });
      } else {
        this.mesesDisponibles.forEach(mes => {
          if (this.mesesSeleccionados[mes.valor] && this.getSaldoPendienteMes(estudiante, mes.valor) > 0) {
            mesesIncluir.push(mes.valor);
          }
        });
      }

      if (mesesIncluir.length > 0) {
        msg += `*Detalle de saldos pendientes:*\n`;
        let totalIncluido = 0;
        mesesIncluir.forEach(mesValor => {
          const mes = this.mesesDisponibles.find(m => m.valor === mesValor);
          if (mes) {
            const saldo = this.getSaldoPendienteMes(estudiante, mesValor);
            msg += `- ${mes.nombre}: ${this.formatearMoneda(saldo)}\n`;
            totalIncluido += saldo;
          }
        });
        msg += `\n*Total pendiente: ${this.formatearMoneda(totalIncluido)}*\n`;
      }

      if (estudiante.saldoVencido > 0) {
        msg += `*Saldo vencido: ${this.formatearMoneda(estudiante.saldoVencido)}*\n`;
      }
      msg += '\n';
    }

    msg += tu
      ? `Te invitamos a ponerte al día con este compromiso. Si ya realizaste el pago, haz caso omiso de este mensaje.\n\n`
      : `Le invitamos a ponerse al día con este compromiso. Si ya realizó el pago, haga caso omiso de este mensaje.\n\n`;

    // Reunión
    if (this.solicitarReunionPresencial && this.solicitarReunionVirtual) {
      msg += tu
        ? `Nos gustaría agendar una reunión (presencial o virtual) para tratar este tema. Por favor indícanos tu disponibilidad.\n\n`
        : `Nos gustaría agendar una reunión (presencial o virtual) para tratar este tema. Por favor indíquenos su disponibilidad.\n\n`;
    } else if (this.solicitarReunionPresencial) {
      msg += tu
        ? `Nos gustaría agendar una reunión presencial. Por favor indícanos tu disponibilidad.\n\n`
        : `Nos gustaría agendar una reunión presencial. Por favor indíquenos su disponibilidad.\n\n`;
    } else if (this.solicitarReunionVirtual) {
      msg += tu
        ? `Nos gustaría agendar una reunión virtual. Por favor indícanos tu disponibilidad.\n\n`
        : `Nos gustaría agendar una reunión virtual. Por favor indíquenos su disponibilidad.\n\n`;
    }

    // Fecha compromiso
    if (this.solicitarFechaCompromiso) {
      msg += tu
        ? `Te agradecemos indicarnos una fecha en la que puedas cumplir con este compromiso.\n\n`
        : `Le agradecemos indicarnos una fecha en la que pueda cumplir con este compromiso.\n\n`;
    }

    msg += tu
      ? `Quedamos atentos. Gracias por tu confianza.\n`
      : `Quedamos atentos. Gracias por su confianza.\n`;
    msg += `${this.nombreColegio}`;

    return msg;
  }

  private getMensajeParaEnvio(nombreDestinatario: string): string {
    return this.mensajeEditable.replace(/\{NOMBRE_DESTINATARIO\}/g, nombreDestinatario);
  }

  private getMensajeCorreo(nombreDestinatario: string): string {
    return this.getMensajeParaEnvio(nombreDestinatario).replace(/\*/g, '');
  }
  // Abrir WhatsApp con mensaje (acudiente registrado)
  enviarWhatsApp(estudiante: EstudianteCartera, acudiente: AcudientePago, indice: number): void {
    const telefono = this.telefonosEditables[indice];
    if (!telefono) { alert('Ingrese un número de teléfono para enviar el recordatorio.'); return; }

    const mensaje = this.getMensajeParaEnvio(acudiente.nombre_acudiente);
    const telefonoLimpio = this.limpiarTelefono(telefono);
    const monto = this.calcularMontoNotificado(estudiante);

    this.guardarHistorialSilencioso(estudiante, acudiente.id_persona_acudiente, telefonoLimpio, acudiente.nombre_acudiente, monto);
    window.open(`https://wa.me/57${telefonoLimpio}?text=${encodeURIComponent(mensaje)}`, '_blank');
  }

  // Enviar a teléfono adicional
  enviarWhatsAppTelefonoAdicional(estudiante: EstudianteCartera): void {
    if (!this.telefonoAdicional) { alert('Ingrese un número de teléfono.'); return; }

    const nombre = this.nombreAdicional.trim() || 'Señor(a) acudiente';
    const mensaje = this.getMensajeParaEnvio(nombre);
    const telefonoLimpio = this.limpiarTelefono(this.telefonoAdicional);
    const monto = this.calcularMontoNotificado(estudiante);

    this.guardarHistorialSilencioso(estudiante, null, telefonoLimpio, nombre, monto);
    window.open(`https://wa.me/57${telefonoLimpio}?text=${encodeURIComponent(mensaje)}`, '_blank');
  }

  // Enviar correo a acudiente registrado
  enviarCorreo(estudiante: EstudianteCartera, acudiente: AcudientePago): void {
    if (!acudiente.correo_electronico) { alert('El acudiente no tiene correo electrónico registrado.'); return; }

    const asunto = `Recordatorio de pago - ${estudiante.nombre_estudiante} - ${this.nombreColegio}`;
    const cuerpo = this.getMensajeCorreo(acudiente.nombre_acudiente);
    const monto = this.calcularMontoNotificado(estudiante);

    this.guardarHistorialSilencioso(estudiante, acudiente.id_persona_acudiente, acudiente.correo_electronico, acudiente.nombre_acudiente, monto);
    window.open(`https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(acudiente.correo_electronico)}&su=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`, '_blank');
  }

  // Enviar correo a contacto adicional
  enviarCorreoAdicional(estudiante: EstudianteCartera): void {
    if (!this.correoAdicional) { alert('Ingrese un correo electrónico.'); return; }

    const nombre = this.nombreAdicional.trim() || 'Señor(a) acudiente';
    const asunto = `Recordatorio de pago - ${estudiante.nombre_estudiante} - ${this.nombreColegio}`;
    const cuerpo = this.getMensajeCorreo(nombre);
    const monto = this.calcularMontoNotificado(estudiante);

    this.guardarHistorialSilencioso(estudiante, null, this.correoAdicional, nombre, monto);
    window.open(`https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(this.correoAdicional)}&su=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`, '_blank');
  }

  // Calcular monto notificado según tipo de mensaje
  private calcularMontoNotificado(estudiante: EstudianteCartera): number {
    if (this.tipoMensajeSeleccionado === 'vencido') {
      return estudiante.saldoVencido;
    } else if (this.tipoMensajeSeleccionado === 'seleccion') {
      return this.getTotalMesesSeleccionados();
    }
    return estudiante.totalSaldoPendiente;
  }

  // Guardar historial de forma silenciosa (sin spinner)
  private guardarHistorialSilencioso(
    estudiante: EstudianteCartera,
    idPersonaAcudiente: string | null,
    telefono: string,
    nombreDestinatario: string,
    monto: number
  ): void {
    const idUsuario = this.utilService.obtenerIdUsuarioActual();
    const idColaborador = this.utilService.obtenerIdColaboradorActual();

    const registro = {
      id_estudiante: estudiante.id_estudiante,
      id_persona_acudiente: idPersonaAcudiente,
      telefono_usado: telefono,
      nombre_destinatario: nombreDestinatario,
      tipo_recordatorio: this.tipoMensajeSeleccionado,
      monto_notificado: monto,
      id_usuario: idUsuario
    };

    this.historialRecordatoriosService.crear(registro).subscribe({
      next: (response: any) => {
        estudiante.ultimo_recordatorio = new Date().toISOString();

        // Crear tarea automáticamente
        if (idColaborador) {
          const descripcion = `Seguimiento cobro (${this.tipoMensajeSeleccionado}) - ${estudiante.nombre_estudiante} - ${this.formatearMoneda(monto)} - Enviado a: ${nombreDestinatario}`;
          const tarea: any = {
            id_colaborador: idColaborador,
            id_estudiante: estudiante.id_estudiante,
            descripcion: descripcion,
            origen: 'recordatorio_pago',
            id_historial_origen: response.id || null,
            id_usuario_registro: idUsuario
          };
          this.tareasColaboradoresService.crear(tarea).subscribe({
            error: (err) => { console.error('Error al crear tarea:', err); }
          });
        }
      },
      error: (error) => {
        console.error('Error al guardar historial de recordatorio:', error);
      }
    });
  }

  // ==================== MODAL HISTORIAL CON COMPROMISOS ====================

  verHistorialPago(estudiante: EstudianteCartera): void {
    this.estudianteHistorial = estudiante;
    this.historialPago = [];
    this.cargandoHistorial = true;

    const sub = this.historialRecordatoriosService.obtenerPorEstudiante(estudiante.id_estudiante).subscribe({
      next: (response: any) => {
        this.historialPago = (response.body || []).map((h: any) => ({
          ...h,
          editando: false,
          compromiso_editado: h.compromiso || '',
          fecha_compromiso_editada: h.fecha_compromiso || ''
        }));
        this.cargandoHistorial = false;
      },
      error: (error) => { console.error('Error al cargar historial:', error); this.cargandoHistorial = false; }
    });
    this.subscriptions.push(sub);

    const modal = new (window as any).bootstrap.Modal(document.getElementById('modalHistorialPago'));
    modal.show();
  }

  editarCompromisoPago(registro: any): void {
    registro.editando = true;
    registro.compromiso_editado = registro.compromiso || '';
    registro.fecha_compromiso_editada = registro.fecha_compromiso || '';
  }

  cancelarEdicionPago(registro: any): void {
    registro.editando = false;
  }

  guardarCompromisoPago(registro: any): void {
    const datos = {
      id: registro.id,
      compromiso: registro.compromiso_editado?.trim() || null,
      fecha_compromiso: registro.fecha_compromiso_editada || null
    };

    this.historialRecordatoriosService.actualizar(datos).subscribe({
      next: () => {
        registro.compromiso = datos.compromiso;
        registro.fecha_compromiso = datos.fecha_compromiso;
        registro.editando = false;
      },
      error: (error) => { console.error('Error al guardar compromiso:', error); alert('Error al guardar el compromiso.'); }
    });
  }

  getTipoRecordatorioLabel(tipo: string): string {
    switch (tipo) {
      case 'vencido': return 'Vencido';
      case 'seleccion': return 'Meses';
      case 'todos': return 'Todos';
      default: return tipo;
    }
  }

  // Limpiar teléfono (quitar espacios, guiones, etc.)
  limpiarTelefono(telefono: string): string {
    return telefono.replace(/[\s\-\(\)\+]/g, '').replace(/^57/, '');
  }

  // Formatear moneda
  formatearMoneda(valor: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      currencyDisplay: 'narrowSymbol'
    }).format(valor);
  }

  // Totales para el resumen
  getTotalSaldoPendiente(): number {
    return this.estudiantesFiltrados.reduce((total, est) => total + (est.totalSaldoPendiente || 0), 0);
  }

  getTotalSaldoVencido(): number {
    return this.estudiantesFiltrados.reduce((total, est) => total + (est.saldoVencido || 0), 0);
  }

  getEstudiantesConSaldo(): number {
    return this.estudiantesFiltrados.filter(est => est.totalSaldoPendiente > 0).length;
  }

  getEstudiantesSinTelefono(): number {
    return this.estudiantesFiltrados.filter(est =>
      est.totalSaldoPendiente > 0 && est.acudientes.every(a => !a.telefono)
    ).length;
  }

  getTotalSaldoPendienteMes(mes: number): number {
    return this.estudiantesFiltrados.reduce((total, est) => {
      return total + this.getSaldoPendienteMes(est, mes);
    }, 0);
  }

  tieneTelefono(estudiante: EstudianteCartera): boolean {
    return estudiante.acudientes.length > 0 && estudiante.acudientes.some(a => !!a.telefono);
  }

  sinTelefono(estudiante: EstudianteCartera): boolean {
    return estudiante.acudientes.length > 0 && estudiante.acudientes.every(a => !a.telefono);
  }

  getBadgeClass(estudiante: EstudianteCartera): string {
    if (estudiante.acudientes.length === 0) return 'bg-danger';
    if (this.tieneTelefono(estudiante)) return 'bg-success';
    return 'bg-warning text-dark';
  }

  getIconoClass(estudiante: EstudianteCartera): string {
    if (estudiante.acudientes.length === 0) return 'fa-times';
    if (this.tieneTelefono(estudiante)) return 'fa-check';
    return 'fa-exclamation-triangle';
  }

  async descargarEstadoCuenta(estudiante: EstudianteCartera): Promise<void> {
    this.descargandoPDF = true;

    try {
      const logoBase64 = await this.cargarLogoBase64();
      const anioAcademico = this.institucionConfigService.getAnioAcademicoActual();

      this.cuentasPorCobrarService.obtenerTodosXPersona(estudiante.id_persona).subscribe({
        next: (response: any) => {
          const body = response.body as any[];
          const fechaActual = new Date();

          let totalCobrado = 0;
          let totalPagado = 0;
          let totalSaldo = 0;
          let totalSaldoVencido = 0;

          // Procesar todos los movimientos
          const todosMovimientos = body.map((item: any) => {
            const fechaItem = new Date(item.fecha);
            const vencido = fechaActual > fechaItem && item.saldo > 0;
            const mesMovimiento = fechaItem.getMonth() + 1;
            const anioMovimiento = fechaItem.getFullYear();

            totalCobrado += Number(item.valor) || 0;
            totalPagado += Number(item.valor_pagado) || 0;
            totalSaldo += Number(item.saldo) || 0;
            if (vencido) {
              totalSaldoVencido += Number(item.saldo) || 0;
            }

            return {
              ...item,
              vencido: vencido,
              mesMovimiento: mesMovimiento,
              anioMovimiento: anioMovimiento,
              saldoNumerico: Number(item.saldo) || 0,
              valorNumerico: Number(item.valor) || 0,
              valorPagadoNumerico: Number(item.valor_pagado) || 0
            };
          });

          // Filtrar según el tipo de recordatorio seleccionado
          let movimientosFiltrados: any[];

          if (this.tipoMensajeSeleccionado === 'vencido') {
            // Solo movimientos vencidos (fecha pasada y con saldo > 0)
            movimientosFiltrados = todosMovimientos.filter((item: any) => item.vencido && item.saldoNumerico > 0);
          } else if (this.tipoMensajeSeleccionado === 'seleccion') {
            // Solo meses seleccionados del año del reporte
            const mesesActivos = Object.keys(this.mesesSeleccionados)
              .filter(k => this.mesesSeleccionados[Number(k)])
              .map(Number);
            movimientosFiltrados = todosMovimientos.filter((item: any) =>
              mesesActivos.includes(item.mesMovimiento) && item.anioMovimiento === this.anioSeleccionado
            );
          } else {
            // Todos los movimientos
            movimientosFiltrados = todosMovimientos;
          }

          // Separar por año
          const movimientosAnioActual = movimientosFiltrados
            .filter((item: any) => item.anioMovimiento === anioAcademico)
            .map((item: any, i: number) => ({
              id: String(i + 1),
              fecha: this.formatearFechaPDF(item.fecha),
              concepto: item.nombre_producto_servicio || '-',
              valorTotal: item.valorNumerico,
              valorPagado: item.valorPagadoNumerico,
              saldo: item.saldoNumerico,
              estado: item.saldoNumerico <= 0 ? 'Pagado' : (item.vencido ? 'Vencido' : 'Pendiente')
            }));

          const movimientosHistoricosPendientes = movimientosFiltrados
            .filter((item: any) => item.anioMovimiento < anioAcademico && item.saldoNumerico > 0)
            .map((item: any, i: number) => ({
              id: String(i + 1),
              fecha: this.formatearFechaPDF(item.fecha),
              concepto: item.nombre_producto_servicio || '-',
              valorTotal: item.valorNumerico,
              valorPagado: item.valorPagadoNumerico,
              saldo: item.saldoNumerico,
              estado: item.saldoNumerico <= 0 ? 'Pagado' : (item.vencido ? 'Vencido' : 'Pendiente')
            }));

          // Recalcular totales según filtro
          const totalSaldoFiltrado = movimientosFiltrados.reduce((sum: number, item: any) => sum + item.saldoNumerico, 0);
          const totalPagadoFiltrado = movimientosFiltrados.reduce((sum: number, item: any) => sum + item.valorPagadoNumerico, 0);
          const totalVencidoFiltrado = movimientosFiltrados.filter((item: any) => item.vencido).reduce((sum: number, item: any) => sum + item.saldoNumerico, 0);

          const datosPDF: DatosCuentasPDF = {
            nombreEstudiante: estudiante.nombre_estudiante,
            numeroIdentificacion: estudiante.numero_identificacion,
            nombreGrupo: estudiante.grupo_estudiante,
            logoBase64: logoBase64,
            anioAcademico: anioAcademico,
            resumenFinanciero: {
              saldoPendiente: this.tipoMensajeSeleccionado === 'todos' ? totalSaldo : totalSaldoFiltrado,
              valorPagado: this.tipoMensajeSeleccionado === 'todos' ? totalPagado : totalPagadoFiltrado,
              saldoVencido: this.tipoMensajeSeleccionado === 'todos' ? totalSaldoVencido : totalVencidoFiltrado,
              estado: (this.tipoMensajeSeleccionado === 'todos' ? totalSaldo : totalSaldoFiltrado) <= 0 ? 'AL DÍA' : 'PENDIENTE'
            },
            tabActiva: 'movimientos',
            movimientos: movimientosAnioActual.length > 0 ? movimientosAnioActual : undefined,
            movimientosHistoricosPendientes: movimientosHistoricosPendientes.length > 0 ? movimientosHistoricosPendientes : undefined,
            filtrosAplicados: {
              descripciones: this.generarDescripcionesFiltrosPDF()
            }
          };

          this.exportarPdfCuentasService.generarPDF(datosPDF);
          this.descargandoPDF = false;
        },
        error: (error: any) => {
          console.error('Error al obtener datos para PDF:', error);
          alert('Error al generar el estado de cuenta. Intente nuevamente.');
          this.descargandoPDF = false;
        }
      });
    } catch (error) {
      console.error('Error al generar PDF:', error);
      alert('Error al generar el estado de cuenta. Intente nuevamente.');
      this.descargandoPDF = false;
    }
  }

  // Genera descripciones legibles del filtro aplicado para el PDF
  private generarDescripcionesFiltrosPDF(): string[] {
    const descripciones: string[] = [];

    if (this.tipoMensajeSeleccionado === 'vencido') {
      descripciones.push('Solo movimientos vencidos');
    } else if (this.tipoMensajeSeleccionado === 'seleccion') {
      const mesesActivos = this.mesesDisponibles
        .filter(mes => this.mesesSeleccionados[mes.valor])
        .map(mes => mes.nombre);
      if (mesesActivos.length > 0) {
        descripciones.push(`Meses seleccionados: ${mesesActivos.join(', ')}`);
      }
    } else {
      descripciones.push('Todos los movimientos');
    }

    return descripciones;
  }

  private async cargarLogoBase64(): Promise<string> {
    try {
      const logoUrl = this.institucionConfigService.getLogoUrl();
      const response = await fetch(logoUrl);
      const blob = await response.blob();

      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve(reader.result as string);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Error al cargar el logo:', error);
      return '';
    }
  }

  private formatearFechaPDF(fecha: string): string {
    try {
      const [year, month, day] = fecha.substring(0, 10).split('-');
      return `${day}/${month}/${year}`;
    } catch (error) {
      return fecha;
    }
  }
}