import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

import Swal from 'sweetalert2';
import { MovimientosProductosService } from '../../../../services/movimientos-productos.service';
import { InstitucionConfigService } from '../../../../services/institucion-config.service';


@Component({
  selector: 'app-movimiento-comprobante',
  templateUrl: './movimiento-comprobante.component.html',
  styleUrl: './movimiento-comprobante.component.scss',
  standalone: true,
  imports: [CommonModule]
})
export class MovimientoComprobanteComponent implements OnInit {
  
  public movimiento: any = {};
  public detalle: any[] = [];
  public totalItems = 0;
  public totalUnidades = 0;
  public totalValor = 0;
  public fechaImpresion = new Date();
  
  // Configuración dinámica de institución
  public logoUrl: string = '';
  
  // Nombres de usuarios para las firmas
  public nombreUsuarioRegistro = '';
  public nombreUsuarioAprobado = '';
  
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private movimientosService: MovimientosProductosService,
    private institucionConfigService: InstitucionConfigService
  ) { }

  ngOnInit(): void {
    // Cargar configuración dinámica
    this.logoUrl = this.institucionConfigService.getLogoUrl();
    
    this.route.params.subscribe(params => {
      const id = params['id'];
      this.obtenerDatosMovimiento(id);
    });
  }

  obtenerDatosMovimiento(id: string) {
    this.movimientosService.obtenerDatosComprobante(id).subscribe({
      next: (response: any) => {
        this.movimiento = response.body;
        this.detalle = this.movimiento.detalle || [];
        this.calcularTotales();
        this.procesarDetalle();
        this.obtenerNombresUsuarios();
      },
      error: (error) => {
        console.error('Error obteniendo datos del movimiento:', error);
        Swal.fire({
          title: 'Error',
          text: 'No se pudieron obtener los datos del movimiento.',
          icon: 'error',
          confirmButtonText: 'Aceptar'
        }).then(() => {
          this.router.navigate(['/operaciones/movimientos-productos']);
        });
      }
    });
  }

  procesarDetalle() {
    this.detalle = this.detalle.map(item => {
      // Calcular stock final después del movimiento
      let stockFinal = 0;
      if (this.movimiento.tipo === 'E') {
        stockFinal = (item.stock_anterior || 0) + item.cantidad;
      } else if (this.movimiento.tipo === 'S') {
        stockFinal = (item.stock_anterior || 0) - item.cantidad;
      } else if (this.movimiento.tipo === 'I') {
        stockFinal = item.cantidad;
      }

      return {
        ...item,
        stock_final: stockFinal,
        subtotal: item.cantidad * item.precio_unitario
      };
    });
  }

  calcularTotales() {
    this.totalItems = this.detalle.length;
    this.totalUnidades = this.detalle.reduce((sum, item) => sum + item.cantidad, 0);
    this.totalValor = this.detalle.reduce((sum, item) => sum + (item.cantidad * item.precio_unitario), 0);
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

  getTipoMovimiento(): string {
    switch(this.movimiento.tipo) {
      case 'E': return 'ENTRADA';
      case 'S': return 'SALIDA';
      case 'I': return 'INVENTARIO INICIAL';
      default: return '';
    }
  }

  getColorTipo(): string {
    switch(this.movimiento.tipo) {
      case 'E': return 'text-success';
      case 'S': return 'text-danger';
      case 'I': return 'text-info';
      default: return '';
    }
  }

  getEstadoColor(): string {
    switch(this.movimiento.id_estado) {
      case 1: return 'badge bg-warning';
      case 2: return 'badge bg-primary';
      case 3: return 'badge bg-success';
      case 4: return 'badge bg-danger';
      default: return 'badge bg-secondary';
    }
  }

  imprimir() {
    window.print();
  }

  regresar() {
    this.router.navigate(['/operaciones/movimientos-productos']);
  }

  obtenerNombresUsuarios() {
    this.nombreUsuarioRegistro = this.movimiento.nombre_usuario_registro || 
                                 this.formatearNombreUsuario(this.movimiento.usuario_registro);
    this.nombreUsuarioAprobado = this.movimiento.nombre_usuario_aprobado || 
                                 this.formatearNombreUsuario(this.movimiento.usuario_aprobado);
  }

  formatearNombreUsuario(username: string): string {
    if (!username) return '';
    
    // Si el username es algo como "juan.perez" o "juan_perez", lo convertimos a "Juan Perez"
    return username
      .replace(/[._-]/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }
  
}