import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { HeaderComponent } from '../../../common/header/header.component';
import { PermisosService } from '../../../services/permisos.service';

@Component({
  selector: 'app-selector-actividades',
  templateUrl: './selector-actividades.component.html',
  styleUrl: './selector-actividades.component.scss',
  standalone: true,
  imports: [CommonModule, HeaderComponent]
})
export class SelectorActividadesComponent {
  titulo = "Actividades";

  constructor(
    public permisosService: PermisosService,
    private router: Router) {}

  irMaquinaActividades() {
    this.router.navigate(['/academico/actividades/maquina']);
  }

  irMisActividades() {
    this.router.navigate(['/academico/actividades/manual']);
  }

  irImportarDeSprint() {
    this.router.navigate(['/academico/actividades/importar']);
  }

  irGestionActividades() {
    this.router.navigate(['/academico/actividades/gestion']);
  }

  irActividadesEvaluacion() {
    this.router.navigate(['/academico/actividades/evaluacion']);
  }
}