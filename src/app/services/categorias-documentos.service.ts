import { HttpClient, HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { httpOptions } from './http';

export interface CategoriaDocumento {
  id?: string;
  codigo: string;
  nombre: string;
  // Clase de FontAwesome sin el prefijo "fas", ej: fa-id-card
  icono?: string;
  orden: number;
  activo: number;
}

@Injectable({
  providedIn: 'root'
})
export class CategoriasDocumentosService {

  private servicio = environment.api + 'categorias-documentos';

  constructor(private http: HttpClient) { }

  obtenerTodas() {
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

  /** Solo las activas: es lo que se ofrece en los selectores. */
  obtenerActivas() {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + '/activas', { observe: 'response' })
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

  obtenerById(id: string) {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + `/${id}`, { observe: 'response' })
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

  crear(data: CategoriaDocumento) {
    return this.http
      .post<HttpResponse<Object>>(this.servicio, data, httpOptions)
      .pipe(
        tap((response: any) => {
          if (response.error) {
            throw response.error;
          }
          return response;
        }),
        catchError(this.handleError)
      );
  }

  actualizar(data: CategoriaDocumento) {
    return this.http
      .put<HttpResponse<Object>>(this.servicio, data, httpOptions)
      .pipe(
        tap((response: any) => {
          if (response.error) {
            throw response.error;
          }
          return response;
        }),
        catchError(this.handleError)
      );
  }

  eliminar(id: string) {
    return this.http
      .request<HttpResponse<Object>>('delete', this.servicio, {
        ...httpOptions,
        body: { id: id }
      })
      .pipe(
        tap((response: any) => {
          if (response.error) {
            throw response.error;
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
