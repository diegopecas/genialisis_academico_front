import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { HeaderComponent } from '../../../common/header/header.component';
import { Router } from '@angular/router';

@Component({
  selector: 'app-actividades-colaboradores-menu',
  standalone: true,
  imports: [CommonModule, HeaderComponent],
  templateUrl: './actividades-colaboradores.component.html',
  styleUrl: './actividades-colaboradores.component.scss',
})
export class ActividadesColaboradoresComponent {
  titulo = 'Actividades Colaboradores';

  constructor(private router: Router) {}

  seleccionarOpcion(opcion: string) {
    switch (opcion) {
      case 'aprobar':
        this.router.navigate([
          '/administracion/aprobacion-actividades-colaboradores',
        ]);
        break;
      case 'contabilizar':
        this.router.navigate([
          '/administracion/contabilizacion-actividades-colaboradores',
        ]);
        break;
      case 'calendario':
        this.router.navigate(['/administracion/calendario-colaboradores']);
        break;
    }
  }
}