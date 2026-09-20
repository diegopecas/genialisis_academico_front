// ========== solicitudes-inscripcion.component.ts ==========
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../../../common/header/header.component';
import { TablasComponent } from '../../../common/tablas/tablas.component';
import { SolicitudesInscripcionPublicaService } from '../../../services/solicitudes-inscripcion-publica.service';
import Swal from 'sweetalert2';
import { Router } from '@angular/router';

@Component({
  selector: 'app-solicitudes-inscripcion',
  templateUrl: './solicitudes-inscripcion.component.html',
  styleUrl: './solicitudes-inscripcion.component.scss',
  standalone: true,
  imports: [CommonModule, HeaderComponent, TablasComponent]
})
export class SolicitudesInscripcionComponent implements OnInit {

  titulo = "Solicitudes de Inscripción";
  public columnasFiltro = ['Estudiante', 'Curso', 'Institución', 'Estado'];
  public titulos = [] as any[];
  public datos = [] as any[];
  public acciones = [] as any[];

  constructor(
    private solicitudesService: SolicitudesInscripcionPublicaService,
    private router: Router,
  ) { }

  ngOnInit(): void {
    this.crearTitulos();
    this.obtenerSolicitudes();
  }

  obtenerSolicitudes() {
    this.solicitudesService.obtenerTodos().subscribe({
      next: (response: any) => {
        const body = (response.body || []) as any[];
        this.datos = body.map((s: any) => ({
          ...s,
          nombre_estudiante: (s.nombre_estudiante || '').replace(/\s+/g, ' ').trim(),
          nombre_acudiente: (s.nombre_acudiente || '').replace(/\s+/g, ' ').trim(),
          institucion_mostrar: s.nombre_institucion || 'Particular',
          estado_mostrar: this.etiquetaEstado(s.estado),
          // Las resueltas se pintan en gris para que resalten las pendientes
          color: s.estado === 'pendiente' ? '' : '#e2e9f3'
        }));
      },
      error: (error: any) => {
        console.error("Error al obtener las solicitudes", error);
        Swal.fire('Error', 'No se pudieron cargar las solicitudes.', 'error');
      }
    });
  }

  etiquetaEstado(estado: string): string {
    if (estado === 'aprobada') return 'Aprobada';
    if (estado === 'rechazada') return 'Rechazada';
    return 'Pendiente';
  }

  crearTitulos() {
    this.titulos = [
      {
        clave: 'fecha_registro',
        alias: 'Recibida',
        alinear: 'centrado',
      },
      {
        clave: 'nombre_estudiante',
        alias: 'Estudiante',
        alinear: 'izquierda',
      },
      {
        clave: 'est_numero_identificacion',
        alias: 'Documento',
        alinear: 'izquierda',
      },
      {
        clave: 'nombre_curso',
        alias: 'Curso',
        alinear: 'izquierda',
      },
      {
        clave: 'institucion_mostrar',
        alias: 'Institución',
        alinear: 'izquierda',
      },
      {
        clave: 'nombre_acudiente',
        alias: 'Inscribe',
        alinear: 'izquierda',
      },
      {
        clave: 'acu_telefono',
        alias: 'Teléfono',
        alinear: 'izquierda',
      },
      {
        clave: 'estado_mostrar',
        alias: 'Estado',
        alinear: 'centrado',
      },
    ];
  }

  clicAccion($event: any) {
    switch ($event.accion) {
      case 'editar':
        this.router.navigate(['operaciones/solicitudes-inscripcion/consultar/' + $event.registro.id]);
        break;
      case 'eliminar':
        this.eliminarSolicitud($event.registro);
        break;
    }
  }

  async eliminarSolicitud(solicitud: any) {
    // Una solicitud aprobada es la trazabilidad de como entro ese estudiante,
    // por eso el backend no la deja borrar.
    if (solicitud.estado === 'aprobada') {
      Swal.fire('No se puede eliminar', 'Esta solicitud ya fue aprobada y queda como respaldo de la inscripción.', 'warning');
      return;
    }

    const result = await Swal.fire({
      title: '¿Está seguro?',
      text: `¿Desea eliminar la solicitud de ${solicitud.nombre_estudiante}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (!result.isConfirmed) {
      return;
    }

    this.solicitudesService.eliminar(solicitud.id).subscribe({
      next: () => {
        Swal.fire('Eliminada', 'La solicitud fue eliminada.', 'success');
        this.obtenerSolicitudes();
      },
      error: (error: any) => {
        console.error("Error al eliminar la solicitud", error);
        const mensaje = error?.error?.error || 'No se pudo eliminar la solicitud.';
        Swal.fire('Error', mensaje, 'error');
      }
    });
  }
}