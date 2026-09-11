import { Component, EventEmitter, Input, Output, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EventoAgenda, esActividadExtensa, estaRestringido, tieneDetalle, descripcionHtml } from '../mi-agenda.types';
import { AgendaTarjetaExtrasComponent } from '../componentes/agenda-tarjeta-extras/agenda-tarjeta-extras.component';

/**
 * Vista Camino: una ruta vertical con las paradas del día en orden.
 *
 * Es la que mejor funciona en móvil porque solo hace scroll: las paradas
 * se alternan a lado y lado de una línea central y no necesitan gestos.
 */
@Component({
  selector: 'app-mi-agenda-camino',
  standalone: true,
  imports: [CommonModule, AgendaTarjetaExtrasComponent],
  template: `
    <div class="camino" [class.movil]="isMobile">

      <div class="camino-hito" *ngIf="eventos.length > 0">
        <span class="hito-bandera">🚩</span>
        <span class="hito-texto">Empieza el día</span>
      </div>

      <!-- El SVG y las paradas van en su propio bloque para que la curva
           empiece y termine exactamente donde estan las banderas. Antes el
           SVG cubria tambien los hitos y arriba la curva ya se habia
           desviado cuando llegaba a la altura de la bandera. -->
      <div class="camino-recorrido">
      <svg class="camino-curva" [attr.viewBox]="'0 0 100 ' + altoCurva" preserveAspectRatio="none" aria-hidden="true">
        <path [attr.d]="trazo" fill="none" stroke="url(#degradadoCamino)" stroke-width="2.5"
              stroke-linecap="round" stroke-dasharray="0.1 6"
              vector-effect="non-scaling-stroke" />
        <defs>
          <linearGradient id="degradadoCamino" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#a29bfe" />
            <stop offset="50%" stop-color="#74b9ff" />
            <stop offset="100%" stop-color="#55efc4" />
          </linearGradient>
        </defs>
      </svg>

      <div
        *ngFor="let evento of eventos; let i = index; trackBy: trackById"
        class="parada"
        [class.izquierda]="i % 2 === 0"
        [class.derecha]="i % 2 !== 0"
        [class.con-fotos]="abreDetalle(evento)"
        [class.restringido]="restringido(evento)"
        (click)="alTocarParada(evento)"
      >
        <div class="parada-punto" [style.border-color]="evento.color">
          <span class="parada-icono">{{ evento.icono }}</span>
        </div>

        <div class="parada-tarjeta" [style.border-left-color]="evento.color">
          <div class="parada-cabecera">
            <span class="parada-hora" *ngIf="evento.hora">{{ evento.hora }}</span>
            <span class="parada-fuente" [style.background]="evento.color">{{ evento.nombre_fuente }}</span>
          </div>

          <!-- El valor va pegado al título: en un pago o una cuenta es el
               dato que el papá busca primero, y abajo con el resto de las
               etiquetas se perdía. -->
          <div class="parada-titulo-fila">
            <h4 class="parada-titulo">{{ evento.titulo }}</h4>
            <span class="parada-valor" *ngIf="evento.valor !== null">
              {{ evento.valor | currency:'COP':'symbol-narrow':'1.0-0' }}
            </span>
          </div>

          <!-- De una actividad extensa la descripción no se pinta aquí: se
               lee en el detalle, tras el "Ver más". -->
          <ng-container *ngIf="evento.detalle && !resumir(evento)">
            <div class="parada-detalle detalle-html" *ngIf="detalleHtml(evento) as html; else detalleTexto" [innerHTML]="html"></div>
            <ng-template #detalleTexto><p class="parada-detalle">{{ evento.detalle }}</p></ng-template>
          </ng-container>

          <!-- Ítems, calificaciones y acciones. Van compactas: la tarjeta
               ocupa media columna. -->
          <app-agenda-tarjeta-extras
            [evento]="evento"
            [compacto]="true"
            [resumido]="true"
            (ampliar)="eventoClick.emit(evento)"
          ></app-agenda-tarjeta-extras>

          <div class="parada-pie" *ngIf="evento.etiqueta">
            <span class="parada-etiqueta">{{ evento.etiqueta }}</span>
          </div>

          <small class="parada-autor" *ngIf="evento.pie">{{ evento.pie }}</small>
        </div>
      </div>
      </div>

      <div class="camino-hito" *ngIf="eventos.length > 0">
        <span class="hito-bandera">🏁</span>
        <span class="hito-texto">Fin del día</span>
      </div>
    </div>
  `,
  styles: [`
    .camino {
      position: relative;
      padding: 1rem 0 2rem;
      width: 100%;
    }

    /* La curva se dibuja en SVG y se estira a todo el alto del camino. Con
       preserveAspectRatio="none" el ancho se adapta al contenedor, asi que
       la misma curva sirve en escritorio y en movil.

       Ese estiramiento es tambien lo que reventaba los puntos: el viewBox
       (100 de ancho por 10 unidades por parada) se dibuja a un tamano muy
       distinto en X y en Y, y el trazo se deformaba con el, convirtiendo
       cada punto en un globo enorme. El vector-effect="non-scaling-stroke"
       del path deja el grosor y el patron de puntos en pixeles de pantalla,
       asi que salen diminutos y parejos sin importar cuantas paradas haya. */
    .camino-curva {
      position: absolute;
      left: 0; top: 0;
      width: 100%; height: 100%;
      pointer-events: none;
    }

    /* El recorrido: aqui vive la curva y las paradas. La curva arranca en
       el centro del borde superior y termina en el centro del inferior,
       que es justo donde quedan las banderas de arriba y de abajo. */
    .camino-recorrido {
      position: relative;
      width: 100%;
    }

    /* Banderas de salida y de meta, centradas sobre la linea. */
    .camino-hito {
      position: relative;
      z-index: 2;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.15rem;
    }

    .hito-bandera {
      font-size: 1.5rem;
      line-height: 1;
      background: #fff;
      border-radius: 50%;
      width: 40px; height: 40px;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 2px 10px rgba(0,0,0,0.14);
    }
    .hito-texto {
      font-size: 0.7rem;
      color: #95a5a6;
      font-style: italic;
    }

    .parada {
      position: relative;
      width: 50%;
      padding: 0 2.5rem 1.75rem 0;
      /* Solo las galerias abren algo al tocar la tarjeta: el resto ya
         muestra toda su informacion ahi mismo. */
      cursor: default;
      /* Sin min-width la columna flex/contenido largo empuja la tarjeta y
         el texto se sale por el borde. */
      min-width: 0;
    }
    .parada.derecha {
      margin-left: 50%;
      padding: 0 0 1.75rem 2.5rem;
    }

    .parada-punto {
      position: absolute;
      top: 0.4rem;
      width: 40px; height: 40px;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      /* Disco blanco con anillo de color: el emoji siempre se lee, sin
         importar que tan oscuro o claro sea el color de la fuente. */
      background: #fff;
      border: 3px solid #ccc;
      box-shadow: 0 2px 10px rgba(0,0,0,0.16);
      z-index: 2;
    }
    .parada.izquierda .parada-punto { right: -19px; }
    .parada.derecha .parada-punto { left: -19px; }

    .parada-icono { font-size: 1.15rem; line-height: 1; }

    .parada-tarjeta {
      background: #fff;
      border-radius: 12px;
      border-left: 4px solid #ccc;
      box-shadow: 0 2px 10px rgba(0,0,0,0.08);
      padding: 0.85rem 1rem;
      transition: transform 0.15s ease, box-shadow 0.15s ease;
      /* Nada de lo que va adentro puede salirse del borde: una palabra
         larga o una calificacion de texto largo partia la caja. */
      min-width: 0;
      overflow: hidden;
      overflow-wrap: break-word;
    }
    .parada.con-fotos { cursor: pointer; }
    .parada.con-fotos:hover .parada-tarjeta {
      transform: translateY(-2px);
      box-shadow: 0 6px 18px rgba(0,0,0,0.14);
    }

    .parada-cabecera {
      display: flex; align-items: center; gap: 0.5rem;
      flex-wrap: wrap;
      margin-bottom: 0.35rem;
    }
    .parada-hora {
      font-weight: 700;
      font-size: 0.95rem;
      color: #2d3436;
    }
    .parada-fuente {
      color: #fff;
      font-size: 0.68rem;
      padding: 0.12rem 0.5rem;
      border-radius: 10px;
      font-weight: 600;
    }

    .parada-titulo-fila {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 0.5rem;
      margin-bottom: 0.3rem;
      min-width: 0;
    }
    .parada-titulo {
      margin: 0;
      font-size: 1rem;
      color: #2d3436;
      min-width: 0;
    }
    .parada-detalle {
      margin: 0;
      font-size: 0.87rem;
      color: #636e72;
      line-height: 1.35;
      /* Respeta los renglones de las descripciones en texto plano. */
      white-space: pre-line;
    }
    /* Descripción de actividad con el HTML del editor. Sus etiquetas no
       llevan los atributos del componente: solo se alcanzan con ::ng-deep. */
    .detalle-html { white-space: normal; }
    .detalle-html ::ng-deep p { margin: 0 0 0.3rem; }
    .detalle-html ::ng-deep p:last-child { margin-bottom: 0; }
    .detalle-html ::ng-deep ul,
    .detalle-html ::ng-deep ol { margin: 0 0 0.3rem; padding-left: 1.1rem; }
    .detalle-html ::ng-deep img { max-width: 100%; height: auto; }

    .parada-pie {
      display: flex; align-items: center; gap: 0.5rem;
      flex-wrap: wrap;
      margin-top: 0.4rem;
    }
    .parada-etiqueta {
      font-size: 0.72rem;
      background: #f1f2f6;
      color: #57606f;
      padding: 0.12rem 0.5rem;
      border-radius: 8px;
    }
    .parada-valor {
      font-weight: 700;
      color: #27ae60;
      font-size: 0.95rem;
      white-space: nowrap;
      flex-shrink: 0;
    }

    .parada-autor {
      display: block;
      margin-top: 0.4rem;
      font-size: 0.74rem;
      color: #95a5a6;
      font-style: italic;
    }



    /* Pago o cobro sin permiso: solo avisa que hubo un movimiento. */
    .parada.restringido .parada-tarjeta,
    .parada.restringido .parada-punto { opacity: 0.55; box-shadow: none; }
    .parada.restringido .parada-titulo {
      font-weight: 500;
      font-style: italic;
      color: #95a5a6;
    }

    /* En móvil se conserva el serpenteo: es lo que lo diferencia de la
       vista de listas. Solo se aprietan los márgenes y se achica la
       tarjeta para que quepan las dos columnas. */
    @media (max-width: 768px) {
      .parada { padding: 0 1.5rem 1.4rem 0; }
      .parada.derecha { padding: 0 0 1.4rem 1.5rem; }

      .parada-punto { width: 32px; height: 32px; top: 0.3rem; }
      .parada.izquierda .parada-punto { right: -16px; }
      .parada.derecha .parada-punto { left: -16px; }
      .parada-icono { font-size: 0.95rem; }

      .parada-tarjeta { padding: 0.6rem 0.7rem; border-radius: 10px; }
      .parada-titulo { font-size: 0.87rem; }
      .parada-detalle { font-size: 0.78rem; }
      .parada-hora { font-size: 0.82rem; }
      .parada-fuente { font-size: 0.6rem; padding: 0.1rem 0.35rem; }
      .parada-autor { font-size: 0.68rem; }

      .hito-bandera { width: 34px; height: 34px; font-size: 1.25rem; }
      .hito-texto { font-size: 0.65rem; }
    }
  `],
})
export class MiAgendaCaminoComponent implements OnChanges {
  @Input() eventos: EventoAgenda[] = [];
  @Input() isMobile: boolean = false;

  @Output() eventoClick = new EventEmitter<EventoAgenda>();

  /** Alto del viewBox del SVG. Crece con la cantidad de paradas. */
  public altoCurva = 100;
  /** Atributo `d` del path de la curva. */
  public trazo = '';

  /** Unidades de viewBox que ocupa cada parada. */
  private readonly ALTO_PARADA = 10;

  ngOnChanges(): void {
    this.construirTrazo();
  }

  /** El evento tiene algo más que mostrar al abrir el detalle. */
  abreDetalle(evento: EventoAgenda): boolean {
    return tieneDetalle(evento);
  }

  /** Pago o cobro recortado por falta de permiso: se pinta tenue. */
  restringido(evento: EventoAgenda): boolean {
    return estaRestringido(evento);
  }

  /** La actividad extensa se resume: el texto largo queda en el detalle. */
  resumir(evento: EventoAgenda): boolean {
    return esActividadExtensa(evento);
  }

  alTocarParada(evento: EventoAgenda): void {
    if (!this.abreDetalle(evento)) return;
    this.eventoClick.emit(evento);
  }

  /**
   * Arma una curva que serpentea entre las paradas.
   *
   * Se dibuja en el sistema de coordenadas del viewBox (0-100 de ancho) y
   * el SVG la estira al tamaño real, así que no hay que medir el DOM ni
   * recalcular nada al cambiar el tamaño de la pantalla.
   */
  private construirTrazo(): void {
    const paradas = this.eventos.length;

    if (paradas === 0) {
      this.trazo = '';
      this.altoCurva = 100;
      return;
    }

    this.altoCurva = paradas * this.ALTO_PARADA;

    // Empieza en el centro y se va desviando a cada lado con curvas suaves,
    // pasando por el centro entre parada y parada.
    const tramos: string[] = ['M 50 0'];

    for (let i = 0; i < paradas; i++) {
      const desvio = i % 2 === 0 ? 28 : 72;
      const inicio = i * this.ALTO_PARADA;
      const medio = inicio + this.ALTO_PARADA / 2;
      const fin = inicio + this.ALTO_PARADA;

      tramos.push(`Q ${desvio} ${medio}, 50 ${fin}`);
    }

    this.trazo = tramos.join(' ');
  }

  trackById(index: number, evento: EventoAgenda): string {
    return evento.id;
  }

  /** HTML de la descripción de una actividad, o null si es texto plano. */
  detalleHtml(evento: EventoAgenda): string | null {
    return descripcionHtml(evento);
  }
}
