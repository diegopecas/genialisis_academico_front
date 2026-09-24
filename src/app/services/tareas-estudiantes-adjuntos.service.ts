import { HttpClient, HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { httpOptions } from './http';

/**
 * Adjuntos de la tarea (tabla tareas_estudiantes_adjuntos).
 */
@Injectable({
  providedIn: 'root'
})
export class TareasEstudiantesAdjuntosService {

  private servicio = environment.api + 'tareas-estudiantes-adjuntos';

  constructor(private http: HttpClient) { }

  subir(idTarea: any, archivo: File) {
    const formData = new FormData();
    formData.append('id_tarea_estudiante', idTarea);
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
   * Descarga el archivo como blob. El backend valida el acceso.
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
    const body = JSON.stringify(elemento);
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
