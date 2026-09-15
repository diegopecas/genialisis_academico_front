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

export interface CertificadoConfiguracion {
  id?: string | null;
  clave_certificado: string;
  nombre?: string;
  modo: string;
  regla: string;
  mensaje_no_cumple?: string | null;
  activo: number;
  regla_fija?: number;
  total_productos?: number;
  productos?: any[];
}

@Injectable({
  providedIn: 'root'
})
export class CertificadosConfiguracionService {

  private servicio = environment.api + 'certificados-configuracion';

  constructor(private http: HttpClient) { }

  /**
   * Las cinco configuraciones. El backend devuelve las que faltan con los
   * valores por defecto, así que el listado siempre trae cinco filas.
   */
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

  /**
   * Se consulta por clave y no por id porque la fila puede no existir todavía.
   */
  obtenerByClave(clave: string) {
    return this.http
      .get<HttpResponse<Object>>(`${this.servicio}/clave/${clave}`, {
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

  actualizar(configuracion: any) {
    const body = JSON.stringify(configuracion);
    return this.http.put<any>(this.servicio, body, httpOptions).pipe(
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
