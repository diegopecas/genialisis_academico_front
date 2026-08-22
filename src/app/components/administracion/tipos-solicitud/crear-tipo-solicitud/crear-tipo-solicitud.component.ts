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

  titulo = "Tipo de Compromiso";

  public accion: string = 'crear';
  public id: any = null;

  // Todo el comportamiento del modulo sale de estas banderas: el codigo no
  // pregunta "¿es medicamento?", pregunta por la configuracion del tipo.
  public tipo: any = {
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
  };

  public cargos = [] as any[];
  public roles = [] as any[];
  public cargosDelTipo = [] as any[];

  public nuevoCargo: any = null;
  public nuevoRol: any = null;

  public guardando: boolean = false;

  constructor(
    private tiposService: TiposSolicitudService,
    private cargosTipoService: TiposSolicitudCargosService,
    private rolesService: RolesSolicitudPersonaService,
    private cargosService: CargosService,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit() {
    this.accion = this.route.snapshot.paramMap.get('accion') || 'crear';
    this.id = this.route.snapshot.paramMap.get('id');

    this.cargarCargos();
    this.cargarRoles();

    if (this.id && this.id !== 'nuevo') {
      this.cargarTipo();
      this.cargarCargosDelTipo();
    }
  }

  cargarTipo() {
    this.tiposService.obtenerById(this.id).subscribe({
      next: (response: any) => {
        const filas = response.body || [];
        if (filas.length > 0) {
          this.tipo = filas[0];
        }
      },
      error: () => { }
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

  cargarCargosDelTipo() {
    this.cargosTipoService.obtenerPorTipo(this.id).subscribe({
      next: (response: any) => {
        this.cargosDelTipo = response.body || [];
      },
      error: () => {
        this.cargosDelTipo = [];
      }
    });
  }

  /**
   * Sin horas no hay a qué anticiparse: el aviso previo se calcula contra la
   * hora programada de la ocurrencia.
   */
  cambioManejoHoras() {
    if (Number(this.tipo.manejo_horas) === 0) {
      this.tipo.minutos_anticipacion = null;
    }
  }

  guardar() {
    if (!this.tipo.nombre || this.tipo.nombre.trim() === '') {
      Swal.fire('Falta el nombre', 'El nombre es obligatorio', 'warning');
      return;
    }

    this.guardando = true;

    if (this.id && this.id !== 'nuevo') {
      this.tiposService.actualizar(this.tipo).subscribe({
        next: () => {
          this.guardando = false;
          this.volver();
        },
        error: (error: any) => {
          this.guardando = false;
          Swal.fire('Error', error?.error?.error || 'No se pudo guardar', 'error');
        }
      });
      return;
    }

    this.tiposService.crear(this.tipo).subscribe({
      next: (respuesta: any) => {
        this.guardando = false;
        // Se queda en la pantalla para que pueda agregar los cargos, que
        // necesitan el id del tipo ya creado.
        this.id = respuesta.id;
        this.accion = 'editar';
        Swal.fire('Guardado', 'Ahora puede agregar los cargos.', 'success');
      },
      error: (error: any) => {
        this.guardando = false;
        Swal.fire('Error', error?.error?.error || 'No se pudo guardar', 'error');
      }
    });
  }

  /**
   * Ojo con el alcance: agregar el cargo "Docente" mete a TODAS las docentes
   * a la lista de la solicitud. Es a propósito, y por eso se avisa.
   */
  agregarCargo() {
    if (!this.nuevoCargo || !this.nuevoRol) {
      Swal.fire('Faltan datos', 'Escoja el cargo y el rol', 'warning');
      return;
    }

    this.cargosTipoService.crear({
      id_tipo_solicitud: this.id,
      id_cargo: this.nuevoCargo,
      id_rol: this.nuevoRol
    }).subscribe({
      next: () => {
        this.nuevoCargo = null;
        this.nuevoRol = null;
        this.cargarCargosDelTipo();
      },
      error: (error: any) => {
        Swal.fire('Error', error?.error?.error || 'No se pudo agregar', 'error');
      }
    });
  }

  quitarCargo(cargo: any) {
    this.cargosTipoService.eliminar(cargo.id).subscribe({
      next: () => {
        this.cargarCargosDelTipo();
      },
      error: (error: any) => {
        Swal.fire('Error', error?.error?.error || 'No se pudo quitar', 'error');
      }
    });
  }

  volver() {
    this.router.navigate(['/administracion/operaciones/compromisos']);
  }
}
