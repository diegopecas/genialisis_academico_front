import { Injectable } from '@angular/core';
import { HttpClient, HttpResponse, HttpErrorResponse } from '@angular/common/http';
import { catchError, tap } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { httpOptions } from './http';

@Injectable({
  providedIn: 'root',
})
export class AreasFisicasXProcesosLimpiezaConfigService {

  private servicio = environment.api + 'config-aseo';

  constructor(private http: HttpClient) { }

  obtenerConfiguracion(idProceso: any) {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + '/configuracion', {
        params: { id_proceso: idProceso.toString() },
        observe: 'response',
      })
      .pipe(
        tap((response: HttpResponse<Object>) => {
          let respuesta: any = response.body;
          if (respuesta?.error) {
            throw respuesta.error;
          }
          return response;
        }),
        catchError(this.handleError)
      );
  }

  asignarLote(datos: any) {
    return this.http
      .post<HttpResponse<Object>>(this.servicio + '/asignar-lote', datos, {
        ...httpOptions,
        observe: 'response',
      })
      .pipe(
        tap((response: HttpResponse<Object>) => {
          let respuesta: any = response.body;
          if (respuesta?.error) {
            throw respuesta.error;
          }
          return response;
        }),
        catchError(this.handleError)
      );
  }

  quitarLote(datos: any) {
    return this.http
      .post<HttpResponse<Object>>(this.servicio + '/quitar-lote', datos, {
        ...httpOptions,
        observe: 'response',
      })
      .pipe(
        tap((response: HttpResponse<Object>) => {
          let respuesta: any = response.body;
          if (respuesta?.error) {
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