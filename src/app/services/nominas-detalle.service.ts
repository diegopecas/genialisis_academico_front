import { HttpClient, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, tap, throwError } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class NominasDetalleService {
  private servicio = environment.api + 'nominas-detalle';

  constructor(private http: HttpClient) { }

  /**
   * Obtener todos los detalles de una nómina
   */
  obtenerByNomina(idNomina: any) {
    return this.http
      .get<HttpResponse<Object>>(`${this.servicio}/nomina/${idNomina}`, {
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
   * Obtener detalle agrupado por colaborador
   */
  obtenerAgrupadoPorColaborador(idNomina: any) {
    return this.http
      .get<HttpResponse<Object>>(`${this.servicio}/nomina/${idNomina}/agrupado`, {
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
   * Obtener detalle de un colaborador específico en una nómina
   */
  obtenerByColaborador(idNomina: any, idColaborador: any) {
    return this.http
      .get<HttpResponse<Object>>(`${this.servicio}/nomina/${idNomina}/colaborador/${idColaborador}`, {
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
   * Obtener un detalle por ID
   */
  obtener(id: any) {
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
   * Crear nuevo detalle de nómina
   */
  crear(body: any) {
    return this.http
      .post<HttpResponse<Object>>(this.servicio, body, {
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
   * Crear múltiples detalles en una sola transacción
   */
  crearMultiple(body: any) {
    return this.http
      .post<HttpResponse<Object>>(`${this.servicio}/multiple`, body, {
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
   * Actualizar detalle de nómina
   */
  actualizar(body: any) {
    return this.http
      .put<HttpResponse<Object>>(this.servicio, body, {
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
   * Eliminar detalle de nómina
   */
  eliminar(body: any) {
    return this.http
      .delete<HttpResponse<Object>>(this.servicio, {
        body: body,
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
   * Eliminar todos los detalles de una nómina
   */
  eliminarByNomina(idNomina: any) {
    return this.http
      .delete<HttpResponse<Object>>(`${this.servicio}/nomina`, {
        body: { id_nomina: idNomina },
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

  private handleError(error: any) {
    console.error('Error en el servicio:', error);
    return throwError(() => error);
  }
}
