import { Component, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import Swal from 'sweetalert2';
import { HeaderComponent } from '../../../../common/header/header.component';
import { CalendariosEventosService } from '../../../../services/calendarios-eventos.service';
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
}

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
  dia: number;
  esHoy: boolean;
  esMesActual: boolean;
  eventosSinHora: EventoCalendario[];
  eventosConHora: EventoCalendario[];
  bloques: EventoBloque[];
}

type TipoVista = 'dia' | 'semana' | 'mes';

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

  // Máximo de eventos visibles por celda en la vista mes
  private readonly maxEventosMes = 3;

  // Estado del calendario
  public vistaActual: TipoVista = 'mes';
  public fechaActual: Date = new Date();
  public mesActual: number = new Date().getMonth();
  public anioActual: number = new Date().getFullYear();
  public esMobile = false;

  // Datos
  public eventos: EventoCalendario[] = [];
  public tipos: any[] = [];
  public diasCalendario: DiaCalendario[] = [];
  public diasSemana: DiaCalendario[] = [];
  private imagenesIconos: any[] = [];
  private catalogoDiasSemana: any[] = [];

  // Meses ya consultados ('YYYY-MM'), para no repetir llamadas al navegar
  private mesesCargados = new Map<string, EventoCalendario[]>();

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
      this.cargarEventos();
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
    if (vista && ['dia', 'semana', 'mes'].includes(vista)) {
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
   * Carga los meses que cubre la vista actual (la vista mes y la semana
   * pueden mostrar días de los meses vecinos) y arma el calendario.
   */
  cargarEventos(forzar: boolean = false) {
    if (forzar) {
      this.mesesCargados.clear();
    }

    const pendientes = this.mesesVisibles().filter(clave => !this.mesesCargados.has(clave));

    if (pendientes.length === 0) {
      this.actualizarEventosVisibles();
      return;
    }

    this.cargando = true;
    const consultas: Observable<{ clave: string; eventos: EventoCalendario[] }>[] = pendientes.map(clave => {
      const [anio, mes] = clave.split('-').map(Number);
      return this.calendariosEventosService.obtenerPorMes(anio, mes).pipe(
        map((response: any) => ({ clave, eventos: (response.body ?? []) as EventoCalendario[] }))
      );
    });

    forkJoin(consultas).subscribe({
      next: resultados => {
        resultados.forEach(r => this.mesesCargados.set(r.clave, r.eventos));
        this.cargando = false;
        this.actualizarEventosVisibles();
      },
      error: error => {
        console.error('Error al cargar eventos:', error);
        this.cargando = false;
        Swal.fire('Error', 'No se pudieron cargar los eventos del calendario', 'error');
      }
    });
  }

  private actualizarEventosVisibles() {
    this.eventos = [];
    this.mesesCargados.forEach(lista => this.eventos.push(...lista));
    this.calcularRangoHorario();
    this.generarCalendario();
  }

  /** Meses ('YYYY-MM', mes 1-12) que se ven en la vista actual. */
  private mesesVisibles(): string[] {
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
    } else {
      desde = new Date(this.fechaActual);
      hasta = new Date(this.fechaActual);
    }

    const claves: string[] = [];
    const cursor = new Date(desde.getFullYear(), desde.getMonth(), 1);
    while (cursor <= hasta) {
      claves.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`);
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return claves;
  }

  // ==================== RANGO HORARIO DEL GRID ====================

  /**
   * Base: jornada institucional de dias_semana. Si hay eventos por fuera, se extiende.
   * Fallback: 6-20 si dias_semana no está disponible.
   */
  private calcularRangoHorario() {
    let minMinutos = this.obtenerMinutosBaseDiasSemana('inicio');
    let maxMinutos = this.obtenerMinutosBaseDiasSemana('fin');

    this.eventos.forEach(ev => {
      const inicio = this.horaStringAMinutos(ev.hora_inicio);
      if (inicio < 0) return;
      const fin = inicio + this.minutosEvento(ev);
      if (inicio < minMinutos) minMinutos = inicio;
      if (fin > maxMinutos) maxMinutos = fin;
    });

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
    if (this.vistaActual === 'mes') {
      this.generarVistaMes();
    } else if (this.vistaActual === 'semana') {
      this.generarVistaSemana();
    } else {
      this.generarVistaDia();
    }
  }

  generarVistaMes() {
    this.diasCalendario = [];
    const primerDia = new Date(this.anioActual, this.mesActual, 1);
    const ultimoDia = new Date(this.anioActual, this.mesActual + 1, 0);

    const diaSemanaInicio = primerDia.getDay();
    for (let i = diaSemanaInicio - 1; i >= 0; i--) {
      const fecha = new Date(this.anioActual, this.mesActual, -i);
      this.diasCalendario.push(this.crearDiaCalendario(fecha, false));
    }

    for (let dia = 1; dia <= ultimoDia.getDate(); dia++) {
      const fecha = new Date(this.anioActual, this.mesActual, dia);
      this.diasCalendario.push(this.crearDiaCalendario(fecha, true));
    }

    const diasRestantes = 42 - this.diasCalendario.length;
    for (let i = 1; i <= diasRestantes; i++) {
      const fecha = new Date(this.anioActual, this.mesActual + 1, i);
      this.diasCalendario.push(this.crearDiaCalendario(fecha, false));
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

  crearDiaCalendario(fecha: Date, esMesActual: boolean): DiaCalendario {
    const hoy = new Date();
    const texto = this.dateATexto(fecha);
    const delDia = this.eventos.filter(ev => (ev.fecha || '').substring(0, 10) === texto);
    const conHora = delDia.filter(ev => this.horaStringAMinutos(ev.hora_inicio) >= 0);

    return {
      fecha: new Date(fecha),
      dia: fecha.getDate(),
      esHoy: fecha.toDateString() === hoy.toDateString(),
      esMesActual,
      eventosSinHora: delDia.filter(ev => this.horaStringAMinutos(ev.hora_inicio) < 0),
      eventosConHora: conHora,
      bloques: this.calcularBloques(conHora)
    };
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

  eventosVisiblesMes(dia: DiaCalendario): EventoCalendario[] {
    return this.eventosDelDia(dia).slice(0, this.maxEventosMes);
  }

  eventosOcultosMes(dia: DiaCalendario): number {
    return Math.max(0, this.eventosDelDia(dia).length - this.maxEventosMes);
  }

  // ==================== NAVEGACIÓN ====================

  cambiarVista(vista: TipoVista) {
    const vistaAnterior = this.vistaActual;
    this.vistaActual = vista;

    // Al salir de la vista mes, si la fecha actual no está en el mes que se ve, se usa el día 1
    if (vistaAnterior === 'mes' && vista !== 'mes' &&
        (this.fechaActual.getMonth() !== this.mesActual || this.fechaActual.getFullYear() !== this.anioActual)) {
      const hoy = new Date();
      this.fechaActual = (this.mesActual === hoy.getMonth() && this.anioActual === hoy.getFullYear())
        ? hoy
        : new Date(this.anioActual, this.mesActual, 1);
    }

    if (vista === 'mes') {
      this.mesActual = this.fechaActual.getMonth();
      this.anioActual = this.fechaActual.getFullYear();
    }

    this.cargarEventos();
  }

  mesAnterior() {
    this.desplazar(-1);
  }

  mesSiguiente() {
    this.desplazar(1);
  }

  private desplazar(sentido: number) {
    if (this.vistaActual === 'mes') {
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
    this.cargarEventos();
  }

  irHoy() {
    this.fechaActual = new Date();
    this.mesActual = this.fechaActual.getMonth();
    this.anioActual = this.fechaActual.getFullYear();
    this.cargarEventos();
  }

  cambiarPeriodoSelector() {
    this.fechaActual = new Date(this.anioActual, this.mesActual, 1);
    this.cargarEventos();
  }

  // ==================== ACCIONES ====================

  /**
   * Clic en la celda de un día (vista mes). En escritorio abre el formulario con esa fecha;
   * en móvil, si el día tiene eventos, primero muestra la lista porque en la celda solo se ven iconos.
   */
  clicDiaMes(dia: DiaCalendario) {
    if (this.esMobile && this.eventosDelDia(dia).length > 0) {
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
    const icono = ruta
      ? `<img src="${ruta}" alt="" style="width: 64px; height: 64px; object-fit: contain;">`
      : '<div style="font-size: 3rem;">📅</div>';

    Swal.fire({
      title: evento.tipo_evento_nombre || 'Evento',
      html: `
        <div style="text-align: center; margin-bottom: 1rem;">${icono}</div>
        <div style="text-align: left;">
          <p><strong>Fecha:</strong> ${this.formatearFechaLarga(evento.fecha)}</p>
          <p><strong>Hora:</strong> ${this.textoHora(evento)}</p>
          <p><strong>Descripción:</strong> ${this.escaparHtml(evento.descripcion)}</p>
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

  async eliminarEvento(evento: EventoCalendario) {
    const result = await Swal.fire({
      title: '¿Está seguro?',
      text: `¿Desea eliminar el evento "${evento.tipo_evento_nombre || ''}" del ${this.formatearFechaCorta(evento.fecha)}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (!result.isConfirmed) return;

    this.calendariosEventosService.eliminar({ id: evento.id }).subscribe({
      next: () => {
        Swal.fire({ title: 'Eliminado', text: 'El evento ha sido eliminado.', icon: 'success', timer: 1500, showConfirmButton: false });
        this.cargarEventos(true);
      },
      error: (error: any) => {
        Swal.fire('Error', error?.error?.error || 'No se pudo eliminar el evento.', 'error');
      }
    });
  }

  /** Lista de eventos de un día; cada uno abre su detalle y hay un botón para agregar otro. */
  verTodoDia(dia: DiaCalendario) {
    const eventos = this.eventosDelDia(dia);
    let contenido = '<div style="text-align: left; max-height: 60vh; overflow-y: auto;">';

    eventos.forEach((ev, idx) => {
      const ruta = this.rutaIcono(ev.tipo_evento_icono);
      const icono = ruta ? `<img src="${ruta}" alt="" style="width: 28px; height: 28px; object-fit: contain;">` : '📅';
      contenido += `
        <div class="item-todo-dia" data-idx="${idx}"
             style="display: flex; gap: 10px; align-items: center; background: #f5f5f5; border-left: 4px solid #D4A437; padding: 8px 12px; border-radius: 6px; margin-bottom: 6px; cursor: pointer; color: #424242;">
          ${icono}
          <div style="min-width: 0;">
            <div style="font-weight: 600;">${this.escaparHtml(ev.tipo_evento_nombre || 'Evento')} - ${this.textoHora(ev)}</div>
            <small style="color: #757575;">${this.escaparHtml(ev.descripcion)}</small>
          </div>
        </div>
      `;
    });
    contenido += '</div>';

    Swal.fire({
      title: this.capitalizar(this.formatearFechaLarga(this.dateATexto(dia.fecha))),
      html: contenido,
      showConfirmButton: true,
      confirmButtonText: '<i class="fas fa-plus"></i> Agregar evento',
      confirmButtonColor: '#FFA000',
      showCloseButton: true,
      width: '600px',
      didOpen: () => {
        document.querySelectorAll('.item-todo-dia').forEach(item => {
          item.addEventListener('click', () => {
            const idx = Number((item as HTMLElement).dataset['idx']);
            Swal.close();
            setTimeout(() => this.verDetalleEvento(eventos[idx]), 200);
          });
        });
      }
    }).then(result => {
      if (result.isConfirmed) {
        this.crearEvento(dia.fecha, null);
      }
    });
  }

  // ==================== PRESENTACIÓN ====================

  /** Ruta de la imagen del tipo, tomada del catálogo (en la tabla solo está el nombre del archivo). */
  rutaIcono(icono: string | null | undefined): string {
    if (!icono) return '';
    const imagen = this.imagenesIconos.find((img: any) => (img.ruta || '').split('/').pop() === icono);
    return imagen ? imagen.ruta : '';
  }

  textoHora(evento: EventoCalendario): string {
    if (this.horaStringAMinutos(evento.hora_inicio) < 0) return 'Todo el día';
    const inicio = this.formatearHora(evento.hora_inicio!);
    return evento.hora_fin ? `${inicio} - ${this.formatearHora(evento.hora_fin)}` : inicio;
  }

  tituloCompacto(evento: EventoCalendario): string {
    return `${evento.tipo_evento_nombre || 'Evento'} - ${this.textoHora(evento)}`;
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
  private textoADate(texto: string): Date {
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
