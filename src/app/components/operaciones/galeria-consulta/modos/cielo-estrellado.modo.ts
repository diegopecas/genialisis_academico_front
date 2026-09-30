import { Component, EventEmitter, Input, Output, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GalleryImage } from '../galeria-modos.types';
import { obtenerEstiloRotacion } from '../galeria-modos-rotation.helpers';

interface EstrellaImage extends GalleryImage {
  x: number;
  y: number;
  size: number;
}

@Component({
  selector: 'app-cielo-estrellado-modo',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="cielo-stage">
      <div class="cielo-stars">
        <span *ngFor="let _ of estrellitas; let j = index"
              class="estrella-pequena"
              [style.left.%]="randPos(j)"
              [style.top.%]="randPos(j+7)"
              [style.animation-delay.s]="randDelay(j)"></span>
      </div>

      <svg class="cielo-lines" preserveAspectRatio="none">
        <line *ngFor="let line of constelaciones"
              [attr.x1]="line.x1 + '%'" [attr.y1]="line.y1 + '%'"
              [attr.x2]="line.x2 + '%'" [attr.y2]="line.y2 + '%'"
              stroke="rgba(255,255,255,0.25)" stroke-width="1" />
      </svg>

      <div class="cielo-photos">
        <div
          *ngFor="let image of estrellas; let i = index; trackBy: trackByGuid"
          class="cielo-foto"
          [style.left.%]="image.x"
          [style.top.%]="image.y"
          [style.width.px]="image.size"
          [style.height.px]="image.size"
          [style.animation-delay.s]="i * 0.15"
          (click)="imageClick.emit(image)"
        >
          <img [src]="image.url" [alt]="image.alt" [ngStyle]="obtenerEstiloRotacion(image.guid)"
              loading="lazy" />
          <button class="cielo-girar" (click)="onGirar(image.guid, $event)" title="Girar imagen">↻</button>
          <button class="cielo-download" (click)="onDownload(image, $event)" title="Descargar">⬇</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .cielo-stage {
      position: relative;
      width: 100%;
      min-height: 700px;
      background: radial-gradient(ellipse at top, #1a1a3e 0%, #0c0c1d 60%, #000 100%);
      border-radius: 16px;
      overflow: hidden;
    }

    .cielo-stars { position: absolute; inset: 0; }
    .estrella-pequena {
      position: absolute;
      width: 2px; height: 2px;
      background: #fff;
      border-radius: 50%;
      box-shadow: 0 0 4px #fff;
      animation: twinkle 3s ease-in-out infinite;
    }
    @keyframes twinkle {
      0%, 100% { opacity: 0.3; }
      50%      { opacity: 1; }
    }

    .cielo-lines {
      position: absolute; inset: 0;
      width: 100%; height: 100%;
      pointer-events: none;
    }

    .cielo-photos { position: relative; width: 100%; height: 700px; z-index: 2; }

    .cielo-foto {
      position: absolute;
      border-radius: 50%;
      overflow: hidden;
      cursor: pointer;
      box-shadow: 0 0 20px rgba(255,255,255,0.5),
                  0 0 40px rgba(135, 206, 250, 0.3);
      transition: transform 0.4s ease, box-shadow 0.4s ease;
      animation: appearStar 1s cubic-bezier(0.34, 1.56, 0.64, 1) backwards;
    }
    @keyframes appearStar {
      from { transform: scale(0); opacity: 0; }
      to   { transform: scale(1); opacity: 1; }
    }
    .cielo-foto:hover {
      transform: scale(1.2);
      box-shadow: 0 0 35px rgba(255,255,255,0.8), 0 0 60px rgba(135, 206, 250, 0.5);
      z-index: 5;
    }
    .cielo-foto img { width: 100%; height: 100%; object-fit: cover; display: block; }

    .cielo-download {
      position: absolute; top: 6px; right: 6px;
      background: rgba(255,255,255,0.9);
      border: none; border-radius: 50%;
      width: 26px; height: 26px;
      cursor: pointer;
      opacity: 0; transition: opacity 0.3s;
      font-size: 0.75rem;
    }
    .cielo-foto:hover .cielo-download { opacity: 1; }
    .cielo-foto:hover .cielo-girar { opacity: 1; }

    @media (prefers-reduced-motion: reduce) {
      .estrella-pequena, .cielo-foto { animation: none; }
    }
  
    .cielo-girar {
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
export class CieloEstrelladoModoComponent implements OnChanges {
  @Input() images: GalleryImage[] = [];
  @Input() isMobile: boolean = false;
  @Input() rotaciones: Map<string, number> = new Map();
  @Output() imageClick = new EventEmitter<GalleryImage>();
  @Output() imageDownload = new EventEmitter<{ image: GalleryImage; event: Event }>();
  @Output() imageGirar = new EventEmitter<string>();

  estrellas: EstrellaImage[] = [];
  estrellitas = Array(60).fill(0);
  constelaciones: { x1: number; y1: number; x2: number; y2: number }[] = [];

  ngOnChanges(): void {
    this.estrellas = this.images.map((img, i) => {
      const h = this.hash(img.guid);
      // Distribución que evita que se aglomeren
      const cols = this.isMobile ? 3 : 5;
      const col = i % cols;
      const row = Math.floor(i / cols);
      return {
        ...img,
        x: (col * (90 / cols)) + 5 + ((h % 8) - 4),
        y: (row * 22) + 10 + ((h % 8) - 4),
        size: this.isMobile ? 70 + (h % 20) : 90 + (h % 30),
      };
    });

    // Crear líneas entre estrellas consecutivas (forma constelaciones)
    this.constelaciones = [];
    for (let i = 0; i < this.estrellas.length - 1; i++) {
      const a = this.estrellas[i];
      const b = this.estrellas[i + 1];
      if (this.hash(a.guid + b.guid) % 3 !== 0) {
        // Solo conectar 2/3 de las estrellas para que no sea pesado
        this.constelaciones.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y });
      }
    }
  }

  randPos(seed: number): number { return ((seed * 137) % 100); }
  randDelay(seed: number): number { return (seed % 50) / 10; }

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
