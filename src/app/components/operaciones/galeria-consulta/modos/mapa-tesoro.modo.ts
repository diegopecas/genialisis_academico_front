import { Component, EventEmitter, Input, Output, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GalleryImage } from '../galeria-modos.types';
import { obtenerEstiloRotacion } from '../galeria-modos-rotation.helpers';

interface TesoroImage extends GalleryImage {
  x: number;
  y: number;
}

@Component({
  selector: 'app-mapa-tesoro-modo',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="mapa-stage">
      <div class="mapa-titulo">
        <span class="titulo-decoracion">⚓</span>
        <h3>El tesoro del día</h3>
        <span class="titulo-decoracion">⚓</span>
      </div>

      <div class="mapa-pergamino">
        <div class="pergamino-bordes"></div>

        <!-- Decoraciones del mapa -->
        <span class="mapa-deco deco-norte">N</span>
        <span class="mapa-deco deco-sur">S</span>
        <span class="mapa-deco deco-este">E</span>
        <span class="mapa-deco deco-oeste">O</span>
        <span class="mapa-isla isla-1">🏝️</span>
        <span class="mapa-isla isla-2">⛰️</span>
        <span class="mapa-isla isla-3">🌴</span>
        <span class="mapa-barco">⛵</span>
        <span class="mapa-rosa-vientos">✦</span>

        <!-- Línea de ruta SVG -->
        <svg class="mapa-ruta" preserveAspectRatio="none" viewBox="0 0 100 100">
          <path
            *ngIf="rutaPath"
            [attr.d]="rutaPath"
            stroke="#8b3a1a"
            stroke-width="0.4"
            stroke-dasharray="2,1.5"
            fill="none"
            opacity="0.6"
          />
        </svg>

        <!-- Puntos con fotos -->
        <div
          *ngFor="let image of tesoroImages; let i = index; trackBy: trackByGuid; let last = last"
          class="mapa-punto"
          [class.es-tesoro]="last"
          [style.left.%]="image.x"
          [style.top.%]="image.y"
          [style.animation-delay.s]="i * 0.15"
          (click)="imageClick.emit(image)"
        >
          <div class="punto-foto">
            <img [src]="image.url" [alt]="image.alt" [ngStyle]="obtenerEstiloRotacion(image.guid)"
              loading="lazy" />
            <span class="punto-numero">{{ i + 1 }}</span>
            <button class="punto-girar" (click)="onGirar(image.guid, $event)" title="Girar imagen">↻</button>
          <button class="punto-download" (click)="onDownload(image, $event)" title="Descargar">⬇</button>
          </div>
          <span *ngIf="last" class="tesoro-x">✕</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .mapa-stage {
      width: 100%;
      min-height: 700px;
      background: linear-gradient(135deg, #2c1a0a 0%, #1a0e05 100%);
      border-radius: 16px;
      padding: 2rem 1rem;
    }

    .mapa-titulo {
      display: flex; align-items: center; justify-content: center;
      gap: 1.5rem;
      color: #f5e6c8;
      font-family: 'Pirata One', Georgia, serif;
      margin-bottom: 1.5rem;
    }
    .mapa-titulo h3 {
      margin: 0;
      font-size: 2rem;
      letter-spacing: 0.1em;
      text-shadow: 2px 2px 0 #5d3a1a;
    }
    .titulo-decoracion { font-size: 1.5rem; opacity: 0.7; }

    .mapa-pergamino {
      position: relative;
      width: 100%;
      height: 600px;
      background:
        radial-gradient(ellipse at 30% 30%, rgba(139, 90, 43, 0.15) 0%, transparent 60%),
        radial-gradient(ellipse at 70% 70%, rgba(139, 90, 43, 0.1) 0%, transparent 50%),
        repeating-linear-gradient(0deg, transparent 0, transparent 4px, rgba(120, 70, 30, 0.04) 4px, rgba(120, 70, 30, 0.04) 5px),
        linear-gradient(135deg, #f4e4c1 0%, #e8d4a8 100%);
      border-radius: 4px;
      box-shadow:
        inset 0 0 60px rgba(120, 70, 30, 0.4),
        0 8px 25px rgba(0,0,0,0.5);
      filter: sepia(0.2);
    }

    .pergamino-bordes {
      position: absolute; inset: 0;
      border: 8px solid transparent;
      border-image: repeating-linear-gradient(45deg, #8b5a2b, #8b5a2b 5px, #6b3410 5px, #6b3410 10px) 8;
      pointer-events: none;
      opacity: 0.4;
    }

    .mapa-deco {
      position: absolute;
      font-family: Georgia, serif;
      font-weight: bold;
      color: rgba(80, 40, 10, 0.7);
      font-size: 1.4rem;
      pointer-events: none;
    }
    .deco-norte { top: 20px; left: 50%; transform: translateX(-50%); }
    .deco-sur   { bottom: 20px; left: 50%; transform: translateX(-50%); }
    .deco-este  { top: 50%; right: 20px; transform: translateY(-50%); }
    .deco-oeste { top: 50%; left: 20px; transform: translateY(-50%); }

    .mapa-rosa-vientos {
      position: absolute;
      top: 80px; right: 80px;
      font-size: 3rem;
      color: rgba(80, 40, 10, 0.3);
      pointer-events: none;
    }

    .mapa-isla {
      position: absolute;
      font-size: 2rem;
      opacity: 0.45;
      pointer-events: none;
      filter: sepia(0.5);
    }
    .isla-1 { top: 25%; left: 12%; }
    .isla-2 { bottom: 22%; left: 20%; }
    .isla-3 { top: 65%; right: 18%; }
    .mapa-barco {
      position: absolute;
      top: 15%; right: 25%;
      font-size: 2.2rem;
      opacity: 0.55;
      pointer-events: none;
      filter: sepia(0.5);
    }

    .mapa-ruta {
      position: absolute; inset: 0;
      width: 100%; height: 100%;
      pointer-events: none;
    }

    .mapa-punto {
      position: absolute;
      transform: translate(-50%, -50%);
      cursor: pointer;
      animation: appearPunto 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) backwards;
    }
    @keyframes appearPunto {
      from { opacity: 0; transform: translate(-50%, -50%) scale(0); }
      to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
    }

    .punto-foto {
      position: relative;
      width: 70px; height: 70px;
      border-radius: 50%;
      overflow: hidden;
      border: 3px solid #f5e6c8;
      box-shadow: 0 4px 12px rgba(0,0,0,0.5);
      transition: transform 0.3s ease;
    }
    .punto-foto:hover { transform: scale(1.3); z-index: 20; }
    .punto-foto img { width: 100%; height: 100%; object-fit: cover; display: block; }

    .punto-numero {
      position: absolute;
      top: -8px; left: -8px;
      background: #8b3a1a;
      color: #f5e6c8;
      width: 24px; height: 24px;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 0.75rem;
      font-weight: bold;
      border: 2px solid #f5e6c8;
      box-shadow: 0 2px 4px rgba(0,0,0,0.4);
    }

    .punto-download {
      position: absolute; bottom: 0; right: 0;
      background: rgba(255,255,255,0.95);
      border: none; border-radius: 50%;
      width: 24px; height: 24px;
      cursor: pointer;
      opacity: 0; transition: opacity 0.3s;
      font-size: 0.7rem;
    }
    .punto-foto:hover .punto-download { opacity: 1; }
    .punto-foto:hover .punto-girar { opacity: 1; }

    .es-tesoro .punto-foto {
      border-color: #d4af37;
      box-shadow: 0 0 15px rgba(212, 175, 55, 0.7), 0 4px 12px rgba(0,0,0,0.5);
      animation: parpadeoTesoro 1.5s ease-in-out infinite;
    }
    @keyframes parpadeoTesoro {
      0%, 100% { box-shadow: 0 0 15px rgba(212, 175, 55, 0.5), 0 4px 12px rgba(0,0,0,0.5); }
      50%      { box-shadow: 0 0 30px rgba(212, 175, 55, 0.9), 0 4px 12px rgba(0,0,0,0.5); }
    }

    .tesoro-x {
      position: absolute;
      top: -28px; left: 50%;
      transform: translateX(-50%);
      color: #c41e3a;
      font-size: 2.5rem;
      font-weight: bold;
      text-shadow: 0 0 4px rgba(0,0,0,0.5);
      filter: drop-shadow(0 2px 3px rgba(0,0,0,0.5));
    }

    @media (max-width: 768px) {
      .punto-foto { width: 50px; height: 50px; }
      .punto-numero { width: 20px; height: 20px; font-size: 0.7rem; }
      .mapa-pergamino { height: 500px; }
    }

    @media (prefers-reduced-motion: reduce) {
      .mapa-punto, .es-tesoro .punto-foto { animation: none; }
      .punto-foto, .punto-foto:hover { transform: none; transition: none; }
    }
  
    .punto-girar {
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
export class MapaTesoroModoComponent implements OnChanges {
  @Input() images: GalleryImage[] = [];
  @Input() isMobile: boolean = false;
  @Input() rotaciones: Map<string, number> = new Map();
  @Output() imageClick = new EventEmitter<GalleryImage>();
  @Output() imageDownload = new EventEmitter<{ image: GalleryImage; event: Event }>();
  @Output() imageGirar = new EventEmitter<string>();

  tesoroImages: TesoroImage[] = [];
  rutaPath: string = '';

  ngOnChanges(): void {
    // Genera puntos siguiendo una ruta serpenteante por el mapa
    const total = this.images.length;
    if (total === 0) {
      this.tesoroImages = [];
      this.rutaPath = '';
      return;
    }

    this.tesoroImages = this.images.map((img, i) => {
      const h = this.hash(img.guid);
      // Distribuir por fila/columna serpenteante con jitter
      const cols = 4;
      const rowProgress = i / total;
      const xBase = (i % cols) * 22 + 15;
      const xZigzag = (Math.floor(i / cols) % 2 === 0) ? xBase : 100 - xBase;
      const yBase = rowProgress * 70 + 12;

      return {
        ...img,
        x: Math.max(10, Math.min(90, xZigzag + ((h % 8) - 4))),
        y: Math.max(10, Math.min(85, yBase + ((h % 6) - 3))),
      };
    });

    // Construye el path SVG en porcentaje (viewBox 0-100)
    if (this.tesoroImages.length > 1) {
      const puntos = this.tesoroImages.map((p) => `${p.x},${p.y}`);
      this.rutaPath = `M ${puntos[0]} ` + puntos.slice(1).map(p => `L ${p}`).join(' ');
    }
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
