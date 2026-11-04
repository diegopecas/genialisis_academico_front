// ========== ver-solicitud-inscripcion.component.ts ==========
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HeaderComponent } from '../../../../common/header/header.component';
import { SearchableDropdownComponent, DropdownItem } from '../../../../common/searchable-dropdown/searchable-dropdown.component';
import { FechaInputComponent } from '../../../../common/fecha-input/fecha-input.component';
import { SolicitudesInscripcionPublicaService } from '../../../../services/solicitudes-inscripcion-publica.service';
import { LinksPagoService } from '../../../../services/links-pago.service';
import { PlanesPagoService } from '../../../../services/planes-pago.service';
import { CursosExtraService } from '../../../../services/cursos-extra.service';
import { TarifasCursosExtraService } from '../../../../services/tarifas-cursos-extra.service';
import { ExportarPdfDatosPagoService, DatosPagoPDF } from '../../../../services/exportar-pdf-datos-pago.service';
import { InstitucionConfigService } from '../../../../services/institucion-config.service';
import SwalBase from 'sweetalert2';

// Alertas con el boton de confirmar en dorado (el de la libreria es morado).
// Los que ponen su propio color (rechazar en rojo) lo conservan.
const Swal = SwalBase.mixin({ confirmButtonColor: '#d4af37' });

/** Plan de cuotas de una línea de la tarifa, mientras se arma en la aprobación */
interface PlanCuotas {
  numero: number;
  periodicidad: 'mensual' | 'fechas';
  tipoRecargo: 'ninguno' | 'porcentaje' | 'valor';
  porcentaje: number | null;
  // Solo con recargo por valor total: el total que se escribió
  valorTotal: number;
  cuotas: { numero: number, fecha: string, valor: number }[];
}

@Component({
  selector: 'app-ver-solicitud-inscripcion',
  templateUrl: './ver-solicitud-inscripcion.component.html',
  styleUrl: './ver-solicitud-inscripcion.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, SearchableDropdownComponent, FechaInputComponent]
})
export class VerSolicitudInscripcionComponent implements OnInit {

  public titulo = 'Solicitud de Inscripción';
  public regresar = '/operaciones/solicitudes-inscripcion';
  public id: string = '';
  public cargando: boolean = true;
  public procesando: boolean = false;
  public solicitud: any = null;
  // Lo que llego del portal web (datos_portal), ya convertido de JSON
  public datosPortal: any = null;

  // Horarios del curso con su ocupación. Los marcados quedan como reservas
  // fijas al aprobar. En los cursos con reserva automática no se marcan.
  public horarios: any[] = [];
  public reservaAutomatica: boolean = false;
  public horariosMarcados = new Set<string>();

  // Links de pago de la solicitud (el más reciente primero)
  public links: any[] = [];

  // Cobro por transferencia (sin pasarela): datos del correo y del PDF
  public datosPago: any = null;
  public generandoPdf: boolean = false;
  public puedeCompartir: boolean = typeof navigator !== 'undefined' && !!(navigator as any).share;

  // Pestañas (en móvil van en el menú de hamburguesa)
  public pestanaActiva: string = 'solicitud';
  public menuMovilAbierto: boolean = false;

  // Aprobación: lo que pidió es el punto de partida, pero se puede escoger
  // otro curso y otras líneas de la tarifa (plan y adicionales).
  public cursos: any[] = [];
  // Los mismos cursos para el buscador (sin importar mayúsculas ni tildes)
  public cursosItems: DropdownItem[] = [];
  public idCursoElegido: string = '';
  public lineasTarifa: any[] = [];
  public lineasMarcadas = new Set<string>();
  public cargandoTarifa: boolean = false;
  // Valor a cobrar de cada línea (arranca en el de la tarifa) y el motivo
  // cuando se cobra menos
  public valoresLinea: { [id: string]: number } = {};
  public motivosLinea: { [id: string]: string } = {};
  // Líneas que se cobran en cuotas, con su plan. Las que no están aquí van de contado.
  public cuotasLinea: { [id: string]: PlanCuotas } = {};
  public readonly maximoCuotas = 60;

  // Planes de cuotas ya creados (solicitud aprobada), para la pestaña Pago
  public planes: any[] = [];

  // Desde cuándo empieza las clases: de ahí salen las reservas fijas y el
  // inicio del paquete cuando llegue el pago
  public fechaInicioClases: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private solicitudesService: SolicitudesInscripcionPublicaService,
    private linksPagoService: LinksPagoService,
    private planesPagoService: PlanesPagoService,
    private cursosExtraService: CursosExtraService,
    private tarifasService: TarifasCursosExtraService,
    private exportarPdfDatosPagoService: ExportarPdfDatosPagoService,
    private institucionConfigService: InstitucionConfigService
  ) { }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.id = params['id'];
      this.cargar();
    });
  }

  cargar() {
    this.solicitudesService.obtenerById(this.id).subscribe({
      next: (response: any) => {
        const body = response.body || [];
        this.cargando = false;

        if (body.length === 0) {
          Swal.fire('No encontrada', 'La solicitud no existe.', 'warning').then(() => this.volver());
          return;
        }

        this.solicitud = body[0];
        this.datosPortal = this.leerDatosPortal(this.solicitud.datos_portal);
        this.titulo = 'Solicitud de ' + this.nombreEstudiante();
        this.idCursoElegido = this.solicitud.id_curso_extra;
        this.cargarHorarios();
        this.cargarLinks();
        this.cargarPlanes();
        if (this.esPendiente()) {
          this.cargarCursos();
        } else if (this.pestanaActiva === 'aprobacion' && this.solicitud.estado === 'rechazada') {
          this.pestanaActiva = 'solicitud';
        }
      },
      error: (error: any) => {
        this.cargando = false;
        console.error('Error al cargar la solicitud', error);
        Swal.fire('Error', 'No se pudo cargar la solicitud.', 'error');
      }
    });
  }

  // datos_portal llega como texto JSON; si no es valido no se muestra el bloque
  leerDatosPortal(valor: any): any {
    if (!valor) return null;
    if (typeof valor === 'object') return valor;
    try {
      return JSON.parse(valor);
    } catch {
      return null;
    }
  }

  // Cursos activos para escoger en la aprobación. La tarifa se carga cuando
  // ya se conoce el año del curso elegido.
  cargarCursos() {
    this.cursosExtraService.obtenerActivos().subscribe({
      next: (response: any) => {
        this.cursos = (response.body || []) as any[];
        // El curso que pidió puede estar inactivo: igual se deja escoger
        if (!this.cursos.some((c: any) => c.id === this.solicitud.id_curso_extra)) {
          this.cursos.unshift({
            id: this.solicitud.id_curso_extra, nombre: this.solicitud.nombre_curso, anio: this.solicitud.anio,
            fecha_inicio: this.solicitud.fecha_inicio, fecha_fin: this.solicitud.fecha_fin
          });
        }
        this.fechaInicioClases = this.fechaInicioSugerida();
        this.cursosItems = this.cursos.map((c: any) => ({
          id: c.id,
          nombre: c.nombre,
          descripcion: (c.id === this.solicitud.id_curso_extra ? 'El que pidió · ' : '') +
            (c.fecha_inicio ? `Del ${c.fecha_inicio} al ${c.fecha_fin}` : 'Permanente')
        }));
        this.cargarTarifa();
      },
      error: (error: any) => console.error('Error al cargar los cursos', error)
    });
  }

  get cursoElegido(): any {
    return this.cursos.find((c: any) => c.id === this.idCursoElegido) || null;
  }

  // Al cambiar el curso se recargan sus horarios y su tarifa, sin nada marcado
  cambiarCurso() {
    this.horariosMarcados = new Set<string>();
    this.fechaInicioClases = this.fechaInicioSugerida();
    this.cargarHorarios();
    this.cargarTarifa();
  }

  // La que pidió en el portal si todavía no ha pasado; si no, hoy o el
  // inicio del curso, la que sea más tarde
  fechaInicioSugerida(): string {
    const hoy = this.hoyISO();
    const pedida = this.datosPortal?.fecha_inicio_deseada;
    if (typeof pedida === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(pedida) && pedida >= hoy) {
      return pedida;
    }
    const inicioCurso = this.cursoElegido?.fecha_inicio;
    return inicioCurso && inicioCurso > hoy ? inicioCurso : hoy;
  }

  private hoyISO(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  // Líneas de la tarifa vigente del curso elegido (la del convenio si la hay).
  // En el curso que pidió vienen marcados el plan y los adicionales del portal.
  cargarTarifa() {
    const curso = this.cursoElegido;
    this.lineasTarifa = [];
    this.lineasMarcadas = new Set<string>();
    this.valoresLinea = {};
    this.motivosLinea = {};
    this.cuotasLinea = {};
    if (!curso) return;

    this.cargandoTarifa = true;
    this.tarifasService.obtenerVigente(curso.id, curso.anio, this.solicitud.id_institucion_cliente).subscribe({
      next: (response: any) => {
        this.cargandoTarifa = false;
        const tarifas = (response.body || []) as any[];
        this.lineasTarifa = tarifas.length > 0 ? (tarifas[0].detalle || []) : [];
        this.lineasTarifa.forEach((l: any) => this.valoresLinea[l.id] = Number(l.valor || 0));
        if (curso.id === this.solicitud.id_curso_extra) {
          const pedidas = [this.solicitud.id_tarifa_curso_extra_detalle, ...this.leerIds(this.solicitud.ids_adicionales)];
          this.lineasMarcadas = new Set(
            this.lineasTarifa.filter((l: any) => pedidas.includes(l.id)).map((l: any) => l.id)
          );
        }
      },
      error: (error: any) => {
        this.cargandoTarifa = false;
        console.error('Error al cargar la tarifa', error);
      }
    });
  }

  // ids_adicionales llega como texto JSON
  private leerIds(valor: any): string[] {
    if (!valor) return [];
    if (Array.isArray(valor)) return valor;
    try {
      const lista = JSON.parse(valor);
      return Array.isArray(lista) ? lista : [];
    } catch {
      return [];
    }
  }

  alternarLinea(linea: any) {
    if (this.lineasMarcadas.has(linea.id)) {
      this.lineasMarcadas.delete(linea.id);
      // Al desmarcarla vuelve a quedar de contado
      delete this.cuotasLinea[linea.id];
    } else {
      this.lineasMarcadas.add(linea.id);
    }
  }

  // Todo lo que se cobra: de contado más el total de los planes de cuotas (con recargo)
  get totalCobro(): number {
    return this.lineasTarifa
      .filter((l: any) => this.lineasMarcadas.has(l.id))
      .reduce((suma: number, l: any) => suma + (this.enCuotas(l) ? this.totalPlan(l) : Number(this.valoresLinea[l.id] || 0)), 0);
  }

  // Lo que va en el link de pago: lo de contado y la primera cuota de cada plan
  get totalAhora(): number {
    return this.lineasTarifa
      .filter((l: any) => this.lineasMarcadas.has(l.id))
      .reduce((suma: number, l: any) => suma + (this.enCuotas(l)
        ? Number(this.cuotasLinea[l.id].cuotas[0]?.valor || 0)
        : Number(this.valoresLinea[l.id] || 0)), 0);
  }

  get hayCuotas(): boolean {
    return this.lineasTarifa.some((l: any) => this.lineasMarcadas.has(l.id) && this.enCuotas(l));
  }

  // ===== Cuotas: cualquier línea marcada se puede cobrar en cuotas =====
  // La primera cuota es hoy y va en el link; las demás quedan como cuentas
  // por cobrar con su fecha.

  enCuotas(linea: any): boolean {
    return !!this.cuotasLinea[linea.id];
  }

  cambiarFormaPago(linea: any, enCuotas: boolean) {
    if (!enCuotas) {
      delete this.cuotasLinea[linea.id];
      return;
    }
    if (this.enCuotas(linea) || Number(this.valoresLinea[linea.id] || 0) <= 0) return;
    this.cuotasLinea[linea.id] = { numero: 2, periodicidad: 'mensual', tipoRecargo: 'ninguno', porcentaje: null, valorTotal: 0, cuotas: [] };
    this.repartir(linea);
  }

  /** Total del plan con el recargo, en pesos enteros */
  totalPlan(linea: any): number {
    const plan = this.cuotasLinea[linea.id];
    const valor = Number(this.valoresLinea[linea.id] || 0);
    if (!plan) return valor;
    if (plan.tipoRecargo === 'porcentaje') return Math.round(valor * (1 + Number(plan.porcentaje || 0) / 100));
    if (plan.tipoRecargo === 'valor') return Number(plan.valorTotal || 0);
    return valor;
  }

  recargoPlan(linea: any): number {
    return this.totalPlan(linea) - Number(this.valoresLinea[linea.id] || 0);
  }

  /**
   * Arma las cuotas: partes iguales en pesos enteros y la última con el
   * redondeo. Mensual: la primera hoy y las demás el mismo día de los meses
   * siguientes. Fechas específicas: la primera hoy y las demás las escribe
   * quien aprueba (se conservan las que ya había).
   */
  repartir(linea: any) {
    const plan = this.cuotasLinea[linea.id];
    if (!plan) return;
    const numero = Math.min(Math.max(Math.floor(Number(plan.numero) || 2), 2), this.maximoCuotas);
    plan.numero = numero;
    const total = this.totalPlan(linea);
    const parte = Math.floor(total / numero);
    const anteriores = plan.cuotas;
    plan.cuotas = Array.from({ length: numero }, (_, i) => ({
      numero: i + 1,
      fecha: i === 0 ? this.hoyISO()
        : plan.periodicidad === 'mensual' ? this.sumarMeses(this.hoyISO(), i) : (anteriores[i]?.fecha || ''),
      valor: i === numero - 1 ? total - parte * (numero - 1) : parte
    }));
  }

  onNumeroCuotas(event: any, linea: any) {
    this.cuotasLinea[linea.id].numero = parseInt(String(event.target.value).replace(/\D/g, ''), 10) || 2;
    this.repartir(linea);
    event.target.value = this.cuotasLinea[linea.id].numero;
  }

  // Con recargo por valor arranca en lo que se cobra, para que solo se suba
  cambiarRecargo(linea: any) {
    this.cambiarRecargoSiHaceFalta(linea);
    this.repartir(linea);
  }

  onPorcentajeInput(event: any, linea: any) {
    const texto = String(event.target.value).replace(',', '.').replace(/[^\d.]/g, '');
    let porcentaje = texto ? parseFloat(texto) : 0;
    if (isNaN(porcentaje) || porcentaje < 0) porcentaje = 0;
    if (porcentaje > 100) porcentaje = 100;
    this.cuotasLinea[linea.id].porcentaje = porcentaje;
    event.target.value = texto ? String(porcentaje).replace('.', ',') : '';
    this.repartir(linea);
  }

  // Total con recargo por valor: nunca menor que lo que se cobra (se corrige al salir del campo)
  onValorTotalInput(event: any, linea: any) {
    const texto = String(event.target.value).replace(/\D/g, '');
    const plan = this.cuotasLinea[linea.id];
    plan.valorTotal = texto ? parseInt(texto, 10) : 0;
    event.target.value = plan.valorTotal.toLocaleString('es-CO');
    this.repartir(linea);
  }

  onValorTotalBlur(event: any, linea: any) {
    const plan = this.cuotasLinea[linea.id];
    const minimo = Number(this.valoresLinea[linea.id] || 0);
    if (plan.valorTotal < minimo) {
      plan.valorTotal = minimo;
      event.target.value = minimo.toLocaleString('es-CO');
      this.repartir(linea);
    }
  }

  // Valor de una cuota: se puede cambiar a mano; si no cuadra con el total sale el aviso
  onValorCuotaInput(event: any, cuota: any) {
    const texto = String(event.target.value).replace(/\D/g, '');
    cuota.valor = texto ? parseInt(texto, 10) : 0;
    event.target.value = cuota.valor.toLocaleString('es-CO');
  }

  textoPesos(valor: any): string {
    return Number(valor || 0).toLocaleString('es-CO');
  }

  sumaCuotas(linea: any): number {
    return (this.cuotasLinea[linea.id]?.cuotas || []).reduce((suma, c) => suma + Number(c.valor || 0), 0);
  }

  /** Lo que le falta al plan para poder aprobar, o '' si está bien */
  problemaPlan(linea: any): string {
    const plan = this.cuotasLinea[linea.id];
    if (!plan) return '';
    if (plan.tipoRecargo === 'porcentaje' && !(Number(plan.porcentaje) > 0)) return 'Escribe el porcentaje de recargo.';
    const suma = this.sumaCuotas(linea);
    const total = this.totalPlan(linea);
    if (suma !== total) {
      return `Las cuotas suman ${suma.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })} ` +
        `y el total es ${total.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })}.`;
    }
    const sinValor = plan.cuotas.find(c => !(Number(c.valor) > 0));
    if (sinValor) return `La cuota ${sinValor.numero} no tiene valor.`;
    for (let i = 1; i < plan.cuotas.length; i++) {
      if (!plan.cuotas[i].fecha) return `Falta la fecha de la cuota ${i + 1}.`;
      if (plan.cuotas[i].fecha <= plan.cuotas[i - 1].fecha) {
        return `La fecha de la cuota ${i + 1} tiene que ser posterior a la de la cuota ${i}.`;
      }
    }
    return '';
  }

  // Mismo día del mes, k meses después; si ese mes no tiene el día, el último día del mes
  private sumarMeses(fecha: string, meses: number): string {
    const [anio, mes, dia] = fecha.split('-').map(Number);
    const destino = new Date(anio, mes - 1 + meses, 1);
    const ultimoDia = new Date(destino.getFullYear(), destino.getMonth() + 1, 0).getDate();
    destino.setDate(Math.min(dia, ultimoDia));
    return `${destino.getFullYear()}-${String(destino.getMonth() + 1).padStart(2, '0')}-${String(destino.getDate()).padStart(2, '0')}`;
  }

  // Valor a cobrar: solo números, con separador de miles, nunca mayor que la tarifa
  onValorLineaInput(event: any, linea: any) {
    const tarifa = Number(linea.valor || 0);
    const texto = String(event.target.value).replace(/\D/g, '');
    let valor = texto ? parseInt(texto, 10) : 0;
    if (valor > tarifa) {
      valor = tarifa;
    }
    this.valoresLinea[linea.id] = valor;
    event.target.value = valor.toLocaleString('es-CO');
    // Si va en cuotas se reparte otra vez; en cero ya no se puede partir
    if (this.enCuotas(linea)) {
      if (valor <= 0) {
        delete this.cuotasLinea[linea.id];
      } else {
        this.cambiarRecargoSiHaceFalta(linea);
        this.repartir(linea);
      }
    }
  }

  // Con recargo por valor, el total no puede quedar por debajo de lo que se cobra
  private cambiarRecargoSiHaceFalta(linea: any) {
    const plan = this.cuotasLinea[linea.id];
    if (plan.tipoRecargo === 'valor' && plan.valorTotal < Number(this.valoresLinea[linea.id] || 0)) {
      plan.valorTotal = Number(this.valoresLinea[linea.id] || 0);
    }
  }

  textoValor(linea: any): string {
    return Number(this.valoresLinea[linea.id] || 0).toLocaleString('es-CO');
  }

  tieneDescuento(linea: any): boolean {
    return Number(this.valoresLinea[linea.id] || 0) < Number(linea.valor || 0);
  }

  textoTipoLinea(linea: any): string {
    const tipos: any = { matricula: 'Matrícula', pension: 'Pensión', paquete: 'Paquete', unico: 'Pago único' };
    const tipo = tipos[linea.tipo] || '';
    if (linea.tipo !== 'paquete' || !linea.numero_sesiones) {
      return tipo;
    }
    const dias = this.diasPorSemana(linea);
    const textoDias = dias ? ` · ${dias} ${dias === 1 ? 'día' : 'días'} a la semana` : '';
    return `${tipo} · ${linea.numero_sesiones} sesiones${textoDias}`;
  }

  // ===== Plan y horarios: en los paquetes por sesiones van de la mano =====
  // Un paquete se usa en el mes (4 semanas): 4 sesiones = 1 día a la semana,
  // 8 = 2 días... Los planes que no son por sesiones (semanas, pago único,
  // adicionales) no tienen que ver con los horarios.
  private readonly semanasPorPaquete = 4;

  /** Días a la semana que espera un paquete, o null si no cuadra en semanas */
  diasPorSemana(linea: any): number | null {
    const sesiones = Number(linea?.numero_sesiones || 0);
    if (linea?.tipo !== 'paquete' || sesiones < this.semanasPorPaquete || sesiones % this.semanasPorPaquete !== 0) {
      return null;
    }
    return sesiones / this.semanasPorPaquete;
  }

  // Al marcar o desmarcar horarios se preselecciona el paquete que
  // corresponde (horarios x 4 sesiones), si el curso lo tiene. Se puede
  // cambiar después: es una ayuda, no una regla.
  private sugerirPlanPorHorarios() {
    const cantidad = this.horariosMarcados.size;
    if (cantidad === 0) return;
    const paquetes = this.lineasTarifa.filter((l: any) => this.diasPorSemana(l) !== null);
    const sugerido = paquetes.find((l: any) => this.diasPorSemana(l) === cantidad);
    if (!sugerido) return;
    paquetes.forEach((l: any) => this.lineasMarcadas.delete(l.id));
    this.lineasMarcadas.add(sugerido.id);
  }

  /**
   * Aviso cuando el paquete marcado no cuadra con los horarios marcados
   * (por ejemplo 8 sesiones con un solo horario). No bloquea la aprobación:
   * puede haber casos especiales, como clase doble.
   */
  get avisoPlanHorarios(): string {
    if (this.reservaAutomatica || this.horarios.length === 0) return '';
    const paquetes = this.lineasTarifa.filter((l: any) => this.lineasMarcadas.has(l.id) && this.diasPorSemana(l) !== null);
    if (paquetes.length !== 1) return '';
    const dias = this.diasPorSemana(paquetes[0]) as number;
    const marcados = this.horariosMarcados.size;
    if (dias === marcados) return '';
    const textoDias = `${dias} ${dias === 1 ? 'día' : 'días'} a la semana`;
    const textoMarcados = marcados === 0 ? 'no marcaste ningún horario'
      : `marcaste ${marcados} ${marcados === 1 ? 'horario' : 'horarios'}`;
    return `El plan de ${paquetes[0].numero_sesiones} sesiones es de ${textoDias} y ${textoMarcados}.`;
  }

  correoDestino(): string {
    return this.solicitud?.acu_correo || this.solicitud?.est_correo || '';
  }

  // El bloque del acudiente solo aplica cuando quien inscribe es otra
  // persona (participante menor de edad)
  tieneAcudiente(): boolean {
    return !!(this.solicitud?.acu_numero_identificacion || this.solicitud?.acu_primer_nombre);
  }

  seleccionarPestana(pestana: string) {
    this.pestanaActiva = pestana;
    this.menuMovilAbierto = false;
  }

  etiquetaPestana(pestana: string): string {
    const etiquetas: any = { solicitud: 'Solicitud', participante: 'Participante', aprobacion: 'Aprobación', pago: 'Pago' };
    return etiquetas[pestana] || '';
  }

  iconoPestana(pestana: string): string {
    const iconos: any = { solicitud: 'fa-file-alt', participante: 'fa-user', aprobacion: 'fa-check-circle', pago: 'fa-credit-card' };
    return iconos[pestana] || '';
  }

  // La de aprobación no aplica a una rechazada; la de pago, solo si hay link
  get pestanas(): string[] {
    const lista = ['solicitud', 'participante'];
    if (this.solicitud && this.solicitud.estado !== 'rechazada') lista.push('aprobacion');
    if (this.linkActual) lista.push('pago');
    return lista;
  }

  cargarHorarios() {
    // Pendiente: los del curso elegido en la aprobación. Ya aprobada, el back
    // devuelve los del curso en el que quedó inscrito.
    const idCurso = this.esPendiente() && this.idCursoElegido !== this.solicitud.id_curso_extra ? this.idCursoElegido : undefined;
    this.solicitudesService.obtenerHorarios(this.id, idCurso).subscribe({
      next: (response: any) => {
        const body = response.body || {};
        this.reservaAutomatica = !!body.reserva_automatica;
        this.horarios = body.horarios || [];
        // Pendiente: viene marcado uno solo de los que escogió y tienen cupo
        // (solo en el curso que pidió): si escogió varios, el que más
        // inscritos tiene, y si empatan, el primero. Ya resuelta: se muestran
        // los que quedaron asignados.
        const cursoPedido = this.idCursoElegido === this.solicitud.id_curso_extra;
        if (this.esPendiente()) {
          const opciones = cursoPedido ? this.horarios.filter((h: any) => h.preferido && !h.lleno) : [];
          const sugerido = opciones.reduce((mejor: any, h: any) =>
            !mejor || Number(h.ocupados || 0) > Number(mejor.ocupados || 0) ? h : mejor, null);
          this.horariosMarcados = new Set(sugerido ? [sugerido.id] : []);
        } else {
          this.horariosMarcados = new Set(this.horarios.filter((h: any) => h.asignado).map((h: any) => h.id));
        }
      },
      error: (error: any) => console.error('Error al cargar los horarios', error)
    });
  }

  // Planes de cuotas de la solicitud (solo hay si se aprobó con cuotas)
  cargarPlanes() {
    if (this.esPendiente()) {
      this.planes = [];
      return;
    }
    this.planesPagoService.obtenerPorSolicitud(this.id).subscribe({
      next: (response: any) => this.planes = (response.body || []) as any[],
      error: (error: any) => console.error('Error al cargar las cuotas', error)
    });
  }

  etiquetaCuota(cuota: any): string {
    if (cuota.estado === 'pendiente' && Number(cuota.pagado) > 0) return 'Pago parcial';
    const etiquetas: any = { pagada: 'Pagada', pendiente: 'Pendiente', vencida: 'Vencida', anulada: 'Anulada' };
    return etiquetas[cuota.estado] || cuota.estado;
  }

  claseCuota(cuota: any): string {
    const clases: any = { pagada: 'chip-ok', vencida: 'chip-alerta', anulada: 'chip-gris' };
    return clases[cuota.estado] || 'chip-info';
  }

  cargarLinks() {
    this.linksPagoService.obtenerPorSolicitud(this.id).subscribe({
      next: (response: any) => {
        this.links = response.body || [];
        this.datosPago = null;
        // Con o sin pasarela: el PDF y las cuentas sirven para pagar a mano
        if (this.linkActual) {
          this.cargarDatosPago();
        }
      },
      error: (error: any) => console.error('Error al cargar el link de pago', error)
    });
  }

  // Sin pasarela el cobro es por transferencia: no hay link, se mandan las cuentas
  get esTransferencia(): boolean {
    return this.linkActual?.proveedor === 'transferencia';
  }

  // Por transferencia se sabe si pagaron por el saldo de sus cuentas
  get transferenciaPagada(): boolean {
    return this.esTransferencia && !this.linkAnulado && Number(this.linkActual?.saldo_pendiente) <= 0;
  }

  // El link queda anulado cuando la solicitud se cancela por no pago
  get linkAnulado(): boolean {
    return this.linkActual?.estado === 'anulado';
  }

  /**
   * Aprobada con link y sin un peso pagado (ni en el link ni en las cuotas).
   * El back vuelve a revisar los pagos antes de cancelar.
   */
  get puedeCancelarPorNoPago(): boolean {
    if (!this.solicitud || this.solicitud.estado !== 'aprobada' || !this.linkActual) return false;
    if (this.linkActual.estado === 'pagado' || this.linkAnulado) return false;
    if (Number(this.linkActual.saldo_pendiente) < Number(this.linkActual.valor)) return false;
    return !this.planes.some((p: any) => (p.cuotas || []).some((c: any) => Number(c.pagado) > 0));
  }

  cargarDatosPago() {
    if (!this.linkActual) return;
    this.linksPagoService.obtenerDatosPago(this.linkActual.id).subscribe({
      next: (response: any) => this.datosPago = response.body || null,
      error: (error: any) => console.error('Error al cargar los datos para transferir', error)
    });
  }

  async descargarPdfPago() {
    const datos = await this.armarDatosPdf();
    if (datos) {
      this.exportarPdfDatosPagoService.generarPDF(datos);
    }
  }

  // Comparte el PDF por el menú nativo; si el dispositivo no deja compartir
  // archivos, lo descarga
  async compartirPdfPago() {
    const datos = await this.armarDatosPdf();
    if (!datos) return;
    const archivo = new File([this.exportarPdfDatosPagoService.generarBlob(datos)],
      this.exportarPdfDatosPagoService.nombreArchivo(datos), { type: 'application/pdf' });
    const nav: any = navigator;
    if (nav.canShare && nav.canShare({ files: [archivo] })) {
      try {
        await nav.share({ files: [archivo], title: 'Datos para el pago de ' + datos.curso });
      } catch (error: any) {
        if (error?.name !== 'AbortError') console.error('Error al compartir el PDF', error);
      }
      return;
    }
    this.exportarPdfDatosPagoService.generarPDF(datos);
  }

  private async armarDatosPdf(): Promise<DatosPagoPDF | null> {
    if (!this.datosPago) {
      Swal.fire('Un momento', 'Todavía se están cargando los datos para el pago.', 'info');
      return null;
    }
    this.generandoPdf = true;
    const logoBase64 = await this.cargarLogoBase64();
    this.generandoPdf = false;
    return { ...this.datosPago, logoBase64 } as DatosPagoPDF;
  }

  private async cargarLogoBase64(): Promise<string> {
    try {
      const respuesta = await fetch(this.institucionConfigService.getLogoUrl());
      if (!respuesta.ok) return '';
      const blob = await respuesta.blob();
      return await new Promise<string>((resolve, reject) => {
        const lector = new FileReader();
        lector.onloadend = () => resolve(lector.result as string);
        lector.onerror = reject;
        lector.readAsDataURL(blob);
      });
    } catch {
      return '';
    }
  }

  get linkActual(): any {
    return this.links.length > 0 ? this.links[0] : null;
  }

  // Un horario lleno no se puede marcar (sí desmarcar)
  alternarHorario(h: any) {
    if (!this.esPendiente() || this.reservaAutomatica) return;
    if (this.horariosMarcados.has(h.id)) {
      this.horariosMarcados.delete(h.id);
    } else if (!h.lleno) {
      this.horariosMarcados.add(h.id);
    }
    this.sugerirPlanPorHorarios();
  }

  /** Los horarios que la persona escogió en el portal, para mostrarlos en la ayuda */
  get textoHorariosEscogidos(): string {
    return this.horarios.filter((h: any) => h.preferido).map((h: any) => this.textoHorario(h)).join(', ');
  }

  textoHorario(h: any): string {
    return `${h.nombre_dia} ${String(h.hora_inicial).substring(0, 5)} - ${String(h.hora_final).substring(0, 5)}`;
  }

  textoOcupacion(h: any): string {
    return h.cupo !== null && h.cupo !== undefined ? `${h.ocupados} de ${h.cupo}` : `${h.ocupados} · sin límite`;
  }

  etiquetaEstadoLink(link: any): string {
    if (link.proveedor === 'transferencia') {
      return Number(link.saldo_pendiente) <= 0 ? 'Pagado' : 'Esperando la transferencia';
    }
    const etiquetas: any = { pendiente: 'Pendiente', activo: 'Esperando el pago', pagado: 'Pagado', error: 'No se creó', anulado: 'Anulado' };
    return etiquetas[link.estado] || link.estado;
  }

  generarLink() {
    if (!this.linkActual) return;
    this.procesando = true;
    this.linksPagoService.generar(this.linkActual.id).subscribe({
      next: (respuesta: any) => {
        this.procesando = false;
        this.avisarLink(respuesta, 'Link de pago');
        this.cargarLinks();
      },
      error: (error: any) => {
        this.procesando = false;
        Swal.fire('Error', error?.error?.error || 'No se pudo crear el link.', 'error');
      }
    });
  }

  reenviarCorreo() {
    if (!this.linkActual) return;
    this.procesando = true;
    this.linksPagoService.reenviarCorreo(this.linkActual.id).subscribe({
      next: () => {
        this.procesando = false;
        Swal.fire('Correo enviado', (this.esTransferencia ? 'Se le enviaron los datos para transferir a ' : 'Se le envió el link de pago a ') +
          `${this.linkActual.correo_destino}.`, 'success');
        this.cargarLinks();
      },
      error: (error: any) => {
        this.procesando = false;
        Swal.fire('No salió el correo', error?.error?.error || 'No se pudo enviar el correo.', 'error');
        this.cargarLinks();
      }
    });
  }

  // Por si el aviso de Bold no llegó: consulta el link y registra el pago
  verificarPago() {
    if (!this.linkActual) return;
    this.procesando = true;
    this.linksPagoService.verificar(this.linkActual.id).subscribe({
      next: (respuesta: any) => {
        this.procesando = false;
        Swal.fire(respuesta.estado === 'pagado' ? 'Pagado' : 'Sin pago todavía', respuesta.mensaje || '',
          respuesta.estado === 'pagado' ? 'success' : 'info');
        this.cargarLinks();
      },
      error: (error: any) => {
        this.procesando = false;
        Swal.fire('Error', error?.error?.error || 'No se pudo consultar Bold.', 'error');
      }
    });
  }

  copiarLink() {
    if (!this.linkActual?.url) return;
    navigator.clipboard?.writeText(this.linkActual.url).then(
      () => Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Link copiado', showConfirmButton: false, timer: 1800 }),
      () => Swal.fire('Link de pago', this.linkActual.url, 'info')
    );
  }

  private avisarLink(link: any, titulo: string) {
    if (!link) return;
    if (link.proveedor === 'transferencia') {
      if (link.correo_enviado) {
        Swal.fire(titulo, 'Se le envió el correo con lo que va a pagar y las cuentas para transferir. En la pestaña Pago puedes descargar o compartir el PDF.', 'success');
      } else {
        Swal.fire(titulo, 'No salió el correo con los datos para transferir: ' + (link.error_correo || '') + '. En la pestaña Pago puedes reenviarlo o compartir el PDF.', 'warning');
      }
      return;
    }
    if (link.estado === 'activo' && link.correo_enviado) {
      Swal.fire(titulo, 'Se creó el link y se le envió el correo con el botón de pago.', 'success');
    } else if (link.estado === 'activo') {
      Swal.fire(titulo, 'Se creó el link, pero no salió el correo: ' + (link.error_correo || '') + '. Puedes reenviarlo o copiar el link.', 'warning');
    } else {
      Swal.fire(titulo, 'No se pudo crear el link en Bold: ' + (link.error || '') + '. Puedes reintentarlo desde la solicitud.', 'warning');
    }
  }

  nombreEstudiante(): string {
    if (!this.solicitud) return '';
    return [
      this.solicitud.est_primer_nombre,
      this.solicitud.est_segundo_nombre,
      this.solicitud.est_primer_apellido,
      this.solicitud.est_segundo_apellido
    ].filter(Boolean).join(' ');
  }

  nombreAcudiente(): string {
    if (!this.solicitud) return '';
    return [this.solicitud.acu_primer_nombre, this.solicitud.acu_primer_apellido]
      .filter(Boolean).join(' ');
  }

  esPendiente(): boolean {
    return this.solicitud && this.solicitud.estado === 'pendiente';
  }

  etiquetaEstado(): string {
    if (!this.solicitud) return '';
    if (this.solicitud.estado === 'aprobada') return 'Aprobada';
    if (this.solicitud.estado === 'rechazada') return 'Rechazada';
    if (this.solicitud.estado === 'cancelada') return 'Cancelada por no pago';
    return 'Pendiente';
  }

  /**
   * Aprobar crea la persona, el estudiante, el acudiente y la inscripción en
   * el curso elegido, las reservas fijas de los horarios marcados y, si se
   * marcó algo de la tarifa, las cuentas por cobrar y el link de pago.
   */
  async aprobar() {
    const curso = this.cursoElegido;
    if (!curso) {
      Swal.fire('Falta el curso', 'Escoge el curso en la pestaña Aprobación.', 'warning');
      this.seleccionarPestana('aprobacion');
      return;
    }
    const marcados = this.horarios.filter((h: any) => this.horariosMarcados.has(h.id));
    const textoHorarios = this.reservaAutomatica || this.horarios.length === 0 ? ''
      : marcados.length > 0
        ? `Queda con reserva fija en <b>${marcados.map((h: any) => this.textoHorario(h)).join(', ')}</b>.<br><br>`
        : `No marcaste ningún horario, así que queda inscrito sin reserva fija.<br><br>`;
    if (!this.fechaInicioClases) {
      Swal.fire('Falta la fecha', 'Escribe desde cuándo empieza las clases en la pestaña Aprobación.', 'warning');
      this.seleccionarPestana('aprobacion');
      return;
    }
    if (curso.fecha_fin && this.fechaInicioClases > curso.fecha_fin) {
      Swal.fire('Fecha fuera del curso', `El curso termina el ${curso.fecha_fin}.`, 'warning');
      this.seleccionarPestana('aprobacion');
      return;
    }
    const marcadas = this.lineasTarifa.filter((l: any) => this.lineasMarcadas.has(l.id));
    const sinMotivo = marcadas.find((l: any) => this.tieneDescuento(l) && !(this.motivosLinea[l.id] || '').trim());
    if (sinMotivo) {
      Swal.fire('Falta el motivo', `Escribe por qué se le cobra menos en ${sinMotivo.nombre_producto}.`, 'warning');
      this.seleccionarPestana('aprobacion');
      return;
    }
    const conProblema = marcadas.find((l: any) => this.problemaPlan(l) !== '');
    if (conProblema) {
      Swal.fire('Revisa las cuotas', `${conProblema.nombre_producto}: ${this.problemaPlan(conProblema)}`, 'warning');
      this.seleccionarPestana('aprobacion');
      return;
    }
    const pesos = (v: number) => v.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
    const valor = pesos(this.totalCobro);
    const conDescuento = marcadas.some((l: any) => this.tieneDescuento(l)) ? ' (con descuento)' : '';
    const destino = this.correoDestino() ? ` a <b>${this.correoDestino()}</b>.` : `, pero la solicitud no tiene correo.`;
    // Con cuotas: en el link va lo de contado y la primera cuota; el resto queda con su fecha
    const cuotasDespues = marcadas.filter((l: any) => this.enCuotas(l))
      .reduce((suma: number, l: any) => suma + this.cuotasLinea[l.id].cuotas.length - 1, 0);
    const textoCobro = this.lineasMarcadas.size === 0
      ? `No marcaste nada para cobrar, así que no se crean cuentas por cobrar ni link de pago.`
      : this.totalCobro === 0
        ? `Se crea la cuenta por cobrar en cero${conDescuento}, así que no se envía link de pago.`
        : this.hayCuotas
          ? `Se crean las cuentas por cobrar por <b>${valor}</b>${conDescuento} y se envía el link de pago por <b>${pesos(this.totalAhora)}</b> ` +
            `(lo de contado y la primera cuota)` + destino + `<br><br>Quedan <b>${cuotasDespues}</b> ${cuotasDespues === 1 ? 'cuota' : 'cuotas'} más por ` +
            `<b>${pesos(this.totalCobro - this.totalAhora)}</b>, cada una como cuenta por cobrar con su fecha.`
          : `Se crean las cuentas por cobrar por <b>${valor}</b>${conDescuento} y se envía el link de pago de Bold` + destino;
    const result = await Swal.fire({
      title: '¿Aprobar la solicitud?',
      html: `Se va a crear el estudiante <b>${this.nombreEstudiante()}</b> y se inscribirá a ` +
            `<b>${curso.nombre}</b>, con clases desde el <b>${this.fechaInicioClases}</b>.<br><br>` + textoHorarios + textoCobro,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, aprobar',
      cancelButtonText: 'Cancelar'
    });

    if (!result.isConfirmed) {
      return;
    }

    this.procesando = true;

    // Siempre se mandan las listas (aunque vayan vacías) para que el back use
    // lo escogido aquí y no lo que traía la solicitud
    const idsHorarios = this.reservaAutomatica ? [] : Array.from(this.horariosMarcados);
    const lineasCobro = marcadas.map((l: any) => ({
      id: l.id,
      valor: Number(this.valoresLinea[l.id] || 0),
      motivo_descuento: this.tieneDescuento(l) ? (this.motivosLinea[l.id] || '').trim() : null,
      // Sin plan va de contado
      cuotas: this.enCuotas(l) ? {
        periodicidad: this.cuotasLinea[l.id].periodicidad,
        tipo_recargo: this.cuotasLinea[l.id].tipoRecargo,
        porcentaje_recargo: this.cuotasLinea[l.id].tipoRecargo === 'porcentaje' ? this.cuotasLinea[l.id].porcentaje : null,
        valor_total: this.totalPlan(l),
        cuotas: this.cuotasLinea[l.id].cuotas.map(c => ({ numero: c.numero, fecha: c.fecha, valor: c.valor }))
      } : null
    }));
    this.solicitudesService.aprobar(this.id, idsHorarios, this.idCursoElegido, Array.from(this.lineasMarcadas),
      lineasCobro, this.fechaInicioClases).subscribe({
      next: (response: any) => {
        this.procesando = false;
        if (response.lineas_no_encontradas > 0) {
          Swal.fire('Aprobada', 'Parte de lo que marcaste ya no está en la tarifa del curso y no se cobró. ' +
            'Revisa las cuentas en la inscripción del estudiante.', 'warning');
        } else if (response.link_pago) {
          this.avisarLink(response.link_pago, 'Aprobada');
        } else {
          Swal.fire('Aprobada', response.mensaje || 'El estudiante quedó inscrito.', 'success');
        }
        this.cargar();
      },
      error: (error: any) => {
        this.procesando = false;
        console.error('Error al aprobar la solicitud', error);
        // El back responde 400 con el motivo: cupo lleno, ya resuelta, etc.
        const mensaje = error?.error?.error || 'No se pudo aprobar la solicitud.';
        Swal.fire('No se pudo aprobar', mensaje, 'error');
      }
    });
  }

  async rechazar() {
    const result = await Swal.fire({
      title: 'Rechazar la solicitud',
      input: 'textarea',
      inputLabel: 'Motivo (opcional)',
      inputPlaceholder: 'Por qué se rechaza...',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Rechazar',
      cancelButtonText: 'Cancelar'
    });

    if (!result.isConfirmed) {
      return;
    }

    this.procesando = true;

    this.solicitudesService.rechazar(this.id, result.value || null).subscribe({
      next: () => {
        this.procesando = false;
        Swal.fire('Rechazada', 'La solicitud quedó rechazada.', 'success');
        this.cargar();
      },
      error: (error: any) => {
        this.procesando = false;
        console.error('Error al rechazar la solicitud', error);
        const mensaje = error?.error?.error || 'No se pudo rechazar la solicitud.';
        Swal.fire('Error', mensaje, 'error');
      }
    });
  }

  /**
   * Cancela la inscripción de una aprobada que no pagó: se retira del curso,
   * se liberan sus horarios, se anulan las cuentas y el link queda anulado.
   */
  async cancelarPorNoPago() {
    const result = await Swal.fire({
      title: 'Cancelar inscripción por no pago',
      html: `<b>${this.solicitud.est_primer_nombre} ${this.solicitud.est_primer_apellido}</b> sale del curso y su horario queda libre. ` +
        'Las cuentas y el link de pago quedan anulados; si después alguien paga con el link, el pago no se registra solo y te llega un aviso.',
      input: 'textarea',
      inputLabel: 'Motivo (opcional)',
      inputPlaceholder: 'Por ejemplo: no pagó en el plazo acordado',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Cancelar inscripción',
      cancelButtonText: 'Volver'
    });

    if (!result.isConfirmed) {
      return;
    }

    this.procesando = true;
    this.solicitudesService.cancelarPorNoPago(this.id, result.value || null).subscribe({
      next: () => {
        this.procesando = false;
        Swal.fire('Cancelada', 'La inscripción quedó cancelada y el cupo libre.', 'success');
        this.cargar();
      },
      error: (error: any) => {
        this.procesando = false;
        console.error('Error al cancelar la solicitud', error);
        Swal.fire('No se pudo cancelar', error?.error?.error || 'No se pudo cancelar la inscripción.', 'error');
      }
    });
  }

  // Lleva a la vista 360 del estudiante creado
  irAInscripcion() {
    if (!this.solicitud?.id_estudiante_creado) {
      return;
    }
    this.router.navigate(['/estudiantes/vista/' + this.solicitud.id_estudiante_creado]);
  }

  volver() {
    this.router.navigate([this.regresar]);
  }
}