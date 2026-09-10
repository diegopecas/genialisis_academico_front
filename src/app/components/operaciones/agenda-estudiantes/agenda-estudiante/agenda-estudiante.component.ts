import { Component, OnInit, OnChanges, SimpleChanges, HostListener, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';

import { MiAgendaService } from '../../../../services/mi-agenda.service';
import { GaleriaImagenesService } from '../../../../services/galeria-imagenes.service';

import { MiAgendaVistaRendererComponent } from './mi-agenda-vista-renderer.component';
import { AgendaCabeceraComponent } from './componentes/agenda-cabecera/agenda-cabecera.component';
import { AgendaDetalleEventoComponent } from './componentes/agenda-detalle-evento/agenda-detalle-evento.component';
import { AgendaVisorFotoComponent } from './componentes/agenda-visor-foto/agenda-visor-foto.component';
import { fechaLegible } from './mi-agenda.fechas';
import {
  AgendaDia,
  EventoAgenda,
  FotoAgenda,
  FuenteAgenda,
  ModoVista,
  ModoVistaConfig,
  MODOS_VISTA,
  CLAVE_MODO_VISTA,
  fotosDe,
  tieneDetalle,
} from './mi-agenda.types';

/**
 * Agenda de un estudiante en el portal institucional: la misma que ve el
 * papá, en solo consulta.
 *
 * Es el panel de detalle de Agenda de Estudiantes: el estudiante y la fecha
 * los decide la pantalla que lo contiene. Los datos del niño (nombre y
 * grupo) salen de la misma respuesta de la agenda.
 *
 * Este componente solo maneja el estado (qué día, qué filtro, qué está
 * abierto) y pide los datos. Toda la presentación vive en los componentes
 * de componentes/ y en las vistas de vistas/.
 */
@Component({
  selector: 'app-agenda-estudiante',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MiAgendaVistaRendererComponent,
    AgendaCabeceraComponent,
    AgendaDetalleEventoComponent,
    AgendaVisorFotoComponent,
  ],
  templateUrl: './agenda-estudiante.component.html',
  styleUrl: './agenda-estudiante.component.scss'
})
export class AgendaEstudianteComponent implements OnInit, OnChanges {

  @Input() idEstudiante: string | null = null;
  /** Fecha consultada, en Y-m-d. */
  @Input() fecha: string = '';
  /**
   * Cada vez que la pantalla la incrementa se vuelve a consultar el día,
   * sin usar lo guardado. Es el botón de refrescar.
   */
  @Input() version: number = 0;

  /** Nombre y grupo del niño, tal como los manda el backend en la agenda. */
  estudianteSeleccionado: any = null;

  agenda: AgendaDia | null = null;

  /**
   * Días ya consultados mientras se está en la pantalla, por estudiante y
   * fecha, incluido hoy: volver a uno ya visto no va al backend. Para traer
   * lo nuevo está el botón de refrescar. Al salir de la pantalla se pierde
   * con el componente.
   */
  private diasConsultados = new Map<string, AgendaDia>();
  /** Todos los eventos del día, tal como llegaron del backend. */
  eventos: EventoAgenda[] = [];
  /** Los que se están pintando: eventos filtrados por el buscador. */
  eventosVisibles: EventoAgenda[] = [];
  fuentes: FuenteAgenda[] = [];
  /** Fuentes recalculadas sobre lo filtrado, para que los contadores cuadren. */
  fuentesVisibles: FuenteAgenda[] = [];

  busqueda: string = '';

  modo: ModoVista = 'camino';
  modos: ModoVistaConfig[] = MODOS_VISTA;

  cargando = false;
  isMobile = false;

  /** Evento con el detalle abierto. Solo las galerías lo abren. */
  eventoAbierto: EventoAgenda | null = null;

  /**
   * Evento del que se están viendo las fotos. Va aparte del anterior porque
   * el libro pinta las fotos dentro de la hoja y abre el visor sin pasar
   * por el detalle.
   */
  eventoFotos: EventoAgenda | null = null;
  /** Índice de la foto abierta a pantalla completa. Null = visor cerrado. */
  fotoAbierta: number | null = null;

  constructor(
    private miAgendaService: MiAgendaService,
    private galeriaImagenesService: GaleriaImagenesService
  ) { }

  ngOnInit(): void {
    this.revisarDispositivo();
    this.modo = this.leerModoGuardado();
    this.prepararImagenes();
  }

  /**
   * Cambio de estudiante o de fecha: se muestra lo guardado si lo hay.
   * Cambio de versión: se consulta de nuevo. Al cambiar de estudiante la
   * búsqueda se limpia, porque era sobre el día de otro niño.
   */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['idEstudiante']) {
      this.busqueda = '';
    }

    if (!this.idEstudiante || !this.fecha) {
      this.limpiarAgenda();
      return;
    }

    const refrescar = !!changes['version'] && !changes['version'].firstChange;
    if (refrescar || changes['idEstudiante'] || changes['fecha']) {
      this.cargarAgenda(refrescar);
    }
  }

  @HostListener('window:resize')
  onResize(): void {
    this.revisarDispositivo();
  }

  private revisarDispositivo(): void {
    this.isMobile = window.innerWidth <= 768;
  }

  /**
   * Las fotos de las galerías se sirven con un token efímero y hay que
   * pedirlo antes de pintarlas, porque obtenerUrlImagen es síncrona. Sin
   * esto las miniaturas salen rotas.
   */
  private prepararImagenes(): void {
    this.galeriaImagenesService.inicializarTokenImagenes().subscribe({
      error: (error) => console.error('Error al preparar las imágenes:', error)
    });
  }

  // ---------------------------------------------------------------------
  // Agenda
  // ---------------------------------------------------------------------

  /**
   * @param forzar Ignora lo guardado y consulta el backend (botón refrescar).
   */
  cargarAgenda(forzar: boolean = false): void {
    if (!this.idEstudiante || !this.fecha) return;

    const idEstudiante = this.idEstudiante;
    this.eventoAbierto = null;
    this.eventoFotos = null;
    this.fotoAbierta = null;

    const clave = idEstudiante + '|' + this.fecha;
    const guardado = forzar ? undefined : this.diasConsultados.get(clave);
    if (guardado) {
      this.aplicarAgenda(guardado);
      this.cargando = false;
      return;
    }

    this.cargando = true;

    this.miAgendaService.obtenerDia(idEstudiante, this.fecha).subscribe({
      next: (response: any) => {
        const datos = response.body as AgendaDia;

        // Si mientras llegaba la respuesta se cambió de niño o de día, esta
        // ya no es la que se está mirando: se guarda pero no se pinta.
        this.guardarDia(clave, datos);
        if (clave !== this.idEstudiante + '|' + this.fecha) return;

        this.aplicarAgenda(datos);
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error al cargar la agenda:', error);
        if (clave !== this.idEstudiante + '|' + this.fecha) return;

        this.limpiarAgenda();
        this.cargando = false;

        const mensaje = error?.status === 404
          ? 'No se encontró el estudiante'
          : 'No se pudo cargar la agenda. Intenta de nuevo.';

        Swal.fire({
          title: 'Ups',
          text: mensaje,
          icon: 'error',
          confirmButtonText: 'Entendido',
          confirmButtonColor: '#dc3545'
        });
      }
    });
  }

  /**
   * Pinta un día, venga del backend o de lo guardado.
   *
   * Una fuente caída no debe dejar sin agenda, pero tampoco puede pasar en
   * silencio: se avisa y el resto del día se muestra.
   */
  private aplicarAgenda(datos: AgendaDia): void {
    this.agenda = datos;
    this.estudianteSeleccionado = datos.estudiante || null;
    this.eventos = datos.eventos || [];
    this.fuentes = datos.fuentes || [];
    this.aplicarBusqueda();

    if (datos.fuentes_con_error && datos.fuentes_con_error.length > 0) {
      console.warn('Mi Agenda - fuentes con error:', datos.fuentes_con_error);
    }
  }

  /**
   * Se guarda para no volver a pedirlo, salvo que alguna fuente haya
   * fallado: en ese caso la próxima visita debe consultar de nuevo.
   */
  private guardarDia(clave: string, datos: AgendaDia): void {
    const huboError = !!datos.fuentes_con_error && datos.fuentes_con_error.length > 0;
    if (huboError) return;
    this.diasConsultados.set(clave, datos);
  }

  /** Sin estudiante o sin día que mostrar. */
  private limpiarAgenda(): void {
    this.agenda = null;
    this.estudianteSeleccionado = null;
    this.eventos = [];
    this.fuentes = [];
    this.eventosVisibles = [];
    this.fuentesVisibles = [];
    this.eventoAbierto = null;
    this.eventoFotos = null;
    this.fotoAbierta = null;
  }

  /** Texto del día, para el título de la portada del libro. */
  fechaLegible(): string {
    return fechaLegible(this.fecha);
  }

  // ---------------------------------------------------------------------
  // Buscador
  // ---------------------------------------------------------------------

  cambiarBusqueda(valor: string): void {
    this.busqueda = valor;
    this.aplicarBusqueda();
  }

  limpiarBusqueda(): void {
    this.busqueda = '';
    this.aplicarBusqueda();
  }

  /**
   * Filtra en memoria, sin volver al backend: los eventos del día ya están
   * cargados y así el resultado sale mientras se escribe.
   *
   * Los contadores de las fuentes se recalculan sobre lo filtrado para que
   * las pestañas no prometan eventos que el filtro ya quitó.
   */
  private aplicarBusqueda(): void {
    const texto = this.normalizar(this.busqueda);

    this.eventosVisibles = texto === ''
      ? [...this.eventos]
      : this.eventos.filter(e => this.normalizar(
          [e.titulo, e.detalle, e.pie, e.etiqueta, e.nombre_fuente].join(' ')
        ).includes(texto));

    this.fuentesVisibles = this.fuentes
      .map(f => ({
        ...f,
        total: this.eventosVisibles.filter(e => e.clave === f.clave).length
      }))
      .filter(f => f.total > 0);
  }

  /**
   * Quita tildes y pasa a minúsculas para que "numero" encuentre "número".
   * Escribir con tildes en el celular es incómodo y nadie lo hace al buscar.
   */
  private normalizar(texto: string): string {
    return (texto || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  // ---------------------------------------------------------------------
  // Vista
  // ---------------------------------------------------------------------

  cambiarModo(modo: ModoVista): void {
    this.modo = modo;
    this.guardarModo(modo);
  }

  /**
   * La vista escogida se recuerda entre sesiones para no tener que volver a
   * elegirla cada vez que se entra.
   */
  private leerModoGuardado(): ModoVista {
    try {
      const guardado = localStorage.getItem(CLAVE_MODO_VISTA) as ModoVista;
      return this.modos.some(m => m.id === guardado) ? guardado : 'camino';
    } catch (error) {
      console.warn('No se pudo leer la vista guardada:', error);
      return 'camino';
    }
  }

  private guardarModo(modo: ModoVista): void {
    try {
      localStorage.setItem(CLAVE_MODO_VISTA, modo);
    } catch (error) {
      console.warn('No se pudo guardar la vista:', error);
    }
  }

  // ---------------------------------------------------------------------
  // Detalle y fotos
  // ---------------------------------------------------------------------

  /**
   * El detalle ya no se abre para todo: las tarjetas muestran por sí solas
   * la información del evento y abrir una ventana encima para repetir lo
   * mismo era un paso de más. Quedan dos casos: las galerías, por el mosaico
   * de fotos, y las actividades extensas, cuya descripción y observaciones
   * no caben en la tarjeta del camino ni en la de las listas.
   */
  abrirEvento(evento: EventoAgenda): void {
    if (!tieneDetalle(evento)) return;
    this.eventoAbierto = evento;
  }

  cerrarEvento(): void {
    this.eventoAbierto = null;
  }

  /** Fotos que se le pasan al visor. */
  fotosDelVisor(): FotoAgenda[] {
    return fotosDe(this.eventoFotos);
  }

  /** Desde el detalle: la foto pertenece al evento que está abierto. */
  abrirFoto(indice: number): void {
    this.eventoFotos = this.eventoAbierto;
    this.fotoAbierta = indice;
  }

  /** Desde el libro: la foto viene con su evento, sin detalle de por medio. */
  abrirFotoDeEvento(datos: { evento: EventoAgenda; indice: number }): void {
    this.eventoFotos = datos.evento;
    this.fotoAbierta = datos.indice;
  }

  cerrarFoto(): void {
    this.fotoAbierta = null;
    this.eventoFotos = null;
  }


}
