import {
  HttpClient,
  HttpErrorResponse,
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { httpOptions } from './http';

@Injectable({
  providedIn: 'root',
})
export class IaMaquinaActividadesService {
  private servicio = environment.api + 'ia-maquina-actividades';

  constructor(private http: HttpClient) {}

  generarActividades(datos: any) {
    const body = JSON.stringify(datos);
    return this.http.post<any>(this.servicio + '/generar', body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) {
          throw respuesta.error;
        }
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  grabarActividades(datos: any) {
    const body = JSON.stringify(datos);
    return this.http.post<any>(this.servicio + '/grabar', body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) {
          throw respuesta.error;
        }
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  sugerirIndividual(datos: any) {
    const body = JSON.stringify(datos);
    return this.http.post<any>(this.servicio + '/sugerir-individual', body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) {
          throw respuesta.error;
        }
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  // Logros del corte (para grupo+corte, opcionalmente filtrado por área)
  obtenerLogrosEvaluacion(datos: any) {
    const body = JSON.stringify(datos);
    return this.http.post<any>(this.servicio + '/logros-evaluacion', body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) {
          throw respuesta.error;
        }
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  // Actividades existentes en un sprint agrupadas por logro
  obtenerActividadesPorLogroEnSprint(idSprint: any) {
    return this.http.get<any>(this.servicio + '/actividades-por-logro/' + idSprint).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) {
          throw respuesta.error;
        }
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  // Genera con IA una actividad de evaluación por cada logro
  generarActividadesEvaluacion(datos: any) {
    const body = JSON.stringify(datos);
    return this.http.post<any>(this.servicio + '/generar-evaluacion', body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) {
          throw respuesta.error;
        }
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  // Graba en lote actividades de evaluación
  grabarActividadesEvaluacion(datos: any) {
    const body = JSON.stringify(datos);
    return this.http.post<any>(this.servicio + '/grabar-evaluacion', body, httpOptions).pipe(
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