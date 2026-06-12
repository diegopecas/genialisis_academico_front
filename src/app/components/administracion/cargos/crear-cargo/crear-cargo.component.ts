import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HeaderComponent } from '../../../../common/header/header.component';
import { CargosService } from '../../../../services/cargos.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-crear-cargo',
  templateUrl: './crear-cargo.component.html',
  styleUrl: './crear-cargo.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent]
})
export class CrearCargoComponent implements OnInit {

  titulo = "Crear Cargo";
  accion: string = "";
  regresar = '/administracion/cargos';
  editable: boolean = true;
  submitted: boolean = false;

  model = {
    id: null,
    nombre: ''
  } as any;

  constructor(
    private cargosService: CargosService,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.accion = params['accion'];
      const id = params['id'];

      if (this.accion === 'crear') {
        this.titulo = "Crear Cargo";
        this.editable = true;
      } else if (this.accion === 'editar') {
        this.titulo = "Editar Cargo";
        this.editable = true;
        this.cargarCargo(id);
      } else if (this.accion === 'consultar') {
        this.titulo = "Consultar Cargo";
        this.editable = false;
        this.cargarCargo(id);
      }
    });
  }

  cargarCargo(id: any) {
    this.cargosService.obtenerPorId(id).subscribe({
      next: (response: any) => {
        const body = response.body;
        console.log("Cargo cargado", body);
        if (body && body.length > 0) {
          this.model = body[0];
          if (this.accion === 'editar') {
            this.titulo = "Editar Cargo: " + this.model.nombre;
          } else if (this.accion === 'consultar') {
            this.titulo = "Consultar Cargo: " + this.model.nombre;
          }
        }
      },
      error: (error: any) => {
        console.error("Error al cargar cargo", error);
        Swal.fire('Error', 'No se pudo cargar el cargo', 'error');
      }
    });
  }

  guardar() {
    this.submitted = true;

    if (!this.model.nombre || this.model.nombre.trim() === '') {
      Swal.fire('Advertencia', 'El nombre del cargo es obligatorio', 'warning');
      return;
    }

    const data = {
      nombre: this.model.nombre.trim()
    } as any;

    if (this.accion === 'crear') {
      this.cargosService.crear(data).subscribe({
        next: (response: any) => {
          console.log("Cargo creado", response);
          Swal.fire('Éxito', 'Cargo creado correctamente', 'success');
          this.router.navigate(['/administracion/cargos']);
        },
        error: (error: any) => {
          console.error("Error al crear cargo", error);
          Swal.fire('Error', 'No se pudo crear el cargo', 'error');
        }
      });
    } else if (this.accion === 'editar') {
      data.id = this.model.id;
      this.cargosService.actualizar(data).subscribe({
        next: (response: any) => {
          console.log("Cargo actualizado", response);
          Swal.fire('Éxito', 'Cargo actualizado correctamente', 'success');
          this.router.navigate(['/administracion/cargos']);
        },
        error: (error: any) => {
          console.error("Error al actualizar cargo", error);
          Swal.fire('Error', 'No se pudo actualizar el cargo', 'error');
        }
      });
    }
  }

  volver() {
    this.router.navigate(['/administracion/cargos']);
  }
}