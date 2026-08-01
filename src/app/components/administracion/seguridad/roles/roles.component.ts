import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../../../../common/header/header.component';
import { TablasComponent } from '../../../../common/tablas/tablas.component';
import { RolesService } from '../../../../services/roles.service';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';

@Component({
  selector: 'app-roles',
  templateUrl: './roles.component.html',
  styleUrl: './roles.component.scss',
  standalone: true,
  imports: [CommonModule, HeaderComponent, TablasComponent]
})
export class RolesComponent implements OnInit {

  titulo = "Gestión de Roles";
  public columnasFiltro = ['Nombre'];
  public titulos = [] as any[];
  public datos = [] as any[];
  public acciones = [] as any[];

  constructor(
    private rolesService: RolesService,
    private router: Router,
  ) { }

  ngOnInit(): void {
    this.crearTitulos();
    this.crearAcciones();
    this.obtenerRoles();
  }

  obtenerRoles() {
    this.rolesService.obtenerTodos().subscribe((response: any) => {
      const body = response.body as any[];
      this.datos = body;
    });
  }

  crearTitulos() {
    this.titulos = [
      {
        clave: 'nombre',
        alias: 'Nombre',
        alinear: 'izquierda',
      },
      {
        clave: 'usuarios_asignados',
        alias: 'Usuarios',
        alinear: 'centrado',
      },
      {
        clave: 'permisos_asignados',
        alias: 'Permisos',
        alinear: 'centrado',
      },
    ];
  }

  crearAcciones() {
    this.acciones = [
      { id: 'permisos', label: 'Permisos', icono: '/assets/images/seguridad.png' },
      { id: 'usuarios', label: 'Usuarios', icono: '/assets/images/colaboradores.png' },
    ];
  }

  clicAccion($event: any) {
    switch ($event.accion) {
      case 'editar':
        this.router.navigate(['administracion/datos-maestros/roles/editar/' + $event.registro.id]);
        break;
      case 'eliminar':
        this.eliminarRol($event.registro);
        break;
      case 'permisos':
        // La pantalla de Permisos por Rol permite preseleccionar el rol vía query param
        this.router.navigate(['administracion/datos-maestros/permisos'], { queryParams: { rol: $event.registro.id } });
        break;
      case 'usuarios':
        this.router.navigate(['administracion/datos-maestros/usuarios-x-rol'], { queryParams: { rol: $event.registro.id } });
        break;
    }
  }

  async eliminarRol(rol: any) {
    const result = await Swal.fire({
      title: '¿Está seguro?',
      text: `¿Desea eliminar el rol ${rol.nombre}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      this.rolesService.eliminar(rol.id).subscribe({
        next: () => {
          Swal.fire('Eliminado', 'El rol ha sido eliminado.', 'success');
          this.obtenerRoles();
        },
        error: (error: any) => {
          // El back bloquea la eliminación si el rol tiene usuarios o permisos asignados
          const mensaje = error?.error?.error || 'No se pudo eliminar el rol.';
          Swal.fire('No se puede eliminar', mensaje, 'error');
        }
      });
    }
  }
}
