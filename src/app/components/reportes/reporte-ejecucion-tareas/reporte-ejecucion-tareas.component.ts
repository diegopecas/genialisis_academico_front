import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../../common/header/header.component';
import { TablasComponent } from '../../../common/tablas/tablas.component';
import { TareasXSprintsService } from '../../../services/tareas-x-sprints.service';
import { SprintsService } from '../../../services/sprints.service';
import { CalificacionesService } from '../../../services/calificaciones.service';
import { TareasXSprintsXEstudianteService } from '../../../services/tareas-x-sprints-x-estudiante.service';

@Component({
  selector: 'app-reporte-ejecucion-tareas',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, TablasComponent],
  templateUrl: './reporte-ejecucion-tareas.component.html',
  styleUrl: './reporte-ejecucion-tareas.component.scss',
})
export class ReporteEjecucionTareasComponent implements OnInit {
  titulo = 'Reporte de Ejecución de Tareas';

  cargando = false;
  anioSeleccionado: any = '';
  sprintSeleccionado: any = '';
  aniosDisponibles: number[] = [];
  sprintsDisponibles: any[] = [];
  sprintsFiltrados: any[] = [];

  datos: any[] = [];
  datosFiltrados: any[] = [];
  estadisticas: any = {};
  titulos: any[] = [];
  acciones: any[] = [];

  parametros: any[] = [];
  calificacionesPorTarea: any = {};
  seleccionados: any[] = [];

  resumenParametros: any[] = [];
  promedioAsistencia: number = 0;

  // Modal detalle estudiantes
  mostrarModalDetalle: boolean = false;
  tareaDetalle: any = null;
  estudiantesDetalle: any[] = [];
  cargandoDetalle: boolean = false;

  constructor(
    private tareasService: TareasXSprintsService,
    private sprintsService: SprintsService,
    private calificacionesService: CalificacionesService,
    private tareasEstudianteService: TareasXSprintsXEstudianteService
  ) {}

  ngOnInit() {
    this.cargarSprints();
  }

  cargarSprints() {
    this.sprintsService.obtenerTodos().subscribe({
      next: (resp: any) => {
        this.sprintsDisponibles = resp.body || [];
        const anios = [...new Set(this.sprintsDisponibles.map((s: any) => {
          return parseInt((s.fecha_inicial || '').substring(0, 4));
        }).filter((a: number) => !isNaN(a)))];
        this.aniosDisponibles = anios.sort((a: number, b: number) => b - a);

        const sprintActual = this.sprintsDisponibles.find((s: any) => s.actual == 1);
        if (sprintActual) {
          const anioActual = parseInt((sprintActual.fecha_inicial || '').substring(0, 4));
          this.anioSeleccionado = anioActual;
          this.filtrarSprints();
          this.sprintSeleccionado = sprintActual.id;
        } else if (this.aniosDisponibles.length > 0) {
          this.anioSeleccionado = this.aniosDisponibles[0];
          this.filtrarSprints();
        }
        this.cargarDatos();
      },
      error: () => { this.sprintsDisponibles = []; }
    });
  }

  filtrarSprints() {
    if (this.anioSeleccionado) {
      this.sprintsFiltrados = this.sprintsDisponibles.filter((s: any) => {
        const anio = parseInt((s.fecha_inicial || '').substring(0, 4));
        return anio === parseInt(this.anioSeleccionado);
      });
    } else {
      this.sprintsFiltrados = this.sprintsDisponibles;
    }
    this.sprintSeleccionado = '';
  }

  onAnioChange() {
    this.filtrarSprints();
    this.cargarDatos();
  }

  onSprintChange() {
    this.cargarDatos();
  }

  cargarDatos() {
    this.cargando = true;
    this.tareasService.obtenerReporteEjecucionTareas(
      this.anioSeleccionado || null,
      this.sprintSeleccionado || null
    ).subscribe({
      next: (r: any) => {
        const resp = r.body || r;
        if (resp && resp.registros) {
          this.parametros = resp.parametros || [];
          this.calificacionesPorTarea = resp.calificaciones_por_tarea || {};
          this.procesarDatos(resp.registros);
          this.estadisticas = resp.estadisticas || {};
        } else {
          this.datos = [];
          this.parametros = [];
          this.calificacionesPorTarea = {};
          this.estadisticas = {};
        }
        this.crearTitulos();
        this.cargando = false;
        this.recalcularResumen(this.datos);
      },
      error: () => { this.datos = []; this.estadisticas = {}; this.cargando = false; },
    });
  }

  procesarDatos(registros: any[]) {
    this.datos = registros.map((item: any) => {
      const fila: any = {
        ...item,
        horario_texto: item.hora_inicial_horario && item.hora_final_horario
          ? item.hora_inicial_horario.substring(0, 5) + ' - ' + item.hora_final_horario.substring(0, 5)
          : '',
        hora_inicio_real: item.fecha_ejecucion_inicia ? item.fecha_ejecucion_inicia.substring(11, 16) : '',
        hora_fin_real: item.fecha_finalizacion ? item.fecha_finalizacion.substring(11, 16) : '',
        tardanza_texto: this.formatearTardanza(item.tardanza_minutos),
        es_adicional_texto: item.es_tarea_adicional == 1 ? 'Sí' : 'No',
        dispositivo_corto: this.extraerDispositivo(item.user_agent || ''),
        cambio_dispositivo_texto: item.cambio_dispositivo == 1 ? '⚠️ Sí' : 'No',
        dispositivo_de: item.dispositivo_de ? '🚨 ' + item.dispositivo_de : '',
        estudiantes_texto: (item.total_estudiantes_calificados || 0) + '/' + (item.total_estudiantes_grupo || '?'),
        porcentaje_asistencia: item.total_estudiantes_grupo > 0
          ? Math.round((item.total_estudiantes_calificados || 0) / item.total_estudiantes_grupo * 100) + '%'
          : '-',
        color: item.dispositivo_de ? '#ffcdd2'
          : item.cambio_dispositivo == 1 ? '#fff3cd'
          : item.tardanza_minutos > 0 ? '#fff8e1'
          : item.id_estado_tarea == 2 ? '#e8f5e9'
          : '',
      };

      // Columnas dinámicas: iconos FA con conteos y colores
      const calificaciones = this.calificacionesPorTarea[item.id] || [];
      for (const param of this.parametros) {
        const calParam = calificaciones.filter((c: any) => c.id_parametro_calificacion == param.id);
        let htmlParam = '';
        for (const val of param.valores) {
          const conteo = calParam.filter((c: any) => c.id_valor_parametro_calificacion == val.id).length;
          if (conteo > 0) {
            const color = this.obtenerColorIcono(val.valor_cuantitativo, param.valores.length);
            if (htmlParam) htmlParam += '&nbsp; ';
            htmlParam += `<i class="fa ${val.icono}" style="color:${color}" title="${val.valor_cualitativo}"></i>&nbsp;${conteo}`;
          }
        }
        fila['param_' + param.id] = htmlParam || '<span style="color:#ccc">-</span>';
      }

      return fila;
    });
  }

  crearTitulos() {
    this.titulos = [
      { clave: 'anio_sprint', alias: 'Año', alinear: 'centrado' },
      { clave: 'nombre_sprint', alias: 'Sprint', alinear: 'centrado' },
      { clave: 'fecha_ejecucion', alias: 'Fecha', alinear: 'centrado', tipo: 'date' },
      { clave: 'nombre_grupo', alias: 'Grupo', alinear: 'centrado' },
      { clave: 'nombre_area', alias: 'Área', alinear: 'centrado' },
      { clave: 'titulo_actividad', alias: 'Actividad', alinear: 'izquierda' },
      { clave: 'nombre_ambiente', alias: 'Ambiente', alinear: 'centrado' },
      { clave: 'materiales_actividad', alias: 'Materiales', alinear: 'izquierda' },
      { clave: 'nombre_estado', alias: 'Estado', alinear: 'centrado' },
      { clave: 'nombre_docente_inicia', alias: 'Docente Inicia', alinear: 'izquierda' },
      { clave: 'horario_texto', alias: 'Horario', alinear: 'centrado' },
      { clave: 'hora_inicio_real', alias: 'Hora Inicio', alinear: 'centrado' },
      { clave: 'hora_fin_real', alias: 'Hora Fin', alinear: 'centrado' },
      { clave: 'duracion_real_minutos', alias: 'Duración (min)', alinear: 'centrado' },
      { clave: 'tardanza_texto', alias: 'Tardanza', alinear: 'centrado' },
      { clave: 'estudiantes_texto', alias: 'Estudiantes', alinear: 'centrado' },
      { clave: 'porcentaje_asistencia', alias: '% Asistencia', alinear: 'centrado' },
    ];

    for (const param of this.parametros) {
      this.titulos.push({
        clave: 'param_' + param.id,
        alias: param.nombre,
        alinear: 'centrado',
        tipo: 'html'
      });
    }

    this.titulos.push(
      { clave: 'observacion_general', alias: 'Observación', alinear: 'izquierda' },
      { clave: 'es_adicional_texto', alias: 'Adicional', alinear: 'centrado' },
      { clave: 'huella_dispositivo', alias: 'Huella', alinear: 'centrado' },
      { clave: 'dispositivo_corto', alias: 'Dispositivo', alinear: 'centrado' },
      { clave: 'cambio_dispositivo_texto', alias: 'Cambió Disp.', alinear: 'centrado' },
      { clave: 'dispositivo_de', alias: 'Dispositivo de', alinear: 'centrado' },
    );
  }

  onSeleccionCambiada(seleccionados: any[]) {
    this.seleccionados = seleccionados;
    this.recalcularResumen(seleccionados.length > 0 ? seleccionados : this.datosFiltrados.length > 0 ? this.datosFiltrados : this.datos);
  }

  onDatosFiltradosCambiados(filtrados: any[]) {
    this.datosFiltrados = filtrados;
    if (this.seleccionados.length === 0) {
      this.recalcularResumen(filtrados);
    }
  }

  recalcularResumen(registros: any[]) {
    const ejecutadas = registros.filter((r: any) => r.id_estado_tarea == 2);
    const totalClases = ejecutadas.length;

    // Recalcular estadísticas
    this.estadisticas = {
      total: registros.length,
      ejecutadas: ejecutadas.length,
      pendientes: registros.filter((r: any) => r.id_estado_tarea == 1).length,
      adicionales: registros.filter((r: any) => r.es_tarea_adicional == 1).length,
      con_tardanza: registros.filter((r: any) => r.tardanza_minutos !== null && r.tardanza_minutos > 0).length,
      cambio_dispositivo: registros.filter((r: any) => r.cambio_dispositivo == 1).length
    };

    if (totalClases > 0) {
      const porcentajes = ejecutadas
        .filter((r: any) => r.total_estudiantes_grupo > 0)
        .map((r: any) => ((r.total_estudiantes_calificados || 0) / r.total_estudiantes_grupo) * 100);
      this.promedioAsistencia = porcentajes.length > 0
        ? Math.round(porcentajes.reduce((a: number, b: number) => a + b, 0) / porcentajes.length)
        : 0;
    } else {
      this.promedioAsistencia = 0;
    }

    this.resumenParametros = this.parametros.map((param: any) => {
      const resumenValores = param.valores.map((val: any) => {
        let totalConteo = 0;
        for (const reg of ejecutadas) {
          const calificaciones = this.calificacionesPorTarea[reg.id] || [];
          totalConteo += calificaciones.filter((c: any) =>
            c.id_parametro_calificacion == param.id && c.id_valor_parametro_calificacion == val.id
          ).length;
        }
        return {
          ...val,
          total: totalConteo,
          promedio: totalClases > 0 ? Math.round(totalConteo / totalClases * 10) / 10 : 0
        };
      });

      return { id: param.id, nombre: param.nombre, valores: resumenValores };
    });
  }

  // ========== Modal detalle estudiantes ==========

  onAccionTabla(evento: any) {
    if (evento.accion === 'ver-detalle') {
      this.abrirModalDetalle(evento.registro);
    }
  }

  abrirModalDetalle(tarea: any) {
    this.tareaDetalle = tarea;
    this.mostrarModalDetalle = true;
    this.cargandoDetalle = true;

    // Traer calificaciones con nombres y observaciones en paralelo
    this.calificacionesService.obtenerByTareaSprint(tarea.id).subscribe({
      next: (respCal: any) => {
        const calDetalle = respCal.body || [];

        // Agrupar por estudiante
        const estudiantesMap: any = {};
        for (const cal of calDetalle) {
          const idEst = cal.id_estudiante;
          if (!estudiantesMap[idEst]) {
            estudiantesMap[idEst] = {
              id_estudiante: idEst,
              nombre: cal.nombre_estudiante || 'Estudiante ' + idEst,
              observacion: '',
              calificaciones: []
            };
          }
          const paramInfo = this.parametros.find((p: any) =>
            p.valores.some((v: any) => v.id == cal.id_valor_parametro_calificacion)
          );
          const valorInfo = paramInfo?.valores.find((v: any) => v.id == cal.id_valor_parametro_calificacion);
          estudiantesMap[idEst].calificaciones.push({
            ...cal,
            icono: valorInfo?.icono || '',
            valor_cualitativo: valorInfo?.valor_cualitativo || '',
            valor_cuantitativo: valorInfo?.valor_cuantitativo || 0
          });
        }

        // Traer observaciones por estudiante
        this.tareasEstudianteService.obtenerByTareaSprint(tarea.id).subscribe({
          next: (respObs: any) => {
            const obsDetalle = respObs.body || [];
            for (const obs of obsDetalle) {
              if (estudiantesMap[obs.id_estudiante] && obs.observacion) {
                estudiantesMap[obs.id_estudiante].observacion = obs.observacion;
              }
            }
            this.estudiantesDetalle = Object.values(estudiantesMap);
            this.cargandoDetalle = false;
          },
          error: () => {
            this.estudiantesDetalle = Object.values(estudiantesMap);
            this.cargandoDetalle = false;
          }
        });
      },
      error: () => {
        this.estudiantesDetalle = [];
        this.cargandoDetalle = false;
      }
    });
  }

  cerrarModalDetalle() {
    this.mostrarModalDetalle = false;
    this.tareaDetalle = null;
    this.estudiantesDetalle = [];
  }

  obtenerCalificacionEstudiante(estudiante: any, paramId: number): string {
    const cal = estudiante.calificaciones.find((c: any) => c.id_parametro_calificacion == paramId);
    if (!cal) return '<span style="color:#ccc">-</span>';
    const param = this.parametros.find((p: any) => p.id == paramId);
    const totalValores = param ? param.valores.length : 5;
    const color = this.obtenerColorIcono(cal.valor_cuantitativo, totalValores);
    return `<i class="fa ${cal.icono}" style="color:${color}" title="${cal.valor_cualitativo}"></i> <span style="font-size:0.85em;color:#555">${cal.valor_cualitativo}</span>`;
  }

  obtenerColorIcono(valorCuantitativo: number, totalValores: number): string {
    const colores = ['#e53935', '#f57c00', '#fdd835', '#66bb6a', '#43a047'];
    if (totalValores <= 2) {
      return valorCuantitativo <= 1 ? '#e53935' : '#43a047';
    }
    const idx = Math.min(Math.round((valorCuantitativo - 1) / Math.max(totalValores - 1, 1) * (colores.length - 1)), colores.length - 1);
    return colores[idx];
  }

  // ========== Utilidades ==========

  formatearTardanza(minutos: any): string {
    if (minutos === null || minutos === undefined) return '';
    if (minutos <= 0) return 'A tiempo';
    return minutos + ' min tarde';
  }

  extraerDispositivo(ua: string): string {
    if (!ua) return '';
    if (ua.includes('iPhone')) return 'iPhone';
    if (ua.includes('iPad')) return 'iPad';
    if (ua.includes('Android')) {
      const match = ua.match(/Android\s[\d.]+;\s([^)]+)\)/);
      return match ? match[1].split(' Build')[0].trim().substring(0, 20) : 'Android';
    }
    if (ua.includes('Windows')) return 'Windows';
    if (ua.includes('Macintosh')) return 'Mac';
    if (ua.includes('Linux')) return 'Linux';
    return ua.substring(0, 20);
  }
}