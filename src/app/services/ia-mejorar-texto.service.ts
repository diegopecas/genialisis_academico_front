import {
  HttpClient,
  HttpErrorResponse,
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { httpOptions } from './http';

@Injectable({
  providedIn: 'root',
})
export class IaMejorarTextoService {
  private servicio = environment.api + 'ia-mejorar-texto';

  constructor(private http: HttpClient) {}

  mejorarTexto(datos: { texto: string; contexto?: string }) {
    const body = JSON.stringify(datos);
    return this.http.post<any>(this.servicio + '/mejorar', body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) {
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