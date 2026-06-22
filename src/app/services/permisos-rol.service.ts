import { HttpClient, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { httpOptions } from './http';

@Injectable({
  providedIn: 'root'
})
export class PermisosRolService {

  private servicio = environment.api + 'permisos';

  constructor(private http: HttpClient) { }

  obtenerRoles() {
    return this.http
      .get<HttpResponse<Object>>(`${this.servicio}/roles`, { observe: 'response' })
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

  obtenerPortales() {
    return this.http
      .get<HttpResponse<Object>>(`${this.servicio}/portales`, { observe: 'response' })
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

  obtenerArbol(portal: string = 'institucional') {
    return this.http
      .get<HttpResponse<Object>>(`${this.servicio}/arbol?portal=${portal}`, { observe: 'response' })
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

  obtenerPermisosPorRol(idRol: string) {
    return this.http
      .get<HttpResponse<Object>>(`${this.servicio}/rol/${idRol}`, { observe: 'response' })
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

  guardarPermisos(idRol: string, permisos: string[]) {
    const body = JSON.stringify({ permisos });
    return this.http.post<any>(`${this.servicio}/rol/${idRol}`, body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) {
          throw respuesta.error;
        }
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  private handleError(error: any) {
    return throwError(() => error);
  }
}