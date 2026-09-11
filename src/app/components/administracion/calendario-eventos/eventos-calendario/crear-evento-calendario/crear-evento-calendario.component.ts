import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { HeaderComponent } from '../../../../../common/header/header.component';
import { CalendariosEventosService } from '../../../../../services/calendarios-eventos.service';
import { TiposEventoCalendarioService } from '../../../../../services/tipos-evento-calendario.service';

@Component({
  selector: 'app-crear-evento-calendario',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent],
  templateUrl: './crear-evento-calendario.component.html',
  styleUrl: './crear-evento-calendario.component.scss'
})
export class CrearEventoCalendarioComponent implements OnInit {

  public id = "0";
  public accion = "";
  public editable = true;
  public submitted = false;
  public titulo = "Evento del Calendario";
  public regresar = '/administracion/datos-maestros/calendario-eventos/eventos';
  public tipos: any[] = [];

  // La descripción es el título corto del evento (el back valida el mismo límite)
  public readonly maxDescripcion = 150;

  // Vista y fecha del calendario desde donde se llegó, para regresar al mismo punto
  private vistaRetorno = '';
  private fechaRetorno = '';

  public model = {
    id: "",
    fecha: "",
    hora_inicio: "",
    hora_fin: "",
    id_tipo_evento_calendario: "",
    descripcion: ""
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private calendariosEventosService: CalendariosEventosService,
    private tiposEventoCalendarioService: TiposEventoCalendarioService
  ) {}

  ngOnInit(): void {
    this.obtenerTipos();

    // El calendario manda la fecha (y la hora si se hizo clic en una franja) y su vista actual
    const query = this.route.snapshot.queryParamMap;
    this.vistaRetorno = query.get('vista') || '';
    this.fechaRetorno = query.get('fecha') || '';

    this.route.params.subscribe(params => {
      this.accion = params['accion'];
      this.id = params['id'];

      switch (this.accion) {
        case 'crear':
          this.editable = true;
          this.titulo = "Crear Evento";
          this.model.fecha = /^\d{4}-\d{2}-\d{2}$/.test(this.fechaRetorno) ? this.fechaRetorno : "";
          this.model.hora_inicio = /^\d{2}:\d{2}$/.test(query.get('hora') || '') ? query.get('hora')! : "";
          break;
        case 'editar':
          this.editable = true;
          this.titulo = "Editar Evento";
          this.obtenerRegistro(this.id);
          break;
        case 'consultar':
          this.editable = false;
          this.titulo = "Consultar Evento";
          this.obtenerRegistro(this.id);
          break;
      }
    });
  }

  obtenerTipos() {
    this.tiposEventoCalendarioService.obtenerTodos().subscribe((response: any) => {
      const body = (response.body ?? []) as any[];
      this.tipos = [...body].sort((a: any, b: any) => (a.nombre || '').localeCompare(b.nombre || ''));
    });
  }

  obtenerRegistro(id: any) {
    // El back de eventos devuelve un solo objeto (no un arreglo)
    this.calendariosEventosService.obtenerById(id).subscribe((response: any) => {
      const evento = response.body as any;
      if (evento && evento.id) {
        this.model = {
          id: evento.id,
          fecha: (evento.fecha || '').substring(0, 10),
          hora_inicio: (evento.hora_inicio || '').substring(0, 5),
          hora_fin: (evento.hora_fin || '').substring(0, 5),
          id_tipo_evento_calendario: evento.id_tipo_evento_calendario,
          descripcion: evento.descripcion || ""
        };
      }
    });
  }

  /** Obligatoria y corta; un evento viejo con texto más largo se debe acortar al editarlo. */
  get errorDescripcion(): string {
    if (!this.model.descripcion.trim()) {
      return 'La descripción es obligatoria';
    }
    if (this.model.descripcion.trim().length > this.maxDescripcion) {
      return `La descripción no puede tener más de ${this.maxDescripcion} caracteres`;
    }
    return '';
  }

  /** La hora de fin solo tiene sentido con hora de inicio y debe ser posterior a ella. */
  get errorHoras(): string {
    if (this.model.hora_fin && !this.model.hora_inicio) {
      return 'Para poner hora de fin primero indica la hora de inicio';
    }
    if (this.model.hora_inicio && this.model.hora_fin && this.model.hora_fin <= this.model.hora_inicio) {
      return 'La hora de fin debe ser posterior a la hora de inicio';
    }
    return '';
  }

  guardar() {
    this.submitted = true;
    if (!this.model.fecha || !this.model.id_tipo_evento_calendario || this.errorDescripcion || this.errorHoras) return;

    // Las horas vacías viajan como null para que el evento quede de todo el día
    const datos = {
      ...this.model,
      hora_inicio: this.model.hora_inicio || null,
      hora_fin: this.model.hora_fin || null
    };

    const servicio = this.accion === 'crear'
      ? this.calendariosEventosService.crear(datos)
      : this.calendariosEventosService.actualizar(datos);

    servicio.subscribe({
      next: () => {
        Swal.fire({
          title: this.accion === 'crear' ? 'Evento creado' : 'Evento actualizado',
          icon: 'success',
          confirmButtonText: 'Aceptar'
        }).then(() => this.volver());
      },
      error: (error: any) => {
        Swal.fire('Error', error?.error?.error || 'Hubo un problema al guardar', 'error');
      }
    });
  }

  /** Regresa al calendario en la vista y la fecha del evento (o desde donde se llegó). */
  volver() {
    const queryParams: any = {};
    const fecha = this.model.fecha || this.fechaRetorno;
    if (fecha) queryParams.fecha = fecha;
    if (this.vistaRetorno) queryParams.vista = this.vistaRetorno;
    this.router.navigate([this.regresar], { queryParams });
  }
}
