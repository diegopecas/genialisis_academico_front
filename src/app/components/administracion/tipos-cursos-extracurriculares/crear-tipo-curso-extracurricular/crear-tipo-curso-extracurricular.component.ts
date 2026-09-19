import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HeaderComponent } from '../../../../common/header/header.component';
import {
  TiposCursosExtracurricularesService,
  TipoCursoExtracurricular,
} from '../../../../services/tipos-cursos-extracurriculares.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-crear-tipo-curso-extracurricular',
  templateUrl: './crear-tipo-curso-extracurricular.component.html',
  styleUrl: './crear-tipo-curso-extracurricular.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent],
})
export class CrearTipoCursoExtracurricularComponent implements OnInit {
  titulo = 'Crear Tipo de Curso Extracurricular';
  accion: string = '';
  regresar = '/administracion/datos-maestros/tipos-cursos-extracurriculares';
  editable: boolean = true;
  submitted: boolean = false;

  model = {
    id: null,
    nombre: '',
    descripcion: '',
    color: '#3498db',
    orden: 0,
    activo: true,
  } as any;

  constructor(
    private tiposCursosExtracurricularesService: TiposCursosExtracurricularesService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      this.accion = params['accion'];
      const id = params['id'];

      if (this.accion === 'crear') {
        this.titulo = 'Crear Tipo de Curso Extracurricular';
        this.editable = true;
      } else if (this.accion === 'editar') {
        this.titulo = 'Editar Tipo de Curso Extracurricular';
        this.editable = true;
        this.cargarTipo(id);
      } else if (this.accion === 'consultar') {
        this.titulo = 'Consultar Tipo de Curso Extracurricular';
        this.editable = false;
        this.cargarTipo(id);
      }
    });
  }

  cargarTipo(id: any) {
    this.tiposCursosExtracurricularesService.obtenerById(id).subscribe({
      next: (response: any) => {
        const body = response.body;
        if (body && body.length > 0) {
          const registro = body[0];
          this.model = {
            ...registro,
            descripcion: registro.descripcion ? registro.descripcion : '',
            color: registro.color ? registro.color : '#3498db',
            activo: !!registro.activo,
          };

          if (this.accion === 'editar') {
            this.titulo = 'Editar Tipo: ' + this.model.nombre;
          } else if (this.accion === 'consultar') {
            this.titulo = 'Consultar Tipo: ' + this.model.nombre;
          }
        }
      },
      error: (error: any) => {
        console.error('Error al cargar el tipo de curso', error);
        Swal.fire('Error', 'No se pudo cargar el tipo de curso', 'error');
      },
    });
  }

  guardar() {
    this.submitted = true;

    if (!this.model.nombre || this.model.nombre.trim() === '') {
      Swal.fire('Advertencia', 'El nombre es obligatorio', 'warning');
      return;
    }

    const data: TipoCursoExtracurricular = {
      nombre: this.model.nombre.trim(),
      descripcion: this.model.descripcion ? this.model.descripcion.trim() : undefined,
      color: this.model.color ? this.model.color : undefined,
      orden: this.model.orden ? Number(this.model.orden) : 0,
      activo: this.model.activo ? 1 : 0,
    };

    if (this.accion === 'crear') {
      this.tiposCursosExtracurricularesService.crear(data).subscribe({
        next: () => {
          Swal.fire('Éxito', 'Tipo de curso creado correctamente', 'success');
          this.router.navigate([this.regresar]);
        },
        error: (error: any) => {
          console.error('Error al crear el tipo de curso', error);
          Swal.fire('Error', 'No se pudo crear el tipo de curso', 'error');
        },
      });
    } else if (this.accion === 'editar') {
      data.id = this.model.id;
      this.tiposCursosExtracurricularesService.actualizar(data).subscribe({
        next: () => {
          Swal.fire('Éxito', 'Tipo de curso actualizado correctamente', 'success');
          this.router.navigate([this.regresar]);
        },
        error: (error: any) => {
          console.error('Error al actualizar el tipo de curso', error);
          Swal.fire('Error', 'No se pudo actualizar el tipo de curso', 'error');
        },
      });
    }
  }

  volver() {
    this.router.navigate([this.regresar]);
  }
}
