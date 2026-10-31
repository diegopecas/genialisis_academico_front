import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import Swal from 'sweetalert2';
import { HeaderComponentAnidado } from '../../../../common/header-anidado/header-anidado.component';
import { TablasComponent } from '../../../../common/tablas/tablas.component';
import { ReportesCorreoColaboradoresService } from '../../../../services/reportes-correo-colaboradores.service';
import { ColaboradoresService } from '../../../../services/colaboradores.service';

/**
 * Reportes por correo de un colaborador, desde sus opciones. Crear y editar
 * llevan el colaborador fijo; Regresar vuelve a las opciones del colaborador.
 */
@Component({
  selector: 'app-reportes-correo-colaborador',
  templateUrl: './reportes-correo-colaborador.component.html',
  styleUrl: './reportes-correo-colaborador.component.scss',
  standalone: true,
  imports: [CommonModule, HeaderComponentAnidado, TablasComponent]
})
export class ReportesCorreoColaboradorComponent implements OnInit {

  public idColaborador = '0';
  public titulo = 'Reportes por Correo';
  public path = '/colaboradores/reportes-correo/crear/0/';
  public raiz = '/colaboradores/reportes-correo';

  public columnasFiltro = ['Tipo de reporte', 'Estado'];
  public titulos = [] as any[];
  public datos = [] as any[];

  public acciones = [
    { id: 'enviar', label: 'Enviar ahora', icono: '/assets/images/enviar-reporte-correo.png' }
  ];

  constructor(
    private reportesCorreoService: ReportesCorreoColaboradoresService,
    private colaboradoresService: ColaboradoresService,
    private route: ActivatedRoute,
    private router: Router,
  ) { }

  ngOnInit(): void {
    this.crearTitulos();
    this.route.params.subscribe(params => {
      this.idColaborador = params['id'];
      this.path = '/colaboradores/reportes-correo/crear/0/' + this.idColaborador;
      this.obtenerColaborador();
      this.obtenerReportes();
    });
  }

  obtenerColaborador() {
    this.colaboradoresService.obtenerById(this.idColaborador).subscribe((response: any) => {
      const body = (response.body || []) as any[];
      if (body.length > 0) {
        const c = body[0];
        const nombre = [c.primer_nombre, c.segundo_nombre, c.primer_apellido, c.segundo_apellido].filter(Boolean).join(' ');
        this.titulo = 'Reportes por Correo de ' + nombre;
      }
    });
  }

  obtenerReportes() {
    this.reportesCorreoService.obtenerByColaborador(this.idColaborador).subscribe((response: any) => {
      const body = (response.body || []) as any[];
      this.datos = body.map((reporte: any) => ({
        ...reporte,
        estado_texto: reporte.activo == 1 ? 'Activo' : 'Inactivo',
        ultimo_envio_texto: this.textoUltimoEnvio(reporte),
        // Los inactivos se ven en gris para distinguirlos en el listado
        color: reporte.activo == 1 ? '' : '#f1f1f1'
      }));
    });
  }

  /** Fecha y resultado del último envío, con el error si falló. */
  textoUltimoEnvio(reporte: any): string {
    if (!reporte.ultimo_envio) {
      return 'Sin envíos';
    }
    const [fecha, hora] = String(reporte.ultimo_envio).split(' ');
    const [anio, mes, dia] = fecha.split('-');
    const texto = `${dia}/${mes}/${anio} ${(hora || '').substring(0, 5)}`;
    return reporte.ultimo_exito == 1
      ? `✅ ${texto}`
      : `❌ ${texto} - ${reporte.ultimo_error || 'Falló'}`;
  }

  crearTitulos() {
    this.titulos = [
      { clave: 'nombre_tipo', alias: 'Tipo de reporte', alinear: 'izquierda' },
      { clave: 'estado_texto', alias: 'Estado', alinear: 'centrado' },
      { clave: 'ultimo_envio_texto', alias: 'Último envío', alinear: 'izquierda' },
    ];
  }

  clicAccion($event: any) {
    switch ($event.accion) {
      case 'editar':
        this.router.navigate([this.raiz + '/editar/' + $event.registro.id + '/' + this.idColaborador]);
        break;
      case 'eliminar':
        this.eliminarReporte($event.registro);
        break;
      case 'enviar':
        this.enviarAhora($event.registro);
        break;
    }
  }

  async enviarAhora(reporte: any) {
    const result = await Swal.fire({
      title: 'Enviar ahora',
      text: `¿Enviar el reporte "${reporte.nombre_tipo}" de hoy a ${reporte.correo_electronico || 'este colaborador'}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#d4af37',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Sí, enviar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      this.reportesCorreoService.enviarAhora(reporte.id).subscribe({
        next: () => {
          Swal.fire('Enviado', 'El reporte salió al correo del colaborador.', 'success');
          this.obtenerReportes();
        },
        error: (error: any) => {
          // El mensaje del backend lo muestra el interceptor; el intento queda en el historial.
          console.error("Error al enviar el reporte", error);
          this.obtenerReportes();
        }
      });
    }
  }

  async eliminarReporte(reporte: any) {
    const result = await Swal.fire({
      title: '¿Está seguro?',
      text: `¿Desea quitar el reporte "${reporte.nombre_tipo}"? También se borra su historial de envíos.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      this.reportesCorreoService.eliminar({ id: reporte.id }).subscribe({
        next: () => {
          Swal.fire('Eliminado', 'El reporte por correo ha sido eliminado.', 'success');
          this.obtenerReportes();
        },
        error: (error: any) => {
          console.error("Error al eliminar el reporte por correo", error);
        }
      });
    }
  }
}
