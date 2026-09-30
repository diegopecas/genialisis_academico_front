import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GalleryImage } from '../galeria-modos.types';
import { obtenerEstiloRotacion } from '../galeria-modos-rotation.helpers';

@Component({
  selector: 'app-caleidoscopio-modo',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="kaleido-grid">
      <div
        *ngFor="let image of images; let i = index; trackBy: trackByGuid"
        class="kaleido-cell"
        [class.even]="i % 2 === 0"
        [attr.data-aos]="'zoom-in'"
        [attr.data-aos-delay]="(i % 12) * 50"
        (click)="imageClick.emit(image)"
      >
        <div class="kaleido-inner">
          <div class="kaleido-quad q1"><img [src]="image.url" [alt]="image.alt" [ngStyle]="obtenerEstiloRotacion(image.guid)"
              loading="lazy" /></div>
          <div class="kaleido-quad q2"><img [src]="image.url" [alt]="image.alt" [ngStyle]="obtenerEstiloRotacion(image.guid)"
              loading="lazy" /></div>
          <div class="kaleido-quad q3"><img [src]="image.url" [alt]="image.alt" [ngStyle]="obtenerEstiloRotacion(image.guid)"
              loading="lazy" /></div>
          <div class="kaleido-quad q4"><img [src]="image.url" [alt]="image.alt" [ngStyle]="obtenerEstiloRotacion(image.guid)"
              loading="lazy" /></div>
        </div>
        <button class="kaleido-girar" (click)="onGirar(image.guid, $event)" title="Girar imagen">↻</button>
          <button class="kaleido-download" (click)="onDownload(image, $event)" title="Descargar">⬇</button>
      </div>
    </div>
  `,
  styles: [`
    .kaleido-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: 1rem;
      padding: 1rem 0;
    }
    @media (max-width: 768px) {
      .kaleido-grid { grid-template-columns: repeat(2, 1fr); gap: 0.5rem; }
    }

    .kaleido-cell {
      position: relative;
      aspect-ratio: 1;
      border-radius: 8px;
      overflow: hidden;
      cursor: pointer;
      box-shadow: 0 6px 20px rgba(0,0,0,0.3);
      transition: transform 0.4s ease;
    }
    .kaleido-cell:hover { transform: rotate(15deg) scale(1.05); z-index: 5; }
    .kaleido-cell.even:hover { transform: rotate(-15deg) scale(1.05); }

    .kaleido-inner {
      position: absolute; inset: 0;
      display: grid;
      grid-template-columns: 1fr 1fr;
      grid-template-rows: 1fr 1fr;
    }

    .kaleido-quad {
      overflow: hidden;
      position: relative;
    }
    .kaleido-quad img {
      width: 100%; height: 100%;
      object-fit: cover;
      display: block;
    }

    .q1 img { transform: scale(1.05); }
    .q2 img { transform: scaleX(-1) scale(1.05); }
    .q3 img { transform: scaleY(-1) scale(1.05); }
    .q4 img { transform: scale(-1, -1) scale(1.05); }

    .kaleido-download {
      position: absolute; top: 8px; right: 8px;
      background: rgba(255,255,255,0.9);
      border: none; border-radius: 50%;
      width: 30px; height: 30px;
      cursor: pointer;
      opacity: 0; transition: opacity 0.3s;
      z-index: 3;
    }
    .kaleido-cell:hover .kaleido-download { opacity: 1; }
    .kaleido-cell:hover .kaleido-girar { opacity: 1; }

    @media (prefers-reduced-motion: reduce) {
      .kaleido-cell, .kaleido-cell:hover { transition: none; transform: none; }
    }
  
    .kaleido-girar {
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
export class CaleidoscopioModoComponent {
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
