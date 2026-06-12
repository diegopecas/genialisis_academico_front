import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

import Swal from 'sweetalert2';
import { UtilService } from '../../../../common/constantes/util.service';
import { HeaderComponent } from '../../../../common/header/header.component';
import { ColaboradoresService } from '../../../../services/colaboradores.service';
import { NominasService } from '../../../../services/nominas.service';
import { PrestamosPagosService } from '../../../../services/prestamos-pagos.service';
import { PrestamosService } from '../../../../services/prestamos.service';

@Component({
  selector: 'app-crear-colaboradores-prestamos-pagos',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, RouterModule],
  templateUrl: './crear-colaboradores-prestamos-pagos.component.html',
  styleUrl: './crear-colaboradores-prestamos-pagos.component.scss'
})
export class CrearColaboradoresPrestamosPagosComponent implements OnInit {
  public titulo = "Registrar Pago de Préstamo";
  public idPrestamo = 0;
  public idColaborador = 0;
  
  public prestamo: any = {};
  public colaborador: any = {};
  public cuotasPendientes: any[] = [];
  public cuotasSeleccionadas: number[] = [];
  public nominas: any[] = [];
  
  public tipoPago: 'nomina' | 'manual' = 'manual';
  
  public pago: any = {
    id_prestamo: 0,
    id_nomina: null,
    fecha_pago: '',
    monto_pagado: 0,
    id_tipo_pago: 2, // 1=Nómina, 2=Manual, 3=Anticipado
    referencia: '',
    observaciones: '',
    cuotas: []
  };

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private prestamosPagosService: PrestamosPagosService,
    private prestamosService: PrestamosService,
    private colaboradoresService: ColaboradoresService,
    private nominasService: NominasService,
    private utilService: UtilService
  ) { }

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.idPrestamo = params['idPrestamo'];
      this.idColaborador = params['idColaborador'];
      
      this.pago.id_prestamo = this.idPrestamo;
      this.pago.fecha_pago = new Date().toISOString().split('T')[0];
      
      this.cargarDatos();
    });
  }

  cargarDatos() {
    this.obtenerColaborador();
    this.obtenerPrestamo();
    this.obtenerCuotasPendientes();
    this.obtenerNominas();
  }

  obtenerColaborador() {
    this.colaboradoresService.obtenerById(this.idColaborador).subscribe(
      (response: any) => {
        const datos = response.body as any[];
        if (datos && datos.length > 0) {
          this.colaborador = datos[0];
        }
      },
      (error: any) => console.error('Error al obtener colaborador:', error)
    );
  }

  obtenerPrestamo() {
    this.prestamosService.obtener(this.idPrestamo).subscribe(
      (response: any) => {
        const datos = response.body as any[];
        if (datos && datos.length > 0) {
          this.prestamo = datos[0];
          this.titulo = `Registrar Pago - Préstamo #${this.prestamo.id}`;
        }
      },
      (error: any) => console.error('Error al obtener préstamo:', error)
    );
  }

  obtenerCuotasPendientes() {
    this.prestamosPagosService.obtenerCuotasConSaldo(this.idPrestamo).subscribe(
      (response: any) => {
        this.cuotasPendientes = response.body as any[];
      },
      (error: any) => {
        console.error('Error al obtener cuotas pendientes:', error);
        Swal.fire({
          title: 'Error',
          text: 'No se pudieron cargar las cuotas pendientes',
          icon: 'error',
          confirmButtonText: 'Aceptar'
        });
      }
    );
  }

  obtenerNominas() {
    this.nominasService.obtenerTodos().subscribe(
      (response: any) => {
        this.nominas = response.body as any[];
      },
      (error: any) => console.error('Error al obtener nóminas:', error)
    );
  }

  cambiarTipoPago(tipo: 'nomina' | 'manual') {
    this.tipoPago = tipo;
    
    if (tipo === 'nomina') {
      this.pago.id_tipo_pago = 1;
      this.pago.id_nomina = null;
    } else {
      this.pago.id_tipo_pago = 2;
      this.pago.id_nomina = null;
    }
  }

  toggleCuota(idCuota: number) {
    const index = this.cuotasSeleccionadas.indexOf(idCuota);
    
    if (index > -1) {
      // Desmarcar
      this.cuotasSeleccionadas.splice(index, 1);
    } else {
      // Marcar
      this.cuotasSeleccionadas.push(idCuota);
    }
    
    this.calcularMontoSugerido();
  }

  isCuotaSeleccionada(idCuota: number): boolean {
    return this.cuotasSeleccionadas.includes(idCuota);
  }

  calcularMontoSugerido() {
    let total = 0;
    
    this.cuotasSeleccionadas.forEach(idCuota => {
      const cuota = this.cuotasPendientes.find(c => c.id === idCuota);
      if (cuota) {
        total += parseFloat(cuota.saldo);
      }
    });
    
    this.pago.monto_pagado = Math.round(total);
  }

  seleccionarTodasCuotas() {
    if (this.cuotasSeleccionadas.length === this.cuotasPendientes.length) {
      // Desmarcar todas
      this.cuotasSeleccionadas = [];
    } else {
      // Marcar todas
      this.cuotasSeleccionadas = this.cuotasPendientes.map(c => c.id);
    }
    
    this.calcularMontoSugerido();
  }

  formatearMontoPagado(event: any) {
    const input = event.target.value.replace(/[^\d]/g, '');
    const numero = parseFloat(input) || 0;
    this.pago.monto_pagado = numero;
    event.target.value = this.formatearValorConSeparador(numero);
  }

  onFocusMontoPagado(event: any) {
    event.target.select();
  }

  obtenerMontoPagadoFormateado(): string {
    return this.formatearValorConSeparador(this.pago.monto_pagado);
  }

  formatearValorConSeparador(valor: any): string {
    if (!valor) return '0';
    const numero = typeof valor === 'string' ? parseFloat(valor) : valor;
    return numero.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }

  validarDatos(): boolean {
    if (this.cuotasSeleccionadas.length === 0) {
      Swal.fire({
        title: 'Datos incompletos',
        text: 'Debe seleccionar al menos una cuota para pagar',
        icon: 'warning',
        confirmButtonText: 'Aceptar'
      });
      return false;
    }

    if (!this.pago.monto_pagado || this.pago.monto_pagado <= 0) {
      Swal.fire({
        title: 'Datos incompletos',
        text: 'Debe especificar un monto válido',
        icon: 'warning',
        confirmButtonText: 'Aceptar'
      });
      return false;
    }

    if (!this.pago.fecha_pago) {
      Swal.fire({
        title: 'Datos incompletos',
        text: 'Debe especificar la fecha de pago',
        icon: 'warning',
        confirmButtonText: 'Aceptar'
      });
      return false;
    }

    if (this.tipoPago === 'nomina' && !this.pago.id_nomina) {
      Swal.fire({
        title: 'Datos incompletos',
        text: 'Debe seleccionar una nómina',
        icon: 'warning',
        confirmButtonText: 'Aceptar'
      });
      return false;
    }

    // Validar que el monto no exceda el total de saldos de las cuotas seleccionadas
    const totalSaldos = this.cuotasSeleccionadas.reduce((sum, idCuota) => {
      const cuota = this.cuotasPendientes.find(c => c.id === idCuota);
      return sum + (cuota ? parseFloat(cuota.saldo) : 0);
    }, 0);

    if (this.pago.monto_pagado > totalSaldos) {
      Swal.fire({
        title: 'Monto excedido',
        html: `
          <p>El monto a pagar excede el saldo de las cuotas seleccionadas.</p>
          <p><strong>Monto a pagar:</strong> $${this.formatearValorConSeparador(this.pago.monto_pagado)}</p>
          <p><strong>Saldo total:</strong> $${this.formatearValorConSeparador(totalSaldos)}</p>
        `,
        icon: 'error',
        confirmButtonText: 'Aceptar'
      });
      return false;
    }

    return true;
  }

  guardar() {
    if (!this.validarDatos()) {
      return;
    }

    const body = {
      ...this.pago,
      cuotas: this.cuotasSeleccionadas,
      id_usuario_registro: this.utilService.obtenerIdUsuarioActual()
    };

    // Confirmación
    Swal.fire({
      title: '¿Registrar pago?',
      html: `
        <div class="text-start">
          <p><strong>Préstamo:</strong> #${this.prestamo.id}</p>
          <p><strong>Colaborador:</strong> ${this.colaborador.nombre_completo}</p>
          <p><strong>Cuotas:</strong> ${this.cuotasSeleccionadas.length}</p>
          <p><strong>Monto:</strong> $${this.formatearValorConSeparador(this.pago.monto_pagado)}</p>
          <p><strong>Tipo:</strong> ${this.tipoPago === 'nomina' ? 'Descuento de Nómina' : 'Pago Manual'}</p>
          <hr>
          <p class="text-muted small">Se actualizarán las cuotas y el saldo del préstamo</p>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, registrar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#28a745'
    }).then((result) => {
      if (result.isConfirmed) {
        this.prestamosPagosService.crear(body).subscribe(
          (response: any) => {
            Swal.fire({
              title: '¡Éxito!',
              text: 'El pago ha sido registrado correctamente',
              icon: 'success',
              confirmButtonText: 'Aceptar',
              timer: 2000
            }).then(() => {
              this.router.navigate([
                '/colaboradores-prestamos/ver',
                this.idPrestamo,
                this.idColaborador
              ]);
            });
          },
          (error: any) => {
            console.error('Error al registrar pago:', error);
            Swal.fire({
              title: 'Error',
              text: error.error?.error || 'No se pudo registrar el pago',
              icon: 'error',
              confirmButtonText: 'Aceptar'
            });
          }
        );
      }
    });
  }

  cancelar() {
    this.router.navigate([
      '/colaboradores-prestamos/ver',
      this.idPrestamo,
      this.idColaborador
    ]);
  }
}