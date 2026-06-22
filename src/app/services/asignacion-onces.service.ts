import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { httpOptions } from './http';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AsignacionOncesService {

  private servicio = environment.api + 'asignacion-onces';

  constructor(private http: HttpClient) {}

  /** Todos los estudiantes activos del día (presentes y ausentes). Carga una sola vez. */
  obtenerEstudiantesDelDia(fecha: string) {
    const body = JSON.stringify({ fecha });
    return this.http.post<any>(this.servicio + '/estudiantes-del-dia', body, httpOptions).pipe(
      tap((r: any) => { if (r?.error) throw r.error; }),
      catchError(this.handleError)
    );
  }

  /** Asignaciones ya hechas para fecha + horario. Carga una sola vez por horario seleccionado. */
  obtenerAsignacionesDelDia(fecha: string, id_horario: string) {
    const body = JSON.stringify({ fecha, id_horario });
    return this.http.post<any>(this.servicio + '/asignaciones-del-dia', body, httpOptions).pipe(
      tap((r: any) => { if (r?.error) throw r.error; }),
      catchError(this.handleError)
    );
  }

  /** Crea batch en cuentas_por_cobrar. Retorna asignaciones actualizadas. */
  crearBatch(data: {
    fecha: string;
    id_horario: string;
    id_producto_servicio: string;
    valor: number;
    id_usuario: string | null;
    detalle: string;
    estudiantes: string[];
  }) {
    const body = JSON.stringify(data);
    return this.http.post<any>(this.servicio + '/crear-batch', body, httpOptions).pipe(
      tap((r: any) => { if (r?.error) throw r.error; }),
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse) {
    return throwError(() => error);
  }
}