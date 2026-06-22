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

export type ImageSize = 'thumb' | 'medium' | 'large' | 'original';

@Injectable({
  providedIn: 'root',
})
export class GaleriaImagenesService {
  private servicio = environment.api + 'galeria-imagenes';

  constructor(private http: HttpClient) {}

  /**
   * Obtener URL protegida para una imagen por su GUID
   * Incluye token y tenant en query string para uso en <img src="">
   */
  obtenerUrlImagen(guid: string, size: ImageSize = 'thumb'): string {
    const token = sessionStorage.getItem('token') || '';
    const tenant = sessionStorage.getItem('institucion_actual') || '';
    return `${this.servicio}/servir/${guid}?token=${token}&tenant=${tenant}&size=${size}`;
  }

  obtenerUrlThumb(guid: string): string {
    return this.obtenerUrlImagen(guid, 'thumb');
  }

  obtenerUrlMedium(guid: string): string {
    return this.obtenerUrlImagen(guid, 'medium');
  }

  obtenerUrlOriginal(guid: string): string {
    return this.obtenerUrlImagen(guid, 'original');
  }

  descargarImagen(guid: string) {
    const token = sessionStorage.getItem('token') || '';
    const tenant = sessionStorage.getItem('institucion_actual') || '';
    return this.http
      .get(`${this.servicio}/servir/${guid}?token=${token}&tenant=${tenant}&size=original`, {
        responseType: 'blob',
      })
      .pipe(catchError(this.handleError));
  }

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

  obtenerPorGaleria(idGaleria: any) {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + `/galeria/${idGaleria}`, {
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

  obtenerPorSubgaleria(idSubgaleria: any) {
    return this.http
      .get<HttpResponse<Object>>(
        this.servicio + `/subgaleria/${idSubgaleria}`,
        { observe: 'response' }
      )
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

  obtenerGenerales(idGaleria: any) {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + `/generales/${idGaleria}`, {
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

  crear(imagen: any) {
    const body = JSON.stringify(imagen);
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

  crearBulk(imagenes: any[]) {
    const body = JSON.stringify({ imagenes: imagenes });
    return this.http.post<any>(this.servicio + '/bulk', body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) {
          throw respuesta.error;
        }
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  actualizar(imagen: any) {
    const body = JSON.stringify(imagen);
    return this.http.put<any>(this.servicio, body, httpOptions).pipe(
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
    return this.http
      .request<any>('delete', this.servicio, { body: body, ...httpOptions })
      .pipe(
        tap((respuesta: any) => {
          if (respuesta.error) {
            throw respuesta.error;
          }
          return respuesta;
        }),
        catchError(this.handleError)
      );
  }

  /**
   * NUEVO: Eliminar múltiples imágenes a la vez
   * @param ids Array de IDs de imágenes a eliminar
   */
  eliminarMultiples(ids: string[]) {
    const body = JSON.stringify({ ids: ids });
    return this.http
      .request<any>('delete', this.servicio + '/bulk', { body: body, ...httpOptions })
      .pipe(
        tap((respuesta: any) => {
          if (respuesta.error) {
            throw respuesta.error;
          }
          return respuesta;
        }),
        catchError(this.handleError)
      );
  }

  eliminarPorGaleria(idGaleria: any) {
    return this.http.delete<any>(this.servicio + `/galeria/${idGaleria}`).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) {
          throw respuesta.error;
        }
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  eliminarPorSubgaleria(idSubgaleria: any) {
    return this.http
      .delete<any>(this.servicio + `/subgaleria/${idSubgaleria}`)
      .pipe(
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