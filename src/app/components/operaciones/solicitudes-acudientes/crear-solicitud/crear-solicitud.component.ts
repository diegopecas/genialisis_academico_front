import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HeaderComponent } from '../../../../common/header/header.component';
import { SolicitudesService } from '../../../../services/solicitudes.service';
import { TiposSolicitudService } from '../../../../services/tipos-solicitud.service';
import { EstudiantesService } from '../../../../services/estudiantes.service';
import { AcudientesService } from '../../../../services/acudientes.service';
import { ColaboradoresService } from '../../../../services/colaboradores.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-crear-solicitud-jardin',
  templateUrl: './crear-solicitud.component.html',
  styleUrl: './crear-solicitud.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent]
})
export class CrearSolicitudJardinComponent implements OnInit {

  titulo = "Registrar solicitud";

  // Origen 2 = jardin. Es el papá que llamó o que lo dijo al entregar al
  // niño, y la recepcionista lo anota de parte suya.
  readonly ORIGEN_JARDIN = 2;

  public estudiantes = [] as any[];
  public acudientes = [] as any[];
  public tipos = [] as any[];
  public colaboradores = [] as any[];

  public idEstudiante: any = null;
  public idPersonaSolicita: any = null;
  public idTipoSolicitud: any = null;
  public descripcion: string = '';
  public fechaInicio: string = '';
  public fechaFin: string = '';
  public horas = [] as string[];
  public nuevaHora: string = '';

  // Responsables escogidos a mano. El titular del grupo y los cargos
  // configurados en el tipo los agrega el backend solo; esto es para sumar a
  // alguien más en un caso puntual.
  public responsables = [] as any[];
  public nuevoResponsable: any = null;

  public guardando: boolean = false;

  constructor(
    private solicitudesService: SolicitudesService,
    private tiposService: TiposSolicitudService,
    private estudiantesService: EstudiantesService,
    private acudientesService: AcudientesService,
    private colaboradoresService: ColaboradoresService,
    private router: Router
  ) { }

  ngOnInit() {
    this.fechaInicio = this.fechaDeHoy();
    this.fechaFin = this.fechaInicio;
    this.cargarEstudiantes();
    this.cargarTipos();
    this.cargarColaboradores();
  }

  fechaDeHoy(): string {
    const hoy = new Date();
    const mes = ('0' + (hoy.getMonth() + 1)).slice(-2);
    const dia = ('0' + hoy.getDate()).slice(-2);
    return `${hoy.getFullYear()}-${mes}-${dia}`;
  }

  cargarEstudiantes() {
    this.estudiantesService.obtenerActivos().subscribe({
      next: (response: any) => {
        this.estudiantes = response.body || [];
      },
      error: () => {
        this.estudiantes = [];
      }
    });
  }

  cargarTipos() {
    this.tiposService.obtenerActivos().subscribe({
      next: (response: any) => {
        this.tipos = response.body || [];
      },
      error: () => {
        this.tipos = [];
      }
    });
  }

  cargarColaboradores() {
    this.colaboradoresService.obtenerTodos().subscribe({
      next: (response: any) => {
        this.colaboradores = response.body || [];
      },
      error: () => {
        this.colaboradores = [];
      }
    });
  }

  /**
   * La solicitud siempre va de parte de un acudiente, aunque la digite el
   * jardín: es lo que hace que le aparezca a él en su portal y sepa que su
   * llamada surtió efecto.
   */
  cambioEstudiante() {
    this.idPersonaSolicita = null;
    this.acudientes = [];

    if (!this.idEstudiante) return;

    this.acudientesService.obtenerPorEstudiante(this.idEstudiante).subscribe({
      next: (response: any) => {
        this.acudientes = response.body || [];
        if (this.acudientes.length === 1) {
          this.idPersonaSolicita = this.acudientes[0].id_persona;
        }
      },
      error: () => {
        this.acudientes = [];
      }
    });
  }

  get tipoSeleccionado(): any {
    return this.tipos.find(t => t.id === this.idTipoSolicitud) || null;
  }

  get manejaHoras(): boolean {
    const tipo = this.tipoSeleccionado;
    return !!tipo && Number(tipo.manejo_horas) > 0;
  }

  get admiteVariasHoras(): boolean {
    const tipo = this.tipoSeleccionado;
    return !!tipo && Number(tipo.manejo_horas) === 2;
  }

  get exigeSoporte(): boolean {
    const tipo = this.tipoSeleccionado;
    return !!tipo && Number(tipo.documento) === 2;
  }

  cambioTipo() {
    this.horas = [];
    this.nuevaHora = '';

    if (!this.manejaHoras) {
      this.fechaFin = this.fechaInicio;
    }
  }

  agregarHora() {
    if (!this.nuevaHora) return;

    if (this.horas.includes(this.nuevaHora)) {
      Swal.fire('Hora repetida', 'Esa hora ya está en la lista', 'warning');
      return;
    }

    if (!this.admiteVariasHoras) {
      this.horas = [this.nuevaHora];
    } else {
      this.horas.push(this.nuevaHora);
      this.horas.sort();
    }

    this.nuevaHora = '';
  }

  quitarHora(hora: string) {
    this.horas = this.horas.filter(h => h !== hora);
  }

  agregarResponsable() {
    if (!this.nuevoResponsable) return;

    if (this.responsables.some(r => r.id === this.nuevoResponsable)) {
      this.nuevoResponsable = null;
      return;
    }

    const colaborador = this.colaboradores.find(c => c.id === this.nuevoResponsable);

    if (colaborador) {
      this.responsables.push({
        id: colaborador.id,
        nombre: this.nombreColaborador(colaborador)
      });
    }

    this.nuevoResponsable = null;
  }

  quitarResponsable(responsable: any) {
    this.responsables = this.responsables.filter(r => r.id !== responsable.id);
  }

  nombreColaborador(colaborador: any): string {
    const nombre = colaborador.primer_nombre || colaborador.nombre || '';
    const apellido = colaborador.primer_apellido || colaborador.apellido || '';
    return `${nombre} ${apellido}`.trim();
  }

  nombreEstudiante(estudiante: any): string {
    const nombre = estudiante.primer_nombre || '';
    const apellido = estudiante.primer_apellido || '';
    return `${nombre} ${apellido}`.trim();
  }

  nombreAcudiente(acudiente: any): string {
    const nombre = acudiente.primer_nombre || '';
    const apellido = acudiente.primer_apellido || '';
    const tipo = acudiente.tipo_acudiente || acudiente.nombre_tipo_acudiente || '';
    const base = `${nombre} ${apellido}`.trim();
    return tipo ? `${base} (${tipo})` : base;
  }

  guardar() {
    const error = this.validar();

    if (error) {
      Swal.fire('Falta información', error, 'warning');
      return;
    }

    this.guardando = true;

    this.solicitudesService.crear({
      id_estudiante: this.idEstudiante,
      id_tipo_solicitud: this.idTipoSolicitud,
      descripcion: this.descripcion.trim(),
      fecha_inicio: this.fechaInicio,
      fecha_fin: this.manejaHoras ? (this.fechaFin || this.fechaInicio) : this.fechaInicio,
      id_origen: this.ORIGEN_JARDIN,
      id_persona_solicita: this.idPersonaSolicita,
      id_documento: null,
      horas: this.horas,
      responsables: this.responsables.map(r => r.id)
    }).subscribe({
      next: (respuesta: any) => {
        this.guardando = false;
        const pendiente = respuesta?.id_estado === 1;

        Swal.fire(
          'Registrada',
          pendiente
            ? 'Queda pendiente de aprobación y le aparecerá a quien pueda aprobarla.'
            : 'Ya está en la agenda del día y el acudiente la ve en su portal.',
          'success'
        ).then(() => this.volver());
      },
      error: (error: any) => {
        this.guardando = false;
        Swal.fire('Error', error?.error?.error || 'No se pudo registrar', 'error');
      }
    });
  }

  private validar(): string | null {
    if (!this.idEstudiante) return 'Escoja el niño';
    if (!this.idPersonaSolicita) return 'Escoja de parte de qué acudiente va la solicitud';
    if (!this.idTipoSolicitud) return 'Escoja el tipo de solicitud';
    if (!this.descripcion || this.descripcion.trim() === '') return 'Escriba de qué se trata';
    if (!this.fechaInicio) return 'Indique desde cuándo';
    if (this.fechaFin && this.fechaFin < this.fechaInicio) return 'La fecha final no puede ser anterior a la inicial';
    if (this.manejaHoras && this.horas.length === 0) return 'Agregue al menos una hora';
    if (this.exigeSoporte) return 'Este tipo exige soporte adjunto y el jardín no lo puede subir: el acudiente debe enviarla desde su portal';
    return null;
  }

  volver() {
    this.router.navigate(['/operaciones/solicitudes-acudientes']);
  }
}
