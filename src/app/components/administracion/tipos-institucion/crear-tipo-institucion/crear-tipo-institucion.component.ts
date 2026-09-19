// ========== crear-tipo-institucion.component.ts ==========
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HeaderComponent } from '../../../../common/header/header.component';
import { TiposInstitucionService } from '../../../../services/tipos-institucion.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-crear-tipo-institucion',
  templateUrl: './crear-tipo-institucion.component.html',
  styleUrl: './crear-tipo-institucion.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent],
})
export class CrearTipoInstitucionComponent implements OnInit {

  public titulo = 'Crear Tipo de Institución';
  public accion = '';
  public regresar = '/administracion/datos-maestros/tipos-institucion';
  public editable = true;
  public submitted = false;

  public model = {
    id: null,
    nombre: '',
    descripcion: '',
    activo: true,
  } as any;

  constructor(
    private tiposInstitucionService: TiposInstitucionService,
    private route: ActivatedRoute,
    private router: Router,
  ) { }

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      this.accion = params['accion'];
      const id = params['id'];

      if (this.accion === 'crear') {
        this.titulo = 'Crear Tipo de Institución';
        this.editable = true;
      } else if (this.accion === 'editar') {
        this.titulo = 'Editar Tipo de Institución';
        this.editable = true;
        this.cargarTipo(id);
      } else if (this.accion === 'consultar') {
        this.titulo = 'Consultar Tipo de Institución';
        this.editable = false;
        this.cargarTipo(id);
      }
    });
  }

  cargarTipo(id: any) {
    if (!id || id === '0') {
      return;
    }

    this.tiposInstitucionService.obtenerById(id).subscribe({
      next: (response: any) => {
        const body = response.body;
        console.log('Tipo de institución cargado', body);

        if (body && body.length > 0) {
          const registro = body[0];
          this.model = {
            id: registro.id,
            nombre: registro.nombre || '',
            descripcion: registro.descripcion || '',
            activo: Number(registro.activo) === 1,
          };

          if (this.accion === 'editar') {
            this.titulo = 'Editar Tipo de Institución: ' + this.model.nombre;
          } else if (this.accion === 'consultar') {
            this.titulo = 'Consultar Tipo de Institución: ' + this.model.nombre;
          }
        }
      },
      error: (error: any) => {
        console.error('Error al cargar el tipo de institución', error);
        Swal.fire('Error', 'No se pudo cargar el tipo de institución', 'error');
      },
    });
  }

  formularioValido(): boolean {
    return Boolean(this.model.nombre && this.model.nombre.trim());
  }

  guardar() {
    this.submitted = true;

    if (!this.formularioValido()) {
      Swal.fire({
        title: 'Campos incompletos',
        text: 'Por favor complete los campos obligatorios',
        icon: 'warning',
        confirmButtonText: 'Aceptar'
      });
      return;
    }

    const datos = {
      id: this.model.id,
      nombre: this.model.nombre.trim(),
      descripcion: this.model.descripcion ? this.model.descripcion.trim() : null,
      activo: this.model.activo ? 1 : 0,
    };

    if (this.accion === 'crear') {
      this.tiposInstitucionService.crear(datos).subscribe({
        next: (response: any) => {
          console.log('Tipo de institución creado', response);
          Swal.fire({
            title: 'Éxito',
            text: 'Tipo de institución creado correctamente',
            icon: 'success',
            confirmButtonText: 'Aceptar'
          }).then(() => {
            this.volver();
          });
        },
        error: (error: any) => this.manejarError(error, 'crear')
      });
    } else if (this.accion === 'editar') {
      this.tiposInstitucionService.actualizar(datos).subscribe({
        next: (response: any) => {
          console.log('Tipo de institución actualizado', response);
          Swal.fire({
            title: 'Éxito',
            text: 'Tipo de institución actualizado correctamente',
            icon: 'success',
            confirmButtonText: 'Aceptar'
          }).then(() => {
            this.volver();
          });
        },
        error: (error: any) => this.manejarError(error, 'actualizar')
      });
    }
  }

  manejarError(error: any, accion: string): void {
    console.error(`Error al ${accion} el tipo de institución`, error);
    const mensaje = error?.error?.error || `Error al ${accion} el tipo de institución`;
    Swal.fire({
      title: 'Error',
      text: mensaje,
      icon: 'error',
      confirmButtonText: 'Aceptar'
    });
  }

  volver(): void {
    this.router.navigate([this.regresar]);
  }
}
