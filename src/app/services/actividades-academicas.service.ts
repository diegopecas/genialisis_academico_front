import {
  HttpClient,
  HttpErrorResponse,
  HttpResponse,
  HttpParams,
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { httpOptions } from './http';

@Injectable({
  providedIn: 'root',
})
export class ActividadesAcademicasService {
  private servicio = environment.api + 'actividades-academicas';
  private servicioActividadGrupo = environment.api + 'actividades-academicas-grupo';
  private servicioFiltros = environment.api + 'actividades-academicas-filtros';

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

  obtenerByGrupo(id: any) {
    return this.http
      .get<HttpResponse<Object>>(this.servicioActividadGrupo + `/${id}`, {
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

  obtenerByGrupoArea(idGrupo: any, idAreaAcademica: any) {
    console.log("consulta actividades",this.servicioActividadGrupo + `/${idGrupo}/${idAreaAcademica}`);
    return this.http
      .get<HttpResponse<Object>>(this.servicioActividadGrupo + `/${idGrupo}/${idAreaAcademica}`, {
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

  obtenerPorFiltros(filtros: any) {
    let params = new HttpParams();
    
    if (filtros.id_corte) {
      params = params.set('id_corte', filtros.id_corte);
    }
    if (filtros.id_grupo) {
      params = params.set('id_grupo', filtros.id_grupo);
    }
    if (filtros.id_area) {
      params = params.set('id_area', filtros.id_area);
    }
    if (filtros.id_esfera) {
      params = params.set('id_esfera', filtros.id_esfera);
    }
    if (filtros.busqueda) {
      params = params.set('busqueda', filtros.busqueda);
    }
    
    return this.http
      .get<HttpResponse<Object>>(this.servicioFiltros, { 
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

  crear(elemento: any) {
    var body = JSON.stringify(elemento);
    return this.http.post<any>(this.servicio, body, httpOptions).pipe(
      tap((respuesta: any) => {
        //Se valida que si existe un mensaje de error
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
  actualizar(elemento: any) {
    var body = JSON.stringify(elemento);
    console.log("actualizar", body)
    return this.http.put<any>(this.servicio, body, httpOptions).pipe(
      tap((respuesta: any) => {
        //Se valida que si existe un mensaje de error
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
  

  eliminar(elemento: any) {
    var body = JSON.stringify(elemento);
    return this.http.request<any>('DELETE',  this.servicio, {
      body:body,
      headers: httpOptions.headers
    }).pipe(
      tap((respuesta: any) => {
        //Se valida que si existe un mensaje de error
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
  getIndicadoresLogrosByActividad(id: any) {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + `/indicadores-logros-actividad/${id}`, {
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
  private handleError(error: HttpErrorResponse) {
    return throwError(() => error);
  }
}