import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

import { GaleriaImagenesService } from '../../../../../services/galeria-imagenes.service';
import { AgendaTarjetaExtrasComponent } from '../componentes/agenda-tarjeta-extras/agenda-tarjeta-extras.component';
import { EventoAgenda, FotoAgenda, estaRestringido, fotosDe, descripcionHtml } from '../mi-agenda.types';

/** Una hoja del libro: la del índice o la de un evento. */
interface HojaLibro {
  tipo: 'indice' | 'evento';
  evento?: EventoAgenda;
}

/** Una entrada del índice: una fuente y en qué hoja empieza. */
interface EntradaIndice {
  clave: string;
  nombre: string;
  icono: string;
  total: number;
  pagina: number;
}

/**
 * Vista Libro: el día como un cuento que se hojea.
 *
 * La portada quedó limpia, solo con el nombre del niño y el día. El índice
 * dejó de vivir apretado dentro de ella y pasó a ser la primera hoja del
 * libro, que es donde uno lo espera y donde tiene espacio para respirar.
 *
 * La hoja muestra toda la información del evento (ítems, calificaciones,
 * descargas del pago, "Ver más"). El único caso que abre otra ventana son
 * las galerías, y ahí las fotos van en la misma hoja: tocar una abre el
 * visor a pantalla completa, sin pasar por el detalle.
 */
@Component({
  selector: 'app-mi-agenda-libro',
  standalone: true,
  imports: [CommonModule, AgendaTarjetaExtrasComponent],
  template: `
    <div class="libro-container">

      <!-- ============ PORTADA ============ -->
      <div class="libro-portada" *ngIf="!abierto" (click)="abrir()">
        <div class="portada-lomo"></div>

        <div class="portada-cuerpo">
          <span class="portada-adorno">✦</span>
          <h2 class="portada-titulo">{{ titulo }}</h2>
          <p class="portada-subtitulo">{{ subtitulo }}</p>
          <p class="portada-conteo">
            {{ eventos.length }} {{ eventos.length === 1 ? 'momento' : 'momentos' }}
          </p>
          <button class="portada-abrir" type="button">Abrir la agenda ✨</button>
        </div>
      </div>

      <!-- ============ LIBRO ABIERTO ============ -->
      <div class="libro" *ngIf="abierto">

        <div class="libro-controles">
          <button
            class="libro-btn"
            type="button"
            [disabled]="pagina === 0"
            (click)="anterior()"
            title="Hoja anterior"
          >‹</button>

          <div class="libro-centro">
            <span class="libro-contador">{{ pagina + 1 }} / {{ hojas.length }}</span>
            <div class="libro-atajos">
              <button
                type="button"
                class="libro-atajo"
                [class.activo]="pagina === 0"
                (click)="irAlIndice()"
                title="Ir al índice"
              >☰ Índice</button>
              <button
                type="button"
                class="libro-atajo"
                (click)="cerrarLibro()"
                title="Cerrar el libro"
              >📕 Cerrar</button>
            </div>
          </div>

          <button
            class="libro-btn"
            type="button"
            [disabled]="pagina >= hojas.length - 1"
            (click)="siguiente()"
            title="Hoja siguiente"
          >›</button>
        </div>

        <div class="libro-marco">
          <div class="libro-lomo"></div>
          <div class="libro-canto"></div>

          <div
            class="libro-hojas"
            (touchstart)="alTocar($event)"
            (touchend)="alSoltar($event)"
          >
            <div
              *ngFor="let hoja of hojas; let i = index; trackBy: trackByHoja"
              class="hoja"
              [class.pasada]="i < pagina"
              [class.actual]="i === pagina"
              [style.z-index]="hojas.length - i"
              (click)="alTocarHoja($event, i)"
            >
              <!-- ---------- Hoja del índice ---------- -->
              <div class="hoja-frente hoja-indice" *ngIf="hoja.tipo === 'indice'">
                <h3 class="indice-titulo">Índice del día</h3>
                <p class="indice-ayuda">Toca una fila para saltar a esa hoja</p>

                <ul class="indice">
                  <li
                    *ngFor="let entrada of indice; trackBy: trackByClave"
                    (click)="irAHoja(entrada.pagina, $event)"
                  >
                    <span class="indice-icono">{{ entrada.icono }}</span>
                    <span class="indice-nombre">{{ entrada.nombre }}</span>
                    <span class="indice-puntos"></span>
                    <span class="indice-hoja">{{ entrada.pagina + 1 }}</span>
                  </li>
                </ul>

                <div class="hoja-pie-acciones">
                  <span class="hoja-numero">{{ i + 1 }}</span>
                </div>
              </div>

              <!-- ---------- Hoja de un evento ---------- -->
              <div
                class="hoja-frente"
                *ngIf="hoja.tipo === 'evento' && hoja.evento as evento"
                [class.restringido]="restringido(evento)"
                [style.border-top-color]="evento.color"
              >
                <div class="hoja-cabecera">
                  <span class="hoja-icono" [style.background]="evento.color">{{ evento.icono }}</span>
                  <span class="hoja-fuente" [style.color]="evento.color">{{ evento.nombre_fuente }}</span>
                  <span class="hoja-hora" *ngIf="evento.hora">{{ evento.hora }}</span>
                </div>

                <!-- El valor va pegado al título: en un pago o una cuenta
                     es el dato que el papá busca primero, y al pie de la
                     hoja se perdía entre las demás etiquetas. -->
                <div class="hoja-titulo-fila">
                  <h3 class="hoja-titulo">{{ evento.titulo }}</h3>
                  <span class="hoja-valor" *ngIf="evento.valor !== null">
                    {{ evento.valor | currency:'COP':'symbol-narrow':'1.0-0' }}
                  </span>
                </div>

                <div class="hoja-scroll">
                  <ng-container *ngIf="evento.detalle">
                    <div class="hoja-detalle detalle-html" *ngIf="detalleHtml(evento) as html; else detalleTexto" [innerHTML]="html"></div>
                    <ng-template #detalleTexto><p class="hoja-detalle">{{ evento.detalle }}</p></ng-template>
                  </ng-container>

                  <!-- Fotos de la galería, dentro de la misma hoja -->
                  <div class="hoja-fotos" *ngIf="fotos(evento).length > 0">
                    <div
                      class="hoja-foto"
                      *ngFor="let foto of fotos(evento); let f = index; trackBy: trackByGuid"
                      (click)="abrirFoto(evento, f, $event)"
                    >
                      <img [src]="urlThumb(foto)" [alt]="foto.alt || evento.titulo" loading="lazy" />
                    </div>
                  </div>

                  <app-agenda-tarjeta-extras
                    [evento]="evento"
                    [compacto]="true"
                  ></app-agenda-tarjeta-extras>
                </div>

                <div class="hoja-extra" *ngIf="evento.etiqueta">
                  <span class="hoja-etiqueta">{{ evento.etiqueta }}</span>
                </div>

                <small class="hoja-autor" *ngIf="evento.pie">{{ evento.pie }}</small>

                <div class="hoja-pie-acciones">
                  <span class="hoja-numero">{{ i + 1 }}</span>
                </div>

                <!-- La hoja derecha avanza. Se insinúa al pasar el mouse;
                     en móvil el texto de ayuda de abajo dice lo mismo. -->
                <span class="zona zona-adelante" *ngIf="i === pagina && pagina < hojas.length - 1">›</span>
              </div>

              <!-- Cara de atrás: es la hoja izquierda del libro abierto y
                   tocarla devuelve una página. -->
              <div class="hoja-reverso">
                <span class="reverso-flecha" *ngIf="i === 0 && pagina > 0">‹</span>
              </div>
            </div>
          </div>
        </div>

        <p class="libro-ayuda">
          {{ isMobile
              ? 'Desliza, o toca la hoja izquierda para volver y la derecha para seguir'
              : 'Toca la hoja de la izquierda para volver y la de la derecha para seguir' }}
        </p>
      </div>
    </div>
  `,
  styles: [`
    .libro-container {
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 1rem 0.5rem 2rem;
    }

    /* ---------------------------------------------------------------- */
    /* Portada                                                          */
    /* ---------------------------------------------------------------- */

    /* Angosta a proposito: un libro se reconoce por la proporcion y por el
       lomo, no por el tamano. Grande parecia una tarjeta gigante. */
    .libro-portada {
      position: relative;
      width: 100%; max-width: 320px;
      aspect-ratio: 3 / 4;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 45%, #f093fb 100%);
      color: #fff;
      border-radius: 4px 12px 12px 4px;
      box-shadow:
        0 14px 34px rgba(0,0,0,0.32),
        inset -1px 0 0 rgba(255,255,255,0.25);
      overflow: hidden;
      cursor: pointer;
    }

    /* Lomo: la franja oscura del canto izquierdo. Es lo que hace que se
       lea como libro y no como tarjeta. */
    .portada-lomo,
    .libro-lomo {
      position: absolute;
      left: 0; top: 0; bottom: 0;
      width: 16px;
      background: linear-gradient(
        to right,
        rgba(0,0,0,0.34) 0%,
        rgba(0,0,0,0.16) 45%,
        rgba(255,255,255,0.16) 72%,
        rgba(0,0,0,0.10) 100%
      );
      z-index: 5;
      pointer-events: none;
    }

    .portada-cuerpo {
      position: absolute;
      inset: 0;
      padding: 2rem 1.4rem 1.8rem 2.1rem;
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      gap: 0.6rem;
      text-align: center;
    }

    .portada-adorno { font-size: 1.2rem; opacity: 0.65; }
    .portada-titulo { font-family: Georgia, serif; font-size: 1.5rem; margin: 0; line-height: 1.25; }
    .portada-subtitulo { font-family: Georgia, serif; font-style: italic; opacity: 0.85; margin: 0; font-size: 0.88rem; }
    .portada-conteo { font-size: 0.82rem; opacity: 0.75; margin: 0; }

    .portada-abrir {
      margin-top: 0.6rem;
      background: #fff; color: #764ba2;
      border: none; padding: 0.6rem 1.2rem;
      border-radius: 24px; font-weight: bold;
      font-size: 0.88rem;
      cursor: pointer;
    }

    /* ---------------------------------------------------------------- */
    /* Libro abierto                                                     */
    /* ---------------------------------------------------------------- */

    .libro {
      width: 100%; max-width: 340px;
      display: flex; flex-direction: column; gap: 0.7rem;
    }

    .libro-controles {
      display: flex; align-items: center; justify-content: space-between;
      gap: 0.5rem;
      background: linear-gradient(135deg, #667eea, #764ba2);
      padding: 0.45rem 0.6rem;
      border-radius: 12px;
    }
    .libro-btn {
      background: #fff; color: #764ba2;
      border: none;
      width: 34px; height: 34px;
      border-radius: 50%;
      font-size: 1.25rem; font-weight: bold; line-height: 1;
      cursor: pointer;
      flex-shrink: 0;
    }
    .libro-btn:disabled { opacity: 0.35; cursor: not-allowed; }

    .libro-centro {
      flex: 1;
      min-width: 0;
      display: flex; flex-direction: column; align-items: center;
      gap: 0.25rem;
    }
    .libro-contador {
      color: #fff;
      font-family: Georgia, serif;
      font-weight: 600;
      font-size: 0.88rem;
    }

    .libro-atajos { display: flex; gap: 0.3rem; }
    .libro-atajo {
      background: rgba(255,255,255,0.18);
      border: none;
      color: #fff;
      border-radius: 12px;
      padding: 0.15rem 0.55rem;
      font-size: 0.7rem;
      cursor: pointer;
      white-space: nowrap;
      transition: background 0.15s ease;
    }
    .libro-atajo:hover { background: rgba(255,255,255,0.32); }
    .libro-atajo.activo { background: #fff; color: #764ba2; font-weight: 700; }

    /* El marco es el "libro cerrado por debajo": lomo a la izquierda y
       canto de hojas a la derecha. Las hojas se pasan por encima. */
    .libro-marco {
      position: relative;
      width: 100%;
      aspect-ratio: 3 / 4;
      perspective: 1800px;
      background: #e9ecf7;
      border-radius: 4px 12px 12px 4px;
      box-shadow: 0 12px 30px rgba(102,126,234,0.22);
    }

    /* Canto: las hojas que faltan por pasar, apiladas al borde derecho. */
    .libro-canto {
      position: absolute;
      right: -4px; top: 6px; bottom: 6px;
      width: 6px;
      border-radius: 0 6px 6px 0;
      background: repeating-linear-gradient(
        to right,
        #ffffff 0 1px,
        #dfe3f2 1px 2px
      );
      box-shadow: 2px 0 6px rgba(0,0,0,0.12);
      z-index: 1;
      pointer-events: none;
    }

    .libro-hojas {
      position: absolute;
      inset: 0;
      transform-style: preserve-3d;
    }

    .hoja {
      position: absolute; inset: 0;
      transform-style: preserve-3d;
      transform-origin: left center;
      /* Curva tipo libro: arranca lento, se suelta y frena al final. */
      transition: transform 0.75s cubic-bezier(0.55, 0.06, 0.24, 1);
      will-change: transform;

      /* Solo reciben clic las dos hojas que se ven: la actual, a la
         derecha, y las ya pasadas, que quedan volteadas hacia el lomo y
         forman la hoja izquierda del libro. Las que faltan por pasar estan
         debajo de la actual y no deben interceptar nada. */
      pointer-events: none;
    }
    .hoja.actual,
    .hoja.pasada { pointer-events: auto; cursor: pointer; }
    .hoja.pasada { transform: rotateY(-178deg); }

    .hoja-frente, .hoja-reverso {
      position: absolute; inset: 0;
      backface-visibility: hidden;
      border-radius: 4px 12px 12px 4px;
      padding: 1.15rem 1rem 1rem 1.35rem;
      display: flex; flex-direction: column;
      overflow: hidden;
    }

    .hoja-frente {
      background: #ffffff;
      border-top: 7px solid #ccc;
      box-shadow:
        0 6px 24px rgba(102,126,234,0.20),
        inset 14px 0 18px -12px rgba(0,0,0,0.30);
    }

    /* Sombra del doblez pegada al lomo: sin esto la hoja se ve plana. */
    .hoja-frente::before {
      content: '';
      position: absolute;
      left: 0; top: 0; bottom: 0;
      width: 22px;
      background: linear-gradient(to right, rgba(0,0,0,0.14), rgba(0,0,0,0));
      pointer-events: none;
    }

    /* El reverso se nota: papel rayado y tono calido. Antes era casi
       blanco y en escritorio no se apreciaba que la hoja se paso.
       Tambien es la hoja izquierda del libro: tocarla devuelve. */
    .hoja-reverso {
      transform: rotateY(180deg);
      align-items: center;
      justify-content: center;
      background:
        repeating-linear-gradient(
          to bottom,
          rgba(118,75,162,0.09) 0 1px,
          transparent 1px 22px
        ),
        linear-gradient(135deg, #ded9f2, #cfd6ef);
      box-shadow: inset -14px 0 20px -12px rgba(0,0,0,0.35);
    }

    /* ---------------------------------------------------------------- */
    /* Hoja del índice                                                   */
    /* ---------------------------------------------------------------- */

    .hoja-indice { border-top-color: #764ba2; }

    .indice-titulo {
      font-family: Georgia, serif;
      font-size: 1.2rem;
      color: #2d3436;
      margin: 0 0 0.2rem;
      flex-shrink: 0;
    }
    .indice-ayuda {
      font-size: 0.74rem;
      color: #95a5a6;
      font-style: italic;
      margin: 0 0 0.6rem;
      flex-shrink: 0;
    }

    .indice {
      list-style: none;
      margin: 0;
      padding: 0 0.25rem 0 0;
      flex: 1;
      min-height: 0;
      overflow-y: auto;

      /* Scroll discreto: en Firefox con scrollbar-color y en Chrome/Safari
         con el pseudo-elemento. La barra gorda por defecto rompia el
         acabado del libro. */
      scrollbar-width: thin;
      scrollbar-color: #cfd6ef transparent;
    }
    .indice::-webkit-scrollbar { width: 5px; }
    .indice::-webkit-scrollbar-track { background: transparent; }
    .indice::-webkit-scrollbar-thumb { background: #cfd6ef; border-radius: 4px; }

    .indice li {
      display: flex; align-items: center; gap: 0.45rem;
      padding: 0.42rem 0.5rem;
      border-radius: 8px;
      cursor: pointer;
      font-size: 0.85rem;
      color: #57606f;
    }
    .indice li:hover { background: #f4f1ff; color: #2d3436; }

    .indice-icono { font-size: 1rem; flex-shrink: 0; }
    .indice-nombre { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .indice-puntos {
      flex: 1;
      border-bottom: 1px dotted #cfd6ef;
      min-width: 12px;
    }
    .indice-hoja {
      font-weight: 700;
      color: #764ba2;
      flex-shrink: 0;
      font-family: Georgia, serif;
    }

    /* ---------------------------------------------------------------- */
    /* Hoja de un evento                                                 */
    /* ---------------------------------------------------------------- */

    .hoja-cabecera {
      display: flex; align-items: center; gap: 0.45rem;
      flex-wrap: wrap;
      margin-bottom: 0.6rem;
      flex-shrink: 0;
    }
    .hoja-icono {
      font-size: 1.1rem;
      width: 36px; height: 36px;
      border-radius: 50%;
      display: inline-flex; align-items: center; justify-content: center;
      box-shadow: 0 3px 10px rgba(0,0,0,0.18);
      flex-shrink: 0;
    }
    .hoja-fuente { font-size: 0.68rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.03em; }
    .hoja-hora { margin-left: auto; font-weight: 700; color: #2d3436; font-size: 0.85rem; }

    .hoja-titulo-fila {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 0.5rem;
      margin-bottom: 0.45rem;
      min-width: 0;
      flex-shrink: 0;
    }
    .hoja-titulo {
      font-family: Georgia, serif;
      font-size: 1.12rem;
      color: #2d3436;
      margin: 0;
      min-width: 0;
    }

    /* El texto, las fotos y los extras comparten el espacio que sobra y
       hacen scroll juntos: si no, una observacion larga empujaba el pie de
       la hoja fuera de la pagina. */
    .hoja-scroll {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      scrollbar-width: thin;
      scrollbar-color: #cfd6ef transparent;
    }
    .hoja-scroll::-webkit-scrollbar { width: 5px; }
    .hoja-scroll::-webkit-scrollbar-track { background: transparent; }
    .hoja-scroll::-webkit-scrollbar-thumb { background: #cfd6ef; border-radius: 4px; }

    .hoja-detalle {
      font-size: 0.88rem;
      color: #57606f;
      line-height: 1.45;
      margin: 0;
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

    /* Fotos dentro de la hoja: tres por fila, cuadradas. */
    .hoja-fotos {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.3rem;
      margin-top: 0.6rem;
    }
    .hoja-foto {
      aspect-ratio: 1;
      border-radius: 8px;
      overflow: hidden;
      cursor: pointer;
      background: #f1f2f6;
    }
    .hoja-foto img {
      width: 100%; height: 100%;
      object-fit: cover;
      display: block;
      transition: transform 0.25s ease;
    }
    .hoja-foto:hover img { transform: scale(1.08); }

    .hoja-extra {
      display: flex; align-items: center; gap: 0.5rem;
      flex-wrap: wrap;
      margin-top: 0.5rem;
      flex-shrink: 0;
    }
    .hoja-etiqueta {
      font-size: 0.7rem;
      background: #f1f2f6;
      color: #57606f;
      padding: 0.14rem 0.5rem;
      border-radius: 8px;
    }
    .hoja-valor {
      font-weight: 700;
      color: #27ae60;
      font-size: 0.95rem;
      white-space: nowrap;
      flex-shrink: 0;
    }

    .hoja-autor {
      margin-top: 0.4rem;
      font-family: Georgia, serif;
      font-style: italic;
      color: #95a5a6;
      font-size: 0.75rem;
      flex-shrink: 0;
    }

    .hoja-pie-acciones {
      display: flex; align-items: center; justify-content: flex-end;
      margin-top: 0.5rem;
      flex-shrink: 0;
    }

    .hoja-numero {
      font-family: Georgia, serif;
      color: rgba(45, 52, 54, 0.25);
      font-size: 1rem;
    }

    /* Pistas de las zonas de clic. Se insinuan al pasar el mouse; en movil
       el texto de ayuda de abajo explica lo mismo. */
    .zona {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      font-size: 1.8rem;
      color: rgba(118, 75, 162, 0.28);
      opacity: 0;
      transition: opacity 0.2s ease;
      pointer-events: none;
    }
    .zona-adelante { right: 0.5rem; }
    .hoja.actual:hover .zona { opacity: 1; }

    .reverso-flecha {
      font-size: 2.2rem;
      color: rgba(118, 75, 162, 0.30);
      /* La cara esta volteada 180deg; sin esto la flecha sale al reves. */
      transform: scaleX(-1);
      pointer-events: none;
    }

    .libro-ayuda {
      text-align: center;
      font-size: 0.76rem;
      color: #95a5a6;
      margin: 0;
    }

    /* Pago o cobro sin permiso: solo avisa que hubo un movimiento. */
    .hoja-frente.restringido .hoja-cabecera,
    .hoja-frente.restringido .hoja-titulo-fila { opacity: 0.55; }
    .hoja-frente.restringido .hoja-titulo {
      font-weight: 500;
      font-style: italic;
      color: #95a5a6;
    }

    /* ---------------------------------------------------------------- */
    /* Móvil                                                             */
    /* ---------------------------------------------------------------- */

    @media (max-width: 768px) {
      .libro-portada { max-width: 280px; }
      .libro { max-width: 288px; }

      .portada-titulo { font-size: 1.25rem; }
      .portada-cuerpo { padding: 1.5rem 1rem 1.4rem 1.8rem; }

      .hoja-frente, .hoja-reverso { padding: 0.95rem 0.8rem 0.85rem 1.15rem; }
      .hoja-titulo { font-size: 1rem; }
      .hoja-detalle { font-size: 0.82rem; }
      .hoja-icono { width: 32px; height: 32px; font-size: 1rem; }

      .libro-atajo { font-size: 0.66rem; padding: 0.12rem 0.45rem; }
      .libro-btn { width: 30px; height: 30px; font-size: 1.1rem; }
    }

    @media (prefers-reduced-motion: reduce) {
      .hoja { transition: none; }
    }
  `],
})
export class MiAgendaLibroComponent implements OnChanges {
  @Input() eventos: EventoAgenda[] = [];
  @Input() titulo: string = 'Mi Agenda';
  @Input() subtitulo: string = '';
  @Input() isMobile: boolean = false;

  @Output() eventoClick = new EventEmitter<EventoAgenda>();
  /** Foto tocada dentro de una hoja: abre el visor a pantalla completa. */
  @Output() fotoClick = new EventEmitter<{ evento: EventoAgenda; indice: number }>();

  public abierto = false;
  /** Posición dentro de `hojas`. La 0 es siempre el índice. */
  public pagina = 0;

  /** Índice más las hojas de los eventos, en el orden en que se hojean. */
  public hojas: HojaLibro[] = [];

  /** Resumen por fuente, con la hoja donde empieza cada una. */
  public indice: EntradaIndice[] = [];

  /** Coordenada donde empezó el gesto, para detectar el swipe. */
  private inicioX = 0;

  /** Recorrido mínimo en px para contar un deslizamiento como pasar hoja. */
  private readonly MINIMO_SWIPE = 50;


  constructor(private galeriaImagenesService: GaleriaImagenesService) { }

  /**
   * El libro solo se cierra cuando cambia el día.
   *
   * Antes se reiniciaba con cualquier cambio de eventos, y como el buscador
   * de la cabecera filtra el arreglo, el libro se cerraba en cada tecla que
   * escribía el papá. Ahora, si solo cambió el filtro, se intenta quedar en
   * la misma hoja que se estaba leyendo.
   */
  ngOnChanges(cambios: SimpleChanges): void {
    const cambioDia = !!cambios['subtitulo']
      && (cambios['subtitulo'].firstChange
          || cambios['subtitulo'].previousValue !== cambios['subtitulo'].currentValue);

    const idAnterior = this.hojas[this.pagina]?.evento?.id;

    this.construirHojas();
    this.construirIndice();

    if (cambioDia) {
      this.abierto = false;
      this.pagina = 0;
      return;
    }

    if (cambios['eventos']) {
      this.conservarHoja(idAnterior);
    }
  }

  private construirHojas(): void {
    this.hojas = [
      { tipo: 'indice' },
      ...this.eventos.map(evento => ({ tipo: 'evento' as const, evento })),
    ];
  }

  /**
   * Deja la vista en el mismo evento que se estaba leyendo antes de que
   * cambiara la lista. Si ese evento ya no está (lo quitó el filtro), se
   * queda en la hoja más cercana que exista.
   */
  private conservarHoja(idAnterior: string | undefined): void {
    if (!idAnterior) {
      this.pagina = Math.min(this.pagina, this.hojas.length - 1);
      return;
    }

    const nuevoIndice = this.hojas.findIndex(h => h.evento?.id === idAnterior);

    this.pagina = nuevoIndice >= 0
      ? nuevoIndice
      : Math.min(this.pagina, this.hojas.length - 1);
  }

  /**
   * Índice: una entrada por fuente, con cuántas hojas trae y en cuál
   * empieza. Se recorre en el orden en que quedaron los eventos, así que la
   * hoja de inicio es la primera aparición de esa fuente en el día.
   */
  private construirIndice(): void {
    const porClave = new Map<string, EntradaIndice>();

    this.hojas.forEach((hoja, i) => {
      if (hoja.tipo !== 'evento' || !hoja.evento) return;

      const evento = hoja.evento;
      const existente = porClave.get(evento.clave);

      if (existente) {
        existente.total++;
        return;
      }

      porClave.set(evento.clave, {
        clave: evento.clave,
        nombre: evento.nombre_fuente,
        icono: evento.icono,
        total: 1,
        pagina: i
      });
    });

    this.indice = Array.from(porClave.values());
  }

  // -----------------------------------------------------------------
  // Fotos
  // -----------------------------------------------------------------

  fotos(evento: EventoAgenda): FotoAgenda[] {
    return fotosDe(evento);
  }

  urlThumb(foto: FotoAgenda): string {
    return this.galeriaImagenesService.obtenerUrlThumb(foto.guid);
  }

  /** Abre el visor sin pasar por el detalle: la foto ya está en la hoja. */
  abrirFoto(evento: EventoAgenda, indice: number, event: Event): void {
    event.stopPropagation();
    this.fotoClick.emit({ evento, indice });
  }

  // -----------------------------------------------------------------
  // Navegación
  // -----------------------------------------------------------------

  abrir(): void {
    this.abierto = true;
    this.pagina = 0;
  }

  /** Cierra el libro y deja a la vista la portada. */
  cerrarLibro(): void {
    this.abierto = false;
  }

  irAlIndice(): void {
    this.pagina = 0;
  }

  siguiente(): void {
    if (this.pagina < this.hojas.length - 1) {
      this.pagina++;
    }
  }

  anterior(): void {
    if (this.pagina > 0) {
      this.pagina--;
    }
  }

  irAHoja(pagina: number, event?: Event): void {
    event?.stopPropagation();
    this.pagina = pagina;
    this.abierto = true;
  }

  alTocar(event: TouchEvent): void {
    this.inicioX = event.changedTouches[0].clientX;
  }

  alSoltar(event: TouchEvent): void {
    const recorrido = event.changedTouches[0].clientX - this.inicioX;

    if (Math.abs(recorrido) < this.MINIMO_SWIPE) {
      return;
    }

    if (recorrido < 0) {
      this.siguiente();
    } else {
      this.anterior();
    }
  }

  /**
   * Se pasa como en un libro de verdad: la hoja de la derecha (la que se
   * esta leyendo) avanza y la de la izquierda (las ya pasadas, volteadas
   * hacia el lomo) devuelve.
   *
   * Antes la zona de retroceso era el borde izquierdo de la hoja derecha,
   * que es un sitio que a nadie se le ocurre tocar: uno va a la hoja de la
   * izquierda, que es la que se ve al otro lado del lomo.
   */
  alTocarHoja(event: MouseEvent, i: number): void {
    if (i === this.pagina) {
      this.siguiente();
      return;
    }

    if (i < this.pagina) {
      this.anterior();
    }
  }

  trackByHoja(index: number, hoja: HojaLibro): string {
    return hoja.evento?.id || 'indice';
  }

  trackByClave(index: number, entrada: EntradaIndice): string {
    return entrada.clave;
  }

  trackByGuid(index: number, foto: FotoAgenda): string {
    return foto.guid;
  }

  /** Pago o cobro recortado por falta de permiso: se pinta tenue. */
  restringido(evento: EventoAgenda): boolean {
    return estaRestringido(evento);
  }

  /** HTML de la descripción de una actividad, o null si es texto plano. */
  detalleHtml(evento: EventoAgenda): string | null {
    return descripcionHtml(evento);
  }
}
