import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HeaderComponent } from '../../../../common/header/header.component';
import { TiposNovedadEspacioService } from '../../../../services/tipos-novedad-espacio.service';
import SwalBase from 'sweetalert2';

// Alertas con el boton de confirmar en dorado (el de la libreria es morado)
const Swal = SwalBase.mixin({ confirmButtonColor: '#d4af37' });

@Component({
  selector: 'app-crear-tipo-novedad-espacio',
  templateUrl: './crear-tipo-novedad-espacio.component.html',
  styleUrl: './crear-tipo-novedad-espacio.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent],
})
export class CrearTipoNovedadEspacioComponent implements OnInit {
  titulo = 'Crear Tipo de Novedad';
  accion: string = '';
  regresar = '/administracion/datos-maestros/tipos-novedad-espacio';
  editable: boolean = true;
  submitted: boolean = false;
  guardando: boolean = false;

  model = { id: null, nombre: '', descripcion: '', activo: true } as any;

  constructor(
    private tiposNovedadEspacioService: TiposNovedadEspacioService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      this.accion = params['accion'];
      const id = params['id'];
      this.editable = this.accion !== 'consultar';
      if (this.accion === 'editar' || this.accion === 'consultar') {
        this.cargarTipo(id);
      }
    });
  }

  cargarTipo(id: any) {
    this.tiposNovedadEspacioService.obtenerById(id).subscribe({
      next: (response: any) => {
        const body = response.body || [];
        if (body.length > 0) {
          const registro = body[0];
          this.model = { ...registro, descripcion: registro.descripcion || '', activo: Number(registro.activo) === 1 };
          this.titulo = (this.accion === 'editar' ? 'Editar Tipo: ' : 'Consultar Tipo: ') + this.model.nombre;
        }
      },
      error: (error: any) => {
        console.error('Error al cargar el tipo de novedad', error);
        Swal.fire('Error', 'No se pudo cargar el tipo de novedad', 'error');
      },
    });
  }

  guardar() {
    this.submitted = true;
    if (!this.model.nombre || this.model.nombre.trim() === '') {
      Swal.fire('Falta el nombre', 'El nombre es obligatorio.', 'warning');
      return;
    }
    const data: any = {
      nombre: this.model.nombre.trim(),
      descripcion: this.model.descripcion ? this.model.descripcion.trim() : null,
      activo: this.model.activo ? 1 : 0,
    };
    if (this.accion === 'editar') {
      data.id = this.model.id;
    }
    const peticion = this.accion === 'editar'
      ? this.tiposNovedadEspacioService.actualizar(data)
      : this.tiposNovedadEspacioService.crear(data);
    this.guardando = true;
    peticion.subscribe({
      next: () => {
        this.guardando = false;
        Swal.fire('Listo', this.accion === 'editar' ? 'Tipo de novedad actualizado.' : 'Tipo de novedad creado.', 'success');
        this.router.navigate([this.regresar]);
      },
      error: (error: any) => {
        this.guardando = false;
        Swal.fire('Error', error?.error?.error || 'No se pudo guardar el tipo de novedad.', 'error');
      },
    });
  }

  volver() {
    this.router.navigate([this.regresar]);
  }
}
