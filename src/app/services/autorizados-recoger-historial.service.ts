import {
    HttpClient,
    HttpErrorResponse,
    HttpResponse,
  } from '@angular/common/http';
  import { tap, catchError, map } from 'rxjs/operators';
  import { Injectable } from '@angular/core';
  import { environment } from '../../environments/environment';
  import { throwError } from 'rxjs';
  import { httpOptions } from './http';
  import { UtilService } from '../common/constantes/util.service';
  
  @Injectable({
    providedIn: 'root'
  })
  export class AutorizadosRecogerHistorialService {
  
    private servicio = environment.api + 'autorizados-recoger-historial';
  
    constructor(
      private http: HttpClient,
      private utilService: UtilService
    ) {}
  
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
  
    obtenerPorId(id: any) {
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
  
    obtenerPorAutorizado(idAutorizado: any) {
      return this.http
        .get<HttpResponse<Object>>(this.servicio + '/autorizado/' + idAutorizado, { observe: 'response' })
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
  
    crear(data: any) {
      const body = JSON.stringify(data);
      return this.http.post<any>(this.servicio, body, httpOptions).pipe(
        tap((respuesta: any) => {
          if (respuesta.error) throw respuesta.error;
          return respuesta;
        }),
        catchError(this.handleError)
      );
    }
  
    eliminar(id: any) {
      return this.http.delete<any>(`${this.servicio}/${id}`).pipe(
        map((respuesta: any) => {
          if (respuesta?.error) {
            throw new Error(respuesta.error);
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