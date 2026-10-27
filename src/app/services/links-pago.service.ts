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

/**
 * Links de pago (Bold) que se envían al aprobar una solicitud del portal.
 */
@Injectable({
  providedIn: 'root'
})
export class LinksPagoService {

  private servicio = environment.api + 'links-pago';

  constructor(private http: HttpClient) { }

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

  // Reintenta crear el link en Bold (si quedó pendiente o con error) y envía el correo
  generar(id: any) {
    return this.put('/generar', { id: id });
  }

  reenviarCorreo(id: any) {
    return this.put('/reenviar-correo', { id: id });
  }

  // Consulta el link en Bold y registra el pago si ya está pagado
  verificar(id: any) {
    return this.put('/verificar', { id: id });
  }

  private put(ruta: string, datos: any) {
    return this.http.put<any>(this.servicio + ruta, JSON.stringify(datos), httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta && respuesta.error) throw respuesta.error;
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse) {
    return throwError(() => error);
  }
}
