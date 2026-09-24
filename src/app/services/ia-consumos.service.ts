import { HttpClient, HttpErrorResponse, HttpParams, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

/**
 * Consumo de IA (tabla ia_consumos): un registro por petición a la IA, con el
 * intento que respondió y el detalle de todos los proveedores probados.
 */
@Injectable({
  providedIn: 'root'
})
export class IaConsumosService {

  private servicio = environment.api + 'ia-consumos';

  constructor(private http: HttpClient) { }

  /**
   * Consumos del tenant entre dos fechas (formato AAAA-MM-DD, ambas incluidas).
   */
  obtenerReporte(desde: string, hasta: string) {
    const params = new HttpParams()
      .set('desde', desde)
      .set('hasta', hasta);

    return this.http
      .get<HttpResponse<Object>>(`${this.servicio}/reporte`, { observe: 'response', params })
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
