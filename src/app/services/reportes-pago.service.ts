import {
  HttpClient,
  HttpErrorResponse,
  HttpResponse,
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { throwError } from 'rxjs';
import { catchError, tap, map } from 'rxjs/operators';
import { httpOptions } from './http';

@Injectable({
  providedIn: 'root',
})
export class ReportesPagoService {
  private servicio = environment.api + 'reportes-pago';

  constructor(private http: HttpClient) {}

  obtenerTodos() {
    return this.http
      .get<HttpResponse<Object>>(this.servicio, { observe: 'response' })
      .pipe(
        tap((response: HttpResponse<Object>) => {
          let respuesta: any = response.body;
          if (respuesta.error) throw respuesta.error;
          return response;
        }),
        catchError(this.handleError),
      );
  }

  obtenerById(id: any) {
    return this.http
      .get<
        HttpResponse<Object>
      >(this.servicio + `/${id}`, { observe: 'response' })
      .pipe(
        tap((response: HttpResponse<Object>) => {
          let respuesta: any = response.body;
          if (respuesta.error) throw respuesta.error;
          return response;
        }),
        catchError(this.handleError),
      );
  }

  obtenerByEstudiante(idEstudiante: any) {
    return this.http
      .get<
        HttpResponse<Object>
      >(this.servicio + '/estudiante/' + idEstudiante, { observe: 'response' })
      .pipe(
        tap((response: HttpResponse<Object>) => {
          let respuesta: any = response.body;
          if (respuesta.error) throw respuesta.error;
          return response;
        }),
        catchError(this.handleError),
      );
  }

  obtenerByPersonaReporta(idPersona: any) {
    return this.http
      .get<
        HttpResponse<Object>
      >(this.servicio + '/persona/' + idPersona, { observe: 'response' })
      .pipe(
        tap((response: HttpResponse<Object>) => {
          let respuesta: any = response.body;
          if (respuesta.error) throw respuesta.error;
          return response;
        }),
        catchError(this.handleError),
      );
  }

  obtenerPendientes() {
    return this.http
      .get<
        HttpResponse<Object>
      >(this.servicio + '/pendientes', { observe: 'response' })
      .pipe(
        tap((response: HttpResponse<Object>) => {
          let respuesta: any = response.body;
          if (respuesta.error) throw respuesta.error;
          return response;
        }),
        catchError(this.handleError),
      );
  }

  obtenerPendientesByColaborador(idColaborador: any) {
    return this.http
      .get<
        HttpResponse<Object>
      >(this.servicio + '/pendientes-colaborador/' + idColaborador, { observe: 'response' })
      .pipe(
        tap((response: HttpResponse<Object>) => {
          let respuesta: any = response.body;
          if (respuesta.error) throw respuesta.error;
          return response;
        }),
        catchError(this.handleError),
      );
  }

  obtenerPendientesByEstudiante(idEstudiante: any) {
    return this.http
      .get<
        HttpResponse<Object>
      >(this.servicio + '/pendientes-estudiante/' + idEstudiante, { observe: 'response' })
      .pipe(
        tap((response: HttpResponse<Object>) => {
          let respuesta: any = response.body;
          if (respuesta.error) throw respuesta.error;
          return response;
        }),
        catchError(this.handleError),
      );
  }

  obtenerByPagoRecibido(idPagoRecibido: any) {
    return this.http
      .get<
        HttpResponse<Object>
      >(this.servicio + '/pago-recibido/' + idPagoRecibido, { observe: 'response' })
      .pipe(
        tap((response: HttpResponse<Object>) => {
          let respuesta: any = response.body;
          if (respuesta.error) throw respuesta.error;
          return response;
        }),
        catchError(this.handleError),
      );
  }

  obtenerTiposPagoPortal() {
    return this.http
      .get<
        HttpResponse<Object>
      >(this.servicio + '/tipos-pago-portal', { observe: 'response' })
      .pipe(
        tap((response: HttpResponse<Object>) => {
          let respuesta: any = response.body;
          if (respuesta.error) throw respuesta.error;
          return response;
        }),
        catchError(this.handleError),
      );
  }

  obtenerColaboradoresActivos() {
    return this.http
      .get<
        HttpResponse<Object>
      >(this.servicio + '/colaboradores-activos', { observe: 'response' })
      .pipe(
        tap((response: HttpResponse<Object>) => {
          let respuesta: any = response.body;
          if (respuesta.error) throw respuesta.error;
          return response;
        }),
        catchError(this.handleError),
      );
  }

  crear(data: any) {
    const body = JSON.stringify(data);
    return this.http.post<any>(this.servicio, body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) throw respuesta.error;
        return respuesta;
      }),
      catchError(this.handleError),
    );
  }

  asociarPago(data: any) {
    const body = JSON.stringify(data);
    return this.http
      .put<any>(this.servicio + '/asociar', body, httpOptions)
      .pipe(
        tap((respuesta: any) => {
          if (respuesta.error) throw respuesta.error;
          return respuesta;
        }),
        catchError(this.handleError),
      );
  }

  eliminar(id: any) {
    return this.http.delete<any>(`${this.servicio}/${id}`).pipe(
      map((respuesta: any) => {
        if (respuesta?.error) {
          throw new Error(respuesta.error);
        }
        return respuesta;
      }),
      catchError(this.handleError),
    );
  }
  actualizarDocumento(data: { id: number; id_documento_persona: number }) {
    const body = JSON.stringify(data);
    return this.http
      .put<any>(this.servicio + '/documento', body, httpOptions)
      .pipe(
        tap((respuesta: any) => {
          if (respuesta.error) throw respuesta.error;
          return respuesta;
        }),
        catchError(this.handleError),
      );
  }
  private handleError(error: HttpErrorResponse) {
    return throwError(() => error);
  }
}
