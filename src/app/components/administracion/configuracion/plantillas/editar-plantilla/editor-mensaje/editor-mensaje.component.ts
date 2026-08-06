import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface CampoMensaje {
  key: string;
  label: string;
  rows: number;
}

interface VariablePlantilla {
  variable: string;
  descripcion: string;
}

/**
 * Editor de las plantillas de tipo 'mensaje'.
 *
 * Recibe el mismo objeto contenido que maneja el editor padre y trabaja
 * directamente sobre él: al ser una referencia, lo que se escriba aquí ya
 * queda en el padre y se guarda con el botón de siempre. Por eso no emite
 * eventos de cambio.
 *
 * Las claves 'version' y 'variables' no se muestran como campos: la primera
 * es control interno y la segunda es la lista de variables que se pinta al
 * lado para insertarlas en el texto.
 */
@Component({
  selector: 'app-editor-mensaje',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './editor-mensaje.component.html',
  styleUrl: './editor-mensaje.component.scss'
})
export class EditorMensajeComponent implements OnChanges {

  @Input() contenido: any = {};
  @Input() editable: boolean = true;

  public campos: CampoMensaje[] = [];
  public variables: VariablePlantilla[] = [];
  public campoActivo: string = '';

  private readonly clavesOcultas = ['version', 'variables'];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['contenido']) {
      this.construirCampos();
    }
  }

  construirCampos(): void {
    this.campos = [];
    this.variables = [];

    if (!this.contenido || typeof this.contenido !== 'object') {
      return;
    }

    if (Array.isArray(this.contenido.variables)) {
      this.variables = this.contenido.variables;
    }

    Object.keys(this.contenido).forEach(clave => {
      if (this.clavesOcultas.includes(clave)) return;
      if (typeof this.contenido[clave] !== 'string') return;

      this.campos.push({
        key: clave,
        label: this.formatearLabel(clave),
        rows: this.calcularFilas(this.contenido[clave])
      });
    });

    if (this.campos.length > 0 && !this.campoActivo) {
      this.campoActivo = this.campos[0].key;
    }
  }

  formatearLabel(key: string): string {
    return key
      .replace(/_/g, ' ')
      .replace(/\btu\b/g, '(tuteo)')
      .replace(/\busted\b/g, '(de usted)')
      .split(' ')
      .map(palabra => palabra.charAt(0).toUpperCase() + palabra.slice(1))
      .join(' ');
  }

  calcularFilas(texto: string): number {
    if (!texto) return 2;
    const lineas = texto.split('\n').length;
    return Math.max(2, Math.min(lineas + 1, 14));
  }

  /**
   * Guarda cuál textarea tiene el foco, para saber dónde insertar la variable.
   */
  marcarCampoActivo(clave: string): void {
    this.campoActivo = clave;
  }

  /**
   * Inserta la variable en la posición del cursor del campo con el foco.
   * Si no hay cursor ubicable, la agrega al final del campo activo.
   */
  insertarVariable(variable: string): void {
    if (!this.editable || !this.campoActivo) return;

    const textarea = document.getElementById('campo_' + this.campoActivo) as HTMLTextAreaElement;
    const valorActual = this.contenido[this.campoActivo] || '';

    if (!textarea) {
      this.contenido[this.campoActivo] = valorActual + variable;
      return;
    }

    const inicio = textarea.selectionStart;
    const fin = textarea.selectionEnd;
    this.contenido[this.campoActivo] = valorActual.substring(0, inicio) + variable + valorActual.substring(fin);

    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = inicio + variable.length;
    }, 0);
  }

  /**
   * Vista previa del campo activo con las variables reemplazadas por su
   * descripción entre corchetes, para que se lea como quedaría el mensaje.
   */
  get vistaPrevia(): string {
    if (!this.campoActivo) return '';
    let texto = this.contenido[this.campoActivo] || '';

    this.variables.forEach(v => {
      const escapada = v.variable.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      texto = texto.replace(new RegExp(escapada, 'g'), '[' + v.descripcion + ']');
    });

    return texto;
  }
}
