import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { HeaderComponent } from '../../../common/header/header.component';
import { TablasComponent } from '../../../common/tablas/tablas.component';
import { MovimientosFinancierosService } from '../../../services/movimientos-financieros.service';
import { UtilService } from '../../../common/constantes/util.service';


@Component({
  selector: 'app-aprobacion-multiple-financiero',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, TablasComponent],
  templateUrl: './aprobacion-multiple-financiero.component.html',
  styleUrl: './aprobacion-multiple-financiero.component.scss'
})
export class AprobacionMultipleFinancieroComponent implements OnInit {
  @ViewChild(TablasComponent) tablasComponent!: TablasComponent;

  public titulo = "Aprobación Múltiple de Movimientos Financieros";
  public titulos = [] as any[];
  public datos = [] as any[];
  public columnasFiltro = ['Fecha', 'Tipo', 'Concepto', 'Medio de Pago', 'Observaciones', 'Valor', 'Usuario Registro'];

  // Variables para totales
  public totalSeleccionado = 0;
  public cantidadSeleccionada = 0;
  public totalIngresos = 0;
  public totalGastos = 0;
  public balance = 0;

  constructor(
    private router: Router,
    private movimientosService: MovimientosFinancierosService,
    private utilService: UtilService
  ) { }

  ngOnInit() {
    this.crearTitulos();
    this.obtenerMovimientosPendientes();
  }

  crearTitulos() {
    this.titulos = [
      {
        clave: 'id',
        alias: 'ID',
        alinear: 'centrado',
      },
      {
        clave: 'fecha',
        alias: 'Fecha',
        alinear: 'centrado'
      },
      {
        clave: 'tipo_movimiento_nombre',
        alias: 'Tipo',
        alinear: 'centrado',
      },
      {
        clave: 'concepto_nombre',
        alias: 'Concepto',
        alinear: 'izquierda',
      },
      {
        clave: 'medio_pago_nombre',
        alias: 'Medio de Pago',
        alinear: 'izquierda',
      },
      {
        clave: 'observaciones',
        alias: 'Observaciones',
        alinear: 'izquierda',
      },
      {
        clave: 'valor',
        alias: 'Valor',
        alinear: 'derecha',
        tipo: 'currency',
        formato: { digitInfo: '1.0-0' }
      },
      {
        clave: 'referencia_externa',
        alias: 'Referencia',
        alinear: 'izquierda',
      },
      {
        clave: 'usuario_registro_nombre',
        alias: 'Usuario Registro',
        alinear: 'izquierda',
      },
      {
        clave: 'fecha_registro',
        alias: 'Fecha Registro',
        alinear: 'centrado'
      }
    ];
  }

  obtenerMovimientosPendientes() {
    this.movimientosService.obtenerPendientesAprobacion().subscribe(
      (response: any) => {
        const datos = response.body as any[];
        
        // Procesar los datos para agregar colores según el tipo
        this.datos = datos.map(item => {
          let color = '';
          if (item.tipo_movimiento_nombre === 'Ingreso') {
            color = '#e8f5e9'; // Verde muy claro para ingresos
          } else if (item.tipo_movimiento_nombre === 'Gasto') {
            color = '#ffebee'; // Rojo muy claro para gastos
          }
          
          return {
            ...item,
            valor: Number(item.valor),
            color: color
          };
        });

        console.log("Movimientos pendientes de aprobación cargados:", this.datos.length);
        
        if (this.datos.length === 0) {
          Swal.fire({
            title: 'Sin movimientos pendientes',
            text: 'No hay movimientos financieros pendientes de aprobación',
            icon: 'info',
            confirmButtonText: 'Aceptar'
          }).then(() => {
            this.router.navigate(['/administracion/financiero']);
          });
        }
      },
      error => {
        console.error('Error al cargar movimientos pendientes:', error);
        Swal.fire({
          title: 'Error',
          text: 'No se pudieron cargar los movimientos pendientes de aprobación',
          icon: 'error',
          confirmButtonText: 'Aceptar'
        });
      }
    );
  }

  // Método llamado cuando cambia la selección en la tabla
  onSeleccionCambiada(seleccionados: any[]) {
    this.cantidadSeleccionada = seleccionados.length;
    this.totalSeleccionado = 0;
    this.totalIngresos = 0;
    this.totalGastos = 0;
    
    seleccionados.forEach(item => {
      const valor = item.valor || 0;
      this.totalSeleccionado += valor;
      
      if (item.tipo_movimiento_nombre === 'Ingreso') {
        this.totalIngresos += valor;
      } else if (item.tipo_movimiento_nombre === 'Gasto') {
        this.totalGastos += valor;
      }
    });
    
    this.balance = this.totalIngresos - this.totalGastos;
  }

  aprobarSeleccionados() {
    if (!this.tablasComponent) {
      return;
    }

    const seleccionados = this.tablasComponent.obtenerSeleccionados();

    if (seleccionados.length === 0) {
      Swal.fire({
        title: 'Sin selección',
        text: 'Debe seleccionar al menos un movimiento para aprobar',
        icon: 'warning',
        confirmButtonText: 'Aceptar'
      });
      return;
    }

    // Contar ingresos y gastos
    const ingresos = seleccionados.filter(m => m.tipo_movimiento_nombre === 'Ingreso');
    const gastos = seleccionados.filter(m => m.tipo_movimiento_nombre === 'Gasto');
    
    // Mostrar confirmación con resumen
    Swal.fire({
      title: '¿Confirmar aprobación múltiple?',
      html: `
        <div style="text-align: left;">
          <p>Se aprobarán <strong>${seleccionados.length}</strong> movimientos financieros:</p>
          <div style="margin: 15px 0; padding: 10px; background-color: #f8f9fa; border-radius: 5px;">
            ${ingresos.length > 0 ? `
              <p style="color: #28a745; margin: 5px 0;">
                <i class="fas fa-arrow-up"></i> <strong>${ingresos.length}</strong> Ingresos: 
                <strong>$${this.totalIngresos.toLocaleString('es-CO')}</strong>
              </p>` : ''}
            ${gastos.length > 0 ? `
              <p style="color: #dc3545; margin: 5px 0;">
                <i class="fas fa-arrow-down"></i> <strong>${gastos.length}</strong> Gastos: 
                <strong>$${this.totalGastos.toLocaleString('es-CO')}</strong>
              </p>` : ''}
            <hr style="margin: 10px 0;">
            <p style="margin: 5px 0;">
              <strong>Balance: </strong>
              <span style="color: ${this.balance >= 0 ? '#28a745' : '#dc3545'}; font-size: 1.1em;">
                $${this.balance.toLocaleString('es-CO')}
              </span>
            </p>
          </div>
          <p class="text-muted"><small>Esta acción no se puede deshacer</small></p>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, aprobar todos',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#28a745',
      cancelButtonColor: '#6c757d',
      reverseButtons: true,
      input: 'textarea',
      inputPlaceholder: 'Observaciones de aprobación (opcional)',
      inputAttributes: {
        'aria-label': 'Observaciones'
      }
    }).then((result) => {
      if (result.isConfirmed) {
        this.procesarAprobacion(seleccionados, result.value || '');
      }
    });
  }

  procesarAprobacion(seleccionados: any[], observaciones: string) {
    // Mostrar loading
    Swal.fire({
      title: 'Aprobando movimientos',
      html: 'Procesando ' + seleccionados.length + ' movimientos...<br>Por favor espere.',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    // TODO: Obtener el ID del usuario actual del servicio de autenticación
    const idUsuarioActual = this.utilService.obtenerIdUsuarioActual();
    const fechaAprobacion = this.obtenerFechaHoraColombia();

    const body = {
      ids: seleccionados.map(item => item.id),
      id_usuario_aprobacion: idUsuarioActual,
      fecha_aprobacion: fechaAprobacion,
      observaciones_aprobacion: observaciones || 'Aprobación múltiple de movimientos financieros'
    };

    this.movimientosService.aprobarMultiple(body).subscribe(
      (response: any) => {
        const resultado = response.body || response;

        if (resultado && resultado.success) {
          Swal.fire({
            title: '¡Aprobación exitosa!',
            html: `
              <p><strong>${resultado.aprobados || seleccionados.length}</strong> movimientos aprobados correctamente</p>
              ${resultado.errores && resultado.errores.length > 0 ?
                `<p class="text-warning">${resultado.errores.length} movimientos no pudieron ser aprobados</p>` : ''}
            `,
            icon: 'success',
            confirmButtonText: 'Aceptar'
          }).then(() => {
            // Limpiar selección y recargar datos
            if (this.tablasComponent) {
              this.tablasComponent.limpiarSeleccion();
            }
            this.obtenerMovimientosPendientes();
            this.onSeleccionCambiada([]);
          });
        } else {
          Swal.fire({
            title: 'Error',
            text: resultado.message || 'Ocurrió un error al aprobar los movimientos',
            icon: 'error',
            confirmButtonText: 'Aceptar'
          });
        }
      },
      error => {
        console.error('Error al aprobar:', error);
        Swal.fire({
          title: 'Error',
          text: 'Ocurrió un error al procesar la aprobación múltiple',
          icon: 'error',
          confirmButtonText: 'Aceptar'
        });
      }
    );
  }

  private obtenerFechaHoraColombia(): string {
    const now = new Date();
    const colombiaTime = new Date(now.toLocaleString("en-US", { timeZone: "America/Bogota" }));
    
    const year = colombiaTime.getFullYear();
    const month = String(colombiaTime.getMonth() + 1).padStart(2, '0');
    const day = String(colombiaTime.getDate()).padStart(2, '0');
    const hours = String(colombiaTime.getHours()).padStart(2, '0');
    const minutes = String(colombiaTime.getMinutes()).padStart(2, '0');
    const seconds = String(colombiaTime.getSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }

  regresar() {
    this.router.navigate(['/administracion/financiero']);
  }
}