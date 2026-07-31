import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { HeaderComponent } from '../../../common/header/header.component';
import { Router } from '@angular/router';
import { PermisosService } from '../../../services/permisos.service';

@Component({
  selector: 'app-actividades-colaboradores-menu',
  standalone: true,
  imports: [CommonModule, HeaderComponent],
  templateUrl: './actividades-colaboradores.component.html',
  styleUrl: './actividades-colaboradores.component.scss',
})
export class ActividadesColaboradoresComponent {
  titulo = 'Actividades Colaboradores';

  constructor(
    public permisosService: PermisosService,
    private router: Router) {}

  seleccionarOpcion(opcion: string) {
    switch (opcion) {
      case 'aprobar':
        this.router.navigate([
          '/colaboradores/actividades/aprobacion',
        ]);
        break;
      case 'contabilizar':
        this.router.navigate([
          '/colaboradores/actividades/contabilizacion',
        ]);
        break;
      case 'calendario':
        this.router.navigate(['/colaboradores/actividades/calendario']);
        break;
    }
  }
}