import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HeaderComponent } from '../../../common/header/header.component';
import { BuscarComponent } from '../../../common/buscar/buscar.component';
import { PermisosService } from '../../../services/permisos.service';
import { GrupoMenuModulo, MenuModulosService, OpcionMenuModulo } from '../../../services/menu-modulos.service';

@Component({
  selector: 'app-financiero',
  standalone: true,
  imports: [CommonModule, HeaderComponent, BuscarComponent],
  templateUrl: './financiero.component.html',
  styleUrl: './financiero.component.scss'
})
export class FinancieroComponent implements OnInit {
  titulo = "Módulo Financiero";
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
    this.grupos = this.menuModulosService.filtrarPorPermiso(this.menuModulosService.getFinanciero());
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

  seleccionarOpcion(opcion: string) {
    switch (opcion) {
      case 'registro-pagos-rapido':
        this.router.navigate(['/administracion/financiero/registro-pagos-rapido']);
        break;
      case 'registro-pago-simple':
        this.router.navigate(['/administracion/financiero/registro-pago-simple']);
        break;
      case 'registro-cobros-rapido':
        this.router.navigate(['/administracion/financiero/registro-cobros-rapido']);
        break;
      case 'anulacion-masiva-cobros':
        this.router.navigate(['/administracion/financiero/anulacion-masiva-cobros']);
        break;
      case 'movimientos':
        this.router.navigate(['/administracion/financiero/movimientos-financieros']);
        break;
      case 'aprobacion-multiple':
        this.router.navigate(['/administracion/financiero/aprobacion-multiple']);
        break;
      case 'contabilizar-pagos':
        this.router.navigate(['/administracion/financiero/contabilizacion-multiple']);
        break;
      case 'convenios':
        this.router.navigate(['/administracion/financiero/convenios']);
        break;
      case 'reglas-cobro':
        this.router.navigate(['/administracion/financiero/reglas-cobro-automatico']);
        break;
      case 'mora-configuracion':
        this.router.navigate(['/administracion/financiero/mora-configuracion']);
        break;
      case 'mora-exenciones':
        this.router.navigate(['/administracion/financiero/mora-exenciones']);
        break;
      case 'mora-ejecuciones':
        this.router.navigate(['/administracion/financiero/mora-ejecuciones']);
        break;
    }
  }
}
