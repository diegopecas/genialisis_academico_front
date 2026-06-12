import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { HeaderComponent } from '../../../common/header/header.component';
import { EntregaAlimentacionService } from '../../../services/entrega-alimentacion.service';
import { HorariosAlimentacionService } from '../../../services/horarios-alimentacion.service';
import { ConceptosMovimientoService } from '../../../services/conceptos-movimiento.service';
import { ProductosAlimentacionService } from '../../../services/productos-alimentacion.service';
import { ClasificacionProductosAlimentacionService } from '../../../services/clasificacion-productos-alimentacion.service';
import { UtilService } from '../../../common/constantes/util.service';

export interface RegistroEntregado {
  id_cuenta: string;
  id_entrega: string;
  id_persona: string;
  nombre_estudiante: string;
  nombre_grupo: string;
  id_producto: string;
  nombre_producto: string;
  valor: number;
  fecha_hora_entrega: string;
  id_movimiento_productos: string | null;
  tiene_inventario: boolean;
  seleccionado: boolean;
  id_menu_seleccionado: string | null;
}

export interface GrupoEntregado {
  id_producto: string;
  nombre_producto: string;
  total: number;
  con_inventario: number;
  sin_inventario: number;
  registros: RegistroEntregado[];
  abierto: boolean;
  id_menu_global: string | null;
  menus: any[];
}

export interface MenuOpcion {
  id_menu: string;
  nombre_menu: string;
  esProgramado: boolean;
  ingredientes: any[];
  productos_servicios: string[];
}

export interface ItemInventario {
  id_producto: string;
  nombre_producto: string;
  nombre_unidad: string;
  abreviatura_unidad: string;
  stock_actual: number;
  cantidad_teorica: number;
  cantidad_real: number;
  id_menu_programado: string | null;
  id_menu_servido: string | null;
}

export interface IngredienteExtra {
  id_producto: string;
  nombre_producto: string;
  abreviatura_unidad: string;
  stock_actual: number;
  cantidad_real: number;
  origen: string;
}

@Component({
  selector: 'app-inventario-alimentacion',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent],
  templateUrl: './inventario-alimentacion.component.html',
  styleUrl: './inventario-alimentacion.component.scss'
})
export class InventarioAlimentacionComponent implements OnInit {

  titulo = 'Inventario Alimentación';

  public fechaSeleccionada: string = this.obtenerFechaHoy();
  public horarioSeleccionado: string = '';
  public horarios: any[] = [];
  public tabActivo: 'pendientes' | 'registrados' = 'pendientes';

  // Tab pendientes
  public grupos: GrupoEntregado[] = [];
  public cargando: boolean = false;

  // Menús del día
  public menusDia: MenuOpcion[] = [];

  // Inventario
  public inventario: ItemInventario[] = [];
  public ingredientesExtra: IngredienteExtra[] = [];
  public conceptos: any[] = [];
  public conceptoSeleccionado: number | null = null;
  public observaciones: string = '';
  public registrando: boolean = false;

  // Tab movimientos registrados
  public movimientos: any[] = [];
  public cargandoMovimientos: boolean = false;

  // Catálogos extras
  public clasificacionesAlimentacion: any[] = [];
  private todosProductosAlimentacion: any[] = [];

  public get totalSeleccionados(): number {
    return this.grupos.reduce((acc, g) => acc + g.registros.filter(r => r.seleccionado).length, 0);
  }
  public get haySeleccionados(): boolean { return this.totalSeleccionados > 0; }
  public get idsSeleccionados(): string[] {
    return this.grupos.flatMap(g => g.registros).filter(r => r.seleccionado).map(r => r.id_cuenta);
  }
  public get hayStockInsuficiente(): boolean {
    return [...this.inventario, ...this.ingredientesExtra].some(i => i.cantidad_real > i.stock_actual);
  }

  constructor(
    private entregaService: EntregaAlimentacionService,
    private horariosService: HorariosAlimentacionService,
    private conceptosService: ConceptosMovimientoService,
    private productosAlimentacionService: ProductosAlimentacionService,
    private clasificacionAlimentacionService: ClasificacionProductosAlimentacionService,
    private utilService: UtilService
  ) {}

  ngOnInit(): void {
    this.cargarHorarios();
    this.cargarConceptos();
    this.cargarClasificaciones();
    this.cargarProductosAlimentacion();
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

  cargarConceptos(): void {
    this.conceptosService.obtenerTodos().subscribe({
      next: (r: any) => {
        this.conceptos = (r.body || []).filter((c: any) =>
          c.tipo === 'S' && c.nombre.toLowerCase().includes('alimentación')
        );
        if (this.conceptos.length === 1) this.conceptoSeleccionado = this.conceptos[0].id;
      }
    });
  }

  cargarClasificaciones(): void {
    this.clasificacionAlimentacionService.obtenerTodos().subscribe({
      next: (r: any) => { this.clasificacionesAlimentacion = r.body || r || []; }
    });
  }

  cargarProductosAlimentacion(): void {
    this.productosAlimentacionService.obtenerTodos().subscribe({
      next: (r: any) => { this.todosProductosAlimentacion = r.body || []; }
    });
  }

  cambioFecha(): void {
    this.resetDatos();
    if (this.horarioSeleccionado) this.cargarTodo();
  }

  cambioHorario(): void {
    this.resetDatos();
    if (this.horarioSeleccionado) this.cargarTodo();
  }

  cambioTab(tab: 'pendientes' | 'registrados'): void {
    this.tabActivo = tab;
    if (tab === 'registrados' && !this.movimientos.length && this.horarioSeleccionado) {
      this.cargarMovimientos();
    }
  }

  cargarTodo(): void {
    this.cargarEntregadas();
    this.cargarMenusDelDia();
    if (this.tabActivo === 'registrados') this.cargarMovimientos();
  }

  cargarEntregadas(): void {
    this.cargando = true;
    this.entregaService.obtenerEntregadasParaInventario(this.fechaSeleccionada, this.horarioSeleccionado).subscribe({
      next: (response: any) => {
        this.grupos = (response || []).map((g: any) => ({
          ...g,
          abierto: true,
          menus: [],
          id_menu_global: null,
          registros: g.registros.map((r: any) => ({
            ...r,
            seleccionado: false,
            id_menu_seleccionado: r.id_menu_servido || null
          }))
        }));
        this.asociarMenusAGrupos();
        this.cargando = false;
      },
      error: () => { this.cargando = false; }
    });
  }

  cargarMenusDelDia(): void {
    this.entregaService.obtenerMenusDelDia(this.fechaSeleccionada).subscribe({
      next: (response: any) => {
        const data = response.body || response;
        this.menusDia = (data.menus || []).map((m: any) => ({
          ...m,
          esProgramado: m.es_programado === true,
          productos_servicios: (m.productos_servicios || []).map(String)
        }));
        this.asociarMenusAGrupos();
      }
    });
  }

  cargarMovimientos(): void {
    this.cargandoMovimientos = true;
    this.entregaService.obtenerMovimientosDelDia(this.fechaSeleccionada, this.horarioSeleccionado).subscribe({
      next: (response: any) => {
        this.movimientos = (response || []).map((m: any) => ({ ...m, abierto: false }));
        this.cargandoMovimientos = false;
      },
      error: () => { this.cargandoMovimientos = false; }
    });
  }

  private asociarMenusAGrupos(): void {
    for (const grupo of this.grupos) {
      const menus = this.menusDia.filter(m =>
        m.productos_servicios?.includes(String(grupo.id_producto))
      );
      (grupo as any).menus = menus;
      const programado = menus.find(m => m.esProgramado);
      grupo.id_menu_global = programado?.id_menu || menus[0]?.id_menu || null;
      grupo.registros.forEach(r => {
        if (!r.id_menu_seleccionado) r.id_menu_seleccionado = grupo.id_menu_global;
      });
    }
    this.calcularInventarioLocal();
  }

  // ─── Selección ────────────────────────────────────────────────────────────

  toggleRegistro(r: RegistroEntregado): void {
    if (r.tiene_inventario) return;
    r.seleccionado = !r.seleccionado;
    this.calcularInventarioLocal();
  }

  toggleGrupo(grupo: GrupoEntregado): void {
    const sel = grupo.registros.filter(r => !r.tiene_inventario);
    const todos = sel.every(r => r.seleccionado);
    sel.forEach(r => r.seleccionado = !todos);
    this.calcularInventarioLocal();
  }

  seleccionarPendientes(): void {
    const todos = this.grupos.flatMap(g => g.registros).filter(r => !r.tiene_inventario);
    const todosSeleccionados = todos.every(r => r.seleccionado);
    todos.forEach(r => r.seleccionado = !todosSeleccionados);
    this.calcularInventarioLocal();
  }

  todosGrupoSeleccionados(grupo: GrupoEntregado): boolean {
    const sel = grupo.registros.filter(r => !r.tiene_inventario);
    return sel.length > 0 && sel.every(r => r.seleccionado);
  }

  todosSeleccionados(): boolean {
    const todos = this.grupos.flatMap(g => g.registros).filter(r => !r.tiene_inventario);
    return todos.length > 0 && todos.every(r => r.seleccionado);
  }

  // ─── Menú por grupo ───────────────────────────────────────────────────────

  cambioMenuGrupo(grupo: GrupoEntregado): void {
    grupo.registros.filter(r => !r.tiene_inventario).forEach(r => {
      r.id_menu_seleccionado = grupo.id_menu_global;
    });
    this.calcularInventarioLocal();
  }

  // ─── Inventario ───────────────────────────────────────────────────────────

  calcularInventarioLocal(): void {
    const seleccionados = this.grupos.flatMap(g => g.registros).filter((r: any) => r.seleccionado);
    if (!seleccionados.length) { this.inventario = []; return; }

    const mapa = new Map<string, ItemInventario>();

    for (const r of seleccionados) {
      const idMenu = r.id_menu_seleccionado;
      if (!idMenu) continue;
      const menu = this.menusDia.find(m => m.id_menu === idMenu);
      if (!menu) continue;

      const programado = this.menusDia.find(m =>
        m.productos_servicios?.includes(String(r.id_producto)) && m.esProgramado
      );

      for (const ing of menu.ingredientes) {
        if (mapa.has(ing.id_producto)) {
          mapa.get(ing.id_producto)!.cantidad_teorica += ing.cantidad_por_porcion;
        } else {
          mapa.set(ing.id_producto, {
            id_producto: ing.id_producto,
            nombre_producto: ing.nombre_producto,
            nombre_unidad: ing.nombre_unidad,
            abreviatura_unidad: ing.abreviatura_unidad,
            stock_actual: ing.stock_actual,
            cantidad_teorica: ing.cantidad_por_porcion,
            cantidad_real: ing.cantidad_por_porcion,
            id_menu_programado: programado?.id_menu || null,
            id_menu_servido: idMenu
          });
        }
      }
    }

    const anterior = new Map(this.inventario.map(i => [i.id_producto, i.cantidad_real]));
    this.inventario = Array.from(mapa.values()).map(item => ({
      ...item,
      cantidad_real: anterior.has(item.id_producto) ? anterior.get(item.id_producto)! : item.cantidad_teorica
    }));
  }

  // ─── Modal extras ─────────────────────────────────────────────────────────

  async abrirModalExtras(): Promise<void> {
    const itemsMap = new Map<string, any>();
    for (const menu of this.menusDia) {
      for (const ing of menu.ingredientes) {
        if (!itemsMap.has(ing.id_producto)) {
          itemsMap.set(ing.id_producto, { ...ing, nombre_menu: menu.nombre_menu });
        }
      }
    }
    const itemsDisponibles = Array.from(itemsMap.values());
    const clasificaciones = this.clasificacionesAlimentacion;
    let tabActivo = 'items';

    const renderItems = (busqueda: string = '') => {
      const termino = busqueda.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const filtrados = itemsDisponibles.filter(i =>
        i.nombre_producto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(termino)
      );
      if (!filtrados.length) return '<p style="color:#7f8c8d;text-align:center;padding:1rem">No se encontraron ingredientes</p>';
      return filtrados.map((i: any) => `
        <div style="display:flex;align-items:center;gap:0.75rem;padding:0.55rem 0.75rem;border-radius:10px;
                    border:1.5px solid rgba(200,200,200,0.3);margin-bottom:0.3rem;background:rgba(255,255,255,0.8)">
          <input type="checkbox" id="ing-${i.id_producto}" value="${i.id_producto}"
            data-nombre="${i.nombre_producto}" data-unidad="${i.abreviatura_unidad}" data-stock="${i.stock_actual}"
            style="width:16px;height:16px;cursor:pointer">
          <label for="ing-${i.id_producto}" style="flex:1;cursor:pointer;margin:0">
            <span style="font-size:0.9rem;font-weight:500;display:block">${i.nombre_producto}</span>
            <small style="color:#7f8c8d;font-size:0.72rem">Stock: ${i.stock_actual} ${i.abreviatura_unidad} · ${i.nombre_menu}</small>
          </label>
        </div>`).join('');
    };

    const renderDirecto = (idClasifActual: string = '', busqueda: string = '') => {
      const selectClasif = `
        <select id="sel-clasif" onchange="window.__cargarProdClasif(this.value)"
          style="width:100%;padding:0.45rem 0.7rem;border-radius:9px;border:1.5px solid rgba(255,189,49,0.4);
                 margin-bottom:0.6rem;font-size:0.88rem;outline:none">
          <option value="">Todas las clasificaciones</option>
          ${clasificaciones.map((c: any) => `<option value="${c.id}" ${String(c.id) === idClasifActual ? 'selected' : ''}>${c.nombre}</option>`).join('')}
        </select>`;

      let prods = this.todosProductosAlimentacion;
      if (idClasifActual) {
        const clasif = clasificaciones.find((c: any) => String(c.id) === String(idClasifActual));
        if (clasif) prods = prods.filter((p: any) =>
          (p.clasificaciones || '').split('|').map((s: string) => s.trim()).includes(clasif.nombre)
        );
      }
      const termino = busqueda.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const filtrados = termino
        ? prods.filter((p: any) =>
            (p.nombre_producto || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(termino))
        : prods;

      if (!filtrados.length) return selectClasif + '<p style="color:#7f8c8d;text-align:center;padding:0.5rem">No se encontraron productos</p>';

      return selectClasif + filtrados.map((p: any) => `
        <div style="display:flex;align-items:center;gap:0.75rem;padding:0.55rem 0.75rem;border-radius:10px;
                    border:1.5px solid rgba(200,200,200,0.3);margin-bottom:0.3rem;background:rgba(255,255,255,0.8)">
          <input type="checkbox" id="prod-${p.id_producto}" value="${p.id_producto}"
            data-nombre="${p.nombre_producto}" data-unidad="${p.abreviatura_unidad || ''}" data-stock="${p.stock_actual || 0}"
            style="width:16px;height:16px;cursor:pointer">
          <label for="prod-${p.id_producto}" style="flex:1;cursor:pointer;margin:0">
            <span style="font-size:0.9rem;font-weight:500;display:block">${p.nombre_producto}</span>
            <small style="color:#7f8c8d;font-size:0.72rem">Stock: ${p.stock_actual || 0} ${p.abreviatura_unidad || ''}</small>
          </label>
        </div>`).join('');
    };

    (window as any).__clasifActivaInv = '';
    (window as any).__renderItemsInv = renderItems;
    (window as any).__tabExtrasInv = 'items';
    (window as any).__cargarProdClasif = (idClasif: string) => {
      (window as any).__clasifActivaInv = idClasif;
      const el = document.getElementById('lista-directo-inv');
      if (el) el.innerHTML = renderDirecto(idClasif,
        (document.getElementById('buscar-directo-inv') as HTMLInputElement)?.value || '');
    };
    (window as any).__buscarDirectoInv = () => {
      const el = document.getElementById('lista-directo-inv');
      if (el) el.innerHTML = renderDirecto(
        (window as any).__clasifActivaInv || '',
        (document.getElementById('buscar-directo-inv') as HTMLInputElement)?.value || ''
      );
    };

    const result = await Swal.fire({
      title: 'Agregar ingredientes extra',
      html: `
        <div style="font-family:inherit;text-align:left">
          <div style="display:flex;gap:0.5rem;margin-bottom:0.85rem">
            <button id="tab-items-inv" onclick="
              window.__tabExtrasInv='items';
              this.style.cssText='flex:1;padding:0.45rem;border-radius:50px;border:none;cursor:pointer;font-weight:700;font-size:0.82rem;background:#e0a000;color:white';
              document.getElementById('tab-directo-inv').style.cssText='flex:1;padding:0.45rem;border-radius:50px;border:none;cursor:pointer;font-weight:700;font-size:0.82rem;background:rgba(200,200,200,0.2);color:#7f8c8d';
              document.getElementById('panel-items-inv').style.display='block';
              document.getElementById('panel-directo-inv').style.display='none';"
              style="flex:1;padding:0.45rem;border-radius:50px;border:none;cursor:pointer;font-weight:700;font-size:0.82rem;background:#e0a000;color:white">
              🍳 Por ítem de menú
            </button>
            <button id="tab-directo-inv" onclick="
              window.__tabExtrasInv='directo';
              this.style.cssText='flex:1;padding:0.45rem;border-radius:50px;border:none;cursor:pointer;font-weight:700;font-size:0.82rem;background:#3498db;color:white';
              document.getElementById('tab-items-inv').style.cssText='flex:1;padding:0.45rem;border-radius:50px;border:none;cursor:pointer;font-weight:700;font-size:0.82rem;background:rgba(200,200,200,0.2);color:#7f8c8d';
              document.getElementById('panel-items-inv').style.display='none';
              document.getElementById('panel-directo-inv').style.display='block';"
              style="flex:1;padding:0.45rem;border-radius:50px;border:none;cursor:pointer;font-weight:700;font-size:0.82rem;background:rgba(200,200,200,0.2);color:#7f8c8d">
              📦 Por ingrediente directo
            </button>
          </div>
          <div id="panel-items-inv" style="display:block">
            <input id="buscar-items-inv" type="text" placeholder="Buscar ingrediente..."
              oninput="document.getElementById('lista-items-inv').innerHTML=window.__renderItemsInv(this.value)"
              style="width:100%;padding:0.45rem 0.75rem;border-radius:9px;border:1.5px solid rgba(255,189,49,0.35);
                     margin-bottom:0.6rem;font-size:0.88rem;outline:none;box-sizing:border-box">
            <div id="lista-items-inv" style="max-height:280px;overflow-y:auto">${renderItems()}</div>
          </div>
          <div id="panel-directo-inv" style="display:none">
            <input id="buscar-directo-inv" type="text" placeholder="Buscar producto..."
              oninput="window.__buscarDirectoInv()"
              style="width:100%;padding:0.45rem 0.75rem;border-radius:9px;border:1.5px solid rgba(52,152,219,0.35);
                     margin-bottom:0.6rem;font-size:0.88rem;outline:none;box-sizing:border-box">
            <div id="lista-directo-inv" style="max-height:280px;overflow-y:auto">${renderDirecto()}</div>
          </div>
        </div>`,
      width: 580,
      showCancelButton: true,
      confirmButtonText: 'Agregar seleccionados',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#27ae60',
      preConfirm: () => {
        const tab = (window as any).__tabExtrasInv;
        const agregados: IngredienteExtra[] = [];
        const listaId = tab === 'items' ? 'lista-items-inv' : 'lista-directo-inv';
        const checks = document.querySelectorAll(`#${listaId} input[type="checkbox"]:checked`) as NodeListOf<HTMLInputElement>;
        checks.forEach(cb => {
          if (!this.ingredientesExtra.find(e => e.id_producto === cb.value)) {
            agregados.push({
              id_producto: cb.value,
              nombre_producto: cb.dataset['nombre'] || '',
              abreviatura_unidad: cb.dataset['unidad'] || '',
              stock_actual: Number(cb.dataset['stock'] || 0),
              cantidad_real: 0,
              origen: tab === 'items' ? 'Ítem de menú' : 'Directo'
            });
          }
        });
        return agregados;
      }
    });

    if (result.isConfirmed && result.value?.length) {
      this.ingredientesExtra.push(...result.value);
    }
  }

  quitarIngredienteExtra(idx: number): void {
    this.ingredientesExtra.splice(idx, 1);
  }

  // ─── Registrar inventario ─────────────────────────────────────────────────

  async registrarInventario(): Promise<void> {
    if (!this.conceptoSeleccionado) {
      Swal.fire('Atención', 'Debes seleccionar un concepto de movimiento.', 'warning');
      return;
    }
    const detalle = [
      ...this.inventario.map(i => ({
        id_producto: i.id_producto,
        cantidad_teorica: i.cantidad_teorica,
        cantidad_real: i.cantidad_real,
        precio_unitario: 0
      })),
      ...this.ingredientesExtra.map(e => ({
        id_producto: e.id_producto,
        cantidad_teorica: 0,
        cantidad_real: e.cantidad_real,
        precio_unitario: 0
      }))
    ];

    if (!detalle.length) {
      Swal.fire('Atención', 'No hay ingredientes para registrar.', 'warning');
      return;
    }

    this.registrando = true;
    this.entregaService.registrarConInventario({
      ids_cuentas: this.idsSeleccionados,
      id_horario: this.horarioSeleccionado,
      id_concepto_movimiento: this.conceptoSeleccionado,
      id_usuario: this.utilService.obtenerIdUsuarioActual(),
      observaciones: this.observaciones,
      detalle
    }).subscribe({
      next: (response: any) => {
        this.registrando = false;
        Swal.fire('¡Listo!', `Movimiento #${response.id_movimiento} registrado correctamente.`, 'success');
        this.inventario = [];
        this.ingredientesExtra = [];
        this.movimientos = [];
        this.cargarEntregadas();
        if (this.tabActivo === 'registrados') this.cargarMovimientos();
      },
      error: () => { this.registrando = false; }
    });
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  getNombreMenu(idMenu: string | null): string {
    if (!idMenu) return '—';
    // Buscar en menusDia
    const enDia = this.menusDia.find(m => m.id_menu === idMenu);
    if (enDia) return enDia.nombre_menu;
    // Buscar en menus de los grupos
    for (const g of this.grupos) {
      const enGrupo = g.menus.find((m: any) => m.id_menu === idMenu);
      if (enGrupo) return (enGrupo as any).nombre_menu;
    }
    return `Menú #${idMenu}`;
  }

  private resetDatos(): void {
    this.grupos = [];
    this.inventario = [];
    this.ingredientesExtra = [];
    this.movimientos = [];
    this.menusDia = [];
  }

  getMenusGrupo(grupo: GrupoEntregado): any[] {
    return grupo.menus || [];
  }

  trackByProducto(index: number, g: GrupoEntregado): string { return g.id_producto; }
  trackByCuenta(index: number, r: RegistroEntregado): string { return r.id_cuenta; }
  trackByProductoInv(index: number, item: ItemInventario): string { return item.id_producto; }
  trackByExtra(index: number, item: IngredienteExtra): string { return item.id_producto; }
  trackByMovimiento(index: number, m: any): string { return m.id_movimiento; }
}