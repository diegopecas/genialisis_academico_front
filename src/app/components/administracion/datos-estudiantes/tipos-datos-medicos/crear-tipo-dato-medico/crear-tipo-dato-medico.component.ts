import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HeaderComponent } from '../../../../../common/header/header.component';
import { TiposDatosMedicosService } from '../../../../../services/tipos-datos-medicos.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-crear-tipo-dato-medico',
  templateUrl: './crear-tipo-dato-medico.component.html',
  styleUrl: './crear-tipo-dato-medico.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent]
})
export class CrearTipoDatoMedicoComponent implements OnInit {

  titulo = "Crear Categoría Médica";
  accion: string = "";
  regresar = '/administracion/datos-estudiantes/tipos-datos-medicos';
  editable: boolean = true;
  submitted: boolean = false;

  model = {
    id: null,
    nombre: '',
    icono: '',
    orden: 0,
    activo: 1
  } as any;

  constructor(
    private tiposDatosMedicosService: TiposDatosMedicosService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.accion = params['accion'];
      const id = params['id'];

      if (this.accion === 'crear') {
        this.titulo = "Crear Categoría Médica";
        this.editable = true;
      } else if (this.accion === 'editar') {
        this.titulo = "Editar Categoría Médica";
        this.editable = true;
        this.cargarRegistro(id);
      } else if (this.accion === 'consultar') {
        this.titulo = "Consultar Categoría Médica";
        this.editable = false;
        this.cargarRegistro(id);
      }
    });
  }

  cargarRegistro(id: any) {
    this.tiposDatosMedicosService.obtenerById(id).subscribe({
      next: (response: any) => {
        const body = response.body;
        if (body && body.length > 0) {
          this.model = body[0];
          if (this.accion === 'editar') {
            this.titulo = "Editar Categoría Médica: " + this.model.nombre;
          } else if (this.accion === 'consultar') {
            this.titulo = "Consultar Categoría Médica: " + this.model.nombre;
          }
        }
      },
      error: () => {
        Swal.fire('Error', 'No se pudo cargar el registro', 'error');
      }
    });
  }

  guardar() {
    this.submitted = true;

    if (!this.model.nombre || this.model.nombre.trim() === '') {
      Swal.fire('Advertencia', 'El nombre es obligatorio', 'warning');
      return;
    }

    const data = {
      nombre: this.model.nombre.trim(),
      icono: this.model.icono || null,
      orden: this.model.orden || 0,
      activo: this.model.activo ?? 1
    } as any;

    if (this.accion === 'crear') {
      this.tiposDatosMedicosService.crear(data).subscribe({
        next: () => {
          Swal.fire('Éxito', 'Categoría creada correctamente', 'success');
          this.router.navigate([this.regresar]);
        },
        error: () => {
          Swal.fire('Error', 'No se pudo crear la categoría', 'error');
        }
      });
    } else if (this.accion === 'editar') {
      data.id = this.model.id;
      this.tiposDatosMedicosService.actualizar(data).subscribe({
        next: () => {
          Swal.fire('Éxito', 'Categoría actualizada correctamente', 'success');
          this.router.navigate([this.regresar]);
        },
        error: () => {
          Swal.fire('Error', 'No se pudo actualizar la categoría', 'error');
        }
      });
    }
  }

  volver() {
    this.router.navigate([this.regresar]);
  }
}