import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { HeaderComponent } from '../../../../common/header/header.component';
import { RolesService } from '../../../../services/roles.service';
import { RolesXUsuarioService } from '../../../../services/roles-x-usuario.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-usuarios-x-rol',
  templateUrl: './usuarios-x-rol.component.html',
  styleUrl: './usuarios-x-rol.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent]
})
export class UsuariosXRolComponent implements OnInit {

  titulo = "Usuarios por Rol";

  roles = [] as any[];
  idRolSeleccionado: string = '';

  usuarios = [] as any[];
  filtroTexto: string = '';
  filtroAsignacion: string = 'todos'; // todos | asignados | sin-asignar
  filtroTipo: string = 'todos'; // todos | colaborador | acudiente | ninguno
  filtroEstado: string = 'todos'; // todos | activos | inactivos
  cargando: boolean = false;
  hayCambios: boolean = false;

  constructor(
    private rolesService: RolesService,
    private rolesXUsuarioService: RolesXUsuarioService,
    private route: ActivatedRoute
  ) { }

  ngOnInit(): void {
    this.rolesService.obtenerTodos().subscribe({
      next: (response: any) => {
        this.roles = response.body as any[];
        // Permite llegar con el rol preseleccionado desde el listado de roles
        const rolParam = this.route.snapshot.queryParamMap.get('rol');
        if (rolParam) {
          this.idRolSeleccionado = rolParam;
          this.cargarUsuarios();
        }
      },
      error: () => {
        Swal.fire('Error', 'No se pudieron cargar los roles', 'error');
      }
    });
  }

  cargarUsuarios() {
    if (!this.idRolSeleccionado) {
      this.usuarios = [];
      return;
    }
    this.cargando = true;
    this.hayCambios = false;
    this.rolesXUsuarioService.obtenerUsuariosPorRol(this.idRolSeleccionado).subscribe({
      next: (response: any) => {
        const body = response.body as any[];
        this.usuarios = body.map(u => ({
          ...u,
          asignado: u.asignado == 1,
          tipo_persona: u.es_colaborador == 1 && u.es_acudiente == 1 ? 'Colaborador y Acudiente'
            : u.es_colaborador == 1 ? 'Colaborador'
            : u.es_acudiente == 1 ? 'Acudiente'
            : 'Ninguno'
        }));
        this.cargando = false;
      },
      error: () => {
        this.cargando = false;
        Swal.fire('Error', 'No se pudieron cargar los usuarios', 'error');
      }
    });
  }

  get usuariosFiltrados() {
    const t = this.filtroTexto.trim().toLowerCase();
    return this.usuarios.filter(u => {
      if (this.filtroAsignacion === 'asignados' && !u.asignado) return false;
      if (this.filtroAsignacion === 'sin-asignar' && u.asignado) return false;
      if (this.filtroTipo === 'colaborador' && u.es_colaborador != 1) return false;
      if (this.filtroTipo === 'acudiente' && u.es_acudiente != 1) return false;
      if (this.filtroTipo === 'ninguno' && (u.es_colaborador == 1 || u.es_acudiente == 1)) return false;
      if (this.filtroEstado === 'activos' && u.activo != 1) return false;
      if (this.filtroEstado === 'inactivos' && u.activo == 1) return false;
      if (t && !(u.nombre_completo || '').toLowerCase().includes(t)
            && !(u.usuario || '').toString().includes(t)
            && !(u.numero_identificacion || '').toString().includes(t)) return false;
      return true;
    });
  }

  get totalAsignados() {
    return this.usuarios.filter(u => u.asignado).length;
  }

  marcarCambio() {
    this.hayCambios = true;
  }

  seleccionarVisibles(valor: boolean) {
    this.usuariosFiltrados.forEach(u => u.asignado = valor);
    this.hayCambios = true;
  }

  guardar() {
    if (!this.idRolSeleccionado) {
      Swal.fire('Advertencia', 'Seleccione un rol', 'warning');
      return;
    }
    const asignados = this.usuarios.filter(u => u.asignado).map(u => u.id);
    this.rolesXUsuarioService.sincronizarRol({ id_rol: this.idRolSeleccionado, usuarios: asignados }).subscribe({
      next: (response: any) => {
        const r = response?.body || response || {};
        Swal.fire('Guardado',
          `Usuarios del rol actualizados (${r.insertados ?? 0} agregados, ${r.eliminados ?? 0} retirados). Los cambios aplican cuando cada usuario vuelva a iniciar sesión.`,
          'success');
        this.cargarUsuarios();
      },
      error: (error: any) => {
        const mensaje = error?.error?.error || 'No se pudieron guardar los cambios.';
        Swal.fire('Error', mensaje, 'error');
      }
    });
  }
}
