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
export class NotificacionesDestinatariosService {
  private servicio = environment.api + 'notificaciones-destinatarios';

  constructor(private http: HttpClient) {}

  obtenerMisNotificaciones() {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + '/mis-notificaciones', { observe: 'response' })
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

  obtenerNoLeidas() {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + '/no-leidas', { observe: 'response' })
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

  obtenerResumen(idNotificacion: any) {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + `/resumen/${idNotificacion}`, { observe: 'response' })
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

  marcarLeida(idDestinatario: any) {
    var body = JSON.stringify({ id_destinatario: idDestinatario });
    return this.http.post<any>(this.servicio + '/marcar-leida', body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) {
          throw respuesta.error;
        }
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  responder(idDestinatario: any, idRespuestaOpcion: any) {
    var body = JSON.stringify({
      id_destinatario: idDestinatario,
      id_respuesta_opcion: idRespuestaOpcion,
    });
    return this.http.post<any>(this.servicio + '/responder', body, httpOptions).pipe(
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
