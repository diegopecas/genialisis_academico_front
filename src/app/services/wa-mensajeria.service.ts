import { HttpClient, HttpErrorResponse, HttpHeaders, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { httpOptions } from './http';

// Headers silenciosos (no activan spinner ni notificaciones de error)
const silentOptions = {
  headers: new HttpHeaders({
    'Content-Type': 'application/json',
    'X-Silent': 'true'
  })
};

const silentGetOptions = {
  observe: 'response' as const,
  headers: new HttpHeaders({
    'X-Silent': 'true'
  })
};

const silentFormDataOptions = {
  headers: new HttpHeaders({
    'X-Silent': 'true'
  })
};

@Injectable({
  providedIn: 'root'
})
export class WaMensajeriaService {

  private api = environment.api;

  constructor(private http: HttpClient) { }

  // =====================================================
  // CONVERSACIONES
  // =====================================================

  obtenerConversaciones() {
    return this.http
      .get<HttpResponse<Object>>(this.api + 'wa-conversaciones/panel', silentGetOptions)
      .pipe(
        tap((response: HttpResponse<Object>) => {
          let respuesta: any = response.body;
          if (respuesta?.error) throw respuesta.error;
          return response;
        }),
        catchError(this.handleError)
      );
  }

  obtenerConversacionById(id: number) {
    return this.http
      .get<HttpResponse<Object>>(this.api + `wa-conversaciones/${id}`, { observe: 'response' })
      .pipe(
        tap((response: HttpResponse<Object>) => {
          let respuesta: any = response.body;
          if (respuesta?.error) throw respuesta.error;
          return response;
        }),
        catchError(this.handleError)
      );
  }

  // =====================================================
  // MENSAJES (con paginación)
  // =====================================================

  obtenerMensajes(idConversacion: number) {
    return this.http
      .get<HttpResponse<Object>>(this.api + `wa-mensajes/conversacion/${idConversacion}`, silentGetOptions)
      .pipe(
        tap((response: HttpResponse<Object>) => {
          let respuesta: any = response.body;
          if (respuesta?.error) throw respuesta.error;
          return response;
        }),
        catchError(this.handleError)
      );
  }

  obtenerMensajesAnteriores(idConversacion: number, antesDeId: number) {
    return this.http
      .get<HttpResponse<Object>>(
        this.api + `wa-mensajes/conversacion/${idConversacion}/anteriores/${antesDeId}`,
        silentGetOptions
      )
      .pipe(
        tap((response: HttpResponse<Object>) => {
          let respuesta: any = response.body;
          if (respuesta?.error) throw respuesta.error;
          return response;
        }),
        catchError(this.handleError)
      );
  }

  obtenerMensajesNuevos(idConversacion: number, desdeId: number) {
    return this.http
      .get<HttpResponse<Object>>(this.api + `wa-mensajes/conversacion/${idConversacion}/nuevos/${desdeId}`, silentGetOptions)
      .pipe(
        tap((response: HttpResponse<Object>) => {
          let respuesta: any = response.body;
          if (respuesta?.error) throw respuesta.error;
          return response;
        }),
        catchError(this.handleError)
      );
  }

  obtenerNoLeidos() {
    return this.http
      .get<HttpResponse<Object>>(this.api + 'wa-mensajes/no-leidos', silentGetOptions)
      .pipe(
        tap((response: HttpResponse<Object>) => {
          let respuesta: any = response.body;
          if (respuesta?.error) throw respuesta.error;
          return response;
        }),
        catchError(this.handleError)
      );
  }

  // =====================================================
  // ENVÍO DE MENSAJES
  // =====================================================

  enviarTexto(numeroDestino: string, mensaje: string, idPersonaRemitente: number) {
    const body = JSON.stringify({
      numero_destino: numeroDestino,
      mensaje,
      id_persona_remitente: idPersonaRemitente
    });
    return this.http.post<any>(this.api + 'wa-enviar/texto', body, silentOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta?.error) throw respuesta.error;
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  enviarArchivo(formData: FormData) {
    return this.http.post<any>(this.api + 'wa-enviar/archivo', formData, silentFormDataOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta?.error) throw respuesta.error;
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  // =====================================================
  // ACCIONES
  // =====================================================

  marcarConversacionLeida(idConversacion: number) {
    return this.http.put<any>(this.api + `wa-mensajes/conversacion/${idConversacion}/leida`, {}, silentOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta?.error) throw respuesta.error;
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  cerrarConversacion(id: number) {
    const body = JSON.stringify({ id });
    return this.http.put<any>(this.api + 'wa-conversaciones/cerrar', body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta?.error) throw respuesta.error;
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  // =====================================================
  // CONTACTOS
  // =====================================================

  obtenerContactos() {
    return this.http
      .get<HttpResponse<Object>>(this.api + 'wa-contactos', { observe: 'response' })
      .pipe(
        tap((response: HttpResponse<Object>) => {
          let respuesta: any = response.body;
          if (respuesta?.error) throw respuesta.error;
          return response;
        }),
        catchError(this.handleError)
      );
  }

  vincularContactoPersona(idContacto: number, idPersona: number) {
    const body = JSON.stringify({ id: idContacto, id_persona: idPersona });
    return this.http.put<any>(this.api + 'wa-contactos/persona', body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta?.error) throw respuesta.error;
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  // =====================================================
  // WA CONFIG
  // =====================================================

  obtenerWaConfig(clave: string) {
    return this.http
      .get<HttpResponse<Object>>(this.api + `wa-config/${clave}`, silentGetOptions)
      .pipe(
        tap((response: HttpResponse<Object>) => {
          let respuesta: any = response.body;
          if (respuesta?.error) throw respuesta.error;
          return response;
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Obtener etiqueta del remitente: [Sobrenombre - Cargo]
   */
  obtenerEtiquetaRemitente(idPersona: number) {
    return this.http
      .get<HttpResponse<Object>>(this.api + `wa-config/etiqueta-remitente/${idPersona}`, silentGetOptions)
      .pipe(
        tap((response: HttpResponse<Object>) => {
          let respuesta: any = response.body;
          if (respuesta?.error) throw respuesta.error;
          return response;
        }),
        catchError(this.handleError)
      );
  }

  // =====================================================
  // TEMPLATES
  // =====================================================

  obtenerTemplates() {
    return this.http
      .get<HttpResponse<Object>>(this.api + 'wa-templates', { observe: 'response' })
      .pipe(
        tap((response: HttpResponse<Object>) => {
          let respuesta: any = response.body;
          if (respuesta?.error) throw respuesta.error;
          return response;
        }),
        catchError(this.handleError)
      );
  }

  obtenerTemplatesAprobados() {
    return this.http
      .get<HttpResponse<Object>>(this.api + 'wa-templates/aprobados', silentGetOptions)
      .pipe(
        tap((response: HttpResponse<Object>) => {
          let respuesta: any = response.body;
          if (respuesta?.error) throw respuesta.error;
          return response;
        }),
        catchError(this.handleError)
      );
  }

  crearTemplate(data: any) {
    const body = JSON.stringify(data);
    return this.http.post<any>(this.api + 'wa-templates', body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta?.error) throw respuesta.error;
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  eliminarTemplate(name: string) {
    return this.http.delete<any>(this.api + `wa-templates/${name}`).pipe(
      tap((respuesta: any) => {
        if (respuesta?.error) throw respuesta.error;
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  enviarTemplate(
    numeroDestino: string,
    templateName: string,
    languageCode: string,
    components: any[],
    idPersonaRemitente: number
  ) {
    const body = JSON.stringify({
      numero_destino: numeroDestino,
      template_name: templateName,
      language_code: languageCode,
      components,
      id_persona_remitente: idPersonaRemitente
    });
    return this.http.post<any>(this.api + 'wa-enviar/template', body, silentOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta?.error) throw respuesta.error;
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse) {
    return throwError(() => error);
  }
}