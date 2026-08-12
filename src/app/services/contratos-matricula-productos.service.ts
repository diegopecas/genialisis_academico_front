import {
  HttpClient,
  HttpErrorResponse,
  HttpResponse,
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { httpOptions } from './http';

/**
 * Línea de producto de un contrato de matrícula.
 * El descuento y el recargo son por línea, no de la cabecera.
 * En las líneas de PENSION el valor es el mensual, igual que en la tarifa.
 * El tipo de cobro lo trae el producto; el back lo guarda como foto de la firma.
 */
export interface LineaContrato {
  id?: string;
  id_contrato_matricula?: string;
  id_producto_servicio: string;
  nombre_producto?: string;
  id_tipo_cobro?: string;
  codigo_tipo_cobro?: string;
  nombre_tipo_cobro?: string;
  id_periodicidad_cobro?: number;
  nombre_periodicidad?: string;
  valor_base: number;
  descuento: number;
  recargo: number;
  valor_final: number;
  orden: number;
  // Solo para la UI
  obligatorio?: number;
  seleccionado?: boolean;
  descuentoFormateado?: string;
  recargoFormateado?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ContratosMatriculaProductosService {

  private servicio = environment.api + 'contratos-matricula-productos';

  constructor(private http: HttpClient) { }

  obtenerByContrato(idContrato: string): Observable<HttpResponse<LineaContrato[]>> {
    return this.http
      .get<LineaContrato[]>(this.servicio + `/contrato/${idContrato}`, {
        observe: 'response',
      })
      .pipe(
        tap((response: HttpResponse<LineaContrato[]>) => {
          return response;
        }),
        catchError(this.handleError)
      );
  }

  obtenerById(id: any) {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + `/${id}`, {
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

  /**
   * Reemplaza todas las líneas del contrato y recalcula los totales
   * derivados de la cabecera.
   */
  guardarLineas(idContrato: string, lineas: LineaContrato[]): Observable<any> {
    const body = JSON.stringify({
      id_contrato_matricula: idContrato,
      lineas: lineas.map(l => ({
        id_producto_servicio: l.id_producto_servicio,
        valor_base: l.valor_base,
        descuento: l.descuento,
        recargo: l.recargo,
        valor_final: l.valor_final,
        orden: l.orden
      }))
    });

    return this.http.post<any>(this.servicio, body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) {
          throw respuesta.error;
        }
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  eliminarByContrato(idContrato: string): Observable<any> {
    return this.http
      .delete<any>(this.servicio + `/contrato/${idContrato}`, httpOptions)
      .pipe(
        tap((respuesta: any) => {
          if (respuesta.error) throw respuesta.error;
          return respuesta;
        }),
        catchError(this.handleError)
      );
  }

  eliminar(id: any): Observable<any> {
    const body = JSON.stringify({ id });
    return this.http.request<any>('delete', this.servicio, { body, ...httpOptions }).pipe(
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
