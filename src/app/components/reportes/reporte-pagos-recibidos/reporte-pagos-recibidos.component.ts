import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { UtilService } from '../../../common/constantes/util.service';
import { HeaderComponent } from '../../../common/header/header.component';
import { TablasComponent } from '../../../common/tablas/tablas.component';
import { PagosRecibidosService } from '../../../services/pagos-recibidos.service';

@Component({
  selector: 'app-reporte-pagos-recibidos',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, TablasComponent],
  templateUrl: './reporte-pagos-recibidos.component.html',
  styleUrl: './reporte-pagos-recibidos.component.scss'
})
export class ReportePagosRecibidosComponent implements OnInit {
  @ViewChild(TablasComponent) tablasComponent!: TablasComponent;

  public titulo = "Reporte de Pagos Recibidos";
  public titulos = [] as any[];
  public datos = [] as any[];
  public columnasFiltro = [
    { columna: 'Fecha', tipoFiltro: 'fecha' as 'fecha' | 'normal' },
    'Tipo Persona',
    'Persona',
    'Tipo de Pago',
    'Estado',
    { columna: 'Fecha Estado', tipoFiltro: 'fecha' as 'fecha' | 'normal' }
  ];

  public resumen = {
    totalRecibido: 0,
    totalAplicado: 0,
    totalSaldo: 0,
    registrados: { cantidad: 0, total: 0 },
    contabilizados: { cantidad: 0, total: 0 },
    anulados: { cantidad: 0, total: 0 },
    haySeleccion: false
  };

  public acciones = [
    { id: 'imprimir', label: 'Imprimir', icono: '/assets/images/comprobante_pago.png' }
  ] as any[];

  constructor(
    private router: Router,
    private pagosRecibidosService: PagosRecibidosService,
    private utilService: UtilService
  ) { }

  ngOnInit() {
    this.crearTitulos();
    this.obtenerTodos();
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
        clave: 'tipo_persona',
        alias: 'Tipo Persona',
        alinear: 'centrado',
      },
      {
        clave: 'nombre_persona_display',
        alias: 'Persona',
        alinear: 'izquierda',
      },
      {
        clave: 'nombre_acudiente',
        alias: 'Acudiente',
        alinear: 'izquierda',
      },
      {
        clave: 'tipo_pago',
        alias: 'Tipo de Pago',
        alinear: 'izquierda',
      },
      {
        clave: 'referencia_bancaria',
        alias: 'Ref. Bancaria',
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

  obtenerTodos() {
    this.pagosRecibidosService.obtenerTodos().subscribe(
      (response: any) => {
        const datos = response.body as any[];

        this.datos = datos.map(item => {
          // Determinar tipo de persona: Estudiante, Colaborador o Acudiente
          let tipoPersona = 'Desconocido';
          let nombrePersona = 'Sin nombre';

          if (item.id_estudiante) {
            tipoPersona = 'Estudiante';
            nombrePersona = item.nombre_estudiante || 'Sin nombre';
          } else if (item.id_colaborador) {
            tipoPersona = 'Colaborador';
            nombrePersona = item.nombre_colaborador || 'Sin nombre';
          } else if (item.id_acudiente) {
            tipoPersona = 'Acudiente';
            nombrePersona = item.nombre_acudiente || 'Sin nombre';
          }

          // Determinar el estado
          let estado = 'Registrado';
          if (item.anulado === 1) {
            estado = 'Anulado';
          } else if (item.id_usuario_contable) {
            estado = 'Contabilizado';
          }

          // Determinar la fecha según el estado
          let fechaEstado = item.fecha_registro;
          if (estado === 'Anulado') {
            fechaEstado = item.fecha_anulacion;
          } else if (estado === 'Contabilizado') {
            fechaEstado = item.fecha_contabilizacion;
          }

          // Determinar el usuario según el estado
          let usuarioEstado = item.nombre_completo_usuario_registro || item.nombre_usuario_registro;
          if (estado === 'Anulado') {
            usuarioEstado = item.nombre_completo_usuario_anulacion || item.nombre_usuario_anulacion;
          } else if (estado === 'Contabilizado') {
            usuarioEstado = item.nombre_completo_usuario_contable || item.nombre_usuario_contable;
          }

          // Color de la fila según el estado y saldo
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
            tipo_persona: tipoPersona,
            nombre_persona_display: nombrePersona,
            estado: estado,
            fecha_estado: fechaEstado,
            usuario_estado: usuarioEstado,
            color: color
          };
        });

        this.calcularResumen(this.datos);

        console.log("Reporte pagos recibidos cargados:", this.datos.length);
      },
      error => {
        console.error('Error al cargar pagos recibidos:', error);
        Swal.fire({
          title: 'Error',
          text: 'No se pudieron cargar los pagos recibidos',
          icon: 'error',
          confirmButtonText: 'Aceptar'
        });
      }
    );
  }

  calcularResumen(datos: any[]) {
    this.resumen = {
      totalRecibido: 0,
      totalAplicado: 0,
      totalSaldo: 0,
      registrados: { cantidad: 0, total: 0 },
      contabilizados: { cantidad: 0, total: 0 },
      anulados: { cantidad: 0, total: 0 },
      haySeleccion: datos.length > 0 && datos.length < this.datos.length
    };

    datos.forEach(item => {
      const valorRecibido = Number(item.valor_recibido) || 0;
      const valorAplicado = Number(item.valor_aplicado_cuentas) || 0;
      const saldo = Number(item.saldo) || 0;

      this.resumen.totalRecibido += valorRecibido;
      this.resumen.totalAplicado += valorAplicado;
      this.resumen.totalSaldo += saldo;

      if (item.estado === 'Registrado') {
        this.resumen.registrados.cantidad++;
        this.resumen.registrados.total += valorRecibido;
      } else if (item.estado === 'Contabilizado') {
        this.resumen.contabilizados.cantidad++;
        this.resumen.contabilizados.total += valorRecibido;
      } else if (item.estado === 'Anulado') {
        this.resumen.anulados.cantidad++;
        this.resumen.anulados.total += valorRecibido;
      }
    });
  }

  onDatosFiltradosCambiados(datosFiltrados: any[]) {
    if (this.registrosSeleccionados.size === 0) {
      this.calcularResumen(datosFiltrados);
      this.resumen.haySeleccion = false;
    }
  }

  private registrosSeleccionados = new Set<any>();

  onSeleccionCambiada(seleccionados: any[]) {
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

  seleccionar(event: any) {
    // Validar acciones sobre registros anulados
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

    const esColaborador = !!event.registro.id_colaborador && !event.registro.id_estudiante;

    if (event.accion === 'editar') {
      if (esColaborador) {
        this.router.navigate(['colaboradores-pagos-recibidos/editar/' + event.id + '/' + event.registro.id_colaborador], {
          queryParams: { origen: 'reporte' }
        });
      } else {
        const idEstudiante = event.registro.id_estudiante || '0';
        this.router.navigate(['estudiantes-pagos/editar/' + event.id + '/' + idEstudiante], {
          queryParams: { origen: 'reporte' }
        });
      }
    }
    else if (event.accion === 'eliminar') {
      this.anularPago(event.id, event.registro);
    }
    else if (event.accion === 'consultar') {
      if (esColaborador) {
        this.router.navigate(['colaboradores-pagos-recibidos/consultar/' + event.id + '/' + event.registro.id_colaborador], {
          queryParams: { origen: 'reporte' }
        });
      } else {
        const idEstudiante = event.registro.id_estudiante || '0';
        this.router.navigate(['estudiantes-pagos/consultar/' + event.id + '/' + idEstudiante], {
          queryParams: { origen: 'reporte' }
        });
      }
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
              this.obtenerTodos();
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
            console.log("Error al anular pago:", response);
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

    const esColaborador = !!registro.id_colaborador && !registro.id_estudiante;

    Swal.fire({
      title: 'Generando comprobante',
      text: 'Por favor espere...',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    if (esColaborador) {
      this.pagosRecibidosService.obtenerDatosComprobanteColaborador(id).subscribe(
        (response: any) => {
          Swal.close();

          if (response && response.body) {
            this.router.navigate(['colaboradores-pagos-recibidos/comprobante', id], {
              queryParams: { origen: 'reporte' }
            });
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
          console.error('Error generando comprobante colaborador:', error);
        }
      );
    } else {
      this.pagosRecibidosService.obtenerDatosComprobante(id).subscribe(
        (response: any) => {
          Swal.close();

          if (response && response.body) {
            this.router.navigate(['estudiantes-pagos/comprobante', id], {
              queryParams: { origen: 'reporte' }
            });
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

  regresar() {
    this.router.navigate(['/reportes']);
  }
}