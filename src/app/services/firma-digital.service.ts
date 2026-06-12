import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { httpOptions } from './http';

@Injectable({
  providedIn: 'root'
})
export class FirmaDigitalService {

  private servicio = environment.api + 'documentos-personas';

  constructor(private http: HttpClient) { }

  enviarAFirmar(idDocumento: number, emailsFirmantes: string[]): Observable<any> {
    const body = JSON.stringify({ emails_firmantes: emailsFirmantes });
    
    return this.http.post<any>(
      `${this.servicio}/${idDocumento}/enviar-firma`, 
      body, 
      httpOptions
    ).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) throw respuesta.error;
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  consultarEstado(idDocumento: number): Observable<any> {
    return this.http.get<any>(
      `${this.servicio}/${idDocumento}/estado-firma`
    ).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) throw respuesta.error;
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  descargarFirmado(idDocumento: number): Observable<any> {
    return this.http.post<any>(
      `${this.servicio}/${idDocumento}/descargar-firmado`,
      {},
      httpOptions
    ).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) throw respuesta.error;
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  reenviarCorreo(idDocumento: number, emailsFirmantes?: string[]): Observable<any> {
    const body: any = {};
    if (emailsFirmantes && emailsFirmantes.length > 0) {
      body.emails_firmantes = emailsFirmantes;
    }
    
    return this.http.post<any>(
      `${this.servicio}/${idDocumento}/reenviar-firma`,
      JSON.stringify(body),
      httpOptions
    ).pipe(
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