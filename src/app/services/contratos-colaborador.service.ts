import {
  HttpClient,
  HttpErrorResponse,
  HttpResponse,
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { httpOptions } from './http';

export interface ContratoColaborador {
  id?: string;
  numero?: number;
  anio: number;
  id_colaborador: string;
  id_cargo: string;
  id_tipo_contrato: string;
  id_plantilla?: string;
  salario_mensual: number;
  periodo_pago?: string;
  fecha_inicio: string;
  fecha_fin?: string | null;
  periodo_prueba?: string;
  jornada_horas?: number;
  lugar_desempeno?: string;
  lugar_firma?: string;
  fecha_firma?: string;
  representante_firma_digital?: number;
  observaciones?: string;
  id_usuario_genera?: string;
  fecha_generacion?: string;
  activo?: number;
  firmado?: number;
  ruta_documento_firmado?: string;
  // Campos derivados (joins)
  colaborador_nombre?: string;
  colaborador_documento?: string;
  cargo_nombre?: string;
  tipo_contrato_nombre?: string;
  tipo_contrato_codigo?: string;
}

@Injectable({
  providedIn: 'root',
})
export class ContratosColaboradorService {
  private servicio = environment.api + 'contratos-colaborador';

  constructor(private http: HttpClient) {}

  obtenerTodos() {
    return this.http
      .get<HttpResponse<Object>>(this.servicio, { observe: 'response' })
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

  obtenerByColaborador(idColaborador: any) {
    return this.http
      .get<HttpResponse<Object>>(
        this.servicio + `/colaborador/${idColaborador}`,
        { observe: 'response' }
      )
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

  obtenerDatosContrato(id: any) {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + `/datos-pdf/${id}`, {
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

  crear(contrato: ContratoColaborador) {
    const body = JSON.stringify(contrato);
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

  actualizar(contrato: ContratoColaborador) {
    const body = JSON.stringify(contrato);
    return this.http.put<any>(this.servicio, body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) throw respuesta.error;
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  marcarFirmado(id: any, ruta_documento_firmado?: string) {
    const body = JSON.stringify({ id, ruta_documento_firmado });
    return this.http
      .put<any>(this.servicio + '/marcar-firmado', body, httpOptions)
      .pipe(
        tap((respuesta: any) => {
          if (respuesta.error) throw respuesta.error;
          return respuesta;
        }),
        catchError(this.handleError)
      );
  }

  desmarcarFirmado(id: any) {
    const body = JSON.stringify({ id });
    return this.http
      .put<any>(this.servicio + '/desmarcar-firmado', body, httpOptions)
      .pipe(
        tap((respuesta: any) => {
          if (respuesta.error) throw respuesta.error;
          return respuesta;
        }),
        catchError(this.handleError)
      );
  }

  anular(id: any) {
    const body = JSON.stringify({ id });
    return this.http
      .put<any>(this.servicio + '/anular', body, httpOptions)
      .pipe(
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
