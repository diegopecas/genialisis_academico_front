import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import Swal from 'sweetalert2';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../../../common/header/header.component';
import { SearchableDropdownComponent, DropdownItem } from '../../../../common/searchable-dropdown/searchable-dropdown.component';
import { CuentasPorCobrarService } from '../../../../services/cuentas-por-cobrar.service';
import { ClasificacionProductosServiciosService } from '../../../../services/clasificacion-productos-servicios.service';
import { ProductosServiciosService } from '../../../../services/productos-servicios.service';
import { ColaboradoresService } from '../../../../services/colaboradores.service';
import { UtilService } from '../../../../common/constantes/util.service';
import { CuentaPagadaService } from '../../../../services/cuenta-pagada.service';
import { HorariosAlimentacionService } from '../../../../services/horarios-alimentacion.service';

interface CuentaModel {
  id: number;
  id_producto_servicio: string;
  id_persona: string;
  fecha: string;
  valor: number;
  detalle: string;
  id_usuario: number | null;
  id_horario_alimentacion: number | null;
  valor_pagado?: number;
  saldo?: number;
}

interface PagoAplicado {
  id: number;
  id_cuenta_por_cobrar: number;
  id_pago_recibido: number;
  valor_aplicado: number;
  fecha_aplicacion: string;
  fecha_pago: string;
  referencia_bancaria?: string;
  anulado?: number;
  tipo_pago: string;
}

@Component({
  selector: 'app-crear-colaboradores-productos-servicios',
  templateUrl: './crear-colaboradores-productos-servicios.component.html',
  styleUrl: './crear-colaboradores-productos-servicios.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, SearchableDropdownComponent]
})
export class CrearColaboradoresProductosServiciosComponent implements OnInit {

  public id = "0";
  public idColaborador = "0";
  public accion = "";
  public editable = false;
  public submitted = false;
  public clasificacionSeleccionada: number | '' = '';
  public productosFiltrados: any[] = [];
  public colaborador: any;
  public nombre_colaborador = "";
  public titulo = "Productos & Servicios ";
  public regresar = '/colaboradores-productos-servicios/';
  public listas = {
    clasificacionProductosServicios: [] as any[],
    productosServicios: [] as any[],
    personas: [] as any[],
    horariosAlimentacion: [] as any[]
  };

  public productosDropdownItems: DropdownItem[] = [];
  public esProductoMensual = false;
  public fechaInicial = "";
  public fechaFinal = "";
  public esClasificacionAlimentacion = false;
  public esPeriodicidadDiaria = false;
  public requiereHorarioAlimentacion = false;
  public valorPagado = 0;
  public saldoCalculado = 0;
  public valorFormateado: string = '';
  public saldoFormateado: string = '';
  public valorPagadoFormateado: string = '';
  public pagosAplicados: PagoAplicado[] = [];
  public camposBloqueados = false;

  public model: CuentaModel = {
    id: 0,
    id_producto_servicio: "",
    id_persona: "",
    fecha: "",
    valor: 0,
    detalle: "",
    id_usuario: null,
    id_horario_alimentacion: null
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private cuentasService: CuentasPorCobrarService,
    private clasificacionProductosServiciosService: ClasificacionProductosServiciosService,
    private productosServiciosService: ProductosServiciosService,
    private colaboradoresService: ColaboradoresService,
    private utilService: UtilService,
    private cuentaPagadaService: CuentaPagadaService,
    private horariosAlimentacionService: HorariosAlimentacionService
  ) { }

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.accion = params['accion'];
      this.id = params['id'];
      this.idColaborador = params['idColaborador'];
      this.regresar = this.regresar + this.idColaborador;
      this.obtenerColaborador(this.idColaborador);

      switch (this.accion) {
        case 'crear':
          this.editable = true;
          this.camposBloqueados = false;
          this.consultarListas();
          const hoy = new Date();
          this.model.fecha = hoy.toISOString().split('T')[0];
          this.fechaInicial = hoy.toISOString().split('T')[0];
          this.fechaFinal = hoy.toISOString().split('T')[0];
          this.model.id_usuario = this.utilService.obtenerIdUsuarioActual();
          this.valorPagado = 0;
          this.saldoCalculado = 0;
          this.valorFormateado = '0';
          this.saldoFormateado = '0';
          this.valorPagadoFormateado = '0';
          break;
        case 'editar':
          this.editable = true;
          this.consultarListas();
          this.obtenerCuenta(this.id);
          this.obtenerPagosAplicados(this.id, true);
          break;
        case 'consultar':
          this.editable = false;
          this.camposBloqueados = true;
          this.consultarListas();
          this.obtenerCuenta(this.id);
          this.obtenerPagosAplicados(this.id);
          break;
      }
    });

    this.actualizarSaldo();
  }

  formatearMoneda(valor: number): string {
    if (valor === null || valor === undefined) return '0';
    return valor.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }

  onValorInput(event: any) {
    const inputValue = event.target.value.replace(/[^\d]/g, '');

    if (inputValue === '') {
      this.model.valor = 0;
      this.valorFormateado = '0';
    } else {
      this.model.valor = parseInt(inputValue, 10);
      this.valorFormateado = this.formatearMoneda(this.model.valor);
    }

    this.actualizarSaldo();
  }

  obtenerPagosAplicados(idCuenta: string, esEdicion: boolean = false) {
    this.pagosAplicados = [];

    this.cuentaPagadaService.obtenerPorCuentaPorCobrar(idCuenta).subscribe({
      next: (response: any) => {
        if (response.body && Array.isArray(response.body)) {
          this.pagosAplicados = response.body;

          if (esEdicion && this.pagosAplicados.length > 0) {
            this.camposBloqueados = true;

            Swal.fire({
              title: 'Información',
              text: 'Esta cuenta ya tiene pagos aplicados. Solo podrá modificar la fecha y el detalle.',
              icon: 'info',
              confirmButtonText: 'Entendido'
            });
          }
        }
      },
      error: (error) => {
        console.error('Error al obtener pagos aplicados:', error);
        Swal.fire('Error', 'Hubo un problema al obtener la información de pagos', 'error');
      }
    });
  }

  consultarListas() {
    this.clasificacionProductosServiciosService.obtenerTodos().subscribe((response: any) => {
      this.listas.clasificacionProductosServicios = response.body;
    });

    this.productosServiciosService.obtenerTodos().subscribe((response: any) => {
      this.listas.productosServicios = response.body;
      console.log("productosServiciosService", this.listas.productosServicios);
      this.productosDropdownItems = [];
    });

    this.horariosAlimentacionService.obtenerTodos().subscribe((response: any) => {
      this.listas.horariosAlimentacion = response.body;
    });

    this.listas.personas = [];
  }

  obtenerCuenta(id: any) {
    this.cuentasService.obtenerById(id).subscribe((response: any) => {
      const body = response.body;
      let cuenta = body[0];
      let producto = this.obtenerProductoPorId(cuenta.id_producto_servicio);
      this.clasificacionSeleccionada = producto.id_clasificacion_productos_servicios;
      this.filtrarProductos();
      this.model = cuenta;

      this.verificarRequiereHorarioAlimentacion();

      this.valorPagado = cuenta.valor_pagado || 0;
      this.saldoCalculado = cuenta.saldo || 0;

      this.valorFormateado = this.formatearMoneda(this.model.valor);
      this.valorPagadoFormateado = this.formatearMoneda(this.valorPagado);
      this.saldoFormateado = this.formatearMoneda(this.saldoCalculado);
    });
  }

  onProductoSeleccionado(producto: DropdownItem | null) {
    if (producto) {
      this.model.id_producto_servicio = producto.id.toString();
      this.asignarValorSugerido();
    } else {
      this.model.id_producto_servicio = "";
      this.model.valor = 0;
      this.valorFormateado = '0';
      this.esProductoMensual = false;
      this.requiereHorarioAlimentacion = false;
      this.model.id_horario_alimentacion = null;
      this.actualizarSaldo();
    }
  }

  esProductoPeriodicidadMensual(): boolean {
    const idProducto = String(this.model.id_producto_servicio);
    const producto = this.listas.productosServicios.find(p => String(p.id) === idProducto);
    return producto && producto.id_periodicidad_cobro === 2;
  }

  verificarRequiereHorarioAlimentacion(): void {
    const idProducto = String(this.model.id_producto_servicio);
    const producto = this.listas.productosServicios.find(p => String(p.id) === idProducto);

    if (producto) {
      this.esClasificacionAlimentacion = producto.clasificacion_codigo === 'ALIMENTACION';
      this.requiereHorarioAlimentacion = this.esClasificacionAlimentacion;

      if (!this.requiereHorarioAlimentacion) {
        this.model.id_horario_alimentacion = null;
      }
    } else {
      this.esClasificacionAlimentacion = false;
      this.requiereHorarioAlimentacion = false;
      this.model.id_horario_alimentacion = null;
    }
  }

  async grabar() {
    this.submitted = true;
    if (!this.formularioValido()) return;

    if (this.accion === 'crear') {
      if (this.esProductoMensual && this.accion === 'crear') {
        this.crearCuentasMensuales();
        return;
      }

      this.cuentasService.verificarDuplicados(this.model).subscribe({
        next: (respuesta: any) => {
          if (respuesta.cantidad > 0) {
            let tablaHTML = '<table class="table table-sm"><thead><tr><th>Fecha</th><th>Valor</th></tr></thead><tbody>';
            respuesta.duplicados.forEach((dup: any) => {
              tablaHTML += `<tr><td>${dup.fecha}</td><td>$ ${this.formatearMoneda(dup.valor)}</td></tr>`;
            });
            tablaHTML += '</tbody></table>';

            Swal.fire({
              title: '¡Atención!',
              html: `Se encontraron ${respuesta.cantidad} registros similares:<br>${tablaHTML}<br>¿Desea continuar con la creación?`,
              icon: 'warning',
              showCancelButton: true,
              confirmButtonText: 'Sí, continuar',
              cancelButtonText: 'No, cancelar'
            }).then((result) => {
              if (result.isConfirmed) {
                this.procesarCreacionActualizacion();
              }
            });
          } else {
            this.procesarCreacionActualizacion();
          }
        },
        error: (error) => {
          console.error('Error al verificar duplicados:', error);
          Swal.fire('Error', 'Hubo un problema al verificar duplicados', 'error');
        }
      });
    } else {
      this.procesarCreacionActualizacion();
    }
  }

  crearCuentasMensuales() {
    if (!this.fechaInicial || !this.fechaFinal) {
      Swal.fire('Error', 'Debe especificar fecha inicial y fecha final para productos mensuales', 'error');
      return;
    }

    const fechaIni = new Date(this.fechaInicial);
    const fechaFin = new Date(this.fechaFinal);

    if (fechaFin < fechaIni) {
      Swal.fire('Error', 'La fecha final debe ser posterior a la fecha inicial', 'error');
      return;
    }

    const cuentasMensuales: CuentaModel[] = [];
    let year = fechaIni.getFullYear();
    let month = fechaIni.getMonth();

    let currentDate = new Date(year, month, 1);
    while (currentDate <= fechaFin) {
      const nuevaCuenta: CuentaModel = {
        id: 0,
        id_producto_servicio: this.model.id_producto_servicio,
        id_persona: this.model.id_persona,
        fecha: currentDate.toISOString().split('T')[0],
        valor: this.model.valor,
        detalle: this.model.detalle,
        id_usuario: this.model.id_usuario,
        id_horario_alimentacion: this.requiereHorarioAlimentacion ? this.model.id_horario_alimentacion : null
      };

      cuentasMensuales.push(nuevaCuenta);

      month++;
      if (month > 11) {
        month = 0;
        year++;
      }

      currentDate = new Date(year, month, 1);
    }

    if (cuentasMensuales.length === 0) {
      Swal.fire('Error', 'No se pudieron generar cuentas mensuales', 'error');
      return;
    }

    if (cuentasMensuales.length > 0) {
      const cuentaRepresentativa = cuentasMensuales[0];

      this.cuentasService.verificarDuplicados(cuentaRepresentativa).subscribe({
        next: (respuesta: any) => {
          if (respuesta.cantidad > 0) {
            let tablaHTML = '<table class="table table-sm"><thead><tr><th>Fecha</th><th>Valor</th></tr></thead><tbody>';
            respuesta.duplicados.forEach((dup: any) => {
              tablaHTML += `<tr><td>${dup.fecha}</td><td>$ ${this.formatearMoneda(dup.valor)}</td></tr>`;
            });
            tablaHTML += '</tbody></table>';

            Swal.fire({
              title: '¡Atención!',
              html: `Se encontraron ${respuesta.cantidad} registros similares:<br>${tablaHTML}<br>
                 Esto podría indicar que ya existen algunas cuentas para este periodo.<br>
                 ¿Desea continuar con la creación de ${cuentasMensuales.length} cuentas mensuales?`,
              icon: 'warning',
              showCancelButton: true,
              confirmButtonText: 'Sí, continuar',
              cancelButtonText: 'No, cancelar'
            }).then((result) => {
              if (result.isConfirmed) {
                this.crearMultiplesCuentas(cuentasMensuales);
              }
            });
          } else {
            this.confirmarCreacionCuentasMensuales(cuentasMensuales);
          }
        },
        error: (error) => {
          console.error('Error al verificar duplicados:', error);
          Swal.fire('Error', 'Hubo un problema al verificar duplicados', 'error');
        }
      });
    }
  }

  confirmarCreacionCuentasMensuales(cuentasMensuales: CuentaModel[]) {
    Swal.fire({
      title: 'Confirmación',
      html: `Se crearán ${cuentasMensuales.length} cuentas mensuales desde ${this.fechaInicial} hasta ${this.fechaFinal}.<br>¿Desea continuar?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, crear cuentas',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.crearMultiplesCuentas(cuentasMensuales);
      }
    });
  }

  crearMultiplesCuentas(cuentasMensuales: CuentaModel[]) {
    let cuentasCreadas = 0;

    cuentasMensuales.forEach(cuenta => {
      if (!this.requiereHorarioAlimentacion) {
        cuenta.id_horario_alimentacion = null;
      } else {
        cuenta.id_horario_alimentacion = this.model.id_horario_alimentacion;
      }

      this.cuentasService.crear(cuenta).subscribe({
        next: (response: any) => {
          cuentasCreadas++;
          if (cuentasCreadas === cuentasMensuales.length) {
            Swal.fire({
              title: `${cuentasCreadas} cuentas creadas con éxito`,
              icon: 'success',
              confirmButtonText: 'Aceptar'
            }).then(() => {
              this.limpiarFormulario();
            });
          }
        },
        error: (error) => {
          console.error('Error al crear cuenta mensual:', error);
          Swal.fire('Error', `Hubo un problema al crear la cuenta para ${cuenta.fecha}`, 'error');
        }
      });
    });
  }

  private procesarCreacionActualizacion() {
    if (!this.requiereHorarioAlimentacion) {
      this.model.id_horario_alimentacion = null;
    }

    const servicio = this.accion === 'crear'
      ? this.cuentasService.crear(this.model)
      : this.cuentasService.actualizar(this.model);

    servicio.subscribe({
      next: (response: any) => {
        if (response.id) {
          Swal.fire({
            title: this.accion === 'crear' ? 'Cuenta creada con éxito' : 'Cuenta actualizada',
            icon: 'success',
            confirmButtonText: 'Aceptar'
          }).then(() => {
            if (this.accion === 'crear') {
              this.limpiarFormulario();
            } else {
              this.volver();
            }
          });
        } else {
          Swal.fire('Error', 'Hubo un problema al guardar los datos', 'error');
        }
      },
      error: (error) => {
        console.error('Error al procesar la operación:', error);
        Swal.fire('Error', 'Hubo un problema al guardar los datos', 'error');
      }
    });
  }

  formularioValido() {
    let validacionBase = this.model.id_producto_servicio &&
      this.model.id_persona &&
      this.model.valor > 0;

    if (this.requiereHorarioAlimentacion && !this.model.id_horario_alimentacion) {
      return false;
    }

    if (this.esProductoMensual && this.accion === 'crear') {
      return validacionBase &&
        this.fechaInicial &&
        this.fechaFinal &&
        (!this.requiereHorarioAlimentacion || this.model.id_horario_alimentacion);
    }

    return validacionBase &&
      this.model.fecha &&
      (!this.requiereHorarioAlimentacion || this.model.id_horario_alimentacion);
  }

  limpiarFormulario() {
    this.model = {
      id: 0,
      id_producto_servicio: "",
      id_persona: this.colaborador?.id_persona || "",
      fecha: "",
      valor: 0,
      detalle: "",
      id_usuario: null,
      id_horario_alimentacion: null
    };
    const hoy = new Date();
    this.model.fecha = hoy.toISOString().split('T')[0];
    this.fechaInicial = hoy.toISOString().split('T')[0];
    this.fechaFinal = hoy.toISOString().split('T')[0];
    this.model.id_usuario = this.utilService.obtenerIdUsuarioActual();
    this.valorPagado = 0;
    this.saldoCalculado = 0;
    this.esProductoMensual = false;
    this.esClasificacionAlimentacion = false;
    this.esPeriodicidadDiaria = false;
    this.requiereHorarioAlimentacion = false;
    this.submitted = false;
    this.camposBloqueados = false;

    this.valorFormateado = '0';
    this.valorPagadoFormateado = '0';
    this.saldoFormateado = '0';

    this.clasificacionSeleccionada = '';
    this.productosDropdownItems = [];
  }

  volver() {
    this.router.navigate(['/colaboradores-productos-servicios/' + this.idColaborador]);
  }

  filtrarProductos() {
    console.log("filtrarProductos", this.clasificacionSeleccionada);
    this.productosFiltrados = this.listas.productosServicios.filter(
      p => p.id_clasificacion_productos_servicios === this.clasificacionSeleccionada
    );
    this.productosDropdownItems = this.productosFiltrados.map(producto => ({
      id: producto.id,
      nombre: `${producto.nombre} - ${producto.nombre_periodicidad}`,
      descripcion: producto.detalles,
      disabled: producto.disponible === 0
    }));
    console.log("productosDropdownItems", this.productosDropdownItems);
    this.esClasificacionAlimentacion = this.productosFiltrados.length > 0 && this.productosFiltrados[0].clasificacion_codigo === 'ALIMENTACION';
    this.requiereHorarioAlimentacion = this.esClasificacionAlimentacion;

    if (!this.camposBloqueados) {
      this.model.id_producto_servicio = "";
      this.model.valor = 0;
      this.esProductoMensual = false;
      this.model.id_horario_alimentacion = null;

      this.valorFormateado = '0';
      this.actualizarSaldo();
    }
  }

  asignarValorSugerido() {
    if (!this.camposBloqueados) {
      const producto = this.productosFiltrados.find(p => p.id === Number(this.model.id_producto_servicio));
      if (producto) {
        this.model.valor = producto.valor_sugerido || 0;
        this.valorFormateado = this.formatearMoneda(this.model.valor);

        this.esProductoMensual = this.esProductoPeriodicidadMensual();
        this.esClasificacionAlimentacion = producto.clasificacion_codigo === 'ALIMENTACION';
        this.requiereHorarioAlimentacion = this.esClasificacionAlimentacion;

        this.model.id_horario_alimentacion = null;

        if (this.requiereHorarioAlimentacion && producto.id_horario_alimentacion_sugerido) {
          this.model.id_horario_alimentacion = producto.id_horario_alimentacion_sugerido;
        }

        this.actualizarSaldo();
      }
    }
  }

  actualizarSaldo() {
    if (this.accion === 'crear') {
      this.saldoCalculado = this.model.valor;
      this.valorPagado = 0;
    } else {
      this.saldoCalculado = this.model.valor - this.valorPagado;
      if (this.saldoCalculado < 0) this.saldoCalculado = 0;
    }

    this.saldoFormateado = this.formatearMoneda(this.saldoCalculado);
    this.valorPagadoFormateado = this.formatearMoneda(this.valorPagado);
  }

  obtenerColaborador(id_colaborador: any) {
    this.colaboradoresService.obtenerById(id_colaborador).subscribe((response: any) => {
      const body = response.body as any[];
      this.colaborador = body[0];
      this.model.id_persona = this.colaborador.id_persona;
      this.nombre_colaborador = [
        this.colaborador.primer_nombre,
        this.colaborador.segundo_nombre,
        this.colaborador.primer_apellido,
        this.colaborador.segundo_apellido
      ].filter(Boolean).join(' ');
      this.titulo = this.titulo + " para " + this.nombre_colaborador;
    });
  }

  obtenerProductoPorId(id: any) {
    return this.listas.productosServicios.find(producto => producto.id === id);
  }
}