import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import Swal from 'sweetalert2';
import { HeaderComponent } from '../../../common/header/header.component';
import { EntregaAlimentacionService } from '../../../services/entrega-alimentacion.service';
import { HorariosAlimentacionService } from '../../../services/horarios-alimentacion.service';
import { UtilService } from '../../../common/constantes/util.service';

export interface RegistroEntrega {
  id_cuenta: string;
  id_persona: string;
  nombre_estudiante: string;
  id_grupo: string;
  nombre_grupo: string;
  orden_grupo: number;
  id_producto: string;
  nombre_producto: string;
  detalle_producto: string;
  id_horario: string;
  nombre_horario: string;
  valor: number;
  estado_entrega: number;
  id_entrega: string | null;
  fecha_hora_entrega: string | null;
  id_menu_programado: string | null;
  id_menu_servido: string | null;
  id_movimiento_productos: string | null;
  presente: number;
  hora_ingreso: string | null;
  seleccionado: boolean;
  id_menu_seleccionado: string | null;
}

export interface GrupoProducto {
  id_producto: string;
  nombre_producto: string;
  detalle_producto: string;
  registros: RegistroEntrega[];
  abierto: boolean;
  menus: MenuOpcion[];
  id_menu_global: string | null;
}

export interface MenuOpcion {
  id_menu: string;
  nombre_menu: string;
  id_clasificacion_menu: string;
  nombre_clasificacion: string;
  esProgramado: boolean;
  ingredientes: any[];
  productos_servicios?: string[];
}

@Component({
  selector: 'app-entrega-alimentacion',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, HeaderComponent],
  templateUrl: './entrega-alimentacion.component.html',
  styleUrl: './entrega-alimentacion.component.scss'
})
export class EntregaAlimentacionComponent implements OnInit {

  titulo = 'Entrega de Alimentación';

  public fechaSeleccionada: string = this.obtenerFechaHoy();
  public horarioSeleccionado: string = '';
  public horarios: any[] = [];
  public grupos: GrupoProducto[] = [];
  public cargando: boolean = false;
  public procesando: boolean = false;

  public menusDia: MenuOpcion[] = [];
  public sinMinuta: boolean = false;

  public get totalPendientes(): number {
    return this.grupos.reduce((acc, g) => acc + g.registros.filter(r => r.estado_entrega === 0).length, 0);
  }
  public get totalEntregados(): number {
    return this.grupos.reduce((acc, g) => acc + g.registros.filter(r => r.estado_entrega === 1).length, 0);
  }
  public get totalAnulados(): number {
    return this.grupos.reduce((acc, g) => acc + g.registros.filter(r => r.estado_entrega === 2).length, 0);
  }
  public get totalSeleccionados(): number {
    return this.grupos.reduce((acc, g) => acc + g.registros.filter(r => r.seleccionado).length, 0);
  }
  public get haySeleccionados(): boolean { return this.totalSeleccionados > 0; }
  public get idsSeleccionados(): string[] {
    return this.grupos.flatMap(g => g.registros).filter(r => r.seleccionado).map(r => r.id_cuenta);
  }

  constructor(
    private entregaService: EntregaAlimentacionService,
    private horariosService: HorariosAlimentacionService,
    private utilService: UtilService
  ) {}

  ngOnInit(): void {
    this.cargarHorarios();
    this.cargarMenusDelDia();
  }

  obtenerFechaHoy(): string {
    const hoy = new Date();
    return `${hoy.getFullYear()}-${(hoy.getMonth() + 1).toString().padStart(2, '0')}-${hoy.getDate().toString().padStart(2, '0')}`;
  }

  cargarHorarios(): void {
    this.horariosService.obtenerTodos().subscribe({
      next: (r: any) => { this.horarios = r.body || []; }
    });
  }

  cargarMenusDelDia(): void {
    this.entregaService.obtenerMenusDelDia(this.fechaSeleccionada).subscribe({
      next: (response: any) => {
        const data = response.body || response;
        this.sinMinuta = data.sin_minuta || false;
        this.menusDia = (data.menus || []).map((m: any) => ({
          ...m,
          esProgramado: m.es_programado === true,
          productos_servicios: (m.productos_servicios || []).map(String)
        }));
        if (this.grupos.length) this.asociarMenusAGrupos();
      }
    });
  }

  cambioFecha(): void {
    this.grupos = [];
    this.menusDia = [];
    this.cargarMenusDelDia();
    if (this.horarioSeleccionado) this.cargarEntregas();
  }

  cambioHorario(): void {
    this.grupos = [];
    if (this.horarioSeleccionado) this.cargarEntregas();
  }

  cargarEntregas(): void {
    this.cargando = true;
    this.entregaService.obtenerPorFecha(this.fechaSeleccionada, this.horarioSeleccionado).subscribe({
      next: (response: any) => {
        const rows: RegistroEntrega[] = (response || []).map((r: any) => ({
          ...r,
          seleccionado: false,
          id_menu_seleccionado: r.id_menu_servido || null
        }));
        this.grupos = this.agruparPorProducto(rows);
        this.asociarMenusAGrupos();
        this.cargando = false;
      },
      error: () => { this.cargando = false; }
    });
  }

  private agruparPorProducto(rows: RegistroEntrega[]): GrupoProducto[] {
    const mapa = new Map<string, GrupoProducto>();
    for (const r of rows) {
      if (!mapa.has(r.id_producto)) {
        mapa.set(r.id_producto, {
          id_producto: r.id_producto,
          nombre_producto: r.nombre_producto,
          detalle_producto: r.detalle_producto,
          registros: [],
          abierto: true,
          menus: [],
          id_menu_global: null
        });
      }
      mapa.get(r.id_producto)!.registros.push(r);
    }
    return Array.from(mapa.values());
  }

  private asociarMenusAGrupos(): void {
    for (const grupo of this.grupos) {
      grupo.menus = this.menusDia.filter(m =>
        m.productos_servicios?.includes(String(grupo.id_producto))
      );
      const programado = grupo.menus.find(m => m.esProgramado);
      grupo.id_menu_global = programado?.id_menu || grupo.menus[0]?.id_menu || null;
      grupo.registros.forEach(r => {
        if (!r.id_menu_seleccionado) r.id_menu_seleccionado = grupo.id_menu_global;
      });
    }
  }

  // ─── Menú por grupo / cuenta ──────────────────────────────────────────────

  cambioMenuGrupo(grupo: GrupoProducto): void {
    grupo.registros.filter(r => r.estado_entrega !== 2).forEach(r => {
      r.id_menu_seleccionado = grupo.id_menu_global;
    });
  }

  cambioMenuCuenta(r: RegistroEntrega, grupo: GrupoProducto): void {
    const todos = grupo.registros.filter(x => x.estado_entrega !== 2);
    if (todos.every(x => x.id_menu_seleccionado === r.id_menu_seleccionado)) {
      grupo.id_menu_global = r.id_menu_seleccionado;
    }
  }

  // ─── Selección ────────────────────────────────────────────────────────────

  toggleRegistro(r: RegistroEntrega): void {
    if (r.estado_entrega === 2 || r.id_movimiento_productos) return;
    r.seleccionado = !r.seleccionado;
  }

  toggleProducto(grupo: GrupoProducto): void {
    const sel = grupo.registros.filter(r => r.estado_entrega !== 2);
    const todos = sel.every(r => r.seleccionado);
    sel.forEach(r => r.seleccionado = !todos);
  }

  seleccionarTodos(): void {
    const todos = this.grupos.flatMap(g => g.registros).filter(r => r.estado_entrega !== 2);
    const todosSeleccionados = todos.every(r => r.seleccionado);
    todos.forEach(r => r.seleccionado = !todosSeleccionados);
  }

  todosProductoSeleccionados(grupo: GrupoProducto): boolean {
    const sel = grupo.registros.filter(r => r.estado_entrega !== 2);
    return sel.length > 0 && sel.every(r => r.seleccionado);
  }

  todosSeleccionados(): boolean {
    const todos = this.grupos.flatMap(g => g.registros).filter(r => r.estado_entrega !== 2);
    return todos.length > 0 && todos.every(r => r.seleccionado);
  }

  // ─── Acciones ─────────────────────────────────────────────────────────────

  async entregar(): Promise<void> {
    const ids = this.idsSeleccionados;
    if (!ids.length) return;
    const cuentasMenus = this.grupos.flatMap(g =>
      g.registros.filter(r => r.seleccionado).map(r => ({
        id_cuenta: r.id_cuenta,
        id_menu_programado: this.menusDia.find(m =>
          m.productos_servicios?.includes(String(r.id_producto)) && m.esProgramado
        )?.id_menu || null,
        id_menu_servido: r.id_menu_seleccionado || g.id_menu_global || null
      }))
    );
    this.procesando = true;
    this.entregaService.registrarBatch(ids, this.horarioSeleccionado, this.utilService.obtenerIdUsuarioActual(), cuentasMenus).subscribe({
      next: () => { this.procesando = false; this.cargarEntregas(); },
      error: () => { this.procesando = false; }
    });
  }

  async anular(): Promise<void> {
    const ids = this.idsSeleccionados;
    if (!ids.length) return;
    const confirmar = await Swal.fire({
      title: '¿Anular entregas?',
      html: `Se anularán <b>${ids.length}</b> entrega(s) y sus cuentas por cobrar.`,
      icon: 'warning', showCancelButton: true,
      confirmButtonText: 'Sí, anular', cancelButtonText: 'Cancelar',
      confirmButtonColor: '#e74c3c'
    });
    if (!confirmar.isConfirmed) return;
    this.procesando = true;
    this.entregaService.anularBatch(ids, this.horarioSeleccionado, this.utilService.obtenerIdUsuarioActual()).subscribe({
      next: () => { this.procesando = false; this.cargarEntregas(); },
      error: () => { this.procesando = false; }
    });
  }

  entregarUno(r: RegistroEntrega): void {
    if (r.estado_entrega !== 0) return;
    const grupo = this.grupos.find(g => g.registros.includes(r));
    const cuentasMenus = [{
      id_cuenta: r.id_cuenta,
      id_menu_programado: this.menusDia.find(m =>
        m.productos_servicios?.includes(String(r.id_producto)) && m.esProgramado
      )?.id_menu || null,
      id_menu_servido: r.id_menu_seleccionado || grupo?.id_menu_global || null
    }];
    this.procesando = true;
    this.entregaService.registrarBatch([r.id_cuenta], this.horarioSeleccionado, this.utilService.obtenerIdUsuarioActual(), cuentasMenus).subscribe({
      next: () => { this.procesando = false; this.cargarEntregas(); },
      error: () => { this.procesando = false; }
    });
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  pendientesPorProducto(grupo: GrupoProducto): number {
    return grupo.registros.filter(r => r.estado_entrega === 0).length;
  }

  entregadosPorProducto(grupo: GrupoProducto): number {
    return grupo.registros.filter(r => r.estado_entrega === 1).length;
  }

  trackByProducto(index: number, g: GrupoProducto): string { return g.id_producto; }
  trackByCuenta(index: number, r: RegistroEntrega): string { return r.id_cuenta; }
}