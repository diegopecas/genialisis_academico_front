import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HeaderComponentAnidado } from '../../../common/header-anidado/header-anidado.component';
import { TablasComponent } from '../../../common/tablas/tablas.component';
import { CalificacionesService } from '../../../services/calificaciones.service';
import { SprintsService } from '../../../services/sprints.service';
import { GruposService } from '../../../services/grupos.service';
import Swal from 'sweetalert2';
import { Chart, registerables } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { EstudiantesService } from '../../../services/estudiantes.service';

// Interfaces para trabajar con los datos
interface Sprint {
    id: string;
    nombre_sprint: string;
    actual: number;
    es_sprint_actual?: number;
}

interface Grupo {
    id: string;
    nombre: string;
    orden: number;
}

interface Estudiante {
    id: string;
    nombre_completo_estudiante: string;
    numero_identificacion: string;
}

interface Calificacion {
    id: string;
    nombre_grupo: string;
    area_academica_nombre: string;
    nombre_completo_estudiante: string;
    actividad_academica_titulo: string;
    esfera_desarrollo_nombre: string;
    corte_academico_nombre: string;
    parametro_calificacion: string;
    valor_cualitativo: string;
    valor_cuantitativo: number;
    estado_tarea_nombre: string;
    fecha_ejecucion: string;
    nombre_completo_docente: string;
    id_estudiante: number;
    id_area_academica: number;
    id_grupo: number;
    descripcion_indicador_logro?: string;
    id_indicador_logro?: number;
    [key: string]: any;
    color?: string;
}

interface CalificacionPromedio {
    id_area_academica: number;
    area_academica_nombre: string;
    valores: number[];
    promedio: number;
    valor_cualitativo: string;
    color?: string;
}

interface IndicadorLogroPromedio {
    id_indicador_logro: number;
    descripcion_indicador_logro: string;
    id_area_academica: number;
    area_academica_nombre: string;
    valores: number[];
    promedio: number;
    valor_cualitativo: string;
    color?: string;
}

interface ResumenEstudiante {
    promedio_general: number;
    valor_cualitativo_general: string;
    areas_fuertes: string[];
    areas_mejorar: string[];
    tendencia: 'mejora' | 'estable' | 'descenso' | 'sin datos';
    total_actividades: number;
    actividades_completadas: number;
    porcentaje_completado: number;
}

type ValorCalificativo = 'Excelente' | 'Sobresaliente' | 'Bueno' | 'Aceptable' | 'Insuficiente' | 'Enfermo' | 'Sin calificación' | string;

interface MapaColores {
    [key: string]: string;
}

@Component({
    selector: 'app-calificaciones-estudiante-detalle',
    standalone: true,
    imports: [CommonModule, FormsModule, TablasComponent, HeaderComponentAnidado],
    templateUrl: './calificaciones-estudiante-detalle.component.html',
    styleUrl: './calificaciones-estudiante-detalle.component.scss'
})
export class CalificacionesEstudianteDetalleComponent implements OnInit {
    public titulo = "Análisis Individual de Estudiantes";
    public path = "/calificaciones-estudiante";

    // Datos de selección
    public sprints: Sprint[] = [];
    public grupos: Grupo[] = [];
    public estudiantes: Estudiante[] = [];
    public sprintSeleccionado: string = "";
    public grupoSeleccionado: string = "";
    public estudianteSeleccionado: string = "";

    // Datos de calificaciones
    public calificaciones: Calificacion[] = [];
    public promediosPorArea: CalificacionPromedio[] = [];
    public promediosPorIndicador: IndicadorLogroPromedio[] = [];
    public resumenEstudiante: ResumenEstudiante | null = null;

    // Control de visualización
    public estudianteSeleccionadoNombre: string = "";
    public mostrarDashboard: boolean = false;
    public cargando: boolean = false;

    // Datos para tablas
    public titulos: any[] = [];
    public datos: Calificacion[] = [];
    public columnasFiltro = ['Actividad', 'Indicador de Logro', 'Área Académica', 'Valor Cualitativo'];

    public titulosPromedio: any[] = [];
    public datosPromedio: CalificacionPromedio[] = [];
    public columnasFiltroPromedio = ['Área Académica', 'Promedio'];

    public titulosIndicadores: any[] = [];
    public datosIndicadores: IndicadorLogroPromedio[] = [];
    public columnasFiltroIndicadores = ['Área Académica', 'Indicador de Logro', 'Promedio'];

    public calificacionesFiltradas: Calificacion[] = []; // Nueva propiedad para calificaciones filtradas

    // Propiedades para almacenar todos los estudiantes
    public estudiantesPorGrupo: { [key: string]: Estudiante[] } = {};
    public mostrarMensajeNoHayCalificaciones: boolean = false;

    // Mapa de colores para calificaciones
    private coloresCalificacion: MapaColores = {
        'Excelente': '#d4f7d4',
        'Sobresaliente': '#c7f0c7',
        'Bueno': '#f7f5d4',
        'Aceptable': '#f7e9d4',
        'Insuficiente': '#f7d4d4',
        'Enfermo': '#f5d4f7',
        'Sin calificación': '#e9e9e9'
    };

    // Colores para gráficos
    private coloresGrafico: string[] = [
        'rgba(54, 162, 235, 0.8)',
        'rgba(255, 99, 132, 0.8)',
        'rgba(255, 206, 86, 0.8)',
        'rgba(75, 192, 192, 0.8)',
        'rgba(153, 102, 255, 0.8)',
        'rgba(255, 159, 64, 0.8)',
        'rgba(199, 199, 199, 0.8)'
    ];

    constructor(
        private estudiantesService: EstudiantesService,
        private calificacionesService: CalificacionesService,
        private sprintsService: SprintsService,
        private gruposService: GruposService
    ) {
        Chart.register(...registerables, ChartDataLabels);
    }

    ngOnInit() {
        this.inicializarTitulos();
        this.consultarSprints();
        this.consultarGrupos();
    }

    inicializarTitulos() {
        this.titulos = [
            {
                clave: 'actividad_academica_titulo',
                alias: 'Actividad',
                alinear: 'izquierda',
            },
            {
                clave: 'descripcion_indicador_logro',
                alias: 'Indicador de Logro',
                alinear: 'izquierda',
            },
            {
                clave: 'area_academica_nombre',
                alias: 'Área Académica',
                alinear: 'izquierda',
            },
            {
                clave: 'esfera_desarrollo_nombre',
                alias: 'Esfera Desarrollo',
                alinear: 'izquierda',
            },
            {
                clave: 'parametro_calificacion',
                alias: 'Parámetro',
                alinear: 'izquierda',
            },
            {
                clave: 'valor_cualitativo',
                alias: 'Valor Cualitativo',
                alinear: 'centrado',
                colorFondo: 'color'
            },
            {
                clave: 'valor_cuantitativo',
                alias: 'Valor',
                alinear: 'centrado',
            },
            {
                clave: 'fecha_ejecucion',
                alias: 'Fecha',
                alinear: 'centrado',
            }
        ];

        this.titulosPromedio = [
            {
                clave: 'area_academica_nombre',
                alias: 'Área Académica',
                alinear: 'izquierda',
            },
            {
                clave: 'promedio',
                alias: 'Promedio',
                alinear: 'centrado',
            },
            {
                clave: 'valor_cualitativo',
                alias: 'Clasificación',
                alinear: 'centrado',
                colorFondo: 'color'
            }
        ];

        this.titulosIndicadores = [
            {
                clave: 'area_academica_nombre',
                alias: 'Área Académica',
                alinear: 'izquierda',
            },
            {
                clave: 'descripcion_indicador_logro',
                alias: 'Indicador de Logro',
                alinear: 'izquierda',
            },
            {
                clave: 'promedio',
                alias: 'Promedio',
                alinear: 'centrado',
            },
            {
                clave: 'valor_cualitativo',
                alias: 'Clasificación',
                alinear: 'centrado',
                colorFondo: 'color'
            }
        ];
    }

    consultarSprints() {
        this.cargando = true;
        this.sprintsService.obtenerTodos().subscribe({
            next: (response: any) => {
                this.sprints = response.body || [];

                // Establecer el sprint seleccionado (el marcado como actual)
                const sprintActual = this.sprints.find(sprint => sprint.actual == 1);
                if (sprintActual) {
                    this.sprintSeleccionado = sprintActual.id;
                } else if (this.sprints.length > 0) {
                    this.sprintSeleccionado = this.sprints[0].id;
                }

                this.cargando = false;
            },
            error: (error) => {
                this.cargando = false;
                this.mostrarError('No se pudieron cargar los sprints');
                console.error('Error al cargar sprints:', error);
            }
        });
    }

    consultarGrupos() {
        this.cargando = true;
        this.gruposService.obtenerTodos().subscribe({
            next: (response: any) => {
                this.grupos = response.body || [];
                this.grupos.sort((a, b) => a.orden - b.orden);

                if (this.grupos.length > 0) {
                    this.grupoSeleccionado = this.grupos[0].id;
                    this.cargarEstudiantesPorGrupo();
                }

                this.cargando = false;
            },
            error: (error) => {
                this.cargando = false;
                this.mostrarError('No se pudieron cargar los grupos');
                console.error('Error al cargar grupos:', error);
            }
        });
    }

    // Método para cargar estudiantes por grupo usando el servicio dedicado
    cargarEstudiantesPorGrupo() {
        if (!this.grupoSeleccionado) {
          this.estudiantes = [];
          this.estudianteSeleccionado = "";
          return;
        }
        
        // Comprobar si ya tenemos estudiantes en caché para este grupo
        if (this.estudiantesPorGrupo[this.grupoSeleccionado]) {
          this.estudiantes = this.estudiantesPorGrupo[this.grupoSeleccionado];
          if (this.estudiantes.length > 0) {
            this.estudianteSeleccionado = this.estudiantes[0].id;
          } else {
            this.estudianteSeleccionado = "";
          }
          return;
        }
        
        // Si no están en caché, cargarlos desde el API
        this.cargando = true;
        this.estudiantesService.obtenerTodosXGrupo(this.grupoSeleccionado).subscribe({
          next: (response: any) => {
            const estudiantesData = response.body || [];
            
            // Mapear los datos según la estructura real que muestra el JSON
            this.estudiantes = estudiantesData.map((est: any) => {
              // Construir el nombre completo a partir de los campos disponibles
              let nombreCompleto = '';
              
              if (est.primer_nombre) nombreCompleto += est.primer_nombre;
              if (est.segundo_nombre) nombreCompleto += ' ' + est.segundo_nombre;
              if (est.primer_apellido) nombreCompleto += ' ' + est.primer_apellido;
              if (est.segundo_apellido) nombreCompleto += ' ' + est.segundo_apellido;
              
              // Eliminar espacios extra
              nombreCompleto = nombreCompleto.trim();
              
              return {
                id: est.id_estudiante.toString(),
                nombre_completo_estudiante: nombreCompleto,
                numero_identificacion: est.documento || ''
              };
            });
            
            // Ordenar por nombre
            this.estudiantes.sort((a, b) => 
              a.nombre_completo_estudiante.localeCompare(b.nombre_completo_estudiante)
            );
            
            // Guardar en caché
            this.estudiantesPorGrupo[this.grupoSeleccionado] = [...this.estudiantes];
            
            if (this.estudiantes.length > 0) {
              this.estudianteSeleccionado = this.estudiantes[0].id;
            } else {
              this.estudianteSeleccionado = "";
            }
            
            this.cargando = false;
          },
          error: (error) => {
            this.cargando = false;
            this.mostrarError('No se pudieron cargar los estudiantes');
            console.error('Error al cargar estudiantes por grupo:', error);
          }
        });
      }


    cargarCalificacionesEstudiante() {
        if (!this.sprintSeleccionado || !this.estudianteSeleccionado) {
            this.datos = [];
            this.datosPromedio = [];
            this.datosIndicadores = [];
            this.mostrarDashboard = false;
            return;
        }

        this.cargando = true;
        this.calificacionesService.obtenerCalificacionesEstudianteDetalle(
            this.sprintSeleccionado,
            this.estudianteSeleccionado
        ).subscribe({
            next: (response: any) => {
                this.calificaciones = response.body || [];

                if (this.calificaciones.length > 0) {
                    // Guardar el nombre del estudiante para mostrar en el dashboard
                    this.estudianteSeleccionadoNombre = this.calificaciones[0]['nombre_completo_estudiante'] || '';

                    // Asignar colores a los datos
                    this.calificaciones.forEach(item => {
                        item.color = this.obtenerColorPorCalificacion(item.valor_cualitativo);
                    });

                    this.calificaciones.forEach(item => {
                        item.color = this.obtenerColorPorCalificacion(item.valor_cualitativo);
                    });

                    // Filtrar calificaciones por parámetro 3 (similar a CalificacionesSprintEstudiantesComponent)
                    this.filtrarCalificacionesPorParametro();
                    // Generar datos para las tablas
                    this.datos = [...this.calificaciones];
                    this.generarPromediosPorArea();
                    this.generarPromediosPorIndicador();
                    this.generarResumenEstudiante();

                    // Mostrar el dashboard
                    this.mostrarDashboard = true;

                    // Generar gráficos
                    setTimeout(() => {
                        this.generarGraficos();
                    }, 500);
                } else {
                    this.mostrarDashboard = false;
                    Swal.fire({
                        title: 'Información',
                        text: 'No hay calificaciones para este estudiante en el sprint seleccionado',
                        icon: 'info',
                        confirmButtonText: 'Aceptar'
                    });
                }

                this.cargando = false;
            },
            error: (error) => {
                this.cargando = false;
                this.mostrarError('No se pudieron cargar las calificaciones');
                console.error('Error al cargar calificaciones:', error);
            }
        });
    }

    generarPromediosPorArea() {
        if (this.calificaciones.length === 0) {
            this.datosPromedio = [];
            return;
        }

        // Agrupar por área académica
        const areas = new Map<number, CalificacionPromedio>();

        this.calificacionesFiltradas.forEach(item => {
            if (!item['id_area_academica'] || item['valor_cuantitativo'] === undefined) return;

            const areaId = item['id_area_academica'];

            if (!areas.has(areaId)) {
                areas.set(areaId, {
                    id_area_academica: areaId,
                    area_academica_nombre: item['area_academica_nombre'] || '',
                    valores: [],
                    promedio: 0,
                    valor_cualitativo: ''
                });
            }

            areas.get(areaId)!.valores.push(item['valor_cuantitativo']);
        });

        // Calcular promedios
        this.datosPromedio = Array.from(areas.values()).map(area => {
            if (area.valores.length > 0) {
                const suma = area.valores.reduce((a, b) => a + b, 0);
                area.promedio = parseFloat((suma / area.valores.length).toFixed(2));
                area.valor_cualitativo = this.determinarValorCualitativo(area.promedio);
                area.color = this.obtenerColorPorCalificacion(area.valor_cualitativo);
            } else {
                area.promedio = 0;
                area.valor_cualitativo = 'Sin calificación';
                area.color = this.obtenerColorPorCalificacion('Sin calificación');
            }
            return area;
        });

        // Ordenar por nombre de área
        this.datosPromedio.sort((a, b) => a.area_academica_nombre.localeCompare(b.area_academica_nombre));
    }

    generarPromediosPorIndicador() {
        if (this.calificaciones.length === 0) {
            this.datosIndicadores = [];
            return;
        }

        // Verificar si hay indicadores de logro
        const tieneIndicadores = this.calificacionesFiltradas.some(item =>
            item['id_indicador_logro'] !== undefined &&
            item['descripcion_indicador_logro'] !== undefined
        );

        if (!tieneIndicadores) {
            this.datosIndicadores = [];
            return;
        }

        // Agrupar por indicador de logro
        const indicadores = new Map<string, IndicadorLogroPromedio>();

        this.calificacionesFiltradas.forEach(item => {
            if (!item['id_area_academica'] || !item['id_indicador_logro'] ||
                item['valor_cuantitativo'] === undefined || !item['descripcion_indicador_logro']) return;

            const key = `${item['id_area_academica']}-${item['id_indicador_logro']}`;

            if (!indicadores.has(key)) {
                indicadores.set(key, {
                    id_indicador_logro: item['id_indicador_logro'],
                    descripcion_indicador_logro: item['descripcion_indicador_logro'],
                    id_area_academica: item['id_area_academica'],
                    area_academica_nombre: item['area_academica_nombre'] || '',
                    valores: [],
                    promedio: 0,
                    valor_cualitativo: ''
                });
            }

            indicadores.get(key)!.valores.push(item['valor_cuantitativo']);
        });

        // Calcular promedios
        this.datosIndicadores = Array.from(indicadores.values()).map(indicador => {
            if (indicador.valores.length > 0) {
                const suma = indicador.valores.reduce((a, b) => a + b, 0);
                indicador.promedio = parseFloat((suma / indicador.valores.length).toFixed(2));
                indicador.valor_cualitativo = this.determinarValorCualitativo(indicador.promedio);
                indicador.color = this.obtenerColorPorCalificacion(indicador.valor_cualitativo);
            } else {
                indicador.promedio = 0;
                indicador.valor_cualitativo = 'Sin calificación';
                indicador.color = this.obtenerColorPorCalificacion('Sin calificación');
            }
            return indicador;
        });

        // Ordenar por área y luego por indicador
        this.datosIndicadores.sort((a, b) => {
            const areaCompare = a.area_academica_nombre.localeCompare(b.area_academica_nombre);
            if (areaCompare !== 0) return areaCompare;
            return a.descripcion_indicador_logro.localeCompare(b.descripcion_indicador_logro);
        });
    }

    generarResumenEstudiante() {
        if (this.calificacionesFiltradas.length === 0 || this.datosPromedio.length === 0) {
            this.resumenEstudiante = null;
            return;
        }

        // Calcular promedio general
        const valoresValidos = this.calificacionesFiltradas
            .filter(item => item['valor_cuantitativo'] !== undefined)
            .map(item => item['valor_cuantitativo']);

        if (valoresValidos.length === 0) {
            this.resumenEstudiante = null;
            return;
        }

        const sumaTotal = valoresValidos.reduce((a, b) => a + b, 0);
        const promedioGeneral = parseFloat((sumaTotal / valoresValidos.length).toFixed(2));
        const valorCualitativoGeneral = this.determinarValorCualitativo(promedioGeneral);

        // Identificar áreas fuertes y a mejorar
        const areasFuertes = this.datosPromedio
            .filter(area => area.promedio >= 4.0)
            .map(area => area.area_academica_nombre);

        const areasMejorar = this.datosPromedio
            .filter(area => area.promedio < 3.5 && area.promedio > 0)
            .map(area => area.area_academica_nombre);

        // Contar actividades completadas
        const totalActividades = new Set(this.calificaciones.map(item => item['id_tarea_x_sprint'])).size;
        const actividadesCompletadas = this.calificaciones
            .filter(item => item['estado_tarea_nombre'] === 'Ejecutada')
            .reduce((uniqueIds, item) => {
                uniqueIds.add(item['id_tarea_x_sprint']);
                return uniqueIds;
            }, new Set()).size;

        const porcentajeCompletado = totalActividades > 0
            ? parseFloat((actividadesCompletadas / totalActividades * 100).toFixed(1))
            : 0;

        // Determinación simplificada de tendencia (en una aplicación real aquí se haría un análisis más profundo)
        const tendencia = 'estable'; // Por defecto asumimos estable

        this.resumenEstudiante = {
            promedio_general: promedioGeneral,
            valor_cualitativo_general: valorCualitativoGeneral,
            areas_fuertes: areasFuertes,
            areas_mejorar: areasMejorar,
            tendencia: tendencia,
            total_actividades: totalActividades,
            actividades_completadas: actividadesCompletadas,
            porcentaje_completado: porcentajeCompletado
        };
    }

    generarGraficos() {
        // Limpiar gráficos existentes
        this.limpiarGraficos();

        // Generar gráficos si hay datos
        if (this.datosPromedio.length > 0) {
            this.generarGraficoPromedios();
            this.generarGraficoPolar();
            this.generarGraficoProgreso();
            this.generarGraficoIndicadores();
        }
    }

    limpiarGraficos() {
        const chartIds = ['graficoPromediosAreas', 'graficoRadar', 'graficoProgreso', 'graficoIndicadores'];

        chartIds.forEach(id => {
            const chart = Chart.getChart(id);
            if (chart) chart.destroy();
        });
    }

    generarGraficoPromedios() {
        const ctx = document.getElementById('graficoPromediosAreas') as HTMLCanvasElement;
        if (!ctx) return;

        const labels = this.datosPromedio.map(area => area.area_academica_nombre);
        const data = this.datosPromedio.map(area => area.promedio);
        const bgColors = this.datosPromedio.map((area, index) => this.obtenerColorGrafico(index));

        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Promedio por Área',
                    data: data,
                    backgroundColor: bgColors,
                    borderColor: bgColors.map(color => color.replace('0.8', '1')),
                    borderWidth: 1,
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Promedio por Área Académica',
                        font: {
                            size: 16,
                            weight: 'bold'
                        }
                    },
                    datalabels: {
                        align: 'end',
                        anchor: 'end',
                        formatter: (value) => value.toFixed(1),
                        font: {
                            weight: 'bold'
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 5.0,
                        title: {
                            display: true,
                            text: 'Promedio'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Áreas Académicas'
                        }
                    }
                }
            }
        });
    }

    generarGraficoPolar() {
        const ctx = document.getElementById('graficoRadar') as HTMLCanvasElement;
        if (!ctx) return;

        const labels = this.datosPromedio.map(area => area.area_academica_nombre);
        const data = this.datosPromedio.map(area => area.promedio);
        const bgColors = this.datosPromedio.map((area, index) =>
            this.obtenerColorGrafico(index).replace('0.8', '0.6')
        );

        new Chart(ctx, {
            type: 'polarArea',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Desempeño por Área',
                    data: data,
                    backgroundColor: bgColors,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Desempeño Global',
                        font: {
                            size: 16,
                            weight: 'bold'
                        }
                    },
                    datalabels: {
                        formatter: (value) => value.toFixed(1),
                        font: {
                            weight: 'bold',
                            size: 9
                        },
                        color: '#000'
                    }
                },
                scales: {
                    r: {
                        min: 0,
                        max: 5,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    }

    generarGraficoProgreso() {
        const ctx = document.getElementById('graficoProgreso') as HTMLCanvasElement;
        if (!ctx || !this.resumenEstudiante) return;

        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Completadas', 'Pendientes'],
                datasets: [{
                    data: [
                        this.resumenEstudiante.actividades_completadas,
                        this.resumenEstudiante.total_actividades - this.resumenEstudiante.actividades_completadas
                    ],
                    backgroundColor: [
                        'rgba(54, 162, 235, 0.8)',
                        'rgba(220, 220, 220, 0.8)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                cutout: '75%',
                plugins: {
                    title: {
                        display: true,
                        text: 'Progreso de Actividades',
                        font: {
                            size: 16,
                            weight: 'bold'
                        }
                    },
                    datalabels: {
                        formatter: (value: any, ctx: any) => {
                            const datasets = ctx.chart.data.datasets;
                            const sum = datasets[0].data.reduce((a: any, b: any) => Number(a) + Number(b), 0);
                            if (sum <= 0) return '0%';
                            const percentage = Math.round((Number(value) / sum) * 100) + '%';
                            return percentage;
                        },
                        font: {
                            weight: 'bold',
                            size: 14
                        },
                        color: '#000'
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const total = context.dataset.data.reduce((a: any, b: any) => Number(a) + Number(b), 0);
                                if (total <= 0) return `${label}: ${value} (0%)`;
                                const percentage = Math.round((Number(value) / total) * 100);
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    generarGraficoIndicadores() {
        if (this.datosIndicadores.length === 0) return;

        // Agrupar por área académica
        const indicadoresPorArea = new Map<string, IndicadorLogroPromedio[]>();

        this.datosIndicadores.forEach(indicador => {
            const area = indicador.area_academica_nombre;

            if (!indicadoresPorArea.has(area)) {
                indicadoresPorArea.set(area, []);
            }

            indicadoresPorArea.get(area)!.push(indicador);
        });

        // Ordenar los indicadores por calificación (promedio) dentro de cada área
        indicadoresPorArea.forEach((indicadores, area) => {
            // Ordenar de mayor a menor promedio
            indicadores.sort((a, b) => b.promedio - a.promedio);
        });

        // Obtener la lista de áreas
        const areas = Array.from(indicadoresPorArea.keys());

        // Si hay más de una área, crear un selector
        if (areas.length > 1) {
            const selectorDiv = document.createElement('div');
            selectorDiv.className = 'area-selector mb-3';

            // Crear etiqueta
            const label = document.createElement('label');
            label.textContent = 'Seleccionar área: ';
            label.className = 'mr-2 font-weight-bold';
            selectorDiv.appendChild(label);

            // Crear selector
            const select = document.createElement('select');
            select.className = 'form-control d-inline-block w-auto';

            // Añadir opción para todas las áreas
            const allOption = document.createElement('option');
            allOption.value = 'todas';
            allOption.textContent = 'Todas las áreas';
            select.appendChild(allOption);

            // Añadir opciones por cada área
            areas.forEach(area => {
                const option = document.createElement('option');
                option.value = area;
                option.textContent = area;
                select.appendChild(option);
            });

            selectorDiv.appendChild(select);

            // Insertar el selector antes del canvas
            const canvas = document.getElementById('graficoIndicadores');
            if (canvas && canvas.parentNode) {
                canvas.parentNode.insertBefore(selectorDiv, canvas);
            }

            // Manejar el cambio de área
            select.addEventListener('change', (e) => {
                const selectedArea = (e.target as HTMLSelectElement).value;
                this.actualizarGraficoIndicadores(selectedArea, indicadoresPorArea);
            });

            // Inicialmente mostrar todas las áreas
            this.actualizarGraficoIndicadores('todas', indicadoresPorArea);
        } else {
            // Si solo hay una área, mostrar directamente
            this.actualizarGraficoIndicadores(areas[0], indicadoresPorArea);
        }
    }

    actualizarGraficoIndicadores(areaSeleccionada: string, indicadoresPorArea: Map<string, IndicadorLogroPromedio[]>) {
        const ctx = document.getElementById('graficoIndicadores') as HTMLCanvasElement;
        if (!ctx) return;

        // Limpiar gráfico existente
        const chartExistente = Chart.getChart(ctx);
        if (chartExistente) chartExistente.destroy();

        let indicadoresAMostrar: IndicadorLogroPromedio[] = [];

        // Determinar qué indicadores mostrar
        if (areaSeleccionada === 'todas') {
            // Mostrar indicadores más relevantes (mejor y peor desempeño)
            const todosIndicadores = Array.from(indicadoresPorArea.values()).flat();
            // Ya están ordenados dentro de cada área, pero ordenamos todo el conjunto
            todosIndicadores.sort((a, b) => b.promedio - a.promedio);

            const mejores = todosIndicadores.slice(0, 5);
            const peores = todosIndicadores.slice(-5).reverse();

            indicadoresAMostrar = [...mejores, ...peores];
        } else {
            // Mostrar todos los indicadores del área seleccionada (ya están ordenados)
            indicadoresAMostrar = indicadoresPorArea.get(areaSeleccionada) || [];

            // Limitar a un máximo de 10 indicadores si hay demasiados
            if (indicadoresAMostrar.length > 10) {
                const mitad = Math.floor(10 / 2);
                const mejores = indicadoresAMostrar.slice(0, mitad);
                const peores = indicadoresAMostrar.slice(-mitad).reverse();
                indicadoresAMostrar = [...mejores, ...peores];
            }
        }

        // Crear el gráfico
        this.crearGraficoIndicadores(ctx, indicadoresAMostrar, areaSeleccionada);
    }

    crearGraficoIndicadores(ctx: HTMLCanvasElement, indicadores: IndicadorLogroPromedio[], titulo: string) {
        // Garantizar que los indicadores estén ordenados por calificación (de mayor a menor)
        const indicadoresOrdenados = [...indicadores].sort((a, b) => b.promedio - a.promedio);

        const labels = indicadoresOrdenados.map(i =>
            i.descripcion_indicador_logro.length > 25
                ? i.descripcion_indicador_logro.substring(0, 23) + '...'
                : i.descripcion_indicador_logro
        );

        const data = indicadoresOrdenados.map(i => i.promedio);

        // Usar colores basados en la calificación (no en el índice)
        const bgColors = indicadoresOrdenados.map(i => {
            // Colores personalizados basados en la calificación
            if (i.promedio >= 4.6) return 'rgba(40, 167, 69, 0.7)'; // Excelente - verde
            if (i.promedio >= 4.0) return 'rgba(92, 184, 92, 0.7)'; // Sobresaliente - verde claro
            if (i.promedio >= 3.5) return 'rgba(255, 193, 7, 0.7)'; // Bueno - amarillo
            if (i.promedio >= 3.0) return 'rgba(253, 126, 20, 0.7)'; // Aceptable - naranja
            return 'rgba(220, 53, 69, 0.7)'; // Insuficiente - rojo
        });

        // Título dinámico
        const tituloGrafico = titulo === 'todas'
            ? 'Indicadores destacados por desempeño'
            : `Indicadores de ${titulo}`;

        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Promedio',
                    data: data,
                    backgroundColor: bgColors,
                    borderColor: bgColors.map(c => c.replace('0.7', '1')),
                    borderWidth: 1,
                    borderRadius: 4
                }]
            },
            options: {
                indexAxis: 'y',  // Barras horizontales para mejor visualización
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: tituloGrafico,
                        font: {
                            size: 16,
                            weight: 'bold'
                        }
                    },
                    tooltip: {
                        callbacks: {
                            title: function (tooltipItems) {
                                // Obtener el índice correcto del indicador ordenado
                                const index = tooltipItems[0].dataIndex;
                                return indicadoresOrdenados[index].descripcion_indicador_logro;
                            },
                            afterLabel: function (context) {
                                // Mostrar el valor cualitativo
                                const index = context.dataIndex;
                                return `Valoración: ${indicadoresOrdenados[index].valor_cualitativo}`;
                            }
                        }
                    },
                    datalabels: {
                        align: 'end',
                        anchor: 'end',
                        formatter: (value) => value.toFixed(1),
                        font: {
                            weight: 'bold'
                        },
                        color: '#333'
                    },
                    // Mostrar la leyenda integrada en el gráfico (una sola vez)
                    legend: {
                        display: false // Ocultamos la leyenda predeterminada
                    }
                },
                scales: {
                    y: {
                        ticks: {
                            autoSkip: false,
                            font: {
                                size: 11 // Texto más pequeño para las etiquetas
                            }
                        }
                    },
                    x: {
                        beginAtZero: true,
                        max: 5.0,
                        title: {
                            display: true,
                            text: 'Promedio'
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)' // Líneas de cuadrícula más sutiles
                        }
                    }
                }
            }
        });

        // Eliminar leyenda anterior si existe
        const leyendaExistente = document.querySelector('.custom-legend');
        if (leyendaExistente) {
            leyendaExistente.remove();
        }

        // Añadir leyenda personalizada (una sola vez)
        const leyendaDiv = document.createElement('div');
        leyendaDiv.className = 'custom-legend mt-3 text-center';
        leyendaDiv.style.fontSize = '0.85rem';

        const leyendas = [
            { color: 'rgba(40, 167, 69, 0.7)', texto: 'Excelente (≥4.6)' },
            { color: 'rgba(92, 184, 92, 0.7)', texto: 'Sobresaliente (≥4.0)' },
            { color: 'rgba(255, 193, 7, 0.7)', texto: 'Bueno (≥3.5)' },
            { color: 'rgba(253, 126, 20, 0.7)', texto: 'Aceptable (≥3.0)' },
            { color: 'rgba(220, 53, 69, 0.7)', texto: 'Insuficiente (<3.0)' }
        ];

        // Crear elementos de leyenda
        leyendas.forEach(item => {
            const span = document.createElement('span');
            span.className = 'mx-2 d-inline-flex align-items-center';

            const colorBox = document.createElement('span');
            colorBox.style.width = '12px';
            colorBox.style.height = '12px';
            colorBox.style.backgroundColor = item.color;
            colorBox.style.display = 'inline-block';
            colorBox.style.marginRight = '5px';
            colorBox.style.borderRadius = '2px';

            span.appendChild(colorBox);
            span.appendChild(document.createTextNode(item.texto));

            leyendaDiv.appendChild(span);
        });

        // Insertar la leyenda después del canvas
        if (ctx.parentNode) {
            ctx.parentNode.insertBefore(leyendaDiv, ctx.nextSibling);
        }
    }

    determinarValorCualitativo(promedio: number): ValorCalificativo {
        if (promedio >= 4.6) return 'Excelente';
        if (promedio >= 4.0) return 'Sobresaliente';
        if (promedio >= 3.5) return 'Bueno';
        if (promedio >= 3.0) return 'Aceptable';
        if (promedio >= 1.0) return 'Insuficiente';
        return 'Sin calificación';
    }

    obtenerColorPorCalificacion(valorCualitativo: ValorCalificativo): string {
        return this.coloresCalificacion[valorCualitativo] || this.coloresCalificacion['Sin calificación'];
    }

    obtenerColorGrafico(indice: number): string {
        return this.coloresGrafico[indice % this.coloresGrafico.length];
    }

    mostrarError(mensaje: string) {
        Swal.fire({
            title: 'Error',
            text: mensaje,
            icon: 'error',
            confirmButtonText: 'Aceptar'
        });
    }

    cambioGrupo() {
        this.cargarEstudiantesPorGrupo();
        this.mostrarDashboard = false;
        this.mostrarMensajeNoHayCalificaciones = false; // No mostrar mensaje
      }
      
      cambioSprint() {
        this.mostrarDashboard = false;
        this.mostrarMensajeNoHayCalificaciones = false; // No mostrar mensaje
      }
      
      cambioEstudiante() {
        // No hacer nada, solo actualizar modelo
        this.mostrarMensajeNoHayCalificaciones = false; // No mostrar mensaje
      }

    // Método para filtrar calificaciones por parámetro 3
    filtrarCalificacionesPorParametro() {
        if (this.calificaciones.length === 0) {
            this.calificacionesFiltradas = [];
            return;
        }

        // Detectar qué campo usar para el parámetro
        const primerRegistro = this.calificaciones[0];
        let campoParametro = '';

        if (primerRegistro['id_parametro_calificacion'] !== undefined) {
            campoParametro = 'id_parametro_calificacion';
        } else if (primerRegistro['parametro_calificacion_id'] !== undefined) {
            campoParametro = 'parametro_calificacion_id';
        } else if (primerRegistro['id_parametro'] !== undefined) {
            campoParametro = 'id_parametro';
        }

        console.log("Campo de parámetro detectado:", campoParametro);

        // Si encontramos el campo de parámetro, filtramos por valor 3
        if (campoParametro) {
            this.calificacionesFiltradas = this.calificaciones.filter(item => item[campoParametro] === 3);
            console.log("Registros con parámetro 3:", this.calificacionesFiltradas.length);

            // Si no hay registros con parámetro 3, usamos todos los datos
            if (this.calificacionesFiltradas.length === 0) {
                console.log("No se encontraron registros con parámetro 3. Usando todos los datos.");
                this.calificacionesFiltradas = [...this.calificaciones];
            }
        } else {
            // Si no encontramos un campo de parámetro, usamos todos los datos
            this.calificacionesFiltradas = [...this.calificaciones];
        }
    }
}