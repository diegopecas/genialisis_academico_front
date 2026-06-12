import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import Swal from 'sweetalert2';
import { HeaderComponentAnidado } from '../../../common/header-anidado/header-anidado.component';
import { TablasComponent } from '../../../common/tablas/tablas.component';
import { EstudiantesService } from '../../../services/estudiantes.service';
import { ObservacionesEstudiantesService } from '../../../services/observaciones-estudiantes.service';
import { TiposObservacionesEstudiantesService } from '../../../services/tipos-observaciones-estudiantes.service';
import { PermisosService } from '../../../services/permisos.service';

@Component({
  selector: 'app-observaciones-estudiantes',
  standalone: true,
  imports: [CommonModule, TablasComponent, HeaderComponentAnidado],
  templateUrl: './observaciones-estudiantes.component.html',
  styleUrl: './observaciones-estudiantes.component.scss'
})
export class ObservacionesEstudiantesComponent {
  public titulo = "Módulo de registro de observaciones";
  public idEstudiante = "0";
  public accion = "";
  public path = "/estudiantes-observaciones/crear/0/"
  public estudiante: any;
  public nombre_estudiante = "";
  public titulos = [] as any[];
  public datos = [] as any[];
  public columnasFiltro = ['Tipo', 'Fecha', 'Sprint', 'Para informe'];
  public tiposObservaciones: any[] = [];

  // Variables de permisos
  public puedeAdministrar = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private estudiantesService: EstudiantesService,
    private observacionesEstudiantesService: ObservacionesEstudiantesService,
    private tiposObservacionesService: TiposObservacionesEstudiantesService,
    private permisosService: PermisosService
  ) { }

  ngOnInit() {
    this.configurarPermisos();
    this.route.params.subscribe(params => {
      this.accion = params['accion'];
      this.idEstudiante = params['id'];
      this.path = this.path + this.idEstudiante;
      this.obtenerEstudiante(this.idEstudiante);
      this.obtenerTiposObservaciones();
    });

    this.crearTitulos();
  }

  configurarPermisos(): void {
    this.puedeAdministrar = this.permisosService.tienePermiso('estudiantes.observaciones.administrar');
  }

  obtenerTodos(id_estudiante: any): void {
    this.observacionesEstudiantesService.obtenerPorEstudiante(id_estudiante).subscribe((response: any) => {
      const body = response.body as any[];
      console.log("consumo servicio obtenerPorEstudiante", body);

      // Mapear datos enriquecidos: tipo de observación, sprint y bandera para informe
      this.datos = body.map(obs => {
        const tipo = this.tiposObservaciones.length > 0
          ? this.tiposObservaciones.find(t => t.id === obs.id_tipo_observacion_estudiante)
          : null;

        return {
          ...obs,
          nombre_tipo_observacion: tipo ? tipo.nombre : 'Desconocido',
          nombre_sprint_completo: this.formatearSprint(obs),
          para_informe_texto: this.formatearParaInforme(obs.para_informe)
        };
      });
    });
  }

  // Construye la etiqueta del sprint a partir de numero_sprint, nombre_sprint
  // y el rango de fechas (fecha_inicial_sprint, fecha_final_sprint)
  // (estos campos vienen del JOIN en getByIdEstudiante en el backend)
  private formatearSprint(obs: any): string {
    if (!obs.id_sprint || !obs.numero_sprint) {
      return 'Sin asignar';
    }
    const nombre = obs.nombre_sprint ? ` - ${obs.nombre_sprint}` : '';
    const rango = this.formatearRangoFechas(obs.fecha_inicial_sprint, obs.fecha_final_sprint);
    const fechas = rango ? ` (${rango})` : '';
    return `Sprint ${obs.numero_sprint}${nombre}${fechas}`;
  }

  // Formatea una fecha 'yyyy-MM-dd' (o con hora) a 'dd/MM/yyyy'
  private formatearFecha(fecha: string): string {
    if (!fecha) {
      return '';
    }
    // Tomar solo los primeros 10 caracteres por si llega con hora
    const soloFecha = fecha.substring(0, 10);
    const partes = soloFecha.split('-');
    if (partes.length !== 3) {
      return fecha;
    }
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }

  // Devuelve el rango 'dd/MM/yyyy - dd/MM/yyyy' a partir de fecha inicial y final
  private formatearRangoFechas(fechaInicial: string, fechaFinal: string): string {
    const inicio = this.formatearFecha(fechaInicial);
    const fin = this.formatearFecha(fechaFinal);
    if (inicio && fin) {
      return `${inicio} - ${fin}`;
    }
    return inicio || fin || '';
  }

  // Convierte el flag para_informe (1/0/'1'/'0'/true/false) a texto legible
  private formatearParaInforme(valor: any): string {
    return (valor === 1 || valor === '1' || valor === true) ? 'Sí' : 'No';
  }

  obtenerTiposObservaciones(): void {
    this.tiposObservacionesService.obtenerTodos().subscribe((response: any) => {
      const body = response.body as any[];
      this.tiposObservaciones = body;

      // Refrescar los datos con los nombres de los tipos
      if (this.datos.length > 0) {
        this.obtenerTodos(this.idEstudiante);
      }
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
        clave: 'nombre_tipo_observacion',
        alias: 'Tipo',
        alinear: 'izquierda',
      },
      {
        clave: 'descripcion',
        alias: 'Descripción',
        alinear: 'izquierda',
      },
      {
        clave: 'fecha',
        alias: 'Fecha',
        alinear: 'centrado',
        tipo: 'date', // Formato de fecha
        formato: { pattern: 'dd/MM/yyyy' }
      },
      {
        clave: 'nombre_sprint_completo',
        alias: 'Sprint',
        alinear: 'izquierda',
      },
      {
        clave: 'para_informe_texto',
        alias: 'Para informe',
        alinear: 'centrado',
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
      this.obtenerTodos(this.idEstudiante);
      this.titulo = this.titulo + " para " + this.nombre_estudiante;
    });
  }

  seleccionar(event: any) {
    if (event.accion === 'editar') {
      this.router.navigate(['estudiantes-observaciones/editar/' + event.id + '/' + this.idEstudiante]);
    }
    if (event.accion === 'eliminar') {
      this.eliminar(event.id, event.registro);
    }
    if (event.accion === 'consultar') {
      this.router.navigate(['estudiantes-observaciones/consultar/' + event.id + '/' + this.idEstudiante]);
    }
  }

  eliminar(id: any, registro: any) {
    // Mostrar ventana de confirmación antes de proceder con la eliminación
    Swal.fire({
      title: '¿Estás seguro?',
      text: `Se eliminará la observación "${registro.nombre_tipo_observacion}" del ${registro.fecha}. Esta acción no se puede deshacer.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      reverseButtons: true
    }).then((result) => {
      // Si el usuario confirma la eliminación
      if (result.isConfirmed) {
        const body = { id: id };
        this.observacionesEstudiantesService.eliminar(body).subscribe((response: any) => {
          if (response) {
            Swal.fire({
              title: 'Observación eliminada con éxito',
              icon: "info",
              showCancelButton: false,
              focusConfirm: true,
              confirmButtonText: "Aceptar"
            }).then(() => {
              this.obtenerTodos(this.idEstudiante);
            });
          } else {
            Swal.fire({
              title: 'Error al eliminar la observación',
              icon: "error",
              showCancelButton: false,
              focusConfirm: true,
              confirmButtonText: "Aceptar"
            });
            console.log("Error al eliminar observación.");
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