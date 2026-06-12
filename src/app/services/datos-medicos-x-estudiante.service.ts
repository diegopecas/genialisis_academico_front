import {
  HttpClient,
  HttpErrorResponse,
  HttpResponse,
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { httpOptions } from './http';

@Injectable({
  providedIn: 'root'
})
export class DatosMedicosXEstudianteService {

  private servicio = environment.api + 'datos-medicos-x-estudiante';

  constructor(private http: HttpClient) { }

  obtenerPorEstudiante(idEstudiante: any) {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + '/' + idEstudiante, { observe: 'response' })
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

  guardarPorEstudiante(idEstudiante: any, datos: any[]) {
    const body = JSON.stringify({
      id_estudiante: idEstudiante,
      datos: datos
    });
    return this.http.post<any>(this.servicio, body, httpOptions).pipe(
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