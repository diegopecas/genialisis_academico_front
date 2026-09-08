import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HeaderComponent } from '../../../common/header/header.component';
import { BuscarComponent } from '../../../common/buscar/buscar.component';
import { PermisosService } from '../../../services/permisos.service';
import { GrupoMenuModulo, MenuModulosService, OpcionMenuModulo } from '../../../services/menu-modulos.service';

@Component({
  selector: 'app-gestion-colaboradores',
  standalone: true,
  imports: [CommonModule, HeaderComponent, BuscarComponent],
  templateUrl: './gestion-colaboradores.component.html',
  styleUrl: './gestion-colaboradores.component.scss'
})
export class GestionColaboradoresComponent implements OnInit {
  titulo = "Gestión de Colaboradores";
  menuActivo: string | null = null;

  // Grupos del menú ya filtrados por permisos (fuente para render y búsqueda)
  grupos: GrupoMenuModulo[] = [];
  // Grupos visibles en pantalla (todos, o el subconjunto que coincide con la búsqueda)
  gruposVisibles: GrupoMenuModulo[] = [];
  enBusqueda = false;

  constructor(
    public permisosService: PermisosService,
    private menuModulosService: MenuModulosService,
    private router: Router) { }

  ngOnInit(): void {
    this.grupos = this.menuModulosService.filtrarPorPermiso(this.menuModulosService.getGestionColaboradores());
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
      case 'colaboradores':
        this.router.navigate(['/colaboradores']);
        break;
      case 'casas-colaboradores':
        this.router.navigate(['/casas-colaboradores']);
        break;
      case 'registro-ingreso-salida':
        this.router.navigate(['/registro-ingreso-salida']);
        break;
      case 'actividades-colaboradores':
        this.router.navigate(['/colaboradores/actividades']);
        break;
      case 'nominas':
        this.router.navigate(['/colaboradores/nominas']);
        break;
    }
  }

  tieneAlguno(codigos: string[]): boolean {
    return codigos.some(c => this.permisosService.tienePermiso(c));
  }
}
