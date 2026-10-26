import { HttpClient, HttpErrorResponse, HttpParams, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { httpOptions } from './http';

/**
 * Reservas de sesiones: el puesto de un estudiante en una sesion. Lo que se
 * puede hacer depende de las reglas de reserva del curso.
 */
@Injectable({
  providedIn: 'root'
})
export class ReservasSesionesCursosExtraService {

  private servicio = environment.api + 'reservas-sesiones-cursos-extra';

  constructor(private http: HttpClient) {}

  obtenerBySesion(id_sesion_curso_extra: any): Observable<HttpResponse<Object>> {
    return this.http
      .get<HttpResponse<Object>>(`${this.servicio}/sesion/${id_sesion_curso_extra}`, { observe: 'response' })
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

  obtenerByInscripcion(id_estudiante_x_curso_extra: any): Observable<HttpResponse<Object>> {
    return this.http
      .get<HttpResponse<Object>>(`${this.servicio}/inscripcion/${id_estudiante_x_curso_extra}`, { observe: 'response' })
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

  /** Body: { id_sesion_curso_extra, id_estudiante_x_curso_extra, en_clase? } */
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

  /** Body: { id } */
  cancelar(elemento: any): Observable<any> {
    return this.http.put<any>(`${this.servicio}/cancelar`, JSON.stringify(elemento), httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta && respuesta.error) {
          throw respuesta.error;
        }
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  /** Body: { id, id_sesion_destino } */
  reagendar(elemento: any): Observable<any> {
    return this.http.put<any>(`${this.servicio}/reagendar`, JSON.stringify(elemento), httpOptions).pipe(
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
