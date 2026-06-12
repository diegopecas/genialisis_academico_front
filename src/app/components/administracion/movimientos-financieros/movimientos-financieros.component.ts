import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

import Swal from 'sweetalert2';
import { TablasComponent } from '../../../common/tablas/tablas.component';
import { HeaderComponent } from '../../../common/header/header.component';
import { MovimientosFinancierosService } from '../../../services/movimientos-financieros.service';
import { UtilService } from '../../../common/constantes/util.service';

@Component({
  selector: 'app-movimientos-financieros',
  standalone: true,
  imports: [CommonModule, HeaderComponent, TablasComponent],
  templateUrl: './movimientos-financieros.component.html',
  styleUrl: './movimientos-financieros.component.scss'
})
export class MovimientosFinancierosComponent implements OnInit {
  titulo = 'Movimientos Financieros';
  path = 'administracion/financiero/movimientos-financieros';
  
  datos: any[] = [];
  titulos: any[] = [
    { clave: 'id', alias: 'ID', alinear: 'centrado' },
    { clave: 'fecha', alias: 'Fecha', alinear: 'centrado' },
    { clave: 'tipo_movimiento_nombre', alias: 'Tipo', alinear: 'izquierda' },
    { clave: 'concepto_nombre', alias: 'Concepto', alinear: 'izquierda' },
    { clave: 'medio_pago_nombre', alias: 'Medio de Pago', alinear: 'izquierda' },
    { clave: 'observaciones', alias: 'Observaciones', alinear: 'izquierda' },
    { clave: 'valor', alias: 'Valor', alinear: 'derecha' },
    { clave: 'estado', alias: 'Estado', alinear: 'centrado' },
    { clave: 'usuario_registro_nombre', alias: 'Usuario Registro', alinear: 'izquierda' },
    { clave: 'usuario_estado', alias: 'Usuario Estado', alinear: 'izquierda' },
    { clave: 'fecha_registro', alias: 'Fecha Registro', alinear: 'centrado' }
  ];
  
  columnasFiltro: string[] = [
    'ID',
    'Fecha',
    'Tipo',
    'Concepto',
    'Medio de Pago',
    'Observaciones',
    'Valor',
    'Estado',
    'Usuario Registro',
    'Usuario Estado',
    'Fecha Registro'
  ];

  acciones: any[] = [];  // Sin acciones adicionales, solo las por defecto

  constructor(
    private movimientosService: MovimientosFinancierosService,
    private router: Router,
    private utilService: UtilService
  ) { }

  ngOnInit(): void {
    this.cargarMovimientos();
  }

  cargarMovimientos(): void {
    this.movimientosService.obtenerTodos().subscribe({
      next: (response: any) => {
        const respuesta: any = response.body;
        
        this.datos = respuesta.map((item: any) => {
          // Determinar el estado basándose en el campo 'estado' que viene del backend
          let estado = item.estado || 'Registrado';
          
          // Si el estado no viene del backend, determinarlo por los campos
          if (!item.estado) {
            if (item.anulado === 1) {
              estado = 'Anulado';
            } else if (item.id_usuario_aprobacion) {
              estado = 'Aprobado';
            } else {
              estado = 'Registrado';
            }
          }
          
          // Determinar el color de la fila según el estado
          let color = '';
          if (estado === 'Anulado') {
            color = '#d1d1d1'; // Gris más oscuro y visible para anulados
          } else if (estado === 'Aprobado') {
            color = '#d4edda'; // Verde pastel para aprobados
          } else if (estado === 'Registrado') {
            color = ''; // Sin color para registrados normales
          }

          // Determinar el usuario según el estado
          let usuarioEstado = item.usuario_registro_nombre;
          if (estado === 'Anulado') {
            usuarioEstado = item.usuario_anulacion_nombre || item.usuario_registro_nombre;
          } else if (estado === 'Aprobado') {
            usuarioEstado = item.usuario_aprobacion_nombre || item.usuario_registro_nombre;
          }
          
          // Retornar el item con las nuevas propiedades
          return {
            ...item,
            valor: Number(item.valor),
            estado: estado,
            color: color,
            usuario_estado: usuarioEstado
          };
        });
        
        console.log('Datos procesados:', this.datos);
      },
      error: (error: any) => {
        console.error('Error al cargar movimientos:', error);
        Swal.fire('Error', 'Error al cargar los movimientos financieros', 'error');
      }
    });
  }

  obtenerEstado(movimiento: any): string {
    if (movimiento.anulado === 1) {
      return 'Anulado';
    } else if (movimiento.id_usuario_aprobacion) {
      return 'Aprobado';
    } else {
      return 'Registrado';
    }
  }

  seleccionar(evento: any): void {
    const accion = evento.accion;
    const item = evento.registro || evento.item;

    // Verificar si el registro está anulado antes de permitir ciertas acciones
    if (item.anulado === 1 || item.estado === 'Anulado') {
      if (accion === 'editar') {
        Swal.fire({
          title: 'Acción no permitida',
          text: 'No se puede editar un movimiento que está anulado.',
          icon: 'warning',
          confirmButtonText: 'Aceptar'
        });
        return;
      }
      else if (accion === 'eliminar') {
        Swal.fire({
          title: 'Acción no permitida',
          text: 'No se puede anular un movimiento que ya está anulado.',
          icon: 'warning',
          confirmButtonText: 'Aceptar'
        });
        return;
      }
    }

    switch (accion) {
      case 'consultar':
        this.router.navigate(['administracion/financiero/movimientos-financieros/ver', item.id]);
        break;
      case 'editar':
        this.router.navigate(['administracion/financiero/movimientos-financieros/editar', item.id]);
        break;
      case 'eliminar':
        this.anularMovimiento(item);
        break;
    }
  }

  anularMovimiento(movimiento: any): void {
    // Verificar si el movimiento ya está anulado
    if (movimiento.anulado === 1) {
      Swal.fire({
        title: 'Movimiento ya anulado',
        text: 'Este movimiento ya se encuentra anulado en el sistema.',
        icon: 'info',
        confirmButtonText: 'Aceptar'
      });
      return;
    }

    // Verificar si el movimiento está aprobado
    if (movimiento.id_usuario_aprobacion) {
      Swal.fire({
        title: '¿Está seguro?',
        text: 'Este movimiento ya está aprobado. ¿Desea continuar con la anulación?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Continuar',
        cancelButtonText: 'Cancelar'
      }).then((result) => {
        if (result.isConfirmed) {
          this.mostrarModalAnulacion(movimiento);
        }
      });
    } else {
      this.mostrarModalAnulacion(movimiento);
    }
  }

  private mostrarModalAnulacion(movimiento: any): void {
    // Mostrar ventana de confirmación con campo de motivo
    Swal.fire({
      title: '¿Está seguro de anular este movimiento?',
      html: `
        <div style="text-align: left; margin-bottom: 15px;">
          <p><strong>Concepto:</strong> ${movimiento.concepto_nombre || ''}</p>
          <p><strong>Valor:</strong> $${Number(movimiento.valor).toLocaleString('es-CO')}</p>
          <p><strong>Fecha:</strong> ${movimiento.fecha || ''}</p>
          <p style="color: #dc3545; font-weight: bold;">Esta acción no se puede deshacer.</p>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, anular',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc3545',
      reverseButtons: true,
      input: 'textarea',
      inputPlaceholder: 'Motivo de anulación (requerido)',
      inputAttributes: {
        'aria-label': 'Motivo de anulación',
        'style': 'min-height: 80px;'
      },
      inputValidator: (value) => {
        if (!value || value.trim().length < 5) {
          return 'Debe ingresar un motivo de anulación (mínimo 5 caracteres)';
        }
        return null;
      }
    }).then((result) => {
      if (result.isConfirmed) {
        // Obtener el ID del usuario actual
        const idUsuarioActual = this.utilService.obtenerIdUsuarioActual();

        if (!idUsuarioActual) {
          Swal.fire('Error', 'No se pudo obtener el usuario actual. Inicie sesión nuevamente.', 'error');
          return;
        }

        // Guardar el motivo de anulación
        const motivoAnulacion = result.value.trim();

        // Mostrar indicador de carga
        Swal.fire({
          title: 'Anulando movimiento',
          text: 'Por favor espere...',
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading();
          }
        });

        // Llamar al servicio de anulación con los parámetros correctos
        this.movimientosService.anular(movimiento.id, idUsuarioActual).subscribe({
          next: (response) => {
            Swal.fire({
              title: '¡Anulado!',
              text: 'El movimiento ha sido anulado exitosamente.',
              icon: 'success',
              confirmButtonText: 'Aceptar'
            }).then(() => {
              this.cargarMovimientos();
            });
          },
          error: (error: any) => {
            console.error('Error al anular movimiento:', error);
            Swal.fire({
              title: 'Error',
              text: error.error?.message || 'Ha ocurrido un error al intentar anular el movimiento.',
              icon: 'error',
              confirmButtonText: 'Aceptar'
            });
          }
        });
      } else if (result.dismiss === Swal.DismissReason.cancel) {
        Swal.fire({
          title: 'Operación cancelada',
          text: 'El movimiento no ha sido anulado.',
          icon: 'info',
          confirmButtonText: 'Aceptar'
        });
      }
    });
  }

  private obtenerFechaHoraColombia(): string {
    const now = new Date();
    // Crear fecha en zona horaria de Colombia (America/Bogota)
    const colombiaTime = new Date(now.toLocaleString("en-US", { timeZone: "America/Bogota" }));
    
    const year = colombiaTime.getFullYear();
    const month = String(colombiaTime.getMonth() + 1).padStart(2, '0');
    const day = String(colombiaTime.getDate()).padStart(2, '0');
    const hours = String(colombiaTime.getHours()).padStart(2, '0');
    const minutes = String(colombiaTime.getMinutes()).padStart(2, '0');
    const seconds = String(colombiaTime.getSeconds()).padStart(2, '0');
    
    // Formato: YYYY-MM-DD HH:MM:SS (formato MySQL datetime)
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }
}