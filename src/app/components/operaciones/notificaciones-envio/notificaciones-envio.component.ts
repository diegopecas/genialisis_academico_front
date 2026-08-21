import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../../../common/header/header.component';
import { TablasComponent } from '../../../common/tablas/tablas.component';
import { NotificacionesService } from '../../../services/notificaciones.service';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';

@Component({
  selector: 'app-notificaciones-envio',
  templateUrl: './notificaciones-envio.component.html',
  styleUrl: './notificaciones-envio.component.scss',
  standalone: true,
  imports: [CommonModule, HeaderComponent, TablasComponent]
})
export class NotificacionesEnvioComponent implements OnInit {

  titulo = "Envío de Notificaciones";
  public columnasFiltro = ['Título', 'Categoría', 'Dirigida a'];
  public titulos = [] as any[];
  public datos = [] as any[];
  public acciones = [] as any[];

  constructor(
    private notificacionesService: NotificacionesService,
    private router: Router,
  ) { }

  ngOnInit(): void {
    this.crearTitulos();
    this.obtenerNotificaciones();
  }

  obtenerNotificaciones() {
    this.notificacionesService.obtenerTodos().subscribe((response: any) => {
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
        clave: 'fecha_envio',
        alias: 'Fecha',
        alinear: 'centrado',
      },
      {
        clave: 'titulo',
        alias: 'Título',
        alinear: 'izquierda',
      },
      {
        clave: 'categoria_nombre',
        alias: 'Categoría',
        alinear: 'izquierda',
      },
      {
        clave: 'criterio_texto',
        alias: 'Dirigida a',
        alinear: 'izquierda',
      },
      {
        clave: 'total_destinatarios',
        alias: 'Enviadas',
        alinear: 'centrado',
      },
      {
        clave: 'total_leidas',
        alias: 'Leídas',
        alinear: 'centrado',
      },
      {
        clave: 'total_respondidas',
        alias: 'Respondidas',
        alinear: 'centrado',
      },
      {
        clave: 'id',
        alias: 'Reenviar',
        tipo: 'boton',
        alinear: 'centrado',
        iconoClase: 'fas fa-paper-plane',
        accionId: 'reenviar',
        tooltip: 'Usar como base para una notificación nueva'
      },
    ];
  }

  clicAccion($event: any) {
    switch ($event.accion) {
      case 'editar':
        this.router.navigate(['operaciones/notificaciones-envio/editar/' + $event.registro.id]);
        break;
      case 'reenviar':
        this.router.navigate(['operaciones/notificaciones-envio/reenviar/' + $event.registro.id]);
        break;
      case 'eliminar':
        this.eliminarNotificacion($event.registro);
        break;
    }
  }

  async eliminarNotificacion(notificacion: any) {
    const result = await Swal.fire({
      title: '¿Está seguro?',
      text: `¿Desea eliminar la notificación ${notificacion.titulo}? También se borran sus acuses de lectura y respuestas.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      this.notificacionesService.eliminar({ id: notificacion.id }).subscribe({
        next: (response: any) => {
          Swal.fire(
            'Eliminada',
            'La notificación ha sido eliminada.',
            'success'
          );
          this.obtenerNotificaciones();
        },
        error: (error: any) => {
          console.error("Error al eliminar notificación", error);
          Swal.fire(
            'Error',
            'No se pudo eliminar la notificación.',
            'error'
          );
        }
      });
    }
  }
}
