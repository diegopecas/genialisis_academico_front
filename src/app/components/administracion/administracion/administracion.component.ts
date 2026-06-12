import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { HeaderComponent } from '../../../common/header/header.component';
import { Router } from '@angular/router';
import { PermisosService } from '../../../services/permisos.service';

@Component({
  selector: 'app-administracion',
  standalone: true,
  imports: [CommonModule, HeaderComponent],
  templateUrl: './administracion.component.html',
  styleUrl: './administracion.component.scss'
})
export class AdministracionComponent {
  titulo = "Módulo administración";

  constructor(
    private router: Router,
    public permisosService: PermisosService
  ) { }

  seleccionarOpcion(opcion: any) {
    switch (opcion) {
      case 'datos-maestros':
        this.router.navigate(['/administracion/datos-maestros']);
        break;
      case 'crm':
        this.router.navigate(['/administracion/crm']);
        break;
      case 'financiero':
        this.router.navigate(['/administracion/financiero']);
        break;
      case 'contabilizacion-multiple':
        this.router.navigate(['/administracion/contabilizacion-multiple']);
        break;
      case 'auditoria-registros':
        this.router.navigate(['/administracion/auditoria-registros']);
        break;
    }
  }
}