import { HttpClient, HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { httpOptions } from './http';

// Interfaz original - NO MODIFICAR (usada por DocumentosPersonaComponent y otros)
export interface TipoDocumento {
  id: string;
  codigo: string;
  nombre: string;
  descripcion?: string;
  tipo_persona: string;
  requiere_vencimiento: number;
  requiere_firma?: number;
  dias_alerta_vencimiento?: number;
  permite_multiples: number;
  obligatorio: number;
  activo: number;
}

// Interfaz para el CRUD de tipos de documentos
export interface TipoDocumentoCrud {
  id?: string;
  codigo: string;
  nombre: string;
  descripcion?: string;
  requiere_vencimiento: number;
  requiere_firma: number;
  dias_alerta_vencimiento?: number;
  permite_multiples: number;
  modificable_acudientes: number;
  activo: number;
}

@Injectable({
  providedIn: 'root'
})
export class TiposDocumentosService {

  private servicio = environment.api + 'tipos-documentos';

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

  obtenerPorTipoPersona(codigoTipoPersona: string) {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + `/tipo-persona/${codigoTipoPersona}`, { observe: 'response' })
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

  // --- Métodos nuevos para CRUD ---

  obtenerPorId(id: string) {
    return this.obtenerById(id);
  }

  crear(data: TipoDocumentoCrud) {
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

  actualizar(data: TipoDocumentoCrud) {
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