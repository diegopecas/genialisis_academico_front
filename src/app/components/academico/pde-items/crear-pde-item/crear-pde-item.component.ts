import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import Swal from 'sweetalert2';
import { HeaderComponent } from '../../../../common/header/header.component';
import { PdeItemsService } from '../../../../services/pde-items.service';
import { PdeRangosEdadService } from '../../../../services/pde-rangos-edad.service';
import { EsferasDesarrolloService } from '../../../../services/esferas-desarrollo.service';

@Component({
  selector: 'app-crear-pde-item',
  templateUrl: './crear-pde-item.component.html',
  styleUrl: './crear-pde-item.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent]
})
export class CrearPdeItemComponent implements OnInit {

  titulo = "Crear Ítem";
  accion: string = "";
  regresar = '/academico/pde-items';
  editable: boolean = true;
  submitted: boolean = false;

  public rangos: any[] = [];
  public esferas: any[] = [];

  model = {
    id: null,
    id_esfera: '',
    subarea: '',
    id_rango_edad: '',
    numero_item: null,
    descripcion: '',
    instrucciones: '',
    materiales: '',
    puntaje_maximo: null,
    orden: null,
    activo: 1
  } as any;

  constructor(
    private pdeItemsService: PdeItemsService,
    private pdeRangosEdadService: PdeRangosEdadService,
    private esferasDesarrolloService: EsferasDesarrolloService,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.cargarCatalogos();

    this.route.params.subscribe(params => {
      this.accion = params['accion'];
      const id = params['id'];

      if (this.accion === 'crear') {
        this.titulo = "Crear Ítem";
        this.editable = true;
      } else if (this.accion === 'editar') {
        this.titulo = "Editar Ítem";
        this.editable = true;
        this.cargarItem(id);
      } else if (this.accion === 'consultar') {
        this.titulo = "Consultar Ítem";
        this.editable = false;
        this.cargarItem(id);
      }
    });
  }

  cargarCatalogos() {
    this.pdeRangosEdadService.obtenerTodosList().subscribe({
      next: (response: any) => { this.rangos = response.body as any[]; },
      error: (error: any) => {
        console.error("Error al cargar rangos", error);
        Swal.fire('Error', 'No se pudieron cargar los rangos de edad', 'error');
      }
    });

    this.esferasDesarrolloService.obtenerTodos().subscribe({
      next: (response: any) => { this.esferas = response.body as any[]; },
      error: (error: any) => {
        console.error("Error al cargar esferas", error);
        Swal.fire('Error', 'No se pudieron cargar las esferas de desarrollo', 'error');
      }
    });
  }

  cargarItem(id: any) {
    this.pdeItemsService.obtenerById(id).subscribe({
      next: (response: any) => {
        const body = response.body;
        if (body && body.length > 0) {
          this.model = body[0];
        }
      },
      error: (error: any) => {
        console.error("Error al cargar ítem", error);
        Swal.fire('Error', 'No se pudo cargar el ítem', 'error');
      }
    });
  }

  guardar() {
    this.submitted = true;

    if (!this.model.id_rango_edad) {
      Swal.fire('Advertencia', 'Debe seleccionar el rango de edad', 'warning');
      return;
    }

    if (!this.model.id_esfera) {
      Swal.fire('Advertencia', 'Debe seleccionar la esfera de desarrollo', 'warning');
      return;
    }

    if (!this.model.descripcion || this.model.descripcion.trim() === '') {
      Swal.fire('Advertencia', 'La descripción del ítem es obligatoria', 'warning');
      return;
    }

    if (this.model.numero_item === null || this.model.numero_item === '') {
      Swal.fire('Advertencia', 'El número del ítem es obligatorio', 'warning');
      return;
    }

    if (this.model.puntaje_maximo === null || this.model.puntaje_maximo === '' || Number(this.model.puntaje_maximo) < 1) {
      Swal.fire('Advertencia', 'El puntaje máximo debe ser mayor que cero', 'warning');
      return;
    }

    if (this.model.orden === null || this.model.orden === '') {
      Swal.fire('Advertencia', 'El orden es obligatorio', 'warning');
      return;
    }

    const data = {
      id_esfera: this.model.id_esfera,
      subarea: this.model.subarea ? this.model.subarea : null,
      id_rango_edad: this.model.id_rango_edad,
      numero_item: this.model.numero_item,
      descripcion: this.model.descripcion.trim(),
      instrucciones: this.model.instrucciones,
      materiales: this.model.materiales,
      puntaje_maximo: this.model.puntaje_maximo,
      orden: this.model.orden,
      activo: this.model.activo ? 1 : 0
    } as any;

    if (this.accion === 'crear') {
      this.pdeItemsService.crear(data).subscribe({
        next: () => {
          Swal.fire('Éxito', 'Ítem creado correctamente', 'success');
          this.router.navigate(['/academico/pde-items']);
        },
        error: (error: any) => {
          console.error("Error al crear ítem", error);
          Swal.fire('Error', 'No se pudo crear el ítem', 'error');
        }
      });
    } else if (this.accion === 'editar') {
      data.id = this.model.id;
      this.pdeItemsService.actualizar(data).subscribe({
        next: () => {
          Swal.fire('Éxito', 'Ítem actualizado correctamente', 'success');
          this.router.navigate(['/academico/pde-items']);
        },
        error: (error: any) => {
          console.error("Error al actualizar ítem", error);
          Swal.fire('Error', 'No se pudo actualizar el ítem', 'error');
        }
      });
    }
  }

  volver() {
    this.router.navigate(['/academico/pde-items']);
  }
}
