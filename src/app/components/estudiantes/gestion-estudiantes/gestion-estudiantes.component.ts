import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { HeaderComponent } from '../../../common/header/header.component';

@Component({
  selector: 'app-gestion-estudiantes',
  standalone: true,
  imports: [CommonModule, HeaderComponent],
  templateUrl: './gestion-estudiantes.component.html',
  styleUrl: './gestion-estudiantes.component.scss'
})
export class GestionEstudiantesComponent {
  titulo = "Gestión de Estudiantes";
  menuActivo: string | null = null;

  constructor(private router: Router) { }

  toggleMenu(menu: string, event: Event) {
    event.stopPropagation();
    this.menuActivo = this.menuActivo === menu ? null : menu;
  }

  seleccionarOpcion(opcion: string, event: Event) {
    event.stopPropagation();
    // NOTA: ajusta estas rutas a las reales del módulo de estudiantes si difieren.
    switch (opcion) {
      case 'estudiantes':
        this.router.navigate(['/estudiantes']);
        break;
      case 'registro-rapido-estudiante':
        this.router.navigate(['/registro-rapido-estudiante']);
        break;
    }
  }
}
