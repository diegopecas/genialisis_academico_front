import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TarifasGruposService } from '../../../../services/tarifas-grupos.service';
import { TiposCobroProductoService } from '../../../../services/tipos-cobro-producto.service';
import { ProductosServiciosService } from '../../../../services/productos-servicios.service';
import { InstitucionConfigService } from '../../../../services/institucion-config.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-grupo-tarifas',
  templateUrl: './grupo-tarifas.component.html',
  styleUrl: './grupo-tarifas.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class GrupoTarifasComponent implements OnInit, OnChanges {

  /** Grupo al que pertenecen las tarifas */
  @Input() idGrupo: any = null;
  /** Si es false solo se puede consultar */
  @Input() editable: boolean = true;

  public aniosEscolares: number[] = [];
  public anioTarifa: number = new Date().getFullYear();

  public productos: any[] = [];
  /** Solo para filtrar en el modal: el tipo se define en el producto */
  public tiposCobro: any[] = [];

  /** Todas las filas del grupo, de todos los años */
  public tarifasGrupo: any[] = [];
  /** Las filas del año seleccionado, que son las que se editan */
  public filas: any[] = [];
  /** Ids de filas guardadas marcadas para eliminar */
  public filasAEliminar: string[] = [];

  public guardando: boolean = false;

  // ---- Modal de selección de productos ----
  public mostrarModalProductos: boolean = false;
  public busquedaProducto: string = '';
  /** Codigo del tipo de cobro por el que se filtra, vacio es todos */
  public filtroTipoCobro: string = '';
  public productosDisponibles: any[] = [];
  public productosFiltrados: any[] = [];
  public seleccionModal: { [idProducto: string]: boolean } = {};

  constructor(
    private tarifasGruposService: TarifasGruposService,
    private tiposCobroProductoService: TiposCobroProductoService,
    private productosServiciosService: ProductosServiciosService,
    private institucionConfigService: InstitucionConfigService
  ) { }

  ngOnInit(): void {
    this.cargarAniosEscolares();
    this.cargarTiposCobro();
    this.cargarProductos();
    if (this.idGrupo) {
      this.cargarTarifasGrupo(this.idGrupo);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['idGrupo'] && this.idGrupo) {
      this.cargarTarifasGrupo(this.idGrupo);
    }
  }

  // ========== Carga de datos ==========

  cargarAniosEscolares(): void {
    const annos = this.institucionConfigService.getAnnosEscolares();
    this.aniosEscolares = annos.map((a: any) => a.id);
    if (this.aniosEscolares.length > 0 && !this.anioTarifa) {
      this.anioTarifa = this.aniosEscolares[0];
    }
  }

  cargarTiposCobro(): void {
    this.tiposCobroProductoService.obtenerActivos().subscribe({
      next: (response: any) => {
        this.tiposCobro = response.body || [];
      },
      error: (error: any) => {
        console.error("Error al cargar tipos de cobro", error);
      }
    });
  }

  /**
   * Se cargan todos los productos y servicios. Si es matrícula, pensión u otro
   * lo dice el propio producto (tipo de cobro), no esta pantalla.
   */
  cargarProductos(): void {
    this.productosServiciosService.obtenerTodos().subscribe({
      next: (response: any) => {
        const productos = response.body || [];
        this.productos = productos.filter((p: any) => p.disponible == 1);
      },
      error: (error: any) => {
        console.error("Error al cargar productos", error);
      }
    });
  }

  cargarTarifasGrupo(idGrupo: any): void {
    this.tarifasGruposService.obtenerByGrupo(idGrupo).subscribe({
      next: (response: any) => {
        this.tarifasGrupo = response.body || [];
        this.filasAEliminar = [];
        this.armarFilasDelAnio();
      },
      error: (error: any) => {
        console.error("Error al cargar tarifas", error);
      }
    });
  }

  // ========== Filas del año ==========

  armarFilasDelAnio(): void {
    this.filas = this.tarifasGrupo
      .filter(t => t.anio == this.anioTarifa)
      .map(t => ({
        id: t.id,
        id_producto_servicio: t.id_producto_servicio,
        valor: parseFloat(t.valor) || 0,
        obligatorio: parseInt(t.obligatorio) === 1 ? 1 : 0,
        orden: parseInt(t.orden) || 1,
        nombre_producto: t.nombre_producto,
        nombre_periodicidad: t.nombre_periodicidad,
        nombre_tipo_cobro: t.nombre_tipo_cobro,
        codigo_tipo_cobro: t.codigo_tipo_cobro,
        valorFormateado: this.formatearNumero(parseFloat(t.valor) || 0)
      }))
      .sort((a, b) => a.orden - b.orden);
  }

  onAnioTarifaChange(): void {
    this.filasAEliminar = [];
    this.armarFilasDelAnio();
  }

  async quitarFila(indice: number): Promise<void> {
    const fila = this.filas[indice];

    const result = await Swal.fire({
      title: '¿Quitar producto?',
      text: `${fila.nombre_producto || 'Este producto'} saldrá de la tarifa del año ${this.anioTarifa}.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, quitar',
      cancelButtonText: 'Cancelar'
    });

    if (!result.isConfirmed) {
      return;
    }

    if (fila.id) {
      this.filasAEliminar.push(fila.id);
    }
    this.filas.splice(indice, 1);
    this.renumerarOrden();
  }

  subirFila(indice: number): void {
    if (indice <= 0) return;
    const fila = this.filas[indice];
    this.filas[indice] = this.filas[indice - 1];
    this.filas[indice - 1] = fila;
    this.renumerarOrden();
  }

  bajarFila(indice: number): void {
    if (indice >= this.filas.length - 1) return;
    const fila = this.filas[indice];
    this.filas[indice] = this.filas[indice + 1];
    this.filas[indice + 1] = fila;
    this.renumerarOrden();
  }

  /** El orden es la posición en la lista, no se digita */
  private renumerarOrden(): void {
    this.filas.forEach((fila, indice) => {
      fila.orden = indice + 1;
    });
  }

  onValorInput(event: any, fila: any): void {
    let valor = event.target.value.replace(/\./g, '').replace(/\D/g, '');
    fila.valor = valor ? parseInt(valor) : 0;
    fila.valorFormateado = this.formatearNumero(fila.valor);
    event.target.value = fila.valorFormateado;
  }

  toggleObligatorio(fila: any): void {
    fila.obligatorio = fila.obligatorio === 1 ? 0 : 1;
  }

  // ========== Modal de selección de productos ==========

  abrirModalProductos(): void {
    const yaEnLaTarifa = this.filas.map(f => f.id_producto_servicio);

    this.productosDisponibles = this.productos
      .filter((p: any) => !yaEnLaTarifa.includes(p.id));

    this.seleccionModal = {};
    this.busquedaProducto = '';
    this.filtroTipoCobro = '';
    this.productosFiltrados = this.productosDisponibles;
    this.mostrarModalProductos = true;
  }

  cerrarModalProductos(): void {
    this.mostrarModalProductos = false;
  }

  filtrarProductos(): void {
    const texto = (this.busquedaProducto || '').toLowerCase().trim();

    this.productosFiltrados = this.productosDisponibles.filter((p: any) => {
      if (this.filtroTipoCobro && p.codigo_tipo_cobro !== this.filtroTipoCobro) {
        return false;
      }

      if (!texto) {
        return true;
      }

      const nombre = (p.nombre || '').toLowerCase();
      const clasificacion = (p.nombre_clasificacion || '').toLowerCase();
      const periodicidad = (p.nombre_periodicidad || '').toLowerCase();
      return nombre.includes(texto)
        || clasificacion.includes(texto)
        || periodicidad.includes(texto);
    });
  }

  seleccionarFiltroTipo(codigo: string): void {
    this.filtroTipoCobro = codigo;
    this.filtrarProductos();
  }

  /** Cuantos productos disponibles hay de cada tipo, para mostrarlo en el chip */
  contarPorTipo(codigo: string): number {
    if (!codigo) {
      return this.productosDisponibles.length;
    }
    return this.productosDisponibles.filter((p: any) => p.codigo_tipo_cobro === codigo).length;
  }

  toggleSeleccionModal(idProducto: string): void {
    this.seleccionModal[idProducto] = !this.seleccionModal[idProducto];
  }

  estaSeleccionado(idProducto: string): boolean {
    return this.seleccionModal[idProducto] === true;
  }

  totalSeleccionados(): number {
    return Object.keys(this.seleccionModal)
      .filter(id => this.seleccionModal[id]).length;
  }

  /** Agrega de una sola vez todos los productos marcados en el modal */
  agregarSeleccionados(): void {
    const ids = Object.keys(this.seleccionModal).filter(id => this.seleccionModal[id]);

    if (ids.length === 0) {
      this.cerrarModalProductos();
      return;
    }

    ids.forEach(id => {
      const producto = this.productos.find((p: any) => p.id == id);
      if (!producto) return;

      this.filas.push({
        id: null,
        id_producto_servicio: producto.id,
        valor: parseFloat(producto.valor_sugerido) || 0,
        obligatorio: 1,
        orden: this.filas.length + 1,
        nombre_producto: producto.nombre,
        nombre_periodicidad: producto.nombre_periodicidad,
        nombre_tipo_cobro: producto.nombre_tipo_cobro,
        codigo_tipo_cobro: producto.codigo_tipo_cobro,
        valor_sugerido: parseFloat(producto.valor_sugerido) || 0,
        valorFormateado: this.formatearNumero(parseFloat(producto.valor_sugerido) || 0)
      });
    });

    this.renumerarOrden();
    this.cerrarModalProductos();
  }

  // ========== Guardado ==========

  /**
   * Guarda todo el año en un solo llamado al back (guardar-lote), tanto lo
   * que se agregó y cambió como lo que se quitó.
   */
  guardarTarifas(): void {
    if (!this.idGrupo) {
      Swal.fire('Advertencia', 'Primero debe guardar el grupo', 'warning');
      return;
    }

    if (this.filas.length === 0 && this.filasAEliminar.length === 0) {
      Swal.fire('Advertencia', 'No hay cambios para guardar', 'warning');
      return;
    }

    for (const fila of this.filas) {
      if (!fila.valor || fila.valor <= 0) {
        Swal.fire('Advertencia', `Debe ingresar el valor de ${fila.nombre_producto}`, 'warning');
        return;
      }
    }

    this.guardando = true;

    const datos = {
      id_grupo: this.idGrupo,
      anio: parseInt(this.anioTarifa as any),
      tarifas: this.filas.map(f => ({
        id: f.id,
        id_producto_servicio: f.id_producto_servicio,
        valor: f.valor,
        obligatorio: f.obligatorio,
        orden: f.orden
      })),
      eliminar: this.filasAEliminar
    };

    this.tarifasGruposService.guardarLote(datos).subscribe({
      next: () => {
        this.guardando = false;
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: 'Tarifas guardadas',
          showConfirmButton: false,
          timer: 2000
        });
        this.cargarTarifasGrupo(this.idGrupo);
      },
      error: (error: any) => {
        this.guardando = false;
        console.error("Error al guardar tarifas", error);
        Swal.fire('Error', error?.error?.error || 'No se pudieron guardar las tarifas', 'error');
      }
    });
  }

  // ========== Utilidades ==========

  aniosConTarifa(): number[] {
    const anios = this.tarifasGrupo.map(t => parseInt(t.anio));
    return Array.from(new Set(anios)).sort((a, b) => b - a);
  }

  filasDelAnio(anio: number): any[] {
    return this.tarifasGrupo.filter(t => t.anio == anio);
  }

  totalAnio(anio: number): number {
    return this.filasDelAnio(anio)
      .reduce((suma, t) => suma + (parseFloat(t.valor) || 0), 0);
  }

  formatearNumero(valor: number): string {
    if (!valor || valor === 0) return '';
    return valor.toLocaleString('es-CO');
  }

  formatearMoneda(valor: number): string {
    return valor?.toLocaleString('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }) || '$0';
  }
}