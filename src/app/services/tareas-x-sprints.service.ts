import {
  HttpClient,
  HttpErrorResponse,
  HttpHeaders,
  HttpParams,
  HttpResponse,
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { httpOptions } from './http';

const httpSilent = {
  headers: new HttpHeaders({
    'Content-Type': 'application/json',
    'X-Silent': '1'
  })
};

@Injectable({
  providedIn: 'root'
})
export class TareasXSprintsService {

  private servicio = environment.api + 'tareas-x-sprints';
  private servicioB = environment.api + 'tareas-x-sprints-inicio';

  constructor(private http: HttpClient) { }

  iniciarTarea(id: any, id_docente: any, horario?: any, fingerprint?: any) {
    const payload: any = { id: id, id_docente: id_docente };
    if (horario) {
      payload.id_horario = horario.id;
      payload.dia_semana_horario = horario.id_dia_semana;
      payload.hora_inicial_horario = horario.hora_inicial;
      payload.hora_final_horario = horario.hora_final;
    }
    if (fingerprint) {
      payload.user_agent = fingerprint.userAgent;
      payload.huella_dispositivo = fingerprint.huella;
    }
    const body = JSON.stringify(payload);
    return this.http.put<any>(this.servicioB, body, httpOptions).pipe(
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

  finalizarTarea(id: any, id_docente: any) {
    const body = JSON.stringify({ id: id, id_docente: id_docente });
    return this.http.put<any>(this.servicio, body, httpOptions).pipe(
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

  obtenerBySprintId(id_sprint: any) {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + `/sprint/${id_sprint}`, {
        observe: 'response',
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

  obtenerBySprintIdDetallado(id_sprint: any) {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + `/sprint-detallado/${id_sprint}`, {
        observe: 'response',
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

  obtenerEstadisticasSprint(id_sprint: any) {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + `/estadisticas/${id_sprint}`, {
        observe: 'response',
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

  obtenerByActividadId(id_actividad: any): Observable<HttpResponse<Object>> {
    return this.http
      .get<HttpResponse<Object>>(`${this.servicio}/actividad/${id_actividad}`, {
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
    console.log("Actualizar tarea x sprint:", body);
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

  obtenerResumenClasesPorGrupo(idGrupo: number, idSprint?: number) {
    let params = new HttpParams();
    if (idSprint) {
      params = params.set('id_sprint', idSprint.toString());
    }
    return this.http
      .get<HttpResponse<Object>>(`${this.servicio}/resumen-grupo/${idGrupo}`, { params, observe: 'response' })
      .pipe(
        tap((response: HttpResponse<Object>) => {
          let respuesta: any = response.body;
          if (respuesta.error) { throw respuesta.error; }
          return response;
        }),
        catchError(this.handleError)
      );
  }

  obtenerResumenClasesTodosGrupos(idSprint?: number) {
    let params = new HttpParams();
    if (idSprint) {
      params = params.set('id_sprint', idSprint.toString());
    }
    return this.http
      .get<HttpResponse<Object>>(`${this.servicio}/resumen-todos-grupos`, { params, observe: 'response' })
      .pipe(
        tap((response: HttpResponse<Object>) => {
          let respuesta: any = response.body;
          if (respuesta.error) { throw respuesta.error; }
          return response;
        }),
        catchError(this.handleError)
      );
  }

  actualizarEstado(elemento: any): Observable<any> {
    var body = JSON.stringify(elemento);
    return this.http.put<any>(`${this.servicio}/cambiar-estado`, body, httpOptions).pipe(
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

  obtenerTareasParaImportar(idSprint: any, idGrupo?: any, idArea?: any, soloNoEjecutadas?: boolean) {
    let params = new HttpParams();
    if (idGrupo) { params = params.set('id_grupo', idGrupo.toString()); }
    if (idArea) { params = params.set('id_area_academica', idArea.toString()); }
    if (soloNoEjecutadas) { params = params.set('solo_no_ejecutadas', '1'); }

    return this.http
      .get<HttpResponse<Object>>(`${this.servicio}/importar/${idSprint}`, { params, observe: 'response' })
      .pipe(
        tap((response: HttpResponse<Object>) => {
          let respuesta: any = response.body;
          if (respuesta.error) { throw respuesta.error; }
          return response;
        }),
        catchError(this.handleError)
      );
  }

  importarMasivo(idSprintDestino: any, tareas: any[]): Observable<any> {
    const body = JSON.stringify({
      id_sprint_destino: idSprintDestino,
      tareas: tareas
    });
    return this.http.post<any>(`${this.servicio}/importar-masivo`, body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta && respuesta.error) {
          console.log(respuesta);
          throw respuesta.error;
        }
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  obtenerPorSprintGrupoArea(idSprint: any, idGrupo: any, idArea: any) {
    return this.http
      .get<HttpResponse<Object>>(`${this.servicio}/sprint-grupo-area/${idSprint}/${idGrupo}/${idArea}`, {
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

  actualizarOrden(ordenes: any[]): Observable<any> {
    const body = JSON.stringify({ ordenes: ordenes });
    return this.http.put<any>(`${this.servicio}/actualizar-orden`, body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta && respuesta.error) {
          console.log(respuesta);
          throw respuesta.error;
        }
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  actualizarOrdenYDuracion(tareas: any[]): Observable<any> {
    const body = JSON.stringify({ tareas: tareas });
    return this.http.put<any>(`${this.servicio}/actualizar-orden-duracion`, body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta && respuesta.error) {
          console.log(respuesta);
          throw respuesta.error;
        }
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  actualizarObservacion(id: any, observaciones: string): Observable<any> {
    const body = JSON.stringify({ id: id, observaciones: observaciones });
    return this.http.put<any>(`${this.servicio}/observacion`, body, httpSilent).pipe(
      tap((respuesta: any) => {
        if (respuesta && respuesta.error) {
          throw respuesta.error;
        }
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  sincronizarTareas(datos: any): Observable<any> {
    const body = JSON.stringify(datos);
    return this.http.put<any>(`${this.servicio}/sincronizar`, body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta && respuesta.error) {
          console.log(respuesta);
          throw respuesta.error;
        }
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  obtenerReporteEjecucionTareas(anio?: any, idSprint?: any) {
    let params = new HttpParams();
    if (anio) params = params.set('anio', anio.toString());
    if (idSprint) params = params.set('id_sprint', idSprint.toString());

    return this.http
      .get<HttpResponse<Object>>(`${this.servicio}/reporte-ejecucion`, { params, observe: 'response' })
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

  private handleError(error: HttpErrorResponse) {
    return throwError(() => error);
  }
}