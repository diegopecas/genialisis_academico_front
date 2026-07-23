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
export class RegistrosLimpiezaService {

  private servicio = environment.api + 'registros-limpieza';

  constructor(private http: HttpClient) { }

  obtenerTodos() {
    return this.http
      .get<HttpResponse<Object>>(this.servicio, { observe: 'response' })
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

  obtenerPorId(id: any) {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + `/${id}`, {
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

  crear(registro: any) {
    return this.http
      .post<HttpResponse<Object>>(this.servicio, registro, {
        ...httpOptions,
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

  actualizar(registro: any) {
    return this.http
      .put<HttpResponse<Object>>(this.servicio, registro, {
        ...httpOptions,
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

  iniciar(id: any) {
    return this.http
      .post<HttpResponse<Object>>(
        this.servicio + '/iniciar',
        { id },
        {
          ...httpOptions,
          observe: 'response',
        }
      )
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

  finalizar(id: any, idUsuario: any) {
    return this.http
      .post<HttpResponse<Object>>(
        this.servicio + '/finalizar',
        { id, id_usuario: idUsuario },
        {
          ...httpOptions,
          observe: 'response',
        }
      )
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

  supervisar(id: any, idUsuarioSupervisor: any, observaciones?: string) {
    return this.http
      .post<HttpResponse<Object>>(
        this.servicio + '/supervisar',
        { 
          id, 
          id_usuario_supervisor: idUsuarioSupervisor,
          observaciones 
        },
        {
          ...httpOptions,
          observe: 'response',
        }
      )
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

  cancelar(id: any, motivo: string) {
    return this.http
      .post<HttpResponse<Object>>(
        this.servicio + '/cancelar',
        { id, motivo },
        {
          ...httpOptions,
          observe: 'response',
        }
      )
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

  obtenerElementosParaProceso(idArea: any, idProceso: any) {
    return this.http
      .get<HttpResponse<Object>>(
        this.servicio + '/elementos-proceso',
        { 
          params: { 
            id_area: idArea.toString(), 
            id_proceso: idProceso.toString() 
          },
          observe: 'response' 
        }
      )
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

  obtenerPreviewRapido(idProceso: any) {
    return this.http
      .get<HttpResponse<Object>>(
        this.servicio + '/rapido-preview',
        {
          params: {
            id_proceso: idProceso.toString()
          },
          observe: 'response'
        }
      )
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

  crearRapido(datos: any) {
    return this.http
      .post<HttpResponse<Object>>(this.servicio + '/rapido', datos, {
        ...httpOptions,
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

  obtenerPendientesSupervision(filtros: any = {}) {
    let params: any = {};
    if (filtros.fecha_desde) params.fecha_desde = filtros.fecha_desde;
    if (filtros.fecha_hasta) params.fecha_hasta = filtros.fecha_hasta;
    if (filtros.id_proceso) params.id_proceso = filtros.id_proceso;

    return this.http
      .get<HttpResponse<Object>>(
        this.servicio + '/pendientes-supervision',
        { params, observe: 'response' }
      )
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

  supervisarLote(datos: any) {
    return this.http
      .post<HttpResponse<Object>>(this.servicio + '/supervisar-lote', datos, {
        ...httpOptions,
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

  obtenerReporteAseo(filtros: any) {
    let params: any = {
      fecha_desde: filtros.fecha_desde,
      fecha_hasta: filtros.fecha_hasta,
      id_proceso: filtros.id_proceso,
    };
    if (filtros.id_area) params.id_area = filtros.id_area;

    return this.http
      .get<HttpResponse<Object>>(this.servicio + '/reporte-aseo', {
        params,
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

  obtenerProductosModoUso(idProceso: any, areas: any[]) {
    return this.http
      .post<HttpResponse<Object>>(this.servicio + '/productos-modo-uso',
        { id_proceso: idProceso, areas: areas },
        { ...httpOptions, observe: 'response' }
      )
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

  obtenerMasivoPreview(idProceso: any, fechaDesde: string, fechaHasta: string) {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + '/masivo-preview', {
        params: {
          id_proceso: idProceso.toString(),
          fecha_desde: fechaDesde,
          fecha_hasta: fechaHasta,
        },
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

  crearMasivo(datos: any) {
    return this.http
      .post<HttpResponse<Object>>(this.servicio + '/masivo', datos, {
        ...httpOptions,
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

  obtenerEdicionMasivaPreview(filtros: any) {
    const params: any = {
      fecha_desde: filtros.fecha_desde,
      fecha_hasta: filtros.fecha_hasta,
    };
    if (filtros.id_proceso) {
      params.id_proceso = filtros.id_proceso;
    }
    if (filtros.id_area) {
      params.id_area = filtros.id_area;
    }
    if (filtros.id_estado) {
      params.id_estado = filtros.id_estado.toString();
    }

    return this.http
      .get<HttpResponse<Object>>(this.servicio + '/edicion-masiva-preview', {
        params: params,
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

  editarLote(datos: any) {
    return this.http
      .post<HttpResponse<Object>>(this.servicio + '/editar-lote', datos, {
        ...httpOptions,
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

  eliminarLote(datos: any) {
    return this.http
      .post<HttpResponse<Object>>(this.servicio + '/eliminar-lote', datos, {
        ...httpOptions,
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

  private handleError(error: HttpErrorResponse) {
    return throwError(() => error);
  }
}