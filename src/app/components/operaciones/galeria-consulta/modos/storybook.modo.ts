import { Component, EventEmitter, Input, Output, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GalleryImage } from '../galeria-modos.types';
import { obtenerEstiloRotacion } from '../galeria-modos-rotation.helpers';

@Component({
  selector: 'app-storybook-modo',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="storybook-container">
      <div class="storybook-cover" *ngIf="!started" (click)="started = true">
        <div class="cover-decoration cover-top">✦ ✦ ✦</div>
        <h2 class="cover-title">{{ galeriaNombre || 'Nuestro día' }}</h2>
        <!-- La descripción viene del CKEditor con HTML -->
        <div class="cover-subtitle" [innerHTML]="galeriaDescripcion || 'Un cuento para los papás'"></div>
        <div class="cover-decoration cover-bottom">✦ ✦ ✦</div>
        <button class="cover-open">Abrir el cuento ✨</button>
      </div>

      <div class="storybook-book" *ngIf="started">
        <div class="page-controls page-controls-top">
          <button class="page-btn" [disabled]="currentPage === 0" (click)="prev()">‹ Anterior</button>
          <span class="page-counter">{{ currentPage + 1 }} / {{ images.length }}</span>
          <button class="page-btn" [disabled]="currentPage >= images.length - 1" (click)="next()">Siguiente ›</button>
        </div>

        <div class="page-stage">
          <div
            *ngFor="let image of images; let i = index; trackBy: trackByGuid"
            class="page"
            [class.flipped]="i < currentPage"
            [class.current]="i === currentPage"
            [style.z-index]="images.length - i"
            (click)="onPageClick(image, i)"
          >
            <div class="page-front">
              <img [src]="image.url" [alt]="image.alt" [ngStyle]="obtenerEstiloRotacion(image.guid)"
              loading="lazy" />
              <p class="page-caption">{{ image.alt || ('Página ' + (i + 1)) }}</p>
              <button class="page-girar" (click)="onGirar(image.guid, $event)" title="Girar imagen">↻</button>
          <button *ngIf="puedeDescargar" class="page-download" (click)="onDownload(image, $event)">⬇</button>
            </div>
            <div class="page-back">
              <span class="page-number">{{ i + 1 }}</span>
            </div>
          </div>
        </div>

        <div class="page-controls page-controls-bottom">
          <button class="page-btn" [disabled]="currentPage === 0" (click)="prev()">‹ Anterior</button>
          <span class="page-counter">{{ currentPage + 1 }} / {{ images.length }}</span>
          <button class="page-btn" [disabled]="currentPage >= images.length - 1" (click)="next()">Siguiente ›</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .storybook-container {
      width: 100%;
      min-height: 600px;
      padding: 2rem 1rem;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .storybook-cover {
      width: 100%; max-width: 480px;
      aspect-ratio: 3 / 4;
      background: linear-gradient(135deg, #5d3a1a, #8b5a2b);
      color: #f5e6c8;
      border-radius: 8px;
      box-shadow: 0 12px 40px rgba(0,0,0,0.4);
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      padding: 2rem; text-align: center;
      cursor: pointer;
      gap: 1rem;
      position: relative;
      border: 8px solid #4a2d12;
    }
    .cover-title { font-family: Georgia, serif; font-size: 2.2rem; margin: 0; }
    .cover-subtitle { font-family: Georgia, serif; font-style: italic; opacity: 0.85; margin: 1em 0; }
    .cover-subtitle ::ng-deep p { margin: 0 0 0.3rem; }
    .cover-subtitle ::ng-deep p:last-child { margin-bottom: 0; }
    .cover-subtitle ::ng-deep ul,
    .cover-subtitle ::ng-deep ol { margin: 0 0 0.3rem; padding-left: 1.1rem; text-align: left; }
    .cover-decoration { font-size: 1.2rem; opacity: 0.6; }
    .cover-open {
      margin-top: 1rem;
      background: #f5e6c8; color: #5d3a1a;
      border: none; padding: 0.75rem 1.5rem;
      border-radius: 24px; font-weight: bold;
      cursor: pointer;
    }

    .storybook-book {
      width: 100%; max-width: 600px;
      display: flex; flex-direction: column; gap: 1rem;
    }

    .page-controls {
      display: flex; justify-content: space-between; align-items: center;
      gap: 1rem;
      background: rgba(0, 0, 0, 0.4);
      backdrop-filter: blur(10px);
      padding: 0.75rem 1rem;
      border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.15);
    }
    .page-controls-top {
      position: sticky;
      top: 10px;
      z-index: 10;
      margin-bottom: 1rem;
    }
    .page-controls-bottom {
      margin-top: 1rem;
    }
    .page-btn {
      background: #f5e6c8;
      color: #5d3a1a;
      border: 2px solid #5d3a1a;
      padding: 0.6rem 1.1rem;
      border-radius: 8px;
      cursor: pointer;
      font-weight: bold;
      font-size: 0.9rem;
      transition: transform 0.15s ease, background 0.15s ease;
    }
    .page-btn:hover:not(:disabled) {
      background: #fff;
      transform: scale(1.05);
    }
    .page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
    .page-counter {
      color: #fff;
      font-weight: 600;
      font-family: Georgia, serif;
      font-size: 1rem;
    }

    .page-stage {
      position: relative;
      width: 100%; aspect-ratio: 3 / 4;
      perspective: 2000px;
    }

    .page {
      position: absolute; inset: 0;
      transform-style: preserve-3d;
      transform-origin: left center;
      transition: transform 0.9s cubic-bezier(0.4, 0, 0.2, 1);
      cursor: pointer;
    }
    .page.flipped { transform: rotateY(-180deg); }

    .page-front, .page-back {
      position: absolute; inset: 0;
      backface-visibility: hidden;
      background: #f5e6c8;
      border-radius: 4px 8px 8px 4px;
      box-shadow: 0 4px 18px rgba(0,0,0,0.3), inset 5px 0 10px rgba(0,0,0,0.1);
      padding: 1.5rem;
      display: flex; flex-direction: column;
    }
    .page-back {
      transform: rotateY(180deg);
      background: #e8d8b5;
      align-items: center; justify-content: center;
    }
    .page-number {
      font-family: Georgia, serif;
      font-size: 4rem; color: rgba(120, 80, 40, 0.4);
    }

    .page-front img {
      width: 100%; flex: 1;
      object-fit: cover; border-radius: 4px;
      min-height: 0;
    }
    .page-caption {
      margin-top: 1rem;
      font-family: Georgia, serif;
      font-style: italic;
      color: #5d3a1a;
      text-align: center;
    }

    .page-download {
      position: absolute; top: 1.5rem; right: 1.5rem;
      background: rgba(255,255,255,0.9);
      border: none; border-radius: 50%;
      width: 32px; height: 32px;
      cursor: pointer;
    }

    @media (max-width: 768px) {
      .storybook-cover { max-width: 90vw; }
    }

    @media (prefers-reduced-motion: reduce) {
      .page { transition: none; }
    }
  
    .page-girar {
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
export class StorybookModoComponent implements OnChanges {
  @Input() images: GalleryImage[] = [];
  @Input() galeriaNombre: string = '';
  @Input() galeriaDescripcion: string = '';
  @Input() isMobile: boolean = false;
  @Input() rotaciones: Map<string, number> = new Map();
  /** Si el usuario puede descargar las fotos. Sin el permiso, el botón de descarga no se muestra. */
  @Input() puedeDescargar: boolean = true;
  @Output() imageClick = new EventEmitter<GalleryImage>();
  @Output() imageDownload = new EventEmitter<{ image: GalleryImage; event: Event }>();
  @Output() imageGirar = new EventEmitter<string>();

  started = false;
  currentPage = 0;

  ngOnChanges(): void {
    this.currentPage = 0;
    this.started = false;
  }

  next(): void {
    if (this.currentPage < this.images.length - 1) this.currentPage++;
  }

  prev(): void {
    if (this.currentPage > 0) this.currentPage--;
  }

  onPageClick(image: GalleryImage, i: number): void {
    if (i === this.currentPage) {
      this.imageClick.emit(image);
    } else if (i > this.currentPage) {
      this.currentPage = i;
    }
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
