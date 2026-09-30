import { Component, EventEmitter, HostListener, Input, Output, OnChanges, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GalleryImage } from '../galeria-modos.types';
import { obtenerEstiloRotacion } from '../galeria-modos-rotation.helpers';

interface PinterestImage extends GalleryImage {
  span: number;
  parallaxFactor: number;
}

@Component({
  selector: 'app-mosaico-pinterest-modo',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="pinterest-grid" #grid>
      <div
        *ngFor="let image of pinterestImages; let i = index; trackBy: trackByGuid"
        class="pin-item"
        [style.grid-row]="'span ' + image.span"
        [attr.data-aos]="'fade-up'"
        [attr.data-aos-delay]="(i % 18) * 40"
        (click)="imageClick.emit(image)"
      >
        <div class="pin-wrapper" [style.transform]="'translateY(' + (scrollY * image.parallaxFactor) + 'px)'">
          <img [src]="image.url" [alt]="image.alt" [ngStyle]="obtenerEstiloRotacion(image.guid)"
              loading="lazy" />
          <div class="pin-overlay">
            <button class="pin-girar" (click)="onGirar(image.guid, $event)" title="Girar imagen">↻</button>
          <button class="pin-download" (click)="onDownload(image, $event)" title="Descargar">⬇</button>
            <span class="pin-view">Ver</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .pinterest-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      grid-auto-rows: 10px;
      gap: 12px;
      padding: 1rem 0;
    }
    @media (max-width: 768px) {
      .pinterest-grid { grid-template-columns: repeat(2, 1fr); gap: 8px; }
    }

    .pin-item { cursor: pointer; }

    .pin-wrapper {
      position: relative;
      width: 100%; height: 100%;
      border-radius: 14px;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(0,0,0,0.18);
      transition: box-shadow 0.3s ease;
      will-change: transform;
    }
    .pin-wrapper:hover { box-shadow: 0 10px 30px rgba(0,0,0,0.3); }
    .pin-wrapper img { width: 100%; height: 100%; object-fit: cover; display: block; }

    .pin-overlay {
      position: absolute; inset: 0;
      background: linear-gradient(to bottom, transparent 60%, rgba(0,0,0,0.6));
      opacity: 0;
      transition: opacity 0.3s;
      display: flex; align-items: flex-end; justify-content: space-between;
      padding: 1rem;
    }
    .pin-wrapper:hover .pin-overlay { opacity: 1; }

    .pin-view { color: #fff; font-weight: 600; }
    .pin-download {
      background: #fff; border: none; border-radius: 50%;
      width: 36px; height: 36px; cursor: pointer;
    }

    @media (prefers-reduced-motion: reduce) {
      .pin-wrapper { transform: none !important; }
    }
  
    .pin-girar {
      position: absolute;
      background: rgba(255,255,255,0.9);
      border: none;
      border-radius: 50%;
      width: 30px;
      height: 30px;
      cursor: pointer;
      opacity: 1;
      transition: opacity 0.3s;
      font-size: 0.9rem;
      z-index: 4;
      /* Posicionado a la izquierda del botón de descarga */
      top: 12px;
      right: 50px;
    }

  `],
})
export class MosaicoPinterestModoComponent implements OnChanges {
  @Input() images: GalleryImage[] = [];
  @Input() isMobile: boolean = false;
  @Input() rotaciones: Map<string, number> = new Map();
  @Output() imageClick = new EventEmitter<GalleryImage>();
  @Output() imageDownload = new EventEmitter<{ image: GalleryImage; event: Event }>();
  @Output() imageGirar = new EventEmitter<string>();

  @ViewChild('grid') gridEl?: ElementRef<HTMLElement>;

  pinterestImages: PinterestImage[] = [];
  scrollY = 0;

  ngOnChanges(): void {
    this.pinterestImages = this.images.map((img) => {
      // Span aleatorio determinístico para crear el efecto masonry vertical
      const spanRaw = this.hash(img.guid) % 25 + 18; // entre 18 y 42 filas (cada fila = 10px + gap)
      return {
        ...img,
        span: spanRaw,
        parallaxFactor: ((this.hash(img.guid + 'p') % 10) - 5) * 0.02,
      };
    });
  }

  @HostListener('window:scroll')
  onScroll(): void {
    if (this.isMobile) return; // Parallax solo en desktop por performance
    this.scrollY = window.scrollY * 0.05;
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
