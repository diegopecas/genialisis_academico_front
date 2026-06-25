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
   * Publica un carrusel (o imagen única) en el FEED.
   * @param idGaleria UUID de la galería
   * @param ids       UUID de las imágenes seleccionadas (1..10)
   * @param caption   Texto del post
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
   * Publica HISTORIAS: una historia por cada imagen seleccionada (1..10).
   * Las historias no llevan caption.
   * @param idGaleria UUID de la galería
   * @param ids       UUID de las imágenes seleccionadas (1..10)
   */
  publicarHistoria(idGaleria: string, ids: string[]): Observable<HttpResponse<any>> {
    const body = {
      id_galeria: idGaleria,
      ids: ids
    };
    return this.http.post(`${this.base}/publicar-historia`, body, { observe: 'response' });
  }
}