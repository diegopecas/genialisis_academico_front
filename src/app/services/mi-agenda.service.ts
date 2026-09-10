import {
  HttpClient,
  HttpErrorResponse,
  HttpResponse,
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class MiAgendaService {

  private servicio = environment.api + 'mi-agenda';

  constructor(private http: HttpClient) { }

  /**
   * Línea de tiempo de un estudiante en una fecha.
   *
   * @param idEstudiante
   * @param fecha Formato Y-m-d
   * @param fuentes Claves a traer. Vacío = todas.
   */
  obtenerDia(idEstudiante: any, fecha: string, fuentes: string[] = []) {
    let url = this.servicio + `/${idEstudiante}/${fecha}`;

    if (fuentes.length > 0) {
      url += `?fuentes=${fuentes.join(',')}`;
    }

    return this.http
      .get<HttpResponse<Object>>(url, { observe: 'response' })
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

  /** Catálogo de fuentes disponibles, para pintar filtros y tabs. */
  obtenerFuentes() {
    return this.http
      .get<HttpResponse<Object>>(environment.api + 'mi-agenda-fuentes', { observe: 'response' })
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
