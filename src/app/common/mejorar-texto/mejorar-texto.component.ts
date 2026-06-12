import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IaMejorarTextoService } from '../../services/ia-mejorar-texto.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-mejorar-texto',
  templateUrl: './mejorar-texto.component.html',
  styleUrls: ['./mejorar-texto.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class MejorarTextoComponent {
  @Input() texto: string = '';
  @Input() contexto: string = '';
  @Output() textoMejorado = new EventEmitter<string>();

  procesando: boolean = false;

  constructor(private iaMejorarTextoService: IaMejorarTextoService) {}

  mejorarTexto(): void {
    const textoOriginal = (this.texto ?? '').trim();
    if (!textoOriginal) {
      return;
    }

    this.procesando = true;

    this.iaMejorarTextoService.mejorarTexto({
      texto: textoOriginal,
      contexto: this.contexto ?? ''
    }).subscribe({
      next: (response: any) => {
        this.procesando = false;

        if (response?.success && response.texto_mejorado?.trim()) {
          this.textoMejorado.emit(response.texto_mejorado);
        } else {
          this.notificarError('La IA no devolvió un texto válido.');
          this.textoMejorado.emit(this.texto);
        }
      },
      error: (error: any) => {
        this.procesando = false;
        console.error('Error al mejorar texto:', error);
        const mensaje = error?.error?.error || 'No se pudo mejorar el texto. Intente de nuevo más tarde.';
        this.notificarError(mensaje);
        this.textoMejorado.emit(this.texto);
      }
    });
  }

  private notificarError(mensaje: string): void {
    Swal.fire({
      title: 'Error',
      text: mensaje,
      icon: 'error',
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 3000
    });
  }
}