import {
  HttpClient,
  HttpErrorResponse,
  HttpHeaders,
  HttpResponse,
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { httpOptions } from './http';

/**
 * Fila del buscador de personas del menú principal.
 * Es una fila por DESTINO, no por persona: quien es colaboradora y además
 * acudiente de dos niños aparece en tres filas con el mismo id_persona.
 * - `id_destino` es el id del estudiante, del colaborador o del estudiante
 *   al que está asociado el acudiente, según el `tipo`.
 * - `detalle` es el texto de apoyo (cargo del colaborador, "Madre de Sofía").
 */
export interface PersonaBuscador {
  id_persona: string;
  nombre_completo: string;
  numero_identificacion: string;
  tipo: 'estudiante' | 'colaborador' | 'acudiente';
  id_destino: string;
  activo: number;
  detalle: string | null;
}

// El header X-Silent evita que el interceptor muestre el spinner de carga:
// esta consulta se hace sola al abrir la aplicación y no debe interrumpir.
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
  private readonly LLAVE_CACHE_BUSCADOR = 'personas_buscador_cache';
  private readonly MINUTOS_VIGENCIA_BUSCADOR = 10;

  private buscadorCache: PersonaBuscador[] = [];
  private buscadorFechaCarga: Date | null = null;
  private buscadorCargando = false;

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
   * Deja el cache listo para usar.
   * Primero intenta con lo guardado en sessionStorage; si no hay nada o ya
   * está vencido, consulta al servidor por debajo. No devuelve nada a
   * propósito: quien lo llama sigue leyendo con `getBuscador()`.
   *
   * @param forzar Ignora la vigencia y vuelve a consultar (botón de refrescar).
   */
  cargarBuscador(forzar: boolean = false): void {
    if (this.buscadorCargando) {
      return;
    }

    if (!forzar) {
      if (this.buscadorCache.length > 0 && this.buscadorEstaVigente()) {
        return;
      }
      if (this.leerCacheDeSesion() && this.buscadorEstaVigente()) {
        return;
      }
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
        this.guardarCacheEnSesion();
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
   * Borra el cache en memoria y en sessionStorage. Se llama al cerrar sesión
   * para no dejar los nombres de un jardín disponibles en la siguiente.
   */
  limpiarCacheBuscador(): void {
    this.buscadorCache = [];
    this.buscadorFechaCarga = null;
    try {
      sessionStorage.removeItem(this.LLAVE_CACHE_BUSCADOR);
    } catch (e) {
      console.error('Error al limpiar el cache del buscador:', e);
    }
  }

  private buscadorEstaVigente(): boolean {
    if (!this.buscadorFechaCarga) {
      return false;
    }
    const minutos =
      (new Date().getTime() - this.buscadorFechaCarga.getTime()) / 60000;
    return minutos < this.MINUTOS_VIGENCIA_BUSCADOR;
  }

  private leerCacheDeSesion(): boolean {
    try {
      const crudo = sessionStorage.getItem(this.LLAVE_CACHE_BUSCADOR);
      if (!crudo) {
        return false;
      }
      const guardado = JSON.parse(crudo);
      if (!guardado || !Array.isArray(guardado.data)) {
        return false;
      }
      this.buscadorCache = guardado.data as PersonaBuscador[];
      this.buscadorFechaCarga = guardado.fecha ? new Date(guardado.fecha) : null;
      return true;
    } catch (e) {
      console.error('Error al leer el cache del buscador:', e);
      return false;
    }
  }

  private guardarCacheEnSesion(): void {
    try {
      sessionStorage.setItem(
        this.LLAVE_CACHE_BUSCADOR,
        JSON.stringify({
          fecha: this.buscadorFechaCarga
            ? this.buscadorFechaCarga.toISOString()
            : null,
          data: this.buscadorCache,
        })
      );
    } catch (e) {
      // Si sessionStorage está lleno o bloqueado se sigue con el cache en
      // memoria; solo se pierde al recargar la página.
      console.error('Error al guardar el cache del buscador:', e);
    }
  }

  /**
   * Obtiene todos los cumpleañeros del día (estudiantes y colaboradores activos)
   */
  obtenerCumpleanosHoy() {
    return this.http
      .get<HttpResponse<Object>>(environment.api + 'personas-cumpleanos-hoy', {
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
}