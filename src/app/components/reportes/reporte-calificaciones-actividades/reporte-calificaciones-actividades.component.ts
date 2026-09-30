import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { HeaderComponent } from '../../../common/header/header.component';
import { TablasComponent } from '../../../common/tablas/tablas.component';
import { CalificacionesService } from '../../../services/calificaciones.service';
import { CortesAcademicosService } from '../../../services/cortes-academicos.service';
import { GruposService } from '../../../services/grupos.service';

/**
 * Reporte de calificaciones por actividad.
 * Se escoge un corte académico y un grupo; sale una fila por estudiante y
 * actividad del grupo en los sprints del corte. Las columnas de calificación
 * no están fijas: salen de los parámetros que tenga configurados el jardín,
 * y cada celda muestra el valor cuantitativo y el cualitativo.
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
    'Sprint',
    'Área',
  ];

  public cortes = [] as any[];
  public grupos = [] as any[];
  public idCorteSeleccionado: any = '';
  public idGrupoSeleccionado: any = '';

  public cargando = false;
  // Para no mostrar la tabla vacía antes de la primera consulta
  public consultado = false;

  // Resumen del pie
  public totalEstudiantes = 0;
  public totalActividades = 0;

  constructor(
    private calificacionesService: CalificacionesService,
    private cortesAcademicosService: CortesAcademicosService,
    private gruposService: GruposService
  ) {}

  ngOnInit(): void {
    this.crearTitulos([]);
    this.cargarCortes();
    this.cargarGrupos();
  }

  cargarCortes(): void {
    this.cortesAcademicosService.obtenerTodos().subscribe({
      next: (response: any) => {
        this.cortes = response.body || [];
        // Por defecto el corte en el que cae la fecha de hoy
        const hoy = this.formatoIso(new Date());
        const corteActual = this.cortes.find((c: any) =>
          c.fecha_inicio && c.fecha_fin && c.fecha_inicio <= hoy && hoy <= c.fecha_fin);
        if (corteActual) {
          this.idCorteSeleccionado = corteActual.id;
        }
      },
      error: () => { this.cortes = []; },
    });
  }

  cargarGrupos(): void {
    this.gruposService.obtenerTodos().subscribe({
      next: (response: any) => { this.grupos = response.body || []; },
      error: () => { this.grupos = []; },
    });
  }

  consultar(): void {
    if (!this.idCorteSeleccionado || !this.idGrupoSeleccionado) {
      Swal.fire('Filtros incompletos', 'Selecciona el corte académico y el grupo', 'warning');
      return;
    }

    this.cargando = true;
    this.calificacionesService
      .obtenerReporteCalificacionesActividades(this.idCorteSeleccionado, this.idGrupoSeleccionado)
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
          this.consultado = true;
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
      { clave: 'nombre_sprint', alias: 'Sprint', alinear: 'izquierda' },
      { clave: 'fecha_texto', alias: 'Fecha de ejecución', alinear: 'centrado' },
      { clave: 'nombre_area', alias: 'Área', alinear: 'izquierda' },
      { clave: 'titulo_actividad', alias: 'Actividad', alinear: 'izquierda' },
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
