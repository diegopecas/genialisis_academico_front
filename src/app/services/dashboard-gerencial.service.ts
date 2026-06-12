import {
  HttpClient,
  HttpErrorResponse,
  HttpHeaders,
  HttpParams,
  HttpResponse,
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class DashboardGerencialService {

  private servicio = environment.api + 'dashboard-gerencial';

  constructor(private http: HttpClient) { }

  obtenerResumen(fecha?: string, silencioso: boolean = false) {
    let headers = new HttpHeaders();
    if (silencioso) {
      headers = headers.set('X-Silent', 'true');
    }
    const params = new HttpParams().set('fecha', fecha || '');

    return this.http
      .get<HttpResponse<Object>>(`${this.servicio}/resumen`, { params, headers, observe: 'response' })
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

  obtenerAsistenciaDetalle(fecha?: string) {
    const params = new HttpParams().set('fecha', fecha || '');

    return this.http
      .get<HttpResponse<Object>>(`${this.servicio}/asistencia-detalle`, { params, observe: 'response' })
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

  obtenerColaboradoresDetalle(fecha?: string) {
    const params = new HttpParams().set('fecha', fecha || '');

    return this.http
      .get<HttpResponse<Object>>(`${this.servicio}/colaboradores-detalle`, { params, observe: 'response' })
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

  obtenerCarteraResumen(fecha?: string, silencioso: boolean = false) {
    let headers = new HttpHeaders();
    if (silencioso) {
      headers = headers.set('X-Silent', 'true');
    }
    const params = new HttpParams().set('fecha', fecha || '');

    return this.http
      .get<HttpResponse<Object>>(`${this.servicio}/cartera-resumen`, { params, headers, observe: 'response' })
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

  obtenerCarteraDetalle() {
    return this.http
      .get<HttpResponse<Object>>(`${this.servicio}/cartera-detalle`, { observe: 'response' })
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

  obtenerRecaudoResumen(fecha?: string, silencioso: boolean = false) {
    let headers = new HttpHeaders();
    if (silencioso) {
      headers = headers.set('X-Silent', 'true');
    }
    const params = new HttpParams().set('fecha', fecha || '');

    return this.http
      .get<HttpResponse<Object>>(`${this.servicio}/recaudo-resumen`, { params, headers, observe: 'response' })
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

  obtenerRecaudoDetalle(fecha?: string, rango: 'hoy' | 'mes' | 'anio' = 'mes') {
    const params = new HttpParams()
      .set('fecha', fecha || '')
      .set('rango', rango);

    return this.http
      .get<HttpResponse<Object>>(`${this.servicio}/recaudo-detalle`, { params, observe: 'response' })
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

  obtenerMovimientosResumen(fecha?: string, silencioso: boolean = false) {
    let headers = new HttpHeaders();
    if (silencioso) {
      headers = headers.set('X-Silent', 'true');
    }
    const params = new HttpParams().set('fecha', fecha || '');

    return this.http
      .get<HttpResponse<Object>>(`${this.servicio}/movimientos-resumen`, { params, headers, observe: 'response' })
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

  obtenerMovimientosDetalle(fecha?: string, rango: 'hoy' | 'mes' | 'anio' = 'mes') {
    const params = new HttpParams()
      .set('fecha', fecha || '')
      .set('rango', rango);

    return this.http
      .get<HttpResponse<Object>>(`${this.servicio}/movimientos-detalle`, { params, observe: 'response' })
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