import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild } from '@angular/core';
import { HeaderComponent } from '../../../common/header/header.component';
import { TablasComponent } from '../../../common/tablas/tablas.component';
import { ActivatedRoute, Router } from '@angular/router';
import { HeaderComponentAnidado } from '../../../common/header-anidado/header-anidado.component';
import { EstudiantesService } from '../../../services/estudiantes.service';
import Swal from 'sweetalert2';
import { CuentasPorCobrarService } from '../../../services/cuentas-por-cobrar.service';
import { UtilService } from '../../../common/constantes/util.service';
import { PermisosService } from '../../../services/permisos.service';


@Component({
  selector: 'app-productos-servicios',
  standalone: true,
  imports: [CommonModule, TablasComponent, HeaderComponentAnidado],
  templateUrl: './productos-servicios.component.html',
  styleUrl: './productos-servicios.component.scss'
})
export class ProductosServiciosComponent implements OnInit {
  @ViewChild(TablasComponent) tablasComponent!: TablasComponent;

  public titulo = "Gestión de productos y servicios";
  public idEstudiante = "0";
  public accion = "";
  public path = "/estudiantes-productos-servicios/crear/0/"
  public estudiante: any;
  public nombre_estudiante = "";
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

  public acciones = [
    { id: 'cambiar_grupo', label: 'Cambiar Grupo', icono: '/assets/images/editar.png' },
    { id: 'registro_medidas', label: 'Registo Medidas', icono: '/assets/images/medidas.png' },
    { id: 'productos_servicios', label: 'Productos Servicios', icono: '/assets/images/servicios.png' },
  ] as any[];
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
    private estudiantesService: EstudiantesService,
    private cuentasPorCobrarService: CuentasPorCobrarService,
    private utilService: UtilService,
    private permisosService: PermisosService


  ) { }

  // Variables de permisos
  public puedeAdministrar = false;

  ngOnInit() {
    this.configurarPermisos();
    this.route.params.subscribe(params => {
      this.accion = params['accion'];
      this.idEstudiante = params['id'];
      this.path = this.path + this.idEstudiante
      this.obtenerEstudiante(this.idEstudiante)
    });

    this.crearTitulos();
  }

  configurarPermisos(): void {
    this.puedeAdministrar = this.permisosService.tienePermiso('estudiantes.productos_servicios.administrar');
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
   * Se llama con todos los datos, con los filtrados o con los seleccionados.
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

      // Saldo vencido: fecha pasada y saldo > 0
      const fechaItem = new Date(item.fecha);
      if (fechaActual > fechaItem && (Number(item.saldo) || 0) > 0) {
        this.resumen.totalSaldoVencido += Number(item.saldo) || 0;
      }
    });
  }

  onDatosFiltradosCambiados(datosFiltrados: any[]): void {
    // Cuando cambian los datos filtrados y NO hay selección, actualizar resumen
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
        tipo: 'integer', // Formato de entero (sin decimales)
        formato: { digitInfo: '1.0-0' } // Configura explícitamente para cero decimales
      },
      {
        clave: 'valor_pagado',
        alias: 'Valor Pagado',
        alinear: 'derecha',
        tipo: 'integer', // Formato de entero (sin decimales)
        formato: { digitInfo: '1.0-0' } // Configura explícitamente para cero decimales
      },
      {
        clave: 'saldo',
        alias: 'Saldo',
        alinear: 'derecha',
        tipo: 'integer', // Formato de entero (sin decimales)
        formato: { digitInfo: '1.0-0' } // Configura explícitamente para cero decimales
      },
      {
        clave: 'nombre_usuario',
        alias: 'Usuario',
        alinear: 'izquierda',
      },
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
      this.obtenerTodos(this.estudiante.id_persona);
      this.titulo = this.titulo + " para " + this.nombre_estudiante;

    })
  }
  seleccionar(event: any) {
    if (event.accion === 'editar') {
      this.router.navigate(['estudiantes-productos-servicios/editar/' + event.id + '/' + this.idEstudiante]);
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
      this.router.navigate(['estudiantes-productos-servicios/consultar/' + event.id + '/' + this.idEstudiante]);
    }
  }

  // Función para intentar anular cuando falla la eliminación
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
        // Obtenemos el ID del usuario actual usando el servicio util
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
                this.obtenerTodos(this.estudiante.id_persona);
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
    // Mostrar ventana de confirmación antes de proceder con la eliminación
    Swal.fire({
      title: '¿Estás seguro?',
      text: `Se eliminará la cuenta de "${registro.nombre_producto_servicio}" por valor de ${registro.valor} del ${registro.fecha}. Esta acción no se puede deshacer.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      reverseButtons: true
    }).then((result) => {
      // Si el usuario confirma la eliminación
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
                this.obtenerTodos(this.estudiante.id_persona);
              });
            } else {
              // Si no hay ID en la respuesta, intentamos anular
              this.anular(id, registro);
            }
          },
          error: (error) => {
            console.error("Error al eliminar cuenta:", error);
            // Si hay error en la eliminación, intentamos anular
            this.anular(id, registro);
          }
        });
      } else {
        // Si el usuario cancela la eliminación
        Swal.fire({
          title: 'Operación cancelada',
          icon: 'info',
          confirmButtonText: 'Aceptar'
        });
      }
    });
  }
}