import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import Swal from 'sweetalert2';
import { HeaderComponent } from '../../../../common/header/header.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AcudientesService } from '../../../../services/acudientes.service';
import { EstudiantesService } from '../../../../services/estudiantes.service';
import { GenerosService } from '../../../../services/generos.service';
import { PersonasService } from '../../../../services/personas.service';
import { TiposAcudienteService } from '../../../../services/tipos-acudiente.service';
import { TiposIdentificacionService } from '../../../../services/tipos-identificacion.service';
import { CiudadesService } from '../../../../services/ciudades.service';
import { UtilService } from '../../../../common/constantes/util.service';
import { UsuariosService } from '../../../../services/usuarios.service';
import { DocumentosPersonaComponent } from '../../../../common/documentos-persona/documentos-persona.component';
import { FotoPersonaComponent } from '../../../../common/foto-persona/foto-persona.component';

interface AcudienteModel {
  idPersona: number;
  tipoIdentificacion: number | string;
  numeroIdentificacion: number | string;
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
  ocupacion: string;
  rh: string;
  tipoAcudiente: number | string;
  responsablePago: boolean;
  autorizadoRecoger: boolean;
  autorizadoSistema: boolean;
  activo: boolean;
  idAcudiente: number;
}

@Component({
  selector: 'app-crear-acudiente',
  standalone: true,
  imports: [HeaderComponent, CommonModule, FormsModule, DocumentosPersonaComponent, FotoPersonaComponent],
  templateUrl: './crear-acudiente.component.html',
  styleUrl: './crear-acudiente.component.scss'
})
export class CrearAcudienteComponent implements OnInit {

  public id = "0";
  public idEstudiante = "0";
  public accion = "";
  public editable = true;
  public nuevo = false;
  public submitted = false;
  public estudiante: any;
  public nombre_estudiante = "";
  public titulo = "Registro de acudiente";
  public regresar = '/estudiantes-acudientes/';
  public documentoEncontrado = false;
  public camposHabilitados = false;
  public seccionActiva: 'datos-personales' | 'datos-acudiente' | 'documentos' | 'usuario' = 'datos-personales';

  public listas = {
    tiposIdentificacion: [] as any[],
    generos: [] as any[],
    tiposAcudiente: [] as any[],
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
  public mostrarClaveUsuario = false;
  public errorClaveUsuario = '';
  public usuarioExistente: any = null;

  public modelUsuario: any = {
    id: 0,
    id_persona: 0,
    usuario: '',
    correo_electronico: '',
    clave: '',
    activo: 1,
    acceso_institucional: 0,
    acceso_portal_padres: 1,
  };

  public cambiarClaveModel: any = {
    id: 0,
    claveNueva: '',
  };

  public submittedUsuario = false;
  public intentoCambiarClave = false;
  public mostrarClaveNueva = false;

  public model: AcudienteModel = {
    idPersona: 0,
    tipoIdentificacion: "",
    numeroIdentificacion: "",
    primerNombre: "",
    segundoNombre: "",
    primerApellido: "",
    segundoApellido: "",
    fechaNacimiento: "",
    genero: "",
    direccion: "",
    correoElectronico: "",
    telefono: "",
    nacionalidad: "",
    ciudad: "",
    ocupacion: "",
    rh: "",
    tipoAcudiente: "",
    responsablePago: false,
    autorizadoRecoger: false,
    autorizadoSistema: false,
    activo: true,
    idAcudiente: 0
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private tiposIdentificacionService: TiposIdentificacionService,
    private generosService: GenerosService,
    private tiposAcudienteService: TiposAcudienteService,
    private personasService: PersonasService,
    private estudiantesService: EstudiantesService,
    private acudientesService: AcudientesService,
    private ciudadesService: CiudadesService,
    private usuariosService: UsuariosService
  ) { }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.accion = params['accion'];
      this.id = params['id'];
      this.idEstudiante = params['idEstudiante'];
      this.regresar = this.regresar + this.idEstudiante;
      this.obtenerEstudiante(this.idEstudiante);

      switch (this.accion) {
        case 'crear':
          this.editable = true;
          this.nuevo = true;
          this.camposHabilitados = false;
          this.titulo = "Crear acudiente";
          this.establecerValoresPorDefecto();
          break;
        case 'editar':
          this.editable = true;
          this.nuevo = false;
          this.camposHabilitados = true;
          this.documentoEncontrado = true;
          this.titulo = "Editar acudiente";
          this.obtenerAcudiente(this.id);
          break;
        case 'consultar':
          this.editable = false;
          this.nuevo = false;
          this.camposHabilitados = false;
          this.documentoEncontrado = true;
          this.titulo = "Consultar acudiente";
          this.obtenerAcudiente(this.id);
          break;
        default:
          this.editable = true;
          this.nuevo = true;
          this.camposHabilitados = false;
          this.titulo = "Crear acudiente";
          this.establecerValoresPorDefecto();
          break;
      }
    });

    this.consultarTiposIdentificacion();
    this.consultarGeneros();
    this.consultarTiposAcudiente();
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

  consultarTiposAcudiente() {
    this.tiposAcudienteService.obtenerTodos().subscribe((response: any) => {
      console.log("tiposAcudienteService", response.body);
      this.listas.tiposAcudiente = response.body;
    });
  }

  consultarCiudades() {
    this.ciudadesService.obtenerTodos().subscribe((response: any) => {
      console.log("ciudadesService", response.body);
      this.listas.ciudades = response.body;
    });
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
          this.llenarFormularioPersona(response.body[0]);
          this.documentoEncontrado = true;
          this.camposHabilitados = true;
          Swal.fire({
            title: 'Persona encontrada',
            text: 'Se encontró una persona con esta identificación',
            icon: 'success',
            confirmButtonText: 'Aceptar'
          });
        } else {
          this.documentoEncontrado = true;
          this.camposHabilitados = true;
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
    this.model.ocupacion = persona.ocupacion;
    this.model.rh = persona.rh;
    console.log("llenar formulario", this.model);
  }

  obtenerAcudiente(id: any) {
    if (id && id !== "0") {
      this.acudientesService.obtenerById(id).subscribe({
        next: (response: any) => {
          const acudiente = response.body[0];
          if (acudiente) {
            this.personasService.obtenerById(acudiente.id_persona).subscribe({
              next: (personaResponse: any) => {
                const persona = personaResponse.body[0];
                if (persona) {
                  this.model.idPersona = persona.id;
                  this.model.tipoIdentificacion = persona.id_tipo_identificacion;
                  this.model.numeroIdentificacion = persona.numero_identificacion;
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
                  this.model.ocupacion = persona.ocupacion;
                  this.model.rh = persona.rh;
                }

                this.model.idAcudiente = acudiente.id;
                this.model.tipoAcudiente = acudiente.id_tipo_acudiente;
                this.model.responsablePago = acudiente.es_responsable_pago === 1;
                this.model.autorizadoRecoger = acudiente.autorizado_recoger === 1;
                this.model.autorizadoSistema = acudiente.autorizado_sistema === 1;
                this.model.activo = acudiente.activo === 1;
                this.cargarUsuario();
              },
              error: (error: any) => {
                console.error("Error al obtener persona", error);
                Swal.fire('Error', 'Error al cargar los datos de la persona', 'error');
              }
            });

          }
        },
        error: (error: any) => {
          console.error("Error al obtener acudiente", error);
          Swal.fire('Error', 'Error al cargar los datos del acudiente', 'error');
        }
      });
    }
  }

  crearPersona(persona: any) {
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
      if (!persona.idPersona || persona.idPersona == 0) {
        const personaData = this.prepararDatosPersona(persona);

        this.personasService.crear(personaData).subscribe({
          next: (response: any) => {
            console.log("persona creada", response);
            if (+response.id == 0) {
              Swal.fire({
                title: 'Error',
                text: 'Error al crear persona',
                icon: 'error',
                confirmButtonText: 'Aceptar'
              });
              return;
            }
            persona.idPersona = response.id;
            this.model.idPersona = response.id;

            this.nuevo = false;
            this.accion = 'crear';
            this.seccionActiva = 'datos-acudiente';

            Swal.fire({
              title: 'Persona registrada',
              text: 'Ahora complete la información del acudiente',
              icon: 'success',
              confirmButtonText: 'Continuar'
            });
          },
          error: (error: any) => {
            console.error("Error al crear persona", error);
            Swal.fire({
              title: 'Error',
              text: this.extraerMensajeError(error, 'Error al crear la persona'),
              icon: 'error',
              confirmButtonText: 'Aceptar'
            });
          }
        });
      } else {
        this.nuevo = false;
        this.seccionActiva = 'datos-acudiente';

        Swal.fire({
          title: 'Persona encontrada',
          text: 'Ahora complete la información del acudiente',
          icon: 'info',
          confirmButtonText: 'Continuar'
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

        this.crearActualizarAcudiente(persona);
      },
      error: (error: any) => {
        console.error("Error al actualizar persona", error);
        Swal.fire({
          title: 'Error',
          text: this.extraerMensajeError(error, 'Error al actualizar la persona'),
          icon: 'error',
          confirmButtonText: 'Aceptar'
        });
      }
    });
  }

  prepararDatosPersona(persona?: any) {
    const data = persona || this.model;
    
    if (!data.nacionalidad) {
      data.nacionalidad = 'Colombiana';
    }

    return {
      id: data.idPersona || 0,
      primer_nombre: data.primerNombre,
      segundo_nombre: data.segundoNombre || null,
      primer_apellido: data.primerApellido,
      segundo_apellido: data.segundoApellido || null,
      id_tipo_identificacion: data.tipoIdentificacion,
      numero_identificacion: data.numeroIdentificacion,
      fecha_nacimiento: data.fechaNacimiento || null,
      id_genero: data.genero === '' ? null : data.genero,
      direccion: data.direccion || null,
      correo_electronico: data.correoElectronico || null,
      nacionalidad: data.nacionalidad,
      telefono: data.telefono || null,
      id_ciudad: data.ciudad === '' ? null : data.ciudad,
      ocupacion: data.ocupacion || null,
      rh: data.rh || null
    };
  }

  crearActualizarAcudiente(acudiente: any) {
    console.log("Enviar acudiente", acudiente);

    const acudienteData = {
      id: acudiente.idAcudiente || 0,
      id_estudiante: this.idEstudiante,
      id_persona: acudiente.idPersona,
      id_tipo_acudiente: acudiente.tipoAcudiente,
      es_responsable_pago: acudiente.responsablePago ? 1 : 0,
      autorizado_recoger: acudiente.autorizadoRecoger ? 1 : 0,
      autorizado_sistema: acudiente.autorizadoSistema ? 1 : 0,
      activo: acudiente.activo ? 1 : 0
    };

    console.log("Datos de acudiente a enviar:", acudienteData);

    if (this.accion === 'crear') {
      this.acudientesService.verificarDuplicados({
        id_estudiante: acudienteData.id_estudiante,
        id_persona: acudienteData.id_persona,
        id_tipo_acudiente: acudienteData.id_tipo_acudiente
      }).subscribe({
        next: (respuestaDuplicado: any) => {
          if (respuestaDuplicado.existe) {
            Swal.fire({
              title: 'Duplicado',
              text: 'Ya existe un acudiente con esta combinación de estudiante, persona y tipo de acudiente.',
              icon: 'warning',
              confirmButtonText: 'Aceptar'
            });
            return;
          }

          this.acudientesService.crear(acudienteData).subscribe({
            next: (response: any) => {
              console.log("Acudiente creado", response);

              if (response.error) {
                Swal.fire({
                  title: 'Error',
                  text: response.error,
                  icon: 'error',
                  confirmButtonText: 'Aceptar'
                });
                return;
              }

              this.model.idAcudiente = response.id;
              acudiente.idAcudiente = response.id;
              
              this.accion = 'editar';
              this.id = response.id;

              Swal.fire({
                title: 'Éxito',
                text: 'Acudiente creado correctamente. Puede continuar editando o crear usuario.',
                icon: 'success',
                confirmButtonText: 'Aceptar'
              });
            },
            error: (error: any) => {
              console.error("Error al crear acudiente", error);
              Swal.fire({
                title: 'Error',
                text: this.extraerMensajeError(error, 'Error al crear el acudiente'),
                icon: 'error',
                confirmButtonText: 'Aceptar'
              });
            }
          });
        },
        error: (error: any) => {
          console.error("Error al verificar duplicados", error);
          Swal.fire({
            title: 'Error',
            text: 'Error al verificar si el acudiente ya existe',
            icon: 'error',
            confirmButtonText: 'Aceptar'
          });
        }
      });

    } else if (this.accion === 'editar') {
      this.acudientesService.actualizar(acudienteData).subscribe({
        next: (response: any) => {
          console.log("Acudiente actualizado", response);

          if (response.error) {
            Swal.fire({
              title: 'Error',
              text: response.error,
              icon: 'error',
              confirmButtonText: 'Aceptar'
            });
            return;
          }

          Swal.fire({
            title: 'Éxito',
            text: 'Acudiente actualizado correctamente',
            icon: 'success',
            confirmButtonText: 'Aceptar'
          }).then(() => {
            this.volver();
          });
        },
        error: (error: any) => {
          console.error("Error al actualizar acudiente", error);
          Swal.fire({
            title: 'Error',
            text: this.extraerMensajeError(error, 'Error al actualizar el acudiente'),
            icon: 'error',
            confirmButtonText: 'Aceptar'
          });
        }
      });
    }
  }

  extraerMensajeError(error: any, mensajeDefault: string): string {
    if (error.error?.error) {
      return error.error.error;
    } else if (typeof error.error === 'string') {
      return error.error;
    }
    return mensajeDefault;
  }

  manejarError(error: any, accion: string): void {
    console.error(`Error al ${accion} acudiente`, error);
    Swal.fire({
      title: 'Error',
      text: `Error al ${accion} el acudiente`,
      icon: 'error',
      confirmButtonText: 'Aceptar'
    });
  }

  formularioValido(): boolean {
    const datosPersonalesCompletos = Boolean(
      this.model.tipoIdentificacion &&
      this.model.numeroIdentificacion &&
      this.model.primerNombre &&
      this.model.primerApellido
    );

    if (this.nuevo) {
      return datosPersonalesCompletos;
    }

    return datosPersonalesCompletos && Boolean(this.model.tipoAcudiente);
  }

  limpiarFormulario(): void {
    this.model = {
      idPersona: 0,
      tipoIdentificacion: "",
      numeroIdentificacion: "",
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
      ocupacion: "",
      rh: "",
      tipoAcudiente: "",
      responsablePago: false,
      autorizadoRecoger: false,
      autorizadoSistema: false,
      activo: true,
      idAcudiente: 0
    };
    this.submitted = false;
    this.documentoEncontrado = false;
    this.camposHabilitados = false;
  }

  volver(): void {
    this.router.navigate(['/estudiantes-acudientes', this.idEstudiante]);
  }

  obtenerEstudiante(id_estudiante: any): void {
    this.estudiantesService.obtenerById(id_estudiante).subscribe({
      next: (response: any) => {
        const body = response.body as any[];
        if (body && body.length > 0) {
          this.estudiante = body[0];
          this.nombre_estudiante = [
            this.estudiante.primer_nombre,
            this.estudiante.segundo_nombre,
            this.estudiante.primer_apellido,
            this.estudiante.segundo_apellido
          ].filter(Boolean).join(' ');
          this.titulo = `${this.titulo} para ${this.nombre_estudiante}`;
        }
      },
      error: (error: any) => {
        console.error("Error al obtener estudiante", error);
      }
    });
  }

  establecerValoresPorDefecto(): void {
    this.model.nacionalidad = 'Colombiana';
    this.model.activo = true;
  }

  guardarDatosPersonales() {
    this.submitted = true;

    if (
      !this.model.tipoIdentificacion ||
      !this.model.numeroIdentificacion ||
      !this.model.primerNombre ||
      !this.model.primerApellido
    ) {
      Swal.fire({
        icon: 'warning',
        title: 'Campos incompletos',
        text: 'Por favor complete todos los campos requeridos de datos personales',
      });
      return;
    }

    const personaData = this.prepararDatosPersona();

    if (this.model.idPersona > 0) {
      this.personasService.actualizar(personaData).subscribe({
        next: (response: any) => {
          Swal.fire({
            icon: 'success',
            title: 'Datos Personales Actualizados',
            text: 'Los datos personales se han guardado correctamente',
            confirmButtonText: 'Aceptar',
          });
        },
        error: (error: any) => {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: this.extraerMensajeError(error, 'Error al actualizar los datos personales'),
          });
        },
      });
    }
  }

  guardarInformacionAcudiente() {
    if (!this.model.tipoAcudiente) {
      Swal.fire({
        icon: 'warning',
        title: 'Campos incompletos',
        text: 'Por favor seleccione el tipo de acudiente',
      });
      return;
    }

    if (this.model.idPersona > 0) {
      if (this.accion === 'crear' && this.model.idAcudiente === 0) {
        this.crearActualizarAcudiente(this.model);
      } else {
        this.actualizarPersonaYAcudiente();
      }
    }
  }

  actualizarPersonaYAcudiente() {
    const personaData = this.prepararDatosPersona();

    this.personasService.actualizar(personaData).subscribe({
      next: (response: any) => {
        this.actualizarAcudiente();
      },
      error: (error: any) => {
        Swal.fire({
          title: 'Error',
          text: this.extraerMensajeError(error, 'Error al actualizar la persona'),
          icon: 'error',
        });
      },
    });
  }

  actualizarAcudiente() {
    const acudienteData = {
      id: this.model.idAcudiente,
      id_persona: this.model.idPersona,
      id_tipo_acudiente: this.model.tipoAcudiente,
      es_responsable_pago: this.model.responsablePago ? 1 : 0,
      autorizado_recoger: this.model.autorizadoRecoger ? 1 : 0,
      autorizado_sistema: this.model.autorizadoSistema ? 1 : 0,
      activo: this.model.activo ? 1 : 0,
      id_estudiante: this.idEstudiante,
    };

    this.acudientesService.actualizar(acudienteData).subscribe({
      next: (response: any) => {
        if (response.error) {
          Swal.fire({
            title: 'Error',
            text: response.error,
            icon: 'error',
            confirmButtonText: 'Aceptar'
          });
          return;
        }

        Swal.fire({
          title: 'Éxito',
          text: 'Información del acudiente actualizada correctamente',
          icon: 'success',
          confirmButtonText: 'Aceptar'
        });
      },
      error: (error: any) => {
        Swal.fire({
          title: 'Error',
          text: this.extraerMensajeError(error, 'Error al actualizar el acudiente'),
          icon: 'error',
          confirmButtonText: 'Aceptar'
        });
      }
    });
  }

  obtenerNombreCompleto(): string {
    return [
      this.model.primerNombre,
      this.model.segundoNombre,
      this.model.primerApellido,
      this.model.segundoApellido
    ].filter(Boolean).join(' ');
  }

  cambiarSeccion(seccion: 'datos-personales' | 'datos-acudiente' | 'documentos' | 'usuario') {
    this.seccionActiva = seccion;
  }

  tieneUsuario(): boolean {
    return this.modelUsuario.id > 0;
  }

  cargarUsuario() {
    if (!this.model.idPersona || this.model.idPersona === 0) return;

    this.usuariosService.obtenerPorPersona(this.model.idPersona).subscribe({
      next: (response: any) => {
        const usuarios = response?.body || [];
        if (usuarios.length > 0) {
          const usuario = usuarios[0];
          
          let correoUsuario = usuario.correo_electronico;
          if (!correoUsuario || correoUsuario === this.model.numeroIdentificacion || correoUsuario === String(this.model.numeroIdentificacion)) {
            correoUsuario = this.model.correoElectronico || '';
          }
          
          this.modelUsuario = {
            id: usuario.id,
            id_persona: usuario.id_persona,
            usuario: usuario.usuario,
            correo_electronico: correoUsuario,
            clave: '',
            activo: usuario.activo,
            acceso_institucional: usuario.acceso_institucional,
            acceso_portal_padres: usuario.acceso_portal_padres,
          };
        } else {
          this.resetearModeloUsuario();
        }
      },
      error: (error: any) => {
        console.error('Error al cargar usuario:', error);
        this.resetearModeloUsuario();
      }
    });
  }

  resetearModeloUsuario() {
    this.modelUsuario = {
      id: 0,
      id_persona: this.model.idPersona,
      usuario: '',
      correo_electronico: this.model.correoElectronico || '',
      clave: '',
      activo: 1,
      acceso_institucional: 0,
      acceso_portal_padres: 1,
    };
  }

  crearUsuario() {
    const correoPersona = this.model.correoElectronico || '';
    const numeroIdentificacion = this.model.numeroIdentificacion || '';
    
    Swal.fire({
      title: 'Crear Usuario',
      html: `
        <div class="text-start">
          <div class="mb-3">
            <label class="form-label">Usuario</label>
            <input id="swal-usuario" type="text" class="form-control" value="${numeroIdentificacion}" disabled 
              style="background-color: #e9ecef;">
            <small class="text-muted">El usuario es el número de identificación</small>
          </div>
          <div class="mb-3">
            <label class="form-label">Correo Electrónico <span class="text-danger">*</span></label>
            <input id="swal-email" type="email" class="form-control" placeholder="usuario@correo.com" value="${correoPersona}">
            <small class="text-muted">Se usa para recuperar contraseña</small>
          </div>
          <div class="mb-3">
            <label class="form-label">Contraseña <span class="text-danger">*</span></label>
            <input id="swal-password" type="password" class="form-control" placeholder="Mínimo 6 caracteres">
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Crear',
      cancelButtonText: 'Cancelar',
      customClass: {
        confirmButton: 'btn btn-lg px-4',
        cancelButton: 'btn btn-outline-secondary btn-lg px-4',
      },
      buttonsStyling: false,
      didOpen: () => {
        const confirmBtn = Swal.getConfirmButton();
        if (confirmBtn) {
          confirmBtn.style.background = 'linear-gradient(135deg, #f9a825 0%, #f57f17 100%)';
          confirmBtn.style.color = 'white';
          confirmBtn.style.border = 'none';
          confirmBtn.style.boxShadow = '0 4px 6px rgba(249, 168, 37, 0.3)';
          confirmBtn.style.marginRight = '10px';
        }
      },
      preConfirm: () => {
        const email = (document.getElementById('swal-email') as HTMLInputElement).value;
        const password = (document.getElementById('swal-password') as HTMLInputElement).value;

        if (!email) {
          Swal.showValidationMessage('El correo electrónico es requerido');
          return false;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          Swal.showValidationMessage('Por favor ingrese un correo electrónico válido');
          return false;
        }

        if (!password) {
          Swal.showValidationMessage('La contraseña es requerida');
          return false;
        }

        if (password.length < 6) {
          Swal.showValidationMessage('La contraseña debe tener al menos 6 caracteres');
          return false;
        }

        return {
          correo_electronico: email,
          clave: password,
          acceso_institucional: 0,
          acceso_portal_padres: 1,
        };
      },
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        const nuevoUsuario = {
          id_persona: this.model.idPersona,
          correo_electronico: result.value.correo_electronico,
          clave: result.value.clave,
          activo: 1,
          acceso_institucional: result.value.acceso_institucional,
          acceso_portal_padres: result.value.acceso_portal_padres,
        };

        this.usuariosService.crear(nuevoUsuario).subscribe({
          next: (response: any) => {
            Swal.fire({
              icon: 'success',
              title: '¡Usuario Creado!',
              text: 'El usuario ha sido creado exitosamente',
              confirmButtonText: 'Entendido',
              customClass: {
                confirmButton: 'btn btn-lg px-4',
              },
              buttonsStyling: false,
              didOpen: () => {
                const confirmBtn = Swal.getConfirmButton();
                if (confirmBtn) {
                  confirmBtn.style.background = 'linear-gradient(135deg, #4caf50 0%, #388e3c 100%)';
                  confirmBtn.style.color = 'white';
                  confirmBtn.style.border = 'none';
                }
              },
            });
            this.cargarUsuario();
          },
          error: (error: any) => {
            console.error('Error al crear usuario:', error);
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: this.extraerMensajeError(error, 'No se pudo crear el usuario'),
              confirmButtonText: 'Entendido',
            });
          }
        });
      }
    });
  }

  guardarUsuario() {
    this.submittedUsuario = true;

    if (!this.modelUsuario.correo_electronico) {
      Swal.fire('Advertencia', 'Por favor complete todos los campos requeridos', 'warning');
      return;
    }

    const datosActualizar = {
      id: this.modelUsuario.id,
      correo_electronico: this.modelUsuario.correo_electronico,
      activo: this.modelUsuario.activo ? 1 : 0,
      acceso_institucional: this.modelUsuario.acceso_institucional ? 1 : 0,
      acceso_portal_padres: this.modelUsuario.acceso_portal_padres ? 1 : 0,
    };

    this.usuariosService.actualizar(datosActualizar).subscribe({
      next: (response: any) => {
        Swal.fire('¡Éxito!', 'Usuario actualizado correctamente', 'success');
        this.submittedUsuario = false;
      },
      error: (error: any) => {
        console.error('Error al actualizar usuario:', error);
        Swal.fire('Error', this.extraerMensajeError(error, 'No se pudo actualizar el usuario'), 'error');
      }
    });
  }

  cambiarContrasena() {
    this.intentoCambiarClave = true;

    if (!this.cambiarClaveModel.claveNueva) {
      Swal.fire('Advertencia', 'Por favor ingrese la nueva contraseña', 'warning');
      return;
    }

    if (this.cambiarClaveModel.claveNueva.length < 6) {
      Swal.fire('Advertencia', 'La contraseña debe tener al menos 6 caracteres', 'warning');
      return;
    }

    const datos = {
      id: this.modelUsuario.id,
      clave: this.cambiarClaveModel.claveNueva,
    };

    this.usuariosService.actualizar(datos).subscribe({
      next: (response: any) => {
        Swal.fire('¡Éxito!', 'Contraseña cambiada correctamente', 'success');
        this.cambiarClaveModel.claveNueva = '';
        this.intentoCambiarClave = false;
        this.mostrarClaveNueva = false;
      },
      error: (error: any) => {
        console.error('Error al cambiar contraseña:', error);
        Swal.fire('Error', this.extraerMensajeError(error, 'No se pudo cambiar la contraseña'), 'error');
      }
    });
  }

  confirmarEliminarUsuario() {
    Swal.fire({
      title: '¿Está seguro?',
      text: 'Esta acción eliminará el usuario del acudiente',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (result.isConfirmed) {
        this.eliminarUsuario();
      }
    });
  }

  eliminarUsuario() {
    this.usuariosService.eliminar({ id: this.modelUsuario.id }).subscribe({
      next: (response: any) => {
        Swal.fire('¡Eliminado!', 'Usuario eliminado correctamente', 'success');
        this.resetearModeloUsuario();
      },
      error: (error: any) => {
        console.error('Error al eliminar usuario:', error);
        Swal.fire('Error', this.extraerMensajeError(error, 'No se pudo eliminar el usuario'), 'error');
      }
    });
  }

}