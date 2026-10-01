import { Injectable } from '@angular/core';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

/**
 * Cómo se encaja la foto en el tamaño de Instagram:
 * difuminado (foto completa sobre la misma foto difuminada), recortar (llena
 * el cuadro y se pierden los bordes) o blanco (foto completa sobre blanco).
 */
export type EncuadreInstagram = 'difuminado' | 'recortar' | 'blanco';

@Injectable({
  providedIn: 'root'
})
export class InstagramService {

  private readonly base = `${environment.api}instagram`;

  constructor(private http: HttpClient) { }

  /**
   * Estado de la conexión de Instagram del tenant (configurado, expiración).
   */
  obtenerEstado(): Observable<HttpResponse<any>> {
    return this.http.get(`${this.base}/estado`, { observe: 'response' });
  }

  /**
   * Mapa de imágenes ya publicadas de una galería y en qué tipos.
   * Respuesta body: { "<id_imagen>": ["feed","historia","reel"], ... }
   */
  obtenerImagenesPublicadas(idGaleria: string): Observable<HttpResponse<any>> {
    return this.http.get(`${this.base}/imagenes-publicadas/${idGaleria}`, { observe: 'response' });
  }

  /**
   * Publica un carrusel (o imagen única) en el FEED.
   * @param logo     Logo del jardín en base64 (data URI) para la marca de agua.
   *                 Vacío = se publica sin marca.
   * @param encuadre Cómo se encaja la foto (por defecto difuminado).
   */
  publicar(idGaleria: string, ids: string[], caption: string, logo: string = '',
           encuadre: EncuadreInstagram = 'difuminado'): Observable<HttpResponse<any>> {
    const body = {
      id_galeria: idGaleria,
      ids: ids,
      caption: caption,
      logo: logo,
      encuadre: encuadre
    };
    return this.http.post(`${this.base}/publicar`, body, { observe: 'response' });
  }

  /**
   * Publica HISTORIAS: una historia por cada imagen seleccionada (sin tope).
   * @param logo     Logo del jardín en base64 (data URI) para la marca de agua.
   *                 Vacío = se publica sin marca.
   * @param encuadre Cómo se encaja la foto (por defecto difuminado).
   */
  publicarHistoria(idGaleria: string, ids: string[], logo: string = '',
                   encuadre: EncuadreInstagram = 'difuminado'): Observable<HttpResponse<any>> {
    const body = {
      id_galeria: idGaleria,
      ids: ids,
      logo: logo,
      encuadre: encuadre
    };
    return this.http.post(`${this.base}/publicar-historia`, body, { observe: 'response' });
  }

  /**
   * Publica un VIDEO como Reel (sale en Reels y, con share_to_feed, también en el feed).
   * @param idGaleria UUID de la galería
   * @param idVideo   UUID de la imagen tipo 'video'
   * @param caption   Texto del Reel
   */
  publicarReel(idGaleria: string, idVideo: string, caption: string): Observable<HttpResponse<any>> {
    const body = {
      id_galeria: idGaleria,
      id_video: idVideo,
      caption: caption
    };
    return this.http.post(`${this.base}/publicar-reel`, body, { observe: 'response' });
  }

  /**
   * Vista previa de cómo saldría una imagen en Instagram (encuadre y marca de
   * agua), sin publicar nada.
   * Respuesta body: { imagen: "data:image/jpeg;base64,...", con_marca: boolean }
   * @param logo     Logo del jardín en base64 (data URI). Vacío = sin marca.
   * @param encuadre Cómo se encaja la foto (por defecto difuminado).
   */
  vistaPrevia(idGaleria: string, idImagen: string, tipo: 'feed' | 'historia', logo: string = '',
              encuadre: EncuadreInstagram = 'difuminado'): Observable<HttpResponse<any>> {
    const body = {
      id_galeria: idGaleria,
      id_imagen: idImagen,
      tipo: tipo,
      logo: logo,
      encuadre: encuadre
    };
    return this.http.post(`${this.base}/vista-previa`, body, { observe: 'response' });
  }
}