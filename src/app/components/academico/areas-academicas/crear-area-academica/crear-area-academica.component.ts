import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HeaderComponent } from '../../../../common/header/header.component';
import { AreasAcademicasService } from '../../../../services/areas-academicas.service';
import { HttpClient } from '@angular/common/http';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-crear-area-academica',
  templateUrl: './crear-area-academica.component.html',
  styleUrl: './crear-area-academica.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent]
})
export class CrearAreaAcademicaComponent implements OnInit {

  titulo = "Crear Área Académica";
  accion: string = "";
  regresar = '/academico/areas-academicas';
  editable: boolean = true;
  submitted: boolean = false;

  // Modal de imágenes
  mostrarModalImagenes: boolean = false;
  imagenesDisponibles: any[] = [];
  imagenesFiltradas: any[] = [];
  busquedaImagen: string = '';

  model = {
    id: null,
    nombre: '',
    icono: '',
    color: '#FFFFFF'
  } as any;

  constructor(
    private areasAcademicasService: AreasAcademicasService,
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.accion = params['accion'];
      const id = params['id'];

      if (this.accion === 'crear') {
        this.titulo = "Crear Área Académica";
        this.editable = true;
      } else if (this.accion === 'editar') {
        this.titulo = "Editar Área Académica";
        this.editable = true;
        this.cargarAreaAcademica(id);
      } else if (this.accion === 'consultar') {
        this.titulo = "Consultar Área Académica";
        this.editable = false;
        this.cargarAreaAcademica(id);
      }
    });

    this.cargarImagenes();
  }

  cargarAreaAcademica(id: any) {
    this.areasAcademicasService.obtenerById(id).subscribe({
      next: (response: any) => {
        const body = response.body;
        console.log("Área académica cargada", body);
        if (body && body.length > 0) {
          this.model = body[0];
          // Actualizar título con el nombre
          if (this.accion === 'editar') {
            this.titulo = `Editar Área Académica: ${this.model.nombre}`;
          } else if (this.accion === 'consultar') {
            this.titulo = `Consultar Área Académica: ${this.model.nombre}`;
          }
        }
      },
      error: (error: any) => {
        console.error("Error al cargar área académica", error);
        Swal.fire('Error', 'No se pudo cargar el área académica', 'error');
      }
    });
  }

  cargarImagenes() {
    console.log("Intentando cargar imágenes...");
    this.http.get<any>('assets/data/imagenes-areas-academicas.json').subscribe({
      next: (data: any) => {
        console.log("Imágenes cargadas exitosamente", data);
        this.imagenesDisponibles = data.imagenes;
        this.imagenesFiltradas = data.imagenes;
      },
      error: (error: any) => {
        console.error("Error al cargar imágenes", error);
        Swal.fire('Error', 'No se pudo cargar el catálogo de imágenes. Verifica que el archivo imagenes-areas-academicas.json esté en /assets/data/', 'error');
      }
    });
  }

  abrirModalImagenes() {
    console.log("Abriendo modal. Imágenes disponibles:", this.imagenesDisponibles.length);
    if (this.imagenesDisponibles.length === 0) {
      Swal.fire('Advertencia', 'No se han cargado las imágenes. Verifica que el archivo JSON esté disponible.', 'warning');
      return;
    }
    this.mostrarModalImagenes = true;
    this.busquedaImagen = '';
    this.imagenesFiltradas = this.imagenesDisponibles;
  }

  cerrarModalImagenes() {
    this.mostrarModalImagenes = false;
  }

  seleccionarImagen(imagen: any) {
    this.model.icono = imagen.ruta;
    this.cerrarModalImagenes();
  }

  filtrarImagenes() {
    if (!this.busquedaImagen) {
      this.imagenesFiltradas = this.imagenesDisponibles;
    } else {
      this.imagenesFiltradas = this.imagenesDisponibles.filter(img =>
        img.nombre.toLowerCase().includes(this.busquedaImagen.toLowerCase())
      );
    }
  }

  guardar() {
    this.submitted = true;

    if (!this.model.nombre || this.model.nombre.trim() === '') {
      Swal.fire('Advertencia', 'El nombre del área académica es obligatorio', 'warning');
      return;
    }

    if (!this.model.icono || this.model.icono.trim() === '') {
      Swal.fire('Advertencia', 'Debe seleccionar un icono para el área académica', 'warning');
      return;
    }

    const data = {
      nombre: this.model.nombre.trim(),
      icono: this.model.icono,
      color: this.model.color || '#FFFFFF'
    } as any;

    if (this.accion === 'crear') {
      this.areasAcademicasService.crear(data).subscribe({
        next: (response: any) => {
          console.log("Área académica creada", response);
          Swal.fire('Éxito', 'Área académica creada correctamente', 'success');
          this.router.navigate(['/academico/areas-academicas']);
        },
        error: (error: any) => {
          console.error("Error al crear área académica", error);
          Swal.fire('Error', 'No se pudo crear el área académica', 'error');
        }
      });
    } else if (this.accion === 'editar') {
      data.id = this.model.id;
      this.areasAcademicasService.actualizar(data).subscribe({
        next: (response: any) => {
          console.log("Área académica actualizada", response);
          Swal.fire('Éxito', 'Área académica actualizada correctamente', 'success');
          this.router.navigate(['/academico/areas-academicas']);
        },
        error: (error: any) => {
          console.error("Error al actualizar área académica", error);
          Swal.fire('Error', 'No se pudo actualizar el área académica', 'error');
        }
      });
    }
  }

  volver() {
    this.router.navigate(['/academico/areas-academicas']);
  }
}