import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../../../common/header/header.component';
import { TablasComponent } from '../../../common/tablas/tablas.component';
import { NotificacionesPlantillasService } from '../../../services/notificaciones-plantillas.service';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';

@Component({
  selector: 'app-plantillas-notificaciones',
  templateUrl: './plantillas-notificaciones.component.html',
  styleUrl: './plantillas-notificaciones.component.scss',
  standalone: true,
  imports: [CommonModule, HeaderComponent, TablasComponent]
})
export class PlantillasNotificacionesComponent implements OnInit {

  titulo = "Plantillas de Notificaciones";
  public columnasFiltro = ['Nombre', 'Categoría', 'Título'];
  public titulos = [] as any[];
  public datos = [] as any[];
  public acciones = [] as any[];

  constructor(
    private plantillasService: NotificacionesPlantillasService,
    private router: Router,
  ) { }

  ngOnInit(): void {
    this.crearTitulos();
    this.obtenerPlantillas();
  }

  obtenerPlantillas() {
    this.plantillasService.obtenerTodos().subscribe((response: any) => {
      const body = response.body as any[];
      this.datos = body;
    });
  }

  crearTitulos() {
    this.titulos = [
      {
        clave: 'id',
        alias: 'ID',
        alinear: 'centrado',
      },
      {
        clave: 'nombre',
        alias: 'Nombre',
        alinear: 'izquierda',
      },
      {
        clave: 'categoria_nombre',
        alias: 'Categoría',
        alinear: 'izquierda',
      },
      {
        clave: 'titulo',
        alias: 'Título',
        alinear: 'izquierda',
      },
      {
        clave: 'respuesta_tipo_nombre',
        alias: 'Respuesta',
        alinear: 'izquierda',
      },
      {
        clave: 'veces_usada',
        alias: 'Usos',
        alinear: 'centrado',
      },
      {
        clave: 'fecha_actualizacion',
        alias: 'Última actualización',
        alinear: 'centrado',
      },
    ];
  }

  clicAccion($event: any) {
    switch ($event.accion) {
      case 'editar':
        this.router.navigate(['administracion/datos-maestros/plantillas-notificaciones/editar/' + $event.registro.id]);
        break;
      case 'eliminar':
        this.eliminarPlantilla($event.registro);
        break;
    }
  }

  async eliminarPlantilla(plantilla: any) {
    const result = await Swal.fire({
      title: '¿Está seguro?',
      text: `¿Desea eliminar la plantilla ${plantilla.nombre}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      this.plantillasService.eliminar({ id: plantilla.id }).subscribe({
        next: (response: any) => {
          // Si ya se uso para enviar, el backend la desactiva en lugar de
          // borrarla, para no romper las notificaciones que la referencian.
          if (response && response.desactivada) {
            Swal.fire(
              'Desactivada',
              'La plantilla ya se había usado, se desactivó en lugar de eliminarla.',
              'info'
            );
          } else {
            Swal.fire(
              'Eliminada',
              'La plantilla ha sido eliminada.',
              'success'
            );
          }
          this.obtenerPlantillas();
        },
        error: (error: any) => {
          console.error("Error al eliminar plantilla", error);
          Swal.fire(
            'Error',
            'No se pudo eliminar la plantilla.',
            'error'
          );
        }
      });
    }
  }
}
