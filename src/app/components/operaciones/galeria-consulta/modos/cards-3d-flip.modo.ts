import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GalleryImage } from '../galeria-modos.types';
import { obtenerEstiloRotacion } from '../galeria-modos-rotation.helpers';

@Component({
  selector: 'app-cards-3d-flip-modo',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flip-grid">
      <div
        *ngFor="let image of images; let i = index; trackBy: trackByGuid"
        class="flip-card"
        [attr.data-aos]="'flip-left'"
        [attr.data-aos-delay]="(i % 12) * 60"
        (click)="onCardClick(image, $event)"
      >
        <div class="flip-inner">
          <div class="flip-front">
            <img [src]="image.url" [alt]="image.alt" [ngStyle]="obtenerEstiloRotacion(image.guid)"
              loading="lazy" />
          </div>
          <div class="flip-back">
            <span class="back-icon">✨</span>
            <p class="back-text">{{ image.alt || 'Click para ampliar' }}</p>
            <button class="flip-girar" (click)="onGirar(image.guid, $event)" title="Girar imagen">↻</button>
          <button class="flip-download" (click)="onDownload(image, $event)" title="Descargar">⬇ Descargar</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .flip-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: 1.5rem;
      padding: 1rem 0;
      perspective: 1500px;
    }
    @media (max-width: 768px) {
      .flip-grid { grid-template-columns: repeat(2, 1fr); gap: 1rem; }
    }

    .flip-card {
      aspect-ratio: 1;
      cursor: pointer;
    }

    .flip-inner {
      position: relative;
      width: 100%; height: 100%;
      transform-style: preserve-3d;
      transition: transform 0.7s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .flip-card:hover .flip-inner {
      transform: rotateY(180deg);
    }

    .flip-front, .flip-back {
      position: absolute; inset: 0;
      backface-visibility: hidden;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 6px 22px rgba(0,0,0,0.25);
    }
    .flip-front img { width: 100%; height: 100%; object-fit: cover; display: block; }

    .flip-back {
      transform: rotateY(180deg);
      background: linear-gradient(135deg, #4a90a4, #6bb3c9);
      color: #fff;
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      padding: 1.5rem; text-align: center;
      gap: 1rem;
    }
    .back-icon { font-size: 2.5rem; }
    .back-text { font-size: 1rem; line-height: 1.4; }

    .flip-download {
      background: rgba(255,255,255,0.2);
      border: 2px solid rgba(255,255,255,0.5);
      color: #fff;
      padding: 0.5rem 1rem;
      border-radius: 24px;
      cursor: pointer;
      font-size: 0.9rem;
      transition: background 0.2s;
    }
    .flip-download:hover { background: rgba(255,255,255,0.35); }

    @media (prefers-reduced-motion: reduce) {
      .flip-inner, .flip-card:hover .flip-inner { transition: none; transform: none; }
      .flip-back { transform: none; opacity: 0; pointer-events: none; }
    }
  
    .flip-girar {
      position: absolute;
      background: rgba(255,255,255,0.9);
      border: none;
      border-radius: 50%;
      width: 30px;
      height: 30px;
      cursor: pointer;
      opacity: 1;
      transition: opacity 0.3s;
      font-size: 0.9rem;
      z-index: 4;
      /* Posicionado a la izquierda del botón de descarga */
      top: 12px;
      right: 50px;
    }

  `],
})
export class Cards3dFlipModoComponent {
  @Input() images: GalleryImage[] = [];
  @Input() isMobile: boolean = false;
  @Input() rotaciones: Map<string, number> = new Map();
  @Output() imageClick = new EventEmitter<GalleryImage>();
  @Output() imageDownload = new EventEmitter<{ image: GalleryImage; event: Event }>();
  @Output() imageGirar = new EventEmitter<string>();

  trackByGuid(index: number, image: GalleryImage): string {
    return image.guid;
  }

  onCardClick(image: GalleryImage, event: MouseEvent): void {
    // Solo abre el lightbox si no se clickeó el botón de descarga
    const target = event.target as HTMLElement;
    if (target.closest('.flip-download')) return;
    this.imageClick.emit(image);
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
