import { Component, EventEmitter, Input, Output, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GalleryImage } from '../galeria-modos.types';
import { obtenerEstiloRotacion } from '../galeria-modos-rotation.helpers';

interface ScrapImage extends GalleryImage {
  rotacion: number;
  tapeColor: string;
  sticker: string | null;
}

@Component({
  selector: 'app-scrapbook-modo',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="scrapbook-page">
      <div class="scrap-grid">
        <div
          *ngFor="let image of scrapImages; let i = index; trackBy: trackByGuid"
          class="scrap-item"
          [style.transform]="'rotate(' + image.rotacion + 'deg)'"
          [attr.data-aos]="'fade-up'"
          [attr.data-aos-delay]="(i % 12) * 70"
          (click)="imageClick.emit(image)"
        >
          <span class="washi-tape" [style.background]="image.tapeColor"></span>
          <div class="scrap-photo">
            <img [src]="image.url" [alt]="image.alt" [ngStyle]="obtenerEstiloRotacion(image.guid)"
              loading="lazy" />
          </div>
          <span *ngIf="image.sticker" class="scrap-sticker">{{ image.sticker }}</span>
          <button class="scrap-girar" (click)="onGirar(image.guid, $event)" title="Girar imagen">↻</button>
          <button class="scrap-download" (click)="onDownload(image, $event)" title="Descargar">⬇</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .scrapbook-page {
      background:
        repeating-linear-gradient(0deg, transparent 0, transparent 28px, rgba(150, 100, 50, 0.06) 28px, rgba(150, 100, 50, 0.06) 29px),
        #fbf3e3;
      border-radius: 6px;
      padding: 2.5rem 1.5rem;
      min-height: 600px;
      box-shadow: inset 0 0 60px rgba(150, 100, 50, 0.15);
    }

    .scrap-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 2.5rem 1.5rem;
    }
    @media (max-width: 768px) {
      .scrap-grid { grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); }
    }

    .scrap-item {
      position: relative;
      background: #fff;
      padding: 8px;
      box-shadow: 0 4px 14px rgba(0,0,0,0.2);
      cursor: pointer;
      transition: transform 0.3s ease;
    }
    .scrap-item:hover { transform: rotate(0deg) scale(1.04) !important; z-index: 2; }

    .scrap-photo {
      aspect-ratio: 1;
      overflow: hidden;
    }
    .scrap-photo img { width: 100%; height: 100%; object-fit: cover; display: block; }

    .washi-tape {
      position: absolute;
      top: -10px; left: 50%;
      transform: translateX(-50%) rotate(-3deg);
      width: 70%; height: 22px;
      opacity: 0.75;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    .scrap-sticker {
      position: absolute;
      bottom: -14px; right: -14px;
      font-size: 2.2rem;
      filter: drop-shadow(0 2px 3px rgba(0,0,0,0.25));
      transform: rotate(15deg);
    }

    .scrap-download {
      position: absolute;
      top: 12px; right: 12px;
      background: rgba(255,255,255,0.9);
      border: none; border-radius: 50%;
      width: 28px; height: 28px;
      cursor: pointer;
      opacity: 0; transition: opacity 0.3s;
      font-size: 0.8rem;
    }
    .scrap-item:hover .scrap-download { opacity: 1; }
    .scrap-item:hover .scrap-girar { opacity: 1; }

    @media (prefers-reduced-motion: reduce) {
      .scrap-item, .scrap-item:hover { transform: none !important; transition: none; }
    }
  
    .scrap-girar {
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
export class ScrapbookModoComponent implements OnChanges {
  @Input() images: GalleryImage[] = [];
  @Input() isMobile: boolean = false;
  @Input() rotaciones: Map<string, number> = new Map();
  @Output() imageClick = new EventEmitter<GalleryImage>();
  @Output() imageDownload = new EventEmitter<{ image: GalleryImage; event: Event }>();
  @Output() imageGirar = new EventEmitter<string>();

  scrapImages: ScrapImage[] = [];

  private tapeColors = [
    'repeating-linear-gradient(45deg, #ff9aa2, #ff9aa2 8px, #ffb7b2 8px, #ffb7b2 16px)',
    'repeating-linear-gradient(45deg, #b5ead7, #b5ead7 8px, #c7ceea 8px, #c7ceea 16px)',
    'repeating-linear-gradient(45deg, #fdffb6, #fdffb6 8px, #caffbf 8px, #caffbf 16px)',
    'repeating-linear-gradient(45deg, #a0c4ff, #a0c4ff 8px, #bdb2ff 8px, #bdb2ff 16px)',
  ];

  private stickers = ['⭐', '❤️', '🌸', '🎈', '☀️', '🌈', null, null, null];

  ngOnChanges(): void {
    this.scrapImages = this.images.map((img) => {
      const h1 = this.hash(img.guid);
      const h2 = this.hash(img.guid + 'b');
      return {
        ...img,
        rotacion: (h1 % 9) - 4,
        tapeColor: this.tapeColors[h1 % this.tapeColors.length],
        sticker: this.stickers[h2 % this.stickers.length],
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
