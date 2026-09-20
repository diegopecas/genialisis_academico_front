import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HeaderComponent } from '../../../../common/header/header.component';
import { CursosExtraService } from '../../../../services/cursos-extra.service';
import { ProductosServiciosService } from '../../../../services/productos-servicios.service';
import { ClasificacionProductosServiciosService } from '../../../../services/clasificacion-productos-servicios.service';
import { TiposCobroProductoService } from '../../../../services/tipos-cobro-producto.service';
import { TiposCursosExtracurricularesService } from '../../../../services/tipos-cursos-extracurriculares.service';
import { LugaresCursosExtraService } from '../../../../services/lugares-cursos-extra.service';
import { AreasAcademicasService } from '../../../../services/areas-academicas.service';
import { DiasSemanaService } from '../../../../services/dias-semana.service';
import { HorariosCursosExtraService } from '../../../../services/horarios-cursos-extra.service';
import { TarifasCursosExtraService } from '../../../../services/tarifas-cursos-extra.service';
import { DocentesXCursosExtraService } from '../../../../services/docentes-x-cursos-extra.service';
import { ProveedoresXCursosExtraService } from '../../../../services/proveedores-x-cursos-extra.service';
import { ProveedoresService } from '../../../../services/proveedores.service';
import { CursosExtraXInstitucionesClienteService } from '../../../../services/cursos-extra-x-instituciones-cliente.service';
import { InstitucionConfigService } from '../../../../services/institucion-config.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-crear-curso-extra',
  templateUrl: './crear-curso-extra.component.html',
  styleUrl: './crear-curso-extra.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent]
})
export class CrearCursoExtraComponent implements OnInit {

  titulo = "Crear Curso Extracurricular";
  accion: string = "";
  regresar = '/academico/cursos-extra';
  editable: boolean = true;
  submitted: boolean = false;
  pestanaActiva: string = 'basico';

  menuMovilAbierto: boolean = false;

  model = {
    id: null,
    nombre: '',
    descripcion: '',
    icono: '',
    color: '#3498db',
    cupo_maximo: null,
    fecha_inicio: '',
    fecha_fin: '',
    anio: new Date().getFullYear(),
    activo: 1,
    id_tipo_curso_extracurricular: null,
    id_lugar_curso_extra: null,
    id_area_academica: null,
    permite_sobrecupo: 0,
    cupo_minimo: null,
    fecha_limite_inscripcion: '',
    edad_minima_meses: null,
    edad_maxima_meses: null
  } as any;

  /* La edad se guarda en meses, pero se pide en anios y meses porque nadie
     dice "de 24 a 72 meses". La conversion se hace al cargar y al guardar. */
  edadMinimaAnios: any = null;
  edadMinimaMesesResto: any = null;
  edadMaximaAnios: any = null;
  edadMaximaMesesResto: any = null;

  // Catalogos del tab de Datos Basicos
  tiposCursoExtra: any[] = [];
  lugaresCursoExtra: any[] = [];
  areasExtracurriculares: any[] = [];

  // Modal de imágenes
  mostrarModalImagenes: boolean = false;
  imagenesDisponibles: any[] = [];
  imagenesFiltradas: any[] = [];
  busquedaImagen: string = '';

  // Horarios
  diasSemana: any[] = [];
  horariosCurso: any[] = [];
  mostrarModalHorario: boolean = false;
  horarioModal = {
    id: null,
    id_dia_semana: null,
    hora_inicial: '',
    hora_final: '',
    total_minutos: 0
  } as any;

  // Docentes
  docentesCurso: any[] = [];
  docentesDisponibles: any[] = [];
  idDocenteSeleccionado: any = null;
  esTitularSeleccionado: boolean = false;

  // Proveedores
  proveedoresCurso: any[] = [];
  proveedoresDisponibles: any[] = [];
  idProveedorSeleccionado: any = null;

  // Clientes institucionales (convenios). El horario, el lugar y el cupo
  // siguen siendo del curso y se comparten entre todos sus convenios; lo
  // unico propio del convenio es quien paga.
  conveniosCurso: any[] = [];
  institucionesDisponibles: any[] = [];
  idInstitucionSeleccionada: any = null;
  pagaInstitucionSeleccionada: boolean = false;

  // Convenio cuya tarifa se esta editando en el tab de Tarifas. null = la
  // tarifa interna del jardin, que es la que existia antes.
  idInstitucionTarifa: any = null;

  // Tarifas
  tarifasCurso: any[] = [];
  productosMatricula: any[] = [];
  productosPension: any[] = [];
  productosUnico: any[] = [];
  aniosEscolares: number[] = [];
  anioTarifa: number = new Date().getFullYear();
  valorMatriculaFormateado: string = '';
  valorPensionFormateado: string = '';
  valorUnicoFormateado: string = '';
  tarifaActual: any = {
    id: null,
    id_curso_extra: null,
    id_producto_matricula: null,
    valor_matricula: 0,
    cuotas_matricula: 1,
    id_producto_pension: null,
    valor_pension: 0,
    id_producto_unico: null,
    valor_unico: 0,
    cuotas_unico: 1,
    anio: new Date().getFullYear()
  };

  /* Creación rápida de producto desde el tab de Tarifas.
     El producto nace siempre con clasificación Extra académico; la periodicidad
     y el tipo de cobro los define la sección desde donde se abrió el modal. */
  mostrarModalProducto: boolean = false;
  guardandoProducto: boolean = false;
  tipoProductoModal: string = '';
  idClasificacionExtraAcademico: any = null;
  tiposCobro: any[] = [];
  valorSugeridoProductoFormateado: string = '';
  productoModal = {
    nombre: '',
    detalles: '',
    valor_sugerido: 0
  } as any;

  /* Periodicidades con las que se filtra cada select de producto en este tab:
     1 Anual (matrícula), 2 Mensual (pensión), 4 Único (cobro único). */
  private readonly periodicidadPorTipo: any = {
    matricula: 1,
    pension: 2,
    unico: 4
  };

  /* Tipo de cobro del producto según la sección. El cobro único no tiene
     equivalente propio en tipos_cobro_producto, por eso va como OTRO. */
  private readonly codigoTipoCobroPorTipo: any = {
    matricula: 'MATRICULA',
    pension: 'PENSION',
    unico: 'OTRO'
  };

  constructor(
    private cursosExtraService: CursosExtraService,
    private productosServiciosService: ProductosServiciosService,
    private clasificacionProductosServiciosService: ClasificacionProductosServiciosService,
    private tiposCobroProductoService: TiposCobroProductoService,
    private tiposCursosExtracurricularesService: TiposCursosExtracurricularesService,
    private lugaresCursosExtraService: LugaresCursosExtraService,
    private areasAcademicasService: AreasAcademicasService,
    private diasSemanaService: DiasSemanaService,
    private horariosCursosExtraService: HorariosCursosExtraService,
    private tarifasCursosExtraService: TarifasCursosExtraService,
    private docentesXCursosExtraService: DocentesXCursosExtraService,
    private proveedoresXCursosExtraService: ProveedoresXCursosExtraService,
    private proveedoresService: ProveedoresService,
    private cursosExtraXInstitucionesClienteService: CursosExtraXInstitucionesClienteService,
    private institucionConfigService: InstitucionConfigService,
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.accion = params['accion'];
      const id = params['id'];

      if (this.accion === 'crear') {
        this.titulo = "Crear Curso Extracurricular";
        this.editable = true;
      } else if (this.accion === 'editar') {
        this.titulo = "Editar Curso Extracurricular";
        this.editable = true;
        this.cargarCurso(id);
        this.cargarHorarios(id);
        this.cargarDocentes(id);
        this.cargarProveedoresCurso(id);
        this.cargarConvenios(id);
        this.cargarInstitucionesDisponibles(id);
        this.cargarTarifas(id);
        this.cargarProductosTarifas();
        this.cargarCatalogosProducto();
        this.cargarAniosEscolares();
      } else if (this.accion === 'consultar') {
        this.titulo = "Consultar Curso Extracurricular";
        this.editable = false;
        this.cargarCurso(id);
        this.cargarHorarios(id);
        this.cargarDocentes(id);
        this.cargarProveedoresCurso(id);
        this.cargarConvenios(id);
        this.cargarTarifas(id);
      }
    });

    this.cargarDiasSemana();
    this.cargarImagenes();
    this.cargarDocentesDisponibles();
    this.cargarProveedoresDisponibles();
    this.cargarTiposCursoExtra();
    this.cargarLugaresCursoExtra();
    this.cargarAreasExtracurriculares();
  }

  // ==================== DATOS BASICOS ====================

  cargarCurso(id: any) {
    this.cursosExtraService.obtenerById(id).subscribe({
      next: (response: any) => {
        const body = response.body;
        if (body && body.length > 0) {
          this.model = body[0];
          // Los inputs de tipo date y number no aceptan null: se normalizan aqui.
          this.model.fecha_limite_inscripcion = this.model.fecha_limite_inscripcion || '';
          this.model.permite_sobrecupo = this.model.permite_sobrecupo ? 1 : 0;
          this.desglosarEdades();
          if (this.accion === 'editar') {
            this.titulo = `Editar Curso: ${this.model.nombre}`;
          } else if (this.accion === 'consultar') {
            this.titulo = `Consultar Curso: ${this.model.nombre}`;
          }
        }
      },
      error: (error: any) => {
        console.error("Error al cargar curso", error);
        Swal.fire('Error', 'No se pudo cargar el curso', 'error');
      }
    });
  }

  // Solo activos: el catalogo completo se administra en Datos Maestros.
  cargarTiposCursoExtra() {
    this.tiposCursosExtracurricularesService.obtenerActivos().subscribe({
      next: (response: any) => {
        this.tiposCursoExtra = response.body || [];
      },
      error: (error: any) => {
        console.error("Error al cargar tipos de curso extracurricular", error);
      }
    });
  }

  /* El area academica es la materia del curso: de ella cuelgan los logros, los
     indicadores y las actividades que luego se califican. Solo se ofrecen las
     marcadas como extracurriculares. */
  cargarAreasExtracurriculares() {
    this.areasAcademicasService.obtenerExtracurriculares().subscribe({
      next: (response: any) => {
        this.areasExtracurriculares = response.body || [];
      },
      error: (error: any) => {
        console.error("Error al cargar áreas extracurriculares", error);
      }
    });
  }

  cargarLugaresCursoExtra() {
    this.lugaresCursosExtraService.obtenerActivos().subscribe({
      next: (response: any) => {
        this.lugaresCursoExtra = response.body || [];
      },
      error: (error: any) => {
        console.error("Error al cargar lugares de cursos extracurriculares", error);
      }
    });
  }

  /* Parte los meses guardados en anios + meses para mostrarlos en el formulario. */
  desglosarEdades() {
    if (this.model.edad_minima_meses !== null && this.model.edad_minima_meses !== undefined && this.model.edad_minima_meses !== '') {
      const total = parseInt(this.model.edad_minima_meses);
      this.edadMinimaAnios = Math.floor(total / 12);
      this.edadMinimaMesesResto = total % 12;
    } else {
      this.edadMinimaAnios = null;
      this.edadMinimaMesesResto = null;
    }

    if (this.model.edad_maxima_meses !== null && this.model.edad_maxima_meses !== undefined && this.model.edad_maxima_meses !== '') {
      const total = parseInt(this.model.edad_maxima_meses);
      this.edadMaximaAnios = Math.floor(total / 12);
      this.edadMaximaMesesResto = total % 12;
    } else {
      this.edadMaximaAnios = null;
      this.edadMaximaMesesResto = null;
    }
  }

  /* Convierte anios + meses al total en meses que espera la base.
     Devuelve null si los dos campos estan vacios: asi la edad no se valida. */
  calcularMeses(anios: any, meses: any): number | null {
    const a = anios === null || anios === undefined || anios === '' ? null : parseInt(anios);
    const m = meses === null || meses === undefined || meses === '' ? null : parseInt(meses);

    if (a === null && m === null) {
      return null;
    }
    return (a || 0) * 12 + (m || 0);
  }

  // Texto de apoyo bajo los campos, para que se vea el total que se va a guardar.
  get totalEdadMinima(): number | null {
    return this.calcularMeses(this.edadMinimaAnios, this.edadMinimaMesesResto);
  }

  get totalEdadMaxima(): number | null {
    return this.calcularMeses(this.edadMaximaAnios, this.edadMaximaMesesResto);
  }

  cargarImagenes() {
    this.http.get<any>('assets/data/imagenes-cursos-extra.json').subscribe({
      next: (data: any) => {
        this.imagenesDisponibles = data.imagenes;
        this.imagenesFiltradas = data.imagenes;
      },
      error: (error: any) => {
        console.error("Error al cargar imágenes", error);
      }
    });
  }

  abrirModalImagenes() {
    this.mostrarModalImagenes = true;
    this.busquedaImagen = '';
    this.imagenesFiltradas = this.imagenesDisponibles;
  }

  cerrarModalImagenes() {
    this.mostrarModalImagenes = false;
  }

  seleccionarImagen(imagen: any) {
    this.model.icono = imagen.ruta;
    this.cerrarModalImagenes();
  }

  filtrarImagenes() {
    if (!this.busquedaImagen) {
      this.imagenesFiltradas = this.imagenesDisponibles;
    } else {
      this.imagenesFiltradas = this.imagenesDisponibles.filter((img: any) =>
        img.nombre.toLowerCase().includes(this.busquedaImagen.toLowerCase())
      );
    }
  }

  guardar() {
    this.submitted = true;

    if (!this.model.nombre || this.model.nombre.trim() === '') {
      Swal.fire('Advertencia', 'El nombre del curso es obligatorio', 'warning');
      return;
    }

    if (!this.model.fecha_inicio) {
      Swal.fire('Advertencia', 'La fecha de inicio es obligatoria', 'warning');
      return;
    }

    if (!this.model.fecha_fin) {
      Swal.fire('Advertencia', 'La fecha de fin es obligatoria', 'warning');
      return;
    }

    if (this.model.fecha_inicio > this.model.fecha_fin) {
      Swal.fire('Advertencia', 'La fecha de inicio no puede ser mayor a la fecha de fin', 'warning');
      return;
    }

    if (this.model.cupo_minimo && this.model.cupo_maximo &&
        parseInt(this.model.cupo_minimo) > parseInt(this.model.cupo_maximo)) {
      Swal.fire('Advertencia', 'El cupo mínimo no puede ser mayor al cupo máximo', 'warning');
      return;
    }

    const edadMinima = this.calcularMeses(this.edadMinimaAnios, this.edadMinimaMesesResto);
    const edadMaxima = this.calcularMeses(this.edadMaximaAnios, this.edadMaximaMesesResto);

    if (edadMinima !== null && edadMaxima !== null && edadMinima > edadMaxima) {
      Swal.fire('Advertencia', 'La edad mínima no puede ser mayor a la edad máxima', 'warning');
      return;
    }

    const data = {
      nombre: this.model.nombre.trim(),
      descripcion: this.model.descripcion ? this.model.descripcion.trim() : '',
      icono: this.model.icono || '',
      color: this.model.color || '#3498db',
      cupo_maximo: this.model.cupo_maximo ? parseInt(this.model.cupo_maximo) : null,
      fecha_inicio: this.model.fecha_inicio,
      fecha_fin: this.model.fecha_fin,
      anio: parseInt(this.model.anio),
      activo: this.model.activo,
      id_tipo_curso_extracurricular: this.model.id_tipo_curso_extracurricular ? this.model.id_tipo_curso_extracurricular : null,
      id_lugar_curso_extra: this.model.id_lugar_curso_extra ? this.model.id_lugar_curso_extra : null,
      id_area_academica: this.model.id_area_academica ? this.model.id_area_academica : null,
      permite_sobrecupo: this.model.permite_sobrecupo ? 1 : 0,
      cupo_minimo: this.model.cupo_minimo ? parseInt(this.model.cupo_minimo) : null,
      fecha_limite_inscripcion: this.model.fecha_limite_inscripcion ? this.model.fecha_limite_inscripcion : null,
      edad_minima_meses: edadMinima,
      edad_maxima_meses: edadMaxima
    } as any;

    if (this.accion === 'crear') {
      this.cursosExtraService.crear(data).subscribe({
        next: (response: any) => {
          Swal.fire('Éxito', 'Curso creado correctamente', 'success');
          this.router.navigate(['/academico/cursos-extra/editar/' + response.id]);
        },
        error: (error: any) => {
          console.error("Error al crear curso", error);
          Swal.fire('Error', 'No se pudo crear el curso', 'error');
        }
      });
    } else if (this.accion === 'editar') {
      data.id = this.model.id;
      this.cursosExtraService.actualizar(data).subscribe({
        next: (response: any) => {
          Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: 'Curso actualizado',
            showConfirmButton: false,
            timer: 2000
          });
        },
        error: (error: any) => {
          console.error("Error al actualizar curso", error);
          Swal.fire('Error', 'No se pudo actualizar el curso', 'error');
        }
      });
    }
  }

  volver() {
    this.router.navigate(['/academico/cursos-extra']);
  }

  // ==================== PESTAÑAS ====================

  cambiarPestana(pestana: string) {
    this.pestanaActiva = pestana;
    this.menuMovilAbierto = false;
  }

  toggleMenuMovil() {
    this.menuMovilAbierto = !this.menuMovilAbierto;
  }

  getNombrePestana(): string {
    const nombres: any = {
      'basico': 'Datos Básicos',
      'horarios': 'Horarios',
      'responsables': 'Docentes y Proveedores',
      'clientes': 'Clientes Institucionales',
      'tarifas': 'Tarifas'
    };
    return nombres[this.pestanaActiva] || '';
  }

  getIconoPestana(): string {
    const iconos: any = {
      'basico': 'fas fa-info-circle',
      'horarios': 'fas fa-clock',
      'responsables': 'fas fa-chalkboard-teacher',
      'clientes': 'fas fa-school',
      'tarifas': 'fas fa-dollar-sign'
    };
    return iconos[this.pestanaActiva] || '';
  }

  // ==================== HORARIOS ====================

  cargarDiasSemana() {
    this.diasSemanaService.obtenerTodos().subscribe({
      next: (response: any) => {
        this.diasSemana = response.body || [];
      },
      error: (error: any) => {
        console.error("Error al cargar días de la semana", error);
      }
    });
  }

  cargarHorarios(id: any) {
    this.horariosCursosExtraService.obtenerByCurso(id).subscribe({
      next: (response: any) => {
        this.horariosCurso = response.body || [];
      },
      error: (error: any) => {
        console.error("Error al cargar horarios", error);
      }
    });
  }

  abrirModalHorario() {
    this.horarioModal = {
      id: null,
      id_dia_semana: null,
      hora_inicial: '',
      hora_final: '',
      total_minutos: 0
    };
    this.mostrarModalHorario = true;
  }

  cerrarModalHorario() {
    this.mostrarModalHorario = false;
  }

  calcularMinutos() {
    if (this.horarioModal.hora_inicial && this.horarioModal.hora_final) {
      const [hi, mi] = this.horarioModal.hora_inicial.split(':').map(Number);
      const [hf, mf] = this.horarioModal.hora_final.split(':').map(Number);
      this.horarioModal.total_minutos = (hf * 60 + mf) - (hi * 60 + mi);
    }
  }

  guardarHorario() {
    if (!this.horarioModal.id_dia_semana) {
      Swal.fire('Advertencia', 'Debe seleccionar un día', 'warning');
      return;
    }
    if (!this.horarioModal.hora_inicial || !this.horarioModal.hora_final) {
      Swal.fire('Advertencia', 'Debe ingresar hora inicial y final', 'warning');
      return;
    }
    if (this.horarioModal.hora_inicial >= this.horarioModal.hora_final) {
      Swal.fire('Advertencia', 'La hora inicial debe ser menor a la hora final', 'warning');
      return;
    }

    this.calcularMinutos();

    const data = {
      id_curso_extra: this.model.id,
      id_dia_semana: parseInt(this.horarioModal.id_dia_semana),
      hora_inicial: this.horarioModal.hora_inicial,
      hora_final: this.horarioModal.hora_final,
      total_minutos: this.horarioModal.total_minutos
    } as any;

    if (this.horarioModal.id) {
      data.id = this.horarioModal.id;
      this.horariosCursosExtraService.actualizar(data).subscribe({
        next: () => {
          Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Horario actualizado', showConfirmButton: false, timer: 2000 });
          this.cargarHorarios(this.model.id);
          this.cerrarModalHorario();
        },
        error: (error: any) => {
          console.error("Error al actualizar horario", error);
          Swal.fire('Error', 'No se pudo actualizar el horario', 'error');
        }
      });
    } else {
      this.horariosCursosExtraService.crear(data).subscribe({
        next: () => {
          Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Horario creado', showConfirmButton: false, timer: 2000 });
          this.cargarHorarios(this.model.id);
          this.cerrarModalHorario();
        },
        error: (error: any) => {
          console.error("Error al crear horario", error);
          Swal.fire('Error', 'No se pudo crear el horario', 'error');
        }
      });
    }
  }

  editarHorario(horario: any) {
    this.horarioModal = { ...horario };
    this.mostrarModalHorario = true;
  }

  async eliminarHorario(horario: any) {
    const result = await Swal.fire({
      title: '¿Eliminar horario?',
      text: `${horario.nombre_dia}: ${horario.hora_inicial} - ${horario.hora_final}`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });
    if (result.isConfirmed) {
      this.horariosCursosExtraService.eliminar({ id: horario.id }).subscribe({
        next: () => {
          this.cargarHorarios(this.model.id);
        },
        error: (error: any) => {
          console.error("Error al eliminar horario", error);
          Swal.fire('Error', 'No se pudo eliminar el horario', 'error');
        }
      });
    }
  }

  // ==================== DOCENTES ====================

  cargarDocentesDisponibles() {
    this.http.get<any>(environment.api + 'docentes', { observe: 'response' }).subscribe({
      next: (response: any) => {
        this.docentesDisponibles = (response.body || []).filter((d: any) => d.activo == 1);
      },
      error: (error: any) => {
        console.error("Error al cargar docentes", error);
      }
    });
  }

  cargarDocentes(id: any) {
    this.docentesXCursosExtraService.obtenerByCurso(id).subscribe({
      next: (response: any) => {
        this.docentesCurso = response.body || [];
      },
      error: (error: any) => {
        console.error("Error al cargar docentes del curso", error);
      }
    });
  }

  agregarDocente() {
    if (!this.idDocenteSeleccionado) {
      Swal.fire('Advertencia', 'Debe seleccionar un docente', 'warning');
      return;
    }

    const yaExiste = this.docentesCurso.find((d: any) => d.id_docente == this.idDocenteSeleccionado);
    if (yaExiste) {
      Swal.fire('Advertencia', 'El docente ya está asignado a este curso', 'warning');
      return;
    }

    const data = {
      id_docente: this.idDocenteSeleccionado,
      id_curso_extra: this.model.id,
      es_titular: this.esTitularSeleccionado ? 1 : 0
    };

    this.docentesXCursosExtraService.crear(data).subscribe({
      next: () => {
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Docente asignado', showConfirmButton: false, timer: 2000 });
        this.cargarDocentes(this.model.id);
        this.idDocenteSeleccionado = null;
        this.esTitularSeleccionado = false;
      },
      error: (error: any) => {
        console.error("Error al asignar docente", error);
        Swal.fire('Error', 'No se pudo asignar el docente', 'error');
      }
    });
  }

  async eliminarDocente(docente: any) {
    const result = await Swal.fire({
      title: '¿Quitar docente?',
      text: `¿Desea quitar a ${docente.nombre_completo} del curso?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, quitar',
      cancelButtonText: 'Cancelar'
    });
    if (result.isConfirmed) {
      this.docentesXCursosExtraService.eliminar({ id: docente.id }).subscribe({
        next: () => {
          this.cargarDocentes(this.model.id);
        },
        error: (error: any) => {
          console.error("Error al quitar docente", error);
          Swal.fire('Error', 'No se pudo quitar el docente', 'error');
        }
      });
    }
  }

  // ==================== PROVEEDORES ====================

  cargarProveedoresDisponibles() {
    this.proveedoresService.obtenerActivos().subscribe({
      next: (response: any) => {
        this.proveedoresDisponibles = response.body || [];
      },
      error: (error: any) => {
        console.error("Error al cargar proveedores", error);
      }
    });
  }

  cargarProveedoresCurso(id: any) {
    this.proveedoresXCursosExtraService.obtenerByCurso(id).subscribe({
      next: (response: any) => {
        this.proveedoresCurso = response.body || [];
      },
      error: (error: any) => {
        console.error("Error al cargar proveedores del curso", error);
      }
    });
  }

  agregarProveedor() {
    if (!this.idProveedorSeleccionado) {
      Swal.fire('Advertencia', 'Debe seleccionar un proveedor', 'warning');
      return;
    }

    const yaExiste = this.proveedoresCurso.find((p: any) => p.id_proveedor == this.idProveedorSeleccionado);
    if (yaExiste) {
      Swal.fire('Advertencia', 'El proveedor ya está asignado a este curso', 'warning');
      return;
    }

    const data = {
      id_proveedor: this.idProveedorSeleccionado,
      id_curso_extra: this.model.id
    };

    this.proveedoresXCursosExtraService.crear(data).subscribe({
      next: () => {
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Proveedor asignado', showConfirmButton: false, timer: 2000 });
        this.cargarProveedoresCurso(this.model.id);
        this.idProveedorSeleccionado = null;
      },
      error: (error: any) => {
        console.error("Error al asignar proveedor", error);
        Swal.fire('Error', 'No se pudo asignar el proveedor', 'error');
      }
    });
  }

  async eliminarProveedor(proveedor: any) {
    const result = await Swal.fire({
      title: '¿Quitar proveedor?',
      text: `¿Desea quitar a ${proveedor.nombre_completo} del curso?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, quitar',
      cancelButtonText: 'Cancelar'
    });
    if (result.isConfirmed) {
      this.proveedoresXCursosExtraService.eliminar({ id: proveedor.id }).subscribe({
        next: () => {
          this.cargarProveedoresCurso(this.model.id);
        },
        error: (error: any) => {
          console.error("Error al quitar proveedor", error);
          Swal.fire('Error', 'No se pudo quitar el proveedor', 'error');
        }
      });
    }
  }

  // ==================== TARIFAS ====================

  /* alTerminar permite encadenar una acción después de refrescar las listas
     (se usa al crear un producto desde el modal para dejarlo seleccionado). */
  cargarProductosTarifas(alTerminar?: () => void) {
    this.productosServiciosService.obtenerTodos().subscribe({
      next: (response: any) => {
        const productos = response.body || [];
        this.productosMatricula = productos.filter((p: any) =>
          p.clasificacion_codigo === 'EXTRA_ACADEMICO' && p.id_periodicidad_cobro == 1
        );
        this.productosPension = productos.filter((p: any) =>
          p.clasificacion_codigo === 'EXTRA_ACADEMICO' && p.id_periodicidad_cobro == 2
        );
        this.productosUnico = productos.filter((p: any) =>
          p.clasificacion_codigo === 'EXTRA_ACADEMICO' && p.id_periodicidad_cobro == 4
        );
        if (alTerminar) {
          alTerminar();
        }
      },
      error: (error: any) => {
        console.error("Error al cargar productos para tarifas", error);
      }
    });
  }

  // ==================== CLIENTES INSTITUCIONALES ====================

  cargarConvenios(id: any) {
    this.cursosExtraXInstitucionesClienteService.obtenerPorCurso(id).subscribe({
      next: (response: any) => {
        this.conveniosCurso = response.body || [];
      },
      error: (error: any) => {
        console.error("Error al cargar los convenios del curso", error);
      }
    });
  }

  cargarInstitucionesDisponibles(id: any) {
    this.cursosExtraXInstitucionesClienteService.obtenerDisponibles(id).subscribe({
      next: (response: any) => {
        this.institucionesDisponibles = response.body || [];
      },
      error: (error: any) => {
        console.error("Error al cargar las instituciones disponibles", error);
      }
    });
  }

  agregarConvenio() {
    if (!this.idInstitucionSeleccionada) {
      Swal.fire('Advertencia', 'Debe seleccionar una institución', 'warning');
      return;
    }

    const data = {
      id_curso_extra: this.model.id,
      id_institucion_cliente: this.idInstitucionSeleccionada,
      paga_institucion: this.pagaInstitucionSeleccionada ? 1 : 0
    };

    this.cursosExtraXInstitucionesClienteService.crear(data).subscribe({
      next: () => {
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Institución asociada', showConfirmButton: false, timer: 2000 });
        this.cargarConvenios(this.model.id);
        this.cargarInstitucionesDisponibles(this.model.id);
        this.idInstitucionSeleccionada = null;
        this.pagaInstitucionSeleccionada = false;
      },
      error: (error: any) => {
        console.error("Error al asociar la institución", error);
        const mensaje = error?.error?.error || 'No se pudo asociar la institución';
        Swal.fire('Error', mensaje, 'error');
      }
    });
  }

  // Cambia quien paga o el estado del convenio. Se dispara desde los
  // controles de la fila, por eso guarda de una sin boton aparte.
  actualizarConvenio(convenio: any) {
    const data = {
      id: convenio.id,
      paga_institucion: convenio.paga_institucion ? 1 : 0,
      observaciones: convenio.observaciones || null,
      activo: convenio.activo ? 1 : 0
    };

    this.cursosExtraXInstitucionesClienteService.actualizar(data).subscribe({
      next: () => {
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Convenio actualizado', showConfirmButton: false, timer: 2000 });
        this.cargarConvenios(this.model.id);
      },
      error: (error: any) => {
        console.error("Error al actualizar el convenio", error);
        const mensaje = error?.error?.error || 'No se pudo actualizar el convenio';
        Swal.fire('Error', mensaje, 'error');
        this.cargarConvenios(this.model.id);
      }
    });
  }

  async eliminarConvenio(convenio: any) {
    const result = await Swal.fire({
      title: '¿Está seguro?',
      text: `Se va a quitar el convenio con ${convenio.nombre_institucion}. Si tiene tarifa propia, también se borra.`,
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

    this.cursosExtraXInstitucionesClienteService.eliminar(convenio.id).subscribe({
      next: () => {
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Convenio eliminado', showConfirmButton: false, timer: 2000 });
        this.cargarConvenios(this.model.id);
        this.cargarInstitucionesDisponibles(this.model.id);
        // La tarifa del convenio se borro con el, asi que hay que recargarlas
        // y volver a la interna si era la que se estaba viendo.
        if (this.idInstitucionTarifa === convenio.id_institucion_cliente) {
          this.idInstitucionTarifa = null;
        }
        this.cargarTarifas(this.model.id);
      },
      error: (error: any) => {
        console.error("Error al eliminar el convenio", error);
        const mensaje = error?.error?.error || 'No se pudo eliminar el convenio';
        Swal.fire('Error', mensaje, 'error');
      }
    });
  }

  // ==================== TARIFAS ====================

  cargarTarifas(id: any) {
    this.tarifasCursosExtraService.obtenerByCurso(id).subscribe({
      next: (response: any) => {
        this.tarifasCurso = response.body || [];
        this.seleccionarTarifaAnio();
      },
      error: (error: any) => {
        console.error("Error al cargar tarifas", error);
      }
    });
  }

  cargarAniosEscolares() {
    const annos = this.institucionConfigService.getAnnosEscolares();
    this.aniosEscolares = annos.map((a: any) => a.id);
    if (this.aniosEscolares.length > 0 && !this.anioTarifa) {
      this.anioTarifa = this.aniosEscolares[0];
    }
  }

  // La tarifa se busca por anio y por convenio: idInstitucionTarifa en null
  // es la interna del jardin, que es la que guarda id_institucion_cliente
  // nulo en la base.
  seleccionarTarifaAnio() {
    const tarifaExistente = this.tarifasCurso.find(t =>
      t.anio == this.anioTarifa &&
      (t.id_institucion_cliente || null) === (this.idInstitucionTarifa || null)
    );
    if (tarifaExistente) {
      this.tarifaActual = { ...tarifaExistente };
    } else {
      this.tarifaActual = {
        id: null,
        id_curso_extra: this.model.id,
        id_institucion_cliente: this.idInstitucionTarifa,
        id_producto_matricula: null,
        valor_matricula: 0,
        cuotas_matricula: 1,
        id_producto_pension: null,
        valor_pension: 0,
        id_producto_unico: null,
        valor_unico: 0,
        cuotas_unico: 1,
        anio: this.anioTarifa
      };
    }
    this.valorMatriculaFormateado = this.formatearNumero(this.tarifaActual.valor_matricula);
    this.valorPensionFormateado = this.formatearNumero(this.tarifaActual.valor_pension);
    this.valorUnicoFormateado = this.formatearNumero(this.tarifaActual.valor_unico);
  }

  onAnioTarifaChange() {
    this.tarifaActual.anio = this.anioTarifa;
    this.seleccionarTarifaAnio();
  }

  // Cambia el convenio cuya tarifa se edita. No guarda nada: solo trae la
  // tarifa que ya exista para ese convenio y anio, o deja el formulario en
  // blanco para crearla.
  onConvenioTarifaChange() {
    this.seleccionarTarifaAnio();
  }

  // Nombre del convenio que se esta editando, para el encabezado del tab.
  getNombreConvenioTarifa(): string {
    if (!this.idInstitucionTarifa) {
      return 'Tarifa interna del jardín';
    }
    const convenio = this.conveniosCurso.find((c: any) => c.id_institucion_cliente === this.idInstitucionTarifa);
    return convenio ? convenio.nombre_institucion : '';
  }

  formatearNumero(valor: number): string {
    if (!valor || valor === 0) return '';
    return valor.toLocaleString('es-CO');
  }

  onValorMatriculaInput(event: any) {
    let valor = event.target.value.replace(/\./g, '').replace(/\D/g, '');
    this.tarifaActual.valor_matricula = valor ? parseInt(valor) : 0;
    if (this.tarifaActual.valor_matricula > 0) {
      event.target.value = this.tarifaActual.valor_matricula.toLocaleString('es-CO');
    } else {
      event.target.value = '';
    }
  }

  onValorPensionInput(event: any) {
    let valor = event.target.value.replace(/\./g, '').replace(/\D/g, '');
    this.tarifaActual.valor_pension = valor ? parseInt(valor) : 0;
    if (this.tarifaActual.valor_pension > 0) {
      event.target.value = this.tarifaActual.valor_pension.toLocaleString('es-CO');
    } else {
      event.target.value = '';
    }
  }

  onProductoMatriculaChange() {
    if (this.tarifaActual.id_producto_matricula) {
      const producto = this.productosMatricula.find((p: any) => p.id == this.tarifaActual.id_producto_matricula);
      if (producto && producto.valor_sugerido) {
        this.tarifaActual.valor_matricula = producto.valor_sugerido;
        this.valorMatriculaFormateado = this.formatearNumero(this.tarifaActual.valor_matricula);
      }
    } else {
      this.tarifaActual.valor_matricula = 0;
      this.valorMatriculaFormateado = '';
    }
  }

  onProductoPensionChange() {
    if (this.tarifaActual.id_producto_pension) {
      const producto = this.productosPension.find((p: any) => p.id == this.tarifaActual.id_producto_pension);
      if (producto && producto.valor_sugerido) {
        this.tarifaActual.valor_pension = producto.valor_sugerido;
        this.valorPensionFormateado = this.formatearNumero(this.tarifaActual.valor_pension);
      }
    } else {
      this.tarifaActual.valor_pension = 0;
      this.valorPensionFormateado = '';
    }
  }

  onProductoUnicoChange() {
    if (this.tarifaActual.id_producto_unico) {
      const producto = this.productosUnico.find((p: any) => p.id == this.tarifaActual.id_producto_unico);
      if (producto && producto.valor_sugerido) {
        this.tarifaActual.valor_unico = producto.valor_sugerido;
        this.valorUnicoFormateado = this.formatearNumero(this.tarifaActual.valor_unico);
      }
    } else {
      this.tarifaActual.valor_unico = 0;
      this.valorUnicoFormateado = '';
    }
  }

  onValorUnicoInput(event: any) {
    let valor = event.target.value.replace(/\./g, '').replace(/\D/g, '');
    this.tarifaActual.valor_unico = valor ? parseInt(valor) : 0;
    if (this.tarifaActual.valor_unico > 0) {
      event.target.value = this.tarifaActual.valor_unico.toLocaleString('es-CO');
    } else {
      event.target.value = '';
    }
  }

  guardarTarifa() {
    const data = {
      id_curso_extra: this.model.id,
      id_producto_matricula: this.tarifaActual.id_producto_matricula ? this.tarifaActual.id_producto_matricula : null,
      valor_matricula: this.tarifaActual.valor_matricula || 0,
      cuotas_matricula: this.tarifaActual.cuotas_matricula ? parseInt(this.tarifaActual.cuotas_matricula) : 1,
      id_producto_pension: this.tarifaActual.id_producto_pension ? this.tarifaActual.id_producto_pension : null,
      valor_pension: this.tarifaActual.valor_pension || 0,
      id_producto_unico: this.tarifaActual.id_producto_unico ? this.tarifaActual.id_producto_unico : null,
      valor_unico: this.tarifaActual.valor_unico || 0,
      cuotas_unico: this.tarifaActual.cuotas_unico ? parseInt(this.tarifaActual.cuotas_unico) : 1,
      anio: parseInt(this.tarifaActual.anio),
      id_institucion_cliente: this.idInstitucionTarifa ? this.idInstitucionTarifa : null
    } as any;

    if (this.tarifaActual.id) {
      data.id = this.tarifaActual.id;
      this.tarifasCursosExtraService.actualizar(data).subscribe({
        next: () => {
          Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Tarifa actualizada', showConfirmButton: false, timer: 2000 });
          this.cargarTarifas(this.model.id);
        },
        error: (error: any) => {
          console.error("Error al actualizar tarifa", error);
          Swal.fire('Error', 'No se pudo actualizar la tarifa', 'error');
        }
      });
    } else {
      this.tarifasCursosExtraService.crear(data).subscribe({
        next: () => {
          Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Tarifa creada', showConfirmButton: false, timer: 2000 });
          this.cargarTarifas(this.model.id);
        },
        error: (error: any) => {
          console.error("Error al crear tarifa", error);
          Swal.fire('Error', error?.error?.error || 'No se pudo crear la tarifa', 'error');
        }
      });
    }
  }

  formatearMoneda(valor: number): string {
    return valor?.toLocaleString('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }) || '$0';
  }

  // ==================== CREACION RAPIDA DE PRODUCTO ====================

  /* La clasificación se resuelve por código porque su id es distinto en cada
     tenant. Los tipos de cobro son de tabla global (no llevan id_tenant). */
  cargarCatalogosProducto() {
    this.clasificacionProductosServiciosService.obtenerTodos().subscribe({
      next: (response: any) => {
        const clasificaciones = response.body || [];
        const extraAcademico = clasificaciones.find((c: any) => c.codigo === 'EXTRA_ACADEMICO');
        this.idClasificacionExtraAcademico = extraAcademico ? extraAcademico.id : null;
      },
      error: (error: any) => {
        console.error("Error al cargar clasificaciones de productos", error);
      }
    });

    this.tiposCobroProductoService.obtenerActivos().subscribe({
      next: (response: any) => {
        this.tiposCobro = response.body || [];
      },
      error: (error: any) => {
        console.error("Error al cargar tipos de cobro", error);
      }
    });
  }

  abrirModalProducto(tipo: string) {
    if (!this.idClasificacionExtraAcademico) {
      Swal.fire('Advertencia', 'No existe la clasificación Extra académico en productos y servicios. Créela primero en Datos Maestros.', 'warning');
      return;
    }

    this.tipoProductoModal = tipo;

    // El valor que ya esté escrito en la sección se propone como valor sugerido.
    let valorPrecargado = 0;
    if (tipo === 'matricula') {
      valorPrecargado = this.tarifaActual.valor_matricula || 0;
    } else if (tipo === 'pension') {
      valorPrecargado = this.tarifaActual.valor_pension || 0;
    } else if (tipo === 'unico') {
      valorPrecargado = this.tarifaActual.valor_unico || 0;
    }

    this.productoModal = {
      nombre: this.model.nombre ? `${this.model.nombre} - ${this.getNombreTipoProducto()}` : '',
      detalles: '',
      valor_sugerido: valorPrecargado
    };
    this.valorSugeridoProductoFormateado = this.formatearNumero(valorPrecargado);
    this.mostrarModalProducto = true;
  }

  cerrarModalProducto() {
    this.mostrarModalProducto = false;
  }

  getNombreTipoProducto(): string {
    const nombres: any = {
      'matricula': 'Matrícula',
      'pension': 'Pensión',
      'unico': 'Cobro único'
    };
    return nombres[this.tipoProductoModal] || '';
  }

  getNombrePeriodicidadProducto(): string {
    const nombres: any = {
      'matricula': 'Anual',
      'pension': 'Mensual',
      'unico': 'Único'
    };
    return nombres[this.tipoProductoModal] || '';
  }

  onValorSugeridoProductoInput(event: any) {
    let valor = event.target.value.replace(/\./g, '').replace(/\D/g, '');
    this.productoModal.valor_sugerido = valor ? parseInt(valor) : 0;
    if (this.productoModal.valor_sugerido > 0) {
      event.target.value = this.productoModal.valor_sugerido.toLocaleString('es-CO');
    } else {
      event.target.value = '';
    }
  }

  guardarProducto() {
    if (!this.productoModal.nombre || this.productoModal.nombre.trim() === '') {
      Swal.fire('Advertencia', 'El nombre del producto es obligatorio', 'warning');
      return;
    }

    const codigoTipoCobro = this.codigoTipoCobroPorTipo[this.tipoProductoModal];
    const tipoCobro = this.tiposCobro.find((t: any) => t.codigo === codigoTipoCobro);

    const data = {
      nombre: this.productoModal.nombre.trim(),
      detalles: this.productoModal.detalles ? this.productoModal.detalles.trim() : '',
      id_clasificacion_productos_servicios: this.idClasificacionExtraAcademico,
      id_categoria_productos_servicios: null,
      id_periodicidad_cobro: this.periodicidadPorTipo[this.tipoProductoModal],
      valor_sugerido: this.productoModal.valor_sugerido || 0,
      disponible: 1,
      anio: this.anioTarifa,
      id_horario_alimentacion_sugerido: null,
      id_tipo_cobro: tipoCobro ? tipoCobro.id : null
    };

    this.guardandoProducto = true;

    this.productosServiciosService.crear(data).subscribe({
      next: (response: any) => {
        this.guardandoProducto = false;

        if (response && response.error) {
          Swal.fire('Error', response.error, 'error');
          return;
        }

        const idNuevo = response ? response.id : null;
        const tipoCreado = this.tipoProductoModal;
        this.cerrarModalProducto();

        // Se refrescan las tres listas y se deja seleccionado el producto nuevo.
        this.cargarProductosTarifas(() => {
          if (!idNuevo) return;

          if (tipoCreado === 'matricula') {
            this.tarifaActual.id_producto_matricula = idNuevo;
            this.onProductoMatriculaChange();
          } else if (tipoCreado === 'pension') {
            this.tarifaActual.id_producto_pension = idNuevo;
            this.onProductoPensionChange();
          } else if (tipoCreado === 'unico') {
            this.tarifaActual.id_producto_unico = idNuevo;
            this.onProductoUnicoChange();
          }

          Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Producto creado', showConfirmButton: false, timer: 2000 });
        });
      },
      error: (error: any) => {
        this.guardandoProducto = false;
        console.error("Error al crear el producto", error);
        Swal.fire('Error', 'No se pudo crear el producto', 'error');
      }
    });
  }
}