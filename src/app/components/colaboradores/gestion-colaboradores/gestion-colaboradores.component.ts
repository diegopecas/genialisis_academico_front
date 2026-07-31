import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { HeaderComponent } from '../../../common/header/header.component';
import { PermisosService } from '../../../services/permisos.service';

@Component({
  selector: 'app-gestion-colaboradores',
  standalone: true,
  imports: [CommonModule, HeaderComponent],
  templateUrl: './gestion-colaboradores.component.html',
  styleUrl: './gestion-colaboradores.component.scss'
})
export class GestionColaboradoresComponent {
  titulo = "Gestión de Colaboradores";
  menuActivo: string | null = null;

  constructor(
    public permisosService: PermisosService,
    private router: Router) { }

  toggleMenu(menu: string, event: Event) {
    event.stopPropagation();
    this.menuActivo = this.menuActivo === menu ? null : menu;
  }

  seleccionarOpcion(opcion: string, event: Event) {
    event.stopPropagation();
    switch (opcion) {
      case 'colaboradores':
        this.router.navigate(['/colaboradores']);
        break;
      case 'casas-colaboradores':
        this.router.navigate(['/casas-colaboradores']);
        break;
      case 'registro-ingreso-salida':
        this.router.navigate(['/registro-ingreso-salida']);
        break;
      case 'actividades-colaboradores':
        this.router.navigate(['/colaboradores/actividades']);
        break;
      case 'nominas':
        this.router.navigate(['/colaboradores/nominas']);
        break;
    }
  }

  tieneAlguno(codigos: string[]): boolean {
    return codigos.some(c => this.permisosService.tienePermiso(c));
  }
}
