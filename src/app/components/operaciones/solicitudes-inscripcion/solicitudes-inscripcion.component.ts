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

  // Todas las solicitudes; en la tabla van solo las de la pestaña activa
  private todas = [] as any[];
  // Abre en Pendientes: lo ya atendido no estorba a menos que se busque
  public pestanaActiva: string = 'pendientes';
  public pestanas = [
    { clave: 'pendientes', texto: 'Pendientes' },
    { clave: 'por_pagar', texto: 'Por pagar' },
    { clave: 'pagadas', texto: 'Pagadas' },
    { clave: 'rechazadas', texto: 'Rechazadas' },
    { clave: 'todas', texto: 'Todas' }
  ];

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
        this.todas = body.map((s: any) => {
          const estadoPago = this.estadoPago(s);
          return {
            ...s,
            nombre_estudiante: (s.nombre_estudiante || '').replace(/\s+/g, ' ').trim(),
            nombre_acudiente: (s.nombre_acudiente || '').replace(/\s+/g, ' ').trim(),
            institucion_mostrar: s.nombre_institucion || 'Particular',
            estado_pago: estadoPago,
            estado_mostrar: this.etiquetaEstado(s.estado, estadoPago),
            // Las resueltas se pintan en pastel (verde pagada o sin cobro,
            // amarillo por pagar, rosado rechazada) para que resalten las pendientes
            color: s.estado === 'rechazada' ? '#fcebea'
              : estadoPago === 'pagada' || estadoPago === 'sin_cobro' ? '#eaf6e6'
              : estadoPago === 'por_pagar' || estadoPago === 'pago_parcial' ? '#fff6dc' : ''
          };
        });
        this.aplicarPestana();
      },
      error: (error: any) => {
        console.error("Error al obtener las solicitudes", error);
        Swal.fire('Error', 'No se pudieron cargar las solicitudes.', 'error');
      }
    });
  }

  /**
   * Estado del cobro de una aprobada, con lo que se cobró al aprobar
   * (total_cobro) y lo que falta (saldo_cobro). Vacío si no está aprobada.
   */
  estadoPago(s: any): string {
    if (s.estado !== 'aprobada') return '';
    const total = Number(s.total_cobro || 0);
    const saldo = Number(s.saldo_cobro || 0);
    if (total <= 0) return 'sin_cobro';
    if (saldo <= 0) return 'pagada';
    if (saldo < total) return 'pago_parcial';
    return 'por_pagar';
  }

  etiquetaEstado(estado: string, estadoPago: string = ''): string {
    if (estado === 'rechazada') return 'Rechazada';
    if (estado !== 'aprobada') return 'Pendiente';
    const etiquetas: any = { pagada: 'Pagada', pago_parcial: 'Pago parcial', por_pagar: 'Por pagar', sin_cobro: 'Aprobada sin cobro' };
    return etiquetas[estadoPago] || 'Aprobada';
  }

  /** Solicitudes de una pestaña. Las aprobadas sin cobro solo salen en Todas. */
  private dePestana(clave: string): any[] {
    switch (clave) {
      case 'pendientes': return this.todas.filter(s => s.estado !== 'aprobada' && s.estado !== 'rechazada');
      case 'por_pagar': return this.todas.filter(s => s.estado_pago === 'por_pagar' || s.estado_pago === 'pago_parcial');
      case 'pagadas': return this.todas.filter(s => s.estado_pago === 'pagada');
      case 'rechazadas': return this.todas.filter(s => s.estado === 'rechazada');
      default: return this.todas;
    }
  }

  contar(clave: string): number {
    return this.dePestana(clave).length;
  }

  seleccionarPestana(clave: string) {
    this.pestanaActiva = clave;
    this.aplicarPestana();
  }

  private aplicarPestana() {
    this.datos = this.dePestana(this.pestanaActiva);
  }

  crearTitulos() {
    // Estudiante, curso y estado primero: es lo que se ve en las tarjetas del celular
    this.titulos = [
      {
        clave: 'nombre_estudiante',
        alias: 'Estudiante',
        alinear: 'izquierda',
      },
      {
        clave: 'nombre_curso',
        alias: 'Curso',
        alinear: 'izquierda',
      },
      {
        clave: 'estado_mostrar',
        alias: 'Estado',
        alinear: 'centrado',
      },
      {
        clave: 'fecha_registro',
        alias: 'Recibida',
        alinear: 'centrado',
      },
      {
        clave: 'est_numero_identificacion',
        alias: 'Documento',
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