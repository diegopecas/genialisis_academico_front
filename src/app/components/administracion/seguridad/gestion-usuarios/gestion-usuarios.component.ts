import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../../../../common/header/header.component';
import { TablasComponent } from '../../../../common/tablas/tablas.component';
import { UsuariosService } from '../../../../services/usuarios.service';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';

@Component({
  selector: 'app-gestion-usuarios',
  templateUrl: './gestion-usuarios.component.html',
  styleUrl: './gestion-usuarios.component.scss',
  standalone: true,
  imports: [CommonModule, HeaderComponent, TablasComponent]
})
export class GestionUsuariosComponent implements OnInit {

  titulo = "Gestión de Usuarios";
  public columnasFiltro = ['Nombre', 'Usuario', 'Correo', 'Roles'];
  public titulos = [] as any[];
  public datos = [] as any[];
  public acciones = [] as any[];

  constructor(
    private usuariosService: UsuariosService,
    private router: Router,
  ) { }

  ngOnInit(): void {
    this.crearTitulos();
    this.crearAcciones();
    this.obtenerUsuarios();
  }

  obtenerUsuarios() {
    this.usuariosService.obtenerTodos().subscribe((response: any) => {
      const body = response.body as any[];
      // Nombre completo para mostrar y filtrar en una sola columna
      this.datos = body.map(u => ({
        ...u,
        nombre_completo: [u.primer_nombre, u.segundo_nombre, u.primer_apellido, u.segundo_apellido]
          .filter(x => x).join(' '),
        estado_texto: (u.activo == 1 ? 'Activo' : 'Inactivo') + (u.super_admin == 1 ? ' ⭐' : '')
      }));
    });
  }

  crearTitulos() {
    this.titulos = [
      {
        clave: 'nombre_completo',
        alias: 'Nombre',
        alinear: 'izquierda',
      },
      {
        clave: 'usuario',
        alias: 'Usuario',
        alinear: 'centrado',
      },
      {
        clave: 'correo_electronico',
        alias: 'Correo',
        alinear: 'izquierda',
      },
      {
        clave: 'roles',
        alias: 'Roles',
        alinear: 'izquierda',
      },
      {
        clave: 'estado_texto',
        alias: 'Estado',
        alinear: 'centrado',
      },
    ];
  }

  crearAcciones() {
    // Sin eliminar: los usuarios solo se inactivan para conservar la trazabilidad
    this.acciones = [
      { id: 'clave', label: 'Restablecer clave', icono: '/assets/images/seguridad.png' },
      { id: 'estado', label: 'Activar / Inactivar', icono: '/assets/images/cambio_estado.png' },
    ];
  }

  clicAccion($event: any) {
    switch ($event.accion) {
      case 'editar':
        this.router.navigate(['administracion/datos-maestros/usuarios/editar/' + $event.registro.id]);
        break;
      case 'clave':
        this.restablecerClave($event.registro);
        break;
      case 'estado':
        this.cambiarEstado($event.registro);
        break;
    }
  }

  async restablecerClave(usuario: any) {
    // Input propio con botón de ver/ocultar la clave (ojito)
    const { value: claveNueva } = await Swal.fire({
      title: 'Restablecer clave',
      html: `
        <p class="mb-2">Nueva clave para <b>${usuario.nombre_completo}</b> (${usuario.usuario})</p>
        <div class="input-group">
          <input type="password" id="swal-clave" class="form-control" placeholder="Nueva clave" autocomplete="new-password">
          <button type="button" id="swal-ojo" class="btn btn-outline-secondary" tabindex="-1">👁️</button>
        </div>`,
      showCancelButton: true,
      confirmButtonText: 'Restablecer',
      cancelButtonText: 'Cancelar',
      focusConfirm: false,
      didOpen: () => {
        const input = document.getElementById('swal-clave') as HTMLInputElement;
        const ojo = document.getElementById('swal-ojo') as HTMLButtonElement;
        input?.focus();
        ojo?.addEventListener('click', () => {
          input.type = input.type === 'password' ? 'text' : 'password';
        });
      },
      preConfirm: () => {
        const input = document.getElementById('swal-clave') as HTMLInputElement;
        const valor = input?.value?.trim() || '';
        if (valor.length < 4) {
          Swal.showValidationMessage('La clave debe tener al menos 4 caracteres');
          return false;
        }
        return valor;
      }
    });

    if (claveNueva) {
      this.usuariosService.restablecerClave({ id: usuario.id, claveNueva: claveNueva.trim() }).subscribe({
        next: () => {
          Swal.fire('Listo', 'La clave fue restablecida.', 'success');
        },
        error: (error: any) => {
          const mensaje = error?.error?.error || 'No se pudo restablecer la clave.';
          Swal.fire('Error', mensaje, 'error');
        }
      });
    }
  }

  async cambiarEstado(usuario: any) {
    const inactivar = usuario.activo == 1;
    const result = await Swal.fire({
      title: '¿Está seguro?',
      text: inactivar
        ? `¿Desea inactivar a ${usuario.nombre_completo}? No podrá volver a ingresar al sistema.`
        : `¿Desea activar a ${usuario.nombre_completo}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: inactivar ? 'Sí, inactivar' : 'Sí, activar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      const data = {
        id: usuario.id,
        correo_electronico: usuario.correo_electronico,
        activo: inactivar ? 0 : 1,
        acceso_institucional: usuario.acceso_institucional,
        acceso_chat_wa: usuario.acceso_chat_wa,
        acceso_portal_padres: usuario.acceso_portal_padres
      };
      this.usuariosService.actualizar(data).subscribe({
        next: () => {
          Swal.fire('Listo', inactivar ? 'Usuario inactivado.' : 'Usuario activado.', 'success');
          this.obtenerUsuarios();
        },
        error: (error: any) => {
          const mensaje = error?.error?.error || 'No se pudo cambiar el estado.';
          Swal.fire('Error', mensaje, 'error');
        }
      });
    }
  }
}
