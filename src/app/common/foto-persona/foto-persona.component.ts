import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import Swal from 'sweetalert2';
import { PersonasService } from '../../services/personas.service';

@Component({
  selector: 'app-foto-persona',
  templateUrl: './foto-persona.component.html',
  styleUrl: './foto-persona.component.scss',
  standalone: true,
  imports: [CommonModule],
})
export class FotoPersonaComponent implements OnInit, OnDestroy {
  @Input() idPersona!: string;
  @Input() nombrePersona?: string;
  @Input() soloLectura = false;
  @Input() fotoActual?: string;
  @Output() fotoActualizada = new EventEmitter<{ruta: string | null, eliminada?: boolean}>();
  
  @ViewChild('videoElement') videoElement?: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasElement') canvasElement?: ElementRef<HTMLCanvasElement>;

  public cargando = false;
  public subiendoFoto = false;
  public mostrarModal = false;
  public archivoSeleccionado?: File;
  public previewUrl?: string;
  
  // Lightbox
  public mostrarLightbox = false;

  // Cámara
  public modoCamara = false;
  public camaraActiva = false;
  public stream?: MediaStream;
  public camaraDisponible = false;

  constructor(private personasService: PersonasService) {
    this.verificarCamara();
  }

  ngOnInit() {
    if (!this.idPersona) {
      console.error('⚠️ ID Persona es requerido');
      return;
    }
    this.cargarFoto();
  }

  ngOnDestroy() {
    this.detenerCamara();
  }

  verificarCamara() {
    this.camaraDisponible = !!(navigator.mediaDevices?.getUserMedia);
  }

  cargarFoto() {
    this.cargando = true;
    this.personasService.obtenerFoto(this.idPersona).subscribe({
      next: (response: any) => {
        const rutaFoto = response.body?.foto;
        // Agregar timestamp para evitar caché
        this.fotoActual = rutaFoto ? rutaFoto + '?t=' + new Date().getTime() : undefined;
        this.cargando = false;
      },
      error: (error: any) => {
        console.error('Error al cargar foto:', error);
        this.cargando = false;
      },
    });
  }

  abrirModal() {
    this.archivoSeleccionado = undefined;
    this.previewUrl = undefined;
    this.mostrarModal = true;
  }

  cerrarModal() {
    this.detenerCamara();
    this.mostrarModal = false;
    this.archivoSeleccionado = undefined;
    this.previewUrl = undefined;
    this.modoCamara = false;
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    // Validar tamaño (10MB)
    if (file.size > 10 * 1024 * 1024) {
      Swal.fire('Error', 'La imagen no puede superar 10MB', 'error');
      event.target.value = '';
      return;
    }

    // Validar extensión
    const extensionesPermitidas = ['jpg', 'jpeg', 'png'];
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!extension || !extensionesPermitidas.includes(extension)) {
      Swal.fire('Error', 'Solo se permiten archivos JPG, JPEG o PNG', 'error');
      event.target.value = '';
      return;
    }

    this.archivoSeleccionado = file;

    // Generar preview
    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.previewUrl = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  subirFoto() {
    if (!this.archivoSeleccionado) {
      Swal.fire('Error', 'Debe seleccionar una imagen', 'error');
      return;
    }

    this.subiendoFoto = true;

    this.personasService.subirFoto(this.idPersona, this.archivoSeleccionado).subscribe({
      next: (response: any) => {
        this.subiendoFoto = false;
        
        // Agregar timestamp para forzar recarga (evitar caché)
        this.fotoActual = response.ruta_foto + '?t=' + new Date().getTime();
        
        this.fotoActualizada.emit({
          ruta: response.ruta_foto,
          eliminada: false
        });
        
        Swal.fire('Éxito', 'Foto subida correctamente', 'success');
        this.cerrarModal();
      },
      error: (error: any) => {
        this.subiendoFoto = false;
        console.error('Error al subir foto:', error);
        Swal.fire('Error', 'No se pudo subir la foto', 'error');
      },
    });
  }

  eliminarFoto() {
    Swal.fire({
      title: '¿Eliminar foto?',
      text: 'Se eliminará la foto de perfil',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (result.isConfirmed) {
        this.personasService.eliminarFoto(this.idPersona).subscribe({
          next: () => {
            this.fotoActual = undefined;
            
            this.fotoActualizada.emit({
              ruta: null,
              eliminada: true
            });
            
            Swal.fire('Eliminada', 'Foto eliminada correctamente', 'success');
          },
          error: (error: any) => {
            console.error('Error al eliminar foto:', error);
            Swal.fire('Error', 'No se pudo eliminar la foto', 'error');
          },
        });
      }
    });
  }

  obtenerUrlFoto(): string {
    if (!this.fotoActual) return '';
    return this.personasService.obtenerUrlFoto(this.fotoActual);
  }

  obtenerIniciales(): string {
    if (!this.nombrePersona || this.nombrePersona.trim() === '') return '';
    const nombres = this.nombrePersona.trim().split(' ');
    if (nombres.length >= 2) {
      return (nombres[0][0] + nombres[1][0]).toUpperCase();
    }
    return nombres[0][0].toUpperCase();
  }

  // LIGHTBOX
  abrirLightbox() {
    this.mostrarLightbox = true;
  }

  cerrarLightbox() {
    this.mostrarLightbox = false;
  }

  // MÉTODOS DE CÁMARA
  activarCamara() {
    this.modoCamara = true;
    this.archivoSeleccionado = undefined;
    this.previewUrl = undefined;

    const constraints = {
      video: {
        facingMode: 'user',
        width: { ideal: 1280 },
        height: { ideal: 720 }
      }
    };

    navigator.mediaDevices.getUserMedia(constraints)
      .then((stream) => {
        this.stream = stream;
        
        setTimeout(() => {
          if (this.videoElement) {
            const video = this.videoElement.nativeElement;
            video.srcObject = stream;
            
            // Esperar a que el video esté listo
            video.onloadedmetadata = () => {
              video.play().then(() => {
                this.camaraActiva = true;
              }).catch((error) => {
                console.error('Error al reproducir video:', error);
              });
            };
          }
        }, 100);
      })
      .catch((error) => {
        console.error('Error al acceder a la cámara:', error);
        Swal.fire('Error', 'No se pudo acceder a la cámara', 'error');
        this.modoCamara = false;
      });
  }

  detenerCamara() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = undefined;
    }
    this.camaraActiva = false;
  }

  capturarFoto() {
    if (!this.videoElement || !this.canvasElement) return;

    const video = this.videoElement.nativeElement;
    const canvas = this.canvasElement.nativeElement;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Verificar que el video tenga dimensiones válidas
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      Swal.fire('Error', 'La cámara no está lista. Intenta de nuevo.', 'error');
      return;
    }

    // Establecer dimensiones del canvas
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Dibujar el frame actual del video en el canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Obtener la imagen como dataURL inmediatamente
    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.95);
    this.previewUrl = imageDataUrl;
    
    // Convertir dataURL a Blob de forma síncrona
    const arr = imageDataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    const blob = new Blob([u8arr], { type: mime });
    
    // Crear archivo
    const file = new File([blob], `foto_${Date.now()}.jpg`, { type: 'image/jpeg' });
    this.archivoSeleccionado = file;
    
    // Ahora sí detener la cámara
    this.detenerCamara();
    this.modoCamara = false;
  }

  cambiarCamara() {
    if (!this.stream) return;

    const videoTrack = this.stream.getVideoTracks()[0];
    const currentFacingMode = videoTrack.getSettings().facingMode;
    
    this.detenerCamara();

    const constraints = {
      video: {
        facingMode: currentFacingMode === 'user' ? 'environment' : 'user',
        width: { ideal: 1280 },
        height: { ideal: 720 }
      }
    };

    navigator.mediaDevices.getUserMedia(constraints)
      .then((stream) => {
        this.stream = stream;
        
        if (this.videoElement) {
          const video = this.videoElement.nativeElement;
          video.srcObject = stream;
          
          video.onloadedmetadata = () => {
            video.play().then(() => {
              this.camaraActiva = true;
            });
          };
        }
      })
      .catch((error) => {
        console.error('Error al cambiar cámara:', error);
        this.activarCamara();
      });
  }

  volverASeleccion() {
    this.detenerCamara();
    this.modoCamara = false;
    this.archivoSeleccionado = undefined;
    this.previewUrl = undefined;
  }
}