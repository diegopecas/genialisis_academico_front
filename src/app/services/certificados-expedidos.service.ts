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

export interface CertificadoDisponible {
  clave_certificado: string;
  nombre: string;
  modo: string;
  regla: string;
  cumple: number;
  mensaje: string | null;
  saldo_pendiente: number;
  agrupar_por_mes: number;
  es_de_pagos: number;
}

export interface ExpedirCertificado {
  clave_certificado: string;
  id_estudiante: string;
  id_acudiente?: string | null;
  anio_certificado?: number | null;
  fecha_desde?: string | null;
  fecha_hasta?: string | null;
  productos?: string[];
  dirigido_a?: string | null;
  agrupar_por_mes?: number | null;
  origen: string;
}

@Injectable({
  providedIn: 'root'
})
export class CertificadosExpedidosService {

  private servicio = environment.api + 'certificados-expedidos';

  constructor(private http: HttpClient) { }

  /**
   * Certificados que se pueden ofrecer para ese estudiante, con la regla ya
   * evaluada. El origen decide qué sale: 'institucional' trae todos,
   * 'padres' solo los automáticos y dice si cumple.
   */
  obtenerDisponibles(idEstudiante: string, origen: string) {
    return this.http
      .get<HttpResponse<Object>>(`${this.servicio}/disponibles/${idEstudiante}/${origen}`, {
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

  obtenerByEstudiante(idEstudiante: string) {
    return this.http
      .get<HttpResponse<Object>>(`${this.servicio}/estudiante/${idEstudiante}`, {
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

  /** Años lectivos en los que el estudiante estuvo matriculado. */
  obtenerAnios(idEstudiante: string) {
    return this.http
      .get<HttpResponse<Object>>(`${this.servicio}/anios/${idEstudiante}`, {
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

  /** Un certificado ya expedido, con su HTML, para volver a descargarlo. */
  obtenerById(id: string) {
    return this.http
      .get<HttpResponse<Object>>(`${this.servicio}/${id}`, {
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
   * Expide el certificado. Devuelve el HTML ya resuelto y guardado; el PDF se
   * dibuja en el front a partir de ese HTML.
   */
  expedir(datos: ExpedirCertificado) {
    const body = JSON.stringify(datos);
    return this.http.post<any>(this.servicio, body, httpOptions).pipe(
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
