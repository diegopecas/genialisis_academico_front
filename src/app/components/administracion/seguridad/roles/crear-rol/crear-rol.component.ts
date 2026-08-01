import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HeaderComponent } from '../../../../../common/header/header.component';
import { RolesService } from '../../../../../services/roles.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-crear-rol',
  templateUrl: './crear-rol.component.html',
  styleUrl: './crear-rol.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent]
})
export class CrearRolComponent implements OnInit {

  titulo = "Crear Rol";
  accion: string = "";
  regresar = '/administracion/datos-maestros/roles';
  editable: boolean = true;
  submitted: boolean = false;

  model = {
    id: null,
    nombre: ''
  } as any;

  constructor(
    private rolesService: RolesService,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.accion = params['accion'];
      const id = params['id'];

      if (this.accion === 'crear') {
        this.titulo = "Crear Rol";
        this.editable = true;
      } else if (this.accion === 'editar') {
        this.titulo = "Editar Rol";
        this.editable = true;
        this.cargarRol(id);
      } else if (this.accion === 'consultar') {
        this.titulo = "Consultar Rol";
        this.editable = false;
        this.cargarRol(id);
      }
    });
  }

  cargarRol(id: any) {
    this.rolesService.obtenerPorId(id).subscribe({
      next: (response: any) => {
        const body = response.body;
        if (body && body.length > 0) {
          this.model = body[0];
          if (this.accion === 'editar') {
            this.titulo = "Editar Rol: " + this.model.nombre;
          } else if (this.accion === 'consultar') {
            this.titulo = "Consultar Rol: " + this.model.nombre;
          }
        }
      },
      error: () => {
        Swal.fire('Error', 'No se pudo cargar el rol', 'error');
      }
    });
  }

  guardar() {
    this.submitted = true;

    if (!this.model.nombre || this.model.nombre.trim() === '') {
      Swal.fire('Advertencia', 'El nombre del rol es obligatorio', 'warning');
      return;
    }

    const data = {
      nombre: this.model.nombre.trim()
    } as any;

    if (this.accion === 'crear') {
      this.rolesService.crear(data).subscribe({
        next: () => {
          Swal.fire('Creado', 'El rol ha sido creado. Recuerde asignarle permisos y usuarios.', 'success');
          this.volver();
        },
        error: (error: any) => {
          const mensaje = error?.error?.error || 'No se pudo crear el rol.';
          Swal.fire('Error', mensaje, 'error');
        }
      });
    } else if (this.accion === 'editar') {
      data.id = this.model.id;
      this.rolesService.actualizar(data).subscribe({
        next: () => {
          Swal.fire('Actualizado', 'El rol ha sido actualizado.', 'success');
          this.volver();
        },
        error: (error: any) => {
          const mensaje = error?.error?.error || 'No se pudo actualizar el rol.';
          Swal.fire('Error', mensaje, 'error');
        }
      });
    }
  }

  volver() {
    this.router.navigate([this.regresar]);
  }
}
