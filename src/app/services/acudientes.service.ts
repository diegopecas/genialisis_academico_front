import {
    HttpClient,
    HttpErrorResponse,
    HttpResponse,
  } from '@angular/common/http';
  import { map, catchError, tap } from 'rxjs/operators';
  import { Injectable } from '@angular/core';
  import { environment } from '../../environments/environment';
  import { Observable, throwError } from 'rxjs';
  import { httpOptions } from './http';
  import { UtilService } from '../common/constantes/util.service';
  
  @Injectable({
    providedIn: 'root'
  })
  export class AcudientesService {
  
    private servicio = environment.api + 'acudientes';
  
    constructor(
      private http: HttpClient,
      private utilService: UtilService
    ) {}
  
    obtenerById(id: any) {
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
  
    obtenerPorEstudiante(idEstudiante: any) {
      return this.http
        .get<HttpResponse<Object>>(this.servicio + '/estudiante/' + idEstudiante, { 
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
  
    crear(acudiente: any) {
      const body = JSON.stringify(acudiente);
            
      return this.http.post<any>(this.servicio, body, httpOptions).pipe(
        tap((respuesta: any) => {
          if (respuesta.error) {
            console.log(respuesta);
            throw respuesta.error;
          }
          return respuesta;
        }),
        catchError(this.handleError)
      );
    }
  
    actualizar(acudiente: any) {
      const body = JSON.stringify(acudiente);
      return this.http.put<any>(this.servicio, body, httpOptions).pipe(
        tap((respuesta: any) => {
          if (respuesta.error) throw respuesta.error;
          return respuesta;
        }),
        catchError(this.handleError)
      );
    }
  
    eliminar(acudiente: any) {
      return this.http.delete<any>(`${this.servicio}/${acudiente.id}`).pipe(
        map((respuesta: any) => {
          if (respuesta?.error) {
            console.error('Error en la respuesta:', respuesta.error);
            throw new Error(respuesta.error);
          }
          return respuesta;
        }),
        catchError(this.handleError)
      );
    }
  
    verificarDuplicados(acudiente: any) {
      const body = JSON.stringify({
        id_estudiante: acudiente.id_estudiante,
        id_persona: acudiente.id_persona,
        id_tipo_acudiente: acudiente.id_tipo_acudiente
      });
      
      return this.http.post<any>(this.servicio + '/verificar-duplicados', body, httpOptions).pipe(
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