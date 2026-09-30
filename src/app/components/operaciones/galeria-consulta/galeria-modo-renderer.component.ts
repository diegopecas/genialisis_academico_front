import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GalleryImage, GaleriaModoConfig } from './galeria-modos.types';


// Imports de los 30 modos
import { MasonryClasicoModoComponent } from './modos/masonry-clasico.modo';
import { PolaroidModoComponent } from './modos/polaroid.modo';
import { MosaicoPinterestModoComponent } from './modos/mosaico-pinterest.modo';
import { TiraPeliculaModoComponent } from './modos/tira-pelicula.modo';
import { Cards3dFlipModoComponent } from './modos/cards-3d-flip.modo';
import { PostalViajeModoComponent } from './modos/postal-viaje.modo';
import { StorybookModoComponent } from './modos/storybook.modo';
import { ScrapbookModoComponent } from './modos/scrapbook.modo';
import { PeriodicoVintageModoComponent } from './modos/periodico-vintage.modo';
import { CuadernoEscolarModoComponent } from './modos/cuaderno-escolar.modo';
import { BurbujasModoComponent } from './modos/burbujas.modo';
import { ConfettiModoComponent } from './modos/confetti.modo';
import { OrigamiModoComponent } from './modos/origami.modo';
import { LluviaPetalosModoComponent } from './modos/lluvia-petalos.modo';
import { GlobosModoComponent } from './modos/globos.modo';
import { GaleriaSubmarinaModoComponent } from './modos/galeria-submarina.modo';
import { CieloEstrelladoModoComponent } from './modos/cielo-estrellado.modo';
import { CaleidoscopioModoComponent } from './modos/caleidoscopio.modo';
import { LinternaMagicaModoComponent } from './modos/linterna-magica.modo';
import { PianoFotosModoComponent } from './modos/piano-fotos.modo';
import { VitralGeometricoModoComponent } from './modos/vitral-geometrico.modo';
import { TablonCorchoModoComponent } from './modos/tablon-corcho.modo';
import { ComicClasicoModoComponent } from './modos/comic-clasico.modo';
import { GaleriaMuseoModoComponent } from './modos/galeria-museo.modo';
import { RelojDiaModoComponent } from './modos/reloj-dia.modo';
import { PizarraTizaModoComponent } from './modos/pizarra-tiza.modo';
import { CardsInstagramModoComponent } from './modos/cards-instagram.modo';
import { MapaTesoroModoComponent } from './modos/mapa-tesoro.modo';
import { RompecabezasModoComponent } from './modos/rompecabezas.modo';
import { HistorietaGeminiModoComponent } from './modos/historieta-gemini.modo';
import { GaleriaModosService } from '../../../services/galeria-modos.service';

/**
 * Componente que decide cuál de los 30 modos renderizar según el día.
 * Recibe ambas listas de imágenes (paginada y completa) y emite eventos
 * de clic hacia el componente padre para abrir el lightbox.
 */
@Component({
  selector: 'app-galeria-modo-renderer',
  standalone: true,
  imports: [
    CommonModule,
    MasonryClasicoModoComponent,
    PolaroidModoComponent,
    MosaicoPinterestModoComponent,
    TiraPeliculaModoComponent,
    Cards3dFlipModoComponent,
    PostalViajeModoComponent,
    StorybookModoComponent,
    ScrapbookModoComponent,
    PeriodicoVintageModoComponent,
    CuadernoEscolarModoComponent,
    BurbujasModoComponent,
    ConfettiModoComponent,
    OrigamiModoComponent,
    LluviaPetalosModoComponent,
    GlobosModoComponent,
    GaleriaSubmarinaModoComponent,
    CieloEstrelladoModoComponent,
    CaleidoscopioModoComponent,
    LinternaMagicaModoComponent,
    PianoFotosModoComponent,
    VitralGeometricoModoComponent,
    TablonCorchoModoComponent,
    ComicClasicoModoComponent,
    GaleriaMuseoModoComponent,
    RelojDiaModoComponent,
    PizarraTizaModoComponent,
    CardsInstagramModoComponent,
    MapaTesoroModoComponent,
    RompecabezasModoComponent,
    HistorietaGeminiModoComponent,
  ],
  templateUrl: './galeria-modo-renderer.component.html',
  styleUrl: './galeria-modo-renderer.component.scss',
})
export class GaleriaModoRendererComponent implements OnChanges {

  /** Imágenes a mostrar (paginadas, vienen del scroll infinito del padre). */
  @Input() displayedImages: GalleryImage[] = [];

  /** Todas las imágenes del tab actual (sin paginar). Usadas por modos especiales. */
  @Input() allImages: GalleryImage[] = [];

  /** Galería seleccionada (para descripciones, fechas, etc.). */
  @Input() galeriaNombre: string = '';
  @Input() galeriaDescripcion: string = '';
  @Input() galeriaFecha: string = '';

  /** Iniciales de la institución (ej: "LL" para Liceo Lumen). Usado por modos como postal-viaje. */
  @Input() iniciales: string = '';

  /** Map de rotaciones por guid (ángulos en grados: 0, 90, 180, 270). */
  @Input() rotaciones = new Map<string, number>();

  /** Si está en mobile, los modos pueden ajustar layout. */
  @Input() isMobile: boolean = false;

  /** El padre puede forzar un modo para testing. Si null, se usa el del día. */
  @Input() modoForzado: number | null = null;

  /**
   * Si el usuario tiene permiso de descargar. Se pasa a cada modo para que
   * esconda su botón de descarga cuando no lo tiene.
   */
  @Input() puedeDescargar: boolean = false;

  /** Emite cuando el papá hace clic en una imagen (abrir lightbox). */
  @Output() imageClick = new EventEmitter<GalleryImage>();

  /** Emite cuando el papá descarga una imagen. */
  @Output() imageDownload = new EventEmitter<{ image: GalleryImage; event: Event }>();

  /** Emite cuando el papá pide girar una imagen (envía el guid). */
  @Output() imageGirar = new EventEmitter<string>();

  /** Emite el modo activo para que el padre sepa si debe desactivar scroll infinito. */
  @Output() modoCambiado = new EventEmitter<GaleriaModoConfig>();

  public modoActivo: GaleriaModoConfig | null = null;

  constructor(private modosService: GaleriaModosService) {}

  ngOnChanges(changes: SimpleChanges): void {
    // Recalcular modo cuando cambia modoForzado o en init
    if (changes['modoForzado'] || !this.modoActivo) {
      this.calcularModo();
    }
  }

  private calcularModo(): void {
    const modoDia = this.modosService.obtenerModoDelDia();

    if (this.modoForzado !== null) {
      // Buscar el modo forzado en el catálogo
      const forzado = this.encontrarModoPorId(this.modoForzado);
      this.modoActivo = forzado || modoDia;
    } else {
      this.modoActivo = modoDia;
    }

    this.modoCambiado.emit(this.modoActivo);
  }

  private encontrarModoPorId(id: number): GaleriaModoConfig | null {
    const modoDia = this.modosService.obtenerModoDelDia();
    if (modoDia.id === id) return modoDia;
    // Buscar iterando todos los días del año (workaround simple para testing)
    const hoy = new Date();
    for (let i = 0; i < 366; i++) {
      const fecha = new Date(hoy.getFullYear(), 0, i + 1);
      const modo = this.modosService.obtenerModoDelDia(fecha);
      if (modo.id === id) return modo;
    }
    return null;
  }

  onImageClick(image: GalleryImage): void {
    this.imageClick.emit(image);
  }

  onImageDownload(payload: { image: GalleryImage; event: Event }): void {
    if (!this.puedeDescargar) {
      return;
    }
    this.imageDownload.emit(payload);
  }

  onImageGirar(guid: string): void {
    this.imageGirar.emit(guid);
  }

  /**
   * Imágenes a pasar al modo activo.
   * Si el modo requiere todas, le pasamos allImages; si no, las paginadas.
   */
  get imagenesParaModo(): GalleryImage[] {
    if (!this.modoActivo) return this.displayedImages;
    return this.modoActivo.requiereTodasLasImagenes
      ? this.allImages
      : this.displayedImages;
  }
}
