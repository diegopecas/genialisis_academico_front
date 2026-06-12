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
import { InstitucionConfigService } from './institucion-config.service';

export interface DocumentoPersona {
  id?: number;
  id_persona: number;
  id_tipo_documento: number;
  id_contrato?: number;
  nombre_archivo: string;
  ruta_archivo: string;
  tamanio_bytes?: number;
  fecha_subida?: string;
  fecha_vencimiento?: string;
  observaciones?: string;
  id_usuario_subio?: number;
  activo?: number;
  // Campos de firma digital
  firma_digital_id?: string;
  firma_digital_estado?: string;
  firma_digital_url?: string;
  fecha_envio_firma?: string;
  fecha_firmado?: string;
  proveedor_firma?: string;
  // Campos de la vista
  nombre_persona?: string;
  codigo_documento?: string;
  nombre_documento?: string;
  requiere_vencimiento?: number;
  requiere_firma?: number;
  dias_alerta_vencimiento?: number; // NUEVO: Días configurados para alerta de vencimiento
  estado_vencimiento?: string;
  dias_para_vencer?: number;
  nombre_usuario_subio?: string;
}

@Injectable({
  providedIn: 'root',
})
export class DocumentosPersonasService {
  private servicio = environment.api + 'documentos-personas';

  constructor(private http: HttpClient,
    private institucionConfigService: InstitucionConfigService
  ) {}

  obtenerPorPersona(
    idPersona: number,
    idContrato?: number,
    idTipoDocumento?: number,
  ) {
    let url = this.servicio + `/persona/${idPersona}`;
    const params: string[] = [];

    if (idContrato !== undefined) {
      params.push(`id_contrato=${idContrato}`);
    }

    if (idTipoDocumento !== undefined) {
      params.push(`id_tipo_documento=${idTipoDocumento}`);
    }

    if (params.length > 0) {
      url += '?' + params.join('&');
    }

    return this.http
      .get<HttpResponse<Object>>(url, { observe: 'response' })
      .pipe(
        tap((response: HttpResponse<Object>) => {
          let respuesta: any = response.body;
          if (respuesta.error) {
            throw respuesta.error;
          }
          return response;
        }),
        catchError(this.handleError),
      );
  }

  obtenerPorPersonaTipo(idPersona: number, idTipoDocumento: number) {
    return this.http
      .get<
        HttpResponse<Object>
      >(this.servicio + `/persona/${idPersona}/tipo/${idTipoDocumento}`, { observe: 'response' })
      .pipe(
        tap((response: HttpResponse<Object>) => {
          let respuesta: any = response.body;
          if (respuesta.error) {
            throw respuesta.error;
          }
          return response;
        }),
        catchError(this.handleError),
      );
  }

  obtenerVencimientos(dias: number = 30) {
    return this.http
      .get<
        HttpResponse<Object>
      >(this.servicio + `/vencimientos/${dias}`, { observe: 'response' })
      .pipe(
        tap((response: HttpResponse<Object>) => {
          let respuesta: any = response.body;
          if (respuesta.error) {
            throw respuesta.error;
          }
          return response;
        }),
        catchError(this.handleError),
      );
  }

  subirDocumento(formData: FormData) {
    return this.http.post<any>(this.servicio + '/upload', formData).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) {
          throw respuesta.error;
        }
        return respuesta;
      }),
      catchError(this.handleError),
    );
  }

  actualizar(documento: any) {
    const body = JSON.stringify(documento);
    return this.http.put<any>(this.servicio, body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) throw respuesta.error;
        return respuesta;
      }),
      catchError(this.handleError),
    );
  }

  eliminar(id: number) {
    const body = JSON.stringify({ id });
    return this.http
      .request<any>('delete', this.servicio, { body, ...httpOptions })
      .pipe(
        tap((respuesta: any) => {
          if (respuesta.error) throw respuesta.error;
          return respuesta;
        }),
        catchError(this.handleError),
      );
  }

  obtenerUrlDescarga(id: number): string {
    const tenant = this.institucionConfigService.getJardinCodigo();
    return (
      environment.api +
      'documentos-personas/download/' +
      id +
      '?tenant=' +
      tenant
    );
  }

  private handleError(error: HttpErrorResponse) {
    return throwError(() => error);
  }
}
