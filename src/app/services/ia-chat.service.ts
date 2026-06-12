import {
  HttpClient,
  HttpErrorResponse,
  HttpHeaders,
  HttpResponse
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { httpOptions } from './http';

// Headers silenciosos (no activan spinner ni notificaciones de error)
const silentOptions = {
  headers: new HttpHeaders({
    'Content-Type': 'application/json',
    'X-Silent': 'true'
  })
};

const silentGetOptions = {
  observe: 'response' as const,
  headers: new HttpHeaders({
    'X-Silent': 'true'
  })
};

@Injectable({
  providedIn: 'root'
})
export class IaChatService {

  private servicioChat = environment.api + 'ia-chat';

  constructor(private http: HttpClient) {}

  enviarMensaje(id_persona: any, mensaje: any, id_conversacion?: any) {
    const body = JSON.stringify({
      id_persona: id_persona,
      mensaje: mensaje,
      id_conversacion: id_conversacion || null
    });

    return this.http.post<any>(this.servicioChat + '/enviar', body, silentOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) {
          console.log(respuesta);
          throw respuesta.error;
        }
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  listarConversaciones(id_persona: any) {
    return this.http
      .get<HttpResponse<Object>>(this.servicioChat + `/conversaciones/${id_persona}`, silentGetOptions)
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

  obtenerConversacion(id_conversacion: any) {
    return this.http
      .get<HttpResponse<Object>>(this.servicioChat + `/conversacion/${id_conversacion}`, silentGetOptions)
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

  eliminarConversacion(id_conversacion: any) {
    return this.http.delete<any>(this.servicioChat + `/conversacion/${id_conversacion}`, silentOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) {
          console.log(respuesta);
          throw respuesta.error;
        }
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  obtenerLog(limite: number = 50, offset: number = 0) {
    return this.http
      .get<HttpResponse<Object>>(this.servicioChat + `/admin/log?limite=${limite}&offset=${offset}`, { observe: 'response' })
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

  verificarAccesoInstitucional(id_persona: any) {
    return this.http
      .get<HttpResponse<Object>>(this.servicioChat + `/acceso-institucional/${id_persona}`, silentGetOptions)
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

  verificarAccesoPadres(id_persona: any) {
    return this.http
      .get<HttpResponse<Object>>(this.servicioChat + `/acceso-padres/${id_persona}`, silentGetOptions)
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

  private handleError(error: HttpErrorResponse) {
    return throwError(() => error);
  }
}