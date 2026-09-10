import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HeaderComponent } from '../../../../../common/header/header.component';
import { InformesItemsService } from '../../../../../services/informes-items.service';
import { InformesSeccionesService } from '../../../../../services/informes-secciones.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-crear-informe-item',
  templateUrl: './crear-informe-item.component.html',
  styleUrl: './crear-informe-item.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent]
})
export class CrearInformeItemComponent implements OnInit {

  titulo = "Crear Ítem del Informe";
  accion: string = "";
  regresar = '/academico/informes/items';
  editable: boolean = true;
  submitted: boolean = false;

  // Solo las secciones que se alimentan de ítems propios: en las demás las
  // filas salen de la malla y un ítem manual no tendría dónde aparecer.
  secciones: any[] = [];

  model = {
    id: null,
    id_seccion: null,
    texto: '',
    orden: 0,
    activo: 1
  } as any;

  constructor(
    private informesItemsService: InformesItemsService,
    private informesSeccionesService: InformesSeccionesService,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.cargarSecciones();

    this.route.params.subscribe(params => {
      this.accion = params['accion'];
      const id = params['id'];

      if (this.accion === 'crear') {
        this.titulo = "Crear Ítem del Informe";
        this.editable = true;
      } else if (this.accion === 'editar') {
        this.titulo = "Editar Ítem del Informe";
        this.editable = true;
        this.cargarItem(id);
      } else if (this.accion === 'consultar') {
        this.titulo = "Consultar Ítem del Informe";
        this.editable = false;
        this.cargarItem(id);
      }
    });
  }

  cargarSecciones() {
    this.informesSeccionesService.obtenerTodos().subscribe({
      next: (response: any) => {
        const body = (response.body as any[]) || [];
        this.secciones = body.filter((s: any) => s.tipo_origen === 'items');
      },
      error: (error: any) => console.error("Error al cargar las secciones", error)
    });
  }

  cargarItem(id: any) {
    this.informesItemsService.obtenerById(id).subscribe({
      next: (response: any) => {
        const body = response.body;
        console.log("Ítem cargado", body);
        if (body && body.length > 0) {
          this.model = body[0];
        }
      },
      error: (error: any) => {
        console.error("Error al cargar el ítem", error);
        Swal.fire('Error', 'No se pudo cargar el ítem', 'error');
      }
    });
  }

  guardar() {
    this.submitted = true;

    if (!this.model.id_seccion) {
      Swal.fire('Advertencia', 'Debe seleccionar la sección del informe', 'warning');
      return;
    }

    if (!this.model.texto || this.model.texto.trim() === '') {
      Swal.fire('Advertencia', 'El texto del ítem es obligatorio', 'warning');
      return;
    }

    const data = {
      id_seccion: this.model.id_seccion,
      texto: this.model.texto.trim(),
      orden: this.model.orden || 0,
      activo: this.model.activo ? 1 : 0
    } as any;

    if (this.accion === 'crear') {
      this.informesItemsService.crear(data).subscribe({
        next: () => {
          Swal.fire('Éxito', 'Ítem creado correctamente', 'success');
          this.router.navigate([this.regresar]);
        },
        error: (error: any) => {
          console.error("Error al crear el ítem", error);
          Swal.fire('Error', 'No se pudo crear el ítem', 'error');
        }
      });
    } else if (this.accion === 'editar') {
      data.id = this.model.id;
      this.informesItemsService.actualizar(data).subscribe({
        next: () => {
          Swal.fire('Éxito', 'Ítem actualizado correctamente', 'success');
          this.router.navigate([this.regresar]);
        },
        error: (error: any) => {
          console.error("Error al actualizar el ítem", error);
          Swal.fire('Error', 'No se pudo actualizar el ítem', 'error');
        }
      });
    }
  }

  volver() {
    this.router.navigate([this.regresar]);
  }
}
