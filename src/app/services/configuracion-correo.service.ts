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
 * Servicio de correo del jardín (configuracion_correo). Una fila por jardín.
 * La API key nunca viene del back: solo si hay una guardada y sus últimos 4
 * caracteres. Para cambiarla se manda de nuevo; vacía se conserva la guardada.
 */
@Injectable({
  providedIn: 'root'
})
export class ConfiguracionCorreoService {

  private servicio = environment.api + 'configuracion-correo';

  constructor(private http: HttpClient) { }

  // Arreglo vacío si el jardín todavía no lo ha configurado
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

  // Manda un correo de prueba con la configuración guardada
  probar(para: string) {
    const body = JSON.stringify({ para: para });
    return this.http.post<any>(this.servicio + '/probar', body, httpOptions).pipe(
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
