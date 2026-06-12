import { CommonModule } from '@angular/common';
import { Component, OnInit, Input, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import Swal from 'sweetalert2';
import { HeaderComponentAnidado } from '../../../common/header-anidado/header-anidado.component';
import { TablasComponent } from '../../../common/tablas/tablas.component';
import { ColaboradoresService } from '../../../services/colaboradores.service';
import { CuentasPorCobrarService } from '../../../services/cuentas-por-cobrar.service';
import { UtilService } from '../../../common/constantes/util.service';

@Component({
  selector: 'app-colaboradores-productos-servicios',
  standalone: true,
  imports: [CommonModule, TablasComponent, HeaderComponentAnidado],
  templateUrl: './colaboradores-productos-servicios.component.html',
  styleUrl: './colaboradores-productos-servicios.component.scss'
})
export class ColaboradoresProductosServiciosComponent implements OnInit {
  @ViewChild(TablasComponent) tablasComponent!: TablasComponent;

  @Input() idColaboradorInput: string | null = null;
  public modoEmbebido = false;

  public titulo = "Gestión de productos y servicios";
  public idColaborador = "0";
  public accion = "";
  public path = "/colaboradores-productos-servicios/crear/0/";
  public colaborador: any;
  public nombre_colaborador = "";
  public titulos = [] as any[];
  public datos = [] as any[];

  // Resumen dinámico (se adapta a filtrado o selección)
  public resumen = {
    totalValorCobrado: 0,
    totalValorPagado: 0,
    totalSaldo: 0,
    totalSaldoVencido: 0,
    haySeleccion: false
  };

  private registrosSeleccionados = new Set<any>();

  public columnasFiltro = [
    { columna: 'Fecha', tipoFiltro: 'fecha' as 'fecha' | 'normal' },
    'Clasificación',
    'Producto o Servicio',
    'Valor Pagado',
    'Saldo'
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private colaboradoresService: ColaboradoresService,
    private cuentasPorCobrarService: CuentasPorCobrarService,
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

  obtenerTodos(id_persona: any): void {
    this.cuentasPorCobrarService.obtenerTodosXPersona(id_persona).subscribe((response: any) => {
      const body = response.body as any[];
      console.log("consumo servicio obtenerTodosXPersona", body);

      const fechaActual = new Date();

      // Asignar color a cada registro según su estado
      this.datos = body.map(item => {
        let color = '#FFFFFF';

        if (item.saldo <= 0) {
          color = '#C8E6C9';
        } else {
          const fechaItem = new Date(item.fecha);
          if (fechaActual > fechaItem && item.saldo > 0) {
            color = '#FFCDD2';
          }
        }

        return { ...item, color };
      });

      // Calcular resumen inicial con todos los datos
      this.calcularResumen(this.datos);
    });
  }

  /**
   * Calcula los totales del resumen con base en los datos proporcionados.
   */
  calcularResumen(datos: any[]): void {
    const fechaActual = new Date();

    this.resumen = {
      totalValorCobrado: 0,
      totalValorPagado: 0,
      totalSaldo: 0,
      totalSaldoVencido: 0,
      haySeleccion: datos.length > 0 && datos.length < this.datos.length
    };

    datos.forEach(item => {
      this.resumen.totalValorCobrado += Number(item.valor) || 0;
      this.resumen.totalValorPagado += Number(item.valor_pagado) || 0;
      this.resumen.totalSaldo += Number(item.saldo) || 0;

      const fechaItem = new Date(item.fecha);
      if (fechaActual > fechaItem && (Number(item.saldo) || 0) > 0) {
        this.resumen.totalSaldoVencido += Number(item.saldo) || 0;
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
        clave: 'nombre_clasificacion',
        alias: 'Clasificación',
        alinear: 'izquierda',
      },
      {
        clave: 'nombre_producto_servicio',
        alias: 'Producto o Servicio',
        alinear: 'izquierda',
      },
      {
        clave: 'detalle',
        alias: 'Detalle',
        alinear: 'izquierda',
      },
      {
        clave: 'valor',
        alias: 'Valor',
        alinear: 'derecha',
        tipo: 'integer',
        formato: { digitInfo: '1.0-0' }
      },
      {
        clave: 'valor_pagado',
        alias: 'Valor Pagado',
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
        clave: 'nombre_usuario',
        alias: 'Usuario',
        alinear: 'izquierda',
      },
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
      this.obtenerTodos(this.colaborador.id_persona);
      this.titulo = this.titulo + " para " + this.nombre_colaborador;
    });
  }

  seleccionar(event: any) {
    if (event.accion === 'editar') {
      this.router.navigate(['colaboradores-productos-servicios/editar/' + event.id + '/' + this.idColaborador]);
    }
    if (event.accion === 'eliminar') {
      // Verificar si el registro tiene valores pagados
      if (event.registro.valor_pagado > 0) {
        Swal.fire({
          title: 'Acción no permitida',
          text: 'No se puede eliminar un producto o servicio que ya tiene pagos aplicados.',
          icon: 'warning',
          confirmButtonText: 'Aceptar'
        });
        return;
      }
      this.eliminar(event.id, event.registro);
    }
    if (event.accion === 'consultar') {
      this.router.navigate(['colaboradores-productos-servicios/consultar/' + event.id + '/' + this.idColaborador]);
    }
  }

  anular(id: any, registro: any) {
    Swal.fire({
      title: 'No se pudo eliminar',
      text: 'No es posible eliminar este registro. ¿Desea anularlo en su lugar?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, anular',
      cancelButtonText: 'No, cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        const idUsuarioActual = this.utilService.obtenerIdUsuarioActual();

        if (!idUsuarioActual) {
          Swal.fire({
            title: 'Error',
            text: 'No se pudo obtener el usuario actual para realizar la anulación',
            icon: 'error',
            confirmButtonText: 'Aceptar'
          });
          return;
        }

        const body = {
          id: id,
          id_usuario_anulacion: idUsuarioActual
        };

        console.log('Datos para anulación:', body);

        this.cuentasPorCobrarService.anular(body).subscribe({
          next: (response: any) => {
            const data = response.id;
            if (data) {
              Swal.fire({
                title: 'Cuenta anulada con éxito',
                icon: "info",
                showCancelButton: false,
                focusConfirm: true,
                confirmButtonText: "Aceptar"
              }).then(() => {
                this.obtenerTodos(this.colaborador.id_persona);
              });
            } else {
              Swal.fire({
                title: 'Error al anular la cuenta',
                icon: "error",
                showCancelButton: false,
                focusConfirm: true,
                confirmButtonText: "Aceptar"
              });
            }
          },
          error: (error) => {
            console.error("Error al anular cuenta:", error);

            let mensajeError = 'Error al anular la cuenta';
            if (error && error.error && error.error.message) {
              mensajeError += ': ' + error.error.message;
            }

            Swal.fire({
              title: 'Error al anular la cuenta',
              text: mensajeError,
              icon: "error",
              showCancelButton: false,
              focusConfirm: true,
              confirmButtonText: "Aceptar"
            });
          }
        });
      }
    });
  }

  eliminar(id: any, registro: any) {
    Swal.fire({
      title: '¿Estás seguro?',
      text: `Se eliminará la cuenta de "${registro.nombre_producto_servicio}" por valor de ${registro.valor} del ${registro.fecha}. Esta acción no se puede deshacer.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      reverseButtons: true
    }).then((result) => {
      if (result.isConfirmed) {
        const body = { id: id };
        this.cuentasPorCobrarService.eliminar(body).subscribe({
          next: (response: any) => {
            const data = response.id;
            if (data) {
              Swal.fire({
                title: 'Producto eliminado con éxito',
                icon: "info",
                showCancelButton: false,
                focusConfirm: true,
                confirmButtonText: "Aceptar"
              }).then(() => {
                this.obtenerTodos(this.colaborador.id_persona);
              });
            } else {
              this.anular(id, registro);
            }
          },
          error: (error) => {
            console.error("Error al eliminar cuenta:", error);
            this.anular(id, registro);
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
}