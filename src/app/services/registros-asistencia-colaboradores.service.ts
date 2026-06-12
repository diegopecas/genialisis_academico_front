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
export class RegistrosAsistenciaColaboradoresService {

  private servicio = environment.api + 'registros-asistencia-colaboradores';

  constructor(private http: HttpClient) { }

  obtenerPorColaborador(idColaborador: any, fechaDesde?: string, fechaHasta?: string) {
    let url = this.servicio + '/colaborador/' + idColaborador;
    const params: string[] = [];
    if (fechaDesde) params.push('fecha_desde=' + fechaDesde);
    if (fechaHasta) params.push('fecha_hasta=' + fechaHasta);
    if (params.length > 0) url += '?' + params.join('&');

    return this.http
      .get<HttpResponse<Object>>(url, { observe: 'response' })
      .pipe(
        tap((response: HttpResponse<Object>) => {
          let respuesta: any = response.body;
          if (respuesta.error) throw respuesta.error;
          return response;
        }),
        catchError(this.handleError)
      );
  }

  obtenerRegistrosHoy(idColaborador: any) {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + '/hoy/' + idColaborador, { observe: 'response' })
      .pipe(
        tap((response: HttpResponse<Object>) => {
          let respuesta: any = response.body;
          if (respuesta.error) throw respuesta.error;
          return response;
        }),
        catchError(this.handleError)
      );
  }

  obtenerTiposRegistro() {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + '/tipos', { observe: 'response' })
      .pipe(
        tap((response: HttpResponse<Object>) => {
          let respuesta: any = response.body;
          if (respuesta.error) throw respuesta.error;
          return response;
        }),
        catchError(this.handleError)
      );
  }

  obtenerEstadosRegistro() {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + '/estados', { observe: 'response' })
      .pipe(
        tap((response: HttpResponse<Object>) => {
          let respuesta: any = response.body;
          if (respuesta.error) throw respuesta.error;
          return response;
        }),
        catchError(this.handleError)
      );
  }

  obtenerConfiguracionGeofence() {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + '/configuracion-geofence', { observe: 'response' })
      .pipe(
        tap((response: HttpResponse<Object>) => {
          let respuesta: any = response.body;
          if (respuesta.error) throw respuesta.error;
          return response;
        }),
        catchError(this.handleError)
      );
  }

  registrar(data: any) {
    const body = JSON.stringify(data);
    return this.http.post<any>(this.servicio, body, httpOptions).pipe(
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

  obtenerReporte(fechaDesde: string, fechaHasta: string) {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + '/reporte?fecha_desde=' + fechaDesde + '&fecha_hasta=' + fechaHasta, { observe: 'response' })
      .pipe(
        tap((response: HttpResponse<Object>) => {
          let respuesta: any = response.body;
          if (respuesta.error) throw respuesta.error;
          return response;
        }),
        catchError(this.handleError)
      );
  }

  private handleError(error: HttpErrorResponse) {
    return throwError(() => error);
  }
}