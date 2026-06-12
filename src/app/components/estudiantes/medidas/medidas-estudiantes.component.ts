import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { HeaderComponent } from '../../../common/header/header.component';
import { ActivatedRoute, Router } from '@angular/router';
import Swal from 'sweetalert2';
import { HeaderComponentAnidado } from '../../../common/header-anidado/header-anidado.component';
import { TablasComponent } from '../../../common/tablas/tablas.component';
import { EstudiantesService } from '../../../services/estudiantes.service';
import { MedidasXEstudianteService } from '../../../services/medidas-x-estudiante.service';
import { PermisosService } from '../../../services/permisos.service';


@Component({
  selector: 'app-medidas-estudiantes',
  standalone: true,
  imports: [CommonModule, TablasComponent, HeaderComponentAnidado],
  templateUrl: './medidas-estudiantes.component.html',
  styleUrl: './medidas-estudiantes.component.scss'
})
export class MedidasEstudiantesComponent {
  public titulo = "Módulo de registro de medidas";
  public idEstudiante = "0";
  public accion = "";
  public path = "/estudiantes-medidas/crear/0/"
  public estudiante: any;
  public nombre_estudiante = "";
  public titulos = [] as any[];
  public datos = [] as any[];
  public columnasFiltro = ['Medida', 'Valor', 'Fecha'];

  // Variables de permisos
  public puedeAdministrar = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private estudiantesService: EstudiantesService,
    private medidasXEstudianteService: MedidasXEstudianteService,
    private permisosService: PermisosService
  ) { }

  ngOnInit() {
    this.configurarPermisos();
    this.route.params.subscribe(params => {
      this.accion = params['accion'];
      this.idEstudiante = params['id'];
      this.path = this.path + this.idEstudiante;
      this.obtenerEstudiante(this.idEstudiante);
    });

    this.crearTitulos();
  }

  configurarPermisos(): void {
    this.puedeAdministrar = this.permisosService.tienePermiso('estudiantes.medidas.administrar');
  }

  obtenerTodos(id_estudiante: any): void {
    this.medidasXEstudianteService.obtenerTodosXEstudiante(id_estudiante).subscribe((response: any) => {
      const body = response.body as any[];
      console.log("consumo servicio obtenerTodosXEstudiante", body);
      this.datos = body;
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
        clave: 'nombre_medida',
        alias: 'Medida',
        alinear: 'izquierda',
      },
      {
        clave: 'valor',
        alias: 'Valor',
        alinear: 'derecha',
      },
      {
        clave: 'fecha',
        alias: 'Fecha',
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
      this.router.navigate(['estudiantes-medidas/editar/' + event.id + '/' + this.idEstudiante]);
    }
    if (event.accion === 'eliminar') {
      this.eliminar(event.id, event.registro);
    }
    if (event.accion === 'consultar') {
      this.router.navigate(['estudiantes-medidas/consultar/' + event.id + '/' + this.idEstudiante]);
    }
  }

  eliminar(id: any, registro: any) {
    // Mostrar ventana de confirmación antes de proceder con la eliminación
    Swal.fire({
      title: '¿Estás seguro?',
      text: `Se eliminará la medida "${registro.nombre_medida}" con valor ${registro.valor} del ${registro.fecha}. Esta acción no se puede deshacer.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      reverseButtons: true
    }).then((result) => {
      // Si el usuario confirma la eliminación
      if (result.isConfirmed) {
        const body = { id: id };
        this.medidasXEstudianteService.delete(body).subscribe((response: any) => {
          if (response) {
            Swal.fire({
              title: 'Medida eliminada con éxito',
              icon: "info",
              showCancelButton: false,
              focusConfirm: true,
              confirmButtonText: "Aceptar"
            }).then(() => {
              this.obtenerTodos(this.idEstudiante);
            });
          } else {
            Swal.fire({
              title: 'Error al eliminar la medida',
              icon: "error",
              showCancelButton: false,
              focusConfirm: true,
              confirmButtonText: "Aceptar"
            });
            console.log("Error al eliminar medida.");
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