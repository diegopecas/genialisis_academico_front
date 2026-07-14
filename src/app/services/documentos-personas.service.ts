import {
  HttpClient,
  HttpErrorResponse,
  HttpHeaders,
  HttpResponse,
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { Observable, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { httpOptions } from './http';
import { InstitucionConfigService } from './institucion-config.service';

export interface DocumentoPersona {
  id?: string;
  id_persona: string;
  id_tipo_documento: string;
  id_contrato?: string;
  nombre_archivo: string;
  ruta_archivo: string;
  tamanio_bytes?: number;
  fecha_subida?: string;
  fecha_vencimiento?: string;
  observaciones?: string;
  id_usuario_subio?: string;
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
    idPersona: string,
    idContrato?: string,
    idTipoDocumento?: string,
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

  obtenerPorPersonaTipo(idPersona: string, idTipoDocumento: string) {
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

  eliminar(id: string) {
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

  /**
   * Pide al backend un token efímero (5 min) y arma la URL de descarga con ese
   * token. El token de sesion nunca viaja en la URL: la peticion del token va
   * por HttpClient (con Authorization y X-Tenant via interceptores) y solo el
   * token efímero, acotado a este documento, queda en la URL resultante.
   *
   * @param id id del documento
   * @param silencioso si true, la peticion no activa el spinner global (para
   *        miniaturas <img>, donde antes la URL era sincrona y sin spinner)
   */
  obtenerUrlDescargaConToken(id: string, silencioso = false): Observable<string> {
    const opciones = silencioso
      ? { headers: new HttpHeaders({ 'X-Silent': 'true' }) }
      : {};

    return this.http
      .get<any>(this.servicio + '/download-token/' + id, opciones)
      .pipe(
        map((respuesta: any) => {
          const tenant = this.institucionConfigService.getJardinCodigo();
          return (
            environment.api +
            'documentos-personas/download/' +
            id +
            '?token=' +
            respuesta.token +
            '&tenant=' +
            tenant
          );
        }),
        catchError(this.handleError),
      );
  }

  /**
   * Descarga un documento como blob a traves de HttpClient. Pasa por los
   * interceptores (Authorization y X-Tenant), asi que el token viaja en el
   * header y nunca en la URL. Devuelve la respuesta completa para poder leer
   * el blob y las cabeceras.
   */
  descargarDocumento(id: string): Observable<HttpResponse<Blob>> {
    return this.http
      .get(this.servicio + '/download/' + id, {
        observe: 'response',
        responseType: 'blob',
      })
      .pipe(catchError(this.handleError));
  }

  /**
   * Descarga directa (fire-and-forget): baja el archivo como blob y lo guarda
   * en el equipo. Centraliza el armado del enlace para los componentes que solo
   * necesitan disparar la descarga. Ante error, el interceptor global notifica.
   */
  descargarDocumentoArchivo(id: string, nombrePorDefecto = 'documento'): void {
    this.descargarDocumento(id).subscribe({
      next: (response: HttpResponse<Blob>) => {
        const blob = response.body as Blob;

        let nombreArchivo = nombrePorDefecto;
        const contentDisposition = response.headers?.get('Content-Disposition');
        if (contentDisposition) {
          const match = /filename="?([^"]+)"?/.exec(contentDisposition);
          if (match && match[1]) {
            nombreArchivo = match[1];
          }
        }

        const url = window.URL.createObjectURL(blob);
        const enlace = document.createElement('a');
        enlace.href = url;
        enlace.download = nombreArchivo;
        document.body.appendChild(enlace);
        enlace.click();
        document.body.removeChild(enlace);
        window.URL.revokeObjectURL(url);
      },
      error: (error: any) => {
        console.error('Error al descargar el documento:', error);
      },
    });
  }

  obtenerUrlDescarga(id: string): string {
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