import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { HeaderComponent } from '../../../common/header/header.component';
import { BuscarComponent } from '../../../common/buscar/buscar.component';
import { Router } from '@angular/router';
import { PermisosService } from '../../../services/permisos.service';
import { GrupoMenuModulo, MenuModulosService, OpcionMenuModulo } from '../../../services/menu-modulos.service';

@Component({
  selector: 'app-academico',
  standalone: true,
  imports: [CommonModule, HeaderComponent, BuscarComponent],
  templateUrl: './academico.component.html',
  styleUrl: './academico.component.scss'
})
export class AcademicoComponent implements OnInit {
  titulo = "Módulo académico";
  menuActivo: string | null = null;

  // Grupos del menú ya filtrados por permisos (fuente para render y búsqueda)
  grupos: GrupoMenuModulo[] = [];
  // Grupos visibles en pantalla (todos, o el subconjunto que coincide con la búsqueda)
  gruposVisibles: GrupoMenuModulo[] = [];
  enBusqueda = false;

  constructor(

    public permisosService: PermisosService,
    private menuModulosService: MenuModulosService,
    private router: Router,
  ) { }

  ngOnInit(): void {
    this.grupos = this.menuModulosService.filtrarPorPermiso(this.menuModulosService.getAcademico());
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

  seleccionarOpcion(opcion: any) {
    switch (opcion) {
      case 'parametros-calificaciones':
        this.router.navigate(['/academico/parametros-calificaciones']);
        break;
      case 'grados':
        this.router.navigate(['/academico/grados']);
        break;
      case 'grupos':
        this.router.navigate(['/academico/grupos']);
        break;
      case 'areas-academicas':
        this.router.navigate(['/academico/areas-academicas']);
        break;
      case 'actividades':
        this.router.navigate(['/academico/actividades']);
        break;
      case 'sprints':
        this.router.navigate(['/academico/sprints']);
        break;
      case 'logros':
        this.router.navigate(['/academico/logros']);
        break;
      case 'indicadores-logro':
        this.router.navigate(['/academico/indicadores-logros']);
        break;
      case 'cortes-academicos':
        this.router.navigate(['/academico/cortes-academicos']);
        break;
      case 'cursos-extra':
        this.router.navigate(['/academico/cursos-extra']);
        break;
      case 'pde-rangos-edad':
        this.router.navigate(['/academico/pde-rangos-edad']);
        break;
      case 'pde-items':
        this.router.navigate(['/academico/pde-items']);
        break;
      case 'informes-configuracion':
        this.router.navigate(['/academico/informes/configuracion']);
        break;
      case 'informes-secciones':
        this.router.navigate(['/academico/informes/secciones']);
        break;
      case 'informes-items':
        this.router.navigate(['/academico/informes/items']);
        break;
    }
  }

  tieneAlguno(codigos: string[]): boolean {
    return codigos.some(c => this.permisosService.tienePermiso(c));
  }
}