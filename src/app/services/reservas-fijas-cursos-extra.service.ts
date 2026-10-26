import { HttpClient, HttpErrorResponse, HttpParams, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { httpOptions } from './http';

/**
 * Reservas fijas: "voy todos los sabados de 8 a 10".
 */
@Injectable({
  providedIn: 'root'
})
export class ReservasFijasCursosExtraService {

  private servicio = environment.api + 'reservas-fijas-cursos-extra';

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

  obtenerById(id: any): Observable<HttpResponse<Object>> {
    return this.http
      .get<HttpResponse<Object>>(`${this.servicio}/${id}`, { observe: 'response' })
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

  crear(elemento: any): Observable<any> {
    return this.http.post<any>(this.servicio, JSON.stringify(elemento), httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta && respuesta.error) {
          throw respuesta.error;
        }
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  actualizar(elemento: any): Observable<any> {
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

  eliminar(elemento: any): Observable<any> {
    return this.http.request<any>('DELETE', this.servicio, { body: JSON.stringify(elemento), headers: httpOptions.headers }).pipe(
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
