import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { httpOptions } from './http';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class EntregaAlimentacionService {

  private servicio = environment.api + 'entrega-alimentacion';

  constructor(private http: HttpClient) {}

  obtenerPorFecha(fecha: string, id_horario: string) {
    const body = JSON.stringify({ fecha, id_horario });
    return this.http.post<any>(this.servicio + '/por-fecha', body, httpOptions).pipe(
      tap((r: any) => { if (r?.error) throw r.error; }),
      catchError(this.handleError)
    );
  }

  registrarBatch(
    ids_cuentas: string[],
    id_horario: string,
    id_usuario: number | null,
    cuentas_menus?: { id_cuenta: string; id_menu_programado: string | null; id_menu_servido: string | null }[]
  ) {
    const body = JSON.stringify({ ids_cuentas, id_horario, id_usuario, cuentas_menus: cuentas_menus || [] });
    return this.http.post<any>(this.servicio + '/registrar-batch', body, httpOptions).pipe(
      tap((r: any) => { if (r?.error) throw r.error; }),
      catchError(this.handleError)
    );
  }

  anularBatch(ids_cuentas: string[], id_horario: string, id_usuario: number | null) {
    const body = JSON.stringify({ ids_cuentas, id_horario, id_usuario });
    return this.http.post<any>(this.servicio + '/anular-batch', body, httpOptions).pipe(
      tap((r: any) => { if (r?.error) throw r.error; }),
      catchError(this.handleError)
    );
  }

  obtenerEntregadasParaInventario(fecha: string, id_horario: string) {
    const body = JSON.stringify({ fecha, id_horario });
    return this.http.post<any>(this.servicio + '/entregadas-para-inventario', body, httpOptions).pipe(
      tap((r: any) => { if (r?.error) throw r.error; }),
      catchError(this.handleError)
    );
  }

  obtenerMovimientosDelDia(fecha: string, id_horario: string) {
    const body = JSON.stringify({ fecha, id_horario });
    return this.http.post<any>(this.servicio + '/movimientos-del-dia', body, httpOptions).pipe(
      tap((r: any) => { if (r?.error) throw r.error; }),
      catchError(this.handleError)
    );
  }

  /** Devuelve los menús del día según la minuta, con ingredientes completos para cálculo en frontend */
  obtenerMenusDelDia(fecha: string) {
    return this.http.get<any>(`${this.servicio}/menus-del-dia?fecha=${fecha}`, httpOptions).pipe(
      tap((r: any) => { if (r?.error) throw r.error; }),
      catchError(this.handleError)
    );
  }

  /** Calcula ingredientes teóricos del inventario para las cuentas seleccionadas */
  calcularInventario(ids_cuentas: string[]) {
    const body = JSON.stringify({ ids_cuentas });
    return this.http.post<any>(this.servicio + '/calcular-inventario', body, httpOptions).pipe(
      tap((r: any) => { if (r?.error) throw r.error; }),
      catchError(this.handleError)
    );
  }

  /** Crea movimiento de salida registrado y asocia a las entregas */
  registrarConInventario(data: {
    ids_cuentas: string[];
    id_horario: string;
    id_concepto_movimiento: number;
    id_usuario: number | null;
    observaciones: string;
    detalle: {
      id_producto: string;
      cantidad_teorica: number;
      cantidad_real: number;
      precio_unitario: number;
      id_unidad_medida?: string | null;
      id_menu_programado?: string | null;
      id_menu_servido?: string | null;
    }[];
    cuentas_menus?: { id_cuenta: string; id_menu_programado: string | null; id_menu_servido: string | null }[];
  }) {
    const body = JSON.stringify(data);
    return this.http.post<any>(this.servicio + '/registrar-con-inventario', body, httpOptions).pipe(
      tap((r: any) => { if (r?.error) throw r.error; }),
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse) {
    return throwError(() => error);
  }
}