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
export class GaleriasService {

  private servicio = environment.api + 'galerias';

  constructor(private http: HttpClient) {}

  /**
   * Obtener todas las galerías (admin)
   */
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

  /**
   * Obtener galerías activas
   */
  obtenerActivas() {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + '/activas', { observe: 'response' })
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
   * Obtener galería por ID
   */
  obtenerById(id: any) {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + `/${id}`, { observe: 'response' })
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
   * Obtener galerías visibles para un acudiente (MANTENER POR COMPATIBILIDAD)
   * Incluye: públicas + privadas de los grupos de sus estudiantes
   */
  obtenerPorAcudiente(idPersona: any) {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + `/acudiente/${idPersona}`, { observe: 'response' })
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
   * Obtener galerías visibles para un usuario del portal de padres
   * Combina acceso como acudiente + acceso como docente
   * 
   * @param idPersona ID de la persona
   * @param idDocente ID del docente (0 si no es docente)
   */
  obtenerPorUsuario(idPersona: string, idDocente: string) {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + `/usuario/${idPersona}/${idDocente}`, { observe: 'response' })
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
   * Obtener galería completa con subgalerías e imágenes (MANTENER POR COMPATIBILIDAD)
   * Valida acceso del acudiente
   */
  obtenerGaleriaCompleta(idGaleria: any, idPersona: any) {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + `/full/${idGaleria}/${idPersona}`, { observe: 'response' })
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
   * Obtener galería completa con validación de acceso como acudiente y/o docente
   * 
   * @param idGaleria ID de la galería
   * @param idPersona ID de la persona
   * @param idDocente ID del docente (0 si no es docente)
   */
  obtenerGaleriaCompletaUsuario(idGaleria: string, idPersona: string, idDocente: string) {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + `/full/${idGaleria}/${idPersona}/${idDocente}`, { observe: 'response' })
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
   * Crear nueva galería
   */
  crear(galeria: any) {
    const body = JSON.stringify(galeria);
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

  /**
   * Actualizar galería
   */
  actualizar(galeria: any) {
    const body = JSON.stringify(galeria);
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

  /**
   * Eliminar galería
   */
  eliminar(id: any) {
    const body = JSON.stringify({ id: id });
    return this.http.request<any>('delete', this.servicio, { body: body, ...httpOptions }).pipe(
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