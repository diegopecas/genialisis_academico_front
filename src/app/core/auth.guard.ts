import { Injectable } from '@angular/core';
import { Router, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(private router: Router) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean {
    // Obtener usuario del sessionStorage
    const usuarioStr = sessionStorage.getItem('usuario');
    
    if (usuarioStr) {
      try {
        const usuario = JSON.parse(usuarioStr);
        
        // Verificar que el usuario existe y tiene acceso institucional
        if (usuario && usuario.acceso_institucional === 1) {
          return true;
        }
      } catch (e) {
        console.error('Error al parsear usuario:', e);
      }
    }
    
    // Si no hay usuario válido o no tiene acceso, redirigir al login
    console.log('Acceso denegado - redirigiendo a login');
    this.router.navigate(['/login']);
    return false;
  }
}