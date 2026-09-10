import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { fechaLegible, hoyLocal, sumarDias } from '../../mi-agenda.fechas';

/**
 * Navegación por fecha de Agenda de Estudiantes: día anterior y siguiente,
 * calendario, "Hoy" y refrescar.
 *
 * Hacia adelante el tope es hoy, porque la agenda solo muestra lo que ya
 * pasó. No guarda estado propio: recibe la fecha y avisa cuando cambia.
 */
@Component({
  selector: 'app-agenda-fecha',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './agenda-fecha.component.html',
  styleUrl: './agenda-fecha.component.scss',
})
export class AgendaFechaComponent {
  /** Fecha consultada, en Y-m-d. */
  @Input() fecha: string = '';
  /** Mientras se consulta, el botón de refrescar queda quieto. */
  @Input() cargando: boolean = false;

  @Output() fechaCambio = new EventEmitter<string>();
  /** Volver a consultar el día que se está viendo, sin usar lo guardado. */
  @Output() refrescar = new EventEmitter<void>();

  /** Tope superior: hoy. No se navega al futuro. */
  get fechaMaxima(): string {
    return hoyLocal();
  }

  texto(): string {
    return fechaLegible(this.fecha);
  }

  puedeAvanzar(): boolean {
    return this.fecha < hoyLocal();
  }

  esHoy(): boolean {
    return this.fecha === hoyLocal();
  }

  diaAnterior(): void {
    this.fechaCambio.emit(sumarDias(this.fecha, -1));
  }

  diaSiguiente(): void {
    if (!this.puedeAvanzar()) return;
    this.fechaCambio.emit(sumarDias(this.fecha, 1));
  }

  irAHoy(): void {
    const hoy = hoyLocal();
    if (this.fecha === hoy) return;
    this.fechaCambio.emit(hoy);
  }

  escogerFecha(valor: string): void {
    if (!valor || valor === this.fecha) return;
    this.fechaCambio.emit(valor);
  }
}
