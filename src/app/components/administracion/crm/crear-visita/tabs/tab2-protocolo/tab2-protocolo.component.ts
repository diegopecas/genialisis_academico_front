import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { trigger, state, style, transition, animate } from '@angular/animations';
import Swal from 'sweetalert2';
import { ProtocoloContenidoPerfilService } from '../../../../../../services/protocolo-contenido-perfil.service';

@Component({
    selector: 'app-tab2-protocolo',
    templateUrl: './tab2-protocolo.component.html',
    styleUrl: './tab2-protocolo.component.scss',
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
export class Tab2ProtocoloComponent implements OnInit, OnChanges {

    @Input() visitaData: any = {};
    @Input() soloLectura: boolean = false;
    @Input() catalogos: any = null;
    @Output() datosActualizados = new EventEmitter<any>();

    // ✅ CONTROL DE CARDS COLAPSABLES
    cardsExpandidas: boolean[] = [true]; // Primera card (selector perfil) expandida
    todasExpandidas: boolean = false;

    // Protocolo
    protocoloPasos: any[] = [];
    contenidoPorPerfil: any = {};

    // Perfil seleccionado
    perfilSeleccionado: string = 'GENERAL';
    perfilSugerido: string = '';

    // Control de pasos completados
    pasosCompletados: any = {};

    // Checklist por paso
    checklistPorPaso: any = {};

    // Control de carga
    cargandoPerfil: boolean = false;
    // ✅ DIRTY TRACKING - Rastreo de cambios
    private seccionesModificadas = new Set<string>();
    private debounceTimer: any;


    constructor(
        private protocoloContenidoPerfilService: ProtocoloContenidoPerfilService
    ) { }

    ngOnInit(): void {
        if (this.catalogos) {
            this.asignarCatalogos();
        }

        this.detectarPerfilSugerido();

        if (this.perfilSugerido && this.perfilSugerido !== 'GENERAL') {
            this.cargarContenidoDelPerfil(this.perfilSugerido);
        }
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['catalogos'] && this.catalogos) {
            this.asignarCatalogos();
        }

        if (changes['visitaData'] && !changes['visitaData'].firstChange) {
            this.detectarPerfilSugerido();
            this.cargarDatosExistentes();

            if (this.perfilSugerido && this.perfilSugerido !== 'GENERAL' && !this.contenidoPorPerfil[this.perfilSugerido]) {
                this.cargarContenidoDelPerfil(this.perfilSugerido);
            }
        }
    }

    asignarCatalogos(): void {
        console.log('✅ TAB 2 - Asignando catálogos recibidos del padre');

        this.protocoloPasos = this.catalogos.protocolo_pasos || [];

        // Inicializar cards expandidas: 1 para selector + 1 por cada paso
        this.cardsExpandidas = [true, ...this.protocoloPasos.map(() => false)];

        this.protocoloPasos.forEach(paso => {
            this.pasosCompletados[paso.id] = false;
            this.checklistPorPaso[paso.id] = [];

            // Parsear checklist_items si viene como JSON string
            if (paso.checklist_items) {
                try {
                    paso.checklist_items_array = typeof paso.checklist_items === 'string'
                        ? JSON.parse(paso.checklist_items)
                        : paso.checklist_items;
                } catch (e) {
                    paso.checklist_items_array = [];
                }
            }

            // Parsear consejos si viene como JSON string
            if (paso.consejos) {
                try {
                    paso.consejos_array = typeof paso.consejos === 'string'
                        ? JSON.parse(paso.consejos)
                        : paso.consejos;
                } catch (e) {
                    paso.consejos_array = [];
                }
            } else {
                paso.consejos_array = [];
            }
        });

        console.log('📋 Protocolo pasos:', this.protocoloPasos.length);
    }

    cargarContenidoDelPerfil(perfil: string): void {
        if (perfil === 'GENERAL' || !perfil) {
            console.log('Perfil GENERAL seleccionado - no se necesita contenido específico');
            return;
        }

        if (this.contenidoPorPerfil[perfil]) {
            console.log(`✅ Contenido del perfil ${perfil} ya está en caché`);
            return;
        }

        this.cargandoPerfil = true;
        console.log(`🔄 Cargando todo el contenido para perfil: ${perfil}`);

        this.contenidoPorPerfil[perfil] = {};

        this.protocoloContenidoPerfilService.obtenerTodosPorPerfil(perfil).subscribe({
            next: (response: any) => {
                const contenidos = response.body || [];

                console.log(`📦 Recibidos ${contenidos.length} registros de contenido para perfil ${perfil}`);

                contenidos.forEach((contenido: any) => {
                    try {
                        contenido.puntos_enfatizar_array = typeof contenido.puntos_enfatizar === 'string'
                            ? JSON.parse(contenido.puntos_enfatizar)
                            : contenido.puntos_enfatizar || [];

                        contenido.frases_efectivas_array = typeof contenido.frases_efectivas === 'string'
                            ? JSON.parse(contenido.frases_efectivas)
                            : contenido.frases_efectivas || [];

                        contenido.que_mostrar_array = typeof contenido.que_mostrar === 'string'
                            ? JSON.parse(contenido.que_mostrar)
                            : contenido.que_mostrar || [];

                        contenido.que_evitar_array = typeof contenido.que_evitar === 'string'
                            ? JSON.parse(contenido.que_evitar)
                            : contenido.que_evitar || [];
                    } catch (e) {
                        console.error('Error parseando JSON de contenido:', e);
                    }

                    this.contenidoPorPerfil[perfil][contenido.id_protocolo_paso] = contenido;
                });

                this.cargandoPerfil = false;
                console.log(`✅ Contenido del perfil ${perfil} cargado completamente`);
            },
            error: (error: any) => {
                console.error(`❌ Error al cargar contenido del perfil ${perfil}:`, error);
                this.cargandoPerfil = false;

                Swal.fire({
                    icon: 'warning',
                    title: 'Advertencia',
                    text: `No se pudo cargar el contenido específico para el perfil ${this.obtenerNombrePerfil(perfil)}. Se mostrará el protocolo general.`,
                    confirmButtonColor: '#d4af37'
                });
            }
        });
    }

    detectarPerfilSugerido(): void {
        // Limpiar datos anteriores
        this.perfilSugerido = '';

        // Objeto para agrupar visitantes por perfil
        const visitantesPorPerfil: any = {
            D: [],
            I: [],
            S: [],
            C: []
        };

        // Recorrer TODOS los visitantes y agrupar por perfil
        if (this.visitaData.visitantes && this.visitaData.visitantes.length > 0) {
            this.visitaData.visitantes.forEach((visitante: any) => {
                if (visitante.perfil_disc_calculado) {
                    const perfil = visitante.perfil_disc_calculado;
                    const nombreCompleto = this.construirNombreVisitante(visitante);
                    const parentesco = this.obtenerParentesco(visitante);

                    if (visitantesPorPerfil[perfil]) {
                        visitantesPorPerfil[perfil].push({
                            nombre: nombreCompleto,
                            parentesco: parentesco,
                            esPrincipal: visitante.es_contacto_principal
                        });
                    }
                }
            });

            // Encontrar el perfil con más visitantes o el del contacto principal
            let perfilPrincipal = '';
            let maxVisitantes = 0;

            Object.keys(visitantesPorPerfil).forEach(perfil => {
                const cantidad = visitantesPorPerfil[perfil].length;
                if (cantidad > maxVisitantes) {
                    maxVisitantes = cantidad;
                    perfilPrincipal = perfil;
                }

                // Si hay un contacto principal con perfil, ese tiene prioridad
                const tieneContactoPrincipal = visitantesPorPerfil[perfil].some((v: any) => v.esPrincipal);
                if (tieneContactoPrincipal && !perfilPrincipal) {
                    perfilPrincipal = perfil;
                }
            });

            // Establecer perfil sugerido principal
            if (perfilPrincipal) {
                this.perfilSugerido = perfilPrincipal;
                this.perfilSeleccionado = perfilPrincipal;
                console.log(`💡 Perfil sugerido principal: ${this.perfilSugerido}`);
            }
        }

        // Guardar los visitantes agrupados para usarlos en el HTML
        this.visitaData.visitantesPorPerfil = visitantesPorPerfil;
        console.log('👥 Visitantes por perfil:', visitantesPorPerfil);
    }

    construirNombreVisitante(visitante: any): string {
        const partes = [
            visitante.primer_nombre,
            visitante.segundo_nombre,
            visitante.primer_apellido,
            visitante.segundo_apellido
        ].filter(p => p); // Filtrar valores vacíos

        return partes.join(' ');
    }

    obtenerParentesco(visitante: any): string {
        // Si tienes un catálogo de parentescos, úsalo aquí
        // Por ahora retornamos un valor genérico
        if (visitante.es_contacto_principal) {
            return 'Contacto principal';
        }
        return 'Acompañante';
    }

    // Método para verificar si un perfil tiene visitantes asignados
    tieneVisitantesEnPerfil(perfil: string): boolean {
        if (!this.visitaData.visitantesPorPerfil) return false;
        return this.visitaData.visitantesPorPerfil[perfil]?.length > 0;
    }

    // Método para obtener los nombres de visitantes de un perfil específico
    obtenerNombresVisitantesPerfil(perfil: string): string[] {
        if (!this.visitaData.visitantesPorPerfil || !this.visitaData.visitantesPorPerfil[perfil]) {
            return [];
        }
        return this.visitaData.visitantesPorPerfil[perfil].map((v: any) =>
            `${v.nombre}${v.parentesco ? ' (' + v.parentesco + ')' : ''}`
        );
    }
    cargarDatosExistentes(): void {
        if (this.visitaData.protocoloPasos) {
            this.visitaData.protocoloPasos.forEach((paso: any) => {
                this.pasosCompletados[paso.id_protocolo_paso] = paso.completado;
            });
        }

        if (this.visitaData.protocoloChecklist) {
            this.visitaData.protocoloChecklist.forEach((item: any) => {
                if (!this.checklistPorPaso[item.id_protocolo_paso]) {
                    this.checklistPorPaso[item.id_protocolo_paso] = [];
                }
                this.checklistPorPaso[item.id_protocolo_paso].push(item.item_index);
            });
        }
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
        if (index === 0) {
            // Card de selector de perfil
            return this.perfilSeleccionado !== '';
        }

        // Cards de pasos (index - 1 porque el primer elemento es el selector)
        const pasoIndex = index - 1;
        if (pasoIndex >= 0 && pasoIndex < this.protocoloPasos.length) {
            const paso = this.protocoloPasos[pasoIndex];
            return this.pasosCompletados[paso.id] === true;
        }

        return false;
    }

    tieneProgreso(index: number): boolean {
        if (index === 0) {
            return this.perfilSeleccionado !== '';
        }

        const pasoIndex = index - 1;
        if (pasoIndex >= 0 && pasoIndex < this.protocoloPasos.length) {
            const paso = this.protocoloPasos[pasoIndex];
            return this.checklistPorPaso[paso.id]?.length > 0;
        }

        return false;
    }

    get progresoProtocolo(): number {
        const totalPasos = this.protocoloPasos.length;
        if (totalPasos === 0) return 0;

        const pasosCompletadosCount = Object.values(this.pasosCompletados).filter(v => v === true).length;
        return Math.round((pasosCompletadosCount / totalPasos) * 100);
    }

    obtenerChecklistCompletados(idPaso: number): number {
        return this.checklistPorPaso[idPaso]?.length || 0;
    }

    // =====================================================
    // MÉTODOS EXISTENTES
    // =====================================================
    // =====================================================
    // ✅ MÉTODOS DE DIRTY TRACKING
    // =====================================================
    marcarCambio(seccion: string): void {
        if (this.soloLectura) return;

        console.log('🔄 TAB 2 - Sección modificada:', seccion);
        this.seccionesModificadas.add(seccion);

        // Debounce: esperar 300ms antes de emitir
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {
            this.emitirCambios();
        }, 300);
    }

    limpiarCambios(): void {
        this.seccionesModificadas.clear();
        console.log('🧹 TAB 2 - Cambios limpiados');
    }

    seleccionarPerfil(perfil: string): void {
        console.log(`👤 Usuario seleccionó perfil: ${perfil}`);
        this.perfilSeleccionado = perfil;

        if (perfil !== 'GENERAL' && !this.contenidoPorPerfil[perfil]) {
            this.cargarContenidoDelPerfil(perfil);
        }

        // Cuando cambia el perfil, se debe reenviar todo el protocolo con el nuevo perfil
        this.marcarCambio('perfilSeleccionado');
        this.marcarCambio('protocoloPasos');
    }

    togglePasoCompletado(idPaso: number): void {
        this.pasosCompletados[idPaso] = !this.pasosCompletados[idPaso];
        this.marcarCambio('protocoloPasos');
    }

    toggleChecklistItem(idPaso: number, itemIndex: number): void {
        if (!this.checklistPorPaso[idPaso]) {
            this.checklistPorPaso[idPaso] = [];
        }

        const index = this.checklistPorPaso[idPaso].indexOf(itemIndex);
        if (index > -1) {
            this.checklistPorPaso[idPaso].splice(index, 1);
        } else {
            this.checklistPorPaso[idPaso].push(itemIndex);
        }

        this.marcarCambio('protocoloChecklist');
    }

    isChecklistItemChecked(idPaso: number, itemIndex: number): boolean {
        return this.checklistPorPaso[idPaso]?.includes(itemIndex) || false;
    }

    obtenerContenidoPaso(idPaso: number): any {
        if (this.contenidoPorPerfil[this.perfilSeleccionado]) {
            return this.contenidoPorPerfil[this.perfilSeleccionado][idPaso] || null;
        }
        return null;
    }

    obtenerNombrePerfil(perfil: string): string {
        const nombres: any = {
            'D': '🎯 Orientado a Resultados',
            'I': '🌟 Orientado a Experiencias',
            'S': '🤝 Orientado a Seguridad',
            'C': '📊 Orientado a Información',
            'GENERAL': '📋 Protocolo General'
        };
        return nombres[perfil] || perfil;
    }

    emitirCambios(): void {
        console.log('🔄 TAB 2 - Emitiendo solo secciones modificadas:', Array.from(this.seccionesModificadas));

        const datosCompletos: any = {};

        // Solo incluir las secciones que fueron modificadas
        if (this.seccionesModificadas.has('perfilSeleccionado')) {
            datosCompletos.perfilSeleccionado = this.perfilSeleccionado;
        }

        if (this.seccionesModificadas.has('protocoloPasos')) {
            datosCompletos.protocoloPasos = Object.keys(this.pasosCompletados).map(idPaso => ({
                id_protocolo_paso: parseInt(idPaso),
                completado: this.pasosCompletados[idPaso],
                perfil_usado: this.perfilSeleccionado
            }));
        }

        if (this.seccionesModificadas.has('protocoloChecklist')) {
            datosCompletos.protocoloChecklist = Object.keys(this.checklistPorPaso).flatMap(idPaso =>
                this.checklistPorPaso[idPaso].map((itemIndex: number) => ({
                    id_protocolo_paso: parseInt(idPaso),
                    item_index: itemIndex,
                    completado: true
                }))
            );
        }

        this.datosActualizados.emit(datosCompletos);
    }

    get tienePerfilSugerido(): boolean {
        return this.perfilSugerido !== '';
    }
}