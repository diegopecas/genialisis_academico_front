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
import { ConfiguracionGlobalService } from '../../../../../services/configuracion-global.service';
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

  // Roles disponibles con marca de selección, separados por portal
  roles = [] as any[];
  rolesInstitucional = [] as any[];
  rolesPadres = [] as any[];

  // Rol que el tenant asigna por defecto a los acudientes
  idRolDefaultAcudiente: string | null = null;

  model = {
    id: null,
    id_persona: null,
    nombre_persona: '',
    usuario: '',
    correo_electronico: '',
    clave: '',
    activo: 1,
    acceso_institucional: 0,
    acceso_portal_padres: 0,
    acceso_chat_wa: 0,
    super_admin: 0
  } as any;

  constructor(
    private usuariosService: UsuariosService,
    private personasService: PersonasService,
    private rolesService: RolesService,
    private rolesXUsuarioService: RolesXUsuarioService,
    private route: ActivatedRoute,
    private router: Router,
    public permisosService: PermisosService,
    private configuracionGlobalService: ConfiguracionGlobalService
  ) { }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.accion = params['accion'];
      const id = params['id'];

      this.cargarRolDefaultAcudiente();
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
        this.separarRolesPorPortal();
        despues();
      },
      error: () => {
        Swal.fire('Error', 'No se pudieron cargar los roles', 'error');
      }
    });
  }

  /**
   * Parte los roles en las dos secciones de la pantalla. Los de portal 'ambos'
   * aparecen en las dos apuntando al mismo objeto, para que la marca de
   * selección quede sincronizada entre secciones.
   */
  separarRolesPorPortal() {
    this.rolesInstitucional = this.roles.filter(r => r.portal !== 'padres');
    this.rolesPadres = this.roles.filter(r => r.portal === 'padres' || r.portal === 'ambos');
  }

  /**
   * Lee el rol por defecto de acudiente parametrizado en el tenant.
   */
  cargarRolDefaultAcudiente() {
    this.configuracionGlobalService.obtenerByClave('rol_default_acudiente').subscribe({
      next: (response: any) => {
        const body = response.body as any;
        const valor = Array.isArray(body) ? (body[0]?.valor_texto ?? null) : (body?.valor_texto ?? null);
        this.idRolDefaultAcudiente = valor;
        this.preseleccionarRolAcudiente();
      },
      error: () => {
        this.idRolDefaultAcudiente = null;
      }
    });
  }

  /**
   * Marca el rol por defecto de acudiente. Solo al crear y solo si el usuario
   * va a tener acceso al Portal de Padres.
   */
  preseleccionarRolAcudiente() {
    if (this.accion !== 'crear' || !this.idRolDefaultAcudiente || !this.model.acceso_portal_padres) {
      return;
    }
    const rol = this.roles.find(r => r.id === this.idRolDefaultAcudiente);
    if (rol) {
      rol.seleccionado = true;
    }
  }

  onCambioAccesoPadres() {
    if (this.model.acceso_portal_padres) {
      this.preseleccionarRolAcudiente();
    } else {
      this.rolesPadres.forEach(r => { if (r.portal === 'padres') { r.seleccionado = false; } });
    }
  }

  onCambioAccesoInstitucional() {
    if (!this.model.acceso_institucional) {
      this.rolesInstitucional.forEach(r => { if (r.portal === 'institucional') { r.seleccionado = false; } });
    }
  }

  cargarPersonas() {
    this.personasService.obtenerTodos().subscribe({
      next: (response: any) => {
        const body = response.body as any[];
        this.personas = body.map(p => ({
          id: p.id,
          // Las empresas no tienen nombres ni apellidos, se identifican por razón social
          nombre: [p.primer_nombre, p.segundo_nombre, p.primer_apellido, p.segundo_apellido].filter(x => x).join(' ') || (p.razon_social || ''),
          es_empresa: !p.primer_nombre && !!p.razon_social,
          numero_identificacion: p.numero_identificacion,
          correo_electronico: p.correo_electronico,
          es_colaborador: p.es_colaborador,
          es_estudiante: p.es_estudiante,
          es_acudiente: p.es_acudiente,
          tiene_usuario: p.tiene_usuario
        }));
        this.personasFiltradas = this.personas;
      },
      error: () => {
        Swal.fire('Error', 'No se pudieron cargar las personas', 'error');
      }
    });
  }

  // Filtro por tipo de vínculo en el modal (todo se resuelve en el front)
  filtroTipo: 'todos' | 'colaborador' | 'estudiante' | 'acudiente' = 'todos';

  cambiarFiltroTipo(tipo: 'todos' | 'colaborador' | 'estudiante' | 'acudiente') {
    this.filtroTipo = tipo;
    this.filtrarPersonas();
  }

  // Indica si el correo ya venía en la persona (entonces no se edita aquí)
  correoDePersona = false;

  // Modal de búsqueda de persona
  modalPersonaAbierto = false;

  abrirModalPersona() {
    this.filtroPersona = '';
    this.personasFiltradas = this.personas;
    this.modalPersonaAbierto = true;
  }

  cerrarModalPersona() {
    this.modalPersonaAbierto = false;
  }

  filtrarPersonas() {
    const t = this.filtroPersona.trim().toLowerCase();

    this.personasFiltradas = this.personas.filter(p => {
      const coincideTexto = !t
        || (p.nombre || '').toLowerCase().includes(t)
        || (p.numero_identificacion || '').toString().includes(t);

      if (!coincideTexto) {
        return false;
      }

      switch (this.filtroTipo) {
        case 'colaborador': return p.es_colaborador == 1;
        case 'estudiante': return p.es_estudiante == 1;
        case 'acudiente': return p.es_acudiente == 1;
        default: return true;
      }
    });
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
          // Las empresas no tienen nombres, se identifican por razón social
          nombre_persona: [usuario.primer_nombre, usuario.segundo_nombre, usuario.primer_apellido, usuario.segundo_apellido]
            .filter((x: any) => x).join(' ') || (usuario.razon_social || '')
        };
        this.titulo = (this.accion === 'editar' ? "Editar Usuario: " : "Consultar Usuario: ") + this.model.nombre_persona;
        this.correoDePersona = !!usuario.correo_electronico;
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
        // Se marca sobre los mismos objetos: rolesInstitucional y rolesPadres
        // apuntan a estos, si se reemplazan se pierde la marca en pantalla
        this.roles.forEach(r => r.seleccionado = asignados.includes(r.id));
        this.separarRolesPorPortal();
      }
    });
  }

  seleccionarPersona(persona: any) {
    // Una persona solo puede tener un usuario; si ya lo tiene, se edita el existente
    if (persona.tiene_usuario == 1) {
      Swal.fire({
        icon: 'info',
        title: 'Esta persona ya tiene usuario',
        text: 'Búsquela en el listado de usuarios y edítela desde ahí.',
        confirmButtonText: 'Entendido'
      });
      return;
    }

    this.modalPersonaAbierto = false;
    this.model.id_persona = persona.id;
    this.model.nombre_persona = persona.nombre;
    this.model.usuario = persona.numero_identificacion;
    this.model.es_colaborador = persona.es_colaborador;
    this.model.es_estudiante = persona.es_estudiante;
    this.model.es_acudiente = persona.es_acudiente;

    // El correo es el de la persona; si no tiene, se pide aquí y se guarda en la persona
    this.model.correo_electronico = persona.correo_electronico || '';
    this.correoDePersona = !!persona.correo_electronico;

    // Si la persona es acudiente se propone el acceso al Portal de Padres con su rol
    if (persona.es_acudiente) {
      this.model.acceso_portal_padres = 1;
      this.preseleccionarRolAcudiente();
    }
  }

  guardar() {
    this.submitted = true;

    if (this.accion === 'crear' && !this.model.id_persona) {
      Swal.fire('Advertencia', 'Seleccione la persona para el usuario', 'warning');
      return;
    }
    // El usuario puede llegar numérico desde la base, se normaliza a texto
    const usuarioTexto = String(this.model.usuario ?? '').trim();
    if (usuarioTexto === '') {
      Swal.fire('Advertencia', 'El usuario es obligatorio', 'warning');
      return;
    }
    if (String(this.model.correo_electronico ?? '').trim() === '') {
      Swal.fire('Advertencia', 'El correo electrónico es obligatorio', 'warning');
      return;
    }
    if (this.accion === 'crear' && String(this.model.clave ?? '').trim().length < 4) {
      Swal.fire('Advertencia', 'La clave es obligatoria (mínimo 4 caracteres)', 'warning');
      return;
    }

    const rolesSeleccionados = this.roles.filter(r => r.seleccionado).map(r => r.id);

    if (this.accion === 'crear') {
      const data = {
        id_persona: this.model.id_persona,
        usuario: usuarioTexto,
        correo_electronico: String(this.model.correo_electronico ?? '').trim(),
        clave: String(this.model.clave ?? '').trim(),
        activo: this.model.activo ? 1 : 0,
        acceso_institucional: this.model.acceso_institucional ? 1 : 0,
        acceso_chat_wa: this.model.acceso_chat_wa ? 1 : 0,
        acceso_portal_padres: this.model.acceso_portal_padres ? 1 : 0
      } as any;
      if (this.permisosService.esSuperAdmin()) {
        data.super_admin = this.model.super_admin ? 1 : 0;
      }
      if (!this.correoDePersona && this.model.id_persona) {
        this.personasService.actualizarCorreo(this.model.id_persona, String(this.model.correo_electronico ?? '').trim()).subscribe({
          error: () => console.warn('No se pudo actualizar el correo de la persona')
        });
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
        usuario: usuarioTexto,
        correo_electronico: String(this.model.correo_electronico ?? '').trim(),
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

  /**
   * Cambia la contraseña del usuario que se está editando.
   * El back espera el campo claveNueva.
   */
  cambiarClave() {
    Swal.fire({
      title: 'Cambiar contraseña',
      html: `
        <div class="text-start">
          <label class="form-label">Nueva contraseña</label>
          <div class="input-group">
            <input id="swal-clave" type="password" class="form-control form-control-lg"
                   placeholder="Mínimo 4 caracteres" autocomplete="new-password">
            <button type="button" class="btn btn-outline-secondary" id="swal-ver-clave">
              <i class="fas fa-eye" id="swal-icono-ojo"></i>
            </button>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Cambiar',
      cancelButtonText: 'Cancelar',
      didOpen: () => {
        const campo = document.getElementById('swal-clave') as HTMLInputElement;
        const boton = document.getElementById('swal-ver-clave');
        const icono = document.getElementById('swal-icono-ojo');
        if (boton && campo && icono) {
          boton.addEventListener('click', () => {
            const oculta = campo.type === 'password';
            campo.type = oculta ? 'text' : 'password';
            icono.className = oculta ? 'fas fa-eye-slash' : 'fas fa-eye';
          });
        }
        campo?.focus();
      },
      preConfirm: () => {
        const campo = document.getElementById('swal-clave') as HTMLInputElement;
        const valor = (campo?.value || '').trim();
        if (valor.length < 4) {
          Swal.showValidationMessage('La contraseña debe tener al menos 4 caracteres');
          return false;
        }
        return valor;
      }
    }).then((resultado) => {
      if (!resultado.isConfirmed || !resultado.value) {
        return;
      }
      this.usuariosService.restablecerClave({ id: this.model.id, claveNueva: resultado.value }).subscribe({
        next: () => Swal.fire('Listo', 'La contraseña fue cambiada.', 'success'),
        error: (error: any) => {
          // Se muestra el mensaje que devuelve el back para no perder el detalle
          const mensaje = error?.error?.error || error?.error || error?.message || 'No se pudo cambiar la contraseña.';
          console.error('Error al restablecer la clave:', error);
          Swal.fire('Error', typeof mensaje === 'string' ? mensaje : JSON.stringify(mensaje), 'error');
        }
      });
    });
  }

  volver() {
    this.router.navigate([this.regresar]);
  }
}
