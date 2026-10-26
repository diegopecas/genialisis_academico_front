import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HeaderComponent } from '../../../../common/header/header.component';
import { HoraInputComponent } from '../../../../common/hora-input/hora-input.component';
import {
  LugaresCursosExtraService,
  LugarCursoExtra,
} from '../../../../services/lugares-cursos-extra.service';
import { EspaciosLugaresCursosExtraService } from '../../../../services/espacios-lugares-cursos-extra.service';
import { DiasSemanaService } from '../../../../services/dias-semana.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-crear-lugar-curso-extra',
  templateUrl: './crear-lugar-curso-extra.component.html',
  styleUrl: './crear-lugar-curso-extra.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, HoraInputComponent],
})
export class CrearLugarCursoExtraComponent implements OnInit {
  titulo = 'Crear Lugar';
  accion: string = '';
  regresar = '/administracion/datos-maestros/lugares-cursos-extra';
  editable: boolean = true;
  submitted: boolean = false;

  model = {
    id: null,
    nombre: '',
    direccion: '',
    telefono: '',
    contacto: '',
    observaciones: '',
    activo: true,
  } as any;

  /* Espacios del lugar (canchas, piscinas, salones), cada uno con su horario
     fijo contratado. Se manejan cuando el lugar ya existe (editar). */
  espacios: any[] = [];
  diasSemana: any[] = [];
  mostrarModalEspacio: boolean = false;
  espacioModal: any = {};

  constructor(
    private lugaresCursosExtraService: LugaresCursosExtraService,
    private route: ActivatedRoute,
    private router: Router,
    private espaciosLugaresCursosExtraService: EspaciosLugaresCursosExtraService,
    private diasSemanaService: DiasSemanaService,
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      this.accion = params['accion'];
      const id = params['id'];

      if (this.accion === 'crear') {
        this.titulo = 'Crear Lugar';
        this.editable = true;
      } else if (this.accion === 'editar') {
        this.titulo = 'Editar Lugar';
        this.editable = true;
        this.cargarLugar(id);
        this.cargarEspacios(id);
        this.cargarDiasSemana();
      } else if (this.accion === 'consultar') {
        this.titulo = 'Consultar Lugar';
        this.editable = false;
        this.cargarLugar(id);
        this.cargarEspacios(id);
      }
    });
  }

  cargarLugar(id: any) {
    this.lugaresCursosExtraService.obtenerById(id).subscribe({
      next: (response: any) => {
        const body = response.body;
        if (body && body.length > 0) {
          const registro = body[0];
          this.model = {
            ...registro,
            direccion: registro.direccion ? registro.direccion : '',
            telefono: registro.telefono ? registro.telefono : '',
            contacto: registro.contacto ? registro.contacto : '',
            observaciones: registro.observaciones ? registro.observaciones : '',
            activo: !!registro.activo,
          };

          if (this.accion === 'editar') {
            this.titulo = 'Editar Lugar: ' + this.model.nombre;
          } else if (this.accion === 'consultar') {
            this.titulo = 'Consultar Lugar: ' + this.model.nombre;
          }
        }
      },
      error: (error: any) => {
        console.error('Error al cargar el lugar', error);
        Swal.fire('Error', 'No se pudo cargar el lugar', 'error');
      },
    });
  }

  guardar() {
    this.submitted = true;

    if (!this.model.nombre || this.model.nombre.trim() === '') {
      Swal.fire('Advertencia', 'El nombre es obligatorio', 'warning');
      return;
    }

    const data: LugarCursoExtra = {
      nombre: this.model.nombre.trim(),
      direccion: this.model.direccion ? this.model.direccion.trim() : undefined,
      telefono: this.model.telefono ? this.model.telefono.trim() : undefined,
      contacto: this.model.contacto ? this.model.contacto.trim() : undefined,
      observaciones: this.model.observaciones ? this.model.observaciones.trim() : undefined,
      activo: this.model.activo ? 1 : 0,
    };

    if (this.accion === 'crear') {
      this.lugaresCursosExtraService.crear(data).subscribe({
        next: () => {
          Swal.fire('Éxito', 'Lugar creado correctamente', 'success');
          this.router.navigate([this.regresar]);
        },
        error: (error: any) => {
          console.error('Error al crear el lugar', error);
          Swal.fire('Error', 'No se pudo crear el lugar', 'error');
        },
      });
    } else if (this.accion === 'editar') {
      data.id = this.model.id;
      this.lugaresCursosExtraService.actualizar(data).subscribe({
        next: () => {
          Swal.fire('Éxito', 'Lugar actualizado correctamente', 'success');
          this.router.navigate([this.regresar]);
        },
        error: (error: any) => {
          console.error('Error al actualizar el lugar', error);
          Swal.fire('Error', 'No se pudo actualizar el lugar', 'error');
        },
      });
    }
  }

  volver() {
    this.router.navigate([this.regresar]);
  }

  // ==================== ESPACIOS ====================

  cargarEspacios(idLugar: any) {
    this.espaciosLugaresCursosExtraService.obtenerByLugar(idLugar).subscribe({
      next: (response: any) => {
        this.espacios = response.body || [];
      },
      error: (error: any) => {
        console.error('Error al cargar los espacios', error);
      },
    });
  }

  cargarDiasSemana() {
    this.diasSemanaService.obtenerTodos().subscribe({
      next: (response: any) => {
        this.diasSemana = response.body || [];
      },
      error: (error: any) => {
        console.error('Error al cargar los días de la semana', error);
      },
    });
  }

  abrirModalEspacio(espacio?: any) {
    if (espacio) {
      this.espacioModal = {
        id: espacio.id,
        nombre: espacio.nombre,
        descripcion: espacio.descripcion || '',
        activo: !!espacio.activo,
        horarios: (espacio.horarios || []).map((h: any) => ({
          id_dia_semana: h.id_dia_semana,
          hora_inicial: (h.hora_inicial || '').substring(0, 5),
          hora_final: (h.hora_final || '').substring(0, 5),
        })),
      };
    } else {
      this.espacioModal = { id: null, nombre: '', descripcion: '', activo: true, horarios: [] };
    }
    this.mostrarModalEspacio = true;
  }

  agregarHorarioEspacio() {
    this.espacioModal.horarios.push({ id_dia_semana: null, hora_inicial: '', hora_final: '' });
  }

  quitarHorarioEspacio(indice: number) {
    this.espacioModal.horarios.splice(indice, 1);
  }

  guardarEspacio() {
    if (!this.espacioModal.nombre || this.espacioModal.nombre.trim() === '') {
      Swal.fire('Advertencia', 'El nombre del espacio es obligatorio', 'warning');
      return;
    }
    const incompleto = this.espacioModal.horarios.some((h: any) => !h.id_dia_semana || !h.hora_inicial || !h.hora_final);
    if (incompleto) {
      Swal.fire('Advertencia', 'Cada fila del horario fijo necesita día, hora de inicio y hora de fin', 'warning');
      return;
    }
    const data: any = {
      id: this.espacioModal.id,
      id_lugar_curso_extra: this.model.id,
      nombre: this.espacioModal.nombre.trim(),
      descripcion: this.espacioModal.descripcion ? this.espacioModal.descripcion.trim() : '',
      activo: this.espacioModal.activo ? 1 : 0,
      horarios: this.espacioModal.horarios.map((h: any) => ({
        id_dia_semana: parseInt(h.id_dia_semana, 10),
        hora_inicial: h.hora_inicial,
        hora_final: h.hora_final,
      })),
    };
    const peticion = this.espacioModal.id
      ? this.espaciosLugaresCursosExtraService.actualizar(data)
      : this.espaciosLugaresCursosExtraService.crear(data);
    peticion.subscribe({
      next: () => {
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Espacio guardado', showConfirmButton: false, timer: 2000 });
        this.mostrarModalEspacio = false;
        this.cargarEspacios(this.model.id);
      },
      error: (error: any) => {
        console.error('Error al guardar el espacio', error);
      },
    });
  }

  async eliminarEspacio(espacio: any) {
    const resultado = await Swal.fire({
      title: '¿Eliminar el espacio?',
      text: espacio.nombre,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
    });
    if (!resultado.isConfirmed) {
      return;
    }
    this.espaciosLugaresCursosExtraService.eliminar({ id: espacio.id }).subscribe({
      next: () => {
        this.cargarEspacios(this.model.id);
      },
      error: (error: any) => {
        console.error('Error al eliminar el espacio', error);
      },
    });
  }

  textoHorarios(espacio: any): string {
    if (!espacio.horarios || espacio.horarios.length === 0) {
      return 'Sin horario fijo';
    }
    return espacio.horarios
      .map((h: any) => `${h.nombre_dia} ${(h.hora_inicial || '').substring(0, 5)}-${(h.hora_final || '').substring(0, 5)}`)
      .join(' · ');
  }
}
