import { Component, EventEmitter, Input, Output, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GalleryImage } from '../galeria-modos.types';
import { obtenerEstiloRotacion } from '../galeria-modos-rotation.helpers';

interface MuseoImage extends GalleryImage {
  marco: string;
}

@Component({
  selector: 'app-galeria-museo-modo',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="museo-stage">
      <div class="museo-pared"></div>

      <div class="museo-header">
        <h3 class="museo-titulo">{{ galeriaNombre || 'Exposición' }}</h3>
        <div class="museo-divider">— ✦ —</div>
      </div>

      <div class="museo-grid">
        <div
          *ngFor="let image of museoImages; let i = index; trackBy: trackByGuid"
          class="museo-obra"
          [attr.data-aos]="'fade-up'"
          [attr.data-aos-delay]="(i % 8) * 100"
          (click)="imageClick.emit(image)"
        >
          <div class="obra-luz"></div>
          <div class="obra-marco" [class]="image.marco">
            <div class="obra-passepartout">
              <div class="obra-imagen">
                <img [src]="image.url" [alt]="image.alt" [ngStyle]="obtenerEstiloRotacion(image.guid)"
              loading="lazy" />
              </div>
            </div>
          </div>
          <div class="obra-placa">
            <span class="placa-titulo">{{ image.alt || ('Obra ' + (i + 1)) }}</span>
            <span class="placa-num">№ {{ i + 1 }}</span>
          </div>
          <button class="obra-girar" (click)="onGirar(image.guid, $event)" title="Girar imagen">↻</button>
          <button class="obra-download" (click)="onDownload(image, $event)" title="Descargar">⬇</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .museo-stage {
      position: relative;
      width: 100%;
      min-height: 700px;
      padding: 3rem 2rem;
      background:
        linear-gradient(180deg, transparent 0%, transparent 60%, rgba(0,0,0,0.15) 100%),
        linear-gradient(135deg, #e8dcc8 0%, #d4c4a8 100%);
      border-radius: 8px;
      overflow: hidden;
    }

    .museo-pared {
      position: absolute; inset: 0;
      background-image:
        repeating-linear-gradient(0deg, transparent 0, transparent 80px, rgba(120, 90, 60, 0.06) 80px, rgba(120, 90, 60, 0.06) 81px),
        repeating-linear-gradient(90deg, transparent 0, transparent 80px, rgba(120, 90, 60, 0.06) 80px, rgba(120, 90, 60, 0.06) 81px);
      pointer-events: none;
    }

    .museo-header {
      position: relative; z-index: 2;
      text-align: center;
      margin-bottom: 3rem;
      color: #5d4528;
    }
    .museo-titulo {
      font-family: Georgia, serif;
      font-size: clamp(1.6rem, 4vw, 2.4rem);
      font-weight: normal;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      margin: 0;
    }
    .museo-divider {
      margin-top: 0.5rem;
      letter-spacing: 0.2em;
      opacity: 0.6;
    }

    .museo-grid {
      position: relative; z-index: 2;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 4rem 2rem;
      justify-items: center;
    }
    @media (max-width: 768px) {
      .museo-grid { grid-template-columns: 1fr; gap: 3rem; }
    }

    .museo-obra {
      position: relative;
      cursor: pointer;
      max-width: 320px;
      transition: transform 0.4s ease;
    }
    .museo-obra:hover { transform: translateY(-4px); }

    .obra-luz {
      position: absolute;
      top: -30px; left: 50%;
      transform: translateX(-50%);
      width: 240px; height: 60px;
      background: radial-gradient(ellipse, rgba(255, 240, 200, 0.5) 0%, transparent 70%);
      filter: blur(8px);
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.4s;
    }
    .museo-obra:hover .obra-luz { opacity: 1; }

    .obra-marco {
      position: relative;
      padding: 18px;
      background:
        linear-gradient(135deg, #d4af37 0%, #f4d36a 50%, #b8860b 100%);
      box-shadow:
        0 8px 25px rgba(0,0,0,0.4),
        inset 0 0 0 3px rgba(0,0,0,0.2),
        inset 0 0 30px rgba(255, 220, 100, 0.3);
    }
    .obra-marco.marco-bronce {
      background: linear-gradient(135deg, #8b6f47 0%, #c9a875 50%, #6b5535 100%);
    }
    .obra-marco.marco-plata {
      background: linear-gradient(135deg, #b8b8b8 0%, #e8e8e8 50%, #909090 100%);
    }
    .obra-marco.marco-negro {
      background: linear-gradient(135deg, #2a2a2a 0%, #4a4a4a 50%, #1a1a1a 100%);
    }

    .obra-passepartout {
      background: #f8f4ed;
      padding: 12px;
      box-shadow: inset 0 0 8px rgba(0,0,0,0.15);
    }

    .obra-imagen {
      aspect-ratio: 4 / 5;
      overflow: hidden;
    }
    .obra-imagen img {
      width: 100%; height: 100%;
      object-fit: cover; display: block;
    }

    .obra-placa {
      margin: 1rem auto 0;
      max-width: 90%;
      background: linear-gradient(135deg, #c9a875 0%, #b8967a 100%);
      padding: 0.5rem 1rem;
      border-radius: 2px;
      box-shadow: 0 3px 6px rgba(0,0,0,0.25);
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      color: #3d2c14;
    }
    .placa-titulo {
      font-family: Georgia, serif;
      font-style: italic;
      font-size: 0.9rem;
    }
    .placa-num {
      font-size: 0.7rem;
      letter-spacing: 0.1em;
      opacity: 0.7;
    }

    .obra-download {
      position: absolute; top: 8px; right: 8px;
      background: rgba(255,255,255,0.9);
      border: none; border-radius: 50%;
      width: 32px; height: 32px;
      cursor: pointer;
      opacity: 0; transition: opacity 0.3s;
      z-index: 5;
    }
    .museo-obra:hover .obra-download { opacity: 1; }
    .museo-obra:hover .obra-girar { opacity: 1; }

    @media (prefers-reduced-motion: reduce) {
      .museo-obra, .museo-obra:hover { transform: none; transition: none; }
    }
  
    .obra-girar {
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
export class GaleriaMuseoModoComponent implements OnChanges {
  @Input() images: GalleryImage[] = [];
  @Input() galeriaNombre: string = '';
  @Input() isMobile: boolean = false;
  @Input() rotaciones: Map<string, number> = new Map();
  @Output() imageClick = new EventEmitter<GalleryImage>();
  @Output() imageDownload = new EventEmitter<{ image: GalleryImage; event: Event }>();
  @Output() imageGirar = new EventEmitter<string>();

  museoImages: MuseoImage[] = [];
  private marcos = ['', 'marco-bronce', 'marco-plata', 'marco-negro'];

  ngOnChanges(): void {
    this.museoImages = this.images.map((img) => {
      const h = this.hash(img.guid);
      return {
        ...img,
        marco: this.marcos[h % this.marcos.length],
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
