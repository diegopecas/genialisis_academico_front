import { HttpClient, HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { httpOptions } from './http';

/**
 * Responsables de la tarea (tabla tareas_estudiantes_responsables): reciben la alerta de las preguntas.
 */
@Injectable({
  providedIn: 'root'
})
export class TareasEstudiantesResponsablesService {

  private servicio = environment.api + 'tareas-estudiantes-responsables';

  constructor(private http: HttpClient) { }

  /** Colaboradores activos para marcar como responsables. */
  obtenerColaboradores() {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + '/colaboradores', { observe: 'response' })
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
