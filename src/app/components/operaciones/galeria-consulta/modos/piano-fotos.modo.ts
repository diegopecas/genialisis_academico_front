import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GalleryImage } from '../galeria-modos.types';
import { obtenerEstiloRotacion } from '../galeria-modos-rotation.helpers';

@Component({
  selector: 'app-piano-fotos-modo',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="piano-stage">
      <p class="piano-hint">{{ isMobile ? 'Toca cada tecla' : 'Pasa el cursor sobre las teclas' }} 🎹</p>

      <div class="piano-keyboard" [class.mobile]="isMobile">
        <div
          *ngFor="let image of images; let i = index; trackBy: trackByGuid"
          class="piano-key"
          [class.black-key]="isBlackKey(i)"
          (click)="imageClick.emit(image)"
        >
          <div class="key-photo">
            <img [src]="image.url" [alt]="image.alt" [ngStyle]="obtenerEstiloRotacion(image.guid)"
              loading="lazy" />
            <button class="key-girar" (click)="onGirar(image.guid, $event)" title="Girar imagen">↻</button>
          <button class="key-download" (click)="onDownload(image, $event)" title="Descargar">⬇</button>
          </div>
          <div class="key-label">{{ noteName(i) }}</div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .piano-stage {
      width: 100%;
      background: linear-gradient(180deg, #2a1810 0%, #1a0e08 100%);
      border-radius: 16px;
      padding: 2rem 1rem;
      box-shadow: inset 0 0 40px rgba(0,0,0,0.6);
    }

    .piano-hint {
      text-align: center;
      color: rgba(255, 220, 180, 0.8);
      font-size: 1rem;
      margin-bottom: 1.5rem;
    }

    .piano-keyboard {
      display: flex;
      justify-content: center;
      align-items: flex-end;
      gap: 2px;
      flex-wrap: wrap;
    }
    .piano-keyboard.mobile { flex-wrap: wrap; }

    .piano-key {
      position: relative;
      width: 80px;
      height: 220px;
      background: linear-gradient(180deg, #fafafa 0%, #e0e0e0 100%);
      border: 1px solid #888;
      border-radius: 0 0 8px 8px;
      cursor: pointer;
      box-shadow: 0 4px 0 #aaa, inset 0 -10px 20px rgba(0,0,0,0.1);
      transition: transform 0.15s ease, box-shadow 0.15s ease;
      overflow: hidden;
      display: flex; flex-direction: column; align-items: center;
      padding: 8px;
    }
    .piano-key:hover, .piano-key:active {
      transform: translateY(4px);
      box-shadow: 0 0 0 #aaa, inset 0 -5px 15px rgba(0,0,0,0.15);
    }

    .piano-key.black-key {
      width: 50px;
      height: 140px;
      background: linear-gradient(180deg, #2a2a2a 0%, #0a0a0a 100%);
      border-color: #000;
      margin-left: -28px;
      margin-right: -28px;
      z-index: 2;
      box-shadow: 0 4px 0 #000, inset 0 -10px 20px rgba(255,255,255,0.05);
    }

    .key-photo {
      position: relative;
      width: 100%;
      flex: 1;
      border-radius: 4px;
      overflow: hidden;
      opacity: 0.85;
      transition: opacity 0.2s;
    }
    .piano-key:hover .key-photo { opacity: 1; }
    .key-photo img { width: 100%; height: 100%; object-fit: cover; display: block; }

    .key-label {
      font-size: 0.75rem;
      color: #555;
      margin-top: 6px;
      font-family: monospace;
    }
    .black-key .key-label { color: #ccc; }

    .key-download {
      position: absolute; top: 4px; right: 4px;
      background: rgba(255,255,255,0.9);
      border: none; border-radius: 50%;
      width: 22px; height: 22px;
      cursor: pointer;
      opacity: 0; transition: opacity 0.3s;
      font-size: 0.7rem;
    }
    .piano-key:hover .key-download { opacity: 1; }
    .piano-key:hover .key-girar { opacity: 1; }

    @media (max-width: 768px) {
      .piano-key { width: 60px; height: 160px; }
      .piano-key.black-key { width: 40px; height: 100px; margin-left: -22px; margin-right: -22px; }
    }

    @media (prefers-reduced-motion: reduce) {
      .piano-key, .piano-key:hover { transition: none; transform: none; }
    }
  
    .key-girar {
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
export class PianoFotosModoComponent {
  @Input() images: GalleryImage[] = [];
  @Input() isMobile: boolean = false;
  @Input() rotaciones: Map<string, number> = new Map();
  @Output() imageClick = new EventEmitter<GalleryImage>();
  @Output() imageDownload = new EventEmitter<{ image: GalleryImage; event: Event }>();
  @Output() imageGirar = new EventEmitter<string>();

  private notas = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

  // Patrón blanco/negro: cada 7 teclas, las teclas negras son posiciones 1, 3, 6, 8, 10 (en escala completa)
  isBlackKey(i: number): boolean {
    const pos = i % 7;
    return pos === 1 || pos === 3;
  }

  noteName(i: number): string {
    return this.notas[i % this.notas.length];
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
