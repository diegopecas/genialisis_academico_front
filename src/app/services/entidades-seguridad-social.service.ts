import {
  HttpClient,
  HttpErrorResponse,
  HttpResponse,
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

/**
 * Entidades de seguridad social (AFP, EPS, ARL y cajas de compensacion).
 * Catalogo global de solo lectura.
 */
@Injectable({
  providedIn: 'root'
})
export class EntidadesSeguridadSocialService {

  private servicio = environment.api + 'entidades-seguridad-social';

  constructor(private http: HttpClient) {}

  obtenerTodos() {
    return this.http
      .get<HttpResponse<Object>>(this.servicio, { observe: 'response' })
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

  /** Entidades de un tipo: AFP, EPS, ARL o CCF */
  obtenerPorTipo(codigo: string) {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + '/tipo/' + codigo, { observe: 'response' })
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
