import { HttpClient, HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { httpOptions } from './http';

/**
 * Estado y calificación de la tarea por estudiante (tabla tareas_estudiantes_x_estudiante).
 */
@Injectable({
  providedIn: 'root'
})
export class TareasEstudiantesXEstudianteService {

  private servicio = environment.api + 'tareas-estudiantes-x-estudiante';

  constructor(private http: HttpClient) { }

  /** Valores de la valoración del jardín. */
  obtenerEscala() {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + '/escala', { observe: 'response' })
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

  calificar(elemento: any) {
    const body = JSON.stringify(elemento);
    return this.http.put<any>(this.servicio + '/calificar', body, httpOptions).pipe(
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
