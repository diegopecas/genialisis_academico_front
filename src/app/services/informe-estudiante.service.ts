import { Injectable } from '@angular/core';
import { forkJoin, Observable, from } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { CalificacionesService } from './calificaciones.service';
import { ObservacionesEstudiantesService } from './observaciones-estudiantes.service';
import { TiposObservacionesEstudiantesService } from './tipos-observaciones-estudiantes.service';
import { MedidasXEstudianteService } from './medidas-x-estudiante.service';
import { InstitucionConfigService } from './institucion-config.service';
import { DatosEvaluacionPDF, ExportarPdfEvaluacionService } from './exportar-pdf-evaluacion.service';

type ValorCalificativo = 'Excelente' | 'Sobresaliente' | 'Bueno' | 'Aceptable' | 'Insuficiente' | 'Sin calificación';

interface SprintInfo {
    id: number;
    nombre_sprint: string;
    fecha_final: string;
    nombre_corte_academico?: string | null;
}

@Injectable({ providedIn: 'root' })
export class InformeEstudianteService {

    constructor(
        private calificacionesService: CalificacionesService,
        private observacionesService: ObservacionesEstudiantesService,
        private tiposObservacionesService: TiposObservacionesEstudiantesService,
        private medidasService: MedidasXEstudianteService,
        private institucionConfigService: InstitucionConfigService,
        private exportarPdfService: ExportarPdfEvaluacionService
    ) { }

    // Genera y descarga el PDF del informe del estudiante para un sprint dado.
    // Replica la lógica de exportarPDF() del componente estudiante-evaluaciones.
    generarYDescargarInforme(idEstudiante: number | string, sprint: SprintInfo): Observable<void> {
        return forkJoin({
            calificaciones: this.calificacionesService.obtenerCalificacionesEstudianteDetalle(sprint.id, idEstudiante),
            observaciones: this.observacionesService.obtenerPorEstudiante(idEstudiante),
            tiposObservaciones: this.tiposObservacionesService.obtenerTodos(),
            medidas: this.medidasService.obtenerTodosXEstudiante(idEstudiante),
            logoBase64: from(this.cargarLogoBase64())
        }).pipe(
            switchMap((resp: any) => {
                const calificaciones: any[] = resp.calificaciones?.body || [];
                const observacionesAll: any[] = resp.observaciones?.body || [];
                const tiposObservaciones: any[] = resp.tiposObservaciones?.body || [];
                const medidasAll: any[] = resp.medidas?.body || [];

                // Filtrar observaciones del sprint y para informe
                const observaciones = observacionesAll
                    .filter((obs: any) => String(obs.id_sprint) === String(sprint.id) && Number(obs.para_informe) === 1)
                    .map((obs: any) => {
                        const tipo = tiposObservaciones.find((t: any) => Number(t.id) === Number(obs.id_tipo_observacion_estudiante));
                        return {
                            ...obs,
                            nombre_tipo_observacion: tipo ? tipo.nombre : 'Desconocido',
                            fechaFormateada: this.formatearFecha(obs.fecha)
                        };
                    })
                    .sort((a: any, b: any) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

                // Filtrar calificaciones por parámetro 3 (igual que el componente original)
                const calificacionesFiltradas = this.filtrarCalificacionesPorParametro(calificaciones);

                // Generar análisis de datos
                const datosPromedio = this.generarPromediosPorArea(calificacionesFiltradas);
                const datosIndicadores = this.generarPromediosPorIndicador(calificacionesFiltradas);
                const datosLogros = this.generarPromediosPorLogro(calificacionesFiltradas, datosIndicadores);
                const resumenEstudiante = this.generarResumenEstudiante(calificaciones, calificacionesFiltradas, datosPromedio);

                // Filtrar medidas hasta la fecha final del sprint
                const fechaFinSprint = sprint.fecha_final ? new Date(sprint.fecha_final) : new Date();
                const medidasValidas = medidasAll
                    .filter((m: any) => new Date(m.fecha) <= fechaFinSprint)
                    .sort((a: any, b: any) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

                const pesoMasReciente = medidasValidas.find((m: any) => Number(m.id_medida) === 1);
                const tallaMasReciente = medidasValidas.find((m: any) => Number(m.id_medida) === 2);

                const ultimoPeso = pesoMasReciente
                    ? { valor: pesoMasReciente.valor, fecha: pesoMasReciente.fecha, unidad: 'kg' }
                    : null;
                const ultimaTalla = tallaMasReciente
                    ? { valor: tallaMasReciente.valor, fecha: tallaMasReciente.fecha, unidad: 'cm' }
                    : null;

                const nombreEstudiante = calificaciones.length > 0 && calificaciones[0].nombre_completo_estudiante
                    ? calificaciones[0].nombre_completo_estudiante
                    : `Estudiante ${idEstudiante}`;

                const fechaSprintTexto = sprint.fecha_final
                    ? new Date(sprint.fecha_final).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })
                    : 'Fecha no disponible';

                const datosPDF: DatosEvaluacionPDF = {
                    nombreEstudiante: nombreEstudiante,
                    nombreSprint: sprint.nombre_corte_academico || sprint.nombre_sprint || 'Sprint no especificado',
                    fecha: fechaSprintTexto,
                    resumenEstudiante: resumenEstudiante || undefined,
                    datosPromedio: datosPromedio,
                    datosIndicadores: datosIndicadores,
                    datosLogros: datosLogros,
                    observaciones: observaciones,
                    medidasAntropometricas: { peso: ultimoPeso, talla: ultimaTalla },
                    logoBase64: resp.logoBase64
                };

                this.exportarPdfService.generarPDF(datosPDF);
                return from([undefined as any]).pipe(map(() => void 0));
            })
        );
    }

    // ============================================
    // PROCESAMIENTO (replica de estudiante-evaluaciones)
    // ============================================

    private filtrarCalificacionesPorParametro(calificaciones: any[]): any[] {
        if (calificaciones.length === 0) return [];

        const primerRegistro = calificaciones[0];
        let campoParametro = '';

        if (primerRegistro['id_parametro_calificacion'] !== undefined) campoParametro = 'id_parametro_calificacion';
        else if (primerRegistro['parametro_calificacion_id'] !== undefined) campoParametro = 'parametro_calificacion_id';
        else if (primerRegistro['id_parametro'] !== undefined) campoParametro = 'id_parametro';

        if (campoParametro) {
            const filtradas = calificaciones.filter((item: any) => item[campoParametro] === 3);
            return filtradas.length === 0 ? [...calificaciones] : filtradas;
        }
        return [...calificaciones];
    }

    private generarPromediosPorArea(calificacionesFiltradas: any[]): any[] {
        if (calificacionesFiltradas.length === 0) return [];

        const areas = new Map<number, any>();

        calificacionesFiltradas.forEach((item: any) => {
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

        const resultado = Array.from(areas.values()).map((area: any) => {
            if (area.valores.length > 0) {
                const suma = area.valores.reduce((a: number, b: number) => a + b, 0);
                area.promedio = Number((suma / area.valores.length).toFixed(1));
                area.valor_cualitativo = this.determinarValorCualitativo(area.promedio);
            } else {
                area.promedio = 0;
                area.valor_cualitativo = 'Sin calificación';
            }
            return area;
        });

        resultado.sort((a: any, b: any) => a.area_academica_nombre.localeCompare(b.area_academica_nombre));
        return resultado;
    }

    private generarPromediosPorIndicador(calificacionesFiltradas: any[]): any[] {
        if (calificacionesFiltradas.length === 0) return [];

        const tieneIndicadores = calificacionesFiltradas.some((item: any) =>
            item['id_indicador_logro'] !== undefined && item['descripcion_indicador_logro'] !== undefined
        );
        if (!tieneIndicadores) return [];

        const indicadores = new Map<string, any>();

        calificacionesFiltradas.forEach((item: any) => {
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

        const resultado = Array.from(indicadores.values()).map((indicador: any) => {
            if (indicador.valores.length > 0) {
                const suma = indicador.valores.reduce((a: number, b: number) => a + b, 0);
                indicador.promedio = Number((suma / indicador.valores.length).toFixed(1));
                indicador.valor_cualitativo = this.determinarValorCualitativo(indicador.promedio);
            } else {
                indicador.promedio = 0;
                indicador.valor_cualitativo = 'Sin calificación';
            }
            return indicador;
        });

        resultado.sort((a: any, b: any) => {
            const areaCompare = a.area_academica_nombre.localeCompare(b.area_academica_nombre);
            if (areaCompare !== 0) return areaCompare;
            return a.descripcion_indicador_logro.localeCompare(b.descripcion_indicador_logro);
        });
        return resultado;
    }

    private generarPromediosPorLogro(calificacionesFiltradas: any[], datosIndicadores: any[]): any[] {
        if (calificacionesFiltradas.length === 0) return [];

        const tieneLogros = calificacionesFiltradas.some((item: any) =>
            item['id_logro'] !== undefined && item['id_logro'] !== null && item['logro_nombre'] !== undefined
        );
        if (!tieneLogros) return [];

        const logros = new Map<number, any>();

        calificacionesFiltradas.forEach((item: any) => {
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

        const resultado = Array.from(logros.values()).map((logro: any) => {
            if (logro.valores.length > 0) {
                const suma = logro.valores.reduce((a: number, b: number) => a + b, 0);
                logro.promedio = Number((suma / logro.valores.length).toFixed(1));
                logro.valor_cualitativo = this.determinarValorCualitativo(logro.promedio);
            } else {
                logro.promedio = 0;
                logro.valor_cualitativo = 'Sin calificación';
            }

            const indicadoresIdsDelLogro = new Set<number>();
            calificacionesFiltradas.forEach((item: any) => {
                if (item['id_logro'] === logro.id_logro && item['id_indicador_logro']) {
                    indicadoresIdsDelLogro.add(item['id_indicador_logro']);
                }
            });
            logro.indicadores = datosIndicadores.filter((ind: any) =>
                indicadoresIdsDelLogro.has(ind.id_indicador_logro)
            );
            return logro;
        });

        resultado.sort((a: any, b: any) => {
            const areaCompare = a.area_academica_nombre.localeCompare(b.area_academica_nombre);
            if (areaCompare !== 0) return areaCompare;
            return a.logro_nombre.localeCompare(b.logro_nombre);
        });
        return resultado;
    }

    private generarResumenEstudiante(calificaciones: any[], calificacionesFiltradas: any[], datosPromedio: any[]): any {
        if (calificacionesFiltradas.length === 0 || datosPromedio.length === 0) return null;

        const valoresValidos = calificacionesFiltradas
            .filter((item: any) => item['valor_cuantitativo'] !== undefined)
            .map((item: any) => item['valor_cuantitativo']);
        if (valoresValidos.length === 0) return null;

        const sumaTotal = valoresValidos.reduce((a: number, b: number) => a + b, 0);
        const promedioGeneral = Number((sumaTotal / valoresValidos.length).toFixed(1));
        const valorCualitativoGeneral = this.determinarValorCualitativo(promedioGeneral);

        const areasFuertes = datosPromedio
            .filter((area: any) => area.promedio >= 3.2)
            .map((area: any) => area.area_academica_nombre);

        const areasMejorar = datosPromedio
            .filter((area: any) => area.promedio < 2.8 && area.promedio > 0)
            .map((area: any) => area.area_academica_nombre);

        const totalActividades = new Set(calificaciones.map((item: any) => item['id_tarea_x_sprint'])).size;
        const actividadesCompletadas = calificaciones
            .filter((item: any) => item['estado_tarea_nombre'] === 'Ejecutada')
            .reduce((uniqueIds: Set<any>, item: any) => {
                uniqueIds.add(item['id_tarea_x_sprint']);
                return uniqueIds;
            }, new Set()).size;

        const porcentajeCompletado = totalActividades > 0
            ? Number((actividadesCompletadas / totalActividades * 100).toFixed(1))
            : 0;

        return {
            promedio_general: promedioGeneral,
            valor_cualitativo_general: valorCualitativoGeneral,
            areas_fuertes: areasFuertes,
            areas_mejorar: areasMejorar,
            tendencia: 'estable',
            total_actividades: totalActividades,
            actividades_completadas: actividadesCompletadas,
            porcentaje_completado: porcentajeCompletado
        };
    }

    private determinarValorCualitativo(promedio: number): ValorCalificativo {
        if (promedio >= 3.6) return 'Excelente';
        if (promedio >= 3.2) return 'Sobresaliente';
        if (promedio >= 2.8) return 'Bueno';
        if (promedio >= 2.4) return 'Aceptable';
        if (promedio >= 1.0) return 'Insuficiente';
        return 'Sin calificación';
    }

    private async cargarLogoBase64(): Promise<string> {
        try {
            const logoUrl = this.institucionConfigService.getLogoUrl();
            const response = await fetch(logoUrl);
            const blob = await response.blob();
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        } catch {
            return '';
        }
    }

    private formatearFecha(fecha: string): string {
        if (!fecha) return '';
        try {
            const d = new Date(fecha);
            if (isNaN(d.getTime())) return fecha;
            return d.toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
        } catch {
            return fecha;
        }
    }
}