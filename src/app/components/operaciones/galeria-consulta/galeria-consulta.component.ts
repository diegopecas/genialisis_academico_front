import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import Swal from 'sweetalert2';
import { HeaderComponent } from '../../../common/header/header.component';
import { AuthService } from '../../../services/auth.service';
import { GaleriasService } from '../../../services/galerias.service';
import { GaleriaImagenesService } from '../../../services/galeria-imagenes.service';
import { InstitucionConfigService } from '../../../services/institucion-config.service';
import { PermisosService } from '../../../services/permisos.service';
import { GaleriaModoRendererComponent } from './galeria-modo-renderer.component';
import { GaleriaModoConfig, MODOS_CATALOGO } from './galeria-modos.types';

declare var AOS: any;

// =========================================
// Interfaces
// =========================================

interface GalleryImage {
  id: string;
  guid: string;
  url: string;
  urlMedium: string;
  originalUrl: string;
  alt: string;
  loaded?: boolean;
}

interface Subgaleria {
  id: string;
  nombre: string;
  orden: number;
  images: GalleryImage[];
}

interface Galeria {
  id: string;
  nombre: string;
  descripcion: string;
  thumbnail: string;
  primera_imagen_guid: string | null;
  fecha: string;
  es_publica: number;
  orden: number;
  images: GalleryImage[];
  subgalerias: Subgaleria[];
}

interface Tab {
  id: string;
  nombre: string;
  isGenerales: boolean;
  subgaleriaId?: string;
}

/**
 * Galería de consulta del portal institucional. Es una copia de la galería
 * del portal de padres, con sus 30 modos visuales: el usuario ve las
 * galerías públicas, las de los grupos donde es docente y, si también es
 * acudiente, las de los grupos de sus estudiantes.
 *
 * Diferencias con la de padres:
 * - No muestra la invitación al Instagram del jardín, que es para los papás.
 * - La descarga exige el permiso operaciones.galeria.descargar.
 * - Recibe ?id= para abrir una galería directamente (lo usa el enlace
 *   "Ver galería" de la agenda de estudiantes).
 */
@Component({
  selector: 'app-galeria-consulta',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, GaleriaModoRendererComponent],
  templateUrl: './galeria-consulta.component.html',
  styleUrl: './galeria-consulta.component.scss',
})
export class GaleriaConsultaComponent implements OnInit, OnDestroy {
  /** Permiso para descargar imágenes en el institucional. */
  private readonly PERMISO_DESCARGAR = 'operaciones.galeria.descargar';

  /** Galería pedida por la URL (?id=). Se abre en cuanto carga la lista. */
  private idGaleriaSolicitada: string | null = null;
  private querySub: Subscription | null = null;

  // Usuario
  private idPersona: string | null = null;
  private idDocente: string = '0';

  // Galerías
  public galerias: Galeria[] = [];
  public galeriasFiltradas: Galeria[] = [];
  public selectedGaleria: Galeria | null = null;

  // Filtros
  public filtroTexto = '';
  public filtroFecha = '';

  // Subgalerías / Tabs
  public tabs: Tab[] = [];
  public selectedTab: Tab | null = null;
  public hasSubgalerias = false;

  // Imágenes de la galería/subgalería seleccionada
  public allImages: GalleryImage[] = [];
  public displayedImages: GalleryImage[] = [];
  public selectedImage: GalleryImage | null = null;

  // Estados
  public isMobile = false;
  public isLoading = false;
  public isLoadingGalerias = true;
  public errorMessage: string | null = null;
  
  // Flag para evitar llamadas duplicadas durante la carga inicial
  private isInitialLoad = false;

  // Paginación
  public currentIndex = 0;
  public imagesPerLoad = 18;

  // Modo del día (sistema rotativo de 30 modos visuales)
  public modoActivo: GaleriaModoConfig | null = null;
  public scrollInfinitoActivo = true;

  // Fondo del jardin. La plantilla ya tenia el <div class="background-image">
  // pero nadie le daba una imagen ni existian sus estilos, asi que la
  // galeria salia sin el fondo del jardin. Mismo mecanismo del menu y del
  // login: se intenta el del tenant y si no existe se cae al generico.
  public fondoUrl: string = '';

  // Iniciales de la institución (ej: "LL" para "Liceo Lumen"). Calculado del InstitucionConfigService.
  public iniciales: string = '';

  // Rotaciones visuales de las imágenes (solo en memoria, se resetean al cambiar tab/galería).
  // Map<guid, ángulo en grados> — ángulos válidos: 0, 90, 180, 270.
  public rotaciones = new Map<string, number>();

  // Selector de modos para debug. Visible en localhost o si el usuario tiene el flag dev.
  // null = usa el modo del día; número 1-30 = fuerza ese modo.
  public modoForzado: number | null = null;
  public debugModosVisible = false;
  public catalogoModos = MODOS_CATALOGO;

  // Título del módulo
  public titulo = 'Galería';

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService,
    private galeriasService: GaleriasService,
    private galeriaImagenesService: GaleriaImagenesService,
    private institucionConfigService: InstitucionConfigService,
    public permisosService: PermisosService
  ) {
    this.checkScreenSize();
  }

  ngOnInit(): void {
    this.imagesPerLoad = this.isMobile ? 12 : 18;

    this.cargarFondoTenant();

    // Calcular iniciales de la institución (ej: "Liceo Lumen" -> "LL")
    this.iniciales = this.calcularIniciales(this.institucionConfigService.getNombreInstitucion());

    // Activar selector de modos en desarrollo (localhost) o con flag manual.
    // Para activarlo en producción: localStorage.setItem('lumen_dev', '1') desde la consola.
    const host = window.location.hostname;
    const esLocalhost =
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host.startsWith('192.168.') ||
      host.endsWith('.local');
    const tieneFlagDev = localStorage.getItem('lumen_dev') === '1';
    this.debugModosVisible = esLocalhost || tieneFlagDev;

    // Obtener usuario y cargar galerías. El token efímero de imagenes debe
    // estar listo antes: las URLs de <img> se arman de forma sincrona
    // (transformImages y getThumbnailUrl) y sin token darian 401.
    this.galeriaImagenesService.inicializarTokenImagenes().subscribe({
      next: () => this.loadUserAndGalerias(),
      error: (error) => {
        console.error('Error al obtener el token de imágenes:', error);
        this.loadUserAndGalerias();
      },
    });

    this.initAOS();

    // Galería pedida por la URL. Si llega otra mientras la pantalla está
    // abierta (otro enlace de la agenda), se abre esa.
    this.querySub = this.route.queryParamMap.subscribe((params) => {
      this.idGaleriaSolicitada = params.get('id');
      if (this.idGaleriaSolicitada && this.galerias.length > 0) {
        this.abrirGaleriaSolicitada();
      }
    });
  }

  /**
   * Carga el fondo del jardin. Si la institucion no tiene su propia imagen
   * se usa el fondo generico, igual que hace el menu: se prueba cargando la
   * imagen y se decide en el onload/onerror.
   */
  private cargarFondoTenant(): void {
    const urlTenant = this.institucionConfigService.getFondoUrl();
    const urlFallback = this.institucionConfigService.getFondoFallbackUrl();

    const img = new Image();
    img.onload = () => {
      this.fondoUrl = urlTenant;
    };
    img.onerror = () => {
      console.warn(`⚠️ Fondo del tenant no encontrado, usando fallback: ${urlFallback}`);
      this.fondoUrl = urlFallback;
    };
    img.src = urlTenant;
  }

  /**
   * Calcula las iniciales del nombre de la institución.
   * "Liceo Lumen" -> "LL", "Jardín Infantil Lumen" -> "JIL", "Lumen" -> "LU".
   * Si solo hay una palabra, toma las primeras dos letras.
   * Limita a 4 letras para que quepan en el sello del postal.
   */
  private calcularIniciales(nombre: string): string {
    if (!nombre) return '';
    const palabras = nombre.trim().split(/\s+/).filter(p => p.length > 0);
    if (palabras.length === 0) return '';
    if (palabras.length === 1) {
      return palabras[0].substring(0, 2).toUpperCase();
    }
    return palabras
      .map(p => p.charAt(0).toUpperCase())
      .join('')
      .substring(0, 4);
  }

  ngOnDestroy(): void {
    document.body.style.overflow = 'auto';
    if (this.querySub) {
      this.querySub.unsubscribe();
    }
  }

  // =========================================
  // Listeners
  // =========================================

  @HostListener('window:resize', ['$event'])
  onResize(): void {
    this.checkScreenSize();
    this.imagesPerLoad = this.isMobile ? 12 : 18;
  }

  @HostListener('window:scroll', ['$event'])
  onScroll(): void {
    // No cargar más si estamos en carga inicial o ya cargando
    if (this.isInitialLoad || this.isLoading) {
      return;
    }

    // Si el modo activo requiere todas las imágenes, no aplica scroll infinito
    if (!this.scrollInfinitoActivo) {
      return;
    }

    const scrollPosition = window.innerHeight + window.scrollY;
    const pageHeight = document.documentElement.scrollHeight;

    if (scrollPosition >= pageHeight - 500) {
      this.loadMoreImages();
    }
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyboard(event: KeyboardEvent): void {
    if (!this.selectedImage) return;

    switch (event.key) {
      case 'Escape':
        this.closeLightbox();
        break;
      case 'ArrowLeft':
        this.previousImage();
        break;
      case 'ArrowRight':
        this.nextImage();
        break;
    }
  }

  // =========================================
  // Inicialización
  // =========================================

  private checkScreenSize(): void {
    this.isMobile = window.innerWidth <= 768;
  }

  private initAOS(): void {
    if (typeof AOS !== 'undefined') {
      AOS.init({
        duration: 800,
        easing: 'ease-in-out',
        once: true,
        offset: 100,
      });
    }
  }

  private refreshAOS(): void {
    if (typeof AOS !== 'undefined') {
      setTimeout(() => AOS.refresh(), 100);
    }
  }

  // =========================================
  // Carga de Usuario y Galerías
  // =========================================

  private loadUserAndGalerias(): void {
    const usuario = this.authService.getUsuarioActual();

    if (!usuario?.id_persona) {
      console.error('No hay usuario logueado');
      this.router.navigate(['/login']);
      return;
    }

    this.idPersona = usuario.id_persona;
    this.idDocente = usuario.id_docente ? usuario.id_docente : '0';
    this.loadGalerias();
  }

  private loadGalerias(): void {
    if (!this.idPersona) return;

    this.galeriasService.obtenerPorUsuario(this.idPersona, this.idDocente).subscribe({
      next: (response: any) => {
        const body = response.body as any[];

        // Mapear y ordenar galerías
        this.galerias = body
          .map((g) => ({
            ...g,
            primera_imagen_guid: g.primera_imagen_guid || null,
            images: [],
            subgalerias: [],
          }))
          .sort((a: Galeria, b: Galeria) => {
            const fechaDiff = this.parseFechaLocal(b.fecha).getTime() - this.parseFechaLocal(a.fecha).getTime();
            if (fechaDiff !== 0) return fechaDiff;
            return a.orden - b.orden;
          });

        this.galeriasFiltradas = [...this.galerias];
        this.isLoadingGalerias = false;

        // Abrir la galería pedida por la URL o, si no hay, la primera
        if (!this.abrirGaleriaSolicitada() && this.galeriasFiltradas.length > 0) {
          this.selectGaleria(this.galeriasFiltradas[0]);
        }
      },
      error: (error) => {
        console.error('Error cargando galerías:', error);
        this.errorMessage = 'Error al cargar las galerías';
        this.isLoadingGalerias = false;
      },
    });
  }

  /**
   * Abre la galería que llegó en ?id=. Devuelve false si no hay id o si la
   * galería no está entre las que el usuario puede ver.
   */
  private abrirGaleriaSolicitada(): boolean {
    if (!this.idGaleriaSolicitada) return false;
    const galeria = this.galerias.find((g) => g.id === this.idGaleriaSolicitada);
    if (!galeria) return false;
    this.selectGaleria(galeria);
    return true;
  }

  // =========================================
  // Filtro de Galerías
  // =========================================

  aplicarFiltros(): void {
    const texto = this.filtroTexto.toLowerCase().trim();
    const fecha = this.filtroFecha;

    this.galeriasFiltradas = this.galerias.filter((g) => {
      // Filtro por texto: busca en nombre + descripcion concatenados. La
      // descripción trae HTML del editor, así que se compara solo el texto.
      const cumpleTexto = !texto || 
        `${g.nombre} ${this.textoPlano(g.descripcion)}`.toLowerCase().includes(texto);

      // Filtro por fecha (mes y año)
      let cumpleFecha = true;
      if (fecha) {
        const [anioFiltro, mesFiltro] = fecha.split('-').map(Number);
        const fechaGaleria = this.parseFechaLocal(g.fecha);
        cumpleFecha = fechaGaleria.getFullYear() === anioFiltro && 
                      (fechaGaleria.getMonth() + 1) === mesFiltro;
      }

      return cumpleTexto && cumpleFecha;
    });
  }

  limpiarFiltros(): void {
    this.filtroTexto = '';
    this.filtroFecha = '';
    this.galeriasFiltradas = [...this.galerias];
  }

  // =========================================
  // Transformar URLs a URLs protegidas con tamaños
  // =========================================

  private transformImages(images: any[]): GalleryImage[] {
    if (!images) return [];

    return images.map((img) => ({
      id: img.id,
      guid: img.guid,
      url: this.galeriaImagenesService.obtenerUrlImagen(img.guid, 'thumb'),
      urlMedium: this.galeriaImagenesService.obtenerUrlImagen(img.guid, 'medium'),
      originalUrl: img.url,
      alt: img.alt || '',
      loaded: false,
    }));
  }

  private transformSubgalerias(subgalerias: any[]): Subgaleria[] {
    if (!subgalerias) return [];

    return subgalerias.map((sub) => ({
      ...sub,
      images: this.transformImages(sub.images),
    }));
  }

  // =========================================
  // Selección de Galería
  // =========================================

  selectGaleria(galeria: Galeria): void {
    if (
      this.selectedGaleria?.id === galeria.id &&
      this.selectedGaleria.images.length > 0
    ) {
      return;
    }

    this.selectedGaleria = galeria;
    this.isLoading = true;
    this.isInitialLoad = true;
    this.allImages = [];
    this.displayedImages = [];
    this.tabs = [];
    this.selectedTab = null;
    this.resetearRotaciones();

    // Cargar galería completa desde el backend
    this.galeriasService
      .obtenerGaleriaCompletaUsuario(galeria.id, this.idPersona!, this.idDocente)
      .subscribe({
        next: (response: any) => {
          const galeriaCompleta = response.body;

          // Actualizar galería seleccionada con datos completos y URLs transformadas
          this.selectedGaleria = {
            ...this.selectedGaleria!,
            images: this.transformImages(galeriaCompleta.images || []),
            subgalerias: this.transformSubgalerias(
              galeriaCompleta.subgalerias || []
            ),
          };

          this.hasSubgalerias = this.selectedGaleria.subgalerias.length > 0;

          // Construir tabs
          this.buildTabs();

          // Seleccionar primer tab o cargar directamente
          if (this.tabs.length > 0) {
            this.selectTab(this.tabs[0]);
          } else {
            this.loadImagesFromGaleria();
          }

          this.isLoading = false;
          this.scrollToGallery();
        },
        error: (error) => {
          console.error('Error cargando galería completa:', error);
          this.isLoading = false;
          this.isInitialLoad = false;
          this.errorMessage = 'Error al cargar la galería';
        },
      });
  }

  private buildTabs(): void {
    this.tabs = [];

    if (!this.selectedGaleria || !this.hasSubgalerias) return;

    // Tab "Generales" solo si hay imágenes generales
    if (this.selectedGaleria.images && this.selectedGaleria.images.length > 0) {
      this.tabs.push({
        id: 'generales',
        nombre: 'Generales',
        isGenerales: true,
      });
    }

    // Tabs de subgalerías
    this.selectedGaleria.subgalerias.forEach((sub) => {
      this.tabs.push({
        id: `sub-${sub.id}`,
        nombre: sub.nombre,
        isGenerales: false,
        subgaleriaId: sub.id,
      });
    });
  }

  // =========================================
  // Selección de Tab (Subgalería)
  // =========================================

  selectTab(tab: Tab): void {
    if (this.selectedTab?.id === tab.id) {
      return;
    }

    this.selectedTab = tab;
    this.isInitialLoad = true;
    this.resetearRotaciones();

    if (tab.isGenerales) {
      this.loadImagesFromGaleria();
    } else {
      const subgaleria = this.selectedGaleria?.subgalerias.find(
        (s) => s.id === tab.subgaleriaId
      );
      if (subgaleria) {
        this.loadImagesFromSubgaleria(subgaleria);
      }
    }
  }

  // =========================================
  // Carga de Imágenes
  // =========================================

  private loadImagesFromGaleria(): void {
    this.allImages = this.selectedGaleria?.images || [];
    this.resetAndLoadImages();
  }

  private loadImagesFromSubgaleria(subgaleria: Subgaleria): void {
    this.allImages = subgaleria.images || [];
    this.resetAndLoadImages();
  }

  private resetAndLoadImages(): void {
    this.displayedImages = [];
    this.currentIndex = 0;

    // Si el modo activo requiere todas las imágenes, las cargamos todas; si no, paginamos
    if (!this.scrollInfinitoActivo) {
      this.displayedImages = [...this.allImages];
      this.currentIndex = this.allImages.length;
    } else {
      const endIndex = Math.min(this.imagesPerLoad, this.allImages.length);
      this.displayedImages = this.allImages.slice(0, endIndex);
      this.currentIndex = endIndex;
    }

    // Desbloquear scroll listener después de la carga inicial
    setTimeout(() => {
      this.isInitialLoad = false;
      this.refreshAOS();
    }, 100);
  }

  private loadMoreImages(): void {
    if (this.isLoading || this.isInitialLoad || this.currentIndex >= this.allImages.length) {
      return;
    }

    this.isLoading = true;

    const nextBatch = this.isMobile ? 6 : 9;
    const endIndex = Math.min(
      this.currentIndex + nextBatch,
      this.allImages.length
    );

    const newImages = this.allImages.slice(this.currentIndex, endIndex);

    setTimeout(() => {
      this.displayedImages = [...this.displayedImages, ...newImages];
      this.currentIndex = endIndex;
      this.isLoading = false;
      this.refreshAOS();
    }, 300);
  }

  private scrollToGallery(): void {
    const heroSection = document.querySelector('.hero-section');
    if (heroSection) {
      setTimeout(() => {
        heroSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }

  onImageLoad(image: GalleryImage): void {
    image.loaded = true;
  }

  // =========================================
  // Lightbox con Progressive Loading
  // =========================================

  public lightboxMediumLoaded = false;

  openLightbox(image: GalleryImage): void {
    this.selectedImage = image;
    this.lightboxMediumLoaded = false;
    document.body.style.overflow = 'hidden';
    
    this.preloadMediumImage(image);
  }

  private preloadMediumImage(image: GalleryImage): void {
    const img = new Image();
    img.onload = () => {
      if (this.selectedImage?.guid === image.guid) {
        this.lightboxMediumLoaded = true;
      }
    };
    img.src = image.urlMedium;
  }

  closeLightbox(): void {
    this.selectedImage = null;
    this.lightboxMediumLoaded = false;
    document.body.style.overflow = 'auto';
  }

  previousImage(): void {
    if (!this.selectedImage) return;

    const currentIndex = this.displayedImages.findIndex(
      (img) => img.guid === this.selectedImage?.guid
    );
    if (currentIndex > 0) {
      this.lightboxMediumLoaded = false;
      this.selectedImage = this.displayedImages[currentIndex - 1];
      this.preloadMediumImage(this.selectedImage);
    }
  }

  nextImage(): void {
    if (!this.selectedImage) return;

    const currentIndex = this.displayedImages.findIndex(
      (img) => img.guid === this.selectedImage?.guid
    );
    if (currentIndex < this.displayedImages.length - 1) {
      this.lightboxMediumLoaded = false;
      this.selectedImage = this.displayedImages[currentIndex + 1];
      this.preloadMediumImage(this.selectedImage);
    }
  }

  getLightboxImageUrl(): string {
    if (!this.selectedImage) return '';
    return this.lightboxMediumLoaded 
      ? this.selectedImage.urlMedium 
      : this.selectedImage.url;
  }

  // =========================================
  // Descarga de Imágenes (calidad original)
  // =========================================

  /** El usuario puede descargar imágenes de la galería. */
  puedeDescargar(): boolean {
    return this.permisosService.tienePermiso(this.PERMISO_DESCARGAR);
  }

  downloadImage(image: GalleryImage, event: Event): void {
    event.stopPropagation();

    // Los modos ya esconden su botón sin el permiso; se valida también aquí
    // para que ningún camino descargue sin él.
    if (!this.puedeDescargar()) {
      Swal.fire('Sin permiso', 'No tienes permiso para descargar imágenes de la galería', 'info');
      return;
    }

    this.galeriaImagenesService.descargarImagen(image.guid).subscribe({
      next: (blob: Blob) => {
        const urlParts = image.originalUrl.split('/');
        const filename =
          urlParts[urlParts.length - 1] || `imagen_${image.id}.jpg`;

        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        console.error('Error descargando imagen:', error);
      },
    });
  }

  // =========================================
  // Utilidades
  // =========================================

  trackByGaleriaId(index: number, galeria: Galeria): string {
    return galeria.id;
  }

  trackByImageId(index: number, image: GalleryImage): string {
    return image.guid;
  }

  trackByTabId(index: number, tab: Tab): string {
    return tab.id;
  }

  /** Texto sin etiquetas de una descripción con HTML. */
  private textoPlano(html: string): string {
    if (!html) return '';
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  }

  /**
   * Parsea una fecha YYYY-MM-DD en hora local (evita desfase UTC)
   */
  private parseFechaLocal(fecha: string): Date {
    if (!fecha) return new Date();
    const [year, month, day] = fecha.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  formatDate(fecha: string): string {
    if (!fecha) return '';
    const date = this.parseFechaLocal(fecha);
    return date.toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  /**
   * Obtiene la URL del thumbnail de una galería.
   * Prioridad: thumbnail > primera_imagen_guid > imagen por defecto
   */
  getThumbnailUrl(galeria: Galeria): string {
    const thumbnail = galeria.thumbnail;

    // Si tiene thumbnail definido, usarlo
    if (thumbnail) {
      // URL directa (assets o http)
      if (thumbnail.startsWith('assets/') || thumbnail.startsWith('http')) {
        return thumbnail;
      }
      // GUID: construir URL protegida
      if (thumbnail.includes('-') && thumbnail.length >= 32) {
        return this.galeriaImagenesService.obtenerUrlImagen(thumbnail, 'thumb');
      }
      // Fallback: ruta directa
      return thumbnail;
    }

    // Sin thumbnail: usar primera imagen de la galería si existe
    if (galeria.primera_imagen_guid) {
      return this.galeriaImagenesService.obtenerUrlImagen(galeria.primera_imagen_guid, 'thumb');
    }

    // Sin thumbnail ni imágenes: imagen por defecto
    return '/assets/images/galeria-default.png';
  }

  getTabImageCount(tab: Tab): number {
    if (!this.selectedGaleria) return 0;

    if (tab.isGenerales) {
      return this.selectedGaleria.images?.length || 0;
    }

    const subgaleria = this.selectedGaleria.subgalerias.find(
      (s) => s.id === tab.subgaleriaId
    );
    return subgaleria?.images?.length || 0;
  }

  getTotalImageCount(galeria: Galeria): number {
    let total = galeria.images?.length || 0;
    if (galeria.subgalerias) {
      galeria.subgalerias.forEach((sub) => {
        total += sub.images?.length || 0;
      });
    }
    return total;
  }

  // =========================================
  // Handlers del Renderer de Modos
  // =========================================

  /**
   * El renderer emite el modo del día. Aquí actualizamos el flag de scroll infinito
   * y, si cambió a un modo que requiere todas las imágenes, recargamos.
   */
  onModoCambiado(modo: GaleriaModoConfig): void {
    const requeriaTodasAntes = !this.scrollInfinitoActivo;
    const requiereTodasAhora = modo.requiereTodasLasImagenes;

    this.modoActivo = modo;
    this.scrollInfinitoActivo = !requiereTodasAhora;

    // Si cambió el requerimiento y ya hay imágenes cargadas, ajustar el displayed
    if (requeriaTodasAntes !== requiereTodasAhora && this.allImages.length > 0) {
      if (requiereTodasAhora) {
        this.displayedImages = [...this.allImages];
        this.currentIndex = this.allImages.length;
      }
      // Si pasó a paginado y ya estaba todo cargado, lo dejamos así (no perdemos nada).
      this.refreshAOS();
    }
  }

  /**
   * El renderer emite cuando el papá hace clic en una imagen. Reusamos el lightbox existente.
   */
  onImageClickFromMode(image: GalleryImage): void {
    this.openLightbox(image);
  }

  /**
   * El renderer emite cuando el papá descarga. Reusamos el método existente.
   */
  onImageDownloadFromMode(payload: { image: GalleryImage; event: Event }): void {
    this.downloadImage(payload.image, payload.event);
  }

  /**
   * El renderer emite cuando el papá pide girar una imagen desde el grid.
   */
  onImageGirarFromMode(guid: string): void {
    this.girarImagen(guid);
  }

  // =========================================
  // Rotación visual de imágenes
  // =========================================

  /**
   * Gira una imagen 90° (suma al ángulo actual). Solo visual, en memoria.
   */
  girarImagen(guid: string): void {
    const actual = this.rotaciones.get(guid) || 0;
    const nuevo = (actual + 90) % 360;
    // Inmutabilidad para que Angular detecte el cambio en los hijos
    const nuevoMap = new Map(this.rotaciones);
    if (nuevo === 0) {
      nuevoMap.delete(guid);
    } else {
      nuevoMap.set(guid, nuevo);
    }
    this.rotaciones = nuevoMap;
  }

  /**
   * Gira todas las imágenes del tab actual al mismo ángulo (suma 90° y aplica a todas).
   * Resetea las rotaciones individuales previas.
   */
  girarTodas(): void {
    // Tomar el ángulo "siguiente" (90° más que el promedio actual, o simplemente 90 si todas estaban en 0)
    // Para simplicidad: si hay rotaciones, todas pasan al siguiente múltiplo (90); si no, todas a 90.
    const algunaRotada = this.rotaciones.size > 0;
    const proximoAngulo = algunaRotada
      ? ((this.obtenerAnguloMasComun() + 90) % 360)
      : 90;

    const nuevoMap = new Map<string, number>();
    if (proximoAngulo !== 0) {
      this.allImages.forEach(img => nuevoMap.set(img.guid, proximoAngulo));
    }
    this.rotaciones = nuevoMap;
  }

  /**
   * Resetea todas las rotaciones (se llama al cambiar de tab o galería).
   */
  resetearRotaciones(): void {
    if (this.rotaciones.size > 0) {
      this.rotaciones = new Map();
    }
  }

  /**
   * Devuelve la rotación actual de la imagen mostrada en el lightbox.
   */
  get rotacionLightbox(): number {
    return this.selectedImage ? (this.rotaciones.get(this.selectedImage.guid) || 0) : 0;
  }

  /**
   * Estilo CSS para rotar la imagen del lightbox. Aplica escala al 75% cuando es 90°/270°
   * para que la foto rotada quepa dentro del contenedor sin recortes.
   */
  get estiloRotacionLightbox(): { [k: string]: string } {
    const angulo = this.rotacionLightbox;
    if (angulo === 0) return { transform: 'rotate(0deg)' };
    const escala = (angulo === 90 || angulo === 270) ? 0.75 : 1;
    return {
      transform: `rotate(${angulo}deg) scale(${escala})`,
      transition: 'transform 0.4s ease',
    };
  }

  /**
   * Llama al girar desde el lightbox.
   */
  girarImagenLightbox(): void {
    if (this.selectedImage) {
      this.girarImagen(this.selectedImage.guid);
    }
  }

  /**
   * Calcula el ángulo más común en el Map (para que "girar todas" sume coherentemente).
   */
  private obtenerAnguloMasComun(): number {
    const conteo = new Map<number, number>();
    this.rotaciones.forEach(angulo => {
      conteo.set(angulo, (conteo.get(angulo) || 0) + 1);
    });
    let max = 0;
    let resultado = 0;
    conteo.forEach((cuenta, angulo) => {
      if (cuenta > max) {
        max = cuenta;
        resultado = angulo;
      }
    });
    return resultado;
  }

  // =========================================
  // Selector debug de modos (solo localhost)
  // =========================================

  /**
   * Cambia el modo forzado desde el selector. Si el valor es vacío, vuelve al modo del día.
   */
  cambiarModoForzado(valor: string): void {
    const num = parseInt(valor, 10);
    this.modoForzado = isNaN(num) ? null : num;
  }
}