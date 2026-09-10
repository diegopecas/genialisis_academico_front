import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModoVista, ModoVistaConfig } from '../../mi-agenda.types';
import { fechaLegible, hoyLocal, sumarDias } from '../../mi-agenda.fechas';

/**
 * Cabecera de la agenda: el niño, el selector de vista, la navegación por
 * fecha y el buscador del día.
 *
 * Los topes de la navegación se calculan aquí a partir de la fecha y de la
 * fecha mínima que manda el backend; hacia adelante el tope es hoy, porque
 * la agenda solo muestra lo que ya pasó.
 *
 * No guarda estado propio: recibe la fecha y la búsqueda, y avisa cuando
 * cambian. Así el padre sigue siendo el único dueño del estado.
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
  /** Solo se ofrece cambiar de niño cuando el acudiente tiene más de uno. */
  @Input() mostrarCambiar: boolean = false;

  @Input() modo: ModoVista = 'camino';
  @Input() modos: ModoVistaConfig[] = [];

  /** Fecha consultada, en Y-m-d. */
  @Input() fecha: string = '';
  /** Tope inferior: la fecha de ingreso del estudiante. */
  @Input() fechaMinima: string = '';

  @Input() mostrarBuscador: boolean = false;
  @Input() busqueda: string = '';
  @Input() totalEventos: number = 0;
  @Input() totalVisibles: number = 0;

  @Output() cambiarEstudiante = new EventEmitter<void>();
  @Output() modoCambio = new EventEmitter<ModoVista>();
  @Output() fechaCambio = new EventEmitter<string>();
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
  // Navegación por fecha
  // -----------------------------------------------------------------

  /** Tope superior: hoy. No se navega al futuro. */
  get fechaMaxima(): string {
    return hoyLocal();
  }

  texto(): string {
    return fechaLegible(this.fecha);
  }

  puedeRetroceder(): boolean {
    if (!this.fechaMinima) return true;
    return this.fecha > this.fechaMinima;
  }

  puedeAvanzar(): boolean {
    return this.fecha < hoyLocal();
  }

  esHoy(): boolean {
    return this.fecha === hoyLocal();
  }

  diaAnterior(): void {
    if (!this.puedeRetroceder()) return;
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
