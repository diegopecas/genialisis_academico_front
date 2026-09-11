import { Component, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import Swal from 'sweetalert2';
import { HeaderComponent } from '../../../../common/header/header.component';
import { CalendariosEventosService } from '../../../../services/calendarios-eventos.service';
import { CalendariosService } from '../../../../services/calendarios.service';
import { TiposEventoCalendarioService } from '../../../../services/tipos-evento-calendario.service';
import { DiasSemanaService } from '../../../../services/dias-semana.service';

interface EventoCalendario {
  id: string;
  fecha: string;
  hora_inicio: string | null;
  hora_fin: string | null;
  id_tipo_evento_calendario: string;
  descripcion: string;
  tipo_evento_nombre: string;
  tipo_evento_icono: string;
  tipo_evento_color: string | null;
}

interface CumpleanosCalendario {
  id_persona: string;
  nombre: string;
  nombre_corto: string;
  tipo_persona: 'estudiante' | 'colaborador' | 'acudiente';
  fecha: string;
  id_genero: number | null;
  cargo: string | null;
  parentesco: string | null;
  estudiantes: string | null;
}

/** Día del catálogo global `calendarios` (laboral, festivo, domingo, hábil). */
interface DiaCatalogo {
  fecha: string;
  id_tipo_dia: number;
  id_dia_semana: number;
  dia_habil: number;
  tipo_dia_nombre: string;
}

type ClaseDia = 'festivo' | 'domingo' | 'no-habil' | '';

/** Evento con hora ya ubicado en la grilla (vistas día y semana). */
interface EventoBloque {
  evento: EventoCalendario;
  top: number;
  alto: number;
  columna: number;
  totalColumnas: number;
}

interface DiaCalendario {
  fecha: Date;
  texto: string;
  dia: number;
  esHoy: boolean;
  esMesActual: boolean;
  claseDia: ClaseDia;
  eventosSinHora: EventoCalendario[];
  eventosConHora: EventoCalendario[];
  cumpleanos: CumpleanosCalendario[];
  bloques: EventoBloque[];
}

interface MesAnual {
  mes: number;
  nombre: string;
  dias: (DiaCalendario | null)[];
}

/** Fila de la vista lista: un evento, un cumpleaños o un festivo en una fecha. */
interface ItemLista {
  tipo: 'evento' | 'cumpleanos' | 'festivo';
  fecha: string;
  evento?: EventoCalendario;
  cumpleanos?: CumpleanosCalendario;
  texto?: string;
}

interface GrupoLista {
  mes: number;
  nombre: string;
  items: ItemLista[];
}

interface DatosAnio {
  dias: Map<string, DiaCatalogo>;
  eventos: EventoCalendario[];
  cumpleanos: CumpleanosCalendario[];
}

type TipoVista = 'dia' | 'semana' | 'mes' | 'anio' | 'lista';

@Component({
  selector: 'app-eventos-calendario',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent],
  templateUrl: './eventos-calendario.component.html',
  styleUrl: './eventos-calendario.component.scss'
})
export class EventosCalendarioComponent implements OnInit {

  public titulo = "Eventos del Calendario";
  public readonly raiz = '/administracion/datos-maestros/calendario-eventos/eventos';

  // Duración con la que se pinta un evento que tiene hora de inicio pero no de fin
  private readonly duracionEventoDefault = 60;

  // Alto en píxeles de una hora en las vistas día y semana
  private readonly pixelesPorHora = 60;

  // Máximo de elementos visibles por celda en la vista mes
  private readonly maxItemsMes = 3;

  // Color de los eventos cuyo tipo no tiene color asignado
  public readonly colorEventoDefault = '#D4A437';

  // Estado del calendario
  public vistaActual: TipoVista = 'mes';
  public fechaActual: Date = new Date();
  public mesActual: number = new Date().getMonth();
  public anioActual: number = new Date().getFullYear();
  public esMobile = false;

  // Filtros de lo que se muestra (aplican a todas las vistas)
  public filtros = {
    eventos: true,
    estudiantes: true,
    colaboradores: true,
    acudientes: true
  };

  // Datos
  public tipos: any[] = [];
  public diasCalendario: DiaCalendario[] = [];
  public diasSemana: DiaCalendario[] = [];
  public mesesAnio: MesAnual[] = [];
  public lista: GrupoLista[] = [];
  private imagenesIconos: any[] = [];
  private catalogoDiasSemana: any[] = [];

  // Años ya consultados, para no repetir llamadas al navegar
  private aniosCargados = new Map<number, DatosAnio>();

  // Rango horario del grid (se recalcula con cada cambio de datos)
  public horaInicio: number = 6;
  public horaFin: number = 20;
  public horasDelDia: number[] = [];

  public cargando = false;

  public nombresDias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  public nombresMeses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  // Años disponibles en el selector rápido (5 atrás, 2 adelante)
  public aniosDisponibles: number[] = [];

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private calendariosService: CalendariosService,
    private calendariosEventosService: CalendariosEventosService,
    private tiposEventoCalendarioService: TiposEventoCalendarioService,
    private diasSemanaService: DiasSemanaService
  ) {
    this.checkMobile();
  }

  ngOnInit() {
    this.generarAniosDisponibles();
    this.leerParametrosRetorno();

    // Catálogos: tipos (leyenda), iconos (ruta de la imagen) y jornada (rango del grid)
    forkJoin({
      tipos: this.tiposEventoCalendarioService.obtenerTodos().pipe(catchError(() => of({ body: [] }))),
      iconos: this.tiposEventoCalendarioService.obtenerCatalogoIconos().pipe(catchError(() => of({ imagenes: [] }))),
      dias: this.diasSemanaService.obtenerTodos().pipe(catchError(() => of({ body: [] })))
    }).subscribe(({ tipos, iconos, dias }: any) => {
      this.tipos = ((tipos.body ?? []) as any[]).sort((a: any, b: any) => (a.nombre || '').localeCompare(b.nombre || ''));
      this.imagenesIconos = iconos?.imagenes ?? [];
      this.catalogoDiasSemana = dias.body ?? [];
      this.cargarDatos();
    });
  }

  @HostListener('window:resize')
  onResize(): void {
    this.checkMobile();
  }

  private checkMobile(): void {
    this.esMobile = window.innerWidth <= 768;
  }

  /**
   * Al volver del formulario llegan la fecha y la vista en la URL,
   * para dejar el calendario donde estaba el usuario.
   */
  private leerParametrosRetorno() {
    const params = this.route.snapshot.queryParamMap;
    const fecha = params.get('fecha');
    const vista = params.get('vista') as TipoVista | null;

    if (fecha && /^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      this.fechaActual = this.textoADate(fecha);
      this.mesActual = this.fechaActual.getMonth();
      this.anioActual = this.fechaActual.getFullYear();
    }
    if (vista && ['dia', 'semana', 'mes', 'anio', 'lista'].includes(vista)) {
      this.vistaActual = vista;
    }
  }

  private generarAniosDisponibles() {
    const anioBase = new Date().getFullYear();
    this.aniosDisponibles = [];
    for (let a = anioBase - 5; a <= anioBase + 2; a++) {
      this.aniosDisponibles.push(a);
    }
  }

  // ==================== CARGA DE DATOS ====================

  /**
   * Carga los años que cubre la vista actual (la vista mes y la semana
   * pueden mostrar días del año vecino) y arma el calendario.
   */
  cargarDatos(forzar: boolean = false) {
    if (forzar) {
      this.aniosCargados.clear();
    }

    const pendientes = this.aniosVisibles().filter(anio => !this.aniosCargados.has(anio));

    if (pendientes.length === 0) {
      this.generarCalendario();
      return;
    }

    this.cargando = true;
    const consultas = pendientes.map(anio =>
      this.calendariosService.obtenerCalendarioAnio(anio).pipe(
        map((response: any) => ({ anio, datos: response.body ?? {} }))
      )
    );

    forkJoin(consultas).subscribe({
      next: resultados => {
        resultados.forEach(r => this.aniosCargados.set(r.anio, this.normalizarAnio(r.datos)));
        this.cargando = false;
        this.generarCalendario();
      },
      error: error => {
        console.error('Error al cargar el calendario:', error);
        this.cargando = false;
        Swal.fire('Error', 'No se pudo cargar el calendario', 'error');
      }
    });
  }

  private normalizarAnio(datos: any): DatosAnio {
    const dias = new Map<string, DiaCatalogo>();
    ((datos.dias ?? []) as any[]).forEach(d => {
      dias.set((d.fecha || '').substring(0, 10), {
        fecha: d.fecha,
        id_tipo_dia: Number(d.id_tipo_dia),
        id_dia_semana: Number(d.id_dia_semana),
        dia_habil: Number(d.dia_habil),
        tipo_dia_nombre: d.tipo_dia_nombre || ''
      });
    });
    return {
      dias,
      eventos: (datos.eventos ?? []) as EventoCalendario[],
      cumpleanos: (datos.cumpleanos ?? []) as CumpleanosCalendario[]
    };
  }

  /** Años que se ven en la vista actual. */
  private aniosVisibles(): number[] {
    let desde: Date;
    let hasta: Date;

    if (this.vistaActual === 'mes') {
      const primerDia = new Date(this.anioActual, this.mesActual, 1);
      desde = new Date(this.anioActual, this.mesActual, 1 - primerDia.getDay());
      hasta = new Date(desde);
      hasta.setDate(hasta.getDate() + 41);
    } else if (this.vistaActual === 'semana') {
      desde = this.obtenerInicioSemana(this.fechaActual);
      hasta = new Date(desde);
      hasta.setDate(hasta.getDate() + 6);
    } else if (this.vistaActual === 'dia') {
      desde = new Date(this.fechaActual);
      hasta = new Date(this.fechaActual);
    } else {
      return [this.anioActual];
    }

    const anios: number[] = [];
    for (let a = desde.getFullYear(); a <= hasta.getFullYear(); a++) {
      anios.push(a);
    }
    return anios;
  }

  private todosLosEventos(): EventoCalendario[] {
    const eventos: EventoCalendario[] = [];
    this.aniosCargados.forEach(d => eventos.push(...d.eventos));
    return eventos;
  }

  // ==================== FILTROS ====================

  cambiarFiltro(clave: 'eventos' | 'estudiantes' | 'colaboradores' | 'acudientes') {
    this.filtros[clave] = !this.filtros[clave];
    this.generarCalendario();
  }

  private cumpleVisible(c: CumpleanosCalendario): boolean {
    if (c.tipo_persona === 'estudiante') return this.filtros.estudiantes;
    if (c.tipo_persona === 'colaborador') return this.filtros.colaboradores;
    return this.filtros.acudientes;
  }

  // ==================== RANGO HORARIO DEL GRID ====================

  /**
   * Base: jornada institucional de dias_semana. Si hay eventos por fuera, se extiende.
   * Fallback: 6-20 si dias_semana no está disponible.
   */
  private calcularRangoHorario() {
    let minMinutos = this.obtenerMinutosBaseDiasSemana('inicio');
    let maxMinutos = this.obtenerMinutosBaseDiasSemana('fin');

    if (this.filtros.eventos) {
      this.todosLosEventos().forEach(ev => {
        const inicio = this.horaStringAMinutos(ev.hora_inicio);
        if (inicio < 0) return;
        const fin = inicio + this.minutosEvento(ev);
        if (inicio < minMinutos) minMinutos = inicio;
        if (fin > maxMinutos) maxMinutos = fin;
      });
    }

    let horaMinMin = Math.floor(minMinutos / 30) * 30;
    let horaMaxMin = Math.ceil(maxMinutos / 30) * 30;
    horaMinMin = Math.max(0, horaMinMin - 30);
    horaMaxMin = Math.min(24 * 60, horaMaxMin + 30);

    this.horaInicio = Math.floor(horaMinMin / 60);
    this.horaFin = Math.min(23, Math.ceil(horaMaxMin / 60));

    this.horasDelDia = [];
    for (let h = this.horaInicio; h <= this.horaFin; h++) {
      this.horasDelDia.push(h);
    }
  }

  private obtenerMinutosBaseDiasSemana(tipo: 'inicio' | 'fin'): number {
    const fallback = tipo === 'inicio' ? 6 * 60 : 20 * 60;
    if (!this.catalogoDiasSemana || this.catalogoDiasSemana.length === 0) {
      return fallback;
    }
    const valores = this.catalogoDiasSemana
      .map(d => this.horaStringAMinutos(tipo === 'inicio' ? d.hora_entrada : d.hora_salida))
      .filter(v => v >= 0);
    if (valores.length === 0) return fallback;
    return tipo === 'inicio' ? Math.min(...valores) : Math.max(...valores);
  }

  /** "HH:MM" o "HH:MM:SS" a minutos; -1 si no hay hora válida. */
  private horaStringAMinutos(hora: string | null | undefined): number {
    if (!hora) return -1;
    const partes = hora.split(':');
    if (partes.length < 2) return -1;
    const h = Number(partes[0]);
    const m = Number(partes[1]);
    if (isNaN(h) || isNaN(m)) return -1;
    return h * 60 + m;
  }

  /** Duración del evento en minutos; si no tiene hora de fin usa la duración por defecto. */
  private minutosEvento(evento: EventoCalendario): number {
    const inicio = this.horaStringAMinutos(evento.hora_inicio);
    const fin = this.horaStringAMinutos(evento.hora_fin);
    if (inicio < 0 || fin < 0 || fin <= inicio) return this.duracionEventoDefault;
    return fin - inicio;
  }

  // ==================== GENERACIÓN DEL CALENDARIO ====================

  generarCalendario() {
    this.calcularRangoHorario();

    switch (this.vistaActual) {
      case 'mes':
        this.generarVistaMes();
        break;
      case 'semana':
        this.generarVistaSemana();
        break;
      case 'dia':
        this.generarVistaDia();
        break;
      case 'anio':
        this.generarVistaAnio();
        break;
      case 'lista':
        this.generarVistaLista();
        break;
    }
  }

  generarVistaMes() {
    this.diasCalendario = [];
    const primerDia = new Date(this.anioActual, this.mesActual, 1);
    const ultimoDia = new Date(this.anioActual, this.mesActual + 1, 0);

    const diaSemanaInicio = primerDia.getDay();
    for (let i = diaSemanaInicio - 1; i >= 0; i--) {
      this.diasCalendario.push(this.crearDiaCalendario(new Date(this.anioActual, this.mesActual, -i), false));
    }

    for (let dia = 1; dia <= ultimoDia.getDate(); dia++) {
      this.diasCalendario.push(this.crearDiaCalendario(new Date(this.anioActual, this.mesActual, dia), true));
    }

    const diasRestantes = 42 - this.diasCalendario.length;
    for (let i = 1; i <= diasRestantes; i++) {
      this.diasCalendario.push(this.crearDiaCalendario(new Date(this.anioActual, this.mesActual + 1, i), false));
    }
  }

  generarVistaSemana() {
    this.diasSemana = [];
    const inicioSemana = this.obtenerInicioSemana(this.fechaActual);
    for (let i = 0; i < 7; i++) {
      const fecha = new Date(inicioSemana);
      fecha.setDate(fecha.getDate() + i);
      this.diasSemana.push(this.crearDiaCalendario(fecha, true));
    }
  }

  generarVistaDia() {
    this.diasSemana = [this.crearDiaCalendario(this.fechaActual, true)];
  }

  /** Los 12 meses del año en miniatura; cada mes arranca en domingo como la vista mes. */
  generarVistaAnio() {
    this.mesesAnio = [];
    for (let mes = 0; mes < 12; mes++) {
      const dias: (DiaCalendario | null)[] = [];
      const primerDia = new Date(this.anioActual, mes, 1);
      const totalDias = new Date(this.anioActual, mes + 1, 0).getDate();

      for (let i = 0; i < primerDia.getDay(); i++) {
        dias.push(null);
      }
      for (let d = 1; d <= totalDias; d++) {
        dias.push(this.crearDiaCalendario(new Date(this.anioActual, mes, d), true));
      }
      this.mesesAnio.push({ mes, nombre: this.nombresMeses[mes], dias });
    }
  }

  /** Todas las fechas del año con algo (eventos, cumpleaños o festivos), agrupadas por mes. */
  generarVistaLista() {
    const datos = this.aniosCargados.get(this.anioActual);
    const items: ItemLista[] = [];

    if (datos) {
      if (this.filtros.eventos) {
        datos.eventos.forEach(evento => items.push({ tipo: 'evento', fecha: (evento.fecha || '').substring(0, 10), evento }));
      }
      datos.cumpleanos
        .filter(c => this.cumpleVisible(c))
        .forEach(c => items.push({ tipo: 'cumpleanos', fecha: c.fecha, cumpleanos: c }));
      datos.dias.forEach((d, fecha) => {
        if (d.id_tipo_dia === 2) {
          items.push({ tipo: 'festivo', fecha, texto: d.tipo_dia_nombre || 'Festivo' });
        }
      });
    }

    // Por fecha; dentro del día: festivo, eventos (por hora) y cumpleaños
    const orden = { festivo: 0, evento: 1, cumpleanos: 2 };
    items.sort((a, b) =>
      a.fecha.localeCompare(b.fecha) ||
      orden[a.tipo] - orden[b.tipo] ||
      (a.evento?.hora_inicio || '').localeCompare(b.evento?.hora_inicio || '')
    );

    this.lista = [];
    items.forEach(item => {
      const mes = Number(item.fecha.substring(5, 7)) - 1;
      let grupo = this.lista.find(g => g.mes === mes);
      if (!grupo) {
        grupo = { mes, nombre: this.nombresMeses[mes], items: [] };
        this.lista.push(grupo);
      }
      grupo.items.push(item);
    });
  }

  crearDiaCalendario(fecha: Date, esMesActual: boolean): DiaCalendario {
    const hoy = new Date();
    const texto = this.dateATexto(fecha);
    const datos = this.aniosCargados.get(fecha.getFullYear());

    const delDia = this.filtros.eventos && datos
      ? datos.eventos.filter(ev => (ev.fecha || '').substring(0, 10) === texto)
      : [];
    const conHora = delDia.filter(ev => this.horaStringAMinutos(ev.hora_inicio) >= 0);
    const cumpleanos = datos
      ? datos.cumpleanos.filter(c => c.fecha === texto && this.cumpleVisible(c))
      : [];

    return {
      fecha: new Date(fecha),
      texto,
      dia: fecha.getDate(),
      esHoy: fecha.toDateString() === hoy.toDateString(),
      esMesActual,
      claseDia: this.claseDia(datos?.dias.get(texto), fecha),
      eventosSinHora: delDia.filter(ev => this.horaStringAMinutos(ev.hora_inicio) < 0),
      eventosConHora: conHora,
      cumpleanos,
      bloques: this.calcularBloques(conHora)
    };
  }

  /**
   * Color del día según el catálogo global `calendarios`:
   * festivo primero, luego domingo y luego cualquier otro día no hábil (ej. sábados).
   * Si el año no está en el catálogo, al menos se marcan los domingos.
   */
  private claseDia(dia: DiaCatalogo | undefined, fecha: Date): ClaseDia {
    if (!dia) {
      return fecha.getDay() === 0 ? 'domingo' : '';
    }
    if (dia.id_tipo_dia === 2) return 'festivo';
    if (dia.id_dia_semana === 7) return 'domingo';
    if (!dia.dia_habil) return 'no-habil';
    return '';
  }

  /**
   * Ubica los eventos con hora en la grilla. Los que se cruzan en el tiempo
   * se reparten el ancho en columnas para que no queden uno encima del otro.
   */
  private calcularBloques(eventos: EventoCalendario[]): EventoBloque[] {
    const items = eventos
      .map(ev => {
        const inicio = this.horaStringAMinutos(ev.hora_inicio);
        return { ev, inicio, fin: inicio + this.minutosEvento(ev) };
      })
      .sort((a, b) => a.inicio - b.inicio || b.fin - a.fin);

    const bloques: EventoBloque[] = [];
    let grupo: { item: any; columna: number }[] = [];
    let finGrupo = -1;

    const cerrarGrupo = () => {
      const total = grupo.reduce((max, g) => Math.max(max, g.columna + 1), 0);
      grupo.forEach(g => {
        bloques.push({
          evento: g.item.ev,
          top: (g.item.inicio - this.horaInicio * 60) * this.pixelesPorHora / 60,
          alto: Math.max((g.item.fin - g.item.inicio) * this.pixelesPorHora / 60, 30),
          columna: g.columna,
          totalColumnas: total
        });
      });
      grupo = [];
      finGrupo = -1;
    };

    items.forEach(item => {
      if (grupo.length > 0 && item.inicio >= finGrupo) {
        cerrarGrupo();
      }
      // Primera columna libre dentro del grupo de eventos que se cruzan
      const ocupadas = grupo.filter(g => g.item.fin > item.inicio).map(g => g.columna);
      let columna = 0;
      while (ocupadas.includes(columna)) columna++;
      grupo.push({ item, columna });
      finGrupo = Math.max(finGrupo, item.fin);
    });
    if (grupo.length > 0) cerrarGrupo();

    return bloques;
  }

  /** Eventos del día en el orden en que se muestran: primero los de todo el día. */
  eventosDelDia(dia: DiaCalendario): EventoCalendario[] {
    return [...dia.eventosSinHora, ...dia.eventosConHora];
  }

  totalItemsDia(dia: DiaCalendario): number {
    return dia.eventosSinHora.length + dia.eventosConHora.length + dia.cumpleanos.length;
  }

  eventosVisiblesMes(dia: DiaCalendario): EventoCalendario[] {
    return this.eventosDelDia(dia).slice(0, this.maxItemsMes);
  }

  cumpleanosVisiblesMes(dia: DiaCalendario): CumpleanosCalendario[] {
    const espacio = Math.max(0, this.maxItemsMes - this.eventosDelDia(dia).length);
    return dia.cumpleanos.slice(0, espacio);
  }

  itemsOcultosMes(dia: DiaCalendario): number {
    return Math.max(0, this.totalItemsDia(dia) - this.maxItemsMes);
  }

  // ==================== NAVEGACIÓN ====================

  cambiarVista(vista: TipoVista) {
    const vistaAnterior = this.vistaActual;
    this.vistaActual = vista;

    // Al pasar de mes/año/lista a día o semana, si la fecha actual no está en el periodo que se ve, se usa el día 1
    const vieneDePeriodo = vistaAnterior === 'mes' || vistaAnterior === 'anio' || vistaAnterior === 'lista';
    if (vieneDePeriodo && (vista === 'dia' || vista === 'semana')) {
      const fueraDelMes = this.fechaActual.getMonth() !== this.mesActual || this.fechaActual.getFullYear() !== this.anioActual;
      if (fueraDelMes) {
        const hoy = new Date();
        this.fechaActual = (this.mesActual === hoy.getMonth() && this.anioActual === hoy.getFullYear())
          ? hoy
          : new Date(this.anioActual, this.mesActual, 1);
      }
    }

    if (vista === 'mes') {
      this.mesActual = this.fechaActual.getMonth();
      this.anioActual = this.fechaActual.getFullYear();
    }

    this.cargarDatos();
  }

  mesAnterior() {
    this.desplazar(-1);
  }

  mesSiguiente() {
    this.desplazar(1);
  }

  private desplazar(sentido: number) {
    if (this.vistaActual === 'anio' || this.vistaActual === 'lista') {
      this.anioActual += sentido;
      this.fechaActual = new Date(this.anioActual, this.mesActual, 1);
    } else if (this.vistaActual === 'mes') {
      const nueva = new Date(this.anioActual, this.mesActual + sentido, 1);
      this.mesActual = nueva.getMonth();
      this.anioActual = nueva.getFullYear();
      this.fechaActual = nueva;
    } else {
      this.fechaActual = new Date(this.fechaActual);
      this.fechaActual.setDate(this.fechaActual.getDate() + (this.vistaActual === 'semana' ? 7 : 1) * sentido);
      this.mesActual = this.fechaActual.getMonth();
      this.anioActual = this.fechaActual.getFullYear();
    }
    this.cargarDatos();
  }

  irHoy() {
    this.fechaActual = new Date();
    this.mesActual = this.fechaActual.getMonth();
    this.anioActual = this.fechaActual.getFullYear();
    this.cargarDatos();
  }

  cambiarPeriodoSelector() {
    this.fechaActual = new Date(this.anioActual, this.mesActual, 1);
    this.cargarDatos();
  }

  /** Desde las vistas Año y Lista, un clic en una fecha abre la vista Día de esa fecha. */
  irADia(fecha: Date | string) {
    this.fechaActual = typeof fecha === 'string' ? this.textoADate(fecha) : new Date(fecha);
    this.mesActual = this.fechaActual.getMonth();
    this.anioActual = this.fechaActual.getFullYear();
    this.vistaActual = 'dia';
    this.cargarDatos();
  }

  // ==================== ACCIONES ====================

  /**
   * Clic en la celda de un día (vista mes). En escritorio abre el formulario con esa fecha;
   * en móvil, si el día tiene algo, primero muestra la lista porque en la celda solo se ven iconos.
   */
  clicDiaMes(dia: DiaCalendario) {
    if (this.esMobile && this.totalItemsDia(dia) > 0) {
      this.verTodoDia(dia);
      return;
    }
    this.crearEvento(dia.fecha, null);
  }

  /** Clic en una franja horaria (vistas día y semana). */
  clicHora(dia: DiaCalendario, hora: number) {
    this.crearEvento(dia.fecha, `${String(hora).padStart(2, '0')}:00`);
  }

  crearEvento(fecha: Date, hora: string | null) {
    const queryParams: any = { fecha: this.dateATexto(fecha), vista: this.vistaActual };
    if (hora) {
      queryParams.hora = hora;
    }
    this.router.navigate([this.raiz + '/crear/0'], { queryParams });
  }

  editarEvento(evento: EventoCalendario) {
    this.router.navigate([this.raiz + '/editar/' + evento.id], {
      queryParams: { fecha: (evento.fecha || '').substring(0, 10), vista: this.vistaActual }
    });
  }

  verDetalleEvento(evento: EventoCalendario) {
    const ruta = this.rutaIcono(evento.tipo_evento_icono);
    const color = this.colorEvento(evento);
    const icono = ruta
      ? `<img src="${ruta}" alt="" style="width: 64px; height: 64px; object-fit: contain;">`
      : '<div style="font-size: 3rem;">📅</div>';

    Swal.fire({
      title: this.escaparHtml(evento.descripcion),
      html: `
        <div style="text-align: center; margin-bottom: 1rem;">${icono}</div>
        <div style="text-align: left;">
          <p><strong>Tipo:</strong> <span style="border-left: 4px solid ${color}; padding-left: 6px;">${this.escaparHtml(evento.tipo_evento_nombre || 'Evento')}</span></p>
          <p><strong>Fecha:</strong> ${this.formatearFechaLarga(evento.fecha)}</p>
          <p><strong>Hora:</strong> ${this.textoHora(evento)}</p>
        </div>
      `,
      showConfirmButton: true,
      showDenyButton: true,
      showCancelButton: true,
      confirmButtonText: '<i class="fas fa-edit"></i> Editar',
      denyButtonText: '<i class="fas fa-trash"></i> Eliminar',
      cancelButtonText: 'Cerrar',
      confirmButtonColor: '#FFA000',
      width: '500px'
    }).then(result => {
      if (result.isConfirmed) {
        this.editarEvento(evento);
      } else if (result.isDenied) {
        this.eliminarEvento(evento);
      }
    });
  }

  /** Los cumpleaños se calculan al vuelo desde la fecha de nacimiento: solo se consultan. */
  verDetalleCumpleanos(cumple: CumpleanosCalendario) {
    const mensaje = this.mensajeCumpleanos(cumple);
    Swal.fire({
      title: `${mensaje.icono} ${this.escaparHtml(mensaje.titulo)}`,
      html: `
        <p style="font-size: 1.05rem;">${this.escaparHtml(mensaje.detalle)}</p>
        <p style="color: #757575; margin-bottom: 0;">${this.capitalizar(this.formatearFechaLarga(cumple.fecha))}</p>
      `,
      confirmButtonText: 'Cerrar',
      confirmButtonColor: '#FFA000',
      width: '500px'
    });
  }

  async eliminarEvento(evento: EventoCalendario) {
    const result = await Swal.fire({
      title: '¿Está seguro?',
      text: `¿Desea eliminar el evento "${evento.descripcion || ''}" del ${this.formatearFechaCorta(evento.fecha)}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (!result.isConfirmed) return;

    this.calendariosEventosService.eliminar({ id: evento.id }).subscribe({
      next: () => {
        Swal.fire({ title: 'Eliminado', text: 'El evento ha sido eliminado.', icon: 'success', timer: 1500, showConfirmButton: false });
        this.cargarDatos(true);
      },
      error: (error: any) => {
        Swal.fire('Error', error?.error?.error || 'No se pudo eliminar el evento.', 'error');
      }
    });
  }

  /** Lista de eventos y cumpleaños de un día; cada uno abre su detalle y hay un botón para agregar un evento. */
  verTodoDia(dia: DiaCalendario) {
    const eventos = this.eventosDelDia(dia);
    let contenido = '<div style="text-align: left; max-height: 60vh; overflow-y: auto;">';

    eventos.forEach((ev, idx) => {
      const ruta = this.rutaIcono(ev.tipo_evento_icono);
      const icono = ruta ? `<img src="${ruta}" alt="" style="width: 28px; height: 28px; object-fit: contain;">` : '📅';
      contenido += this.filaTodoDia('evento', idx, icono, `${this.escaparHtml(ev.descripcion)}`,
        `${this.escaparHtml(ev.tipo_evento_nombre || 'Evento')} - ${this.textoHora(ev)}`, this.colorEvento(ev));
    });

    dia.cumpleanos.forEach((c, idx) => {
      const mensaje = this.mensajeCumpleanos(c);
      contenido += this.filaTodoDia('cumpleanos', idx, `<span style="font-size: 1.4rem;">${mensaje.icono}</span>`,
        this.escaparHtml(mensaje.titulo), this.escaparHtml(this.etiquetaTipoPersona(c)), '#FF9800');
    });
    contenido += '</div>';

    Swal.fire({
      title: this.capitalizar(this.formatearFechaLarga(dia.texto)),
      html: contenido,
      showConfirmButton: true,
      confirmButtonText: '<i class="fas fa-plus"></i> Agregar evento',
      confirmButtonColor: '#FFA000',
      showCloseButton: true,
      width: '600px',
      didOpen: () => {
        document.querySelectorAll('.item-todo-dia').forEach(item => {
          item.addEventListener('click', () => {
            const tipo = (item as HTMLElement).dataset['tipo'];
            const idx = Number((item as HTMLElement).dataset['idx']);
            Swal.close();
            setTimeout(() => {
              if (tipo === 'evento') {
                this.verDetalleEvento(eventos[idx]);
              } else {
                this.verDetalleCumpleanos(dia.cumpleanos[idx]);
              }
            }, 200);
          });
        });
      }
    }).then(result => {
      if (result.isConfirmed) {
        this.crearEvento(dia.fecha, null);
      }
    });
  }

  private filaTodoDia(tipo: string, idx: number, icono: string, titulo: string, subtitulo: string, color: string): string {
    return `
      <div class="item-todo-dia" data-tipo="${tipo}" data-idx="${idx}"
           style="display: flex; gap: 10px; align-items: center; background: #f5f5f5; border-left: 4px solid ${color}; padding: 8px 12px; border-radius: 6px; margin-bottom: 6px; cursor: pointer; color: #424242;">
        ${icono}
        <div style="min-width: 0;">
          <div style="font-weight: 600;">${titulo}</div>
          <small style="color: #757575;">${subtitulo}</small>
        </div>
      </div>
    `;
  }

  // ==================== CUMPLEAÑOS ====================

  /**
   * Mensaje cálido según quién cumple y su género (1 femenino, 2 masculino; sin género: "nuestr@").
   * El parentesco del acudiente ya llega resuelto del back ("mamá", "abuelo", "familiar").
   */
  mensajeCumpleanos(c: CumpleanosCalendario): { icono: string; titulo: string; detalle: string } {
    const nombre = c.nombre_corto || c.nombre;
    const nuestro = c.id_genero === 1 ? 'nuestra' : c.id_genero === 2 ? 'nuestro' : 'nuestr@';

    if (c.tipo_persona === 'estudiante') {
      return {
        icono: '🎂',
        titulo: `¡Feliz cumple, ${nombre}!`,
        detalle: `Hoy ${nuestro} ${nombre} está de cumpleaños. ¡Que su día esté lleno de juegos, abrazos y sonrisas!`
      };
    }

    if (c.tipo_persona === 'colaborador') {
      const colaborador = c.id_genero === 1 ? 'colaboradora' : c.id_genero === 2 ? 'colaborador' : 'colaborador@';
      return {
        icono: '🎉',
        titulo: `¡Feliz cumpleaños, ${nombre}!`,
        detalle: `Hoy celebramos a ${nuestro} ${colaborador} ${nombre}. ¡Gracias por llenar de cariño cada día en el jardín!`
      };
    }

    const felicitar = c.id_genero === 1 ? 'felicitarla' : c.id_genero === 2 ? 'felicitarlo' : 'felicitarle';
    return {
      icono: '💛',
      titulo: `Cumpleaños de ${nombre}`,
      detalle: `Hoy cumple años ${nombre}, ${c.parentesco || 'familiar'} de ${c.estudiantes || 'uno de nuestros niños'}. ¡Un buen día para ${felicitar}!`
    };
  }

  etiquetaTipoPersona(c: CumpleanosCalendario): string {
    if (c.tipo_persona === 'estudiante') return 'Estudiante';
    if (c.tipo_persona === 'colaborador') return c.cargo || 'Colaborador';
    return `${this.capitalizar(c.parentesco || 'familiar')} de ${c.estudiantes || ''}`;
  }

  // ==================== PRESENTACIÓN ====================

  /** Ruta de la imagen del tipo, tomada del catálogo (en la tabla solo está el nombre del archivo). */
  rutaIcono(icono: string | null | undefined): string {
    if (!icono) return '';
    const imagen = this.imagenesIconos.find((img: any) => (img.ruta || '').split('/').pop() === icono);
    return imagen ? imagen.ruta : '';
  }

  colorEvento(evento: EventoCalendario): string {
    return evento.tipo_evento_color || this.colorEventoDefault;
  }

  /** Fondo suave del color del tipo (el color llega en #RRGGBB y se le agrega transparencia). */
  fondoEvento(evento: EventoCalendario): string {
    return this.colorEvento(evento) + '1F';
  }

  colorTipo(tipo: any): string {
    return tipo?.color || this.colorEventoDefault;
  }

  /** Colores de los puntos de un día en la vista Año: uno por evento (máx. 3) y uno si hay cumpleaños. */
  puntosDia(dia: DiaCalendario): string[] {
    const puntos = this.eventosDelDia(dia).slice(0, 3).map(ev => this.colorEvento(ev));
    if (dia.cumpleanos.length > 0) {
      puntos.push('#FF9800');
    }
    return puntos;
  }

  textoHora(evento: EventoCalendario): string {
    if (this.horaStringAMinutos(evento.hora_inicio) < 0) return 'Todo el día';
    const inicio = this.formatearHora(evento.hora_inicio!);
    return evento.hora_fin ? `${inicio} - ${this.formatearHora(evento.hora_fin)}` : inicio;
  }

  tituloCompacto(evento: EventoCalendario): string {
    const hora = this.horaStringAMinutos(evento.hora_inicio) >= 0 ? `${this.textoHora(evento)} · ` : '';
    return `${hora}${evento.descripcion}`;
  }

  esBloqueCorto(bloque: EventoBloque): boolean {
    return bloque.alto <= 30;
  }

  anchoBloque(bloque: EventoBloque): string {
    return `calc(${96 / bloque.totalColumnas}% - 2px)`;
  }

  izquierdaBloque(bloque: EventoBloque): string {
    return `calc(2% + ${(96 / bloque.totalColumnas) * bloque.columna}%)`;
  }

  capitalizar(texto: string): string {
    if (!texto) return '';
    return texto.charAt(0).toUpperCase() + texto.slice(1);
  }

  private escaparHtml(texto: string): string {
    return (texto || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ==================== UTILIDADES ====================

  obtenerInicioSemana(fecha: Date): Date {
    const dia = fecha.getDay();
    return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate() - dia);
  }

  /** Date local a "YYYY-MM-DD" sin pasar por UTC. */
  private dateATexto(fecha: Date): string {
    return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
  }

  /** "YYYY-MM-DD" a Date local, sin el desfase de zona horaria de new Date('YYYY-MM-DD'). */
  textoADate(texto: string): Date {
    const [anio, mes, dia] = texto.substring(0, 10).split('-').map(Number);
    return new Date(anio, mes - 1, dia);
  }

  formatearFechaCorta(fecha: string): string {
    if (!fecha) return '';
    return this.textoADate(fecha).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  formatearFechaLarga(fecha: string): string {
    if (!fecha) return '';
    return this.textoADate(fecha).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }

  /** Para la vista lista: "Lun 14". */
  formatearFechaLista(fecha: string): string {
    const d = this.textoADate(fecha);
    return `${this.nombresDias[d.getDay()].substring(0, 3)} ${d.getDate()}`;
  }

  claseDiaLista(fecha: string): ClaseDia {
    const d = this.textoADate(fecha);
    return this.claseDia(this.aniosCargados.get(d.getFullYear())?.dias.get(fecha), d);
  }

  formatearHora(hora: string): string {
    return (hora || '').substring(0, 5);
  }

  obtenerRangoSemana(): string {
    if (this.diasSemana.length < 7) return '';
    const inicio = this.diasSemana[0].fecha;
    const fin = this.diasSemana[6].fecha;
    return `${inicio.getDate()} ${this.nombresMeses[inicio.getMonth()]} - ${fin.getDate()} ${this.nombresMeses[fin.getMonth()]} ${fin.getFullYear()}`;
  }

  obtenerFechaDia(): string {
    return this.fechaActual.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }
}
