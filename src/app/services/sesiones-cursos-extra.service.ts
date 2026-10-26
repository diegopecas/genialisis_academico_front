import { HttpClient, HttpErrorResponse, HttpParams, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { httpOptions } from './http';

/**
 * Sesiones de cursos extra: la clase de un curso en un dia y hora. Desde aqui
 * se generan, se crean sueltas, se cancelan o reabren y se registra la
 * asistencia (que tambien deja las horas del profesor y el consumo del
 * paquete).
 */
@Injectable({
  providedIn: 'root'
})
export class SesionesCursosExtraService {

  private servicio = environment.api + 'sesiones-cursos-extra';

  constructor(private http: HttpClient) {}

  /** Sesiones de un rango. Filtros: fecha_desde, fecha_hasta, id_curso_extra, id_docente. */
  obtenerTodas(filtros: any): Observable<HttpResponse<Object>> {
    let parametros = new HttpParams();
    Object.keys(filtros || {}).forEach((llave) => {
      const valor = (filtros as any)[llave];
      if (valor !== null && valor !== undefined && valor !== '') {
        parametros = parametros.set(llave, valor);
      }
    });
    return this.http
      .get<HttpResponse<Object>>(this.servicio, { observe: 'response', params: parametros })
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

  /** La sesion con docentes, reservas y reglas del curso. */
  obtenerById(id: any): Observable<HttpResponse<Object>> {
    return this.http
      .get<HttpResponse<Object>>(`${this.servicio}/${id}`, { observe: 'response' })
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

  /** Docente del usuario en sesion ({ id_docente }), para "Solo mis clases". */
  obtenerMiDocente(): Observable<HttpResponse<Object>> {
    return this.http
      .get<HttpResponse<Object>>(`${this.servicio}/mi-docente`, { observe: 'response' })
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

  /**
   * Devuelve el id de la sesion de un horario en una fecha y la crea si
   * todavia no existe. Body: { id_horario_curso_extra, fecha }
   */
  materializar(elemento: any): Observable<any> {
    return this.http.post<any>(`${this.servicio}/materializar`, JSON.stringify(elemento), httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta && respuesta.error) {
          throw respuesta.error;
        }
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  /** Sesion suelta. */
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

  actualizar(elemento: any): Observable<any> {
    return this.http.put<any>(this.servicio, JSON.stringify(elemento), httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta && respuesta.error) {
          throw respuesta.error;
        }
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  /** Body: { id, motivo_cancelacion } */
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

  /** Body: { id } */
  reabrir(elemento: any): Observable<any> {
    return this.http.put<any>(`${this.servicio}/reabrir`, JSON.stringify(elemento), httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta && respuesta.error) {
          throw respuesta.error;
        }
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  /** Body: { id, reservas: [{id, codigo_estado}], docentes?, observaciones? } */
  registrarAsistencia(elemento: any): Observable<any> {
    return this.http.put<any>(`${this.servicio}/asistencia`, JSON.stringify(elemento), httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta && respuesta.error) {
          throw respuesta.error;
        }
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  eliminar(elemento: any): Observable<any> {
    return this.http.request<any>('DELETE', this.servicio, { body: JSON.stringify(elemento), headers: httpOptions.headers }).pipe(
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
