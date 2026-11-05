import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HeaderComponent } from '../../../../common/header/header.component';
import { FechaInputComponent } from '../../../../common/fecha-input/fecha-input.component';
import { HoraInputComponent } from '../../../../common/hora-input/hora-input.component';
import { NovedadesEspaciosService } from '../../../../services/novedades-espacios.service';
import { TiposNovedadEspacioService } from '../../../../services/tipos-novedad-espacio.service';
import { LugaresCursosExtraService } from '../../../../services/lugares-cursos-extra.service';
import { EspaciosLugaresCursosExtraService } from '../../../../services/espacios-lugares-cursos-extra.service';
import SwalBase from 'sweetalert2';

// Alertas con el boton de confirmar en dorado (el de la libreria es morado)
const Swal = SwalBase.mixin({ confirmButtonColor: '#d4af37' });

/**
 * Registrar o editar una novedad de cancha. Al crear se marcan una o varias
 * canchas del lugar y se crea una novedad por cada una; al editar es una
 * sola cancha. Solo se editan las que están sin reportar.
 */
@Component({
  selector: 'app-crear-novedad-espacio',
  templateUrl: './crear-novedad-espacio.component.html',
  styleUrl: './crear-novedad-espacio.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, FechaInputComponent, HoraInputComponent],
})
export class CrearNovedadEspacioComponent implements OnInit {
  titulo = 'Registrar Novedad';
  accion: string = '';
  regresar = '/operaciones/novedades-espacios';
  editable: boolean = true;
  submitted: boolean = false;
  guardando: boolean = false;

  lugares: any[] = [];
  espacios: any[] = [];
  tipos: any[] = [];
  // Al crear: las canchas marcadas. Al editar: la cancha de la novedad.
  espaciosMarcados = new Set<string>();

  model = {
    id: null,
    id_lugar: '',
    id_tipo_novedad_espacio: '',
    fecha: '',
    hora_inicial: '',
    hora_final: '',
    observaciones: '',
    estado: 'sin_reportar'
  } as any;

  constructor(
    private novedadesService: NovedadesEspaciosService,
    private tiposService: TiposNovedadEspacioService,
    private lugaresService: LugaresCursosExtraService,
    private espaciosService: EspaciosLugaresCursosExtraService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.cargarCatalogos();
    this.route.params.subscribe((params) => {
      this.accion = params['accion'];
      if (this.accion === 'crear') {
        this.titulo = 'Registrar Novedad';
        this.model.fecha = this.hoyISO();
      } else {
        this.cargarNovedad(params['id']);
      }
    });
  }

  private cargarCatalogos() {
    this.lugaresService.obtenerActivos().subscribe({
      next: (response: any) => {
        this.lugares = (response.body || []) as any[];
        // Con un solo lugar se escoge solo
        if (this.accion === 'crear' && this.lugares.length === 1 && !this.model.id_lugar) {
          this.model.id_lugar = this.lugares[0].id;
          this.cargarEspacios();
        }
      },
      error: (error: any) => console.error('Error al cargar los lugares', error)
    });
    this.tiposService.obtenerActivos().subscribe({
      next: (response: any) => this.tipos = (response.body || []) as any[],
      error: (error: any) => console.error('Error al cargar los tipos de novedad', error)
    });
  }

  cargarNovedad(id: any) {
    this.novedadesService.obtenerById(id).subscribe({
      next: (response: any) => {
        const body = response.body || [];
        if (body.length === 0) {
          Swal.fire('No encontrada', 'La novedad no existe.', 'warning').then(() => this.volver());
          return;
        }
        const n = body[0];
        this.model = {
          ...n,
          id_lugar: n.id_lugar_curso_extra,
          hora_inicial: String(n.hora_inicial).substring(0, 5),
          hora_final: String(n.hora_final).substring(0, 5),
          observaciones: n.observaciones || ''
        };
        this.espaciosMarcados = new Set([n.id_espacio_lugar_curso_extra]);
        // Una reportada o cruzada ya no se cambia
        this.editable = this.accion === 'editar' && n.estado === 'sin_reportar';
        this.titulo = (this.editable ? 'Editar Novedad: ' : 'Consultar Novedad: ') + n.nombre_espacio + ' · ' + n.fecha;
        this.cargarEspacios(false);
      },
      error: (error: any) => {
        console.error('Error al cargar la novedad', error);
        Swal.fire('Error', 'No se pudo cargar la novedad.', 'error');
      }
    });
  }

  /** Canchas del lugar. Al cambiar de lugar se desmarcan las que había. */
  cargarEspacios(limpiar: boolean = true) {
    if (limpiar) this.espaciosMarcados = new Set<string>();
    this.espacios = [];
    if (!this.model.id_lugar) return;
    const peticion = this.accion === 'crear'
      ? this.espaciosService.obtenerActivosByLugar(this.model.id_lugar)
      : this.espaciosService.obtenerByLugar(this.model.id_lugar);
    peticion.subscribe({
      next: (response: any) => this.espacios = (response.body || []) as any[],
      error: (error: any) => console.error('Error al cargar las canchas', error)
    });
  }

  // Al crear se marcan varias; al editar se cambia la única
  alternarEspacio(espacio: any) {
    if (!this.editable) return;
    if (this.accion !== 'crear') {
      this.espaciosMarcados = new Set([espacio.id]);
      return;
    }
    if (this.espaciosMarcados.has(espacio.id)) {
      this.espaciosMarcados.delete(espacio.id);
    } else {
      this.espaciosMarcados.add(espacio.id);
    }
  }

  marcarTodas() {
    this.espaciosMarcados = new Set(this.espacios.map((e: any) => e.id));
  }

  guardar() {
    this.submitted = true;
    const faltante = !this.model.id_lugar ? 'Escoge el lugar.'
      : this.espaciosMarcados.size === 0 ? 'Marca al menos una cancha.'
      : !this.model.fecha ? 'Escribe la fecha.'
      : !this.model.hora_inicial || !this.model.hora_final ? 'Escribe la hora desde y hasta.'
      : this.model.hora_final <= this.model.hora_inicial ? 'La hora hasta tiene que ser posterior a la hora desde.'
      : !this.model.id_tipo_novedad_espacio ? 'Escoge el tipo de novedad.' : '';
    if (faltante) {
      Swal.fire('Revisa el formulario', faltante, 'warning');
      return;
    }

    const datos: any = {
      id_tipo_novedad_espacio: this.model.id_tipo_novedad_espacio,
      fecha: this.model.fecha,
      hora_inicial: this.model.hora_inicial,
      hora_final: this.model.hora_final,
      observaciones: (this.model.observaciones || '').trim() || null
    };
    let peticion;
    if (this.accion === 'crear') {
      datos.ids_espacios = Array.from(this.espaciosMarcados);
      peticion = this.novedadesService.crear(datos);
    } else {
      datos.id = this.model.id;
      datos.id_espacio_lugar_curso_extra = Array.from(this.espaciosMarcados)[0];
      peticion = this.novedadesService.actualizar(datos);
    }

    this.guardando = true;
    peticion.subscribe({
      next: (respuesta: any) => {
        this.guardando = false;
        const cantidad = respuesta?.ids?.length || 1;
        Swal.fire('Listo', this.accion === 'crear'
          ? (cantidad === 1 ? 'Se registró la novedad.' : `Se registraron ${cantidad} novedades, una por cancha.`)
          : 'Se actualizó la novedad.', 'success');
        this.volver();
      },
      error: (error: any) => {
        this.guardando = false;
        Swal.fire('Error', error?.error?.error || 'No se pudo guardar la novedad.', 'error');
      }
    });
  }

  private hoyISO(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  volver() {
    this.router.navigate([this.regresar]);
  }
}
