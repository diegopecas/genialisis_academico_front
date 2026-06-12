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
export class CuentaPagadaService {
  private servicio = environment.api + 'cuenta-pagada';

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

  obtenerById(id: any) {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + `/${id}`, {
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
  getByPagoRecibido(id_pago_recibido: any) {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + `/pago-recibido/${id_pago_recibido}`, {
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
  crear(elemento: any) {
    var body = JSON.stringify(elemento);
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

  actualizar(elemento: any) {
    var body = JSON.stringify(elemento);
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

  eliminar(elemento: any) {
    var body = JSON.stringify(elemento);
    return this.http.request<any>('DELETE', this.servicio, {
      body: body,
      headers: httpOptions.headers
    }).pipe(
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
  // Nuevo método para obtener pagos por cuenta por cobrar
  obtenerPorCuentaPorCobrar(id_cuenta: any) {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + `/cuenta-por-cobrar/${id_cuenta}`, {
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

  crearEnLote(idPagoRecibido: number, cuentas: any[]) {
    const body = JSON.stringify({
      id_pago_recibido: idPagoRecibido,
      cuentas: cuentas
    });

    return this.http.post<any>(this.servicio + '/batch', body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) {
          console.error('Error en lote:', respuesta);
          throw respuesta.error;
        }
        console.log('Resultado del lote:', respuesta);
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }
  private handleError(error: HttpErrorResponse) {
    return throwError(() => error);
  }
}