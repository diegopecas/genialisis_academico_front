import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../../common/header/header.component';
import { SolicitudesService } from '../../../services/solicitudes.service';
import { SolicitudesHorariosService } from '../../../services/solicitudes-horarios.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-aprobar-solicitudes',
  templateUrl: './aprobar-solicitudes.component.html',
  styleUrl: './aprobar-solicitudes.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent]
})
export class AprobarSolicitudesComponent implements OnInit {

  titulo = "Aprobar Solicitudes";

  // Solo las pendientes en las que el usuario esta en la lista de
  // aprobadores. Mientras estan pendientes no le salen a los responsables:
  // no hay nada que hacer hasta que alguien decida.
  public solicitudes = [] as any[];
  public horariosPorSolicitud: any = {};

  public cargando: boolean = false;

  constructor(
    private solicitudesService: SolicitudesService,
    private horariosService: SolicitudesHorariosService
  ) { }

  ngOnInit() {
    this.cargar();
  }

  cargar() {
    this.cargando = true;
    this.solicitudesService.obtenerPorAprobar().subscribe({
      next: (response: any) => {
        this.solicitudes = response.body || [];
        this.cargando = false;
        this.solicitudes.forEach(solicitud => this.cargarHorarios(solicitud.id));
      },
      error: () => {
        this.solicitudes = [];
        this.cargando = false;
      }
    });
  }

  cargarHorarios(idSolicitud: any) {
    this.horariosService.obtenerPorSolicitud(idSolicitud).subscribe({
      next: (response: any) => {
        this.horariosPorSolicitud[idSolicitud] = response.body || [];
      },
      error: () => {
        this.horariosPorSolicitud[idSolicitud] = [];
      }
    });
  }

  horasDe(idSolicitud: any): string {
    const horas = this.horariosPorSolicitud[idSolicitud] || [];
    return horas.map((h: any) => (h.hora || '').substring(0, 5)).join(', ');
  }

  aprobar(solicitud: any) {
    Swal.fire({
      title: '¿Aprobar la solicitud?',
      text: 'Se generarán los compromisos y les aparecerán a los responsables.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Aprobar',
      cancelButtonText: 'Cancelar'
    }).then((resultado) => {
      if (!resultado.isConfirmed) return;

      this.solicitudesService.aprobar({ id: solicitud.id }).subscribe({
        next: () => {
          this.cargar();
        },
        error: (error: any) => {
          Swal.fire('Error', error?.error?.error || 'No se pudo aprobar', 'error');
        }
      });
    });
  }

  /**
   * El rechazo es terminal y por eso el motivo es obligatorio: al acudiente
   * le llega el aviso con ese texto y, si quiere corregir, crea una nueva.
   */
  rechazar(solicitud: any) {
    Swal.fire({
      title: 'Rechazar solicitud',
      input: 'textarea',
      inputLabel: 'Motivo (lo verá el acudiente)',
      inputPlaceholder: 'Ej: la foto de la fórmula no se lee',
      showCancelButton: true,
      confirmButtonText: 'Rechazar',
      cancelButtonText: 'Cancelar',
      inputValidator: (valor) => {
        if (!valor || valor.trim() === '') {
          return 'El motivo es obligatorio';
        }
        return null;
      }
    }).then((resultado) => {
      if (!resultado.isConfirmed) return;

      this.solicitudesService.rechazar({
        id: solicitud.id,
        motivo_rechazo: resultado.value
      }).subscribe({
        next: () => {
          this.cargar();
        },
        error: (error: any) => {
          Swal.fire('Error', error?.error?.error || 'No se pudo rechazar', 'error');
        }
      });
    });
  }
}
