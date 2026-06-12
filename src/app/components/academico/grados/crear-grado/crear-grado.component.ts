import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HeaderComponent } from '../../../../common/header/header.component';
import { GradosService } from '../../../../services/grados.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-crear-grado',
  templateUrl: './crear-grado.component.html',
  styleUrl: './crear-grado.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent]
})
export class CrearGradoComponent implements OnInit {

  titulo = "Crear Grado";
  accion: string = "";
  regresar = '/academico/grados';
  editable: boolean = true;
  submitted: boolean = false;

  model = {
    id: null,
    nombre: '',
    descripcion: '',
    orden: null
  } as any;

  constructor(
    private gradosService: GradosService,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.accion = params['accion'];
      const id = params['id'];

      if (this.accion === 'crear') {
        this.titulo = "Crear Grado";
        this.editable = true;
      } else if (this.accion === 'editar') {
        this.titulo = "Editar Grado";
        this.editable = true;
        this.cargarGrado(id);
      } else if (this.accion === 'consultar') {
        this.titulo = "Consultar Grado";
        this.editable = false;
        this.cargarGrado(id);
      }
    });
  }

  cargarGrado(id: any) {
    this.gradosService.obtenerPorId(id).subscribe({
      next: (response: any) => {
        const body = response.body;
        console.log("Grado cargado", body);
        if (body && body.length > 0) {
          this.model = body[0];
          if (this.accion === 'editar') {
            this.titulo = "Editar Grado: " + this.model.nombre;
          } else if (this.accion === 'consultar') {
            this.titulo = "Consultar Grado: " + this.model.nombre;
          }
        }
      },
      error: (error: any) => {
        console.error("Error al cargar grado", error);
        Swal.fire('Error', 'No se pudo cargar el grado', 'error');
      }
    });
  }

  guardar() {
    this.submitted = true;

    if (!this.model.nombre || this.model.nombre.trim() === '') {
      Swal.fire('Advertencia', 'El nombre del grado es obligatorio', 'warning');
      return;
    }

    if (!this.model.descripcion || this.model.descripcion.trim() === '') {
      Swal.fire('Advertencia', 'La descripción del grado es obligatoria', 'warning');
      return;
    }

    if (!this.model.orden || this.model.orden < 1) {
      Swal.fire('Advertencia', 'El orden del grado es obligatorio y debe ser mayor a 0', 'warning');
      return;
    }

    const data = {
      nombre: this.model.nombre.trim(),
      descripcion: this.model.descripcion.trim(),
      orden: this.model.orden
    } as any;

    if (this.accion === 'crear') {
      this.gradosService.crear(data).subscribe({
        next: (response: any) => {
          console.log("Grado creado", response);
          Swal.fire('Éxito', 'Grado creado correctamente', 'success');
          this.router.navigate(['/academico/grados']);
        },
        error: (error: any) => {
          console.error("Error al crear grado", error);
          Swal.fire('Error', 'No se pudo crear el grado', 'error');
        }
      });
    } else if (this.accion === 'editar') {
      data.id = this.model.id;
      this.gradosService.actualizar(data).subscribe({
        next: (response: any) => {
          console.log("Grado actualizado", response);
          Swal.fire('Éxito', 'Grado actualizado correctamente', 'success');
          this.router.navigate(['/academico/grados']);
        },
        error: (error: any) => {
          console.error("Error al actualizar grado", error);
          Swal.fire('Error', 'No se pudo actualizar el grado', 'error');
        }
      });
    }
  }

  volver() {
    this.router.navigate(['/academico/grados']);
  }
}