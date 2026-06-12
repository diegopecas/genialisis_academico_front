import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  constructor(private router: Router) {}

  // Verificar si el usuario está autenticado
  isAuthenticated(): boolean {
    const usuarioStr = sessionStorage.getItem('usuario');
    if (usuarioStr) {
      try {
        const usuario = JSON.parse(usuarioStr);
        return usuario && usuario.acceso_institucional === 1;
      } catch (e) {
        return false;
      }
    }
    return false;
  }

  // Obtener usuario actual
  getCurrentUser(): any {
    const usuarioStr = sessionStorage.getItem('usuario');
    if (usuarioStr) {
      try {
        return JSON.parse(usuarioStr);
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  // Cerrar sesión
  logout(): void {
    sessionStorage.clear();
    this.router.navigate(['/login']);
  }

  // Verificar si el usuario tiene un rol específico (para futuras implementaciones)
  hasRole(role: string): boolean {
    const usuario = this.getCurrentUser();
    // Aquí podrías implementar lógica de roles si tu sistema lo requiere
    // Por ejemplo: return usuario && usuario.rol === role;
    return usuario !== null;
  }
}