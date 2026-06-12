import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpResponse, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuditoriaService {
  private servicio = environment.api + 'auditoria';

  constructor(private http: HttpClient) { }

  obtenerResumenCompleto(fechaInicio: string, fechaFin: string, idSprint?: number): Observable<HttpResponse<Object>> {
    let params = new HttpParams()
      .set('fecha_inicio', fechaInicio)
      .set('fecha_fin', fechaFin);

    if (idSprint) {
      params = params.set('id_sprint', idSprint.toString());
    }

    return this.http
      .get<HttpResponse<Object>>(`${this.servicio}/resumen-completo`, {
        params,
        observe: 'response'
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
  obtenerDetalleMedidas(idGrupo: number, fechaInicio: string, fechaFin: string): Observable<HttpResponse<Object>> {
    const params = new HttpParams()
      .set('id_grupo', idGrupo.toString())
      .set('fecha_inicio', fechaInicio)
      .set('fecha_fin', fechaFin);

    return this.http
      .get<HttpResponse<Object>>(`${this.servicio}/detalle-medidas`, {
        params,
        observe: 'response'
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

  obtenerDetalleAsistencia(idGrupo: number, fechaInicio: string, fechaFin: string): Observable<HttpResponse<Object>> {
    const params = new HttpParams()
      .set('id_grupo', idGrupo.toString())
      .set('fecha_inicio', fechaInicio)
      .set('fecha_fin', fechaFin);

    return this.http
      .get<HttpResponse<Object>>(`${this.servicio}/detalle-asistencia`, {
        params,
        observe: 'response'
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

  obtenerDetalleClases(idGrupo: number, idSprint?: number): Observable<HttpResponse<Object>> {
    let params = new HttpParams()
      .set('id_grupo', idGrupo.toString());

    if (idSprint) {
      params = params.set('id_sprint', idSprint.toString());
    }

    return this.http
      .get<HttpResponse<Object>>(`${this.servicio}/detalle-clases`, {
        params,
        observe: 'response'
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
  private handleError(error: HttpErrorResponse) {
    return throwError(() => error);
  }
}