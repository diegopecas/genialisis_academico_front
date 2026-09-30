import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GalleryImage } from '../galeria-modos.types';
import { obtenerEstiloRotacion } from '../galeria-modos-rotation.helpers';

@Component({
  selector: 'app-tira-pelicula-modo',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="filmstrip-container">
      <div class="filmstrip-track" [class.mobile]="isMobile">
        <div class="filmstrip-perforation top">
          <span *ngFor="let _ of perforaciones" class="perf"></span>
        </div>

        <div class="filmstrip-frames">
          <div
            *ngFor="let image of images; let i = index; trackBy: trackByGuid"
            class="filmstrip-frame"
            [attr.data-aos]="'zoom-in'"
            [attr.data-aos-delay]="(i % 10) * 80"
            (click)="imageClick.emit(image)"
          >
            <img [src]="image.url" [alt]="image.alt" [ngStyle]="obtenerEstiloRotacion(image.guid)"
              loading="lazy" />
            <button class="frame-girar" (click)="onGirar(image.guid, $event)" title="Girar imagen">↻</button>
          <button class="frame-download" (click)="onDownload(image, $event)" title="Descargar">⬇</button>
          </div>
        </div>

        <div class="filmstrip-perforation bottom">
          <span *ngFor="let _ of perforaciones" class="perf"></span>
        </div>
      </div>

      <p class="filmstrip-hint">Desliza horizontalmente →</p>
    </div>
  `,
  styles: [`
    .filmstrip-container {
      width: 100%;
      padding: 1rem 0;
    }

    .filmstrip-track {
      background: #1a1a1a;
      padding: 8px 0;
      overflow-x: auto;
      overflow-y: hidden;
      scroll-snap-type: x mandatory;
      -webkit-overflow-scrolling: touch;
      box-shadow: inset 0 0 30px rgba(0,0,0,0.7);
    }

    .filmstrip-perforation {
      display: flex; gap: 14px;
      padding: 4px 16px;
      min-width: max-content;
    }
    .perf {
      width: 18px; height: 14px;
      background: #fdfdfd;
      border-radius: 2px;
      flex-shrink: 0;
    }

    .filmstrip-frames {
      display: flex; gap: 8px;
      padding: 4px 16px;
      min-width: max-content;
    }

    .filmstrip-frame {
      width: 280px;
      aspect-ratio: 4 / 3;
      flex-shrink: 0;
      scroll-snap-align: start;
      cursor: pointer;
      position: relative;
      background: #000;
      border: 2px solid #333;
      transition: transform 0.3s;
    }
    .filmstrip-frame:hover {
      transform: scale(1.04);
      z-index: 2;
    }
    .filmstrip-frame img { width: 100%; height: 100%; object-fit: cover; display: block; }

    .frame-download {
      position: absolute; top: 8px; right: 8px;
      background: rgba(255,255,255,0.9);
      border: none; border-radius: 50%;
      width: 32px; height: 32px;
      cursor: pointer;
      opacity: 0; transition: opacity 0.3s;
    }
    .filmstrip-frame:hover .frame-download { opacity: 1; }
    .filmstrip-frame:hover .frame-girar { opacity: 1; }

    .filmstrip-track.mobile .filmstrip-frame { width: 220px; }

    .filmstrip-hint {
      text-align: center;
      color: rgba(255,255,255,0.6);
      font-size: 0.85rem;
      margin-top: 0.75rem;
    }

    @media (prefers-reduced-motion: reduce) {
      .filmstrip-frame, .filmstrip-frame:hover { transition: none; transform: none; }
    }
  
    .frame-girar {
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
export class TiraPeliculaModoComponent {
  @Input() images: GalleryImage[] = [];
  @Input() isMobile: boolean = false;
  @Input() rotaciones: Map<string, number> = new Map();
  @Output() imageClick = new EventEmitter<GalleryImage>();
  @Output() imageDownload = new EventEmitter<{ image: GalleryImage; event: Event }>();
  @Output() imageGirar = new EventEmitter<string>();

  // Suficientes perforaciones para llenar el ancho. Se calcula en base a la cantidad de frames.
  get perforaciones(): number[] {
    const count = Math.max(20, this.images.length * 4);
    return Array(count).fill(0);
  }

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
