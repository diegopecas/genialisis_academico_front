import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { HeaderComponent } from '../../../common/header/header.component';
import { Router } from '@angular/router';

@Component({
  selector: 'app-academico',
  standalone: true,
  imports: [CommonModule, HeaderComponent],
  templateUrl: './academico.component.html',
  styleUrl: './academico.component.scss'
})
export class AcademicoComponent {
  titulo = "Módulo académico";
  menuActivo: string | null = null;
  
  constructor(
    private router: Router,
  ) { }

  toggleMenu(menu: string, event: Event) {
    event.stopPropagation();
    this.menuActivo = this.menuActivo === menu ? null : menu;
  }

  seleccionarOpcion(opcion: any) {
    switch (opcion) {
      case 'parametros-calificaciones':
        this.router.navigate(['/academico/parametros-calificaciones']);
        break;
      case 'grados':
        this.router.navigate(['/academico/grados']);
        break;
      case 'grupos':
        this.router.navigate(['/academico/grupos']);
        break;
      case 'areas-academicas':
        this.router.navigate(['/academico/areas-academicas']);
        break;
      case 'actividades':
        this.router.navigate(['/academico/selector-actividades']);
        break;
      case 'sprints':
        this.router.navigate(['/academico/sprints']);
        break;
      case 'logros':
        this.router.navigate(['/academico/logros']);
        break;
      case 'indicadores-logro':
        this.router.navigate(['/academico/indicadores-logros']);
        break;
      case 'cortes-academicos':
        this.router.navigate(['/academico/cortes-academicos']);
        break;
      case 'cursos-extra':
        this.router.navigate(['/academico/cursos-extra']);
        break;
    }
  }
}