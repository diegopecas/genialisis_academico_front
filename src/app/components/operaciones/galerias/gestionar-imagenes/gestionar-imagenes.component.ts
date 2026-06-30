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
import { ConfiguracionGlobalService } from '../../../../services/configuracion-global.service';


interface ImagenPreview {
  file: File;
  preview: string;
  esVideo: boolean;
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
  tipoMedia: string;             // 'imagen' | 'video'
  alt: string;
  orden: number;
  urlThumb: string;
  esMiniatura?: boolean;
  seleccionada?: boolean;
  publicadoFeed?: boolean;
  publicadoHistoria?: boolean;
  publicadoReel?: boolean;
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
  readonly maxImagenesFeed = 10;          // tope real de Instagram para carrusel
  // Las historias NO tienen tope. Los Reels son de 1 video.

  // Límite de tamaño de video (MB). Se lee de configuracion_global
  // (galeria_video_max_mb); el backend valida el mismo número. Default 32.
  maxVideoMb = 32;
  private readonly tiposVideo = ['video/mp4', 'video/quicktime'];

  private get maxVideoClienteBytes(): number {
    return this.maxVideoMb * 1024 * 1024;
  }

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private galeriasService: GaleriasService,
    private galeriaImagenesService: GaleriaImagenesService,
    private instagramService: InstagramService,
    private configuracionGlobalService: ConfiguracionGlobalService,
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
    this.cargarLimiteVideo();
  }

  /**
   * Lee galeria_video_max_mb de configuracion_global para validar el tamaño
   * de video en el cliente con el mismo número que usa el backend.
   */
  private cargarLimiteVideo(): void {
    this.configuracionGlobalService.obtenerMultiples(['galeria_video_max_mb']).subscribe({
      next: (resp: any) => {
        const cfg = resp && resp['galeria_video_max_mb'] ? resp['galeria_video_max_mb'] : null;
        const valor = cfg && cfg.valor_numero ? Number(cfg.valor_numero) : 0;
        if (valor > 0) {
          this.maxVideoMb = valor;
        }
      },
      error: () => {
        // Si falla, queda el default (32MB); el backend valida igual.
      }
    });
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
          tipoMedia: img.tipo_media || 'imagen',
          alt: img.alt,
          orden: img.orden,
          urlThumb: this.galeriaImagenesService.obtenerUrlThumb(img.guid),
          esMiniatura: false,
          seleccionada: false,
          publicadoFeed: false,
          publicadoHistoria: false,
          publicadoReel: false
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
          img.publicadoReel = tipos.indexOf('reel') !== -1;
        });
      },
      error: (error) => {
        console.error("Error al cargar estado de publicación:", error);
      }
    });
  }

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

  get seleccionadas(): ImagenSubida[] {
    return this.imagenesSubidas.filter(img => img.seleccionada);
  }

  get cantidadSeleccionadas(): number {
    return this.seleccionadas.length;
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
    const seleccionadas = this.seleccionadas;

    if (seleccionadas.length === 0) {
      Swal.fire('Aviso', 'No hay imágenes seleccionadas', 'warning');
      return;
    }

    const result = await Swal.fire({
      title: '¿Eliminar elementos?',
      html: `Se eliminarán <strong>${seleccionadas.length}</strong> elementos.<br>Esta acción no se puede deshacer.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Sí, eliminar todos',
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
            'Eliminados',
            `Se eliminaron ${response.eliminados} elementos correctamente`,
            'success'
          );

          this.cargarImagenes();
        },
        error: (error) => {
          this.eliminandoMultiple = false;
          console.error("Error al eliminar:", error);
          Swal.fire('Error', 'No se pudieron eliminar los elementos', 'error');
        }
      });
    }
  }

  // ==========================================
  // PUBLICAR EN INSTAGRAM
  // ==========================================

  /** Cuántos de los seleccionados son video. */
  get videosSeleccionados(): number {
    return this.seleccionadas.filter(img => img.tipoMedia === 'video').length;
  }

  /** Cuántos de los seleccionados son imagen. */
  get imagenesSeleccionadasCount(): number {
    return this.seleccionadas.filter(img => img.tipoMedia === 'imagen').length;
  }

  /** Feed: 1..10, solo imágenes (sin videos en la selección). */
  get puedePublicarFeed(): boolean {
    const n = this.cantidadSeleccionadas;
    return n >= 1 && n <= this.maxImagenesFeed && this.videosSeleccionados === 0;
  }

  /** Historias: 1 o más, solo imágenes (sin videos en la selección). */
  get puedePublicarHistoria(): boolean {
    return this.cantidadSeleccionadas >= 1 && this.videosSeleccionados === 0;
  }

  /** Reel: exactamente 1 seleccionado y que sea video. */
  get puedePublicarReel(): boolean {
    return this.cantidadSeleccionadas === 1 && this.videosSeleccionados === 1;
  }

  /**
   * Publica las imágenes seleccionadas como carrusel en el FEED (máx. 10).
   */
  async publicarEnInstagram(): Promise<void> {
    const seleccionadas = this.seleccionadas;

    if (seleccionadas.length === 0) {
      Swal.fire('Aviso', 'Selecciona al menos una imagen para publicar', 'info');
      return;
    }
    if (this.videosSeleccionados > 0) {
      Swal.fire('Aviso', 'El feed solo admite imágenes. Para video usa "Publicar como Reel".', 'info');
      return;
    }
    if (seleccionadas.length > this.maxImagenesFeed) {
      Swal.fire(
        'Demasiadas imágenes',
        `El feed permite máximo ${this.maxImagenesFeed} imágenes. Tienes ${seleccionadas.length}. Para más, usa historias.`,
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
      inputAttributes: { 'aria-label': 'Texto de la publicación', rows: '6' },
      showCancelButton: true,
      confirmButtonColor: '#f39c12',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Publicar',
      cancelButtonText: 'Cancelar'
    });

    if (!result.isConfirmed) return;

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
    const seleccionadas = this.seleccionadas;

    if (seleccionadas.length === 0) {
      Swal.fire('Aviso', 'Selecciona al menos una imagen para publicar', 'info');
      return;
    }
    if (this.videosSeleccionados > 0) {
      Swal.fire('Aviso', 'Las historias aquí admiten imágenes. Para video usa "Publicar como Reel".', 'info');
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

    if (!result.isConfirmed) return;

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

  /**
   * Publica el video seleccionado como Reel (sale en Reels y en el feed).
   */
  async publicarComoReel(): Promise<void> {
    const seleccionadas = this.seleccionadas;

    if (seleccionadas.length !== 1 || seleccionadas[0].tipoMedia !== 'video') {
      Swal.fire('Aviso', 'Selecciona un solo video para publicar como Reel.', 'info');
      return;
    }

    const video = seleccionadas[0];

    const captionDefecto = (this.galeria && this.galeria.descripcion)
      ? this.galeria.descripcion
      : (this.galeria && this.galeria.nombre ? this.galeria.nombre : '');

    const result = await Swal.fire({
      title: 'Publicar como Reel',
      input: 'textarea',
      inputLabel: 'Saldrá en Reels y en el feed. Puedes editar el texto:',
      inputValue: captionDefecto,
      inputAttributes: { 'aria-label': 'Texto del Reel', rows: '5' },
      showCancelButton: true,
      confirmButtonColor: '#f39c12',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Publicar Reel',
      cancelButtonText: 'Cancelar',
      footer: 'El video debe cumplir el formato de Reel (hasta 90s, vertical 9:16, MP4/MOV). Si no, Instagram lo rechaza.'
    });

    if (!result.isConfirmed) return;

    const caption = result.value || '';

    this.publicandoInstagram = true;
    this.mostrarCargando('Publicando Reel... el video puede tardar varios minutos en procesar.');

    this.instagramService.publicarReel(this.idGaleria, video.id, caption).subscribe({
      next: (response: any) => {
        this.publicandoInstagram = false;
        const permalink = response.body && response.body.permalink ? response.body.permalink : null;
        const htmlExito = permalink
          ? `El Reel se publicó correctamente.<br><a href="${permalink}" target="_blank" rel="noopener">Ver en Instagram</a>`
          : 'El Reel se publicó correctamente.';
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

  private mostrarCargando(titulo: string): void {
    Swal.fire({
      title: titulo,
      html: 'Esto puede tardar unos segundos.',
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => { Swal.showLoading(); }
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
    const validos = files.filter(file => {
      const esImagen = file.type.startsWith('image/');
      const esVideo = this.tiposVideo.indexOf(file.type) !== -1;

      if (!esImagen && !esVideo) {
        Swal.fire('Error', `${file.name} no es una imagen ni un video permitido (MP4/MOV)`, 'error');
        return false;
      }
      if (esImagen && file.size > 10 * 1024 * 1024) {
        Swal.fire('Error', `${file.name} supera el tamaño máximo de imagen (10MB)`, 'error');
        return false;
      }
      if (esVideo && file.size > this.maxVideoClienteBytes) {
        Swal.fire('Video muy grande', `${file.name} supera el máximo permitido (${this.maxVideoMb}MB).`, 'error');
        return false;
      }
      return true;
    });

    validos.forEach(file => {
      const esVideo = this.tiposVideo.indexOf(file.type) !== -1;
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imagenesPreview.push({
          file,
          preview: e.target.result,
          esVideo,
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
  // SUBIR ARCHIVOS
  // ==========================================

  async subirImagenes() {
    if (this.imagenesPreview.length === 0) {
      Swal.fire('Error', 'No hay archivos para subir', 'error');
      return;
    }

    this.isUploading = true;

    let exitosos = 0;
    let fallidos = 0;

    for (const item of this.imagenesPreview) {
      if (item.uploaded) continue;
      item.uploading = true;
      try {
        await this.subirArchivo(item);
        item.uploaded = true;
        item.uploading = false;
        exitosos++;
      } catch (error) {
        console.error("Error al subir archivo:", error);
        item.error = true;
        item.uploading = false;
        fallidos++;
      }
    }

    this.isUploading = false;
    this.imagenesPreview = this.imagenesPreview.filter(img => !img.uploaded);

    if (exitosos > 0) {
      this.cargarImagenes();
    }

    if (fallidos === 0) {
      Swal.fire('Éxito', 'Archivos subidos correctamente', 'success');
    } else if (exitosos === 0) {
      Swal.fire('No se pudo subir', this.mensajeFalloUpload(), 'error');
    } else {
      Swal.fire(
        'Subida parcial',
        `Se subieron ${exitosos}, fallaron ${fallidos}. ${this.mensajeFalloUpload()}`,
        'warning'
      );
    }
  }

  /** Mensaje de ayuda para fallos de subida (revisar tamaño/tipo). */
  private mensajeFalloUpload(): string {
    return `Revisa que el video no supere ${this.maxVideoMb}MB y que sea MP4/MOV, o que la imagen no pase de 10MB.`;
  }

  private subirArchivo(item: ImagenPreview): Promise<any> {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append('imagen', item.file);
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
              tipo_media: response.tipo_media || (item.esVideo ? 'video' : 'imagen'),
              alt: item.file.name,
              orden: ordenActual
            };

            this.galeriaImagenesService.crear(nuevaImagen).subscribe({
              next: (resp: any) => {
                item.id = resp.id;
                item.guid = resp.guid;
                resolve(resp);
              },
              error: (error) => reject(error)
            });
          } else {
            reject(new Error('No se recibió ruta del archivo'));
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
    if (imagen.tipoMedia === 'video') {
      Swal.fire('Aviso', 'La miniatura debe ser una imagen, no un video.', 'info');
      return;
    }

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
      const galeriaActualizada = { ...this.galeria, thumbnail: thumbnailGuid };

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
  // ELIMINAR (individual)
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
          Swal.fire('Eliminado', 'Elemento eliminado correctamente', 'success');
          this.cargarImagenes();
        },
        error: (error) => {
          console.error("Error al eliminar:", error);
          Swal.fire('Error', 'No se pudo eliminar', 'error');
        }
      });
    }
  }

  volver() {
    this.router.navigate([this.regresar]);
  }
}