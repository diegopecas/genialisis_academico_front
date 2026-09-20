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

/**
 * Endpoints de la página pública de inscripción. No llevan token: el
 * interceptor solo lo agrega si hay sesión, y en esta página no la hay.
 * El tenant sí viaja, porque el componente lo fija con setTenantManual
 * usando el código que viene en la URL.
 */
@Injectable({
  providedIn: 'root'
})
export class InscripcionPublicaService {

  private servicio = environment.api + 'inscripcion-publica';

  constructor(private http: HttpClient) { }

  obtenerConfiguracion() {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + '/configuracion', { observe: 'response' })
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

  obtenerCatalogos() {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + '/catalogos', { observe: 'response' })
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

  obtenerInstituciones() {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + '/instituciones', { observe: 'response' })
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

  // Va por POST porque la institución es opcional: sin ella devuelve los
  // cursos sin convenio, que son los del público general.
  obtenerCursos(idInstitucionCliente: any) {
    const body = JSON.stringify({ id_institucion_cliente: idInstitucionCliente });
    return this.http.post<any>(this.servicio + '/cursos', body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta && respuesta.error) throw respuesta.error;
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  obtenerHorarios(idCursoExtra: any) {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + `/horarios/${idCursoExtra}`, { observe: 'response' })
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

  registrar(solicitud: any) {
    const body = JSON.stringify(solicitud);
    return this.http.post<any>(this.servicio + '/registrar', body, httpOptions).pipe(
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
