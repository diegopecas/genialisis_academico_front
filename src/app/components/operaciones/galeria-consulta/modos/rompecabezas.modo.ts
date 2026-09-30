import { Component, EventEmitter, Input, Output, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GalleryImage } from '../galeria-modos.types';
import { obtenerEstiloRotacion } from '../galeria-modos-rotation.helpers';

interface PuzzleImage extends GalleryImage {
  forma: number;
  delay: number;
  rotInicial: number;
}

@Component({
  selector: 'app-rompecabezas-modo',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="puzzle-stage">
      <div class="puzzle-textura"></div>

      <div class="puzzle-titulo">
        <span class="titulo-pieza">🧩</span>
        <h3>Armando recuerdos</h3>
        <span class="titulo-pieza">🧩</span>
      </div>

      <div class="puzzle-grid">
        <div
          *ngFor="let image of puzzleImages; let i = index; trackBy: trackByGuid"
          class="puzzle-pieza"
          [class]="'forma-' + image.forma"
          [style.animation-delay.s]="image.delay"
          [style.--rot-inicial]="image.rotInicial + 'deg'"
          (click)="imageClick.emit(image)"
        >
          <div class="pieza-imagen">
            <img [src]="image.url" [alt]="image.alt" [ngStyle]="obtenerEstiloRotacion(image.guid)"
              loading="lazy" />
          </div>
          <button class="pieza-girar" (click)="onGirar(image.guid, $event)" title="Girar imagen">↻</button>
          <button class="pieza-download" (click)="onDownload(image, $event)" title="Descargar">⬇</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .puzzle-stage {
      position: relative;
      width: 100%;
      min-height: 700px;
      background: linear-gradient(135deg, #1a3a5c 0%, #0f2440 100%);
      border-radius: 16px;
      padding: 2rem 1.5rem;
      overflow: hidden;
    }

    .puzzle-textura {
      position: absolute; inset: 0;
      background-image:
        radial-gradient(circle at 25% 25%, rgba(255,255,255,0.05) 0%, transparent 30%),
        radial-gradient(circle at 75% 75%, rgba(255,255,255,0.04) 0%, transparent 30%);
      pointer-events: none;
    }

    .puzzle-titulo {
      position: relative; z-index: 2;
      display: flex; align-items: center; justify-content: center;
      gap: 1rem;
      color: #f5e6c8;
      margin-bottom: 2rem;
      font-family: Georgia, serif;
    }
    .puzzle-titulo h3 {
      margin: 0;
      font-size: 1.8rem;
      font-weight: normal;
      letter-spacing: 0.05em;
    }
    .titulo-pieza { font-size: 1.5rem; }

    .puzzle-grid {
      position: relative; z-index: 2;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
      gap: 0;
    }
    @media (max-width: 768px) {
      .puzzle-grid { grid-template-columns: repeat(3, 1fr); }
    }

    .puzzle-pieza {
      position: relative;
      aspect-ratio: 1;
      cursor: pointer;
      animation: encajar 1s cubic-bezier(0.34, 1.56, 0.64, 1) backwards;
      transition: transform 0.3s ease, z-index 0s 0.3s;
    }
    @keyframes encajar {
      0%   { transform: scale(0.4) rotate(var(--rot-inicial, -180deg)) translate(-30px, -40px); opacity: 0; }
      70%  { transform: scale(1.08) rotate(0) translate(0, 0); opacity: 1; }
      100% { transform: scale(1) rotate(0) translate(0, 0); opacity: 1; }
    }

    .puzzle-pieza:hover {
      transform: scale(1.12);
      z-index: 10;
      transition: transform 0.3s ease, z-index 0s 0s;
    }

    /* Piezas con encajes laterales (clip-path con tabs y huecos) */
    /* Forma 0: tab arriba, hueco derecha */
    .forma-0 .pieza-imagen {
      clip-path: polygon(
        0% 12%, 35% 12%, 35% 0%, 65% 0%, 65% 12%, 100% 12%,
        100% 35%, 88% 35%, 88% 65%, 100% 65%,
        100% 100%, 0% 100%
      );
    }
    /* Forma 1: hueco arriba, tab derecha */
    .forma-1 .pieza-imagen {
      clip-path: polygon(
        0% 0%, 35% 0%, 35% 12%, 65% 12%, 65% 0%, 100% 0%,
        100% 35%, 112% 35%, 112% 65%, 100% 65%,
        100% 100%, 0% 100%
      );
    }
    /* Forma 2: tab abajo, hueco izquierda */
    .forma-2 .pieza-imagen {
      clip-path: polygon(
        12% 0%, 100% 0%,
        100% 100%, 65% 100%, 65% 88%, 35% 88%, 35% 100%, 0% 100%,
        0% 65%, 12% 65%, 12% 35%, 0% 35%
      );
    }
    /* Forma 3: simple cuadrado con encajes redondeados */
    .forma-3 .pieza-imagen {
      clip-path: polygon(
        0% 0%, 100% 0%,
        100% 35%, 88% 50%, 100% 65%,
        100% 100%, 0% 100%,
        0% 65%, 12% 50%, 0% 35%
      );
    }

    .pieza-imagen {
      position: absolute; inset: -2px;
      overflow: hidden;
      filter: drop-shadow(2px 2px 4px rgba(0,0,0,0.5));
    }
    .pieza-imagen img {
      width: 100%; height: 100%;
      object-fit: cover; display: block;
    }

    .pieza-download {
      position: absolute; top: 30%; left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(255,255,255,0.95);
      border: none; border-radius: 50%;
      width: 32px; height: 32px;
      cursor: pointer;
      opacity: 0; transition: opacity 0.3s;
      z-index: 5;
    }
    .puzzle-pieza:hover .pieza-download { opacity: 1; }
    .puzzle-pieza:hover .pieza-girar { opacity: 1; }

    @media (prefers-reduced-motion: reduce) {
      .puzzle-pieza { animation: none; }
      .puzzle-pieza:hover { transform: none; }
    }
  
    .pieza-girar {
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
export class RompecabezasModoComponent implements OnChanges {
  @Input() images: GalleryImage[] = [];
  @Input() isMobile: boolean = false;
  @Input() rotaciones: Map<string, number> = new Map();
  @Output() imageClick = new EventEmitter<GalleryImage>();
  @Output() imageDownload = new EventEmitter<{ image: GalleryImage; event: Event }>();
  @Output() imageGirar = new EventEmitter<string>();

  puzzleImages: PuzzleImage[] = [];

  ngOnChanges(): void {
    this.puzzleImages = this.images.map((img, i) => {
      const h = this.hash(img.guid);
      return {
        ...img,
        forma: h % 4,
        delay: i * 0.08,
        rotInicial: ((h % 7) - 3) * 60,
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
