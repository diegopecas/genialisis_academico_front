import {
  HttpClient,
  HttpErrorResponse,
  HttpResponse,
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { httpOptions } from './http';

@Injectable({
  providedIn: 'root'
})
export class MenuMinutasService {

  private servicio = environment.api + 'menus';
  private servicioMinutas = environment.api + 'menu-minutas';

  constructor(private http: HttpClient) { }

  obtenerPorMenu(idMenu: any) {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + `/${idMenu}/minutas`, {
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

  asignar(idMenu: number, minutas: any[]) {
    const body = JSON.stringify({ minutas: minutas });

    return this.http.post<any>(
      this.servicio + `/${idMenu}/minutas`,
      body,
      httpOptions
    ).pipe(
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

  verificarConflictos(idMenu: number, minutas: any[]) {
    const body = JSON.stringify({ minutas: minutas });

    return this.http.post<any>(
      this.servicio + `/${idMenu}/minutas/verificar`,
      body,
      httpOptions
    ).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) {
          throw respuesta.error;
        }
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  obtenerMinutaCompleta(idClasificacion?: number) {
    let url = this.servicioMinutas + '/completa';
    if (idClasificacion) {
      url += `?id_clasificacion=${idClasificacion}`;
    }

    return this.http
      .get<HttpResponse<Object>>(url, {
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

  private handleError(error: HttpErrorResponse) {
    return throwError(() => error);
  }
}