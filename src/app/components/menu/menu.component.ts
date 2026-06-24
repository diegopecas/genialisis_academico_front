import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import Swal from 'sweetalert2';
import { InstitucionConfigService } from '../../services/institucion-config.service';
import { PersonasService } from '../../services/personas.service';
import { PermisosService } from '../../services/permisos.service';
import { AyudaModalService } from '../../services/ayuda-modal.service';
import { AccesosRapidosService, AccesoRapido } from '../../services/accesos-rapidos.service';
import { MenuArbolService, MenuNodo } from '../../services/menu-arbol.service';
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

  // Árbol de menú ya filtrado por permisos (fuente para render y búsqueda)
  public arbolMenu: MenuNodo[] = [];
  // Árbol visible en pantalla (igual a arbolMenu, o el subconjunto que coincide con la búsqueda)
  public arbolVisible: MenuNodo[] = [];
  public terminoBusqueda: string = '';
  public enBusqueda: boolean = false;

  // Ids de grupos expandidos manualmente (cuando NO hay búsqueda activa)
  private expandidos: Set<string> = new Set<string>();

  constructor(
    private router: Router,
    private institucionConfigService: InstitucionConfigService,
    private personasService: PersonasService,
    public permisosService: PermisosService,
    private ayudaModalService: AyudaModalService,
    private accesosRapidosService: AccesosRapidosService,
    private menuArbolService: MenuArbolService,
    private sanitizer: DomSanitizer,
  ) {}

  ngOnInit(): void {
    this.logoBasicoUrl = this.institucionConfigService.getLogoBasicoUrl();
    this.nombreInstitucion =
      this.institucionConfigService.getNombreInstitucion();
    this.cargarFondoTenant();
    this.cargarNombreUsuario();
    this.verificarCumpleanos();
    this.cargarAccesosRapidos();
    this.cargarArbolMenu();
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

  // ============================================
  // ÁRBOL DE MENÚ + BÚSQUEDA
  // ============================================

  private cargarArbolMenu(): void {
    const arbolCompleto = this.menuArbolService.getArbol();
    this.arbolMenu = this.filtrarPorPermiso(arbolCompleto);
    this.arbolVisible = this.arbolMenu;
  }

  /**
   * Devuelve una copia del árbol conservando solo los nodos visibles según permisos.
   * Reglas: un nodo con `permiso` se conserva si el usuario lo tiene; los nodos sin
   * `permiso` se muestran siempre; un grupo se conserva solo si le queda al menos un hijo visible.
   */
  private filtrarPorPermiso(nodos: MenuNodo[]): MenuNodo[] {
    const resultado: MenuNodo[] = [];

    for (const nodo of nodos) {
      if (nodo.permiso && !this.permisosService.tienePermiso(nodo.permiso)) {
        continue;
      }

      if (nodo.hijos && nodo.hijos.length > 0) {
        const hijosVisibles = this.filtrarPorPermiso(nodo.hijos);
        if (hijosVisibles.length === 0) {
          continue;
        }
        resultado.push({ ...nodo, hijos: hijosVisibles });
      } else {
        resultado.push({ ...nodo });
      }
    }

    return resultado;
  }

  onBuscar(event: Event): void {
    const valor = (event.target as HTMLInputElement).value || '';
    this.terminoBusqueda = valor;
    const termino = valor.trim().toLowerCase();

    if (termino.length === 0) {
      this.enBusqueda = false;
      this.arbolVisible = this.arbolMenu;
      return;
    }

    this.enBusqueda = true;
    this.arbolVisible = this.filtrarPorTexto(this.arbolMenu, termino);
  }

  limpiarBusqueda(): void {
    this.terminoBusqueda = '';
    this.enBusqueda = false;
    this.arbolVisible = this.arbolMenu;
  }

  /**
   * Filtra el árbol dejando los nodos cuyo label coincide con el término y la cadena
   * de ancestros necesaria para llegar a ellos. Si un grupo coincide por sí mismo,
   * se conserva con todos sus hijos.
   */
  private filtrarPorTexto(nodos: MenuNodo[], termino: string): MenuNodo[] {
    const resultado: MenuNodo[] = [];

    for (const nodo of nodos) {
      const coincide = this.coincideTexto(nodo, termino);

      if (nodo.hijos && nodo.hijos.length > 0) {
        if (coincide) {
          resultado.push({ ...nodo });
          continue;
        }
        const hijosCoinciden = this.filtrarPorTexto(nodo.hijos, termino);
        if (hijosCoinciden.length > 0) {
          resultado.push({ ...nodo, hijos: hijosCoinciden });
        }
      } else if (coincide) {
        resultado.push({ ...nodo });
      }
    }

    return resultado;
  }

  /**
   * Quita tildes y pasa a minúsculas para comparar de forma insensible a acentos.
   */
  private normalizar(texto: string): string {
    return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }

  /**
   * Un nodo coincide si el término está en su label o en alguno de sus keywords.
   */
  private coincideTexto(nodo: MenuNodo, termino: string): boolean {
    const t = this.normalizar(termino);
    if (this.normalizar(nodo.label).includes(t)) {
      return true;
    }
    if (nodo.keywords) {
      return nodo.keywords.some((k) => this.normalizar(k).includes(t));
    }
    return false;
  }

  esGrupo(nodo: MenuNodo): boolean {
    return !!(nodo.hijos && nodo.hijos.length > 0);
  }

  estaExpandido(nodo: MenuNodo): boolean {
    // Durante la búsqueda todos los grupos del resultado se muestran expandidos
    if (this.enBusqueda) {
      return true;
    }
    return this.expandidos.has(nodo.id);
  }

  toggleNodo(nodo: MenuNodo): void {
    if (this.enBusqueda) {
      return;
    }
    if (this.expandidos.has(nodo.id)) {
      this.expandidos.delete(nodo.id);
    } else {
      this.expandidos.add(nodo.id);
    }
  }

  seleccionarNodo(nodo: MenuNodo): void {
    if (this.esGrupo(nodo)) {
      this.toggleNodo(nodo);
    } else if (nodo.ruta) {
      this.selectOption(nodo.ruta);
    }
  }

  trackByNodo(_index: number, nodo: MenuNodo): string {
    return nodo.id;
  }

  /**
   * Resalta el término buscado dentro del label (envuelve la coincidencia en <mark>).
   * Las etiquetas del menú son estáticas, por eso es seguro renderizar el HTML resultante.
   */
  resaltar(label: string): SafeHtml | string {
    const termino = this.terminoBusqueda.trim();
    if (!this.enBusqueda || termino.length === 0) {
      return label;
    }

    const indice = label.toLowerCase().indexOf(termino.toLowerCase());
    if (indice < 0) {
      return label;
    }

    const antes = label.substring(0, indice);
    const match = label.substring(indice, indice + termino.length);
    const despues = label.substring(indice + termino.length);
    return this.sanitizer.bypassSecurityTrustHtml(
      `${antes}<mark class="menu-highlight">${match}</mark>${despues}`
    );
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