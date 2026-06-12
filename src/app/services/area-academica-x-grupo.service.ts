import {
  HttpClient,
  HttpErrorResponse,
  HttpResponse,
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { httpOptions } from './http';

@Injectable({
  providedIn: 'root'
})
export class AreaAcademicaXGrupoService {
  
  private servicio = environment.api + 'area-academica-x-grupo';

  constructor(private http: HttpClient) {}

  obtenerTodas() {
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

  obtenerPorGrupo(idGrupo: any) {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + '/grupo/' + idGrupo, { observe: 'response' })
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

  obtenerPorDocente(idDocente: any) {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + '/docente/' + idDocente, { observe: 'response' })
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

  obtenerPorAreaAcademica(idArea: any) {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + '/area/' + idArea, { observe: 'response' })
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

  obtenerResumenDocente(idDocente: any) {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + '/resumen-docente/' + idDocente, { observe: 'response' })
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

  crear(asignacion: any) {
    const body = JSON.stringify(asignacion);
    return this.http.post<any>(this.servicio, body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) {
          throw respuesta.error;
        }
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  actualizarDocente(id: any, idDocente: any) {
    const body = JSON.stringify({ 
      id: id, 
      id_docente: idDocente 
    });
    
    return this.http.put<any>(this.servicio + '/docente', body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) {
          throw respuesta.error;
        }
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  actualizarDocentePorAreaGrupo(idAreaAcademica: any, idGrupo: any, idDocente: any) {
    const body = JSON.stringify({ 
      id_area_academica: idAreaAcademica,
      id_grupo: idGrupo,
      id_docente: idDocente 
    });
    
    return this.http.put<any>(this.servicio + '/docente-area-grupo', body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) {
          throw respuesta.error;
        }
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  eliminar(id: any) {
    const body = JSON.stringify({ id: id });
    
    return this.http.delete<any>(this.servicio, { 
      ...httpOptions, 
      body: body 
    }).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) {
          throw respuesta.error;
        }
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  eliminarPorAreaGrupo(idAreaAcademica: any, idGrupo: any) {
    const body = JSON.stringify({ 
      id_area_academica: idAreaAcademica,
      id_grupo: idGrupo
    });
    
    return this.http.delete<any>(this.servicio + '/area-grupo', { 
      ...httpOptions, 
      body: body 
    }).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) {
          throw respuesta.error;
        }
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse) {
    return throwError(() => error);
  }
}