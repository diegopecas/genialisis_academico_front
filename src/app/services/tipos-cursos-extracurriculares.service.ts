import { HttpClient, HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { httpOptions } from './http';

export interface TipoCursoExtracurricular {
  id?: string;
  nombre: string;
  descripcion?: string;
  color?: string;
  orden: number;
  activo: number;
}

@Injectable({
  providedIn: 'root'
})
export class TiposCursosExtracurricularesService {

  private servicio = environment.api + 'tipos-cursos-extracurriculares';

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

  /** Solo los activos: es lo que se ofrece en el selector del curso. */
  obtenerActivos() {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + '/activos', { observe: 'response' })
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

  obtenerById(id: string) {
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

  crear(data: TipoCursoExtracurricular) {
    return this.http
      .post<HttpResponse<Object>>(this.servicio, data, httpOptions)
      .pipe(
        tap((response: any) => {
          if (response.error) {
            throw response.error;
          }
          return response;
        }),
        catchError(this.handleError)
      );
  }

  actualizar(data: TipoCursoExtracurricular) {
    return this.http
      .put<HttpResponse<Object>>(this.servicio, data, httpOptions)
      .pipe(
        tap((response: any) => {
          if (response.error) {
            throw response.error;
          }
          return response;
        }),
        catchError(this.handleError)
      );
  }

  eliminar(id: string) {
    return this.http
      .request<HttpResponse<Object>>('delete', this.servicio, {
        ...httpOptions,
        body: { id: id }
      })
      .pipe(
        tap((response: any) => {
          if (response.error) {
            throw response.error;
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
