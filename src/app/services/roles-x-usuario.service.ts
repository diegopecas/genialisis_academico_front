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
export class RolesXUsuarioService {

  private servicio = environment.api + 'roles-x-usuario';

  constructor(private http: HttpClient) {}

  obtenerUsuariosPorRol(idRol: string) {
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

  obtenerRolesPorUsuario(idUsuario: string) {
    return this.http
      .get<HttpResponse<Object>>(`${this.servicio}/usuario/${idUsuario}`, { observe: 'response' })
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

  // Reemplaza el conjunto de usuarios del rol: { id_rol, usuarios: [id, ...] }
  sincronizarRol(data: any) {
    return this.http
      .post<HttpResponse<Object>>(`${this.servicio}/sincronizar-rol`, data, httpOptions)
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

  // Reemplaza el conjunto de roles del usuario: { id_usuario, roles: [id, ...] }
  sincronizarUsuario(data: any) {
    return this.http
      .post<HttpResponse<Object>>(`${this.servicio}/sincronizar-usuario`, data, httpOptions)
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
