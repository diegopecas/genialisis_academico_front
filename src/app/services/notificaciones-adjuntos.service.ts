import {
  HttpClient,
  HttpErrorResponse,
  HttpResponse,
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { httpOptions } from './http';

@Injectable({
  providedIn: 'root',
})
export class NotificacionesAdjuntosService {
  private servicio = environment.api + 'notificaciones-adjuntos';

  constructor(private http: HttpClient) {}

  obtenerByNotificacion(idNotificacion: any) {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + `/notificacion/${idNotificacion}`, { observe: 'response' })
      .pipe(
        tap((response: HttpResponse<Object>) => {
          let respuesta: any = response.body;
          if (respuesta.error) {
            throw respuesta.error;
          }
          return response;
        }),
        catchError(this.handleError)
      );
  }

  obtenerById(id: any) {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + `/${id}`, { observe: 'response' })
      .pipe(
        tap((response: HttpResponse<Object>) => {
          let respuesta: any = response.body;
          if (respuesta.error) {
            throw respuesta.error;
          }
          return response;
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Sube el archivo como multipart. No se usa httpOptions a proposito: el
   * navegador debe fijar el Content-Type con el boundary del FormData.
   */
  subir(idNotificacion: any, archivo: File) {
    const formData = new FormData();
    formData.append('id_notificacion', idNotificacion);
    formData.append('archivo', archivo);

    return this.http.post<any>(this.servicio + '/subir', formData).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) {
          throw respuesta.error;
        }
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Descarga el archivo como blob. El backend valida que el usuario tenga
   * derecho a ese adjunto antes de entregarlo.
   */
  descargar(id: any) {
    return this.http
      .get(this.servicio + `/descargar/${id}`, {
        observe: 'response',
        responseType: 'blob',
      })
      .pipe(catchError(this.handleError));
  }

  eliminar(elemento: any) {
    var body = JSON.stringify(elemento);
    return this.http.request<any>('DELETE', this.servicio, {
      body: body,
      headers: httpOptions.headers
    }).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) {
          throw respuesta.error;
        }
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse) {
    return throwError(() => error);
  }
}
