import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CalificacionAgenda } from '../../mi-agenda.types';

/**
 * Calificaciones de una actividad, en fichas.
 *
 * Lo usan las tres vistas y el detalle, por eso vive aparte: es el mismo
 * dato pintado igual en cuatro sitios. La plantilla va en línea porque son
 * pocas líneas y no vale la pena partirlo en tres archivos.
 *
 * El backend manda parametro, cualitativo, cuantitativo e icono. Se muestra
 * el cualitativo cuando existe (es lo que le dice algo al papá: "Excelente"
 * pesa más que un 5) y el cuantitativo queda de respaldo.
 *
 * El icono NO es un emoji: en valores_parametros_calificaciones se guarda
 * una clase de Font Awesome ("fa-medal", "fa-heartbeat"), así que va dentro
 * de un <i class="fas ..."> igual que en el resto del sistema. Pintarlo como
 * texto sacaba el nombre de la clase en la tarjeta.
 */
@Component({
  selector: 'app-agenda-calificaciones',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="calificaciones" *ngIf="calificaciones.length > 0" [class.compacto]="compacto">
      <span
        class="calificacion"
        *ngFor="let c of calificaciones; trackBy: trackByParametro"
        [title]="titulo(c)"
      >
        <i class="fas {{ c.icono }} calif-icono" *ngIf="c.icono"></i>
        <span class="calif-parametro">{{ c.parametro }}</span>
        <span class="calif-valor">{{ valor(c) }}</span>
      </span>
    </div>
  `,
  styles: [`
    .calificaciones {
      display: flex;
      flex-wrap: wrap;
      gap: 0.3rem;
      margin-top: 0.45rem;
      /* Sin esto el contenedor flex se niega a encogerse por debajo del
         ancho de su contenido y las fichas se salían de la tarjeta. */
      min-width: 0;
      max-width: 100%;
    }

    .calificacion {
      display: inline-flex;
      align-items: center;
      gap: 0.28rem;
      background: #f4f1ff;
      border: 1px solid #e4defc;
      border-radius: 12px;
      padding: 0.14rem 0.5rem;
      font-size: 0.74rem;
      color: #57606f;
      /* Nunca más ancha que la tarjeta que la contiene. */
      max-width: 100%;
      min-width: 0;
    }

    .calif-icono {
      font-size: 0.8rem;
      line-height: 1;
      flex-shrink: 0;
      color: #6c5ce7;
    }

    /* El nombre del parámetro es lo primero que se sacrifica: se recorta
       con puntos suspensivos y el nombre completo queda en el title. */
    .calif-parametro {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      min-width: 0;
      flex: 0 1 auto;
    }

    /* El valor sí se lee completo: puede ser "Tarea lograda con
       suficiencia" y es lo que le importa al papá, así que parte línea
       antes que salirse. */
    .calif-valor {
      font-weight: 700;
      color: #6c5ce7;
      overflow-wrap: anywhere;
      min-width: 0;
    }

    /* En las tarjetas del camino y del libro el espacio es corto: se deja
       solo el icono y el valor, y el nombre del parámetro queda en el
       title para quien pase el mouse. */
    .calificaciones.compacto .calif-parametro { display: none; }
    .calificaciones.compacto .calificacion { padding: 0.12rem 0.42rem; }

    @media (max-width: 768px) {
      .calificacion { font-size: 0.68rem; }
      .calif-parametro { max-width: 90px; }
    }
  `],
})
export class AgendaCalificacionesComponent {
  @Input() calificaciones: CalificacionAgenda[] = [];

  /** Esconde el nombre del parámetro cuando el espacio es corto. */
  @Input() compacto: boolean = false;

  /** El cualitativo manda; si no hay, se muestra el número. */
  valor(c: CalificacionAgenda): string {
    if (c.cualitativo) {
      return c.cualitativo;
    }

    return c.cuantitativo !== null && c.cuantitativo !== undefined
      ? String(c.cuantitativo)
      : '—';
  }

  /** Texto completo para el tooltip, porque el parámetro se recorta. */
  titulo(c: CalificacionAgenda): string {
    return `${c.parametro}: ${this.valor(c)}`;
  }

  trackByParametro(index: number, c: CalificacionAgenda): string {
    return c.parametro;
  }
}
