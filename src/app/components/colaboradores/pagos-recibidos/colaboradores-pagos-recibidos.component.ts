import { CommonModule } from '@angular/common';
import { Component, OnInit, Input, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import Swal from 'sweetalert2';
import { HeaderComponentAnidado } from '../../../common/header-anidado/header-anidado.component';
import { TablasComponent } from '../../../common/tablas/tablas.component';
import { ColaboradoresService } from '../../../services/colaboradores.service';
import { PagosRecibidosService } from '../../../services/pagos-recibidos.service';
import { UtilService } from '../../../common/constantes/util.service';

@Component({
  selector: 'app-colaboradores-pagos-recibidos',
  standalone: true,
  imports: [CommonModule, TablasComponent, HeaderComponentAnidado],
  templateUrl: './colaboradores-pagos-recibidos.component.html',
  styleUrl: './colaboradores-pagos-recibidos.component.scss'
})
export class ColaboradoresPagosRecibidosComponent implements OnInit {
  @ViewChild(TablasComponent) tablasComponent!: TablasComponent;

  @Input() idColaboradorInput: string | null = null;
  public modoEmbebido = false;

  public titulo = "Gestión de pagos recibidos";
  public idColaborador = "0";
  public accion = "";
  public path = "/colaboradores-pagos-recibidos/crear/0/";
  public colaborador: any;
  public nombre_colaborador = "";
  public titulos = [] as any[];
  public datos = [] as any[];
  public columnasFiltro = [
    { columna: 'Fecha', tipoFiltro: 'fecha' as 'fecha' | 'normal' },
    'Tipo de Pago',
    'Valor Recibido',
    'Saldo',
    'Estado'
  ];

  // Resumen dinámico (se adapta a filtrado o selección)
  public resumen = {
    totalRecibido: 0,
    totalAplicado: 0,
    totalSaldo: 0,
    haySeleccion: false
  };

  private registrosSeleccionados = new Set<any>();

  public acciones = [
    { id: 'contabilizar', label: 'Contabilizar', icono: '/assets/images/contabilizar.png' },
    { id: 'imprimir', label: 'Imprimir', icono: '/assets/images/comprobante_pago.png' }
  ] as any[];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private colaboradoresService: ColaboradoresService,
    private pagosRecibidosService: PagosRecibidosService,
    private utilService: UtilService
  ) { }

  ngOnInit() {
    if (this.idColaboradorInput) {
      this.modoEmbebido = true;
      this.idColaborador = this.idColaboradorInput;
      this.path = this.path + this.idColaborador;
      this.obtenerColaborador(this.idColaborador);
      this.crearTitulos();
      return;
    }

    this.route.params.subscribe(params => {
      this.accion = params['accion'];
      this.idColaborador = params['id'];
      this.path = this.path + this.idColaborador;
      this.obtenerColaborador(this.idColaborador);
    });

    this.crearTitulos();
  }

  obtenerByColaborador(): void {
    this.pagosRecibidosService.obtenerByColaborador(this.idColaborador).subscribe((response: any) => {
      const datos = response.body as any[];

      // Procesar los datos para agregar propiedades calculadas
      this.datos = datos.map(item => {
        let estado = 'Registrado';
        if (item.anulado === 1) {
          estado = 'Anulado';
        } else if (item.id_usuario_contable) {
          estado = 'Contabilizado';
        }

        let fechaEstado = item.fecha_registro;
        if (estado === 'Anulado') {
          fechaEstado = item.fecha_anulacion;
        } else if (estado === 'Contabilizado') {
          fechaEstado = item.fecha_contabilizacion;
        }

        let usuarioEstado = item.nombre_completo_usuario_registro || item.nombre_usuario_registro;
        if (estado === 'Anulado') {
          usuarioEstado = item.nombre_completo_usuario_anulacion || item.nombre_usuario_anulacion;
        } else if (estado === 'Contabilizado') {
          usuarioEstado = item.nombre_completo_usuario_contable || item.nombre_usuario_contable;
        }

        let color = '';
        if (estado === 'Anulado') {
          color = '#f0f0f0';
        } else if (estado === 'Contabilizado') {
          color = '#e6ffe6';
        } else if (item.saldo > 0) {
          color = '#ffffcc';
        }

        return {
          ...item,
          estado: estado,
          fecha_estado: fechaEstado,
          usuario_estado: usuarioEstado,
          color: color
        };
      });

      // Calcular resumen inicial con todos los datos
      this.calcularResumen(this.datos);

      console.log("Pagos recibidos del colaborador:", this.datos);
    });
  }

  /**
   * Calcula los totales del resumen con base en los datos proporcionados.
   * Excluye pagos anulados del cálculo.
   */
  calcularResumen(datos: any[]): void {
    this.resumen = {
      totalRecibido: 0,
      totalAplicado: 0,
      totalSaldo: 0,
      haySeleccion: datos.length > 0 && datos.length < this.datos.length
    };

    datos.forEach(item => {
      if (item.anulado !== 1 && item.estado !== 'Anulado') {
        this.resumen.totalRecibido += Number(item.valor_recibido) || 0;
        this.resumen.totalAplicado += Number(item.valor_aplicado_cuentas) || 0;
        this.resumen.totalSaldo += Number(item.saldo) || 0;
      }
    });
  }

  onDatosFiltradosCambiados(datosFiltrados: any[]): void {
    if (this.registrosSeleccionados.size === 0) {
      this.calcularResumen(datosFiltrados);
      this.resumen.haySeleccion = false;
    }
  }

  onSeleccionCambiada(seleccionados: any[]): void {
    this.registrosSeleccionados = new Set(seleccionados.map(s => s.id));

    if (seleccionados.length > 0) {
      this.calcularResumen(seleccionados);
      this.resumen.haySeleccion = true;
    } else {
      const datosFiltrados = this.tablasComponent?.tabla?.datosFiltrados || this.datos;
      this.calcularResumen(datosFiltrados);
      this.resumen.haySeleccion = false;
    }
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
        alinear: 'centrado',
        tipo: 'date',
        formato: { pattern: 'dd/MM/yyyy' }
      },
      {
        clave: 'tipo_pago',
        alias: 'Tipo de Pago',
        alinear: 'izquierda',
      },
      {
        clave: 'referencia_bancaria',
        alias: 'Referencia Bancaria',
        alinear: 'izquierda',
      },
      {
        clave: 'valor_recibido',
        alias: 'Valor Recibido',
        alinear: 'derecha',
        tipo: 'integer',
        formato: { digitInfo: '1.0-0' }
      },
      {
        clave: 'valor_aplicado_cuentas',
        alias: 'Valor Aplicado',
        alinear: 'derecha',
        tipo: 'integer',
        formato: { digitInfo: '1.0-0' }
      },
      {
        clave: 'saldo',
        alias: 'Saldo',
        alinear: 'derecha',
        tipo: 'integer',
        formato: { digitInfo: '1.0-0' }
      },
      {
        clave: 'estado',
        alias: 'Estado',
        alinear: 'centrado',
      },
      {
        clave: 'fecha_estado',
        alias: 'Fecha Estado',
        alinear: 'centrado',
        tipo: 'date',
        formato: { pattern: 'dd/MM/yyyy HH:mm' }
      },
      {
        clave: 'usuario_estado',
        alias: 'Usuario',
        alinear: 'izquierda',
      }
    ];
  }

  obtenerColaborador(id_colaborador: any) {
    this.colaboradoresService.obtenerById(id_colaborador).subscribe((response: any) => {
      const body = response.body as any[];
      this.colaborador = body[0];
      this.nombre_colaborador = [
        this.colaborador.primer_nombre,
        this.colaborador.segundo_nombre,
        this.colaborador.primer_apellido,
        this.colaborador.segundo_apellido
      ].filter(Boolean).join(' ');
      this.obtenerByColaborador();
      this.titulo = this.titulo + " para " + this.nombre_colaborador;
    });
  }

  seleccionar(event: any) {
    // Comprobar si el registro está anulado antes de permitir ciertas acciones
    if (event.registro.anulado === 1 || event.registro.estado === 'Anulado') {
      if (event.accion === 'editar') {
        Swal.fire({
          title: 'Acción no permitida',
          text: 'No se puede editar un pago que está anulado.',
          icon: 'warning',
          confirmButtonText: 'Aceptar'
        });
        return;
      }
      else if (event.accion === 'eliminar') {
        Swal.fire({
          title: 'Acción no permitida',
          text: 'No se puede anular un pago que ya está anulado.',
          icon: 'warning',
          confirmButtonText: 'Aceptar'
        });
        return;
      }
    }

    // Proceder con las acciones normales
    if (event.accion === 'editar') {
      this.router.navigate(['colaboradores-pagos-recibidos/editar/' + event.id + '/' + this.idColaborador]);
    }
    else if (event.accion === 'eliminar') {
      this.anularPago(event.id, event.registro);
    }
    else if (event.accion === 'consultar') {
      this.router.navigate(['colaboradores-pagos-recibidos/consultar/' + event.id + '/' + this.idColaborador]);
    } else if (event.accion === 'contabilizar') {
      this.contabilizarPago(event.id, event.registro);
    } else if (event.accion === 'imprimir') {
      this.imprimir(event.id, event.registro);
    }
  }

  anularPago(id: any, registro: any) {
    if (registro.anulado === 1) {
      Swal.fire({
        title: 'Pago ya anulado',
        text: 'Este pago ya se encuentra anulado en el sistema.',
        icon: 'info',
        confirmButtonText: 'Aceptar'
      });
      return;
    }

    Swal.fire({
      title: '¿Estás seguro?',
      text: `Se anulará el pago por valor de ${registro.valor_recibido} del ${registro.fecha}. Esta acción no se puede deshacer.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, anular',
      cancelButtonText: 'Cancelar',
      reverseButtons: true,
      input: 'text',
      inputPlaceholder: 'Motivo de anulación (opcional)',
      inputAttributes: {
        autocapitalize: 'off'
      }
    }).then((result) => {
      if (result.isConfirmed) {
        const idUsuarioActual = this.utilService.obtenerIdUsuarioActual();

        const body = {
          id: id,
          id_usuario_anulacion: idUsuarioActual,
          observaciones_anulacion: result.value || "Pago anulado por el usuario"
        };

        this.pagosRecibidosService.anular(body).subscribe((response: any) => {
          if (response && !response.error) {
            Swal.fire({
              title: 'Pago anulado con éxito',
              icon: "success",
              showCancelButton: false,
              focusConfirm: true,
              confirmButtonText: "Aceptar"
            }).then(() => {
              this.obtenerByColaborador();
            });
          } else {
            Swal.fire({
              title: 'Error al anular el pago',
              text: response.message || 'Ha ocurrido un error al intentar anular el pago.',
              icon: "error",
              showCancelButton: false,
              focusConfirm: true,
              confirmButtonText: "Aceptar"
            });
          }
        });
      } else {
        Swal.fire({
          title: 'Operación cancelada',
          icon: 'info',
          confirmButtonText: 'Aceptar'
        });
      }
    });
  }

  contabilizarPago(id: any, registro: any) {
    if (registro.id_usuario_contable) {
      Swal.fire({
        title: 'Pago ya contabilizado',
        text: 'Este pago ya ha sido contabilizado en el sistema.',
        icon: 'info',
        confirmButtonText: 'Aceptar'
      });
      return;
    }

    if (registro.anulado === 1) {
      Swal.fire({
        title: 'Acción no permitida',
        text: 'No se puede contabilizar un pago que está anulado.',
        icon: 'warning',
        confirmButtonText: 'Aceptar'
      });
      return;
    }

    Swal.fire({
      title: '¿Estás seguro?',
      text: `Se contabilizará el pago por valor de ${registro.valor_recibido} del ${registro.fecha}.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, contabilizar',
      cancelButtonText: 'Cancelar',
      reverseButtons: true,
      input: 'text',
      inputPlaceholder: 'Observaciones de contabilización (opcional)',
      inputAttributes: {
        autocapitalize: 'off'
      }
    }).then((result) => {
      if (result.isConfirmed) {
        const idUsuarioActual = this.utilService.obtenerIdUsuarioActual();
        const fechaContabilizacion = new Date().toISOString().replace('T', ' ').substr(0, 19);

        const body = {
          id: id,
          id_usuario_contable: idUsuarioActual,
          fecha_contabilizacion: fechaContabilizacion,
          observaciones_contabilizacion: result.value || "Pago contabilizado por el usuario"
        };

        this.pagosRecibidosService.contabilizar(body).subscribe((response: any) => {
          if (response && !response.error) {
            Swal.fire({
              title: 'Pago contabilizado con éxito',
              icon: "success",
              showCancelButton: false,
              focusConfirm: true,
              confirmButtonText: "Aceptar"
            }).then(() => {
              this.obtenerByColaborador();
            });
          } else {
            Swal.fire({
              title: 'Error al contabilizar el pago',
              text: response.message || 'Ha ocurrido un error al intentar contabilizar el pago.',
              icon: "error",
              showCancelButton: false,
              focusConfirm: true,
              confirmButtonText: "Aceptar"
            });
          }
        });
      } else {
        Swal.fire({
          title: 'Operación cancelada',
          icon: 'info',
          confirmButtonText: 'Aceptar'
        });
      }
    });
  }

  imprimir(id: any, registro: any) {
    if (registro.anulado === 1) {
      Swal.fire({
        title: 'Aviso',
        text: 'No se puede imprimir un recibo de un pago anulado.',
        icon: 'warning',
        confirmButtonText: 'Aceptar'
      });
      return;
    }

    Swal.fire({
      title: 'Generando comprobante',
      text: 'Por favor espere...',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    this.pagosRecibidosService.obtenerDatosComprobante(id).subscribe(
      (response: any) => {
        Swal.close();
        
        if (response && response.body) {
          this.router.navigate(['colaboradores-pagos-recibidos/comprobante', id]);
        } else {
          Swal.fire({
            title: 'Error',
            text: 'No se pudieron obtener los datos del comprobante.',
            icon: 'error',
            confirmButtonText: 'Aceptar'
          });
        }
      },
      error => {
        Swal.close();
        Swal.fire({
          title: 'Error',
          text: 'Ocurrió un error al generar el comprobante de pago.',
          icon: 'error',
          confirmButtonText: 'Aceptar'
        });
        console.error('Error generando comprobante:', error);
      }
    );
  }
}