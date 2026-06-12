import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { httpOptions } from './http';

@Injectable({
  providedIn: 'root'
})
export class GiniService {

  private servicio = environment.api + 'gini';

  constructor(private http: HttpClient) {}

  generarSesion(modo: 'es-en' | 'en-es' = 'es-en') {
    const body = JSON.stringify({ modo });
    return this.http.post<any>(this.servicio + '/session', body, httpOptions).pipe(
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