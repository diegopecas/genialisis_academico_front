import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { HeaderComponentAnidado } from '../../../common/header-anidado/header-anidado.component';
import { TablasComponent } from '../../../common/tablas/tablas.component';
import { ReportesCorreoColaboradoresService } from '../../../services/reportes-correo-colaboradores.service';

/**
 * Listado de los reportes por correo asociados a cada colaborador. El cron
 * los envía cada tarde; con "Enviar ahora" se manda el de hoy para probar.
 * Crear abre la asignación grupal (un tipo de reporte para varios colaboradores).
 */
@Component({
  selector: 'app-reportes-correo',
  templateUrl: './reportes-correo.component.html',
  styleUrl: './reportes-correo.component.scss',
  standalone: true,
  imports: [CommonModule, HeaderComponentAnidado, TablasComponent]
})
export class ReportesCorreoComponent implements OnInit {

  titulo = "Reportes por Correo";
  raiz = '/colaboradores/reportes-correo';
  public columnasFiltro = ['Colaborador', 'Tipo de reporte', 'Estado', 'Último envío'];
  public titulos = [] as any[];
  public datos = [] as any[];

  public acciones = [
    { id: 'enviar', label: 'Enviar ahora', icono: '/assets/images/enviar-reporte-correo.png' }
  ];

  constructor(
    private reportesCorreoService: ReportesCorreoColaboradoresService,
    private router: Router,
  ) { }

  ngOnInit(): void {
    this.crearTitulos();
    this.obtenerReportes();
  }

  obtenerReportes() {
    this.reportesCorreoService.obtenerTodos().subscribe((response: any) => {
      const body = (response.body || []) as any[];
      this.datos = body.map((reporte: any) => ({
        ...reporte,
        correo_texto: reporte.correo_electronico || 'Sin correo',
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
    const fecha = this.formatearFecha(reporte.ultimo_envio);
    return reporte.ultimo_exito == 1
      ? `✅ ${fecha}`
      : `❌ ${fecha} - ${reporte.ultimo_error || 'Falló'}`;
  }

  formatearFecha(valor: string): string {
    const [fecha, hora] = valor.split(' ');
    const [anio, mes, dia] = fecha.split('-');
    return `${dia}/${mes}/${anio} ${(hora || '').substring(0, 5)}`;
  }

  crearTitulos() {
    this.titulos = [
      {
        clave: 'nombre_colaborador',
        alias: 'Colaborador',
        alinear: 'izquierda',
      },
      {
        clave: 'correo_texto',
        alias: 'Correo',
        alinear: 'izquierda',
      },
      {
        clave: 'nombre_tipo',
        alias: 'Tipo de reporte',
        alinear: 'izquierda',
      },
      {
        clave: 'estado_texto',
        alias: 'Estado',
        alinear: 'centrado',
      },
      {
        clave: 'ultimo_envio_texto',
        alias: 'Último envío',
        alinear: 'izquierda',
      },
    ];
  }

  clicAccion($event: any) {
    switch ($event.accion) {
      case 'editar':
        this.router.navigate([this.raiz + '/editar/' + $event.registro.id]);
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
      text: `¿Enviar el reporte de hoy a ${reporte.nombre_colaborador} (${reporte.correo_texto})?`,
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
      text: `¿Desea quitarle a ${reporte.nombre_colaborador} el reporte "${reporte.nombre_tipo}"? También se borra su historial de envíos.`,
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
