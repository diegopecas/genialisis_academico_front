import { Component, EventEmitter, Input, Output, OnChanges, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GalleryImage } from '../galeria-modos.types';
import { obtenerEstiloRotacion } from '../galeria-modos-rotation.helpers';

interface BurbujaImage extends GalleryImage {
  x: number;       // 0-100 %
  y: number;       // 0-100 %
  size: number;    // px
  delay: number;   // s
  duration: number; // s
}

@Component({
  selector: 'app-burbujas-modo',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="burbujas-stage" [class.paused]="!visible">
      <div class="burbujas-bg">
        <span class="bg-bubble" *ngFor="let _ of bgBubbles" [style.left.%]="randPos()" [style.animation-duration.s]="randDur()"></span>
      </div>

      <div
        *ngFor="let image of burbujas; let i = index; trackBy: trackByGuid"
        class="burbuja"
        [style.left.%]="image.x"
        [style.top.%]="image.y"
        [style.width.px]="image.size"
        [style.height.px]="image.size"
        [style.animation-delay.s]="image.delay"
        [style.animation-duration.s]="image.duration"
        (click)="imageClick.emit(image)"
      >
        <img [src]="image.url" [alt]="image.alt" [ngStyle]="obtenerEstiloRotacion(image.guid)"
              loading="lazy" />
        <button class="burbuja-girar" (click)="onGirar(image.guid, $event)" title="Girar imagen">↻</button>
          <button class="burbuja-download" (click)="onDownload(image, $event)" title="Descargar">⬇</button>
      </div>
    </div>
  `,
  styles: [`
    .burbujas-stage {
      position: relative;
      width: 100%;
      min-height: 700px;
      background: linear-gradient(180deg, #b3e5fc 0%, #4fc3f7 100%);
      border-radius: 16px;
      overflow: hidden;
    }
    .burbujas-stage.paused .burbuja,
    .burbujas-stage.paused .bg-bubble {
      animation-play-state: paused;
    }

    .burbujas-bg { position: absolute; inset: 0; pointer-events: none; }
    .bg-bubble {
      position: absolute; bottom: -40px;
      width: 30px; height: 30px;
      background: rgba(255,255,255,0.4);
      border-radius: 50%;
      animation: bgRise 12s linear infinite;
    }
    @keyframes bgRise {
      0%   { transform: translateY(0) scale(0.8); opacity: 0; }
      20%  { opacity: 0.6; }
      100% { transform: translateY(-800px) scale(1.2); opacity: 0; }
    }

    .burbuja {
      position: absolute;
      border-radius: 50%;
      overflow: hidden;
      box-shadow: 0 6px 20px rgba(0,0,0,0.25), inset 0 -10px 20px rgba(255,255,255,0.4);
      cursor: pointer;
      animation: float ease-in-out infinite;
      transition: transform 0.3s ease;
    }
    .burbuja:hover { transform: scale(1.1); z-index: 5; }
    .burbuja img { width: 100%; height: 100%; object-fit: cover; display: block; }

    .burbuja-download {
      position: absolute; bottom: 8px; right: 8px;
      background: rgba(255,255,255,0.9);
      border: none; border-radius: 50%;
      width: 28px; height: 28px;
      cursor: pointer;
      opacity: 0; transition: opacity 0.3s;
    }
    .burbuja:hover .burbuja-download { opacity: 1; }
    .burbuja:hover .burbuja-girar { opacity: 1; }

    @keyframes float {
      0%, 100% { transform: translate(0, 0); }
      33%      { transform: translate(15px, -20px); }
      66%      { transform: translate(-10px, 10px); }
    }

    @media (prefers-reduced-motion: reduce) {
      .burbuja, .bg-bubble { animation: none; }
      .burbuja { position: relative; display: inline-block; margin: 1rem; }
    }
  
    .burbuja-girar {
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
export class BurbujasModoComponent implements OnChanges, OnDestroy {
  @Input() images: GalleryImage[] = [];
  @Input() isMobile: boolean = false;
  @Input() rotaciones: Map<string, number> = new Map();
  @Output() imageClick = new EventEmitter<GalleryImage>();
  @Output() imageDownload = new EventEmitter<{ image: GalleryImage; event: Event }>();
  @Output() imageGirar = new EventEmitter<string>();

  burbujas: BurbujaImage[] = [];
  bgBubbles = Array(15).fill(0);
  visible = true;

  private visibilityHandler = () => {
    this.visible = document.visibilityState === 'visible';
  };

  constructor() {
    document.addEventListener('visibilitychange', this.visibilityHandler);
  }

  ngOnChanges(): void {
    this.burbujas = this.images.map((img, i) => {
      const h = this.hash(img.guid);
      // Distribución pseudo-aleatoria pero estable
      const cols = this.isMobile ? 3 : 5;
      const col = i % cols;
      const row = Math.floor(i / cols);
      return {
        ...img,
        x: (col * (100 / cols)) + (h % 10) - 5 + 5,
        y: (row * 25) + (h % 8) + 5,
        size: this.isMobile ? 100 + (h % 30) : 130 + (h % 60),
        delay: (h % 50) / 10,
        duration: 6 + (h % 40) / 10,
      };
    });
  }

  ngOnDestroy(): void {
    document.removeEventListener('visibilitychange', this.visibilityHandler);
  }

  randPos(): number { return Math.random() * 100; }
  randDur(): number { return 8 + Math.random() * 8; }

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
