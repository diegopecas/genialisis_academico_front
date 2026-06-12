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
        this.router.navigate(['/administracion/productos-servicios']);
        break;
      case 'proveedores':
        this.router.navigate(['/administracion/proveedores']);
        break;
      case 'productos':
        this.router.navigate(['/administracion/productos']);
        break;
      case 'productos-mobiliario':
        this.router.navigate(['/administracion/productos-mobiliario']);
        break;
      case 'productos-limpieza':
        this.router.navigate(['/administracion/productos-limpieza']);
        break;
      case 'productos-alimentacion':
        this.router.navigate(['/administracion/productos-alimentacion']);
        break;
      case 'productos-academico':
        this.router.navigate(['/administracion/productos-academico']);
        break;
      case 'areas-fisicas':
        this.router.navigate(['/administracion/areas-fisicas']);
        break;
      case 'elementos-fisicos':
        this.router.navigate(['/administracion/elementos-fisicos']);
        break;
      case 'menus':
        this.router.navigate(['/administracion/menus']);
        break;
      case 'gestion-medidas':
        this.router.navigate(['/administracion/gestion-medidas']);
        break;
      case 'configuracion-global':
        this.router.navigate(['/administracion/configuracion/configuracion-global']);
        break;
      case 'plantillas-institucionales':
        this.router.navigate(['/administracion/configuracion/plantillas']);
        break;
      case 'plantillas-whatsapp':
        this.router.navigate(['/administracion/plantillas-whatsapp']);
        break;
      case 'cargos':
        this.router.navigate(['/administracion/cargos']);
        break;
      case 'tipos-documentos':
        this.router.navigate(['/administracion/tipos-documentos']);
        break;
      case 'configuracion-ia':
        this.router.navigate(['/administracion/configuracion-ia']);
        break;
      case 'configuracion-google':
        this.router.navigate(['/administracion/configuracion-google']);
        break;
      case 'permisos':
        this.router.navigate(['/administracion/seguridad/permisos']);
        break;
      case 'configuracion-geofence':
        this.router.navigate(['/administracion/configuracion-geofence']);
        break;
      case 'datos-estudiantes':
        this.router.navigate(['/administracion/datos-estudiantes']);
        break;
      case 'documentacion-sistema':
        this.router.navigate(['/administracion/documentacion-sistema']);
        break;
      case 'conectar-whatsapp':
        this.router.navigate(['/administracion/conectar-whatsapp']);
        break;
    }
  }
}