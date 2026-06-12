import { Component, OnInit } from '@angular/core';
import { UsuariosService } from '../../services/usuarios.service';
import { AuthMasterService } from '../../services/auth-master.service';
import { WebAuthnService } from '../../services/webauthn.service';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InstitucionConfigService } from '../../services/institucion-config.service';

interface Tenant {
  id: number;
  codigo: string;
  nombre: string;
  logo_url?: string;
}

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule],
})
export class LoginComponent implements OnInit {
  public usuario: string = '';
  public password: string = '';
  public showPassword: boolean = false;
  public isLoading: boolean = false;

  public mostrarSelectorTenant: boolean = false;
  public tenantsDisponibles: Tenant[] = [];
  public tenantSeleccionado: Tenant | null = null;

  public logoGenialisis: string = '/assets/images/logo_app.png';
  public currentYear: number = new Date().getFullYear();

  public logoBasicoUrl: string = '';
  public nombreInstitucion: string = 'Genialisis';

  public fondoUrl: string = '';

  // WebAuthn
  public webAuthnSoportado: boolean = false;
  public pendienteBiometrico: boolean = false;

  constructor(
    private usuariosService: UsuariosService,
    private authMasterService: AuthMasterService,
    private webAuthnService: WebAuthnService,
    private router: Router,
    private institucionConfigService: InstitucionConfigService
  ) {}

  ngOnInit(): void {
    sessionStorage.removeItem('usuario');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('institucion_actual');

    this.webAuthnSoportado = this.webAuthnService.soportado();
    this.cargarFondoUltimoTenant();
  }

  private cargarFondoUltimoTenant(): void {
    const ultimoCodigo = this.institucionConfigService.getUltimoTenantCodigo();
    const urlFallback = this.institucionConfigService.getFondoFallbackUrl();

    if (!ultimoCodigo) {
      this.fondoUrl = urlFallback;
      return;
    }

    const urlTenant = this.institucionConfigService.getFondoUrlPorCodigo(ultimoCodigo);

    const img = new Image();
    img.onload = () => {
      this.fondoUrl = urlTenant;
    };
    img.onerror = () => {
      console.warn(`⚠️ Fondo del tenant "${ultimoCodigo}" no encontrado, usando fallback`);
      this.fondoUrl = urlFallback;
    };
    img.src = urlTenant;
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  ingresar(): void {
    if (!this.usuario || !this.password) {
      Swal.fire({
        title: 'Campos incompletos',
        text: 'Por favor ingresa tu usuario y contraseña',
        icon: 'warning',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#FFC107',
      });
      return;
    }

    this.isLoading = true;
    this.pendienteBiometrico = false;

    this.authMasterService.preLogin(this.usuario).subscribe({
      next: (response) => {
        if (response.cantidad === 0) {
          this.isLoading = false;
          Swal.fire({
            title: 'Usuario no encontrado',
            text: 'No existe una cuenta asociada a este usuario',
            icon: 'error',
            confirmButtonText: 'Reintentar',
            confirmButtonColor: '#FFC107',
          });
          return;
        }

        if (response.cantidad === 1) {
          this.seleccionarTenantYContinuar(response.tenants[0]);
        } else {
          this.isLoading = false;
          this.tenantsDisponibles = response.tenants;
          this.mostrarSelectorTenant = true;
        }
      },
      error: (error) => {
        console.error('PRE-LOGIN ERROR >>>', error);
        this.isLoading = false;
        Swal.fire({
          title: 'Error de conexión',
          text: 'No se pudo conectar con el servidor',
          icon: 'error',
          confirmButtonText: 'Entendido',
          confirmButtonColor: '#FFC107',
        });
      }
    });
  }

  seleccionarTenant(tenant: Tenant): void {
    this.tenantSeleccionado = tenant;
  }

  confirmarSeleccionTenantBiometrico(): void {
    if (this.tenantSeleccionado) {
      this.mostrarSelectorTenant = false;
      this.isLoading = true;

      if (this.pendienteBiometrico) {
        this.pendienteBiometrico = false;
        this.autenticarConBiometricoConTenant(this.tenantSeleccionado);
      } else {
        this.seleccionarTenantYContinuar(this.tenantSeleccionado);
      }
    }
  }

  cerrarSelectorTenant(): void {
    this.mostrarSelectorTenant = false;
    this.tenantsDisponibles = [];
    this.tenantSeleccionado = null;
    this.pendienteBiometrico = false;
  }

  private seleccionarTenantYContinuar(tenant: Tenant): void {
    this.institucionConfigService.setTenantManual(tenant.codigo, tenant.nombre);
    this.nombreInstitucion = tenant.nombre;
    this.logoBasicoUrl = `/assets/images/instituciones/${tenant.codigo}/logo_basico.png`;

    const credenciales = {
      usuario: this.usuario,
      clave: this.password,
    };

    this.usuariosService.autenticacion(credenciales).subscribe({
      next: (response: any) => {
        this.isLoading = false;
        const data = response[0];

        if (data?.error && data?.code === 'USER_INACTIVE') {
          Swal.fire({
            title: 'Usuario inactivo',
            text: 'Tu cuenta no está activa en esta institución. Contacta al administrador.',
            icon: 'warning',
            confirmButtonText: 'Entendido',
            confirmButtonColor: '#FFC107',
          });
          return;
        }

        if (data) {
          if (data.acceso_institucional === 1) {
            if (data.token) {
              sessionStorage.setItem('token', data.token);
            }
            data.portal = 'institucional';
            sessionStorage.setItem('usuario', JSON.stringify(data));
            
            this.ofrecerRegistroBiometrico(() => {
              this.institucionConfigService.cargarConfiguracionTenant().then(() => {
                this.router.navigate(['/menu']);
              }).catch(() => {
                this.router.navigate(['/menu']);
              });
            });
          } else {
            Swal.fire({
              title: 'Acceso Denegado',
              text: 'No tienes permisos para acceder al sistema institucional',
              icon: 'warning',
              confirmButtonText: 'Entendido',
              confirmButtonColor: '#FFC107',
            });
            this.limpiarCampos();
          }
        } else {
          Swal.fire({
            title: 'Contraseña incorrecta',
            text: 'La contraseña ingresada no es válida',
            icon: 'error',
            confirmButtonText: 'Reintentar',
            confirmButtonColor: '#FFC107',
          });
        }
      },
      error: (error) => {
        console.error('AUTH ERROR >>>', error);
        this.isLoading = false;
        Swal.fire({
          title: 'Error de conexión',
          text: 'No se pudo conectar con el servidor',
          icon: 'error',
          confirmButtonText: 'Entendido',
          confirmButtonColor: '#FFC107',
        });
      }
    });
  }

  // ================================================================
  // WebAuthn - Login directo SIN usuario (discoverable credentials)
  // ================================================================
  loginConBiometrico(): void {
    this.isLoading = true;

    this.webAuthnService.loginDirecto().subscribe({
      next: (response: any) => {
        this.isLoading = false;

        if (response.error) {
          Swal.fire({
            title: 'Error de autenticación',
            text: response.message || 'No se pudo verificar la identidad',
            icon: 'error',
            confirmButtonText: 'Reintentar',
            confirmButtonColor: '#FFC107',
          });
          return;
        }

        const tenant = response.tenant;
        const userData = response.usuario;
        const data = userData[0];

        if (!data || !tenant) {
          Swal.fire({
            title: 'Error',
            text: 'No se pudo obtener los datos de autenticación',
            icon: 'error',
            confirmButtonText: 'Entendido',
            confirmButtonColor: '#FFC107',
          });
          return;
        }

        // Configurar tenant
        this.institucionConfigService.setTenantManual(tenant.codigo, tenant.nombre);
        this.nombreInstitucion = tenant.nombre;

        if (data.acceso_institucional === 1) {
          if (data.token) {
            sessionStorage.setItem('token', data.token);
          }
          data.portal = 'institucional';
          sessionStorage.setItem('usuario', JSON.stringify(data));
          
          this.institucionConfigService.cargarConfiguracionTenant().then(() => {
            this.router.navigate(['/menu']);
          }).catch(() => {
            this.router.navigate(['/menu']);
          });
        } else {
          Swal.fire({
            title: 'Acceso Denegado',
            text: 'No tienes permisos para acceder al sistema institucional',
            icon: 'warning',
            confirmButtonText: 'Entendido',
            confirmButtonColor: '#FFC107',
          });
        }
      },
      error: (error) => {
        this.isLoading = false;
        // Si el usuario canceló el diálogo biométrico, no mostrar error
        if (error?.name === 'NotAllowedError' || error?.message?.includes('NotAllowedError')) {
          return;
        }
        const mensaje = error?.message || error?.error?.message || 'No se pudo autenticar con biométrico';
        Swal.fire({
          title: 'Error biométrico',
          text: mensaje,
          icon: 'error',
          confirmButtonText: 'Usar contraseña',
          confirmButtonColor: '#FFC107',
        });
      }
    });
  }

  // ================================================================
  // WebAuthn - Autenticación CON tenant (flujo legacy por si se necesita)
  // ================================================================
  private autenticarConBiometricoConTenant(tenant: Tenant): void {
    this.institucionConfigService.setTenantManual(tenant.codigo, tenant.nombre);
    this.nombreInstitucion = tenant.nombre;
    this.logoBasicoUrl = `/assets/images/instituciones/${tenant.codigo}/logo_basico.png`;

    this.webAuthnService.verificarDisponibilidad(this.usuario).subscribe({
      next: (response) => {
        if (!response.disponible) {
          this.isLoading = false;
          this.pendienteBiometrico = false;
          Swal.fire({
            title: 'Biométrico no registrado',
            text: 'Primero debes iniciar sesión con tu contraseña. Después se te ofrecerá activar el biométrico.',
            icon: 'info',
            confirmButtonText: 'Entendido',
            confirmButtonColor: '#FFC107',
          });
          return;
        }

        this.webAuthnService.autenticar(this.usuario).subscribe({
          next: (authResponse: any) => {
            this.isLoading = false;
            this.pendienteBiometrico = false;
            const data = authResponse[0];

            if (data?.error) {
              Swal.fire({
                title: 'Error de autenticación',
                text: data.message || 'No se pudo verificar la identidad',
                icon: 'error',
                confirmButtonText: 'Reintentar',
                confirmButtonColor: '#FFC107',
              });
              return;
            }

            if (data && data.acceso_institucional === 1) {
              if (data.token) {
                sessionStorage.setItem('token', data.token);
              }
              data.portal = 'institucional';
              sessionStorage.setItem('usuario', JSON.stringify(data));
              
              this.institucionConfigService.cargarConfiguracionTenant().then(() => {
                this.router.navigate(['/menu']);
              }).catch(() => {
                this.router.navigate(['/menu']);
              });
            } else {
              Swal.fire({
                title: 'Acceso Denegado',
                text: 'No tienes permisos para acceder al sistema institucional',
                icon: 'warning',
                confirmButtonText: 'Entendido',
                confirmButtonColor: '#FFC107',
              });
            }
          },
          error: (error) => {
            this.isLoading = false;
            this.pendienteBiometrico = false;
            const mensaje = error?.message || error?.error?.message || 'No se pudo autenticar con biométrico';
            Swal.fire({
              title: 'Error biométrico',
              text: mensaje,
              icon: 'error',
              confirmButtonText: 'Usar contraseña',
              confirmButtonColor: '#FFC107',
            });
          }
        });
      },
      error: () => {
        console.error('BIOMETRICO ERROR >>>', 'handler sin parametro');
        this.isLoading = false;
        this.pendienteBiometrico = false;
        Swal.fire({
          title: 'Error de conexión',
          text: 'No se pudo verificar la disponibilidad biométrica',
          icon: 'error',
          confirmButtonText: 'Entendido',
          confirmButtonColor: '#FFC107',
        });
      }
    });
  }

  // ================================================================
  // WebAuthn - Ofrecer registro después de login exitoso con contraseña
  // ================================================================
  private ofrecerRegistroBiometrico(callback: () => void): void {
    if (!this.webAuthnSoportado) {
      callback();
      return;
    }

    const noPreguntar = localStorage.getItem('webauthn_no_preguntar_' + this.usuario);
    if (noPreguntar === 'true') {
      callback();
      return;
    }

    this.webAuthnService.verificarDisponibilidad(this.usuario).subscribe({
      next: (response) => {
        if (response.disponible) {
          callback();
          return;
        }

        Swal.fire({
          title: '¿Activar biométrico?',
          html: `
            <div style="text-align: center; padding: 10px;">
              <div style="font-size: 48px; margin-bottom: 16px;">🔐</div>
              <p style="font-size: 15px; color: #2D2D2D; line-height: 1.6;">
                La próxima vez podrás ingresar solo con tu huella o rostro, sin necesidad de escribir usuario ni contraseña.
              </p>
              <label style="display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 16px; cursor: pointer; font-size: 13px; color: #757575;">
                <input type="checkbox" id="swal-no-preguntar" style="width: 16px; height: 16px; cursor: pointer;" />
                No volver a preguntar
              </label>
            </div>
          `,
          icon: undefined,
          showCancelButton: true,
          confirmButtonText: 'Activar',
          cancelButtonText: 'Ahora no',
          confirmButtonColor: '#FFC107',
          cancelButtonColor: '#f5f5f5',
        }).then((result) => {
          const checkbox = document.getElementById('swal-no-preguntar') as HTMLInputElement;
          if (checkbox && checkbox.checked) {
            localStorage.setItem('webauthn_no_preguntar_' + this.usuario, 'true');
          }

          if (result.isConfirmed) {
            this.registrarBiometrico(callback);
          } else {
            callback();
          }
        });
      },
      error: () => {
        callback();
      }
    });
  }

  private registrarBiometrico(callback: () => void): void {
    this.webAuthnService.registrar().subscribe({
      next: (response) => {
        if (response.success) {
          Swal.fire({
            title: '¡Listo!',
            text: 'Biométrico activado. La próxima vez podrás ingresar sin escribir nada.',
            icon: 'success',
            confirmButtonText: 'Continuar',
            confirmButtonColor: '#FFC107',
            timer: 3000,
            timerProgressBar: true,
          }).then(() => {
            callback();
          });
        } else {
          callback();
        }
      },
      error: () => {
        Swal.fire({
          title: 'No se pudo activar',
          text: 'Puedes intentarlo después desde tu perfil.',
          icon: 'info',
          confirmButtonText: 'Continuar',
          confirmButtonColor: '#FFC107',
          timer: 3000,
          timerProgressBar: true,
        }).then(() => {
          callback();
        });
      }
    });
  }

  mostrarAyudaContrasena(): void {
    Swal.fire({
      title: '¿Olvidaste tu contraseña?',
      html: `
        <div style="text-align: center; padding: 20px 10px;">
          <p style="font-size: 16px; color: #2D2D2D; margin-bottom: 20px; line-height: 1.6;">
            Para recuperar tu contraseña, por favor contacta al administrador de tu institución.
          </p>
          <div style="background: #FAF8F3; padding: 16px; border-radius: 12px; border-left: 4px solid #FFC107;">
            <p style="font-size: 14px; color: #757575; margin: 0;">
              💡 El administrador podrá restablecer tu contraseña de forma segura
            </p>
          </div>
        </div>
      `,
      icon: 'info',
      iconColor: '#FFC107',
      confirmButtonText: 'Entendido',
      confirmButtonColor: '#FFC107',
    });
  }

  private limpiarCampos(): void {
    this.password = '';
    this.usuario = '';
    this.showPassword = false;
    this.tenantSeleccionado = null;
    this.tenantsDisponibles = [];
    this.pendienteBiometrico = false;
  }
}