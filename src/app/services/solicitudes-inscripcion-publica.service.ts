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

@Injectable({
  providedIn: 'root'
})
export class SolicitudesInscripcionPublicaService {

  private servicio = environment.api + 'solicitudes-inscripcion-publica';

  constructor(private http: HttpClient) { }

  obtenerTodos() {
    return this.http
      .get<HttpResponse<Object>>(this.servicio, { observe: 'response' })
      .pipe(
        tap((response: HttpResponse<Object>) => {
          let respuesta: any = response.body;
          if (respuesta && respuesta.error) {
            throw respuesta.error;
          }
          return response;
        }),
        catchError(this.handleError)
      );
  }

  obtenerById(id: any) {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + `/${id}`, { observe: 'response' })
      .pipe(
        tap((response: HttpResponse<Object>) => {
          let respuesta: any = response.body;
          if (respuesta && respuesta.error) {
            throw respuesta.error;
          }
          return response;
        }),
        catchError(this.handleError)
      );
  }

  // Solicitudes que llegaron por una institución cliente. Alimenta su tab
  // de Solicitudes.
  obtenerPorInstitucion(idInstitucionCliente: any) {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + `/institucion/${idInstitucionCliente}`, { observe: 'response' })
      .pipe(
        tap((response: HttpResponse<Object>) => {
          let respuesta: any = response.body;
          if (respuesta && respuesta.error) {
            throw respuesta.error;
          }
          return response;
        }),
        catchError(this.handleError)
      );
  }

  // Horarios del curso de la solicitud con su ocupación (reservas fijas
  // frente al cupo), marcando los que escogió en el portal y los asignados.
  // Con idCursoExtra trae los de otro curso (cuando se cambia en la aprobación).
  obtenerHorarios(id: any, idCursoExtra?: string) {
    const sufijo = idCursoExtra ? `?id_curso_extra=${idCursoExtra}` : '';
    return this.http
      .get<HttpResponse<Object>>(this.servicio + `/horarios/${id}${sufijo}`, { observe: 'response' })
      .pipe(
        tap((response: HttpResponse<Object>) => {
          let respuesta: any = response.body;
          if (respuesta && respuesta.error) {
            throw respuesta.error;
          }
          return response;
        }),
        catchError(this.handleError)
      );
  }

  // Crea persona, estudiante, acudiente e inscripción, y una reserva fija
  // por cada horario marcado. Si la solicitud llegó del portal con plan,
  // también crea la cuenta por cobrar y el link de pago. Sin idsHorarios
  // el back usa los que la persona escogió en el portal.
  // idCursoExtra e idsTarifaDetalle son lo escogido en la aprobación (otro
  // curso, otro plan); sin ellos el back usa lo que trajo la solicitud.
  aprobar(id: any, idsHorarios?: string[], idCursoExtra?: string, idsTarifaDetalle?: string[]) {
    const datos: any = { id: id };
    if (idsHorarios) {
      datos.ids_horarios = idsHorarios;
    }
    if (idCursoExtra) {
      datos.id_curso_extra = idCursoExtra;
    }
    if (idsTarifaDetalle) {
      datos.ids_tarifa_detalle = idsTarifaDetalle;
    }
    const body = JSON.stringify(datos);
    return this.http.put<any>(this.servicio + '/aprobar', body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta && respuesta.error) throw respuesta.error;
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  rechazar(id: any, motivo: any) {
    const body = JSON.stringify({ id: id, motivo_rechazo: motivo });
    return this.http.put<any>(this.servicio + '/rechazar', body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta && respuesta.error) throw respuesta.error;
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  eliminar(id: any) {
    const body = JSON.stringify({ id: id });
    return this.http.delete<any>(this.servicio, { ...httpOptions, body }).pipe(
      tap((respuesta: any) => {
        if (respuesta && respuesta.error) throw respuesta.error;
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse) {
    return throwError(() => error);
  }
}
