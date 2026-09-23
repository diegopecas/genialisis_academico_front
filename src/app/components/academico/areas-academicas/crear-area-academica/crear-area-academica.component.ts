import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HeaderComponent } from '../../../../common/header/header.component';
import { AreasAcademicasService } from '../../../../services/areas-academicas.service';
import { HttpClient } from '@angular/common/http';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import Swal from 'sweetalert2';
import { NivelesAreaAcademicaService, NivelAreaAcademica } from '../../../../services/niveles-area-academica.service';

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

  /* Niveles del area. Solo aplican a las areas extracurriculares: son el eje
     contra el que se define un logro cuando el curso mezcla ninos de varios
     grupos y recibe ninos externos, que no tienen grado. */
  niveles: any[] = [];
  mostrarModalNivel: boolean = false;
  guardandoNivel: boolean = false;
  nivelModal = {
    id: null,
    nombre: '',
    descripcion: '',
    orden: 0,
    activo: true
  } as any;

  model = {
    id: null,
    nombre: '',
    icono: '',
    color: '#FFFFFF',
    // Marca el area como materia de un curso extracurricular. Las areas
    // extracurriculares no se ofrecen en la malla regular ni al revés.
    es_extracurricular: false
  } as any;

  constructor(
    private areasAcademicasService: AreasAcademicasService,
    private nivelesAreaAcademicaService: NivelesAreaAcademicaService,
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.accion = params['accion'];
      const id = params['id'];

      if (this.accion === 'crear') {
        // Sin el prefijo: app-header antepone "Crear " cuando la accion es crear.
        this.titulo = "Área Académica";
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
        if (body && body.length > 0) {
          this.model = body[0];
          this.model.es_extracurricular = !!this.model.es_extracurricular;
          this.cargarNiveles();
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

  /**
   * Carga el catálogo de iconos.
   *
   * Se fusionan los dos catálogos (áreas académicas y cursos extracurriculares)
   * para que un área extracurricular pueda usar iconos como Natación o Ballet.
   * Se muestran siempre, esté o no marcada como extracurricular.
   *
   * Si uno de los dos archivos falla se continúa con el otro: quedarse sin la
   * mitad del catálogo es mejor que quedarse sin ninguno.
   */
  cargarImagenes() {
    forkJoin({
      areas: this.http.get<any>('assets/data/imagenes-areas-academicas.json')
        .pipe(catchError(() => of(null))),
      cursosExtra: this.http.get<any>('assets/data/imagenes-cursos-extra.json')
        .pipe(catchError(() => of(null)))
    }).subscribe((data: any) => {
      const listaAreas = data.areas?.imagenes || [];
      const listaCursos = data.cursosExtra?.imagenes || [];

      if (listaAreas.length === 0 && listaCursos.length === 0) {
        console.error("No se pudo cargar ningún catálogo de imágenes");
        Swal.fire('Error', 'No se pudo cargar el catálogo de imágenes. Verifica que los archivos imagenes-areas-academicas.json e imagenes-cursos-extra.json estén en /assets/data/', 'error');
        return;
      }

      // La ruta identifica la imagen: si un icono está en los dos catálogos se
      // deja una sola vez.
      const porRuta = new Map<string, any>();
      [...listaAreas, ...listaCursos].forEach((img: any) => {
        if (img && img.ruta && !porRuta.has(img.ruta)) {
          porRuta.set(img.ruta, img);
        }
      });

      this.imagenesDisponibles = Array.from(porRuta.values())
        .sort((a: any, b: any) => (a.nombre || '').localeCompare(b.nombre || ''));
      this.imagenesFiltradas = this.imagenesDisponibles;
    });
  }

  abrirModalImagenes() {
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

  // ==================== NIVELES ====================

  cargarNiveles() {
    if (!this.model.id) {
      return;
    }
    this.nivelesAreaAcademicaService.obtenerByArea(this.model.id).subscribe({
      next: (response: any) => {
        this.niveles = response.body || [];
      },
      error: (error: any) => {
        console.error('Error al cargar los niveles del área', error);
      }
    });
  }

  abrirModalNivel() {
    this.nivelModal = {
      id: null,
      nombre: '',
      descripcion: '',
      // Se propone el siguiente en la secuencia para no tener que pensarlo.
      orden: this.niveles.length + 1,
      activo: true
    };
    this.mostrarModalNivel = true;
  }

  editarNivel(nivel: any) {
    this.nivelModal = { ...nivel, activo: !!nivel.activo };
    this.mostrarModalNivel = true;
  }

  cerrarModalNivel() {
    this.mostrarModalNivel = false;
  }

  guardarNivel() {
    if (!this.nivelModal.nombre || this.nivelModal.nombre.trim() === '') {
      Swal.fire('Advertencia', 'El nombre del nivel es obligatorio', 'warning');
      return;
    }

    const data: NivelAreaAcademica = {
      id_area_academica: this.model.id,
      nombre: this.nivelModal.nombre.trim(),
      descripcion: this.nivelModal.descripcion ? this.nivelModal.descripcion.trim() : undefined,
      orden: this.nivelModal.orden ? Number(this.nivelModal.orden) : 0,
      activo: this.nivelModal.activo ? 1 : 0
    };

    this.guardandoNivel = true;

    const peticion = this.nivelModal.id
      ? this.nivelesAreaAcademicaService.actualizar({ ...data, id: this.nivelModal.id })
      : this.nivelesAreaAcademicaService.crear(data);

    peticion.subscribe({
      next: () => {
        this.guardandoNivel = false;
        this.cerrarModalNivel();
        this.cargarNiveles();
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Nivel guardado', showConfirmButton: false, timer: 2000 });
      },
      error: (error: any) => {
        this.guardandoNivel = false;
        console.error('Error al guardar el nivel', error);
        Swal.fire('Error', 'No se pudo guardar el nivel', 'error');
      }
    });
  }

  async eliminarNivel(nivel: any) {
    const result = await Swal.fire({
      title: '¿Eliminar nivel?',
      text: `¿Desea eliminar el nivel "${nivel.nombre}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (!result.isConfirmed) {
      return;
    }

    this.nivelesAreaAcademicaService.eliminar(nivel.id).subscribe({
      next: () => {
        this.cargarNiveles();
      },
      error: (error: any) => {
        console.error('Error al eliminar el nivel', error);
        // El backend responde 400 con el detalle cuando el nivel esta en uso.
        const mensaje = error?.error?.error ? error.error.error : 'No se pudo eliminar el nivel.';
        Swal.fire('Error', mensaje, 'error');
      }
    });
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
      color: this.model.color || '#FFFFFF',
      es_extracurricular: this.model.es_extracurricular ? 1 : 0
    } as any;

    if (this.accion === 'crear') {
      this.areasAcademicasService.crear(data).subscribe({
        next: (response: any) => {
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