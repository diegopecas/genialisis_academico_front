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
export class InformesEstudiantesService {

  private servicio = environment.api + 'informes-estudiantes';

  constructor(private http: HttpClient) {}

  /** Estudiantes del grupo con el estado de su informe en el corte */
  obtenerEstadoPorGrupo(idGrupo: any, idCorte: any): Observable<HttpResponse<Object>> {
    return this.http
      .get<HttpResponse<Object>>(`${this.servicio}/grupo/${idGrupo}/corte/${idCorte}`, {
        observe: 'response',
      })
      .pipe(
        tap((response: HttpResponse<Object>) => {
          let respuesta: any = response.body;
          if (respuesta && respuesta.error) {
            throw respuesta.error;
          }
          return response;
        }),
        catchError(this.handleError)
      );
  }

  /** Informe completo: maestro, secciones, filas y textos */
  obtenerPorEstudianteCorte(idEstudiante: any, idCorte: any): Observable<HttpResponse<Object>> {
    return this.http
      .get<HttpResponse<Object>>(`${this.servicio}/estudiante/${idEstudiante}/corte/${idCorte}`, {
        observe: 'response',
      })
      .pipe(
        tap((response: HttpResponse<Object>) => {
          let respuesta: any = response.body;
          if (respuesta && respuesta.error) {
            throw respuesta.error;
          }
          return response;
        }),
        catchError(this.handleError)
      );
  }

  /** Crea el informe y siembra sus filas sin calificar */
  generar(elemento: any): Observable<any> {
    var body = JSON.stringify(elemento);
    return this.http.post<any>(this.servicio + '/generar', body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta && respuesta.error) {
          console.log(respuesta);
          throw respuesta.error;
        }
        console.log(respuesta);
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  guardar(elemento: any): Observable<any> {
    var body = JSON.stringify(elemento);
    return this.http.put<any>(this.servicio + '/guardar', body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta && respuesta.error) {
          console.log(respuesta);
          throw respuesta.error;
        }
        console.log(respuesta);
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  confirmar(elemento: any): Observable<any> {
    var body = JSON.stringify(elemento);
    return this.http.put<any>(this.servicio + '/confirmar', body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta && respuesta.error) {
          console.log(respuesta);
          throw respuesta.error;
        }
        console.log(respuesta);
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  reabrir(elemento: any): Observable<any> {
    var body = JSON.stringify(elemento);
    return this.http.put<any>(this.servicio + '/reabrir', body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta && respuesta.error) {
          console.log(respuesta);
          throw respuesta.error;
        }
        console.log(respuesta);
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse) {
    return throwError(() => error);
  }
}
