import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { HeaderComponent } from '../../../common/header/header.component';
import { TablasComponent } from '../../../common/tablas/tablas.component';
import { FechaInputComponent } from '../../../common/fecha-input/fecha-input.component';
import { HistorialReportesCorreoService } from '../../../services/historial-reportes-correo.service';

/**
 * Historial de los reportes enviados por correo a los colaboradores. El rango
 * de fechas se consulta al back; tipo, colaborador, origen y resultado se
 * filtran en la tabla.
 */
@Component({
  selector: 'app-reporte-historial-reportes-correo',
  templateUrl: './reporte-historial-reportes-correo.component.html',
  styleUrl: './reporte-historial-reportes-correo.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, TablasComponent, FechaInputComponent],
})
export class ReporteHistorialReportesCorreoComponent implements OnInit {
  titulo = 'Historial de Reportes por Correo';

  public titulos = [] as any[];
  public datos = [] as any[];
  public columnasFiltro = ['Tipo de reporte', 'Colaborador', 'Origen', 'Resultado'];

  // Rango consultado al backend. Por defecto, el mes en curso.
  public fechaInicio = '';
  public fechaFin = '';

  // Resumen calculado sobre lo que la tabla deja después de filtrar
  public totalEnvios = 0;
  public totalEnviados = 0;
  public totalFallidos = 0;

  public cargando = false;

  constructor(private historialService: HistorialReportesCorreoService) {}

  ngOnInit(): void {
    const hoy = new Date();
    this.fechaInicio = this.formatoIso(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
    this.fechaFin = this.formatoIso(hoy);
    this.titulos = this.historialService.titulosTabla(true);
    this.consultar();
  }

  consultar(): void {
    if (!this.fechaInicio || !this.fechaFin) {
      Swal.fire('Fechas incompletas', 'Escribe la fecha inicial y la final', 'warning');
      return;
    }
    if (this.fechaInicio > this.fechaFin) {
      Swal.fire('Rango inválido', 'La fecha inicial no puede ser mayor que la final', 'warning');
      return;
    }

    this.cargando = true;
    this.historialService.obtener(this.fechaInicio, this.fechaFin).subscribe({
      next: (response: any) => {
        const body = (response.body || []) as any[];
        this.datos = body.map((item: any) => this.historialService.paraTabla(item));
        this.actualizarResumen(this.datos);
        this.cargando = false;
      },
      error: () => {
        // El mensaje del backend lo muestra el interceptor
        this.datos = [];
        this.actualizarResumen(this.datos);
        this.cargando = false;
      },
    });
  }

  /** El resumen sigue lo que muestra la tabla, no el total cargado. */
  actualizarResumen(filas: any[]): void {
    const datos = filas || [];
    this.totalEnvios = datos.length;
    this.totalEnviados = datos.filter((d) => d.exito == 1).length;
    this.totalFallidos = this.totalEnvios - this.totalEnviados;
  }

  private formatoIso(fecha: Date): string {
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${fecha.getFullYear()}-${mes}-${dia}`;
  }
}
