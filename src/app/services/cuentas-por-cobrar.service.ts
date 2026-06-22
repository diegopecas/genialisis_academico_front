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

@Injectable({
  providedIn: 'root',
})
export class CuentasPorCobrarService {

  private servicio = environment.api + 'cuentas-por-cobrar';

  constructor(private http: HttpClient) { }

  obtenerTodos() {
    return this.http
      .get<HttpResponse<Object>>(this.servicio, { observe: 'response' })
      .pipe(
        tap((response: HttpResponse<Object>) => {
          let respuesta: any = response.body;
          if (respuesta.error) throw respuesta.error;
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
          if (respuesta.error) throw respuesta.error;
          return response;
        }),
        catchError(this.handleError)
      );
  }
  obtenerTodosXPersona(id_persona: any) {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + `/persona/${id_persona}`, {
        observe: 'response',
      })
      .pipe(
        tap((response: HttpResponse<Object>) => {
          let respuesta: any = response.body;
          if (respuesta.error) throw respuesta.error;
          return response;
        }),
        catchError(this.handleError)
      );
  }

  crear(elemento: any) {
    const body = JSON.stringify(elemento);
    return this.http.post<any>(this.servicio, body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) throw respuesta.error;
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  actualizar(elemento: any) {
    const body = JSON.stringify(elemento);
    return this.http.put<any>(this.servicio, body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) throw respuesta.error;
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }
  anular(elemento: any) {
    const body = JSON.stringify(elemento);
    return this.http.put<any>(this.servicio + "/anular", body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) throw respuesta.error;
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }
  eliminar(elemento: any) {
    const body = JSON.stringify(elemento);
    return this.http.request<any>('DELETE', this.servicio, {
      body,
      headers: httpOptions.headers,
    }).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) throw respuesta.error;
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }
  verificarDuplicados(elemento: any) {
    const body = JSON.stringify(elemento);
    return this.http.post<any>(this.servicio + '/verificar-duplicados', body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) throw respuesta.error;
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }
  obtenerTodosConDetalle() {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + '/detalle', { observe: 'response' })
      .pipe(
        tap((response: HttpResponse<Object>) => {
          let respuesta: any = response.body;
          if (respuesta.error) throw respuesta.error;
          return response;
        }),
        catchError(this.handleError)
      );
  }

  obtenerResumenCartera() {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + '/resumen', { observe: 'response' })
      .pipe(
        tap((response: HttpResponse<Object>) => {
          let respuesta: any = response.body;
          if (respuesta.error) throw respuesta.error;
          return response;
        }),
        catchError(this.handleError)
      );
  }
  obtenerTodosConDetalleAnual(anio: number) {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + `/detalle-anual/${anio}`, { observe: 'response' })
      .pipe(
        tap((response: HttpResponse<Object>) => {
          let respuesta: any = response.body;
          if (respuesta.error) throw respuesta.error;
          return response;
        }),
        catchError(this.handleError)
      );
  }

  obtenerReporteAnual(anio: number) {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + `/reporte-anual/${anio}`, { observe: 'response' })
      .pipe(
        tap((response: HttpResponse<Object>) => {
          let respuesta: any = response.body;
          if (respuesta.error) throw respuesta.error;
          return response;
        }),
        catchError(this.handleError)
      );
  }

  obtenerReporteCarteraEstudiantes(anio: number, idEstudiante: string | null = null) {
    let url = this.servicio + `/reporte-cartera-estudiantes/${anio}`;
    if (idEstudiante !== null) {
      url += `/${idEstudiante}`;
    }
    return this.http
      .get<HttpResponse<Object>>(url, { observe: 'response' })
      .pipe(
        tap((response: HttpResponse<Object>) => {
          let respuesta: any = response.body;
          if (respuesta.error) throw respuesta.error;
          return response;
        }),
        catchError(this.handleError)
      );
  }

  obtenerMultiplesByIds(ids: string[]) {
    const body = JSON.stringify({ ids: ids });
    return this.http.post<HttpResponse<Object>>(
      this.servicio + '/multiple',
      body,
      {
        ...httpOptions,
        observe: 'response'
      }
    ).pipe(
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

  generarDesdeContrato(idContrato: string, idUsuario: string | null) {
    const body = JSON.stringify({
      id_contrato: idContrato,
      id_usuario: idUsuario
    });
    return this.http.post<any>(this.servicio + '/generar-desde-contrato', body, httpOptions).pipe(
      tap((respuesta: any) => {
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  // Reporte desagregado de cobros (incluye estudiantes y colaboradores)
  obtenerReporteCobrosAnual(anio: number) {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + `/reporte-cobros-anual/${anio}`, { observe: 'response' })
      .pipe(
        tap((response: HttpResponse<Object>) => {
          let respuesta: any = response.body;
          if (respuesta.error) throw respuesta.error;
          return response;
        }),
        catchError(this.handleError)
      );
  }
  generarDesdeCursoExtra(data: any) {
    const body = JSON.stringify(data);
    return this.http.post<any>(this.servicio + '/generar-desde-curso-extra', body, httpOptions).pipe(
      tap((respuesta: any) => {
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }
 
  private handleError(error: HttpErrorResponse) {
    return throwError(() => error);
  }
}