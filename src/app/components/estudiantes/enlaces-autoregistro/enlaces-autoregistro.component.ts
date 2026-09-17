import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { HeaderComponent } from '../../../common/header/header.component';
import { TablasComponent } from '../../../common/tablas/tablas.component';
import { EnlacesAutoregistroAcudientesService } from '../../../services/enlaces-autoregistro-acudientes.service';
import { InstitucionConfigService } from '../../../services/institucion-config.service';

/**
 * Listado de enlaces de autoregistro de acudientes.
 * Desde aquí se copian o comparten los enlaces y se entra al seguimiento.
 */
@Component({
  selector: 'app-enlaces-autoregistro',
  templateUrl: './enlaces-autoregistro.component.html',
  styleUrl: './enlaces-autoregistro.component.scss',
  standalone: true,
  imports: [CommonModule, HeaderComponent, TablasComponent]
})
export class EnlacesAutoregistroComponent implements OnInit {

  titulo = 'Autoregistro de Acudientes';
  raiz = '/estudiantes/enlaces-autoregistro';
  public columnasFiltro = ['Estado', 'Grupos'];
  public titulos = [] as any[];
  public datos = [] as any[];
  public acciones = [
    { id: 'copiar', label: 'Copiar enlace', icono: '/assets/images/copiar-enlace.png' },
    { id: 'whatsapp', label: 'Compartir por WhatsApp', icono: '/assets/images/whatsapp.png' },
    { id: 'seguimiento', label: 'Ver seguimiento', icono: '/assets/images/historia.png' }
  ];

  constructor(
    private enlacesService: EnlacesAutoregistroAcudientesService,
    private institucionConfigService: InstitucionConfigService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.crearTitulos();
    this.obtenerDatos();
  }

  obtenerDatos() {
    this.enlacesService.obtenerTodos().subscribe({
      next: (response: any) => {
        const body = (response.body as any[]) || [];
        this.datos = body.map((d: any) => ({
          ...d,
          grupos: d.grupos || 'Sin estudiantes',
          clase_estado: this.claseEstado(d.estado)
        }));
      },
      error: (error: any) => {
        Swal.fire('Error', error?.error?.error || 'No se pudieron consultar los enlaces', 'error');
      }
    });
  }

  crearTitulos() {
    this.titulos = [
      { clave: 'nombre', alias: 'Nombre', alinear: 'izquierda' },
      { clave: 'grupos', alias: 'Grupos', alinear: 'izquierda' },
      { clave: 'total_estudiantes', alias: 'Estudiantes', alinear: 'centrado' },
      { clave: 'fecha_vencimiento', alias: 'Vence', alinear: 'centrado', tipo: 'datetime' },
      { clave: 'estado', alias: 'Estado', alinear: 'centrado', tipo: 'badge', claseCSS: 'clase_estado' },
      { clave: 'total_intentos', alias: 'Abiertos', alinear: 'centrado' },
      { clave: 'total_completados', alias: 'Registrados', alinear: 'centrado' },
    ];
  }

  private claseEstado(estado: string): string {
    switch (estado) {
      case 'Vigente': return 'badge-success';
      case 'Vencido': return 'badge-warning';
      default: return 'badge-danger';
    }
  }

  clicAccion($event: any) {
    const registro = $event.registro;
    switch ($event.accion) {
      case 'editar':
        this.router.navigate([this.raiz + '/editar/' + registro.id]);
        break;
      case 'eliminar':
        this.eliminar(registro);
        break;
      case 'copiar':
        this.copiarEnlace(registro);
        break;
      case 'whatsapp':
        this.compartirWhatsapp(registro);
        break;
      case 'seguimiento':
        this.router.navigate([this.raiz + '/seguimiento/' + registro.id]);
        break;
    }
  }

  /**
   * Si el enlace no se puede usar, avisa antes de copiarlo o compartirlo.
   * Devuelve false cuando no hay URL (falta el parámetro url_portal_padres).
   */
  private async validarParaCompartir(registro: any): Promise<boolean> {
    if (!registro.url_enlace) {
      await Swal.fire('Falta configuración',
        'No se puede armar el enlace porque el parámetro url_portal_padres está vacío en Configuración Global.', 'warning');
      return false;
    }
    if (registro.estado !== 'Vigente') {
      const r = await Swal.fire({
        title: `Este enlace está ${registro.estado.toLowerCase()}`,
        text: 'Quien lo abra no podrá registrarse. ¿Quieres continuar de todas formas?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Continuar',
        cancelButtonText: 'Cancelar'
      });
      return r.isConfirmed;
    }
    if (Number(registro.total_estudiantes) === 0) {
      await Swal.fire('Sin estudiantes', 'Este enlace no tiene estudiantes. Edítalo y marca los que quieres mostrar.', 'warning');
      return false;
    }
    return true;
  }

  async copiarEnlace(registro: any) {
    if (!(await this.validarParaCompartir(registro))) {
      return;
    }

    const copiado = await this.copiarAlPortapapeles(registro.url_enlace);
    if (copiado) {
      Swal.fire({ icon: 'success', title: 'Enlace copiado', timer: 1500, showConfirmButton: false });
    } else {
      // Sin permiso de portapapeles: se muestra para copiar a mano.
      Swal.fire({
        title: 'Copia el enlace',
        input: 'text',
        inputValue: registro.url_enlace,
        confirmButtonText: 'Cerrar'
      });
    }
  }

  private async copiarAlPortapapeles(texto: string): Promise<boolean> {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(texto);
        return true;
      }
    } catch {
      // se intenta con el método alterno
    }

    try {
      const area = document.createElement('textarea');
      area.value = texto;
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(area);
      return ok;
    } catch {
      return false;
    }
  }

  async compartirWhatsapp(registro: any) {
    if (!(await this.validarParaCompartir(registro))) {
      return;
    }

    const jardin = this.institucionConfigService.getNombreInstitucion();
    const vence = this.formatearFechaHora(registro.fecha_vencimiento);
    const mensaje = `Hola 👋 Este es el enlace para crear tu usuario en el Portal de Padres de ${jardin}:\n\n`
      + `${registro.url_enlace}\n\n`
      + `Está disponible hasta ${vence}.`;

    window.open(`https://wa.me/?text=${encodeURIComponent(mensaje)}`, '_blank');
  }

  private formatearFechaHora(valor: string): string {
    if (!valor) return '';
    const fecha = new Date(valor.replace(' ', 'T'));
    if (isNaN(fecha.getTime())) return valor;
    return fecha.toLocaleString('es-CO', { day: '2-digit', month: 'long', hour: 'numeric', minute: '2-digit' });
  }

  async eliminar(registro: any) {
    const result = await Swal.fire({
      title: '¿Está seguro?',
      text: `¿Desea eliminar el enlace "${registro.nombre}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (!result.isConfirmed) {
      return;
    }

    this.enlacesService.eliminar(registro.id).subscribe({
      next: () => {
        Swal.fire('Eliminado', 'El enlace ha sido eliminado.', 'success');
        this.obtenerDatos();
      },
      error: (error: any) => {
        // El backend no deja borrar un enlace que ya tiene intentos.
        Swal.fire('Error', error?.error?.error || 'No se pudo eliminar el enlace.', 'error');
      }
    });
  }
}