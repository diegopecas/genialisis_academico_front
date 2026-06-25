import { Injectable } from '@angular/core';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

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
   * Respuesta body: { "<id_imagen>": ["feed","historia"], ... }
   */
  obtenerImagenesPublicadas(idGaleria: string): Observable<HttpResponse<any>> {
    return this.http.get(`${this.base}/imagenes-publicadas/${idGaleria}`, { observe: 'response' });
  }

  /**
   * Publica un carrusel (o imagen única) en el FEED.
   */
  publicar(idGaleria: string, ids: string[], caption: string): Observable<HttpResponse<any>> {
    const body = {
      id_galeria: idGaleria,
      ids: ids,
      caption: caption
    };
    return this.http.post(`${this.base}/publicar`, body, { observe: 'response' });
  }

  /**
   * Publica HISTORIAS: una historia por cada imagen seleccionada (sin tope).
   */
  publicarHistoria(idGaleria: string, ids: string[]): Observable<HttpResponse<any>> {
    const body = {
      id_galeria: idGaleria,
      ids: ids
    };
    return this.http.post(`${this.base}/publicar-historia`, body, { observe: 'response' });
  }
}