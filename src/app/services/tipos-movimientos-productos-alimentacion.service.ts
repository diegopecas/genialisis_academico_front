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
    providedIn: 'root',
  })
  export class TiposMovimientosProductosAlimentacionService {
  
    private servicio = environment.api + 'tipos-movimientos-productos-alimentacion';
  
    constructor(private http: HttpClient) {}
  
    obtenerTodos() {
      return this.http
        .get<HttpResponse<Object>>(this.servicio, { observe: 'response' })
        .pipe(
          tap((response: HttpResponse<Object>) => {
            let respuesta: any = response.body;
            if (respuesta.error) throw respuesta.error;
            return response;
          }),
          catchError(this.handleError)
        );
    }
  
    obtenerById(id: any) {
      return this.http
        .get<HttpResponse<Object>>(this.servicio + `/${id}`, {
          observe: 'response',
        })
        .pipe(
          tap((response: HttpResponse<Object>) => {
            let respuesta: any = response.body;
            if (respuesta.error) throw respuesta.error;
            return response;
          }),
          catchError(this.handleError)
        );
    }
    
    obtenerTiposEntrada() {
      return this.http
        .get<HttpResponse<Object>>(this.servicio + `/tipo-entrada`, {
          observe: 'response',
        })
        .pipe(
          tap((response: HttpResponse<Object>) => {
            let respuesta: any = response.body;
            if (respuesta.error) throw respuesta.error;
            return response;
          }),
          catchError(this.handleError)
        );
    }
    
    obtenerTiposSalida() {
      return this.http
        .get<HttpResponse<Object>>(this.servicio + `/tipo-salida`, {
          observe: 'response',
        })
        .pipe(
          tap((response: HttpResponse<Object>) => {
            let respuesta: any = response.body;
            if (respuesta.error) throw respuesta.error;
            return response;
          }),
          catchError(this.handleError)
        );
    }
    
    crear(elemento: any) {
      const body = JSON.stringify(elemento);
      return this.http.post<any>(this.servicio, body, httpOptions).pipe(
        tap((respuesta: any) => {
          if (respuesta.error) throw respuesta.error;
          return respuesta;
        }),
        catchError(this.handleError)
      );
    }
  
    actualizar(elemento: any) {
      const body = JSON.stringify(elemento);
      return this.http.put<any>(this.servicio, body, httpOptions).pipe(
        tap((respuesta: any) => {
          if (respuesta.error) throw respuesta.error;
          return respuesta;
        }),
        catchError(this.handleError)
      );
    }
  
    eliminar(elemento: any) {
      const body = JSON.stringify(elemento);
      return this.http.request<any>('DELETE', this.servicio, {
        body,
        headers: httpOptions.headers,
      }).pipe(
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