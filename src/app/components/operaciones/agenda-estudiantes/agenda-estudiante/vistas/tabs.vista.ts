import { Component, ElementRef, EventEmitter, HostListener, Input, Output, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EventoAgenda, FuenteAgenda, esActividadExtensa, estaRestringido, tieneDetalle } from '../mi-agenda.types';
import { AgendaTarjetaExtrasComponent } from '../componentes/agenda-tarjeta-extras/agenda-tarjeta-extras.component';

/**
 * Vista Listas: se filtra por fuente desde un menú de hamburguesa.
 *
 * Antes era una barra de pestañas con scroll horizontal: en móvil tocaba
 * arrastrarla para ver las fuentes del final y nunca se sabía cuántas
 * faltaban. Ahora el botón muestra en qué filtro está parado el papá y el
 * menú despliega todas las fuentes de una, cada una con su icono y su
 * contador.
 */
@Component({
  selector: 'app-mi-agenda-tabs',
  standalone: true,
  imports: [CommonModule, AgendaTarjetaExtrasComponent],
  template: `
    <div class="agenda-tabs">

      <!-- Menú de fuentes -->
      <div class="tabs-menu">
        <button
          type="button"
          class="menu-boton"
          [class.abierto]="menuAbierto"
          (click)="alternarMenu($event)"
        >
          <span class="menu-hamburguesa" aria-hidden="true">
            <span></span><span></span><span></span>
          </span>

          <span class="menu-actual">
            <span class="menu-icono">{{ iconoActivo() }}</span>
            <span class="menu-nombre">{{ nombreActivo() }}</span>
          </span>

          <span class="menu-conteo" [style.background]="colorActivo()">
            {{ eventosFiltrados.length }}
          </span>

          <span class="menu-flecha">{{ menuAbierto ? '▲' : '▼' }}</span>
        </button>

        <div class="menu-panel" *ngIf="menuAbierto">
          <button
            type="button"
            class="menu-item"
            [class.activo]="claveActiva === 'todo'"
            (click)="cambiarTab('todo')"
          >
            <span class="item-icono">📋</span>
            <span class="item-nombre">Todo</span>
            <span class="item-conteo">{{ eventos.length }}</span>
          </button>

          <button
            *ngFor="let fuente of fuentesVisibles; trackBy: trackByClave"
            type="button"
            class="menu-item"
            [class.activo]="claveActiva === fuente.clave"
            (click)="cambiarTab(fuente.clave)"
          >
            <span class="item-icono">{{ fuente.icono }}</span>
            <span class="item-nombre">{{ fuente.nombre }}</span>
            <span class="item-conteo" [style.background]="fuente.color">{{ fuente.total }}</span>
          </button>
        </div>
      </div>

      <div class="tabs-lista">
        <div
          *ngFor="let evento of eventosFiltrados; trackBy: trackById"
          class="fila"
          [class.con-fotos]="abreDetalle(evento)"
          [class.restringido]="restringido(evento)"
          [style.border-left-color]="evento.color"
          (click)="alTocarFila(evento)"
        >
          <div class="fila-hora">
            <span *ngIf="evento.hora">{{ evento.hora }}</span>
            <span class="fila-sin-hora" *ngIf="!evento.hora">{{ evento.icono }}</span>
          </div>

          <div class="fila-cuerpo">
            <div class="fila-cabecera">
              <h4 class="fila-titulo">{{ evento.titulo }}</h4>
              <span class="fila-valor" *ngIf="evento.valor !== null">
                {{ evento.valor | currency:'COP':'symbol-narrow':'1.0-0' }}
              </span>
            </div>

            <!-- De una actividad extensa la descripción no se pinta aquí:
                 se lee en el detalle, tras el "Ver más". -->
            <p class="fila-detalle" *ngIf="evento.detalle && !resumir(evento)">{{ evento.detalle }}</p>

            <!-- Ítems, calificaciones y acciones. Aquí hay ancho de sobra,
                 así que van sin compactar. -->
            <app-agenda-tarjeta-extras
              [evento]="evento"
              [resumido]="true"
              (ampliar)="eventoClick.emit(evento)"
            ></app-agenda-tarjeta-extras>

            <div class="fila-pie">
              <span class="fila-fuente" *ngIf="claveActiva === 'todo'" [style.color]="evento.color">
                {{ evento.nombre_fuente }}
              </span>
              <span class="fila-etiqueta" *ngIf="evento.etiqueta">{{ evento.etiqueta }}</span>
              <span class="fila-autor" *ngIf="evento.pie">{{ evento.pie }}</span>
            </div>
          </div>
        </div>

        <div class="tabs-vacio" *ngIf="eventosFiltrados.length === 0">
          <span class="vacio-icono">🌤️</span>
          <p>No hay nada registrado aquí para este día</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .agenda-tabs { width: 100%; }

    /* ---------------------------------------------------------------- */
    /* Menú de fuentes                                                   */
    /* ---------------------------------------------------------------- */

    .tabs-menu {
      position: relative;
      margin-bottom: 1rem;
    }

    .menu-boton {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      width: 100%;
      background: #fff;
      border: 1px solid #e6e9ec;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.07);
      padding: 0.6rem 0.9rem;
      cursor: pointer;
      color: #2d3436;
      font-size: 0.9rem;
      text-align: left;
    }
    .menu-boton.abierto {
      border-color: #d5cffb;
      box-shadow: 0 3px 14px rgba(108,92,231,0.18);
    }

    /* Hamburguesa dibujada con tres barras y no con un caracter: así se ve
       igual en todos los equipos y se puede animar. */
    .menu-hamburguesa {
      display: inline-flex;
      flex-direction: column;
      justify-content: center;
      gap: 3px;
      width: 18px;
      flex-shrink: 0;
    }
    .menu-hamburguesa span {
      display: block;
      height: 2px;
      border-radius: 2px;
      background: #6c5ce7;
      transition: transform 0.2s ease, opacity 0.2s ease;
    }
    .menu-boton.abierto .menu-hamburguesa span:nth-child(1) { transform: translateY(5px) rotate(45deg); }
    .menu-boton.abierto .menu-hamburguesa span:nth-child(2) { opacity: 0; }
    .menu-boton.abierto .menu-hamburguesa span:nth-child(3) { transform: translateY(-5px) rotate(-45deg); }

    .menu-actual {
      display: flex;
      align-items: center;
      gap: 0.45rem;
      flex: 1;
      min-width: 0;
    }
    .menu-icono { font-size: 1.05rem; flex-shrink: 0; }
    .menu-nombre {
      font-weight: 600;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .menu-conteo {
      background: #b2bec3;
      color: #fff;
      font-size: 0.72rem;
      font-weight: 700;
      min-width: 22px;
      padding: 0.08rem 0.4rem;
      border-radius: 10px;
      text-align: center;
      flex-shrink: 0;
    }

    .menu-flecha {
      font-size: 0.62rem;
      color: #b2bec3;
      flex-shrink: 0;
    }

    .menu-panel {
      position: absolute;
      top: calc(100% + 0.35rem);
      left: 0;
      right: 0;
      z-index: 40;
      background: #fff;
      border: 1px solid #e6e9ec;
      border-radius: 12px;
      box-shadow: 0 10px 28px rgba(0,0,0,0.16);
      padding: 0.35rem;
      max-height: 60vh;
      overflow-y: auto;
      animation: abrirMenu 0.15s ease;

      scrollbar-width: thin;
      scrollbar-color: #d5cffb transparent;
    }
    .menu-panel::-webkit-scrollbar { width: 6px; }
    .menu-panel::-webkit-scrollbar-track { background: transparent; }
    .menu-panel::-webkit-scrollbar-thumb { background: #d5cffb; border-radius: 4px; }

    @keyframes abrirMenu {
      from { opacity: 0; transform: translateY(-6px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .menu-item {
      display: flex;
      align-items: center;
      gap: 0.55rem;
      width: 100%;
      background: transparent;
      border: none;
      border-radius: 9px;
      padding: 0.55rem 0.7rem;
      cursor: pointer;
      color: #57606f;
      font-size: 0.87rem;
      text-align: left;
    }
    .menu-item:hover { background: #f5f6fa; }
    .menu-item.activo { background: #f4f1ff; color: #2d3436; font-weight: 600; }

    .item-icono { font-size: 1.05rem; flex-shrink: 0; }
    .item-nombre {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .item-conteo {
      background: #b2bec3;
      color: #fff;
      font-size: 0.7rem;
      font-weight: 700;
      min-width: 20px;
      padding: 0.05rem 0.35rem;
      border-radius: 10px;
      text-align: center;
      flex-shrink: 0;
    }

    /* ---------------------------------------------------------------- */
    /* Lista                                                             */
    /* ---------------------------------------------------------------- */

    .tabs-lista { display: flex; flex-direction: column; gap: 0.6rem; }

    .fila {
      display: flex;
      gap: 0.85rem;
      background: #fff;
      border-radius: 10px;
      border-left: 4px solid #ccc;
      box-shadow: 0 1px 6px rgba(0,0,0,0.07);
      padding: 0.8rem 1rem;
      /* Solo las galerias abren algo al tocar la fila: el resto ya muestra
         toda su informacion ahi mismo. */
      cursor: default;
      transition: box-shadow 0.15s ease;
      overflow: hidden;
      overflow-wrap: break-word;
    }
    .fila.con-fotos { cursor: pointer; }

    /* Pago o cobro sin permiso: solo avisa que hubo un movimiento. */
    .fila.restringido { opacity: 0.55; box-shadow: none; }
    .fila.restringido .fila-titulo {
      font-weight: 500;
      font-style: italic;
      color: #95a5a6;
    }
    .fila.con-fotos:hover { box-shadow: 0 4px 14px rgba(0,0,0,0.12); }

    .fila-hora {
      flex-shrink: 0;
      width: 48px;
      font-weight: 700;
      font-size: 0.85rem;
      color: #2d3436;
      padding-top: 0.1rem;
    }
    .fila-sin-hora { font-size: 1.1rem; }

    .fila-cuerpo { flex: 1; min-width: 0; }

    .fila-cabecera {
      display: flex; align-items: baseline; gap: 0.6rem;
      justify-content: space-between;
    }
    .fila-titulo { margin: 0; font-size: 0.97rem; color: #2d3436; min-width: 0; }
    .fila-valor { font-weight: 700; color: #27ae60; font-size: 0.9rem; white-space: nowrap; }

    .fila-detalle {
      margin: 0.25rem 0 0;
      font-size: 0.86rem;
      color: #636e72;
      line-height: 1.35;
    }

    .fila-pie {
      display: flex; align-items: center; gap: 0.5rem;
      flex-wrap: wrap;
      margin-top: 0.35rem;
      font-size: 0.74rem;
    }
    .fila-fuente { font-weight: 600; }
    .fila-etiqueta {
      background: #f1f2f6;
      color: #57606f;
      padding: 0.1rem 0.45rem;
      border-radius: 8px;
    }
    .fila-autor { color: #95a5a6; font-style: italic; }

    .tabs-vacio {
      text-align: center;
      padding: 2.5rem 1rem;
      color: #95a5a6;
    }
    .vacio-icono { font-size: 2.5rem; display: block; margin-bottom: 0.5rem; }
    .tabs-vacio p { margin: 0; font-size: 0.9rem; }

    @media (max-width: 768px) {
      .fila { padding: 0.7rem 0.8rem; gap: 0.6rem; }
      .fila-hora { width: 42px; font-size: 0.8rem; }
      .menu-boton { font-size: 0.85rem; }
    }
  `],
})
export class MiAgendaTabsComponent implements OnChanges {
  @Input() eventos: EventoAgenda[] = [];
  @Input() fuentes: FuenteAgenda[] = [];
  @Input() isMobile: boolean = false;

  @Output() eventoClick = new EventEmitter<EventoAgenda>();

  /** 'todo' o la clave de una fuente. */
  public claveActiva: string = 'todo';
  public eventosFiltrados: EventoAgenda[] = [];
  public fuentesVisibles: FuenteAgenda[] = [];

  public menuAbierto = false;

  constructor(private elemento: ElementRef) { }

  ngOnChanges(): void {
    this.fuentesVisibles = [...this.fuentes].sort((a, b) => a.orden - b.orden);

    // El backend ya no manda fuentes sin eventos. Si la que estaba activa
    // desaparece al cambiar de día, se vuelve a 'todo' para que la pantalla
    // no quede en blanco sin explicación.
    const activa = this.fuentesVisibles.find(f => f.clave === this.claveActiva);
    if (this.claveActiva !== 'todo' && !activa) {
      this.claveActiva = 'todo';
    }

    this.filtrar();
  }

  // -----------------------------------------------------------------
  // Menú
  // -----------------------------------------------------------------

  alternarMenu(event: Event): void {
    event.stopPropagation();
    this.menuAbierto = !this.menuAbierto;
  }

  /** Un clic por fuera cierra el menú, como cualquier desplegable. */
  @HostListener('document:click', ['$event'])
  alHacerClicAfuera(event: Event): void {
    if (!this.menuAbierto) return;

    if (!this.elemento.nativeElement.contains(event.target)) {
      this.menuAbierto = false;
    }
  }

  @HostListener('document:keydown.escape')
  alPresionarEscape(): void {
    this.menuAbierto = false;
  }

  cambiarTab(clave: string): void {
    this.claveActiva = clave;
    this.menuAbierto = false;
    this.filtrar();
  }

  // -----------------------------------------------------------------
  // Filtro activo
  // -----------------------------------------------------------------

  private fuenteActiva(): FuenteAgenda | undefined {
    return this.fuentesVisibles.find(f => f.clave === this.claveActiva);
  }

  iconoActivo(): string {
    return this.fuenteActiva()?.icono || '📋';
  }

  nombreActivo(): string {
    return this.fuenteActiva()?.nombre || 'Todo el día';
  }

  colorActivo(): string {
    return this.fuenteActiva()?.color || '#b2bec3';
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

  alTocarFila(evento: EventoAgenda): void {
    if (!this.abreDetalle(evento)) return;
    this.eventoClick.emit(evento);
  }

  private filtrar(): void {
    this.eventosFiltrados = this.claveActiva === 'todo'
      ? [...this.eventos]
      : this.eventos.filter(e => e.clave === this.claveActiva);
  }

  trackById(index: number, evento: EventoAgenda): string {
    return evento.id;
  }

  trackByClave(index: number, fuente: FuenteAgenda): string {
    return fuente.clave;
  }
}
