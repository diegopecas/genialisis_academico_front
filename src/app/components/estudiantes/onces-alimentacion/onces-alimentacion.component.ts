import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { HeaderComponent } from '../../../common/header/header.component';
import { TablasComponent } from '../../../common/tablas/tablas.component';
import { ActivatedRoute, Router } from '@angular/router';
import { HeaderComponentAnidado } from '../../../common/header-anidado/header-anidado.component';
import { EstudiantesService } from '../../../services/estudiantes.service';
import Swal from 'sweetalert2';
import { CuentasPorCobrarService } from '../../../services/cuentas-por-cobrar.service';
import { UtilService } from '../../../common/constantes/util.service';
import { PermisosService } from '../../../services/permisos.service';
import { ClasificacionProductosServicios, PeriodicidadCobro } from './crear-onces-alimentacion/constantes';


// Interfaces para tipar correctamente
interface CuentaPorCobrar {
  id: string;
  id_clasificacion_productos_servicios: string;
  clasificacion_codigo: string;
  id_periodicidad_cobro: number;
  fecha: string;
  valor: number;
  valor_pagado: number;
  saldo: number;
  nombre_horario_alimentacion?: string;
  nombre_producto_servicio: string;
  detalle?: string;
}

@Component({
  selector: 'app-onces-alimentacion',
  standalone: true,
  imports: [CommonModule, TablasComponent, HeaderComponentAnidado],
  templateUrl: './onces-alimentacion.component.html',
  styleUrl: './onces-alimentacion.component.scss'
})
export class OncesAlimentacionComponent {
  public titulo = "Gestión de onces y alimentación del día";
  public idEstudiante = "0";
  public accion = "";
  public path = "/estudiantes-onces/crear/0/"
  public estudiante: any;
  public nombre_estudiante = "";
  public titulos = [] as any[];
  public datos = [] as any[];
  public fechaActual = new Date();

  // Variables para totales
  public totalValorCobrado = 0;
  public totalValorPagado = 0;
  public totalSaldo = 0;

  public columnasFiltro = ['Horario', 'Producto o Servicio', 'Valor Pagado', 'Saldo'];

  // Variables de permisos
  public puedeAdministrar = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private estudiantesService: EstudiantesService,
    private cuentasPorCobrarService: CuentasPorCobrarService,
    private utilService: UtilService,
    private permisosService: PermisosService
  ) { }

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
    this.puedeAdministrar = this.permisosService.tienePermiso('estudiantes.onces.administrar');
  }

  // Función auxiliar para comparar fechas (solo día/mes/año sin considerar hora)
  esMismaFecha(fecha1: Date, fecha2: Date): boolean {
    return fecha1.getDate() === fecha2.getDate() &&
           fecha1.getMonth() === fecha2.getMonth() &&
           fecha1.getFullYear() === fecha2.getFullYear();
  }

  // Función para formatear fecha como yyyy-MM-dd para comparar con la fecha del string
  formatearFecha(fecha: Date): string {
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, '0');
    const day = String(fecha.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  obtenerTodos(id_persona: any): void {
    // Usamos el servicio existente en lugar de crear uno nuevo
    this.cuentasPorCobrarService.obtenerTodosXPersona(id_persona).subscribe((response: any) => {
      const body = response.body as any[];
      console.log("obtenerTodos", body);
      
      // Formato de fecha actual para comparar con fechas de string
      const fechaActualStr = this.formatearFecha(this.fechaActual);
      
      // Filtramos por clasificación ALIMENTACION, periodicidad DIARIO y solo los del día actual
      const productosFiltrados = body.filter((item: CuentaPorCobrar) => 
        item.clasificacion_codigo === 'ALIMENTACION' && 
        item.id_periodicidad_cobro === PeriodicidadCobro.DIARIO &&
        item.fecha.substring(0, 10) === fechaActualStr // Comparamos solo el componente YYYY-MM-DD
      );
      
      console.log("Productos filtrados de alimentación del día actual:", productosFiltrados);
      console.log("Fecha actual para filtrado:", fechaActualStr);

      // Reiniciar totales
      this.totalValorCobrado = 0;
      this.totalValorPagado = 0;
      this.totalSaldo = 0;

      // Añadimos los datos sin color
      this.datos = productosFiltrados.map(item => {
        // Calcular totales
        this.totalValorCobrado += Number(item.valor) || 0;
        this.totalValorPagado += Number(item.valor_pagado) || 0;
        this.totalSaldo += Number(item.saldo) || 0;

        // Retornamos el objeto original sin la propiedad color
        return item;
      });

      console.log("Totales calculados:", {
        valorCobrado: this.totalValorCobrado,
        valorPagado: this.totalValorPagado,
        saldo: this.totalSaldo
      });
    });
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
        clave: 'nombre_horario_alimentacion',
        alias: 'Horario',
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
    console.log("obtenerEstudiante", id_estudiante);
    this.estudiantesService.obtenerById(id_estudiante).subscribe((response: any) => {
      const body = response.body as any[];
      this.estudiante = body[0];
      console.log("obtenerEstudiante", this.estudiante);
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
      this.router.navigate(['estudiantes-onces/editar/' + event.id + '/' + this.idEstudiante]);
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
      this.router.navigate(['estudiantes-onces/consultar/' + event.id + '/' + this.idEstudiante]);
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
                title: 'Registro anulado con éxito',
                icon: "info",
                showCancelButton: false,
                focusConfirm: true,
                confirmButtonText: "Aceptar"
              }).then(() => {
                this.obtenerTodos(this.estudiante.id_persona);
              });
            } else {
              Swal.fire({
                title: 'Error al anular el registro',
                icon: "error",
                showCancelButton: false,
                focusConfirm: true,
                confirmButtonText: "Aceptar"
              });
            }
          },
          error: (error) => {
            console.error("Error al anular registro:", error);

            let mensajeError = 'Error al anular el registro';
            if (error && error.error && error.error.message) {
              mensajeError += ': ' + error.error.message;
            }

            Swal.fire({
              title: 'Error al anular el registro',
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
      text: `Se eliminará la once de "${registro.nombre_producto_servicio}" - Horario: ${registro.nombre_horario_alimentacion} por valor de ${registro.valor} del ${registro.fecha}. Esta acción no se puede deshacer.`,
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
                title: 'Once eliminada con éxito',
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
            console.error("Error al eliminar once:", error);
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