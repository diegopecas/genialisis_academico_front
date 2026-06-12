import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { httpOptions } from './http';
import { environment } from '../../environments/environment';

// X-Silent: el interceptor no activa el spinner ni muestra errores globales
const httpOptionsSilent = {
  headers: new HttpHeaders({
    'Content-Type': 'application/json',
    'X-Silent': '1'
  }),
  observe: 'response' as const
};

@Injectable({
  providedIn: 'root'
})
export class CocinaDisponibilidadService {

  private servicio = environment.api + 'cocina-disponibilidad';

  constructor(private http: HttpClient) {}

  /**
   * Obtiene productos de alimentación diaria con su estado de disponibilidad para la fecha.
   * El backend devuelve todos; el filtro de horario se aplica en el frontend.
   */
  obtenerProductosPorFecha(fecha: string): Observable<any> {
    const body = JSON.stringify({ fecha });
    return this.http.post<any>(this.servicio + '/productos', body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta?.error) throw respuesta.error;
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Guarda un producto individual de forma silenciosa (sin spinner).
   * Usado en el toggle individual de cada card.
   */
  guardarUno(fecha: string, id_producto_servicio: string, disponible: number): Observable<any> {
    const body = JSON.stringify({
      fecha,
      productos: [{ id_producto_servicio, disponible }]
    });
    return this.http.post<any>(this.servicio + '/guardar-batch', body, httpOptionsSilent).pipe(
      map((response: any) => response.body),
      catchError(this.handleError)
    );
  }

  /**
   * Guarda múltiples productos en batch (con spinner, para botones masivos).
   */
  guardarBatch(fecha: string, productos: { id_producto_servicio: string; disponible: number }[]): Observable<any> {
    const body = JSON.stringify({ fecha, productos });
    return this.http.post<any>(this.servicio + '/guardar-batch', body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta?.error) throw respuesta.error;
      }),
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse) {
    return throwError(() => error);
  }
}