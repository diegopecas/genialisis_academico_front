import { HttpClient, HttpErrorResponse, HttpHeaders, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { httpOptions } from './http';

const silentGetOptions = {
  observe: 'response' as const,
  headers: new HttpHeaders({
    'X-Silent': 'true'
  })
};

@Injectable({
  providedIn: 'root'
})
export class WaOnboardingService {

  private api = environment.api;

  constructor(private http: HttpClient) { }

  /**
   * Obtener estado actual del onboarding del tenant.
   */
  obtenerEstado() {
    return this.http
      .get<HttpResponse<Object>>(this.api + 'wa-onboarding/estado', silentGetOptions)
      .pipe(
        tap((response: HttpResponse<Object>) => {
          let respuesta: any = response.body;
          if (respuesta?.error) throw respuesta.error;
          return response;
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Procesar el resultado del Embedded Signup.
   * Recibe code + phone_number_id + waba_id + business_id desde el SDK de Facebook,
   * y el nombre de la línea (Cartera, Académico...). Si el número ya era una
   * línea del jardín, se reconecta; si no, se agrega una línea nueva.
   */
  procesarOnboarding(datos: {
    code: string;
    phone_number_id: string;
    waba_id: string;
    business_id?: string;
    es_coexistence: boolean;
    nombre?: string;
  }) {
    const body = JSON.stringify(datos);
    return this.http.post<any>(this.api + 'wa-onboarding/procesar', body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta?.error) throw respuesta.error;
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Desconectar una línea de WhatsApp del tenant. Las demás siguen conectadas.
   */
  desconectar(idLinea: number) {
    const body = JSON.stringify({ id: idLinea });
    return this.http.post<any>(this.api + 'wa-onboarding/desconectar', body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta?.error) throw respuesta.error;
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse) {
    return throwError(() => error);
  }
}