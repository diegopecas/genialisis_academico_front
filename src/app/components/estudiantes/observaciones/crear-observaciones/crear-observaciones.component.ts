import { CUSTOM_ELEMENTS_SCHEMA, Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import Swal from 'sweetalert2';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../../../common/header/header.component';
import { EstudiantesService } from '../../../../services/estudiantes.service';
import { UtilService } from '../../../../common/constantes/util.service';
import { ObservacionesEstudiantesService } from '../../../../services/observaciones-estudiantes.service';
import { TiposObservacionesEstudiantesService } from '../../../../services/tipos-observaciones-estudiantes.service';
import { SignaturePadComponent } from '../../../../common/signature/signature-pad.component';
import { MejorarTextoComponent } from '../../../../common/mejorar-texto/mejorar-texto.component';
import { TranscribirAudioComponent } from '../../../../common/transcribir-audio/transcribir-audio.component';
import { AsistenciaEstudiantesService } from '../../../../services/asistencia-estudiantes.service';
import { SprintsService } from '../../../../services/sprints.service';


// Interfaz para el modelo de observación
interface ObservacionModel {
    id: number;
    id_estudiante: string;
    id_tipo_observacion_estudiante: string;
    descripcion: string;
    fecha: string;
    id_estudiante_afectado: string | null;
    id_sprint: string | null;
    para_informe: boolean;
    fecha_informe_padre: string | null;
    firma_informe_padre: string | null;
    fecha_informe_padre_afectado: string | null;
    firma_informe_padre_afectado: string | null;
    id_usuario: number | null;
    fecha_registro: string | null;
}

@Component({
    selector: 'app-crear-observaciones',
    templateUrl: './crear-observaciones.component.html',
    styleUrl: './crear-observaciones.component.scss',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        HeaderComponent,
        SignaturePadComponent,
        MejorarTextoComponent,
        TranscribirAudioComponent
    ],
    schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class CrearObservacionesComponent implements OnInit {
    @ViewChild('firmaInformePadre') signaturePadPadre!: SignaturePadComponent;
    @ViewChild('firmaInformePadreAfectado') signaturePadPadreAfectado!: SignaturePadComponent;

    public id = "0";
    public idEstudiante = "0";
    public accion = "";
    public editable = false;
    public submitted = false;
    public estudiante: any;
    public estudianteAfectado: any;
    public nombre_estudiante = "";
    public nombre_estudiante_afectado = "";
    public titulo = "Registro de observaciones ";
    public regresar = '/estudiantes-observaciones/';
    public mostrarFirmaPadre = false;
    public mostrarFirmaPadreAfectado = false;

    // Nueva propiedad para controlar si se requiere firma
    public requiereFirma = false;
    // Nueva propiedad para controlar si se valida asistencia
    public validaAsistencia = false;

    public listas = {
        tiposObservaciones: [] as any[],
        estudiantes: [] as any[],
        sprints: [] as any[]
    }

    public model: ObservacionModel = {
        id: 0,
        id_estudiante: "",
        id_tipo_observacion_estudiante: "",
        descripcion: "",
        fecha: "",
        id_estudiante_afectado: null,
        id_sprint: null,
        para_informe: false,
        fecha_informe_padre: null,
        firma_informe_padre: null,
        fecha_informe_padre_afectado: null,
        firma_informe_padre_afectado: null,
        id_usuario: null,
        fecha_registro: null
    };

    public firmasGuardadasOriginalmente = {
        padre: false,
        afectado: false
    };
    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private observacionesService: ObservacionesEstudiantesService,
        private tiposObservacionesService: TiposObservacionesEstudiantesService,
        private estudiantesService: EstudiantesService,
        private utilService: UtilService,
        private asistenciaEstudiantesService: AsistenciaEstudiantesService,
        private sprintsService: SprintsService
    ) { }

    ngOnInit() {
        this.route.params.subscribe(params => {
            this.accion = params['accion'];
            this.id = params['id'];
            this.idEstudiante = params['idEstudiante'];
            this.regresar = this.regresar + this.idEstudiante;
            this.obtenerEstudiante(this.idEstudiante);

            switch (this.accion) {
                case 'crear':
                    this.editable = true;
                    this.consultarListas();
                    const hoy = new Date();
                    this.model.fecha = this.formatDate(hoy);
                    this.model.id_usuario = this.utilService.obtenerIdUsuarioActual();
                    this.model.fecha_registro = hoy.toISOString().replace('Z', '');
                    break;
                case 'editar':
                    this.editable = true;
                    this.consultarListas();
                    this.obtenerObservacion(this.id);
                    break;
                case 'consultar':
                    this.editable = false;
                    this.consultarListas();
                    this.obtenerObservacion(this.id);
                    break;
            }
        });
    }

    onTextoMejorado(textoMejorado: string) {
        this.model.descripcion = textoMejorado;

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

    // Método para limpiar la descripción
    limpiarDescripcion() {
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
            if (result.isConfirmed) {
                this.model.descripcion = '';
                Swal.fire({
                    title: 'Texto borrado',
                    icon: 'success',
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 2000
                });
            }
        });
    }

    // Verificar si hay firmas registradas en una observación guardada
    hayFirmasGuardadas(): boolean {
        // Solo considerar las firmas como restrictivas si ya están guardadas (id > 0)
        return !!this.model.id && (!!this.model.firma_informe_padre || !!this.model.firma_informe_padre_afectado);
    }

    // Verificar si hay firmas (para cualquier propósito)
    hayFirmas(): boolean {
        return !!this.model.firma_informe_padre || !!this.model.firma_informe_padre_afectado;
    }

    // si la observación ya está guardada (tiene ID) y existe la firma correspondiente
    esFirmaSoloLectura(tipo: 'padre' | 'afectado'): boolean {
        // En modo 'consultar', siempre es solo lectura
        if (!this.editable) {
            return true;
        }

        // Si es una firma que ya existía originalmente, siempre es de solo lectura
        if (tipo === 'padre' && this.firmasGuardadasOriginalmente.padre) {
            return true;
        }

        if (tipo === 'afectado' && this.firmasGuardadasOriginalmente.afectado) {
            return true;
        }

        // De lo contrario, no es de solo lectura
        return false;
    }


    consultarListas() {
        this.tiposObservacionesService.obtenerTodos().subscribe((response: any) => {
            this.listas.tiposObservaciones = response.body;
        });

        this.estudiantesService.obtenerTodos().subscribe((response: any) => {
            this.listas.estudiantes = response.body;
        });

        // Cargar sprint actual + anteriores del año institucional vigente
        this.sprintsService.obtenerActualYAnteriores().subscribe((response: any) => {
            this.listas.sprints = response.body || [];

            // Si estamos creando, preseleccionar el sprint según la fecha actual del modelo
            if (this.accion === 'crear') {
                this.preseleccionarSprintPorFecha();
            }
        });
    }

    // Determina el sprint correspondiente a la fecha de la observación.
    // Si la fecha cae dentro del rango de algún sprint (fecha_inicial-fecha_final), lo usa.
    // Si no, cae al sprint marcado como actual.
    preseleccionarSprintPorFecha() {
        if (!this.listas.sprints || this.listas.sprints.length === 0) {
            return;
        }

        const fechaObservacion = this.model.fecha;
        let sprintCorrespondiente: any = null;

        if (fechaObservacion) {
            sprintCorrespondiente = this.listas.sprints.find((s: any) => {
                const inicio = this.formatDateFromString(s.fecha_inicial);
                const fin = this.formatDateFromString(s.fecha_final);
                return fechaObservacion >= inicio && fechaObservacion <= fin;
            });
        }

        // Si no hay sprint que contenga la fecha, usar el actual como respaldo
        if (!sprintCorrespondiente) {
            sprintCorrespondiente = this.listas.sprints.find((s: any) => s.actual === 1 || s.actual === '1');
        }

        if (sprintCorrespondiente) {
            this.model.id_sprint = String(sprintCorrespondiente.id);
        } else {
            this.model.id_sprint = null;
        }
    }

    // Se dispara cuando el usuario cambia la fecha de la observación
    onFechaChange() {
        // Solo recalcular automáticamente en modo crear, para no sobrescribir
        // un sprint que el usuario seleccionó manualmente al editar
        if (this.accion === 'crear') {
            this.preseleccionarSprintPorFecha();
        }
    }

    obtenerObservacion(id: any) {
        this.observacionesService.obtenerById(id).subscribe((response: any) => {
            const body = response.body;
            this.model = body[0];

            // Normalizar id_sprint a string para el binding del select
            if (this.model.id_sprint !== null && this.model.id_sprint !== undefined) {
                this.model.id_sprint = String(this.model.id_sprint);
            }

            // Normalizar para_informe a boolean para el binding del checkbox
            this.model.para_informe = this.model.para_informe === true
                || (this.model.para_informe as any) === 1
                || (this.model.para_informe as any) === '1';

            // Registrar qué firmas ya existían originalmente
            this.firmasGuardadasOriginalmente = {
                padre: !!this.model.firma_informe_padre,
                afectado: !!this.model.firma_informe_padre_afectado
            };

            // Formatear fechas para que sean compatibles con los controles de input date
            if (this.model.fecha) {
                this.model.fecha = this.formatDateFromString(this.model.fecha);
            }

            if (this.model.fecha_informe_padre) {
                this.model.fecha_informe_padre = this.formatDateFromString(this.model.fecha_informe_padre);
            }

            if (this.model.fecha_informe_padre_afectado) {
                this.model.fecha_informe_padre_afectado = this.formatDateFromString(this.model.fecha_informe_padre_afectado);
            }

            if (this.model.id_estudiante_afectado) {
                this.obtenerEstudianteAfectado(this.model.id_estudiante_afectado);
            }

            // Si hay firmas, mostrar los contenedores de firma
            if (this.accion !== 'crear') {
                this.mostrarFirmaPadre = !!this.model.firma_informe_padre;
                this.mostrarFirmaPadreAfectado = !!this.model.firma_informe_padre_afectado;

                // Cargar las firmas existentes en los pads después de que los componentes estén disponibles
                setTimeout(() => {
                    if (this.model.firma_informe_padre && this.signaturePadPadre) {
                        this.signaturePadPadre.fromDataURL(this.model.firma_informe_padre);
                    }
                    if (this.model.firma_informe_padre_afectado && this.signaturePadPadreAfectado) {
                        this.signaturePadPadreAfectado.fromDataURL(this.model.firma_informe_padre_afectado);
                    }
                }, 500);
            }

            // Verificar las características del tipo de observación después de cargar el modelo
            this.verificarCaracteristicasTipoObservacion();
        });
    }

    // Nuevo método para verificar las características del tipo de observación
    verificarCaracteristicasTipoObservacion() {
        if (!this.model.id_tipo_observacion_estudiante) {
            // Si no hay tipo seleccionado, reiniciar valores
            this.requiereFirma = false;
            this.validaAsistencia = false;
            return;
        }

        const tipoObservacion = this.listas.tiposObservaciones.find(
            tipo => tipo.id === Number(this.model.id_tipo_observacion_estudiante)
        );

        if (tipoObservacion) {
            // Actualizar propiedades según el tipo de observación
            this.requiereFirma = tipoObservacion.requiere_firma === 1;
            this.validaAsistencia = tipoObservacion.valida_asistencia === 1;

            // Si no requiere firma y estamos creando, limpiar referencias a firmas
            if (!this.requiereFirma && this.accion === 'crear') {
                this.model.firma_informe_padre = null;
                this.model.fecha_informe_padre = null;
                this.model.firma_informe_padre_afectado = null;
                this.model.fecha_informe_padre_afectado = null;
                this.mostrarFirmaPadre = false;
                this.mostrarFirmaPadreAfectado = false;
            }
        }
    }

    // Método auxiliar para formatear fechas desde string o Date
    private formatDateFromString(dateString: string): string {
        // Si la fecha ya tiene el formato yyyy-MM-dd, la devolvemos como está
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
            return dateString;
        }

        try {
            // Intentar crear un objeto Date a partir del string
            const date = new Date(dateString);
            if (isNaN(date.getTime())) {
                console.error('Fecha inválida:', dateString);
                return dateString; // Devolver el original si no se puede parsear
            }

            // Formatear a yyyy-MM-dd
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        } catch (error) {
            console.error('Error al formatear fecha:', error);
            return dateString; // Devolver el original en caso de error
        }
    }

    private formatDate(date: Date): string {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // Formatea una fecha 'yyyy-MM-dd' a 'dd/MM/yyyy'
    private formatearFechaCorta(fecha: string): string {
        if (!fecha) {
            return '';
        }
        const fechaNormalizada = this.formatDateFromString(fecha);
        const partes = fechaNormalizada.split('-');
        if (partes.length !== 3) {
            return fecha;
        }
        return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }

    // Devuelve el rango de fechas del sprint en formato 'dd/MM/yyyy - dd/MM/yyyy'
    formatearRangoFechas(fechaInicial: string, fechaFinal: string): string {
        const inicio = this.formatearFechaCorta(fechaInicial);
        const fin = this.formatearFechaCorta(fechaFinal);
        if (inicio && fin) {
            return `${inicio} - ${fin}`;
        }
        return inicio || fin || '';
    }

    // Método para verificar asistencia y retornar una promesa booleana
    verificarAsistenciaEstudiante(): Promise<boolean> {
        return new Promise((resolve, reject) => {
            let data = {
                id_estudiante: this.idEstudiante,
                fecha: this.model.fecha
            };

            this.asistenciaEstudiantesService.verificarAsistenciaEstudiante(data).subscribe({
                next: (response: any) => {
                    resolve(response.tiene_asistencia); // true o false
                },
                error: (err) => {
                    console.error('Error verificando asistencia', err);
                    reject(false);
                }
            });
        });
    }

    async grabar() {
        this.submitted = true;
        if (!this.formularioValido()) return;

        /*         // Verificar si el tipo de observación requiere firma y no hay firmas
                if (this.requiereFirma && !this.hayFirmas() && this.editable) {
                    Swal.fire({
                        title: 'Atención',
                        text: 'Este tipo de observación requiere la firma del padre o acudiente',
                        icon: 'warning',
                        confirmButtonText: 'Entendido'
                    });
                    return;
                } */

        // Si el tipo valida asistencia, verificar antes de guardar
        if (this.validaAsistencia) {
            try {
                // Mostrar indicador de carga
                Swal.fire({
                    title: 'Verificando asistencia...',
                    text: 'Por favor espere',
                    allowOutsideClick: false,
                    didOpen: () => {
                        Swal.showLoading();
                    }
                });

                const tieneAsistencia = await this.verificarAsistenciaEstudiante();
                Swal.close();

                if (!tieneAsistencia) {
                    Swal.fire('Atención', 'El estudiante no tiene asistencia registrada para esta fecha. No se puede continuar.', 'warning');
                    return;
                }

                // Si llegamos aquí es porque tiene asistencia, continuamos con el proceso
                this.procesarCreacionActualizacion();
            } catch (error) {
                console.error('Error en verificación de asistencia:', error);
                Swal.fire('Error', 'Hubo un problema al verificar la asistencia del estudiante', 'error');
            }
        } else {
            // Si no requiere validación de asistencia, procedemos directo
            this.procesarCreacionActualizacion();
        }
    }

    // Método para extraer la lógica de creación/actualización
    private procesarCreacionActualizacion() {
        console.log("procesarCreacionActualizacion", this.model)
        const servicio = this.accion === 'crear'
            ? this.observacionesService.crear(this.model)
            : this.observacionesService.actualizar(this.model);

        servicio.subscribe({
            next: (response: any) => {
                if (response) {
                    Swal.fire({
                        title: this.accion === 'crear' ? 'Observación registrada con éxito' : 'Observación actualizada',
                        icon: 'success',
                        confirmButtonText: 'Aceptar'
                    }).then(() => {
                        if (this.accion === 'crear') {
                            this.limpiarFormulario();
                        } else {
                            this.volver();
                        }
                    });
                } else {
                    Swal.fire('Error', 'Hubo un problema al guardar los datos', 'error');
                }
            },
            error: (error) => {
                console.error('Error al procesar la operación:', error);
                Swal.fire('Error', 'Hubo un problema al guardar los datos', 'error');
            }
        });
    }

    formularioValido() {
        let esValido = this.model.id_estudiante &&
            this.model.id_tipo_observacion_estudiante &&
            this.model.descripcion &&
            this.model.fecha &&
            this.model.id_sprint;

        return esValido;
    }

    limpiarFormulario() {
        this.model = {
            id: 0,
            id_estudiante: this.idEstudiante,
            id_tipo_observacion_estudiante: "",
            descripcion: "",
            fecha: "",
            id_estudiante_afectado: null,
            id_sprint: null,
            para_informe: false,
            fecha_informe_padre: null,
            firma_informe_padre: null,
            fecha_informe_padre_afectado: null,
            firma_informe_padre_afectado: null,
            id_usuario: null,
            fecha_registro: null
        };

        const hoy = new Date();
        this.model.fecha = this.formatDate(hoy);
        this.model.id_usuario = this.utilService.obtenerIdUsuarioActual();
        this.model.fecha_registro = hoy.toISOString().replace('Z', '');
        this.submitted = false;

        // Preseleccionar el sprint que contiene la fecha de hoy (o el actual como respaldo)
        this.preseleccionarSprintPorFecha();

        // Limpiar las firmas
        if (this.signaturePadPadre) {
            this.signaturePadPadre.clear();
        }
        if (this.signaturePadPadreAfectado) {
            this.signaturePadPadreAfectado.clear();
        }

        this.mostrarFirmaPadre = false;
        this.mostrarFirmaPadreAfectado = false;
        this.nombre_estudiante_afectado = "";
        this.estudianteAfectado = null;

        // Restablecer propiedades de requisitos
        this.requiereFirma = false;
        this.validaAsistencia = false;
    }

    volver() {
        this.router.navigate(['/estudiantes-observaciones/' + this.idEstudiante]);
    }

    obtenerEstudiante(id_estudiante: any) {
        this.estudiantesService.obtenerById(id_estudiante).subscribe((response: any) => {
            const body = response.body as any[];
            this.estudiante = body[0];
            this.model.id_estudiante = this.idEstudiante;
            this.nombre_estudiante = [
                this.estudiante.primer_nombre,
                this.estudiante.segundo_nombre,
                this.estudiante.primer_apellido,
                this.estudiante.segundo_apellido
            ].filter(Boolean).join(' ');
            this.titulo = this.titulo + " para " + this.nombre_estudiante;
        });
    }

    obtenerEstudianteAfectado(id_estudiante_afectado: any) {
        this.estudiantesService.obtenerById(id_estudiante_afectado).subscribe((response: any) => {
            const body = response.body as any[];
            this.estudianteAfectado = body[0];
            this.nombre_estudiante_afectado = [
                this.estudianteAfectado.primer_nombre,
                this.estudianteAfectado.segundo_nombre,
                this.estudianteAfectado.primer_apellido,
                this.estudianteAfectado.segundo_apellido
            ].filter(Boolean).join(' ');
        });
    }

   
    onEstudianteAfectadoChange() {
        // Convertir cadena vacía a null
        if (this.model.id_estudiante_afectado === '' || !this.model.id_estudiante_afectado) {
            this.model.id_estudiante_afectado = null;
            this.nombre_estudiante_afectado = "";
            this.estudianteAfectado = null;

            // También limpiar los campos relacionados con el estudiante afectado
            this.model.fecha_informe_padre_afectado = null;
            this.model.firma_informe_padre_afectado = null;
            this.mostrarFirmaPadreAfectado = false;
        } else {
            this.obtenerEstudianteAfectado(this.model.id_estudiante_afectado);
        }
    }
    // Método para manejar cambio en tipo de observación
    onTipoObservacionChange() {
        this.verificarCaracteristicasTipoObservacion();

        // Si estamos en modo crear y la acción tiene requisitos, mostrar mensajes
        if (this.editable) {
            // Determinar qué mensajes mostrar
            let mensajes = [];

            if (this.requiereFirma) {
                mensajes.push({
                    titulo: 'Información',
                    texto: 'Este tipo de observación requiere firma del padre o acudiente',
                    icono: 'info'
                });
            }

            if (this.validaAsistencia) {
                mensajes.push({
                    titulo: 'Información',
                    texto: 'Este tipo de observación requiere que el estudiante tenga asistencia registrada en la fecha seleccionada',
                    icono: 'info'
                });
            }

            // Si hay mensajes para mostrar
            if (mensajes.length > 0) {
                // Si hay un solo mensaje, mostrarlo normalmente
                if (mensajes.length === 1) {
                    Swal.fire({
                        title: mensajes[0].titulo,
                        text: mensajes[0].texto,
                        icon: mensajes[0].icono as any,
                        confirmButtonText: 'Entendido'
                    });
                }
                // Si hay múltiples mensajes, mostrarlos combinados
                else {
                    let textosCombinados = mensajes.map(m => m.texto).join('\n\n');

                    Swal.fire({
                        title: 'Información importante',
                        html: textosCombinados.replace(/\n/g, '<br>'),
                        icon: 'info',
                        confirmButtonText: 'Entendido'
                    });
                }
            }
        }
    }
    activarFirmaPadre() {
        // Si ya existe una firma guardada originalmente, no permitir cambios
        if (this.firmasGuardadasOriginalmente.padre) {
            Swal.fire('Atención', 'No se puede modificar una firma que ya ha sido guardada', 'warning');
            return;
        }

        this.mostrarFirmaPadre = true;
        const hoy = new Date();
        this.model.fecha_informe_padre = this.formatDate(hoy);
    }

    activarFirmaPadreAfectado() {
        if (!this.model.id_estudiante_afectado) {
            Swal.fire('Error', 'Debe seleccionar un estudiante afectado primero', 'error');
            return;
        }

        // Si ya existe una firma guardada originalmente, no permitir cambios
        if (this.firmasGuardadasOriginalmente.afectado) {
            Swal.fire('Atención', 'No se puede modificar una firma que ya ha sido guardada', 'warning');
            return;
        }

        this.mostrarFirmaPadreAfectado = true;
        const hoy = new Date();
        this.model.fecha_informe_padre_afectado = this.formatDate(hoy);
    }

    onFirmaPadreChange(firma: string) {
        this.model.firma_informe_padre = firma;
    }

    onFirmaPadreAfectadoChange(firma: string) {
        this.model.firma_informe_padre_afectado = firma;
    }

    mensajeRecibido(event: any) {
        const textoTranscrito = (event ?? '').toString().trim();
        if (!textoTranscrito) return;

        this.model.descripcion = this.model.descripcion
            ? this.model.descripcion + ' ' + textoTranscrito
            : textoTranscrito;
    }
    // Método para limpiar una firma específica
    limpiarFirma(tipo: 'padre' | 'afectado') {
        if (tipo === 'padre') {
            this.signaturePadPadre.clear();
            this.model.firma_informe_padre = null;
        } else if (tipo === 'afectado') {
            this.signaturePadPadreAfectado.clear();
            this.model.firma_informe_padre_afectado = null;
        }
    }
    /**
 * Genera el texto de contexto para la mejora de la descripción
 * @returns String con el contexto para la IA
 */
    generarContextoParaMejoraTexto(): string {
        let contexto = `Esta es una observación para el estudiante ${this.nombre_estudiante}`;

        // Agregar información sobre el tipo de observación si está seleccionado
        if (this.model.id_tipo_observacion_estudiante) {
            const tipoObservacion = this.listas.tiposObservaciones.find(
                tipo => tipo.id === Number(this.model.id_tipo_observacion_estudiante)
            );

            if (tipoObservacion) {
                contexto += ` sobre ${tipoObservacion.nombre}`;
            }
        }

        // Agregar información sobre el estudiante afectado si existe
        if (this.model.id_estudiante_afectado && this.nombre_estudiante_afectado) {
            contexto += `. Esta observación también involucra al estudiante ${this.nombre_estudiante_afectado}`;
        }

        // Agregar información sobre si requiere firma
        if (this.requiereFirma) {
            contexto += `. Este tipo de observación requiere firma del padre o acudiente`;
        }

        // Agregar información si la observación es para informe
        if (this.model.para_informe) {
            contexto += `. Esta observación será incluida en el informe académico del estudiante`;
        }

        contexto += `.`;

        return contexto;
    }
}