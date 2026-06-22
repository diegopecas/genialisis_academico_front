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
  providedIn: 'root'
})
export class TareasColaboradoresService {

  private servicio = environment.api + 'tareas-colaboradores';

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

  obtenerPorColaborador(idColaborador: string) {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + `/colaborador/${idColaborador}`, { observe: 'response' })
      .pipe(
        tap((response: HttpResponse<Object>) => {
          let respuesta: any = response.body;
          if (respuesta.error) throw respuesta.error;
          return response;
        }),
        catchError(this.handleError)
      );
  }

  obtenerById(id: string) {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + `/${id}`, { observe: 'response' })
      .pipe(
        tap((response: HttpResponse<Object>) => {
          let respuesta: any = response.body;
          if (respuesta.error) throw respuesta.error;
          return response;
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Obtiene las tareas cuya fecha límite cae dentro del mes/año indicado.
   * @param mes - Número del mes (1-12)
   * @param anio - Año (ej: 2026)
   */
  obtenerTareasPorMes(mes: number, anio: number) {
    return this.http
      .get<HttpResponse<Object>>(
        environment.api + `tareas-colaboradores-calendario?mes=${mes}&anio=${anio}`,
        { observe: 'response' }
      )
      .pipe(
        tap((response: HttpResponse<Object>) => {
          let respuesta: any = response.body;
          if (respuesta.error) throw respuesta.error;
          return response;
        }),
        catchError(this.handleError)
      );
  }

  crear(tarea: any) {
    const body = JSON.stringify(tarea);
    return this.http.post<any>(this.servicio, body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) throw respuesta.error;
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  crearMasivo(tareas: any[]) {
    const body = JSON.stringify({ tareas: tareas });
    return this.http.post<any>(this.servicio + '/masivo', body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) throw respuesta.error;
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  actualizar(tarea: any) {
    const body = JSON.stringify(tarea);
    return this.http.put<any>(this.servicio, body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) throw respuesta.error;
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Actualiza únicamente el estado de una tarea.
   * @param id - ID de la tarea
   * @param idEstado - ID del nuevo estado
   */
  cambiarEstado(id: string, idEstado: number) {
    const body = JSON.stringify({ id: id, id_estado: idEstado });
    return this.http.put<any>(this.servicio + '/estado', body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) throw respuesta.error;
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  eliminar(id: string) {
    const body = JSON.stringify({ id: id });
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

  private handleError(error: HttpErrorResponse) {
    return throwError(() => error);
  }
}