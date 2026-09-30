import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GalleryImage } from '../galeria-modos.types';
import { obtenerEstiloRotacion } from '../galeria-modos-rotation.helpers';

@Component({
  selector: 'app-cuaderno-escolar-modo',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="cuaderno-page">
      <div class="cuaderno-margin"></div>
      <div class="cuaderno-holes">
        <span *ngFor="let _ of [1,2,3,4,5,6,7,8]"></span>
      </div>

      <div class="cuaderno-grid">
        <div
          *ngFor="let image of images; let i = index; trackBy: trackByGuid"
          class="cuaderno-foto"
          [attr.data-aos]="'fade-up'"
          [attr.data-aos-delay]="(i % 12) * 60"
          (click)="imageClick.emit(image)"
        >
          <div class="foto-borde">
            <img [src]="image.url" [alt]="image.alt" [ngStyle]="obtenerEstiloRotacion(image.guid)"
              loading="lazy" />
            <button class="foto-girar" (click)="onGirar(image.guid, $event)" title="Girar imagen">↻</button>
          <button class="foto-download" (click)="onDownload(image, $event)" title="Descargar">⬇</button>
          </div>
          <p class="foto-anotacion">{{ image.alt || ('Foto ' + (i + 1)) }}</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .cuaderno-page {
      position: relative;
      background:
        repeating-linear-gradient(0deg, transparent 0, transparent 31px, rgba(70, 130, 180, 0.35) 31px, rgba(70, 130, 180, 0.35) 32px),
        #fdfdf5;
      min-height: 600px;
      padding: 2rem 2rem 2rem 5rem;
      box-shadow: 0 6px 20px rgba(0,0,0,0.2);
      border-radius: 4px;
    }

    .cuaderno-margin {
      position: absolute;
      top: 0; left: 4rem; bottom: 0;
      width: 2px;
      background: #d44;
      opacity: 0.6;
    }

    .cuaderno-holes {
      position: absolute;
      left: 1.2rem; top: 0; bottom: 0;
      display: flex; flex-direction: column;
      justify-content: space-around;
      padding: 2rem 0;
    }
    .cuaderno-holes span {
      width: 18px; height: 18px;
      background: rgba(0,0,0,0.18);
      border-radius: 50%;
      box-shadow: inset 0 1px 2px rgba(0,0,0,0.3);
    }

    .cuaderno-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 2rem 1.5rem;
    }
    @media (max-width: 768px) {
      .cuaderno-page { padding: 1.5rem 1rem 1.5rem 3rem; }
      .cuaderno-grid { grid-template-columns: 1fr; }
    }

    .cuaderno-foto {
      cursor: pointer;
      transition: transform 0.3s ease;
    }
    .cuaderno-foto:hover { transform: rotate(-1deg) scale(1.02); }

    .foto-borde {
      position: relative;
      background: #fff;
      padding: 6px;
      box-shadow: 0 3px 10px rgba(0,0,0,0.2);
      border: 1px solid #ddd;
    }
    .foto-borde img { width: 100%; aspect-ratio: 4/3; object-fit: cover; display: block; }

    .foto-anotacion {
      margin-top: 0.5rem;
      font-family: 'Caveat', 'Comic Sans MS', cursive;
      color: #1e3a5f;
      font-size: 1.15rem;
      text-align: center;
    }

    .foto-download {
      position: absolute; top: 10px; right: 10px;
      background: rgba(255,255,255,0.9);
      border: none; border-radius: 50%;
      width: 30px; height: 30px;
      cursor: pointer;
      opacity: 0; transition: opacity 0.3s;
    }
    .cuaderno-foto:hover .foto-download { opacity: 1; }
    .cuaderno-foto:hover .foto-girar { opacity: 1; }

    @media (prefers-reduced-motion: reduce) {
      .cuaderno-foto, .cuaderno-foto:hover { transform: none; transition: none; }
    }
  
    .foto-girar {
      position: absolute;
      background: rgba(255,255,255,0.9);
      border: none;
      border-radius: 50%;
      width: 30px;
      height: 30px;
      cursor: pointer;
      opacity: 0;
      transition: opacity 0.3s;
      font-size: 0.9rem;
      z-index: 4;
      /* Posicionado a la izquierda del botón de descarga */
      top: 12px;
      right: 50px;
    }

  `],
})
export class CuadernoEscolarModoComponent {
  @Input() images: GalleryImage[] = [];
  @Input() isMobile: boolean = false;
  @Input() rotaciones: Map<string, number> = new Map();
  @Output() imageClick = new EventEmitter<GalleryImage>();
  @Output() imageDownload = new EventEmitter<{ image: GalleryImage; event: Event }>();
  @Output() imageGirar = new EventEmitter<string>();

  trackByGuid(index: number, image: GalleryImage): string {
    return image.guid;
  }

  onDownload(image: GalleryImage, event: Event): void {
    event.stopPropagation();
    this.imageDownload.emit({ image, event });
  }

  /** Aplica el style CSS de rotación a una imagen según su guid. */
  obtenerEstiloRotacion(guid: string) {
    return obtenerEstiloRotacion(this.rotaciones, guid);
  }

  /** Pide al padre que gire la imagen 90°. */
  onGirar(guid: string, event: Event): void {
    event.stopPropagation();
    this.imageGirar.emit(guid);
  }
}
