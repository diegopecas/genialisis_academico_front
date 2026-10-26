import { HttpClient, HttpErrorResponse, HttpParams, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { httpOptions } from './http';

/**
 * Reglas de reserva de un curso extra (uno a uno). Un curso sin configurar
 * llega con los valores de fijo y configurado = 0.
 */
@Injectable({
  providedIn: 'root'
})
export class ConfiguracionReservasCursosExtraService {

  private servicio = environment.api + 'configuracion-reservas-cursos-extra';

  constructor(private http: HttpClient) {}

  obtenerByCurso(id_curso_extra: any): Observable<HttpResponse<Object>> {
    return this.http
      .get<HttpResponse<Object>>(`${this.servicio}/curso/${id_curso_extra}`, { observe: 'response' })
      .pipe(
        tap((response: HttpResponse<Object>) => {
          const respuesta: any = response.body;
          if (respuesta && respuesta.error) {
            throw respuesta.error;
          }
          return response;
        }),
        catchError(this.handleError)
      );
  }

  /** Crea o actualiza las reglas del curso. */
  guardar(elemento: any): Observable<any> {
    return this.http.put<any>(this.servicio, JSON.stringify(elemento), httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta && respuesta.error) {
          throw respuesta.error;
        }
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    return throwError(() => error);
  }
}
