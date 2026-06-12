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

export interface ContratoValor {
  id?: number;
  id_contrato_matricula?: number;
  id_producto_servicio: number;
  nombre_producto?: string;
  fecha: string;
  valor: number;
  id_periodicidad_cobro?: number;
  periodicidad?: string;
  es_matricula?: boolean;
  mes?: number;
  anio?: number;
  // Para UI
  valorFormateado?: string;
}

export interface ResumenValores {
  total_matricula: number;
  total_pension: number;
  numero_cuotas: number;
  valor_total: number;
}

export interface GenerarValoresRequest {
  id_grupo: number;
  anio: number;
  fecha_inicio: string;
  fecha_fin: string;
  cuotas_matricula?: number;
  valor_matricula?: number;  // Valor final con descuentos/recargos aplicados
  valor_pension?: number;    // Valor final con descuentos/recargos aplicados
}

export interface GenerarValoresResponse {
  valores: ContratoValor[];
  tarifa: any;
  resumen: ResumenValores;
}

@Injectable({
  providedIn: 'root'
})
export class ContratosMatriculaValoresService {

  private servicio = environment.api + 'contratos-matricula-valores';

  constructor(private http: HttpClient) { }

  /**
   * Obtener todos los valores de un contrato
   */
  obtenerByContrato(idContrato: number): Observable<HttpResponse<ContratoValor[]>> {
    return this.http
      .get<ContratoValor[]>(this.servicio + `/contrato/${idContrato}`, {
        observe: 'response',
      })
      .pipe(
        tap((response: HttpResponse<ContratoValor[]>) => {
          return response;
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Guardar todos los valores de un contrato
   */
  guardarValores(idContrato: number, valores: ContratoValor[]): Observable<any> {
    const body = JSON.stringify({
      id_contrato_matricula: idContrato,
      valores: valores.map(v => ({
        id_producto_servicio: v.id_producto_servicio,
        fecha: v.fecha,
        valor: v.valor,
        id_periodicidad_cobro: v.id_periodicidad_cobro
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

  /**
   * Generar valores por defecto basado en tarifas del grupo
   */
  generarValoresPorDefecto(params: GenerarValoresRequest): Observable<GenerarValoresResponse> {
    const body = JSON.stringify(params);
    return this.http.post<GenerarValoresResponse>(this.servicio + '/generar-defecto', body, httpOptions).pipe(
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