import { Component, EventEmitter, Input, Output, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GalleryImage } from '../galeria-modos.types';
import { obtenerEstiloRotacion } from '../galeria-modos-rotation.helpers';

interface CorchoImage extends GalleryImage {
  rotacion: number;
  pinColor: string;
}

@Component({
  selector: 'app-tablon-corcho-modo',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="corcho-board">
      <div class="corcho-grid">
        <div
          *ngFor="let image of corchoImages; let i = index; trackBy: trackByGuid"
          class="corcho-foto"
          [style.transform]="'rotate(' + image.rotacion + 'deg)'"
          [attr.data-aos]="'fade-down'"
          [attr.data-aos-delay]="(i % 12) * 70"
          (click)="imageClick.emit(image)"
        >
          <span class="chincheta" [style.background]="image.pinColor"></span>
          <div class="foto-content">
            <img [src]="image.url" [alt]="image.alt" [ngStyle]="obtenerEstiloRotacion(image.guid)"
              loading="lazy" />
          </div>
          <button class="foto-girar" (click)="onGirar(image.guid, $event)" title="Girar imagen">↻</button>
          <button class="foto-download" (click)="onDownload(image, $event)" title="Descargar">⬇</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .corcho-board {
      background:
        radial-gradient(circle at 20% 20%, rgba(120, 70, 30, 0.4) 1px, transparent 1px),
        radial-gradient(circle at 60% 50%, rgba(150, 100, 50, 0.3) 1px, transparent 1px),
        radial-gradient(circle at 80% 80%, rgba(100, 60, 25, 0.4) 1px, transparent 1px),
        linear-gradient(135deg, #c9a373 0%, #b08858 100%);
      background-size: 8px 8px, 12px 12px, 6px 6px, cover;
      border: 12px solid #5d3a1a;
      border-radius: 8px;
      padding: 2rem 1.5rem;
      min-height: 600px;
      box-shadow: inset 0 0 60px rgba(80, 40, 10, 0.4),
                  0 8px 25px rgba(0,0,0,0.3);
    }

    .corcho-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 2.5rem 1.5rem;
    }
    @media (max-width: 768px) {
      .corcho-grid { grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 2rem 1rem; }
    }

    .corcho-foto {
      position: relative;
      background: #fff;
      padding: 8px;
      box-shadow: 0 6px 16px rgba(0,0,0,0.3);
      cursor: pointer;
      transition: transform 0.3s ease;
    }
    .corcho-foto:hover {
      transform: rotate(0deg) scale(1.04) !important;
      z-index: 5;
    }

    .chincheta {
      position: absolute;
      top: -8px; left: 50%;
      transform: translateX(-50%);
      width: 16px; height: 16px;
      border-radius: 50%;
      box-shadow: 0 2px 4px rgba(0,0,0,0.4),
                  inset -2px -2px 4px rgba(0,0,0,0.3),
                  inset 2px 2px 4px rgba(255,255,255,0.4);
      z-index: 3;
    }

    .foto-content {
      aspect-ratio: 1;
      overflow: hidden;
    }
    .foto-content img { width: 100%; height: 100%; object-fit: cover; display: block; }

    .foto-download {
      position: absolute; bottom: 12px; right: 12px;
      background: rgba(255,255,255,0.9);
      border: none; border-radius: 50%;
      width: 30px; height: 30px;
      cursor: pointer;
      opacity: 0; transition: opacity 0.3s;
    }
    .corcho-foto:hover .foto-download { opacity: 1; }
    .corcho-foto:hover .foto-girar { opacity: 1; }

    @media (prefers-reduced-motion: reduce) {
      .corcho-foto, .corcho-foto:hover { transform: none !important; transition: none; }
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
export class TablonCorchoModoComponent implements OnChanges {
  @Input() images: GalleryImage[] = [];
  @Input() isMobile: boolean = false;
  @Input() rotaciones: Map<string, number> = new Map();
  @Output() imageClick = new EventEmitter<GalleryImage>();
  @Output() imageDownload = new EventEmitter<{ image: GalleryImage; event: Event }>();
  @Output() imageGirar = new EventEmitter<string>();

  corchoImages: CorchoImage[] = [];
  private pinColors = ['#e74c3c', '#3498db', '#f1c40f', '#2ecc71', '#9b59b6', '#e67e22'];

  ngOnChanges(): void {
    this.corchoImages = this.images.map((img) => {
      const h = this.hash(img.guid);
      return {
        ...img,
        rotacion: (h % 11) - 5,
        pinColor: this.pinColors[h % this.pinColors.length],
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
