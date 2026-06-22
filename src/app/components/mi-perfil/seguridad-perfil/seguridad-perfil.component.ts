import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UsuariosService } from '../../../services/usuarios.service';
import { WebAuthnService } from '../../../services/webauthn.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-seguridad-perfil',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './seguridad-perfil.component.html',
  styleUrl: './seguridad-perfil.component.scss',
})
export class SeguridadPerfilComponent implements OnInit {
  // Cambiar contraseña
  public claveActual: string = '';
  public claveNueva: string = '';
  public claveConfirmar: string = '';
  public mostrarClaveActual: boolean = false;
  public mostrarClaveNueva: boolean = false;
  public mostrarClaveConfirmar: boolean = false;
  public guardandoClave: boolean = false;

  // WebAuthn
  public webAuthnSoportado: boolean = false;
  public credenciales: any[] = [];
  public cargandoCredenciales: boolean = false;
  public registrandoHuella: boolean = false;

  private idUsuario: string = '';

  constructor(
    private usuariosService: UsuariosService,
    private webAuthnService: WebAuthnService
  ) {}

  ngOnInit(): void {
    this.webAuthnSoportado = this.webAuthnService.soportado();
    this.cargarDatosUsuario();
    if (this.webAuthnSoportado) {
      this.cargarCredenciales();
    }
  }

  private cargarDatosUsuario(): void {
    try {
      const usuarioStr = sessionStorage.getItem('usuario');
      if (usuarioStr) {
        const usuario = JSON.parse(usuarioStr);
        this.idUsuario = usuario.id || 0;
      }
    } catch (error) {
      console.error('Error al cargar datos del usuario:', error);
    }
  }

  // ================================================================
  // Cambiar contraseña
  // ================================================================
  cambiarContrasena(): void {
    if (!this.claveActual || !this.claveNueva || !this.claveConfirmar) {
      Swal.fire({
        icon: 'warning',
        title: 'Campos incompletos',
        text: 'Por favor completa todos los campos',
        confirmButtonColor: '#FFC107',
      });
      return;
    }

    if (this.claveNueva.length < 6) {
      Swal.fire({
        icon: 'warning',
        title: 'Contraseña muy corta',
        text: 'La nueva contraseña debe tener al menos 6 caracteres',
        confirmButtonColor: '#FFC107',
      });
      return;
    }

    if (this.claveNueva !== this.claveConfirmar) {
      Swal.fire({
        icon: 'warning',
        title: 'Las contraseñas no coinciden',
        text: 'La nueva contraseña y su confirmación deben ser iguales',
        confirmButtonColor: '#FFC107',
      });
      return;
    }

    this.guardandoClave = true;

    this.usuariosService.cambiarClave({
      id: this.idUsuario,
      claveActual: this.claveActual,
      claveNueva: this.claveNueva
    }).subscribe({
      next: (response: any) => {
        this.guardandoClave = false;
        if (response.success) {
          Swal.fire({
            icon: 'success',
            title: '¡Contraseña actualizada!',
            text: 'Tu contraseña ha sido cambiada correctamente',
            confirmButtonColor: '#FFC107',
            timer: 3000,
            timerProgressBar: true,
          });
          this.claveActual = '';
          this.claveNueva = '';
          this.claveConfirmar = '';
          this.mostrarClaveActual = false;
          this.mostrarClaveNueva = false;
          this.mostrarClaveConfirmar = false;
        } else {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: response.message || 'No se pudo cambiar la contraseña',
            confirmButtonColor: '#FFC107',
          });
        }
      },
      error: (error) => {
        this.guardandoClave = false;
        const mensaje = error?.error?.message || 'No se pudo cambiar la contraseña';
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: mensaje,
          confirmButtonColor: '#FFC107',
        });
      }
    });
  }

  // ================================================================
  // WebAuthn - Credenciales biométricas
  // ================================================================
  cargarCredenciales(): void {
    this.cargandoCredenciales = true;
    this.webAuthnService.listarCredenciales().subscribe({
      next: (response: any) => {
        this.credenciales = response || [];
        this.cargandoCredenciales = false;
      },
      error: () => {
        this.credenciales = [];
        this.cargandoCredenciales = false;
      }
    });
  }

  registrarHuella(): void {
    this.registrandoHuella = true;
    this.webAuthnService.registrar().subscribe({
      next: (response: any) => {
        this.registrandoHuella = false;
        if (response.success) {
          Swal.fire({
            icon: 'success',
            title: '¡Huella registrada!',
            text: 'Tu dispositivo ha sido vinculado correctamente',
            confirmButtonColor: '#FFC107',
            timer: 3000,
            timerProgressBar: true,
          });
          this.cargarCredenciales();
        }
      },
      error: (error) => {
        this.registrandoHuella = false;
        const mensaje = error?.message || 'No se pudo registrar la huella digital';
        Swal.fire({
          icon: 'error',
          title: 'No se pudo registrar',
          text: mensaje,
          confirmButtonColor: '#FFC107',
        });
      }
    });
  }

  eliminarCredencial(credencial: any): void {
    Swal.fire({
      title: '¿Eliminar dispositivo?',
      text: `Se eliminará "${credencial.dispositivo || 'Dispositivo'}" como método de acceso biométrico`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#f5f5f5',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (result.isConfirmed) {
        this.webAuthnService.eliminarCredencial(credencial.id).subscribe({
          next: () => {
            Swal.fire({
              icon: 'success',
              title: 'Dispositivo eliminado',
              timer: 2000,
              showConfirmButton: false,
            });
            this.cargarCredenciales();
          },
          error: () => {
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: 'No se pudo eliminar el dispositivo',
              confirmButtonColor: '#FFC107',
            });
          }
        });
      }
    });
  }

  formatearFecha(fecha: string): string {
    if (!fecha) return 'N/A';
    const d = new Date(fecha);
    return d.toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}