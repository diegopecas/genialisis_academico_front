import {
  HttpClient,
  HttpErrorResponse,
  HttpHeaders,
  HttpResponse,
} from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../environments/environment';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import Swal from 'sweetalert2';
import { httpOptions } from './http';
import { PermisosService } from './permisos.service';

/**
 * Documento de la persona tal como estaba al cargarla, para saber si en el
 * formulario lo están corrigiendo.
 */
export interface DocumentoPersona {
  tipo: any;
  numero: any;
}

/**
 * Fila del buscador de personas del menú principal.
 * Es una fila por DESTINO, no por persona: quien es colaboradora y además
 * acudiente de dos niños aparece en tres filas con el mismo id_persona.
 * - `id_destino` es el id del registro al que se navega: el estudiante, el
 *   colaborador o el acudiente, según el `tipo`.
 * - `id_secundario` solo viene en el acudiente y trae el id del estudiante,
 *   porque la pantalla de editar acudiente pide los dos en la ruta.
 * - `detalle` es el texto de apoyo (cargo del colaborador, "Madre de Sofía").
 */
export interface PersonaBuscador {
  id_persona: string;
  nombre_completo: string;
  numero_identificacion: string;
  tipo: 'estudiante' | 'colaborador' | 'acudiente';
  id_destino: string;
  id_secundario: string | null;
  activo: number;
  detalle: string | null;
}

// El header X-Silent evita que el interceptor muestre el spinner de carga:
// estas consultas se hacen solas al abrir la aplicación y no deben interrumpir.
const httpOptionsSilent = {
  headers: new HttpHeaders({
    'Content-Type': 'application/json',
    'X-Silent': 'true',
  }),
};

@Injectable({
  providedIn: 'root',
})
export class PersonasService {
  private servicio = environment.api + 'personas';
  private servicioByIdentificacion =
    environment.api + 'personas-x-identificacion';

  // ---- Cache del buscador de personas ----
  // El cache vive SOLO en memoria, a propósito: así no puede sobrevivir a un
  // despliegue con la forma vieja del dato. El precio es una consulta por cada
  // recarga de la página, que es silenciosa y va en el arranque.
  private readonly MINUTOS_VIGENCIA_BUSCADOR = 10;

  private buscadorCache: PersonaBuscador[] = [];
  private buscadorFechaCarga: Date | null = null;
  private buscadorCargando = false;

  // Permiso para corregir el tipo o número de documento de una persona ya
  // creada. El back lo vuelve a validar en PUT /personas.
  public readonly PERMISO_EDITAR_DOCUMENTO = 'personas.editar_documento';

  private permisosService = inject(PermisosService);

  constructor(private http: HttpClient) {}

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

  obtenerByIdentificacion(tipo: any, numero: any) {
    return this.http
      .get<HttpResponse<Object>>(
        this.servicioByIdentificacion + '/' + tipo + '/' + numero,
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
  crear(elemento: any) {
    var body = JSON.stringify(elemento);
    return this.http.post<any>(this.servicio, body, httpOptions).pipe(
      tap((respuesta: any) => {
        //Se valida que si existe un mensaje de error
        if (respuesta.error) {
          console.log(respuesta);
          throw respuesta.error;
        }
        console.log(respuesta);
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Actualiza únicamente el correo electrónico de la persona.
   */
  actualizarCorreo(id: string, correo_electronico: string) {
    var body = JSON.stringify({ id, correo_electronico });
    return this.http.put<any>(this.servicio + '/correo', body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) {
          throw respuesta.error;
        }
      })
    );
  }

  actualizar(elemento: any) {
    var body = JSON.stringify(elemento);
    console.log('actualizar', body);
    return this.http.put<any>(this.servicio, body, httpOptions).pipe(
      tap((respuesta: any) => {
        //Se valida que si existe un mensaje de error
        if (respuesta.error) {
          console.log(respuesta);
          throw respuesta.error;
        }
        console.log(respuesta);
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }
  private handleError(error: HttpErrorResponse) {
    return throwError(() => error);
  }

  // ============================================
  // CORRECCIÓN DEL DOCUMENTO DE IDENTIDAD
  // ============================================

  /**
   * true si el usuario puede corregir el documento de una persona ya creada.
   */
  puedeCorregirDocumento(): boolean {
    return this.permisosService.tienePermiso(this.PERMISO_EDITAR_DOCUMENTO);
  }

  /**
   * true si el tipo o el número cambiaron respecto al documento cargado.
   * Sin documento original (persona nueva) nunca hay corrección.
   */
  documentoCambio(original: DocumentoPersona, tipo: any, numero: any): boolean {
    if (!original || original.numero === null || original.numero === undefined || String(original.numero).trim() === '') {
      return false;
    }
    const cambiaTipo = String(original.tipo ?? '') !== String(tipo ?? '');
    const cambiaNumero = String(original.numero).trim() !== String(numero ?? '').trim();
    return cambiaTipo || cambiaNumero;
  }

  /**
   * Pide confirmación antes de guardar un documento corregido. Si el
   * documento no cambió resuelve true sin mostrar nada, así las pantallas
   * pueden llamarlo siempre antes de actualizar la persona.
   */
  async confirmarCorreccionDocumento(original: DocumentoPersona, tipo: any, numero: any, tiposIdentificacion: any[]): Promise<boolean> {
    if (!this.documentoCambio(original, tipo, numero)) {
      return true;
    }

    const nombreTipo = (idTipo: any) => {
      const encontrado = (tiposIdentificacion || []).find((t: any) => String(t.id) === String(idTipo));
      return encontrado ? encontrado.nombre : '';
    };
    const anterior = `${nombreTipo(original.tipo)} ${original.numero}`.trim();
    const nuevo = `${nombreTipo(tipo)} ${String(numero ?? '').trim()}`.trim();

    const resultado = await Swal.fire({
      title: '¿Corregir el documento?',
      html: `Documento actual: <b>${this.escaparHtml(anterior)}</b><br>` +
            `Documento corregido: <b>${this.escaparHtml(nuevo)}</b><br><br>` +
            `Si la persona tiene usuario de ingreso con el número anterior, el usuario también cambia al número nuevo. ` +
            `El cambio queda registrado en el historial de la persona.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, corregir',
      cancelButtonText: 'Cancelar',
    });

    return resultado.isConfirmed;
  }

  private escaparHtml(texto: string): string {
    return String(texto)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  subirFoto(idPersona: string, archivo: File) {
    const formData = new FormData();
    formData.append('foto', archivo);

    return this.http
      .post<any>(`${this.servicio}/${idPersona}/foto`, formData)
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

  eliminarFoto(idPersona: string) {
    return this.http.delete<any>(`${this.servicio}/${idPersona}/foto`).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) {
          throw respuesta.error;
        }
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  obtenerFoto(idPersona: string) {
    return this.http
      .get<HttpResponse<Object>>(`${this.servicio}/${idPersona}/foto`, {
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

  obtenerUrlFoto(ruta: string | null): string {
    if (!ruta) return '';
    return environment.api.replace('/api/', '/') + ruta;
  }

  // ============================================
  // BUSCADOR DE PERSONAS (cache)
  // ============================================

  /**
   * Trae del servidor la lista plana de personas del buscador.
   * Se expone público por si otra pantalla la necesita, pero el menú debe
   * usar `cargarBuscador()` y `getBuscador()`, que ya manejan el cache.
   */
  obtenerBuscador() {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + '/buscador', {
        observe: 'response',
        headers: httpOptionsSilent.headers,
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

  /**
   * Deja el cache listo para usar. Si ya está cargado y vigente no hace nada;
   * si no, consulta al servidor por debajo. No devuelve nada a propósito:
   * quien lo llama sigue leyendo con `getBuscador()`.
   *
   * @param forzar Ignora la vigencia y vuelve a consultar (botón de refrescar).
   */
  cargarBuscador(forzar: boolean = false): void {
    if (this.buscadorCargando) {
      return;
    }

    if (!forzar && this.buscadorCache.length > 0 && this.buscadorEstaVigente()) {
      return;
    }

    this.refrescarBuscador().subscribe({
      error: () => {
        // Si falla se conserva lo que ya estuviera cargado; el buscador de
        // personas simplemente no se actualiza y el menú sigue funcionando.
        console.error('Error al cargar el buscador de personas');
      },
    });
  }

  /**
   * Consulta al servidor y actualiza el cache. Devuelve el observable para
   * que quien lo llame (el botón de refrescar del menú) sepa cuándo terminó.
   */
  refrescarBuscador() {
    this.buscadorCargando = true;

    return this.obtenerBuscador().pipe(
      tap((response: HttpResponse<Object>) => {
        this.buscadorCache = (response.body as PersonaBuscador[]) || [];
        this.buscadorFechaCarga = new Date();
        this.buscadorCargando = false;
      }),
      catchError((error) => {
        this.buscadorCargando = false;
        return throwError(() => error);
      })
    );
  }

  getBuscador(): PersonaBuscador[] {
    return this.buscadorCache;
  }

  isBuscadorListo(): boolean {
    return this.buscadorCache.length > 0;
  }

  isBuscadorCargando(): boolean {
    return this.buscadorCargando;
  }

  getFechaCargaBuscador(): Date | null {
    return this.buscadorFechaCarga;
  }

  /**
   * Borra el cache. Se llama al cerrar sesión para no dejar los nombres de un
   * jardín disponibles en la siguiente.
   */
  limpiarCacheBuscador(): void {
    this.buscadorCache = [];
    this.buscadorFechaCarga = null;
  }

  private buscadorEstaVigente(): boolean {
    if (!this.buscadorFechaCarga) {
      return false;
    }
    const minutos =
      (new Date().getTime() - this.buscadorFechaCarga.getTime()) / 60000;
    return minutos < this.MINUTOS_VIGENCIA_BUSCADOR;
  }

  /**
   * Obtiene todos los cumpleañeros del día (estudiantes y colaboradores activos)
   */
  obtenerCumpleanosHoy() {
    return this.http
      .get<HttpResponse<Object>>(environment.api + 'personas-cumpleanos-hoy', {
        observe: 'response',
        headers: httpOptionsSilent.headers,
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
}