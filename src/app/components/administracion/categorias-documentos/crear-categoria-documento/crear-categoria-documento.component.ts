import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HeaderComponent } from '../../../../common/header/header.component';
import {
  CategoriasDocumentosService,
  CategoriaDocumento,
} from '../../../../services/categorias-documentos.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-crear-categoria-documento',
  templateUrl: './crear-categoria-documento.component.html',
  styleUrl: './crear-categoria-documento.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent],
})
export class CrearCategoriaDocumentoComponent implements OnInit {
  titulo = 'Crear Categoría de Documento';
  accion: string = '';
  regresar = '/administracion/datos-maestros/categorias-documentos';
  editable: boolean = true;
  submitted: boolean = false;

  model = {
    id: null,
    codigo: '',
    nombre: '',
    icono: '',
    orden: 0,
    activo: true,
  } as any;

  /**
   * Íconos disponibles para la categoría. Se ofrecen en una paleta y no como
   * campo libre para que las carpetas se vean parejas y nadie tenga que
   * saberse los nombres de FontAwesome.
   */
  iconosDisponibles: string[] = [
    'fa-id-card',
    'fa-heart-pulse',
    'fa-shield-halved',
    'fa-user-shield',
    'fa-graduation-cap',
    'fa-briefcase',
    'fa-file-signature',
    'fa-bullhorn',
    'fa-money-bill',
    'fa-building',
    'fa-landmark',
    'fa-folder',
    'fa-folder-open',
    'fa-file-lines',
    'fa-clipboard-list',
    'fa-book',
    'fa-camera',
    'fa-house',
    'fa-child',
    'fa-people-roof',
    'fa-stethoscope',
    'fa-scale-balanced',
  ];

  constructor(
    private categoriasDocumentosService: CategoriasDocumentosService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      this.accion = params['accion'];
      const id = params['id'];

      if (this.accion === 'crear') {
        this.titulo = 'Crear Categoría de Documento';
        this.editable = true;
      } else if (this.accion === 'editar') {
        this.titulo = 'Editar Categoría de Documento';
        this.editable = true;
        this.cargarCategoria(id);
      } else if (this.accion === 'consultar') {
        this.titulo = 'Consultar Categoría de Documento';
        this.editable = false;
        this.cargarCategoria(id);
      }
    });
  }

  cargarCategoria(id: any) {
    this.categoriasDocumentosService.obtenerById(id).subscribe({
      next: (response: any) => {
        const body = response.body;
        if (body && body.length > 0) {
          const registro = body[0];
          this.model = {
            ...registro,
            icono: registro.icono ? registro.icono : '',
            activo: !!registro.activo,
          };

          if (this.accion === 'editar') {
            this.titulo = 'Editar Categoría: ' + this.model.nombre;
          } else if (this.accion === 'consultar') {
            this.titulo = 'Consultar Categoría: ' + this.model.nombre;
          }
        }
      },
      error: (error: any) => {
        console.error('Error al cargar la categoría', error);
        Swal.fire('Error', 'No se pudo cargar la categoría', 'error');
      },
    });
  }

  seleccionarIcono(icono: string) {
    if (!this.editable) {
      return;
    }
    // Volver a pulsar el ícono elegido lo quita.
    this.model.icono = this.model.icono === icono ? '' : icono;
  }

  guardar() {
    this.submitted = true;

    if (!this.model.codigo || this.model.codigo.trim() === '') {
      Swal.fire('Advertencia', 'El código es obligatorio', 'warning');
      return;
    }

    if (!this.model.nombre || this.model.nombre.trim() === '') {
      Swal.fire('Advertencia', 'El nombre es obligatorio', 'warning');
      return;
    }

    const data: CategoriaDocumento = {
      codigo: this.model.codigo.trim(),
      nombre: this.model.nombre.trim(),
      icono: this.model.icono ? this.model.icono : undefined,
      orden: this.model.orden ? Number(this.model.orden) : 0,
      activo: this.model.activo ? 1 : 0,
    };

    if (this.accion === 'crear') {
      this.categoriasDocumentosService.crear(data).subscribe({
        next: () => {
          Swal.fire('Éxito', 'Categoría creada correctamente', 'success');
          this.router.navigate([this.regresar]);
        },
        error: (error: any) => {
          console.error('Error al crear la categoría', error);
          Swal.fire(
            'Error',
            'No se pudo crear la categoría. Verifique que el código no esté duplicado.',
            'error',
          );
        },
      });
    } else if (this.accion === 'editar') {
      data.id = this.model.id;
      this.categoriasDocumentosService.actualizar(data).subscribe({
        next: () => {
          Swal.fire('Éxito', 'Categoría actualizada correctamente', 'success');
          this.router.navigate([this.regresar]);
        },
        error: (error: any) => {
          console.error('Error al actualizar la categoría', error);
          Swal.fire(
            'Error',
            'No se pudo actualizar la categoría. Verifique que el código no esté duplicado.',
            'error',
          );
        },
      });
    }
  }

  volver() {
    this.router.navigate([this.regresar]);
  }
}
