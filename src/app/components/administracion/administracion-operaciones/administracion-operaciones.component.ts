import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { HeaderComponent } from '../../../common/header/header.component';
import { Router } from '@angular/router';
import { PermisosService } from '../../../services/permisos.service';

@Component({
  selector: 'app-administracion-operaciones',
  standalone: true,
  imports: [CommonModule, HeaderComponent],
  templateUrl: './administracion-operaciones.component.html',
  styleUrl: './administracion-operaciones.component.scss'
})
export class AdministracionOperacionesComponent {
  titulo = "Operaciones";

  constructor(
    private router: Router,
    public permisosService: PermisosService
  ) { }

  seleccionarOpcion(opcion: any) {
    switch (opcion) {
      case 'entes-control':
        this.router.navigate(['/administracion/operaciones/entes-control']);
        break;
      case 'consulta-entes-control':
        this.router.navigate(['/administracion/operaciones/consulta-entes-control']);
        break;
    }
  }
}
