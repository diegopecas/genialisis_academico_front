import { Injectable } from '@angular/core';
import { HttpClient, HttpResponse, HttpErrorResponse } from '@angular/common/http';
import { catchError, tap } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { httpOptions } from './http';

@Injectable({
  providedIn: 'root',
})
export class AreasFisicasXProcesosLimpiezaConsumoService {

  // Las rutas viven bajo registros-limpieza (según lo definido en el backend)
  private servicio = environment.api + 'registros-limpieza/consumo-general';

  constructor(private http: HttpClient) { }

  obtenerPorAreaProceso(idArea: any, idProceso: any) {
    return this.http
      .get<HttpResponse<Object>>(this.servicio, {
        params: {
          id_area: idArea.toString(),
          id_proceso: idProceso.toString(),
        },
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

  obtenerProductosDisponibles() {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + '/productos', {
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

  crear(datos: any) {
    return this.http
      .post<HttpResponse<Object>>(this.servicio, datos, {
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

  actualizar(datos: any) {
    return this.http
      .put<HttpResponse<Object>>(this.servicio, datos, {
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

  eliminar(id: any) {
    return this.http
      .delete<HttpResponse<Object>>(this.servicio, {
        ...httpOptions,
        body: { id },
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