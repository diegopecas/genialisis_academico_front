import {
  HttpClient,
  HttpErrorResponse,
  HttpResponse,
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { httpOptions } from './http';

@Injectable({
  providedIn: 'root'
})
export class HorariosEstudianteService {

  private servicio = environment.api + 'horarios-estudiante';

  constructor(private http: HttpClient) { }

  obtenerPorEstudiante(idEstudiante: any) {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + `/${idEstudiante}`, {
        observe: 'response',
      })
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

  actualizar(horario: any) {
    const body = JSON.stringify(horario);
    return this.http.put<any>(this.servicio, body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) throw respuesta.error;
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  guardarTodos(data: any) {
    const body = JSON.stringify(data);
    return this.http.post<any>(this.servicio + '/guardar-todos', body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) throw respuesta.error;
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  inicializarDesdeDefault(idEstudiante: any) {
    const body = JSON.stringify({ id_estudiante: idEstudiante });
    return this.http.post<any>(this.servicio + '/inicializar', body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) throw respuesta.error;
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse) {
    return throwError(() => error);
  }
}