import { Component, EventEmitter, Input, Output, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GalleryImage } from '../galeria-modos.types';
import { obtenerEstiloRotacion } from '../galeria-modos-rotation.helpers';

interface IgImage extends GalleryImage {
  likes: number;
  hace: string;
}

@Component({
  selector: 'app-cards-instagram-modo',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="ig-grid">
      <article
        *ngFor="let image of igImages; let i = index; trackBy: trackByGuid"
        class="ig-card"
        [attr.data-aos]="'fade-up'"
        [attr.data-aos-delay]="(i % 8) * 80"
      >
        <header class="ig-header">
          <div class="ig-avatar">
            <div class="avatar-ring">
              <div class="avatar-inner">L</div>
            </div>
          </div>
          <div class="ig-meta">
            <span class="ig-user">liceo.lumen</span>
            <span class="ig-location">Chía, Colombia</span>
          </div>
          <span class="ig-more">⋯</span>
        </header>

        <div class="ig-image" (click)="imageClick.emit(image)">
          <img [src]="image.url" [alt]="image.alt" [ngStyle]="obtenerEstiloRotacion(image.guid)"
              loading="lazy" />
        </div>

        <div class="ig-actions">
          <div class="ig-actions-left">
            <span class="ig-action heart">♥</span>
            <span class="ig-action">💬</span>
            <span class="ig-action">↗</span>
          </div>
          <button class="ig-girar" (click)="onGirar(image.guid, $event)" title="Girar imagen">↻</button>
          <button class="ig-download" (click)="onDownload(image, $event)" title="Descargar">⬇</button>
        </div>

        <div class="ig-likes">
          <strong>{{ image.likes }} me gusta</strong>
        </div>

        <div class="ig-caption">
          <strong>liceo.lumen</strong>
          <span> {{ image.alt || 'Otro día increíble en clase' }} ✨</span>
        </div>

        <div class="ig-time">{{ image.hace }}</div>
      </article>
    </div>
  `,
  styles: [`
    .ig-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
      gap: 1.5rem;
      padding: 1rem;
      background: #fafafa;
      border-radius: 12px;
    }
    @media (max-width: 768px) {
      .ig-grid { grid-template-columns: 1fr; gap: 1rem; padding: 0.5rem; }
    }

    .ig-card {
      background: #fff;
      border: 1px solid #dbdbdb;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
    }

    .ig-header {
      display: flex; align-items: center;
      padding: 0.75rem 1rem;
      gap: 0.75rem;
    }
    .ig-avatar { flex-shrink: 0; }
    .avatar-ring {
      width: 38px; height: 38px;
      border-radius: 50%;
      padding: 2px;
      background: linear-gradient(135deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%);
      display: flex; align-items: center; justify-content: center;
    }
    .avatar-inner {
      width: 100%; height: 100%;
      background: #fff;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-weight: bold;
      color: #4a90a4;
      font-family: Georgia, serif;
    }

    .ig-meta {
      display: flex; flex-direction: column;
      flex: 1;
      font-size: 0.85rem;
    }
    .ig-user { font-weight: 600; color: #262626; }
    .ig-location { font-size: 0.75rem; color: #8e8e8e; }
    .ig-more { color: #262626; font-size: 1.4rem; cursor: pointer; }

    .ig-image {
      width: 100%;
      aspect-ratio: 1;
      background: #efefef;
      cursor: pointer;
      overflow: hidden;
    }
    .ig-image img {
      width: 100%; height: 100%;
      object-fit: cover; display: block;
      transition: transform 0.4s ease;
    }
    .ig-image:hover img { transform: scale(1.02); }

    .ig-actions {
      display: flex; align-items: center; justify-content: space-between;
      padding: 0.5rem 1rem;
    }
    .ig-actions-left {
      display: flex; gap: 1rem;
    }
    .ig-action {
      font-size: 1.5rem; cursor: pointer;
      transition: transform 0.2s;
      color: #262626;
    }
    .ig-action:hover { transform: scale(1.15); }
    .ig-action.heart:hover { color: #ed4956; }

    .ig-download {
      background: none; border: none;
      cursor: pointer;
      font-size: 1.4rem;
      color: #262626;
      transition: transform 0.2s;
    }
    .ig-download:hover { transform: scale(1.15); }

    .ig-likes, .ig-caption {
      padding: 0.25rem 1rem;
      font-size: 0.9rem;
      color: #262626;
    }
    .ig-likes { padding-bottom: 0.5rem; }
    .ig-caption strong { font-weight: 600; }

    .ig-time {
      padding: 0.5rem 1rem 0.75rem;
      font-size: 0.7rem;
      color: #8e8e8e;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
  
    .ig-girar {
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
export class CardsInstagramModoComponent implements OnChanges {
  @Input() images: GalleryImage[] = [];
  @Input() isMobile: boolean = false;
  @Input() rotaciones: Map<string, number> = new Map();
  @Output() imageClick = new EventEmitter<GalleryImage>();
  @Output() imageDownload = new EventEmitter<{ image: GalleryImage; event: Event }>();
  @Output() imageGirar = new EventEmitter<string>();

  igImages: IgImage[] = [];

  ngOnChanges(): void {
    this.igImages = this.images.map((img) => {
      const h = this.hash(img.guid);
      return {
        ...img,
        likes: 50 + (h % 450),
        hace: this.tiempos[h % this.tiempos.length],
      };
    });
  }

  private tiempos = ['hace 1 hora', 'hace 2 horas', 'hace 4 horas', 'hace 6 horas', 'hace 8 horas', 'hace 12 horas'];

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
