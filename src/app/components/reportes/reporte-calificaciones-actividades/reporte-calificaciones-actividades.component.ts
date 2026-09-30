import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { HeaderComponent } from '../../../common/header/header.component';
import { TablasComponent } from '../../../common/tablas/tablas.component';
import { CalificacionesService } from '../../../services/calificaciones.service';

/**
 * Reporte de calificaciones por actividad.
 * Se escoge un rango de fechas; salen todas las actividades de grupo y de
 * cursos extracurriculares del rango, una fila por estudiante y actividad en
 * la que estuvo. Las columnas de calificación no están fijas: salen de los
 * parámetros que tenga configurados el jardín, y cada celda muestra el valor
 * cuantitativo y el cualitativo.
 */
@Component({
  selector: 'app-reporte-calificaciones-actividades',
  templateUrl: './reporte-calificaciones-actividades.component.html',
  styleUrl: './reporte-calificaciones-actividades.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, TablasComponent],
})
export class ReporteCalificacionesActividadesComponent implements OnInit {
  titulo = 'Calificaciones por Actividad';

  public titulos = [] as any[];
  public datos = [] as any[];
  public columnasFiltro: (string | { columna: string, tipoFiltro?: 'fecha' | 'normal' | 'rango' | 'lista' })[] = [
    'Estudiante',
    'Tipo',
    'Grupo / Curso',
    'Área',
    'Ejecutada por',
  ];

  // Rango consultado al backend. Por defecto, el mes en curso.
  public fechaInicio = '';
  public fechaFin = '';

  public cargando = false;

  // Resumen del pie, calculado sobre lo que la tabla deja después de filtrar
  public totalEstudiantes = 0;
  public totalActividades = 0;

  constructor(private calificacionesService: CalificacionesService) {}

  ngOnInit(): void {
    const hoy = new Date();
    this.fechaInicio = this.formatoIso(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
    this.fechaFin = this.formatoIso(hoy);
    this.crearTitulos([]);
    this.consultar();
  }

  consultar(): void {
    if (!this.fechaInicio || !this.fechaFin) {
      Swal.fire('Fechas incompletas', 'Selecciona la fecha inicial y la final', 'warning');
      return;
    }
    if (this.fechaInicio > this.fechaFin) {
      Swal.fire('Rango inválido', 'La fecha inicial no puede ser mayor que la final', 'warning');
      return;
    }

    this.cargando = true;
    this.calificacionesService
      .obtenerReporteCalificacionesActividades(this.fechaInicio, this.fechaFin)
      .subscribe({
        next: (response: any) => {
          const body = response.body || {};
          const parametros = (body.parametros || []) as any[];
          const filas = (body.filas || []) as any[];

          this.crearTitulos(parametros);
          this.datos = filas.map((fila: any) => {
            const registro: any = {
              ...fila,
              fecha_texto: this.formatearFecha(fila.fecha_ejecucion),
              nombre_area: fila.nombre_area || '',
              ejecutada_por: fila.ejecutada_por || '',
            };
            // Una columna por parámetro: "4 · Logrado", vacía si no lo calificaron
            for (const parametro of parametros) {
              const calificacion = fila.calificaciones ? fila.calificaciones[parametro.id] : null;
              registro['param_' + parametro.id] = calificacion
                ? `${calificacion.valor_cuantitativo} · ${calificacion.valor_cualitativo}`
                : '';
            }
            return registro;
          });

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

  crearTitulos(parametros: any[]): void {
    this.titulos = [
      { clave: 'nombre_estudiante', alias: 'Estudiante', alinear: 'izquierda' },
      { clave: 'tipo', alias: 'Tipo', alinear: 'centrado' },
      { clave: 'nombre_grupo_curso', alias: 'Grupo / Curso', alinear: 'izquierda' },
      { clave: 'nombre_sprint', alias: 'Sprint', alinear: 'izquierda' },
      { clave: 'fecha_texto', alias: 'Fecha de ejecución', alinear: 'centrado' },
      { clave: 'nombre_area', alias: 'Área', alinear: 'izquierda' },
      { clave: 'titulo_actividad', alias: 'Actividad', alinear: 'izquierda' },
      { clave: 'ejecutada_por', alias: 'Ejecutada por', alinear: 'izquierda' },
    ];

    for (const parametro of parametros) {
      this.titulos.push({ clave: 'param_' + parametro.id, alias: parametro.nombre, alinear: 'centrado' });
    }
  }

  /** Resumen sobre lo que deja la tabla después de filtrar. */
  actualizarResumen(registros: any[]): void {
    this.totalEstudiantes = new Set(registros.map((r: any) => r.id_estudiante)).size;
    this.totalActividades = new Set(registros.map((r: any) => r.id_tarea_x_sprint)).size;
  }

  private formatearFecha(valor: any): string {
    if (!valor) return '';
    const [anio, mes, dia] = String(valor).substring(0, 10).split('-');
    return dia && mes && anio ? `${dia}/${mes}/${anio}` : '';
  }

  private formatoIso(fecha: Date): string {
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${fecha.getFullYear()}-${mes}-${dia}`;
  }
}
