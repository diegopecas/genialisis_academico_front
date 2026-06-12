import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild } from '@angular/core';
import { HeaderComponent } from '../../../common/header/header.component';
import { TablasComponent } from '../../../common/tablas/tablas.component';
import { ActivatedRoute, Router } from '@angular/router';
import { HeaderComponentAnidado } from '../../../common/header-anidado/header-anidado.component';
import { EstudiantesService } from '../../../services/estudiantes.service';
import Swal from 'sweetalert2';
import { PagosRecibidosService } from '../../../services/pagos-recibidos.service';
import { UtilService } from '../../../common/constantes/util.service';
import { InstitucionConfigService } from '../../../services/institucion-config.service';
import { PermisosService } from '../../../services/permisos.service';


@Component({
  selector: 'app-pagos-recibidos',
  standalone: true,
  imports: [CommonModule, TablasComponent, HeaderComponentAnidado],
  templateUrl: './pagos-recibidos.component.html',
  styleUrl: './pagos-recibidos.component.scss'
})
export class PagosRecibidosComponent implements OnInit {
  @ViewChild(TablasComponent) tablasComponent!: TablasComponent;

  public titulo = "Gestión de pagos recibidos";
  public idEstudiante = "0";
  public accion = "";
  public path = "/estudiantes-pagos/crear/0/"
  public estudiante: any;
  public nombre_estudiante = "";
  public titulos = [] as any[];
  public datos = [] as any[];
  public anioAcademico: number = new Date().getFullYear();
  public columnasFiltro = [
    { columna: 'Fecha', tipoFiltro: 'fecha' as 'fecha' | 'normal' },
    'Tipo de Pago',
    'Valor Recibido',
    'Saldo',
    'Estado',
    'Usuario Registro',
    'Usuario Estado'
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

  // Variables de permisos
  public puedeAdministrar = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private estudiantesService: EstudiantesService,
    private pagosRecibidosService: PagosRecibidosService,
    private utilService: UtilService,
    private institucionConfigService: InstitucionConfigService,
    private permisosService: PermisosService
  ) { }

  ngOnInit() {
    this.configurarPermisos();
    this.anioAcademico = this.institucionConfigService.getAnioAcademicoActual();

    this.route.params.subscribe(params => {
      this.accion = params['accion'];
      this.idEstudiante = params['id'];
      this.path = this.path + this.idEstudiante;
      this.obtenerEstudiante(this.idEstudiante);
    });

    this.crearTitulos();
  }

  configurarPermisos(): void {
    this.puedeAdministrar = this.permisosService.tienePermiso('estudiantes.pagos.administrar');
  }

  obtenerByEstudiante(): void {
    this.pagosRecibidosService.obtenerByEstudiante(this.idEstudiante).subscribe((response: any) => {
      const datos = response.body as any[];

      // Procesar los datos para agregar propiedades calculadas
      this.datos = datos.map(item => {
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

        // Determinar el color de la fila según el estado y saldo
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
          usuario_registro: item.nombre_completo_usuario_registro || item.nombre_usuario_registro,
          usuario_estado: usuarioEstado,
          color: color
        };
      });

      // Calcular resumen inicial con todos los datos
      this.calcularResumen(this.datos);

      console.log("consumo servicio obtenerTodos pagos recibidos", this.datos);
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
      // Excluir pagos anulados del cálculo
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
        tipo: 'date', // Formato de fecha
        formato: { pattern: 'dd/MM/yyyy' }
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
        alias: 'Referencia Bancaria',
        alinear: 'izquierda',
      },

      {
        clave: 'valor_recibido',
        alias: 'Valor Recibido',
        alinear: 'derecha',
        tipo: 'integer', // Formato de entero (sin decimales)
        formato: { digitInfo: '1.0-0' } // Sin decimales
      },
      {
        clave: 'valor_aplicado_cuentas',
        alias: 'Valor Aplicado',
        alinear: 'derecha',
        tipo: 'integer', // Formato de entero (sin decimales)
        formato: { digitInfo: '1.0-0' } // Sin decimales
      },
      {
        clave: 'saldo',
        alias: 'Saldo',
        alinear: 'derecha',
        tipo: 'integer', // Formato de entero (sin decimales)
        formato: { digitInfo: '1.0-0' } // Sin decimales
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
        clave: 'usuario_registro',
        alias: 'Usuario Registro',
        alinear: 'izquierda',
      },
      {
        clave: 'usuario_estado',
        alias: 'Usuario Estado',
        alinear: 'izquierda',
      }
    ];
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
      this.obtenerByEstudiante();
      this.titulo = this.titulo + " para " + this.nombre_estudiante;
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

    // Se elimina la restricción para pagos contabilizados
    // El código que verificaba si el pago estaba contabilizado ya no existe aquí

    // Proceder con las acciones normales
    if (event.accion === 'editar') {
      this.router.navigate(['estudiantes-pagos/editar/' + event.id + '/' + this.idEstudiante]);
    }
    else if (event.accion === 'eliminar') {
      this.anularPago(event.id, event.registro);
    }
    else if (event.accion === 'consultar') {
      this.router.navigate(['estudiantes-pagos/consultar/' + event.id + '/' + this.idEstudiante]);
    } else if (event.accion === 'contabilizar') {
      this.contablilziarPago(event.id, event.registro);
    } else if (event.accion === 'imprimir') {
      this.imprimir(event.id, event.registro);
    }
  }

  anularPago(id: any, registro: any) {
    // Verificar si el pago ya está anulado
    if (registro.anulado === 1) {
      Swal.fire({
        title: 'Pago ya anulado',
        text: 'Este pago ya se encuentra anulado en el sistema.',
        icon: 'info',
        confirmButtonText: 'Aceptar'
      });
      return;
    }

    // Mostrar ventana de confirmación antes de proceder con la anulación
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
      // Si el usuario confirma la anulación
      if (result.isConfirmed) {
        // Obtener el ID del usuario actual
        const idUsuarioActual = this.utilService.obtenerIdUsuarioActual();

        // Datos para anular el pago
        const body = {
          id: id,
          id_usuario_anulacion: idUsuarioActual,
          observaciones_anulacion: result.value || "Pago anulado por el usuario"
        };

        // Llamar al servicio de anulación
        this.pagosRecibidosService.anular(body).subscribe((response: any) => {
          if (response && !response.error) {
            Swal.fire({
              title: 'Pago anulado con éxito',
              icon: "success",
              showCancelButton: false,
              focusConfirm: true,
              confirmButtonText: "Aceptar"
            }).then(() => {
              this.obtenerByEstudiante();
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
        // Si el usuario cancela la anulación
        Swal.fire({
          title: 'Operación cancelada',
          icon: 'info',
          confirmButtonText: 'Aceptar'
        });
      }
    });
  }
  contablilziarPago(id: any, registro: any) {
    // Verificar si el pago ya está contabilizado
    if (registro.id_usuario_contable) {
      Swal.fire({
        title: 'Pago ya contabilizado',
        text: 'Este pago ya ha sido contabilizado en el sistema.',
        icon: 'info',
        confirmButtonText: 'Aceptar'
      });
      return;
    }

    // Verificar si el pago está anulado
    if (registro.anulado === 1) {
      Swal.fire({
        title: 'Acción no permitida',
        text: 'No se puede contabilizar un pago que está anulado.',
        icon: 'warning',
        confirmButtonText: 'Aceptar'
      });
      return;
    }

    // Mostrar ventana de confirmación antes de proceder con la contabilización
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
      // Si el usuario confirma la contabilización
      if (result.isConfirmed) {
        // Obtener el ID del usuario actual
        const idUsuarioActual = this.utilService.obtenerIdUsuarioActual();

        // Crear fecha con hora, minutos y segundos en formato MySQL datetime
        // Formato: YYYY-MM-DD HH:MM:SS
        const fechaContabilizacion = new Date().toISOString().replace('T', ' ').substr(0, 19);

        // Datos para contabilizar el pago
        const body = {
          id: id,
          id_usuario_contable: idUsuarioActual,
          fecha_contabilizacion: fechaContabilizacion,
          observaciones_contabilizacion: result.value || "Pago contabilizado por el usuario"
        };

        // Llamar al servicio de contabilización
        this.pagosRecibidosService.contabilizar(body).subscribe((response: any) => {
          if (response && !response.error) {
            Swal.fire({
              title: 'Pago contabilizado con éxito',
              icon: "success",
              showCancelButton: false,
              focusConfirm: true,
              confirmButtonText: "Aceptar"
            }).then(() => {
              this.obtenerByEstudiante();
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

            console.log("Error al contabilizar pago:", response);
          }
        });
      } else {
        // Si el usuario cancela la contabilización
        Swal.fire({
          title: 'Operación cancelada',
          icon: 'info',
          confirmButtonText: 'Aceptar'
        });
      }
    });
  }
  imprimir(id: any, registro: any) {
    // Verificar que el pago no esté anulado
    if (registro.anulado === 1) {
      Swal.fire({
        title: 'Aviso',
        text: 'No se puede imprimir un recibo de un pago anulado.',
        icon: 'warning',
        confirmButtonText: 'Aceptar'
      });
      return;
    }
  
    // Mostrar indicador de carga
    Swal.fire({
      title: 'Generando comprobante',
      text: 'Por favor espere...',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });
  
    // Importante: Aquí debes usar el ID del pago, NO el ID del estudiante
    this.pagosRecibidosService.obtenerDatosComprobante(id).subscribe(
      (response: any) => {
        Swal.close();
        
        if (response && response.body) {
          // Simplemente navegar a la página del comprobante
          this.router.navigate(['estudiantes-pagos/comprobante', id]);
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