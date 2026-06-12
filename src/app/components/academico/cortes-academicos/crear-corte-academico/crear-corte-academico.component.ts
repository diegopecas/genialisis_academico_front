import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HeaderComponent } from '../../../../common/header/header.component';
import { CortesAcademicosService } from '../../../../services/cortes-academicos.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-crear-corte-academico',
  templateUrl: './crear-corte-academico.component.html',
  styleUrl: './crear-corte-academico.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent]
})
export class CrearCorteAcademicoComponent implements OnInit {

  titulo = "Crear Corte Académico";
  accion: string = "";
  regresar = '/academico/cortes-academicos';
  editable: boolean = true;
  submitted: boolean = false;

  model = {
    id: null,
    nombre: '',
    orden: null,
    fecha_inicio: null,
    fecha_fin: null
  } as any;

  constructor(
    private cortesAcademicosService: CortesAcademicosService,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.accion = params['accion'];
      const id = params['id'];

      if (this.accion === 'crear') {
        this.titulo = "Crear Corte Académico";
        this.editable = true;
      } else if (this.accion === 'editar') {
        this.titulo = "Editar Corte Académico";
        this.editable = true;
        this.cargarCorteAcademico(id);
      } else if (this.accion === 'consultar') {
        this.titulo = "Consultar Corte Académico";
        this.editable = false;
        this.cargarCorteAcademico(id);
      }
    });
  }

  cargarCorteAcademico(id: any) {
    this.cortesAcademicosService.obtenerById(id).subscribe({
      next: (response: any) => {
        const body = response.body;
        console.log("Corte académico cargado", body);
        if (body && body.length > 0) {
          this.model = body[0];
          if (this.accion === 'editar') {
            this.titulo = "Editar Corte Académico: " + this.model.nombre;
          } else if (this.accion === 'consultar') {
            this.titulo = "Consultar Corte Académico: " + this.model.nombre;
          }
        }
      },
      error: (error: any) => {
        console.error("Error al cargar corte académico", error);
        Swal.fire('Error', 'No se pudo cargar el corte académico', 'error');
      }
    });
  }

  guardar() {
    this.submitted = true;

    if (!this.model.nombre || this.model.nombre.trim() === '') {
      Swal.fire('Advertencia', 'El nombre del corte académico es obligatorio', 'warning');
      return;
    }

    if (!this.model.orden || this.model.orden < 1) {
      Swal.fire('Advertencia', 'El orden es obligatorio y debe ser mayor a 0', 'warning');
      return;
    }

    if (this.model.fecha_inicio && this.model.fecha_fin && this.model.fecha_fin < this.model.fecha_inicio) {
      Swal.fire('Advertencia', 'La fecha de fin no puede ser anterior a la fecha de inicio', 'warning');
      return;
    }

    const data = {
      nombre: this.model.nombre.trim(),
      orden: this.model.orden,
      fecha_inicio: this.model.fecha_inicio || null,
      fecha_fin: this.model.fecha_fin || null
    } as any;

    if (this.accion === 'crear') {
      this.cortesAcademicosService.crear(data).subscribe({
        next: (response: any) => {
          console.log("Corte académico creado", response);
          Swal.fire('Éxito', 'Corte académico creado correctamente', 'success');
          this.router.navigate(['/academico/cortes-academicos']);
        },
        error: (error: any) => {
          console.error("Error al crear corte académico", error);
          Swal.fire('Error', 'No se pudo crear el corte académico', 'error');
        }
      });
    } else if (this.accion === 'editar') {
      data.id = this.model.id;
      this.cortesAcademicosService.actualizar(data).subscribe({
        next: (response: any) => {
          console.log("Corte académico actualizado", response);
          Swal.fire('Éxito', 'Corte académico actualizado correctamente', 'success');
          this.router.navigate(['/academico/cortes-academicos']);
        },
        error: (error: any) => {
          console.error("Error al actualizar corte académico", error);
          Swal.fire('Error', 'No se pudo actualizar el corte académico', 'error');
        }
      });
    }
  }

  volver() {
    this.router.navigate(['/academico/cortes-academicos']);
  }
}