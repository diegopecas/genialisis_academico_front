import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Impide navegar a rutas protegidas mientras el token no traiga el pasaporte
 * de habeas data.
 *
 * Esto es UX, no seguridad: evita que el usuario navegue para recibir un 403.
 * La barrera real vive en el middleware del backend, que valida la firma del
 * token en cada petición.
 */
@Injectable({
  providedIn: 'root',
})
export class HabeasDataGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(): boolean {
    if (this.authService.tieneHabeasDataVigente()) {
      return true;
    }

    console.warn('Habeas data pendiente, redirigiendo a login');
    this.authService.logout();
    return false;
  }
}