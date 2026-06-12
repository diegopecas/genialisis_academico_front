import { Component, EventEmitter, Output, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IaTranscripcionAudioService } from '../../services/ia-transcripcion-audio.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-transcribir-audio',
  templateUrl: './transcribir-audio.component.html',
  styleUrls: ['./transcribir-audio.component.scss'],
  standalone: true,
  imports: [CommonModule]
})
export class TranscribirAudioComponent implements OnDestroy {
  @Output() mensaje = new EventEmitter<string>();

  public grabando: boolean = false;
  public procesando: boolean = false;
  public tiempoGrabacion: number = 0;

  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private timerInterval: any = null;

  constructor(private iaTranscripcionAudioService: IaTranscripcionAudioService) {}

  ngOnDestroy(): void {
    this.detenerStreamYTimer();
  }

  async iniciarGrabacion(): Promise<void> {
    if (this.grabando || this.procesando) {
      return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      this.notificarError('Tu navegador no soporta grabación de audio. Usa Chrome, Edge o Firefox actualizados.');
      return;
    }

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.audioChunks = [];

      const mimeType = this.obtenerMimeTypeSoportado();
      this.mediaRecorder = mimeType
        ? new MediaRecorder(this.stream, { mimeType })
        : new MediaRecorder(this.stream);

      this.mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        this.procesarAudioGrabado();
      };

      this.mediaRecorder.start();
      this.grabando = true;
      this.tiempoGrabacion = 0;

      this.timerInterval = setInterval(() => {
        this.tiempoGrabacion++;
      }, 1000);

    } catch (error: any) {
      console.error('Error al iniciar grabación:', error);

      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        this.notificarError('No se otorgaron permisos para usar el micrófono. Por favor habilítelos en la configuración del navegador.');
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        this.notificarError('No se detectó ningún micrófono en este dispositivo.');
      } else {
        this.notificarError('No se pudo acceder al micrófono: ' + (error.message || 'error desconocido'));
      }

      this.detenerStreamYTimer();
    }
  }

  detenerGrabacion(): void {
    if (!this.grabando || !this.mediaRecorder) {
      return;
    }

    if (this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }

    this.grabando = false;
    this.detenerStreamYTimer();
  }

  toggleGrabacion(): void {
    if (this.grabando) {
      this.detenerGrabacion();
    } else {
      this.iniciarGrabacion();
    }
  }

  formatearTiempo(segundos: number): string {
    const mins = Math.floor(segundos / 60);
    const segs = segundos % 60;
    return `${mins.toString().padStart(2, '0')}:${segs.toString().padStart(2, '0')}`;
  }

  private procesarAudioGrabado(): void {
    if (this.audioChunks.length === 0) {
      this.notificarError('No se grabó ningún audio.');
      return;
    }

    const mimeType = this.mediaRecorder?.mimeType || 'audio/webm';
    const audioBlob = new Blob(this.audioChunks, { type: mimeType });

    if (audioBlob.size === 0) {
      this.notificarError('El audio grabado está vacío.');
      return;
    }

    this.procesando = true;

    this.iaTranscripcionAudioService.transcribir(audioBlob, 'es').subscribe({
      next: (response: any) => {
        this.procesando = false;

        if (response?.success && response.texto?.trim()) {
          this.mensaje.emit(response.texto.trim());
        } else {
          this.notificarError('No se pudo obtener un texto válido de la transcripción.');
        }
      },
      error: (error: any) => {
        this.procesando = false;
        console.error('Error al transcribir:', error);
        const mensajeError = error?.error?.error || 'No se pudo transcribir el audio. Intente de nuevo.';
        this.notificarError(mensajeError);
      }
    });
  }

  private obtenerMimeTypeSoportado(): string {
    const tipos = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4',
      'audio/mpeg'
    ];

    for (const tipo of tipos) {
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(tipo)) {
        return tipo;
      }
    }
    return '';
  }

  private detenerStreamYTimer(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  private notificarError(mensaje: string): void {
    Swal.fire({
      title: 'Error',
      text: mensaje,
      icon: 'error',
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 4000
    });
  }
}