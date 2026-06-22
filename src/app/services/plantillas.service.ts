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

export interface PlantillaContrato {
  titulo: string;
  introduccion: string;
  clausulas: Array<{
    numero: number;
    titulo: string;
    contenido: string;
  }>;
  pie_firma: string;
  autorizacion_imagenes: {
    titulo: string;
    contenido: string;
    pie_firma: string;
  };
  carta_instrucciones?: {
    titulo: string;
    numero_pagare: string;
    fecha: string;
    destinatario: string;
    contenido: string;
    autorizacion_diligenciamiento: {
      titulo: string;
      contenido: string;
    };
    clausula_aceleratoria: {
      titulo: string;
      contenido: string;
    };
    regimen_legal: {
      titulo: string;
      contenido: string;
    };
    autorizacion_cobro: {
      titulo: string;
      contenido: string;
    };
    pie_firma: string;
  };
  pagare?: {
    titulo: string;
    numero: string;
    debo_pagare: string;
    promesa: string;
    beneficiario: {
      nombre: string;
      nit: string;
    };
    lugar_pago: string;
    valor: {
      numerico: string;
      letras: string;
      complemento: string;
    };
    intereses: string;
    valor_recibido: string;
    vencimiento: string;
    nota_carta: string;
    pie_firma: string;
  };
}

export interface Plantilla {
  id?: string;
  id_tipo_plantilla: number;
  clave: string;
  titulo: string;
  contenido: any;
  fecha_creacion?: string;
  fecha_actualizacion?: string;
  tipo_codigo?: string;
  tipo_nombre?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PlantillasService {

  private servicio = environment.api + 'plantillas';

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

  obtenerByTipoClave(codigoTipo: string, clavePlantilla: string) {
    return this.http
      .get<HttpResponse<Object>>(
        `${this.servicio}/obtener-by-tipo-clave/${codigoTipo}/${clavePlantilla}`,
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

  obtenerByTipo(codigoTipo: string) {
    return this.http
      .get<HttpResponse<Object>>(
        `${this.servicio}/obtener-by-tipo/${codigoTipo}`,
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

  actualizar(plantilla: Plantilla) {
    const body = JSON.stringify(plantilla);
    return this.http.put<any>(this.servicio, body, httpOptions).pipe(
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