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
export class PdeAplicacionesService {

  private servicio = environment.api + 'pde-aplicaciones';

  constructor(private http: HttpClient) { }

  obtenerTodas() {
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

  obtenerListadoEstudiantes() {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + '/listado-estudiantes', { observe: 'response' })
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

  calcularEdad(idEstudiante: any) {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + `/calcular-edad/${idEstudiante}`, { observe: 'response' })
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

  obtenerResumenAsumidos(idRangoInicio: any) {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + `/resumen-asumidos/${idRangoInicio}`, { observe: 'response' })
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

  obtenerByEstudiante(idEstudiante: any) {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + `/estudiante/${idEstudiante}`, { observe: 'response' })
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

  retomar(idAplicacion: any) {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + `/${idAplicacion}/retomar`, { observe: 'response' })
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

  iniciar(data: any): Observable<any> {
    const body = JSON.stringify(data);
    return this.http.post<any>(this.servicio + '/iniciar', body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta && respuesta.error) {
          throw respuesta.error;
        }
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  guardarRango(data: { id_aplicacion: string, id_esfera: string, id_rango_edad: string, items: any[] }): Observable<any> {
    const body = JSON.stringify(data);
    return this.http.put<any>(this.servicio + '/guardar-rango', body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta && respuesta.error) {
          throw respuesta.error;
        }
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  finalizar(data: any): Observable<any> {
    const body = JSON.stringify(data);
    return this.http.put<any>(this.servicio + '/finalizar', body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta && respuesta.error) {
          throw respuesta.error;
        }
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  anular(id: any): Observable<any> {
    const body = JSON.stringify({ id: id });
    return this.http.put<any>(this.servicio + '/anular', body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta && respuesta.error) {
          throw respuesta.error;
        }
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  actualizarObservaciones(id: any, observaciones: string): Observable<any> {
    const body = JSON.stringify({ id, observaciones });
    return this.http.put<any>(this.servicio + '/observaciones', body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta && respuesta.error) {
          throw respuesta.error;
        }
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  actualizarAnalisis(data: { id: string, analisis: string, recomendaciones: string, id_usuario_analisis: string }): Observable<any> {
    const body = JSON.stringify(data);
    return this.http.put<any>(this.servicio + '/analisis', body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta && respuesta.error) {
          throw respuesta.error;
        }
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse) {
    return throwError(() => error);
  }
}
