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
  
  @Injectable({
    providedIn: 'root'
  })
  export class TiposAcudienteService {
  
    private servicio = environment.api + 'tipos-acudiente';
  
    constructor(private http: HttpClient) {}
  
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
  
    crear(tipoAcudiente: any) {
      const body = JSON.stringify({
        nombre: tipoAcudiente.nombre
      });
      
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
  
    actualizar(tipoAcudiente: any) {
      const body = JSON.stringify({
        id: tipoAcudiente.id,
        nombre: tipoAcudiente.nombre
      });
      
      return this.http.put<any>(this.servicio, body, httpOptions).pipe(
        tap((respuesta: any) => {
          if (respuesta.error) throw respuesta.error;
          return respuesta;
        }),
        catchError(this.handleError)
      );
    }
  
    eliminar(tipoAcudiente: any) {
      return this.http.delete<any>(`${this.servicio}/${tipoAcudiente.id}`).pipe(
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
  
    private handleError(error: HttpErrorResponse) {
      return throwError(() => error);
    }
  }