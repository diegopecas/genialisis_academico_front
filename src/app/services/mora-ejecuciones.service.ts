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
export class MoraEjecucionesService {

  private servicio = environment.api + 'mora-ejecuciones';
  private motor = environment.api + 'mora';

  constructor(private http: HttpClient) { }

  obtenerTodos(limite: number = 60) {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + `?limite=${limite}`, { observe: 'response' })
      .pipe(
        tap((response: HttpResponse<Object>) => {
          let respuesta: any = response.body;
          if (respuesta.error) throw respuesta.error;
          return response;
        }),
        catchError(this.handleError)
      );
  }

  obtenerEstado() {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + '/estado', { observe: 'response' })
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
      .get<HttpResponse<Object>>(this.servicio + `/${id}`, {
        observe: 'response',
      })
      .pipe(
        tap((response: HttpResponse<Object>) => {
          let respuesta: any = response.body;
          if (respuesta.error) throw respuesta.error;
          return response;
        }),
        catchError(this.handleError)
      );
  }

  /** Dispara la liquidacion manualmente. Sin fecha_corte usa el dia de hoy. */
  liquidar(elemento: any) {
    const body = JSON.stringify(elemento);
    return this.http.post<any>(this.motor + '/liquidar', body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) throw respuesta.error;
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  /** Respaldo del cron: liquida solo si hoy todavia no se ha corrido. */
  liquidarSiHaceFalta(elemento: any) {
    const body = JSON.stringify(elemento);
    return this.http.post<any>(this.motor + '/liquidar-si-hace-falta', body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) throw respuesta.error;
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  /** Simula la mora de una persona sin persistir nada. */
  simularPorPersona(id_persona: any, fecha_corte: any = null) {
    const query = fecha_corte ? `?fecha_corte=${fecha_corte}` : '';
    return this.http
      .get<HttpResponse<Object>>(this.motor + `/simular/persona/${id_persona}${query}`, {
        observe: 'response',
      })
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
