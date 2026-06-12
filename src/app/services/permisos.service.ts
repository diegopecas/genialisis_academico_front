import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class PermisosService {

  /**
   * Obtiene el usuario actual del sessionStorage
   */
  private getUsuario(): any {
    try {
      const usuarioStr = sessionStorage.getItem('usuario');
      if (usuarioStr) {
        return JSON.parse(usuarioStr);
      }
    } catch (e) {
      console.error('Error al parsear usuario:', e);
    }
    return null;
  }

  /**
   * Verifica si el usuario es super administrador
   */
  esSuperAdmin(): boolean {
    const usuario = this.getUsuario();
    return usuario && usuario.super_admin === 1;
  }

  /**
   * Obtiene el array de permisos del usuario
   */
  getPermisos(): string[] {
    const usuario = this.getUsuario();
    if (!usuario || !usuario.permisos) {
      return [];
    }
    return usuario.permisos;
  }

  /**
   * Verifica si el usuario tiene un permiso específico
   * Si es super_admin retorna true siempre
   * Si los permisos contienen '*' retorna true siempre
   */
  tienePermiso(codigo: string): boolean {
    if (this.esSuperAdmin()) {
      return true;
    }

    const permisos = this.getPermisos();

    if (permisos.includes('*')) {
      return true;
    }

    return permisos.includes(codigo);
  }

  /**
   * Verifica si el usuario tiene al menos uno de los permisos indicados
   */
  tieneAlgunPermiso(codigos: string[]): boolean {
    if (this.esSuperAdmin()) {
      return true;
    }

    const permisos = this.getPermisos();

    if (permisos.includes('*')) {
      return true;
    }

    return codigos.some(codigo => permisos.includes(codigo));
  }

  /**
   * Verifica si el usuario tiene todos los permisos indicados
   */
  tieneTodosLosPermisos(codigos: string[]): boolean {
    if (this.esSuperAdmin()) {
      return true;
    }

    const permisos = this.getPermisos();

    if (permisos.includes('*')) {
      return true;
    }

    return codigos.every(codigo => permisos.includes(codigo));
  }
}