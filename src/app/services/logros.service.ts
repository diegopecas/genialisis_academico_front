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
  providedIn: 'root',
})
export class LogrosService {
  private servicio = environment.api + 'logros';

  constructor(private http: HttpClient) { }

  obtenerTodos() {
    return this.http
      .get<HttpResponse<Object>>(this.servicio, { observe: 'response' })
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

  obtenerById(id: any): Observable<HttpResponse<Object>> {
    return this.http
      .get<HttpResponse<Object>>(`${this.servicio}/${id}`, {
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

  crear(elemento: any): Observable<any> {
    var body = JSON.stringify(elemento);
    return this.http.post<any>(this.servicio, body, httpOptions).pipe(
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

  actualizar(elemento: any): Observable<any> {
    var body = JSON.stringify(elemento);
    console.log("Actualizar logro:", body);
    return this.http.put<any>(this.servicio, body, httpOptions).pipe(
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

  eliminar(elemento: any): Observable<any> {
    var body = JSON.stringify(elemento);
    return this.http.request<any>('DELETE', this.servicio, {
      body: body,
      headers: httpOptions.headers
    }).pipe(
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

  getIndicadoresLogrosByLogro(id: any): Observable<HttpResponse<Object>> {
    return this.http
      .get<HttpResponse<Object>>(`${this.servicio}/indicadores-logros/${id}`, {
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

  obtenerByGrupo(id_grupo: any): Observable<HttpResponse<Object>> {
    return this.http
      .get<HttpResponse<Object>>(environment.api + `logros-grupo/${id_grupo}`, {
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

  obtenerByAreaAcademica(id_area_academica: any): Observable<HttpResponse<Object>> {
    return this.http
      .get<HttpResponse<Object>>(environment.api + `logros-area/${id_area_academica}`, {
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

  obtenerByGrupoAndArea(id_grupo: any, id_area_academica: any): Observable<HttpResponse<Object>> {
    return this.http
      .get<HttpResponse<Object>>(environment.api + `logros-grupo-area/${id_grupo}/${id_area_academica}`, {
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

  obtenerByGrupoAreaConIndicadores(id_grupo: any, id_area_academica: any): Observable<HttpResponse<Object>> {
    return this.http
      .get<HttpResponse<Object>>(environment.api + `logros-grupo-area-indicadores/${id_grupo}/${id_area_academica}`, {
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

  // Análisis de logros por sprint
  obtenerAnalisisPorSprint(id_sprint: any): Observable<HttpResponse<Object>> {
    return this.http
      .get<HttpResponse<Object>>(environment.api + `logros/analisis/sprint/${id_sprint}`, {
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

  // Análisis de logros por corte
  obtenerAnalisisPorCorte(id_corte: any): Observable<HttpResponse<Object>> {
    return this.http
      .get<HttpResponse<Object>>(environment.api + `logros/analisis/corte/${id_corte}`, {
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

  // Análisis por áreas para sprint
  obtenerAnalisisPorAreasSprint(id_sprint: any): Observable<HttpResponse<Object>> {
    return this.http
      .get<HttpResponse<Object>>(environment.api + `logros/analisis-areas/sprint/${id_sprint}`, {
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

  // Análisis por áreas para corte
  obtenerAnalisisPorAreasCorte(id_corte: any): Observable<HttpResponse<Object>> {
    return this.http
      .get<HttpResponse<Object>>(environment.api + `logros/analisis-areas/corte/${id_corte}`, {
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

  // Obtener actividades de un logro en un sprint específico
  obtenerActividadesDeLogroEnSprint(id_logro: any, id_sprint: any): Observable<HttpResponse<Object>> {
    return this.http
      .get<HttpResponse<Object>>(environment.api + `logros/${id_logro}/actividades/sprint/${id_sprint}`, {
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

  // Obtener logros por corte académico
  obtenerPorCorte(id_corte: any): Observable<HttpResponse<Object>> {
    return this.http
      .get<HttpResponse<Object>>(environment.api + `logros/corte/${id_corte}`, {
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
  
  // Mapa completo de logros → indicadores → actividades para un corte/área/grupo/sprint
  obtenerMapaLogrosActividades(idCorte: any, idArea: any, idGrupo?: any, idSprint?: any): Observable<HttpResponse<Object>> {
    let url = environment.api + `logros/mapa-actividades/${idCorte}/${idArea}`;
    const params: string[] = [];
    if (idGrupo) params.push(`id_grupo=${idGrupo}`);
    if (idSprint) params.push(`id_sprint=${idSprint}`);
    if (params.length > 0) url += '?' + params.join('&');

    return this.http
      .get<HttpResponse<Object>>(url, { observe: 'response' })
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
  
  private handleError(error: HttpErrorResponse): Observable<never> {
    console.error('Error en LogrosService:', error);
    return throwError(() => new Error(`Ocurrió un error; por favor intente más tarde. Status: ${error.status}`));
  }
}