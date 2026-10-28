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
 * Pasarela de pagos del jardín (configuracion_pasarela_pago). Una fila por
 * jardín. Las llaves nunca vienen del back: solo si hay una guardada y sus
 * últimos 4 caracteres. Para cambiarlas se mandan de nuevo; vacías se
 * conservan las guardadas.
 */
@Injectable({
  providedIn: 'root'
})
export class ConfiguracionPasarelaPagoService {

  private servicio = environment.api + 'configuracion-pasarela-pago';

  constructor(private http: HttpClient) { }

  // Arreglo vacío si el jardín todavía no la ha configurado
  obtener() {
    return this.http
      .get<HttpResponse<Object>>(this.servicio, { observe: 'response' })
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

  // Crea o actualiza la configuración del jardín
  actualizar(configuracion: any) {
    const body = JSON.stringify(configuracion);
    return this.http.put<any>(this.servicio, body, httpOptions).pipe(
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
