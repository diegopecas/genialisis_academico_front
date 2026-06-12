import { Component, OnInit, OnDestroy, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import Swal from 'sweetalert2';
import { UtilService } from '../../../common/constantes/util.service';
import { HeaderComponent } from '../../../common/header/header.component';
import { MejorarTextoComponent } from '../../../common/mejorar-texto/mejorar-texto.component';
import { TranscribirAudioComponent } from '../../../common/transcribir-audio/transcribir-audio.component';
import { InstitucionConfigService } from '../../../services/institucion-config.service';
import { ObservacionesEstudiantesService } from '../../../services/observaciones-estudiantes.service';
import { SprintsService } from '../../../services/sprints.service';
import { InformeEstudianteService } from '../../../services/informe-estudiante.service';
import { HistorialInformesEstudiantesService } from '../../../services/historial-informes-estudiantes.service';
import { TareasColaboradoresService } from '../../../services/tareas-colaboradores.service';

interface TipoObservacionInforme {
    id: number;
    nombre: string;
    icono: string | null;
    valida_asistencia: number;
    requiere_firma: number;
    aplica_informe: number;
}

interface AcudienteInforme {
    id_acudiente: number;
    id_estudiante: number;
    id_persona_acudiente: number;
    nombre_acudiente: string;
    tipo_acudiente: string;
    telefono: string | null;
    correo_electronico: string | null;
}

interface ObservacionExistente {
    id: number;
    id_estudiante: number;
    id_tipo_observacion_estudiante: number;
    descripcion: string;
    fecha: string;
    id_sprint: number;
    para_informe: number;
    id_usuario: number;
    fecha_registro: string;
}

interface SprintInfo {
    id: number;
    anio: number;
    numero_sprint: number;
    nombre_sprint: string;
    fecha_inicial: string;
    fecha_final: string;
    total_dias_habiles: number;
    id_corte_academico: number | null;
    nombre_corte_academico: string | null;
    actual: number;
    es_evaluacion: number;
}

interface FilaEstudiante {
    id_estudiante: number;
    id_persona: number;
    nombre_estudiante: string;
    numero_identificacion: string;
    grupo_estudiante: string;
    id_grupo: number;
    observacionesPorTipo: { [idTipo: number]: ObservacionExistente | null };
    acudientes: AcudienteInforme[];
}

interface ModalObservacionModel {
    id: number;
    id_estudiante: number;
    id_tipo_observacion_estudiante: number;
    descripcion: string;
    fecha: string;
    id_estudiante_afectado: string | null;
    id_sprint: number | null;
    para_informe: boolean;
    fecha_informe_padre: string | null;
    firma_informe_padre: string | null;
    fecha_informe_padre_afectado: string | null;
    firma_informe_padre_afectado: string | null;
    id_usuario: number | null;
    fecha_registro: string | null;
}

interface HistorialInforme {
    id: number;
    id_estudiante: number;
    id_sprint: number;
    numero_sprint?: number;
    nombre_sprint?: string;
    nombre_corte_academico?: string;
    id_persona_acudiente: number | null;
    contacto_usado: string;
    nombre_destinatario: string;
    medio_envio: string;
    compromiso: string | null;
    fecha_compromiso: string | null;
    id_usuario: number | null;
    fecha_envio: string;
    editando?: boolean;
    compromiso_editado?: string;
    fecha_compromiso_editada?: string;
}

@Component({
    selector: 'app-registro-observaciones-informe',
    templateUrl: './registro-observaciones-informe.component.html',
    styleUrl: './registro-observaciones-informe.component.scss',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        HeaderComponent,
        MejorarTextoComponent,
        TranscribirAudioComponent
    ],
    schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class RegistroObservacionesInformeComponent implements OnInit, OnDestroy {
    public titulo = 'Registro de Observaciones para Informe';
    public regresar = '/operaciones';

    public sprints: SprintInfo[] = [];
    public idSprintSeleccionado: number | null = null;
    public sprintActual: SprintInfo | null = null;

    public tiposInforme: TipoObservacionInforme[] = [];

    public filas: FilaEstudiante[] = [];
    public filasFiltradas: FilaEstudiante[] = [];

    public busqueda = '';
    public filtroGrupo = '';
    public grupos: string[] = [];
    public filtroEstado: 'todos' | 'completos' | 'incompletos' | 'sin_iniciar' = 'todos';

    public cargando = false;
    public descargandoPDF = false;
    private subscriptions: Subscription[] = [];

    // Modal observación
    public filaModal: FilaEstudiante | null = null;
    public tipoModal: TipoObservacionInforme | null = null;
    public modeloModal: ModalObservacionModel = this.crearModeloVacio();
    public submittedModal = false;
    public guardandoModal = false;

    // Modal envío WA
    public envioFila: FilaEstudiante | null = null;
    public telefonosEditables: string[] = [];
    public telefonoAdicional = '';
    public nombreAdicional = '';

    // Configuración del mensaje (persistente durante la sesión)
    public tutearMensaje = false; // false = usted, true = tú
    public solicitarReunionPresencial = false;
    public solicitarReunionVirtual = false;
    public solicitarFechaCompromiso = false;
    public mensajeEditable = '';

    // Modal historial
    public estudianteHistorial: FilaEstudiante | null = null;
    public historialEstudiante: HistorialInforme[] = [];
    public cargandoHistorial = false;

    public nombreColegio = '';

    constructor(
        private observacionesService: ObservacionesEstudiantesService,
        private sprintsService: SprintsService,
        private utilService: UtilService,
        private institucionConfigService: InstitucionConfigService,
        private informeEstudianteService: InformeEstudianteService,
        private historialInformesService: HistorialInformesEstudiantesService,
        private tareasColaboradoresService: TareasColaboradoresService,
        private router: Router
    ) { }

    ngOnInit(): void {
        this.nombreColegio = this.institucionConfigService.getNombreInstitucion() || 'Liceo Lumen';
        this.cargarSprints();
    }

    ngOnDestroy(): void {
        this.subscriptions.forEach((sub: Subscription) => sub.unsubscribe());
    }

    // ============================================
    // SPRINTS DE EVALUACIÓN
    // ============================================

    cargarSprints(): void {
        this.cargando = true;
        const sub = this.sprintsService.obtenerEvaluaciones().subscribe({
            next: (response: any) => {
                this.sprints = response.body || [];

                if (this.sprints.length === 0) {
                    this.cargando = false;
                    Swal.fire('Atención', 'No hay sprints de evaluación configurados.', 'warning');
                    return;
                }

                const hoy = this.formatDate(new Date());
                let sprintParaSeleccionar = this.sprints.find((s: SprintInfo) => {
                    const ini = this.formatDateFromString(s.fecha_inicial);
                    const fin = this.formatDateFromString(s.fecha_final);
                    return hoy >= ini && hoy <= fin;
                });

                if (!sprintParaSeleccionar) {
                    sprintParaSeleccionar = this.sprints.find((s: SprintInfo) => Number(s.actual) === 1);
                }
                if (!sprintParaSeleccionar) {
                    sprintParaSeleccionar = this.sprints[0];
                }

                this.idSprintSeleccionado = Number(sprintParaSeleccionar.id);
                this.sprintActual = sprintParaSeleccionar;
                this.cargarDatos();
            },
            error: () => {
                this.cargando = false;
                Swal.fire('Error', 'No se pudieron cargar los sprints de evaluación.', 'error');
            }
        });
        this.subscriptions.push(sub);
    }

    onSprintChange(): void {
        const sprint = this.sprints.find((s: SprintInfo) => Number(s.id) === Number(this.idSprintSeleccionado));
        this.sprintActual = sprint || null;
        this.cargarDatos();
    }

    // ============================================
    // CARGA DE DATOS
    // ============================================

    cargarDatos(): void {
        if (!this.idSprintSeleccionado) return;

        this.cargando = true;
        const sub = this.observacionesService.obtenerDatosRegistroInforme(this.idSprintSeleccionado).subscribe({
            next: (response: any) => {
                const data = response.body;
                if (!data) {
                    this.cargando = false;
                    return;
                }

                this.tiposInforme = data.tipos_observaciones_informe || [];

                const acudientesPorEstudiante = new Map<number, AcudienteInforme[]>();
                (data.acudientes || []).forEach((a: AcudienteInforme) => {
                    const idEst = Number(a.id_estudiante);
                    if (!acudientesPorEstudiante.has(idEst)) acudientesPorEstudiante.set(idEst, []);
                    acudientesPorEstudiante.get(idEst)!.push(a);
                });

                const observacionesPorEstTipo = new Map<string, ObservacionExistente>();
                (data.observaciones_existentes || []).forEach((o: ObservacionExistente) => {
                    const key = `${o.id_estudiante}_${o.id_tipo_observacion_estudiante}`;
                    if (!observacionesPorEstTipo.has(key)) observacionesPorEstTipo.set(key, o);
                });

                this.filas = (data.estudiantes || []).map((e: any) => {
                    const observacionesPorTipo: { [idTipo: number]: ObservacionExistente | null } = {};
                    this.tiposInforme.forEach((tipo: TipoObservacionInforme) => {
                        const key = `${e.id_estudiante}_${tipo.id}`;
                        observacionesPorTipo[tipo.id] = observacionesPorEstTipo.get(key) || null;
                    });

                    return {
                        id_estudiante: Number(e.id_estudiante),
                        id_persona: Number(e.id_persona),
                        nombre_estudiante: (e.nombre_estudiante || '').trim().replace(/\s+/g, ' '),
                        numero_identificacion: e.numero_identificacion || '',
                        grupo_estudiante: e.grupo_estudiante || 'Sin grupo',
                        id_grupo: Number(e.id_grupo) || 0,
                        observacionesPorTipo,
                        acudientes: acudientesPorEstudiante.get(Number(e.id_estudiante)) || []
                    } as FilaEstudiante;
                });

                const gruposSet = new Set<string>();
                this.filas.forEach((f: FilaEstudiante) => gruposSet.add(f.grupo_estudiante));
                this.grupos = Array.from(gruposSet).sort();

                this.filtrarFilas();
                this.cargando = false;
            },
            error: () => {
                this.cargando = false;
                Swal.fire('Error', 'No se pudieron cargar los datos.', 'error');
            }
        });
        this.subscriptions.push(sub);
    }

    // ============================================
    // FILTROS
    // ============================================

    filtrarFilas(): void {
        let resultado = [...this.filas];

        if (this.busqueda) {
            const t = this.busqueda.toLowerCase();
            resultado = resultado.filter((f: FilaEstudiante) =>
                f.nombre_estudiante.toLowerCase().includes(t) ||
                f.grupo_estudiante.toLowerCase().includes(t)
            );
        }

        if (this.filtroGrupo) {
            resultado = resultado.filter((f: FilaEstudiante) => f.grupo_estudiante === this.filtroGrupo);
        }

        if (this.filtroEstado !== 'todos') {
            resultado = resultado.filter((f: FilaEstudiante) => {
                const total = this.tiposInforme.length;
                const llenas = this.tiposInforme.filter((t: TipoObservacionInforme) => f.observacionesPorTipo[t.id]).length;
                if (this.filtroEstado === 'completos') return total > 0 && llenas === total;
                if (this.filtroEstado === 'incompletos') return llenas > 0 && llenas < total;
                if (this.filtroEstado === 'sin_iniciar') return llenas === 0;
                return true;
            });
        }

        this.filasFiltradas = resultado;
    }

    contarObservaciones(fila: FilaEstudiante): number {
        return this.tiposInforme.filter((t: TipoObservacionInforme) => fila.observacionesPorTipo[t.id]).length;
    }

    estaCompleto(fila: FilaEstudiante): boolean {
        if (this.tiposInforme.length === 0) return false;
        return this.contarObservaciones(fila) === this.tiposInforme.length;
    }

    // ============================================
    // MODAL OBSERVACIÓN
    // ============================================

    abrirModal(fila: FilaEstudiante, tipo: TipoObservacionInforme): void {
        if (!this.idSprintSeleccionado) {
            Swal.fire('Atención', 'Debe seleccionar un sprint.', 'warning');
            return;
        }

        this.filaModal = fila;
        this.tipoModal = tipo;
        this.submittedModal = false;
        this.guardandoModal = false;

        const observacionExistente = fila.observacionesPorTipo[tipo.id];
        const hoy = new Date();

        if (observacionExistente) {
            this.modeloModal = {
                id: Number(observacionExistente.id),
                id_estudiante: fila.id_estudiante,
                id_tipo_observacion_estudiante: Number(observacionExistente.id_tipo_observacion_estudiante),
                descripcion: observacionExistente.descripcion || '',
                fecha: this.formatDateFromString(observacionExistente.fecha),
                id_estudiante_afectado: null,
                id_sprint: Number(observacionExistente.id_sprint),
                para_informe: true,
                fecha_informe_padre: null,
                firma_informe_padre: null,
                fecha_informe_padre_afectado: null,
                firma_informe_padre_afectado: null,
                id_usuario: this.utilService.obtenerIdUsuarioActual(),
                fecha_registro: observacionExistente.fecha_registro || hoy.toISOString().replace('Z', '')
            };
        } else {
            this.modeloModal = {
                id: 0,
                id_estudiante: fila.id_estudiante,
                id_tipo_observacion_estudiante: tipo.id,
                descripcion: '',
                fecha: this.formatDate(hoy),
                id_estudiante_afectado: null,
                id_sprint: this.idSprintSeleccionado,
                para_informe: true,
                fecha_informe_padre: null,
                firma_informe_padre: null,
                fecha_informe_padre_afectado: null,
                firma_informe_padre_afectado: null,
                id_usuario: this.utilService.obtenerIdUsuarioActual(),
                fecha_registro: hoy.toISOString().replace('Z', '')
            };
        }

        const modal = new (window as any).bootstrap.Modal(document.getElementById('modalObservacionInforme'));
        modal.show();
    }

    cerrarModal(): void {
        const modalEl = document.getElementById('modalObservacionInforme');
        const modal = (window as any).bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();
        this.filaModal = null;
        this.tipoModal = null;
        this.modeloModal = this.crearModeloVacio();
        this.submittedModal = false;
    }

    onTextoMejorado(textoMejorado: string): void {
        this.modeloModal.descripcion = textoMejorado;
        Swal.fire({
            title: 'Texto mejorado',
            text: 'La redacción ha sido mejorada con estilo técnico docente',
            icon: 'success',
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000
        });
    }

    onTranscripcionRecibida(event: any): void {
        const textoTranscrito = (event ?? '').toString().trim();
        if (!textoTranscrito) return;
        this.modeloModal.descripcion = this.modeloModal.descripcion
            ? this.modeloModal.descripcion + ' ' + textoTranscrito
            : textoTranscrito;
    }

    limpiarDescripcionModal(): void {
        Swal.fire({
            title: '¿Está seguro?',
            text: 'Se borrará todo el texto de la descripción',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, borrar',
            cancelButtonText: 'Cancelar'
        }).then((result) => {
            if (result.isConfirmed) this.modeloModal.descripcion = '';
        });
    }

    generarContextoMejoraTexto(): string {
        let contexto = '';
        if (this.filaModal) contexto += `Esta es una observación para el estudiante ${this.filaModal.nombre_estudiante}`;
        if (this.tipoModal) contexto += ` sobre ${this.tipoModal.nombre}`;
        contexto += `. Esta observación será incluida en el informe académico del estudiante.`;
        return contexto;
    }

    formularioModalValido(): boolean {
        return !!(this.modeloModal.id_estudiante &&
            this.modeloModal.id_tipo_observacion_estudiante &&
            this.modeloModal.descripcion &&
            this.modeloModal.descripcion.trim().length > 0 &&
            this.modeloModal.fecha &&
            this.modeloModal.id_sprint);
    }

    grabarModal(): void {
        this.submittedModal = true;
        if (!this.formularioModalValido()) return;
        if (!this.filaModal || !this.tipoModal) return;

        this.guardandoModal = true;

        const esCreacion = this.modeloModal.id === 0;
        const servicio = esCreacion
            ? this.observacionesService.crear(this.modeloModal)
            : this.observacionesService.actualizar(this.modeloModal);

        servicio.subscribe({
            next: (response: any) => {
                this.guardandoModal = false;
                if (!response) {
                    Swal.fire('Error', 'Hubo un problema al guardar la observación', 'error');
                    return;
                }

                const idObs = esCreacion ? Number(response.id) : Number(this.modeloModal.id);
                const observacionActualizada: ObservacionExistente = {
                    id: idObs,
                    id_estudiante: this.modeloModal.id_estudiante,
                    id_tipo_observacion_estudiante: this.modeloModal.id_tipo_observacion_estudiante,
                    descripcion: this.modeloModal.descripcion,
                    fecha: this.modeloModal.fecha,
                    id_sprint: Number(this.modeloModal.id_sprint),
                    para_informe: 1,
                    id_usuario: this.modeloModal.id_usuario || 0,
                    fecha_registro: this.modeloModal.fecha_registro || ''
                };

                if (this.filaModal) {
                    this.filaModal.observacionesPorTipo[this.tipoModal!.id] = observacionActualizada;
                }

                Swal.fire({
                    title: esCreacion ? 'Observación registrada' : 'Observación actualizada',
                    icon: 'success',
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 2500
                });

                this.cerrarModal();
                this.filtrarFilas();
            },
            error: () => {
                this.guardandoModal = false;
                Swal.fire('Error', 'Hubo un problema al guardar la observación', 'error');
            }
        });
    }

    // ============================================
    // VISTA PREVIA
    // ============================================

    obtenerPreview(fila: FilaEstudiante, tipo: TipoObservacionInforme): string {
        const obs = fila.observacionesPorTipo[tipo.id];
        if (!obs || !obs.descripcion) return '';
        const desc = obs.descripcion.trim();
        return desc.length > 80 ? desc.substring(0, 80) + '…' : desc;
    }

    tieneObservacion(fila: FilaEstudiante, tipo: TipoObservacionInforme): boolean {
        return !!fila.observacionesPorTipo[tipo.id];
    }

    // ============================================
    // DESCARGAR INFORME (PDF)
    // ============================================

    descargarInforme(fila: FilaEstudiante): void {
        if (!this.sprintActual) {
            Swal.fire('Atención', 'No hay un corte académico seleccionado.', 'warning');
            return;
        }

        this.descargandoPDF = true;

        const sub = this.informeEstudianteService.generarYDescargarInforme(
            fila.id_estudiante,
            {
                id: this.sprintActual.id,
                nombre_sprint: this.sprintActual.nombre_sprint,
                fecha_final: this.sprintActual.fecha_final,
                nombre_corte_academico: this.sprintActual.nombre_corte_academico
            }
        ).subscribe({
            next: () => {
                this.descargandoPDF = false;
                Swal.fire({
                    title: 'Informe generado',
                    icon: 'success',
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 2500
                });
            },
            error: (err: any) => {
                this.descargandoPDF = false;
                console.error('Error generando informe:', err);
                Swal.fire('Error', 'No se pudo generar el informe. Verifique que el estudiante tenga calificaciones en el corte seleccionado.', 'error');
            }
        });
        this.subscriptions.push(sub);
    }

    // ============================================
    // ENVÍO POR WHATSAPP
    // ============================================

    abrirModalEnvio(fila: FilaEstudiante): void {
        this.envioFila = fila;
        this.telefonoAdicional = '';
        this.nombreAdicional = '';
        this.telefonosEditables = fila.acudientes.map((a: AcudienteInforme) => a.telefono || '');
        this.regenerarMensaje();

        const modal = new (window as any).bootstrap.Modal(document.getElementById('modalEnvioWAInforme'));
        modal.show();
    }

    // Regenera el mensaje con placeholder {NOMBRE_DESTINATARIO} según configuración actual
    regenerarMensaje(): void {
        if (!this.envioFila) return;
        this.mensajeEditable = this.construirMensajePlantilla(this.envioFila);
    }

    private construirMensajePlantilla(fila: FilaEstudiante): string {
        const tu = this.tutearMensaje;
        const nombreCorte = this.sprintActual && this.sprintActual.nombre_corte_academico
            ? this.sprintActual.nombre_corte_academico
            : '';

        let msg = `¡Hola, *{NOMBRE_DESTINATARIO}*! 🌟\n\n`;
        msg += tu
            ? `Recibe un cordial saludo de parte de toda la familia *${this.nombreColegio}*.\n\n`
            : `Reciba un cordial saludo de parte de toda la familia *${this.nombreColegio}*.\n\n`;

        msg += tu
            ? `Con mucho cariño te compartimos el informe académico de *${fila.nombre_estudiante}*`
            : `Con mucho cariño le compartimos el informe académico de *${fila.nombre_estudiante}*`;
        if (nombreCorte) msg += `, correspondiente al *${nombreCorte}*`;
        msg += `.\n\n`;

        msg += tu
            ? `En este informe encontrarás el seguimiento a su proceso formativo durante este corte.\n\n`
            : `En este informe encontrará el seguimiento a su proceso formativo durante este corte.\n\n`;

        // Reunión
        if (this.solicitarReunionPresencial && this.solicitarReunionVirtual) {
            msg += tu
                ? `Nos encantaría agendar una reunión (presencial o virtual) para conversar sobre este proceso. Por favor indícanos tu disponibilidad.\n\n`
                : `Nos encantaría agendar una reunión (presencial o virtual) para conversar sobre este proceso. Por favor indíquenos su disponibilidad.\n\n`;
        } else if (this.solicitarReunionPresencial) {
            msg += tu
                ? `Nos encantaría agendar una reunión presencial para conversar sobre este proceso. Por favor indícanos tu disponibilidad.\n\n`
                : `Nos encantaría agendar una reunión presencial para conversar sobre este proceso. Por favor indíquenos su disponibilidad.\n\n`;
        } else if (this.solicitarReunionVirtual) {
            msg += tu
                ? `Nos encantaría agendar una reunión virtual para conversar sobre este proceso. Por favor indícanos tu disponibilidad.\n\n`
                : `Nos encantaría agendar una reunión virtual para conversar sobre este proceso. Por favor indíquenos su disponibilidad.\n\n`;
        }

        // Compromiso
        if (this.solicitarFechaCompromiso) {
            msg += tu
                ? `Te agradecemos indicarnos una fecha en la que puedas acompañar este compromiso.\n\n`
                : `Le agradecemos indicarnos una fecha en la que pueda acompañar este compromiso.\n\n`;
        }

        msg += tu
            ? `Agradecemos tu valioso acompañamiento; juntos seguimos construyendo su crecimiento.\n\n`
            : `Agradecemos su valioso acompañamiento; juntos seguimos construyendo su crecimiento.\n\n`;

        msg += `Con afecto,\n*${this.nombreColegio}* 💛`;
        return msg;
    }

    private getMensajeParaEnvio(nombreDestinatario: string): string {
        return this.mensajeEditable.replace(/\{NOMBRE_DESTINATARIO\}/g, nombreDestinatario);
    }

    enviarWhatsAppAcudiente(fila: FilaEstudiante, acudiente: AcudienteInforme, indice: number): void {
        const telefono = this.telefonosEditables[indice];
        if (!telefono) {
            Swal.fire('Atención', 'Ingrese un número de teléfono.', 'warning');
            return;
        }
        const mensaje = this.getMensajeParaEnvio(acudiente.nombre_acudiente);
        const telefonoLimpio = this.limpiarTelefono(telefono);
        this.guardarHistorialSilencioso(fila, acudiente.id_persona_acudiente, telefonoLimpio, acudiente.nombre_acudiente, 'whatsapp');
        window.open(`https://wa.me/57${telefonoLimpio}?text=${encodeURIComponent(mensaje)}`, '_blank');
    }

    enviarWhatsAppAdicional(fila: FilaEstudiante): void {
        if (!this.telefonoAdicional) {
            Swal.fire('Atención', 'Ingrese un número de teléfono.', 'warning');
            return;
        }
        const nombre = this.nombreAdicional.trim() || 'Señor(a) acudiente';
        const mensaje = this.getMensajeParaEnvio(nombre);
        const telefonoLimpio = this.limpiarTelefono(this.telefonoAdicional);
        this.guardarHistorialSilencioso(fila, null, telefonoLimpio, nombre, 'whatsapp');
        window.open(`https://wa.me/57${telefonoLimpio}?text=${encodeURIComponent(mensaje)}`, '_blank');
    }

    // ============================================
    // HISTORIAL Y COMPROMISOS
    // ============================================

    private guardarHistorialSilencioso(
        fila: FilaEstudiante,
        idPersonaAcudiente: number | null,
        contactoUsado: string,
        nombreDestinatario: string,
        medioEnvio: string
    ): void {
        if (!this.idSprintSeleccionado) return;

        const idUsuario = this.utilService.obtenerIdUsuarioActual();
        const idColaborador = this.utilService.obtenerIdColaboradorActual();

        const registro: any = {
            id_estudiante: fila.id_estudiante,
            id_sprint: this.idSprintSeleccionado,
            id_persona_acudiente: idPersonaAcudiente,
            contacto_usado: contactoUsado,
            nombre_destinatario: nombreDestinatario,
            medio_envio: medioEnvio,
            id_usuario: idUsuario
        };

        this.historialInformesService.crear(registro).subscribe({
            next: (response: any) => {
                if (idColaborador) {
                    const nombreCorte = this.sprintActual?.nombre_corte_academico || this.sprintActual?.nombre_sprint || '';
                    const descripcion = `Seguimiento envío informe${nombreCorte ? ' (' + nombreCorte + ')' : ''} - ${fila.nombre_estudiante} - Enviado a: ${nombreDestinatario}`;
                    const tarea: any = {
                        id_colaborador: idColaborador,
                        id_estudiante: fila.id_estudiante,
                        descripcion: descripcion,
                        origen: 'informe_estudiante',
                        id_historial_origen: response.id || null,
                        id_usuario_registro: idUsuario
                    };
                    this.tareasColaboradoresService.crear(tarea).subscribe({
                        error: (err: any) => console.error('Error al crear tarea:', err)
                    });
                }
            },
            error: (err: any) => console.error('Error al guardar historial:', err)
        });
    }

    verHistorial(fila: FilaEstudiante): void {
        this.estudianteHistorial = fila;
        this.historialEstudiante = [];
        this.cargandoHistorial = true;

        const sub = this.historialInformesService.obtenerPorEstudiante(fila.id_estudiante).subscribe({
            next: (response: any) => {
                this.historialEstudiante = (response.body || []).map((h: any) => ({
                    ...h,
                    editando: false,
                    compromiso_editado: h.compromiso || '',
                    fecha_compromiso_editada: h.fecha_compromiso || ''
                }));
                this.cargandoHistorial = false;
            },
            error: (err: any) => {
                console.error('Error al cargar historial:', err);
                this.cargandoHistorial = false;
            }
        });
        this.subscriptions.push(sub);

        const modal = new (window as any).bootstrap.Modal(document.getElementById('modalHistorialInforme'));
        modal.show();
    }

    editarCompromiso(registro: HistorialInforme): void {
        registro.editando = true;
        registro.compromiso_editado = registro.compromiso || '';
        registro.fecha_compromiso_editada = registro.fecha_compromiso || '';
    }

    cancelarEdicionCompromiso(registro: HistorialInforme): void {
        registro.editando = false;
    }

    guardarCompromiso(registro: HistorialInforme): void {
        const datos = {
            id: registro.id,
            compromiso: registro.compromiso_editado?.trim() || null,
            fecha_compromiso: registro.fecha_compromiso_editada || null
        };

        this.historialInformesService.actualizar(datos).subscribe({
            next: () => {
                registro.compromiso = datos.compromiso;
                registro.fecha_compromiso = datos.fecha_compromiso;
                registro.editando = false;
                Swal.fire({
                    title: 'Compromiso guardado',
                    icon: 'success',
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 2000
                });
            },
            error: (err: any) => {
                console.error('Error al guardar compromiso:', err);
                Swal.fire('Error', 'No se pudo guardar el compromiso.', 'error');
            }
        });
    }

    // ============================================
    // UTILIDADES
    // ============================================

    private crearModeloVacio(): ModalObservacionModel {
        return {
            id: 0,
            id_estudiante: 0,
            id_tipo_observacion_estudiante: 0,
            descripcion: '',
            fecha: '',
            id_estudiante_afectado: null,
            id_sprint: null,
            para_informe: true,
            fecha_informe_padre: null,
            firma_informe_padre: null,
            fecha_informe_padre_afectado: null,
            firma_informe_padre_afectado: null,
            id_usuario: null,
            fecha_registro: null
        };
    }

    private formatDate(date: Date): string {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    private formatDateFromString(dateString: string): string {
        if (!dateString) return '';
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return dateString;
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return dateString;
            return this.formatDate(date);
        } catch {
            return dateString;
        }
    }

    private formatearFechaCorta(fecha: string): string {
        if (!fecha) return '';
        const fn = this.formatDateFromString(fecha);
        const partes = fn.split('-');
        if (partes.length !== 3) return fecha;
        return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }

    formatearRangoFechasSprint(s: SprintInfo): string {
        const ini = this.formatearFechaCorta(s.fecha_inicial);
        const fin = this.formatearFechaCorta(s.fecha_final);
        if (ini && fin) return `${ini} - ${fin}`;
        return ini || fin || '';
    }

    limpiarTelefono(telefono: string): string {
        return telefono.replace(/[\s\-\(\)\+]/g, '').replace(/^57/, '');
    }

    trackByEstudiante(index: number, fila: FilaEstudiante): number {
        return fila.id_estudiante;
    }

    trackByTipo(index: number, tipo: TipoObservacionInforme): number {
        return tipo.id;
    }
}