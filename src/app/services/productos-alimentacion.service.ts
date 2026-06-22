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
export class ProductosAlimentacionService {

  private servicio = environment.api + 'productos-alimentacion';

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

  crear(productoAlimentacion: any) {
    const body = JSON.stringify(productoAlimentacion);

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

  actualizar(productoAlimentacion: any) {
    const body = JSON.stringify(productoAlimentacion);
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

  obtenerDisponiblesParaAlimentacion() {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + '-disponibles-alimentacion', { observe: 'response' })
      .pipe(
        tap((response: HttpResponse<Object>) => {
          let respuesta: any = response.body;
          console.log("obtenerDisponiblesParaAlimentacion", respuesta);
          if (respuesta.error) {
            throw respuesta.error;
          }
          return response;
        }),
        catchError(this.handleError)
      );
  }

  // Nuevos métodos para gestionar clasificaciones
  obtenerClasificacionesPorProducto(idProductoAlimentacion: any) {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + `/${idProductoAlimentacion}/clasificaciones`, {
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

  asignarClasificaciones(idProductoAlimentacion: string, clasificaciones: string[]) {
    const body = JSON.stringify({ clasificaciones: clasificaciones });

    return this.http.post<any>(
      this.servicio + `/${idProductoAlimentacion}/clasificaciones`,
      body,
      httpOptions
    ).pipe(
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

  eliminarClasificacion(idProductoAlimentacion: string, idClasificacion: string) {
    return this.http.delete<any>(
      this.servicio + `/${idProductoAlimentacion}/clasificaciones/${idClasificacion}`,
      httpOptions
    ).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) throw respuesta.error;
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }
  obtenerProductosPorClasificacionConStock(idClasificacion: string) {
    return this.http
      .get<HttpResponse<Object>>(
        this.servicio + `/clasificacion/${idClasificacion}/con-stock`,
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
  validarStockMultiple(productos: any[]): Observable<any> {
    const body = JSON.stringify({ productos: productos });

    return this.http.post<any>(
      this.servicio + '/validar-stock-multiple',
      body,
      httpOptions
    ).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) {
          console.error('Error validando stock:', respuesta);
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