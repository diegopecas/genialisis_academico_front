import { HttpClient, HttpErrorResponse, HttpParams, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { httpOptions } from './http';

/**
 * Novedades de los espacios (canchas): sin reportar, reportadas al club o
 * cruzadas (el club ya las descontó o devolvió).
 */
@Injectable({
  providedIn: 'root'
})
export class NovedadesEspaciosService {

  private servicio = environment.api + 'novedades-espacios';

  constructor(private http: HttpClient) { }

  // Filtros opcionales: desde, hasta (AAAA-MM-DD), estado, id_lugar
  obtenerTodos(filtros: { desde?: string, hasta?: string, estado?: string, id_lugar?: string } = {}) {
    let params = new HttpParams();
    Object.entries(filtros).forEach(([clave, valor]) => {
      if (valor) params = params.set(clave, valor);
    });
    return this.http
      .get<HttpResponse<Object>>(this.servicio, { observe: 'response', params })
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

  obtenerById(id: string) {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + `/${id}`, { observe: 'response' })
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

  // Una novedad por cada cancha de ids_espacios
  crear(data: any) {
    return this.http.post<any>(this.servicio, data, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta && respuesta.error) throw respuesta.error;
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  actualizar(data: any) {
    return this.http.put<any>(this.servicio, data, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta && respuesta.error) throw respuesta.error;
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  eliminar(id: string) {
    return this.http.request<any>('delete', this.servicio, { ...httpOptions, body: { id: id } }).pipe(
      tap((respuesta: any) => {
        if (respuesta && respuesta.error) throw respuesta.error;
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  // Marca como cruzadas las reportadas
  cruzar(ids: string[]) {
    return this.http.put<any>(this.servicio + '/cruzar', { ids: ids }, httpOptions).pipe(
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
