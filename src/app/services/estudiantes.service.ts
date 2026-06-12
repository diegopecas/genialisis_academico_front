import {
  HttpClient,
  HttpErrorResponse,
  HttpResponse,
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { httpOptions } from './http';

@Injectable({
  providedIn: 'root'
})
export class EstudiantesService {

  private servicio = environment.api + 'estudiantes';
  private servicioXgrupo = environment.api + 'estudiantes-x-grupos';

  constructor(private http: HttpClient) { }


  obtenerById(id: any) {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + `/${id}`, {
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

  obtenerTodosXGrupo(idGrupo: any) {
    return this.http
      .get<HttpResponse<Object>>(this.servicioXgrupo + '/' + idGrupo, { observe: 'response' })
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

  obtenerActivos() {
    return this.http
      .get<HttpResponse<Object>>(this.servicioXgrupo + '-activos', { observe: 'response' })
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

  obtenerGrupoByEstudiante(idEstudiante: any) {
    return this.http
      .get<HttpResponse<Object>>(this.servicioXgrupo + '/estudiante/' + idEstudiante, { observe: 'response' })
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

  activarEstudianteGrupo(idEstudiante: any, idGrupo: any, anio: any, idGrado: any = null) {
    const body = JSON.stringify({
      anio: anio,
      id_estudiante: idEstudiante,
      id_grupo: idGrupo,
      id_grado: idGrado ? idGrado : null
    });

    return this.http.post<any>(this.servicioXgrupo, body, httpOptions).pipe(
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

  inactivarEstudianteGrupo(id: any) {
    const body = JSON.stringify({ id: id });

    return this.http.put<any>(this.servicioXgrupo, body, httpOptions).pipe(
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


  crear(estudiante: any) {
    const body = JSON.stringify(estudiante);

    return this.http.post<any>(this.servicio, body, httpOptions).pipe(
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

  actualizar(estudiante: any) {
    const body = JSON.stringify(estudiante);
    return this.http.put<any>(this.servicio, body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) throw respuesta.error;
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  verificarDuplicados(id_persona: any) {
    const body = JSON.stringify({
      id_persona: id_persona
    });

    return this.http.post<any>(this.servicio + '/verificar-duplicados', body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) throw respuesta.error;
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  obtenerReporteCompleto() {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + '-reporte-completo', { observe: 'response' })
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

  obtenerReporteRecordatorios() {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + '-reporte-recordatorios', { observe: 'response' })
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

  actualizacionMasiva(body: any) {
    return this.http.post<any>(this.servicio + '/actualizacion-masiva', JSON.stringify(body), httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) throw respuesta.error;
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  cambioGrupoMasivo(body: any) {
    return this.http.post<any>(this.servicioXgrupo + '/cambio-grupo-masivo', JSON.stringify(body), httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) throw respuesta.error;
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  registroRapido(data: any) {
    const body = JSON.stringify(data);
    return this.http.post<any>(this.servicio + '/registro-rapido', body, httpOptions).pipe(
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