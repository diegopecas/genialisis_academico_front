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
 * Los cobros automáticos no pasan por aquí: se evalúan y se ejecutan con
 * MotorCobrosAutomaticosService, el mismo que usa la pantalla de asistencia,
 * para que el cálculo sea idéntico en las dos.
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
   * Procesa el lote. Devuelve, por fila, el id del movimiento creado o cerrado
   * para poder ejecutar después los cobros que hayan quedado marcados.
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
