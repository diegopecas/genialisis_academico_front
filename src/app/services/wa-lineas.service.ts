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

/** Una línea de WhatsApp del jardín: un número conectado con su nombre */
export interface LineaWhatsapp {
  id: number;
  nombre: string | null;
  phone_number_id: string;
  display_phone_number: string | null;
  wa_business_account_id: string | null;
  es_coexistence: number;
  estado_onboarding: string;
  historial_sincronizado: number;
  historial_sync_fecha: string | null;
  fecha_onboarding: string | null;
  fecha_ultima_actividad: string | null;
  activo: number;
}

/**
 * Líneas de WhatsApp del tenant (tenants_whatsapp_config en la master).
 * Conectar y desconectar una línea se hace con WaOnboardingService.
 */
@Injectable({
  providedIn: 'root'
})
export class WaLineasService {

  private servicio = environment.api + 'wa-lineas';

  constructor(private http: HttpClient) { }

  /** Todas las líneas del jardín, conectadas y desconectadas */
  obtenerLineas() {
    return this.http
      .get<HttpResponse<Object>>(this.servicio, silentGetOptions)
      .pipe(
        tap((response: HttpResponse<Object>) => {
          let respuesta: any = response.body;
          if (respuesta?.error) throw respuesta.error;
          return response;
        }),
        catchError(this.handleError)
      );
  }

  cambiarNombre(id: number, nombre: string) {
    const body = JSON.stringify({ id, nombre });
    return this.http.put<any>(this.servicio + '/nombre', body, httpOptions).pipe(
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
