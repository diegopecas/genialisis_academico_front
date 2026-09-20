// ========== ver-solicitud-inscripcion.component.ts ==========
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HeaderComponent } from '../../../../common/header/header.component';
import { SolicitudesInscripcionPublicaService } from '../../../../services/solicitudes-inscripcion-publica.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-ver-solicitud-inscripcion',
  templateUrl: './ver-solicitud-inscripcion.component.html',
  styleUrl: './ver-solicitud-inscripcion.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent]
})
export class VerSolicitudInscripcionComponent implements OnInit {

  public titulo = 'Solicitud de Inscripción';
  public regresar = '/operaciones/solicitudes-inscripcion';
  public id: string = '';
  public cargando: boolean = true;
  public procesando: boolean = false;
  public solicitud: any = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private solicitudesService: SolicitudesInscripcionPublicaService
  ) { }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.id = params['id'];
      this.cargar();
    });
  }

  cargar() {
    this.solicitudesService.obtenerById(this.id).subscribe({
      next: (response: any) => {
        const body = response.body || [];
        this.cargando = false;

        if (body.length === 0) {
          Swal.fire('No encontrada', 'La solicitud no existe.', 'warning').then(() => this.volver());
          return;
        }

        this.solicitud = body[0];
        this.titulo = 'Solicitud de ' + this.nombreEstudiante();
      },
      error: (error: any) => {
        this.cargando = false;
        console.error('Error al cargar la solicitud', error);
        Swal.fire('Error', 'No se pudo cargar la solicitud.', 'error');
      }
    });
  }

  nombreEstudiante(): string {
    if (!this.solicitud) return '';
    return [
      this.solicitud.est_primer_nombre,
      this.solicitud.est_segundo_nombre,
      this.solicitud.est_primer_apellido,
      this.solicitud.est_segundo_apellido
    ].filter(Boolean).join(' ');
  }

  nombreAcudiente(): string {
    if (!this.solicitud) return '';
    return [this.solicitud.acu_primer_nombre, this.solicitud.acu_primer_apellido]
      .filter(Boolean).join(' ');
  }

  esPendiente(): boolean {
    return this.solicitud && this.solicitud.estado === 'pendiente';
  }

  etiquetaEstado(): string {
    if (!this.solicitud) return '';
    if (this.solicitud.estado === 'aprobada') return 'Aprobada';
    if (this.solicitud.estado === 'rechazada') return 'Rechazada';
    return 'Pendiente';
  }

  /**
   * Aprobar crea la persona, el estudiante, el acudiente y la inscripción.
   * NO genera las cuentas por cobrar: eso se hace después desde la pantalla
   * de inscripción, donde se revisan los valores antes de emitir.
   */
  async aprobar() {
    const result = await Swal.fire({
      title: '¿Aprobar la solicitud?',
      html: `Se va a crear el estudiante <b>${this.nombreEstudiante()}</b> y se inscribirá a ` +
            `<b>${this.solicitud.nombre_curso}</b>.<br><br>` +
            `Las cuentas por cobrar no se generan aquí: quedan para la pantalla de inscripción.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, aprobar',
      cancelButtonText: 'Cancelar'
    });

    if (!result.isConfirmed) {
      return;
    }

    this.procesando = true;

    this.solicitudesService.aprobar(this.id).subscribe({
      next: (response: any) => {
        this.procesando = false;
        Swal.fire('Aprobada', response.mensaje || 'El estudiante quedó inscrito.', 'success');
        this.cargar();
      },
      error: (error: any) => {
        this.procesando = false;
        console.error('Error al aprobar la solicitud', error);
        // El back responde 400 con el motivo: cupo lleno, ya resuelta, etc.
        const mensaje = error?.error?.error || 'No se pudo aprobar la solicitud.';
        Swal.fire('No se pudo aprobar', mensaje, 'error');
      }
    });
  }

  async rechazar() {
    const result = await Swal.fire({
      title: 'Rechazar la solicitud',
      input: 'textarea',
      inputLabel: 'Motivo (opcional)',
      inputPlaceholder: 'Por qué se rechaza...',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Rechazar',
      cancelButtonText: 'Cancelar'
    });

    if (!result.isConfirmed) {
      return;
    }

    this.procesando = true;

    this.solicitudesService.rechazar(this.id, result.value || null).subscribe({
      next: () => {
        this.procesando = false;
        Swal.fire('Rechazada', 'La solicitud quedó rechazada.', 'success');
        this.cargar();
      },
      error: (error: any) => {
        this.procesando = false;
        console.error('Error al rechazar la solicitud', error);
        const mensaje = error?.error?.error || 'No se pudo rechazar la solicitud.';
        Swal.fire('Error', mensaje, 'error');
      }
    });
  }

  // Lleva a la inscripción creada, que es donde se generan las cuentas
  irAInscripcion() {
    if (!this.solicitud?.id_estudiante_creado) {
      return;
    }
    this.router.navigate(['/estudiantes/vista-estudiante/' + this.solicitud.id_estudiante_creado]);
  }

  volver() {
    this.router.navigate([this.regresar]);
  }
}