import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { HeaderComponent } from '../../common/header/header.component';
import { Router } from '@angular/router';
import { PermisosService } from '../../services/permisos.service';

@Component({
  selector: 'app-operaciones',
  standalone: true,
  imports: [CommonModule, HeaderComponent],
  templateUrl: './operaciones.component.html',
  styleUrl: './operaciones.component.scss'
})
export class OperacionesComponent {
  titulo = "Módulo Operaciones";
  menuActivo: string | null = null;

  constructor(
    public permisosService: PermisosService,
    private router: Router) { }

  toggleMenu(menu: string, event: Event) {
    event.stopPropagation();
    this.menuActivo = this.menuActivo === menu ? null : menu;
  }

  seleccionarOpcion(opcion: string) {
    switch (opcion) {
      case 'registro-medidas':
        this.router.navigate(['/operaciones/registro-medidas']);
        break;
      case 'galerias':
        this.router.navigate(['/operaciones/galerias']);
        break;
      case 'movimientos-inventario':
        this.router.navigate(['/operaciones/movimientos-productos']);
        break;
      case 'salidas-alimentacion':
        this.router.navigate(['/operaciones/salidas-alimentacion']);
        break;
      case 'registros-limpieza':
        this.router.navigate(['/operaciones/registros-limpieza']);
        break;
      case 'registro-rapido-limpieza':
        this.router.navigate(['/operaciones/registro-rapido-limpieza']);
        break;
      case 'registro-masivo-limpieza':
        this.router.navigate(['/operaciones/registro-masivo-limpieza']);
        break;
      case 'edicion-masiva-limpieza':
        this.router.navigate(['/operaciones/edicion-masiva-limpieza']);
        break;
      case 'supervision-limpieza':
        this.router.navigate(['/operaciones/supervision-limpieza']);
        break;
      case 'reporte-aseo':
        this.router.navigate(['/operaciones/reporte-aseo']);
        break;
      case 'disponibilidad-cocina':
        this.router.navigate(['/operaciones/disponibilidad-cocina']);
        break;
      case 'asignacion-onces':
        this.router.navigate(['/operaciones/asignacion-onces']);
        break;
      case 'entrega-alimentacion':
        this.router.navigate(['/operaciones/entrega-alimentacion']);
        break;
      case 'inventario-alimentacion':
        this.router.navigate(['/operaciones/inventario-alimentacion']);
        break;
      case 'actualizacion-datos-estudiantes':
        this.router.navigate(['/operaciones/actualizacion-datos-estudiantes']);
        break;
      case 'evaluacion-desarrollo':
        this.router.navigate(['/operaciones/evaluacion-desarrollo']);
        break;
      case 'perfil-desarrollo':
        this.router.navigate(['/operaciones/perfil-desarrollo']);
        break;
      case 'recordatorio-pagos':
        this.router.navigate(['/operaciones/recordatorio-pagos']);
        break;
      case 'seguimiento-asistencia':
        this.router.navigate(['/operaciones/seguimiento-asistencia']);
        break;
      case 'recordatorios-generales':
        this.router.navigate(['/operaciones/recordatorios-generales']);
        break;
      case 'inscripcion-cursos-extra':
        this.router.navigate(['/operaciones/inscripcion-cursos-extra']);
        break;
      case 'observaciones-informe':
        this.router.navigate(['/operaciones/observaciones-informe']);
        break;
      case 'notificaciones-envio':
        this.router.navigate(['/operaciones/notificaciones-envio']);
        break;
      case 'notificaciones-monitoreo':
        this.router.navigate(['/operaciones/notificaciones-monitoreo']);
        break;
      default:
        console.log('Opción no reconocida:', opcion);
        break;
    }
  }

  tieneAlguno(codigos: string[]): boolean {
    return codigos.some(c => this.permisosService.tienePermiso(c));
  }
}
