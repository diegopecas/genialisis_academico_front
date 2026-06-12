import { HttpClient, HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { httpOptions } from './http';

@Injectable({
  providedIn: 'root'
})
export class ContabilizacionesService {

  private servicio = environment.api + 'contabilizaciones';

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

  obtenerTodosConFiltros(queryString: string) {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + queryString, { observe: 'response' })
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

  // NUEVO: Método para reporte con filtros avanzados (incluye colaborador)
  obtenerParaReporte(queryString: string) {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + '/reporte' + queryString, { observe: 'response' })
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

  obtenerById(id: any) {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + '/' + id, { observe: 'response' })
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

  obtenerDetalle(idContabilizacion: any) {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + '/' + idContabilizacion + '/detalle', { observe: 'response' })
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

  // Cruzar actividades de UN colaborador (modo manual)
  cruzarActividades(idsPermisos: any[], idsHorasAdicionales: any[], idUsuario: any, observaciones?: string) {
    const body = JSON.stringify({
      ids_permisos: idsPermisos,
      ids_horas_adicionales: idsHorasAdicionales,
      id_usuario_contabilizacion: idUsuario,
      observaciones: observaciones
    });
    return this.http.post<any>(this.servicio + '/cruzar', body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) throw respuesta.error;
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  // NUEVO: Cruzar múltiples colaboradores en una sola llamada
  cruzarMultiplesColaboradores(colaboradores: any[], idUsuario: any, observaciones?: string) {
    const body = JSON.stringify({
      colaboradores: colaboradores,
      id_usuario_contabilizacion: idUsuario,
      observaciones: observaciones
    });
    return this.http.post<any>(this.servicio + '/cruzar-multiples', body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) throw respuesta.error;
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  contabilizarParaNomina(ids: any[], idTipoContabilizacion: any, idUsuario: any, observaciones?: string) {
    const body = JSON.stringify({
      ids: ids,
      id_tipo_contabilizacion: idTipoContabilizacion,
      id_usuario_contabilizacion: idUsuario,
      observaciones: observaciones
    });
    return this.http.post<any>(this.servicio + '/nomina', body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) throw respuesta.error;
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  eliminar(id: any) {
    const body = JSON.stringify({ id: id });
    return this.http.delete<any>(this.servicio, {
      ...httpOptions,
      body: body
    }).pipe(
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