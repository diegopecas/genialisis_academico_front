import { Component, EventEmitter, Input, Output, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GalleryImage } from '../galeria-modos.types';
import { obtenerEstiloRotacion } from '../galeria-modos-rotation.helpers';

interface RelojImage extends GalleryImage {
  angulo: number;       // grados, 0 = arriba (12 en punto)
  horaSimbolica: string; // "1", "2", "3"... para mostrar
}

@Component({
  selector: 'app-reloj-dia-modo',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="reloj-stage">
      <div class="reloj-titulo">
        <h3>Las horas del día</h3>
        <p>Cada foto, un momento</p>
      </div>

      <div class="reloj-container">
        <div class="reloj-marco">
          <span *ngFor="let marca of marcas" class="reloj-marca" [style.transform]="'rotate(' + marca + 'deg)'">
            <span></span>
          </span>

          <div class="reloj-centro">
            <div class="centro-punto"></div>
          </div>

          <div
            *ngFor="let image of relojImages; let i = index; trackBy: trackByGuid"
            class="reloj-foto"
            [style.transform]="'rotate(' + image.angulo + 'deg) translateY(-' + radio + 'px) rotate(' + (-image.angulo) + 'deg)'"
            [style.animation-delay.s]="i * 0.1"
            (click)="imageClick.emit(image)"
          >
            <div class="foto-circle">
              <img [src]="image.url" [alt]="image.alt" [ngStyle]="obtenerEstiloRotacion(image.guid)"
              loading="lazy" />
              <span class="foto-hora">{{ image.horaSimbolica }}</span>
              <button class="foto-girar" (click)="onGirar(image.guid, $event)" title="Girar imagen">↻</button>
          <button class="foto-download" (click)="onDownload(image, $event)" title="Descargar">⬇</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .reloj-stage {
      width: 100%;
      min-height: 700px;
      background: radial-gradient(ellipse at center, #2c3e50 0%, #1a252f 100%);
      border-radius: 16px;
      padding: 2rem 1rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }

    .reloj-titulo {
      text-align: center;
      color: #f5e6c8;
      margin-bottom: 2rem;
      font-family: Georgia, serif;
    }
    .reloj-titulo h3 { margin: 0; font-size: 1.8rem; font-weight: normal; letter-spacing: 0.08em; }
    .reloj-titulo p { margin: 0.25rem 0 0; opacity: 0.7; font-style: italic; }

    .reloj-container {
      position: relative;
      width: 100%;
      display: flex;
      justify-content: center;
    }

    .reloj-marco {
      position: relative;
      width: 600px; height: 600px;
      max-width: 90vw;
      max-height: 90vw;
      border-radius: 50%;
      background: radial-gradient(circle, #f5e6c8 0%, #e0cfa8 80%);
      box-shadow:
        inset 0 0 30px rgba(120, 80, 30, 0.3),
        0 0 0 8px #5d3a1a,
        0 0 0 12px #d4af37,
        0 12px 40px rgba(0,0,0,0.5);
    }

    .reloj-marca {
      position: absolute;
      top: 0; left: 50%;
      width: 4px; height: 50%;
      transform-origin: bottom center;
      pointer-events: none;
    }
    .reloj-marca span {
      display: block;
      width: 4px; height: 18px;
      background: #2a1f10;
      margin-left: -2px;
    }

    .reloj-centro {
      position: absolute;
      top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      width: 30px; height: 30px;
      display: flex; align-items: center; justify-content: center;
      z-index: 10;
    }
    .centro-punto {
      width: 16px; height: 16px;
      border-radius: 50%;
      background: #2a1f10;
      box-shadow: 0 0 0 4px #d4af37;
    }

    .reloj-foto {
      position: absolute;
      top: 50%; left: 50%;
      width: 70px; height: 70px;
      margin-left: -35px; margin-top: -35px;
      transform-origin: center;
      cursor: pointer;
      animation: appearClock 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) backwards;
    }
    @keyframes appearClock {
      from { opacity: 0; }
      to   { opacity: 1; }
    }

    .foto-circle {
      position: relative;
      width: 100%; height: 100%;
      border-radius: 50%;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0,0,0,0.4);
      transition: transform 0.3s ease;
      border: 3px solid #f5e6c8;
    }
    .foto-circle:hover { transform: scale(1.4); z-index: 20; box-shadow: 0 8px 20px rgba(0,0,0,0.6); }
    .foto-circle img { width: 100%; height: 100%; object-fit: cover; display: block; }

    .foto-hora {
      position: absolute;
      bottom: 4px; left: 50%; transform: translateX(-50%);
      background: rgba(0,0,0,0.7);
      color: #f5e6c8;
      font-size: 0.65rem;
      padding: 1px 6px;
      border-radius: 8px;
      font-family: Georgia, serif;
    }

    .foto-download {
      position: absolute; top: 4px; right: 4px;
      background: rgba(255,255,255,0.95);
      border: none; border-radius: 50%;
      width: 22px; height: 22px;
      cursor: pointer;
      opacity: 0; transition: opacity 0.3s;
      font-size: 0.7rem;
    }
    .foto-circle:hover .foto-download { opacity: 1; }
    .foto-circle:hover .foto-girar { opacity: 1; }

    @media (max-width: 768px) {
      .reloj-foto { width: 50px; height: 50px; margin-left: -25px; margin-top: -25px; }
    }

    @media (prefers-reduced-motion: reduce) {
      .reloj-foto { animation: none; }
      .foto-circle, .foto-circle:hover { transform: none; transition: none; }
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
export class RelojDiaModoComponent implements OnChanges {
  @Input() images: GalleryImage[] = [];
  @Input() isMobile: boolean = false;
  @Input() rotaciones: Map<string, number> = new Map();
  @Output() imageClick = new EventEmitter<GalleryImage>();
  @Output() imageDownload = new EventEmitter<{ image: GalleryImage; event: Event }>();
  @Output() imageGirar = new EventEmitter<string>();

  relojImages: RelojImage[] = [];
  marcas: number[] = [];
  radio = 230;

  ngOnChanges(): void {
    // Distribuye las fotos uniformemente en 360° empezando arriba (-90° en CSS = 0 en reloj = 12 en punto)
    const total = this.images.length;
    const paso = total > 0 ? 360 / total : 0;

    this.relojImages = this.images.map((img, i) => ({
      ...img,
      angulo: i * paso,
      horaSimbolica: this.calcularHora(i, total),
    }));

    // 12 marcas del reloj (cada 30°)
    this.marcas = [];
    for (let i = 0; i < 12; i++) {
      this.marcas.push(i * 30);
    }

    // Radio responsive
    this.radio = this.isMobile ? 140 : 230;
  }

  private calcularHora(i: number, total: number): string {
    if (total === 0) return '';
    // Mapea el índice a un rango de horas 6am-9pm (15h de jornada escolar aprox)
    const horaInicio = 6;
    const horaFin = 21;
    const rango = horaFin - horaInicio;
    const hora = horaInicio + Math.floor((i / total) * rango);
    return `${hora}:00`;
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
