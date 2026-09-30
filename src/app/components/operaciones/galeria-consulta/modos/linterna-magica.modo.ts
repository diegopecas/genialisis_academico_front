import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GalleryImage } from '../galeria-modos.types';
import { obtenerEstiloRotacion } from '../galeria-modos-rotation.helpers';

@Component({
  selector: 'app-linterna-magica-modo',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="linterna-stage" [class.is-mobile]="isMobile" (click)="onStageClick($event)">
      <div class="linterna-hint" *ngIf="isMobile && tappedIndex === -1">
        Toca una foto para iluminarla 🔦
      </div>

      <div class="linterna-grid" [class.mobile]="isMobile">
        <div
          *ngFor="let image of images; let i = index; trackBy: trackByGuid"
          class="linterna-foto"
          [class.iluminada]="estaIluminada(i)"
          [class.tenue]="estaTenue(i)"
          [attr.data-aos]="'fade-in'"
          [attr.data-aos-delay]="(i % 12) * 60"
          (mouseenter)="onMouseEnter(i)"
          (mouseleave)="onMouseLeave()"
          (click)="onFotoClick(image, i, $event)"
        >
          <img [src]="image.url" [alt]="image.alt" [ngStyle]="obtenerEstiloRotacion(image.guid)"
              loading="lazy" />
          <button class="linterna-girar" (click)="onGirar(image.guid, $event)" title="Girar imagen">↻</button>
          <button class="linterna-download" (click)="onDownload(image, $event)" title="Descargar">⬇</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .linterna-stage {
      position: relative;
      width: 100%; min-height: 600px;
      background: radial-gradient(ellipse at center, #1a1a1a 0%, #000 80%);
      border-radius: 16px;
      padding: 2rem 1rem;
    }

    .linterna-hint {
      position: absolute;
      top: 1rem; left: 50%;
      transform: translateX(-50%);
      color: rgba(255, 220, 150, 0.85);
      font-size: 0.9rem;
      background: rgba(0, 0, 0, 0.5);
      padding: 0.5rem 1rem;
      border-radius: 20px;
      backdrop-filter: blur(8px);
      pointer-events: none;
      z-index: 10;
      animation: hintPulse 2.5s ease-in-out infinite;
    }
    @keyframes hintPulse {
      0%, 100% { opacity: 0.6; }
      50%      { opacity: 1; }
    }

    .linterna-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 1.5rem;
      margin-top: 2.5rem;
    }
    .linterna-grid.mobile { grid-template-columns: repeat(2, 1fr); gap: 1rem; }

    .linterna-foto {
      position: relative;
      aspect-ratio: 1;
      border-radius: 12px;
      overflow: hidden;
      cursor: pointer;
      transition: filter 0.4s ease, transform 0.4s ease, box-shadow 0.4s ease;
      filter: brightness(0.25) blur(2px);
    }

    /* En mobile sin selección, las fotos se ven a media luz (más amigable) */
    .is-mobile .linterna-foto {
      filter: brightness(0.65) blur(0);
    }

    /* Iluminada: por hover en desktop, por tap en mobile */
    .linterna-foto.iluminada {
      filter: brightness(1.1) blur(0);
      transform: scale(1.06);
      box-shadow: 0 0 40px rgba(255, 220, 150, 0.6),
                  0 0 80px rgba(255, 200, 100, 0.3);
      z-index: 5;
    }

    /* Tenue: cuando hay una foto iluminada en mobile, las demás se oscurecen */
    .is-mobile .linterna-foto.tenue {
      filter: brightness(0.2) blur(2px);
    }

    .linterna-foto img {
      width: 100%; height: 100%;
      object-fit: cover; display: block;
    }

    .linterna-download {
      position: absolute; top: 10px; right: 10px;
      background: rgba(255,255,255,0.95);
      border: none; border-radius: 50%;
      width: 32px; height: 32px;
      cursor: pointer;
      opacity: 0; transition: opacity 0.3s;
    }
    .linterna-foto.iluminada .linterna-download { opacity: 1; }

    @media (prefers-reduced-motion: reduce) {
      .linterna-foto { transform: none; transition: filter 0.2s; }
      .linterna-foto.iluminada { transform: none; box-shadow: none; }
    }
  
    .linterna-girar {
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
export class LinternaMagicaModoComponent {
  @Input() images: GalleryImage[] = [];
  @Input() isMobile: boolean = false;
  @Input() rotaciones: Map<string, number> = new Map();
  @Output() imageClick = new EventEmitter<GalleryImage>();
  @Output() imageDownload = new EventEmitter<{ image: GalleryImage; event: Event }>();
  @Output() imageGirar = new EventEmitter<string>();

  /** Índice de la foto bajo el cursor en desktop. -1 = ninguna. */
  hoveredIndex = -1;

  /** Índice de la foto seleccionada con tap en mobile. -1 = ninguna. */
  tappedIndex = -1;

  estaIluminada(i: number): boolean {
    if (this.isMobile) {
      return this.tappedIndex === i;
    }
    // Desktop: la del cursor, o la primera si no hay cursor encima
    return this.hoveredIndex === i || (this.hoveredIndex === -1 && i === 0);
  }

  estaTenue(i: number): boolean {
    return this.isMobile && this.tappedIndex !== -1 && this.tappedIndex !== i;
  }

  onMouseEnter(i: number): void {
    if (!this.isMobile) this.hoveredIndex = i;
  }

  onMouseLeave(): void {
    if (!this.isMobile) this.hoveredIndex = -1;
  }

  /**
   * Desktop: clic abre lightbox.
   * Mobile: primer tap ilumina; segundo tap en la misma foto abre lightbox;
   * tap en otra foto cambia la iluminación a esa otra.
   */
  onFotoClick(image: GalleryImage, i: number, event: Event): void {
    event.stopPropagation();
    if (!this.isMobile) {
      this.imageClick.emit(image);
      return;
    }
    if (this.tappedIndex === i) {
      this.imageClick.emit(image);
    } else {
      this.tappedIndex = i;
    }
  }

  /** Tap en el fondo del stage apaga la linterna en mobile. */
  onStageClick(event: Event): void {
    if (this.isMobile && (event.target as HTMLElement).classList.contains('linterna-stage')) {
      this.tappedIndex = -1;
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
