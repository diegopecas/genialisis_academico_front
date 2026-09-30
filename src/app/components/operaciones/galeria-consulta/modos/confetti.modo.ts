import { Component, EventEmitter, Input, Output, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GalleryImage } from '../galeria-modos.types';
import { obtenerEstiloRotacion } from '../galeria-modos-rotation.helpers';

interface ConfettiImage extends GalleryImage {
  delay: number;
  rotation: number;
  finalRotation: number;
}

@Component({
  selector: 'app-confetti-modo',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="confetti-stage">
      <div class="confetti-bg">
        <span *ngFor="let _ of confettiPieces; let j = index"
              class="confetti-piece"
              [style.left.%]="randPos(j)"
              [style.background]="randColor(j)"
              [style.animation-delay.s]="randDelay(j)"
              [style.animation-duration.s]="randDur(j)"></span>
      </div>

      <div class="confetti-grid">
        <div
          *ngFor="let image of confettiImages; let i = index; trackBy: trackByGuid"
          class="confetti-photo"
          [style.animation-delay.s]="image.delay"
          [style.--final-rot]="image.finalRotation + 'deg'"
          (click)="imageClick.emit(image)"
        >
          <img [src]="image.url" [alt]="image.alt" [ngStyle]="obtenerEstiloRotacion(image.guid)"
              loading="lazy" />
          <button class="confetti-girar" (click)="onGirar(image.guid, $event)" title="Girar imagen">↻</button>
          <button class="confetti-download" (click)="onDownload(image, $event)" title="Descargar">⬇</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .confetti-stage {
      position: relative;
      width: 100%; min-height: 600px;
      background: linear-gradient(180deg, #fff5e1 0%, #ffe0b3 100%);
      border-radius: 16px;
      padding: 2rem 1rem;
      overflow: hidden;
    }

    .confetti-bg { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
    .confetti-piece {
      position: absolute; top: -20px;
      width: 8px; height: 14px;
      animation: fall linear infinite;
    }
    @keyframes fall {
      0%   { transform: translateY(0) rotate(0deg); opacity: 1; }
      100% { transform: translateY(800px) rotate(720deg); opacity: 0; }
    }

    .confetti-grid {
      position: relative; z-index: 2;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 1rem;
    }
    @media (max-width: 768px) {
      .confetti-grid { grid-template-columns: repeat(2, 1fr); gap: 0.75rem; }
    }

    .confetti-photo {
      aspect-ratio: 1;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 6px 18px rgba(0,0,0,0.2);
      cursor: pointer;
      position: relative;
      animation: drop 1s cubic-bezier(0.34, 1.56, 0.64, 1) backwards;
      transition: transform 0.3s ease;
    }
    .confetti-photo:hover { transform: translateY(-4px) scale(1.04); z-index: 5; }
    .confetti-photo img { width: 100%; height: 100%; object-fit: cover; display: block; }

    @keyframes drop {
      from {
        transform: translateY(-800px) rotate(-180deg);
        opacity: 0;
      }
      to {
        transform: translateY(0) rotate(var(--final-rot, 0deg));
        opacity: 1;
      }
    }

    .confetti-download {
      position: absolute; top: 8px; right: 8px;
      background: rgba(255,255,255,0.9);
      border: none; border-radius: 50%;
      width: 30px; height: 30px;
      cursor: pointer;
      opacity: 0; transition: opacity 0.3s;
    }
    .confetti-photo:hover .confetti-download { opacity: 1; }
    .confetti-photo:hover .confetti-girar { opacity: 1; }

    @media (prefers-reduced-motion: reduce) {
      .confetti-photo { animation: none; }
      .confetti-piece { animation: none; display: none; }
    }
  
    .confetti-girar {
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
export class ConfettiModoComponent implements OnChanges {
  @Input() images: GalleryImage[] = [];
  @Input() isMobile: boolean = false;
  @Input() rotaciones: Map<string, number> = new Map();
  @Output() imageClick = new EventEmitter<GalleryImage>();
  @Output() imageDownload = new EventEmitter<{ image: GalleryImage; event: Event }>();
  @Output() imageGirar = new EventEmitter<string>();

  confettiImages: ConfettiImage[] = [];
  confettiPieces = Array(40).fill(0);

  private colors = ['#ff6b9d', '#ffd93d', '#6bcf7f', '#4d9de0', '#e15554', '#7768ae'];

  ngOnChanges(): void {
    this.confettiImages = this.images.map((img, i) => {
      const h = this.hash(img.guid);
      return {
        ...img,
        delay: i * 0.08,
        rotation: 0,
        finalRotation: (h % 11) - 5,
      };
    });
  }

  randPos(seed: number): number { return ((seed * 137) % 100); }
  randColor(seed: number): string { return this.colors[seed % this.colors.length]; }
  randDelay(seed: number): number { return (seed % 50) / 10; }
  randDur(seed: number): number { return 4 + (seed % 30) / 10; }

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
