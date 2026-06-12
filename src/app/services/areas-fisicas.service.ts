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
export class AreasFisicasService {

  private servicio = environment.api + 'areas-fisicas';

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

  obtenerActivas() {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + '-activas', { observe: 'response' })
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

  crear(area: any) {
    const body = JSON.stringify(area);
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

  actualizar(area: any) {
    const body = JSON.stringify(area);
    return this.http.put<any>(this.servicio, body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) throw respuesta.error;
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  eliminar(id: any) {
    const body = JSON.stringify({ id: id });
    return this.http.delete<any>(this.servicio, { ...httpOptions, body }).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) throw respuesta.error;
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  // ===== MÉTODOS PARA GESTIÓN DE MOBILIARIO =====

  obtenerMobiliarioAsignado(idArea: any) {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + `-mobiliario/${idArea}`, {
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

  // ===== MÉTODOS PARA PROCESOS DE LIMPIEZA =====

  obtenerProcesosLimpieza(idArea: any) {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + `-procesos/${idArea}`, {
        observe: 'response',
      })
      .pipe(
        tap((response: HttpResponse<Object>) => {
          let respuesta: any = response.body;
          if (respuesta?.error) {
            throw respuesta.error;
          }
          return response;
        }),
        catchError(this.handleError)
      );
  }

  asignarProcesoLimpieza(data: any) {
    const body = JSON.stringify(data);
    return this.http.post<any>(this.servicio + '-procesos', body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta?.error) {
          throw respuesta.error;
        }
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  actualizarProcesoLimpieza(data: any) {
    const body = JSON.stringify(data);
    return this.http.put<any>(this.servicio + '-procesos', body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta?.error) {
          throw respuesta.error;
        }
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  eliminarProcesoLimpieza(id: any) {
    return this.http.delete<any>(this.servicio + `-procesos/${id}`, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta?.error) {
          throw respuesta.error;
        }
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  obtenerCargaTrabajo(idArea: any) {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + `-carga-trabajo/${idArea}`, {
        observe: 'response',
      })
      .pipe(
        tap((response: HttpResponse<Object>) => {
          let respuesta: any = response.body;
          if (respuesta?.error) {
            throw respuesta.error;
          }
          return response;
        }),
        catchError(this.handleError)
      );
  }
  inactivarProcesoLimpieza(id: any) {
    return this.http.put<any>(this.servicio + `-procesos/inactivar/${id}`, {}, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta?.error) {
          throw respuesta.error;
        }
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }
  activarProcesoLimpieza(id: any) {
    return this.http.put<any>(this.servicio + `-procesos/activar/${id}`, {}, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta?.error) {
          throw respuesta.error;
        }
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }
  // ===== MÉTODOS PARA ELEMENTOS FÍSICOS =====

  obtenerElementosFisicosAsignados(idArea: any) {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + `-elementos/${idArea}`, {
        observe: 'response',
      })
      .pipe(
        tap((response: HttpResponse<Object>) => {
          let respuesta: any = response.body;
          if (respuesta?.error) {
            throw respuesta.error;
          }
          return response;
        }),
        catchError(this.handleError)
      );
  }

  obtenerCondicionesElemento() {
    return this.http
      .get<HttpResponse<Object>>(environment.api + 'condiciones-elemento', {
        observe: 'response',
      })
      .pipe(
        tap((response: HttpResponse<Object>) => {
          let respuesta: any = response.body;
          if (respuesta?.error) {
            throw respuesta.error;
          }
          return response;
        }),
        catchError(this.handleError)
      );
  }

  asignarElementoFisico(data: any) {
    const body = JSON.stringify(data);
    return this.http.post<any>(this.servicio + '-elementos', body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta?.error) {
          throw respuesta.error;
        }
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  actualizarAsignacionElemento(data: any) {
    const body = JSON.stringify(data);
    return this.http.put<any>(this.servicio + '-elementos', body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta?.error) {
          throw respuesta.error;
        }
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  eliminarAsignacionElemento(id: any) {
    return this.http.delete<any>(this.servicio + `-elementos/${id}`, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta?.error) {
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