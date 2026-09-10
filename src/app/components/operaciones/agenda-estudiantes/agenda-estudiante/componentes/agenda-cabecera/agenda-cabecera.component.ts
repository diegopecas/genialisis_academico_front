import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModoVista, ModoVistaConfig } from '../../mi-agenda.types';

/**
 * Cabecera de la agenda: el niño, el selector de vista y el buscador del día.
 *
 * En el institucional la fecha no va aquí: la maneja la pantalla Agenda de
 * Estudiantes (componente agenda-fecha), porque manda también sobre la
 * lista de estudiantes.
 *
 * No guarda estado propio: recibe la búsqueda y avisa cuando cambia. Así el
 * padre sigue siendo el único dueño del estado.
 */
@Component({
  selector: 'app-agenda-cabecera',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './agenda-cabecera.component.html',
  styleUrl: './agenda-cabecera.component.scss',
})
export class AgendaCabeceraComponent {
  @Input() estudiante: any = null;

  @Input() modo: ModoVista = 'camino';
  @Input() modos: ModoVistaConfig[] = [];

  @Input() mostrarBuscador: boolean = false;
  @Input() busqueda: string = '';
  @Input() totalEventos: number = 0;
  @Input() totalVisibles: number = 0;

  @Output() modoCambio = new EventEmitter<ModoVista>();
  @Output() busquedaCambio = new EventEmitter<string>();

  // -----------------------------------------------------------------
  // Estudiante
  // -----------------------------------------------------------------

  iniciales(estudiante: any): string {
    const nombre = estudiante?.nombre_completo || '';
    return nombre.split(' ')
      .filter((p: string) => p.length > 0)
      .map((p: string) => p.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');
  }

  // -----------------------------------------------------------------
  // Buscador
  // -----------------------------------------------------------------

  escribirBusqueda(valor: string): void {
    this.busquedaCambio.emit(valor);
  }

  limpiarBusqueda(): void {
    this.busquedaCambio.emit('');
  }
}
