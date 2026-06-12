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
export class CalendariosService {
  private servicio = environment.api + 'calendarios';

  constructor(private http: HttpClient) {}

  obtenerTodos() {
    return this.http
      .get<HttpResponse<Object>>(this.servicio, { observe: 'response' })
      .pipe(
        tap((response: HttpResponse<Object>) => {
          let respuesta: any = response.body;
          if (respuesta.error) throw respuesta.error;
          return response;
        }),
        catchError(this.handleError)
      );
  }

  obtenerById(id: any) {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + `/${id}`, { observe: 'response' })
      .pipe(
        tap((response: HttpResponse<Object>) => {
          let respuesta: any = response.body;
          if (respuesta.error) throw respuesta.error;
          return response;
        }),
        catchError(this.handleError)
      );
  }

  obtenerCalendarioMes(anio: number, mes: number) {
    return this.http
      .get<HttpResponse<Object>>(`${this.servicio}/mes/${anio}/${mes}`, { observe: 'response' })
      .pipe(
        tap((response: HttpResponse<Object>) => {
          let respuesta: any = response.body;
          if (respuesta.error) throw respuesta.error;
          return response;
        }),
        catchError(this.handleError)
      );
  }

  obtenerDiasHabiles(fecha_inicial: string, fecha_final: string) {
    return this.http
      .get<HttpResponse<Object>>(`${this.servicio}/habiles/${fecha_inicial}/${fecha_final}`, { observe: 'response' })
      .pipe(
        tap((response: HttpResponse<Object>) => {
          let respuesta: any = response.body;
          if (respuesta.error) throw respuesta.error;
          return response;
        }),
        catchError(this.handleError)
      );
  }

  obtenerPorRangoFechas(fecha_inicial: string, fecha_final: string) {
    return this.http
      .get<HttpResponse<Object>>(`${this.servicio}/rango/${fecha_inicial}/${fecha_final}`, { observe: 'response' })
      .pipe(
        tap((response: HttpResponse<Object>) => {
          let respuesta: any = response.body;
          if (respuesta.error) throw respuesta.error;
          return response;
        }),
        catchError(this.handleError)
      );
  }

  crear(elemento: any) {
    const datosNecesarios = {
      fecha: elemento.fecha,
      id_tipo_dia: elemento.id_tipo_dia
    };
    var body = JSON.stringify(datosNecesarios);
    return this.http.post<any>(this.servicio, body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) throw respuesta.error;
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  actualizar(elemento: any) {
    const datosNecesarios = {
      id: elemento.id,
      fecha: elemento.fecha,
      id_tipo_dia: elemento.id_tipo_dia
    };
    var body = JSON.stringify(datosNecesarios);
    return this.http.put<any>(this.servicio, body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) throw respuesta.error;
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  eliminar(elemento: any) {
    var body = JSON.stringify(elemento);
    return this.http.request<any>('DELETE', this.servicio, {
      body: body,
      headers: httpOptions.headers
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