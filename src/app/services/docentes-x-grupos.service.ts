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
export class DocentesXGruposService {

  private servicio = environment.api + 'docentes-x-grupos';

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

  /**
   * Docentes asignados a un grupo, con el titular de primero.
   */
  obtenerPorGrupo(idGrupo: any) {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + `/grupo/${idGrupo}`, { observe: 'response' })
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

  obtenerPorDocente(idDocente: any) {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + `/docente/${idDocente}`, { observe: 'response' })
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

  obtenerTitular(idGrupo: any) {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + `/titular/${idGrupo}`, { observe: 'response' })
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

  crear(asignacion: any) {
    const body = JSON.stringify(asignacion);
    return this.http.post<any>(this.servicio, body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) throw respuesta.error;
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Marca o desmarca el titular. El backend se encarga de quitarle el
   * titular al que lo tuviera: solo puede haber uno por grupo.
   */
  actualizarTitular(id: any, esTitular: any) {
    const body = JSON.stringify({ id: id, es_titular: esTitular });
    return this.http.put<any>(this.servicio + '/titular', body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) throw respuesta.error;
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Baja logica de la asignacion. No se borra para no perder el historico
   * de quien estuvo a cargo del grupo.
   */
  desactivar(id: any) {
    const body = JSON.stringify({ id: id });
    return this.http.put<any>(this.servicio + '/desactivar', body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) throw respuesta.error;
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  activar(id: any) {
    const body = JSON.stringify({ id: id });
    return this.http.put<any>(this.servicio + '/activar', body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) throw respuesta.error;
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Guarda toda la asignación del grupo en un solo llamado: quiénes son los
   * docentes, cuál es el titular y qué área dicta cada uno.
   *
   * La pantalla trabaja en memoria y solo manda al grabar, así que aquí va
   * el estado completo, no una operación suelta.
   */
  guardarGrupo(idGrupo: any, docentes: any[]) {
    const body = JSON.stringify({ id_grupo: idGrupo, docentes: docentes });
    return this.http.put<any>(this.servicio + '/guardar-grupo', body, httpOptions).pipe(
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
