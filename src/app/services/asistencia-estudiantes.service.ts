import {
  HttpClient,
  HttpErrorResponse,
  HttpParams,
  HttpResponse,
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { httpOptions } from './http';
import { UtilService } from '../common/constantes/util.service';

@Injectable({
  providedIn: 'root'
})
export class AsistenciaEstudiantesService {

  private servicio = environment.api + 'asistencia-estudiantes';
  private servicioIngreso = environment.api + 'asistencia-estudiantes-ingresos';
  private servicioNoIngreso = environment.api + 'asistencia-estudiantes-no-ingresos';
  private servicioSalida = environment.api + 'asistencia-estudiantes-salidas';
  private servicioNoSalida = environment.api + 'asistencia-estudiantes-no-salidas';

  constructor(private http: HttpClient,
    private utilService: UtilService
  ) { }

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

  obtenerNoIngresos() {

    return this.http
      .get<HttpResponse<Object>>(this.servicioNoIngreso, { observe: 'response' })
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

  obtenerNoSalidas() {
    return this.http
      .get<HttpResponse<Object>>(this.servicioNoSalida, { observe: 'response' })
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

  registroIngreso(id: any, observacion: any) {
    const id_usuario = this.utilService.obtenerIdUsuarioActual();
    const body = JSON.stringify({ id_estudiante: id, observacion: observacion, id_usuario: id_usuario });

    return this.http.post<any>(this.servicio, body, httpOptions).pipe(
      tap((respuesta: any) => {
        //Se valida que si existe un mensaje de error
        if (respuesta.error) {
          console.log(respuesta);
          throw respuesta.error;
        }
        console.log(respuesta);
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  registroSalida(id: any, observacion: any) {
    const id_usuario = this.utilService.obtenerIdUsuarioActual();
    const body = JSON.stringify({ id: id, observacion: observacion, id_usuario: id_usuario });
    console.log("registroSalida", body)
    return this.http.put<any>(this.servicio, body, httpOptions).pipe(
      tap((respuesta: any) => {
        //Se valida que si existe un mensaje de error
        if (respuesta.error) {
          console.log(respuesta);
          throw respuesta.error;
        }
        console.log(respuesta);
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }
  verificarAsistenciaEstudiante(elemento: any) {
    const body = JSON.stringify(elemento);
    return this.http.post<any>(this.servicio + '/verificar-x-dia', body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) throw respuesta.error;
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }
  obtenerAsistenciaMensual(consulta: any) {
    const body = JSON.stringify(consulta);
    return this.http.post<any>(this.servicio + '/mensual', body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) throw respuesta.error;
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }
  obtenerResumenAsistenciaPorGrupo(idGrupo: string, fechaInicio: string, fechaFin: string) {
    const params = new HttpParams()
      .set('fecha_inicio', fechaInicio)
      .set('fecha_fin', fechaFin);

    return this.http
      .get<HttpResponse<Object>>(`${this.servicio}/resumen-grupo/${idGrupo}`, {
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
  /**
   * Obtiene el reporte de asistencia por rango de fechas
   */
  obtenerReportePorFecha(filtros: { fecha_inicio?: string; fecha_fin?: string; fecha?: string }) {
    return this.http.post<any>(this.servicio + '/reporte-por-fecha', filtros, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) throw respuesta.error;
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Obtiene el reporte de indicadores de asistencia de todos los estudiantes
   * @param fecha - Fecha de referencia para los cálculos (opcional, por defecto hoy)
   */
  obtenerReporteIndicadores(fecha?: string) {
    const fechaReferencia = fecha || new Date().toISOString().split('T')[0];
    const url = `${this.servicio}-reporte-indicadores?fecha=${fechaReferencia}`;

    return this.http
      .get<any>(url)
      .pipe(
        tap((respuesta: any) => {
          if (respuesta.error) {
            throw respuesta.error;
          }
          return respuesta;
        }),
        catchError(this.handleError)
      );
  }
    // Método simple para obtener estudiantes que asistieron en una fecha específica
  obtenerEstudiantesPorFecha(fecha: string) {
    return this.http
      .get<any>(`${environment.api}asistencia-estudiantes-fecha/${fecha}`)
      .pipe(
        tap((respuesta: any) => {
          if (respuesta.error) throw respuesta.error;
          return respuesta;
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Obtiene datos de seguimiento de asistencia + acudientes en una sola llamada.
   */
  obtenerSeguimientoAsistencia(fecha?: string) {
    const fechaReferencia = fecha || new Date().toISOString().split('T')[0];
    const url = `${environment.api}seguimiento-asistencia-estudiantes?fecha=${fechaReferencia}`;

    return this.http
      .get<any>(url)
      .pipe(
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