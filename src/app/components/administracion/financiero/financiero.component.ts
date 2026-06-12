import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { HeaderComponent } from '../../../common/header/header.component';

@Component({
  selector: 'app-financiero',
  standalone: true,
  imports: [CommonModule, HeaderComponent],
  templateUrl: './financiero.component.html',
  styleUrl: './financiero.component.scss'
})
export class FinancieroComponent {
  titulo = "Módulo Financiero";
  menuActivo: string | null = null;

  constructor(private router: Router) { }

  toggleMenu(menu: string, event: Event) {
    event.stopPropagation();
    this.menuActivo = this.menuActivo === menu ? null : menu;
  }

  seleccionarOpcion(opcion: string) {
    switch (opcion) {
      case 'registro-pagos-rapido':
        this.router.navigate(['/administracion/financiero/registro-pagos-rapido']);
        break;
      case 'movimientos':
        this.router.navigate(['/administracion/financiero/movimientos-financieros']);
        break;
      case 'aprobacion-multiple':
        this.router.navigate(['/administracion/financiero/aprobacion-multiple']);
        break;
      case 'contabilizar-pagos':
        this.router.navigate(['/administracion/contabilizacion-multiple']);
        break;
      case 'convenios':
        this.router.navigate(['/administracion/financiero/convenios']);
        break;
      case 'reglas-cobro':
        this.router.navigate(['/administracion/financiero/reglas-cobro-automatico']);
        break;
    }
  }
}