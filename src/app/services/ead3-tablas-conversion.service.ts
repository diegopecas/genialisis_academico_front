import {
  HttpClient,
  HttpErrorResponse,
  HttpResponse,
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { httpOptions } from './http';
import { environment } from '../../environments/environment';
@Injectable({
  providedIn: 'root'
})
export class Ead3TablasConversionService {

  private servicio = environment.api + 'ead3-tablas-conversion';

  constructor(private http: HttpClient) { }

  obtenerByRangoArea(idRango: any, area: any) {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + `/${idRango}/${area}`, {
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

  convertir(datos: any) {
    const body = JSON.stringify(datos);
    return this.http.post<any>(this.servicio + '/convertir', body, httpOptions).pipe(
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

  private handleError(error: HttpErrorResponse) {
    return throwError(() => error);
  }
}