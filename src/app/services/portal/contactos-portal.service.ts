import {
  HttpClient,
  HttpErrorResponse,
  HttpResponse,
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { httpOptions } from '../http';

@Injectable({
  providedIn: 'root',
})
export class ContactosPortalService {
  private servicio = environment.api + 'contactos-portal';
  private servicioCatalogos = environment.api + 'contactos-portal-catalogos';
  private servicioEstadisticas = environment.api + 'contactos-portal-estadisticas';

  constructor(private http: HttpClient) {}

  /**
   * Obtener todos los contactos del portal
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
   * Obtener contacto por ID
   */
  obtenerPorId(id: any) {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + `/${id}`, {
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
   * Actualizar contacto (solo campos editables)
   */
  actualizar(elemento: any) {
    var body = JSON.stringify(elemento);
    return this.http.put<any>(this.servicio, body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) {
          console.log(respuesta);
          throw respuesta.error;
        }
        console.log(respuesta);
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Obtener catálogos para el formulario
   */
  obtenerCatalogos() {
    return this.http
      .get<HttpResponse<Object>>(this.servicioCatalogos, { 
        observe: 'response' 
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
   * Obtener estadísticas de contactos
   */
  obtenerEstadisticas() {
    return this.http
      .get<HttpResponse<Object>>(this.servicioEstadisticas, { 
        observe: 'response' 
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

  private handleError(error: HttpErrorResponse) {
    return throwError(() => error);
  }
}