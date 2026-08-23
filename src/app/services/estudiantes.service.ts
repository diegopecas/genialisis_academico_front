import {
  HttpClient,
  HttpErrorResponse,
  HttpParams,
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

  // Listado filtrado del módulo. Solo se envían los filtros con valor; sin filtros trae todos.
  obtenerPorFiltros(filtros: { id_grupo?: any; estado?: any; permanente?: any; nombre?: any }) {
    let params = new HttpParams();

    if (filtros.id_grupo) {
      params = params.set('id_grupo', filtros.id_grupo);
    }
    if (filtros.estado) {
      params = params.set('estado', filtros.estado);
    }
    if (filtros.permanente !== undefined && filtros.permanente !== null && filtros.permanente !== '') {
      params = params.set('permanente', filtros.permanente);
    }
    if (filtros.nombre) {
      params = params.set('nombre', filtros.nombre);
    }

    return this.http
      .get<HttpResponse<Object>>(this.servicioXgrupo + '-filtros', { observe: 'response', params })
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

  // Lee la foto/archivo del registro civil con IA y devuelve los datos del niño y
  // sus padres para prellenar el asistente. No crea nada en la BD.
  analizarRegistroCivil(archivo: File) {
    const formData = new FormData();
    formData.append('registro_civil', archivo);

    return this.http.post<any>(this.servicio + '/analizar-registro-civil', formData).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) throw respuesta.error;
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  // Crea en una sola transacción el niño (persona + estudiante), su grupo/grado,
  // horarios y los acudientes (persona + acudiente). Los usuarios del portal se
  // crean aparte con Usuarios.crear a partir de los id_persona que devuelve.
  registroRapidoCompleto(data: any) {
    const body = JSON.stringify(data);
    return this.http.post<any>(this.servicio + '/registro-rapido-completo', body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) throw respuesta.error;
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Resuelve el caso de un documento antes de abrir el registro rápido.
   *
   * Devuelve el campo `caso` con uno de cuatro valores: persona_nueva,
   * persona_existente, estudiante_activo o estudiante_inactivo. En los dos
   * últimos trae además el estudiante, su grupo y, si está inactivo, sus
   * acudientes.
   */
  consultarPorDocumento(numeroIdentificacion: any) {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + `/consultar-documento/${numeroIdentificacion}`, { observe: 'response' })
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