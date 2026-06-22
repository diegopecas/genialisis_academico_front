import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import Swal from 'sweetalert2';
import { HeaderComponent } from '../../../../common/header/header.component';
import { ConceptosMovimientoService } from '../../../../services/conceptos-movimiento.service';
import { MovimientosProductosService } from '../../../../services/movimientos-productos.service';
import { ProductosService } from '../../../../services/productos.service';
import { ProveedoresService } from '../../../../services/proveedores.service';
import { TiposProductoService } from '../../../../services/tipos-producto.service';
import { UtilService } from '../../../../common/constantes/util.service';


interface ProductoMovimiento {
  // Datos del producto
  id: string;
  nombre: string;
  descripcion: string;
  nombre_tipo_producto: string;
  stock_actual: number;
  stock_minimo: number;
  precio_unitario: number;
  abreviatura_unidad: string;
  nombre_unidad: string;
  activo: number;

  // Datos del movimiento
  cantidad: number | null;
  precio_movimiento: number;
  fecha_vencimiento: string | null;

  // UI
  visible: boolean;
  seleccionado: boolean;
  error: string | null;
  guardando: boolean;
  bloqueado: boolean; // Para productos que no se pueden editar
  esProductoRegistrado: boolean; // NUEVA - Para identificar productos ya guardados en el movimiento
}

interface ConceptoMovimiento {
  id: string;
  nombre: string;
  tipo: string;
  tipo_descripcion: string;
}

@Component({
  selector: 'app-crear-movimiento-producto',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent],
  templateUrl: './crear-movimiento-producto.component.html',
  styleUrl: './crear-movimiento-producto.component.scss'
})
export class CrearMovimientoProductoComponent implements OnInit, OnDestroy {

  // Configuración
  titulo = "Registro de Movimiento de Inventario";
  regresar = '/operaciones/movimientos-productos';
  accion = 'crear';
  id = '0';
  idEstadoMovimiento: number = 1; // ID del estado actual del movimiento

  // Controles principales
  fechaMovimiento: string = this.obtenerFechaHoy();
  conceptoSeleccionado: string | null = null;
  tipoProductoSeleccionado: string = '';
  proveedorSeleccionado: number | null = null;
  observaciones: string = '';
  busquedaTexto: string = '';

  // Datos
  productos: ProductoMovimiento[] = [];
  productosFiltrados: ProductoMovimiento[] = [];
  conceptos: ConceptoMovimiento[] = [];
  tiposProducto: any[] = [];
  proveedores: any[] = [];

  // Estados
  cargando: boolean = false;
  guardando: boolean = false;
  tipoMovimiento: string = '';
  requiereProveedor: boolean = false;

  // Para edición - guardar productos originales del movimiento
  productosOriginales: Set<string> = new Set();

  // Estadísticas
  totalProductosSeleccionados: number = 0;
  valorTotalMovimiento: number = 0;
  mostrarSoloRegistrados: boolean = false;
  // Subject para búsqueda
  private busquedaSubject = new Subject<string>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private productosService: ProductosService,
    private tiposProductoService: TiposProductoService,
    private conceptosService: ConceptosMovimientoService,
    private movimientosService: MovimientosProductosService,
    private proveedoresService: ProveedoresService,
    private utilService: UtilService
  ) {
    this.configurarDebounce();
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.accion = params['accion'] || 'crear';
      this.id = params['id'] || '0';

      if (this.accion === 'consultar') {
        this.titulo = "Consultar Movimiento";
        this.cargarMovimiento(this.id);
      } else if (this.accion === 'editar') {
        this.titulo = "Editar Movimiento";
        this.cargarMovimiento(this.id);
      } else if (this.accion === 'crear') {
        // Mostrar información sobre borrador al crear
        this.mostrarInfoBorrador();
      }
    });

    this.cargarDatosIniciales();
  }

  ngOnDestroy(): void {
    this.busquedaSubject.complete();
  }

  private configurarDebounce(): void {
    this.busquedaSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(texto => {
      this.aplicarFiltros();
    });
  }

  private obtenerFechaHoy(): string {
    const fecha = new Date();
    const año = fecha.getFullYear();
    const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
    const dia = fecha.getDate().toString().padStart(2, '0');
    return `${año}-${mes}-${dia}`;
  }

  private cargarDatosIniciales(): void {
    // Si estamos en modo consultar o editar, NO cargar productos aquí
    if (this.accion === 'consultar' || this.accion === 'editar') {
      // Solo cargar catálogos, NO productos
      Promise.all([
        this.cargarConceptosPromise(),
        this.cargarTiposProductoPromise(),
        this.cargarProveedoresPromise()
        // NO this.cargarProductosPromise()
      ]).then(() => {
        // Si estamos editando o consultando, actualizar el concepto después de cargar los datos
        if ((this.accion === 'editar' || this.accion === 'consultar') && this.conceptoSeleccionado) {
          this.onConceptoCambiado();
        }
      });
    } else {
      // Solo en modo CREAR cargar todos los datos incluidos productos
      Promise.all([
        this.cargarConceptosPromise(),
        this.cargarTiposProductoPromise(),
        this.cargarProveedoresPromise(),
        this.cargarProductosPromise()
      ]).then(() => {
        if (this.conceptoSeleccionado) {
          this.onConceptoCambiado();
        }
      });
    }
  }

  private cargarConceptosPromise(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.conceptosService.obtenerTodos().subscribe({
        next: (response: any) => {
          this.conceptos = response.body || [];
          console.log('Conceptos cargados:', this.conceptos.length);
          resolve();
        },
        error: (error) => {
          console.error('Error al cargar conceptos:', error);
          Swal.fire('Error', 'No se pudieron cargar los conceptos de movimiento', 'error');
          reject(error);
        }
      });
    });
  }

  private cargarTiposProductoPromise(): Promise<void> {
    return new Promise((resolve) => {
      this.tiposProductoService.obtenerActivos().subscribe({
        next: (response: any) => {
          this.tiposProducto = response.body || [];
          console.log('Tipos de producto cargados:', this.tiposProducto.length);
          resolve();
        },
        error: (error) => {
          console.error('Error al cargar tipos de producto:', error);
          resolve(); // No bloqueamos si falla
        }
      });
    });
  }

  private cargarProveedoresPromise(): Promise<void> {
    return new Promise((resolve) => {
      this.proveedoresService.obtenerActivos().subscribe({
        next: (response: any) => {
          this.proveedores = response.body || [];
          console.log('Proveedores cargados:', this.proveedores.length);
          resolve();
        },
        error: (error) => {
          console.error('Error al cargar proveedores:', error);
          resolve(); // No bloqueamos si falla
        }
      });
    });
  }

  private cargarProductosPromise(): Promise<void> {
    return new Promise((resolve) => {
      this.cargando = true;
      this.productosService.obtenerActivos().subscribe({
        next: (response: any) => {
          const productosData = response.body || [];

          this.productos = productosData.map((prod: any) => ({
            // Datos del producto
            id: prod.id,
            nombre: prod.nombre,
            descripcion: prod.descripcion,
            nombre_tipo_producto: prod.nombre_tipo_producto,
            stock_actual: prod.stock_actual,
            stock_minimo: prod.stock_minimo,
            precio_unitario: prod.precio_unitario,
            abreviatura_unidad: prod.abreviatura_unidad,
            nombre_unidad: prod.nombre_unidad,
            activo: prod.activo,

            // Datos del movimiento
            cantidad: null,
            precio_movimiento: prod.precio_unitario,
            fecha_vencimiento: null,

            // UI
            visible: true,
            seleccionado: false,
            error: null,
            guardando: false,
            bloqueado: false
          }));

          this.aplicarFiltros();
          this.cargando = false;
          console.log('Productos cargados:', this.productos.length);
          resolve();
        },
        error: (error) => {
          console.error('Error al cargar productos:', error);
          this.cargando = false;
          Swal.fire('Error', 'No se pudieron cargar los productos', 'error');
          resolve();
        }
      });
    });
  }

  // Mantener los métodos originales para compatibilidad
  private cargarConceptos(): void {
    this.cargarConceptosPromise();
  }

  private cargarTiposProducto(): void {
    this.cargarTiposProductoPromise();
  }

  private cargarProveedores(): void {
    this.cargarProveedoresPromise();
  }

  private cargarProductos(): void {
    this.cargarProductosPromise();
  }

  // En el método cargarMovimiento(), modificar la lógica cuando es consulta:

  private cargarMovimiento(id: string): void {
    this.cargando = true;
    this.movimientosService.obtenerById(id).subscribe({
      next: (response: any) => {
        const movimiento = response.body;
        console.log("cargarMovimiento", movimiento)
        if (!movimiento) {
          console.error('No se encontró el movimiento');
          this.cargando = false;
          return;
        }

        // Guardar el ID del estado actual
        this.idEstadoMovimiento = movimiento.id_estado;

        // Cargar datos del movimiento
        this.fechaMovimiento = movimiento.fecha_movimiento ? movimiento.fecha_movimiento.split(' ')[0] : this.obtenerFechaHoy();
        this.conceptoSeleccionado = movimiento.id_concepto_movimiento;
        this.proveedorSeleccionado = movimiento.id_proveedor;
        this.observaciones = movimiento.observaciones || '';

        // SI ES CONSULTA, solo mostrar los productos del movimiento
        if (this.accion === 'consultar') {
          this.productos = [];

          if (movimiento.detalle && Array.isArray(movimiento.detalle)) {
            movimiento.detalle.forEach((detalle: any) => {
              this.productos.push({
                id: detalle.id_producto,
                nombre: detalle.producto_nombre || detalle.producto,
                descripcion: detalle.producto_descripcion || '',
                nombre_tipo_producto: detalle.tipo_producto || '',
                stock_actual: detalle.stock_actual || 0,
                stock_minimo: detalle.stock_minimo || 0,
                precio_unitario: parseFloat(detalle.precio_unitario),
                abreviatura_unidad: detalle.abreviatura || 'UND',
                nombre_unidad: detalle.unidad_nombre || '',
                activo: 1,
                cantidad: parseFloat(detalle.cantidad),
                precio_movimiento: parseFloat(detalle.precio_unitario),
                fecha_vencimiento: detalle.fecha_vencimiento,
                visible: true,
                seleccionado: true,
                error: null,
                guardando: false,
                bloqueado: true, // En consulta todo está bloqueado
                esProductoRegistrado: true
              });
            });
          }

          this.productosFiltrados = [...this.productos];
          this.actualizarEstadisticas();
          this.cargando = false;

        } else {
          // SI ES EDICIÓN, cargar todos los productos y marcar los del movimiento
          this.productosService.obtenerActivos().subscribe({
            next: (prodResponse: any) => {
              const productosData = prodResponse.body || [];

              this.productos = productosData.map((prod: any) => ({
                id: prod.id,
                nombre: prod.nombre,
                descripcion: prod.descripcion,
                nombre_tipo_producto: prod.nombre_tipo_producto,
                stock_actual: prod.stock_actual,
                stock_minimo: prod.stock_minimo,
                precio_unitario: prod.precio_unitario,
                abreviatura_unidad: prod.abreviatura_unidad,
                nombre_unidad: prod.nombre_unidad,
                activo: prod.activo,
                cantidad: null,
                precio_movimiento: prod.precio_unitario,
                fecha_vencimiento: null,
                visible: true,
                seleccionado: false,
                error: null,
                guardando: false,
                bloqueado: false,
                esProductoRegistrado: false // NUEVO - inicialmente false
              }));

              // Marcar los productos del movimiento
              if (movimiento.detalle && Array.isArray(movimiento.detalle)) {
                movimiento.detalle.forEach((detalle: any) => {
                  const producto = this.productos.find(p => p.id === detalle.id_producto);
                  if (producto) {
                    producto.seleccionado = true;
                    producto.cantidad = parseFloat(detalle.cantidad);
                    producto.precio_movimiento = parseFloat(detalle.precio_unitario);
                    producto.fecha_vencimiento = detalle.fecha_vencimiento;
                    producto.esProductoRegistrado = true; // NUEVO - marcar como registrado

                    // Solo bloquear si el movimiento NO está en estado 1
                    if (this.accion === 'editar' && this.idEstadoMovimiento !== 1) {
                      producto.bloqueado = true;
                    }

                    this.productosOriginales.add(producto.id);
                  }
                });
              }

              this.aplicarFiltros();
              this.actualizarEstadisticas();
              this.cargando = false;
            }
          });
        }
      },
      error: (error) => {
        console.error('Error al cargar movimiento:', error);
        this.cargando = false;
        Swal.fire('Error', 'No se pudo cargar el movimiento', 'error');
        this.router.navigate([this.regresar]);
      }
    });
  }

  // Eventos
  onConceptoCambiado(): void {
    if (this.conceptoSeleccionado) {
      // Convertir a número para la comparación
      const conceptoId = this.conceptoSeleccionado;
      const concepto = this.conceptos.find(c => c.id === conceptoId);

      console.log("onConceptoCambiado - ID seleccionado:", this.conceptoSeleccionado);
      console.log("onConceptoCambiado - Concepto encontrado:", concepto);
      console.log("onConceptoCambiado - Proveedor seleccionado:", this.proveedorSeleccionado);

      if (concepto) {
        this.tipoMovimiento = concepto.tipo;
        this.requiereProveedor = concepto.nombre.toLowerCase().includes('compra');

        console.log("Tipo movimiento:", this.tipoMovimiento);
        console.log("Requiere proveedor:", this.requiereProveedor);
        console.log("Proveedor actual:", this.proveedorSeleccionado);

        // Si es salida, verificar stock
        if (this.tipoMovimiento === 'S') {
          this.productos.forEach(prod => {
            if (prod.cantidad && prod.cantidad > prod.stock_actual) {
              prod.error = 'Stock insuficiente';
            }
          });
        }
      } else {
        console.error("No se encontró el concepto con ID:", conceptoId);
        // Si los conceptos aún no están cargados, intentar de nuevo
        if (this.conceptos.length === 0) {
          console.log("Conceptos aún no cargados, esperando...");
        }
      }
    } else {
      // Limpiar valores si no hay concepto seleccionado
      this.tipoMovimiento = '';
      this.requiereProveedor = false;
    }
  }

  onTipoProductoCambiado(): void {
    this.aplicarFiltros();
  }

  onBusquedaCambiada(): void {
    this.busquedaSubject.next(this.busquedaTexto);
  }

  onProductoSeleccionado(producto: ProductoMovimiento): void {
    // No permitir cambiar selección si está bloqueado
    if (producto.bloqueado) {
      return;
    }

    producto.seleccionado = !producto.seleccionado;

    if (!producto.seleccionado) {
      producto.cantidad = null;
      producto.error = null;
    }

    this.actualizarEstadisticas();
  }

  onCantidadCambiada(producto: ProductoMovimiento, event: any): void {
    // No permitir cambios si está bloqueado
    if (producto.bloqueado) {
      return;
    }

    const valor = parseFloat(event.target.value);

    if (!isNaN(valor) && valor > 0) {
      producto.cantidad = valor;
      producto.seleccionado = true;

      // Validar stock para salidas
      if (this.tipoMovimiento === 'S' && valor > producto.stock_actual) {
        producto.error = `Stock insuficiente (disponible: ${producto.stock_actual})`;
      } else {
        producto.error = null;
      }
    } else {
      producto.cantidad = null;
      producto.seleccionado = false;
      producto.error = null;
    }

    this.actualizarEstadisticas();
  }

  onPrecioCambiado(producto: ProductoMovimiento, event: any): void {
    // No permitir cambios si está bloqueado
    if (producto.bloqueado) {
      return;
    }

    const valor = parseFloat(event.target.value);

    if (!isNaN(valor) && valor > 0) {
      producto.precio_movimiento = valor;
    } else {
      producto.precio_movimiento = producto.precio_unitario;
    }

    this.actualizarEstadisticas();
  }

  // Filtros
  private aplicarFiltros(): void {
    this.productosFiltrados = this.productos.filter(producto => {
      // MODIFICADO - Usar esProductoRegistrado en lugar de bloqueado
      const pasaFiltroRegistrados = !this.mostrarSoloRegistrados ||
        (this.mostrarSoloRegistrados && producto.esProductoRegistrado);

      // Filtro por tipo de producto
      const pasaFiltroTipo = !this.tipoProductoSeleccionado ||
        producto.nombre_tipo_producto === this.obtenerNombreTipoSeleccionado();

      // Filtro por búsqueda
      const pasaFiltroBusqueda = !this.busquedaTexto ||
        this.normalizarTexto(producto.nombre).includes(this.normalizarTexto(this.busquedaTexto)) ||
        this.normalizarTexto(producto.descripcion).includes(this.normalizarTexto(this.busquedaTexto));

      producto.visible = pasaFiltroRegistrados && pasaFiltroTipo && pasaFiltroBusqueda;
      return producto.visible;
    });

    console.log(`Mostrando ${this.productosFiltrados.length} de ${this.productos.length} productos`);

    if (this.mostrarSoloRegistrados) {
      const registrados = this.productos.filter(p => p.esProductoRegistrado).length;
      console.log(`Productos registrados en el movimiento: ${registrados}`);
    }
  }
  onFiltroRegistradosCambiado(): void {
    this.aplicarFiltros();

    // Mostrar mensaje informativo si no hay productos registrados
    if (this.mostrarSoloRegistrados && this.productosFiltrados.length === 0) {
      const productosRegistrados = this.productos.filter(p => p.esProductoRegistrado).length;
      if (productosRegistrados === 0) {
        Swal.fire({
          title: 'Sin productos registrados',
          text: 'Este movimiento aún no tiene productos registrados. Los productos registrados son aquellos que ya fueron guardados previamente en el movimiento.',
          icon: 'info',
          confirmButtonText: 'Entendido'
        });
        // Desmarcar el checkbox automáticamente
        this.mostrarSoloRegistrados = false;
        this.aplicarFiltros();
      }
    }
  }
  private obtenerNombreTipoSeleccionado(): string {
    if (!this.tipoProductoSeleccionado) return '';
    const tipo = this.tiposProducto.find(t => t.id.toString() === this.tipoProductoSeleccionado);
    return tipo ? tipo.nombre : '';
  }

  private normalizarTexto(texto: string): string {
    if (!texto) return '';
    return texto.normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  // Estadísticas
  private actualizarEstadisticas(): void {
    const productosSeleccionados = this.productos.filter(p => p.seleccionado && p.cantidad);
    this.totalProductosSeleccionados = productosSeleccionados.length;
    this.valorTotalMovimiento = productosSeleccionados.reduce((total, prod) => {
      return total + ((prod.cantidad || 0) * prod.precio_movimiento);
    }, 0);
  }

  // Utilidades
  obtenerColorTipo(tipo: string): string {
    switch (tipo) {
      case 'E': return '#28a745';
      case 'S': return '#dc3545';
      case 'I': return '#17a2b8';
      default: return '#6c757d';
    }
  }

  obtenerIconoTipo(tipo: string): string {
    switch (tipo) {
      case 'E': return 'fas fa-arrow-up';
      case 'S': return 'fas fa-arrow-down';
      case 'I': return 'fas fa-sync';
      default: return 'fas fa-exchange-alt';
    }
  }

  formatearPrecio(precio: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(precio);
  }

  obtenerStockResultante(producto: ProductoMovimiento): number {
    if (!producto.cantidad) return producto.stock_actual;

    switch (this.tipoMovimiento) {
      case 'E': return producto.stock_actual + producto.cantidad;
      case 'S': return producto.stock_actual - producto.cantidad;
      case 'I': return producto.cantidad;
      default: return producto.stock_actual;
    }
  }

  // Método para verificar si se puede editar el movimiento
  puedeEditarMovimiento(): boolean {
    // Solo se puede editar si está en estado 1 (EN PROCESO DE REGISTRO)
    return this.idEstadoMovimiento === 1;
  }

  // Guardar movimiento
  // En crear-movimiento-producto.component.ts

  async guardarMovimiento(): Promise<void> {
    // Validaciones
    if (!this.conceptoSeleccionado) {
      Swal.fire('Error', 'Debe seleccionar un concepto de movimiento', 'error');
      return;
    }

    if (this.requiereProveedor && !this.proveedorSeleccionado) {
      Swal.fire('Error', 'Debe seleccionar un proveedor para este tipo de movimiento', 'error');
      return;
    }

    // En estado 1 (borrador), incluir TODOS los productos seleccionados
    const productosSeleccionados = this.productos.filter(p => {
      if (this.idEstadoMovimiento === 1 && this.accion === 'editar') {
        // En borrador, todos los seleccionados con cantidad (registrados y nuevos)
        return p.seleccionado && p.cantidad;
      } else {
        // En otros casos, solo los no bloqueados
        return p.seleccionado && p.cantidad && !p.bloqueado;
      }
    });


    if (this.accion === 'crear' && productosSeleccionados.length === 0) {
      Swal.fire('Error', 'Debe seleccionar al menos un producto con cantidad', 'error');
      return;
    }

    if (this.accion === 'editar' && productosSeleccionados.length === 0) {
      // Si no hay productos para actualizar, solo actualizar cabecera
      const movimiento: any = {
        fecha_movimiento: this.fechaMovimiento + ' ' + new Date().toTimeString().split(' ')[0],
        id_concepto_movimiento: this.conceptoSeleccionado,
        id_proveedor: this.proveedorSeleccionado,
        observaciones: this.observaciones,
        id_usuario_registro: this.utilService.obtenerIdUsuarioActual(),
        detalle: productosSeleccionados.map(prod => ({
          id_producto: prod.id,
          cantidad: prod.cantidad,
          precio_unitario: prod.precio_movimiento,
          fecha_vencimiento: prod.fecha_vencimiento
        }))
      };


      this.guardando = true;

      try {
        const response = await this.movimientosService.actualizar(movimiento).toPromise();
        this.guardando = false;

        Swal.fire({
          title: 'Éxito',
          text: 'Movimiento actualizado correctamente',
          icon: 'success',
          confirmButtonText: 'Aceptar'
        }).then(() => {
          this.router.navigate([this.regresar]);
        });
        return;
      } catch (error: any) {
        this.guardando = false;
        console.error('Error al actualizar movimiento:', error);
        Swal.fire('Error', error.error?.error || 'No se pudo actualizar el movimiento', 'error');
        return;
      }
    }

    // Verificar errores
    const productosConError = productosSeleccionados.filter(p => p.error);
    if (productosConError.length > 0) {
      Swal.fire('Error', 'Hay productos con errores. Por favor revise las cantidades', 'error');
      return;
    }

    // Confirmar
    const textoConfirmacion = this.accion === 'editar' ?
      `¿Actualizar movimiento con ${productosSeleccionados.length} productos?` :
      '¿Crear movimiento como borrador?';

    const result = await Swal.fire({
      title: textoConfirmacion,
      html: `
      <div class="text-start">
        ${this.accion === 'crear' || this.idEstadoMovimiento === 1 ?
          '<div class="alert alert-info mb-3"><i class="fas fa-info-circle"></i> No afectará el inventario hasta ser registrado</div>' : ''}
        <p><strong>Productos:</strong> ${productosSeleccionados.length}</p>
        <p><strong>Valor total:</strong> ${this.formatearPrecio(this.valorTotalMovimiento)}</p>
        ${this.observaciones ? `<p><strong>Observaciones:</strong> ${this.observaciones}</p>` : ''}
      </div>
    `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, guardar',
      cancelButtonText: 'Cancelar'
    });

    if (!result.isConfirmed) return;

    // Preparar datos
    const movimiento = {
      fecha_movimiento: this.fechaMovimiento + ' ' + new Date().toTimeString().split(' ')[0],
      id_concepto_movimiento: this.conceptoSeleccionado,
      id_proveedor: this.proveedorSeleccionado,
      observaciones: this.observaciones,
      id_usuario_registro: this.utilService.obtenerIdUsuarioActual(),
      detalle: productosSeleccionados.map(prod => ({
        id_producto: prod.id,
        cantidad: prod.cantidad,
        precio_unitario: prod.precio_movimiento,
        fecha_vencimiento: prod.fecha_vencimiento
      }))
    };

    this.guardando = true;

    try {
      let response;
      if (this.accion === 'editar') {
        // Usar el método existente agregarProductos
        const datosActualizar = {
          id_movimiento: this.id,
          productos: movimiento.detalle
        };
        response = await this.movimientosService.agregarProductos(this.id, movimiento.detalle).toPromise();
      } else {
        // Crear nuevo movimiento
        response = await this.movimientosService.crear(movimiento).toPromise();
      }

      this.guardando = false;

      Swal.fire({
        title: 'Éxito',
        html: this.accion === 'editar' ?
          'Productos actualizados correctamente' :
          `<div>
          <p>Movimiento creado como borrador correctamente</p>
          <div class="alert alert-warning mt-3">
            <i class="fas fa-exclamation-triangle"></i> Recuerde <strong>REGISTRAR</strong> el movimiento 
            para que afecte el inventario
          </div>
        </div>`,
        icon: 'success',
        confirmButtonText: 'Aceptar'
      }).then(() => {
        this.router.navigate([this.regresar]);
      });

    } catch (error: any) {
      this.guardando = false;
      console.error('Error al guardar movimiento:', error);
      Swal.fire('Error', error.error?.error || 'No se pudo guardar el movimiento', 'error');
    }
  }
  mostrarInfoBorrador(): void {
    if (this.accion === 'crear' || (this.accion === 'editar' && this.idEstadoMovimiento === 1)) {
      // Mostrar información sobre el estado borrador
      setTimeout(() => {
        Swal.fire({
          title: 'Información importante',
          html: `
          <div class="alert alert-warning">
            <i class="fas fa-info-circle"></i> <strong>Movimiento en borrador</strong><br><br>
            Este movimiento se creará en estado <strong>EN PROCESO DE REGISTRO</strong> y 
            <strong>NO afectará el inventario</strong> hasta que sea registrado.<br><br>
            Podrá:
            <ul class="text-start mt-2">
              <li>Editar o eliminar el movimiento mientras esté en borrador</li>
              <li>Registrarlo para que afecte el inventario</li>
              <li>Anularlo sin afectar el stock</li>
            </ul>
          </div>
        `,
          icon: 'info',
          confirmButtonText: 'Entendido',
          confirmButtonColor: '#3085d6'
        });
      }, 500);
    }
  }
  limpiarFiltros(): void {
    this.tipoProductoSeleccionado = '';
    this.busquedaTexto = '';
    this.mostrarSoloRegistrados = false; // NUEVO - limpiar también este filtro
    this.aplicarFiltros();
  }
  //método helper para contar productos registrados:
  obtenerNumeroProductosRegistrados(): number {
    return this.productos.filter(p => p.esProductoRegistrado).length;
  }

  // método para obtener el total de productos registrados (útil para el template):
  obtenerResumenProductos(): string {
    const registrados = this.productos.filter(p => p.esProductoRegistrado).length;
    const nuevos = this.productos.filter(p => p.seleccionado && !p.esProductoRegistrado).length;
    const total = this.productos.filter(p => p.seleccionado).length;

    return `Registrados: ${registrados}, Nuevos: ${nuevos}, Total seleccionados: ${total}`;
  }
  limpiarSeleccion(): void {
    this.productos.forEach(p => {
      // Solo limpiar productos no bloqueados
      if (!p.bloqueado) {
        p.seleccionado = false;
        p.cantidad = null;
        p.error = null;
      }
    });
    this.actualizarEstadisticas();
  }

  // Método helper para verificar si un producto es original del movimiento
  esProductoOriginal(idProducto: string): boolean {
    return this.productosOriginales.has(idProducto);
  }

  volver(): void {
    this.router.navigate([this.regresar]);
  }
}