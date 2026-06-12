import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-voz-a-texto',
  templateUrl: './voz-a-texto.component.html',
  styleUrls: ['./voz-a-texto.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class VozATextoComponent {
  @Output() textoTranscrito = new EventEmitter<string>();
  
  escuchando = false;
  mensaje = 'Presiona el botón para comenzar a hablar';
  reconocimiento: any;
  textoCompleto = '';
  soportaReconocimientoVoz = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
  
  constructor() {
    // Inicializar el reconocimiento de voz si es soportado
    if (this.soportaReconocimientoVoz) {
      this.inicializarReconocimientoVoz();
    }
  }
  
  inicializarReconocimientoVoz() {
    // Usar la API de reconocimiento de voz
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    this.reconocimiento = new SpeechRecognition();
    
    // Configuración
    this.reconocimiento.lang = 'es-ES'; // Idioma español
    this.reconocimiento.continuous = true; // Reconocimiento continuo
    this.reconocimiento.interimResults = true; // Resultados parciales
    
    // Evento cuando se detecta voz
    this.reconocimiento.onresult = (evento: any) => {
      let textoActual = '';
      
      // Reconstruir el texto completo con todos los resultados
      for (let i = 0; i < evento.results.length; i++) {
        textoActual += evento.results[i][0].transcript + ' ';
      }
      
      // Actualizar el texto completo y el mensaje
      this.textoCompleto = textoActual;
      this.mensaje = this.textoCompleto || 'Escuchando...';
    };
    
    // Evento cuando termina la detección
    this.reconocimiento.onend = () => {
      if (this.escuchando) {
        // Si seguimos escuchando pero se detuvo automáticamente, reiniciamos
        this.reconocimiento.start();
      } else {
        // No hacemos nada aquí porque ahora la emisión del texto se hace en toggleReconocimiento
        this.mensaje = 'Transcripción completada';
      }
    };
    
    // Manejo de errores
    this.reconocimiento.onerror = (evento: any) => {
      console.error('Error en reconocimiento de voz:', evento.error);
      this.escuchando = false;
      
      switch (evento.error) {
        case 'not-allowed':
          this.mensaje = 'Permiso de micrófono denegado';
          break;
        case 'no-speech':
          this.mensaje = 'No se detectó ninguna voz';
          break;
        default:
          this.mensaje = `Error: ${evento.error}`;
      }
    };
  }
  
  toggleReconocimiento() {
    if (!this.soportaReconocimientoVoz) {
      this.mensaje = 'Tu navegador no soporta reconocimiento de voz';
      return;
    }
    
    if (this.escuchando) {
      // Detener reconocimiento
      this.reconocimiento.stop();
      this.escuchando = false;
      
      // IMPORTANTE: Emitir el texto justo después de detener la grabación
      if (this.textoCompleto.trim() !== '') {
        console.log('Emitiendo texto completo al detener:', this.textoCompleto);
        this.textoTranscrito.emit(this.textoCompleto.trim());
      }
    } else {
      // Iniciar reconocimiento
      this.textoCompleto = ''; // Limpiar texto anterior
      this.mensaje = 'Escuchando...';
      this.reconocimiento.start();
      this.escuchando = true;
    }
  }
}