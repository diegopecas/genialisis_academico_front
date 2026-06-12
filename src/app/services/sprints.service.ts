import {
  HttpClient,
  HttpErrorResponse,
  HttpResponse,
  HttpParams
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { httpOptions } from './http';

@Injectable({
  providedIn: 'root'
})
export class SprintsService {

  private servicio = environment.api + 'sprints';

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

  obtenerById(id: any): Observable<HttpResponse<Object>> {
    return this.http
      .get<HttpResponse<Object>>(`${this.servicio}/${id}`, {
        observe: 'response',
      })
      .pipe(
        tap((response: HttpResponse<Object>) => {
          let respuesta: any = response.body;
          if (respuesta && respuesta.error) {
            throw respuesta.error;
          }
          return response;
        }),
        catchError(this.handleError)
      );
  }

  crear(elemento: any): Observable<any> {
    var body = JSON.stringify(elemento);
    return this.http.post<any>(this.servicio, body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta && respuesta.error) {
          console.log(respuesta);
          throw respuesta.error;
        }
        console.log(respuesta);
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  actualizar(elemento: any): Observable<any> {
    var body = JSON.stringify(elemento);
    console.log("Actualizar sprint:", body);
    return this.http.put<any>(this.servicio, body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta && respuesta.error) {
          console.log(respuesta);
          throw respuesta.error;
        }
        console.log(respuesta);
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  eliminar(elemento: any): Observable<any> {
    var body = JSON.stringify(elemento);
    return this.http.request<any>('DELETE', this.servicio, {
      body: body,
      headers: httpOptions.headers
    }).pipe(
      tap((respuesta: any) => {
        if (respuesta && respuesta.error) {
          console.log(respuesta);
          throw respuesta.error;
        }
        console.log(respuesta);
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }
  // Agregar este método en la clase SprintsService

  obtenerTodosConEstadisticas() {
    return this.http
      .get<HttpResponse<Object>>(`${this.servicio}-estadisticas`, { observe: 'response' })
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

  verificarSolapamiento(fechaInicial: string, fechaFinal: string, idExcluir?: string) {
    let params = new HttpParams()
      .set('fecha_inicial', fechaInicial)
      .set('fecha_final', fechaFinal);

    if (idExcluir) {
      params = params.set('id_excluir', idExcluir);
    }

    return this.http
      .get<HttpResponse<Object>>(`${this.servicio}/verificar-solapamiento`, {
        params: params,
        observe: 'response'
      })
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

  verificarNumeroUnico(anio: number, numeroSprint: number, idExcluir?: string) {
    let params = new HttpParams()
      .set('anio', anio.toString())
      .set('numero_sprint', numeroSprint.toString());

    if (idExcluir) {
      params = params.set('id_excluir', idExcluir);
    }

    return this.http
      .get<any>(`${this.servicio}/verificar-numero-unico`, {
        params: params,
        observe: 'response'
      })
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

  verificarSprintEvaluacion(idCorteAcademico: string, idExcluir?: string) {
    let params = new HttpParams()
      .set('id_corte_academico', idCorteAcademico);

    if (idExcluir) {
      params = params.set('id_excluir', idExcluir);
    }

    return this.http
      .get<any>(`${this.servicio}/verificar-sprint-evaluacion`, {
        params: params,
        observe: 'response'
      })
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

  obtenerPorAnio(anio: number) {
    return this.http
      .get<HttpResponse<Object>>(`${this.servicio}/por-anio/${anio}`, {
        observe: 'response'
      })
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

  // Obtiene el sprint actual y todos los sprints anteriores del mismo año institucional,
  // ordenados del más reciente al más antiguo
  obtenerActualYAnteriores() {
    return this.http
      .get<HttpResponse<Object>>(`${this.servicio}/actual-y-anteriores`, {
        observe: 'response'
      })
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

  // Obtiene únicamente los sprints marcados como evaluación (es_evaluacion = 1)
  // junto con el nombre del corte académico asociado, ordenados del más reciente al más antiguo
  obtenerEvaluaciones() {
    return this.http
      .get<HttpResponse<Object>>(`${environment.api}sprints-evaluaciones`, {
        observe: 'response'
      })
      .pipe(
        tap((response: HttpResponse<Object>) => {
          let respuesta: any = response.body;
          if (respuesta && respuesta.error) {
            throw respuesta.error;
          }
          return response;
        }),
        catchError(this.handleError)
      );
  }

  desactivarSprintsActuales(idExcluir?: string) {
    const body = {
      id_excluir: idExcluir || null
    };

    return this.http.put<any>(`${this.servicio}/desactivar-actuales`, body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta && respuesta.error) {
          console.log(respuesta);
          throw respuesta.error;
        }
        console.log(respuesta);
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }
  // Métodos para análisis de tiempo
  obtenerAnalisisTiempoSprint(id_sprint: string): Observable<HttpResponse<Object>> {
    return this.http
      .get<HttpResponse<Object>>(`${this.servicio}/analisis-tiempo/${id_sprint}`, {
        observe: 'response',
      })
      .pipe(
        tap((response: HttpResponse<Object>) => {
          const respuesta: any = response.body;
          if (respuesta && respuesta.error) {
            throw respuesta.error;
          }
          return response;
        }),
        catchError(this.handleError)
      );
  }

  validarActividadEnSprint(id_sprint: string, id_actividad: number): Observable<HttpResponse<Object>> {
    return this.http
      .get<HttpResponse<Object>>(`${this.servicio}/validar-actividad/${id_sprint}/${id_actividad}`, {
        observe: 'response',
      })
      .pipe(
        tap((response: HttpResponse<Object>) => {
          const respuesta: any = response.body;
          if (respuesta && respuesta.error) {
            throw respuesta.error;
          }
          return response;
        }),
        catchError(this.handleError)
      );
  }
  finalizarSprint(id: string): Observable<any> {
    return this.http.put<any>(`${this.servicio}/finalizar/${id}`, {}, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) {
          console.log(respuesta);
          throw respuesta.error;
        }
        console.log(respuesta);
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  obtenerAnalisisCoberturaCurricular(id_grupo: any, id_corte: any, opciones: { id_area?: any, id_esfera?: any } = {}) {
    let params = new HttpParams()
      .set('id_grupo', id_grupo)
      .set('id_corte', id_corte);

    if (opciones.id_area) {
      params = params.set('id_area', opciones.id_area);
    }
    if (opciones.id_esfera) {
      params = params.set('id_esfera', opciones.id_esfera);
    }

    return this.http
      .get<HttpResponse<Object>>(`${this.servicio}/cobertura-curricular`, { params, observe: 'response' })
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

  private handleError(error: HttpErrorResponse): Observable<never> {
    console.error('Error en SprintsService:', error);
    return throwError(() => new Error(`Ocurrió un error; por favor intente más tarde. Status: ${error.status}`));
  }
}