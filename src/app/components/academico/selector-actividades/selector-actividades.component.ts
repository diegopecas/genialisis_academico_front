import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { HeaderComponent } from '../../../common/header/header.component';

@Component({
  selector: 'app-selector-actividades',
  templateUrl: './selector-actividades.component.html',
  styleUrl: './selector-actividades.component.scss',
  standalone: true,
  imports: [CommonModule, HeaderComponent]
})
export class SelectorActividadesComponent {
  titulo = "Actividades";

  constructor(private router: Router) {}

  irMaquinaActividades() {
    this.router.navigate(['/academico/maquina-actividades']);
  }

  irMisActividades() {
    this.router.navigate(['/academico/crear-actividades-manual']);
  }

  irImportarDeSprint() {
    this.router.navigate(['/academico/importar-actividades-sprint']);
  }

  irGestionActividades() {
    this.router.navigate(['/academico/actividades-academicas']);
  }

  irActividadesEvaluacion() {
    this.router.navigate(['/academico/crear-actividades-evaluacion']);
  }
}