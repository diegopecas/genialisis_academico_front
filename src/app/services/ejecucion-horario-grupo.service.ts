import { HttpClient, HttpErrorResponse, HttpParams, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

/**
 * Reporte de ejecución del horario de un grupo en un rango de fechas. Solo
 * consulta: lo arma el back con la misma regla del tab Académico del
 * Dashboard Gerencial.
 */
@Injectable({
  providedIn: 'root'
})
export class EjecucionHorarioGrupoService {

  private servicio = environment.api + 'ejecucion-horario-grupo';

  constructor(private http: HttpClient) { }

  /** Días del rango (AAAA-MM-DD) en que el grupo tuvo alguna clase ejecutada */
  obtener(idGrupo: string, desde: string, hasta: string) {
    const params = new HttpParams()
      .set('id_grupo', idGrupo)
      .set('desde', desde)
      .set('hasta', hasta);

    return this.http
      .get<HttpResponse<Object>>(this.servicio, { observe: 'response', params })
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

  private handleError(error: HttpErrorResponse) {
    return throwError(() => error);
  }
}
