// ========== crear-institucion-cliente.component.ts ==========
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import Swal from 'sweetalert2';
import { HeaderComponent } from '../../../../common/header/header.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InstitucionesClienteService } from '../../../../services/instituciones-cliente.service';
import { TiposInstitucionService } from '../../../../services/tipos-institucion.service';
import { PersonasService } from '../../../../services/personas.service';
import { TiposIdentificacionService } from '../../../../services/tipos-identificacion.service';
import { GenerosService } from '../../../../services/generos.service';
import { CiudadesService } from '../../../../services/ciudades.service';

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
    imports: [HeaderComponent, CommonModule, FormsModule],
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
        private ciudadesService: CiudadesService
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
                    break;
                case 'consultar':
                    this.editable = false;
                    this.camposHabilitados = false;
                    this.documentoEncontrado = true;
                    this.titulo = "Consultar institución cliente";
                    this.obtenerInstitucion(this.id);
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
