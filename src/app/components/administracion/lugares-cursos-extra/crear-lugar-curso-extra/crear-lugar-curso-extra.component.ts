import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HeaderComponent } from '../../../../common/header/header.component';
import {
  LugaresCursosExtraService,
  LugarCursoExtra,
} from '../../../../services/lugares-cursos-extra.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-crear-lugar-curso-extra',
  templateUrl: './crear-lugar-curso-extra.component.html',
  styleUrl: './crear-lugar-curso-extra.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent],
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

  constructor(
    private lugaresCursosExtraService: LugaresCursosExtraService,
    private route: ActivatedRoute,
    private router: Router,
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
      } else if (this.accion === 'consultar') {
        this.titulo = 'Consultar Lugar';
        this.editable = false;
        this.cargarLugar(id);
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
}
