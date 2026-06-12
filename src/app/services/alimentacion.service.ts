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
export class AlimentacionService {

  private servicio = environment.api + 'alimentacion';

  constructor(private http: HttpClient) {}

  obtenerAlimentacionPorFecha(fecha: string) {
    const body = JSON.stringify({ fecha: fecha });
    
    return this.http.post<any>(this.servicio + '/fecha', body, httpOptions).pipe(
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