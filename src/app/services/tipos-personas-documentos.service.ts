import { HttpClient, HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { httpOptions } from './http';

@Injectable({
  providedIn: 'root'
})
export class TiposPersonasDocumentosService {

  private servicio = environment.api + 'tipos-personas-documentos';

  constructor(private http: HttpClient) { }

  obtenerPorTipoDocumento(idTipoDocumento: string) {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + `/tipo-documento/${idTipoDocumento}`, { observe: 'response' })
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

  guardar(idTipoDocumento: string, asociaciones: any[]) {
    const data = {
      id_tipo_documento: idTipoDocumento,
      asociaciones: asociaciones
    };
    return this.http
      .post<HttpResponse<Object>>(this.servicio, JSON.stringify(data), httpOptions)
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