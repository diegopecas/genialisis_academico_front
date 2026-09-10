import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import Swal from 'sweetalert2';

import { HeaderComponent } from '../../../../common/header/header.component';
import { MiAgendaService } from '../../../../services/mi-agenda.service';
import { GaleriaImagenesService } from '../../../../services/galeria-imagenes.service';

import { MiAgendaVistaRendererComponent } from './mi-agenda-vista-renderer.component';
import { AgendaCabeceraComponent } from './componentes/agenda-cabecera/agenda-cabecera.component';
import { AgendaDetalleEventoComponent } from './componentes/agenda-detalle-evento/agenda-detalle-evento.component';
import { AgendaVisorFotoComponent } from './componentes/agenda-visor-foto/agenda-visor-foto.component';
import { hoyLocal, fechaLegible } from './mi-agenda.fechas';
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
 * El estudiante llega por la ruta desde el listado de Agenda de
 * Estudiantes. Los datos del niño (nombre y grupo) salen de la misma
 * respuesta de la agenda, así que no hace falta otra consulta.
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
    HeaderComponent,
    MiAgendaVistaRendererComponent,
    AgendaCabeceraComponent,
    AgendaDetalleEventoComponent,
    AgendaVisorFotoComponent,
  ],
  templateUrl: './agenda-estudiante.component.html',
  styleUrl: './agenda-estudiante.component.scss'
})
export class AgendaEstudianteComponent implements OnInit {

  titulo = 'Agenda del Estudiante';

  idEstudiante: string = '';
  /** Nombre y grupo del niño, tal como los manda el backend en la agenda. */
  estudianteSeleccionado: any = null;

  agenda: AgendaDia | null = null;
  /** Todos los eventos del día, tal como llegaron del backend. */
  eventos: EventoAgenda[] = [];
  /** Los que se están pintando: eventos filtrados por el buscador. */
  eventosVisibles: EventoAgenda[] = [];
  fuentes: FuenteAgenda[] = [];
  /** Fuentes recalculadas sobre lo filtrado, para que los contadores cuadren. */
  fuentesVisibles: FuenteAgenda[] = [];

  busqueda: string = '';

  /** Fecha consultada, en Y-m-d. */
  fecha: string = '';
  /** Tope inferior: la fecha de ingreso del estudiante. */
  fechaMinima: string = '';

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
    private galeriaImagenesService: GaleriaImagenesService,
    private route: ActivatedRoute
  ) { }

  ngOnInit(): void {
    this.revisarDispositivo();
    this.fecha = hoyLocal();
    this.modo = this.leerModoGuardado();
    this.prepararImagenes();
    this.idEstudiante = this.route.snapshot.paramMap.get('id') || '';
    this.cargarAgenda();
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

  cargarAgenda(): void {
    if (!this.idEstudiante) return;

    this.cargando = true;
    this.eventoAbierto = null;
    this.eventoFotos = null;
    this.fotoAbierta = null;

    this.miAgendaService.obtenerDia(this.idEstudiante, this.fecha).subscribe({
      next: (response: any) => {
        const datos = response.body as AgendaDia;

        this.agenda = datos;
        this.estudianteSeleccionado = datos.estudiante || null;
        this.titulo = datos.estudiante?.nombre_completo || 'Agenda del Estudiante';
        this.eventos = datos.eventos || [];
        this.fuentes = datos.fuentes || [];
        this.fechaMinima = datos.fecha_minima || '';
        this.aplicarBusqueda();

        // Una fuente caída no debe dejar sin agenda, pero tampoco puede
        // pasar en silencio: se avisa y el resto del día se muestra.
        if (datos.fuentes_con_error && datos.fuentes_con_error.length > 0) {
          console.warn('Mi Agenda - fuentes con error:', datos.fuentes_con_error);
        }

        this.cargando = false;
      },
      error: (error) => {
        console.error('Error al cargar la agenda:', error);
        this.eventos = [];
        this.fuentes = [];
        this.eventosVisibles = [];
        this.fuentesVisibles = [];
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

  /** La cabecera ya validó los topes; aquí solo se recarga el día. */
  cambiarFecha(fecha: string): void {
    if (!fecha || fecha === this.fecha) return;
    this.fecha = fecha;
    this.cargarAgenda();
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
