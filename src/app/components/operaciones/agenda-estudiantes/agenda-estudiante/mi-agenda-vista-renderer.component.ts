import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EventoAgenda, FuenteAgenda, ModoVista } from './mi-agenda.types';

import { MiAgendaCaminoComponent } from './vistas/camino.vista';
import { MiAgendaLibroComponent } from './vistas/libro.vista';
import { MiAgendaTabsComponent } from './vistas/tabs.vista';

/**
 * Decide cuál de las tres vistas se pinta. Mismo patrón del
 * galeria-modo-renderer: el padre le pasa los datos y el modo, y este
 * componente solo escoge; toda la presentación vive en cada vista.
 */
@Component({
  selector: 'app-mi-agenda-vista-renderer',
  standalone: true,
  imports: [
    CommonModule,
    MiAgendaCaminoComponent,
    MiAgendaLibroComponent,
    MiAgendaTabsComponent,
  ],
  template: `
    <app-mi-agenda-camino
      *ngIf="modo === 'camino'"
      [eventos]="eventos"
      [isMobile]="isMobile"
      (eventoClick)="eventoClick.emit($event)"
    ></app-mi-agenda-camino>

    <app-mi-agenda-libro
      *ngIf="modo === 'libro'"
      [eventos]="eventos"
      [titulo]="titulo"
      [subtitulo]="subtitulo"
      [isMobile]="isMobile"
      (eventoClick)="eventoClick.emit($event)"
      (fotoClick)="fotoClick.emit($event)"
    ></app-mi-agenda-libro>

    <app-mi-agenda-tabs
      *ngIf="modo === 'tabs'"
      [eventos]="eventos"
      [fuentes]="fuentes"
      [isMobile]="isMobile"
      (eventoClick)="eventoClick.emit($event)"
    ></app-mi-agenda-tabs>
  `,
})
export class MiAgendaVistaRendererComponent {
  @Input() modo: ModoVista = 'camino';
  @Input() eventos: EventoAgenda[] = [];
  @Input() fuentes: FuenteAgenda[] = [];
  @Input() titulo: string = '';
  @Input() subtitulo: string = '';
  @Input() isMobile: boolean = false;

  @Output() eventoClick = new EventEmitter<EventoAgenda>();

  /**
   * Solo el libro lo emite: ahi las fotos van dentro de la hoja y al tocar
   * una se abre el visor directo, sin pasar por el detalle.
   */
  @Output() fotoClick = new EventEmitter<{ evento: EventoAgenda; indice: number }>();
}
