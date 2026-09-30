import { Component, EventEmitter, Input, Output, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GalleryImage } from '../galeria-modos.types';
import { obtenerEstiloRotacion } from '../galeria-modos-rotation.helpers';

interface ComicImage extends GalleryImage {
  effect: string;
  showBubble: boolean;
}

@Component({
  selector: 'app-comic-clasico-modo',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="comic-page">
      <div class="comic-grid">
        <div
          *ngFor="let image of comicImages; let i = index; trackBy: trackByGuid"
          class="comic-panel"
          [class.wide]="i % 5 === 0"
          [attr.data-aos]="'fade-up'"
          [attr.data-aos-delay]="(i % 8) * 80"
          (click)="imageClick.emit(image)"
        >
          <div class="panel-image">
            <img [src]="image.url" [alt]="image.alt" [ngStyle]="obtenerEstiloRotacion(image.guid)"
              loading="lazy" />
          </div>
          <div *ngIf="image.showBubble" class="comic-bubble">{{ image.effect }}!</div>
          <button class="panel-girar" (click)="onGirar(image.guid, $event)" title="Girar imagen">↻</button>
          <button class="panel-download" (click)="onDownload(image, $event)" title="Descargar">⬇</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .comic-page {
      background: #fff8e7;
      padding: 1.5rem;
      border-radius: 8px;
      border: 4px solid #000;
      box-shadow: 6px 6px 0 #000;
    }

    .comic-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 12px;
    }
    @media (max-width: 768px) {
      .comic-grid { grid-template-columns: repeat(2, 1fr); gap: 8px; }
    }

    .comic-panel {
      position: relative;
      aspect-ratio: 1;
      background: #fff;
      border: 4px solid #000;
      cursor: pointer;
      overflow: hidden;
      box-shadow: 4px 4px 0 #000;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    .comic-panel:hover {
      transform: translate(-2px, -2px);
      box-shadow: 6px 6px 0 #000;
    }
    .comic-panel.wide {
      grid-column: span 2;
      aspect-ratio: 2 / 1;
    }
    @media (max-width: 768px) {
      .comic-panel.wide { grid-column: span 2; aspect-ratio: 2 / 1; }
    }

    .panel-image { width: 100%; height: 100%; }
    .panel-image img {
      width: 100%; height: 100%;
      object-fit: cover; display: block;
      filter: contrast(1.15) saturate(1.2);
    }

    .comic-bubble {
      position: absolute;
      top: 12px; right: 12px;
      background: #ffeb3b;
      border: 3px solid #000;
      padding: 6px 14px;
      font-family: 'Bangers', 'Comic Sans MS', cursive;
      font-size: 1.4rem;
      transform: rotate(-8deg);
      letter-spacing: 0.05em;
      box-shadow: 3px 3px 0 #000;
      z-index: 2;
    }

    .panel-download {
      position: absolute; bottom: 8px; right: 8px;
      background: #fff;
      border: 3px solid #000;
      width: 34px; height: 34px;
      cursor: pointer;
      opacity: 0; transition: opacity 0.3s;
      box-shadow: 2px 2px 0 #000;
      font-weight: bold;
    }
    .comic-panel:hover .panel-download { opacity: 1; }
    .comic-panel:hover .panel-girar { opacity: 1; }

    @media (prefers-reduced-motion: reduce) {
      .comic-panel, .comic-panel:hover { transition: none; transform: none; }
    }
  
    .panel-girar {
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
export class ComicClasicoModoComponent implements OnChanges {
  @Input() images: GalleryImage[] = [];
  @Input() isMobile: boolean = false;
  @Input() rotaciones: Map<string, number> = new Map();
  @Output() imageClick = new EventEmitter<GalleryImage>();
  @Output() imageDownload = new EventEmitter<{ image: GalleryImage; event: Event }>();
  @Output() imageGirar = new EventEmitter<string>();

  comicImages: ComicImage[] = [];
  private effects = ['POW', 'WOW', 'ZAP', 'BOOM', 'YAY', 'OOH', 'AAH', 'WOOSH'];

  ngOnChanges(): void {
    this.comicImages = this.images.map((img) => {
      const h = this.hash(img.guid);
      return {
        ...img,
        effect: this.effects[h % this.effects.length],
        showBubble: h % 4 === 0, // ~25% tienen bubble
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
