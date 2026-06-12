import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../../../common/header/header.component';
import { PermisosRolService } from '../../../../services/permisos-rol.service';
import { PermisosService } from '../../../../services/permisos.service';
import Swal from 'sweetalert2';

interface NodoArbol {
  id: number;
  nombre: string;
  icono: string | null;
  permisoPrincipal: PermisoNodo | null;
  permisosAcciones: PermisoNodo[];
  hijos: NodoArbol[];
  expandido: boolean;
  visible: boolean;
}

interface PermisoNodo {
  id: number;
  codigo: string;
  nombre: string;
  seleccionado: boolean;
}

const SUFIJOS_ACCIONES = [
  '.crear', '.editar', '.eliminar', '.ver', '.movimientos', '.guardar',
  '.gestionar', '.registrar', '.evaluar', '.historial', '.programar',
  '.anular', '.contabilizar', '.imagenes'
];

@Component({
  selector: 'app-permisos-rol',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent],
  templateUrl: './permisos-rol.component.html',
  styleUrl: './permisos-rol.component.scss'
})
export class PermisosRolComponent implements OnInit {

  titulo = 'Asignación de Permisos...';
  roles: any[] = [];
  portales: string[] = [];
  portalSeleccionado: string = 'institucional';
  rolSeleccionado: number | null = null;
  rolNombre: string = '';
  arbol: NodoArbol[] = [];
  cargando = false;
  guardando = false;
  cargandoPermisos = false;
  totalPermisos = 0;
  totalSeleccionados = 0;
  puedeGuardar = false;
  terminoBusqueda: string = '';

  constructor(
    private permisosRolService: PermisosRolService,
    public permisosService: PermisosService
  ) { }

  ngOnInit(): void {
    this.puedeGuardar = this.permisosService.tienePermiso('admin.seguridad.permisos.guardar');
    this.cargarRoles();
    this.cargarPortales();
  }

  cargarRoles(): void {
    this.permisosRolService.obtenerRoles().subscribe({
      next: (response: any) => {
        this.roles = response.body as any[];
      },
      error: (error: any) => {
        console.error('Error cargando roles:', error);
        Swal.fire('Error', 'No se pudieron cargar los roles', 'error');
      }
    });
  }

  cargarPortales(): void {
    this.permisosRolService.obtenerPortales().subscribe({
      next: (response: any) => {
        this.portales = response.body as string[];
        if (this.portales.length > 0 && !this.portales.includes(this.portalSeleccionado)) {
          this.portalSeleccionado = this.portales[0];
        }
      },
      error: (error: any) => {
        console.error('Error cargando portales:', error);
        this.portales = ['institucional'];
      }
    });
  }

  cambiarPortal(): void {
    if (this.rolSeleccionado) {
      this.seleccionarRol();
    } else {
      this.arbol = [];
    }
  }

  seleccionarRol(): void {
    if (!this.rolSeleccionado) {
      this.arbol = [];
      this.rolNombre = '';
      return;
    }

    const rol = this.roles.find(r => r.id == this.rolSeleccionado);
    this.rolNombre = rol ? rol.nombre : '';
    this.cargando = true;
    this.terminoBusqueda = '';

    this.permisosRolService.obtenerArbol(this.portalSeleccionado).subscribe({
      next: (responseArbol: any) => {
        const arbolRaw = responseArbol.body as any[];
        this.arbol = this.procesarArbol(arbolRaw);

        this.cargandoPermisos = true;
        this.permisosRolService.obtenerPermisosPorRol(this.rolSeleccionado!).subscribe({
          next: (responsePermisos: any) => {
            const codigosAsignados = responsePermisos.body as string[];
            this.marcarPermisosAsignados(codigosAsignados);
            this.actualizarContadores();
            this.cargando = false;
            this.cargandoPermisos = false;
          },
          error: (error: any) => {
            console.error('Error cargando permisos del rol:', error);
            this.cargando = false;
            this.cargandoPermisos = false;
          }
        });
      },
      error: (error: any) => {
        console.error('Error cargando árbol:', error);
        this.cargando = false;
        Swal.fire('Error', 'No se pudo cargar el árbol de permisos', 'error');
      }
    });
  }

  esPermisoAccion(codigo: string): boolean {
    return SUFIJOS_ACCIONES.some(sufijo => codigo.endsWith(sufijo));
  }

  procesarArbol(nodos: any[]): NodoArbol[] {
    return nodos.map(n => {
      const todosPermisos = (n.permisos || []) as any[];
      let permisoPrincipal: PermisoNodo | null = null;
      const permisosAcciones: PermisoNodo[] = [];

      if (todosPermisos.length === 1) {
        permisoPrincipal = {
          id: todosPermisos[0].id,
          codigo: todosPermisos[0].codigo,
          nombre: todosPermisos[0].nombre,
          seleccionado: false
        };
      } else {
        todosPermisos.forEach((p: any) => {
          const permisoNodo: PermisoNodo = {
            id: p.id,
            codigo: p.codigo,
            nombre: p.nombre,
            seleccionado: false
          };

          if (!this.esPermisoAccion(p.codigo) && !permisoPrincipal) {
            permisoPrincipal = permisoNodo;
          } else {
            permisosAcciones.push(permisoNodo);
          }
        });
      }

      return {
        id: n.id,
        nombre: n.nombre,
        icono: n.icono,
        permisoPrincipal: permisoPrincipal,
        permisosAcciones: permisosAcciones,
        hijos: this.procesarArbol(n.hijos || []),
        expandido: false,
        visible: true
      };
    });
  }

  marcarPermisosAsignados(codigosAsignados: string[]): void {
    const marcar = (nodos: NodoArbol[]) => {
      nodos.forEach(nodo => {
        if (nodo.permisoPrincipal) {
          nodo.permisoPrincipal.seleccionado = codigosAsignados.includes(nodo.permisoPrincipal.codigo);
        }
        nodo.permisosAcciones.forEach(p => {
          p.seleccionado = codigosAsignados.includes(p.codigo);
        });
        marcar(nodo.hijos);
      });
    };
    marcar(this.arbol);
  }

  // =====================================================
  // BUSCADOR
  // =====================================================

  filtrarArbol(): void {
    const termino = this.terminoBusqueda.toLowerCase().trim();
    if (!termino) {
      this.setVisibilidadTodos(this.arbol, true);
      return;
    }
    this.filtrarNodos(this.arbol, termino);
  }

  private filtrarNodos(nodos: NodoArbol[], termino: string): boolean {
    let algunoVisible = false;

    nodos.forEach(nodo => {
      const coincideNombre = nodo.nombre.toLowerCase().includes(termino);
      const coincidePrincipal = nodo.permisoPrincipal?.codigo.toLowerCase().includes(termino) ||
        nodo.permisoPrincipal?.nombre.toLowerCase().includes(termino);
      const coincideAccion = nodo.permisosAcciones.some(p =>
        p.codigo.toLowerCase().includes(termino) || p.nombre.toLowerCase().includes(termino)
      );
      const hijosVisibles = this.filtrarNodos(nodo.hijos, termino);

      nodo.visible = coincideNombre || !!coincidePrincipal || coincideAccion || hijosVisibles;

      if (nodo.visible) {
        nodo.expandido = true;
        algunoVisible = true;
      }
    });

    return algunoVisible;
  }

  private setVisibilidadTodos(nodos: NodoArbol[], visible: boolean): void {
    nodos.forEach(n => {
      n.visible = visible;
      this.setVisibilidadTodos(n.hijos, visible);
    });
  }

  limpiarBusqueda(): void {
    this.terminoBusqueda = '';
    this.setVisibilidadTodos(this.arbol, true);
  }

  // =====================================================
  // MANEJO DE CHECKBOXES
  // =====================================================

  toggleNodoCompleto(nodo: NodoArbol): void {
    const nuevoEstado = !this.nodoEstaSeleccionado(nodo);
    this.setEstadoRecursivo(nodo, nuevoEstado);
    this.actualizarContadores();
  }

  togglePermisoAccion(permiso: PermisoNodo): void {
    permiso.seleccionado = !permiso.seleccionado;
    this.actualizarContadores();
  }

  toggleExpandir(nodo: NodoArbol): void {
    nodo.expandido = !nodo.expandido;
  }

  nodoEstaSeleccionado(nodo: NodoArbol): boolean {
    const total = this.contarPermisosEnNodo(nodo);
    const seleccionados = this.contarPermisosSeleccionadosEnNodo(nodo);
    return total > 0 && total === seleccionados;
  }

  nodoEstaIndeterminado(nodo: NodoArbol): boolean {
    const total = this.contarPermisosEnNodo(nodo);
    const seleccionados = this.contarPermisosSeleccionadosEnNodo(nodo);
    return seleccionados > 0 && seleccionados < total;
  }

  setEstadoRecursivo(nodo: NodoArbol, estado: boolean): void {
    if (nodo.permisoPrincipal) {
      nodo.permisoPrincipal.seleccionado = estado;
    }
    nodo.permisosAcciones.forEach(p => p.seleccionado = estado);
    nodo.hijos.forEach(hijo => this.setEstadoRecursivo(hijo, estado));
  }

  tieneContenido(nodo: NodoArbol): boolean {
    return nodo.permisoPrincipal !== null || nodo.permisosAcciones.length > 0 || nodo.hijos.length > 0;
  }

  tieneContenidoExpandible(nodo: NodoArbol): boolean {
    return nodo.permisosAcciones.length > 0 || nodo.hijos.length > 0;
  }

  contarPermisosEnNodo(nodo: NodoArbol): number {
    let total = nodo.permisoPrincipal ? 1 : 0;
    total += nodo.permisosAcciones.length;
    nodo.hijos.forEach(hijo => total += this.contarPermisosEnNodo(hijo));
    return total;
  }

  contarPermisosSeleccionadosEnNodo(nodo: NodoArbol): number {
    let total = (nodo.permisoPrincipal && nodo.permisoPrincipal.seleccionado) ? 1 : 0;
    total += nodo.permisosAcciones.filter(p => p.seleccionado).length;
    nodo.hijos.forEach(hijo => total += this.contarPermisosSeleccionadosEnNodo(hijo));
    return total;
  }

  // =====================================================
  // ACCIONES MASIVAS
  // =====================================================

  seleccionarTodos(): void {
    this.arbol.forEach(nodo => this.setEstadoRecursivo(nodo, true));
    this.actualizarContadores();
  }

  deseleccionarTodos(): void {
    this.arbol.forEach(nodo => this.setEstadoRecursivo(nodo, false));
    this.actualizarContadores();
  }

  expandirTodos(): void {
    const expandir = (nodos: NodoArbol[]) => {
      nodos.forEach(n => { n.expandido = true; expandir(n.hijos); });
    };
    expandir(this.arbol);
  }

  contraerTodos(): void {
    const contraer = (nodos: NodoArbol[]) => {
      nodos.forEach(n => { n.expandido = false; contraer(n.hijos); });
    };
    contraer(this.arbol);
  }

  // =====================================================
  // CONTADORES Y GUARDADO
  // =====================================================

  actualizarContadores(): void {
    this.totalPermisos = 0;
    this.totalSeleccionados = 0;
    const contar = (nodos: NodoArbol[]) => {
      nodos.forEach(nodo => {
        if (nodo.permisoPrincipal) {
          this.totalPermisos++;
          if (nodo.permisoPrincipal.seleccionado) this.totalSeleccionados++;
        }
        this.totalPermisos += nodo.permisosAcciones.length;
        this.totalSeleccionados += nodo.permisosAcciones.filter(p => p.seleccionado).length;
        contar(nodo.hijos);
      });
    };
    contar(this.arbol);
  }

  obtenerCodigosSeleccionados(): string[] {
    const codigos: string[] = [];
    const recolectar = (nodos: NodoArbol[]) => {
      nodos.forEach(nodo => {
        if (nodo.permisoPrincipal && nodo.permisoPrincipal.seleccionado) {
          codigos.push(nodo.permisoPrincipal.codigo);
        }
        nodo.permisosAcciones.forEach(p => {
          if (p.seleccionado) codigos.push(p.codigo);
        });
        recolectar(nodo.hijos);
      });
    };
    recolectar(this.arbol);
    return codigos;
  }

  async guardar(): Promise<void> {
    if (!this.rolSeleccionado) return;

    const codigosSeleccionados = this.obtenerCodigosSeleccionados();

    const result = await Swal.fire({
      title: '¿Guardar permisos?',
      html: `Se asignarán <b>${codigosSeleccionados.length}</b> permisos al rol <b>${this.rolNombre}</b> en el portal <b>${this.portalSeleccionado}</b>.<br>Los permisos anteriores serán reemplazados.`,
      icon: 'question',
      iconColor: '#FFC107',
      showCancelButton: true,
      confirmButtonText: 'Guardar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#FFC107',
      cancelButtonColor: '#E0E0E0',
      reverseButtons: true
    });

    if (!result.isConfirmed) return;

    this.guardando = true;

    this.permisosRolService.guardarPermisos(this.rolSeleccionado, codigosSeleccionados).subscribe({
      next: (response: any) => {
        this.guardando = false;
        Swal.fire({
          title: 'Permisos guardados',
          text: `Se asignaron ${codigosSeleccionados.length} permisos al rol ${this.rolNombre}`,
          icon: 'success',
          confirmButtonText: 'Aceptar',
          confirmButtonColor: '#FFC107'
        });
      },
      error: (error: any) => {
        this.guardando = false;
        console.error('Error guardando permisos:', error);
        Swal.fire('Error', 'No se pudieron guardar los permisos', 'error');
      }
    });
  }
}