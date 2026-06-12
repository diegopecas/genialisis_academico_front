import { HttpClient, HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { httpOptions } from './http';

@Injectable({
  providedIn: 'root'
})
export class GoogleCalendarService {

  private servicio = environment.api + 'google-calendar';

  constructor(private http: HttpClient) { }

  obtenerUrlAutorizacion() {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + '/autorizar', { observe: 'response' })
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

  verificarConexion() {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + '/verificar-conexion', { observe: 'response' })
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

  crearEventoDesdeTarea(idTarea: number) {
    const body = JSON.stringify({ id_tarea: idTarea });
    return this.http.post<any>(this.servicio + '/evento-tarea', body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) {
          throw respuesta.error;
        }
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  crearEventoDesdeActividad(idActividad: number) {
    const body = JSON.stringify({ id_actividad: idActividad });
    return this.http.post<any>(this.servicio + '/evento-actividad', body, httpOptions).pipe(
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