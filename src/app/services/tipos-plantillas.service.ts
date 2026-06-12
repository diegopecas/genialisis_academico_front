import {
  HttpClient,
  HttpErrorResponse,
  HttpResponse,
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { httpOptions } from './http';

export interface TipoPlantilla {
  id?: number;
  codigo: string;
  nombre: string;
  descripcion?: string;
  fecha_creacion?: string;
  fecha_actualizacion?: string;
}

@Injectable({
  providedIn: 'root'
})
export class TiposPlantillasService {

  private servicio = environment.api + 'tipos-plantillas';

  constructor(private http: HttpClient) { }

  /**
   * Obtener todos los tipos de plantillas
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
   * Obtener tipo de plantilla por ID
   */
  obtenerById(id: any) {
    return this.http
      .get<HttpResponse<Object>>(`${this.servicio}/${id}`, {
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
   * Obtener tipo de plantilla por código
   */
  obtenerByCodigo(codigo: string) {
    return this.http
      .get<HttpResponse<Object>>(`${this.servicio}/codigo/${codigo}`, {
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
   * Crear nuevo tipo de plantilla
   */
  crear(tipoPlantilla: TipoPlantilla) {
    const body = JSON.stringify(tipoPlantilla);

    return this.http.post<any>(this.servicio, body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) {
          throw respuesta.error;
        }
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Actualizar tipo de plantilla
   */
  actualizar(tipoPlantilla: TipoPlantilla) {
    const body = JSON.stringify(tipoPlantilla);
    return this.http.put<any>(this.servicio, body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) throw respuesta.error;
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Eliminar tipo de plantilla
   */
  eliminar(id: any) {
    const body = JSON.stringify({ id });
    return this.http.request<any>('delete', this.servicio, { body, ...httpOptions }).pipe(
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