import { HttpClient, HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class MovimientosFinancierosService {
  private servicio = environment.api + 'movimientos-financieros';

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

  obtenerPorId(id: string) {
    return this.http
      .get<HttpResponse<Object>>(`${this.servicio}/${id}`, { observe: 'response' })
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

  obtenerPorFechas(fechaInicio: string, fechaFin: string) {
    return this.http
      .post<HttpResponse<Object>>(`${this.servicio}/fechas`,
        { fecha_inicio: fechaInicio, fecha_fin: fechaFin },
        { observe: 'response' })
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

  obtenerPendientesAprobacion() {
    return this.http
      .get<HttpResponse<Object>>(`${this.servicio}-pendientes-aprobacion`, { observe: 'response' })
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

  obtenerResumenPeriodo(fechaInicio: string, fechaFin: string) {
    return this.http
      .post<HttpResponse<Object>>(`${this.servicio}/resumen-periodo`,
        { fecha_inicio: fechaInicio, fecha_fin: fechaFin },
        { observe: 'response' })
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

  obtenerResumenPorCategoria(fechaInicio: string, fechaFin: string) {
    return this.http
      .post<HttpResponse<Object>>(`${this.servicio}/resumen-categoria`,
        { fecha_inicio: fechaInicio, fecha_fin: fechaFin },
        { observe: 'response' })
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

  // Reporte desagregado de movimientos por año (ingresos y egresos)
  obtenerReporteAnual(anio: number) {
    return this.http
      .get<HttpResponse<Object>>(`${this.servicio}/reporte-anual/${anio}`, { observe: 'response' })
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

  crear(data: any) {
    return this.http
      .post<HttpResponse<Object>>(this.servicio, data, { observe: 'response' })
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

  actualizar(data: any) {
    return this.http
      .put<HttpResponse<Object>>(this.servicio, data, { observe: 'response' })
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

  aprobar(id: string, idUsuarioAprobacion: string) {
    return this.http
      .put<HttpResponse<Object>>(`${this.servicio}/aprobar`,
        { id: id, id_usuario_aprobacion: idUsuarioAprobacion },
        { observe: 'response' })
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

  aprobarMultiple(datos: any) {
    return this.http
      .post<HttpResponse<Object>>(`${this.servicio}/aprobar-multiple`, datos, { observe: 'response' })
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

  anular(id: string, idUsuarioAnulacion: string) {
    return this.http
      .put<HttpResponse<Object>>(`${this.servicio}/anular`,
        { id: id, id_usuario_anulacion: idUsuarioAnulacion },
        { observe: 'response' })
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

  eliminar(id: string) {
    return this.http
      .delete<HttpResponse<Object>>(this.servicio, { body: { id }, observe: 'response' })
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

  private handleError(error: HttpErrorResponse) {
    return throwError(() => error);
  }
}