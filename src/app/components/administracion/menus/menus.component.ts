import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { HeaderComponent } from '../../../common/header/header.component';
import { Router } from '@angular/router';

@Component({
  selector: 'app-menus',
  standalone: true,
  imports: [CommonModule, HeaderComponent],
  templateUrl: './menus.component.html',
  styleUrl: './menus.component.scss'
})
export class MenusComponent {
  titulo = "Gestión de Menús del Restaurante";

  constructor(
    private router: Router,
  ) { }

  seleccionarOpcion(opcion: string) {
    switch (opcion) {
      case 'items-menu':
        this.router.navigate(['/administracion/items-menu']);
        break;
      case 'menus':
        this.router.navigate(['/administracion/lista-menus']);
        break;
    }
  }
}