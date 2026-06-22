import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TiposIdentificacionService } from '../../../services/tipos-identificacion.service';
import { GenerosService } from '../../../services/generos.service';
import { PersonasService } from '../../../services/personas.service';
import { DocentesService } from '../../../services/docentes.service';
import { NivelesEscolaridadService } from '../../../services/niveles-escolaridad.service';
import { CasasDocentesService } from '../../../services/casas-docentes.service';
import { GruposService } from '../../../services/grupos.service';
import { AreasAcademicasService } from '../../../services/areas-academicas.service';
import { CiudadesService } from '../../../services/ciudades.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../../common/header/header.component';
import Swal from 'sweetalert2';
import { AreaAcademicaXGrupoService } from '../../../services/area-academica-x-grupo.service';

@Component({
  selector: 'app-crear-docentes',
  templateUrl: './crear-docentes.component.html',
  styleUrl: './crear-docentes.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, RouterModule]
})
export class CrearDocentesComponent implements OnInit {

  public titulo = "Docente";
  public id = "0";
  public accion = "";
  public editable = false;
  public nuevo = false;
  public seccionActiva = 'datos-personales';
  public submitted = false;
  public documentoEncontrado = false;
  public camposHabilitados = false;
  public docenteActivoSwitch = true;

  public listas = {
    tiposIdentificacion: [] as any[],
    generos: [] as any[],
    nivelesEscolaridad: [] as any[],
    casasDocentes: [] as any[],
    grupos: [] as any[],
    areasAcademicas: [] as any[],
    ciudades: [] as any[]
  }

  public model = {
    idPersona: 0 as any,
    idDocente: 0 as any,
    tipoIdentificacion: "" as any,
    numeroIdentificacion: "" as any,
    primerNombre: "" as any,
    segundoNombre: "" as any,
    primerApellido: "" as any,
    segundoApellido: "" as any,
    fechaNacimiento: "" as any,
    genero: "" as any,
    direccion: "" as any,
    correoElectronico: "" as any,
    telefono: "" as any,
    ciudad: "" as any,
    nivelEscolaridad: "" as any,
    casaDocente: "" as any,
    activo: 1 as any
  }

  public gruposAsignados: any[] = [];
  public nuevoGrupo = {
    idGrupo: "",
    esTitular: false
  };

  public areasAsignadas: any[] = [];
  public nuevaArea: any = {};

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private tiposIdentificacionService: TiposIdentificacionService,
    private generosService: GenerosService,
    private personasService: PersonasService,
    private docentesService: DocentesService,
    private nivelesEscolaridadService: NivelesEscolaridadService,
    private casasDocentesService: CasasDocentesService,
    private gruposService: GruposService,
    private areasAcademicasService: AreasAcademicasService,
    private ciudadesService: CiudadesService,
    private areaAcademicaXGrupoService: AreaAcademicaXGrupoService
  ) { }

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.accion = params['accion'];
      this.id = params['id'];

      switch (this.accion) {
        case 'crear':
          this.titulo = "Crear Docente";
          this.editable = true;
          this.nuevo = true;
          this.camposHabilitados = false;
          this.establecerValoresPorDefecto();
          this.consultarListas();
          break;
        case 'editar':
          this.titulo = "Editar Docente";
          this.editable = true;
          this.camposHabilitados = true;
          this.documentoEncontrado = true;
          this.consultarListas();
          this.consultarDocente();
          break;
        case 'ver':
          this.titulo = "Ver Docente";
          this.editable = false;
          this.camposHabilitados = false;
          this.documentoEncontrado = true;
          this.consultarListas();
          this.consultarDocente();
          break;
        default:
          this.titulo = "Crear Docente";
          this.editable = true;
          this.nuevo = true;
          this.camposHabilitados = false;
          this.establecerValoresPorDefecto();
          this.consultarListas();
          break;
      }
    });
  }

  consultaPersona() {
    if (!this.model.tipoIdentificacion || !this.model.numeroIdentificacion) {
      Swal.fire({
        title: 'Campos incompletos',
        text: 'Por favor ingrese tipo y número de documento para verificar',
        icon: 'warning',
        confirmButtonText: 'Aceptar'
      });
      return;
    }

    if (this.editable) {
      this.personasService.obtenerByIdentificacion(
        this.model.tipoIdentificacion,
        this.model.numeroIdentificacion
      ).subscribe({
        next: (response: any) => {
          const datos = response.body;
          if (datos && datos.length > 0) {
            const persona = datos[0];

            // Verificar si ya existe como docente
            this.docentesService.verificarDuplicados(persona.id).subscribe({
              next: (respuesta: any) => {
                if (respuesta.existe) {
                  Swal.fire({
                    title: 'Docente existente',
                    text: 'Esta persona ya está registrada como docente en el sistema',
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
                console.error("Error al verificar docente", error);
                Swal.fire({
                  title: 'Error',
                  text: 'Error al verificar si la persona ya está registrada como docente',
                  icon: 'error',
                  confirmButtonText: 'Aceptar'
                });
              }
            });
          } else {
            // No se encontró la persona, habilitar campos para ingreso
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
  }

  llenarFormularioPersona(persona: any) {
    this.model.idPersona = persona.id;
    this.model.primerNombre = persona.primer_nombre || '';
    this.model.segundoNombre = persona.segundo_nombre || '';
    this.model.primerApellido = persona.primer_apellido || '';
    this.model.segundoApellido = persona.segundo_apellido || '';
    this.model.fechaNacimiento = persona.fecha_nacimiento || '';
    this.model.genero = persona.id_genero || '';
    this.model.direccion = persona.direccion || '';
    this.model.correoElectronico = persona.correo_electronico || '';
    this.model.telefono = persona.telefono || '';
    this.model.ciudad = persona.id_ciudad || '';
  }

  consultarDocente() {
    this.docentesService.obtenerById(this.id).subscribe((response: any) => {
      const docente = response.body[0];
      if (docente) {
        // Cargar datos personales
        this.model.idPersona = docente.id_persona;
        this.model.idDocente = docente.id;
        this.model.tipoIdentificacion = docente.id_tipo_identificacion;
        this.model.numeroIdentificacion = docente.numero_identificacion;
        this.model.primerNombre = docente.primer_nombre;
        this.model.segundoNombre = docente.segundo_nombre || '';
        this.model.primerApellido = docente.primer_apellido;
        this.model.segundoApellido = docente.segundo_apellido || '';
        this.model.fechaNacimiento = docente.fecha_nacimiento;
        this.model.genero = docente.id_genero;
        this.model.direccion = docente.direccion || '';
        this.model.correoElectronico = docente.correo_electronico || '';
        this.model.telefono = docente.telefono || '';

        // Cargar id_ciudad desde la persona
        this.personasService.obtenerById(docente.id_persona).subscribe((respPersona: any) => {
          const persona = respPersona.body[0];
          if (persona) {
            this.model.ciudad = persona.id_ciudad;
          }
        });

        // Cargar datos del docente
        this.model.nivelEscolaridad = docente.id_nivel_escolaridad;
        this.model.casaDocente = docente.id_casa_docente;
        this.model.activo = docente.activo;

        // Inicializar el switch con el estado actual
        this.docenteActivoSwitch = (docente.activo == 1 || docente.activo === "1");

        // Actualizar el título con el nombre
        this.actualizarTitulo();

        // Cargar grupos asignados
        this.consultarGruposAsignados();

        // Cargar áreas académicas
        this.consultarAreasAcademicas();
      }
    });
  }

  construirNombreCompleto(): string {
    const partes = [];
    if (this.model.primerNombre) partes.push(this.model.primerNombre);
    if (this.model.segundoNombre) partes.push(this.model.segundoNombre);
    if (this.model.primerApellido) partes.push(this.model.primerApellido);
    if (this.model.segundoApellido) partes.push(this.model.segundoApellido);
    return partes.join(' ') || 'Sin nombre';
  }

  actualizarTitulo() {
    const nombreCompleto = this.construirNombreCompleto();
    switch (this.accion) {
      case 'editar':
        this.titulo = `Editar Docente: ${nombreCompleto}`;
        break;
      case 'ver':
        this.titulo = `Ver Docente: ${nombreCompleto}`;
        break;
    }
  }

  cambiarEstadoDocente(): void {
    this.model.activo = this.docenteActivoSwitch ? 1 : 0;
    const estado = this.docenteActivoSwitch ? 'activo' : 'inactivo';
    console.log(`Estado del docente cambiado a: ${estado}`);
  }

  establecerValoresPorDefecto(): void {
    this.model.activo = 1;
    this.docenteActivoSwitch = true;
    // Establecer tipo de identificación por defecto si es necesario
    // this.model.tipoIdentificacion = 2; // Por ejemplo, Cédula
  }
  consultarListas() {
    // Tipos de identificación
    this.tiposIdentificacionService.obtenerTodos().subscribe((response: any) => {
      this.listas.tiposIdentificacion = response.body;
    });

    // Géneros
    this.generosService.obtenerTodos().subscribe((response: any) => {
      this.listas.generos = response.body;
    });

    // Niveles de escolaridad
    this.nivelesEscolaridadService.obtenerTodos().subscribe((response: any) => {
      this.listas.nivelesEscolaridad = response.body;
      console.log("this.nivelesEscolaridadService", this.listas.nivelesEscolaridad)
    });

    // Casas docentes
    this.casasDocentesService.obtenerTodos().subscribe((response: any) => {
      this.listas.casasDocentes = response.body;
    });

    // Grupos
    this.gruposService.obtenerTodos().subscribe((response: any) => {
      this.listas.grupos = response.body;
    });

    // Áreas académicas
    this.areasAcademicasService.obtenerTodos().subscribe((response: any) => {
      this.listas.areasAcademicas = response.body;
    });

    // Ciudades
    this.ciudadesService.obtenerTodos().subscribe((response: any) => {
      this.listas.ciudades = response.body;
    });
  }



  consultarGruposAsignados() {
    if (this.model.idDocente) {
      this.docentesService.obtenerGruposDocente(this.model.idDocente).subscribe((response: any) => {
        this.gruposAsignados = response.body;
      });
    }
  }




  verificarDocenteExistente() {
    if (this.model.idPersona && this.nuevo) {
      this.docentesService.verificarDuplicados(this.model.idPersona).subscribe((response: any) => {
        if (response.existe) {
          Swal.fire({
            icon: 'warning',
            title: 'Docente ya existe',
            text: 'Esta persona ya está registrada como docente',
            confirmButtonText: 'Entendido'
          }).then(() => {
            // Limpiar formulario o redirigir
            this.router.navigate(['/docentes']);
          });
        }
      });
    }
  }

  cambiarSeccion(seccion: string) {
    this.seccionActiva = seccion;
  }

  grupoYaAsignado(idGrupo: any): boolean {
    return this.gruposAsignados.some(g => g.id_grupo == idGrupo && g.activo == 1);
  }

  asignarGrupo() {
    if (!this.nuevoGrupo.idGrupo) return;

    const asignacion = {
      id_docente: this.model.idDocente,
      id_grupo: this.nuevoGrupo.idGrupo,
      es_titular: this.nuevoGrupo.esTitular ? 1 : 0,
      fecha_asignacion: new Date().toISOString().split('T')[0]
    };

    this.docentesService.asignarGrupo(asignacion).subscribe(
      (response: any) => {
        Swal.fire({
          icon: 'success',
          title: 'Grupo asignado',
          text: 'El grupo ha sido asignado correctamente',
          timer: 2000,
          showConfirmButton: false
        });

        // Recargar grupos asignados
        this.consultarGruposAsignados();

        // Limpiar selección
        this.nuevoGrupo = { idGrupo: "", esTitular: false };
      },
      (error: any) => {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.error?.error || 'Error al asignar el grupo'
        });
      }
    );
  }

  cambiarTitular(grupo: any) {
    const nuevoEstado = grupo.es_titular ? 0 : 1;

    this.docentesService.actualizarTitular(grupo.id, nuevoEstado).subscribe({
      next: (response: any) => {
        Swal.fire({
          icon: 'success',
          title: nuevoEstado ? 'Titular asignado' : 'Titular removido',
          text: nuevoEstado ?
            'El docente ahora es titular del grupo' :
            'El docente ya no es titular del grupo',
          timer: 2000,
          showConfirmButton: false
        });

        this.consultarGruposAsignados();
      },
      error: (error: any) => {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Error al actualizar el estado de titular'
        });
      }
    });
  }

  toggleEstadoGrupo(grupo: any) {
    const accion = grupo.activo ? 'desactivar' : 'activar';
    const servicio = grupo.activo ?
      this.docentesService.desactivarAsignacion(grupo.id) :
      this.docentesService.activarAsignacion(grupo.id);

    servicio.subscribe(
      (response: any) => {
        Swal.fire({
          icon: 'success',
          title: grupo.activo ? 'Grupo desactivado' : 'Grupo activado',
          timer: 2000,
          showConfirmButton: false
        });

        this.consultarGruposAsignados();
      },
      (error: any) => {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.error?.error || `Error al ${accion} la asignación`
        });
      }
    );
  }





  // Actualizar el método consultarAreasAcademicas():
  consultarAreasAcademicas() {
    if (this.model.idDocente) {
      // Importar el servicio AreaAcademicaXGrupoService
      this.areaAcademicaXGrupoService.obtenerPorDocente(this.model.idDocente).subscribe((response: any) => {
        this.areasAsignadas = response.body || [];
      });
    }
  }

  // Actualizar el método asignarArea():
  asignarArea(idGrupo: any) {
    if (!this.nuevaArea[idGrupo]) return;

    const asignacion = {
      id_area_academica: this.nuevaArea[idGrupo],
      id_grupo: idGrupo,
      id_docente: this.model.idDocente
    };

    this.areaAcademicaXGrupoService.crear(asignacion).subscribe({
      next: (response: any) => {
        Swal.fire({
          icon: 'success',
          title: 'Área asignada',
          text: 'El área académica ha sido asignada correctamente',
          timer: 2000,
          showConfirmButton: false
        });

        // Recargar áreas
        this.consultarAreasAcademicas();

        // Limpiar selección
        this.nuevaArea[idGrupo] = '';
      },
      error: (error: any) => {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.error?.error || 'Error al asignar el área'
        });
      }
    });
  }

  // Actualizar el método quitarArea():
  quitarArea(idArea: any) {
    Swal.fire({
      title: '¿Está seguro?',
      text: '¿Desea quitar esta área académica?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, quitar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.areaAcademicaXGrupoService.eliminar(idArea).subscribe({
          next: (response: any) => {
            Swal.fire({
              icon: 'success',
              title: 'Área removida',
              text: 'El área académica ha sido removida correctamente',
              timer: 2000,
              showConfirmButton: false
            });

            // Recargar áreas
            this.consultarAreasAcademicas();
          },
          error: (error: any) => {
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: 'Error al quitar el área'
            });
          }
        });
      }
    });
  }

  // Actualizar el método areaYaAsignada():
  areaYaAsignada(idArea: any, idGrupo: any): boolean {
    return this.areasAsignadas.some(a =>
      a.id_area_academica == idArea &&
      a.id_grupo == idGrupo
    );
  }

  obtenerAreasGrupo(idGrupo: any): any[] {
    // TODO: Filtrar las áreas asignadas por grupo
    return this.areasAsignadas.filter(a => a.id_grupo == idGrupo);
  }


  validarFormulario(): boolean {
    if (!this.model.tipoIdentificacion || !this.model.numeroIdentificacion) {
      Swal.fire({
        icon: 'error',
        title: 'Datos incompletos',
        text: 'Debe ingresar tipo y número de identificación'
      });
      return false;
    }

    if (!this.model.primerNombre || !this.model.primerApellido) {
      Swal.fire({
        icon: 'error',
        title: 'Datos incompletos',
        text: 'Debe ingresar al menos primer nombre y primer apellido'
      });
      return false;
    }

    if (!this.model.fechaNacimiento) {
      Swal.fire({
        icon: 'error',
        title: 'Datos incompletos',
        text: 'Debe ingresar la fecha de nacimiento'
      });
      return false;
    }

    if (!this.model.nivelEscolaridad) {
      Swal.fire({
        icon: 'error',
        title: 'Datos incompletos',
        text: 'Debe seleccionar el nivel de escolaridad'
      });
      return false;
    }

    return true;
  }

  prepararDatosPersona(persona: any) {
    return {
      id: persona.idPersona || 0,
      primer_nombre: persona.primerNombre,
      segundo_nombre: persona.segundoNombre || null,
      primer_apellido: persona.primerApellido,
      segundo_apellido: persona.segundoApellido || null,
      id_tipo_identificacion: persona.tipoIdentificacion,
      numero_identificacion: persona.numeroIdentificacion,
      fecha_nacimiento: persona.fechaNacimiento || null,
      id_genero: persona.genero === '' ? null : persona.genero,
      direccion: persona.direccion || null,
      correo_electronico: persona.correoElectronico || null,
      telefono: persona.telefono || null,
      id_ciudad: persona.ciudad === '' ? null : persona.ciudad
    };
  }

  guardar() {
    this.submitted = true;

    if (!this.validarFormulario()) return;

    if (this.accion === 'editar' && this.model.idPersona) {
      this.actualizarPersona();
    } else {
      if (!this.model.idPersona || !this.model.idPersona) {
        this.crearPersona();
      } else {
        this.docentesService.verificarDuplicados(this.model.idPersona).subscribe({
          next: (respuesta: any) => {
            if (respuesta.existe && this.accion === 'crear') {
              Swal.fire({
                title: 'Docente existente',
                text: 'Esta persona ya está registrada como docente en el sistema',
                icon: 'warning',
                confirmButtonText: 'Aceptar'
              });
              return;
            } else {
              this.crearActualizarDocente();
            }
          },
          error: (error: any) => {
            console.error("Error al verificar docente", error);
            Swal.fire({
              title: 'Error',
              text: 'Error al verificar si la persona ya está registrada como docente',
              icon: 'error',
              confirmButtonText: 'Aceptar'
            });
          }
        });
      }
    }
  }

  crearPersona() {
    const personaData = this.prepararDatosPersona(this.model);

    this.personasService.crear(personaData).subscribe({
      next: (response: any) => {
        console.log("Persona creada", response);
        if (+!response.id) {
          Swal.fire({
            title: 'Error',
            text: 'Error al crear persona',
            icon: 'error',
            confirmButtonText: 'Aceptar'
          });
          return;
        }
        this.model.idPersona = response.id;
        this.crearActualizarDocente();
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
  }

  actualizarPersona() {
    const personaData = this.prepararDatosPersona(this.model);

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
        this.crearActualizarDocente();
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

  crearActualizarDocente() {
    const docenteData = {
      id: this.model.idDocente || 0,
      id_persona: this.model.idPersona,
      id_nivel_escolaridad: this.model.nivelEscolaridad,
      id_casa_docente: this.model.casaDocente || null,
      activo: this.model.activo
    };

    const docenteService = !!this.model.idDocente ?
      this.docentesService.actualizar(docenteData) :
      this.docentesService.crear(docenteData);

    docenteService.subscribe({
      next: (response: any) => {
        Swal.fire({
          icon: 'success',
          title: this.accion === 'crear' ? 'Docente creado' : 'Docente actualizado',
          text: 'Los datos del docente se han guardado correctamente',
          confirmButtonText: 'Aceptar'
        }).then(() => {
          this.router.navigate(['/docentes']);
        });
      },
      error: (error: any) => {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.error?.error || 'Error al guardar el docente'
        });
      }
    });
  }


}