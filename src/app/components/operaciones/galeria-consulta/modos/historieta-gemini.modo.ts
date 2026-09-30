import { Component, EventEmitter, Input, Output, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GalleryImage } from '../galeria-modos.types';
import { obtenerEstiloRotacion } from '../galeria-modos-rotation.helpers';

interface VinetaImage extends GalleryImage {
  textoNarrativo: string;
  bocadillo: string;
  efecto: string | null;
}

/**
 * Modo Historieta con Gemini.
 *
 * Stub frontend: muestra los textos narrativos de cada foto. En producción,
 * esos textos los generará un servicio backend que llama a Gemini con todas
 * las fotos del día y devuelve una narrativa coherente. Mientras tanto este
 * modo funciona con textos de fallback.
 *
 * Cuando exista el endpoint, cambiar `cargarHistorieta()` para llamarlo.
 */
@Component({
  selector: 'app-historieta-gemini-modo',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="historieta-stage">
      <header class="historieta-portada">
        <div class="portada-banner">📖 La historia del día</div>
        <h2 class="portada-titulo">{{ galeriaNombre || 'Nuestras aventuras' }}</h2>
        <!-- La descripción viene del CKEditor con HTML -->
        <div *ngIf="galeriaDescripcion" class="portada-subtitulo" [innerHTML]="galeriaDescripcion"></div>
        <div class="portada-fecha">{{ galeriaFecha }}</div>
      </header>

      <div *ngIf="cargandoNarrativa" class="historieta-loading">
        <div class="spinner"></div>
        <p>Tejiendo la historia...</p>
      </div>

      <div *ngIf="!cargandoNarrativa" class="historieta-paginas">
        <article
          *ngFor="let image of vinetas; let i = index; trackBy: trackByGuid"
          class="historieta-vineta"
          [class.invertida]="i % 2 === 1"
          [attr.data-aos]="'fade-up'"
          [attr.data-aos-delay]="(i % 6) * 100"
        >
          <div class="vineta-numero">Capítulo {{ i + 1 }}</div>

          <div class="vineta-cuadro" (click)="imageClick.emit(image)">
            <div class="cuadro-imagen">
              <img [src]="image.url" [alt]="image.alt" [ngStyle]="obtenerEstiloRotacion(image.guid)"
              loading="lazy" />
              <div *ngIf="image.bocadillo" class="cuadro-bocadillo">
                {{ image.bocadillo }}
                <span class="bocadillo-cola"></span>
              </div>
              <div *ngIf="image.efecto" class="cuadro-efecto">{{ image.efecto }}!</div>
            </div>
            <button class="vineta-girar" (click)="onGirar(image.guid, $event)" title="Girar imagen">↻</button>
          <button *ngIf="puedeDescargar" class="vineta-download" (click)="onDownload(image, $event)" title="Descargar">⬇</button>
          </div>

          <div class="vineta-texto">
            <p>{{ image.textoNarrativo }}</p>
          </div>
        </article>

        <footer class="historieta-fin">
          <span class="fin-decoracion">✦ ✦ ✦</span>
          <p>Fin del capítulo</p>
          <span class="fin-decoracion">✦ ✦ ✦</span>
        </footer>
      </div>
    </div>
  `,
  styles: [`
    .historieta-stage {
      width: 100%;
      min-height: 700px;
      background:
        radial-gradient(ellipse at 30% 30%, rgba(180, 130, 80, 0.12) 0%, transparent 60%),
        linear-gradient(135deg, #f4ecd8 0%, #e8d8b5 100%);
      border-radius: 12px;
      padding: 3rem 2rem;
      filter: sepia(0.05);
      box-shadow: inset 0 0 80px rgba(120, 80, 30, 0.15);
    }

    .historieta-portada {
      text-align: center;
      padding: 2rem 1rem 3rem;
      border-bottom: 2px solid rgba(80, 40, 10, 0.3);
      margin-bottom: 3rem;
    }
    .portada-banner {
      display: inline-block;
      background: #5d3a1a;
      color: #f5e6c8;
      padding: 0.5rem 1.5rem;
      border-radius: 24px;
      font-size: 0.9rem;
      letter-spacing: 0.1em;
      margin-bottom: 1rem;
    }
    .portada-titulo {
      font-family: Georgia, serif;
      font-size: clamp(2rem, 5vw, 3rem);
      color: #3d2410;
      margin: 0 0 0.5rem;
      letter-spacing: 0.02em;
    }
    .portada-subtitulo {
      font-family: Georgia, serif;
      font-style: italic;
      color: #6b4520;
      font-size: 1.1rem;
      margin: 0 0 1rem;
    }
    .portada-subtitulo ::ng-deep p { margin: 0 0 0.3rem; }
    .portada-subtitulo ::ng-deep p:last-child { margin-bottom: 0; }
    .portada-subtitulo ::ng-deep ul,
    .portada-subtitulo ::ng-deep ol { margin: 0 0 0.3rem; padding-left: 1.1rem; text-align: left; }
    .portada-fecha {
      font-size: 0.85rem;
      letter-spacing: 0.2em;
      color: rgba(80, 40, 10, 0.7);
      text-transform: uppercase;
    }

    .historieta-loading {
      text-align: center;
      padding: 4rem 2rem;
      color: #5d3a1a;
    }
    .spinner {
      width: 40px; height: 40px;
      border: 3px solid rgba(120, 80, 30, 0.2);
      border-top-color: #5d3a1a;
      border-radius: 50%;
      margin: 0 auto 1rem;
      animation: spin 1s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    .historieta-paginas {
      max-width: 900px;
      margin: 0 auto;
    }

    .historieta-vineta {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2rem;
      align-items: center;
      margin-bottom: 4rem;
      padding-bottom: 3rem;
      border-bottom: 1px dashed rgba(80, 40, 10, 0.2);
    }
    .historieta-vineta:last-of-type { border-bottom: none; }
    .historieta-vineta.invertida { direction: rtl; }
    .historieta-vineta.invertida > * { direction: ltr; }

    @media (max-width: 768px) {
      .historieta-vineta {
        grid-template-columns: 1fr;
        gap: 1.25rem;
        margin-bottom: 3rem;
      }
      .historieta-vineta.invertida { direction: ltr; }
    }

    .vineta-numero {
      grid-column: 1 / -1;
      font-family: Georgia, serif;
      font-style: italic;
      color: #8b5a2b;
      font-size: 0.95rem;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      text-align: center;
      margin-bottom: 0.5rem;
    }

    .vineta-cuadro {
      position: relative;
      cursor: pointer;
      transition: transform 0.4s ease;
    }
    .vineta-cuadro:hover { transform: translateY(-4px); }

    .cuadro-imagen {
      position: relative;
      aspect-ratio: 4 / 3;
      background: #fff;
      padding: 8px 8px 30px;
      border: 1px solid #5d3a1a;
      box-shadow: 6px 6px 0 rgba(80, 40, 10, 0.2);
      overflow: hidden;
    }
    .cuadro-imagen img {
      width: 100%; height: calc(100% - 22px);
      object-fit: cover; display: block;
      filter: contrast(1.1) saturate(0.95);
    }

    .cuadro-bocadillo {
      position: absolute;
      top: 18px; right: 18px;
      background: #fff;
      border: 2px solid #2a1f10;
      border-radius: 18px;
      padding: 6px 14px;
      font-family: 'Comic Sans MS', cursive;
      font-size: 0.85rem;
      max-width: 60%;
      box-shadow: 2px 2px 0 #2a1f10;
    }
    .bocadillo-cola {
      position: absolute;
      bottom: -10px; left: 16px;
      width: 0; height: 0;
      border-left: 8px solid transparent;
      border-right: 8px solid transparent;
      border-top: 12px solid #fff;
    }
    .bocadillo-cola::before {
      content: '';
      position: absolute;
      top: -12px; left: -10px;
      width: 0; height: 0;
      border-left: 10px solid transparent;
      border-right: 10px solid transparent;
      border-top: 14px solid #2a1f10;
      z-index: -1;
    }

    .cuadro-efecto {
      position: absolute;
      bottom: 40px; left: 16px;
      background: #ffeb3b;
      border: 2px solid #2a1f10;
      padding: 4px 12px;
      font-family: 'Bangers', 'Impact', sans-serif;
      font-size: 1.3rem;
      transform: rotate(-8deg);
      letter-spacing: 0.05em;
      box-shadow: 2px 2px 0 #2a1f10;
    }

    .vineta-download {
      position: absolute; top: 14px; left: 14px;
      background: rgba(255,255,255,0.9);
      border: 1px solid #2a1f10;
      width: 32px; height: 32px;
      cursor: pointer;
      opacity: 0; transition: opacity 0.3s;
    }
    .vineta-cuadro:hover .vineta-download { opacity: 1; }
    .vineta-cuadro:hover .vineta-girar { opacity: 1; }

    .vineta-texto {
      font-family: Georgia, serif;
      color: #2a1f10;
      line-height: 1.7;
    }
    .vineta-texto p {
      font-size: 1.05rem;
      margin: 0;
      padding: 0 1rem;
      border-left: 3px solid #8b5a2b;
    }
    .historieta-vineta.invertida .vineta-texto p {
      border-left: none;
      border-right: 3px solid #8b5a2b;
    }

    .historieta-fin {
      text-align: center;
      padding: 2rem 1rem;
      color: #5d3a1a;
      font-family: Georgia, serif;
      font-style: italic;
    }
    .historieta-fin p {
      font-size: 1.4rem;
      margin: 0.5rem 0;
      letter-spacing: 0.08em;
    }
    .fin-decoracion {
      letter-spacing: 0.5em;
      opacity: 0.5;
    }

    @media (prefers-reduced-motion: reduce) {
      .vineta-cuadro, .vineta-cuadro:hover { transform: none; transition: none; }
      .spinner { animation: none; }
    }
  
    .vineta-girar {
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
export class HistorietaGeminiModoComponent implements OnChanges {
  @Input() images: GalleryImage[] = [];
  @Input() galeriaNombre: string = '';
  @Input() galeriaDescripcion: string = '';
  @Input() galeriaFecha: string = '';
  @Input() isMobile: boolean = false;
  @Input() rotaciones: Map<string, number> = new Map();
  /** Si el usuario puede descargar las fotos. Sin el permiso, el botón de descarga no se muestra. */
  @Input() puedeDescargar: boolean = true;
  @Output() imageClick = new EventEmitter<GalleryImage>();
  @Output() imageDownload = new EventEmitter<{ image: GalleryImage; event: Event }>();
  @Output() imageGirar = new EventEmitter<string>();

  vinetas: VinetaImage[] = [];
  cargandoNarrativa = false;

  // Plantillas de fallback mientras se conecta el backend Gemini
  private narrativasFallback = [
    'El día comenzó con una sonrisa que prometía mil aventuras por descubrir.',
    'Entre risas y miradas curiosas, el aula se llenó de momentos que merecen ser recordados.',
    'Cada gesto, cada paso, cada palabra construían una historia tejida con cariño.',
    'Los pequeños descubrimientos del día se fueron acumulando como tesoros invisibles.',
    'La luz de la mañana se mezclaba con la imaginación, creando un escenario perfecto.',
    'Y entonces ocurrió: ese momento que ninguna cámara podría capturar del todo.',
    'El tiempo se detuvo apenas un instante, lo suficiente para guardar el recuerdo.',
    'Las amistades se fortalecieron con cada juego compartido y cada secreto contado.',
    'Sonrisas espontáneas iluminaron el espacio, transformando lo ordinario en mágico.',
    'Una nueva lección aprendida, no de un libro, sino de la experiencia compartida.',
    'Los colores del día parecían más brillantes cuando se vivían en compañía.',
    'Pequeños gestos cargados de significado marcaban el ritmo de la jornada.',
  ];
  private bocadillos = [
    '¡Mira esto!', '¿Qué es esto?', '¡Wow!', '¡Yo puedo!', '¡Mira mami!',
    '¡Qué chévere!', '¡Vamos!', '', '', '', '',
  ];
  private efectos = ['¡SPLASH', '¡ZAS', '', '', '', '', '¡POOF', ''];

  ngOnChanges(): void {
    this.cargarHistorieta();
  }

  /**
   * Stub: en producción esto llamará al backend que invoca a Gemini con todas las fotos.
   * Por ahora usa textos de fallback determinísticos por foto.
   */
  private cargarHistorieta(): void {
    this.cargandoNarrativa = true;

    // TODO: reemplazar por llamada real al servicio cuando exista el backend.
    // Ejemplo del shape esperado de respuesta:
    // this.historietaService.generar(this.images, this.galeriaNombre, this.galeriaDescripcion)
    //   .subscribe(narrativas => { this.aplicarNarrativas(narrativas); });

    setTimeout(() => {
      this.vinetas = this.images.map((img, i) => {
        const h = this.hash(img.guid);
        return {
          ...img,
          textoNarrativo: this.narrativasFallback[h % this.narrativasFallback.length],
          bocadillo: this.bocadillos[h % this.bocadillos.length],
          efecto: this.efectos[h % this.efectos.length] || null,
        };
      });
      this.cargandoNarrativa = false;
    }, 600);
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
