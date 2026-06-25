import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import Swal from 'sweetalert2';
import { environment } from '../../../../../environments/environment';
import { HeaderComponent } from '../../../../common/header/header.component';
import { GaleriaImagenesService } from '../../../../services/galeria-imagenes.service';
import { GaleriasService } from '../../../../services/galerias.service';
import { InstagramService } from '../../../../services/instagram.service';


interface ImagenPreview {
  file: File;
  preview: string;
  uploading: boolean;
  uploaded: boolean;
  error: boolean;
  id?: string;
  guid?: string;
}

interface ImagenSubida {
  id: string;
  guid: string;
  url: string;
  alt: string;
  orden: number;
  urlThumb: string;
  esMiniatura?: boolean;
  seleccionada?: boolean;
  publicadoFeed?: boolean;       // NUEVO
  publicadoHistoria?: boolean;   // NUEVO
}

@Component({
  selector: 'app-gestionar-imagenes',
  templateUrl: './gestionar-imagenes.component.html',
  styleUrl: './gestionar-imagenes.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent]
})
export class GestionarImagenesComponent implements OnInit {

  titulo = "Gestionar Imágenes";
  regresar = "/operaciones/galerias";
  
  idGaleria!: string;
  galeria: any = null;
  
  // Upload
  imagenesPreview: ImagenPreview[] = [];
  isDragging = false;
  isUploading = false;
  
  // Imágenes ya subidas
  imagenesSubidas: ImagenSubida[] = [];
  cargandoImagenes = false;

  // Modo selección múltiple
  modoSeleccion = false;
  eliminandoMultiple = false;

  // Publicación en Instagram
  publicandoInstagram = false;
  readonly maxImagenesFeed = 10;   // tope real de Instagram para carrusel
  // Las historias NO tienen tope.

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private galeriasService: GaleriasService,
    private galeriaImagenesService: GaleriaImagenesService,
    private instagramService: InstagramService,
    private http: HttpClient
  ) { }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      Swal.fire('Error', 'ID de galería no válido', 'error');
      this.volver();
      return;
    }

    this.idGaleria = id;
    this.cargarGaleria();
    this.cargarImagenes();
  }

  cargarGaleria() {
    this.galeriasService.obtenerById(this.idGaleria).subscribe({
      next: (response: any) => {
        this.galeria = response.body;
        this.titulo = `Imágenes de: ${this.galeria.nombre}`;
        this.marcarMiniatura();
      },
      error: (error) => {
        console.error("Error al cargar galería:", error);
        Swal.fire('Error', 'No se pudo cargar la galería', 'error');
        this.volver();
      }
    });
  }

  cargarImagenes() {
    this.cargandoImagenes = true;
    this.galeriaImagenesService.obtenerPorGaleria(this.idGaleria).subscribe({
      next: (response: any) => {
        const imagenes = response.body || [];
        this.imagenesSubidas = imagenes.map((img: any) => ({
          id: img.id,
          guid: img.guid,
          url: img.url,
          alt: img.alt,
          orden: img.orden,
          urlThumb: this.galeriaImagenesService.obtenerUrlThumb(img.guid),
          esMiniatura: false,
          seleccionada: false,
          publicadoFeed: false,
          publicadoHistoria: false
        }));
        this.cargandoImagenes = false;
        this.marcarMiniatura();
        this.cargarEstadoPublicacion();
      },
      error: (error) => {
        console.error("Error al cargar imágenes:", error);
        this.cargandoImagenes = false;
      }
    });
  }

  /**
   * Carga qué imágenes ya se publicaron y en qué tipo, y marca cada tarjeta.
   */
  private cargarEstadoPublicacion(): void {
    if (!this.imagenesSubidas.length) return;

    this.instagramService.obtenerImagenesPublicadas(this.idGaleria).subscribe({
      next: (response: any) => {
        const mapa = response.body || {};
        this.imagenesSubidas.forEach(img => {
          const tipos: string[] = mapa[img.id] || [];
          img.publicadoFeed = tipos.indexOf('feed') !== -1;
          img.publicadoHistoria = tipos.indexOf('historia') !== -1;
        });
      },
      error: (error) => {
        // No es crítico: si falla, simplemente no se muestran las etiquetas.
        console.error("Error al cargar estado de publicación:", error);
      }
    });
  }

  /**
   * Marca cuál imagen es la miniatura actual de la galería
   */
  private marcarMiniatura(): void {
    if (!this.galeria || !this.imagenesSubidas.length) return;

    this.imagenesSubidas.forEach(img => img.esMiniatura = false);

    const thumbnailGuid = this.galeria.thumbnail;
    if (thumbnailGuid) {
      const imagenMiniatura = this.imagenesSubidas.find(img => img.guid === thumbnailGuid);
      if (imagenMiniatura) {
        imagenMiniatura.esMiniatura = true;
      }
    }
  }

  // ==========================================
  // SELECCIÓN MÚLTIPLE
  // ==========================================

  toggleModoSeleccion(): void {
    this.modoSeleccion = !this.modoSeleccion;
    if (!this.modoSeleccion) {
      this.imagenesSubidas.forEach(img => img.seleccionada = false);
    }
  }

  toggleSeleccion(imagen: ImagenSubida): void {
    if (this.modoSeleccion) {
      imagen.seleccionada = !imagen.seleccionada;
    }
  }

  seleccionarTodas(): void {
    this.imagenesSubidas.forEach(img => img.seleccionada = true);
  }

  deseleccionarTodas(): void {
    this.imagenesSubidas.forEach(img => img.seleccionada = false);
  }

  get cantidadSeleccionadas(): number {
    return this.imagenesSubidas.filter(img => img.seleccionada).length;
  }

  get todasSeleccionadas(): boolean {
    return this.imagenesSubidas.length > 0 && 
           this.imagenesSubidas.every(img => img.seleccionada);
  }

  toggleSeleccionarTodas(): void {
    if (this.todasSeleccionadas) {
      this.deseleccionarTodas();
    } else {
      this.seleccionarTodas();
    }
  }

  async eliminarSeleccionadas(): Promise<void> {
    const seleccionadas = this.imagenesSubidas.filter(img => img.seleccionada);
    
    if (seleccionadas.length === 0) {
      Swal.fire('Aviso', 'No hay imágenes seleccionadas', 'warning');
      return;
    }

    const result = await Swal.fire({
      title: '¿Eliminar imágenes?',
      html: `Se eliminarán <strong>${seleccionadas.length}</strong> imágenes.<br>Esta acción no se puede deshacer.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Sí, eliminar todas',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      this.eliminandoMultiple = true;
      
      const ids = seleccionadas.map(img => img.id);
      
      this.galeriaImagenesService.eliminarMultiples(ids).subscribe({
        next: (response: any) => {
          this.eliminandoMultiple = false;
          this.modoSeleccion = false;
          
          Swal.fire(
            'Eliminadas', 
            `Se eliminaron ${response.eliminados} imágenes correctamente`, 
            'success'
          );
          
          this.cargarImagenes();
        },
        error: (error) => {
          this.eliminandoMultiple = false;
          console.error("Error al eliminar imágenes:", error);
          Swal.fire('Error', 'No se pudieron eliminar las imágenes', 'error');
        }
      });
    }
  }

  // ==========================================
  // PUBLICAR EN INSTAGRAM
  // ==========================================

  /**
   * Feed: 1..10 imágenes.
   */
  get puedePublicarFeed(): boolean {
    const n = this.cantidadSeleccionadas;
    return n >= 1 && n <= this.maxImagenesFeed;
  }

  /**
   * Historias: 1 o más (sin tope superior).
   */
  get puedePublicarHistoria(): boolean {
    return this.cantidadSeleccionadas >= 1;
  }

  /**
   * Publica las imágenes seleccionadas como carrusel en el FEED (máx. 10).
   * Caption por defecto: la descripción de la galería (editable).
   */
  async publicarEnInstagram(): Promise<void> {
    const seleccionadas = this.imagenesSubidas.filter(img => img.seleccionada);

    if (seleccionadas.length === 0) {
      Swal.fire('Aviso', 'Selecciona al menos una imagen para publicar', 'info');
      return;
    }
    if (seleccionadas.length > this.maxImagenesFeed) {
      Swal.fire(
        'Demasiadas imágenes',
        `El feed permite máximo ${this.maxImagenesFeed} imágenes por publicación. Tienes ${seleccionadas.length} seleccionadas. Para más, usa historias.`,
        'warning'
      );
      return;
    }

    const captionDefecto = (this.galeria && this.galeria.descripcion)
      ? this.galeria.descripcion
      : (this.galeria && this.galeria.nombre ? this.galeria.nombre : '');

    const result = await Swal.fire({
      title: 'Publicar en el feed',
      input: 'textarea',
      inputLabel: `Se publicarán ${seleccionadas.length} imagen(es). Puedes editar el texto del post:`,
      inputValue: captionDefecto,
      inputAttributes: {
        'aria-label': 'Texto de la publicación',
        rows: '6'
      },
      showCancelButton: true,
      confirmButtonColor: '#f39c12',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Publicar',
      cancelButtonText: 'Cancelar'
    });

    if (!result.isConfirmed) {
      return;
    }

    const caption = result.value || '';
    const ids = seleccionadas.map(img => img.id);

    this.publicandoInstagram = true;
    this.mostrarCargando('Publicando en el feed...');

    this.instagramService.publicar(this.idGaleria, ids, caption).subscribe({
      next: (response: any) => {
        this.publicandoInstagram = false;
        const permalink = response.body && response.body.permalink ? response.body.permalink : null;

        const htmlExito = permalink
          ? `La publicación se creó correctamente.<br><a href="${permalink}" target="_blank" rel="noopener">Ver en Instagram</a>`
          : 'La publicación se creó correctamente.';

        Swal.fire({ title: '¡Publicado!', html: htmlExito, icon: 'success' });

        this.modoSeleccion = false;
        this.deseleccionarTodas();
        this.cargarEstadoPublicacion();
      },
      error: (error) => {
        this.publicandoInstagram = false;
        Swal.fire('Error', this.extraerError(error), 'error');
      }
    });
  }

  /**
   * Publica las imágenes seleccionadas como HISTORIAS (una por imagen, sin tope).
   */
  async publicarEnHistoria(): Promise<void> {
    const seleccionadas = this.imagenesSubidas.filter(img => img.seleccionada);

    if (seleccionadas.length === 0) {
      Swal.fire('Aviso', 'Selecciona al menos una imagen para publicar', 'info');
      return;
    }

    const result = await Swal.fire({
      title: 'Publicar en historias',
      html: `Se publicarán <strong>${seleccionadas.length}</strong> historia(s), una por cada imagen.<br>Las historias desaparecen a las 24 horas.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#f39c12',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Publicar historias',
      cancelButtonText: 'Cancelar'
    });

    if (!result.isConfirmed) {
      return;
    }

    const ids = seleccionadas.map(img => img.id);

    this.publicandoInstagram = true;
    this.mostrarCargando('Publicando historias...');

    this.instagramService.publicarHistoria(this.idGaleria, ids).subscribe({
      next: (response: any) => {
        this.publicandoInstagram = false;
        const body = response.body || {};
        const cantidad = body.historias_publicadas ? body.historias_publicadas : ids.length;

        const html = body.parcial
          ? `Se publicaron ${cantidad} de ${ids.length} historias. ${body.detalle || ''}`
          : `Se publicaron ${cantidad} historia(s) correctamente.`;

        Swal.fire({
          title: body.parcial ? 'Publicación parcial' : '¡Publicado!',
          html: html,
          icon: body.parcial ? 'warning' : 'success'
        });

        this.modoSeleccion = false;
        this.deseleccionarTodas();
        this.cargarEstadoPublicacion();
      },
      error: (error) => {
        this.publicandoInstagram = false;
        Swal.fire('Error', this.extraerError(error), 'error');
      }
    });
  }

  private mostrarCargando(titulo: string): void {
    Swal.fire({
      title: titulo,
      html: 'Esto puede tardar unos segundos.',
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });
  }

  private extraerError(error: any): string {
    if (error && error.error && error.error.error) {
      return error.error.error;
    }
    return 'No se pudo completar la publicación en Instagram.';
  }

  // ==========================================
  // DRAG & DROP
  // ==========================================

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;

    const files = event.dataTransfer?.files;
    if (files) {
      this.procesarArchivos(Array.from(files));
    }
  }

  onFileSelected(event: any) {
    const files = event.target.files;
    if (files) {
      this.procesarArchivos(Array.from(files));
      event.target.value = '';
    }
  }

  procesarArchivos(files: File[]) {
    const imagenesValidas = files.filter(file => {
      if (!file.type.startsWith('image/')) {
        Swal.fire('Error', `${file.name} no es una imagen válida`, 'error');
        return false;
      }
      if (file.size > 10 * 1024 * 1024) {
        Swal.fire('Error', `${file.name} supera el tamaño máximo de 10MB`, 'error');
        return false;
      }
      return true;
    });

    imagenesValidas.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imagenesPreview.push({
          file,
          preview: e.target.result,
          uploading: false,
          uploaded: false,
          error: false
        });
      };
      reader.readAsDataURL(file);
    });
  }

  eliminarPreview(index: number) {
    this.imagenesPreview.splice(index, 1);
  }

  // ==========================================
  // SUBIR IMÁGENES
  // ==========================================

  async subirImagenes() {
    if (this.imagenesPreview.length === 0) {
      Swal.fire('Error', 'No hay imágenes para subir', 'error');
      return;
    }

    this.isUploading = true;
    
    for (const imagen of this.imagenesPreview) {
      if (imagen.uploaded) continue;
      
      imagen.uploading = true;
      
      try {
        await this.subirImagen(imagen);
        imagen.uploaded = true;
        imagen.uploading = false;
      } catch (error) {
        console.error("Error al subir imagen:", error);
        imagen.error = true;
        imagen.uploading = false;
      }
    }

    this.isUploading = false;
    
    this.imagenesPreview = this.imagenesPreview.filter(img => !img.uploaded);
    
    this.cargarImagenes();
    
    Swal.fire('Éxito', 'Imágenes subidas correctamente', 'success');
  }

  private subirImagen(imagen: ImagenPreview): Promise<any> {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append('imagen', imagen.file);
      formData.append('id_galeria', this.idGaleria.toString());
      formData.append('carpeta', 'galerias');

      this.http.post(`${environment.api}upload/galeria-imagen`, formData).subscribe({
        next: (response: any) => {
          if (response.ruta) {
            const ordenActual = this.imagenesSubidas.length;
            const nuevaImagen = {
              id_galeria: this.idGaleria,
              id_subgaleria: null,
              url: response.ruta,
              alt: imagen.file.name,
              orden: ordenActual
            };

            this.galeriaImagenesService.crear(nuevaImagen).subscribe({
              next: (resp: any) => {
                imagen.id = resp.id;
                imagen.guid = resp.guid;
                resolve(resp);
              },
              error: (error) => reject(error)
            });
          } else {
            reject(new Error('No se recibió ruta de imagen'));
          }
        },
        error: (error) => reject(error)
      });
    });
  }

  // ==========================================
  // ESTABLECER COMO MINIATURA
  // ==========================================

  async establecerComoMiniatura(imagen: ImagenSubida) {
    const result = await Swal.fire({
      title: '¿Usar como miniatura?',
      text: 'Esta imagen será la portada de la galería',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#f39c12',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Sí, usar como miniatura',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      const thumbnailGuid = imagen.guid;

      const galeriaActualizada = {
        ...this.galeria,
        thumbnail: thumbnailGuid
      };

      this.galeriasService.actualizar(galeriaActualizada).subscribe({
        next: () => {
          this.galeria.thumbnail = thumbnailGuid;
          this.marcarMiniatura();
          Swal.fire('Éxito', 'Miniatura actualizada correctamente', 'success');
        },
        error: (error) => {
          console.error("Error al actualizar miniatura:", error);
          Swal.fire('Error', 'No se pudo actualizar la miniatura', 'error');
        }
      });
    }
  }

  // ==========================================
  // ELIMINAR IMAGEN (individual)
  // ==========================================

  async eliminarImagen(imagen: ImagenSubida) {
    const result = await Swal.fire({
      title: '¿Está seguro?',
      text: 'Esta acción no se puede deshacer',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      this.galeriaImagenesService.eliminar(imagen.id).subscribe({
        next: () => {
          Swal.fire('Eliminado', 'Imagen eliminada correctamente', 'success');
          this.cargarImagenes();
        },
        error: (error) => {
          console.error("Error al eliminar imagen:", error);
          Swal.fire('Error', 'No se pudo eliminar la imagen', 'error');
        }
      });
    }
  }

  volver() {
    this.router.navigate([this.regresar]);
  }
}