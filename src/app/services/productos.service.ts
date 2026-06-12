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
export class ProductosService {

  private servicio = environment.api + 'productos';
  private uploadUrl = environment.api + 'upload';

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

  obtenerActivos() {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + '-activos', { observe: 'response' })
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

  obtenerPorProveedor(idProveedor: any) {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + `/proveedor/${idProveedor}`, {
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

  obtenerBajoStock() {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + '-bajo-stock', {
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

  crear(producto: any) {
    const body = JSON.stringify(producto);

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

  actualizar(producto: any) {
    const body = JSON.stringify(producto);
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

  verificarDuplicados(nombre: string, id?: number) {
    const body = JSON.stringify({
      nombre: nombre,
      id: id || 0
    });

    return this.http.post<any>(this.servicio + '-verificar-duplicados', body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) throw respuesta.error;
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  // Métodos para manejar proveedores del producto
  obtenerProveedoresProducto(idProducto: any) {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + `/${idProducto}/proveedores`, {
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

  asignarProveedor(datos: any) {
    const body = JSON.stringify(datos);
    return this.http.post<any>(this.servicio + '-proveedores/asignar', body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) throw respuesta.error;
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  quitarProveedor(idProducto: number, idProveedor: number) {
    const body = JSON.stringify({
      id_producto: idProducto,
      id_proveedor: idProveedor
    });
    return this.http.post<any>(this.servicio + '-proveedores/quitar', body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) throw respuesta.error;
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  obtenerPorTipo(idTipo: number) {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + `/tipo/${idTipo}`, {
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

  subirImagen(file: File, idProducto?: number): Observable<any> {
    const formData = new FormData();
    formData.append('imagen', file);
    if (idProducto) {
      formData.append('id_producto', idProducto.toString());
    }

    return this.http.post<any>(this.uploadUrl + '/producto-imagen', formData).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) throw respuesta.error;
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  eliminarImagen(filename: string): Observable<any> {
    const body = JSON.stringify({ filename: filename });
    return this.http.delete<any>(this.uploadUrl + '/producto-imagen', { ...httpOptions, body }).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) throw respuesta.error;
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  obtenerUrlImagen(imagen: string | null): string {
    if (!imagen) {
      return '/assets/images/producto.png';
    }
    // Si la imagen ya es una URL completa, la devolvemos
    if (imagen.startsWith('http')) {
      return imagen;
    }
    // Si no, construimos la URL completa
    return environment.api + imagen;
  }

  obtenerImagenBase64(id: number): Observable<any> {
    return this.http
      .get<HttpResponse<Object>>(environment.api + `productos-imagen-base64/${id}`, {
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