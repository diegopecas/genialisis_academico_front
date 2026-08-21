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
export class MotorCobrosAutomaticosService {

  private servicio = environment.api + 'motor-cobros';

  constructor(private http: HttpClient) { }

  evaluar(data: { id_estudiante: any, tipo_evento: string, hora: string, fecha?: string }) {
    const body = JSON.stringify(data);
    return this.http.post<any>(this.servicio + '/evaluar', body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) throw respuesta.error;
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  // tipo_asistencia es opcional: le dice al backend si el movimiento fue un
  // ingreso o una salida, para redactar la notificacion al portal de padres.
  // Si no se manda, el backend lo deduce de la fila de asistencia.
  ejecutar(data: { cobros: any[], id_estudiante: any, id_usuario: any, fecha?: string, tipo_asistencia?: string }) {
    const body = JSON.stringify(data);
    return this.http.post<any>(this.servicio + '/ejecutar', body, httpOptions).pipe(
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