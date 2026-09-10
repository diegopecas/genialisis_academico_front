import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HeaderComponent } from '../../../../../common/header/header.component';
import { InformesSeccionesService } from '../../../../../services/informes-secciones.service';
import { EsferasDesarrolloService } from '../../../../../services/esferas-desarrollo.service';
import { AreasAcademicasService } from '../../../../../services/areas-academicas.service';
import { TiposObservacionesEstudiantesService } from '../../../../../services/tipos-observaciones-estudiantes.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-crear-informe-seccion',
  templateUrl: './crear-informe-seccion.component.html',
  styleUrl: './crear-informe-seccion.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent]
})
export class CrearInformeSeccionComponent implements OnInit {

  titulo = "Crear Sección del Informe";
  accion: string = "";
  regresar = '/academico/informes/secciones';
  editable: boolean = true;
  submitted: boolean = false;

  // Los tres catálogos se cargan de una porque el usuario puede cambiar de
  // tipo de origen sin recargar la pantalla.
  esferas: any[] = [];
  areas: any[] = [];
  tiposObservacion: any[] = [];
  posiblesPadres: any[] = [];

  model = {
    id: null,
    nombre: '',
    orden: 0,
    id_seccion_padre: null,
    tipo_origen: 'esfera',
    id_origen: null,
    se_califica: 1,
    tipo_contenido: 'escala',
    evalua_a: 'estudiante',
    requiere_inscripcion: 0,
    activo: 1
  } as any;

  constructor(
    private informesSeccionesService: InformesSeccionesService,
    private esferasDesarrolloService: EsferasDesarrolloService,
    private areasAcademicasService: AreasAcademicasService,
    private tiposObservacionesService: TiposObservacionesEstudiantesService,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.cargarCatalogos();

    this.route.params.subscribe(params => {
      this.accion = params['accion'];
      const id = params['id'];

      if (this.accion === 'crear') {
        this.titulo = "Crear Sección del Informe";
        this.editable = true;
      } else if (this.accion === 'editar') {
        this.titulo = "Editar Sección del Informe";
        this.editable = true;
        this.cargarSeccion(id);
      } else if (this.accion === 'consultar') {
        this.titulo = "Consultar Sección del Informe";
        this.editable = false;
        this.cargarSeccion(id);
      }
    });
  }

  cargarCatalogos() {
    this.esferasDesarrolloService.obtenerTodos().subscribe({
      next: (response: any) => {
        this.esferas = (response.body as any[]) || [];
      },
      error: (error: any) => console.error("Error al cargar las esferas", error)
    });

    this.areasAcademicasService.obtenerTodosList().subscribe({
      next: (response: any) => {
        this.areas = (response.body as any[]) || [];
      },
      error: (error: any) => console.error("Error al cargar las áreas", error)
    });

    this.tiposObservacionesService.obtenerTodos().subscribe({
      next: (response: any) => {
        this.tiposObservacion = (response.body as any[]) || [];
      },
      error: (error: any) => console.error("Error al cargar los tipos de observación", error)
    });

    this.informesSeccionesService.obtenerPosiblesPadres().subscribe({
      next: (response: any) => {
        this.posiblesPadres = (response.body as any[]) || [];
        this.excluirseComoPadre();
      },
      error: (error: any) => console.error("Error al cargar las secciones padre", error)
    });
  }

  cargarSeccion(id: any) {
    this.informesSeccionesService.obtenerById(id).subscribe({
      next: (response: any) => {
        const body = response.body;
        console.log("Sección cargada", body);
        if (body && body.length > 0) {
          this.model = body[0];
          this.titulo = this.accion === 'editar'
            ? `Editar Sección: ${this.model.nombre}`
            : `Consultar Sección: ${this.model.nombre}`;
          this.excluirseComoPadre();
        }
      },
      error: (error: any) => {
        console.error("Error al cargar la sección", error);
        Swal.fire('Error', 'No se pudo cargar la sección', 'error');
      }
    });
  }

  /**
   * Se llama desde los dos lados porque el catálogo y la sección se cargan
   * en paralelo y no hay garantía de cuál llega primero.
   */
  private excluirseComoPadre() {
    if (this.model.id && this.posiblesPadres.length > 0) {
      this.posiblesPadres = this.posiblesPadres.filter((p: any) => p.id !== this.model.id);
    }
  }

  /**
   * Al cambiar el tipo de origen se limpia el id, porque el catálogo anterior
   * ya no aplica. Los ítems propios no llevan origen.
   */
  cambiarTipoOrigen() {
    this.model.id_origen = null;

    if (this.model.tipo_origen === 'observacion') {
      // Las observaciones son texto por naturaleza
      this.model.tipo_contenido = 'texto';
      this.model.se_califica = 0;
    }
  }

  get opcionesOrigen(): any[] {
    switch (this.model.tipo_origen) {
      case 'esfera': return this.esferas;
      case 'area': return this.areas;
      case 'observacion': return this.tiposObservacion;
      default: return [];
    }
  }

  get requiereOrigen(): boolean {
    return this.model.tipo_origen !== 'items';
  }

  guardar() {
    this.submitted = true;

    if (!this.model.nombre || this.model.nombre.trim() === '') {
      Swal.fire('Advertencia', 'El nombre de la sección es obligatorio', 'warning');
      return;
    }

    if (this.requiereOrigen && !this.model.id_origen) {
      Swal.fire('Advertencia', 'Debe seleccionar el origen de la sección', 'warning');
      return;
    }

    const data = {
      nombre: this.model.nombre.trim(),
      orden: this.model.orden || 0,
      id_seccion_padre: this.model.id_seccion_padre || null,
      tipo_origen: this.model.tipo_origen,
      id_origen: this.requiereOrigen ? this.model.id_origen : null,
      se_califica: this.model.se_califica ? 1 : 0,
      tipo_contenido: this.model.tipo_contenido,
      evalua_a: this.model.evalua_a,
      requiere_inscripcion: this.model.requiere_inscripcion ? 1 : 0,
      activo: this.model.activo ? 1 : 0
    } as any;

    if (this.accion === 'crear') {
      this.informesSeccionesService.crear(data).subscribe({
        next: () => {
          Swal.fire('Éxito', 'Sección creada correctamente', 'success');
          this.router.navigate([this.regresar]);
        },
        error: (error: any) => {
          console.error("Error al crear la sección", error);
          Swal.fire('Error', 'No se pudo crear la sección', 'error');
        }
      });
    } else if (this.accion === 'editar') {
      data.id = this.model.id;
      this.informesSeccionesService.actualizar(data).subscribe({
        next: () => {
          Swal.fire('Éxito', 'Sección actualizada correctamente', 'success');
          this.router.navigate([this.regresar]);
        },
        error: (error: any) => {
          console.error("Error al actualizar la sección", error);
          Swal.fire('Error', 'No se pudo actualizar la sección', 'error');
        }
      });
    }
  }

  volver() {
    this.router.navigate([this.regresar]);
  }
}
