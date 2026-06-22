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

@Injectable({
  providedIn: 'root'
})
export class GaleriasXGruposService {

  private servicio = environment.api + 'galerias-x-grupos';

  constructor(private http: HttpClient) {}

  /**
   * Obtener todas las relaciones
   */
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

  /**
   * Obtener grupos por galería
   */
  obtenerPorGaleria(idGaleria: any) {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + `/galeria/${idGaleria}`, { observe: 'response' })
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
   * Obtener galerías por grupo
   */
  obtenerPorGrupo(idGrupo: any) {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + `/grupo/${idGrupo}`, { observe: 'response' })
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
   * Crear nueva relación
   */
  crear(relacion: any) {
    const body = JSON.stringify(relacion);
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
   * Asignar múltiples grupos a una galería
   */
  asignarGrupos(idGaleria: any, grupos: string[]) {
    const body = JSON.stringify({ id_galeria: idGaleria, grupos: grupos });
    return this.http.post<any>(this.servicio + '/assign', body, httpOptions).pipe(
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
   * Eliminar relación por ID
   */
  eliminar(id: any) {
    const body = JSON.stringify({ id: id });
    return this.http.request<any>('delete', this.servicio, { body: body, ...httpOptions }).pipe(
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
   * Eliminar todas las relaciones de una galería
   */
  eliminarPorGaleria(idGaleria: any) {
    return this.http.delete<any>(this.servicio + `/galeria/${idGaleria}`).pipe(
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