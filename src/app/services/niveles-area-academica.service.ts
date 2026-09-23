import { HttpClient, HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { httpOptions } from './http';

export interface NivelAreaAcademica {
  id?: string;
  id_area_academica: string;
  nombre: string;
  descripcion?: string;
  orden: number;
  activo: number;
}

@Injectable({
  providedIn: 'root'
})
export class NivelesAreaAcademicaService {

  private servicio = environment.api + 'niveles-area-academica';

  constructor(private http: HttpClient) { }

  /** Todos los niveles del área, activos e inactivos. Para el tab de niveles. */
  obtenerByArea(idArea: any) {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + `/area/${idArea}`, { observe: 'response' })
      .pipe(catchError(this.handleError));
  }

  /** Solo los activos: es lo que se ofrece al inscribir o al crear un logro. */
  obtenerActivosByArea(idArea: any) {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + `/area/${idArea}/activos`, { observe: 'response' })
      .pipe(catchError(this.handleError));
  }

  /** Niveles del área del curso, sin tener que consultar el curso primero. */
  obtenerByCursoExtra(idCursoExtra: any) {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + `/curso-extra/${idCursoExtra}`, { observe: 'response' })
      .pipe(catchError(this.handleError));
  }

  obtenerById(id: any) {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + `/${id}`, { observe: 'response' })
      .pipe(catchError(this.handleError));
  }

  crear(data: NivelAreaAcademica) {
    return this.http
      .post<any>(this.servicio, data, httpOptions)
      .pipe(catchError(this.handleError));
  }

  actualizar(data: NivelAreaAcademica) {
    return this.http
      .put<any>(this.servicio, data, httpOptions)
      .pipe(catchError(this.handleError));
  }

  eliminar(id: any) {
    return this.http
      .request<any>('delete', this.servicio, { ...httpOptions, body: { id: id } })
      .pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse) {
    return throwError(() => error);
  }
}
