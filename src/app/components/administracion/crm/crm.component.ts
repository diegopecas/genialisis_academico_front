import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { HeaderComponent } from '../../../common/header/header.component';
import { Router } from '@angular/router';

@Component({
  selector: 'app-crm',
  standalone: true,
  imports: [CommonModule, HeaderComponent],
  templateUrl: './crm.component.html',
  styleUrl: './crm.component.scss'
})
export class CrmComponent {
  titulo = "CRM - Gestión de Visitas y Contactos";

  constructor(
    private router: Router,
  ) { }

  seleccionarOpcion(opcion: string) {
    switch (opcion) {
      case 'visitas':
        this.router.navigate(['/administracion/crm/visitas']);
        break;
      case 'dashboard':
        this.router.navigate(['/administracion/crm/dashboard']);
        break;
      case 'contactos-portal':
        this.router.navigate(['/administracion/crm/contactos-portal']);
        break;
    }
  }
}