import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

/**
 * Forma de ofrecer la instalacion en el dispositivo actual:
 * - 'nativo': el navegador entrego el aviso de instalacion (Chrome, Edge, Samsung Internet).
 * - 'ios': iPhone o iPad. No hay aviso programable, se muestran instrucciones.
 * - 'manual': Android sin aviso disponible (el usuario lo rechazo antes o el
 *   navegador no lo ofrece). Se muestran las instrucciones del menu.
 * - 'oculto': el sistema confirma que ya esta instalada, o es un computador
 *   sin aviso de instalacion.
 */
export type ModoInstalacion = 'nativo' | 'ios' | 'manual' | 'oculto';

export type ResultadoInstalacion = 'aceptada' | 'rechazada' | 'sin-aviso';

@Injectable({
  providedIn: 'root',
})
export class InstalarAppService {
  private avisoInstalacion: any = null;

  // Solo se pone en true cuando el sistema confirma que la app esta instalada.
  // Se parte de false: es preferible mostrar el boton de mas que esconderlo
  // para siempre, que es lo que pasaba al confiar en display-mode.
  private instalada: boolean = false;
  private readonly modoSubject = new BehaviorSubject<ModoInstalacion>('oculto');
  public readonly modo$: Observable<ModoInstalacion> = this.modoSubject.asObservable();

  constructor() {
    // Chrome solo ofrece la instalacion si hay un Service Worker registrado.
    // El de push solo se registra despues de iniciar sesion, asi que aqui se
    // registra el mismo archivo desde el arranque (registrarlo dos veces no
    // crea una instancia nueva).
    this.registrarServiceWorker();

    // El aviso puede llegar antes de que Angular arranque. El script de
    // index.html lo deja guardado en window para no perderlo.
    const avisoPrevio = (window as any).__avisoInstalacionGenialisis;
    if (avisoPrevio) {
      this.avisoInstalacion = avisoPrevio;
    }

    window.addEventListener('beforeinstallprompt', (evento: Event) => {
      // Evita la barra automatica de Chrome: la instalacion la dispara el boton
      evento.preventDefault();
      this.avisoInstalacion = evento;
      this.actualizarModo();
    });

    window.addEventListener('appinstalled', () => {
      this.limpiarAviso();
      this.instalada = true;
      this.actualizarModo();
    });

    this.actualizarModo();

    // La consulta al sistema es asincrona; al responder se recalcula el modo.
    this.verificarInstalada();
  }

  /**
   * Lanza el dialogo nativo de instalacion. El aviso solo se puede usar una
   * vez: si el usuario lo rechaza, el modo pasa a 'manual' en Android.
   */
  async instalar(): Promise<ResultadoInstalacion> {
    if (!this.avisoInstalacion) {
      return 'sin-aviso';
    }

    const aviso = this.avisoInstalacion;
    this.limpiarAviso();

    await aviso.prompt();
    const eleccion = await aviso.userChoice;
    this.actualizarModo();

    return eleccion?.outcome === 'accepted' ? 'aceptada' : 'rechazada';
  }

  estaInstalada(): boolean {
    return this.instalada;
  }

  /**
   * Pregunta al sistema si esta app ya esta instalada.
   *
   * No se usa display-mode: Chrome lo reporta como instalada aunque el usuario
   * haya borrado el icono, y el boton quedaba escondido para siempre en ese
   * equipo. getInstalledRelatedApps si refleja el estado real; donde no exista
   * (iPhone, Firefox) se deja el boton visible y las instrucciones se encargan.
   */
  private async verificarInstalada(): Promise<void> {
    // En iPhone la unica senal disponible es navigator.standalone, que solo es
    // true cuando la pagina corre desde el icono de inicio.
    if ((navigator as any).standalone === true) {
      this.instalada = true;
      this.actualizarModo();
      return;
    }

    const consultar = (navigator as any).getInstalledRelatedApps;
    if (typeof consultar !== 'function') {
      return;
    }

    try {
      const apps = await consultar.call(navigator);
      this.instalada = Array.isArray(apps) && apps.length > 0;
      this.actualizarModo();
    } catch (error) {
      // Si la consulta falla se deja el boton visible a proposito
      console.warn('No se pudo consultar si la aplicación está instalada:', error);
    }
  }

  private registrarServiceWorker(): void {
    if (!('serviceWorker' in navigator)) {
      return;
    }

    navigator.serviceWorker.register('/sw-push.js', { scope: '/' }).catch((error) => {
      console.warn('No se pudo registrar el Service Worker:', error);
    });
  }

  private limpiarAviso(): void {
    this.avisoInstalacion = null;
    (window as any).__avisoInstalacionGenialisis = null;
  }

  private actualizarModo(): void {
    this.modoSubject.next(this.calcularModo());
  }

  private calcularModo(): ModoInstalacion {
    if (this.estaInstalada()) {
      return 'oculto';
    }
    if (this.avisoInstalacion) {
      return 'nativo';
    }
    if (this.esIOS()) {
      return 'ios';
    }
    if (this.esAndroid()) {
      return 'manual';
    }
    return 'oculto';
  }

  private esIOS(): boolean {
    const agente = navigator.userAgent || '';
    // iPadOS se presenta como Mac; se distingue por la pantalla tactil
    const esIPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
    return /iPhone|iPad|iPod/i.test(agente) || esIPadOS;
  }

  private esAndroid(): boolean {
    return /Android/i.test(navigator.userAgent || '');
  }
}
