// fecha-input.component.ts
// Campo de fecha para reemplazar el input type="date". En el celular el
// input nativo solo deja escoger del calendario; este campo deja escribir la
// fecha con el teclado numérico ("23102026", "23/10/2026", "23-10-26") y,
// si se prefiere, abrir el calendario con el botón.
//
// Hacia afuera siempre entrega "YYYY-MM-DD", igual que el input nativo, así
// que funciona con [(ngModel)] sin tocar la lógica de las pantallas. El valor
// se entrega al salir del campo, al presionar Enter o al escoger en el
// calendario, no mientras se escribe. Si lo digitado no es una fecha, el
// campo queda en rojo y no se entrega nada.
import { Component, ElementRef, Input, ViewChild, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-fecha-input',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './fecha-input.component.html',
  styleUrl: './fecha-input.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => FechaInputComponent),
      multi: true
    }
  ]
})
export class FechaInputComponent implements ControlValueAccessor {
  @Input() tamano: 'sm' | 'md' | 'lg' = 'md';
  @Input() invalido: boolean = false;
  @Input() readonly: boolean = false;
  @Input() disabled: boolean = false;
  // Id del input interno, para que el <label for="..."> siga funcionando
  @Input() inputId: string = '';
  @Input() placeholder: string = 'dd/mm/aaaa';

  @ViewChild('selector') selector?: ElementRef<HTMLInputElement>;

  public texto: string = '';
  public error: boolean = false;
  // Último valor recibido o entregado ("YYYY-MM-DD")
  public valor: string = '';

  private textoConfirmado: string = '';
  private onChange: (valor: string) => void = () => {};
  private onTouched: () => void = () => {};

  // ============================================================
  // ControlValueAccessor
  // ============================================================

  writeValue(valor: string | null): void {
    this.valor = valor ? String(valor).substring(0, 10) : '';
    this.error = false;
    this.texto = this.aTexto(this.valor);
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
  // Eventos
  // ============================================================

  alEscribir(campo: HTMLInputElement): void {
    const filtrado = campo.value.replace(/[^0-9/\-.\s]/g, '');
    if (filtrado !== campo.value) {
      campo.value = filtrado;
    }
    this.texto = filtrado;
    this.error = false;
  }

  alSalir(): void {
    if (this.texto !== this.textoConfirmado || this.error) {
      this.confirmar();
    }
    this.onTouched();
  }

  alPresionarEnter(evento: Event): void {
    // Evita que el Enter envíe el formulario que contenga al campo
    evento.preventDefault();
    this.confirmar();
  }

  abrirCalendario(): void {
    if (this.disabled || this.readonly || !this.selector) {
      return;
    }
    const campo: any = this.selector.nativeElement;
    campo.value = this.valor;
    if (typeof campo.showPicker === 'function') {
      try {
        campo.showPicker();
        return;
      } catch (e) {
        // Algunos navegadores no dejan abrirlo así; se cae al foco.
      }
    }
    campo.focus();
    campo.click();
  }

  alEscogerEnCalendario(campo: HTMLInputElement): void {
    if (!campo.value) {
      return;
    }
    this.entregar(campo.value);
    this.onTouched();
  }

  // ============================================================
  // Internos
  // ============================================================

  private confirmar(): void {
    const limpio = this.texto.trim();
    if (limpio === '') {
      this.error = false;
      this.textoConfirmado = '';
      if (this.valor !== '') {
        this.valor = '';
        this.onChange('');
      }
      return;
    }

    const fecha = this.interpretar(limpio);
    if (!fecha) {
      this.error = true;
      return;
    }
    this.entregar(fecha);
  }

  private entregar(fecha: string): void {
    this.error = false;
    this.texto = this.aTexto(fecha);
    this.textoConfirmado = this.texto;
    if (fecha !== this.valor) {
      this.valor = fecha;
      this.onChange(fecha);
    }
  }

  /**
   * Acepta día, mes y año separados por / - . o espacio, o los dígitos
   * seguidos (ddmmaa o ddmmaaaa). El año de dos dígitos se toma como 20xx.
   * Devuelve "YYYY-MM-DD" o null si no es una fecha que exista.
   */
  private interpretar(texto: string): string | null {
    let dia: number, mes: number, anio: number;
    const partes = texto.split(/[\/\-.\s]+/).filter((p) => p !== '');

    if (partes.length === 3) {
      dia = parseInt(partes[0], 10);
      mes = parseInt(partes[1], 10);
      anio = parseInt(partes[2], 10);
      if (partes[2].length <= 2) {
        anio += 2000;
      }
    } else if (partes.length === 1 && /^\d{6}$|^\d{8}$/.test(partes[0])) {
      const d = partes[0];
      dia = parseInt(d.substring(0, 2), 10);
      mes = parseInt(d.substring(2, 4), 10);
      anio = parseInt(d.substring(4), 10);
      if (d.length === 6) {
        anio += 2000;
      }
    } else {
      return null;
    }

    if (!dia || !mes || !anio || mes > 12 || anio < 1900 || anio > 2200) {
      return null;
    }
    const prueba = new Date(anio, mes - 1, dia);
    if (prueba.getFullYear() !== anio || prueba.getMonth() !== mes - 1 || prueba.getDate() !== dia) {
      return null;
    }
    return `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
  }

  private aTexto(valor: string): string {
    if (!valor || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
      return '';
    }
    const [anio, mes, dia] = valor.split('-');
    return `${dia}/${mes}/${anio}`;
  }
}
