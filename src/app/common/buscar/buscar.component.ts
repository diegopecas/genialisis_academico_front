import { CommonModule } from '@angular/common';
import { Component, EventEmitter, OnDestroy, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

@Component({
  selector: 'app-buscar',
  templateUrl: './buscar.component.html',
  styleUrl: './buscar.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class BuscarComponent implements OnDestroy {
  @Output() buscar = new EventEmitter();

  public valor: string | null = null;

  // Se filtra mientras se escribe, con una pausa corta para no disparar
  // el filtro en cada tecla. El Enter sigue funcionando y filtra de una.
  private readonly esperaMilisegundos: number = 250;
  private tecleo = new Subject<string | null>();
  private suscripcion: Subscription;

  constructor() {
    this.suscripcion = this.tecleo
      .pipe(
        debounceTime(this.esperaMilisegundos),
        distinctUntilChanged()
      )
      .subscribe((valor: string | null) => {
        this.buscar.emit(valor);
      });
  }

  ngOnDestroy(): void {
    this.suscripcion.unsubscribe();
    this.tecleo.complete();
  }

  /** Cada tecla pasa por el debounce */
  escribir() {
    this.tecleo.next(this.valor);
  }

  /** El Enter no espera: emite en el momento */
  enviar() {
    this.buscar.emit(this.valor);
  }

  limpiar() {
    this.valor = null;
    this.buscar.emit(this.valor);
  }
}
