import { Injectable } from '@angular/core';
import { Router, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { PermisosService } from '../services/permisos.service';
import Swal from 'sweetalert2';

@Injectable({
  providedIn: 'root'
})
export class PermisosGuard implements CanActivate {

  constructor(
    private router: Router,
    private permisosService: PermisosService
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean {
    // Si la ruta no tiene data.permiso, no se valida nada
    const permisoRequerido = route.data?.['permiso'];
    if (!permisoRequerido) {
      return true;
    }

    // Si es super_admin, acceso total
    if (this.permisosService.esSuperAdmin()) {
      return true;
    }

    // Validar permiso (puede ser string o array de strings)
    let tieneAcceso = false;

    if (Array.isArray(permisoRequerido)) {
      tieneAcceso = this.permisosService.tieneAlgunPermiso(permisoRequerido);
    } else {
      tieneAcceso = this.permisosService.tienePermiso(permisoRequerido);
    }

    if (tieneAcceso) {
      return true;
    }

    // Sin acceso: mostrar mensaje y redirigir al menú
    Swal.fire({
      title: 'Acceso Denegado',
      text: 'No tienes permisos para acceder a esta sección',
      icon: 'warning',
      confirmButtonText: 'Entendido',
      confirmButtonColor: '#FFC107',
    });

    this.router.navigate(['/menu']);
    return false;
  }
}