import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../../../common/header/header.component';
import { TablasComponent } from '../../../common/tablas/tablas.component';
import { MovimientosProductosService } from '../../../services/movimientos-productos.service';
import { ConceptosMovimientoService } from '../../../services/conceptos-movimiento.service';
import { EstadosMovimientosProductosService } from '../../../services/estados-movimientos-productos.service';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';
import * as XLSX from 'xlsx';
import { UtilService } from '../../../common/constantes/util.service';

@Component({
  selector: 'app-movimientos-productos',
  templateUrl: './movimientos-productos.component.html',
  styleUrl: './movimientos-productos.component.scss',
  standalone: true,
  imports: [CommonModule, HeaderComponent, TablasComponent]
})
export class MovimientosProductosComponent implements OnInit {

  titulo = "Movimientos de Inventario";
  public columnasFiltro = ['Fecha', 'Concepto', 'Tipo', 'Proveedor', 'Estado'];
  public titulos = [] as any[];
  public datos = [] as any[];
  public conceptos = [] as any[];
  public estados = [] as any[];

  public acciones = [
    { id: 'registrar', label: 'Registrar', icono: '/assets/images/registrar.png' }, // NUEVA ACCIÓN
    { id: 'aprobar', label: 'Aprobar', icono: '/assets/images/aprobar.png' },
    { id: 'anular', label: 'Anular', icono: '/assets/images/anular.png' },
    { id: 'imprimir', label: 'Imprimir', icono: '/assets/images/pdf.png' },
    { id: 'exportar-excel', label: 'Exportar Excel', icono: '/assets/images/excel.png' },
  ] as any[];

  constructor(
    private movimientosService: MovimientosProductosService,
    private conceptosService: ConceptosMovimientoService,
    private estadosService: EstadosMovimientosProductosService,
    private router: Router,
    private utilService: UtilService
  ) { }

  ngOnInit(): void {
    this.crearTitulos();
    this.obtenerConceptos();
    this.obtenerEstados();
    this.obtenerMovimientos();
  }

  obtenerMovimientos() {
    this.movimientosService.obtenerTodos().subscribe((response: any) => {
      const body = response.body as any[];
      this.datos = body;
      this.datos.forEach((m: any) => {
        // Formatear fecha
        m.fecha_formateada = this.formatearFecha(m.fecha_movimiento);

        // Formatear valores
        m.total_valor_formateado = this.formatearPrecio(m.total_valor || 0);

        // Color y badge según ID de estado
        switch (m.id_estado) {
          case 1: // EN PROCESO DE REGISTRO
            m.color = "#fff3cd";
            m.estado_color = "badge bg-warning";
            break;
          case 2: // REGISTRADO
            m.color = "#d4edda"; // Verde claro para indicar que ya afectó inventario
            m.estado_color = "badge bg-primary";
            break;
          case 3: // APROBADO
            m.color = "#e8f5e9";
            m.estado_color = "badge bg-success";
            break;
          case 4: // ANULADO
            m.color = "#ffebee";
            m.estado_color = "badge bg-danger";
            break;
          default:
            m.color = "";
            m.estado_color = "badge bg-secondary";
        }

        // Indicador de tipo
        switch (m.tipo) {
          case 'E':
            m.tipo_icono = "↓";
            m.tipo_color = "text-success";
            break;
          case 'S':
            m.tipo_icono = "↑";
            m.tipo_color = "text-danger";
            break;
          case 'I':
            m.tipo_icono = "↔";
            m.tipo_color = "text-info";
            break;
        }

        // Mostrar proveedor o guión
        m.proveedor_mostrar = m.proveedor || '-';
      });
    });
  }

  obtenerConceptos() {
    this.conceptosService.obtenerTodos().subscribe((response: any) => {
      const body = response.body as any[];
      console.log("Conceptos", body);
      this.conceptos = body;
    });
  }

  obtenerEstados() {
    this.estadosService.obtenerTodos().subscribe((response: any) => {
      const body = response.body as any[];
      console.log("Estados", body);
      this.estados = body;
    });
  }

  formatearFecha(fecha: string): string {
    if (!fecha) return '';
    const date = new Date(fecha);
    return new Intl.DateTimeFormat('es-CO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
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
      {
        clave: 'id',
        alias: 'ID',
        alinear: 'centrado',
      },
      {
        clave: 'fecha_formateada',
        alias: 'Fecha',
        alinear: 'centrado',
      },
      {
        clave: 'concepto',
        alias: 'Concepto',
        alinear: 'izquierda',
      },
      {
        clave: 'tipo_descripcion',
        alias: 'Tipo',
        alinear: 'centrado',
        tipo: 'html',
        formatoHtml: (fila: any) => `<span class="${fila.tipo_color}">${fila.tipo_icono} ${fila.tipo_descripcion}</span>`
      },
      {
        clave: 'proveedor_mostrar',
        alias: 'Proveedor',
        alinear: 'izquierda',
      },
      {
        clave: 'total_items',
        alias: 'Items',
        alinear: 'centrado',
      },
      {
        clave: 'total_unidades',
        alias: 'Cantidad',
        alinear: 'derecha',
      },
      {
        clave: 'total_valor_formateado',
        alias: 'Valor Total',
        alinear: 'derecha',
      },
      {
        clave: 'estado',
        alias: 'Estado',
        alinear: 'centrado',
        tipo: 'html',
        formatoHtml: (fila: any) => `<span class="${fila.estado_color}">${fila.estado}</span>`
      },
      {
        clave: 'usuario_registro',
        alias: 'Usuario',
        alinear: 'izquierda',
      },
    ];
  }

  clicAccion($event: any) {
    const movimiento = $event.registro;

    switch ($event.accion) {
      case 'consultar':
        this.router.navigate(['operaciones/movimientos-productos/consultar/' + movimiento.id]);
        break;
      case 'editar':
        // Solo se puede editar si está en estado 1 (EN PROCESO DE REGISTRO)
        if (movimiento.id_estado === 1) {
          this.router.navigate(['operaciones/movimientos-productos/editar/' + movimiento.id]);
        } else {
          Swal.fire('No permitido', 'Solo se pueden editar movimientos en estado EN PROCESO DE REGISTRO', 'warning');
        }
        break;
      case 'ver-detalle':
        this.router.navigate(['operaciones/movimientos-productos/consultar/' + movimiento.id]);
        break;
      case 'registrar': // NUEVA ACCIÓN
        this.registrarMovimiento(movimiento);
        break;
      case 'aprobar':
        this.aprobarMovimiento(movimiento);
        break;
      case 'anular':
        this.anularMovimiento(movimiento);
        break;
      case 'imprimir':
        this.imprimirMovimiento(movimiento);
        break;
      case 'exportar-excel':
        this.exportarExcel(movimiento);
        break;
      case 'eliminar':
        // Solo permitir eliminar si está en estado 1 (EN PROCESO DE REGISTRO)
        if (movimiento.id_estado === 1) {
          this.eliminarMovimiento(movimiento);
        } else {
          Swal.fire('No permitido', 'Solo se pueden eliminar movimientos en estado EN PROCESO DE REGISTRO', 'warning');
        }
        break;
    }
  }

  // NUEVO MÉTODO - Registrar movimiento
  async registrarMovimiento(movimiento: any) {
    // Validar que esté en estado EN PROCESO DE REGISTRO
    if (movimiento.id_estado !== 1) {
      Swal.fire('No permitido', 'Solo se pueden registrar movimientos en estado EN PROCESO DE REGISTRO', 'warning');
      return;
    }

    const result = await Swal.fire({
      title: '¿Registrar movimiento?',
      html: `
        <div class="alert alert-info">
          <i class="fas fa-info-circle"></i> <strong>Importante:</strong><br>
          Al registrar este movimiento se actualizará el inventario de los productos.<br>
          Esta acción no se puede deshacer, solo anular posteriormente.
        </div>
        <p>¿Desea registrar el movimiento #${movimiento.id}?</p>
        <p><strong>Concepto:</strong> ${movimiento.concepto}</p>
        <p><strong>Tipo:</strong> ${movimiento.tipo_descripcion}</p>
        <p><strong>Items:</strong> ${movimiento.total_items}</p>
        <p><strong>Cantidad total:</strong> ${movimiento.total_unidades}</p>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#28a745',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Sí, registrar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      // Mostrar loading
      Swal.fire({
        title: 'Registrando movimiento',
        text: 'Actualizando inventario...',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      this.movimientosService.registrar(movimiento.id).subscribe({
        next: (response: any) => {
          Swal.fire({
            title: 'Registrado',
            text: 'El movimiento ha sido registrado y el inventario ha sido actualizado',
            icon: 'success',
            confirmButtonText: 'Aceptar'
          });
          this.obtenerMovimientos();
        },
        error: (error: any) => {
          console.error("Error al registrar movimiento", error);
          Swal.fire('Error', error.error?.error || 'No se pudo registrar el movimiento', 'error');
        }
      });
    }
  }

  async aprobarMovimiento(movimiento: any) {
    // MODIFICADO - Solo se puede aprobar si está REGISTRADO (estado 2)
    if (movimiento.id_estado !== 2) {
      Swal.fire('No permitido', 'Solo se pueden aprobar movimientos en estado REGISTRADO', 'warning');
      return;
    }

    const result = await Swal.fire({
      title: '¿Aprobar movimiento?',
      html: `
        <p>¿Desea aprobar el movimiento #${movimiento.id}?</p>
        <div class="alert alert-success">
          Este movimiento ya afectó el inventario cuando fue registrado.
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#28a745',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Sí, aprobar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      const idUsuario = this.utilService.obtenerIdUsuarioActual();
      const usuarioActual = idUsuario ? idUsuario.toString() : '';
      this.movimientosService.aprobar(movimiento.id, usuarioActual).subscribe({
        next: (response: any) => {
          Swal.fire('Aprobado', 'El movimiento ha sido aprobado correctamente', 'success');
          this.obtenerMovimientos();
        },
        error: (error: any) => {
          console.error("Error al aprobar movimiento", error);
          Swal.fire('Error', error.error?.error || 'No se pudo aprobar el movimiento', 'error');
        }
      });
    }
  }

  async anularMovimiento(movimiento: any) {
    // Validar por ID de estado - puede anular en estado 1, 2 o 3
    if (movimiento.id_estado === 4) {
      Swal.fire('No permitido', 'Este movimiento ya está anulado', 'warning');
      return;
    }

    let mensajeAdvertencia = '';
    if (movimiento.id_estado === 1) {
      mensajeAdvertencia = `
        <div class="alert alert-info">
          <i class="fas fa-info-circle"></i> Este movimiento está en borrador y no ha afectado el inventario.<br>
          Se anulará sin afectar el stock de productos.
        </div>
      `;
    } else {
      mensajeAdvertencia = `
        <div class="alert alert-warning">
          <i class="fas fa-exclamation-triangle"></i> <strong>Importante:</strong><br>
          Este movimiento ya afectó el inventario.<br>
          Al anularlo se revertirán los cambios en el stock de los productos.<br>
          Solo se puede anular si es el último movimiento de los productos involucrados.
        </div>
      `;
    }

    const result = await Swal.fire({
      title: '¿Anular movimiento?',
      html: `
        ${mensajeAdvertencia}
        <p>¿Desea anular el movimiento #${movimiento.id}?</p>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Sí, anular',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      const idUsuario = this.utilService.obtenerIdUsuarioActual();
      const usuarioActual = idUsuario ? idUsuario.toString() : '';

      this.movimientosService.anular(movimiento.id, usuarioActual).subscribe({
        next: (response: any) => {
          const mensaje = movimiento.id_estado === 1 ?
            'El movimiento ha sido anulado' :
            'El movimiento ha sido anulado y el inventario ha sido revertido';
          Swal.fire('Anulado', mensaje, 'success');
          this.obtenerMovimientos();
        },
        error: (error: any) => {
          console.error("Error al anular movimiento", error);
          Swal.fire('Error', error.error?.error || 'No se pudo anular el movimiento', 'error');
        }
      });
    }
  }

  // NUEVO MÉTODO - Eliminar movimiento (solo para borradores)
  async eliminarMovimiento(movimiento: any) {
    if (movimiento.id_estado !== 1) {
      Swal.fire('No permitido', 'Solo se pueden eliminar movimientos en estado EN PROCESO DE REGISTRO', 'warning');
      return;
    }

    const result = await Swal.fire({
      title: '¿Eliminar movimiento?',
      html: `
        <div class="alert alert-danger">
          <i class="fas fa-trash"></i> Esta acción es permanente y no se puede deshacer.
        </div>
        <p>¿Desea eliminar el movimiento #${movimiento.id}?</p>
        <p>Este movimiento está en borrador y no ha afectado el inventario.</p>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      // Aquí llamarías al servicio para eliminar (necesitarías crear el método en el backend)
      Swal.fire('Información', 'La eliminación física requiere implementación adicional en el backend', 'info');
    }
  }

  imprimirMovimiento(movimiento: any) {
    // Mostrar loading
    Swal.fire({
      title: 'Generando comprobante',
      text: 'Por favor espere...',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    // Obtener datos completos del movimiento
    this.movimientosService.obtenerById(movimiento.id).subscribe({
      next: (response: any) => {
        const datos = response.body;
        if (!datos) {
          Swal.fire('Error', 'No se pudieron obtener los datos del movimiento', 'error');
          return;
        }

        // Crear HTML del comprobante
        let comprobanteHtml = `
      <div class="comprobante-modal" style="text-align: left; font-size: 14px;">
        <!-- Encabezado -->
        <div style="border-bottom: 3px solid #ffc107; padding-bottom: 10px; margin-bottom: 20px;">
          <div class="row">
            <div class="col-8">
              <h4 style="margin: 0; color: #333;">COMPROBANTE DE MOVIMIENTO DE INVENTARIO</h4>
              <h5 style="margin: 5px 0; color: ${this.getColorTipoMovimiento(datos.tipo)};">
                ${this.getTipoMovimientoTexto(datos.tipo)}
              </h5>
            </div>
            <div class="col-4 text-end">
              <div style="border: 2px solid #ffc107; padding: 5px; border-radius: 5px; display: inline-block;">
                <strong>No. ${String(datos.id).padStart(4, '0')}</strong>
              </div>
            </div>
          </div>
        </div>

        <!-- Información del movimiento con TODOS los usuarios y fechas -->
        <div class="row mb-3">
          <div class="col-md-6">
            <table class="table table-sm">
              <tr>
                <td><strong>Fecha Movimiento:</strong></td>
                <td>${this.formatearFecha(datos.fecha_movimiento)}</td>
              </tr>
              <tr>
                <td><strong>Concepto:</strong></td>
                <td>${datos.concepto}</td>
              </tr>
              ${datos.proveedor ? `
              <tr>
                <td><strong>Proveedor:</strong></td>
                <td>${datos.proveedor}</td>
              </tr>` : ''}
              <tr>
                <td><strong>Estado:</strong></td>
                <td><span class="badge ${this.getEstadoColorMovimiento(datos.id_estado)}">${datos.estado}</span></td>
              </tr>
              ${datos.observaciones ? `
              <tr>
                <td><strong>Observaciones:</strong></td>
                <td>${datos.observaciones}</td>
              </tr>` : ''}
            </table>
          </div>
          <div class="col-md-6">
            <table class="table table-sm">
              <!-- Usuario y fecha de registro -->
              <tr>
                <td colspan="2" style="background-color: #f8f9fa;"><strong>📝 Registro</strong></td>
              </tr>
              <tr>
                <td>Usuario:</td>
                <td>${datos.nombre_usuario_registro || `Usuario ID: ${datos.id_usuario_registro}`}</td>
              </tr>
              <tr>
                <td>Fecha:</td>
                <td>${datos.fecha_registro ? this.formatearFecha(datos.fecha_registro) : 'N/A'}</td>
              </tr>
              
              <!-- Usuario y fecha de aprobación (si existe) -->
              ${datos.id_usuario_aprobado || datos.usuario_aprobado ? `
              <tr>
                <td colspan="2" style="background-color: #d4edda;"><strong>✅ Aprobación</strong></td>
              </tr>
              <tr>
                <td>Usuario:</td>
                <td>${datos.nombre_usuario_aprobado || `Usuario ID: ${datos.id_usuario_aprobado}`}</td>
              </tr>
              <tr>
                <td>Fecha:</td>
                <td>${datos.fecha_aprobado ? this.formatearFecha(datos.fecha_aprobado) : 'N/A'}</td>
              </tr>` : ''}
              
              <!-- Usuario y fecha de anulación (si existe) -->
              ${datos.id_usuario_anulado || datos.usuario_anulado ? `
              <tr>
                <td colspan="2" style="background-color: #f8d7da;"><strong>❌ Anulación</strong></td>
              </tr>
              <tr>
                <td>Usuario:</td>
                <td>${datos.nombre_usuario_anulado || `Usuario ID: ${datos.id_usuario_anulado}`}</td>
              </tr>
              <tr>
                <td>Fecha:</td>
                <td>${datos.fecha_anulado ? this.formatearFecha(datos.fecha_anulado) : 'N/A'}</td>
              </tr>` : ''}
            </table>
          </div>
        </div>

        <!-- Detalle de productos -->
        <h6 style="background-color: #ffc107; padding: 8px; margin: 20px 0 10px 0;">
          <i class="fas fa-list"></i> DETALLE DE PRODUCTOS
        </h6>
        
        <div style="max-height: 300px; overflow-y: auto;">
          <table class="table table-sm table-bordered">
            <thead style="background-color: #f8f9fa;">
              <tr>
                <th class="text-center">#</th>
                <th>Producto</th>
                <th class="text-center">Unidad</th>
                <th class="text-end">Stock Ant.</th>
                <th class="text-end">Cantidad</th>
                <th class="text-end">Stock Post.</th>
                <th class="text-end">Precio Unit.</th>
                <th class="text-end">Subtotal</th>
              </tr>
            </thead>
            <tbody>`;

        // Agregar filas del detalle
        let totalUnidades = 0;
        let totalValor = 0;

        if (datos.detalle && datos.detalle.length > 0) {
          datos.detalle.forEach((item: any, index: number) => {
            const stockPosterior = this.calcularStockPosterior(item, datos.tipo);
            const subtotal = item.cantidad * item.precio_unitario;
            totalUnidades += item.cantidad;
            totalValor += subtotal;

            comprobanteHtml += `
            <tr>
              <td class="text-center">${index + 1}</td>
              <td>${item.producto_nombre}</td>
              <td class="text-center">${item.abreviatura || 'UND'}</td>
              <td class="text-end">${item.stock_anterior || 0}</td>
              <td class="text-end"><strong>${item.cantidad}</strong></td>
              <td class="text-end">
                <span class="${stockPosterior > (item.stock_anterior || 0) ? 'text-success' : 'text-danger'}">
                  <strong>${stockPosterior}</strong>
                </span>
              </td>
              <td class="text-end">${this.formatearPrecio(item.precio_unitario)}</td>
              <td class="text-end">${this.formatearPrecio(subtotal)}</td>
            </tr>`;
          });
        }

        comprobanteHtml += `
            </tbody>
            <tfoot style="background-color: #e9ecef;">
              <tr>
                <td colspan="4" class="text-end"><strong>TOTALES:</strong></td>
                <td class="text-end"><strong>${totalUnidades}</strong></td>
                <td></td>
                <td></td>
                <td class="text-end"><strong>${this.formatearPrecio(totalValor)}</strong></td>
              </tr>
            </tfoot>
          </table>
        </div>

        <!-- Resumen -->
        <div class="row mt-3">
          <div class="col-md-4">
            <div class="text-center p-2 bg-light rounded">
              <small>Total Items</small><br>
              <strong>${datos.detalle ? datos.detalle.length : 0}</strong>
            </div>
          </div>
          <div class="col-md-4">
            <div class="text-center p-2 bg-light rounded">
              <small>Total Unidades</small><br>
              <strong>${totalUnidades}</strong>
            </div>
          </div>
          <div class="col-md-4">
            <div class="text-center p-2 bg-light rounded">
              <small>Valor Total</small><br>
              <strong class="text-primary">${this.formatearPrecio(totalValor)}</strong>
            </div>
          </div>
        </div>

        ${datos.id_estado === 1 ? `
        <div class="alert alert-warning mt-3">
          <i class="fas fa-exclamation-triangle"></i> 
          <strong>BORRADOR:</strong> Este movimiento no ha afectado el inventario
        </div>` : ''}
      </div>`;

        // Mostrar modal con el comprobante
        Swal.fire({
          title: '<i class="fas fa-file-alt"></i> Comprobante de Movimiento',
          html: comprobanteHtml,
          width: '90%',
          showCloseButton: true,
          showCancelButton: true,
          cancelButtonText: 'Cerrar',
          cancelButtonColor: '#6c757d',
          confirmButtonText: '<i class="fas fa-print"></i> Imprimir',
          confirmButtonColor: '#007bff',
          customClass: {
            popup: 'swal-xl'
          },
          didOpen: () => {
            const modal = Swal.getPopup();
            if (modal) {
              modal.style.maxHeight = '95vh';
            }
          }
        }).then((result) => {
          if (result.isConfirmed) {
            this.imprimirComprobanteDirecto(datos);
          }
        });
      },
      error: (error) => {
        console.error('Error obteniendo movimiento:', error);
        Swal.fire('Error', 'No se pudo generar el comprobante', 'error');
      }
    });
  }

  // Métodos auxiliares necesarios:
  private getEstadoColorMovimiento(idEstado: number): string {
    switch (idEstado) {
      case 1: return 'bg-warning text-dark';
      case 2: return 'bg-primary';
      case 3: return 'bg-success';
      case 4: return 'bg-danger';
      default: return 'bg-secondary';
    }
  }
  private getTipoMovimientoTexto(tipo: string): string {
    switch (tipo) {
      case 'E': return 'ENTRADA';
      case 'S': return 'SALIDA';
      case 'I': return 'INVENTARIO INICIAL';
      default: return tipo;
    }
  }

  private getColorTipoMovimiento(tipo: string): string {
    switch (tipo) {
      case 'E': return '#28a745';
      case 'S': return '#dc3545';
      case 'I': return '#17a2b8';
      default: return '#6c757d';
    }
  }

  private calcularStockPosterior(item: any, tipoMovimiento: string): number {
    const stockAnterior = item.stock_anterior || 0;

    if (tipoMovimiento === 'E') {
      return stockAnterior + item.cantidad;
    } else if (tipoMovimiento === 'S') {
      return stockAnterior - item.cantidad;
    } else if (tipoMovimiento === 'I') {
      return item.cantidad;
    }

    return stockAnterior;
  }

  private imprimirComprobanteDirecto(datos: any) {
    // Crear una ventana nueva con el contenido formateado para impresión
    const ventanaImpresion = window.open('', '_blank', 'width=800,height=600');

    if (!ventanaImpresion) {
      Swal.fire('Error', 'No se pudo abrir la ventana de impresión', 'error');
      return;
    }

    const htmlCompleto = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Comprobante Movimiento #${datos.id}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 8px; text-align: left; border: 1px solid #ddd; }
        th { background-color: #f2f2f2; }
        .text-center { text-align: center; }
        .text-end { text-align: right; }
        @media print {
          body { padding: 0; }
        }
      </style>
    </head>
    <body onload="window.print(); window.close();">
      <h2>COMPROBANTE DE MOVIMIENTO #${String(datos.id).padStart(4, '0')}</h2>
      <p><strong>Fecha:</strong> ${this.formatearFecha(datos.fecha_movimiento)}</p>
      <p><strong>Tipo:</strong> ${this.getTipoMovimientoTexto(datos.tipo)}</p>
      <p><strong>Concepto:</strong> ${datos.concepto}</p>
      ${datos.proveedor ? `<p><strong>Proveedor:</strong> ${datos.proveedor}</p>` : ''}
      
      <h3>Detalle de Productos</h3>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Producto</th>
            <th>Cantidad</th>
            <th>Stock Anterior</th>
            <th>Stock Posterior</th>
            <th>Precio Unit.</th>
            <th>Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${datos.detalle ? datos.detalle.map((item: any, index: number) => `
            <tr>
              <td>${index + 1}</td>
              <td>${item.producto_nombre}</td>
              <td class="text-center">${item.cantidad}</td>
              <td class="text-center">${item.stock_anterior || 0}</td>
              <td class="text-center">${this.calcularStockPosterior(item, datos.tipo)}</td>
              <td class="text-end">${this.formatearPrecio(item.precio_unitario)}</td>
              <td class="text-end">${this.formatearPrecio(item.cantidad * item.precio_unitario)}</td>
            </tr>
          `).join('') : ''}
        </tbody>
      </table>
      
      <p style="margin-top: 30px;">
        <strong>Usuario Registro:</strong> ${datos.usuario_registro || 'N/A'}<br>
        <strong>Fecha Registro:</strong> ${this.formatearFecha(datos.fecha_registro)}
      </p>
    </body>
    </html>
  `;

    ventanaImpresion.document.write(htmlCompleto);
    ventanaImpresion.document.close();
  }


  exportarExcel(movimiento: any) {
    // Advertencia si está en borrador
    if (movimiento.id_estado === 1) {
      Swal.fire({
        title: 'Aviso',
        text: 'Este movimiento está en borrador. Los valores de stock mostrados pueden no reflejar el inventario real.',
        icon: 'info',
        showCancelButton: true,
        confirmButtonText: 'Exportar de todos modos',
        cancelButtonText: 'Cancelar'
      }).then((result) => {
        if (result.isConfirmed) {
          this.generarExcel(movimiento);
        }
      });
    } else {
      this.generarExcel(movimiento);
    }
  }

  private generarExcel(movimiento: any) {
    // Mostrar indicador de carga
    Swal.fire({
      title: 'Generando archivo Excel',
      text: 'Por favor espere...',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    // Obtener datos completos del movimiento
    this.movimientosService.obtenerById(movimiento.id).subscribe({
      next: (response: any) => {
        const datos = response.body;

        // Preparar datos del encabezado
        const encabezado = [
          ['COMPROBANTE DE MOVIMIENTO DE INVENTARIO'],
          [''],
          ['Movimiento #:', datos.id],
          ['Fecha:', this.formatearFecha(datos.fecha_movimiento)],
          ['Concepto:', datos.concepto],
          ['Tipo:', datos.tipo === 'E' ? 'Entrada' : datos.tipo === 'S' ? 'Salida' : 'Inventario Inicial'],
          ['Proveedor:', datos.proveedor || 'N/A'],
          ['Estado:', datos.estado],
          ['Observaciones:', datos.observaciones || 'N/A'],
          [''],
          ['Usuario Registro:', datos.usuario_registro],
          ['Fecha Registro:', this.formatearFecha(datos.fecha_registro)],
        ];

        // Si está aprobado, agregar info de aprobación
        if (datos.usuario_aprobado) {
          encabezado.push(
            ['Usuario Aprobación:', datos.usuario_aprobado],
            ['Fecha Aprobación:', this.formatearFecha(datos.fecha_aprobado)]
          );
        }

        // Si está anulado, agregar info de anulación
        if (datos.usuario_anulado) {
          encabezado.push(
            ['Usuario Anulación:', datos.usuario_anulado],
            ['Fecha Anulación:', this.formatearFecha(datos.fecha_anulado)]
          );
        }

        // Agregar advertencia si está en borrador
        if (datos.id_estado === 1) {
          encabezado.push(
            [''],
            ['*** BORRADOR - NO HA AFECTADO INVENTARIO ***'],
            ['']
          );
        }

        encabezado.push([''], ['DETALLE DE PRODUCTOS'], ['']);

        // Preparar datos del detalle
        const detalleData = datos.detalle.map((item: any) => {
          // Calcular stock final después del movimiento
          let stockFinal = 0;
          if (datos.id_estado === 1) {
            // Si es borrador, mostrar stock proyectado
            if (datos.tipo === 'E') {
              stockFinal = item.stock_anterior + item.cantidad;
            } else if (datos.tipo === 'S') {
              stockFinal = item.stock_anterior - item.cantidad;
            } else if (datos.tipo === 'I') {
              stockFinal = item.cantidad;
            }
          } else {
            // Si ya fue registrado, el stock final es el actual
            stockFinal = item.stock_actual || 0;
          }

          return {
            'Código': item.id_producto,
            'Producto': item.producto_nombre,
            'Unidad': item.abreviatura || 'UND',
            'Stock Anterior': item.stock_anterior || 0,
            'Cantidad Movimiento': item.cantidad,
            'Stock Final': stockFinal,
            'Precio Unitario': this.formatearPrecio(item.precio_unitario),
            'Subtotal': this.formatearPrecio(item.cantidad * item.precio_unitario),
            'Fecha Vencimiento': item.fecha_vencimiento ? this.formatearFecha(item.fecha_vencimiento) : 'N/A'
          };
        });

        // Calcular totales
        const totalItems = datos.detalle.length;
        const totalUnidades = datos.detalle.reduce((sum: number, item: any) => sum + item.cantidad, 0);
        const totalValor = datos.detalle.reduce((sum: number, item: any) => sum + (item.cantidad * item.precio_unitario), 0);

        // Agregar fila de totales
        const totales = [
          [''],
          ['RESUMEN'],
          ['Total Items:', totalItems],
          ['Total Unidades:', totalUnidades],
          ['Valor Total:', this.formatearPrecio(totalValor)]
        ];

        // Crear libro de Excel
        const ws = XLSX.utils.aoa_to_sheet(encabezado);

        // Agregar detalle de productos
        XLSX.utils.sheet_add_json(ws, detalleData, { origin: `A${encabezado.length + 1}` });

        // Agregar totales
        const startRow = encabezado.length + detalleData.length + 2;
        XLSX.utils.sheet_add_aoa(ws, totales, { origin: `A${startRow}` });

        // Ajustar anchos de columna
        const colWidths = [
          { wch: 15 }, // Código
          { wch: 35 }, // Producto
          { wch: 10 }, // Unidad
          { wch: 15 }, // Stock Anterior
          { wch: 18 }, // Cantidad Movimiento
          { wch: 12 }, // Stock Final
          { wch: 15 }, // Precio Unitario
          { wch: 15 }, // Subtotal
          { wch: 18 }  // Fecha Vencimiento
        ];
        ws['!cols'] = colWidths;

        // Crear libro y hoja
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, `Movimiento_${datos.id}`);

        // Generar archivo y descarga
        const fileName = `Movimiento_${datos.id}_${new Date().toISOString().slice(0, 10)}.xlsx`;
        XLSX.writeFile(wb, fileName);

        Swal.close();
        Swal.fire({
          title: 'Excel generado',
          text: 'El archivo se ha descargado correctamente.',
          icon: 'success',
          confirmButtonText: 'Aceptar'
        });
      },
      error: (error) => {
        Swal.close();
        Swal.fire({
          title: 'Error',
          text: 'Ocurrió un error al generar el archivo Excel.',
          icon: 'error',
          confirmButtonText: 'Aceptar'
        });
        console.error('Error generando Excel:', error);
      }
    });
  }

}