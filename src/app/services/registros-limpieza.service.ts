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
export class RegistrosLimpiezaService {

  private servicio = environment.api + 'registros-limpieza';

  constructor(private http: HttpClient) { }

  obtenerTodos() {
    return this.http
      .get<HttpResponse<Object>>(this.servicio, { observe: 'response' })
      .pipe(
        tap((response: HttpResponse<Object>) => {
          let respuesta: any = response.body;
          if (respuesta?.error) {
            throw respuesta.error;
          }
          return response;
        }),
        catchError(this.handleError)
      );
  }

  obtenerPorId(id: any) {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + `/${id}`, {
        observe: 'response',
      })
      .pipe(
        tap((response: HttpResponse<Object>) => {
          let respuesta: any = response.body;
          if (respuesta?.error) {
            throw respuesta.error;
          }
          return response;
        }),
        catchError(this.handleError)
      );
  }

  crear(registro: any) {
    return this.http
      .post<HttpResponse<Object>>(this.servicio, registro, {
        ...httpOptions,
        observe: 'response',
      })
      .pipe(
        tap((response: HttpResponse<Object>) => {
          let respuesta: any = response.body;
          if (respuesta?.error) {
            throw respuesta.error;
          }
          return response;
        }),
        catchError(this.handleError)
      );
  }

  actualizar(registro: any) {
    return this.http
      .put<HttpResponse<Object>>(this.servicio, registro, {
        ...httpOptions,
        observe: 'response',
      })
      .pipe(
        tap((response: HttpResponse<Object>) => {
          let respuesta: any = response.body;
          if (respuesta?.error) {
            throw respuesta.error;
          }
          return response;
        }),
        catchError(this.handleError)
      );
  }

  iniciar(id: any) {
    return this.http
      .post<HttpResponse<Object>>(
        this.servicio + '/iniciar',
        { id },
        {
          ...httpOptions,
          observe: 'response',
        }
      )
      .pipe(
        tap((response: HttpResponse<Object>) => {
          let respuesta: any = response.body;
          if (respuesta?.error) {
            throw respuesta.error;
          }
          return response;
        }),
        catchError(this.handleError)
      );
  }

  finalizar(id: any, idUsuario: any) {
    return this.http
      .post<HttpResponse<Object>>(
        this.servicio + '/finalizar',
        { id, id_usuario: idUsuario },
        {
          ...httpOptions,
          observe: 'response',
        }
      )
      .pipe(
        tap((response: HttpResponse<Object>) => {
          let respuesta: any = response.body;
          if (respuesta?.error) {
            throw respuesta.error;
          }
          return response;
        }),
        catchError(this.handleError)
      );
  }

  supervisar(id: any, idUsuarioSupervisor: any, observaciones?: string) {
    return this.http
      .post<HttpResponse<Object>>(
        this.servicio + '/supervisar',
        { 
          id, 
          id_usuario_supervisor: idUsuarioSupervisor,
          observaciones 
        },
        {
          ...httpOptions,
          observe: 'response',
        }
      )
      .pipe(
        tap((response: HttpResponse<Object>) => {
          let respuesta: any = response.body;
          if (respuesta?.error) {
            throw respuesta.error;
          }
          return response;
        }),
        catchError(this.handleError)
      );
  }

  cancelar(id: any, motivo: string) {
    return this.http
      .post<HttpResponse<Object>>(
        this.servicio + '/cancelar',
        { id, motivo },
        {
          ...httpOptions,
          observe: 'response',
        }
      )
      .pipe(
        tap((response: HttpResponse<Object>) => {
          let respuesta: any = response.body;
          if (respuesta?.error) {
            throw respuesta.error;
          }
          return response;
        }),
        catchError(this.handleError)
      );
  }

  obtenerElementosParaProceso(idArea: any, idProceso: any) {
    return this.http
      .get<HttpResponse<Object>>(
        this.servicio + '/elementos-proceso',
        { 
          params: { 
            id_area: idArea.toString(), 
            id_proceso: idProceso.toString() 
          },
          observe: 'response' 
        }
      )
      .pipe(
        tap((response: HttpResponse<Object>) => {
          let respuesta: any = response.body;
          if (respuesta?.error) {
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