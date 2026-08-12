import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HeaderComponent } from '../../../../common/header/header.component';
import { GruposService } from '../../../../services/grupos.service';
import { GradosService } from '../../../../services/grados.service';
import { GradosXGrupoService } from '../../../../services/grados-x-grupo.service';
import { AreasAcademicasService } from '../../../../services/areas-academicas.service';
import { AreaAcademicaXGrupoService } from '../../../../services/area-academica-x-grupo.service';
import { GrupoHorariosComponent } from '../grupo-horarios/grupo-horarios.component';
import { GrupoTarifasComponent } from '../grupo-tarifas/grupo-tarifas.component';
import { HttpClient } from '@angular/common/http';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-crear-grupo',
  templateUrl: './crear-grupo.component.html',
  styleUrl: './crear-grupo.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, GrupoHorariosComponent, GrupoTarifasComponent]
})
export class CrearGrupoComponent implements OnInit {

  titulo = "Crear Grupo";
  accion: string = "";
  regresar = '/academico/grupos';
  editable: boolean = true;
  submitted: boolean = false;
  pestanaActiva: string = 'basico';

  // Menú móvil para tabs
  menuMovilAbierto: boolean = false;

  // Modal de imágenes
  mostrarModalImagenes: boolean = false;
  imagenesDisponibles: any[] = [];
  imagenesFiltradas: any[] = [];
  busquedaImagen: string = '';

  // Grados disponibles y asociados
  gradosDisponibles: any[] = [];
  gradosAsociados: any[] = [];
  gradosSeleccionados: { [key: string]: boolean } = {};

  // Áreas académicas disponibles y asociadas
  areasDisponibles: any[] = [];
  areasAsociadas: any[] = [];
  areasSeleccionadas: { [key: string]: boolean } = {};

  model = {
    id: null,
    nombre: '',
    icono: '',
    color: '#000000',
    calificable: 0,
    orden: 1
  } as any;

  constructor(
    private gruposService: GruposService,
    private gradosService: GradosService,
    private gradosXGrupoService: GradosXGrupoService,
    private areasAcademicasService: AreasAcademicasService,
    private areaAcademicaXGrupoService: AreaAcademicaXGrupoService,
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.accion = params['accion'];
      const id = params['id'];

      if (this.accion === 'crear') {
        this.titulo = "Crear Grupo";
        this.editable = true;
        this.obtenerUltimoOrden();
      } else if (this.accion === 'editar') {
        this.titulo = "Editar Grupo";
        this.editable = true;
        this.cargarGrupo(id);
        this.cargarGradosDisponibles(id);
        this.cargarGradosAsociados(id);
        this.cargarAreasDisponibles(id);
        this.cargarAreasAsociadas(id);
      } else if (this.accion === 'consultar') {
        this.titulo = "Consultar Grupo";
        this.editable = false;
        this.cargarGrupo(id);
        this.cargarGradosAsociados(id);
        this.cargarAreasAsociadas(id);
      }
    });

    this.cargarImagenes();
  }

  obtenerUltimoOrden() {
    this.gruposService.obtenerTodos().subscribe({
      next: (response: any) => {
        const grupos = response.body as any[];
        if (grupos && grupos.length > 0) {
          const maxOrden = Math.max(...grupos.map(g => g.orden || 0));
          this.model.orden = maxOrden + 1;
        }
      },
      error: (error: any) => {
        console.error("Error al obtener último orden", error);
      }
    });
  }

  cargarGrupo(id: any) {
    this.gruposService.obtenerById(id).subscribe({
      next: (response: any) => {
        const body = response.body;
        console.log("Grupo cargado", body);
        if (body && body.length > 0) {
          this.model = body[0];
          if (this.accion === 'editar') {
            this.titulo = `Editar Grupo: ${this.model.nombre}`;
          } else if (this.accion === 'consultar') {
            this.titulo = `Consultar Grupo: ${this.model.nombre}`;
          }
        }
      },
      error: (error: any) => {
        console.error("Error al cargar grupo", error);
        Swal.fire('Error', 'No se pudo cargar el grupo', 'error');
      }
    });
  }

  cargarImagenes() {
    this.http.get<any>('assets/data/imagenes-grupos.json').subscribe({
      next: (data: any) => {
        console.log("Imágenes cargadas", data);
        this.imagenesDisponibles = data.imagenes;
        this.imagenesFiltradas = data.imagenes;
      },
      error: (error: any) => {
        console.error("Error al cargar imágenes", error);
        Swal.fire('Error', 'No se pudo cargar el catálogo de imágenes', 'error');
      }
    });
  }

  abrirModalImagenes() {
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
      Swal.fire('Advertencia', 'El nombre del grupo es obligatorio', 'warning');
      return;
    }

    if (!this.model.icono || this.model.icono.trim() === '') {
      Swal.fire('Advertencia', 'Debe seleccionar un icono para el grupo', 'warning');
      return;
    }

    if (!this.model.color || this.model.color.trim() === '') {
      Swal.fire('Advertencia', 'Debe seleccionar un color para el grupo', 'warning');
      return;
    }

    if (this.model.orden === null || this.model.orden === undefined) {
      Swal.fire('Advertencia', 'El orden es obligatorio', 'warning');
      return;
    }

    const data = {
      nombre: this.model.nombre.trim(),
      icono: this.model.icono,
      color: this.model.color,
      calificable: this.model.calificable ? 1 : 0,
      orden: parseInt(this.model.orden)
    } as any;

    if (this.accion === 'crear') {
      this.gruposService.crear(data).subscribe({
        next: (response: any) => {
          console.log("Grupo creado", response);
          Swal.fire('Éxito', 'Grupo creado correctamente', 'success');
          this.router.navigate(['/academico/grupos']);
        },
        error: (error: any) => {
          console.error("Error al crear grupo", error);
          Swal.fire('Error', 'No se pudo crear el grupo', 'error');
        }
      });
    } else if (this.accion === 'editar') {
      data.id = this.model.id;
      this.gruposService.actualizar(data).subscribe({
        next: (response: any) => {
          console.log("Grupo actualizado", response);
          Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: 'Grupo actualizado',
            showConfirmButton: false,
            timer: 2000
          });
        },
        error: (error: any) => {
          console.error("Error al actualizar grupo", error);
          Swal.fire('Error', 'No se pudo actualizar el grupo', 'error');
        }
      });
    }
  }

  // Seleccionar pestaña y cerrar menú móvil
  seleccionarPestana(pestana: string) {
    this.pestanaActiva = pestana;
    this.menuMovilAbierto = false;
  }

  volver() {
    this.router.navigate(['/academico/grupos']);
  }

  // ========== Métodos para gestión de grados ==========

  cargarGradosDisponibles(id_grupo: any) {
    this.gradosService.obtenerDisponiblesPorGrupo(id_grupo).subscribe({
      next: (response: any) => {
        const body = response.body as any[];
        console.log("Grados disponibles", body);
        this.gradosDisponibles = body;
      },
      error: (error: any) => {
        console.error("Error al cargar grados disponibles", error);
      }
    });
  }

  cargarGradosAsociados(id_grupo: any) {
    this.gradosXGrupoService.obtenerPorGrupo(id_grupo).subscribe({
      next: (response: any) => {
        const body = response.body as any[];
        console.log("Grados asociados", body);
        this.gradosAsociados = body;
      },
      error: (error: any) => {
        console.error("Error al cargar grados asociados", error);
      }
    });
  }

  toggleGrado(id_grado: string) {
    this.gradosSeleccionados[id_grado] = !this.gradosSeleccionados[id_grado];
  }

  asociarGrados() {
    const gradosAAsociar = Object.keys(this.gradosSeleccionados)
      .filter(key => this.gradosSeleccionados[key]);

    if (gradosAAsociar.length === 0) {
      Swal.fire('Advertencia', 'Debe seleccionar al menos un grado', 'warning');
      return;
    }

    const promesas = gradosAAsociar.map(id_grado => {
      const data = {
        id_grado: id_grado,
        id_grupo: this.model.id
      };
      return this.gradosXGrupoService.crear(data).toPromise();
    });

    Promise.all(promesas).then(() => {
      Swal.fire('Éxito', 'Grados asociados correctamente', 'success');
      this.gradosSeleccionados = {};
      this.cargarGradosDisponibles(this.model.id);
      this.cargarGradosAsociados(this.model.id);
    }).catch(error => {
      console.error("Error al asociar grados", error);
      Swal.fire('Error', 'No se pudieron asociar los grados', 'error');
    });
  }

  async desasociarGrado(gradoXGrupo: any) {
    const result = await Swal.fire({
      title: '¿Está seguro?',
      text: `¿Desea desasociar el grado ${gradoXGrupo.nombre_grado} de este grupo?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, desasociar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      this.gradosXGrupoService.eliminar({ id: gradoXGrupo.id }).subscribe({
        next: (response: any) => {
          Swal.fire('Éxito', 'Grado desasociado correctamente', 'success');
          this.cargarGradosDisponibles(this.model.id);
          this.cargarGradosAsociados(this.model.id);
        },
        error: (error: any) => {
          console.error("Error al desasociar grado", error);
          Swal.fire('Error', 'No se pudo desasociar el grado', 'error');
        }
      });
    }
  }


  // ========== Métodos para gestión de áreas académicas ==========

  cargarAreasDisponibles(id_grupo: any) {
    this.areasAcademicasService.obtenerDisponiblesPorGrupo(id_grupo).subscribe({
      next: (response: any) => {
        const body = response.body as any[];
        console.log("Áreas académicas disponibles", body);
        this.areasDisponibles = body;
      },
      error: (error: any) => {
        console.error("Error al cargar áreas académicas", error);
      }
    });
  }

  cargarAreasAsociadas(id_grupo: any) {
    this.areaAcademicaXGrupoService.obtenerPorGrupo(id_grupo).subscribe({
      next: (response: any) => {
        const body = response.body as any[];
        console.log("Áreas académicas asociadas", body);
        this.areasAsociadas = body;
      },
      error: (error: any) => {
        console.error("Error al cargar áreas asociadas", error);
      }
    });
  }

  asociarAreas() {
    const areasAAsociar = Object.keys(this.areasSeleccionadas)
      .filter(key => this.areasSeleccionadas[key]);

    if (areasAAsociar.length === 0) {
      Swal.fire('Advertencia', 'Debe seleccionar al menos un área académica', 'warning');
      return;
    }

    const promesas = areasAAsociar.map(id_area => {
      const data = {
        id_area_academica: id_area,
        id_grupo: this.model.id,
        id_docente: null
      };
      return this.areaAcademicaXGrupoService.crear(data).toPromise();
    });

    Promise.all(promesas).then(() => {
      Swal.fire('Éxito', 'Áreas académicas asociadas correctamente', 'success');
      this.areasSeleccionadas = {};
      this.cargarAreasDisponibles(this.model.id);
      this.cargarAreasAsociadas(this.model.id);
    }).catch(error => {
      console.error("Error al asociar áreas", error);
      Swal.fire('Error', 'No se pudieron asociar las áreas académicas', 'error');
    });
  }

  async desasociarArea(areaAsociada: any) {
    const result = await Swal.fire({
      title: '¿Está seguro?',
      text: `¿Desea desasociar el área ${areaAsociada.nombre_area_academica} de este grupo?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, desasociar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      this.areaAcademicaXGrupoService.eliminar(areaAsociada.id).subscribe({
        next: (response: any) => {
          Swal.fire('Éxito', 'Área académica desasociada correctamente', 'success');
          this.cargarAreasDisponibles(this.model.id);
          this.cargarAreasAsociadas(this.model.id);
        },
        error: (error: any) => {
          console.error("Error al desasociar área", error);
          Swal.fire('Error', 'No se pudo desasociar el área académica', 'error');
        }
      });
    }
  }
}
