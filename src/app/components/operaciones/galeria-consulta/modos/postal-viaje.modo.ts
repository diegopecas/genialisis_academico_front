import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GalleryImage } from '../galeria-modos.types';
import { obtenerEstiloRotacion } from '../galeria-modos-rotation.helpers';

@Component({
  selector: 'app-postal-viaje-modo',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="postal-grid">
      <div
        *ngFor="let image of images; let i = index; trackBy: trackByGuid"
        class="postal"
        [attr.data-aos]="'fade-up'"
        [attr.data-aos-delay]="(i % 10) * 70"
        (click)="imageClick.emit(image)"
      >
        <div class="postal-stamp">{{ stampSymbols[i % stampSymbols.length] }}</div>
        <div class="postal-circle-mark">
          <span>{{ iniciales || '★' }}</span>
          <span>★</span>
        </div>
        <div class="postal-image">
          <img [src]="image.url" [alt]="image.alt" [ngStyle]="obtenerEstiloRotacion(image.guid)"
              loading="lazy" />
        </div>
        <button class="postal-girar" (click)="onGirar(image.guid, $event)" title="Girar imagen">↻</button>
          <button class="postal-download" (click)="onDownload(image, $event)" title="Descargar">⬇</button>
      </div>
    </div>
  `,
  styles: [`
    .postal-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 2rem;
      padding: 1.5rem 0.5rem;
      background-image:
        radial-gradient(circle at 20% 30%, rgba(255,200,150,0.08) 0, transparent 30%),
        radial-gradient(circle at 80% 70%, rgba(150,200,255,0.08) 0, transparent 30%);
    }
    @media (max-width: 768px) {
      .postal-grid { grid-template-columns: 1fr; gap: 1.5rem; }
    }

    .postal {
      position: relative;
      background: #f5ecd9;
      padding: 14px;
      border-radius: 4px;
      box-shadow: 0 6px 18px rgba(0,0,0,0.25), inset 0 0 30px rgba(150, 100, 50, 0.08);
      cursor: pointer;
      transition: transform 0.3s ease;
    }
    .postal:hover { transform: translateY(-4px) rotate(-1deg); }

    .postal-image {
      aspect-ratio: 4 / 3;
      overflow: hidden;
      background: #ddd;
    }
    .postal-image img { width: 100%; height: 100%; object-fit: cover; display: block; }

    .postal-stamp {
      position: absolute;
      top: 18px; right: 18px;
      width: 50px; height: 60px;
      background: #fff;
      border: 1px dashed #888;
      display: flex; align-items: center; justify-content: center;
      font-size: 1.6rem;
      box-shadow: 0 2px 4px rgba(0,0,0,0.15);
      transform: rotate(4deg);
      z-index: 2;
    }

    .postal-circle-mark {
      position: absolute;
      top: 30px; right: 90px;
      width: 60px; height: 60px;
      border: 2px solid rgba(120, 60, 30, 0.5);
      border-radius: 50%;
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      color: rgba(120, 60, 30, 0.6);
      font-size: 0.85rem;
      font-weight: bold;
      letter-spacing: 0.05em;
      transform: rotate(-12deg);
      z-index: 2;
    }
    .postal-circle-mark span:first-child {
      max-width: 50px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .postal-circle-mark span:last-child { font-size: 0.9rem; }

    .postal-download {
      position: absolute;
      bottom: 14px; right: 14px;
      background: rgba(255,255,255,0.9);
      border: none; border-radius: 50%;
      width: 34px; height: 34px;
      cursor: pointer;
      opacity: 0; transition: opacity 0.3s;
      z-index: 3;
    }
    .postal:hover .postal-download { opacity: 1; }
    .postal:hover .postal-girar { opacity: 1; }

    @media (prefers-reduced-motion: reduce) {
      .postal, .postal:hover { transition: none; transform: none; }
    }
  
    .postal-girar {
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
export class PostalViajeModoComponent {
  @Input() images: GalleryImage[] = [];
  @Input() isMobile: boolean = false;
  @Input() rotaciones: Map<string, number> = new Map();
  @Input() iniciales: string = '';
  @Output() imageClick = new EventEmitter<GalleryImage>();
  @Output() imageDownload = new EventEmitter<{ image: GalleryImage; event: Event }>();
  @Output() imageGirar = new EventEmitter<string>();

  stampSymbols = ['✈', '🌍', '🗺', '⛵', '🚂', '🏖', '🎡', '🎈'];

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
