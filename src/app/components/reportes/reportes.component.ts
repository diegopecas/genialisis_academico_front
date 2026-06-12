import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { HeaderComponent } from '../../common/header/header.component';
import { Router } from '@angular/router';

@Component({
  selector: 'app-reportes',
  templateUrl: './reportes.component.html',
  styleUrl: './reportes.component.scss',
  standalone: true,
  imports: [CommonModule, HeaderComponent],
})
export class ReportesComponent {
  titulo = 'Centro de Reportes';
  menuActivo: string | null = null;

  constructor(private router: Router) {}

  toggleMenu(menu: string, event: Event) {
    event.stopPropagation();
    this.menuActivo = this.menuActivo === menu ? null : menu;
  }

  seleccionarOpcion(opcion: string, event: Event) {
    event.stopPropagation();
    switch (opcion) {
      // Académicos
      case 'calificaciones-sprint':
        this.router.navigate(['/reportes/calificaciones-sprint']);
        break;
      case 'calificaciones-estudiante':
        this.router.navigate(['/reportes/calificaciones/estudiante']);
        break;
      case 'malla-curricular':
        this.router.navigate(['/reportes/malla-curricular']);
        break;
      case 'cobertura-curricular':
        this.router.navigate(['/reportes/cobertura-curricular']);
        break;
      case 'ejecucion-tareas':
        this.router.navigate(['/reportes/ejecucion-tareas']);
        break;
      // Estudiantes
      case 'estudiantes-general':
        this.router.navigate(['/reportes/estudiantes-general']);
        break;
      case 'asistencia':
        this.router.navigate(['/reportes/asistencia']);
        break;
      case 'tamizajes':
        this.router.navigate(['/reportes/tamizajes']);
        break;
      // Financiero
      case 'cartera':
        this.router.navigate(['/reportes/cartera']);
        break;
      case 'pagos-recibidos':
        this.router.navigate(['/reportes/pagos-recibidos']);
        break;
      case 'cobros-realizados':
        this.router.navigate(['/reportes/cobros-realizados']);
        break;
      case 'movimientos-financieros':
        this.router.navigate(['/reportes/movimientos-financieros']);
        break;
      // Colaboradores
      case 'reporte-contabilizaciones':
        this.router.navigate(['/reportes/reporte-contabilizaciones']);
        break;
      case 'historial-actividades':
        this.router.navigate(['/reportes/historial-actividades']);
        break;
      case 'asistencia-colaboradores':
        this.router.navigate(['/reportes/asistencia-colaboradores']);
        break;
      // Administración
      case 'dashboard-gerencial':
        this.router.navigate(['/reportes/dashboard-gerencial']);
        break;
      // Apoyo
      case 'alimentacion':
        this.router.navigate(['/reportes/alimentacion']);
        break;
      case 'reportes-pago':
        this.router.navigate(['/reportes/reportes-pago']);
        break;
    }
  }
}