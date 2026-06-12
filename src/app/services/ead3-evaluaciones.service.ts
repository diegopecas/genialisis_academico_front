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
export class Ead3EvaluacionesService {

  private servicio = environment.api + 'ead3-evaluaciones';

  constructor(private http: HttpClient) { }

  obtenerTodas() {
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

  calcularEdad(idEstudiante: any) {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + `/calcular-edad/${idEstudiante}`, {
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

  obtenerDetalle(idEvaluacion: any) {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + `/${idEvaluacion}/detalle`, {
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

  // Obtener evaluación completa para retomar (cabecera + ítems guardados)
  retomar(idEvaluacion: any) {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + `/${idEvaluacion}/retomar`, {
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

  crear(evaluacion: any) {
    const body = JSON.stringify(evaluacion);
    return this.http.post<any>(this.servicio, body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) {
          console.log(respuesta);
          throw respuesta.error;
        }
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  anular(id: any) {
    const body = JSON.stringify({ id: id });
    return this.http.put<any>(this.servicio + '/anular', body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) throw respuesta.error;
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  obtenerListadoEstudiantes() {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + '/listado-estudiantes', {
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

  iniciar(data: any) {
    const body = JSON.stringify(data);
    return this.http.post<any>(this.servicio + '/iniciar', body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) throw respuesta.error;
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  guardarArea(data: { id_evaluacion: number, area: string, items: any[] }) {
    const body = JSON.stringify(data);
    return this.http.put<any>(this.servicio + '/guardar-area', body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) throw respuesta.error;
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  finalizar(data: any) {
    const body = JSON.stringify(data);
    return this.http.put<any>(this.servicio + '/finalizar', body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) throw respuesta.error;
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  actualizarObservaciones(id: any, observaciones: string) {
    const body = JSON.stringify({ id, observaciones });
    return this.http.put<any>(this.servicio + '/observaciones', body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) throw respuesta.error;
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  actualizarAnalisis(data: { id: number, analisis: string, recomendaciones: string, id_usuario_analisis: number }) {
    const body = JSON.stringify(data);
    return this.http.put<any>(this.servicio + '/analisis', body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) throw respuesta.error;
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  actualizarItem(data: { id_evaluacion: number, id_detalle: number, cumple: number }) {
    const body = JSON.stringify(data);
    return this.http.put<any>(this.servicio + '/item', body, httpOptions).pipe(
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