import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { HeaderComponent } from '../../../common/header/header.component';
import { TablasComponent } from '../../../common/tablas/tablas.component';
import { MovimientosProductosService } from '../../../services/movimientos-productos.service';
import { ConceptosMovimientoService } from '../../../services/conceptos-movimiento.service';
import { UtilService } from '../../../common/constantes/util.service';

@Component({
  selector: 'app-salidas-alimentacion',
  templateUrl: './salidas-alimentacion.component.html',
  styleUrls: ['./salidas-alimentacion.component.scss'],
  standalone: true,
  imports: [CommonModule, HeaderComponent, TablasComponent]
})
export class SalidasAlimentacionComponent implements OnInit {
  
  titulo = "Salidas de Alimentación";
  public columnasFiltro = ['Fecha', 'Concepto', 'Clasificación', 'Estado', 'Usuario'];
  public titulos = [] as any[];
  public datos = [] as any[];
  public conceptosAlimentacion = [] as any[];
  
  public acciones = [
    { id: 'registrar', label: 'Registrar', icono: '/assets/images/registrar.png' },
    { id: 'anular', label: 'Anular', icono: '/assets/images/anular.png' }
  ] as any[];

  constructor(
    private movimientosService: MovimientosProductosService,
    private conceptosService: ConceptosMovimientoService,
    private router: Router,
    private utilService: UtilService
  ) { }

  ngOnInit(): void {
    this.crearTitulos();
    this.obtenerConceptosAlimentacion();
    this.obtenerSalidasAlimentacion();
  }

  obtenerConceptosAlimentacion() {
    this.conceptosService.obtenerTodos().subscribe((response: any) => {
      const body = response.body as any[];
      // Filtrar solo conceptos de salida que contengan "alimentación"
      this.conceptosAlimentacion = body.filter(c => 
        c.tipo === 'S' && 
        c.nombre.toLowerCase().includes('alimentación')
      );
      console.log("Conceptos de alimentación:", this.conceptosAlimentacion);
    });
  }

  obtenerSalidasAlimentacion() {
    this.movimientosService.obtenerTodos().subscribe((response: any) => {
      const body = response.body as any[];
      
      // Filtrar solo movimientos de salida por alimentación
      const salidasAlimentacion = body.filter((m: any) => {
        return m.tipo === 'S' && 
               m.concepto && 
               m.concepto.toLowerCase().includes('alimentación');
      });

      this.datos = salidasAlimentacion.map((m: any) => {
        // Formatear fecha
        m.fecha_formateada = this.formatearFecha(m.fecha_movimiento);
        
        // Formatear valores
        m.total_valor_formateado = this.formatearPrecio(m.total_valor || 0);
        
        // Extraer clasificación del concepto (ej: "Salida por Alimentación - Desayuno" → "Desayuno")
        const partes = m.concepto.split(' - ');
        m.clasificacion = partes.length > 1 ? partes[1] : 'General';
        
        // Color y badge según estado
        switch(m.id_estado) {
          case 1: // EN PROCESO DE REGISTRO
            m.color = "#fff3cd";
            m.estado_color = "badge bg-warning";
            m.puede_registrar = true;
            m.puede_anular = true;
            m.puede_editar = true;
            break;
          case 2: // REGISTRADO
            m.color = "#d4edda";
            m.estado_color = "badge bg-primary";
            m.puede_registrar = false;
            m.puede_anular = true;
            m.puede_editar = false;
            break;
          case 3: // APROBADO
            m.color = "#e8f5e9";
            m.estado_color = "badge bg-success";
            m.puede_registrar = false;
            m.puede_anular = true;
            m.puede_editar = false;
            break;
          case 4: // ANULADO
            m.color = "#ffebee";
            m.estado_color = "badge bg-danger";
            m.puede_registrar = false;
            m.puede_anular = false;
            m.puede_editar = false;
            break;
        }
        
        return m;
      });

      console.log("Salidas de alimentación:", this.datos);
    });
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
        clave: 'clasificacion',
        alias: 'Clasificación',
        alinear: 'centrado',
        tipo: 'html',
        formatoHtml: (fila: any) => `<span class="badge bg-info">${fila.clasificacion}</span>`
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
    console.log("Acción", $event);
    const salida = $event.registro;
    
    switch ($event.accion) {
      case 'consultar':
        this.router.navigate(['operaciones/salidas-alimentacion/consultar/' + salida.id]);
        break;
      case 'editar':
        if (salida.puede_editar) {
          this.router.navigate(['operaciones/salidas-alimentacion/editar/' + salida.id]);
        } else {
          Swal.fire('No permitido', 'Solo se pueden editar movimientos en estado EN PROCESO DE REGISTRO', 'warning');
        }
        break;
      case 'registrar':
        this.registrarSalida(salida);
        break;
      case 'anular':
        this.anularSalida(salida);
        break;
    }
  }

  async registrarSalida(salida: any) {
    // Validar que esté en estado EN PROCESO DE REGISTRO
    if (!salida.puede_registrar) {
      Swal.fire('No permitido', 'Este movimiento no puede ser registrado', 'warning');
      return;
    }

    const result = await Swal.fire({
      title: '¿Registrar salida de alimentación?',
      html: `
        <div class="alert alert-info">
          <i class="fas fa-info-circle"></i> <strong>Importante:</strong><br>
          Al registrar esta salida se actualizará el inventario de los productos.<br>
          Esta acción no se puede deshacer, solo anular posteriormente.
        </div>
        <p>¿Desea registrar la salida #${salida.id}?</p>
        <p><strong>Clasificación:</strong> ${salida.clasificacion}</p>
        <p><strong>Items:</strong> ${salida.total_items}</p>
        <p><strong>Cantidad total:</strong> ${salida.total_unidades}</p>
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
        title: 'Registrando salida',
        text: 'Actualizando inventario...',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      this.movimientosService.registrar(salida.id).subscribe({
        next: (response: any) => {
          Swal.fire({
            title: 'Registrado',
            text: 'La salida ha sido registrada y el inventario ha sido actualizado',
            icon: 'success',
            confirmButtonText: 'Aceptar'
          });
          this.obtenerSalidasAlimentacion();
        },
        error: (error: any) => {
          console.error("Error al registrar salida", error);
          Swal.fire('Error', error.error?.error || 'No se pudo registrar la salida', 'error');
        }
      });
    }
  }

  async anularSalida(salida: any) {
    if (!salida.puede_anular) {
      Swal.fire('No permitido', 'Este movimiento no puede ser anulado', 'warning');
      return;
    }

    let mensajeAdvertencia = '';
    if (salida.id_estado === 1) {
      mensajeAdvertencia = `
        <div class="alert alert-info">
          Este movimiento está en borrador y no ha afectado el inventario.
        </div>
      `;
    } else {
      mensajeAdvertencia = `
        <div class="alert alert-warning">
          <i class="fas fa-exclamation-triangle"></i> <strong>Importante:</strong><br>
          Esta salida ya afectó el inventario.<br>
          Al anularla se revertirán los cambios en el stock de los productos.
        </div>
      `;
    }

    const result = await Swal.fire({
      title: '¿Anular salida?',
      html: `
        ${mensajeAdvertencia}
        <p>¿Desea anular la salida #${salida.id}?</p>
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
      
      this.movimientosService.anular(salida.id, usuarioActual).subscribe({
        next: (response: any) => {
          const mensaje = salida.id_estado === 1 ? 
            'La salida ha sido anulada' : 
            'La salida ha sido anulada y el inventario ha sido revertido';
          Swal.fire('Anulado', mensaje, 'success');
          this.obtenerSalidasAlimentacion();
        },
        error: (error: any) => {
          console.error("Error al anular salida", error);
          Swal.fire('Error', error.error?.error || 'No se pudo anular la salida', 'error');
        }
      });
    }
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
}