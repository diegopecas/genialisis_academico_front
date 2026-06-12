import {
  HttpClient,
  HttpErrorResponse,
  HttpResponse,
  HttpParams
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { httpOptions } from './http';

@Injectable({
  providedIn: 'root'
})
export class IaCoberturaCurricularService {

  private servicio = environment.api + 'ia-cobertura-curricular';

  constructor(private http: HttpClient) {}

  obtenerAnalisisGuardado(id_grupo: any, id_corte: any, opciones: { id_area?: any } = {}) {
    let params = new HttpParams().set('id_grupo', id_grupo).set('id_corte', id_corte);
    if (opciones.id_area) params = params.set('id_area', opciones.id_area);

    return this.http
      .get<HttpResponse<Object>>(this.servicio + '/obtener', { params, observe: 'response' })
      .pipe(
        tap((response: HttpResponse<Object>) => {
          let respuesta: any = response.body;
          if (respuesta.error) { throw respuesta.error; }
          return response;
        }),
        catchError(this.handleError)
      );
  }

  analizarCobertura(datosAnalisis: any) {
    const body = JSON.stringify(datosAnalisis);
    return this.http.post<any>(this.servicio + '/analizar', body, httpOptions).pipe(
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