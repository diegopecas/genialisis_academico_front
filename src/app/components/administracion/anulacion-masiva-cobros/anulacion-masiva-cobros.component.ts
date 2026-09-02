import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import Swal from 'sweetalert2';
import { UtilService } from '../../../common/constantes/util.service';
import { HeaderComponent } from '../../../common/header/header.component';
import { SearchableDropdownComponent, DropdownItem } from '../../../common/searchable-dropdown/searchable-dropdown.component';
import { CuentasPorCobrarService } from '../../../services/cuentas-por-cobrar.service';
import { ProductosServiciosService } from '../../../services/productos-servicios.service';

interface ProductoServicio {
  id: string;
  nombre: string;
  detalles: string | null;
  nombre_clasificacion: string | null;
  nombre_categoria: string | null;
  nombre_periodicidad: string | null;
}

interface CuentaAnular {
  id: string;
  id_persona: string;
  id_estudiante: string;
  id_producto_servicio: string;
  fecha: string;
  valor: number;
  detalle: string;
  nombre_producto_servicio: string;
  nombre_estudiante: string;
  numero_identificacion: string;
  grupo_estudiante: string;
  total_pagado: number;
  tiene_pago: number;
}

interface FilaAnular {
  seleccionado: boolean;
  cuenta: CuentaAnular;
  // Resultado del ultimo proceso de anulacion, para pintarlo en la fila.
  anulada: boolean;
  motivoOmision: string;
  procesada: boolean;
}

@Component({
  selector: 'app-anulacion-masiva-cobros',
  templateUrl: './anulacion-masiva-cobros.component.html',
  styleUrl: './anulacion-masiva-cobros.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, SearchableDropdownComponent],
})
export class AnulacionMasivaCobrosComponent implements OnInit, OnDestroy {
  public titulo = 'Anulación Masiva de Cobros';
  public regresar = '/administracion/financiero';

  public productos: ProductoServicio[] = [];
  // Igual que en el registro rapido de cobros: en 'descripcion' van la
  // clasificacion, la categoria, la periodicidad y el detalle, que es lo que usa
  // el buscador del dropdown para filtrar.
  public productosDropdownItems: DropdownItem[] = [];

  // Filtros de la busqueda (van al servidor)
  public idProductoServicio: string | null = null;
  public fechaInicial = '';
  public fechaFinal = '';

  // Filtros del listado (se resuelven aqui sobre lo ya consultado)
  public busqueda = '';
  public filtroGrupo = '';

  public filas: FilaAnular[] = [];
  public filasFiltradas: FilaAnular[] = [];
  public grupos: string[] = [];

  public cargandoProductos = false;
  public buscando = false;
  public anulando = false;
  public busquedaRealizada = false;
  public mostrarResultados = false;

  private subscriptions: Subscription[] = [];

  constructor(
    private cuentasPorCobrarService: CuentasPorCobrarService,
    private productosServiciosService: ProductosServiciosService,
    private utilService: UtilService
  ) {}

  ngOnInit(): void {
    // El rango arranca en el mes en curso, que es lo que se suele corregir.
    const hoy = new Date();
    const primero = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const ultimo = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);

    this.fechaInicial = this.textoDesdeFecha(primero);
    this.fechaFinal = this.textoDesdeFecha(ultimo);

    this.cargarProductos();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub: Subscription) => sub.unsubscribe());
  }

  // ============================================
  // CARGA DE DATOS
  // ============================================

  cargarProductos(): void {
    this.cargandoProductos = true;
    const sub = this.productosServiciosService.obtenerCatalogoDisponibles().subscribe({
      next: (response: any) => {
        const data = response.body || [];
        this.productos = data.map((p: any) => ({
          id: p.id,
          nombre: p.nombre,
          detalles: p.detalles,
          nombre_clasificacion: p.nombre_clasificacion,
          nombre_categoria: p.nombre_categoria,
          nombre_periodicidad: p.nombre_periodicidad,
        }));

        this.productosDropdownItems = this.productos.map((p: ProductoServicio) => ({
          id: p.id,
          nombre: p.nombre,
          descripcion: this.armarDescripcionProducto(p),
        }));
        this.cargandoProductos = false;
      },
      error: (error: any) => {
        console.error('Error al cargar productos:', error);
        Swal.fire('Error', 'No se pudieron cargar los productos y servicios', 'error');
        this.cargandoProductos = false;
      },
    });
    this.subscriptions.push(sub);
  }

  private armarDescripcionProducto(producto: ProductoServicio): string {
    const partes: string[] = [];

    if (producto.nombre_clasificacion) partes.push(producto.nombre_clasificacion);
    if (producto.nombre_categoria) partes.push(producto.nombre_categoria);
    if (producto.nombre_periodicidad) partes.push(producto.nombre_periodicidad);
    if (producto.detalles && producto.detalles.trim()) partes.push(producto.detalles.trim());

    return partes.join(' · ');
  }

  onProductoSeleccionado(item: DropdownItem | null): void {
    this.idProductoServicio = item ? String(item.id) : null;
  }

  // ============================================
  // BÚSQUEDA
  // ============================================

  buscar(): void {
    if (!this.fechaInicial || !this.fechaFinal) {
      Swal.fire('Atención', 'Debe indicar la fecha inicial y la fecha final.', 'warning');
      return;
    }

    if (this.fechaInicial > this.fechaFinal) {
      Swal.fire('Atención', 'La fecha inicial no puede ser posterior a la fecha final.', 'warning');
      return;
    }

    this.buscando = true;
    this.mostrarResultados = false;

    const filtros = {
      fecha_inicial: this.fechaInicial,
      fecha_final: this.fechaFinal,
      id_producto_servicio: this.idProductoServicio,
    };

    const sub = this.cuentasPorCobrarService.buscarParaAnular(filtros).subscribe({
      next: (response: any) => {
        const cuentas: CuentaAnular[] = (response.body?.cuentas || []).map((c: any) => ({
          ...c,
          valor: parseFloat(String(c.valor)),
          total_pagado: parseFloat(String(c.total_pagado)),
          tiene_pago: Number(c.tiene_pago),
        }));

        this.filas = cuentas.map((cuenta: CuentaAnular) => ({
          seleccionado: false,
          cuenta,
          anulada: false,
          motivoOmision: '',
          procesada: false,
        }));

        const gruposSet = new Set<string>();
        this.filas.forEach((f: FilaAnular) => gruposSet.add(f.cuenta.grupo_estudiante || 'Sin grupo'));
        this.grupos = Array.from(gruposSet).sort();

        this.busquedaRealizada = true;
        this.buscando = false;
        this.filtrarFilas();
      },
      error: (error: any) => {
        console.error('Error al buscar las cuentas:', error);
        Swal.fire('Error', 'No se pudieron consultar las cuentas por cobrar', 'error');
        this.buscando = false;
      },
    });
    this.subscriptions.push(sub);
  }

  // ============================================
  // FILTROS DEL LISTADO
  // ============================================

  filtrarFilas(): void {
    let resultado = [...this.filas];

    if (this.filtroGrupo) {
      resultado = resultado.filter((f: FilaAnular) => (f.cuenta.grupo_estudiante || 'Sin grupo') === this.filtroGrupo);
    }

    if (this.busqueda) {
      const termino = this.busqueda.toLowerCase();
      resultado = resultado.filter((f: FilaAnular) =>
        f.cuenta.nombre_estudiante.toLowerCase().includes(termino) ||
        (f.cuenta.numero_identificacion || '').toLowerCase().includes(termino) ||
        (f.cuenta.nombre_producto_servicio || '').toLowerCase().includes(termino) ||
        (f.cuenta.detalle || '').toLowerCase().includes(termino)
      );
    }

    this.filasFiltradas = resultado;
  }

  limpiarFiltros(): void {
    this.busqueda = '';
    this.filtroGrupo = '';
    this.filtrarFilas();
  }

  // ============================================
  // SELECCIÓN
  // ============================================

  // Las cuentas con pago aplicado no se pueden marcar: se anulan devolviendo o
  // anulando primero el pago, desde el modulo de pagos.
  puedeAnular(fila: FilaAnular): boolean {
    return fila.cuenta.tiene_pago === 0 && !fila.anulada;
  }

  seleccionarTodos(event: any): void {
    const seleccionar = event.target.checked;
    this.filasFiltradas.forEach((f: FilaAnular) => {
      if (this.puedeAnular(f)) f.seleccionado = seleccionar;
    });
  }

  get filasSeleccionadas(): FilaAnular[] {
    return this.filas.filter((f: FilaAnular) => f.seleccionado && this.puedeAnular(f));
  }

  get cantidadSeleccionados(): number {
    return this.filasSeleccionadas.length;
  }

  get totalSeleccionado(): number {
    return this.filasSeleccionadas.reduce((suma: number, f: FilaAnular) => suma + (f.cuenta.valor || 0), 0);
  }

  get cantidadConPago(): number {
    return this.filasFiltradas.filter((f: FilaAnular) => f.cuenta.tiene_pago === 1).length;
  }

  get cantidadAnulables(): number {
    return this.filasFiltradas.filter((f: FilaAnular) => this.puedeAnular(f)).length;
  }

  // ============================================
  // ANULACIÓN
  // ============================================

  async anularSeleccionadas(): Promise<void> {
    if (this.cantidadSeleccionados === 0) {
      Swal.fire('Atención', 'Debe marcar al menos una cuenta por cobrar.', 'warning');
      return;
    }

    const confirmacion = await Swal.fire({
      title: 'Confirmar anulación',
      html: `<div style="text-align:left;">`
        + `Se van a anular <strong>${this.cantidadSeleccionados}</strong> cuenta(s) por cobrar `
        + `por <strong>$${this.formatearMoneda(this.totalSeleccionado)}</strong>.<br><br>`
        + `<small class="text-muted">La anulación no se puede deshacer desde esta pantalla.</small>`
        + `</div>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, anular',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc3545',
      width: '600px',
    });
    if (!confirmacion.isConfirmed) return;

    this.anulando = true;

    const filasAAnular = [...this.filasSeleccionadas];
    const payload = {
      ids: filasAAnular.map((f: FilaAnular) => f.cuenta.id),
      id_usuario_anulacion: this.utilService.obtenerIdUsuarioActual(),
    };

    const sub = this.cuentasPorCobrarService.anularMasivo(payload).subscribe({
      next: (respuesta: any) => {
        this.anulando = false;

        if (!respuesta || !respuesta.success) {
          Swal.fire('Error', respuesta?.error || 'No se pudieron anular las cuentas', 'error');
          return;
        }

        const anuladas = new Set<string>(respuesta.anuladas || []);
        const motivos = new Map<string, string>();
        (respuesta.omitidas || []).forEach((o: any) => motivos.set(o.id, o.motivo));

        filasAAnular.forEach((fila: FilaAnular) => {
          fila.procesada = true;
          fila.seleccionado = false;
          if (anuladas.has(fila.cuenta.id)) {
            fila.anulada = true;
            fila.motivoOmision = '';
          } else {
            fila.motivoOmision = motivos.get(fila.cuenta.id) || 'No se pudo anular';
          }
        });

        this.mostrarResultados = true;
        this.filtrarFilas();

        let html = `Se anularon <strong>${respuesta.total_anuladas}</strong> cuenta(s).`;
        if (respuesta.total_omitidas > 0) {
          html += `<br><br>No se anularon <strong>${respuesta.total_omitidas}</strong>.`;
          html += `<br><small class="text-muted">Revise la columna Resultado del listado.</small>`;
        }

        Swal.fire({
          title: 'Proceso terminado',
          html: html,
          icon: respuesta.total_anuladas > 0 ? 'success' : 'info',
          confirmButtonText: 'Entendido',
        });
      },
      error: (error: any) => {
        this.anulando = false;
        console.error('Error al anular las cuentas:', error);
        Swal.fire('Error', 'Hubo un problema al anular las cuentas por cobrar', 'error');
      },
    });
    this.subscriptions.push(sub);
  }

  // ============================================
  // UTILIDADES
  // ============================================

  private textoDesdeFecha(fecha: Date): string {
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
  }

  formatearMoneda(valor: number): string {
    if (!valor) return '0';
    return valor.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }

  formatearFecha(fecha: string): string {
    try {
      const [anio, mes, dia] = String(fecha).split('-');
      return `${dia}/${mes}/${anio}`;
    } catch {
      return fecha;
    }
  }

  trackByCuenta(index: number, fila: FilaAnular): string {
    return fila.cuenta.id;
  }
}
