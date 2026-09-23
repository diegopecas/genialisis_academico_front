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

  /** Estudiantes que ya tienen informe del módulo nuevo en un corte */
  obtenerGruposConInforme(idCorte: any): Observable<HttpResponse<Object>> {
    return this.http
      .get<HttpResponse<Object>>(`${this.servicio}/con-informe/corte/${idCorte}`, {
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

  /**
   * Todos los informes del grupo con sus secciones y filas, en una sola
   * consulta. La pantalla trabaja sobre esto en memoria y no vuelve al
   * servidor al cambiar de estudiante, de vista o de sección.
   */
  obtenerGrupoCompleto(idGrupo: any, idCorte: any): Observable<HttpResponse<Object>> {
    return this.http
      .get<HttpResponse<Object>>(`${this.servicio}/grupo-completo/${idGrupo}/corte/${idCorte}`, {
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

  /** Secciones configuradas que aplican al grado del grupo */
  obtenerSeccionesPorGrupo(idGrupo: any): Observable<HttpResponse<Object>> {
    return this.http
      .get<HttpResponse<Object>>(`${this.servicio}/secciones-grupo/${idGrupo}`, {
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

  /** Vista masiva: una sección para todo el grupo */
  obtenerSeccionPorGrupo(idGrupo: any, idCorte: any, idSeccion: any): Observable<HttpResponse<Object>> {
    return this.http
      .get<HttpResponse<Object>>(`${this.servicio}/seccion-grupo/${idGrupo}/corte/${idCorte}/seccion/${idSeccion}`, {
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

  /** Guarda de una todos los estudiantes de la vista masiva */
  guardarMasivo(elemento: any): Observable<any> {
    var body = JSON.stringify(elemento);
    return this.http.put<any>(this.servicio + '/guardar-masivo', body, httpOptions).pipe(
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

  /** Genera varios informes en una sola llamada */
  generarMasivo(elemento: any): Observable<any> {
    var body = JSON.stringify(elemento);
    return this.http.post<any>(this.servicio + '/generar-masivo', body, httpOptions).pipe(
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
