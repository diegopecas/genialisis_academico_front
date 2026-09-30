import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GalleryImage } from '../galeria-modos.types';
import { obtenerEstiloRotacion } from '../galeria-modos-rotation.helpers';

@Component({
  selector: 'app-lluvia-petalos-modo',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="petalos-stage">
      <div class="petalos-bg">
        <span *ngFor="let _ of petalos; let j = index"
              class="petalo"
              [style.left.%]="randPos(j)"
              [style.animation-delay.s]="randDelay(j)"
              [style.animation-duration.s]="randDur(j)">{{ randPetalo(j) }}</span>
      </div>

      <div class="petalos-grid">
        <div
          *ngFor="let image of images; let i = index; trackBy: trackByGuid"
          class="petalo-foto"
          [attr.data-aos]="'fade-up'"
          [attr.data-aos-delay]="(i % 12) * 60"
          (click)="imageClick.emit(image)"
        >
          <div class="foto-frame">
            <img [src]="image.url" [alt]="image.alt" [ngStyle]="obtenerEstiloRotacion(image.guid)"
              loading="lazy" />
            <button class="foto-girar" (click)="onGirar(image.guid, $event)" title="Girar imagen">↻</button>
          <button class="foto-download" (click)="onDownload(image, $event)" title="Descargar">⬇</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .petalos-stage {
      position: relative;
      width: 100%; min-height: 600px;
      background: linear-gradient(180deg, #ffe5ec 0%, #ffc2d4 100%);
      border-radius: 16px;
      padding: 2rem 1rem;
      overflow: hidden;
    }

    .petalos-bg { position: absolute; inset: 0; pointer-events: none; }
    .petalo {
      position: absolute; top: -30px;
      font-size: 1.4rem;
      animation: caer linear infinite;
    }
    @keyframes caer {
      0%   { transform: translateY(0) rotate(0); opacity: 1; }
      100% { transform: translateY(700px) rotate(720deg); opacity: 0; }
    }

    .petalos-grid {
      position: relative; z-index: 2;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 1.25rem;
    }
    @media (max-width: 768px) {
      .petalos-grid { grid-template-columns: repeat(2, 1fr); gap: 0.75rem; }
    }

    .petalo-foto { cursor: pointer; }

    .foto-frame {
      position: relative;
      aspect-ratio: 1;
      border-radius: 50% 12% 50% 12%;
      overflow: hidden;
      box-shadow: 0 8px 22px rgba(180, 80, 120, 0.3);
      transition: transform 0.3s ease, border-radius 0.3s ease;
    }
    .foto-frame:hover {
      transform: scale(1.05);
      border-radius: 12% 50% 12% 50%;
    }
    .foto-frame img { width: 100%; height: 100%; object-fit: cover; display: block; }

    .foto-download {
      position: absolute; top: 12px; right: 12px;
      background: rgba(255,255,255,0.9);
      border: none; border-radius: 50%;
      width: 30px; height: 30px;
      cursor: pointer;
      opacity: 0; transition: opacity 0.3s;
    }
    .foto-frame:hover .foto-download { opacity: 1; }
    .foto-frame:hover .foto-girar { opacity: 1; }

    @media (prefers-reduced-motion: reduce) {
      .petalo { animation: none; display: none; }
      .foto-frame, .foto-frame:hover { transform: none; transition: none; }
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
export class LluviaPetalosModoComponent {
  @Input() images: GalleryImage[] = [];
  @Input() isMobile: boolean = false;
  @Input() rotaciones: Map<string, number> = new Map();
  @Output() imageClick = new EventEmitter<GalleryImage>();
  @Output() imageDownload = new EventEmitter<{ image: GalleryImage; event: Event }>();
  @Output() imageGirar = new EventEmitter<string>();

  petalos = Array(25).fill(0);
  private petaloChars = ['🌸', '🌺', '🌼', '🍃', '🌷'];

  randPos(seed: number): number { return ((seed * 113) % 100); }
  randDelay(seed: number): number { return (seed % 50) / 10; }
  randDur(seed: number): number { return 6 + (seed % 30) / 10; }
  randPetalo(seed: number): string { return this.petaloChars[seed % this.petaloChars.length]; }

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
