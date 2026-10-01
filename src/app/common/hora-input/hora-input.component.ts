// hora-input.component.ts
// Campo de hora para reemplazar el input type="time" (el reloj nativo).
// Se digita con el teclado numérico del celular ("730", "7:30") y se escoge
// AM o PM con dos botones. Hacia afuera siempre entrega "HH:mm" en 24 horas,
// igual que el input nativo, así que funciona con [(ngModel)] y formControlName
// sin tocar la lógica de las pantallas.
//
// El valor se entrega al salir del campo, al presionar Enter o al tocar AM/PM,
// no mientras se escribe (para no disparar cálculos con la hora a medias).
// Si lo digitado no es una hora, el campo queda en rojo y no se entrega nada.
import { Component, Input, OnChanges, SimpleChanges, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { PeriodoHora, horaA12, interpretarHora } from './hora.utils';

@Component({
  selector: 'app-hora-input',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './hora-input.component.html',
  styleUrl: './hora-input.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => HoraInputComponent),
      multi: true
    }
  ]
})
export class HoraInputComponent implements ControlValueAccessor, OnChanges {
  // Periodo con el que arranca el campo vacío (ej. PM para horas de salida)
  @Input() periodoPorDefecto: PeriodoHora = 'AM';
  @Input() tamano: 'sm' | 'md' | 'lg' = 'md';
  @Input() invalido: boolean = false;
  @Input() readonly: boolean = false;
  @Input() disabled: boolean = false;
  // Id del input interno, para que el <label for="..."> siga funcionando
  @Input() inputId: string = '';
  @Input() titulo: string = '';
  @Input() placeholder: string = 'hh:mm';

  public texto: string = '';
  public periodo: PeriodoHora = 'AM';
  public error: boolean = false;

  // Último valor recibido o entregado ("HH:mm" o "HH:mm:ss" tal como llegó)
  private valor: string = '';
  // Texto que corresponde al valor actual; si no cambia, salir del campo no hace nada
  private textoConfirmado: string = '';

  private onChange: (valor: string) => void = () => {};
  private onTouched: () => void = () => {};

  ngOnChanges(changes: SimpleChanges): void {
    // Si cambia el periodo por defecto (ej. se pasa de ingreso a salida)
    // y el campo está vacío, el botón activo se ajusta.
    if (changes['periodoPorDefecto'] && this.texto.trim() === '') {
      this.periodo = this.periodoPorDefecto;
    }
  }

  // ============================================================
  // ControlValueAccessor
  // ============================================================

  writeValue(valor: string | null): void {
    this.valor = valor || '';
    this.error = false;

    const hora = horaA12(this.valor);
    if (hora) {
      this.texto = hora.texto;
      this.periodo = hora.periodo;
    } else {
      this.texto = '';
      this.periodo = this.periodoPorDefecto;
    }
    this.textoConfirmado = this.texto;
  }

  registerOnChange(fn: (valor: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  // ============================================================
  // Eventos del campo
  // ============================================================

  /**
   * Mientras escribe solo se filtran los caracteres que no sirven para una
   * hora. No se entrega nada todavía.
   */
  alEscribir(campo: HTMLInputElement): void {
    const filtrado = campo.value.replace(/[^0-9:.\sapmAPM]/g, '');
    if (filtrado !== campo.value) {
      campo.value = filtrado;
    }
    this.texto = filtrado;
    this.error = false;
  }

  alSalir(): void {
    if (this.texto !== this.textoConfirmado || this.error) {
      this.confirmar(true);
    }
    this.onTouched();
  }

  alPresionarEnter(evento: Event): void {
    // Evita que el Enter envíe el formulario que contenga al campo
    evento.preventDefault();
    this.confirmar(true);
  }

  cambiarPeriodo(periodo: PeriodoHora): void {
    if (this.disabled || this.readonly) {
      return;
    }
    this.periodo = periodo;
    if (this.texto.trim() !== '') {
      // El usuario escogió el periodo a propósito: se respeta aunque sea 12 AM
      this.confirmar(false);
    }
    this.onTouched();
  }

  // ============================================================
  // Internos
  // ============================================================

  private confirmar(mediodiaPorDefecto: boolean): void {
    const resultado = interpretarHora(this.texto, this.periodo, mediodiaPorDefecto);
    if (!resultado) {
      this.error = true;
      return;
    }

    this.error = false;
    this.periodo = resultado.periodo;
    const hora = horaA12(resultado.valor);
    this.texto = hora ? hora.texto : '';
    this.textoConfirmado = this.texto;

    // Se compara sin segundos: "07:30:00" que vino de la base es igual a "07:30"
    if (resultado.valor !== this.valor.substring(0, 5)) {
      this.valor = resultado.valor;
      this.onChange(resultado.valor);
    }
  }
}
