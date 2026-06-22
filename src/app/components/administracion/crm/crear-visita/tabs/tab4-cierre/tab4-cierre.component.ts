import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { trigger, state, style, transition, animate } from '@angular/animations';

@Component({
    selector: 'app-tab4-cierre',
    templateUrl: './tab4-cierre.component.html',
    styleUrl: './tab4-cierre.component.scss',
    standalone: true,
    imports: [CommonModule, FormsModule],
    animations: [
        trigger('slideDown', [
            state('collapsed', style({
                height: '0',
                opacity: '0',
                overflow: 'hidden'
            })),
            state('expanded', style({
                height: '*',
                opacity: '1',
                overflow: 'visible'
            })),
            transition('collapsed <=> expanded', animate('300ms cubic-bezier(0.4, 0.0, 0.2, 1)'))
        ])
    ]
})
export class Tab4CierreComponent implements OnInit, OnChanges {

    @Input() visitaData: any = {};
    @Input() soloLectura: boolean = false;
    @Input() catalogos: any = null;
    @Output() datosActualizados = new EventEmitter<any>();

    // ✅ CONTROL DE CARDS COLAPSABLES
    cardsExpandidas: boolean[] = [true, false, false, false, false, false, false, false, false];
    todasExpandidas: boolean = false;

    // ✅ DIRTY TRACKING - Rastreo de cambios
    private seccionesModificadas = new Set<string>();
    private debounceTimer: any;

    // Catálogos
    tiposResultado: any[] = [];
    serviciosJardin: any[] = [];
    tiposImportanciaDetalle: any[] = [];
    tiposNivelAgradecimiento: any[] = [];
    serviciosFaltantes: any[] = [];
    tiposImportanciaServicioFaltante: any[] = [];
    aspectosMejorar: any[] = [];
    tiposValidezFeedback: any[] = [];
    tiposPerfilEconomico: any[] = [];
    tiposNivelExigencia: any[] = [];
    tiposSemaforoCliente: any[] = [];
    tiposInclinacionDecision: any[] = [];

    // Datos del formulario
    resultadoSeleccionado: string | null = null;
    notasResultado: string = '';

    serviciosGustaronSeleccionados: string[] = [];
    otrosAspectosPositivos: string = '';
    factorDecisivo: string = '';

    dioDetalle: boolean | null = null;
    queDetalle: string = '';
    importanciaDetalle: number | null = null;
    nivelAgradecimiento: number | null = null;
    comentariosDetalle: string = '';

    serviciosNoTenemos: any[] = [];

    aspectosMejorarSeleccionados: string[] = [];
    comentariosMejorar: string = '';
    validezFeedback: number | null = null;

    perfilEconomico: number | null = null;
    nivelExigencia: number | null = null;
    semaforoCliente: number | null = null;
    senalesComportamiento: string = '';
    esClienteIdeal: string = '';
    justificacionClienteIdeal: string = '';

    mencionoCompetencia: boolean | null = null;
    jardinesMencionados: string = '';
    queGustoCompetencia: string = '';
    porQueNosConsideran: string = '';
    principalCompetidor: string = '';
    inclinacionDecision: number | null = null;

    queSalioBien: string = '';
    queMejorarProximo: string = '';
    queSorprendio: string = '';
    recomendacionesEquipo: string = '';
    resumenEjecutivo: string = '';

    private cargandoDatos: boolean = false;

    constructor() { }

    ngOnInit(): void {
        if (this.catalogos) {
            this.asignarCatalogos();
        }
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['catalogos'] && this.catalogos) {
            this.asignarCatalogos();
        }

        if (changes['visitaData'] && !changes['visitaData'].firstChange) {
            this.cargarDatosExistentes();
        }
    }

    asignarCatalogos(): void {
        console.log('✅ TAB 4 - Asignando catálogos recibidos del padre');

        this.tiposResultado = this.catalogos.tipos_resultado_visita || [];
        this.serviciosJardin = this.catalogos.servicios_jardin || [];
        this.tiposImportanciaDetalle = this.catalogos.tipos_importancia_detalle || [];
        this.tiposNivelAgradecimiento = this.catalogos.tipos_nivel_agradecimiento || [];
        this.serviciosFaltantes = this.catalogos.servicios_faltantes || [];
        this.tiposImportanciaServicioFaltante = this.catalogos.tipos_importancia_servicio_faltante || [];
        this.aspectosMejorar = this.catalogos.aspectos_mejorar || [];
        this.tiposValidezFeedback = this.catalogos.tipos_validez_feedback || [];
        this.tiposPerfilEconomico = this.catalogos.tipos_perfil_economico || [];
        this.tiposNivelExigencia = this.catalogos.tipos_nivel_exigencia || [];
        this.tiposSemaforoCliente = this.catalogos.tipos_semaforo_cliente || [];
        this.tiposInclinacionDecision = this.catalogos.tipos_inclinacion_decision || [];

        console.log('🎯 Tipos resultado:', this.tiposResultado.length);
        console.log('🏡 Servicios jardín:', this.serviciosJardin.length);
        console.log('📊 Aspectos mejorar:', this.aspectosMejorar.length);
    }

    cargarDatosExistentes(): void {
        this.cargandoDatos = true;
        console.log('📂 TAB 4 - Cargando datos existentes:', this.visitaData);

        // CARD 1: Resultado
        if (this.visitaData.resultado) {
            this.resultadoSeleccionado = this.visitaData.resultado.id_tipo_resultado || null;
            this.notasResultado = this.visitaData.resultado.notas_resultado || '';
        }

        // CARD 2: Servicios que gustaron
        if (this.visitaData.serviciosGustaron && Array.isArray(this.visitaData.serviciosGustaron)) {
            this.serviciosGustaronSeleccionados = this.visitaData.serviciosGustaron.map((s: any) => {
                return typeof s === 'object' ? s.id_servicio : s;
            });
        }

        if (this.visitaData.aspectosPositivos) {
            this.otrosAspectosPositivos = this.visitaData.aspectosPositivos.otros_aspectos || '';
            this.factorDecisivo = this.visitaData.aspectosPositivos.factor_decisivo || '';
        }

        // CARD 3: Detalle/Obsequio
        if (this.visitaData.detalleObsequio) {
            const detalle = this.visitaData.detalleObsequio;
            this.dioDetalle = detalle.dio_detalle === 1 || detalle.dio_detalle === true ? true :
                detalle.dio_detalle === 0 || detalle.dio_detalle === false ? false : null;
            this.queDetalle = detalle.que_detalle || '';
            this.importanciaDetalle = detalle.id_importancia_detalle || null;
            this.nivelAgradecimiento = detalle.id_nivel_agradecimiento || null;
            this.comentariosDetalle = detalle.comentarios_detalle || '';
        }

        // CARD 4: Servicios que no tenemos
        if (this.visitaData.serviciosNoTenemos && Array.isArray(this.visitaData.serviciosNoTenemos)) {
            this.serviciosNoTenemos = this.visitaData.serviciosNoTenemos.map((s: any) => ({
                id: s.id || null,
                id_servicio_faltante: s.id_servicio_faltante,
                detalle_especifico: s.detalle_especifico || '',
                id_importancia: s.id_importancia || null,
                perdimos_venta_por_esto: s.perdimos_venta_por_esto || ''
            }));
        }

        // CARD 5: Feedback para mejorar
        if (this.visitaData.feedbackMejorar) {
            if (Array.isArray(this.visitaData.feedbackMejorar.aspectos)) {
                this.aspectosMejorarSeleccionados = this.visitaData.feedbackMejorar.aspectos.map((a: any) => {
                    return typeof a === 'object' ? a.id_aspecto_mejorar : a;
                });
            }
            this.comentariosMejorar = this.visitaData.feedbackMejorar.comentarios_mejorar || '';
            this.validezFeedback = this.visitaData.feedbackMejorar.id_validez_feedback || null;
        }

        // CARD 6: Perfil del prospecto
        if (this.visitaData.perfilProspecto) {
            this.perfilEconomico = this.visitaData.perfilProspecto.id_perfil_economico || null;
            this.nivelExigencia = this.visitaData.perfilProspecto.id_nivel_exigencia || null;
            this.semaforoCliente = this.visitaData.perfilProspecto.id_semaforo_cliente || null;
            this.senalesComportamiento = this.visitaData.perfilProspecto.senales_comportamiento || '';
            this.esClienteIdeal = this.visitaData.perfilProspecto.es_cliente_ideal || '';
            this.justificacionClienteIdeal = this.visitaData.perfilProspecto.justificacion_cliente_ideal || '';
        }

        // CARD 7: Competencia
        if (this.visitaData.competencia) {
            const comp = this.visitaData.competencia;
            this.mencionoCompetencia = comp.menciono_competencia === 1 || comp.menciono_competencia === true ? true :
                comp.menciono_competencia === 0 || comp.menciono_competencia === false ? false : null;
            this.jardinesMencionados = comp.jardines_mencionados || '';
            this.queGustoCompetencia = comp.que_les_gusto_competencia || '';
            this.porQueNosConsideran = comp.por_que_nos_consideran || '';
            this.principalCompetidor = comp.principal_competidor || '';
            this.inclinacionDecision = comp.id_hacia_donde_se_inclinan || null;
        }

        // CARD 8: Aprendizajes
        if (this.visitaData.aprendizajes) {
            this.queSalioBien = this.visitaData.aprendizajes.que_salio_bien || '';
            this.queMejorarProximo = this.visitaData.aprendizajes.que_mejorar_proximo || '';
            this.queSorprendio = this.visitaData.aprendizajes.que_sorprendio || '';
            this.recomendacionesEquipo = this.visitaData.aprendizajes.recomendaciones_equipo || '';
            this.resumenEjecutivo = this.visitaData.aprendizajes.resumen_ejecutivo || '';
        }

        this.cargandoDatos = false;
        console.log('✅ TAB 4 - Datos cargados exitosamente');
    }

    // =====================================================
    // ✅ MÉTODOS DE DIRTY TRACKING
    // =====================================================
    marcarCambio(seccion: string): void {
        if (this.cargandoDatos || this.soloLectura) return;

        console.log('🔄 TAB 4 - Sección modificada:', seccion);
        this.seccionesModificadas.add(seccion);

        // Debounce: esperar 300ms antes de emitir
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {
            this.emitirCambios();
        }, 300);
    }

    limpiarCambios(): void {
        this.seccionesModificadas.clear();
        console.log('🧹 TAB 4 - Cambios limpiados');
    }

    // =====================================================
    // ✅ MÉTODOS PARA CARDS COLAPSABLES
    // =====================================================
    toggleCard(index: number): void {
        if (this.soloLectura) return;
        this.cardsExpandidas[index] = !this.cardsExpandidas[index];
        this.actualizarEstadoTodasExpandidas();
    }

    toggleTodasLasCards(): void {
        if (this.soloLectura) return;
        this.todasExpandidas = !this.todasExpandidas;
        this.cardsExpandidas = this.cardsExpandidas.map(() => this.todasExpandidas);
    }

    actualizarEstadoTodasExpandidas(): void {
        this.todasExpandidas = this.cardsExpandidas.every(expandida => expandida);
    }

    esCardCompleta(index: number): boolean {
        switch (index) {
            case 0: // Resultado de la visita
                return !!this.resultadoSeleccionado;
            case 1: // Servicios que gustaron
                return this.serviciosGustaronSeleccionados.length > 0 || !!this.factorDecisivo;
            case 2: // Detalle/Obsequio
                return this.dioDetalle !== null;
            case 3: // Servicios que no tenemos
                return this.serviciosNoTenemos.length > 0 &&
                    this.serviciosNoTenemos.every(s => s.id_servicio_faltante);
            case 4: // Feedback para mejorar
                return this.aspectosMejorarSeleccionados.length > 0 || !!this.comentariosMejorar;
            case 5: // Perfil del prospecto
                return !!this.esClienteIdeal;
            case 6: // Competencia
                return this.mencionoCompetencia !== null;
            case 7: // Aprendizajes
                return !!this.queSalioBien || !!this.queMejorarProximo;
            case 8: // Resumen ejecutivo
                return !!this.resumenEjecutivo;
            default:
                return false;
        }
    }

    tieneProgreso(index: number): boolean {
        switch (index) {
            case 0:
                return !!this.resultadoSeleccionado || !!this.notasResultado;
            case 1:
                return this.serviciosGustaronSeleccionados.length > 0 || !!this.otrosAspectosPositivos || !!this.factorDecisivo;
            case 2:
                return this.dioDetalle !== null || !!this.queDetalle;
            case 3:
                return this.serviciosNoTenemos.length > 0;
            case 4:
                return this.aspectosMejorarSeleccionados.length > 0 || !!this.comentariosMejorar;
            case 5:
                return !!this.perfilEconomico || !!this.nivelExigencia || !!this.esClienteIdeal;
            case 6:
                return this.mencionoCompetencia !== null || !!this.jardinesMencionados;
            case 7:
                return !!this.queSalioBien || !!this.queMejorarProximo || !!this.queSorprendio || !!this.recomendacionesEquipo;
            case 8:
                return !!this.resumenEjecutivo;
            default:
                return false;
        }
    }

    calcularProgresoGeneral(): number {
        const totalCards = 9;
        const cardsCompletas = this.cardsExpandidas.filter((_, index) => this.esCardCompleta(index)).length;
        return Math.round((cardsCompletas / totalCards) * 100);
    }

    obtenerNombreResultado(id: string): string {
        const resultado = this.tiposResultado.find(r => r.id === id);
        return resultado?.nombre || 'Resultado';
    }

    // =====================================================
    // MÉTODOS EXISTENTES - Ahora llaman a marcarCambio()
    // =====================================================
    toggleServicioGusto(id: string): void {
        const index = this.serviciosGustaronSeleccionados.indexOf(id);
        if (index > -1) {
            this.serviciosGustaronSeleccionados.splice(index, 1);
        } else {
            this.serviciosGustaronSeleccionados.push(id);
        }
        this.marcarCambio('serviciosGustaron');
    }

    toggleAspectoMejorar(id: string): void {
        const index = this.aspectosMejorarSeleccionados.indexOf(id);
        if (index > -1) {
            this.aspectosMejorarSeleccionados.splice(index, 1);
        } else {
            this.aspectosMejorarSeleccionados.push(id);
        }
        this.marcarCambio('feedbackMejorar');
    }

    isServicioGustoSeleccionado(id: string): boolean {
        return this.serviciosGustaronSeleccionados.includes(id);
    }

    // =====================================================
    // MÉTODOS PARA SERVICIOS QUE NO TENEMOS
    // =====================================================
    agregarServicioNoTenemos(): void {
        this.serviciosNoTenemos.push({
            id_servicio_faltante: null,
            detalle_especifico: '',
            id_importancia: null,
            perdimos_venta_por_esto: ''
        });
        this.marcarCambio('serviciosNoTenemos');
    }

    eliminarServicioNoTenemos(index: number): void {
        this.serviciosNoTenemos.splice(index, 1);
        this.marcarCambio('serviciosNoTenemos');
    }

    isAspectoMejorarSeleccionado(id: string): boolean {
        return this.aspectosMejorarSeleccionados.includes(id);
    }

    // =====================================================
    // ✅ EMITIR CAMBIOS - SOLO LO QUE SE MODIFICÓ
    // =====================================================
    emitirCambios(): void {
        if (this.cargandoDatos) return;

        console.log('🔄 TAB 4 - Emitiendo solo secciones modificadas:', Array.from(this.seccionesModificadas));

        const datosCompletos: any = {};

        // Solo incluir las secciones que fueron modificadas
        if (this.seccionesModificadas.has('resultado')) {
            datosCompletos.resultado = {
                id_tipo_resultado: this.resultadoSeleccionado,
                notas_resultado: this.notasResultado
            };
        }

        if (this.seccionesModificadas.has('serviciosGustaron')) {
            datosCompletos.serviciosGustaron = this.serviciosGustaronSeleccionados;
        }

        if (this.seccionesModificadas.has('aspectosPositivos')) {
            datosCompletos.aspectosPositivos = {
                otros_aspectos: this.otrosAspectosPositivos,
                factor_decisivo: this.factorDecisivo
            };
        }

        if (this.seccionesModificadas.has('detalleObsequio')) {
            datosCompletos.detalleObsequio = {
                dio_detalle: this.dioDetalle,
                que_detalle: this.queDetalle,
                id_importancia_detalle: this.importanciaDetalle,
                id_nivel_agradecimiento: this.nivelAgradecimiento,
                comentarios_detalle: this.comentariosDetalle
            };
        }

        if (this.seccionesModificadas.has('serviciosNoTenemos')) {
            datosCompletos.serviciosNoTenemos = this.serviciosNoTenemos;
        }

        if (this.seccionesModificadas.has('feedbackMejorar')) {
            datosCompletos.feedbackMejorar = {
                aspectos: this.aspectosMejorarSeleccionados,
                comentarios_mejorar: this.comentariosMejorar,
                id_validez_feedback: this.validezFeedback
            };
        }

        if (this.seccionesModificadas.has('perfilProspecto')) {
            datosCompletos.perfilProspecto = {
                id_perfil_economico: this.perfilEconomico,
                id_nivel_exigencia: this.nivelExigencia,
                id_semaforo_cliente: this.semaforoCliente,
                senales_comportamiento: this.senalesComportamiento,
                es_cliente_ideal: this.esClienteIdeal,
                justificacion_cliente_ideal: this.justificacionClienteIdeal
            };
        }

        if (this.seccionesModificadas.has('competencia')) {
            datosCompletos.competencia = {
                menciono_competencia: this.mencionoCompetencia,
                jardines_mencionados: this.jardinesMencionados,
                que_les_gusto_competencia: this.queGustoCompetencia,
                por_que_nos_consideran: this.porQueNosConsideran,
                principal_competidor: this.principalCompetidor,
                id_hacia_donde_se_inclinan: this.inclinacionDecision
            };
        }

        if (this.seccionesModificadas.has('aprendizajes')) {
            datosCompletos.aprendizajes = {
                que_salio_bien: this.queSalioBien,
                que_mejorar_proximo: this.queMejorarProximo,
                que_sorprendio: this.queSorprendio,
                recomendaciones_equipo: this.recomendacionesEquipo,
                resumen_ejecutivo: this.resumenEjecutivo
            };
        }

        console.log('📤 TAB 4 - Datos a emitir:', datosCompletos);

        this.datosActualizados.emit(datosCompletos);
    }

    obtenerNombreServicioFaltante(id: string): string {
        const servicio = this.serviciosFaltantes.find(s => s.id === id);
        return servicio?.nombre || 'Servicio';
    }

    toggleServicioNoTenemos(id: string): void {
        const index = this.serviciosNoTenemos.findIndex(s => s.id_servicio_faltante === id);

        if (index > -1) {
            // Ya existe, lo eliminamos
            this.serviciosNoTenemos.splice(index, 1);
        } else {
            // No existe, lo agregamos
            this.serviciosNoTenemos.push({
                id_servicio_faltante: id,
                detalle_especifico: '',
                id_importancia: null,
                perdimos_venta_por_esto: ''
            });
        }

        this.marcarCambio('serviciosNoTenemos');
    }

    isServicioNoTenemosSeleccionado(id: string): boolean {
        return this.serviciosNoTenemos.some(s => s.id_servicio_faltante === id);
    }
}