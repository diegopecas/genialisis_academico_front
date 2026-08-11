import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import Swal from 'sweetalert2';
import { HeaderComponent } from '../../../../common/header/header.component';
import { TablasComponent } from '../../../../common/tablas/tablas.component';
import { MoraEjecucionesService } from '../../../../services/mora-ejecuciones.service';
import { UtilService } from '../../../../common/constantes/util.service';

@Component({
  selector: 'app-mora-ejecuciones',
  standalone: true,
  imports: [CommonModule, HeaderComponent, TablasComponent],
  templateUrl: './mora-ejecuciones.component.html',
  styleUrl: './mora-ejecuciones.component.scss'
})
export class MoraEjecucionesComponent implements OnInit {
  titulo = 'Proceso de Mora';
  public titulos = [] as any[];
  public datos = [] as any[];
  public estado: any = null;
  public liquidando = false;

  constructor(
    private moraEjecucionesService: MoraEjecucionesService,
    private utilService: UtilService
  ) {}

  ngOnInit(): void {
    this.crearTitulos();
    this.obtenerEstado();
    this.obtenerEjecuciones();
  }

  crearTitulos() {
    this.titulos = [
      { clave: 'fecha_corte', alias: 'Corte', alinear: 'centrado' },
      { clave: 'fecha_inicio', alias: 'Ejecutado', alinear: 'centrado' },
      { clave: 'origen', alias: 'Origen', alinear: 'centrado' },
      { clave: 'cuentas_evaluadas', alias: 'Evaluadas', alinear: 'derecha' },
      { clave: 'cuentas_con_mora', alias: 'Con mora', alinear: 'derecha' },
      { clave: 'total_formateado', alias: 'Mora causada', alinear: 'derecha' },
      { clave: 'duracion_texto', alias: 'Duración', alinear: 'centrado' },
      { clave: 'estado', alias: 'Estado', alinear: 'centrado' },
    ];
  }

  obtenerEstado() {
    this.moraEjecucionesService.obtenerEstado().subscribe({
      next: (response: any) => {
        this.estado = response.body || response;
      },
      error: (error) => {
        console.error('Error al obtener el estado del proceso de mora:', error);
      }
    });
  }

  obtenerEjecuciones() {
    this.moraEjecucionesService.obtenerTodos(60).subscribe({
      next: (response: any) => {
        const body = response.body || response;
        this.datos = (body as any[]).map((e: any) => ({
          ...e,
          total_formateado: '$' + Number(e.valor_total_causado).toLocaleString('es-CO'),
          duracion_texto: e.duracion_segundos !== null ? e.duracion_segundos + ' s' : '',
          color: e.estado === 'ERROR' ? '#f8d7da' : ''
        }));
      },
      error: (error) => {
        console.error('Error al obtener las ejecuciones de mora:', error);
      }
    });
  }

  /**
   * Alerta visible cuando el cron lleva mas de un dia sin correr. La mora se
   * recalcula completa en cada corte, asi que no se pierde nada, pero la
   * cartera se ve desactualizada hasta que vuelva a correr.
   */
  get cronRetrasado(): boolean {
    return !!this.estado && this.estado.dias_sin_correr !== null && this.estado.dias_sin_correr > 1;
  }

  get faltaFechaArranque(): boolean {
    return !!this.estado && !this.estado.fecha_arranque;
  }

  liquidarAhora() {
    Swal.fire({
      title: '¿Liquidar la mora ahora?',
      text: 'Se recalcula la mora de todas las cuentas vencidas con la fecha de hoy.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, liquidar',
      cancelButtonText: 'Cancelar'
    }).then((resultado) => {
      if (!resultado.isConfirmed) {
        return;
      }

      this.liquidando = true;

      this.moraEjecucionesService.liquidar({
        origen: 'MANUAL',
        id_usuario: this.utilService.obtenerIdUsuarioActual()
      }).subscribe({
        next: (respuesta: any) => {
          this.liquidando = false;

          if (respuesta?.mensaje) {
            Swal.fire('Atención', respuesta.mensaje, 'warning');
          } else {
            Swal.fire(
              'Listo',
              `Se evaluaron ${respuesta.cuentas_evaluadas} cuentas y ${respuesta.cuentas_con_mora} quedaron con mora.`,
              'success'
            );
          }

          this.obtenerEstado();
          this.obtenerEjecuciones();
        },
        error: (error) => {
          this.liquidando = false;
          console.error('Error al liquidar la mora:', error);
          Swal.fire('Error', 'No se pudo liquidar la mora', 'error');
        }
      });
    });
  }
}
