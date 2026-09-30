import { Component, EventEmitter, Input, Output, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GalleryImage } from '../galeria-modos.types';
import { obtenerEstiloRotacion } from '../galeria-modos-rotation.helpers';

interface PolaroidImage extends GalleryImage {
  rotacion: number;
  desplazamiento: number;
}

@Component({
  selector: 'app-polaroid-modo',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="polaroid-grid">
      <div
        *ngFor="let image of polaroidImages; let i = index; trackBy: trackByGuid"
        class="polaroid"
        [style.transform]="'rotate(' + image.rotacion + 'deg) translateY(' + image.desplazamiento + 'px)'"
        [attr.data-aos]="'fade-up'"
        [attr.data-aos-delay]="(i % 12) * 80"
        (click)="imageClick.emit(image)"
      >
        <span class="tape tape-tl"></span>
        <span class="tape tape-tr"></span>
        <div class="polaroid-image">
          <img [src]="image.url" [alt]="image.alt" [ngStyle]="obtenerEstiloRotacion(image.guid)"
              loading="lazy" />
        </div>
        <div class="polaroid-caption">{{ image.alt || 'Recuerdo' }}</div>
        <button class="polaroid-girar" (click)="onGirar(image.guid, $event)" title="Girar imagen">↻</button>
          <button class="polaroid-download" (click)="onDownload(image, $event)" title="Descargar">⬇</button>
      </div>
    </div>
  `,
  styles: [`
    .polaroid-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 2.5rem 1.5rem;
      padding: 2rem 1rem;
    }
    @media (max-width: 768px) {
      .polaroid-grid { grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 2rem 1rem; }
    }

    .polaroid {
      background: #fdfdfd;
      padding: 12px 12px 50px;
      box-shadow: 0 6px 18px rgba(0,0,0,0.25);
      cursor: pointer;
      position: relative;
      transition: transform 0.4s ease, box-shadow 0.4s ease;
    }
    .polaroid:hover {
      transform: rotate(0deg) translateY(-6px) scale(1.03) !important;
      box-shadow: 0 12px 30px rgba(0,0,0,0.35);
      z-index: 2;
    }

    .tape {
      position: absolute; top: -8px;
      width: 60px; height: 22px;
      background: rgba(255, 230, 150, 0.7);
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .tape-tl { left: 12px; transform: rotate(-8deg); }
    .tape-tr { right: 12px; transform: rotate(8deg); }

    .polaroid-image {
      width: 100%;
      aspect-ratio: 1 / 1;
      overflow: hidden;
      background: #eee;
    }
    .polaroid-image img { width: 100%; height: 100%; object-fit: cover; display: block; }

    .polaroid-caption {
      position: absolute;
      bottom: 10px; left: 0; right: 0;
      text-align: center;
      font-family: 'Caveat', 'Brush Script MT', cursive;
      font-size: 1.1rem;
      color: #333;
    }

    .polaroid-download {
      position: absolute;
      top: 8px; right: 8px;
      background: rgba(255,255,255,0.9);
      border: none; border-radius: 50%;
      width: 30px; height: 30px;
      cursor: pointer;
      opacity: 0;
      transition: opacity 0.3s;
    }
    .polaroid:hover .polaroid-download { opacity: 1; }
    .polaroid:hover .polaroid-girar { opacity: 1; }

    @media (prefers-reduced-motion: reduce) {
      .polaroid { transform: none !important; transition: none; }
      .polaroid:hover { transform: none !important; }
    }
  
    .polaroid-girar {
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
export class PolaroidModoComponent implements OnChanges {
  @Input() images: GalleryImage[] = [];
  @Input() isMobile: boolean = false;
  @Input() rotaciones: Map<string, number> = new Map();
  @Output() imageClick = new EventEmitter<GalleryImage>();
  @Output() imageDownload = new EventEmitter<{ image: GalleryImage; event: Event }>();
  @Output() imageGirar = new EventEmitter<string>();

  polaroidImages: PolaroidImage[] = [];

  ngOnChanges(): void {
    this.polaroidImages = this.images.map((img, i) => ({
      ...img,
      // Rotaciones determinísticas basadas en el guid para evitar saltos en re-render
      rotacion: this.hash(img.guid + 'r') % 11 - 5,
      desplazamiento: this.hash(img.guid + 'd') % 20 - 10,
    }));
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
