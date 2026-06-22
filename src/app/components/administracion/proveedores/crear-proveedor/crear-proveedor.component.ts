// ========== crear-proveedor.component.ts ==========
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import Swal from 'sweetalert2';
import { HeaderComponent } from '../../../../common/header/header.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProveedoresService } from '../../../../services/proveedores.service';
import { TiposProveedorService } from '../../../../services/tipos-proveedor.service';
import { PersonasService } from '../../../../services/personas.service';
import { TiposIdentificacionService } from '../../../../services/tipos-identificacion.service';
import { GenerosService } from '../../../../services/generos.service';
import { CiudadesService } from '../../../../services/ciudades.service';

interface ProveedorModel {
    idPersona: number;
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
    // Campos específicos de proveedores
    tipoProveedor: number | string;
    idProveedor: number;
    activo: number;
}

@Component({
    selector: 'app-crear-proveedor',
    standalone: true,
    imports: [HeaderComponent, CommonModule, FormsModule],
    templateUrl: './crear-proveedor.component.html',
    styleUrl: './crear-proveedor.component.scss'
})
export class CrearProveedorComponent implements OnInit {

    public id = "0";
    public accion = "";
    public editable = true;
    public submitted = false;
    public titulo = "Registro de proveedor";
    public regresar = '/administracion/proveedores';
    public documentoEncontrado = false;
    public camposHabilitados = false;
    public esPersonaJuridica = false; // Para manejar si es empresa o persona natural

    public listas = {
        tiposIdentificacion: [] as any[],
        generos: [] as any[],
        tiposProveedor: [] as any[],
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

    public model: ProveedorModel = {
        idPersona: 0,
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
        ocupacion: "Proveedor",
        tipoProveedor: "",
        idProveedor: 0,
        activo: 1
    };

    public proveedorActivoSwitch = true;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private tiposIdentificacionService: TiposIdentificacionService,
        private generosService: GenerosService,
        private tiposProveedorService: TiposProveedorService,
        private personasService: PersonasService,
        private proveedoresService: ProveedoresService,
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
                    this.titulo = "Crear proveedor";
                    this.establecerValoresPorDefecto();
                    break;
                case 'editar':
                    this.editable = true;
                    this.camposHabilitados = true;
                    this.documentoEncontrado = true;
                    this.titulo = "Editar proveedor";
                    this.obtenerProveedor(this.id);
                    break;
                case 'consultar':
                    this.editable = false;
                    this.camposHabilitados = false;
                    this.documentoEncontrado = true;
                    this.titulo = "Consultar proveedor";
                    this.obtenerProveedor(this.id);
                    break;
                default:
                    this.editable = true;
                    this.camposHabilitados = false;
                    this.titulo = "Crear proveedor";
                    this.establecerValoresPorDefecto();
                    break;
            }
        });

        this.consultarTiposIdentificacion();
        this.consultarGeneros();
        this.consultarTiposProveedor();
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

    consultarTiposProveedor() {
        this.tiposProveedorService.obtenerTodos().subscribe((response: any) => {
            console.log("tiposProveedorService", response.body);
            this.listas.tiposProveedor = response.body;
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

                    // Verificar si la persona ya está asignada como proveedor
                    this.proveedoresService.verificarDuplicados(persona.id).subscribe({
                        next: (respuesta: any) => {
                            if (respuesta.existe) {
                                Swal.fire({
                                    title: 'Proveedor existente',
                                    text: 'Esta persona ya está registrada como proveedor en el sistema',
                                    icon: 'warning',
                                    confirmButtonText: 'Aceptar'
                                });
                                return;
                            } else {
                                this.llenarFormularioPersona(persona);
                                this.documentoEncontrado = true;
                                this.camposHabilitados = true;
                                Swal.fire({
                                    title: 'Persona encontrada',
                                    text: 'Se encontró una persona con esta identificación',
                                    icon: 'success',
                                    confirmButtonText: 'Aceptar'
                                });
                            }
                        },
                        error: (error: any) => {
                            console.error("Error al verificar proveedor", error);
                            Swal.fire({
                                title: 'Error',
                                text: 'Error al verificar si la persona ya está registrada como proveedor',
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
                        title: 'Persona no encontrada',
                        text: 'No se encontró ninguna persona con esta identificación. Ahora puede ingresar los datos.',
                        icon: 'info',
                        confirmButtonText: 'Aceptar'
                    });
                }
            },
            error: (error: any) => {
                console.error("Error al consultar persona", error);
                Swal.fire({
                    title: 'Error',
                    text: 'Error al consultar la persona',
                    icon: 'error',
                    confirmButtonText: 'Aceptar'
                });
            }
        });
    }

    llenarFormularioPersona(persona: any) {
        this.model.idPersona = +persona.id;
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
        this.model.ocupacion = "Proveedor";

        // Verificar si es persona jurídica
        this.onTipoIdentificacionChange();
    }

    obtenerProveedor(id: any) {
        if (id && id !== "0") {
            this.proveedoresService.obtenerById(id).subscribe({
                next: (response: any) => {
                    const proveedor = response.body[0];
                    console.log("Proveedor recibido:", proveedor); // Para debug

                    if (proveedor) {
                        // Usar DIRECTAMENTE los datos del proveedor, NO hacer otra llamada
                        this.model.idPersona = proveedor.id_persona;
                        this.model.tipoIdentificacion = proveedor.id_tipo_identificacion;
                        this.model.numeroIdentificacion = proveedor.numero_identificacion;
                        this.model.razonSocial = proveedor.razon_social || "";
                        this.model.primerNombre = proveedor.primer_nombre || "";
                        this.model.segundoNombre = proveedor.segundo_nombre || "";
                        this.model.primerApellido = proveedor.primer_apellido || "";
                        this.model.segundoApellido = proveedor.segundo_apellido || "";
                        this.model.fechaNacimiento = proveedor.fecha_nacimiento || "";
                        this.model.genero = proveedor.id_genero || "";
                        this.model.direccion = proveedor.direccion || "";
                        this.model.correoElectronico = proveedor.correo_electronico || "";
                        this.model.nacionalidad = proveedor.nacionalidad || 'Colombiana';
                        this.model.telefono = proveedor.telefono || "";
                        this.model.ciudad = proveedor.id_ciudad || "";
                        this.model.rh = proveedor.rh || "";
                        this.model.ocupacion = proveedor.ocupacion || "Proveedor";

                        // Datos específicos del proveedor
                        this.model.idProveedor = proveedor.id;
                        this.model.tipoProveedor = proveedor.id_tipo_proveedor;
                        this.model.activo = proveedor.activo;
                        this.proveedorActivoSwitch = (proveedor.activo == 1 || proveedor.activo === "1");

                        console.log("Model después de asignar:", this.model); // Para debug

                        // Verificar si es persona jurídica
                        this.onTipoIdentificacionChange();

                        const nombreCompleto = this.model.razonSocial || `${proveedor.primer_nombre || ''} ${proveedor.primer_apellido || ''}`.trim();
                        if (this.accion === 'editar') {
                            this.titulo = `Editar proveedor: ${nombreCompleto}`;
                        } else if (this.accion === 'consultar') {
                            this.titulo = `Consultar proveedor: ${nombreCompleto}`;
                        }
                    }
                },
                error: (error: any) => {
                    console.error("Error al obtener proveedor", error);
                    Swal.fire('Error', 'Error al cargar los datos del proveedor', 'error');
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

    cambiarEstadoProveedor(): void {
        this.model.activo = this.proveedorActivoSwitch ? 1 : 0;
        const estado = this.proveedorActivoSwitch ? 'activo' : 'inactivo';
        console.log(`Estado del proveedor cambiado a: ${estado}`);
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
            if (!persona.idPersona || !persona.idPersona) {
                const personaData = this.prepararDatosPersona(persona);

                this.personasService.crear(personaData).subscribe({
                    next: (response: any) => {
                        console.log("persona creada", response);
                        if (+!response.id) {
                            Swal.fire({
                                title: 'Error',
                                text: 'Error al crear persona',
                                icon: 'error',
                                confirmButtonText: 'Aceptar'
                            });
                            return;
                        }
                        persona.idPersona = response.id;
                        this.crearActualizarProveedor(persona);
                    },
                    error: (error: any) => {
                        console.error("Error al crear persona", error);
                        Swal.fire({
                            title: 'Error',
                            text: 'Error al crear la persona',
                            icon: 'error',
                            confirmButtonText: 'Aceptar'
                        });
                    }
                });
            } else {
                this.proveedoresService.verificarDuplicados(persona.idPersona).subscribe({
                    next: (respuesta: any) => {
                        if (respuesta.existe && this.accion === 'crear') {
                            Swal.fire({
                                title: 'Proveedor existente',
                                text: 'Esta persona ya está registrada como proveedor',
                                icon: 'warning',
                                confirmButtonText: 'Aceptar'
                            });
                            return;
                        } else {
                            this.crearActualizarProveedor(persona);
                        }
                    },
                    error: (error: any) => {
                        console.error("Error al verificar proveedor", error);
                        Swal.fire({
                            title: 'Error',
                            text: 'Error al verificar el proveedor',
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
                        text: 'Error al actualizar la persona',
                        icon: 'error',
                        confirmButtonText: 'Aceptar'
                    });
                    return;
                }
                this.crearActualizarProveedor(persona);
            },
            error: (error: any) => {
                console.error("Error al actualizar persona", error);
                Swal.fire({
                    title: 'Error',
                    text: 'Error al actualizar la persona',
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
        persona.ocupacion = "Proveedor";

        return {
            id: persona.idPersona || 0,
            razon_social: persona.razonSocial || null,  // ESTE CAMPO FALTABA
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

    crearActualizarProveedor(proveedor: any) {
        console.log("Enviar proveedor", proveedor);

        const proveedorData = {
            id: proveedor.idProveedor || 0,
            id_persona: proveedor.idPersona,
            id_tipo_proveedor: proveedor.tipoProveedor,
            activo: proveedor.activo
        };

        console.log("Datos de proveedor a enviar:", proveedorData, this.accion);

        if (this.accion === 'crear') {
            this.proveedoresService.crear(proveedorData).subscribe({
                next: (response: any) => {
                    console.log("Proveedor creado", response);
                    Swal.fire({
                        title: 'Éxito',
                        text: 'Proveedor creado correctamente',
                        icon: 'success',
                        confirmButtonText: 'Aceptar'
                    }).then(() => {
                        this.volver();
                    });
                },
                error: (error: any) => this.manejarError(error, 'crear')
            });
        } else if (this.accion === 'editar') {
            this.proveedoresService.actualizar(proveedorData).subscribe({
                next: (response: any) => {
                    console.log("Proveedor actualizado", response);
                    Swal.fire({
                        title: 'Éxito',
                        text: 'Proveedor actualizado correctamente',
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
            this.model.tipoProveedor
        );

        // Si es persona jurídica, también requerir razón social
        if (this.esPersonaJuridica) {
            return baseValida && Boolean(this.model.razonSocial);
        }

        return baseValida;
    }

    manejarError(error: any, accion: string): void {
        console.error(`Error al ${accion} proveedor`, error);
        Swal.fire({
            title: 'Error',
            text: `Error al ${accion} el proveedor`,
            icon: 'error',
            confirmButtonText: 'Aceptar'
        });
    }

    limpiarFormulario(): void {
        this.model = {
            idPersona: 0,
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
            ocupacion: "Proveedor",
            tipoProveedor: "",
            idProveedor: 0,
            activo: 1
        };
        this.submitted = false;
        this.documentoEncontrado = false;
        this.camposHabilitados = false;
        this.proveedorActivoSwitch = true;
        this.esPersonaJuridica = false;
    }

    volver(): void {
        this.router.navigate(['/administracion/proveedores']);
    }

    establecerValoresPorDefecto(): void {
        this.model.nacionalidad = 'Colombiana';
        this.model.ocupacion = "Proveedor";
        this.model.activo = 1;
        this.proveedorActivoSwitch = true;
    }
}