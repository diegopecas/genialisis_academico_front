// ========== crear-institucion-cliente.component.ts ==========
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import Swal from 'sweetalert2';
import { HeaderComponent } from '../../../../common/header/header.component';
import { FotoPersonaComponent } from '../../../../common/foto-persona/foto-persona.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InstitucionesClienteService } from '../../../../services/instituciones-cliente.service';
import { TiposInstitucionService } from '../../../../services/tipos-institucion.service';
import { PersonasService } from '../../../../services/personas.service';
import { TiposIdentificacionService } from '../../../../services/tipos-identificacion.service';
import { GenerosService } from '../../../../services/generos.service';
import { CiudadesService } from '../../../../services/ciudades.service';
import { EstudiantesXInstitucionesClienteService } from '../../../../services/estudiantes-x-instituciones-cliente.service';
import { CursosExtraXInstitucionesClienteService } from '../../../../services/cursos-extra-x-instituciones-cliente.service';
import { SolicitudesInscripcionPublicaService } from '../../../../services/solicitudes-inscripcion-publica.service';

interface InstitucionClienteModel {
    idPersona: string;
    tipoIdentificacion: number | string;
    numeroIdentificacion: number | string;
    razonSocial: string;
    primerNombre: string;
    segundoNombre: string;
    primerApellido: string;
    segundoApellido: string;
    fechaNacimiento: string;
    genero: number | string;
    direccion: string;
    correoElectronico: string;
    telefono: string;
    nacionalidad: string;
    ciudad: number | string;
    rh: string;
    ocupacion: string;
    // Campos específicos de instituciones cliente
    tipoInstitucion: number | string;
    idInstitucionCliente: string;
    activo: number;
}

@Component({
    selector: 'app-crear-institucion-cliente',
    standalone: true,
    imports: [HeaderComponent, CommonModule, FormsModule, FotoPersonaComponent],
    templateUrl: './crear-institucion-cliente.component.html',
    styleUrl: './crear-institucion-cliente.component.scss'
})
export class CrearInstitucionClienteComponent implements OnInit {

    public id = "0";
    public accion = "";
    public editable = true;
    public submitted = false;
    public titulo = "Registro de institución cliente";
    public regresar = '/administracion/datos-maestros/instituciones-cliente';
    public documentoEncontrado = false;
    public camposHabilitados = false;
    public esPersonaJuridica = false; // Para manejar si es empresa o persona natural

    // Pestanas. El tab de estudiantes solo tiene sentido con la institucion
    // ya creada, por eso no se muestra en la accion de crear.
    public pestanaActiva: string = 'datos';
    public menuMovilAbierto: boolean = false;

    // Estudiantes de la institucion. Es una relacion con vigencia por anio y
    // no un atributo del estudiante: un nino puede venir del Colegio X este
    // anio y del Y el siguiente, y el historico tiene que quedar.
    public estudiantesInstitucion = [] as any[];
    public estudiantesDisponibles = [] as any[];
    public idEstudianteSeleccionado: any = null;
    public anioEstudiantes: number = new Date().getFullYear();

    // Cursos extracurriculares que tienen convenio con esta institucion.
    public cursosInstitucion = [] as any[];


    // Solicitudes que llegaron por el portal publico para esta institucion.
    // Al aprobar se crea el estudiante y queda inscrito al curso.
    public solicitudes = [] as any[];
    public aprobandoId: any = null;

    public listas = {
        tiposIdentificacion: [] as any[],
        generos: [] as any[],
        tiposInstitucion: [] as any[],
        ciudades: [] as any[],
        gruposRh: [
            { id: 'O+', nombre: 'O+' },
            { id: 'O-', nombre: 'O-' },
            { id: 'A+', nombre: 'A+' },
            { id: 'A-', nombre: 'A-' },
            { id: 'B+', nombre: 'B+' },
            { id: 'B-', nombre: 'B-' },
            { id: 'AB+', nombre: 'AB+' },
            { id: 'AB-', nombre: 'AB-' }
        ]
    }

    public model: InstitucionClienteModel = {
        idPersona: '',
        tipoIdentificacion: "",
        numeroIdentificacion: "",
        razonSocial: "",
        primerNombre: "",
        segundoNombre: "",
        primerApellido: "",
        segundoApellido: "",
        fechaNacimiento: "",
        genero: "",
        direccion: "",
        correoElectronico: "",
        telefono: "",
        nacionalidad: "Colombiana",
        ciudad: "",
        rh: "",
        ocupacion: "Institución cliente",
        tipoInstitucion: "",
        idInstitucionCliente: '',
        activo: 1
    };

    public institucionActivaSwitch = true;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private tiposIdentificacionService: TiposIdentificacionService,
        private generosService: GenerosService,
        private tiposInstitucionService: TiposInstitucionService,
        private personasService: PersonasService,
        private institucionesClienteService: InstitucionesClienteService,
        private ciudadesService: CiudadesService,
        private estudiantesXInstitucionesClienteService: EstudiantesXInstitucionesClienteService,
        private cursosExtraXInstitucionesClienteService: CursosExtraXInstitucionesClienteService,
        private solicitudesInscripcionService: SolicitudesInscripcionPublicaService
    ) { }

    ngOnInit(): void {
        this.route.params.subscribe(params => {
            this.accion = params['accion'];
            this.id = params['id'];

            switch (this.accion) {
                case 'crear':
                    this.editable = true;
                    this.camposHabilitados = false;
                    this.titulo = "Crear institución cliente";
                    this.establecerValoresPorDefecto();
                    break;
                case 'editar':
                    this.editable = true;
                    this.camposHabilitados = true;
                    this.documentoEncontrado = true;
                    this.titulo = "Editar institución cliente";
                    this.obtenerInstitucion(this.id);
                    this.cargarEstudiantes(this.id);
                    this.cargarEstudiantesDisponibles(this.id);
                    this.cargarCursos(this.id);
                    this.cargarSolicitudes(this.id);
                    break;
                case 'consultar':
                    this.editable = false;
                    this.camposHabilitados = false;
                    this.documentoEncontrado = true;
                    this.titulo = "Consultar institución cliente";
                    this.obtenerInstitucion(this.id);
                    this.cargarEstudiantes(this.id);
                    this.cargarCursos(this.id);
                    this.cargarSolicitudes(this.id);
                    break;
                default:
                    this.editable = true;
                    this.camposHabilitados = false;
                    this.titulo = "Crear institución cliente";
                    this.establecerValoresPorDefecto();
                    break;
            }
        });

        this.consultarTiposIdentificacion();
        this.consultarGeneros();
        this.consultarTiposInstitucion();
        this.consultarCiudades();
    }

    consultarTiposIdentificacion() {
        this.tiposIdentificacionService.obtenerTodos().subscribe((response: any) => {
            console.log("consultarTiposIdentificacion", response.body);
            this.listas.tiposIdentificacion = response.body;
        });
    }

    consultarGeneros() {
        this.generosService.obtenerTodos().subscribe((response: any) => {
            console.log("generosService", response.body);
            this.listas.generos = response.body;
        });
    }

    consultarTiposInstitucion() {
        this.tiposInstitucionService.obtenerTodos().subscribe((response: any) => {
            console.log("tiposInstitucionService", response.body);
            this.listas.tiposInstitucion = response.body;
        });
    }

    consultarCiudades() {
        this.ciudadesService.obtenerTodos().subscribe((response: any) => {
            console.log("ciudadesService", response.body);
            this.listas.ciudades = response.body;
        });
    }

    onTipoIdentificacionChange() {
        const tipoSeleccionado = this.listas.tiposIdentificacion.find(t => t.id == this.model.tipoIdentificacion);
        if (tipoSeleccionado && tipoSeleccionado.nombre.toUpperCase().includes('NIT')) {
            this.esPersonaJuridica = true;
        } else {
            this.esPersonaJuridica = false;
        }
        console.log("onTipoIdentificacionChange", this.esPersonaJuridica)
    }

    consultaPersona(tipoIdentificacion: any, numeroIdentificacion: any) {
        if (!tipoIdentificacion || !numeroIdentificacion) {
            Swal.fire({
                title: 'Campos incompletos',
                text: 'Por favor ingrese tipo y número de documento para verificar',
                icon: 'warning',
                confirmButtonText: 'Aceptar'
            });
            return;
        }

        this.personasService.obtenerByIdentificacion(tipoIdentificacion, numeroIdentificacion).subscribe({
            next: (response: any) => {
                console.log("consultaPersona", response.body);
                if (response.body && response.body.length > 0) {
                    const persona = response.body[0];

                    // Verificar si la persona ya está registrada como institución cliente
                    this.institucionesClienteService.verificarDuplicados(persona.id).subscribe({
                        next: (respuesta: any) => {
                            if (respuesta.existe) {
                                Swal.fire({
                                    title: 'Institución existente',
                                    text: 'Esta institución ya está registrada como cliente en el sistema',
                                    icon: 'warning',
                                    confirmButtonText: 'Aceptar'
                                });
                                return;
                            } else {
                                this.llenarFormularioPersona(persona);
                                this.documentoEncontrado = true;
                                this.camposHabilitados = true;
                                Swal.fire({
                                    title: 'Registro encontrado',
                                    text: 'Se encontró un registro con esta identificación',
                                    icon: 'success',
                                    confirmButtonText: 'Aceptar'
                                });
                            }
                        },
                        error: (error: any) => {
                            console.error("Error al verificar institución cliente", error);
                            Swal.fire({
                                title: 'Error',
                                text: 'Error al verificar si ya está registrada como institución cliente',
                                icon: 'error',
                                confirmButtonText: 'Aceptar'
                            });
                        }
                    });
                } else {
                    // No se encontró la persona, habilitar campos para ingresar datos
                    this.documentoEncontrado = true;
                    this.camposHabilitados = true;
                    this.onTipoIdentificacionChange(); // Verificar si es persona jurídica
                    Swal.fire({
                        title: 'Registro no encontrado',
                        text: 'No se encontró ningún registro con esta identificación. Ahora puede ingresar los datos.',
                        icon: 'info',
                        confirmButtonText: 'Aceptar'
                    });
                }
            },
            error: (error: any) => {
                console.error("Error al consultar persona", error);
                Swal.fire({
                    title: 'Error',
                    text: 'Error al consultar la identificación',
                    icon: 'error',
                    confirmButtonText: 'Aceptar'
                });
            }
        });
    }

    llenarFormularioPersona(persona: any) {
        this.model.idPersona = persona.id;
        this.model.tipoIdentificacion = persona.id_tipo_identificacion;
        this.model.numeroIdentificacion = persona.numero_identificacion;
        this.model.razonSocial = persona.razon_social || "";
        this.model.primerNombre = persona.primer_nombre;
        this.model.segundoNombre = persona.segundo_nombre;
        this.model.primerApellido = persona.primer_apellido;
        this.model.segundoApellido = persona.segundo_apellido;
        this.model.fechaNacimiento = persona.fecha_nacimiento;
        this.model.genero = persona.id_genero;
        this.model.direccion = persona.direccion;
        this.model.correoElectronico = persona.correo_electronico;
        this.model.nacionalidad = persona.nacionalidad || 'Colombiana';
        this.model.telefono = persona.telefono;
        this.model.ciudad = persona.id_ciudad;
        this.model.rh = persona.rh;
        this.model.ocupacion = "Institución cliente";

        // Verificar si es persona jurídica
        this.onTipoIdentificacionChange();
    }

    obtenerInstitucion(id: any) {
        if (id && id !== "0") {
            this.institucionesClienteService.obtenerById(id).subscribe({
                next: (response: any) => {
                    const institucion = response.body[0];
                    console.log("Institución cliente recibida:", institucion);

                    if (institucion) {
                        // Usar DIRECTAMENTE los datos recibidos, NO hacer otra llamada
                        this.model.idPersona = institucion.id_persona;
                        this.model.tipoIdentificacion = institucion.id_tipo_identificacion;
                        this.model.numeroIdentificacion = institucion.numero_identificacion;
                        this.model.razonSocial = institucion.razon_social || "";
                        this.model.primerNombre = institucion.primer_nombre || "";
                        this.model.segundoNombre = institucion.segundo_nombre || "";
                        this.model.primerApellido = institucion.primer_apellido || "";
                        this.model.segundoApellido = institucion.segundo_apellido || "";
                        this.model.fechaNacimiento = institucion.fecha_nacimiento || "";
                        this.model.genero = institucion.id_genero || "";
                        this.model.direccion = institucion.direccion || "";
                        this.model.correoElectronico = institucion.correo_electronico || "";
                        this.model.nacionalidad = institucion.nacionalidad || 'Colombiana';
                        this.model.telefono = institucion.telefono || "";
                        this.model.ciudad = institucion.id_ciudad || "";
                        this.model.rh = institucion.rh || "";
                        this.model.ocupacion = institucion.ocupacion || "Institución cliente";

                        // Datos específicos de la institución cliente
                        this.model.idInstitucionCliente = institucion.id;
                        this.model.tipoInstitucion = institucion.id_tipo_institucion;
                        this.model.activo = institucion.activo;
                        this.institucionActivaSwitch = (institucion.activo == 1 || institucion.activo === "1");

                        // Verificar si es persona jurídica
                        this.onTipoIdentificacionChange();

                        const nombreCompleto = this.model.razonSocial || `${institucion.primer_nombre || ''} ${institucion.primer_apellido || ''}`.trim();
                        if (this.accion === 'editar') {
                            this.titulo = `Editar institución cliente: ${nombreCompleto}`;
                        } else if (this.accion === 'consultar') {
                            this.titulo = `Consultar institución cliente: ${nombreCompleto}`;
                        }
                    }
                },
                error: (error: any) => {
                    console.error("Error al obtener institución cliente", error);
                    Swal.fire('Error', 'Error al cargar los datos de la institución cliente', 'error');
                }
            });
        }
    }

    construirNombreCompleto(persona: any): string {
        const partes = [];
        if (persona.primer_nombre) partes.push(persona.primer_nombre);
        if (persona.segundo_nombre) partes.push(persona.segundo_nombre);
        if (persona.primer_apellido) partes.push(persona.primer_apellido);
        if (persona.segundo_apellido) partes.push(persona.segundo_apellido);
        return partes.join(' ') || 'Sin nombre';
    }

    cambiarEstadoInstitucion(): void {
        this.model.activo = this.institucionActivaSwitch ? 1 : 0;
        const estado = this.institucionActivaSwitch ? 'activa' : 'inactiva';
        console.log(`Estado de la institución cliente cambiado a: ${estado}`);
    }

    guardarPersona(persona: any) {
        this.submitted = true;
        console.log("Crear persona", persona);

        if (!this.formularioValido()) {
            Swal.fire({
                title: 'Campos incompletos',
                text: 'Por favor complete los campos obligatorios',
                icon: 'warning',
                confirmButtonText: 'Aceptar'
            });
            return;
        }

        if (this.accion === 'editar' && persona.idPersona) {
            this.actualizarPersona(persona);
        } else {
            if (!persona.idPersona) {
                const personaData = this.prepararDatosPersona(persona);

                this.personasService.crear(personaData).subscribe({
                    next: (response: any) => {
                        console.log("persona creada", response);
                        if (!response.id) {
                            Swal.fire({
                                title: 'Error',
                                text: 'Error al crear el registro de la institución',
                                icon: 'error',
                                confirmButtonText: 'Aceptar'
                            });
                            return;
                        }
                        persona.idPersona = response.id;
                        this.crearActualizarInstitucion(persona);
                    },
                    error: (error: any) => {
                        console.error("Error al crear persona", error);
                        Swal.fire({
                            title: 'Error',
                            text: 'Error al crear el registro de la institución',
                            icon: 'error',
                            confirmButtonText: 'Aceptar'
                        });
                    }
                });
            } else {
                this.institucionesClienteService.verificarDuplicados(persona.idPersona).subscribe({
                    next: (respuesta: any) => {
                        if (respuesta.existe && this.accion === 'crear') {
                            Swal.fire({
                                title: 'Institución existente',
                                text: 'Esta institución ya está registrada como cliente',
                                icon: 'warning',
                                confirmButtonText: 'Aceptar'
                            });
                            return;
                        } else {
                            this.crearActualizarInstitucion(persona);
                        }
                    },
                    error: (error: any) => {
                        console.error("Error al verificar institución cliente", error);
                        Swal.fire({
                            title: 'Error',
                            text: 'Error al verificar la institución cliente',
                            icon: 'error',
                            confirmButtonText: 'Aceptar'
                        });
                    }
                });
            }
        }
    }

    actualizarPersona(persona: any) {
        console.log("Actualizar persona", persona);
        const personaData = this.prepararDatosPersona(persona);

        this.personasService.actualizar(personaData).subscribe({
            next: (response: any) => {
                console.log("Persona actualizada", response);
                if (response.error) {
                    Swal.fire({
                        title: 'Error',
                        text: 'Error al actualizar los datos de la institución',
                        icon: 'error',
                        confirmButtonText: 'Aceptar'
                    });
                    return;
                }
                this.crearActualizarInstitucion(persona);
            },
            error: (error: any) => {
                console.error("Error al actualizar persona", error);
                Swal.fire({
                    title: 'Error',
                    text: 'Error al actualizar los datos de la institución',
                    icon: 'error',
                    confirmButtonText: 'Aceptar'
                });
            }
        });
    }

    prepararDatosPersona(persona: any) {
        if (!persona.nacionalidad) {
            persona.nacionalidad = 'Colombiana';
        }
        persona.ocupacion = "Institución cliente";

        return {
            id: persona.idPersona || 0,
            razon_social: persona.razonSocial || null,
            primer_nombre: persona.primerNombre || null,
            segundo_nombre: persona.segundoNombre || null,
            primer_apellido: persona.primerApellido || null,
            segundo_apellido: persona.segundoApellido || null,
            id_tipo_identificacion: persona.tipoIdentificacion,
            numero_identificacion: persona.numeroIdentificacion,
            fecha_nacimiento: persona.fechaNacimiento || null,
            id_genero: persona.genero || null,
            direccion: persona.direccion || null,
            correo_electronico: persona.correoElectronico || null,
            nacionalidad: persona.nacionalidad,
            telefono: persona.telefono || null,
            id_ciudad: persona.ciudad || null,
            rh: persona.rh || null,
            ocupacion: persona.ocupacion
        };
    }

    crearActualizarInstitucion(institucion: any) {
        console.log("Enviar institución cliente", institucion);

        const institucionData = {
            id: institucion.idInstitucionCliente || 0,
            id_persona: institucion.idPersona,
            id_tipo_institucion: institucion.tipoInstitucion,
            activo: institucion.activo
        };

        console.log("Datos de institución cliente a enviar:", institucionData, this.accion);

        if (this.accion === 'crear') {
            this.institucionesClienteService.crear(institucionData).subscribe({
                next: (response: any) => {
                    console.log("Institución cliente creada", response);
                    Swal.fire({
                        title: 'Éxito',
                        text: 'Institución cliente creada correctamente',
                        icon: 'success',
                        confirmButtonText: 'Aceptar'
                    }).then(() => {
                        this.volver();
                    });
                },
                error: (error: any) => this.manejarError(error, 'crear')
            });
        } else if (this.accion === 'editar') {
            this.institucionesClienteService.actualizar(institucionData).subscribe({
                next: (response: any) => {
                    console.log("Institución cliente actualizada", response);
                    Swal.fire({
                        title: 'Éxito',
                        text: 'Institución cliente actualizada correctamente',
                        icon: 'success',
                        confirmButtonText: 'Aceptar'
                    }).then(() => {
                        this.volver();
                    });
                },
                error: (error: any) => this.manejarError(error, 'actualizar')
            });
        }
    }

    formularioValido(): boolean {
        // Validación base
        const baseValida = Boolean(
            this.model.tipoIdentificacion &&
            this.model.numeroIdentificacion &&
            this.model.tipoInstitucion
        );

        // Si es persona jurídica, también requerir razón social
        if (this.esPersonaJuridica) {
            return baseValida && Boolean(this.model.razonSocial);
        }

        return baseValida;
    }

    manejarError(error: any, accion: string): void {
        console.error(`Error al ${accion} institución cliente`, error);
        const mensaje = error?.error?.error || `Error al ${accion} la institución cliente`;
        Swal.fire({
            title: 'Error',
            text: mensaje,
            icon: 'error',
            confirmButtonText: 'Aceptar'
        });
    }

    limpiarFormulario(): void {
        this.model = {
            idPersona: '',
            tipoIdentificacion: "",
            numeroIdentificacion: "",
            razonSocial: "",
            primerNombre: "",
            segundoNombre: "",
            primerApellido: "",
            segundoApellido: "",
            fechaNacimiento: "",
            genero: "",
            direccion: "",
            correoElectronico: "",
            telefono: "",
            nacionalidad: "Colombiana",
            ciudad: "",
            rh: "",
            ocupacion: "Institución cliente",
            tipoInstitucion: "",
            idInstitucionCliente: '',
            activo: 1
        };
        this.submitted = false;
        this.documentoEncontrado = false;
        this.camposHabilitados = false;
        this.institucionActivaSwitch = true;
        this.esPersonaJuridica = false;
    }

    // ==================== SOLICITUDES DEL PORTAL ====================

    cargarSolicitudes(id: any) {
        this.solicitudesInscripcionService.obtenerPorInstitucion(id).subscribe({
            next: (response: any) => {
                const body = (response.body || []) as any[];
                this.solicitudes = body.map((s: any) => ({
                    ...s,
                    nombre_estudiante: (s.nombre_estudiante || '').replace(/\s+/g, ' ').trim(),
                    nombre_acudiente: (s.nombre_acudiente || '').replace(/\s+/g, ' ').trim(),
                    // El cupo cuenta inscritos mas solicitudes pendientes, igual
                    // que en el portal, para que no se aprueben de mas.
                    cupos_disponibles: s.cupo_maximo === null || s.cupo_maximo === undefined
                        ? null
                        : Math.max(0, Number(s.cupo_maximo) - Number(s.inscritos) - Number(s.pendientes))
                }));
            },
            error: (error: any) => {
                console.error('Error al cargar las solicitudes de la institución', error);
            }
        });
    }

    contarPendientes(): number {
        return this.solicitudes.filter((s: any) => s.estado === 'pendiente').length;
    }

    etiquetaEstadoSolicitud(estado: string): string {
        if (estado === 'aprobada') return 'Aprobada';
        if (estado === 'rechazada') return 'Rechazada';
        return 'Pendiente';
    }

    async aprobarSolicitud(solicitud: any) {
        const result = await Swal.fire({
            title: '¿Aprobar la inscripción?',
            html: `Se va a crear el estudiante <b>${solicitud.nombre_estudiante}</b> y se inscribirá a ` +
                  `<b>${solicitud.nombre_curso}</b>.<br><br>` +
                  `Las cuentas por cobrar no se generan aquí: quedan para la pantalla del estudiante.`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Sí, aprobar',
            cancelButtonText: 'Cancelar'
        });

        if (!result.isConfirmed) {
            return;
        }

        this.aprobandoId = solicitud.id;

        this.solicitudesInscripcionService.aprobar(solicitud.id).subscribe({
            next: (response: any) => {
                this.aprobandoId = null;
                Swal.fire('Aprobada', response.mensaje || 'El estudiante quedó inscrito.', 'success');
                this.cargarSolicitudes(this.id);
                this.cargarEstudiantes(this.id);
                if (this.editable) {
                    this.cargarEstudiantesDisponibles(this.id);
                }
            },
            error: (error: any) => {
                this.aprobandoId = null;
                console.error('Error al aprobar la solicitud', error);
                // El back responde 400 con el motivo: cupo lleno, ya resuelta, etc.
                const mensaje = error?.error?.error || 'No se pudo aprobar la solicitud.';
                Swal.fire('No se pudo aprobar', mensaje, 'error');
            }
        });
    }

    async rechazarSolicitud(solicitud: any) {
        const result = await Swal.fire({
            title: 'Rechazar la solicitud',
            input: 'textarea',
            inputLabel: 'Motivo (opcional)',
            inputPlaceholder: 'Por qué se rechaza...',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: 'Rechazar',
            cancelButtonText: 'Cancelar'
        });

        if (!result.isConfirmed) {
            return;
        }

        this.solicitudesInscripcionService.rechazar(solicitud.id, result.value || null).subscribe({
            next: () => {
                Swal.fire('Rechazada', 'La solicitud quedó rechazada.', 'success');
                this.cargarSolicitudes(this.id);
            },
            error: (error: any) => {
                console.error('Error al rechazar la solicitud', error);
                const mensaje = error?.error?.error || 'No se pudo rechazar la solicitud.';
                Swal.fire('Error', mensaje, 'error');
            }
        });
    }

    // El componente comun de foto lo usa para las iniciales cuando todavia
    // no hay logo cargado.
    obtenerNombreInstitucion(): string {
        if (this.model.razonSocial) {
            return this.model.razonSocial;
        }
        return [this.model.primerNombre, this.model.primerApellido].filter(Boolean).join(' ');
    }

    // ==================== PESTANAS ====================

    cambiarPestana(pestana: string) {
        this.pestanaActiva = pestana;
        this.menuMovilAbierto = false;
    }

    toggleMenuMovil() {
        this.menuMovilAbierto = !this.menuMovilAbierto;
    }

    getNombrePestana(): string {
        const nombres: any = {
            'datos': 'Datos de la institución',
            'estudiantes': 'Estudiantes',
            'cursos': 'Cursos',
            'solicitudes': 'Solicitudes'
        };
        return nombres[this.pestanaActiva] || '';
    }

    getIconoPestana(): string {
        const iconos: any = {
            'datos': 'fas fa-building',
            'estudiantes': 'fas fa-child',
            'cursos': 'fas fa-book',
            'solicitudes': 'fas fa-inbox'
        };
        return iconos[this.pestanaActiva] || '';
    }

    // ==================== ESTUDIANTES ====================

    cargarEstudiantes(id: any) {
        this.estudiantesXInstitucionesClienteService.obtenerPorInstitucion(id).subscribe({
            next: (response: any) => {
                this.estudiantesInstitucion = response.body || [];
            },
            error: (error: any) => {
                console.error("Error al cargar los estudiantes de la institución", error);
            }
        });
    }

    cargarEstudiantesDisponibles(id: any) {
        this.estudiantesXInstitucionesClienteService.obtenerDisponibles(id, this.anioEstudiantes).subscribe({
            next: (response: any) => {
                this.estudiantesDisponibles = response.body || [];
            },
            error: (error: any) => {
                console.error("Error al cargar los estudiantes disponibles", error);
            }
        });
    }

    // Al cambiar el anio cambia la lista de disponibles, porque la relacion
    // es por anio y un nino puede estar en la institucion un anio y en otra
    // el siguiente.
    onAnioEstudiantesChange() {
        this.idEstudianteSeleccionado = null;
        this.cargarEstudiantesDisponibles(this.id);
    }

    agregarEstudiante() {
        if (!this.idEstudianteSeleccionado) {
            Swal.fire('Advertencia', 'Debe seleccionar un estudiante', 'warning');
            return;
        }

        const data = {
            id_estudiante: this.idEstudianteSeleccionado,
            id_institucion_cliente: this.id,
            anio: this.anioEstudiantes
        };

        this.estudiantesXInstitucionesClienteService.crear(data).subscribe({
            next: () => {
                Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Estudiante agregado', showConfirmButton: false, timer: 2000 });
                this.cargarEstudiantes(this.id);
                this.cargarEstudiantesDisponibles(this.id);
                this.idEstudianteSeleccionado = null;
            },
            error: (error: any) => {
                console.error("Error al agregar el estudiante", error);
                const mensaje = error?.error?.error || 'No se pudo agregar el estudiante';
                Swal.fire('Error', mensaje, 'error');
            }
        });
    }

    // Cierra la vigencia sin borrar el registro, para no perder el historico.
    actualizarEstudiante(registro: any) {
        const data = {
            id: registro.id,
            activo: registro.activo ? 1 : 0,
            fecha_fin: registro.fecha_fin || null
        };

        this.estudiantesXInstitucionesClienteService.actualizar(data).subscribe({
            next: () => {
                Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Registro actualizado', showConfirmButton: false, timer: 2000 });
                this.cargarEstudiantes(this.id);
            },
            error: (error: any) => {
                console.error("Error al actualizar el registro", error);
                Swal.fire('Error', 'No se pudo actualizar el registro', 'error');
                this.cargarEstudiantes(this.id);
            }
        });
    }

    async eliminarEstudiante(registro: any) {
        const result = await Swal.fire({
            title: '¿Está seguro?',
            text: `Se va a quitar a ${registro.nombre_completo} del listado ${registro.anio}. Si solo dejó de pertenecer, es mejor desactivarlo para conservar el histórico.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Sí, quitar',
            cancelButtonText: 'Cancelar'
        });

        if (!result.isConfirmed) {
            return;
        }

        this.estudiantesXInstitucionesClienteService.eliminar(registro.id).subscribe({
            next: () => {
                Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Estudiante quitado', showConfirmButton: false, timer: 2000 });
                this.cargarEstudiantes(this.id);
                this.cargarEstudiantesDisponibles(this.id);
            },
            error: (error: any) => {
                console.error("Error al quitar el estudiante", error);
                const mensaje = error?.error?.error || 'No se pudo quitar el estudiante';
                Swal.fire('Error', mensaje, 'error');
            }
        });
    }

    // ==================== CURSOS ====================

    cargarCursos(id: any) {
        this.cursosExtraXInstitucionesClienteService.obtenerPorInstitucion(id).subscribe({
            next: (response: any) => {
                this.cursosInstitucion = response.body || [];
            },
            error: (error: any) => {
                console.error("Error al cargar los cursos de la institución", error);
            }
        });
    }

    volver(): void {
        this.router.navigate(['/administracion/datos-maestros/instituciones-cliente']);
    }

    establecerValoresPorDefecto(): void {
        this.model.nacionalidad = 'Colombiana';
        this.model.ocupacion = "Institución cliente";
        this.model.activo = 1;
        this.institucionActivaSwitch = true;
    }
}
