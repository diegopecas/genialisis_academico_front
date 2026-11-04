import {
  HttpClient,
  HttpErrorResponse,
  HttpResponse,
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

/**
 * Planes de pago en cuotas: un cobro partido en cuotas, cada una con su
 * cuenta por cobrar. Se crean al aprobar una solicitud del portal.
 */
@Injectable({
  providedIn: 'root'
})
export class PlanesPagoService {

  private servicio = environment.api + 'planes-pago';

  constructor(private http: HttpClient) { }

  // Planes de una solicitud con sus cuotas (fecha, valor, saldo y estado)
  obtenerPorSolicitud(idSolicitud: any) {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + `/solicitud/${idSolicitud}`, { observe: 'response' })
      .pipe(
        tap((response: HttpResponse<Object>) => {
          let respuesta: any = response.body;
          if (respuesta && respuesta.error) {
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
