import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HeaderComponent } from '../../../../common/header/header.component';
import { TiposSolicitudService } from '../../../../services/tipos-solicitud.service';
import { TiposSolicitudCargosService } from '../../../../services/tipos-solicitud-cargos.service';
import { RolesSolicitudPersonaService } from '../../../../services/roles-solicitud-persona.service';
import { CargosService } from '../../../../services/cargos.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-crear-tipo-solicitud',
  templateUrl: './crear-tipo-solicitud.component.html',
  styleUrl: './crear-tipo-solicitud.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent]
})
export class CrearTipoSolicitudComponent implements OnInit {

  titulo = "Crear Tipo de Solicitud";
  accion: string = "";
  regresar = '/administracion/operaciones/tipos-solicitud';
  editable: boolean = true;
  submitted: boolean = false;

  // Todo el comportamiento del modulo sale de estas banderas: el codigo no
  // pregunta "¿es medicamento?", pregunta por la configuracion del tipo.
  model = {
    id: null,
    nombre: '',
    descripcion: '',
    icono: '',
    orden: 0,
    activo: 1,
    requiere_aprobacion: 0,
    manejo_horas: 0,
    documento: 0,
    minutos_anticipacion: null,
    requiere_confirmacion: 0,
    notifica_acudiente_cumplido: 0,
    exige_responsable: 0,
    titular_es_responsable: 1,
    titular_es_aprobador: 0
  } as any;

  public cargos = [] as any[];
  public roles = [] as any[];
  public cargosDelTipo = [] as any[];

  public nuevoCargo: any = null;
  public nuevoRol: any = null;

  constructor(
    private tiposService: TiposSolicitudService,
    private cargosTipoService: TiposSolicitudCargosService,
    private rolesService: RolesSolicitudPersonaService,
    private cargosService: CargosService,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.cargarCargos();
    this.cargarRoles();

    this.route.params.subscribe(params => {
      this.accion = params['accion'];
      const id = params['id'];

      if (this.accion === 'crear') {
        this.titulo = "Crear Tipo de Solicitud";
        this.editable = true;
      } else if (this.accion === 'editar') {
        this.titulo = "Editar Tipo de Solicitud";
        this.editable = true;
        this.cargarTipo(id);
        this.cargarCargosDelTipo(id);
      } else if (this.accion === 'consultar') {
        this.titulo = "Consultar Tipo de Solicitud";
        this.editable = false;
        this.cargarTipo(id);
        this.cargarCargosDelTipo(id);
      }
    });
  }

  cargarTipo(id: any) {
    this.tiposService.obtenerById(id).subscribe({
      next: (response: any) => {
        const body = response.body;
        if (body && body.length > 0) {
          this.model = body[0];

          if (this.accion === 'editar') {
            this.titulo = "Editar Tipo de Solicitud: " + this.model.nombre;
          } else if (this.accion === 'consultar') {
            this.titulo = "Consultar Tipo de Solicitud: " + this.model.nombre;
          }
        }
      },
      error: (error: any) => {
        console.error("Error al cargar el tipo de solicitud", error);
        Swal.fire('Error', 'No se pudo cargar el tipo de solicitud', 'error');
      }
    });
  }

  cargarCargos() {
    this.cargosService.obtenerTodos().subscribe({
      next: (response: any) => {
        this.cargos = response.body || [];
      },
      error: () => {
        this.cargos = [];
      }
    });
  }

  cargarRoles() {
    this.rolesService.obtenerTodos().subscribe({
      next: (response: any) => {
        this.roles = response.body || [];
      },
      error: () => {
        this.roles = [];
      }
    });
  }

  cargarCargosDelTipo(id: any) {
    this.cargosTipoService.obtenerPorTipo(id).subscribe({
      next: (response: any) => {
        this.cargosDelTipo = response.body || [];
      },
      error: () => {
        this.cargosDelTipo = [];
      }
    });
  }

  /**
   * Sin horas no hay a que anticiparse: el aviso previo se calcula contra la
   * hora programada de la ocurrencia.
   */
  cambioManejoHoras() {
    if (Number(this.model.manejo_horas) === 0) {
      this.model.minutos_anticipacion = null;
    }
  }

  guardar() {
    this.submitted = true;

    if (!this.model.nombre || this.model.nombre.trim() === '') {
      Swal.fire('Advertencia', 'El nombre del tipo es obligatorio', 'warning');
      return;
    }

    const data = {
      nombre: this.model.nombre.trim(),
      descripcion: this.model.descripcion,
      icono: this.model.icono,
      orden: this.model.orden,
      activo: this.model.activo,
      requiere_aprobacion: this.model.requiere_aprobacion,
      manejo_horas: this.model.manejo_horas,
      documento: this.model.documento,
      minutos_anticipacion: this.model.minutos_anticipacion,
      requiere_confirmacion: this.model.requiere_confirmacion,
      notifica_acudiente_cumplido: this.model.notifica_acudiente_cumplido,
      exige_responsable: this.model.exige_responsable,
      titular_es_responsable: this.model.titular_es_responsable,
      titular_es_aprobador: this.model.titular_es_aprobador
    } as any;

    if (this.accion === 'crear') {
      this.tiposService.crear(data).subscribe({
        next: () => {
          // Los cargos se agregan entrando a editar, porque necesitan el id
          // del tipo ya creado.
          Swal.fire('Éxito', 'Tipo creado correctamente. Entre a editarlo para agregar los cargos.', 'success');
          this.router.navigate(['/administracion/operaciones/tipos-solicitud']);
        },
        error: (error: any) => {
          console.error("Error al crear el tipo de solicitud", error);
          Swal.fire('Error', error?.error?.error || 'No se pudo crear el tipo', 'error');
        }
      });
    } else if (this.accion === 'editar') {
      data.id = this.model.id;
      this.tiposService.actualizar(data).subscribe({
        next: () => {
          Swal.fire('Éxito', 'Tipo actualizado correctamente', 'success');
          this.router.navigate(['/administracion/operaciones/tipos-solicitud']);
        },
        error: (error: any) => {
          console.error("Error al actualizar el tipo de solicitud", error);
          Swal.fire('Error', error?.error?.error || 'No se pudo actualizar el tipo', 'error');
        }
      });
    }
  }

  /**
   * Ojo con el alcance: agregar el cargo "Docente" mete a TODAS las docentes
   * a la lista de la solicitud. Es a proposito.
   */
  agregarCargo() {
    if (!this.nuevoCargo || !this.nuevoRol) {
      Swal.fire('Advertencia', 'Escoja el cargo y el rol', 'warning');
      return;
    }

    this.cargosTipoService.crear({
      id_tipo_solicitud: this.model.id,
      id_cargo: this.nuevoCargo,
      id_rol: this.nuevoRol
    }).subscribe({
      next: () => {
        this.nuevoCargo = null;
        this.nuevoRol = null;
        this.cargarCargosDelTipo(this.model.id);
      },
      error: (error: any) => {
        Swal.fire('Error', error?.error?.error || 'No se pudo agregar el cargo', 'error');
      }
    });
  }

  quitarCargo(cargo: any) {
    this.cargosTipoService.eliminar(cargo.id).subscribe({
      next: () => {
        this.cargarCargosDelTipo(this.model.id);
      },
      error: (error: any) => {
        Swal.fire('Error', error?.error?.error || 'No se pudo quitar el cargo', 'error');
      }
    });
  }

  volver() {
    this.router.navigate(['/administracion/operaciones/tipos-solicitud']);
  }
}
