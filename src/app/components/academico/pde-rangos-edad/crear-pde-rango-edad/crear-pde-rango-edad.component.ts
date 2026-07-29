import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import Swal from 'sweetalert2';
import { HeaderComponent } from '../../../../common/header/header.component';
import { PdeRangosEdadService } from '../../../../services/pde-rangos-edad.service';

@Component({
  selector: 'app-crear-pde-rango-edad',
  templateUrl: './crear-pde-rango-edad.component.html',
  styleUrl: './crear-pde-rango-edad.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent]
})
export class CrearPdeRangoEdadComponent implements OnInit {

  titulo = "Crear Rango de Edad";
  accion: string = "";
  regresar = '/academico/pde-rangos-edad';
  editable: boolean = true;
  submitted: boolean = false;

  model = {
    id: null,
    nombre: '',
    edad_meses_inicio: null,
    edad_meses_fin: null,
    orden: null,
    activo: 1
  } as any;

  constructor(
    private pdeRangosEdadService: PdeRangosEdadService,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.accion = params['accion'];
      const id = params['id'];

      if (this.accion === 'crear') {
        this.titulo = "Crear Rango de Edad";
        this.editable = true;
      } else if (this.accion === 'editar') {
        this.titulo = "Editar Rango de Edad";
        this.editable = true;
        this.cargarRango(id);
      } else if (this.accion === 'consultar') {
        this.titulo = "Consultar Rango de Edad";
        this.editable = false;
        this.cargarRango(id);
      }
    });
  }

  cargarRango(id: any) {
    this.pdeRangosEdadService.obtenerById(id).subscribe({
      next: (response: any) => {
        const body = response.body;
        if (body && body.length > 0) {
          this.model = body[0];
          this.titulo = `${this.accion === 'consultar' ? 'Consultar' : 'Editar'} Rango: ${this.model.nombre}`;
        }
      },
      error: (error: any) => {
        console.error("Error al cargar rango", error);
        Swal.fire('Error', 'No se pudo cargar el rango de edad', 'error');
      }
    });
  }

  guardar() {
    this.submitted = true;

    if (!this.model.nombre || this.model.nombre.trim() === '') {
      Swal.fire('Advertencia', 'El nombre del rango es obligatorio', 'warning');
      return;
    }

    if (this.model.edad_meses_inicio === null || this.model.edad_meses_fin === null) {
      Swal.fire('Advertencia', 'Debe indicar la edad de inicio y la de fin en meses', 'warning');
      return;
    }

    if (Number(this.model.edad_meses_fin) <= Number(this.model.edad_meses_inicio)) {
      Swal.fire('Advertencia', 'La edad de fin debe ser mayor que la de inicio', 'warning');
      return;
    }

    if (this.model.orden === null || this.model.orden === '') {
      Swal.fire('Advertencia', 'El orden es obligatorio; define la secuencia en que se aplican los rangos', 'warning');
      return;
    }

    const data = {
      nombre: this.model.nombre.trim(),
      edad_meses_inicio: this.model.edad_meses_inicio,
      edad_meses_fin: this.model.edad_meses_fin,
      orden: this.model.orden,
      activo: this.model.activo ? 1 : 0
    } as any;

    if (this.accion === 'crear') {
      this.pdeRangosEdadService.crear(data).subscribe({
        next: () => {
          Swal.fire('Éxito', 'Rango creado correctamente', 'success');
          this.router.navigate(['/academico/pde-rangos-edad']);
        },
        error: (error: any) => {
          console.error("Error al crear rango", error);
          Swal.fire('Error', 'No se pudo crear el rango', 'error');
        }
      });
    } else if (this.accion === 'editar') {
      data.id = this.model.id;
      this.pdeRangosEdadService.actualizar(data).subscribe({
        next: () => {
          Swal.fire('Éxito', 'Rango actualizado correctamente', 'success');
          this.router.navigate(['/academico/pde-rangos-edad']);
        },
        error: (error: any) => {
          console.error("Error al actualizar rango", error);
          Swal.fire('Error', 'No se pudo actualizar el rango', 'error');
        }
      });
    }
  }

  volver() {
    this.router.navigate(['/academico/pde-rangos-edad']);
  }
}
