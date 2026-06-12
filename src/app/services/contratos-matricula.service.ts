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

export interface ContratoMatricula {
  id?: number;
  id_estudiante: number;
  anio: number;
  id_grupo: number;
  valor_matricula: number;
  valor_pension: number;
  valor_primera_cuota?: number;
  numero_cuotas: number;
  valor_total: number;
  fecha_firma: string;
  fecha_inicio?: string; 
  fecha_fin: string;
  lugar_firma: string;
  autoriza_imagenes: number;
  autoriza_pagare?: number;
  observaciones?: string;
  id_usuario_genera?: number;
  acudientes?: number[];
  firmado?: number;
  ruta_documento_firmado?: string;
}

export interface DatosContratoPDF {
  contrato: any;
  estudiante: any;
  acudientes: any[];
  configuracion: any;
}

@Injectable({
  providedIn: 'root'
})
export class ContratosMatriculaService {

  private servicio = environment.api + 'contratos-matricula';

  constructor(private http: HttpClient) { }

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

  obtenerByEstudiante(idEstudiante: any) {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + `/estudiante/${idEstudiante}`, {
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

  obtenerByAnio(anio: any) {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + `/anio/${anio}`, {
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

  obtenerAcudientesByContrato(idContrato: any) {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + `/${idContrato}/acudientes`, {
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

  obtenerDatosContrato(idContrato: any): Observable<any> {
    return this.http
      .get<any>(this.servicio + `/${idContrato}/datos-completos`)
      .pipe(
        tap((respuesta: any) => {
          if (respuesta.error) {
            throw respuesta.error;
          }
          return respuesta;
        }),
        catchError(this.handleError)
      );
  }

  crear(contrato: ContratoMatricula) {
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

  verificarExistente(idEstudiante: number, anio: number) {
    const body = JSON.stringify({ id_estudiante: idEstudiante, anio });

    return this.http.post<any>(this.servicio + '/verificar-existente', body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) {
          throw respuesta.error;
        }
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  actualizar(contrato: any) {
    const body = JSON.stringify(contrato);
    return this.http.put<any>(this.servicio, body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) throw respuesta.error;
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }


  marcarFirmado(id: number, rutaDocumentoFirmado?: string) {
    const body = JSON.stringify({ 
      id, 
      firmado: 1, 
      ruta_documento_firmado: rutaDocumentoFirmado 
    });
    return this.http.put<any>(this.servicio + '/marcar-firmado', body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) throw respuesta.error;
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }


  desmarcarFirmado(id: number) {
    const body = JSON.stringify({ id });
    return this.http.put<any>(this.servicio + '/desmarcar-firmado', body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) throw respuesta.error;
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }
  anular(id: number) {
    const body = JSON.stringify({ id });
    return this.http.put<any>(this.servicio + '/anular', body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) throw respuesta.error;
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  eliminar(id: any) {
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