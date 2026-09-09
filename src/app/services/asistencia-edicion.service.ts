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

/**
 * Edición y eliminación de registros de asistencia ya hechos.
 *
 * Cuando la corrección cambia las horas, el backend borra los cobros
 * anteriores y devuelve `recalcular_cobros`; ahí el componente vuelve a
 * evaluar y ejecutar con MotorCobrosAutomaticosService y solo después llama a
 * notificarCorreccion, para que el mensaje al acudiente salga con los cobros
 * definitivos.
 */
@Injectable({
  providedIn: 'root'
})
export class AsistenciaEdicionService {

  private servicio = environment.api + 'asistencia-edicion';

  constructor(private http: HttpClient) { }

  obtenerListado(fecha: string, idGrupo: any) {
    const body = JSON.stringify({ fecha: fecha, id_grupo: idGrupo });
    return this.http.post<any>(this.servicio + '/listado', body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) throw respuesta.error;
        return respuesta;
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
          if (respuesta.error) {
            throw respuesta.error;
          }
          return response;
        }),
        catchError(this.handleError)
      );
  }

  actualizar(dato: any) {
    const body = JSON.stringify(dato);
    return this.http.put<any>(this.servicio, body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) throw respuesta.error;
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  notificarCorreccion(id: any, idUsuario: any) {
    const body = JSON.stringify({ id: id, id_usuario: idUsuario });
    return this.http.post<any>(this.servicio + '/notificar', body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) throw respuesta.error;
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  eliminar(id: any, idUsuario: any) {
    const body = JSON.stringify({ id: id, id_usuario: idUsuario });
    return this.http.delete<any>(this.servicio, { ...httpOptions, body: body }).pipe(
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
