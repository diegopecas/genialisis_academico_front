import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { HeaderComponent } from '../../common/header/header.component';
import { BuscarComponent } from '../../common/buscar/buscar.component';
import { Router } from '@angular/router';
import { PermisosService } from '../../services/permisos.service';
import { GrupoMenuModulo, MenuModulosService, OpcionMenuModulo } from '../../services/menu-modulos.service';

@Component({
  selector: 'app-reportes',
  templateUrl: './reportes.component.html',
  styleUrl: './reportes.component.scss',
  standalone: true,
  imports: [CommonModule, HeaderComponent, BuscarComponent],
})
export class ReportesComponent implements OnInit {
  titulo = 'Centro de Reportes';
  menuActivo: string | null = null;

  // Grupos del menú ya filtrados por permisos (fuente para render y búsqueda)
  grupos: GrupoMenuModulo[] = [];
  // Grupos visibles en pantalla (todos, o el subconjunto que coincide con la búsqueda)
  gruposVisibles: GrupoMenuModulo[] = [];
  enBusqueda = false;

  constructor(
    public permisosService: PermisosService,
    private menuModulosService: MenuModulosService,
    private router: Router) {}

  ngOnInit(): void {
    this.grupos = this.menuModulosService.filtrarPorPermiso(this.menuModulosService.getReportes());
    this.gruposVisibles = this.grupos;
  }

  buscar(valor: string | null): void {
    const termino = (valor || '').trim();
    this.enBusqueda = termino.length > 0;
    this.gruposVisibles = this.enBusqueda
      ? this.menuModulosService.filtrarPorTexto(this.grupos, termino)
      : this.grupos;
  }

  trackByGrupo(_indice: number, grupo: GrupoMenuModulo): string {
    return grupo.id;
  }

  trackByOpcion(_indice: number, opcion: OpcionMenuModulo): string {
    return opcion.id;
  }

  toggleMenu(menu: string, event: Event) {
    event.stopPropagation();
    this.menuActivo = this.menuActivo === menu ? null : menu;
  }

    seleccionarOpcion(opcion: string, event: Event) {
    event.stopPropagation();
    switch (opcion) {
      // Académicos
      case 'academicos-estudiante':
        this.router.navigate(['/reportes/academicos-estudiante']);
        break;
      case 'calificaciones-sprint':
        this.router.navigate(['/reportes/calificaciones-sprint']);
        break;
      case 'monitoreo-sprint':
        this.router.navigate(['/reportes/monitoreo-sprint']);
        break;
      case 'cursos-extra':
        this.router.navigate(['/reportes/cursos-extra']);
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
      case 'distribucion-malla':
        this.router.navigate(['/reportes/distribucion-malla']);
        break;
      case 'horarios':
        this.router.navigate(['/reportes/horarios']);
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
      case 'utiles-diarios':
        this.router.navigate(['/reportes/utiles-diarios']);
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
      case 'documentos-registrados':
        this.router.navigate(['/reportes/documentos-registrados']);
        break;
      case 'cumplimiento-documental':
        this.router.navigate(['/reportes/cumplimiento-documental']);
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

  tieneAlguno(codigos: string[]): boolean {
    return codigos.some(c => this.permisosService.tienePermiso(c));
  }
}