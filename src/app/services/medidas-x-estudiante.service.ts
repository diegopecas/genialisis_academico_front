import {
  HttpClient,
  HttpErrorResponse,
  HttpParams,
  HttpResponse,
} from '@angular/common/http';
import { map, catchError, tap } from 'rxjs/operators';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { throwError } from 'rxjs';
import { httpOptions } from './http';
import { UtilService } from '../common/constantes/util.service';

@Injectable({
  providedIn: 'root'
})
export class MedidasXEstudianteService {

  private servicio = environment.api + 'medidas-x-estudiantes';

  constructor(
    private http: HttpClient,
    private utilService: UtilService
  ) { }

  obtenerById(id: any) {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + `/${id}`, { observe: 'response' })
      .pipe(
        tap((response: HttpResponse<Object>) => {
          let respuesta: any = response.body;
          if (respuesta.error) throw respuesta.error;
          return response;
        }),
        catchError(this.handleError)
      );
  }

  obtenerTodos() {
    return this.http
      .get<HttpResponse<Object>>(this.servicio, { observe: 'response' })
      .pipe(
        tap((response: HttpResponse<Object>) => {
          let respuesta: any = response.body;
          if (respuesta.error) throw respuesta.error;
          return response;
        }),
        catchError(this.handleError)
      );
  }

  obtenerTodosXEstudiante(idEstudiantes: any) {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + '/estudiante/' + idEstudiantes, { observe: 'response' })
      .pipe(
        tap((response: HttpResponse<Object>) => {
          let respuesta: any = response.body;
          if (respuesta.error) throw respuesta.error;
          return response;
        }),
        catchError(this.handleError)
      );
  }

  crear(medida_estudiante: any) {
    const idUsuario = this.utilService.obtenerIdUsuarioActual();
    const body = JSON.stringify({
      id_estudiante: medida_estudiante.id_estudiante,
      id_medida: medida_estudiante.id_medida,
      fecha: medida_estudiante.fecha,
      valor: medida_estudiante.valor,
      id_usuario: idUsuario,
      id_documento_persona: medida_estudiante.id_documento_persona || null
    });

    return this.http.post<any>(this.servicio, body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) throw respuesta.error;
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  actualizar(elemento: any) {
    const body = JSON.stringify(elemento);
    return this.http.put<any>(this.servicio, body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) throw respuesta.error;
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  delete(medida_estudiante: any) {
    return this.http.delete<any>(`${this.servicio}/${medida_estudiante.id}`).pipe(
      map((respuesta: any) => {
        if (respuesta?.error) throw new Error(respuesta.error);
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  verificarDuplicados(elemento: any) {
    const body = JSON.stringify(elemento);
    return this.http.post<any>(this.servicio + '/verificar-duplicados', body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) throw respuesta.error;
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  obtenerResumenMedidasPorGrupo(idGrupo: string, fechaInicio: string, fechaFin: string) {
    const params = new HttpParams()
      .set('fecha_inicio', fechaInicio)
      .set('fecha_fin', fechaFin);

    return this.http
      .get<HttpResponse<Object>>(`${this.servicio}/resumen-grupo/${idGrupo}`, { params, observe: 'response' })
      .pipe(
        tap((response: HttpResponse<Object>) => {
          let respuesta: any = response.body;
          if (respuesta.error) throw respuesta.error;
          return response;
        }),
        catchError(this.handleError)
      );
  }

  obtenerMedidasMultiplesEstudiantes(estudiantesIds: string[], fecha: string, medidasIds?: string[]) {
    const payload: any = {
      estudiantes_ids: estudiantesIds,
      fecha: fecha
    };
    if (medidasIds && medidasIds.length > 0) {
      payload.medidas_ids = medidasIds;
    }
    const body = JSON.stringify(payload);

    return this.http.post<any>(this.servicio + '/multiples', body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) throw respuesta.error;
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  analizarReporteMedidas(archivo: File, medidas: any[]) {
    const formData = new FormData();
    formData.append('imagen', archivo);
    formData.append('medidas', JSON.stringify(medidas));

    return this.http.post<any>(this.servicio + '/analizar-reporte', formData).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) throw respuesta.error;
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  registrarMasivo(payload: any) {
    const body = JSON.stringify(payload);
    return this.http.post<any>(this.servicio + '/registrar-masivo', body, httpOptions).pipe(
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