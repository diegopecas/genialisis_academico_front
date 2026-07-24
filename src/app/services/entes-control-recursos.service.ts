import { HttpClient, HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { httpOptions } from './http';

@Injectable({
  providedIn: 'root',
})
export class EntesControlRecursosService {
  private servicio = environment.api + 'entes-control-recursos';

  constructor(private http: HttpClient) {}

  // Configuración: recursos asignados a un ente.
  obtenerPorEnte(idEnteControl: string) {
    return this.http
      .get<HttpResponse<Object>>(`${this.servicio}/${idEnteControl}`, {
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

  // Todo lo que se le puede asignar al ente (marca lo ya asignado).
  obtenerDisponibles(idEnteControl: string) {
    return this.http
      .get<HttpResponse<Object>>(`${this.servicio}/${idEnteControl}/disponibles`, {
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

  // Asignación masiva: manda la selección completa en un solo arreglo.
  sincronizar(data: any) {
    return this.http
      .post<HttpResponse<Object>>(`${this.servicio}/sincronizar`, data, httpOptions)
      .pipe(
        tap((response: any) => {
          if (response.error) {
            throw response.error;
          }
          return response;
        }),
        catchError(this.handleError)
      );
  }

  // Consulta: documentos y reportes ya resueltos para mostrar al funcionario.
  resolver(idEnteControl: string) {
    return this.http
      .get<HttpResponse<Object>>(`${this.servicio}/${idEnteControl}/resolver`, {
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

  crear(data: any) {
    return this.http
      .post<HttpResponse<Object>>(this.servicio, data, httpOptions)
      .pipe(
        tap((response: any) => {
          if (response.error) {
            throw response.error;
          }
          return response;
        }),
        catchError(this.handleError)
      );
  }

  eliminar(id: string) {
    return this.http
      .request<HttpResponse<Object>>('delete', this.servicio, {
        ...httpOptions,
        body: { id: id },
      })
      .pipe(
        tap((response: any) => {
          if (response.error) {
            throw response.error;
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