import {
  HttpClient,
  HttpErrorResponse,
  HttpHeaders,
  HttpResponse,
  HttpParams
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
export class CalificacionesService {

  private servicio = environment.api + 'calificaciones';
  private servicioCalificacionesTareaSprint = environment.api + 'calificaciones-tarea-sprint';
  private servicioCalificacionesVistaTarea = environment.api + 'calificaciones-vista-tarea';
  private servicioCalificacionesTareasSprintEstudiante = environment.api + 'calificaciones-tareas-sprint-estudiante';
  private servicioCalificacionesTareasSprintEstudiantes = environment.api + 'calificaciones-tareas-sprint-estudiantes';
  private servicioCalificacionesPDMEstudiante = environment.api + 'calificaciones-pdm-estudiante';
  private servicioCalificacionesPDMEstudiantes = environment.api + 'calificaciones-pdm-estudiantes';    

  constructor(private http: HttpClient) {}

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

  obtenerByTareaSprint(id: any) {
    return this.http
      .get<HttpResponse<Object>>(this.servicioCalificacionesTareaSprint + `/${id}`, { observe: 'response' })
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

  /**
   * Vista consolidada para calificar una tarea: estudiantes del grupo (presentes y ausentes)
   * con sus calificaciones, observaciones y flag de asistencia ya anidados.
   * Hace una sola llamada en lugar de varias separadas.
   */
  obtenerVistaTarea(id_grupo: any, id_tarea_sprint: any) {
    return this.http
      .get<HttpResponse<Object>>(this.servicioCalificacionesVistaTarea + `/${id_grupo}/${id_tarea_sprint}`, { observe: 'response' })
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

  calificar(id_estudiante: any, id_tarea_x_sprint: any, id_parametro_calificacion: any, id_valor_parametro_calificacion: any) {
    const body = JSON.stringify({
      id_estudiante: id_estudiante, 
      id_tarea_x_sprint: id_tarea_x_sprint, 
      id_parametro_calificacion: id_parametro_calificacion, 
      id_valor_parametro_calificacion: id_valor_parametro_calificacion
    });
    
    return this.http.post<any>(this.servicio, body, httpSilent).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) {
          console.log(respuesta);
          throw respuesta.error;
        }
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  actualizarCalificacion(id: any, id_valor_parametro_calificacion: any) {
    const body = JSON.stringify({id: id, id_valor_parametro_calificacion: id_valor_parametro_calificacion});
    
    return this.http.put<any>(this.servicio, body, httpSilent).pipe(
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

  consultarCalificacionesTareasSprintEstudiante(id_estudiante: any, id_sprint: any) {
    return this.http
      .get<HttpResponse<Object>>(this.servicioCalificacionesTareasSprintEstudiante + `/${id_estudiante}/${id_sprint}`, { observe: 'response' })
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

  consultarCalificacionesTareasSprintEstudiantes(id_sprint: any) {
    return this.http
      .get<HttpResponse<Object>>(this.servicioCalificacionesTareasSprintEstudiantes + `/${id_sprint}`, { observe: 'response' })
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

  consultarCalificacionesPDMXEstudiante(id_estudiante: any) {
    return this.http
      .get<HttpResponse<Object>>(this.servicioCalificacionesPDMEstudiante + `/${id_estudiante}`, { observe: 'response' })
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

  consultarCalificacionesPDMXEstudiantes() {
    return this.http
      .get<HttpResponse<Object>>(this.servicioCalificacionesPDMEstudiantes, { observe: 'response' })
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

  obtenerCalificacionesPorSprintEstudiantes(id_sprint: any, opciones: { id_grupo?: any, id_estudiante?: any } = {}) {
    let url = this.servicioCalificacionesTareasSprintEstudiantes + `/calificaciones/${id_sprint}`;
    
    let params = new HttpParams();
    
    if (opciones.id_grupo) {
      params = params.set('id_grupo', opciones.id_grupo);
    }
    
    if (opciones.id_estudiante) {
      url = `${this.servicioCalificacionesTareasSprintEstudiantes}/calificaciones/${id_sprint}/estudiante/${opciones.id_estudiante}`;
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
    
    return this.http
      .get<HttpResponse<Object>>(url, { params, observe: 'response' })
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

  obtenerCalificacionesEstudianteDetalle(id_sprint: any, id_estudiante: any) {
    return this.obtenerCalificacionesPorSprintEstudiantes(id_sprint, { id_estudiante });
  }

  obtenerCalificacionesPorGrupo(id_sprint: any, id_grupo: any) {
    return this.obtenerCalificacionesPorSprintEstudiantes(id_sprint, { id_grupo });
  }

  private handleError(error: HttpErrorResponse) {
    return throwError(() => error);
  }
}