import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GalleryImage } from '../galeria-modos.types';
import { obtenerEstiloRotacion } from '../galeria-modos-rotation.helpers';

@Component({
  selector: 'app-periodico-vintage-modo',
  standalone: true,
  imports: [CommonModule],
  template: `
    <article class="periodico">
      <header class="periodico-header">
        <div class="header-line">★ ★ ★ ★ ★</div>
        <h1 class="periodico-titulo">{{ galeriaNombre || 'EL DIARIO LUMEN' }}</h1>
        <div class="header-meta">
          <span>EDICIÓN ESPECIAL</span>
          <span>{{ galeriaFecha || 'HOY' }}</span>
          <span>PRECIO: GRATIS</span>
        </div>
        <div class="header-line">═══════════════</div>
      </header>

      <div class="periodico-columnas">
        <div
          *ngFor="let image of images; let i = index; trackBy: trackByGuid"
          class="periodico-articulo"
          [attr.data-aos]="'fade-up'"
          [attr.data-aos-delay]="(i % 8) * 80"
          (click)="imageClick.emit(image)"
        >
          <div class="articulo-foto">
            <img [src]="image.url" [alt]="image.alt" [ngStyle]="obtenerEstiloRotacion(image.guid)"
              loading="lazy" />
            <button class="articulo-girar" (click)="onGirar(image.guid, $event)" title="Girar imagen">↻</button>
          <button class="articulo-download" (click)="onDownload(image, $event)" title="Descargar">⬇</button>
          </div>
          <p class="articulo-pie">— {{ image.alt || 'Crónica del día' }} —</p>
        </div>
      </div>
    </article>
  `,
  styles: [`
    .periodico {
      background: #f4ecd8;
      color: #2a1f10;
      padding: 2rem 1.5rem;
      filter: sepia(0.15) contrast(1.05);
      box-shadow: 0 8px 30px rgba(0,0,0,0.3);
      font-family: 'Times New Roman', Times, serif;
      max-width: 1100px;
      margin: 0 auto;
    }

    .periodico-header {
      text-align: center;
      border-bottom: 3px double #2a1f10;
      padding-bottom: 1rem;
      margin-bottom: 1.5rem;
    }
    .periodico-titulo {
      font-family: 'Times New Roman', serif;
      font-size: clamp(1.8rem, 5vw, 3rem);
      letter-spacing: 0.05em;
      margin: 0.5rem 0;
      font-weight: bold;
    }
    .header-meta {
      display: flex; justify-content: space-between;
      font-size: 0.8rem; letter-spacing: 0.1em;
      text-transform: uppercase;
      margin-top: 0.5rem;
    }
    .header-line { letter-spacing: 0.3em; opacity: 0.7; }

    .periodico-columnas {
      column-count: 3;
      column-gap: 1.5rem;
      column-rule: 1px solid rgba(42, 31, 16, 0.3);
    }
    @media (max-width: 900px)  { .periodico-columnas { column-count: 2; } }
    @media (max-width: 600px)  { .periodico-columnas { column-count: 1; } }

    .periodico-articulo {
      break-inside: avoid;
      margin-bottom: 1.5rem;
      cursor: pointer;
      transition: opacity 0.3s;
    }
    .periodico-articulo:hover { opacity: 0.85; }

    .articulo-foto {
      position: relative;
      filter: grayscale(0.3) contrast(1.1);
      border: 1px solid #2a1f10;
      box-shadow: 2px 2px 0 #2a1f10;
    }
    .articulo-foto img { width: 100%; display: block; }
    .articulo-pie {
      font-size: 0.85rem;
      font-style: italic;
      text-align: center;
      margin: 0.5rem 0;
      border-bottom: 1px dashed #2a1f10;
      padding-bottom: 0.5rem;
    }

    .articulo-download {
      position: absolute; top: 6px; right: 6px;
      background: rgba(244, 236, 216, 0.9);
      border: 1px solid #2a1f10;
      width: 28px; height: 28px;
      cursor: pointer;
      opacity: 0; transition: opacity 0.3s;
    }
    .periodico-articulo:hover .articulo-download { opacity: 1; }
    .periodico-articulo:hover .articulo-girar { opacity: 1; }
  
    .articulo-girar {
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
export class PeriodicoVintageModoComponent {
  @Input() images: GalleryImage[] = [];
  @Input() galeriaNombre: string = '';
  @Input() galeriaFecha: string = '';
  @Input() isMobile: boolean = false;
  @Input() rotaciones: Map<string, number> = new Map();
  @Output() imageClick = new EventEmitter<GalleryImage>();
  @Output() imageDownload = new EventEmitter<{ image: GalleryImage; event: Event }>();
  @Output() imageGirar = new EventEmitter<string>();

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
