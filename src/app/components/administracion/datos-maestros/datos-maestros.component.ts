import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { HeaderComponent } from '../../../common/header/header.component';
import { Router } from '@angular/router';
import { PermisosService } from '../../../services/permisos.service';

@Component({
  selector: 'app-datos-maestros',
  standalone: true,
  imports: [CommonModule, HeaderComponent],
  templateUrl: './datos-maestros.component.html',
  styleUrl: './datos-maestros.component.scss'
})
export class DatosMaestrosComponent {
  titulo = "Registro de Datos Maestros";
  menuActivo: string | null = null;

  constructor(
    private router: Router,
    public permisosService: PermisosService
  ) { }

  toggleMenu(menu: string, event: Event) {
    event.stopPropagation();
    this.menuActivo = this.menuActivo === menu ? null : menu;
  }

  seleccionarOpcion(opcion: string) {
    switch (opcion) {
      case 'productos-servicios':
        this.router.navigate(['/administracion/datos-maestros/productos-servicios']);
        break;
      case 'proveedores':
        this.router.navigate(['/administracion/datos-maestros/proveedores']);
        break;
      case 'productos':
        this.router.navigate(['/administracion/datos-maestros/productos']);
        break;
      case 'productos-mobiliario':
        this.router.navigate(['/administracion/datos-maestros/productos-mobiliario']);
        break;
      case 'productos-limpieza':
        this.router.navigate(['/administracion/datos-maestros/productos-limpieza']);
        break;
      case 'productos-alimentacion':
        this.router.navigate(['/administracion/datos-maestros/productos-alimentacion']);
        break;
      case 'productos-academico':
        this.router.navigate(['/administracion/datos-maestros/productos-academico']);
        break;
      case 'areas-fisicas':
        this.router.navigate(['/administracion/datos-maestros/areas-fisicas']);
        break;
      case 'elementos-fisicos':
        this.router.navigate(['/administracion/datos-maestros/elementos-fisicos']);
        break;
      case 'config-aseo':
        this.router.navigate(['/administracion/datos-maestros/config-aseo']);
        break;
      case 'menus':
        this.router.navigate(['/administracion/datos-maestros/menus']);
        break;
      case 'gestion-medidas':
        this.router.navigate(['/administracion/datos-maestros/gestion-medidas']);
        break;
      case 'configuracion-global':
        this.router.navigate(['/administracion/datos-maestros/configuracion-global']);
        break;
      case 'plantillas-institucionales':
        this.router.navigate(['/administracion/datos-maestros/plantillas']);
        break;
      case 'plantillas-whatsapp':
        this.router.navigate(['/administracion/datos-maestros/plantillas-whatsapp']);
        break;
      case 'cargos':
        this.router.navigate(['/administracion/datos-maestros/cargos']);
        break;
      case 'tipos-documentos':
        this.router.navigate(['/administracion/datos-maestros/tipos-documentos']);
        break;
      case 'configuracion-ia':
        this.router.navigate(['/administracion/datos-maestros/configuracion-ia']);
        break;
      case 'configuracion-google':
        this.router.navigate(['/administracion/datos-maestros/configuracion-google']);
        break;
      case 'permisos':
        this.router.navigate(['/administracion/datos-maestros/permisos']);
        break;      case 'usuarios':
        this.router.navigate(['/administracion/datos-maestros/usuarios']);
        break;
      case 'roles':
        this.router.navigate(['/administracion/datos-maestros/roles']);
        break;
      case 'usuarios-x-rol':
        this.router.navigate(['/administracion/datos-maestros/usuarios-x-rol']);
        break;
      case 'configuracion-geofence':
        this.router.navigate(['/administracion/datos-maestros/configuracion-geofence']);
        break;
      case 'datos-estudiantes':
        this.router.navigate(['/administracion/datos-maestros/datos-estudiantes']);
        break;
      case 'documentacion-sistema':
        this.router.navigate(['/administracion/datos-maestros/documentacion-sistema']);
        break;
      case 'institucion':
        this.router.navigate(['/administracion/datos-maestros/institucion']);
        break;
      case 'conectar-whatsapp':
        this.router.navigate(['/administracion/datos-maestros/conectar-whatsapp']);
        break;
    }
  }

  tieneAlguno(codigos: string[]): boolean {
    return codigos.some(c => this.permisosService.tienePermiso(c));
  }
}
