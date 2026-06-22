import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HeaderComponent } from '../../../../../common/header/header.component';
import { PrestamosService } from '../../../../../services/prestamos.service';
import { PrestamosCuotasService } from '../../../../../services/prestamos-cuotas.service';
import { ColaboradoresService } from '../../../../../services/colaboradores.service';
import { TiposPrestamoService } from '../../../../../services/tipos-prestamo.service';
import { TiposDescuentoPrestamoService } from '../../../../../services/tipos-descuento-prestamo.service';
import { EstadosPrestamoService } from '../../../../../services/estados-prestamo.service';
import { UtilService } from '../../../../../common/constantes/util.service';
import Swal from 'sweetalert2';
import { PrestamosPagosService } from '../../../../../services/prestamos-pagos.service';

@Component({
  selector: 'app-crear-colaboradores-prestamos',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, RouterModule],
  templateUrl: './crear-colaboradores-prestamos.component.html',
  styleUrl: './crear-colaboradores-prestamos.component.scss'
})
export class CrearColaboradoresPrestamosComponent implements OnInit {
  public titulo = "Crear Préstamo";
  public accion = "crear";
  public idPrestamo = 0;
  public idColaborador = 0;
  public soloLectura = false;
  public Math = Math; // Para usar Math.abs en el template

  public prestamo: any = {
    id_colaborador: '',
    id_tipo_prestamo: '',
    fecha_prestamo: '',
    fecha_inicio_cobro: '',
    monto_prestado: 0,
    numero_cuotas: 0,
    monto_cuota: 0,
    tasa_interes: 0,
    monto_total: 0,
    id_tipo_descuento: 1,
    id_estado: 1,
    observaciones: ''
  };

  public colaborador: any = {};
  public tiposPrestamo: any[] = [];
  public tiposDescuento: any[] = [];
  public estados: any[] = [];
  public cuotas: any[] = [];
  public periodicidadPago: 'mensual' | 'quincenal' = 'mensual';

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private prestamosService: PrestamosService,
    private prestamosCuotasService: PrestamosCuotasService,
    private colaboradoresService: ColaboradoresService,
    private tiposPrestamoService: TiposPrestamoService,
    private tiposDescuentoPrestamoService: TiposDescuentoPrestamoService,
    private estadosPrestamoService: EstadosPrestamoService,
    private utilService: UtilService,
    private prestamosPagosService: PrestamosPagosService
  ) { }

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.idColaborador = params['idColaborador'];
      this.accion = params['accion'];
      this.idPrestamo = params['id'];

      this.soloLectura = this.accion === 'ver';

      if (this.accion === 'crear') {
        this.titulo = "Crear Préstamo";
        this.prestamo.id_colaborador = this.idColaborador;
        this.prestamo.fecha_prestamo = new Date().toISOString().split('T')[0];
        this.prestamo.fecha_inicio_cobro = new Date().toISOString().split('T')[0];
      } else if (this.accion === 'editar') {
        this.titulo = "Editar Préstamo";
      } else if (this.accion === 'ver') {
        this.titulo = "Ver Préstamo";
      }

      this.cargarCatalogos();
      this.obtenerColaborador();

      if (this.idPrestamo && !!this.idPrestamo) {
        this.obtenerPrestamo();
        this.obtenerCuotas();
      }
    });
  }

  cargarCatalogos() {
    this.tiposPrestamoService.obtenerTodos().subscribe(
      (response: any) => {
        this.tiposPrestamo = response.body;
      },
      (error: any) => console.error('Error al cargar tipos de préstamo:', error)
    );

    this.tiposDescuentoPrestamoService.obtenerTodos().subscribe(
      (response: any) => {
        this.tiposDescuento = response.body;
      },
      (error: any) => console.error('Error al cargar tipos de descuento:', error)
    );

    this.estadosPrestamoService.obtenerTodos().subscribe(
      (response: any) => {
        this.estados = response.body;
      },
      (error: any) => console.error('Error al cargar estados:', error)
    );
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
          if (this.prestamo.fecha_prestamo) {
            this.prestamo.fecha_prestamo = this.prestamo.fecha_prestamo.split('T')[0];
          }
          if (this.prestamo.fecha_inicio_cobro) {
            this.prestamo.fecha_inicio_cobro = this.prestamo.fecha_inicio_cobro.split('T')[0];
          }
        }
      },
      (error: any) => {
        console.error('Error al obtener préstamo:', error);
        Swal.fire({
          title: 'Error',
          text: 'No se pudo cargar el préstamo',
          icon: 'error',
          confirmButtonText: 'Aceptar'
        });
      }
    );
  }

  obtenerCuotas() {
    this.prestamosCuotasService.obtenerPorPrestamo(this.idPrestamo).subscribe(
      (response: any) => {
        this.cuotas = response.body as any[];
        // Marcar cuotas como no editables si ya están pagadas o anuladas
        this.cuotas.forEach(cuota => {
          // id_estado: 1 = Pendiente, 2 = Pagada, 3 = Anulada
          cuota.editable = cuota.id_estado === 1;
        });

        // Detectar periodicidad automáticamente
        if (this.cuotas.length > 0) {
          this.periodicidadPago = this.detectarPeriodicidad();
        }
      },
      (error: any) => console.error('Error al obtener cuotas:', error)
    );
  }

  calcularMontoTotal() {
    const capital = parseFloat(this.prestamo.monto_prestado) || 0;
    const tasaInteres = parseFloat(this.prestamo.tasa_interes) || 0;
    const interes = (capital * tasaInteres) / 100;
    this.prestamo.monto_total = Math.round(capital + interes);
    this.calcularMontoCuota();
  }

  calcularMontoCuota() {
    const total = parseFloat(this.prestamo.monto_total) || 0;
    const cuotas = parseInt(this.prestamo.numero_cuotas) || 1;
    this.prestamo.monto_cuota = Math.round(total / cuotas);
  }

  generarCuotas() {
    if (!this.prestamo.fecha_inicio_cobro || !this.prestamo.numero_cuotas || this.prestamo.numero_cuotas <= 0) {
      Swal.fire({
        title: 'Datos incompletos',
        text: 'Debe especificar la fecha de inicio de cobro y el número de cuotas',
        icon: 'warning',
        confirmButtonText: 'Aceptar'
      });
      return;
    }

    this.generarTablaCuotas();
  }

  /**
   * Generar tabla de cuotas
   */
  generarTablaCuotas() {
    this.cuotas = [];
    const fechaInicio = new Date(this.prestamo.fecha_inicio_cobro + 'T00:00:00');
    const capital = parseFloat(this.prestamo.monto_prestado) || 0;
    const montoTotal = parseFloat(this.prestamo.monto_total) || 0;
    const totalInteres = montoTotal - capital;
    const numCuotas = parseInt(this.prestamo.numero_cuotas);

    // Calcular monto por cuota
    const montoCuotaBase = Math.floor(montoTotal / numCuotas);
    const residuo = montoTotal - (montoCuotaBase * numCuotas);

    // Distribuir interés y capital proporcionalmente
    const interesPorCuota = Math.floor(totalInteres / numCuotas);
    const capitalPorCuota = Math.floor(capital / numCuotas);

    for (let i = 0; i < numCuotas; i++) {
      const fechaCuota = new Date(fechaInicio);

      // CORRECCIÓN: La primera cuota (i=0) debe ser en la fecha de inicio
      if (this.periodicidadPago === 'mensual') {
        fechaCuota.setMonth(fechaCuota.getMonth() + i);
      } else {
        // Para quincenal: primera cuota = fecha inicio, segunda = +15 días, etc.
        if (i > 0) {
          fechaCuota.setDate(fechaCuota.getDate() + (i * 15));
        }
      }

      // Ajustar última cuota con el residuo
      const esUltimaCuota = i === numCuotas - 1;
      const montoCuota = esUltimaCuota ? montoCuotaBase + residuo : montoCuotaBase;

      // Calcular capital e interés de esta cuota proporcionalmente
      const montoCapital = esUltimaCuota
        ? capital - (capitalPorCuota * (numCuotas - 1))
        : capitalPorCuota;

      const montoInteres = montoCuota - montoCapital;

      this.cuotas.push({
        numero_cuota: i + 1,
        fecha_programada: fechaCuota.toISOString().split('T')[0],
        monto_cuota: montoCuota.toFixed(2),
        monto_capital: montoCapital.toFixed(2),
        monto_interes: montoInteres.toFixed(2),
        id_estado: 1,
        editable: true
      });
    }
  }





  formatearValorConSeparador(valor: any): string {
    if (!valor) return '0';
    const numero = typeof valor === 'string' ? parseFloat(valor) : valor;
    return numero.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }

  actualizarMontoCuota(index: number, event: any) {
    // No permitir edición si la cuota no es editable
    if (!this.cuotas[index].editable) {
      event.target.value = this.formatearValorConSeparador(this.cuotas[index].monto_cuota);
      Swal.fire({
        title: 'Cuota no editable',
        text: 'Esta cuota ya está pagada y no se puede modificar',
        icon: 'warning',
        toast: true,
        position: 'top-end',
        timer: 3000,
        showConfirmButton: false
      });
      return;
    }

    const input = event.target.value.replace(/[^\d]/g, '');
    const monto = parseFloat(input) || 0;

    this.cuotas[index].monto_cuota = monto.toFixed(2);

    // Calcular capital e interés proporcionalmente
    const capital = parseFloat(this.prestamo.monto_prestado) || 0;
    const montoTotal = parseFloat(this.prestamo.monto_total) || 0;
    const totalInteres = montoTotal - capital;

    // Usar proporciones correctas
    const porcentajeInteres = totalInteres / montoTotal;
    const porcentajeCapital = capital / montoTotal;

    this.cuotas[index].monto_interes = Math.round(monto * porcentajeInteres);
    this.cuotas[index].monto_capital = Math.round(monto * porcentajeCapital);

    // Actualizar el input con formato
    event.target.value = this.formatearValorConSeparador(monto);
  }

  obtenerValorCuotaFormateado(cuota: any): string {
    return this.formatearValorConSeparador(parseFloat(cuota.monto_cuota));
  }

  calcularTotalCuotas(): number {
    return this.cuotas.reduce((sum, cuota) => sum + parseFloat(cuota.monto_cuota || '0'), 0);
  }

  guardar() {
    if (!this.validarDatos()) {
      return;
    }

    const body = {
      ...this.prestamo,
      fecha_registro: new Date().toISOString().replace('T', ' ').substr(0, 19),
      id_usuario_registro: this.utilService.obtenerIdUsuarioActual()
    };

    if (this.accion === 'crear') {
      this.prestamosService.crear(body).subscribe(
        (response: any) => {
          const idNuevo = response.body.id;

          if (this.cuotas.length > 0) {
            this.crearCuotas(idNuevo);
          } else {
            Swal.fire({
              title: 'Éxito',
              text: 'Préstamo creado correctamente',
              icon: 'success',
              confirmButtonText: 'Aceptar'
            }).then(() => {
              this.router.navigate(['/colaboradores-prestamos/' + this.idColaborador]);
            });
          }
        },
        (error: any) => {
          console.error('Error al crear préstamo:', error);
          Swal.fire({
            title: 'Error',
            text: 'No se pudo crear el préstamo',
            icon: 'error',
            confirmButtonText: 'Aceptar'
          });
        }
      );
    } else if (this.accion === 'editar') {
      body.id = this.idPrestamo;
      this.prestamosService.actualizar(body).subscribe(
        (response: any) => {
          Swal.fire({
            title: 'Éxito',
            text: 'Préstamo actualizado correctamente',
            icon: 'success',
            confirmButtonText: 'Aceptar'
          }).then(() => {
            this.router.navigate(['/colaboradores-prestamos/' + this.idColaborador]);
          });
        },
        (error: any) => {
          console.error('Error al actualizar préstamo:', error);
          Swal.fire({
            title: 'Error',
            text: 'No se pudo actualizar el préstamo',
            icon: 'error',
            confirmButtonText: 'Aceptar'
          });
        }
      );
    }
  }

  crearCuotas(idPrestamo: string) {
    const body = {
      id_prestamo: idPrestamo,
      cuotas: this.cuotas
    };

    this.prestamosCuotasService.crearBatch(body).subscribe(
      (response: any) => {
        Swal.fire({
          title: 'Éxito',
          text: 'Préstamo y cuotas creados correctamente',
          icon: 'success',
          confirmButtonText: 'Aceptar'
        }).then(() => {
          this.router.navigate(['/colaboradores-prestamos/' + this.idColaborador]);
        });
      },
      (error: any) => {
        console.error('Error al crear cuotas:', error);
        Swal.fire({
          title: 'Advertencia',
          text: 'El préstamo fue creado pero hubo un error al crear las cuotas',
          icon: 'warning',
          confirmButtonText: 'Aceptar'
        }).then(() => {
          this.router.navigate(['/colaboradores-prestamos/' + this.idColaborador]);
        });
      }
    );
  }

  validarDatos(): boolean {
    if (!this.prestamo.id_tipo_prestamo || !this.prestamo.id_tipo_prestamo) {
      Swal.fire({
        title: 'Datos incompletos',
        text: 'Debe seleccionar un tipo de préstamo',
        icon: 'warning',
        confirmButtonText: 'Aceptar'
      });
      return false;
    }

    if (!this.prestamo.fecha_prestamo) {
      Swal.fire({
        title: 'Datos incompletos',
        text: 'Debe especificar la fecha del préstamo',
        icon: 'warning',
        confirmButtonText: 'Aceptar'
      });
      return false;
    }

    if (!this.prestamo.fecha_inicio_cobro) {
      Swal.fire({
        title: 'Datos incompletos',
        text: 'Debe especificar la fecha de inicio de cobro',
        icon: 'warning',
        confirmButtonText: 'Aceptar'
      });
      return false;
    }

    if (!this.prestamo.monto_prestado || this.prestamo.monto_prestado <= 0) {
      Swal.fire({
        title: 'Datos incompletos',
        text: 'Debe especificar un monto válido',
        icon: 'warning',
        confirmButtonText: 'Aceptar'
      });
      return false;
    }

    if (!this.prestamo.numero_cuotas || this.prestamo.numero_cuotas <= 0) {
      Swal.fire({
        title: 'Datos incompletos',
        text: 'Debe especificar el número de cuotas',
        icon: 'warning',
        confirmButtonText: 'Aceptar'
      });
      return false;
    }

    // Validar que hay cuotas generadas
    if (this.accion === 'crear' && this.cuotas.length === 0) {
      Swal.fire({
        title: 'Faltan las cuotas',
        text: 'Debe generar la tabla de cuotas antes de guardar',
        icon: 'warning',
        confirmButtonText: 'Aceptar'
      });
      return false;
    }

    // Validación estricta de suma de cuotas
    if (this.accion === 'crear' && this.cuotas.length > 0) {
      const totalCuotas = Math.round(this.calcularTotalCuotas());
      const montoTotal = Math.round(parseFloat(this.prestamo.monto_total));
      const diferencia = Math.abs(totalCuotas - montoTotal);

      // Tolerancia de diferencia: máximo $10 pesos
      if (diferencia > 10) {
        Swal.fire({
          title: 'Error en las cuotas',
          html: `
            <p>La suma de las cuotas no coincide con el monto total del préstamo.</p>
            <p><strong>Monto Total:</strong> $${this.formatearValorConSeparador(montoTotal)}</p>
            <p><strong>Suma de Cuotas:</strong> $${this.formatearValorConSeparador(totalCuotas)}</p>
            <p><strong>Diferencia:</strong> <span class="text-danger">$${this.formatearValorConSeparador(diferencia)}</span></p>
            <p class="text-danger mt-2"><strong>Por favor, regenere la tabla de cuotas o ajuste los valores manualmente.</strong></p>
          `,
          icon: 'error',
          confirmButtonText: 'Aceptar',
          confirmButtonColor: '#dc3545'
        });
        return false;
      }
    }

    return true;
  }
  // Método para formatear el monto prestado mientras se escribe
  formatearMontoPrestado(event: any) {
    const input = event.target.value.replace(/[^\d]/g, '');
    const numero = parseFloat(input) || 0;
    this.prestamo.monto_prestado = numero;
    event.target.value = this.formatearValorConSeparador(numero);
    this.calcularMontoTotal();
  }

  // Método para manejar el focus en el campo
  onFocusMontoPrestado(event: any) {
    // Seleccionar todo el texto al hacer focus
    event.target.select();
  }

  // Método para obtener el valor formateado del monto prestado
  obtenerMontoPrestadoFormateado(): string {
    return this.formatearValorConSeparador(this.prestamo.monto_prestado);
  }
  cancelar() {
    this.router.navigate(['/colaboradores-prestamos/' + this.idColaborador]);
  }
  /**
 * Ver pagos de una cuota específica (popup)
 */
  verPagosCuota(cuota: any) {
    if (cuota.id_estado === 1) {
      Swal.fire({
        title: 'Cuota sin pagos',
        text: 'Esta cuota aún no tiene pagos registrados',
        icon: 'info',
        confirmButtonText: 'Aceptar'
      });
      return;
    }

    this.prestamosPagosService.obtenerPagosPorCuota(cuota.id).subscribe(
      (response: any) => {
        const pagos = response.body as any[];

        if (pagos.length === 0) {
          Swal.fire({
            title: 'Sin pagos',
            text: 'Esta cuota no tiene pagos registrados',
            icon: 'info',
            confirmButtonText: 'Aceptar'
          });
          return;
        }

        this.mostrarPopupPagos(cuota, pagos);
      },
      (error: any) => {
        console.error('Error al obtener pagos:', error);
        Swal.fire({
          title: 'Error',
          text: 'No se pudieron cargar los pagos de la cuota',
          icon: 'error',
          confirmButtonText: 'Aceptar'
        });
      }
    );
  }

  /**
   * Mostrar popup con los pagos de una cuota
   */
  mostrarPopupPagos(cuota: any, pagos: any[]) {
    const totalPagado = pagos.reduce((sum, pago) => sum + parseFloat(pago.monto_pagado), 0);

    let htmlPagos = `
    <div class="text-start">
      <div class="mb-3">
        <p><strong>Cuota #${cuota.numero_cuota}</strong></p>
        <p><strong>Monto:</strong> $${this.formatearValorConSeparador(cuota.monto_cuota)}</p>
        <p><strong>Estado:</strong> <span class="badge bg-success">${cuota.nombre_estado || 'Pagada'}</span></p>
        <p><strong>Fecha Programada:</strong> ${this.formatearFecha(cuota.fecha_programada)}</p>
      </div>
      
      <hr>
      
      <h6 class="mb-3">💰 Pagos Realizados:</h6>
      <div class="table-responsive">
        <table class="table table-sm table-hover">
          <thead class="table-light">
            <tr>
              <th>ID</th>
              <th>Fecha</th>
              <th>Monto</th>
              <th>Tipo</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
  `;

    pagos.forEach(pago => {
      const tipoLabel = pago.id_tipo_pago === 1 ?
        `Nómina ${pago.nombre_nomina || ''}` :
        pago.nombre_tipo_pago;

      htmlPagos += `
      <tr>
        <td>${pago.id}</td>
        <td>${this.formatearFecha(pago.fecha_pago)}</td>
        <td>$${this.formatearValorConSeparador(pago.monto_pagado)}</td>
        <td>${tipoLabel}</td>
        <td>
          ${this.prestamo.id_estado !== 2 ?
          `<button class="btn btn-sm " onclick="anularPago(${pago.id})" title="Eliminar pago">
          🗑️
        </button>`  :
          '<span class="text-muted">-</span>'}
        </td>
      </tr>
    `;
    });

    htmlPagos += `
          </tbody>
        </table>
      </div>
      
      <div class="alert alert-info mt-3">
        <strong>Total Pagado:</strong> $${this.formatearValorConSeparador(totalPagado)}
      </div>
      
      ${pagos[0]?.nombre_usuario_registro ?
        `<p class="text-muted small mb-0">Registrado por: ${pagos[0].nombre_usuario_registro}</p>` : ''}
    </div>
  `;

    Swal.fire({
      title: 'Detalle de Pagos',
      html: htmlPagos,
      width: '700px',
      showConfirmButton: true,
      confirmButtonText: 'Cerrar',
      didOpen: () => {
        // Configurar evento para anular pago
        (window as any).anularPago = (idPago: string) => {
          Swal.close();
          this.anularPago(idPago, cuota);
        };
      }
    });
  }

  /**
   * Anular un pago
   */
  anularPago(idPago: string, cuota: any) {
    Swal.fire({
      title: '⚠️ Eliminar Pago',
      html: `
      <div class="text-start">
        <p>¿Está seguro de eliminar este pago?</p>
        <p><strong>Pago ID:</strong> ${idPago}</p>
        <p class="text-warning mt-3">⚠️ Esta acción no se puede deshacer</p>
        <p class="text-warning">La cuota volverá a estado "Pendiente"</p>
      </div>
    `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc3545'
    }).then((result) => {
      if (result.isConfirmed) {
        const body = {
          id: idPago
        };

        this.prestamosPagosService.anular(body).subscribe(
          (response: any) => {
            Swal.fire({
              title: '¡Eliminado!',
              text: 'El pago ha sido eliminado correctamente',
              icon: 'success',
              confirmButtonText: 'Aceptar',
              timer: 2000
            }).then(() => {
              // Recargar cuotas
              this.obtenerCuotas();
            });
          },
          (error: any) => {
            console.error('Error al eliminar pago:', error);
            Swal.fire({
              title: 'Error',
              text: error.error?.error || 'No se pudo eliminar el pago',
              icon: 'error',
              confirmButtonText: 'Aceptar'
            });
          }
        );
      }
    });
  }

  /**
   * Formatear fecha para mostrar
   */
  formatearFecha(fecha: any): string {
    if (!fecha) return '-';
    const date = new Date(fecha);
    return date.toLocaleDateString('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  /**
   * Ir al módulo de registro de pagos
   */
  irARegistrarPago() {
    this.router.navigate([
      '/colaboradores-prestamos-pagos/crear',
      this.idPrestamo,
      this.idColaborador
    ]);
  }

  /**
 * Recalcular cuotas en modo edición
 */
  recalcularCuotas() {
    // Validar que haya datos necesarios
    if (!this.prestamo.fecha_inicio_cobro || !this.prestamo.numero_cuotas) {
      Swal.fire({
        title: 'Datos incompletos',
        text: 'Debe especificar la fecha de inicio de cobro y el número de cuotas',
        icon: 'warning',
        confirmButtonText: 'Aceptar'
      });
      return;
    }

    // Verificar si todas las cuotas tienen el mismo monto
    const montosUnicos = [...new Set(this.cuotas.map(c => parseFloat(c.monto_cuota)))];
    const todasIguales = montosUnicos.length === 1;

    // Verificar si hay cuotas pagadas
    const cuotasPagadas = this.cuotas.filter(c => c.id_estado === 2);

    if (cuotasPagadas.length > 0) {
      Swal.fire({
        title: 'Cuotas pagadas',
        html: `
        <p>Este préstamo tiene <strong>${cuotasPagadas.length} cuotas pagadas</strong>.</p>
        <p class="text-warning mt-2">⚠️ No se pueden recalcular las cuotas de un préstamo con pagos registrados.</p>
        <p class="text-muted small mt-2">Debe modificar manualmente las fechas de las cuotas pendientes si es necesario.</p>
      `,
        icon: 'warning',
        confirmButtonText: 'Entendido'
      });
      return;
    }

    // Si todas las cuotas son iguales, permitir recalcular todo
    if (todasIguales) {
      Swal.fire({
        title: '¿Recalcular cuotas?',
        html: `
        <div class="text-start">
          <p>Todas las cuotas tienen el <strong>mismo monto</strong>.</p>
          <p class="mt-3"><strong>¿Qué desea recalcular?</strong></p>
          <div class="form-check mt-2">
            <input class="form-check-input" type="radio" name="tipoRecalculo" id="soloFechas" value="fechas" checked>
            <label class="form-check-label" for="soloFechas">
              Solo las fechas (mantener montos)
            </label>
          </div>
          <div class="form-check mt-2">
            <input class="form-check-input" type="radio" name="tipoRecalculo" id="todoCompleto" value="completo">
            <label class="form-check-label" for="todoCompleto">
              Recalcular todo (fechas y montos)
            </label>
          </div>
        </div>
      `,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Recalcular',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#28a745',
        preConfirm: () => {
          const tipoRecalculo = (document.querySelector('input[name="tipoRecalculo"]:checked') as HTMLInputElement)?.value;
          return tipoRecalculo;
        }
      }).then((result) => {
        if (result.isConfirmed) {
          if (result.value === 'fechas') {
            this.recalcularSoloFechas();
          } else {
            this.generarTablaCuotas();
          }

          Swal.fire({
            title: '¡Recalculado!',
            text: 'Las cuotas han sido recalculadas correctamente',
            icon: 'success',
            timer: 2000,
            showConfirmButton: false
          });
        }
      });
    } else {
      // Si las cuotas tienen montos diferentes, solo ofrecer recalcular fechas
      Swal.fire({
        title: 'Cuotas con montos diferentes',
        html: `
        <div class="text-start">
          <p>Las cuotas tienen <strong>montos diferentes</strong>.</p>
          <p class="text-warning mt-3">⚠️ Solo se pueden recalcular las <strong>fechas</strong>.</p>
          <p class="text-muted small mt-2">Los montos personalizados se mantendrán intactos.</p>
          <p class="mt-3">¿Desea recalcular solo las fechas?</p>
        </div>
      `,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Sí, recalcular fechas',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#28a745'
      }).then((result) => {
        if (result.isConfirmed) {
          this.recalcularSoloFechas();

          Swal.fire({
            title: '¡Fechas recalculadas!',
            text: 'Las fechas de las cuotas han sido actualizadas',
            icon: 'success',
            timer: 2000,
            showConfirmButton: false
          });
        }
      });
    }
  }

  /**
   * Recalcular solo las fechas de las cuotas (mantener montos)
   */
  recalcularSoloFechas() {
    const fechaInicio = new Date(this.prestamo.fecha_inicio_cobro + 'T00:00:00');

    this.cuotas.forEach((cuota, index) => {
      const fechaCuota = new Date(fechaInicio);

      // CORRECCIÓN: La primera cuota (index=0) debe ser en la fecha de inicio
      if (this.periodicidadPago === 'mensual') {
        fechaCuota.setMonth(fechaCuota.getMonth() + index);
      } else {
        // Para quincenal: primera cuota = fecha inicio, segunda = +15 días, etc.
        if (index > 0) {
          fechaCuota.setDate(fechaCuota.getDate() + (index * 15));
        }
      }

      // Solo actualizar la fecha, mantener el resto de datos
      cuota.fecha_programada = fechaCuota.toISOString().split('T')[0];
    });
  }

  /**
   * Detectar periodicidad automáticamente basada en las fechas existentes
   */
  detectarPeriodicidad() {
    if (this.cuotas.length < 2) {
      return 'mensual'; // Default
    }

    const fecha1 = new Date(this.cuotas[0].fecha_programada);
    const fecha2 = new Date(this.cuotas[1].fecha_programada);

    const diferenciaDias = Math.round((fecha2.getTime() - fecha1.getTime()) / (1000 * 60 * 60 * 24));

    // Si la diferencia es cercana a 15 días, es quincenal
    if (diferenciaDias >= 13 && diferenciaDias <= 17) {
      return 'quincenal';
    }

    // Si la diferencia es cercana a 30 días, es mensual
    return 'mensual';
  }
}