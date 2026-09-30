import { Component, EventEmitter, Input, Output, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GalleryImage } from '../galeria-modos.types';
import { obtenerEstiloRotacion } from '../galeria-modos-rotation.helpers';

interface GloboImage extends GalleryImage {
  color: string;
  rotation: number;
  delay: number;
}

@Component({
  selector: 'app-globos-modo',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="globos-stage">
      <div class="globos-grid">
        <div
          *ngFor="let image of globos; let i = index; trackBy: trackByGuid"
          class="globo-wrap"
          [style.animation-delay.s]="image.delay"
          (click)="imageClick.emit(image)"
        >
          <div class="globo-balloon" [style.background]="image.color">
            <div class="balloon-shine"></div>
            <span class="balloon-knot"></span>
          </div>
          <div class="globo-string"></div>
          <div class="globo-photo" [style.transform]="'rotate(' + image.rotation + 'deg)'">
            <img [src]="image.url" [alt]="image.alt" [ngStyle]="obtenerEstiloRotacion(image.guid)"
              loading="lazy" />
            <button class="globo-girar" (click)="onGirar(image.guid, $event)" title="Girar imagen">↻</button>
          <button class="globo-download" (click)="onDownload(image, $event)" title="Descargar">⬇</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .globos-stage {
      width: 100%; min-height: 600px;
      background: linear-gradient(180deg, #87ceeb 0%, #fff8dc 100%);
      border-radius: 16px;
      padding: 2rem 1rem 4rem;
    }

    .globos-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 3rem 1.5rem;
      padding-top: 2rem;
    }
    @media (max-width: 768px) {
      .globos-grid { grid-template-columns: repeat(2, 1fr); gap: 2rem 1rem; }
    }

    .globo-wrap {
      display: flex; flex-direction: column;
      align-items: center;
      cursor: pointer;
      animation: floatUp 4s ease-in-out infinite;
    }
    @keyframes floatUp {
      0%, 100% { transform: translateY(0); }
      50%      { transform: translateY(-10px); }
    }

    .globo-balloon {
      position: relative;
      width: 80px; height: 96px;
      border-radius: 50% 50% 50% 50% / 55% 55% 45% 45%;
      box-shadow: inset -5px -8px 15px rgba(0,0,0,0.2), 0 6px 18px rgba(0,0,0,0.15);
    }
    .balloon-shine {
      position: absolute; top: 18%; left: 22%;
      width: 18px; height: 25px;
      background: rgba(255,255,255,0.5);
      border-radius: 50%;
      filter: blur(2px);
    }
    .balloon-knot {
      position: absolute; bottom: -8px; left: 50%; transform: translateX(-50%);
      width: 0; height: 0;
      border-left: 6px solid transparent;
      border-right: 6px solid transparent;
      border-top: 10px solid currentColor;
    }
    .globo-string {
      width: 1px; height: 30px;
      background: rgba(0,0,0,0.5);
    }

    .globo-photo {
      position: relative;
      width: 140px; height: 140px;
      border-radius: 8px;
      overflow: hidden;
      background: #fff;
      padding: 5px;
      box-shadow: 0 4px 14px rgba(0,0,0,0.2);
      transition: transform 0.3s ease;
    }
    .globo-photo img { width: 100%; height: 100%; object-fit: cover; display: block; border-radius: 4px; }

    .globo-photo:hover { transform: rotate(0deg) scale(1.1) !important; z-index: 5; }

    .globo-download {
      position: absolute; top: 8px; right: 8px;
      background: rgba(255,255,255,0.9);
      border: none; border-radius: 50%;
      width: 26px; height: 26px;
      cursor: pointer;
      opacity: 0; transition: opacity 0.3s;
      font-size: 0.75rem;
    }
    .globo-photo:hover .globo-download { opacity: 1; }
    .globo-photo:hover .globo-girar { opacity: 1; }

    @media (prefers-reduced-motion: reduce) {
      .globo-wrap { animation: none; }
    }
  
    .globo-girar {
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
export class GlobosModoComponent implements OnChanges {
  @Input() images: GalleryImage[] = [];
  @Input() isMobile: boolean = false;
  @Input() rotaciones: Map<string, number> = new Map();
  @Output() imageClick = new EventEmitter<GalleryImage>();
  @Output() imageDownload = new EventEmitter<{ image: GalleryImage; event: Event }>();
  @Output() imageGirar = new EventEmitter<string>();

  globos: GloboImage[] = [];
  private colors = ['#ff6b6b', '#feca57', '#48dbfb', '#1dd1a1', '#ff9ff3', '#a29bfe', '#fab1a0'];

  ngOnChanges(): void {
    this.globos = this.images.map((img) => {
      const h = this.hash(img.guid);
      return {
        ...img,
        color: this.colors[h % this.colors.length],
        rotation: (h % 9) - 4,
        delay: (h % 30) / 10,
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
