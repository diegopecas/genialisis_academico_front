import { Injectable } from '@angular/core';

/**
 * Resultado de un intento de reducción.
 * - archivo: el archivo resultante (o el original si no se pudo tocar)
 * - cabe: si el archivo resultante ya está por debajo del límite pedido
 * - reducido: si realmente se generó un archivo nuevo
 */
export interface ResultadoReduccion {
  archivo: File;
  cabe: boolean;
  reducido: boolean;
}

/**
 * Reduce imágenes en el navegador antes de subirlas.
 *
 * La idea es la misma de cualquier compresor en línea: al usuario no se le
 * pregunta por píxeles ni por calidad, solo si quiere reducir. Aquí se prueban
 * escalones de tamaño y calidad hasta que el archivo quepa bajo el límite.
 */
@Injectable({
  providedIn: 'root',
})
export class ImagenCompresionService {

  // Escalones de lado mayor (px) y de calidad JPEG. Se recorren en orden: se
  // baja primero el tamaño y, dentro de cada tamaño, la calidad. Se devuelve
  // el primer resultado que quepa, así se pierde lo menos posible.
  private readonly ladosMaximos = [2560, 1920, 1600, 1280, 1024, 800];
  private readonly calidades = [0.85, 0.75, 0.65];

  // El canvas se queda con el primer cuadro del GIF y mata la animación, así
  // que ese formato no se ofrece para reducir.
  private readonly tiposNoReducibles = ['image/gif'];

  /**
   * Si el archivo se puede pasar por el canvas sin dañarlo.
   * Videos y GIF quedan por fuera.
   */
  esReducible(file: File): boolean {
    if (!file || !file.type.startsWith('image/')) {
      return false;
    }
    return this.tiposNoReducibles.indexOf(file.type) === -1;
  }

  /**
   * Intenta dejar la imagen por debajo de maxBytes.
   *
   * Nunca lanza: si algo falla (formato raro, canvas bloqueado) devuelve el
   * archivo original marcado como no reducido, y el componente decide.
   *
   * @param file      archivo original
   * @param maxBytes  tope al que hay que llegar
   */
  async reducir(file: File, maxBytes: number): Promise<ResultadoReduccion> {
    if (!this.esReducible(file)) {
      return { archivo: file, cabe: file.size <= maxBytes, reducido: false };
    }

    let mapa: ImageBitmap | HTMLImageElement | null = null;

    try {
      mapa = await this.cargarMapa(file);

      const anchoOriginal = mapa.width;
      const altoOriginal = mapa.height;
      if (!anchoOriginal || !altoOriginal) {
        return { archivo: file, cabe: file.size <= maxBytes, reducido: false };
      }

      let mejorBlob: Blob | null = null;

      for (const lado of this.ladosMaximos) {
        const escala = Math.min(1, lado / Math.max(anchoOriginal, altoOriginal));
        const ancho = Math.max(1, Math.round(anchoOriginal * escala));
        const alto = Math.max(1, Math.round(altoOriginal * escala));

        for (const calidad of this.calidades) {
          const blob = await this.dibujar(mapa, ancho, alto, calidad);
          if (!blob) {
            continue;
          }

          if (!mejorBlob || blob.size < mejorBlob.size) {
            mejorBlob = blob;
          }

          if (blob.size <= maxBytes) {
            return {
              archivo: this.aFile(blob, file.name),
              cabe: true,
              reducido: true
            };
          }
        }
      }

      // Ningún escalón alcanzó el tope: se devuelve el más liviano que se logró
      // y se avisa que todavía no cabe.
      if (mejorBlob && mejorBlob.size < file.size) {
        return {
          archivo: this.aFile(mejorBlob, file.name),
          cabe: false,
          reducido: true
        };
      }

      return { archivo: file, cabe: file.size <= maxBytes, reducido: false };

    } catch (error) {
      console.error('Error al reducir la imagen:', error);
      return { archivo: file, cabe: file.size <= maxBytes, reducido: false };

    } finally {
      // ImageBitmap ocupa memoria hasta que se cierra a mano.
      if (mapa && typeof (mapa as ImageBitmap).close === 'function') {
        (mapa as ImageBitmap).close();
      }
    }
  }

  /**
   * Carga el archivo como fuente dibujable.
   *
   * Se pide la orientación EXIF ya aplicada: las fotos de celular vienen
   * acostadas con una etiqueta que dice cómo girarlas, y al pasar por el canvas
   * esa etiqueta se pierde. Si no se aplicara aquí, la imagen reducida quedaría
   * acostada de verdad.
   */
  private cargarMapa(file: File): Promise<ImageBitmap | HTMLImageElement> {
    if (typeof createImageBitmap === 'function') {
      return createImageBitmap(file, { imageOrientation: 'from-image' } as any)
        .catch(() => this.cargarConImg(file));
    }
    return this.cargarConImg(file);
  }

  /** Respaldo para navegadores sin createImageBitmap. */
  private cargarConImg(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('No se pudo leer la imagen'));
      };
      img.src = url;
    });
  }

  /**
   * Dibuja la imagen al tamaño pedido y la exporta como JPEG.
   * Se pinta fondo blanco porque el JPEG no tiene transparencia: sin esto, un
   * PNG transparente saldría con el fondo en negro.
   */
  private dibujar(
    mapa: ImageBitmap | HTMLImageElement,
    ancho: number,
    alto: number,
    calidad: number
  ): Promise<Blob | null> {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      canvas.width = ancho;
      canvas.height = alto;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(null);
        return;
      }

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, ancho, alto);
      ctx.drawImage(mapa as CanvasImageSource, 0, 0, ancho, alto);

      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', calidad);
    });
  }

  /** Arma el File final conservando el nombre original con extensión .jpg. */
  private aFile(blob: Blob, nombreOriginal: string): File {
    const sinExtension = nombreOriginal.replace(/\.[^.]+$/, '');
    return new File([blob], `${sinExtension}.jpg`, {
      type: 'image/jpeg',
      lastModified: Date.now()
    });
  }
}