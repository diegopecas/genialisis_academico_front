import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../../../common/header/header.component';
import { TablasComponent } from '../../../common/tablas/tablas.component';
import { ProductosService } from '../../../services/productos.service';
import { ProveedoresService } from '../../../services/proveedores.service';
import { UnidadesMedidaService } from '../../../services/unidades-medida.service';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';
import * as XLSX from 'xlsx';
import { MovimientosProductosService } from '../../../services/movimientos-productos.service';

@Component({
  selector: 'app-productos',
  templateUrl: './productos.component.html',
  styleUrl: './productos.component.scss',
  standalone: true,
  imports: [CommonModule, HeaderComponent, TablasComponent]
})
export class ProductosComponent implements OnInit {

  titulo = "Gestión de Productos";
  public columnasFiltro = ['Nombre', 'Tipo Producto', 'Proveedor', 'Estado'];
  public titulos = [] as any[];
  public datos = [] as any[];
  public proveedores = [] as any[];
  public unidadesMedida = [] as any[];

  public acciones = [
    { id: 'movimientos', label: 'Movimientos', icono: '/assets/images/producto.png' }
  ] as any[];

  public puedeCrear = true;
  public puedeEditar = true;
  public puedeEliminar = true;

  constructor(
    private productosService: ProductosService,
    private proveedoresService: ProveedoresService,
    private unidadesMedidaService: UnidadesMedidaService,
    private router: Router,
    private movimientosService: MovimientosProductosService,
  ) { }

  ngOnInit(): void {
    this.crearTitulos();
    this.obtenerProveedores();
    this.obtenerUnidadesMedida();
    this.obtenerProductos();
  }

  obtenerProductos() {
    this.productosService.obtenerTodos().subscribe((response: any) => {
      const body = response.body as any[];
      this.datos = body;
      this.datos.forEach((p: any) => {
        p.color = p.activo === 0 ? "#e2e9f3" : "";
        p.estado = p.activo === 0 ? "Inactivo" : "Activo";
        p.precio_formateado = this.formatearPrecio(p.precio_unitario);
        p.stock_formateado = `${p.stock_actual} ${p.abreviatura_unidad || p.nombre_unidad || ''}`;
        p.proveedor_mostrar = p.proveedores_nombres || '-';
        p.tipo_producto_mostrar = p.nombre_tipo_producto || '-';
      });
    });
  }

  obtenerProveedores() {
    this.proveedoresService.obtenerActivos().subscribe((response: any) => {
      const body = response.body as any[];
      this.proveedores = body;
    });
  }

  obtenerUnidadesMedida() {
    this.unidadesMedidaService.obtenerTodos().subscribe((response: any) => {
      const body = response.body as any[];
      this.unidadesMedida = body;
    });
  }

  formatearPrecio(precio: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(precio);
  }

  crearTitulos() {
    this.titulos = [
      { clave: 'id', alias: 'ID', alinear: 'centrado' },
      { clave: 'nombre', alias: 'Nombre', alinear: 'izquierda' },
      { clave: 'tipo_producto_mostrar', alias: 'Tipo Producto', alinear: 'izquierda' },
      { clave: 'proveedor_mostrar', alias: 'Proveedor(es)', alinear: 'izquierda' },
      { clave: 'stock_formateado', alias: 'Stock', alinear: 'derecha' },
      { clave: 'precio_formateado', alias: 'Precio', alinear: 'derecha' },
      { clave: 'estado', alias: 'Estado', alinear: 'centrado' },
    ];
  }

  clicAccion($event: any) {
    switch ($event.accion) {
      case 'movimientos':
        this.verMovimientos($event.registro.id);
        break;
      case 'editar':
        this.router.navigate(['administracion/productos/editar/' + $event.registro.id]);
        break;
      case 'eliminar':
        this.eliminarProducto($event.registro);
        break;
    }
  }

  async eliminarProducto(producto: any) {
    const result = await Swal.fire({
      title: '¿Está seguro?',
      text: `¿Desea eliminar el producto ${producto.nombre}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      this.productosService.eliminar(producto.id).subscribe({
        next: (response: any) => {
          Swal.fire('Eliminado', 'El producto ha sido eliminado.', 'success');
          this.obtenerProductos();
        },
        error: (error: any) => {
          console.error("Error al eliminar producto", error);
          Swal.fire('Error', 'No se pudo eliminar el producto. Es posible que tenga movimientos asociados.', 'error');
        }
      });
    }
  }

  verMovimientos(id: any) {
    const producto = this.datos.find(p => p.id === id);
    if (!producto) {
      Swal.fire('Error', 'No se encontró el producto', 'error');
      return;
    }

    Swal.fire({
      title: 'Cargando historial',
      text: 'Por favor espere...',
      allowOutsideClick: false,
      didOpen: () => { Swal.showLoading(); }
    });

    this.movimientosService.obtenerPorProducto(id).subscribe({
      next: (response: any) => {
        const movimientos = response.body || [];

        let tablaHtml = `
      <div style="max-height: 500px; overflow-y: auto;">
        <div class="mb-3 p-3 bg-light rounded">
          <div class="row">
            <div class="col-md-6">
              <strong><i class="fas fa-box"></i> Producto:</strong> ${producto.nombre}
            </div>
            <div class="col-md-3">
              <strong><i class="fas fa-cubes"></i> Stock Actual:</strong> 
              <span class="badge bg-primary">${producto.stock_actual} ${producto.abreviatura_unidad || ''}</span>
            </div>
            <div class="col-md-3">
              <strong><i class="fas fa-list"></i> Total Movimientos:</strong> 
              <span class="badge bg-secondary">${movimientos.length}</span>
            </div>
          </div>
        </div>
        
        <table class="table table-sm table-hover">
          <thead class="table-light">
            <tr>
              <th class="text-center">ID</th>
              <th class="text-center">Fecha</th>
              <th class="text-center">Tipo</th>
              <th>Concepto</th>
              <th class="text-center">Cantidad</th>
              <th class="text-center">Stock Ant.</th>
              <th class="text-center">Estado</th>
            </tr>
          </thead>
          <tbody>`;

        if (movimientos.length === 0) {
          tablaHtml += `<tr><td colspan="7" class="text-center text-muted py-4">
            <i class="fas fa-inbox fa-2x mb-2 d-block"></i>No hay movimientos registrados</td></tr>`;
        } else {
          movimientos.forEach((mov: any) => {
            const tipoTexto = mov.tipo === 'E' ? 'Entrada' : mov.tipo === 'S' ? 'Salida' : 'Inv. Inicial';
            const tipoColor = mov.tipo === 'E' ? 'success' : mov.tipo === 'S' ? 'danger' : 'info';
            const estadoColor = this.getEstadoColorMovimiento(mov.id_estado);
            const estadoTexto = this.getEstadoTexto(mov.id_estado);
            const esAnulado = mov.id_estado === 4;

            tablaHtml += `<tr style="${esAnulado ? 'text-decoration: line-through; opacity: 0.6;' : ''}">
                          <td class="text-center">${mov.id}</td>
                          <td class="text-center">${this.formatearFechaCorta(mov.fecha_movimiento)}</td>
                          <td class="text-center"><span class="badge bg-${tipoColor}">${tipoTexto}</span></td>
                          <td>${mov.concepto || '-'}</td>
                          <td class="text-center">${mov.cantidad}</td>
                          <td class="text-center">${mov.stock_anterior || 0}</td>
                          <td class="text-center">
                            <span class="badge ${estadoColor}">${estadoTexto}</span>
                          </td>
                        </tr>`;
          });
        }

        tablaHtml += `</tbody></table></div>`;

        const totalEntradas = movimientos
          .filter((m: any) => m.tipo === 'E' && m.id_estado !== 4)
          .reduce((sum: number, m: any) => sum + m.cantidad, 0);

        const totalSalidas = movimientos
          .filter((m: any) => m.tipo === 'S' && m.id_estado !== 4)
          .reduce((sum: number, m: any) => sum + m.cantidad, 0);

        const resumenHtml = `
      <div class="mt-3 p-3 bg-light rounded">
        <h6 class="text-center mb-3"><i class="fas fa-chart-bar"></i> Resumen de Movimientos</h6>
        <div class="row text-center">
          <div class="col-4">
            <div class="p-2 bg-success bg-opacity-10 rounded">
              <i class="fas fa-arrow-down text-success"></i>
              <strong class="text-success d-block">Entradas</strong>
              <span class="fs-4 fw-bold text-success">${totalEntradas}</span>
            </div>
          </div>
          <div class="col-4">
            <div class="p-2 bg-danger bg-opacity-10 rounded">
              <i class="fas fa-arrow-up text-danger"></i>
              <strong class="text-danger d-block">Salidas</strong>
              <span class="fs-4 fw-bold text-danger">${totalSalidas}</span>
            </div>
          </div>
          <div class="col-4">
            <div class="p-2 bg-primary bg-opacity-10 rounded">
              <i class="fas fa-warehouse text-primary"></i>
              <strong class="text-primary d-block">Stock Actual</strong>
              <span class="fs-4 fw-bold text-primary">${producto.stock_actual}</span>
            </div>
          </div>
        </div>
      </div>`;

        Swal.fire({
          title: `<i class="fas fa-history"></i> Historial de Movimientos`,
          html: tablaHtml + resumenHtml,
          width: '90%',
          showCloseButton: true,
          showCancelButton: true,
          cancelButtonText: 'Cerrar',
          cancelButtonColor: '#6c757d',
          confirmButtonText: '<i class="fas fa-file-excel"></i> Exportar Excel',
          confirmButtonColor: '#28a745',
          customClass: { popup: 'swal-wide' },
          didOpen: () => {
            const modal = Swal.getPopup();
            if (modal) { modal.style.maxHeight = '90vh'; }
          }
        }).then((result) => {
          if (result.isConfirmed) {
            this.exportarHistorialExcel(producto, movimientos);
          }
        });
      },
      error: (error) => {
        console.error('Error cargando movimientos:', error);
        Swal.fire('Error', 'No se pudieron cargar los movimientos del producto', 'error');
      }
    });
  }

  private formatearFechaCorta(fecha: string): string {
    if (!fecha) return '';
    const date = new Date(fecha);
    return date.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: '2-digit' }) +
      ' ' + date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  }

  formatearFecha(fecha: string): string {
    if (!fecha) return '';
    const date = new Date(fecha);
    return new Intl.DateTimeFormat('es-CO', {
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
    }).format(date);
  }

  private getEstadoColorMovimiento(idEstado: number): string {
    switch (idEstado) {
      case 1: return 'bg-warning text-dark';
      case 2: return 'bg-primary';
      case 3: return 'bg-success';
      case 4: return 'bg-danger';
      default: return 'bg-secondary';
    }
  }

  private getEstadoTexto(idEstado: number): string {
    switch (idEstado) {
      case 1: return 'En Proceso';
      case 2: return 'Registrado';
      case 3: return 'Aprobado';
      case 4: return 'Anulado';
      default: return 'Desconocido';
    }
  }

  private exportarHistorialExcel(producto: any, movimientos: any[]) {
    const datosExcel = movimientos.map((mov, index) => {
      let stockPosterior = mov.stock_anterior || 0;
      if (mov.tipo === 'E') { stockPosterior += mov.cantidad; }
      else if (mov.tipo === 'S') { stockPosterior -= mov.cantidad; }
      else if (mov.tipo === 'I') { stockPosterior = mov.cantidad; }

      return {
        'ID Mov.': mov.id,
        'No.': index + 1,
        'Fecha': this.formatearFecha(mov.fecha_movimiento),
        'Tipo': mov.tipo === 'E' ? 'Entrada' : mov.tipo === 'S' ? 'Salida' : 'Inventario Inicial',
        'Concepto': mov.concepto,
        'Cantidad': mov.cantidad,
        'Stock Anterior': mov.stock_anterior || 0,
        'Stock Posterior': stockPosterior,
        'Precio Unitario': mov.precio_unitario || 0,
        'Usuario': mov.id_usuario_registro,
        'Estado': mov.estado || 'Desconocido'
      };
    });

    const totalEntradas = movimientos.filter(m => m.tipo === 'E' && m.id_estado !== 4).reduce((sum, m) => sum + m.cantidad, 0);
    const totalSalidas = movimientos.filter(m => m.tipo === 'S' && m.id_estado !== 4).reduce((sum, m) => sum + m.cantidad, 0);

    const ws = XLSX.utils.json_to_sheet(datosExcel);
    const encabezado = [
      ['HISTORIAL DE MOVIMIENTOS DE INVENTARIO'], [''],
      ['Producto:', producto.nombre], ['Código:', producto.id],
      ['Unidad de Medida:', producto.abreviatura_unidad || producto.nombre_unidad || 'N/A'],
      ['Stock Actual:', producto.stock_actual], ['Stock Mínimo:', producto.stock_minimo], [''],
      ['RESUMEN DE MOVIMIENTOS'],
      ['Total Entradas:', totalEntradas], ['Total Salidas:', totalSalidas],
      ['Diferencia:', totalEntradas - totalSalidas], [''],
      ['Fecha de generación:', new Date().toLocaleString('es-CO')], [''],
      ['DETALLE DE MOVIMIENTOS']
    ];

    XLSX.utils.sheet_add_aoa(ws, encabezado, { origin: 'A1' });
    const dataStartRow = encabezado.length + 2;
    const wsWithHeader = XLSX.utils.aoa_to_sheet(encabezado);
    XLSX.utils.sheet_add_json(wsWithHeader, datosExcel, { origin: `A${dataStartRow}`, skipHeader: false });

    wsWithHeader['!cols'] = [
      { wch: 5 }, { wch: 18 }, { wch: 15 }, { wch: 30 }, { wch: 10 },
      { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 12 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsWithHeader, 'Historial');

    const resumenData = [
      { 'Métrica': 'Total de Movimientos', 'Valor': movimientos.length },
      { 'Métrica': 'Total Entradas', 'Valor': totalEntradas },
      { 'Métrica': 'Total Salidas', 'Valor': totalSalidas },
      { 'Métrica': 'Stock Actual', 'Valor': producto.stock_actual },
      { 'Métrica': 'Stock Mínimo', 'Valor': producto.stock_minimo },
      { 'Métrica': 'Precio Unitario', 'Valor': this.formatearPrecio(producto.precio_unitario) }
    ];

    const wsResumen = XLSX.utils.json_to_sheet(resumenData);
    XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen');

    const fileName = `Historial_${producto.nombre.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fileName);

    Swal.fire({ icon: 'success', title: 'Excel Generado', text: 'El archivo se ha descargado correctamente', timer: 2000, showConfirmButton: false });
  }
}