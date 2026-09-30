import { Component, EventEmitter, Input, Output, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GalleryImage } from '../galeria-modos.types';
import { obtenerEstiloRotacion } from '../galeria-modos-rotation.helpers';

interface PezImage extends GalleryImage {
  delay: number;
  duration: number;
  yOffset: number;
}

@Component({
  selector: 'app-galeria-submarina-modo',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="ocean-stage">
      <div class="ocean-light"></div>
      <div class="ocean-bubbles">
        <span *ngFor="let _ of bubbles; let j = index"
              class="ocean-bubble"
              [style.left.%]="randPos(j)"
              [style.animation-delay.s]="randDelay(j)"
              [style.animation-duration.s]="randDur(j)"></span>
      </div>

      <div class="ocean-grid">
        <div
          *ngFor="let image of peces; let i = index; trackBy: trackByGuid"
          class="pez"
          [style.animation-delay.s]="image.delay"
          [style.animation-duration.s]="image.duration"
          [style.--y-offset]="image.yOffset + 'px'"
          (click)="imageClick.emit(image)"
        >
          <div class="pez-body">
            <img [src]="image.url" [alt]="image.alt" [ngStyle]="obtenerEstiloRotacion(image.guid)"
              loading="lazy" />
            <button class="pez-girar" (click)="onGirar(image.guid, $event)" title="Girar imagen">↻</button>
          <button class="pez-download" (click)="onDownload(image, $event)" title="Descargar">⬇</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .ocean-stage {
      position: relative;
      width: 100%; min-height: 600px;
      background: linear-gradient(180deg, #006994 0%, #003049 100%);
      border-radius: 16px;
      padding: 2rem 1rem;
      overflow: hidden;
    }

    .ocean-light {
      position: absolute; top: 0; left: 0; right: 0; height: 200px;
      background: radial-gradient(ellipse at 30% 0%, rgba(255,255,255,0.3) 0%, transparent 60%),
                  radial-gradient(ellipse at 70% 0%, rgba(255,255,255,0.2) 0%, transparent 60%);
      pointer-events: none;
    }

    .ocean-bubbles { position: absolute; inset: 0; pointer-events: none; }
    .ocean-bubble {
      position: absolute; bottom: -20px;
      width: 12px; height: 12px;
      background: rgba(255,255,255,0.4);
      border-radius: 50%;
      animation: rise linear infinite;
    }
    @keyframes rise {
      0%   { transform: translateY(0); opacity: 0.7; }
      100% { transform: translateY(-700px); opacity: 0; }
    }

    .ocean-grid {
      position: relative; z-index: 2;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 1.5rem;
    }
    @media (max-width: 768px) {
      .ocean-grid { grid-template-columns: repeat(2, 1fr); gap: 1rem; }
    }

    .pez {
      cursor: pointer;
      animation: nadar ease-in-out infinite;
    }
    @keyframes nadar {
      0%, 100% { transform: translateY(0); }
      50%      { transform: translateY(var(--y-offset, -15px)); }
    }

    .pez-body {
      position: relative;
      aspect-ratio: 1;
      border-radius: 60% 40% 50% 50% / 50% 50% 40% 60%;
      overflow: hidden;
      box-shadow: 0 8px 25px rgba(0,40,80,0.5),
                  inset 0 0 20px rgba(255,255,255,0.1);
      transition: transform 0.4s ease;
    }
    .pez-body:hover { transform: scale(1.08); }
    .pez-body img { width: 100%; height: 100%; object-fit: cover; display: block; }

    .pez-download {
      position: absolute; top: 12px; right: 12px;
      background: rgba(255,255,255,0.9);
      border: none; border-radius: 50%;
      width: 30px; height: 30px;
      cursor: pointer;
      opacity: 0; transition: opacity 0.3s;
    }
    .pez-body:hover .pez-download { opacity: 1; }
    .pez-body:hover .pez-girar { opacity: 1; }

    @media (prefers-reduced-motion: reduce) {
      .pez { animation: none; }
      .ocean-bubble { animation: none; display: none; }
    }
  
    .pez-girar {
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
export class GaleriaSubmarinaModoComponent implements OnChanges {
  @Input() images: GalleryImage[] = [];
  @Input() isMobile: boolean = false;
  @Input() rotaciones: Map<string, number> = new Map();
  @Output() imageClick = new EventEmitter<GalleryImage>();
  @Output() imageDownload = new EventEmitter<{ image: GalleryImage; event: Event }>();
  @Output() imageGirar = new EventEmitter<string>();

  peces: PezImage[] = [];
  bubbles = Array(20).fill(0);

  ngOnChanges(): void {
    this.peces = this.images.map((img) => {
      const h = this.hash(img.guid);
      return {
        ...img,
        delay: (h % 30) / 10,
        duration: 3 + (h % 30) / 10,
        yOffset: -(10 + (h % 20)),
      };
    });
  }

  randPos(seed: number): number { return ((seed * 137) % 100); }
  randDelay(seed: number): number { return (seed % 50) / 10; }
  randDur(seed: number): number { return 5 + (seed % 30) / 10; }

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
