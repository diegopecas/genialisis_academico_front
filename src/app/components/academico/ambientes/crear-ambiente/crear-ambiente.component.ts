import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import Swal from 'sweetalert2';
import { HeaderComponent } from '../../../../common/header/header.component';
import { AmbientesService } from '../../../../services/ambientes.service';

/**
 * Crear y editar un ambiente. El ícono es un emoji: se puede escribir o
 * escoger de la lista de sugeridos. Al crear queda activo; en la edición se
 * puede inactivar.
 */
@Component({
  selector: 'app-crear-ambiente',
  templateUrl: './crear-ambiente.component.html',
  styleUrl: './crear-ambiente.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent]
})
export class CrearAmbienteComponent implements OnInit {

  /** Largo máximo de ambientes.nombre (varchar 100) y ambientes.icono (varchar 50). */
  readonly MAX_NOMBRE = 100;
  readonly MAX_ICONO = 50;

  /** Emojis sugeridos para lugares del jardín. */
  readonly ICONOS_SUGERIDOS = [
    '🏫', '🌳', '🏊', '🎭', '🎨', '🔬', '🤸', '🐔', '🎬', '🧸',
    '🌺', '📚', '🎵', '🍳', '⚽', '🏕️', '🛝', '🧩', '💻', '🌻'
  ];

  titulo = "Crear Ambiente";
  accion: string = "";
  regresar = '/academico/ambientes';
  editable: boolean = true;
  submitted: boolean = false;

  model = {
    id: null,
    nombre: '',
    icono: '',
    activo: 1
  } as any;

  constructor(
    private ambientesService: AmbientesService,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.accion = params['accion'];
      const id = params['id'];

      if (this.accion === 'crear') {
        this.titulo = "Crear Ambiente";
        this.editable = true;
      } else if (this.accion === 'editar') {
        this.titulo = "Editar Ambiente";
        this.editable = true;
        this.cargarAmbiente(id);
      } else if (this.accion === 'consultar') {
        this.titulo = "Consultar Ambiente";
        this.editable = false;
        this.cargarAmbiente(id);
      }
    });
  }

  cargarAmbiente(id: any) {
    this.ambientesService.obtenerById(id).subscribe({
      next: (response: any) => {
        const body = response.body;
        if (body && body.length > 0) {
          this.model = {
            id: body[0].id,
            nombre: body[0].nombre,
            icono: body[0].icono || '',
            activo: body[0].activo == 1 ? 1 : 0
          };
          if (this.accion === 'editar') {
            this.titulo = "Editar Ambiente: " + this.model.nombre;
          } else if (this.accion === 'consultar') {
            this.titulo = "Consultar Ambiente: " + this.model.nombre;
          }
        }
      },
      error: (error: any) => {
        console.error("Error al cargar ambiente", error);
      }
    });
  }

  seleccionarIcono(icono: string) {
    if (!this.editable) return;
    this.model.icono = icono;
  }

  guardar() {
    this.submitted = true;

    if (!this.model.nombre || this.model.nombre.trim() === '') {
      Swal.fire('Advertencia', 'El nombre del ambiente es obligatorio', 'warning');
      return;
    }

    const data = {
      nombre: this.model.nombre.trim(),
      icono: (this.model.icono || '').trim() || null
    } as any;

    if (this.accion === 'crear') {
      this.ambientesService.crear(data).subscribe({
        next: () => {
          Swal.fire('Éxito', 'Ambiente creado correctamente', 'success');
          this.router.navigate(['/academico/ambientes']);
        },
        error: (error: any) => {
          // El mensaje del backend lo muestra el interceptor
          console.error("Error al crear ambiente", error);
        }
      });
    } else if (this.accion === 'editar') {
      data.id = this.model.id;
      data.activo = this.model.activo;
      this.ambientesService.actualizar(data).subscribe({
        next: () => {
          Swal.fire('Éxito', 'Ambiente actualizado correctamente', 'success');
          this.router.navigate(['/academico/ambientes']);
        },
        error: (error: any) => {
          console.error("Error al actualizar ambiente", error);
        }
      });
    }
  }

  volver() {
    this.router.navigate(['/academico/ambientes']);
  }
}
