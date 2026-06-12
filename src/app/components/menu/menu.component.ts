import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import Swal from 'sweetalert2';
import { InstitucionConfigService } from '../../services/institucion-config.service';
import { PersonasService } from '../../services/personas.service';
import { PermisosService } from '../../services/permisos.service';
import { AyudaModalService } from '../../services/ayuda-modal.service';
import { AccesosRapidosService, AccesoRapido } from '../../services/accesos-rapidos.service';
import { DailyMessageComponent } from '../daily-message/daily-message.component';

interface CumpleaneroInfo {
  nombre: string;
  tipo: 'usuario' | 'estudiante' | 'colaborador';
  esMio: boolean;
  id_genero?: number;
  sobrenombre?: string;
  es_docente?: number;
  cargo_corto?: string;
}

@Component({
  selector: 'app-menu',
  templateUrl: './menu.component.html',
  styleUrl: './menu.component.scss',
  standalone: true,
  imports: [CommonModule, RouterModule, DailyMessageComponent],
})
export class MenuComponent implements OnInit {
  public logoBasicoUrl: string = '';
  public nombreInstitucion: string = '';
  public logoGenialisis: string = '/assets/images/logo_app.png';
  public fondoUrl: string = '';

  public nombreUsuario: string = '';

  public currentYear: number = new Date().getFullYear();

  public mostrarBannerCumple: boolean = false;
  public cumpleaneros: CumpleaneroInfo[] = [];
  public mensajeCumple: string = '';
  public confettiPieces: number[] = [];

  public accesosRapidos: AccesoRapido[] = [];

  constructor(
    private router: Router,
    private institucionConfigService: InstitucionConfigService,
    private personasService: PersonasService,
    public permisosService: PermisosService,
    private ayudaModalService: AyudaModalService,
    private accesosRapidosService: AccesosRapidosService,
  ) {}

  ngOnInit(): void {
    this.logoBasicoUrl = this.institucionConfigService.getLogoBasicoUrl();
    this.nombreInstitucion =
      this.institucionConfigService.getNombreInstitucion();
    this.cargarFondoTenant();
    this.cargarNombreUsuario();
    this.verificarCumpleanos();
    this.cargarAccesosRapidos();
  }

  private cargarFondoTenant(): void {
    const urlTenant = this.institucionConfigService.getFondoUrl();
    const urlFallback = this.institucionConfigService.getFondoFallbackUrl();

    const img = new Image();
    img.onload = () => {
      this.fondoUrl = urlTenant;
    };
    img.onerror = () => {
      console.warn(`⚠️ Fondo del tenant no encontrado, usando fallback: ${urlFallback}`);
      this.fondoUrl = urlFallback;
    };
    img.src = urlTenant;
  }

  abrirAyuda(): void {
    this.ayudaModalService.abrir();
  }

  irAMiPerfil(): void {
    this.router.navigate(['/mi-perfil']);
  }

  cargarAccesosRapidos(): void {
    if (this.accesosRapidosService.isCacheReady()) {
      this.accesosRapidos = this.accesosRapidosService.getAccesosTop(6);
    } else {
      setTimeout(() => this.cargarAccesosRapidos(), 300);
    }
  }

  irAccesoRapido(acceso: AccesoRapido): void {
    this.router.navigate(['/' + acceso.ruta]);
  }

  toggleFijoAcceso(event: Event, acceso: AccesoRapido): void {
    event.stopPropagation();
    const nuevoEstado = acceso.es_fijo === 1 ? 0 : 1;
    this.accesosRapidosService.toggleFijo(acceso.id, nuevoEstado).subscribe({
      next: () => {
        acceso.es_fijo = nuevoEstado;
        this.accesosRapidos = this.accesosRapidosService.getAccesosTop(6);
      },
      error: () => {
        console.error('Error al fijar/desfijar acceso');
      }
    });
  }

  private cargarNombreUsuario(): void {
    try {
      const usuarioStr = sessionStorage.getItem('usuario');
      if (usuarioStr) {
        const usuario = JSON.parse(usuarioStr);
        this.nombreUsuario = usuario.primer_nombre || '';
      }
    } catch (error) {
      console.error('Error al cargar nombre de usuario:', error);
      this.nombreUsuario = '';
    }
  }

  private verificarCumpleanos(): void {
    let usuario: any = null;
    try {
      const usuarioStr = sessionStorage.getItem('usuario');
      if (usuarioStr) {
        usuario = JSON.parse(usuarioStr);
      }
    } catch (error) {
      console.error('Error al parsear usuario:', error);
    }

    if (!usuario) return;

    const hoy = new Date();
    const diaHoy = hoy.getDate();
    const mesHoy = hoy.getMonth() + 1;
    const fechaHoyStr = `${hoy.getFullYear()}-${mesHoy}-${diaHoy}`;

    if (usuario.fecha_nacimiento) {
      const fechaUsuario = new Date(usuario.fecha_nacimiento + 'T00:00:00');
      if (
        fechaUsuario.getDate() === diaHoy &&
        fechaUsuario.getMonth() + 1 === mesHoy
      ) {
        this.cumpleaneros.push({
          nombre: usuario.primer_nombre,
          tipo: 'usuario',
          esMio: true,
        });
      }
    }

    try {
      const cacheStr = sessionStorage.getItem('cumpleanos_cache');
      if (cacheStr) {
        const cache = JSON.parse(cacheStr);
        if (cache.fecha === fechaHoyStr) {
          this.procesarCumpleanerosComunidad(cache.data);
          return;
        }
      }
    } catch (error) {
      console.error('Error al leer cache de cumpleaños:', error);
    }

    this.personasService.obtenerCumpleanosHoy().subscribe(
      (response: any) => {
        const cumpleanerosHoy = (response.body as any[]) || [];

        sessionStorage.setItem(
          'cumpleanos_cache',
          JSON.stringify({
            fecha: fechaHoyStr,
            data: cumpleanerosHoy,
          }),
        );

        this.procesarCumpleanerosComunidad(cumpleanerosHoy);
      },
      (error) => {
        console.error('Error al obtener cumpleañeros del día:', error);
        this.construirMensajeCumple();
      },
    );
  }

  private procesarCumpleanerosComunidad(cumpleanerosHoy: any[]): void {
    if (cumpleanerosHoy && cumpleanerosHoy.length > 0) {
      cumpleanerosHoy.forEach((c: any) => {
        const yaExiste = this.cumpleaneros.some(
          (existing) => existing.nombre === c.primer_nombre && existing.esMio,
        );
        if (!yaExiste) {
          this.cumpleaneros.push({
            nombre: c.primer_nombre,
            tipo: c.tipo,
            esMio: false,
            id_genero: c.id_genero ? parseInt(c.id_genero) : undefined,
            sobrenombre: c.sobrenombre || undefined,
            es_docente: c.es_docente ? parseInt(c.es_docente) : 0,
            cargo_corto: c.cargo_corto || undefined,
          });
        }
      });
    }
    this.construirMensajeCumple();
  }

  private construirMensajeCumple(): void {
    if (this.cumpleaneros.length === 0) return;

    this.mostrarBannerCumple = true;
    this.generarConfetti();

    const usuarioCumple = this.cumpleaneros.filter((c) => c.tipo === 'usuario');
    const estudiantesCumple = this.cumpleaneros.filter(
      (c) => c.tipo === 'estudiante',
    );
    const colaboradoresCumple = this.cumpleaneros.filter(
      (c) => c.tipo === 'colaborador',
    );

    const partes: string[] = [];

    if (usuarioCumple.length > 0) {
      partes.push(
        `¡Feliz cumpleaños, ${usuarioCumple[0].nombre}! 🎉 Esperamos que tengas un día maravilloso.`,
      );
    }

    if (estudiantesCumple.length === 1) {
      const prefijo =
        usuarioCumple.length > 0 ? 'Hoy también celebramos' : 'Hoy celebramos';
      partes.push(
        `${prefijo} el cumpleaños de ${estudiantesCumple[0].nombre}. 🎂`,
      );
    } else if (estudiantesCumple.length > 1) {
      const prefijo =
        usuarioCumple.length > 0 ? 'Hoy también celebramos' : 'Hoy celebramos';
      const nombres = this.formatearNombres(
        estudiantesCumple.map((e) => e.nombre),
      );
      partes.push(`${prefijo} el cumpleaños de ${nombres}. 🎂`);
    }

    if (colaboradoresCumple.length > 0) {
      const mensajesColab = colaboradoresCumple.map((c) =>
        this.construirMensajeColaborador(c),
      );
      const prefijo = partes.length > 0 ? 'Y f' : '¡F';
      if (colaboradoresCumple.length === 1) {
        partes.push(`${prefijo}eliz cumpleaños a ${mensajesColab[0]}! 🌟`);
      } else {
        partes.push(
          `${prefijo}eliz cumpleaños a ${this.formatearNombres(mensajesColab)}! 🌟`,
        );
      }
    }

    this.mensajeCumple = partes.join(' ');
  }

  private construirMensajeColaborador(c: CumpleaneroInfo): string {
    const esFemenino = c.id_genero === 1;
    const articulo = esFemenino ? 'nuestra' : 'nuestro';
    const nombreMostrar = c.sobrenombre || c.nombre;

    if (c.es_docente === 1 && c.cargo_corto) {
      return `${articulo} ${c.cargo_corto} ${nombreMostrar}`;
    }

    const titulo = esFemenino ? 'colaboradora' : 'colaborador';
    return `${articulo} ${titulo} ${nombreMostrar}`;
  }

  private formatearNombres(nombres: string[]): string {
    if (nombres.length === 1) return nombres[0];
    if (nombres.length === 2) return `${nombres[0]} y ${nombres[1]}`;
    const copia = [...nombres];
    const ultimoNombre = copia.pop();
    return `${copia.join(', ')} y ${ultimoNombre}`;
  }

  private generarConfetti(): void {
    this.confettiPieces = Array.from({ length: 50 }, (_, i) => i);
  }

  cerrarBannerCumple(): void {
    this.mostrarBannerCumple = false;
  }

  selectOption(path: string): void {
    this.router.navigate([path]);
  }

  salir(): void {
    Swal.fire({
      title: '¿Desea salir del sistema?',
      text: 'Tu sesión será cerrada',
      icon: 'question',
      iconColor: '#FFC107',
      showCancelButton: true,
      confirmButtonText: 'Salir',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#FFC107',
      cancelButtonColor: '#E0E0E0',
      reverseButtons: true,
      customClass: {
        popup: 'swal-custom-popup',
        confirmButton: 'swal-custom-confirm',
        cancelButton: 'swal-custom-cancel',
      },
      showClass: {
        popup: 'animate__animated animate__fadeIn animate__faster',
      },
      hideClass: {
        popup: 'animate__animated animate__fadeOut animate__faster',
      },
    }).then((result) => {
      if (result.isConfirmed) {
        this.accesosRapidosService.sincronizar();
        sessionStorage.removeItem('usuario');
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('institucion_actual');
        sessionStorage.removeItem('cumpleanos_cache');
        this.router.navigate(['/login']);
      }
    });
  }
}