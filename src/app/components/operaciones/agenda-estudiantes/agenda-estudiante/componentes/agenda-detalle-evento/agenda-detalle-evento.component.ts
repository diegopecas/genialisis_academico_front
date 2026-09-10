import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

import { GaleriaImagenesService } from '../../../../../../services/galeria-imagenes.service';
import { AgendaTarjetaExtrasComponent } from '../agenda-tarjeta-extras/agenda-tarjeta-extras.component';
import { EventoAgenda, FotoAgenda, fotosDe } from '../../mi-agenda.types';

/**
 * Detalle de un evento: solo lo que no cabe en la tarjeta.
 *
 * Ya no abre para cualquier cosa: la tarjeta muestra por si sola items,
 * calificaciones y acciones. Este cajon queda para dos casos, las galerias
 * (el mosaico de fotos) y las actividades extensas, donde la descripcion
 * mas las dos observaciones de la docente se comerian la pantalla del
 * camino o de las listas.
 */
@Component({
  selector: 'app-agenda-detalle-evento',
  standalone: true,
  imports: [CommonModule, AgendaTarjetaExtrasComponent],
  templateUrl: './agenda-detalle-evento.component.html',
  styleUrl: './agenda-detalle-evento.component.scss',
})
export class AgendaDetalleEventoComponent {
  @Input() evento: EventoAgenda | null = null;

  @Output() cerrar = new EventEmitter<void>();
  /** Indice de la foto que se quiere ver a pantalla completa. */
  @Output() abrirFoto = new EventEmitter<number>();

  constructor(private galeriaImagenesService: GaleriaImagenesService) { }

  /** URL de una foto a partir de su guid. */
  urlThumb(foto: FotoAgenda): string {
    return this.galeriaImagenesService.obtenerUrlThumb(foto.guid);
  }

  /**
   * Fotos que trae el evento de galeria. El backend las manda dentro de
   * meta para no tener que ir a buscarlas con otra consulta.
   */
  fotos(): FotoAgenda[] {
    return fotosDe(this.evento);
  }

  trackByGuid(index: number, foto: FotoAgenda): string {
    return foto.guid;
  }
}
