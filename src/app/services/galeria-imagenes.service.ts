import {
  HttpClient,
  HttpErrorResponse,
  HttpResponse,
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, shareReplay, tap } from 'rxjs/operators';
import { httpOptions } from './http';

export type ImageSize = 'thumb' | 'medium' | 'large' | 'original';

@Injectable({
  providedIn: 'root',
})
export class GaleriaImagenesService {
  private servicio = environment.api + 'galeria-imagenes';

  // Token efímero para <img src="">. Un <img> no puede enviar el header
  // Authorization, asi que el token va en la URL; por eso NO se usa el de
  // sesion (daria acceso a todo el sistema por 24h si se filtra en el
  // historial o en los logs), sino uno que solo sirve para ver imagenes de
  // este tenant y caduca en minutos.
  // Se cachea uno solo para todas las imagenes: obtenerUrlImagen se llama de
  // forma sincrona desde los templates, y pedir un token por imagen seria una
  // peticion por cada miniatura.
  private tokenImagenes: string | null = null;
  private tokenExpiraEn = 0;
  private peticionToken: Observable<string> | null = null;

  // Margen para renovar antes de que expire y evitar que una imagen cargada
  // tarde (lazy load, lightbox) pida con un token ya vencido.
  private readonly MARGEN_RENOVACION_MS = 60000;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene (o reutiliza) el token efímero de imagenes. Debe llamarse antes de
   * pintar imagenes: obtenerUrlImagen es sincrona y necesita el token listo.
   * Si ya hay uno vigente no genera peticion.
   */
  inicializarTokenImagenes(): Observable<string> {
    if (this.tokenImagenes && Date.now() < this.tokenExpiraEn) {
      return of(this.tokenImagenes);
    }

    // Si ya hay una peticion en curso, se comparte en vez de duplicarla.
    if (this.peticionToken) {
      return this.peticionToken;
    }

    // Va silenciosa: la renovacion tambien se dispara sola desde
    // renovarSiVencido(), y sin el header el loading.interceptor montaba el
    // spinner global encima de la pantalla que el usuario estuviera viendo,
    // como si algo se estuviera cargando.
    this.peticionToken = this.http.get<any>(`${this.servicio}/token`, {
      headers: { 'X-Silent': 'true' },
    }).pipe(
      map((respuesta: any) => {
        const vidaSegundos = respuesta.expira_en || 300;
        this.tokenImagenes = respuesta.token;
        this.tokenExpiraEn = Date.now() + vidaSegundos * 1000 - this.MARGEN_RENOVACION_MS;
        this.peticionToken = null;
        return this.tokenImagenes as string;
      }),
      catchError((error: any) => {
        this.peticionToken = null;
        return this.handleError(error);
      }),
      shareReplay(1),
    );

    return this.peticionToken;
  }

  /**
   * Renovacion perezosa: solo cuando alguien pide una URL y el token ya vencio.
   *
   * Antes habia un setTimeout que renovaba cada pocos minutos. Como este
   * servicio es providedIn:'root' y vive mientras viva la pestaña, ese
   * temporizador se reprogramaba solo y seguia pidiendo /token aunque el
   * usuario ya hubiera salido de la galeria y no hubiera ni una imagen en
   * pantalla. Ademas, cada renovacion cambiaba el token de todas las URLs y
   * obligaba al navegador a descargar de nuevo las miniaturas ya cacheadas.
   */
  private renovarSiVencido(): void {
    if (this.tokenImagenes && Date.now() < this.tokenExpiraEn) {
      return;
    }

    // Si ya hay una peticion en curso no se duplica.
    if (this.peticionToken) {
      return;
    }

    this.inicializarTokenImagenes().subscribe({
      error: () => { /* si falla, la proxima llamada reintenta */ },
    });
  }

  /**
   * Obtener URL protegida para una imagen por su GUID.
   * Incluye el token efímero y el tenant en query string para uso en <img src="">.
   * Sincrona: requiere haber llamado antes a inicializarTokenImagenes().
   */
  obtenerUrlImagen(guid: string, size: ImageSize = 'thumb'): string {
    // Sincrona por contrato, asi que la renovacion va en segundo plano: esta
    // llamada devuelve el token que haya y la siguiente ya sale con el nuevo.
    this.renovarSiVencido();

    const token = this.tokenImagenes || '';
    const tenant = sessionStorage.getItem('institucion_actual') || '';
    return `${this.servicio}/servir/${guid}?token=${token}&tenant=${tenant}&size=${size}`;
  }

  obtenerUrlThumb(guid: string): string {
    return this.obtenerUrlImagen(guid, 'thumb');
  }

  obtenerUrlMedium(guid: string): string {
    return this.obtenerUrlImagen(guid, 'medium');
  }

  obtenerUrlOriginal(guid: string): string {
    return this.obtenerUrlImagen(guid, 'original');
  }

  /**
   * Descarga la imagen en calidad original. Va por HttpClient, asi que el token
   * de sesion viaja en el header via interceptor y no queda expuesto en la URL.
   */
  descargarImagen(guid: string) {
    return this.http
      .get(`${this.servicio}/servir/${guid}?size=original`, {
        responseType: 'blob',
      })
      .pipe(catchError(this.handleError));
  }

  obtenerTodas() {
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

  obtenerPorGaleria(idGaleria: any) {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + `/galeria/${idGaleria}`, {
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

  obtenerPorSubgaleria(idSubgaleria: any) {
    return this.http
      .get<HttpResponse<Object>>(
        this.servicio + `/subgaleria/${idSubgaleria}`,
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

  obtenerGenerales(idGaleria: any) {
    return this.http
      .get<HttpResponse<Object>>(this.servicio + `/generales/${idGaleria}`, {
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

  crear(imagen: any) {
    const body = JSON.stringify(imagen);
    return this.http.post<any>(this.servicio, body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) {
          throw respuesta.error;
        }
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Rota en disco las imagenes indicadas y borra su cache de miniaturas.
   * Los videos que vengan en la lista se ignoran del lado del backend.
   *
   * @param ids     ids de galeria_imagenes
   * @param grados  90, 180 o 270 en sentido horario
   */
  rotar(ids: string[], grados: number = 90) {
    const body = JSON.stringify({ ids: ids, grados: grados });
    return this.http.post<any>(this.servicio + '/rotar', body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) {
          throw respuesta.error;
        }
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  crearBulk(imagenes: any[]) {
    const body = JSON.stringify({ imagenes: imagenes });
    return this.http.post<any>(this.servicio + '/bulk', body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) {
          throw respuesta.error;
        }
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  actualizar(imagen: any) {
    const body = JSON.stringify(imagen);
    return this.http.put<any>(this.servicio, body, httpOptions).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) {
          throw respuesta.error;
        }
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  eliminar(id: any) {
    const body = JSON.stringify({ id: id });
    return this.http
      .request<any>('delete', this.servicio, { body: body, ...httpOptions })
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

  /**
   * NUEVO: Eliminar múltiples imágenes a la vez
   * @param ids Array de IDs de imágenes a eliminar
   */
  eliminarMultiples(ids: string[]) {
    const body = JSON.stringify({ ids: ids });
    return this.http
      .request<any>('delete', this.servicio + '/bulk', { body: body, ...httpOptions })
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

  eliminarPorGaleria(idGaleria: any) {
    return this.http.delete<any>(this.servicio + `/galeria/${idGaleria}`).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) {
          throw respuesta.error;
        }
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  eliminarPorSubgaleria(idSubgaleria: any) {
    return this.http
      .delete<any>(this.servicio + `/subgaleria/${idSubgaleria}`)
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

  private handleError(error: HttpErrorResponse) {
    return throwError(() => error);
  }
}