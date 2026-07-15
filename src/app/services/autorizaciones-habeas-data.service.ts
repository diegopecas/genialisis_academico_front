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

export interface VerificacionHabeasData {
  requiere_autorizacion: boolean;
  autorizado: boolean;
  version_actual: string | null;
}

export interface RegistroHabeasData {
  token: string;
  version_politica: string;
  mensaje: string;
}

@Injectable({
  providedIn: 'root',
})
export class AutorizacionesHabeasDataService {
  private servicio = environment.api + 'autorizaciones-habeas-data';

  constructor(private http: HttpClient) {}

  /**
   * El id_usuario sale del JWT, no de la URL.
   */
  verificar() {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + '/verificar', {
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

  obtenerPlantilla() {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + '/plantilla', {
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

  /**
   * Sin cuerpo: el servidor toma id_usuario, id_persona, portal y version
   * del token. Devuelve un token nuevo que ya trae el pasaporte hd_ok.
   */
  registrar() {
    return this.http.post<RegistroHabeasData>(this.servicio, '{}', httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) {
          throw respuesta.error;
        }
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse) {
    return throwError(() => error);
  }
}