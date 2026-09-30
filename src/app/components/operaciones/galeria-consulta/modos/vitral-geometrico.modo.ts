import { Component, EventEmitter, Input, Output, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GalleryImage } from '../galeria-modos.types';
import { obtenerEstiloRotacion } from '../galeria-modos-rotation.helpers';

interface VitralImage extends GalleryImage {
  shape: string;
}

@Component({
  selector: 'app-vitral-geometrico-modo',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="vitral-grid">
      <div
        *ngFor="let image of vitralImages; let i = index; trackBy: trackByGuid"
        class="vitral-cell"
        [style.clip-path]="image.shape"
        [attr.data-aos]="'zoom-in'"
        [attr.data-aos-delay]="(i % 12) * 60"
        (click)="imageClick.emit(image)"
      >
        <img [src]="image.url" [alt]="image.alt" [ngStyle]="obtenerEstiloRotacion(image.guid)"
              loading="lazy" />
        <button class="vitral-girar" (click)="onGirar(image.guid, $event)" title="Girar imagen">↻</button>
          <button class="vitral-download" (click)="onDownload(image, $event)" title="Descargar">⬇</button>
      </div>
    </div>
  `,
  styles: [`
    .vitral-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 4px;
      padding: 1rem 0;
      background: #1a1a1a;
      border-radius: 16px;
      padding: 8px;
    }
    @media (max-width: 768px) {
      .vitral-grid { grid-template-columns: repeat(2, 1fr); gap: 4px; }
    }

    .vitral-cell {
      position: relative;
      aspect-ratio: 1;
      cursor: pointer;
      transition: transform 0.4s ease;
      filter: drop-shadow(0 0 2px #000);
    }
    .vitral-cell:hover { transform: scale(1.05); z-index: 5; }

    .vitral-cell img {
      width: 100%; height: 100%;
      object-fit: cover; display: block;
    }

    .vitral-download {
      position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
      background: rgba(255,255,255,0.95);
      border: none; border-radius: 50%;
      width: 36px; height: 36px;
      cursor: pointer;
      opacity: 0; transition: opacity 0.3s;
    }
    .vitral-cell:hover .vitral-download { opacity: 1; }
    .vitral-cell:hover .vitral-girar { opacity: 1; }

    @media (prefers-reduced-motion: reduce) {
      .vitral-cell, .vitral-cell:hover { transform: none; transition: none; }
    }
  
    .vitral-girar {
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
export class VitralGeometricoModoComponent implements OnChanges {
  @Input() images: GalleryImage[] = [];
  @Input() isMobile: boolean = false;
  @Input() rotaciones: Map<string, number> = new Map();
  @Output() imageClick = new EventEmitter<GalleryImage>();
  @Output() imageDownload = new EventEmitter<{ image: GalleryImage; event: Event }>();
  @Output() imageGirar = new EventEmitter<string>();

  vitralImages: VitralImage[] = [];

  // Formas geométricas variadas
  private shapes = [
    'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',  // hexágono
    'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',                     // diamante
    'polygon(0 0, 100% 0, 100% 100%, 0 100%)',                         // cuadrado
    'polygon(50% 0%, 100% 100%, 0% 100%)',                             // triángulo abajo
    'polygon(0 0, 100% 0, 50% 100%)',                                  // triángulo arriba
    'polygon(20% 0%, 80% 0%, 100% 50%, 80% 100%, 20% 100%, 0% 50%)',  // hexágono horizontal
    'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)',  // octágono apaisado
  ];

  ngOnChanges(): void {
    this.vitralImages = this.images.map((img) => {
      const h = this.hash(img.guid);
      return {
        ...img,
        shape: this.shapes[h % this.shapes.length],
      };
    });
  }

  private hash(s: string): number {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return Math.abs(h);
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
