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
  id?: string;
  id_contrato_matricula?: string;
  id_producto_servicio: string;
  nombre_producto?: string;
  fecha: string;
  valor: number;
  id_periodicidad_cobro?: number;
  periodicidad?: string;
  es_matricula?: boolean;
  // Tipo de cobro del producto al que pertenece la cuota
  id_tipo_cobro?: string;
  codigo_tipo_cobro?: string;
  orden?: number;
  mes?: number;
  anio?: number;
  // Para UI
  valorFormateado?: string;
}

export interface ResumenValores {
  total_matricula: number;
  total_pension: number;
  // Total de los productos distintos de matricula y pension
  total_otros: number;
  numero_cuotas: number;
  valor_total: number;
}

/** Linea del contrato que se envia para generar el calendario */
export interface LineaGenerarValores {
  id_producto_servicio: string;
  id_tipo_cobro?: string;
  codigo_tipo_cobro?: string;
  valor_final: number;
  orden?: number;
}

export interface GenerarValoresRequest {
  id_grupo: string;
  anio: number;
  fecha_inicio: string;
  fecha_fin: string;
  cuotas_matricula?: number;
  // Dia del mes en que vence cada cuota generada (1-31).
  dia_vencimiento?: number;
  // Lineas escogidas en el contrato, con descuentos/recargos ya aplicados.
  // Si no vienen, el back usa las filas obligatorias de la tarifa del grupo.
  lineas?: LineaGenerarValores[];
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
  obtenerByContrato(idContrato: string): Observable<HttpResponse<ContratoValor[]>> {
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
  guardarValores(idContrato: string, valores: ContratoValor[]): Observable<any> {
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