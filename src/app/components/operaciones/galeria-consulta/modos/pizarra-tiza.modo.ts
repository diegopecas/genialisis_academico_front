import { Component, EventEmitter, Input, Output, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GalleryImage } from '../galeria-modos.types';
import { obtenerEstiloRotacion } from '../galeria-modos-rotation.helpers';

interface TizaImage extends GalleryImage {
  marcoTipo: number;
  rotacion: number;
}

@Component({
  selector: 'app-pizarra-tiza-modo',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="pizarra">
      <div class="pizarra-marco-superior">
        <span class="tiza-trazo trazo-1"></span>
        <span class="tiza-trazo trazo-2"></span>
        <span class="tiza-trazo trazo-3"></span>
      </div>

      <div class="tiza-titulo">
        <span class="titulo-text">¡Hoy en clase!</span>
        <span class="titulo-corazon">♥</span>
      </div>

      <div class="pizarra-grid">
        <div
          *ngFor="let image of tizaImages; let i = index; trackBy: trackByGuid"
          class="tiza-foto"
          [class]="'marco-' + image.marcoTipo"
          [style.transform]="'rotate(' + image.rotacion + 'deg)'"
          [attr.data-aos]="'fade-up'"
          [attr.data-aos-delay]="(i % 12) * 70"
          (click)="imageClick.emit(image)"
        >
          <div class="foto-content">
            <img [src]="image.url" [alt]="image.alt" [ngStyle]="obtenerEstiloRotacion(image.guid)"
              loading="lazy" />
          </div>
          <p class="foto-leyenda">"{{ image.alt || 'Momento' }}"</p>
          <button class="foto-girar" (click)="onGirar(image.guid, $event)" title="Girar imagen">↻</button>
          <button class="foto-download" (click)="onDownload(image, $event)" title="Descargar">⬇</button>
        </div>
      </div>

      <div class="pizarra-borrador">
        <div class="borrador-fieltro"></div>
        <div class="borrador-madera"></div>
      </div>
    </div>
  `,
  styles: [`
    .pizarra {
      position: relative;
      background:
        radial-gradient(ellipse at 30% 30%, rgba(255,255,255,0.04) 0%, transparent 50%),
        radial-gradient(ellipse at 70% 70%, rgba(255,255,255,0.03) 0%, transparent 50%),
        linear-gradient(135deg, #2d4a3a 0%, #1f3d2c 100%);
      border: 14px solid #6b3410;
      border-radius: 6px;
      box-shadow:
        inset 0 0 80px rgba(0,0,0,0.4),
        0 12px 30px rgba(0,0,0,0.4);
      padding: 2.5rem 2rem;
      min-height: 600px;
    }

    .pizarra-marco-superior {
      display: flex; gap: 1rem; justify-content: center;
      margin-bottom: 1rem;
      opacity: 0.4;
    }
    .tiza-trazo {
      display: block;
      height: 3px;
      background: rgba(255,255,255,0.6);
      border-radius: 2px;
      filter: blur(0.5px);
    }
    .trazo-1 { width: 80px; }
    .trazo-2 { width: 50px; }
    .trazo-3 { width: 100px; }

    .tiza-titulo {
      text-align: center;
      color: rgba(255,255,255,0.92);
      font-family: 'Caveat', 'Comic Sans MS', cursive;
      font-size: 2.4rem;
      margin-bottom: 2rem;
      text-shadow: 0 0 4px rgba(255,255,255,0.3);
      filter: blur(0.3px);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
    }
    .titulo-corazon {
      color: rgba(255, 200, 200, 0.9);
      font-size: 2rem;
    }

    .pizarra-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 2.5rem 1.5rem;
    }
    @media (max-width: 768px) {
      .pizarra-grid { grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 2rem 1rem; }
    }

    .tiza-foto {
      position: relative;
      cursor: pointer;
      padding: 14px;
      transition: transform 0.3s ease;
    }
    .tiza-foto:hover { transform: rotate(0deg) scale(1.05) !important; z-index: 5; }

    /* Marcos dibujados con tiza (border-image simulado con outline + box-shadow) */
    .marco-0 {
      box-shadow:
        inset 0 0 0 2px rgba(255,255,255,0.85),
        inset 0 0 0 6px transparent,
        inset 0 0 0 8px rgba(255,255,255,0.4);
      border-radius: 4px;
    }
    .marco-1 {
      box-shadow:
        inset 0 0 0 2px rgba(255, 220, 180, 0.85),
        inset 0 0 0 5px transparent,
        inset 0 0 0 7px rgba(255, 200, 150, 0.5);
      border-radius: 8px;
    }
    .marco-2 {
      box-shadow:
        inset 0 0 0 3px rgba(180, 230, 255, 0.85);
      border-radius: 2px;
    }
    .marco-3 {
      box-shadow:
        inset 0 0 0 2px rgba(220, 255, 220, 0.85),
        inset 0 0 0 5px transparent,
        inset 0 0 0 6px rgba(220, 255, 220, 0.4);
      border-radius: 16px;
    }

    .foto-content {
      aspect-ratio: 4 / 3;
      overflow: hidden;
      filter: brightness(0.92) contrast(1.05);
      border-radius: inherit;
    }
    .foto-content img { width: 100%; height: 100%; object-fit: cover; display: block; }

    .foto-leyenda {
      margin: 0.75rem 0 0;
      text-align: center;
      color: rgba(255,255,255,0.85);
      font-family: 'Caveat', 'Comic Sans MS', cursive;
      font-size: 1.1rem;
      filter: blur(0.3px);
    }

    .foto-download {
      position: absolute; top: 16px; right: 16px;
      background: rgba(255,255,255,0.9);
      border: none; border-radius: 50%;
      width: 30px; height: 30px;
      cursor: pointer;
      opacity: 0; transition: opacity 0.3s;
    }
    .tiza-foto:hover .foto-download { opacity: 1; }
    .tiza-foto:hover .foto-girar { opacity: 1; }

    .pizarra-borrador {
      position: absolute;
      bottom: -20px; right: 30px;
      width: 100px; height: 36px;
      transform: rotate(-3deg);
      box-shadow: 0 4px 8px rgba(0,0,0,0.4);
    }
    .borrador-fieltro {
      width: 100%; height: 18px;
      background: linear-gradient(180deg, #f5e6d3 0%, #d4c0a0 100%);
      border-radius: 2px 2px 0 0;
    }
    .borrador-madera {
      width: 100%; height: 18px;
      background: linear-gradient(180deg, #8b4513 0%, #5d2f0a 100%);
      border-radius: 0 0 2px 2px;
    }
    @media (max-width: 768px) {
      .pizarra-borrador { display: none; }
    }

    @media (prefers-reduced-motion: reduce) {
      .tiza-foto, .tiza-foto:hover { transform: none !important; transition: none; }
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
export class PizarraTizaModoComponent implements OnChanges {
  @Input() images: GalleryImage[] = [];
  @Input() isMobile: boolean = false;
  @Input() rotaciones: Map<string, number> = new Map();
  @Output() imageClick = new EventEmitter<GalleryImage>();
  @Output() imageDownload = new EventEmitter<{ image: GalleryImage; event: Event }>();
  @Output() imageGirar = new EventEmitter<string>();

  tizaImages: TizaImage[] = [];

  ngOnChanges(): void {
    this.tizaImages = this.images.map((img) => {
      const h = this.hash(img.guid);
      return {
        ...img,
        marcoTipo: h % 4,
        rotacion: (h % 7) - 3,
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
