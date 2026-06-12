import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../../common/header/header.component';
import { TablasComponent } from '../../../common/tablas/tablas.component';
import { AsistenciaEstudiantesService } from '../../../services/asistencia-estudiantes.service';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-reporte-asistencia',
  templateUrl: './reporte-asistencia.component.html',
  styleUrls: ['./reporte-asistencia.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, TablasComponent]
})
export class ReporteAsistenciaComponent implements OnInit {
  @ViewChild('tablaPorFecha') tablaPorFecha!: TablasComponent;
  @ViewChild('tablaIndicadores') tablaIndicadores!: TablasComponent;

  titulo = 'Reporte de Asistencia';

  // Control de pestañas
  pestanaActiva = 'por-fecha';

  // Estados
  cargandoPorFecha = false;
  cargandoIndicadores = false;
  exportando = false;

  // Datos para pestaña "Por Fecha"
  fechaInicio = this.obtenerFechaColombia();
  fechaFin = this.obtenerFechaColombia();
  datosPorFecha: any[] = [];
  estadisticasDiarias: any = {};
  titulosPorFecha: any[] = [];


  // Datos para pestaña "Indicadores" - NUEVA FECHA
  fechaIndicadores = new Date().toISOString().split('T')[0];
  datosIndicadores: any[] = [];
  titulosIndicadores: any[] = [];

  // Configuración de filtros
  columnasFiltroFecha: string[] = ['Grupo', 'Estado Actual'];
  columnasFiltroIndicadores: string[] = ['Grupo', 'Estado Hoy', 'Riesgo'];

  // Acciones vacías para las tablas
  acciones: any[] = [];
  constructor(
    private asistenciaService: AsistenciaEstudiantesService
  ) { }

  ngOnInit(): void {
    // Usar fecha de Colombia

    this.fechaIndicadores = this.obtenerFechaColombia();

    this.crearTitulosPorFecha();
    this.crearTitulosIndicadores();
    this.cargarDatosPorFecha();
  }

  /**
   * Crea los títulos para la tabla por fecha 
   */
  crearTitulosPorFecha() {
    this.titulosPorFecha = [
      { clave: 'fecha', alias: 'Fecha', alinear: 'centrado' },
      { clave: 'nombre_dia', alias: 'Día', alinear: 'centrado' },
      { clave: 'nombre_completo', alias: 'Estudiante', alinear: 'izquierda' },
      { clave: 'nombre_grupo', alias: 'Grupo', alinear: 'centrado' },
      { clave: 'hora_ingreso', alias: 'Hora Ingreso', alinear: 'centrado' },
      { clave: 'hora_salida_real', alias: 'Hora Salida', alinear: 'centrado' },
      { clave: 'horas_estadia', alias: 'Horas Estadía', alinear: 'centrado' },
      { clave: 'horas_extras', alias: 'Horas Extras', alinear: 'centrado' },
      { clave: 'entrada_tarde', alias: 'Entrada Tarde', alinear: 'centrado' },
      { clave: 'salida_tarde', alias: 'Salida Tarde', alinear: 'centrado' },
      { clave: 'estado_actual', alias: 'Estado', alinear: 'centrado' },
      { clave: 'usuario_ingreso', alias: 'Registró Ingreso', alinear: 'izquierda' },
      { clave: 'usuario_salida', alias: 'Registró Salida', alinear: 'izquierda' },
      { clave: 'valor_cobros', alias: 'Valor Cobros', alinear: 'centrado' },
      { clave: 'observacion_ingreso', alias: 'Obs. Ingreso', alinear: 'izquierda' },
      { clave: 'observacion_salida', alias: 'Obs. Salida', alinear: 'izquierda' }
    ];
  }


  /**
   * Crea los títulos para la tabla de indicadores
   */
  crearTitulosIndicadores() {
    this.titulosIndicadores = [
      { clave: 'nombre_completo', alias: 'Estudiante', alinear: 'izquierda' },
      { clave: 'nombre_grupo', alias: 'Grupo', alinear: 'centrado' },
      { clave: 'estado_hoy', alias: 'Estado Hoy', alinear: 'centrado' },
      { clave: 'dias_consecutivos_ausencia', alias: 'Días Consecutivos Ausencia', alinear: 'centrado' },
      { clave: 'asistencias_semana_actual', alias: 'Asist. Semana', alinear: 'centrado' },
      { clave: 'porcentaje_asistencia_semana', alias: '% Semana', alinear: 'centrado' },
      { clave: 'asistencias_mes_actual', alias: 'Asist. Mes', alinear: 'centrado' },
      { clave: 'porcentaje_asistencia_mes', alias: '% Mes', alinear: 'centrado' },
      { clave: 'promedio_horas_permanencia', alias: 'Prom. Horas', alinear: 'centrado' },
      { clave: 'total_asistencias', alias: 'Total Asist.', alinear: 'centrado' },
      { clave: 'ultima_asistencia', alias: 'Última Asistencia', alinear: 'centrado' },
      { clave: 'clasificacion_riesgo', alias: 'Riesgo', alinear: 'centrado' }
    ];
  }


  /**
   * Cambia la pestaña activa
   */
  cambiarPestana(pestana: string) {
    console.log('Cambiando a pestaña:', pestana);
    this.pestanaActiva = pestana;

    if (pestana === 'indicadores' && this.datosIndicadores.length === 0) {
      console.log('Cargando indicadores...');
      this.cargarDatosIndicadores();
    }
  }

  /**
   * Carga los datos de asistencia por rango de fechas 
   */
  cargarDatosPorFecha() {
    this.cargandoPorFecha = true;

    const requestData = {
      fecha_inicio: this.fechaInicio,
      fecha_fin: this.fechaFin
    };

    this.asistenciaService.obtenerReportePorFecha(requestData).subscribe({
      next: (response: any) => {
        console.log('Respuesta por rango de fechas:', response);

        if (response && response.asistencias) {
          this.datosPorFecha = response.asistencias.map((item: any) => ({
            ...item,
            fecha: item.fecha || 'Sin fecha',
            nombre_dia: item.nombre_dia || '',
            hora_salida_real: item.hora_salida_real || 'Sin registrar',
            horas_estadia: item.horas_estadia || 0,
            horas_extras: item.horas_extras || 0,
            entrada_tarde: item.entrada_tarde || 'No',
            salida_tarde: item.salida_tarde || 'No',
            observacion_ingreso: item.observacion_ingreso || '',
            observacion_salida: item.observacion_salida || '',
            usuario_ingreso: item.usuario_ingreso || '',
            usuario_salida: item.usuario_salida || '',
            valor_cobros: item.valor_cobros || 0,
            color: this.obtenerColorPorSalidaTarde(item.salida_tarde, item.estado_actual)
          }));

          this.estadisticasDiarias = {
            ...response.estadisticas,
            total_registros: response.total_registros || 0,
            // Nuevas estadísticas de horas extras
            total_horas_extras: response.estadisticas?.total_horas_extras || 0,
            promedio_horas_extras: response.estadisticas?.promedio_horas_extras_por_salida_tarde || 0
          };
          console.log("estadisticasDiarias", this.estadisticasDiarias)
        } else {
          this.datosPorFecha = [];
          this.estadisticasDiarias = {};
        }

        this.cargandoPorFecha = false;
      },
      error: (error) => {
        console.error('Error al cargar datos por rango de fechas:', error);
        this.datosPorFecha = [];
        this.estadisticasDiarias = {};
        this.cargandoPorFecha = false;
      }
    });
  }

  /**
   * Obtiene color según salida tarde y estado 
   */
  obtenerColorPorSalidaTarde(salidaTarde: string, estado: string): string {
    if (salidaTarde === 'Sí') {
      return '#fff3cd'; // Amarillo para salidas tarde (horas extras)
    }

    switch (estado) {
      case 'En el jardín':
        return '#e8f5e8'; // Verde claro
      case 'Salió':
        return '#f0f8ff'; // Azul claro
      case 'Ausente':
        return '#ffe6e6'; // Rojo claro
      default:
        return '';
    }
  }

  /**
   * Maneja el cambio de fechas
   */
  onFiltrosChange() {
    // Validar que fecha inicio no sea mayor que fecha fin
    if (this.fechaInicio > this.fechaFin) {
      this.fechaFin = this.fechaInicio;
    }
    this.cargarDatosPorFecha();
  }

  /**
   * Maneja el cambio del checkbox de solo salidas tarde
   */
  onSoloSalidasTardeChange() {
    this.cargarDatosPorFecha();
  }
  /**
   * Carga los datos de indicadores de asistencia con fecha específica
   */
  cargarDatosIndicadores() {
    this.cargandoIndicadores = true;

    // Modificar el servicio para recibir una fecha específica
    this.asistenciaService.obtenerReporteIndicadores(this.fechaIndicadores).subscribe({
      next: (datos: any) => {
        console.log('Respuesta indicadores:', datos);

        if (datos && datos.indicadores && Array.isArray(datos.indicadores)) {
          this.datosIndicadores = datos.indicadores.map((item: any) => ({
            ...item,
            porcentaje_asistencia_semana: `${item.porcentaje_asistencia_semana}%`,
            porcentaje_asistencia_mes: `${item.porcentaje_asistencia_mes}%`,
            promedio_horas_permanencia: item.promedio_horas_permanencia || 0,
            ultima_asistencia: item.ultima_asistencia || 'Sin registro',
            color: this.obtenerColorPorRiesgo(item.clasificacion_riesgo)
          }));
        } else {
          console.warn('Datos de indicadores no válidos:', datos);
          this.datosIndicadores = [];
        }

        this.cargandoIndicadores = false;
      },
      error: (error) => {
        console.error('Error al cargar indicadores:', error);
        this.datosIndicadores = [];
        this.cargandoIndicadores = false;
      }
    });
  }

  /**
   * Obtiene color según el estado actual - MEJORADO para ausentes
   */
  obtenerColorPorEstado(estado: string): string {
    switch (estado) {
      case 'En el jardín':
        return '#e8f5e8'; // Verde claro
      case 'Salió':
        return '#f0f8ff'; // Azul claro
      case 'Ausente':
        return '#ffe6e6'; // Rojo claro
      default:
        return '';
    }
  }

  /**
   * Obtiene color según la clasificación de riesgo
   */
  obtenerColorPorRiesgo(riesgo: string): string {
    switch (riesgo) {
      case 'Alto':
        return '#ffe6e6'; // Rojo claro
      case 'Medio':
        return '#fff3cd'; // Amarillo claro
      case 'Bajo':
        return '#e8f5e8'; // Verde claro
      default:
        return '';
    }
  }

  /**
   * Maneja el cambio de fecha para asistencia por fecha
   */
  onFechaChange() {
    this.cargarDatosPorFecha();
  }

  /**
   * Maneja el cambio de fecha para indicadores - NUEVO
   */
  onFechaIndicadoresChange() {
    this.cargarDatosIndicadores();
  }
  /**
   * Exporta los datos de la pestaña activa a Excel
   */
  exportarExcel() {
    this.exportando = true;

    let datosParaExportar: any[] = [];
    let nombreHoja = '';
    let nombreArchivo = '';

    if (this.pestanaActiva === 'por-fecha') {
      // Intentar obtener datos filtrados de la tabla por fecha
      datosParaExportar = this.tablaPorFecha?.tabla?.datosFiltrados || this.datosPorFecha;
      nombreHoja = 'Asistencia por Fecha';
      nombreArchivo = `asistencia_${this.fechaInicio}_${this.fechaFin}.xlsx`;

      // Preparar datos para exportar
      datosParaExportar = datosParaExportar.map(item => ({
        'Estudiante': item.nombre_completo,
        'Grupo': item.nombre_grupo,
        'Hora Ingreso': item.hora_ingreso,
        'Hora Salida': item.hora_salida,
        'Horas Estadía': item.horas_estadia,
        'Estado Actual': item.estado_actual,
        'Registró Ingreso': item.usuario_ingreso,
        'Registró Salida': item.usuario_salida,
        'Valor Cobros': item.valor_cobros,
        'Observación Ingreso': item.observacion_ingreso,
        'Observación Salida': item.observacion_salida
      }));

    } else {
      // Intentar obtener datos filtrados de la tabla de indicadores
      datosParaExportar = this.tablaIndicadores?.tabla?.datosFiltrados || this.datosIndicadores;
      nombreHoja = 'Indicadores Asistencia';
      const fechaActual = new Date().toISOString().split('T')[0];
      nombreArchivo = `indicadores_asistencia_${fechaActual}.xlsx`;

      // Preparar datos para exportar
      datosParaExportar = datosParaExportar.map(item => ({
        'Estudiante': item.nombre_completo,
        'Grupo': item.nombre_grupo,
        'Estado Hoy': item.estado_hoy,
        'Días Consecutivos Ausencia': item.dias_consecutivos_ausencia,
        'Asistencias Semana': item.asistencias_semana_actual,
        '% Asistencia Semana': item.porcentaje_asistencia_semana,
        'Asistencias Mes': item.asistencias_mes_actual,
        '% Asistencia Mes': item.porcentaje_asistencia_mes,
        'Promedio Horas Permanencia': item.promedio_horas_permanencia,
        'Total Asistencias': item.total_asistencias,
        'Última Asistencia': item.ultima_asistencia,
        'Clasificación Riesgo': item.clasificacion_riesgo
      }));
    }

    // Crear libro de Excel
    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(datosParaExportar);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, nombreHoja);

    // Ajustar ancho de columnas
    const colWidths = this.pestanaActiva === 'por-fecha'
      ? [
        { wch: 30 }, // Estudiante
        { wch: 15 }, // Grupo
        { wch: 12 }, // Hora Ingreso
        { wch: 12 }, // Hora Salida
        { wch: 12 }, // Horas Estadía
        { wch: 15 }, // Estado Actual
        { wch: 30 }, // Registró Ingreso
        { wch: 30 }, // Registró Salida
        { wch: 15 }, // Valor Cobros
        { wch: 30 }, // Obs. Ingreso
        { wch: 30 }  // Obs. Salida
      ]
      : [
        { wch: 30 }, // Estudiante
        { wch: 15 }, // Grupo
        { wch: 12 }, // Estado Hoy
        { wch: 20 }, // Días Consecutivos
        { wch: 15 }, // Asist. Semana
        { wch: 12 }, // % Semana
        { wch: 12 }, // Asist. Mes
        { wch: 10 }, // % Mes
        { wch: 15 }, // Prom. Horas
        { wch: 12 }, // Total Asist.
        { wch: 15 }, // Última Asist.
        { wch: 12 }  // Riesgo
      ];

    ws['!cols'] = colWidths;

    // Generar archivo
    XLSX.writeFile(wb, nombreArchivo);

    setTimeout(() => {
      this.exportando = false;
    }, 1000);
  }
  // Método auxiliar para obtener fecha en zona horaria de Colombia
  private obtenerFechaColombia(): string {
    const now = new Date();
    // Crear fecha en zona horaria de Colombia (America/Bogota)
    const colombiaTime = new Date(now.toLocaleString("en-US", { timeZone: "America/Bogota" }));

    const year = colombiaTime.getFullYear();
    const month = String(colombiaTime.getMonth() + 1).padStart(2, '0');
    const day = String(colombiaTime.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }
}