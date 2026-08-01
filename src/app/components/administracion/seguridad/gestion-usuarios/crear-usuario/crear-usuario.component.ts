import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HeaderComponent } from '../../../../../common/header/header.component';
import { UsuariosService } from '../../../../../services/usuarios.service';
import { PersonasService } from '../../../../../services/personas.service';
import { RolesService } from '../../../../../services/roles.service';
import { RolesXUsuarioService } from '../../../../../services/roles-x-usuario.service';
import { PermisosService } from '../../../../../services/permisos.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-crear-usuario',
  templateUrl: './crear-usuario.component.html',
  styleUrl: './crear-usuario.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent]
})
export class CrearUsuarioComponent implements OnInit {

  titulo = "Crear Usuario";
  accion: string = "";
  regresar = '/administracion/datos-maestros/usuarios';
  editable: boolean = true;
  submitted: boolean = false;

  // Selector de persona (solo en crear)
  personas = [] as any[];
  personasFiltradas = [] as any[];
  filtroPersona: string = '';

  // Roles disponibles con marca de selección
  roles = [] as any[];

  model = {
    id: null,
    id_persona: null,
    nombre_persona: '',
    usuario: '',
    correo_electronico: '',
    clave: '',
    activo: 1,
    acceso_institucional: 1,
    acceso_portal_padres: 0,
    acceso_chat_wa: 1,
    super_admin: 0
  } as any;

  constructor(
    private usuariosService: UsuariosService,
    private personasService: PersonasService,
    private rolesService: RolesService,
    private rolesXUsuarioService: RolesXUsuarioService,
    private route: ActivatedRoute,
    private router: Router,
    public permisosService: PermisosService
  ) { }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.accion = params['accion'];
      const id = params['id'];

      this.cargarRoles(() => {
        if (this.accion === 'crear') {
          this.titulo = "Crear Usuario";
          this.editable = true;
          this.cargarPersonas();
        } else if (this.accion === 'editar') {
          this.titulo = "Editar Usuario";
          this.editable = true;
          this.cargarUsuario(id);
        } else if (this.accion === 'consultar') {
          this.titulo = "Consultar Usuario";
          this.editable = false;
          this.cargarUsuario(id);
        }
      });
    });
  }

  cargarRoles(despues: () => void) {
    this.rolesService.obtenerTodos().subscribe({
      next: (response: any) => {
        const body = response.body as any[];
        this.roles = body.map(r => ({ ...r, seleccionado: false }));
        despues();
      },
      error: () => {
        Swal.fire('Error', 'No se pudieron cargar los roles', 'error');
      }
    });
  }

  cargarPersonas() {
    this.personasService.obtenerTodos().subscribe({
      next: (response: any) => {
        const body = response.body as any[];
        this.personas = body.map(p => ({
          id: p.id,
          nombre: [p.primer_nombre, p.segundo_nombre, p.primer_apellido, p.segundo_apellido].filter(x => x).join(' '),
          numero_identificacion: p.numero_identificacion
        }));
        this.personasFiltradas = this.personas;
      },
      error: () => {
        Swal.fire('Error', 'No se pudieron cargar las personas', 'error');
      }
    });
  }

  filtrarPersonas() {
    const t = this.filtroPersona.trim().toLowerCase();
    if (!t) {
      this.personasFiltradas = this.personas;
      return;
    }
    this.personasFiltradas = this.personas.filter(p =>
      p.nombre.toLowerCase().includes(t) || (p.numero_identificacion || '').toString().includes(t)
    );
  }

  cargarUsuario(id: any) {
    this.usuariosService.obtenerTodos().subscribe({
      next: (response: any) => {
        const body = response.body as any[];
        const usuario = body.find(u => u.id === id);
        if (!usuario) {
          Swal.fire('Error', 'No se encontró el usuario', 'error');
          this.volver();
          return;
        }
        this.model = {
          ...usuario,
          nombre_persona: [usuario.primer_nombre, usuario.segundo_nombre, usuario.primer_apellido, usuario.segundo_apellido]
            .filter((x: any) => x).join(' ')
        };
        this.titulo = (this.accion === 'editar' ? "Editar Usuario: " : "Consultar Usuario: ") + this.model.nombre_persona;
        this.cargarRolesDelUsuario(id);
      },
      error: () => {
        Swal.fire('Error', 'No se pudo cargar el usuario', 'error');
      }
    });
  }

  cargarRolesDelUsuario(idUsuario: string) {
    this.rolesXUsuarioService.obtenerRolesPorUsuario(idUsuario).subscribe({
      next: (response: any) => {
        const asignados = (response.body as any[]).map(r => r.id);
        this.roles = this.roles.map(r => ({ ...r, seleccionado: asignados.includes(r.id) }));
      }
    });
  }

  seleccionarPersona(persona: any) {
    this.model.id_persona = persona.id;
    this.model.nombre_persona = persona.nombre;
    this.model.usuario = persona.numero_identificacion;
  }

  guardar() {
    this.submitted = true;

    if (this.accion === 'crear' && !this.model.id_persona) {
      Swal.fire('Advertencia', 'Seleccione la persona para el usuario', 'warning');
      return;
    }
    if (!this.model.correo_electronico || this.model.correo_electronico.trim() === '') {
      Swal.fire('Advertencia', 'El correo electrónico es obligatorio', 'warning');
      return;
    }
    if (this.accion === 'crear' && (!this.model.clave || this.model.clave.trim().length < 4)) {
      Swal.fire('Advertencia', 'La clave es obligatoria (mínimo 4 caracteres)', 'warning');
      return;
    }

    const rolesSeleccionados = this.roles.filter(r => r.seleccionado).map(r => r.id);

    if (this.accion === 'crear') {
      const data = {
        id_persona: this.model.id_persona,
        correo_electronico: this.model.correo_electronico.trim(),
        clave: this.model.clave.trim(),
        activo: this.model.activo ? 1 : 0,
        acceso_institucional: this.model.acceso_institucional ? 1 : 0,
        acceso_chat_wa: this.model.acceso_chat_wa ? 1 : 0,
        acceso_portal_padres: this.model.acceso_portal_padres ? 1 : 0
      } as any;
      if (this.permisosService.esSuperAdmin()) {
        data.super_admin = this.model.super_admin ? 1 : 0;
      }
      this.usuariosService.crear(data).subscribe({
        next: (response: any) => {
          const idNuevo = response?.id || response?.body?.id;
          this.sincronizarRoles(idNuevo, rolesSeleccionados, 'El usuario ha sido creado.');
        },
        error: (error: any) => {
          const mensaje = error?.error?.error || 'No se pudo crear el usuario.';
          Swal.fire('Error', mensaje, 'error');
        }
      });
    } else if (this.accion === 'editar') {
      const data = {
        id: this.model.id,
        correo_electronico: this.model.correo_electronico.trim(),
        activo: this.model.activo ? 1 : 0,
        acceso_institucional: this.model.acceso_institucional ? 1 : 0,
        acceso_chat_wa: this.model.acceso_chat_wa ? 1 : 0,
        acceso_portal_padres: this.model.acceso_portal_padres ? 1 : 0
      } as any;
      if (this.permisosService.esSuperAdmin()) {
        data.super_admin = this.model.super_admin ? 1 : 0;
      }
      this.usuariosService.actualizar(data).subscribe({
        next: () => {
          this.sincronizarRoles(this.model.id, rolesSeleccionados, 'El usuario ha sido actualizado.');
        },
        error: (error: any) => {
          const mensaje = error?.error?.error || 'No se pudo actualizar el usuario.';
          Swal.fire('Error', mensaje, 'error');
        }
      });
    }
  }

  sincronizarRoles(idUsuario: string, roles: string[], mensajeExito: string) {
    if (!idUsuario) {
      Swal.fire('Atención', 'Se guardó el usuario pero no se pudieron asignar los roles.', 'warning');
      this.volver();
      return;
    }
    this.rolesXUsuarioService.sincronizarUsuario({ id_usuario: idUsuario, roles: roles }).subscribe({
      next: () => {
        Swal.fire('Listo', mensajeExito + ' Los cambios de roles aplican cuando el usuario vuelva a iniciar sesión.', 'success');
        this.volver();
      },
      error: () => {
        Swal.fire('Atención', 'Se guardó el usuario pero falló la asignación de roles.', 'warning');
        this.volver();
      }
    });
  }

  volver() {
    this.router.navigate([this.regresar]);
  }
}
