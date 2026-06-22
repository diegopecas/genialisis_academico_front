import { Injectable, OnDestroy } from '@angular/core';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpResponse } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { httpOptions } from './http';
import { filter } from 'rxjs/operators';
import { Subscription, throwError, catchError, tap } from 'rxjs';

const httpOptionsSilent = {
  headers: new HttpHeaders({
    'Content-Type': 'application/json',
    'X-Silent': 'true'
  })
};

interface AccesoAcumulado {
  ruta: string;
  label: string;
  icono: string;
  conteo: number;
}

export interface AccesoRapido {
  id: string;
  ruta: string;
  label: string;
  icono: string;
  conteo: number;
  es_fijo: number;
  ultima_visita: string;
}

@Injectable({
  providedIn: 'root'
})
export class AccesosRapidosService implements OnDestroy {

  private servicio = environment.api + 'accesos-rapidos';
  private acumulado: Map<string, AccesoAcumulado> = new Map();
  private routerSub: Subscription;
  private intervaloSync: any;
  private readonly INTERVALO_MINUTOS = 5;

  private accesosCache: AccesoRapido[] = [];
  private cacheReady = false;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private http: HttpClient
  ) {
    this.routerSub = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.procesarNavegacion(event.urlAfterRedirects || event.url);
    });

    this.iniciarSincronizacionPeriodica();
    this.registrarBeforeUnload();
    this.cargarAccesosInicial();
  }

  ngOnDestroy(): void {
    if (this.routerSub) {
      this.routerSub.unsubscribe();
    }
    if (this.intervaloSync) {
      clearInterval(this.intervaloSync);
    }
  }

  private cargarAccesosInicial(): void {
    const idUsuario = this.getIdUsuario();
    if (!idUsuario) return;

    this.http
      .get<HttpResponse<Object>>(this.servicio + '?id_usuario=' + idUsuario + '&limite=50', { observe: 'response', headers: httpOptionsSilent.headers })
      .pipe(catchError(this.handleError))
      .subscribe({
        next: (response: HttpResponse<Object>) => {
          this.accesosCache = (response.body as AccesoRapido[]) || [];
          this.cacheReady = true;
        },
        error: () => {
          this.accesosCache = [];
          this.cacheReady = true;
        }
      });
  }

  getAccesosTop(limite: number = 6): AccesoRapido[] {
    const fijos = this.accesosCache.filter(a => a.es_fijo === 1);
    const noFijos = this.accesosCache
      .filter(a => a.es_fijo !== 1)
      .sort((a, b) => b.conteo - a.conteo);
    const combinados = [...fijos, ...noFijos];
    return combinados.slice(0, limite);
  }

  isCacheReady(): boolean {
    return this.cacheReady;
  }

  esFijado(ruta: string): boolean {
    const acceso = this.accesosCache.find(a => a.ruta === ruta);
    return acceso ? acceso.es_fijo === 1 : false;
  }

  getAccesoByRuta(ruta: string): AccesoRapido | null {
    return this.accesosCache.find(a => a.ruta === ruta) || null;
  }

  private procesarNavegacion(url: string): void {
    const rutaLimpia = url.startsWith('/') ? url.substring(1) : url;
    const rutaBase = rutaLimpia.split('?')[0];

    const rutaConfig = this.findRouteConfig(rutaBase);
    if (!rutaConfig) return;

    const existente = this.acumulado.get(rutaBase);
    if (existente) {
      existente.conteo++;
    } else {
      this.acumulado.set(rutaBase, {
        ruta: rutaBase,
        label: rutaConfig.labelAcceso,
        icono: rutaConfig.iconoAcceso,
        conteo: 1
      });
    }
  }

  private findRouteConfig(url: string): { labelAcceso: string; iconoAcceso: string } | null {
    const rutasConfig = this.router.config;
    for (const ruta of rutasConfig) {
      if (ruta.data?.['trackear'] && ruta.path === url) {
        return {
          labelAcceso: ruta.data['labelAcceso'] || url,
          iconoAcceso: ruta.data['iconoAcceso'] || '📌'
        };
      }
    }
    return null;
  }

  private iniciarSincronizacionPeriodica(): void {
    this.intervaloSync = setInterval(() => {
      this.sincronizar();
    }, this.INTERVALO_MINUTOS * 60 * 1000);
  }

  private registrarBeforeUnload(): void {
    window.addEventListener('beforeunload', () => {
      this.sincronizarSync();
    });
  }

  sincronizar(): void {
    const idUsuario = this.getIdUsuario();
    if (!idUsuario || this.acumulado.size === 0) return;

    const accesos = Array.from(this.acumulado.values());
    const payload = {
      id_usuario: idUsuario,
      accesos: accesos
    };

    const body = JSON.stringify(payload);
    this.http.post<any>(this.servicio + '/sincronizar', body, httpOptionsSilent).pipe(
      tap(() => {
        this.acumulado.clear();
      }),
      catchError(this.handleError)
    ).subscribe();
  }

  private sincronizarSync(): void {
    const idUsuario = this.getIdUsuario();
    if (!idUsuario || this.acumulado.size === 0) return;

    const accesos = Array.from(this.acumulado.values());
    const payload = {
      id_usuario: idUsuario,
      accesos: accesos
    };

    const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
    navigator.sendBeacon(this.servicio + '/sincronizar', blob);
    this.acumulado.clear();
  }

  fijarNuevo(ruta: string, label: string, icono: string) {
    const idUsuario = this.getIdUsuario();
    const body = JSON.stringify({
      id_usuario: idUsuario,
      ruta: ruta,
      label: label,
      icono: icono
    });
    return this.http.post<any>(this.servicio + '/fijar', body, httpOptionsSilent).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) throw respuesta.error;
        const nuevoAcceso: AccesoRapido = {
          id: respuesta.id,
          ruta: ruta,
          label: label,
          icono: icono,
          conteo: 0,
          es_fijo: 1,
          ultima_visita: new Date().toISOString()
        };
        const idx = this.accesosCache.findIndex(a => a.ruta === ruta);
        if (idx >= 0) {
          this.accesosCache[idx].es_fijo = 1;
          this.accesosCache[idx].id = respuesta.id || this.accesosCache[idx].id;
        } else {
          this.accesosCache.push(nuevoAcceso);
        }
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  toggleFijo(id: string, esFijo: number) {
    const body = JSON.stringify({ id: id, es_fijo: esFijo });
    return this.http.put<any>(this.servicio + '/toggle-fijo', body, httpOptionsSilent).pipe(
      tap((respuesta: any) => {
        if (respuesta.error) throw respuesta.error;
        const idx = this.accesosCache.findIndex(a => a.id === id);
        if (idx >= 0) {
          this.accesosCache[idx].es_fijo = esFijo;
        }
        return respuesta;
      }),
      catchError(this.handleError)
    );
  }

  private getIdUsuario(): number | null {
    try {
      const usuarioStr = sessionStorage.getItem('usuario');
      if (usuarioStr) {
        const usuario = JSON.parse(usuarioStr);
        return usuario.id || null;
      }
    } catch (e) {
      console.error('Error al obtener id_usuario:', e);
    }
    return null;
  }

  private handleError(error: HttpErrorResponse) {
    return throwError(() => error);
  }
}