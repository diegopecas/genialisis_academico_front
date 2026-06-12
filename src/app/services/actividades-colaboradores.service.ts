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
  providedIn: 'root',
})
export class ActividadesColaboradoresService {
  private servicio = environment.api + 'actividades-colaboradores';

  constructor(private http: HttpClient) {}

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

  obtenerByColaborador(idColaborador: any) {
    return this.http
      .get<HttpResponse<Object>>(
        this.servicio + '/colaborador/' + idColaborador,
        { observe: 'response' }
      )
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

  obtenerBalanceColaborador(idColaborador: any) {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + '/balance/' + idColaborador, {
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

  obtenerPendientesAprobar() {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + '/pendientes-aprobar', {
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

  obtenerAprobadas() {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + '-aprobadas', {
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

  // NUEVO: Obtener resumen de colaboradores con actividades pendientes
  obtenerResumenColaboradoresPendientes() {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + '/resumen-pendientes', {
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

  crear(actividad: any) {
    const body = JSON.stringify(actividad);
    return this.http.post<any>(this.servicio, body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) {
          throw respuesta.error;
        }
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  eliminar(id: any) {
    const body = JSON.stringify({ id: id });
    return this.http
      .delete<any>(this.servicio, {
        ...httpOptions,
        body: body,
      })
      .pipe(
        tap((respuesta: any) => {
          if (respuesta.error) throw respuesta.error;
          return respuesta;
        }),
        catchError(this.handleError)
      );
  }

  aprobarMultiple(
    ids: any[],
    idUsuarioAprobacion: any,
    observaciones?: string
  ) {
    const body = JSON.stringify({
      ids: ids,
      id_usuario_aprobacion: idUsuarioAprobacion,
      observaciones: observaciones,
    });
    return this.http
      .post<any>(this.servicio + '/aprobar-multiple', body, httpOptions)
      .pipe(
        tap((respuesta: any) => {
          if (respuesta.error) throw respuesta.error;
          return respuesta;
        }),
        catchError(this.handleError)
      );
  }
  obtenerHistorial(queryString: string = '') {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + '-historial' + queryString, {
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

  obtenerColaboradoresActivos() {
    return this.http
      .get<HttpResponse<Object>>(environment.api + 'colaboradores/activos', {
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
  /**
   * Obtener actividades de todos los colaboradores para un mes específico
   * @param mes - Número del mes (1-12)
   * @param anio - Año (ej: 2025)
   */
  obtenerActividadesPorMes(mes: number, anio: number) {
    return this.http
      .get<HttpResponse<Object>>(
        `${this.servicio}-calendario?mes=${mes}&anio=${anio}`,
        { observe: 'response' }
      )
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

  /**
   * Obtener horarios de todos los docentes para mostrar en el calendario
   */
  obtenerHorariosDocentes() {
    return this.http
      .get<HttpResponse<Object>>(
        environment.api + 'horarios-docentes-calendario',
        { observe: 'response' }
      )
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

  /**
   * Obtener lista de colaboradores activos para filtros del calendario
   */
  obtenerColaboradoresParaCalendario() {
    return this.http
      .get<HttpResponse<Object>>(environment.api + 'colaboradores-calendario', {
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
  /**
   * Obtener lista de grupos para filtros del calendario
   */
  obtenerGruposParaCalendario() {
    return this.http
      .get<HttpResponse<Object>>(environment.api + 'grupos-calendario', {
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
  private handleError(error: HttpErrorResponse) {
    return throwError(() => error);
  }
}
