import {
  HttpClient,
  HttpErrorResponse,
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { httpOptions } from './http';

/**
 * Registro masivo de asistencia.
 *
 * Los cobros van en el mismo par de peticiones: se evalúan todos de una con
 * evaluarCobros() y se generan dentro de procesar(). Por dentro el backend usa
 * el mismo motor de la pantalla de asistencia, así que el cálculo es idéntico.
 */
@Injectable({
  providedIn: 'root'
})
export class AsistenciaMasivaService {

  private servicio = environment.api + 'asistencia-masiva';

  constructor(private http: HttpClient) { }

  /**
   * Estudiantes que se pueden procesar en esa fecha.
   * tipo: 'ingreso' trae los que no tienen movimiento abierto;
   *       'salida' trae los que sí lo tienen.
   */
  obtenerCandidatos(fecha: string, idGrupo: any, tipo: string) {
    const body = JSON.stringify({
      fecha: fecha,
      id_grupo: idGrupo,
      tipo: tipo
    });
    return this.http.post<any>(this.servicio + '/candidatos', body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) throw respuesta.error;
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Cobros extra de todo el lote en una sola petición.
   * filas: [ { id_estudiante, hora } ]
   */
  evaluarCobros(fecha: string, tipo: string, filas: any[]) {
    const body = JSON.stringify({
      fecha: fecha,
      tipo: tipo,
      filas: filas
    });
    return this.http.post<any>(this.servicio + '/evaluar-cobros', body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) throw respuesta.error;
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Procesa el lote y genera, en la misma petición, los cobros que cada fila
   * traiga marcados.
   */
  procesar(fecha: string, tipo: string, idUsuario: any, observacionGeneral: string, filas: any[]) {
    const body = JSON.stringify({
      fecha: fecha,
      tipo: tipo,
      id_usuario: idUsuario,
      observacion_general: observacionGeneral,
      filas: filas
    });
    return this.http.post<any>(this.servicio + '/procesar', body, httpOptions).pipe(
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
