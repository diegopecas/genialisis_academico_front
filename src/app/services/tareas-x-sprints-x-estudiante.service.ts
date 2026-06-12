import {
  HttpClient,
  HttpErrorResponse,
  HttpHeaders,
  HttpResponse,
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { httpOptions } from './http';

const httpSilent = {
  headers: new HttpHeaders({
    'Content-Type': 'application/json',
    'X-Silent': '1'
  })
};

@Injectable({
  providedIn: 'root'
})
export class TareasXSprintsXEstudianteService {

  private servicio = environment.api + 'tareas-x-sprints-x-estudiante';

  constructor(private http: HttpClient) {}

  obtenerByTareaSprint(idTareaSprint: any) {
    return this.http
      .get<HttpResponse<Object>>(`${this.servicio}/tarea/${idTareaSprint}`, { observe: 'response' })
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

  crear(idTareaSprint: any, idEstudiante: any) {
    const body = JSON.stringify({
      id_tarea_x_sprint: idTareaSprint,
      id_estudiante: idEstudiante
    });
    return this.http.post<any>(this.servicio, body, httpSilent).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) {
          throw respuesta.error;
        }
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  actualizarObservacion(idTareaSprint: any, idEstudiante: any, observacion: string) {
    const body = JSON.stringify({
      id_tarea_x_sprint: idTareaSprint,
      id_estudiante: idEstudiante,
      observacion: observacion
    });
    return this.http.put<any>(`${this.servicio}/observacion`, body, httpSilent).pipe(
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