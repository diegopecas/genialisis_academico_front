import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import Swal from 'sweetalert2';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../../../common/header/header.component';
import { PagosRecibidosService } from '../../../../services/pagos-recibidos.service';
import { CuentasPorCobrarService } from '../../../../services/cuentas-por-cobrar.service';
import { EstudiantesService } from '../../../../services/estudiantes.service';
import { TiposPagosService } from '../../../../services/tipos-pagos.service';
import { AcudientesService } from '../../../../services/acudientes.service';
import { UtilService } from '../../../../common/constantes/util.service';
import { CuentaPagadaService } from '../../../../services/cuenta-pagada.service';
import { ReportesPagoService } from '../../../../services/reportes-pago.service';
import { environment } from '../../../../../environments/environment';


// Interfaz para el modelo de pago
interface PagoModel {
  id: number;
  fecha: string;
  id_estudiante: string;
  id_acudiente: string;
  id_tipo_pago: string;
  valor_recibido: number;
  saldo: number;
  observaciones: string;
  referencia_bancaria: string;
  id_usuario_registro: number | null;
  fecha_registro?: string;
  fecha_contabilizacion?: string | null;
  id_usuario_contable?: number | null;
  anulado?: number;
  fecha_anulacion?: string | null;
  id_usuario_anulacion?: number | null;
  nombre_completo_usuario_registro?: string;
  nombre_completo_usuario_contable?: string;
  nombre_completo_usuario_anulacion?: string;
  cuentas_aplicadas: CuentaAplicadaModel[];
}

// Interfaz para el modelo de cuenta aplicada
interface CuentaAplicadaModel {
  id: number;
  id_cuenta_por_cobrar: number;
  id_pago_recibido: number | null;
  valor_aplicado: number;
  fecha: string;
}
// Interfaz para las cuentas pagadas
interface CuentaPagada {
  id: number;
  id_cuenta_por_cobrar: number;
  id_pago_recibido: number;
  valor_aplicado: number;
  fecha: string;
  nombre_producto_servicio: string;
}
@Component({
  selector: 'app-crear-pagos-recibidos',
  templateUrl: './crear-pagos-recibidos.component.html',
  styleUrl: './crear-pagos-recibidos.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent]
})
export class CrearPagosRecibidosComponent implements OnInit {

  // Propiedades principales
  public id = "0";
  public idEstudiante = "0";
  public accion = "";
  public editable = false;
  public submitted = false;
  public estudiante: any;
  public nombre_estudiante = "";
  public titulo = "Registro de Pagos";
  public regresar = '/estudiantes-pagos/';

  // Propiedades para el manejo de cuentas y pagos
  public cuentasPorCobrar: any[] = [];
  public cuentasSeleccionadas: number[] = [];
  public valorPorAplicar = 0;
  public valorRestante = 0;

  // Variables para la máscara del valor recibido
  public valorRecibidoFormateado: string = '';

  // Listas para los selectores
  public listas = {
    tiposPago: [] as any[],
    acudientes: [] as any[]
  }

  // Modelo de datos principal
  public model: PagoModel = {
    id: 0,
    fecha: "",
    id_estudiante: "",
    id_acudiente: "",
    id_tipo_pago: "",
    valor_recibido: 0,
    saldo: 0,
    observaciones: "",
    referencia_bancaria: "",
    id_usuario_registro: null,
    cuentas_aplicadas: []
  };

  public pagoContabilizado = false;

  // Reportes de pago del portal de padres
  public reportesPendientes: any[] = [];
  public reporteSeleccionado: any = null;
  public reporteAsociado: any = null;


  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private pagosService: PagosRecibidosService,
    private cuentasService: CuentasPorCobrarService,
    private estudiantesService: EstudiantesService,
    private tiposPagosService: TiposPagosService,
    private acudientesService: AcudientesService,
    private cuentaPagadaService: CuentaPagadaService,
    private reportesPagoService: ReportesPagoService,
    private utilService: UtilService
  ) { }

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.accion = params['accion'];
      this.id = params['id'];
      this.idEstudiante = params['idEstudiante'];
      this.model.id_estudiante = this.idEstudiante;
      
      // Verificar si viene desde el listado global
      this.route.queryParams.subscribe(queryParams => {
        if (queryParams['origen'] === 'global') {
          this.regresar = '/administracion/financiero/gestion-pagos-recibidos';
        } else {
          this.regresar = '/estudiantes-pagos/' + this.idEstudiante;
        }
      });
      
      this.obtenerEstudiante(this.idEstudiante);

      switch (this.accion) {
        case 'crear':
          this.editable = true;
          this.consultarListas();
          this.cargarReportesPendientes();
          const hoy = new Date();
          this.model.fecha = hoy.toISOString().split('T')[0];
          this.model.id_usuario_registro = this.utilService.obtenerIdUsuarioActual();
          break;
        case 'editar':
          this.editable = true;
          this.consultarListas();
          this.obtenerPago(this.id);
          this.cargarReporteAsociado();
          break;
        case 'consultar':
          this.editable = false;
          this.consultarListas();
          this.obtenerPago(this.id);
          this.cargarReporteAsociado();
          break;
      }
    });
  }

  // Métodos para cargar datos iniciales
  consultarListas() {
    // Obtener tipos de pago desde el servicio
    this.tiposPagosService.obtenerTodos().subscribe((response: any) => {
      this.listas.tiposPago = response.body;
    });

    // La lista de acudientes se cargará después de obtener el estudiante
    this.listas.acudientes = [];
  }

  obtenerEstudiante(id_estudiante: any) {
    this.estudiantesService.obtenerById(id_estudiante).subscribe((response: any) => {
      const body = response.body as any[];
      this.estudiante = body[0];
      this.nombre_estudiante = [
        this.estudiante.primer_nombre,
        this.estudiante.segundo_nombre,
        this.estudiante.primer_apellido,
        this.estudiante.segundo_apellido
      ].filter(Boolean).join(' ');
      this.titulo = this.titulo + " para " + this.nombre_estudiante;

      // Una vez obtenido el estudiante, cargar los acudientes
      this.cargarAcudientes();
      // Y también cargar las cuentas por cobrar
      if (this.accion === 'crear') {
        this.obtenerCuentasPorCobrar();
      }

    });
  }

  cargarAcudientes() {
    // Obtener los acudientes del estudiante desde el servicio
    this.acudientesService.obtenerPorEstudiante(this.idEstudiante).subscribe({
      next: (response: any) => {
        const acudientesData = response.body;
        console.log('Acudientes obtenidos:', acudientesData);

        // Filtrar acudientes activos y responsables de pago
        // ¡IMPORTANTE! Usar el ID del registro de acudiente, no el ID de persona
        this.listas.acudientes = acudientesData
          .filter((acudiente: any) => acudiente.activo == 1 && acudiente.es_responsable_pago == 1)
          .map((acudiente: any) => ({
            id: acudiente.id,
            nombre: acudiente.nombre_persona + ' (' + acudiente.nombre_tipo_acudiente + ')'
          }));
        // Agregar al estudiante como una opción de acudiente
        this.listas.acudientes.push({
          id: null,
          nombre: this.nombre_estudiante + ' (Mismo estudiante)'
        });
        console.log('Lista de acudientes procesada:', this.listas.acudientes);

        // Seleccionar al primer acudiente responsable de pago como default
        if (this.listas.acudientes.length > 0 && this.accion === 'crear') {
          this.model.id_acudiente = this.listas.acudientes[0].id;
        } else if (this.listas.acudientes.length === 0) {
          Swal.fire('Advertencia', 'No se encontraron acudientes responsables de pago para este estudiante. Debe agregar un acudiente antes de registrar pagos.', 'warning');
        }

      },
      error: (error) => {
        console.error('Error al cargar acudientes:', error);
        this.listas.acudientes = [];
        Swal.fire('Error', 'No se pudieron cargar los acudientes. Por favor, intente nuevamente.', 'error');
      }
    });
  }


  // El método obtenerPago para cargar todas las cuentas pendientes
  // cuando estamos en modo editar y hay saldo a favor
  obtenerPago(id: any) {
    // Guardar el id_estudiante actual antes de obtener el pago
    const idEstudianteActual = this.model.id_estudiante;

    this.pagosService.obtenerById(id).subscribe((response: any) => {
      const body = response.body;
      this.model = body[0];

      // Si no viene id_estudiante en la respuesta, usar el que teníamos
      if (!this.model.id_estudiante) {
        this.model.id_estudiante = idEstudianteActual || this.idEstudiante;
      }

      this.model.fecha = this.formatDate(this.model.fecha);

      // Verificar si el pago está contabilizado o anulado
      this.pagoContabilizado = !!this.model.fecha_contabilizacion || !!this.model.id_usuario_contable;

      // Si el pago está contabilizado o anulado, solo permitir editar observaciones cuando estamos en modo editar
      if ((this.pagoContabilizado) && this.accion === 'editar') {
        this.editable = false;
      }

      // Formatear el valor recibido cuando se obtiene un pago existente
      this.formatearValorRecibido(this.model.valor_recibido);

      // Si la acción es consultar o editar, primero cargamos las cuentas afectadas por el pago
      if (this.accion === 'consultar' || this.accion === 'editar') {
        this.obtenerCuentasPagadasPorPago(id).then(() => {
          // Si estamos en modo editar y hay saldo a favor y no está contabilizado ni anulado
          if (this.accion === 'editar' && this.model.saldo > 0 && !this.pagoContabilizado) {
            this.obtenerCuentasPendientesPorCobrar();
          }
        });
      } else {
        this.obtenerCuentasPorCobrar();
      }
      console.log("pago", this.model)
    });
  }



  formatDate(dateString: string): string {
    // Convierte la fecha al formato YYYY-MM-DD
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  }
  // Método para obtener cuentas pagadas, convertido a Promise para encadenar operaciones
  obtenerCuentasPagadasPorPago(idPago: any): Promise<void> {
    return new Promise((resolve, reject) => {
      // Obtener las cuentas pagadas asociadas a este pago
      this.cuentaPagadaService.getByPagoRecibido(idPago).subscribe({
        next: (response: any) => {
          const cuentasPagadas: CuentaPagada[] = response.body;
          console.log('Cuentas pagadas por este pago:', cuentasPagadas);

          // Si hay cuentas pagadas, obtenemos los detalles de todas en una sola llamada
          if (cuentasPagadas && cuentasPagadas.length > 0) {
            // Limpiar las cuentas seleccionadas
            this.cuentasSeleccionadas = [];

            // Extraer todos los IDs de las cuentas por cobrar
            const idsCuentasPorCobrar = cuentasPagadas.map(cp => cp.id_cuenta_por_cobrar);

            // Hacer una sola llamada para obtener todas las cuentas
            this.cuentasService.obtenerMultiplesByIds(idsCuentasPorCobrar).subscribe({
              next: (respuesta: any) => {
                const cuentasObtenidas = respuesta.body;

                // Crear un mapa para acceso rápido
                const mapaCuentas = new Map<number, any>();
                cuentasObtenidas.forEach((cuenta: any) => {
                  mapaCuentas.set(cuenta.id, cuenta);
                });

                // Procesar las cuentas pagadas y asociar con los datos obtenidos
                this.cuentasPorCobrar = [];

                cuentasPagadas.forEach((cuentaPagada: CuentaPagada) => {
                  const cuenta = mapaCuentas.get(cuentaPagada.id_cuenta_por_cobrar);

                  if (cuenta) {
                    // Añadir el valor pagado de esta aplicación específica
                    cuenta.valor_aplicado_en_este_pago = cuentaPagada.valor_aplicado;

                    // Marcar esta cuenta como ya aplicada (para evitar modificaciones)
                    cuenta.ya_aplicada = true;

                    // Agregar la cuenta al array
                    this.cuentasPorCobrar.push(cuenta);

                    // Añadir la cuenta a las seleccionadas
                    this.cuentasSeleccionadas.push(cuentaPagada.id_cuenta_por_cobrar);
                  }
                });

                console.log('Cuentas por cobrar cargadas:', this.cuentasPorCobrar);

                // Actualizar las cuentas aplicadas en el modelo
                this.model.cuentas_aplicadas = cuentasPagadas.map((cp: CuentaPagada) => ({
                  id: cp.id,
                  id_cuenta_por_cobrar: cp.id_cuenta_por_cobrar,
                  id_pago_recibido: cp.id_pago_recibido,
                  valor_aplicado: cp.valor_aplicado,
                  fecha: cp.fecha
                }));

                // Actualizar los valores formateados
                this.model.cuentas_aplicadas.forEach(cuenta => {
                  this.formatearValorAplicado(cuenta.id_cuenta_por_cobrar, cuenta.valor_aplicado);
                });

                // Actualizar totales
                this.actualizarTotales();
                resolve();
              },
              error: (error) => {
                console.error('Error al obtener cuentas por cobrar:', error);
                Swal.fire('Error', 'No se pudieron cargar los detalles de las cuentas afectadas por este pago', 'error');
                reject(error);
              }
            });

          } else {
            this.cuentasPorCobrar = [];
            console.log('No se encontraron cuentas aplicadas para este pago');
            resolve();
          }
        },
        error: error => {
          console.error('Error al obtener cuentas pagadas:', error);
          Swal.fire('Error', 'No se pudieron cargar las cuentas afectadas por este pago', 'error');
          reject(error);
        }
      });
    });
  }
  // Método para obtener cuentas pendientes por cobrar (para usar el saldo a favor)
  obtenerCuentasPendientesPorCobrar() {
    this.cuentasService.obtenerTodosXPersona(this.estudiante?.id_persona).subscribe((response: any) => {
      // Filtrar solo cuentas con saldo > 0 y que no estén ya en cuentasPorCobrar
      const cuentasPendientes = response.body
        .filter((cuenta: any) => cuenta.saldo > 0)
        .filter((cuenta: any) => !this.cuentasPorCobrar.some(c => c.id === cuenta.id));

      // Añadir estas cuentas pendientes al array existente, marcándolas como no aplicadas aún
      cuentasPendientes.forEach((cuenta: any) => {
        cuenta.ya_aplicada = false; // Marcar como nueva cuenta, no aplicada aún
        this.cuentasPorCobrar.push(cuenta);
      });

      console.log('Cuentas por cobrar totales (aplicadas + pendientes):', this.cuentasPorCobrar);
    });
  }

  obtenerCuentasPorCobrar() {
    this.cuentasService.obtenerTodosXPersona(this.estudiante?.id_persona).subscribe((response: any) => {
      this.cuentasPorCobrar = response.body.filter((cuenta: any) => cuenta.saldo > 0);
      console.log("obtenerCuentasPorCobrar", this.cuentasPorCobrar)
      // Si estamos editando, marcamos las cuentas que ya tienen pagos aplicados
      if (this.accion !== 'crear' && this.model.cuentas_aplicadas) {
        this.model.cuentas_aplicadas.forEach(cuentaAplicada => {
          this.cuentasSeleccionadas.push(cuentaAplicada.id_cuenta_por_cobrar);
        });
        // Actualizar totales
        this.actualizarTotales();
      }
    });
  }

  // Métodos para manipulación de cuentas y pagos
  toggleSeleccionCuenta(idCuenta: number) {
    // Verificar si la cuenta ya está aplicada
    const cuenta = this.cuentasPorCobrar.find(c => c.id === idCuenta);
    console.log("toggleSeleccionCuenta", cuenta);
    if (cuenta && cuenta.ya_aplicada) {
      // Si está ya aplicada, no permitir desmarcarla
      Swal.fire('Información', 'No se puede modificar una cuenta que ya ha sido aplicada a este pago', 'info');
      return;
    }

    const index = this.cuentasSeleccionadas.indexOf(idCuenta);
    if (index === -1) {
      // Agregamos la cuenta a las seleccionadas
      this.cuentasSeleccionadas.push(idCuenta);

      // Siempre asignar automáticamente el saldo pendiente de la cuenta
      if (cuenta) {
        let valorAplicar = cuenta.saldo;

        if (this.valorRestante > 0 && this.valorRestante < cuenta.saldo) {
          valorAplicar = this.valorRestante;
        }

        const indexCuentaAplicada = this.model.cuentas_aplicadas.findIndex(
          ca => ca.id_cuenta_por_cobrar === idCuenta
        );

        if (indexCuentaAplicada >= 0) {
          this.model.cuentas_aplicadas[indexCuentaAplicada].valor_aplicado = valorAplicar;
        } else {
          this.model.cuentas_aplicadas.push({
            id: 0,
            id_cuenta_por_cobrar: idCuenta,
            id_pago_recibido: this.model.id || null,
            valor_aplicado: valorAplicar,
            fecha: this.model.fecha
          });
        }

        this.formatearValorAplicado(idCuenta, valorAplicar);

        if (valorAplicar === cuenta.saldo) {
          console.log(`Se aplicará el saldo completo de ${this.formatearMoneda(cuenta.saldo)} a la cuenta`);
        } else {
          console.log(`Se aplicará ${this.formatearMoneda(valorAplicar)} de ${this.formatearMoneda(cuenta.saldo)} disponible`);
        }
      }
    } else {
      // Solo permitir desmarcar cuentas que no están ya aplicadas
      this.cuentasSeleccionadas.splice(index, 1);

      this.model.cuentas_aplicadas = this.model.cuentas_aplicadas.filter(
        ca => ca.id_cuenta_por_cobrar !== idCuenta
      );

      delete this.valoresAplicadosFormateados[idCuenta];
    }

    this.actualizarTotales();
  }

  // Métodos para la máscara de formato de moneda
  formatearValorRecibido(valor: number) {
    if (valor === null || valor === undefined) {
      this.valorRecibidoFormateado = '';
      return;
    }

    const valorStr = valor.toString();
    let parteEntera = valorStr.split('.')[0];
    const parteDecimal = valorStr.split('.')[1] || '';

    parteEntera = parteEntera.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

    this.valorRecibidoFormateado = parteDecimal ? `${parteEntera}.${parteDecimal}` : parteEntera;
  }

  onInputValorRecibido(event: any) {
    const inputValue = event.target.value.replace(/[^\d.]/g, '');

    if (inputValue === '') {
      this.model.valor_recibido = 0;
      this.valorRecibidoFormateado = '';
    } else {
      this.model.valor_recibido = parseFloat(inputValue);
      this.formatearValorRecibido(this.model.valor_recibido);
    }

    this.actualizarValorRecibido();
  }

  actualizarValorRecibido() {
    this.actualizarTotales();
  }

  // Objeto para almacenar valores formateados de cada cuenta
  public valoresAplicadosFormateados: { [key: number]: string } = {};

  formatearValorAplicado(idCuenta: number, valor: number) {
    if (valor === null || valor === undefined) {
      this.valoresAplicadosFormateados[idCuenta] = '';
      return;
    }

    const valorStr = valor.toString();
    let parteEntera = valorStr.split('.')[0];
    const parteDecimal = valorStr.split('.')[1] || '';

    parteEntera = parteEntera.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

    this.valoresAplicadosFormateados[idCuenta] = parteDecimal ? `${parteEntera}.${parteDecimal}` : parteEntera;
  }

  onInputValorAplicado(idCuenta: number, event: any) {
    const cuenta = this.cuentasPorCobrar.find(c => c.id === idCuenta);
    if (cuenta && cuenta.ya_aplicada) {
      this.formatearValorAplicado(idCuenta, cuenta.valor_aplicado_en_este_pago);
      Swal.fire('Información', 'No se puede modificar el valor de una cuenta que ya ha sido aplicada a este pago', 'info');
      return;
    }

    const inputValue = event.target.value.replace(/[^\d.]/g, '');

    if (inputValue === '') {
      this.actualizarValorAplicado(idCuenta, 0);
      this.valoresAplicadosFormateados[idCuenta] = '';
    } else {
      const nuevoValor = parseFloat(inputValue);
      this.actualizarValorAplicado(idCuenta, nuevoValor);
      this.formatearValorAplicado(idCuenta, nuevoValor);
    }
  }

  getValorAplicadoFormateado(idCuenta: number): string {
    if (!this.valoresAplicadosFormateados[idCuenta]) {
      if ((this.accion === 'consultar' || this.accion === 'editar') && this.cuentasPorCobrar) {
        const cuenta = this.cuentasPorCobrar.find(c => c.id === idCuenta);
        if (cuenta && cuenta.valor_aplicado_en_este_pago !== undefined) {
          this.formatearValorAplicado(idCuenta, cuenta.valor_aplicado_en_este_pago);
        } else {
          const valor = this.getCuentaAplicadaValor(idCuenta);
          this.formatearValorAplicado(idCuenta, valor);
        }
      } else {
        const valor = this.getCuentaAplicadaValor(idCuenta);
        this.formatearValorAplicado(idCuenta, valor);
      }
    }
    return this.valoresAplicadosFormateados[idCuenta];
  }

  actualizarValorAplicado(idCuenta: number, nuevoValor: number) {
    const cuenta = this.cuentasPorCobrar.find(c => c.id === idCuenta);
    if (!cuenta) return;

    if (nuevoValor > cuenta.saldo) {
      nuevoValor = cuenta.saldo;
      Swal.fire('Atención', `El valor no puede exceder el saldo pendiente de la cuenta (${this.formatearMoneda(cuenta.saldo)})`, 'warning');
      this.formatearValorAplicado(idCuenta, nuevoValor);
    }

    if (nuevoValor < 0) {
      nuevoValor = 0;
    }

    const index = this.model.cuentas_aplicadas.findIndex(ca => ca.id_cuenta_por_cobrar === idCuenta);
    if (index >= 0) {
      this.model.cuentas_aplicadas[index].valor_aplicado = nuevoValor;
    } else {
      this.model.cuentas_aplicadas.push({
        id: 0,
        id_cuenta_por_cobrar: idCuenta,
        id_pago_recibido: this.model.id || null,
        valor_aplicado: nuevoValor,
        fecha: this.model.fecha
      });
    }

    this.actualizarTotales();
  }

  actualizarTotales() {
    const totalAplicado = this.model.cuentas_aplicadas.reduce(
      (sum, ca) => sum + ca.valor_aplicado, 0
    );

    this.valorRestante = this.model.valor_recibido - totalAplicado;
    this.model.saldo = this.valorRestante;

    if (this.valorRestante < 0) {
      Swal.fire('Atención', `El total aplicado (${totalAplicado}) excede el valor recibido (${this.model.valor_recibido})`, 'warning');
    }
  }

  formatearMoneda(valor: number): string {
    if (valor === null || valor === undefined) return '0';
    return valor.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }

  distribuirValorEnCuentas() {
    if (this.model.valor_recibido <= 0) {
      Swal.fire('Atención', 'Debe ingresar un valor recibido mayor a cero para poder distribuir', 'warning');
      return;
    }

    if (this.cuentasPorCobrar.length === 0) {
      Swal.fire('Información', 'No hay cuentas pendientes para aplicar el pago', 'info');
      return;
    }

    this.cuentasSeleccionadas = [];
    this.model.cuentas_aplicadas = [];
    this.valoresAplicadosFormateados = {};

    const cuentasOrdenadas = [...this.cuentasPorCobrar]
      .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

    const totalDeudaPendiente = cuentasOrdenadas.reduce((sum, cuenta) => sum + cuenta.saldo, 0);

    let valorRestante = this.model.valor_recibido;
    let totalAplicado = 0;

    for (const cuenta of cuentasOrdenadas) {
      if (valorRestante <= 0) break;

      this.cuentasSeleccionadas.push(cuenta.id);

      const valorAplicar = Math.min(cuenta.saldo, valorRestante);
      valorRestante -= valorAplicar;
      totalAplicado += valorAplicar;

      this.model.cuentas_aplicadas.push({
        id: 0,
        id_cuenta_por_cobrar: cuenta.id,
        id_pago_recibido: this.model.id || null,
        valor_aplicado: valorAplicar,
        fecha: this.model.fecha
      });

      this.formatearValorAplicado(cuenta.id, valorAplicar);
    }

    this.valorRestante = valorRestante;
    this.model.saldo = valorRestante;

    let mensaje = '';
    let tipoAlerta: 'success' | 'info' = 'success';

    if (valorRestante > 0 && this.cuentasSeleccionadas.length > 0) {
      mensaje = `Del valor recibido ${this.formatearMoneda(this.model.valor_recibido)}, se aplicarán ${this.formatearMoneda(totalAplicado)} a las ${this.cuentasSeleccionadas.length} cuentas pendientes.\n\nQuedará un saldo a favor de ${this.formatearMoneda(valorRestante)} para futuros pagos.`;
      tipoAlerta = 'info';
    } else if (valorRestante === 0 && totalDeudaPendiente > this.model.valor_recibido) {
      mensaje = `El valor de ${this.formatearMoneda(this.model.valor_recibido)} ha sido distribuido completamente entre ${this.cuentasSeleccionadas.length} cuentas.\n\nAún quedan cuentas pendientes por pagar.`;
    } else if (valorRestante === 0 && totalAplicado === totalDeudaPendiente) {
      mensaje = `¡Excelente! El valor de ${this.formatearMoneda(this.model.valor_recibido)} cubre exactamente todas las ${this.cuentasSeleccionadas.length} cuentas pendientes.`;
    } else {
      mensaje = `El valor de ${this.formatearMoneda(this.model.valor_recibido)} ha sido distribuido completamente entre ${this.cuentasSeleccionadas.length} cuentas.`;
    }

    Swal.fire({
      title: 'Distribución automática completada',
      text: mensaje,
      icon: tipoAlerta,
      confirmButtonText: 'Entendido'
    });

    this.actualizarTotales();
  }

  getCuentaAplicadaValor(idCuenta: number): number {
    const cuentaAplicada = this.model.cuentas_aplicadas.find(ca => ca.id_cuenta_por_cobrar === idCuenta);
    return cuentaAplicada ? cuentaAplicada.valor_aplicado : 0;
  }

  esSaldoCompletado(): boolean {
    return this.valorRestante === 0 && this.model.valor_recibido > 0;
  }

  esSaldoPendiente(): boolean {
    return this.valorRestante > 0 && this.model.valor_recibido > 0;
  }

  getEstadoCuenta(cuenta: any): string {
    const fechaCuenta = new Date(cuenta.fecha);
    const fechaHoy = new Date();

    fechaHoy.setHours(0, 0, 0, 0);
    fechaCuenta.setHours(0, 0, 0, 0);

    if (fechaCuenta < fechaHoy && cuenta.valor_pagado === 0) {
      return 'estado-vencido-sin-pago';
    }

    if (fechaCuenta < fechaHoy && cuenta.valor_pagado < cuenta.valor) {
      return 'estado-vencido-pago-parcial';
    }

    return '';
  }

  validarFormularioConDetalles(): { valido: boolean, mensajes: string[] } {
    const errores: string[] = [];

    if (!this.model.fecha) {
      errores.push("Debe seleccionar una fecha válida");
    }

    if (this.model.id_acudiente == "0") {
      errores.push("Debe seleccionar un acudiente");
    }

    if (!this.model.id_tipo_pago) {
      errores.push("Debe seleccionar un tipo de pago");
    }

    if (this.model.valor_recibido <= 0) {
      errores.push("El valor recibido debe ser mayor a cero");
    }

    if (this.cuentasSeleccionadas.length === 0) {
      errores.push("Debe seleccionar al menos una cuenta para aplicar el pago");
    } else {
      const totalAplicado = this.model.cuentas_aplicadas.reduce(
        (sum, ca) => sum + ca.valor_aplicado, 0
      );

      if (totalAplicado <= 0) {
        errores.push("El valor total aplicado no puede ser cero");
      }

      if (totalAplicado > this.model.valor_recibido) {
        errores.push(`El total aplicado (${this.formatearMoneda(totalAplicado)}) excede el valor recibido (${this.formatearMoneda(this.model.valor_recibido)})`);
      }
    }

    if ((this.model.id_tipo_pago === '2' || this.model.id_tipo_pago === '3') && !this.model.referencia_bancaria) {
      errores.push("Debe ingresar una referencia bancaria para este tipo de pago");
    }

    return {
      valido: errores.length === 0,
      mensajes: errores
    };
  }

  formularioValido(): boolean {
    const validacion = this.validarFormularioConDetalles();
    return validacion.valido;
  }

  grabar() {
    this.submitted = true;
    const validacion = this.validarFormularioConDetalles();

    if (!validacion.valido) {
      if (validacion.mensajes.length > 0) {
        Swal.fire('Error de validación', validacion.mensajes[0], 'error');
      }
      return;
    }

    const datosPago = {
      id: this.model.id,
      fecha: this.model.fecha,
      id_estudiante: this.model.id_estudiante,
      id_acudiente: this.model.id_acudiente,
      id_tipo_pago: this.model.id_tipo_pago,
      valor_recibido: this.model.valor_recibido,
      saldo: this.model.saldo,
      observaciones: this.model.observaciones || '',
      referencia_bancaria: this.model.referencia_bancaria || '',
      fecha_registro: new Date().toISOString().replace('T', ' ').substring(0, 19),
      id_usuario_registro: this.model.id_usuario_registro,
      fecha_contabilizacion: null,
      id_usuario_contable: null
    };

    let cuentasNuevasAplicadas: CuentaAplicadaModel[] = [];

    if (this.accion === 'editar') {
      cuentasNuevasAplicadas = this.model.cuentas_aplicadas
        .filter(cuenta => cuenta.id === 0 && cuenta.valor_aplicado > 0)
        .map(cuenta => ({
          ...cuenta,
          fecha: this.model.fecha
        }));

      console.log('Nuevas cuentas a aplicar en edición:', cuentasNuevasAplicadas);
    } else {
      cuentasNuevasAplicadas = this.model.cuentas_aplicadas.map(cuenta => ({
        ...cuenta,
        fecha: this.model.fecha
      }));
    }

    let mensaje = this.accion === 'crear'
      ? `¿Está seguro de registrar este pago por ${this.formatearMoneda(this.model.valor_recibido)}?`
      : `¿Está seguro de actualizar este pago?`;

    if (this.valorRestante > 0) {
      mensaje += ` Quedará un saldo de ${this.formatearMoneda(this.valorRestante)} a favor del estudiante.`;
    }

    if (this.accion === 'editar' && cuentasNuevasAplicadas.length > 0) {
      const totalNuevasAplicaciones = cuentasNuevasAplicadas.reduce((sum, ca) => sum + ca.valor_aplicado, 0);
      mensaje += ` Se aplicará ${this.formatearMoneda(totalNuevasAplicaciones)} a ${cuentasNuevasAplicadas.length} nueva(s) cuenta(s).`;
    }

    // Informar si se asociará un reporte pendiente
    if (this.reporteSeleccionado) {
      mensaje += ` Se asociará el reporte de pago #${this.reporteSeleccionado.id} por ${this.formatearMoneda(this.reporteSeleccionado.valor)}.`;
    }

    Swal.fire({
      title: 'Confirmación',
      text: mensaje,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, continuar',
      cancelButtonText: 'No, cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        console.log('Datos a enviar:', datosPago);

        if (this.accion === 'crear') {
          this.pagosService.crear(datosPago).subscribe({
            next: (respuesta: any) => {
              console.log('Respuesta del servicio:', respuesta);
              if (respuesta && respuesta.id) {
                const idPagoRecibido = respuesta.id;
                this.asociarReporteAlPago(idPagoRecibido);
                this.procesarCuentasAplicadas(idPagoRecibido, cuentasNuevasAplicadas);
              } else {
                Swal.fire('Error', 'No se pudo registrar el pago correctamente', 'error');
              }
            },
            error: (error: any) => {
              console.error('Error al registrar el pago:', error);
              Swal.fire('Error', `Hubo un problema al registrar el pago: ${error.message || 'Error desconocido'}`, 'error');
            }
          });
        } else {
          // Modo editar
          this.pagosService.actualizar(datosPago).subscribe({
            next: (respuesta: any) => {
              console.log('Respuesta del servicio de actualización:', respuesta);

              // Asociar reporte de pago si hay uno seleccionado
              this.asociarReporteAlPago(this.model.id);

              if (cuentasNuevasAplicadas.length > 0) {
                this.procesarCuentasAplicadas(this.model.id, cuentasNuevasAplicadas);
              } else {
                Swal.fire({
                  title: 'Pago actualizado con éxito',
                  icon: 'success',
                  confirmButtonText: 'Aceptar'
                }).then(() => {
                  this.volver();
                });
              }
            },
            error: (error: any) => {
              console.error('Error al actualizar el pago:', error);
              Swal.fire('Error', `Hubo un problema al actualizar el pago: ${error.message || 'Error desconocido'}`, 'error');
            }
          });
        }
      }
    });
  }

  procesarCuentasAplicadas(idPagoRecibido: number, cuentasAplicadas: CuentaAplicadaModel[]) {
    if (cuentasAplicadas.length === 0) {
      this.mostrarMensajeExito();
      return;
    }

    const cuentasParaEnviar = cuentasAplicadas.map(cuenta => ({
      id_cuenta_por_cobrar: cuenta.id_cuenta_por_cobrar,
      valor_aplicado: cuenta.valor_aplicado,
      fecha: cuenta.fecha
    }));

    console.log(`Procesando ${cuentasParaEnviar.length} cuentas en lote...`);

    this.cuentaPagadaService.crearEnLote(idPagoRecibido, cuentasParaEnviar).subscribe({
      next: (respuesta: any) => {
        console.log('Todas las cuentas aplicadas fueron registradas correctamente:', respuesta);

        if (respuesta.success) {
          this.mostrarMensajeExito();
        } else {
          Swal.fire({
            title: 'Advertencia',
            text: 'El pago se registró pero hubo algunos problemas al aplicar las cuentas. Por favor, revise el detalle del pago.',
            icon: 'warning',
            confirmButtonText: 'Entendido'
          }).then(() => {
            this.mostrarMensajeExito();
          });
        }
      },
      error: (error: any) => {
        console.error('Error al registrar cuentas aplicadas en lote:', error);
      }
    });
  }

  // Método de respaldo por si falla el procesamiento en lote
  procesarCuentasAplicadasIndividual(idPagoRecibido: number, cuentasAplicadas: CuentaAplicadaModel[]) {
    if (cuentasAplicadas.length === 0) {
      this.mostrarMensajeExito();
      return;
    }

    let cuentasProcesadas = 0;
    let errores = 0;

    cuentasAplicadas.forEach(cuenta => {
      const datosAplicacion = {
        id_cuenta_por_cobrar: cuenta.id_cuenta_por_cobrar,
        id_pago_recibido: idPagoRecibido,
        valor_aplicado: cuenta.valor_aplicado,
        fecha: cuenta.fecha
      };

      this.cuentaPagadaService.crear(datosAplicacion).subscribe({
        next: (respuesta: any) => {
          console.log('Cuenta aplicada registrada correctamente:', respuesta);
          cuentasProcesadas++;
          if (cuentasProcesadas + errores === cuentasAplicadas.length) {
            this.verificarCompletado(errores);
          }
        },
        error: (error: any) => {
          console.error('Error al registrar cuenta aplicada:', error);
          errores++;
          if (cuentasProcesadas + errores === cuentasAplicadas.length) {
            this.verificarCompletado(errores);
          }
        }
      });
    });
  }

  verificarCompletado(errores: number) {
    if (errores > 0) {
      Swal.fire({
        title: 'Advertencia',
        text: `El pago se registró pero hubo ${errores} errores al registrar las cuentas aplicadas.`,
        icon: 'warning',
        confirmButtonText: 'Entendido'
      }).then(() => {
        this.mostrarMensajeExito();
      });
    } else {
      this.mostrarMensajeExito();
    }
  }

  mostrarMensajeExito() {
    Swal.fire({
      title: this.accion === 'crear' ? 'Pago registrado con éxito' : 'Pago actualizado',
      icon: 'success',
      confirmButtonText: 'Aceptar'
    }).then(() => {
      if (this.accion === 'crear') {
        this.limpiarFormulario();
      } else {
        this.volver();
      }
    });
  }

  limpiarFormulario() {
    this.model = {
      id: 0,
      fecha: "",
      id_estudiante: "",
      id_acudiente: "",
      id_tipo_pago: "",
      valor_recibido: 0,
      saldo: 0,
      observaciones: "",
      referencia_bancaria: "",
      id_usuario_registro: null,
      cuentas_aplicadas: []
    };
    const hoy = new Date();
    this.model.fecha = hoy.toISOString().split('T')[0];
    this.model.id_usuario_registro = this.utilService.obtenerIdUsuarioActual();
    this.cuentasSeleccionadas = [];
    this.submitted = false;
    this.valorRestante = 0;
    this.valorRecibidoFormateado = '';
    this.valoresAplicadosFormateados = {};
    this.reporteSeleccionado = null;
    this.reportesPendientes = [];
    this.cargarReportesPendientes();
    this.obtenerCuentasPorCobrar();

    if (this.listas.acudientes.length > 0) {
      this.model.id_acudiente = this.listas.acudientes[0].id;
    }
  }

  formatearFechaCompleta(dateString: string | null | undefined): string {
    if (!dateString) return '';

    const date = new Date(dateString);
    const opciones: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };

    return date.toLocaleDateString('es-CO', opciones);
  }

  volver() {
    this.router.navigate([this.regresar]);
  }

  // ============================================
  // MÉTODOS PARA REPORTES DE PAGO
  // ============================================

  cargarReportesPendientes(): void {
    if (!this.idEstudiante || this.idEstudiante === '0') return;

    this.reportesPagoService.obtenerPendientesByEstudiante(this.idEstudiante).subscribe({
      next: (response: any) => {
        this.reportesPendientes = response.body || [];
        console.log('Reportes pendientes cargados:', this.reportesPendientes.length);
      },
      error: (error: any) => {
        console.error('Error al cargar reportes pendientes:', error);
        this.reportesPendientes = [];
      }
    });
  }

  cargarReporteAsociado(): void {
    setTimeout(() => {
      if (!this.id || this.id === '0') return;

      this.reportesPagoService.obtenerByPagoRecibido(this.id).subscribe({
        next: (response: any) => {
          const reportes = response.body || [];
          if (reportes.length > 0) {
            this.reporteAsociado = reportes[0];
            console.log('Reporte asociado encontrado:', this.reporteAsociado);
          } else {
            // No hay reporte asociado: cargar pendientes para poder asociar uno
            this.reporteAsociado = null;
            if (this.accion === 'editar') {
              this.cargarReportesPendientes();
            }
          }
        },
        error: (error: any) => {
          console.error('Error al cargar reporte asociado:', error);
          // En caso de error, también intentar cargar pendientes en editar
          if (this.accion === 'editar') {
            this.cargarReportesPendientes();
          }
        }
      });
    }, 500);
  }

  seleccionarReporte(reporte: any): void {
    if (this.reporteSeleccionado?.id === reporte.id) {
      this.deseleccionarReporte();
      return;
    }

    this.reporteSeleccionado = reporte;

    // Solo pre-llenar datos en modo crear (en editar el pago ya existe)
    if (this.accion === 'crear') {
      this.model.valor_recibido = Number(reporte.valor);
      this.formatearValorRecibido(this.model.valor_recibido);
      this.model.id_tipo_pago = String(reporte.id_tipo_pago);
      this.model.fecha = reporte.fecha_pago;
      this.actualizarTotales();
    }

    console.log('Reporte seleccionado:', reporte.id, '- Valor:', reporte.valor);
  }

  deseleccionarReporte(): void {
    this.reporteSeleccionado = null;
  }

  asociarReporteAlPago(idPagoRecibido: number): void {
    if (!this.reporteSeleccionado) return;

    this.reportesPagoService.asociarPago({
      id: this.reporteSeleccionado.id,
      id_pago_recibido: idPagoRecibido
    }).subscribe({
      next: () => {
        console.log('Reporte de pago asociado correctamente al pago:', idPagoRecibido);
      },
      error: (error: any) => {
        console.error('Error al asociar reporte de pago:', error);
      }
    });
  }

  obtenerUrlComprobante(ruta: string): string {
    if (!ruta) return '';
    const baseUrl = environment.api.replace(/\/api\/?$/, '/');
    return baseUrl + ruta;
  }
}