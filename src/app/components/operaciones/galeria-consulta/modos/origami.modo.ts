import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GalleryImage } from '../galeria-modos.types';
import { obtenerEstiloRotacion } from '../galeria-modos-rotation.helpers';

@Component({
  selector: 'app-origami-modo',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="origami-grid">
      <div
        *ngFor="let image of images; let i = index; trackBy: trackByGuid"
        class="origami-card"
        [style.animation-delay.s]="i * 0.1"
        (click)="imageClick.emit(image)"
      >
        <div class="origami-fold origami-tl"></div>
        <div class="origami-fold origami-tr"></div>
        <div class="origami-fold origami-bl"></div>
        <div class="origami-fold origami-br"></div>

        <div class="origami-image">
          <img [src]="image.url" [alt]="image.alt" [ngStyle]="obtenerEstiloRotacion(image.guid)"
              loading="lazy" />
        </div>

        <button class="origami-girar" (click)="onGirar(image.guid, $event)" title="Girar imagen">↻</button>
          <button class="origami-download" (click)="onDownload(image, $event)" title="Descargar">⬇</button>
      </div>
    </div>
  `,
  styles: [`
    .origami-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 1.5rem;
      padding: 1rem 0;
      perspective: 1200px;
    }
    @media (max-width: 768px) {
      .origami-grid { grid-template-columns: repeat(2, 1fr); gap: 1rem; }
    }

    .origami-card {
      position: relative;
      aspect-ratio: 1;
      cursor: pointer;
      animation: unfold 1.2s cubic-bezier(0.4, 0, 0.2, 1) backwards;
    }

    @keyframes unfold {
      0%   { transform: scale(0.3) rotate(-90deg); opacity: 0; }
      60%  { transform: scale(1.05) rotate(5deg); opacity: 1; }
      100% { transform: scale(1) rotate(0deg); opacity: 1; }
    }

    .origami-image {
      position: absolute; inset: 0;
      overflow: hidden;
      border-radius: 4px;
      box-shadow: 0 6px 18px rgba(0,0,0,0.25);
      transition: transform 0.3s ease;
    }
    .origami-card:hover .origami-image { transform: scale(1.04) rotate(-2deg); }
    .origami-image img { width: 100%; height: 100%; object-fit: cover; display: block; }

    .origami-fold {
      position: absolute;
      width: 25px; height: 25px;
      background: rgba(255,255,255,0.7);
      pointer-events: none;
      z-index: 2;
    }
    .origami-tl { top: 0; left: 0; clip-path: polygon(0 0, 100% 0, 0 100%); box-shadow: 1px 1px 3px rgba(0,0,0,0.2); }
    .origami-tr { top: 0; right: 0; clip-path: polygon(0 0, 100% 0, 100% 100%); }
    .origami-bl { bottom: 0; left: 0; clip-path: polygon(0 0, 0 100%, 100% 100%); }
    .origami-br { bottom: 0; right: 0; clip-path: polygon(100% 0, 100% 100%, 0 100%); }

    .origami-download {
      position: absolute; top: 8px; right: 8px;
      background: rgba(255,255,255,0.9);
      border: none; border-radius: 50%;
      width: 30px; height: 30px;
      cursor: pointer;
      opacity: 0; transition: opacity 0.3s;
      z-index: 3;
    }
    .origami-card:hover .origami-download { opacity: 1; }
    .origami-card:hover .origami-girar { opacity: 1; }

    @media (prefers-reduced-motion: reduce) {
      .origami-card { animation: none; }
      .origami-card:hover .origami-image { transform: none; }
    }
  
    .origami-girar {
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
export class OrigamiModoComponent {
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
