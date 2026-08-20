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
export class InventarioDiarioService {

  private servicio = environment.api + 'inventario-diario';

  constructor(private http: HttpClient) { }

  // Arma la grilla del dia de un grupo. El backend siembra el dia de los
  // estudiantes que aun no lo tengan, con lo del ultimo dia registrado.
  obtenerDiaGrupo(idGrupo: any, fecha: string, soloPresentes: boolean, idUsuario: any) {
    const body = JSON.stringify({
      id_grupo: idGrupo,
      fecha: fecha,
      solo_presentes: soloPresentes ? 1 : 0,
      id_usuario: idUsuario
    });
    return this.http.post<any>(this.servicio + '/dia-grupo', body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) throw respuesta.error;
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  obtenerPorEstudiante(idEstudiante: any, fecha: string) {
    return this.http
      .get<HttpResponse<Object>>(environment.api + `inventario-diario-estudiante/${idEstudiante}/${fecha}`, { observe: 'response' })
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

  // Guarda los checks de la grilla en un solo viaje. El modo dice que columna
  // se esta editando: 'entrada' escribe trajo, 'salida' escribe regreso.
  guardarLote(modo: string, cambios: any[], idUsuario: any) {
    const body = JSON.stringify({ modo: modo, cambios: cambios, id_usuario: idUsuario });
    return this.http.post<any>(this.servicio + '/guardar-lote', body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) throw respuesta.error;
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  obtenerReporte(filtros: any) {
    const body = JSON.stringify(filtros);
    return this.http.post<any>(this.servicio + '/reporte', body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) throw respuesta.error;
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  crear(dato: any) {
    const body = JSON.stringify(dato);
    return this.http.post<any>(this.servicio, body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) throw respuesta.error;
        return respuesta;
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

  eliminar(id: any) {
    const body = JSON.stringify({ id: id });
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
