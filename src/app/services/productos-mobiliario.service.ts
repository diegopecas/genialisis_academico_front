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
export class ProductosMobiliarioService {

  private servicio = environment.api + 'productos-mobiliario';


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

  crear(elementoFisico: any) {
    const body = JSON.stringify(elementoFisico);

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

  actualizar(elementoFisico: any) {
    const body = JSON.stringify(elementoFisico);
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
  obtenerDisponiblesParaMobiliario() {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + '-disponibles-mobiliario', { observe: 'response' })
      .pipe(
        tap((response: HttpResponse<Object>) => {
          let respuesta: any = response.body;
          console.log("obtenerDisponiblesParaMobiliario", respuesta)
          if (respuesta.error) {
            throw respuesta.error;
          }
          return response;
        }),
        catchError(this.handleError)
      );
  }
  obtenerMobiliarioConStock() {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + '-con-stock', { observe: 'response' })
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

  guardarAsignacionArea(datos: any) {
    const body = JSON.stringify(datos);
    return this.http.post<any>(this.servicio + '-guardar-asignacion', body, httpOptions).pipe(
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



  obtenerConceptosDevolucion() {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + '-conceptos-devolucion', { observe: 'response' })
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
  procesarDevolucionAsignacion(datos: any) {
    const body = JSON.stringify(datos);
    return this.http.post<any>(this.servicio + '-procesar-devolucion-asignacion', body, httpOptions).pipe(
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
  // ===== MÉTODOS PARA PRODUCTOS DE LIMPIEZA =====
  // Actualizar método para selección múltiple
  asignarProductosLimpieza(datos: any) {
    const body = JSON.stringify(datos);
    return this.http.post<any>(this.servicio + '/asignar-productos-limpieza', body, httpOptions).pipe(
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

  // Eliminar método actualizarAsignacionLimpieza (ya no es necesario)

  // Agregar métodos para procesos
  obtenerProcesosLimpiezaAsignados(idMobiliario: any) {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + `/${idMobiliario}/procesos-limpieza`, {
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

  obtenerProductosParaProceso(idMobiliario: any) {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + `/${idMobiliario}/productos-para-proceso`, {
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

  asignarProcesoLimpieza(datos: any) {
    const body = JSON.stringify(datos);
    return this.http.post<any>(this.servicio + '/asignar-proceso-limpieza', body, httpOptions).pipe(
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

  actualizarProcesoLimpieza(datos: any) {
    const body = JSON.stringify(datos);
    return this.http.put<any>(this.servicio + '/actualizar-proceso-limpieza', body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) {
          throw respuesta.error;
        }
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  eliminarProcesoLimpieza(id: any) {
    return this.http.delete<any>(this.servicio + `/proceso-limpieza/${id}`, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) {
          throw respuesta.error;
        }
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }
  eliminarAsignacionLimpieza(id: any) {
    return this.http.delete<any>(this.servicio + `/producto-limpieza/${id}`, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) {
          throw respuesta.error;
        }
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }
  obtenerProductosLimpiezaDisponibles(idMobiliario: any) {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + `/${idMobiliario}/productos-limpieza-disponibles`, {
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
  obtenerProductosLimpiezaAsignados(idMobiliario: any) {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + `/${idMobiliario}/productos-limpieza`, {
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
  // agregar producto a proceso existente
  agregarProductoAProceso(datos: any) {
    const body = JSON.stringify(datos);
    return this.http.post<any>(this.servicio + '/proceso-agregar-producto', body, httpOptions).pipe(
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

  // eliminar producto de un proceso
  eliminarProductoDeProceso(id: any) {
    return this.http.delete<any>(this.servicio + `/proceso-producto/${id}`, httpOptions).pipe(
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