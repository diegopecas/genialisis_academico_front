import {
  Component,
  EventEmitter,
  HostListener,
  Input,
  OnDestroy,
  OnInit,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';

import { GaleriaImagenesService } from '../../../../../../services/galeria-imagenes.service';
import { FotoAgenda } from '../../mi-agenda.types';

/**
 * Visor de foto a pantalla completa, con el mismo comportamiento del de la
 * galería: carga progresiva (thumb mientras llega el medium), girar,
 * descargar en calidad original y navegación entre fotos.
 *
 * Se copió el comportamiento en vez de reutilizar el componente de galería
 * porque ese está amarrado al tipo GalleryImage y a la carga por galerías;
 * aquí las fotos llegan dentro de meta del evento, con guid y alt nada más.
 *
 * En el institucional la descarga está disponible para quien entra a la
 * agenda: el equipo del jardín es el que sube estas fotos.
 */
@Component({
  selector: 'app-agenda-visor-foto',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './agenda-visor-foto.component.html',
  styleUrl: './agenda-visor-foto.component.scss',
})
export class AgendaVisorFotoComponent implements OnInit, OnDestroy {
  @Input() fotos: FotoAgenda[] = [];
  /** Foto por la que abre el visor. */
  @Input() indiceInicial: number = 0;
  /** Texto de respaldo cuando la foto no trae alt. */
  @Input() titulo: string = '';

  @Output() cerrar = new EventEmitter<void>();

  /** Foto que se está viendo. El visor maneja su propia posición. */
  public indice = 0;

  /** Falso mientras no haya llegado el medium: se muestra el thumb borroso. */
  public mediumListo = false;

  /** Ángulo aplicado a cada foto, por guid. Se pierde al cerrar, a propósito. */
  private rotaciones = new Map<string, number>();

  constructor(
    private galeriaImagenesService: GaleriaImagenesService
  ) { }

  ngOnInit(): void {
    this.indice = this.acotar(this.indiceInicial);
    this.precargarMedium();

    // Sin esto la página de atrás sigue haciendo scroll debajo del visor.
    document.body.style.overflow = 'hidden';
  }

  ngOnDestroy(): void {
    document.body.style.overflow = 'auto';
  }

  // -----------------------------------------------------------------
  // Foto actual
  // -----------------------------------------------------------------

  get foto(): FotoAgenda | null {
    return this.fotos[this.indice] || null;
  }

  get total(): number {
    return this.fotos.length;
  }

  /**
   * URL que se pinta: el thumb hasta que llegue el medium.
   *
   * Así la foto aparece de una (el thumb ya está en caché del navegador,
   * viene de la tarjeta) y se reemplaza sola cuando termina de bajar la
   * versión buena, en vez de dejar el visor en negro.
   */
  urlActual(): string {
    if (!this.foto) return '';

    return this.mediumListo
      ? this.galeriaImagenesService.obtenerUrlMedium(this.foto.guid)
      : this.galeriaImagenesService.obtenerUrlThumb(this.foto.guid);
  }

  textoAlterno(): string {
    return this.foto?.alt || this.titulo || 'Foto';
  }

  private precargarMedium(): void {
    const foto = this.foto;
    if (!foto) return;

    this.mediumListo = false;

    const img = new Image();
    img.onload = () => {
      // Puede haber cambiado de foto mientras bajaba: si ya no es la misma,
      // no se toca nada o se quitaría el borroso de la que sí está cargando.
      if (this.foto?.guid === foto.guid) {
        this.mediumListo = true;
      }
    };
    img.src = this.galeriaImagenesService.obtenerUrlMedium(foto.guid);
  }

  private acotar(indice: number): number {
    if (this.total === 0) return 0;
    if (indice < 0) return 0;
    if (indice > this.total - 1) return this.total - 1;
    return indice;
  }

  // -----------------------------------------------------------------
  // Navegación
  // -----------------------------------------------------------------

  siguiente(event?: Event): void {
    event?.stopPropagation();
    if (this.total === 0) return;
    // Da la vuelta al llegar al final para poder recorrerlas sin trabarse.
    this.indice = (this.indice + 1) % this.total;
    this.precargarMedium();
  }

  anterior(event?: Event): void {
    event?.stopPropagation();
    if (this.total === 0) return;
    this.indice = (this.indice - 1 + this.total) % this.total;
    this.precargarMedium();
  }

  @HostListener('document:keydown', ['$event'])
  alPresionarTecla(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.cerrar.emit();
      return;
    }

    if (this.total < 2) return;

    if (event.key === 'ArrowRight') {
      this.siguiente();
    } else if (event.key === 'ArrowLeft') {
      this.anterior();
    }
  }

  // -----------------------------------------------------------------
  // Girar
  // -----------------------------------------------------------------

  get rotacion(): number {
    return this.foto ? (this.rotaciones.get(this.foto.guid) || 0) : 0;
  }

  /**
   * Estilo de rotación. A 90° y 270° se encoge al 75% para que la foto
   * rotada quepa dentro del contenedor sin recortarse, igual que en la
   * galería.
   */
  get estiloRotacion(): { [k: string]: string } {
    const angulo = this.rotacion;
    if (angulo === 0) return { transform: 'rotate(0deg)' };

    const escala = (angulo === 90 || angulo === 270) ? 0.75 : 1;
    return {
      transform: `rotate(${angulo}deg) scale(${escala})`,
      transition: 'transform 0.4s ease',
    };
  }

  girar(event: Event): void {
    event.stopPropagation();
    if (!this.foto) return;

    const actual = this.rotaciones.get(this.foto.guid) || 0;
    this.rotaciones.set(this.foto.guid, (actual + 90) % 360);
  }

  // -----------------------------------------------------------------
  // Descargar
  // -----------------------------------------------------------------

  puedeDescargar(): boolean {
    return true;
  }

  /**
   * Baja la foto en calidad original. Va por HttpClient (no por la URL con
   * token) para que el token de sesión viaje en el header y no quede en el
   * historial del navegador.
   */
  descargar(event: Event): void {
    event.stopPropagation();

    const foto = this.foto;
    if (!foto) return;

    this.galeriaImagenesService.descargarImagen(foto.guid).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = this.nombreArchivo(foto);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        console.error('Error descargando la foto:', error);
      },
    });
  }

  /**
   * Nombre del archivo descargado. Aquí no llega la url original de la
   * imagen (el backend solo manda guid, alt y tipo_media), así que se arma
   * con el guid; si el alt trae extensión se respeta.
   */
  private nombreArchivo(foto: FotoAgenda): string {
    const alt = (foto.alt || '').trim();

    if (alt && /\.[a-z0-9]{3,4}$/i.test(alt)) {
      return alt;
    }

    return `foto_${foto.guid}.jpg`;
  }
}
