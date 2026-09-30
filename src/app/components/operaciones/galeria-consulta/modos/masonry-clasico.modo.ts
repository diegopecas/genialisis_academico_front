import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GalleryImage } from '../galeria-modos.types';
import { obtenerEstiloRotacion } from '../galeria-modos-rotation.helpers';

@Component({
  selector: 'app-masonry-clasico-modo',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="masonry-grid">
      <div
        *ngFor="let image of images; let i = index; trackBy: trackByGuid"
        class="gallery-item"
        [attr.data-aos]="'fade-up'"
        [attr.data-aos-delay]="(i % (isMobile ? 12 : 18)) * 50"
        (click)="imageClick.emit(image)"
      >
        <div class="image-wrapper" [class.loaded]="image.loaded">
          <img [src]="image.url" [alt]="image.alt" [ngStyle]="obtenerEstiloRotacion(image.guid)"
              loading="lazy" />
          <div class="image-overlay">
            <div class="overlay-content">
              <span class="view-icon">🔍</span>
              <span class="view-text">Ver imagen</span>
            </div>
            <button class="girar-btn-grid" (click)="onGirar(image.guid, $event)" title="Girar imagen">↻</button>
          <button
              class="download-btn-grid"
              (click)="onDownload(image, $event)"
              title="Descargar"
            >⬇</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .masonry-grid {
      column-count: 4;
      column-gap: 1rem;
      padding: 1rem 0;
    }
    @media (max-width: 1200px) { .masonry-grid { column-count: 3; } }
    @media (max-width: 768px)  { .masonry-grid { column-count: 2; column-gap: 0.5rem; } }
    @media (max-width: 480px)  { .masonry-grid { column-count: 1; } }

    .gallery-item {
      break-inside: avoid;
      margin-bottom: 1rem;
      cursor: pointer;
    }

    .image-wrapper {
      position: relative;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(0,0,0,0.2);
      transition: transform 0.3s ease, box-shadow 0.3s ease;
    }
    .image-wrapper:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 30px rgba(0,0,0,0.3);
    }
    .image-wrapper img { width: 100%; display: block; }

    .image-overlay {
      position: absolute; inset: 0;
      background: linear-gradient(to top, rgba(0,0,0,0.7), transparent 50%);
      opacity: 0;
      transition: opacity 0.3s ease;
      display: flex; align-items: flex-end; justify-content: space-between;
      padding: 1rem;
    }
    .image-wrapper:hover .image-overlay { opacity: 1; }

    .overlay-content {
      color: #fff;
      display: flex; align-items: center; gap: 0.5rem;
    }
    .download-btn-grid {
      background: rgba(255,255,255,0.9);
      border: none; border-radius: 50%;
      width: 36px; height: 36px;
      cursor: pointer;
      font-size: 1rem;
    }

    @media (prefers-reduced-motion: reduce) {
      .image-wrapper, .image-wrapper:hover { transition: none; transform: none; }
    }
  
    .girar-btn-grid {
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
export class MasonryClasicoModoComponent {
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
