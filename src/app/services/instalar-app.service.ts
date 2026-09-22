import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

/**
 * Forma de ofrecer la instalacion en el dispositivo actual:
 * - 'nativo': el navegador entrego el aviso de instalacion (Chrome, Edge, Samsung Internet).
 * - 'ios': iPhone o iPad. No hay aviso programable, se muestran instrucciones.
 * - 'manual': Android sin aviso disponible (el usuario lo rechazo antes o el
 *   navegador no lo ofrece). Se muestran las instrucciones del menu.
 * - 'oculto': ya esta instalada, o es un computador sin aviso.
 */
export type ModoInstalacion = 'nativo' | 'ios' | 'manual' | 'oculto';

export type ResultadoInstalacion = 'aceptada' | 'rechazada' | 'sin-aviso';

@Injectable({
  providedIn: 'root',
})
export class InstalarAppService {
  private avisoInstalacion: any = null;
  private readonly modoSubject = new BehaviorSubject<ModoInstalacion>('oculto');
  public readonly modo$: Observable<ModoInstalacion> = this.modoSubject.asObservable();

  constructor() {
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
      this.actualizarModo();
    });

    this.actualizarModo();
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
    const modoStandalone = window.matchMedia
      ? window.matchMedia('(display-mode: standalone)').matches
      : false;
    return modoStandalone || (navigator as any).standalone === true;
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
