import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

/**
 * AuthService unificado — idéntico en el portal de acudientes y en el
 * institucional. Se copia igual entre ambos repos.
 *
 * - La lógica de habeas data es genérica: no menciona ningún portal. Lee el
 *   pasaporte hd_ok que el backend firma en el token; el login de cada app
 *   ya marca su propio portal, así que este servicio no necesita saberlo.
 * - Conserva los nombres de método de ambos repos (getUsuarioActual y
 *   getCurrentUser, limpiarSesion y logout) para no romper componentes de
 *   ninguna app. Los que un repo no use quedan inertes, no estorban.
 * - No depende de ningún otro servicio (solo Router), por eso el archivo es
 *   portable entre repos sin arrastrar dependencias. Lo específico de
 *   acudientes (IDs de estudiantes) vive en EstudiantesSessionService.
 */
@Injectable({
  providedIn: 'root'
})
export class AuthService {

  constructor(private router: Router) { }

  // ---------------------------------------------------------------------------
  // Sesión
  // ---------------------------------------------------------------------------

  /**
   * Obtiene el usuario actual desde sessionStorage.
   */
  getUsuarioActual(): any {
    try {
      const usuarioString = sessionStorage.getItem('usuario');
      return usuarioString ? JSON.parse(usuarioString) : null;
    } catch (error) {
      console.error('Error obteniendo usuario actual:', error);
      return null;
    }
  }

  /**
   * Alias de getUsuarioActual (nombre usado en el repo institucional).
   */
  getCurrentUser(): any {
    return this.getUsuarioActual();
  }

  /**
   * True si hay un usuario en sesión. No asume campos específicos de un portal
   * (antes miraba acceso_institucional): eso lo decide cada app por su cuenta.
   */
  isAuthenticated(): boolean {
    return this.getUsuarioActual() !== null;
  }

  /**
   * Verifica si el usuario tiene un rol (placeholder heredado del institucional).
   */
  hasRole(_role: string): boolean {
    return this.getUsuarioActual() !== null;
  }

  guardarSesion(usuario: any): void {
    sessionStorage.setItem('usuario', JSON.stringify(usuario));
  }

  reemplazarToken(token: string): void {
    sessionStorage.setItem('token', token);
  }

  /**
   * Limpia las claves de sesión. removeItem sobre una clave inexistente no
   * hace nada, así que sirve igual en ambos repos aunque unas claves sean
   * propias de acudientes.
   */
  limpiarSesion(): void {
    sessionStorage.removeItem('usuario');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('institucion_actual');
    sessionStorage.removeItem('estudiantesIds');
    sessionStorage.removeItem('cumpleanos_cache');
  }

  /**
   * Cierra sesión y redirige al login (nombre usado en el repo institucional).
   */
  logout(): void {
    this.limpiarSesion();
    this.router.navigate(['/login']);
  }

  // ---------------------------------------------------------------------------
  // Habeas data (genérico, sin portal fijo)
  // ---------------------------------------------------------------------------

  /**
   * Decodifica el payload del JWT sin validarlo.
   *
   * Sirve solo para decidir qué mostrar. La firma la valida el servidor:
   * un payload alterado aquí no abre nada, porque el backend rechaza el
   * token en cada petición.
   */
  getTokenPayload(): any {
    try {
      const token = sessionStorage.getItem('token');
      if (!token) return null;

      const partes = token.split('.');
      if (partes.length !== 3) return null;

      const base64 = partes[1].replace(/-/g, '+').replace(/_/g, '/');
      const relleno = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
      const json = decodeURIComponent(
        atob(relleno)
          .split('')
          .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
          .join('')
      );

      return JSON.parse(json)?.data ?? null;
    } catch (error) {
      console.error('Error decodificando token:', error);
      return null;
    }
  }

  /**
   * True si el token trae el pasaporte de habeas data, o si el portal del
   * token no lo exige. Genérico: no compara contra un portal concreto.
   *
   * - hd_ok === true  -> aceptó la política vigente, pasa.
   * - hd_ok undefined -> el backend no exige habeas data en ese portal (o es
   *                      un token previo al cambio), pasa.
   * - hd_ok === false -> pendiente, bloquea.
   */
  tieneHabeasDataVigente(): boolean {
    const payload = this.getTokenPayload();
    if (!payload) return false;

    return payload.hd_ok !== false;
  }
}