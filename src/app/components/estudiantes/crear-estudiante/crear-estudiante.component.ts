import { Component, OnInit, HostListener } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import Swal from 'sweetalert2';
import { HeaderComponent } from '../../../common/header/header.component';
import { DocumentosPersonaComponent } from '../../../common/documentos-persona/documentos-persona.component';
import { FotoPersonaComponent } from '../../../common/foto-persona/foto-persona.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EstudiantesService } from '../../../services/estudiantes.service';
import { GenerosService } from '../../../services/generos.service';
import { PersonasService } from '../../../services/personas.service';
import { TiposIdentificacionService } from '../../../services/tipos-identificacion.service';
import { GruposService } from '../../../services/grupos.service';
import { CiudadesService } from '../../../services/ciudades.service';
import { InstitucionConfigService } from '../../../services/institucion-config.service';
import { HorariosEstudianteService } from '../../../services/horarios-estudiante.service';
import { ConveniosService } from '../../../services/convenios.service';
import { ConveniosEstudianteService } from '../../../services/convenios-estudiante.service';
import { DatosMedicosService } from '../../../services/datos-medicos.service';
import { DatosMedicosXEstudianteService } from '../../../services/datos-medicos-x-estudiante.service';
import { DatosAdicionalesService } from '../../../services/datos-adicionales.service';
import { DatosAdicionalesXEstudianteService } from '../../../services/datos-adicionales-x-estudiante.service';
import { UtilService } from '../../../common/constantes/util.service';
import { DiasSemanaService } from '../../../services/dias-semana.service';
import { GradosXGrupoService } from '../../../services/grados-x-grupo.service';

interface EstudianteModel {
  idPersona: string;
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
  rh: string;
  ocupacion: string;
  fechaIngreso: string;
  telefonoEmergencia: string;
  eps: string;
  alimentacion: boolean;
  permanente: boolean;
  grupo: number | string;
  grado: number | string;
  anno: number | string;
  idEstudiante: string;
  activo: number;
}

interface HorarioEstudiante {
  id: string;
  id_estudiante: string;
  id_dia_semana: number;
  nombre_dia: string;
  hora_entrada: string;
  hora_salida: string;
}

interface ConvenioEstudiante {
  id: string;
  id_estudiante: string;
  id_convenio: string;
  nombre_convenio: string;
  descripcion_convenio: string;
  nombre_producto_servicio: string;
  valor_sugerido: number;
  fecha_inicio: string;
  fecha_fin: string | null;
  nombre_usuario: string;
}

interface DatoDinamico {
  id_dato: string;
  nombre: string;
  nombre_tipo: string;
  id_tipo: number;
  orden_tipo: number;
  orden_dato: number;
  es_numero: boolean;
  es_texto: boolean;
  es_parrafo: boolean;
  es_fecha: boolean;
  opciones: string[];
  valor_numero: any;
  valor_texto: string;
  valor_parrafo: string;
  valor_fecha: string;
  observacion: string;
}

interface GrupoDatosDinamicos {
  nombre_tipo: string;
  icono: string;
  id_tipo: number;
  orden_tipo: number;
  datos: DatoDinamico[];
}

@Component({
  selector: 'app-crear-estudiante',
  standalone: true,
  imports: [
    HeaderComponent,
    CommonModule,
    FormsModule,
    DocumentosPersonaComponent,
    FotoPersonaComponent,
  ],
  templateUrl: './crear-estudiante.component.html',
  styleUrl: './crear-estudiante.component.scss',
})
export class CrearEstudianteComponent implements OnInit {
  public id = '0';
  public accion = '';
  public editable = true;
  public submitted = false;
  public titulo = 'Registro de estudiante';
  public regresar = '/estudiantes';
  public documentoEncontrado = false;
  public camposHabilitados = false;
  public idEstudianteGrupo = 0;
  // Grupo y grado originales al cargar el estudiante en modo editar, para detectar si hubo cambio
  private grupoOriginal: any = null;
  private gradoOriginal: any = null;

  // Sidebar y navegación por secciones
  public nuevo = false;
  public seccionActiva: 'datos-personales' | 'datos-academicos' | 'horarios' | 'convenios' | 'datos-medicos' | 'datos-adicionales' | 'documentos' = 'datos-personales';
  public sidebarAbierto = false;

  public listas = {
    tiposIdentificacion: [] as any[],
    generos: [] as any[],
    grupos: [] as any[],
    grados: [] as any[],
    ciudades: [] as any[],
    annos: [] as any[],
    gruposRh: [
      { id: 'O+', nombre: 'O+' },
      { id: 'O-', nombre: 'O-' },
      { id: 'A+', nombre: 'A+' },
      { id: 'A-', nombre: 'A-' },
      { id: 'B+', nombre: 'B+' },
      { id: 'B-', nombre: 'B-' },
      { id: 'AB+', nombre: 'AB+' },
      { id: 'AB-', nombre: 'AB-' },
    ],
    conveniosDisponibles: [] as any[],
  };

  // Horarios del estudiante
  public horarios: HorarioEstudiante[] = [];
  public horariosModificados = false;

  // Días de la semana traídos del backend (BD: tabla dias_semana)
  private diasSemana: any[] = [];

  // Convenios del estudiante
  public conveniosEstudiante: ConvenioEstudiante[] = [];
  public nuevoConvenio = {
    id_convenio: '',
    fecha_inicio: '',
    fecha_fin: '',
    crear_cobros_automaticos: false
  };

  // Datos médicos dinámicos
  public gruposDatosMedicos: GrupoDatosDinamicos[] = [];
  public datosMedicosModificados = false;

  // Datos adicionales dinámicos
  public gruposDatosAdicionales: GrupoDatosDinamicos[] = [];
  public datosAdicionalesModificados = false;

  public model: EstudianteModel = {
    idPersona: '',
    tipoIdentificacion: '',
    numeroIdentificacion: '',
    primerNombre: '',
    segundoNombre: '',
    primerApellido: '',
    segundoApellido: '',
    fechaNacimiento: '',
    genero: '',
    direccion: '',
    correoElectronico: '',
    telefono: '',
    nacionalidad: 'Colombiana',
    ciudad: '',
    rh: '',
    ocupacion: 'Estudiante',
    fechaIngreso: '',
    telefonoEmergencia: '',
    eps: '',
    alimentacion: false,
    permanente: false,
    grupo: '',
    grado: '',
    anno: '',
    idEstudiante: '',
    activo: 1,
  };
  public estudianteActivoSwitch = true;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private tiposIdentificacionService: TiposIdentificacionService,
    private generosService: GenerosService,
    private gruposService: GruposService,
    private personasService: PersonasService,
    private estudiantesService: EstudiantesService,
    private ciudadesService: CiudadesService,
    private institucionConfigService: InstitucionConfigService,
    private horariosEstudianteService: HorariosEstudianteService,
    private conveniosService: ConveniosService,
    private conveniosEstudianteService: ConveniosEstudianteService,
    private datosMedicosService: DatosMedicosService,
    private datosMedicosXEstudianteService: DatosMedicosXEstudianteService,
    private datosAdicionalesService: DatosAdicionalesService,
    private datosAdicionalesXEstudianteService: DatosAdicionalesXEstudianteService,
    private utilService: UtilService,
    private diaSemanaService: DiasSemanaService,
    private gradosXGrupoService: GradosXGrupoService,
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      this.accion = params['accion'];
      this.id = params['id'];
      switch (this.accion) {
        case 'crear':
          this.editable = true;
          this.camposHabilitados = false;
          this.nuevo = true;
          this.titulo = 'Crear estudiante';
          this.establecerValoresPorDefecto();
          break;
        case 'editar':
          this.editable = true;
          this.camposHabilitados = true;
          this.documentoEncontrado = true;
          this.nuevo = false;
          this.titulo = 'Editar estudiante';
          this.obtenerEstudiante(this.id);
          break;
        case 'consultar':
          this.editable = false;
          this.camposHabilitados = false;
          this.documentoEncontrado = true;
          this.nuevo = false;
          this.titulo = 'Consultar estudiante';
          this.obtenerEstudiante(this.id);
          break;
        default:
          this.editable = true;
          this.camposHabilitados = false;
          this.nuevo = true;
          this.titulo = 'Crear estudiante';
          this.establecerValoresPorDefecto();
          break;
      }
    });

    this.consultarTiposIdentificacion();
    this.consultarGeneros();
    this.consultarGrupos();
    this.consultarCiudades();
    this.consultarAnnos();
    this.consultarConveniosDisponibles();
    this.consultarDiasSemana();
  }

  // ============ SIDEBAR Y NAVEGACIÓN POR SECCIONES ============

  cambiarSeccion(seccion: 'datos-personales' | 'datos-academicos' | 'horarios' | 'convenios' | 'datos-medicos' | 'datos-adicionales' | 'documentos'): void {
    this.seccionActiva = seccion;
    this.cerrarSidebar();
  }

  toggleSidebar(): void {
    this.sidebarAbierto = !this.sidebarAbierto;
  }

  cerrarSidebar(): void {
    this.sidebarAbierto = false;
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.cerrarSidebar();
  }

  obtenerNombreSeccion(): string {
    const nombres: Record<string, string> = {
      'datos-personales': 'Datos Personales',
      'datos-academicos': 'Datos Académicos',
      'horarios': 'Horarios',
      'convenios': 'Convenios',
      'datos-medicos': 'Datos Médicos',
      'datos-adicionales': 'Datos Adicionales',
      'documentos': 'Documentos',
    };
    return nombres[this.seccionActiva] || '';
  }

  obtenerIconoSeccion(): string {
    const iconos: Record<string, string> = {
      'datos-personales': 'fas fa-user-circle',
      'datos-academicos': 'fas fa-graduation-cap',
      'horarios': 'fas fa-clock',
      'convenios': 'fas fa-handshake',
      'datos-medicos': 'fas fa-heartbeat',
      'datos-adicionales': 'fas fa-puzzle-piece',
      'documentos': 'fas fa-file-alt',
    };
    return iconos[this.seccionActiva] || 'fas fa-circle';
  }

  // ============ LISTAS ============

  consultarTiposIdentificacion() {
    this.tiposIdentificacionService
      .obtenerTodos()
      .subscribe((response: any) => {
        this.listas.tiposIdentificacion = response.body;
      });
  }

  consultarGeneros() {
    this.generosService.obtenerTodos().subscribe((response: any) => {
      this.listas.generos = response.body;
    });
  }

  consultarGrupos() {
    this.gruposService.obtenerTodos().subscribe((response: any) => {
      this.listas.grupos = response.body;
    });
  }

  consultarCiudades() {
    this.ciudadesService.obtenerTodos().subscribe((response: any) => {
      this.listas.ciudades = response.body;
    });
  }

  consultarAnnos() {
    this.listas.annos = this.institucionConfigService.getAnnosEscolares();
  }

  consultarConveniosDisponibles() {
    this.conveniosService.obtenerTodos().subscribe({
      next: (response: any) => {
        this.listas.conveniosDisponibles = response.body || response;
      },
      error: (error) => {
        console.error('Error al obtener convenios:', error);
      }
    });
  }

  // Carga el catálogo de días de la semana desde BD para evitar hardcode
  consultarDiasSemana() {
    this.diaSemanaService.obtenerTodos().subscribe({
      next: (response: any) => {
        this.diasSemana = response.body || [];
      },
      error: (error) => {
        console.error('Error al obtener días de la semana:', error);
        this.diasSemana = [];
      }
    });
  }

  // ============ GRADOS POR GRUPO ============

  onGrupoChange(idGrupo: any) {
    this.model.grado = '';
    this.listas.grados = [];

    if (!idGrupo) {
      return;
    }

    this.gradosXGrupoService.obtenerPorGrupo(idGrupo).subscribe({
      next: (response: any) => {
        const grados = response.body || response;
        this.listas.grados = grados;
        if (grados.length === 1) {
          this.model.grado = grados[0].id_grado;
        }
      },
      error: (error) => {
        console.error('Error al obtener grados del grupo:', error);
        this.listas.grados = [];
      }
    });
  }

  // ============ HORARIOS ============

  cargarHorarios(idEstudiante: any) {
    this.horariosEstudianteService.obtenerPorEstudiante(idEstudiante).subscribe({
      next: (response: any) => {
        const data = response.body || response;
        if (data && data.length > 0) {
          this.horarios = data.map((h: any) => ({
            ...h,
            hora_entrada: h.hora_entrada ? h.hora_entrada.substring(0, 5) : '08:00',
            hora_salida: h.hora_salida ? h.hora_salida.substring(0, 5) : '18:00'
          }));
        } else {
          this.inicializarHorariosDefault(idEstudiante);
        }
        this.horariosModificados = false;
      },
      error: (error) => {
        console.error('Error al cargar horarios:', error);
        this.inicializarHorariosDesdeTabla();
      }
    });
  }

  inicializarHorariosDefault(idEstudiante: any) {
    this.horariosEstudianteService.inicializarDesdeDefault(idEstudiante).subscribe({
      next: () => {
        this.cargarHorarios(idEstudiante);
      },
      error: () => {
        this.inicializarHorariosDesdeTabla();
      }
    });
  }

  /**
   * Inicializa la grilla de horarios usando el catálogo dias_semana cargado del backend.
   * Si aún no está disponible, fuerza una carga sincronizada antes de armar el array.
   */
  inicializarHorariosDesdeTabla() {
    if (this.diasSemana && this.diasSemana.length > 0) {
      this.armarHorariosDesdeDiasSemana();
      return;
    }

    this.diaSemanaService.obtenerTodos().subscribe({
      next: (response: any) => {
        this.diasSemana = response.body || [];
        if (this.diasSemana.length > 0) {
          this.armarHorariosDesdeDiasSemana();
        } else {
          this.armarHorariosFallback();
        }
      },
      error: (error) => {
        console.error('Error al obtener días de la semana para inicializar horarios:', error);
        this.armarHorariosFallback();
      }
    });
  }

  /**
   * Construye el array de horarios usando los valores reales de la tabla dias_semana.
   */
  private armarHorariosDesdeDiasSemana() {
    this.horarios = this.diasSemana.map((d: any) => ({
      id: '',
      id_estudiante: this.model.idEstudiante,
      id_dia_semana: d.id,
      nombre_dia: d.nombre,
      hora_entrada: d.hora_entrada ? d.hora_entrada.substring(0, 5) : '08:00',
      hora_salida: d.hora_salida ? d.hora_salida.substring(0, 5) : '18:00'
    }));
    this.horariosModificados = false;
  }

  /**
   * Fallback técnico mínimo: solo se usa si el endpoint dias_semana falla por completo.
   * Evita dejar la UI sin horarios editables. No es la fuente de verdad.
   */
  private armarHorariosFallback() {
    const ids = [1, 2, 3, 4, 5, 6, 7];
    this.horarios = ids.map(id => ({
      id: '',
      id_estudiante: this.model.idEstudiante,
      id_dia_semana: id,
      nombre_dia: '',
      hora_entrada: '08:00',
      hora_salida: '18:00'
    }));
    this.horariosModificados = false;
  }

  onHorarioChange() {
    this.horariosModificados = true;
  }

  guardarHorarios(idEstudiante: any) {
    const data = {
      id_estudiante: idEstudiante,
      horarios: this.horarios.map(h => ({
        id_dia_semana: h.id_dia_semana,
        hora_entrada: h.hora_entrada + ':00',
        hora_salida: h.hora_salida + ':00'
      }))
    };

    this.horariosEstudianteService.guardarTodos(data).subscribe({
      next: () => {
        this.horariosModificados = false;
        console.log('Horarios guardados correctamente');
      },
      error: (error) => {
        console.error('Error al guardar horarios:', error);
      }
    });
  }

  // ============ CONVENIOS ============

  get conveniosDisponiblesFiltrados(): any[] {
    const idsAsignados = this.conveniosEstudiante.map(c => c.id_convenio);
    return this.listas.conveniosDisponibles.filter((c: any) =>
      !idsAsignados.includes(c.id) && Number(c.activo) === 1
    );
  }

  cargarConvenios(idEstudiante: any) {
    this.conveniosEstudianteService.obtenerPorEstudiante(idEstudiante).subscribe({
      next: (response: any) => {
        this.conveniosEstudiante = response.body || response;
      },
      error: (error) => {
        console.error('Error al cargar convenios:', error);
        this.conveniosEstudiante = [];
      }
    });
  }

  agregarConvenio() {
    if (!this.nuevoConvenio.id_convenio || !this.nuevoConvenio.fecha_inicio || !this.nuevoConvenio.fecha_fin) {
      Swal.fire({
        title: 'Campos incompletos',
        text: 'Seleccione un convenio, fecha de inicio y fecha de fin',
        icon: 'warning',
        confirmButtonText: 'Aceptar'
      });
      return;
    }

    if (this.nuevoConvenio.fecha_fin < this.nuevoConvenio.fecha_inicio) {
      Swal.fire({
        title: 'Error en fechas',
        text: 'La fecha de fin debe ser posterior a la fecha de inicio',
        icon: 'warning',
        confirmButtonText: 'Aceptar'
      });
      return;
    }

    const data = {
      id_estudiante: this.model.idEstudiante,
      id_convenio: this.nuevoConvenio.id_convenio,
      fecha_inicio: this.nuevoConvenio.fecha_inicio,
      fecha_fin: this.nuevoConvenio.fecha_fin,
      crear_cobros_automaticos: this.nuevoConvenio.crear_cobros_automaticos,
      id_usuario: this.utilService.obtenerIdUsuarioActual()
    };

    this.conveniosEstudianteService.crear(data).subscribe({
      next: (respuesta: any) => {
        const res = respuesta.body || respuesta;
        if (res.id) {
          let mensaje = `Convenio "${res.nombre_convenio}" asignado correctamente.`;

          if (res.cuentas_creadas > 0) {
            mensaje += `<br><br>Se generaron <strong>${res.cuentas_creadas}</strong> cuenta(s) por cobrar`;
            mensaje += `<br>Valor mensual: <strong>$${Number(res.valor_mensual).toLocaleString('es-CO')}</strong>`;
            mensaje += `<br>Total generado: <strong>$${Number(res.total_generado).toLocaleString('es-CO')}</strong>`;
          } else if (!this.nuevoConvenio.crear_cobros_automaticos) {
            mensaje += `<br><br><span style="color:#616161;">No se generaron cuentas por cobrar automáticas para este convenio.</span>`;
          }

          if (res.duplicados && res.duplicados.length > 0) {
            mensaje += `<br><br><span style="color:#e65100;">⚠ ${res.duplicados.length} mes(es) ya tenían cuenta y no se duplicaron:</span>`;
            mensaje += '<br>' + res.duplicados.map((d: any) => d.mes).join(', ');
          }

          Swal.fire({
            title: 'Convenio asignado',
            html: mensaje,
            icon: 'success',
            confirmButtonText: 'Entendido'
          });

          this.cargarConvenios(this.model.idEstudiante);
          this.nuevoConvenio = { id_convenio: '', fecha_inicio: '', fecha_fin: '', crear_cobros_automaticos: false };
        }
      },
      error: (error) => {
        console.error('Error al crear convenio:', error);
        Swal.fire('Error', 'No se pudo asignar el convenio', 'error');
      }
    });
  }

  eliminarConvenio(convenio: ConvenioEstudiante) {
    Swal.fire({
      title: '¿Eliminar convenio?',
      html: `¿Desea eliminar el convenio "<strong>${convenio.nombre_convenio}</strong>"?<br><br>
             <span style="color:#e65100;">⚠ Las cuentas por cobrar generadas por este convenio NO se eliminarán automáticamente. 
             Si necesita anularlas, hágalo manualmente desde el módulo de Productos y Servicios del estudiante.</span>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar convenio',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#e74c3c'
    }).then((result) => {
      if (result.isConfirmed) {
        this.conveniosEstudianteService.eliminar(convenio.id).subscribe({
          next: (respuesta: any) => {
            const res = respuesta.body || respuesta;
            let mensaje = 'Convenio eliminado correctamente.';

            if (res.cuentas_pendientes > 0) {
              mensaje = `Convenio eliminado. <br><br><strong>Recuerde:</strong> Existen <strong>${res.cuentas_pendientes}</strong> cuenta(s) por cobrar pendientes del producto "${res.nombre_producto}" que debe gestionar manualmente.`;
            }

            Swal.fire({
              title: 'Convenio eliminado',
              html: mensaje,
              icon: res.cuentas_pendientes > 0 ? 'warning' : 'success',
              confirmButtonText: 'Entendido'
            });
            this.cargarConvenios(this.model.idEstudiante);
          },
          error: (error) => {
            console.error('Error al eliminar convenio:', error);
            Swal.fire('Error', 'No se pudo eliminar el convenio', 'error');
          }
        });
      }
    });
  }

  // ============ DATOS MÉDICOS DINÁMICOS ============

  cargarDatosMedicos(idEstudiante: any) {
    this.datosMedicosService.obtenerTodos().subscribe({
      next: (responseCatalogo: any) => {
        const catalogo = responseCatalogo.body || responseCatalogo;

        this.datosMedicosXEstudianteService.obtenerPorEstudiante(idEstudiante).subscribe({
          next: (responseValores: any) => {
            const valores = responseValores.body || responseValores;
            this.construirGruposDinamicos(catalogo, valores, 'medicos');
          },
          error: () => {
            this.construirGruposDinamicos(catalogo, [], 'medicos');
          }
        });
      },
      error: (error) => {
        console.error('Error al cargar catálogo de datos médicos:', error);
      }
    });
  }

  cargarDatosAdicionales(idEstudiante: any) {
    this.datosAdicionalesService.obtenerTodos().subscribe({
      next: (responseCatalogo: any) => {
        const catalogo = responseCatalogo.body || responseCatalogo;

        this.datosAdicionalesXEstudianteService.obtenerPorEstudiante(idEstudiante).subscribe({
          next: (responseValores: any) => {
            const valores = responseValores.body || responseValores;
            this.construirGruposDinamicos(catalogo, valores, 'adicionales');
          },
          error: () => {
            this.construirGruposDinamicos(catalogo, [], 'adicionales');
          }
        });
      },
      error: (error) => {
        console.error('Error al cargar catálogo de datos adicionales:', error);
      }
    });
  }

  construirGruposDinamicos(catalogo: any[], valores: any[], tipo: 'medicos' | 'adicionales') {
    const campoIdDato = tipo === 'medicos' ? 'id_dato_medico' : 'id_dato_adicional';
    const valoresMap = new Map<number, any>();
    valores.forEach((v: any) => {
      valoresMap.set(Number(v[campoIdDato]), v);
    });

    const gruposMap = new Map<number, GrupoDatosDinamicos>();

    catalogo.forEach((item: any) => {
      const idTipo = tipo === 'medicos' ? item.id_tipo_dato_medico : item.id_tipo_dato_adicional;
      const valor = valoresMap.get(item.id);
      const opciones = item.opciones ? item.opciones.split(',').map((o: string) => o.trim()) : [];

      const dato: DatoDinamico = {
        id_dato: item.id,
        nombre: item.nombre,
        nombre_tipo: item.nombre_tipo,
        id_tipo: idTipo,
        orden_tipo: Number(item.orden_tipo || 0),
        orden_dato: Number(item.orden),
        es_numero: Number(item.es_numero) === 1,
        es_texto: Number(item.es_texto) === 1,
        es_parrafo: Number(item.es_parrafo) === 1,
        es_fecha: Number(item.es_fecha) === 1,
        opciones: opciones,
        valor_numero: valor ? valor.valor_numero : null,
        valor_texto: valor ? (valor.valor_texto || '') : '',
        valor_parrafo: valor ? (valor.valor_parrafo || '') : '',
        valor_fecha: valor ? (valor.valor_fecha || '') : '',
        observacion: valor ? (valor.observacion || '') : '',
      };

      if (!gruposMap.has(idTipo)) {
        gruposMap.set(idTipo, {
          nombre_tipo: item.nombre_tipo,
          icono: item.icono_tipo || '',
          id_tipo: idTipo,
          orden_tipo: Number(item.orden_tipo || 0),
          datos: []
        });
      }
      gruposMap.get(idTipo)!.datos.push(dato);
    });

    const grupos = Array.from(gruposMap.values()).sort((a, b) => a.orden_tipo - b.orden_tipo);
    grupos.forEach(g => g.datos.sort((a, b) => a.orden_dato - b.orden_dato));

    if (tipo === 'medicos') {
      this.gruposDatosMedicos = grupos;
      this.datosMedicosModificados = false;
    } else {
      this.gruposDatosAdicionales = grupos;
      this.datosAdicionalesModificados = false;
    }
  }

  onDatoMedicoChange() {
    this.datosMedicosModificados = true;
  }

  onDatoAdicionalChange() {
    this.datosAdicionalesModificados = true;
  }

  guardarDatosMedicos(idEstudiante: any) {
    const datos: any[] = [];
    this.gruposDatosMedicos.forEach(grupo => {
      grupo.datos.forEach(dato => {
        datos.push({
          id_dato_medico: dato.id_dato,
          valor_numero: dato.es_numero ? dato.valor_numero : null,
          valor_texto: (dato.es_texto && dato.opciones.length > 0) ? dato.valor_texto : (dato.es_texto ? dato.valor_texto : null),
          valor_parrafo: dato.es_parrafo ? dato.valor_parrafo : null,
          valor_fecha: dato.es_fecha ? dato.valor_fecha : null,
          observacion: dato.observacion || null,
        });
      });
    });

    this.datosMedicosXEstudianteService.guardarPorEstudiante(idEstudiante, datos).subscribe({
      next: () => {
        this.datosMedicosModificados = false;
        console.log('Datos médicos guardados correctamente');
      },
      error: (error) => {
        console.error('Error al guardar datos médicos:', error);
      }
    });
  }

  guardarDatosAdicionales(idEstudiante: any) {
    const datos: any[] = [];
    this.gruposDatosAdicionales.forEach(grupo => {
      grupo.datos.forEach(dato => {
        datos.push({
          id_dato_adicional: dato.id_dato,
          valor_numero: dato.es_numero ? dato.valor_numero : null,
          valor_texto: (dato.es_texto && dato.opciones.length > 0) ? dato.valor_texto : (dato.es_texto ? dato.valor_texto : null),
          valor_parrafo: dato.es_parrafo ? dato.valor_parrafo : null,
          valor_fecha: dato.es_fecha ? dato.valor_fecha : null,
          observacion: dato.observacion || null,
        });
      });
    });

    this.datosAdicionalesXEstudianteService.guardarPorEstudiante(idEstudiante, datos).subscribe({
      next: () => {
        this.datosAdicionalesModificados = false;
        console.log('Datos adicionales guardados correctamente');
      },
      error: (error) => {
        console.error('Error al guardar datos adicionales:', error);
      }
    });
  }

  // ============ PERSONA / ESTUDIANTE ============

  consultaPersona(tipoIdentificacion: any, numeroIdentificacion: any) {
    if (!tipoIdentificacion || !numeroIdentificacion) {
      Swal.fire({
        title: 'Campos incompletos',
        text: 'Por favor ingrese tipo y número de documento para verificar',
        icon: 'warning',
        confirmButtonText: 'Aceptar',
      });
      return;
    }

    this.personasService
      .obtenerByIdentificacion(tipoIdentificacion, numeroIdentificacion)
      .subscribe({
        next: (response: any) => {
          if (response.body && response.body.length > 0) {
            const persona = response.body[0];
            this.estudiantesService.verificarDuplicados(persona.id).subscribe({
              next: (respuesta: any) => {
                if (respuesta.existe) {
                  Swal.fire({
                    title: 'Estudiante existente',
                    text: 'Esta persona ya está registrada como estudiante en el sistema',
                    icon: 'warning',
                    confirmButtonText: 'Aceptar',
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
                    confirmButtonText: 'Aceptar',
                  });
                }
              },
              error: (error: any) => {
                console.error('Error al verificar estudiante', error);
                Swal.fire({
                  title: 'Error',
                  text: 'Error al verificar si la persona ya está registrada como estudiante',
                  icon: 'error',
                  confirmButtonText: 'Aceptar',
                });
              },
            });
          } else {
            this.documentoEncontrado = true;
            this.camposHabilitados = true;
            this.inicializarHorariosDesdeTabla();
            Swal.fire({
              title: 'Persona no encontrada',
              text: 'No se encontró ninguna persona con esta identificación. Ahora puede ingresar los datos.',
              icon: 'info',
              confirmButtonText: 'Aceptar',
            });
          }
        },
        error: (error: any) => {
          console.error('Error al consultar persona', error);
          Swal.fire({
            title: 'Error',
            text: 'Error al consultar la persona',
            icon: 'error',
            confirmButtonText: 'Aceptar',
          });
        },
      });
  }

  llenarFormularioPersona(persona: any) {
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
    this.model.rh = persona.rh;
    this.model.ocupacion = 'Estudiante';
  }

  obtenerEstudiante(id: any) {
    if (id && id !== '0') {
      this.estudiantesService.obtenerById(id).subscribe({
        next: (response: any) => {
          const estudiante = response.body[0];
          if (estudiante) {
            this.personasService.obtenerById(estudiante.id_persona).subscribe({
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
                  this.model.rh = persona.rh;
                  this.model.ocupacion = 'Estudiante';
                  const nombreCompleto = this.construirNombreCompleto(persona);
                  if (this.accion === 'editar') {
                    this.titulo = `Editar estudiante: ${nombreCompleto}`;
                  } else if (this.accion === 'consultar') {
                    this.titulo = `Consultar estudiante: ${nombreCompleto}`;
                  }
                }

                this.model.idEstudiante = estudiante.id;
                this.model.fechaIngreso = estudiante.fecha_ingreso;
                this.model.telefonoEmergencia = estudiante.telefono_emergencia;
                this.model.eps = estudiante.eps;
                this.model.alimentacion = Boolean(estudiante.alimentacion);
                this.model.permanente = Boolean(estudiante.permanente);
                this.model.anno = estudiante.anno;
                this.model.activo = estudiante.activo;
                this.estudianteActivoSwitch = estudiante.activo == 1 || estudiante.activo === '1';

                this.obtenerGrupoEstudiante(estudiante.id);
                this.cargarHorarios(estudiante.id);
                this.cargarConvenios(estudiante.id);
                this.cargarDatosMedicos(estudiante.id);
                this.cargarDatosAdicionales(estudiante.id);
              },
              error: (error: any) => {
                console.error('Error al obtener persona', error);
                Swal.fire('Error', 'Error al cargar los datos de la persona', 'error');
              },
            });
          }
        },
        error: (error: any) => {
          console.error('Error al obtener estudiante', error);
          Swal.fire('Error', 'Error al cargar los datos del estudiante', 'error');
        },
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

  cambiarEstadoEstudiante(): void {
    this.model.activo = this.estudianteActivoSwitch ? 1 : 0;
  }

  obtenerGrupoEstudiante(idEstudiante: any) {
    this.estudiantesService.obtenerGrupoByEstudiante(idEstudiante).subscribe({
      next: (response: any) => {
        if (response.body && response.body.length > 0) {
          this.model.grupo = response.body[0].id_grupo;
          this.idEstudianteGrupo = response.body[0].id;
          // Guardar valores originales para luego detectar si el usuario los cambió
          this.grupoOriginal = response.body[0].id_grupo;
          this.gradoOriginal = response.body[0].id_grado;
          // Cargar grados del grupo y setear el grado actual
          const idGradoActual = response.body[0].id_grado;
          this.gradosXGrupoService.obtenerPorGrupo(response.body[0].id_grupo).subscribe({
            next: (respGrados: any) => {
              this.listas.grados = respGrados.body || respGrados;
              if (idGradoActual) {
                this.model.grado = idGradoActual;
              } else if (this.listas.grados.length === 1) {
                this.model.grado = this.listas.grados[0].id_grado;
              }
            },
            error: () => {
              this.listas.grados = [];
            }
          });
        }
      },
      error: (error: any) => {
        console.error('Error al obtener grupo del estudiante', error);
      },
    });
  }

  guardarPersona(persona: any) {
    this.submitted = true;

    if (!this.formularioValido()) {
      Swal.fire({
        title: 'Campos incompletos',
        text: 'Por favor complete los campos obligatorios',
        icon: 'warning',
        confirmButtonText: 'Aceptar',
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
            if (+!response.id) {
              Swal.fire({ title: 'Error', text: 'Error al crear persona', icon: 'error', confirmButtonText: 'Aceptar' });
              return;
            }
            persona.idPersona = response.id;
            this.crearActualizarEstudiante(persona);
          },
          error: (error: any) => {
            console.error('Error al crear persona', error);
            Swal.fire({ title: 'Error', text: 'Error al crear la persona', icon: 'error', confirmButtonText: 'Aceptar' });
          },
        });
      } else {
        this.estudiantesService.verificarDuplicados(persona.idPersona).subscribe({
          next: (respuesta: any) => {
            if (respuesta.existe) {
              Swal.fire({ title: 'Estudiante existente', text: 'Esta persona ya está registrada como estudiante en el sistema', icon: 'warning', confirmButtonText: 'Aceptar' });
              return;
            } else {
              this.crearActualizarEstudiante(persona);
            }
          },
          error: (error: any) => {
            console.error('Error al verificar estudiante', error);
            Swal.fire({ title: 'Error', text: 'Error al verificar si la persona ya está registrada como estudiante', icon: 'error', confirmButtonText: 'Aceptar' });
          },
        });
      }
    }
  }

  actualizarPersona(persona: any) {
    const personaData = this.prepararDatosPersona(persona);
    this.personasService.actualizar(personaData).subscribe({
      next: (response: any) => {
        if (response.error) {
          Swal.fire({ title: 'Error', text: 'Error al actualizar la persona', icon: 'error', confirmButtonText: 'Aceptar' });
          return;
        }
        this.crearActualizarEstudiante(persona);
      },
      error: (error: any) => {
        console.error('Error al actualizar persona', error);
        Swal.fire({ title: 'Error', text: 'Error al actualizar la persona', icon: 'error', confirmButtonText: 'Aceptar' });
      },
    });
  }

  prepararDatosPersona(persona: any) {
    if (!persona.nacionalidad) {
      persona.nacionalidad = 'Colombiana';
    }
    persona.ocupacion = 'Estudiante';

    return {
      id: persona.idPersona || 0,
      primer_nombre: persona.primerNombre,
      segundo_nombre: persona.segundoNombre,
      primer_apellido: persona.primerApellido,
      segundo_apellido: persona.segundoApellido,
      id_tipo_identificacion: persona.tipoIdentificacion,
      numero_identificacion: persona.numeroIdentificacion,
      fecha_nacimiento: persona.fechaNacimiento,
      id_genero: persona.genero === '' ? null : persona.genero,
      direccion: persona.direccion,
      correo_electronico: persona.correoElectronico,
      nacionalidad: persona.nacionalidad,
      telefono: persona.telefono,
      id_ciudad: persona.ciudad === '' ? null : persona.ciudad,
      rh: persona.rh,
      ocupacion: persona.ocupacion,
    };
  }

  crearActualizarEstudiante(estudiante: any) {
    const estudianteData = {
      id: estudiante.idEstudiante || 0,
      id_persona: estudiante.idPersona,
      fecha_ingreso: estudiante.fechaIngreso,
      telefono_emergencia: estudiante.telefonoEmergencia || '',
      eps: estudiante.eps || '',
      alimentacion: estudiante.alimentacion ? 1 : 0,
      permanente: estudiante.permanente ? 1 : 0,
      anno: estudiante.anno || new Date().getFullYear(),
      activo: estudiante.activo,
    };

    if (this.accion === 'crear') {
      this.estudiantesService.crear(estudianteData).subscribe({
        next: (response: any) => {
          estudiante.idEstudiante = response.id;
          this.model.idEstudiante = response.id;
          this.guardarHorarios(response.id);
          this.asignarGrupo(estudiante);
        },
        error: (error: any) => this.manejarError(error, 'crear'),
      });
    } else if (this.accion === 'editar') {
      this.estudiantesService.actualizar(estudianteData).subscribe({
        next: (response: any) => {
          if (this.horariosModificados) {
            this.guardarHorarios(estudiante.idEstudiante);
          }
          if (this.datosMedicosModificados) {
            this.guardarDatosMedicos(estudiante.idEstudiante);
          }
          if (this.datosAdicionalesModificados) {
            this.guardarDatosAdicionales(estudiante.idEstudiante);
          }
          this.asignarGrupo(estudiante);
        },
        error: (error: any) => this.manejarError(error, 'actualizar'),
      });
    }
  }

  asignarGrupo(estudiante: any) {
    if (!estudiante.grupo) {
      Swal.fire({
        title: 'Advertencia',
        text: 'No se ha seleccionado un grupo para el estudiante.',
        icon: 'warning',
        confirmButtonText: 'Aceptar',
      });
      return;
    }

    // En modo editar, si el grupo y el grado no cambiaron respecto a los valores
    // originales, no rotar el registro de estudiantes_x_grupos: solo confirmar éxito.
    if (this.accion === 'editar') {
      const grupoIgual = String(estudiante.grupo) === String(this.grupoOriginal);
      const gradoActual = estudiante.grado || null;
      const gradoOriginal = this.gradoOriginal || null;
      const gradoIgual = String(gradoActual) === String(gradoOriginal);

      if (grupoIgual && gradoIgual) {
        Swal.fire({
          title: 'Éxito',
          text: 'Estudiante actualizado correctamente',
          icon: 'success',
          confirmButtonText: 'Aceptar',
        }).then(() => {
          this.volver();
        });
        return;
      }
    }

    this.estudiantesService
      .inactivarEstudianteGrupo(this.idEstudianteGrupo)
      .subscribe((response: any) => {
        this.estudiantesService
          .activarEstudianteGrupo(estudiante.idEstudiante, estudiante.grupo, estudiante.anno || new Date().getFullYear(), estudiante.grado)
          .subscribe({
            next: (response: any) => {
              Swal.fire({
                title: 'Éxito',
                text: this.accion === 'crear'
                  ? 'Estudiante creado correctamente'
                  : 'Estudiante actualizado correctamente',
                icon: 'success',
                confirmButtonText: 'Aceptar',
              }).then(() => {
                this.volver();
              });
            },
            error: (error: any) => {
              console.error('Error al asignar grupo', error);
              Swal.fire({ title: 'Error', text: 'Error al asignar el grupo al estudiante', icon: 'error', confirmButtonText: 'Aceptar' });
            },
          });
      });
  }

  formularioValido(): boolean {
    return Boolean(
      this.model.tipoIdentificacion &&
      this.model.numeroIdentificacion &&
      this.model.primerNombre &&
      this.model.primerApellido &&
      this.model.fechaNacimiento &&
      this.model.genero &&
      this.model.grupo &&
      this.model.fechaIngreso,
    );
  }

  manejarError(error: any, accion: string): void {
    console.error(`Error al ${accion} estudiante`, error);
    Swal.fire({
      title: 'Error',
      text: `Error al ${accion} el estudiante`,
      icon: 'error',
      confirmButtonText: 'Aceptar',
    });
  }

  limpiarFormulario(): void {
    this.model = {
      idPersona: '',
      tipoIdentificacion: '',
      numeroIdentificacion: '',
      primerNombre: '',
      segundoNombre: '',
      primerApellido: '',
      segundoApellido: '',
      fechaNacimiento: '',
      genero: '',
      direccion: '',
      correoElectronico: '',
      telefono: '',
      nacionalidad: 'Colombiana',
      ciudad: '',
      rh: '',
      ocupacion: 'Estudiante',
      fechaIngreso: '',
      telefonoEmergencia: '',
      eps: '',
      alimentacion: false,
      permanente: false,
      grupo: '',
      grado: '',
      anno: '',
      idEstudiante: '',
      activo: 1,
    };
    this.submitted = false;
    this.documentoEncontrado = false;
    this.camposHabilitados = false;
    this.estudianteActivoSwitch = true;
    this.horarios = [];
    this.conveniosEstudiante = [];
    this.horariosModificados = false;
    this.gruposDatosMedicos = [];
    this.gruposDatosAdicionales = [];
    this.datosMedicosModificados = false;
    this.datosAdicionalesModificados = false;
    this.listas.grados = [];
    this.nuevoConvenio = {
      id_convenio: '',
      fecha_inicio: '',
      fecha_fin: '',
      crear_cobros_automaticos: false
    };
  }

  volver(): void {
    this.router.navigate(['/estudiantes']);
  }

  establecerValoresPorDefecto(): void {
    this.model.nacionalidad = 'Colombiana';
    this.model.ocupacion = 'Estudiante';
    this.model.tipoIdentificacion = 2;
    const hoy = new Date();
    const año = hoy.getFullYear();
    const mes = String(hoy.getMonth() + 1).padStart(2, '0');
    const dia = String(hoy.getDate()).padStart(2, '0');
    this.model.fechaIngreso = `${año}-${mes}-${dia}`;
    this.model.anno = año;
    this.model.activo = 1;
    this.estudianteActivoSwitch = true;
    this.model.alimentacion = false;
    this.model.permanente = false;
    this.nuevoConvenio.fecha_inicio = `${año}-${mes}-${dia}`;
    this.nuevoConvenio.crear_cobros_automaticos = false;
  }

  obtenerNombreCompleto(): string {
    return [
      this.model.primerNombre,
      this.model.segundoNombre,
      this.model.primerApellido,
      this.model.segundoApellido,
    ]
      .filter(Boolean)
      .join(' ');
  }
}