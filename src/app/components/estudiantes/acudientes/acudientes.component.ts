import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import Swal from 'sweetalert2';
import { HeaderComponentAnidado } from '../../../common/header-anidado/header-anidado.component';
import { TablasComponent } from '../../../common/tablas/tablas.component';
import { EstudiantesService } from '../../../services/estudiantes.service';
import { AcudientesService } from '../../../services/acudientes.service';
import { TiposAcudienteService } from '../../../services/tipos-acudiente.service';
import { PermisosService } from '../../../services/permisos.service';

@Component({
  selector: 'app-acudientes',
  standalone: true,
  imports: [CommonModule, TablasComponent, HeaderComponentAnidado],
  templateUrl: './acudientes.component.html',
  styleUrl: './acudientes.component.scss'
})
export class AcudientesComponent {
  public titulo = "Módulo de acudientes";
  public idEstudiante = "0";
  public accion = "";
  public path = "/estudiantes-acudientes/crear/0/"
  public estudiante: any;
  public nombre_estudiante = "";
  public titulos = [] as any[];
  public datos = [] as any[];
  public columnasFiltro = ['Nombre Acudiente', 'Tipo Acudiente', 'Responsable Pago', 'Autorizado Recoger', 'Acceso Sistema'];
  public tiposAcudiente = [] as any[];

  // Variables de permisos
  public puedeAdministrar = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private estudiantesService: EstudiantesService,
    private acudientesService: AcudientesService,
    private tiposAcudienteService: TiposAcudienteService,
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

    this.obtenerTiposAcudiente();
    this.crearTitulos();
  }

  configurarPermisos(): void {
    this.puedeAdministrar = this.permisosService.tienePermiso('estudiantes.acudientes.administrar');
  }

  obtenerTodos(id_estudiante: any): void {
    this.acudientesService.obtenerPorEstudiante(id_estudiante).subscribe((response: any) => {
      const body = response.body as any[];
      console.log("consumo servicio obtenerPorEstudiante", body);
      
      // Enriquecer los datos con información de tipo de acudiente
      this.enriquecerDatos(body);
    });
  }

  enriquecerDatos(acudientes: any[]): void {
    // Esta función agrega información adicional a los datos de acudientes
    // como convertir los valores booleanos a textos más descriptivos
    
    acudientes.forEach(acudiente => {
      // Convertir booleano a texto
      acudiente.responsable_pago_texto = acudiente.es_responsable_pago ? 'Sí' : 'No';
      acudiente.autorizado_recoger_texto = acudiente.autorizado_recoger ? 'Sí' : 'No';
      acudiente.autorizado_sistema_texto = acudiente.autorizado_sistema ? 'Sí' : 'No';
      acudiente.activo_texto = acudiente.activo ? 'Activo' : 'Inactivo';
      
      // Buscar y asignar el nombre del tipo de acudiente
      const tipoAcudiente = this.tiposAcudiente.find(tipo => tipo.id === acudiente.id_tipo_acudiente);
      if (tipoAcudiente) {
        acudiente.nombre_tipo_acudiente = tipoAcudiente.nombre;
      } else {
        acudiente.nombre_tipo_acudiente = 'Desconocido';
      }
    });
    
    this.datos = acudientes;
  }

  obtenerTiposAcudiente(): void {
    this.tiposAcudienteService.obtenerTodos().subscribe((response: any) => {
      const body = response.body as any[];
      console.log("consumo servicio obtenerTodos tipos acudiente", body);
      this.tiposAcudiente = body;
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
        clave: 'nombre_persona',
        alias: 'Nombre Acudiente',
        alinear: 'izquierda',
      },
      {
        clave: 'nombre_tipo_acudiente',
        alias: 'Tipo Acudiente',
        alinear: 'izquierda',
      },
      {
        clave: 'responsable_pago_texto',
        alias: 'Responsable Pago',
        alinear: 'centrado',
      },
      {
        clave: 'autorizado_recoger_texto',
        alias: 'Autorizado Recoger',
        alinear: 'centrado',
      },
      {
        clave: 'autorizado_sistema_texto',
        alias: 'Acceso Sistema',
        alinear: 'centrado',
      },
      {
        clave: 'activo_texto',
        alias: 'Estado',
        alinear: 'centrado',
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
      this.obtenerTodos(this.idEstudiante);
      this.titulo = this.titulo + " para " + this.nombre_estudiante;
    });
  }

  seleccionar(event: any) {
    if (event.accion === 'editar') {
      this.router.navigate(['estudiantes-acudientes/editar/' + event.id + '/' + this.idEstudiante]);
    }
    if (event.accion === 'eliminar') {
      this.eliminar(event.id, event.registro);
    }
    if (event.accion === 'consultar') {
      this.router.navigate(['estudiantes-acudientes/consultar/' + event.id + '/' + this.idEstudiante]);
    }
  }

  eliminar(id: any, registro: any) {
    // Mostrar ventana de confirmación antes de proceder con la eliminación
    Swal.fire({
      title: '¿Estás seguro?',
      text: `Se eliminará el acudiente "${registro.nombre_persona}" de tipo ${registro.nombre_tipo_acudiente}. Esta acción no se puede deshacer.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      reverseButtons: true
    }).then((result) => {
      // Si el usuario confirma la eliminación
      if (result.isConfirmed) {
        const body = { id: id };
        this.acudientesService.eliminar(body).subscribe((response: any) => {
          if (response) {
            Swal.fire({
              title: 'Acudiente eliminado con éxito',
              icon: "info",
              showCancelButton: false,
              focusConfirm: true,
              confirmButtonText: "Aceptar"
            }).then(() => {
              this.obtenerTodos(this.idEstudiante);
            });
          } else {
            Swal.fire({
              title: 'Error al eliminar el acudiente',
              icon: "error",
              showCancelButton: false,
              focusConfirm: true,
              confirmButtonText: "Aceptar"
            });
            console.log("Error al eliminar acudiente.");
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