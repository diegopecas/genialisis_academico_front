import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

import { HeaderComponent } from '../../../common/header/header.component';
import { NotificacionesService } from '../../../services/notificaciones.service';
import { NotificacionesDestinatariosService } from '../../../services/notificaciones-destinatarios.service';

@Component({
  selector: 'app-notificaciones-monitoreo',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent],
  templateUrl: './notificaciones-monitoreo.component.html',
  styleUrl: './notificaciones-monitoreo.component.scss'
})
export class NotificacionesMonitoreoComponent implements OnInit, OnDestroy {
  titulo = 'Monitoreo de Notificaciones';

  public cargando = false;
  public cargandoDetalle = false;
  public mensajeError = '';

  public notificaciones: any[] = [];
  public filtroTexto = '';

  public notificacionSeleccionada: any = null;
  public resumen: any = null;
  public destinatarios: any[] = [];
  public filtroEstado: string = 'todos';

  private subscriptions: Subscription[] = [];

  constructor(
    private notificacionesService: NotificacionesService,
    private destinatariosService: NotificacionesDestinatariosService,
  ) { }

  ngOnInit(): void {
    this.cargarNotificaciones();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(s => s.unsubscribe());
  }

  cargarNotificaciones(): void {
    this.cargando = true;
    this.mensajeError = '';

    this.subscriptions.push(
      this.notificacionesService.obtenerTodos().subscribe({
        next: (respuesta: any) => {
          this.notificaciones = respuesta.body || [];
          this.cargando = false;
        },
        error: () => {
          this.mensajeError = 'No se pudieron cargar las notificaciones';
          this.cargando = false;
        }
      })
    );
  }

  get notificacionesFiltradas(): any[] {
    const filtro = this.filtroTexto.trim().toLowerCase();
    if (!filtro) {
      return this.notificaciones;
    }
    return this.notificaciones.filter(n =>
      (n.titulo || '').toLowerCase().includes(filtro) ||
      (n.categoria_nombre || '').toLowerCase().includes(filtro) ||
      (n.criterio_texto || '').toLowerCase().includes(filtro)
    );
  }

  verDetalle(notificacion: any): void {
    this.notificacionSeleccionada = notificacion;
    this.resumen = null;
    this.destinatarios = [];
    this.filtroEstado = 'todos';
    this.cargandoDetalle = true;

    this.subscriptions.push(
      this.destinatariosService.obtenerResumen(notificacion.id).subscribe({
        next: (respuesta: any) => { this.resumen = respuesta.body || null; },
        error: () => { this.mensajeError = 'No se pudo cargar el resumen'; }
      })
    );

    this.subscriptions.push(
      this.destinatariosService.obtenerByNotificacion(notificacion.id).subscribe({
        next: (respuesta: any) => {
          this.destinatarios = respuesta.body || [];
          this.cargandoDetalle = false;
        },
        error: () => {
          this.mensajeError = 'No se pudo cargar el detalle de destinatarios';
          this.cargandoDetalle = false;
        }
      })
    );
  }

  cerrarDetalle(): void {
    this.notificacionSeleccionada = null;
    this.resumen = null;
    this.destinatarios = [];
  }

  get destinatariosFiltrados(): any[] {
    if (this.filtroEstado === 'sin_leer') {
      return this.destinatarios.filter(d => !d.fecha_lectura);
    }
    if (this.filtroEstado === 'sin_responder') {
      return this.destinatarios.filter(d => !d.id_respuesta_opcion);
    }
    return this.destinatarios;
  }

  nombreAcudiente(destinatario: any): string {
    return [
      destinatario.acudiente_primer_nombre,
      destinatario.acudiente_primer_apellido,
      destinatario.acudiente_segundo_apellido,
    ].filter(p => !!p).join(' ');
  }

  nombreEstudiante(destinatario: any): string {
    return [
      destinatario.estudiante_primer_nombre,
      destinatario.estudiante_primer_apellido,
    ].filter(p => !!p).join(' ');
  }

  porcentaje(parte: number, total: number): number {
    if (!total) {
      return 0;
    }
    return Math.round((parte / total) * 100);
  }
}
