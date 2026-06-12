import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chart, registerables } from 'chart.js';
import { Subscription } from 'rxjs';

import { CalificacionesService } from '../../../../services/calificaciones.service';
import { SprintsService } from '../../../../services/sprints.service';
import { ObservacionesEstudiantesService } from '../../../../services/observaciones-estudiantes.service';
import { TiposObservacionesEstudiantesService } from '../../../../services/tipos-observaciones-estudiantes.service';
import { MedidasXEstudianteService } from '../../../../services/medidas-x-estudiante.service';
import { DatosEvaluacionPDF, ExportarPdfEvaluacionService } from '../../../../services/exportar-pdf-evaluacion.service';
import { InstitucionConfigService } from '../../../../services/institucion-config.service';


// Interfaces para trabajar con los datos
interface Sprint {
    id: string;
    anio: number;
    nombre_sprint: string;
    actual: number;
    es_sprint_actual?: number;
    es_evaluacion?: number;
    fecha_inicial?: string;
    fecha_final?: string;
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
    id_logro?: number;
    logro_nombre?: string;
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

interface LogroPromedio {
    id_logro: number;
    logro_nombre: string;
    id_area_academica: number;
    area_academica_nombre: string;
    valores: number[];
    promedio: number;
    valor_cualitativo: string;
    color?: string;
    indicadores: IndicadorLogroPromedio[];
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

interface ObservacionEstudiante {
    id: number;
    fecha: string;
    fechaFormateada?: string;
    descripcion: string;
    id_tipo_observacion_estudiante: number;
    nombre_tipo_observacion?: string;
    id_estudiante_afectado?: number;
    nombre_estudiante_afectado?: string;
    nombre_usuario?: string;
    firma_informe_padre?: string;
}

interface MedidaAntropometrica {
    id: number;
    fecha: string;
    valor: number;
    id_medida: number;
    nombre_medida?: string;
    unidad?: string;
    nombre_usuario?: string;
}

type ValorCalificativo = 'Excelente' | 'Sobresaliente' | 'Bueno' | 'Aceptable' | 'Insuficiente' | 'Enfermo' | 'Sin calificación' | string;

@Component({
    selector: 'app-estudiante-evaluaciones',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './estudiante-evaluaciones.component.html',
    styleUrl: './estudiante-evaluaciones.component.scss'
})
export class EstudianteEvaluacionesComponent implements OnInit, OnDestroy {
    @Input() idEstudiante: string = "0";

    // Datos para combo de sprints
    public sprints: Sprint[] = [];
    public sprintSeleccionado: string = "";

    // Sub-tabs año actual / años anteriores
    public anioAcademico: number = new Date().getFullYear();
    public subTabEvaluaciones: 'actual' | 'historico' = 'actual';
    public sprintsAnioActual: Sprint[] = [];
    public sprintsHistoricos: Sprint[] = [];
    public sprintsFiltrados: Sprint[] = [];

    // Datos de calificaciones y promedios
    public calificaciones: Calificacion[] = [];
    public calificacionesFiltradas: Calificacion[] = [];
    public datosPromedio: CalificacionPromedio[] = [];
    public datosIndicadores: IndicadorLogroPromedio[] = [];
    public datosLogros: LogroPromedio[] = [];
    public resumenEstudiante: ResumenEstudiante | null = null;

    // Datos de observaciones
    public observaciones: ObservacionEstudiante[] = [];
    public tiposObservaciones: any[] = [];

    // Datos de medidas antropométricas
    public ultimoPeso: MedidaAntropometrica | null = null;
    public ultimaTalla: MedidaAntropometrica | null = null;

    // Control de visualización
    public cargando: boolean = false;
    public mostrarDashboard: boolean = false;

    // Propiedades para gestionar suscripciones
    private subscriptions: Subscription[] = [];

    // Mapa de colores para calificaciones
    private coloresCalificacion: { [key: string]: string } = {
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

    // Propiedades para gráficos
    private charts: { [key: string]: Chart } = {};

    // Propiedades para filtros de logros
    public filtroLogros: string = '';
    public filtroAreaLogros: string = '';
    public filtroClasificacionLogros: string = '';
    public logrosFiltrados: LogroPromedio[] = [];
    public areasUnicas: string[] = [];

    constructor(
        private calificacionesService: CalificacionesService,
        private sprintsService: SprintsService,
        private observacionesService: ObservacionesEstudiantesService,
        private tiposObservacionesService: TiposObservacionesEstudiantesService,
        private medidasXEstudianteService: MedidasXEstudianteService,
        private exportarPdfEvaluacionService: ExportarPdfEvaluacionService,
        private institucionConfigService: InstitucionConfigService
    ) {
        Chart.register(...registerables);
    }

    ngOnInit(): void {
        this.anioAcademico = this.institucionConfigService.getAnioAcademicoActual();
        this.consultarSprints();
        this.cargarTiposObservaciones();
        window.addEventListener('resize', this.handleResize.bind(this));
    }

    ngOnDestroy(): void {
        // Cancelar todas las suscripciones para evitar memory leaks
        this.subscriptions.forEach(sub => sub.unsubscribe());

        // Destruir todos los gráficos
        Object.values(this.charts).forEach(chart => chart.destroy());

        // Remover listener de resize
        window.removeEventListener('resize', this.handleResize.bind(this));
    }

    private handleResize(): void {
        // Regenerar gráficos cuando cambie el tamaño de la ventana
        if (this.mostrarDashboard && this.datosPromedio.length > 0) {
            setTimeout(() => {
                this.generarGraficos();
            }, 300);
        }
    }

    // SIN FILTRO DE SPRINTS DE EVALUACIÓN - Se mantiene como estaba originalmente
    consultarSprints(): void {
        this.cargando = true;

        const sub = this.sprintsService.obtenerTodos().subscribe({
            next: (response: any) => {
                this.sprints = response.body || [];

                // Separar sprints por año académico
                this.separarSprintsPorAnio();

                // Filtrar sprints según sub-tab activo
                this.aplicarFiltroSubTab();

                // Cargar datos si tenemos sprint y estudiante
                if (this.sprintSeleccionado && this.idEstudiante !== "0") {
                    this.cargarCalificacionesEstudiante();
                    this.cargarObservacionesEstudiante();
                    this.cargarMedidasAntropometricas();
                } else {
                    this.cargando = false;
                }
            },
            error: (error) => {
                console.error('Error al cargar sprints:', error);
                this.cargando = false;
            }
        });

        this.subscriptions.push(sub);
    }

    // Separar sprints por año académico (solo sprints de evaluación)
    private separarSprintsPorAnio(): void {
        this.sprintsAnioActual = this.sprints.filter(s => s.anio === this.anioAcademico && s.es_evaluacion == 1);
        this.sprintsHistoricos = this.sprints.filter(s => s.anio < this.anioAcademico && s.es_evaluacion == 1);
    }

    // Aplicar filtro según sub-tab activo y seleccionar sprint por defecto
    private aplicarFiltroSubTab(): void {
        if (this.subTabEvaluaciones === 'actual') {
            this.sprintsFiltrados = [...this.sprintsAnioActual];

            // Seleccionar el sprint actual si existe
            const sprintActual = this.sprintsFiltrados.find(s => s.actual == 1);
            if (sprintActual) {
                this.sprintSeleccionado = sprintActual.id;
            } else if (this.sprintsFiltrados.length > 0) {
                this.sprintSeleccionado = this.sprintsFiltrados[0].id;
            } else {
                this.sprintSeleccionado = '';
            }
        } else {
            this.sprintsFiltrados = [...this.sprintsHistoricos];

            // Seleccionar el primer sprint histórico (más reciente por el ORDER BY del backend)
            if (this.sprintsFiltrados.length > 0) {
                this.sprintSeleccionado = this.sprintsFiltrados[0].id;
            } else {
                this.sprintSeleccionado = '';
            }
        }
    }

    // Cambiar sub-tab
    cambiarSubTab(tab: 'actual' | 'historico'): void {
        this.subTabEvaluaciones = tab;
        this.aplicarFiltroSubTab();

        // Recargar datos con el nuevo sprint seleccionado
        if (this.sprintSeleccionado && this.idEstudiante !== "0") {
            this.cargarCalificacionesEstudiante();
            this.cargarObservacionesEstudiante();
            this.cargarMedidasAntropometricas();
        } else {
            this.mostrarDashboard = false;
        }
    }

    cargarTiposObservaciones(): void {
        const sub = this.tiposObservacionesService.obtenerTodos().subscribe({
            next: (response: any) => {
                this.tiposObservaciones = response.body || [];
            },
            error: (error) => {
                console.error('Error al cargar tipos de observaciones:', error);
            }
        });

        this.subscriptions.push(sub);
    }

    cargarObservacionesEstudiante(): void {
        if (!this.idEstudiante || this.idEstudiante === "0") return;

        const sub = this.observacionesService.obtenerPorEstudiante(this.idEstudiante).subscribe({
            next: (response: any) => {
                const todasObservaciones = response.body || [];

                // Filtrar: solo observaciones del sprint actual marcadas para informe
                this.observaciones = todasObservaciones.filter((obs: any) => {
                    const mismoSprint = String(obs.id_sprint) === String(this.sprintSeleccionado);
                    const paraInforme = Number(obs.para_informe) === 1;
                    return mismoSprint && paraInforme;
                });

                // Procesar las observaciones para agregar información adicional
                this.observaciones = this.observaciones.map((obs: any) => {
                    const tipo = this.tiposObservaciones.find(t => t.id === obs.id_tipo_observacion_estudiante);
                    return {
                        ...obs,
                        nombre_tipo_observacion: tipo ? tipo.nombre : 'Desconocido',
                        fechaFormateada: this.formatearFecha(obs.fecha)
                    };
                });

                // Ordenar por fecha (más reciente primero)
                this.observaciones.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
            },
            error: (error) => {
                console.error('Error al cargar observaciones:', error);
            }
        });

        this.subscriptions.push(sub);
    }

    cambiarSprint(): void {
        if (this.idEstudiante !== "0") {
            this.cargarCalificacionesEstudiante();
            this.cargarObservacionesEstudiante();
            this.cargarMedidasAntropometricas();
        }
    }

    cargarCalificacionesEstudiante(): void {
        if (!this.sprintSeleccionado || this.idEstudiante === "0") {
            this.mostrarDashboard = false;
            return;
        }

        this.cargando = true;
        this.mostrarDashboard = false;

        const sub = this.calificacionesService.obtenerCalificacionesEstudianteDetalle(
            this.sprintSeleccionado,
            this.idEstudiante
        ).subscribe({
            next: (response: any) => {
                this.calificaciones = response.body || [];

                if (this.calificaciones.length > 0) {
                    // Asignar colores a los datos
                    this.calificaciones.forEach(item => {
                        item.color = this.obtenerColorPorCalificacion(item.valor_cualitativo);
                    });

                    // Filtrar calificaciones por parámetro 3 (similar al componente original)
                    this.filtrarCalificacionesPorParametro();

                    // Generar análisis de datos
                    this.generarPromediosPorArea();
                    this.generarPromediosPorIndicador();
                    this.generarPromediosPorLogro();
                    this.generarResumenEstudiante();

                    // Mostrar el dashboard
                    this.mostrarDashboard = true;

                    // Generar gráficos después de que el DOM esté listo
                    setTimeout(() => {
                        this.generarGraficos();
                    }, 500);
                } else {
                    this.mostrarDashboard = false;
                }

                this.cargando = false;
            },
            error: (error) => {
                console.error('Error al cargar calificaciones:', error);
                this.cargando = false;
            }
        });

        this.subscriptions.push(sub);
    }

    cargarMedidasAntropometricas(): void {
        if (!this.idEstudiante || this.idEstudiante === "0" || !this.sprintSeleccionado) return;

        // Obtener la fecha final del sprint seleccionado
        const sprintActual = this.sprints.find(s => s.id === this.sprintSeleccionado);
        if (!sprintActual) return;

        const sub = this.medidasXEstudianteService.obtenerTodosXEstudiante(this.idEstudiante).subscribe({
            next: (response: any) => {
                const todasMedidas = response.body || [];

                // Obtener fecha final del sprint
                const fechaFinSprint = sprintActual.fecha_final ? new Date(sprintActual.fecha_final) : new Date();

                // Filtrar medidas que sean anteriores o iguales a la fecha final del sprint
                const medidasValidas = todasMedidas.filter((medida: any) =>
                    new Date(medida.fecha) <= fechaFinSprint
                );

                // Ordenar por fecha descendente (más reciente primero)
                medidasValidas.sort((a: any, b: any) =>
                    new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
                );

                // Buscar el último peso (id_medida = 1)
                const pesoMasReciente = medidasValidas.find((m: any) => m.id_medida === 1);
                if (pesoMasReciente) {
                    this.ultimoPeso = {
                        ...pesoMasReciente,
                        unidad: 'kg'
                    };
                }

                // Buscar la última talla (id_medida = 2)
                const tallaMasReciente = medidasValidas.find((m: any) => m.id_medida === 2);
                if (tallaMasReciente) {
                    this.ultimaTalla = {
                        ...tallaMasReciente,
                        unidad: 'cm'
                    };
                }
            },
            error: (error) => {
                console.error('Error al cargar medidas antropométricas:', error);
            }
        });

        this.subscriptions.push(sub);
    }

    // Método para formatear fecha
    formatearFecha(fecha: string): string {
        if (!fecha) return '';
        const date = new Date(fecha);
        const dia = date.getDate().toString().padStart(2, '0');
        const mes = (date.getMonth() + 1).toString().padStart(2, '0');
        const anio = date.getFullYear();
        return `${dia}/${mes}/${anio}`;
    }

    // Método para obtener el color del tipo de observación
    getColorTipoObservacion(idTipo: number): string {
        const coloresTipos: { [key: number]: string } = {
            1: '#3498db',  // Académica - Azul
            2: '#e67e22',  // Disciplinaria - Naranja
            4: '#9b59b6'   // Social - Morado
        };
        return coloresTipos[idTipo] || '#6c757d';
    }

    // Método para obtener las observaciones agrupadas por tipo
    getObservacionesPorTipo(idTipo: number): ObservacionEstudiante[] {
        return this.observaciones.filter(obs => obs.id_tipo_observacion_estudiante === idTipo);
    }

    // Método para filtrar calificaciones por parámetro 3
    filtrarCalificacionesPorParametro(): void {
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

        // Si encontramos el campo de parámetro, filtramos por valor 3
        if (campoParametro) {
            this.calificacionesFiltradas = this.calificaciones.filter(item => item[campoParametro] === 3);

            // Si no hay registros con parámetro 3, usamos todos los datos
            if (this.calificacionesFiltradas.length === 0) {
                this.calificacionesFiltradas = [...this.calificaciones];
            }
        } else {
            // Si no encontramos un campo de parámetro, usamos todos los datos
            this.calificacionesFiltradas = [...this.calificaciones];
        }
    }

    generarPromediosPorArea(): void {
        if (this.calificacionesFiltradas.length === 0) {
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
                area.promedio = Number((suma / area.valores.length).toFixed(1));
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

    generarPromediosPorIndicador(): void {
        if (this.calificacionesFiltradas.length === 0) {
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
                indicador.promedio = Number((suma / indicador.valores.length).toFixed(1));
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

        // Obtener áreas únicas para el filtro
        this.areasUnicas = Array.from(
            new Set(this.datosIndicadores.map(i => i.area_academica_nombre))
        ).sort();
    }

    /**
     * Genera promedios por LOGRO (el padre de los indicadores).
     * Promedio del logro = promedio simple de TODAS las calificaciones cuyo indicador pertenece al logro.
     * Cada logro lleva sus indicadores anidados (ya calculados en datosIndicadores).
     */
    generarPromediosPorLogro(): void {
        if (this.calificacionesFiltradas.length === 0) {
            this.datosLogros = [];
            this.logrosFiltrados = [];
            return;
        }

        // Verificar si hay datos de logro en las calificaciones
        const tieneLogros = this.calificacionesFiltradas.some(item =>
            item['id_logro'] !== undefined && item['id_logro'] !== null &&
            item['logro_nombre'] !== undefined
        );

        if (!tieneLogros) {
            this.datosLogros = [];
            this.logrosFiltrados = [];
            return;
        }

        // Agrupar por logro
        const logros = new Map<number, LogroPromedio>();

        this.calificacionesFiltradas.forEach(item => {
            if (!item['id_logro'] || !item['id_area_academica'] ||
                item['valor_cuantitativo'] === undefined || !item['logro_nombre']) return;

            const idLogro = item['id_logro'];

            if (!logros.has(idLogro)) {
                logros.set(idLogro, {
                    id_logro: idLogro,
                    logro_nombre: item['logro_nombre'],
                    id_area_academica: item['id_area_academica'],
                    area_academica_nombre: item['area_academica_nombre'] || '',
                    valores: [],
                    promedio: 0,
                    valor_cualitativo: '',
                    indicadores: []
                });
            }

            logros.get(idLogro)!.valores.push(item['valor_cuantitativo']);
        });

        // Calcular promedios y anidar indicadores
        this.datosLogros = Array.from(logros.values()).map(logro => {
            if (logro.valores.length > 0) {
                const suma = logro.valores.reduce((a, b) => a + b, 0);
                logro.promedio = Number((suma / logro.valores.length).toFixed(1));
                logro.valor_cualitativo = this.determinarValorCualitativo(logro.promedio);
                logro.color = this.obtenerColorPorCalificacion(logro.valor_cualitativo);
            } else {
                logro.promedio = 0;
                logro.valor_cualitativo = 'Sin calificación';
                logro.color = this.obtenerColorPorCalificacion('Sin calificación');
            }

            // Anidar los indicadores que pertenecen a este logro
            // Vinculamos a través de las calificaciones: id_logro <-> id_indicador_logro
            const indicadoresIdsDelLogro = new Set<number>();
            this.calificacionesFiltradas.forEach(item => {
                if (item['id_logro'] === logro.id_logro && item['id_indicador_logro']) {
                    indicadoresIdsDelLogro.add(item['id_indicador_logro']);
                }
            });
            logro.indicadores = this.datosIndicadores.filter(ind =>
                indicadoresIdsDelLogro.has(ind.id_indicador_logro)
            );

            return logro;
        });

        // Ordenar por área y luego por nombre del logro
        this.datosLogros.sort((a, b) => {
            const areaCompare = a.area_academica_nombre.localeCompare(b.area_academica_nombre);
            if (areaCompare !== 0) return areaCompare;
            return a.logro_nombre.localeCompare(b.logro_nombre);
        });

        this.logrosFiltrados = [...this.datosLogros];
    }

    // MÉTODO ACTUALIZADO - Generar resumen del estudiante con escala 0-4
    generarResumenEstudiante(): void {
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
        const promedioGeneral = Number((sumaTotal / valoresValidos.length).toFixed(1));
        const valorCualitativoGeneral = this.determinarValorCualitativo(promedioGeneral);

        // ACTUALIZADO: Identificar áreas fuertes y a mejorar con escala 0-4
        const areasFuertes = this.datosPromedio
            .filter(area => area.promedio >= 3.2)  // 80% del máximo (3.2 de 4)
            .map(area => area.area_academica_nombre);

        const areasMejorar = this.datosPromedio
            .filter(area => area.promedio < 2.8 && area.promedio > 0)  // menos del 70% (2.8 de 4)
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
            ? Number((actividadesCompletadas / totalActividades * 100).toFixed(1))
            : 0;

        // Determinación simplificada de tendencia
        const tendencia = 'estable';

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

    generarGraficos(): void {
        // Limpiar gráficos existentes
        this.limpiarGraficos();

        // Generar gráficos si hay datos
        if (this.datosPromedio.length > 0) {
            this.generarGraficoPromedios();
            this.generarGraficoPolar();
        }
    }

    limpiarGraficos(): void {
        // Destruir gráficos existentes
        Object.values(this.charts).forEach(chart => chart.destroy());
        this.charts = {};
    }

    // MÉTODO ACTUALIZADO - Generar gráfico de promedios con escala 0-4
    generarGraficoPromedios(): void {
        const ctx = document.getElementById('graficoPromediosAreas') as HTMLCanvasElement;
        if (!ctx) return;

        // Limpiar gráfico existente si hay alguno
        const existingChart = Chart.getChart(ctx);
        if (existingChart) {
            existingChart.destroy();
        }

        const labels = this.datosPromedio.map(area => area.area_academica_nombre);
        const data = this.datosPromedio.map(area => area.promedio);
        const bgColors = this.datosPromedio.map((area, index) => this.obtenerColorGrafico(index));

        // Detectar si estamos en móvil
        const isMobile = window.innerWidth <= 768;

        const chart = new Chart(ctx, {
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
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: !isMobile, // Ocultar leyenda en móvil
                        position: 'top',
                        labels: {
                            boxWidth: 12,
                            padding: 10,
                            font: {
                                size: 11
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.7)',
                        titleFont: {
                            size: isMobile ? 10 : 12
                        },
                        bodyFont: {
                            size: isMobile ? 9 : 11
                        },
                        padding: isMobile ? 8 : 10,
                        cornerRadius: 3,
                        callbacks: {
                            label: function (context) {
                                return `Promedio: ${Number(context.parsed.y).toFixed(1)}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 4.0,  // ACTUALIZADO: Escala máxima 4.0
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        },
                        ticks: {
                            stepSize: 0.5,  // ACTUALIZADO: Intervalos de 0.5
                            font: {
                                size: isMobile ? 8 : 10
                            },
                            callback: function (value) {
                                return Number(value).toFixed(1);
                            }
                        },
                        title: {
                            display: !isMobile,
                            text: 'Promedio',
                            color: '#666',
                            font: {
                                size: 11,
                                weight: 'normal'
                            },
                            padding: {
                                bottom: 10
                            }
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            maxRotation: isMobile ? 45 : 0,
                            minRotation: isMobile ? 45 : 0,
                            font: {
                                size: isMobile ? 8 : 9
                            },
                            autoSkip: false,
                            callback: function (value: any, index: number, values: any) {
                                const label = this.getLabelForValue(value);
                                if (isMobile) {
                                    // En móvil, truncar texto largo
                                    return label.length > 15 ? label.substring(0, 15) + '...' : label;
                                } else {
                                    // En desktop, dividir en líneas si es muy largo
                                    if (label.length > 30) {
                                        const words = label.split(' ');
                                        const half = Math.ceil(words.length / 2);
                                        return [
                                            words.slice(0, half).join(' '),
                                            words.slice(half).join(' ')
                                        ];
                                    }
                                }
                                return label;
                            }
                        },
                        title: {
                            display: !isMobile,
                            text: 'Áreas Académicas',
                            color: '#666',
                            font: {
                                size: 11,
                                weight: 'normal'
                            },
                            padding: {
                                top: 10
                            }
                        }
                    }
                },
                layout: {
                    padding: {
                        left: isMobile ? 5 : 10,
                        right: isMobile ? 5 : 10,
                        top: 0,
                        bottom: isMobile ? 40 : 30
                    }
                },
                animation: {
                    duration: 500
                }
            }
        });

        this.charts['promedios'] = chart;
    }

    // MÉTODO ACTUALIZADO - Generar gráfico polar con escala 0-4
    generarGraficoPolar(): void {
        const ctx = document.getElementById('graficoRadar') as HTMLCanvasElement;
        if (!ctx) return;

        // Limpiar gráfico existente si hay alguno
        const existingChart = Chart.getChart(ctx);
        if (existingChart) {
            existingChart.destroy();
        }

        const labels = this.datosPromedio.map(area => area.area_academica_nombre);
        const data = this.datosPromedio.map(area => area.promedio);

        // Detectar si estamos en móvil
        const isMobile = window.innerWidth <= 768;

        // Colores más contrastantes para el gráfico polar
        const bgColors = this.datosPromedio.map((area, index) => {
            const baseColor = this.obtenerColorGrafico(index).replace('0.8', '0.6');
            return baseColor;
        });

        const chart = new Chart(ctx, {
            type: 'polarArea',
            data: {
                labels: labels.map(label => {
                    // Truncar etiquetas largas en móvil
                    if (isMobile && label.length > 20) {
                        return label.substring(0, 20) + '...';
                    }
                    return label;
                }),
                datasets: [{
                    label: 'Desempeño por Área',
                    data: data,
                    backgroundColor: bgColors,
                    borderWidth: 1,
                    borderColor: bgColors.map(color => color.replace('0.6', '0.8'))
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: isMobile ? 'bottom' : 'right',
                        labels: {
                            boxWidth: isMobile ? 10 : 12,
                            padding: isMobile ? 5 : 8,
                            font: {
                                size: isMobile ? 8 : 10
                            },
                            generateLabels: function (chart) {
                                const original = Chart.defaults.plugins.legend.labels.generateLabels;
                                const labels = original.call(this, chart);

                                // Truncar etiquetas en móvil
                                if (isMobile) {
                                    labels.forEach(label => {
                                        if (label.text && label.text.length > 25) {
                                            label.text = label.text.substring(0, 25) + '...';
                                        }
                                    });
                                }

                                return labels;
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.7)',
                        titleFont: {
                            size: isMobile ? 10 : 12
                        },
                        bodyFont: {
                            size: isMobile ? 9 : 11
                        },
                        padding: isMobile ? 8 : 10,
                        cornerRadius: 3,
                        callbacks: {
                            label: function (context) {
                                const value = context.raw as number;
                                let label = context.label || '';

                                // Si el label fue truncado, mostrar el completo en tooltip
                                const fullLabel = labels[context.dataIndex];
                                if (fullLabel !== label) {
                                    label = fullLabel;
                                }

                                return `${label}: ${Number(value).toFixed(1)}`;
                            }
                        }
                    }
                },
                scales: {
                    r: {
                        min: 0,
                        max: 4,  // ACTUALIZADO: Escala máxima 4
                        ticks: {
                            stepSize: 0.5,  // ACTUALIZADO: Intervalos de 0.5
                            backdropColor: 'transparent',
                            color: '#666',
                            font: {
                                size: isMobile ? 7 : 9
                            },
                            callback: function (value) {
                                return Number(value).toFixed(1);
                            }
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        },
                        angleLines: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        },
                        pointLabels: {
                            font: {
                                size: isMobile ? 8 : 10
                            },
                            callback: function (label) {
                                // Truncar etiquetas del eje radial en móvil
                                if (isMobile && label.length > 15) {
                                    return label.substring(0, 15) + '...';
                                }
                                return label;
                            }
                        }
                    }
                },
                layout: {
                    padding: {
                        left: isMobile ? 0 : 5,
                        right: isMobile ? 0 : 5,
                        top: isMobile ? 0 : 5,
                        bottom: isMobile ? 0 : 5
                    }
                },
                animation: {
                    duration: 500
                }
            }
        });

        this.charts['polar'] = chart;
    }

    // Método para obtener el promedio de un área por su nombre
    getPromedioPorArea(nombreArea: string): number {
        const area = this.datosPromedio.find(a => a.area_academica_nombre === nombreArea);
        return area ? area.promedio : 0;
    }

    // Método para obtener clase CSS según valor cualitativo
    getValorCualitativoClass(valorCualitativo: string): string {
        valorCualitativo = valorCualitativo.toLowerCase();
        return `bg-${valorCualitativo}`;
    }

    // MÉTODO ACTUALIZADO - Obtener clase CSS según el promedio con escala 0-4
    getPromedioClass(promedio?: number): string {
        if (!promedio) return 'bg-secondary';
        
        if (promedio >= 3.6) return 'bg-excelente';     // 90%+
        if (promedio >= 3.2) return 'bg-sobresaliente'; // 80%+
        if (promedio >= 2.8) return 'bg-bueno';         // 70%+
        if (promedio >= 2.4) return 'bg-aceptable';     // 60%+
        return 'bg-insuficiente';
    }

    // MÉTODO ACTUALIZADO - Determinar valor cualitativo con escala 0-4
    determinarValorCualitativo(promedio: number): ValorCalificativo {
        if (promedio >= 3.6) return 'Excelente';      // 90% - 100% de 4
        if (promedio >= 3.2) return 'Sobresaliente';  // 80% - 89% de 4
        if (promedio >= 2.8) return 'Bueno';          // 70% - 79% de 4
        if (promedio >= 2.4) return 'Aceptable';      // 60% - 69% de 4
        if (promedio >= 1.0) return 'Insuficiente';   // 25% - 59% de 4
        return 'Sin calificación';
    }

    obtenerColorPorCalificacion(valorCualitativo: ValorCalificativo): string {
        return this.coloresCalificacion[valorCualitativo] || this.coloresCalificacion['Sin calificación'];
    }

    obtenerColorGrafico(indice: number): string {
        return this.coloresGrafico[indice % this.coloresGrafico.length];
    }

    // Método para obtener el promedio general formateado de forma segura
    getPromedioGeneralFormateado(): string {
        if (this.resumenEstudiante && this.resumenEstudiante.promedio_general) {
            return Number(this.resumenEstudiante.promedio_general.toFixed(1)).toString();
        }
        return '0.0';
    }

    // Método para obtener el total de áreas fuertes de forma segura
    getNumeroAreasFuertes(): number {
        if (this.resumenEstudiante && this.resumenEstudiante.areas_fuertes) {
            return this.resumenEstudiante.areas_fuertes.length;
        }
        return 0;
    }

    // Método para obtener el total de áreas por mejorar de forma segura
    getNumeroAreasMejorar(): number {
        if (this.resumenEstudiante && this.resumenEstudiante.areas_mejorar) {
            return this.resumenEstudiante.areas_mejorar.length;
        }
        return 0;
    }

    // MÉTODO ACTUALIZADO - Calcular el ancho de la barra de progreso con escala 0-4
    getAnchoBarraProgreso(): number {
        if (this.resumenEstudiante && this.resumenEstudiante.promedio_general) {
            // Multiplicar por 25 para que 4 = 100%
            return Number((this.resumenEstudiante.promedio_general * 25).toFixed(2));
        }
        return 0;
    }

    // Método para verificar si no hay áreas fuertes
    noHayAreasFuertes(): boolean {
        return !this.resumenEstudiante ||
            !this.resumenEstudiante.areas_fuertes ||
            this.resumenEstudiante.areas_fuertes.length === 0;
    }

    // Método para verificar si no hay áreas por mejorar
    noHayAreasMejorar(): boolean {
        return !this.resumenEstudiante ||
            !this.resumenEstudiante.areas_mejorar ||
            this.resumenEstudiante.areas_mejorar.length === 0;
    }

    // Métodos para filtros de LOGROS
    aplicarFiltroLogros(): void {
        let resultados = [...this.datosLogros];

        // 1. Filtrar por área
        if (this.filtroAreaLogros) {
            resultados = resultados.filter(l =>
                l.area_academica_nombre === this.filtroAreaLogros
            );
        }

        // 2. Filtrar por clasificación
        if (this.filtroClasificacionLogros) {
            resultados = resultados.filter(l =>
                l.valor_cualitativo === this.filtroClasificacionLogros
            );
        }

        // 3. Filtro de texto: busca en nombre del logro Y en sus indicadores anidados
        if (this.filtroLogros && this.filtroLogros.trim() !== '') {
            const filtro = this.filtroLogros.toLowerCase().trim();
            resultados = resultados.filter(l => {
                const matchLogro = l.logro_nombre.toLowerCase().includes(filtro) ||
                    l.area_academica_nombre.toLowerCase().includes(filtro);
                const matchIndicador = (l.indicadores || []).some(ind =>
                    ind.descripcion_indicador_logro.toLowerCase().includes(filtro)
                );
                return matchLogro || matchIndicador;
            });
        }

        this.logrosFiltrados = resultados;
    }

    limpiarFiltroLogros(): void {
        this.filtroLogros = '';
        this.aplicarFiltroLogros();
    }

    resetearFiltrosLogros(): void {
        this.filtroLogros = '';
        this.filtroAreaLogros = '';
        this.filtroClasificacionLogros = '';
        this.logrosFiltrados = [...this.datosLogros];
    }

    limpiarFiltroAreaLogros(): void {
        this.filtroAreaLogros = '';
        this.aplicarFiltroLogros();
    }

    limpiarFiltroClasificacionLogros(): void {
        this.filtroClasificacionLogros = '';
        this.aplicarFiltroLogros();
    }

    limpiarFiltroTextoLogros(): void {
        this.filtroLogros = '';
        this.aplicarFiltroLogros();
    }

    tieneFiltrosLogrosActivos(): boolean {
        return !!(this.filtroAreaLogros ||
            this.filtroClasificacionLogros ||
            this.filtroLogros);
    }

    private async cargarLogoBase64(): Promise<string> {
        try {
            // Obtener la URL del logo desde el servicio de configuración
            const logoUrl = this.institucionConfigService.getLogoUrl();
            
            const response = await fetch(logoUrl);
            const blob = await response.blob();

            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    resolve(reader.result as string);
                };
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        } catch (error) {
            console.error('Error al cargar el logo desde:', this.institucionConfigService.getLogoUrl(), error);
            return '';
        }
    }

    async exportarPDF(): Promise<void> {
        try {
            // Cargar el logo primero
            const logoBase64 = await this.cargarLogoBase64();

            // Obtener la fecha final del sprint
            const sprintActual = this.sprints.find(s => s.id === this.sprintSeleccionado);
            const fechaSprint = sprintActual?.fecha_final
                ? new Date(sprintActual.fecha_final).toLocaleDateString('es-CO', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                })
                : 'Fecha no disponible';

            // Preparar los datos para el PDF
            const datosPDF: DatosEvaluacionPDF = {
                nombreEstudiante: this.getNombreEstudiante(),
                nombreSprint: this.getNombreSprint(),
                fecha: fechaSprint,
                resumenEstudiante: this.resumenEstudiante || undefined,
                datosPromedio: this.datosPromedio,
                datosIndicadores: this.datosIndicadores,
                datosLogros: this.datosLogros,
                observaciones: this.observaciones,
                medidasAntropometricas: {
                    peso: this.ultimoPeso ? {
                        valor: this.ultimoPeso.valor,
                        fecha: this.ultimoPeso.fecha,
                        unidad: this.ultimoPeso.unidad || 'kg'
                    } : null,
                    talla: this.ultimaTalla ? {
                        valor: this.ultimaTalla.valor,
                        fecha: this.ultimaTalla.fecha,
                        unidad: this.ultimaTalla.unidad || 'cm'
                    } : null
                },
                logoBase64: logoBase64
            };

            // Generar el PDF
            this.exportarPdfEvaluacionService.generarPDF(datosPDF);

            // Mostrar mensaje de éxito
            this.mostrarMensajeExito('PDF generado exitosamente');
        } catch (error) {
            console.error('Error al generar el PDF:', error);
            alert('Ocurrió un error al generar el PDF. Por favor, intente nuevamente.');
        }
    }

    // Método para mostrar mensaje de éxito
    private mostrarMensajeExito(mensaje: string): void {
        const successMessage = document.createElement('div');
        successMessage.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background-color: #28a745;
            color: white;
            padding: 15px 20px;
            border-radius: 5px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            z-index: 9999;
            animation: slideIn 0.3s ease-out;
        `;
        successMessage.innerHTML = `
            <i class="fas fa-check-circle"></i> ${mensaje}
        `;

        // Agregar animación CSS
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
        `;
        document.head.appendChild(style);

        document.body.appendChild(successMessage);

        // Remover después de 3 segundos
        setTimeout(() => {
            successMessage.style.animation = 'slideIn 0.3s ease-out reverse';
            setTimeout(() => {
                document.body.removeChild(successMessage);
                document.head.removeChild(style);
            }, 300);
        }, 3000);
    }

    // Métodos auxiliares para obtener información
    private getNombreEstudiante(): string {
        // Si tienes acceso al nombre del estudiante desde las calificaciones
        if (this.calificaciones.length > 0 && this.calificaciones[0].nombre_completo_estudiante) {
            return this.calificaciones[0].nombre_completo_estudiante;
        }
        return `Estudiante ${this.idEstudiante}`;
    }

    private getNombreSprint(): string {
        const sprint = this.sprints.find(s => s.id === this.sprintSeleccionado);
        return sprint ? sprint.nombre_sprint : 'Sprint no especificado';
    }
}