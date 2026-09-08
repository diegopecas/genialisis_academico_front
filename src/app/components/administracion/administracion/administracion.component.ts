import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { HeaderComponent } from '../../../common/header/header.component';
import { BuscarComponent } from '../../../common/buscar/buscar.component';
import { Router } from '@angular/router';
import { PermisosService } from '../../../services/permisos.service';
import { GrupoMenuModulo, MenuModulosService, OpcionMenuModulo, TarjetaModulo } from '../../../services/menu-modulos.service';

@Component({
  selector: 'app-administracion',
  standalone: true,
  imports: [CommonModule, HeaderComponent, BuscarComponent],
  templateUrl: './administracion.component.html',
  styleUrl: './administracion.component.scss'
})
export class AdministracionComponent implements OnInit {
  titulo = "Módulo administración";

  menuActivo: string | null = null;

  // Tarjetas de enlace (Datos Maestros y Financiero) ya filtradas por permisos
  tarjetas: TarjetaModulo[] = [];
  tarjetasVisibles: TarjetaModulo[] = [];

  // Tarjetas con submenú (CRM, Operaciones y Auditoría) ya filtradas por permisos
  grupos: GrupoMenuModulo[] = [];
  gruposVisibles: GrupoMenuModulo[] = [];

  enBusqueda = false;

  constructor(
    private router: Router,
    private menuModulosService: MenuModulosService,
    public permisosService: PermisosService
  ) { }

  ngOnInit(): void {
    this.tarjetas = this.menuModulosService.filtrarTarjetasPorPermiso(this.menuModulosService.getTarjetas('administracion'));
    this.tarjetasVisibles = this.tarjetas;

    this.grupos = this.menuModulosService.filtrarPorPermiso(this.menuModulosService.getGrupos('administracion'));
    this.gruposVisibles = this.grupos;
  }

  buscar(valor: string | null): void {
    const termino = (valor || '').trim();
    this.enBusqueda = termino.length > 0;

    this.tarjetasVisibles = this.enBusqueda
      ? this.menuModulosService.filtrarTarjetasPorTexto(this.tarjetas, termino)
      : this.tarjetas;

    this.gruposVisibles = this.enBusqueda
      ? this.menuModulosService.filtrarPorTexto(this.grupos, termino)
      : this.grupos;
  }

  /** True cuando la búsqueda no dejó ninguna tarjeta de ningún tipo. */
  get sinResultados(): boolean {
    return this.enBusqueda && this.tarjetasVisibles.length === 0 && this.gruposVisibles.length === 0;
  }

  toggleMenu(menu: string, event: Event): void {
    event.stopPropagation();
    this.menuActivo = this.menuActivo === menu ? null : menu;
  }

  trackByTarjeta(_indice: number, tarjeta: TarjetaModulo): string {
    return tarjeta.id;
  }

  trackByGrupo(_indice: number, grupo: GrupoMenuModulo): string {
    return grupo.id;
  }

  trackByOpcion(_indice: number, opcion: OpcionMenuModulo): string {
    return opcion.id;
  }

  seleccionarOpcion(opcion: any) {
    switch (opcion) {
      case 'datos-maestros':
        this.router.navigate(['/administracion/datos-maestros']);
        break;
      case 'crm':
        this.router.navigate(['/administracion/crm']);
        break;
      case 'financiero':
        this.router.navigate(['/administracion/financiero']);
        break;
      case 'contabilizacion-multiple':
        this.router.navigate(['/administracion/financiero/contabilizacion-multiple']);
        break;
      case 'operaciones':
        this.router.navigate(['/administracion/operaciones']);
        break;
      case 'auditoria-registros':
        this.router.navigate(['/administracion/auditoria-registros']);
        break;
      // Opciones del submenú de CRM
      case 'visitas':
        this.router.navigate(['/administracion/crm/visitas']);
        break;
      case 'contactos-portal':
        this.router.navigate(['/administracion/crm/contactos-portal']);
        break;
      case 'dashboard':
        this.router.navigate(['/administracion/crm/dashboard']);
        break;
      // Opciones del submenú de Operaciones
      case 'entes-control':
        this.router.navigate(['/administracion/operaciones/entes-control']);
        break;
      case 'consulta-entes-control':
        this.router.navigate(['/administracion/operaciones/consulta-entes-control']);
        break;
      case 'utiles-diarios':
        this.router.navigate(['/administracion/operaciones/utiles-diarios']);
        break;
      case 'tipos-solicitud':
        this.router.navigate(['/administracion/operaciones/tipos-solicitud']);
        break;
    }
  }
}