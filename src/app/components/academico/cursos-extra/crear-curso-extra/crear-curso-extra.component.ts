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
import { ModalidadesCursosExtraService } from '../../../../services/modalidades-cursos-extra.service';
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
import { ConfiguracionReservasCursosExtraService } from '../../../../services/configuracion-reservas-cursos-extra.service';
import { EspaciosLugaresCursosExtraService } from '../../../../services/espacios-lugares-cursos-extra.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import Swal from 'sweetalert2';
import { HoraInputComponent } from '../../../../common/hora-input/hora-input.component';

@Component({
  selector: 'app-crear-curso-extra',
  templateUrl: './crear-curso-extra.component.html',
  styleUrl: './crear-curso-extra.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, HoraInputComponent]
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
    id_modalidad_curso_extra: null,
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
  /* Modalidad: como funciona el curso (grupal o personalizado). Es distinta
     del tipo, que es la categoria (Deportes, Artes...). Catalogo global. */
  modalidadesCursoExtra: any[] = [];
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
    total_minutos: 0,
    id_espacio_lugar_curso_extra: null,
    id_docente: null,
    cupo: null
  } as any;
  /* Espacios (canchas, salones) del lugar del curso: se ofrecen en el horario.
     El profesor del horario se escoge entre los docentes del curso. */
  espaciosLugar: any[] = [];

  /* Reglas de reserva del curso (pestaña Reservas). Un curso sin configurar
     llega con los valores de fijo, que es como funcionan todos hoy. */
  configuracionReservas: any = {
    reserva_automatica: 1,
    permite_cancelar: 0,
    permite_reagendar: 0,
    permite_reserva_suelta: 0,
    descuenta_inasistencia: 1,
    configurado: 0
  };

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
  productosPaquete: any[] = [];
  aniosEscolares: number[] = [];
  anioTarifa: number = new Date().getFullYear();
  valorMatriculaFormateado: string = '';
  valorPensionFormateado: string = '';
  valorUnicoFormateado: string = '';
  /* La tarifa es la cabecera (curso, año y convenio) y lo que se cobra va en
     su detalle: una fila por concepto. Un mismo curso puede tener varias
     filas del mismo tipo, por ejemplo paquetes de 4, 8, 12 y 16 sesiones. */
  tarifaActual: any = {
    id: null,
    id_curso_extra: null,
    id_institucion_cliente: null,
    anio: new Date().getFullYear(),
    detalle: []
  };

  // Tipos de fila del detalle, en el orden en que se muestran.
  tiposLineaTarifa: any[] = [
    { codigo: 'matricula', nombre: 'Matrícula', icono: 'fas fa-file-invoice-dollar' },
    { codigo: 'pension', nombre: 'Pensión mensual', icono: 'fas fa-calendar-alt' },
    { codigo: 'unico', nombre: 'Cobro único', icono: 'fas fa-money-bill-wave' },
    { codigo: 'paquete', nombre: 'Paquetes de sesiones', icono: 'fas fa-layer-group' }
  ];

  // Fila del detalle para la que se abrió el modal de producto nuevo.
  // null = el modal se abrió sin fila (no pasa desde esta pantalla).
  lineaProductoModal: any = null;

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

  /* Periodicidad con la que nace un producto creado desde este tab:
     1 Anual (matrícula), 2 Mensual (pensión), 4 Único (cobro único y
     paquetes de sesiones, que se pagan una vez). Los selects ya no filtran
     por periodicidad sino por el tipo de cobro del producto. */
  private readonly periodicidadPorTipo: any = {
    matricula: 1,
    pension: 2,
    unico: 4,
    paquete: 4
  };

  /* Tipo de cobro del producto según la sección. Es lo que define el tipo de
     la fila: el cobro único no tiene tipo propio en tipos_cobro_producto y va
     como OTRO. */
  private readonly codigoTipoCobroPorTipo: any = {
    matricula: 'MATRICULA',
    pension: 'PENSION',
    unico: 'OTRO',
    paquete: 'PAQUETE'
  };

  constructor(
    private cursosExtraService: CursosExtraService,
    private productosServiciosService: ProductosServiciosService,
    private clasificacionProductosServiciosService: ClasificacionProductosServiciosService,
    private tiposCobroProductoService: TiposCobroProductoService,
    private tiposCursosExtracurricularesService: TiposCursosExtracurricularesService,
    private modalidadesCursosExtraService: ModalidadesCursosExtraService,
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
    private router: Router,
    private configuracionReservasCursosExtraService: ConfiguracionReservasCursosExtraService,
    private espaciosLugaresCursosExtraService: EspaciosLugaresCursosExtraService
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
        this.cargarConfiguracionReservas(id);
      } else if (this.accion === 'consultar') {
        this.titulo = "Consultar Curso Extracurricular";
        this.editable = false;
        this.cargarCurso(id);
        this.cargarHorarios(id);
        this.cargarDocentes(id);
        this.cargarProveedoresCurso(id);
        this.cargarConvenios(id);
        this.cargarTarifas(id);
        this.cargarConfiguracionReservas(id);
      }
    });

    this.cargarDiasSemana();
    this.cargarImagenes();
    this.cargarDocentesDisponibles();
    this.cargarProveedoresDisponibles();
    this.cargarTiposCursoExtra();
    this.cargarModalidadesCursoExtra();
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
          this.cargarEspaciosLugar(this.model.id_lugar_curso_extra);
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

  /* Al crear, el curso arranca como grupal, que es la modalidad de casi todos.
     Se busca por codigo porque el id no se compara nunca. */
  cargarModalidadesCursoExtra() {
    this.modalidadesCursosExtraService.obtenerActivos().subscribe({
      next: (response: any) => {
        this.modalidadesCursoExtra = response.body || [];
        if (this.accion === 'crear' && !this.model.id_modalidad_curso_extra) {
          const grupal = this.modalidadesCursoExtra.find((m: any) => m.codigo === 'GRUPAL');
          this.model.id_modalidad_curso_extra = grupal ? grupal.id : null;
        }
      },
      error: (error: any) => {
        console.error("Error al cargar modalidades de curso extracurricular", error);
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
      id_modalidad_curso_extra: this.model.id_modalidad_curso_extra ? this.model.id_modalidad_curso_extra : null,
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
      'tarifas': 'Tarifas',
      'reservas': 'Reservas'
    };
    return nombres[this.pestanaActiva] || '';
  }

  getIconoPestana(): string {
    const iconos: any = {
      'basico': 'fas fa-info-circle',
      'horarios': 'fas fa-clock',
      'responsables': 'fas fa-chalkboard-teacher',
      'clientes': 'fas fa-school',
      'tarifas': 'fas fa-dollar-sign',
      'reservas': 'fas fa-calendar-check'
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
      total_minutos: 0,
      id_espacio_lugar_curso_extra: null,
      id_docente: null,
      cupo: null
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
      total_minutos: this.horarioModal.total_minutos,
      id_espacio_lugar_curso_extra: this.horarioModal.id_espacio_lugar_curso_extra || null,
      id_docente: this.horarioModal.id_docente || null,
      cupo: this.horarioModal.cupo === '' || this.horarioModal.cupo === undefined ? null : this.horarioModal.cupo
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

  /* Espacios activos del lugar del curso. Si el curso no tiene lugar, el
     horario no ofrece espacio. */
  cargarEspaciosLugar(idLugar: any) {
    this.espaciosLugar = [];
    if (!idLugar) {
      return;
    }
    this.espaciosLugaresCursosExtraService.obtenerActivosByLugar(idLugar).subscribe({
      next: (response: any) => {
        this.espaciosLugar = response.body || [];
      },
      error: (error: any) => {
        console.error("Error al cargar los espacios del lugar", error);
      }
    });
  }

  // ==================== RESERVAS ====================

  cargarConfiguracionReservas(id: any) {
    this.configuracionReservasCursosExtraService.obtenerByCurso(id).subscribe({
      next: (response: any) => {
        const body = response.body || [];
        if (body.length > 0) {
          this.configuracionReservas = body[0];
        }
      },
      error: (error: any) => {
        console.error("Error al cargar las reglas de reserva", error);
      }
    });
  }

  /* Fijo: los inscritos quedan en todas las sesiones y no cancelan ni
     reagendan. Flexible: cada quien reserva (fija o suelta), puede cancelar y
     reagendar. En los dos la inasistencia descuenta; despues se ajusta. */
  aplicarPlantillaReservas(plantilla: 'fijo' | 'flexible') {
    const fijo = plantilla === 'fijo';
    this.configuracionReservas.reserva_automatica = fijo ? 1 : 0;
    this.configuracionReservas.permite_cancelar = fijo ? 0 : 1;
    this.configuracionReservas.permite_reagendar = fijo ? 0 : 1;
    this.configuracionReservas.permite_reserva_suelta = fijo ? 0 : 1;
    this.configuracionReservas.descuenta_inasistencia = 1;
  }

  esPlantillaReservas(plantilla: 'fijo' | 'flexible'): boolean {
    const c = this.configuracionReservas;
    if (plantilla === 'fijo') {
      return c.reserva_automatica == 1 && c.permite_cancelar == 0 && c.permite_reagendar == 0 && c.permite_reserva_suelta == 0;
    }
    return c.reserva_automatica == 0 && c.permite_cancelar == 1 && c.permite_reagendar == 1 && c.permite_reserva_suelta == 1;
  }

  guardarConfiguracionReservas() {
    const c = this.configuracionReservas;
    const data = {
      id_curso_extra: this.model.id,
      reserva_automatica: c.reserva_automatica ? 1 : 0,
      permite_cancelar: c.permite_cancelar ? 1 : 0,
      permite_reagendar: c.permite_reagendar ? 1 : 0,
      permite_reserva_suelta: c.permite_reserva_suelta ? 1 : 0,
      descuenta_inasistencia: c.descuenta_inasistencia ? 1 : 0
    };
    this.configuracionReservasCursosExtraService.guardar(data).subscribe({
      next: (response: any) => {
        if (Array.isArray(response) && response.length > 0) {
          this.configuracionReservas = response[0];
        }
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Reglas de reserva guardadas', showConfirmButton: false, timer: 2000 });
      },
      error: (error: any) => {
        console.error("Error al guardar las reglas de reserva", error);
      }
    });
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
        // Cada select muestra los productos extracurriculares de su tipo de
        // cobro, que es el mismo criterio con el que el back resuelve el tipo
        // de la fila. Lo que no es matrícula, pensión ni paquete es cobro único.
        const productos = (response.body || []).filter((p: any) => p.clasificacion_codigo === 'EXTRA_ACADEMICO');
        this.productosMatricula = productos.filter((p: any) => p.codigo_tipo_cobro === 'MATRICULA');
        this.productosPension = productos.filter((p: any) => p.codigo_tipo_cobro === 'PENSION');
        this.productosPaquete = productos.filter((p: any) => p.codigo_tipo_cobro === 'PAQUETE');
        this.productosUnico = productos.filter((p: any) =>
          !['MATRICULA', 'PENSION', 'PAQUETE'].includes(p.codigo_tipo_cobro)
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
      // Copia de las filas para que editar no toque la lista cargada.
      this.tarifaActual = {
        ...tarifaExistente,
        detalle: (tarifaExistente.detalle || []).map((l: any) => ({
          ...l,
          valor: parseFloat(l.valor) || 0,
          activo: l.activo == 1 ? 1 : 0
        }))
      };
    } else {
      this.tarifaActual = {
        id: null,
        id_curso_extra: this.model.id,
        id_institucion_cliente: this.idInstitucionTarifa,
        anio: this.anioTarifa,
        detalle: []
      };
    }
  }

  // ==================== DETALLE DE LA TARIFA ====================

  /** Productos que se ofrecen en el select de una fila según su tipo. */
  productosPorTipo(tipo: string): any[] {
    if (tipo === 'matricula') return this.productosMatricula;
    if (tipo === 'pension') return this.productosPension;
    if (tipo === 'paquete') return this.productosPaquete;
    return this.productosUnico;
  }

  /** Filas del detalle de un tipo, en el orden en que se muestran. */
  lineasDeTipo(tipo: string): any[] {
    return (this.tarifaActual.detalle || []).filter((l: any) => l.tipo === tipo);
  }

  agregarLinea(tipo: string) {
    const detalle = this.tarifaActual.detalle || [];
    // Un paquete nuevo propone las sesiones siguientes a las del último, que
    // es como suelen venderse (4, 8, 12, 16), y la vigencia de 30 días.
    const paquetes = detalle.filter((l: any) => l.tipo === 'paquete');
    const ultimoPaquete = paquetes.length > 0 ? paquetes[paquetes.length - 1] : null;

    detalle.push({
      id: null,
      tipo: tipo,
      id_producto_servicio: null,
      valor: 0,
      cuotas: 1,
      numero_sesiones: tipo === 'paquete' ? (ultimoPaquete ? (parseInt(ultimoPaquete.numero_sesiones) || 0) + 4 : 4) : null,
      vigencia_dias: tipo === 'paquete' ? (ultimoPaquete?.vigencia_dias || 30) : null,
      orden: detalle.length + 1,
      activo: 1
    });
    this.tarifaActual.detalle = detalle;
  }

  quitarLinea(linea: any) {
    this.tarifaActual.detalle = (this.tarifaActual.detalle || []).filter((l: any) => l !== linea);
  }

  // Al escoger el producto se propone su valor sugerido, que se puede cambiar.
  onProductoLineaChange(linea: any) {
    const producto = this.productosPorTipo(linea.tipo).find((p: any) => p.id == linea.id_producto_servicio);
    if (producto && producto.valor_sugerido) {
      linea.valor = producto.valor_sugerido;
    }
  }

  onValorLineaInput(event: any, linea: any) {
    const valor = event.target.value.replace(/\./g, '').replace(/\D/g, '');
    linea.valor = valor ? parseInt(valor) : 0;
    event.target.value = linea.valor > 0 ? linea.valor.toLocaleString('es-CO') : '';
  }

  /** Abre el modal de producto nuevo para una fila; al crearlo queda escogido en ella. */
  abrirModalProductoLinea(linea: any) {
    this.lineaProductoModal = linea;
    this.abrirModalProducto(linea.tipo);
  }

  /** Revisa el detalle antes de guardar. Devuelve el mensaje de error o null. */
  private validarDetalleTarifa(): string | null {
    const detalle = this.tarifaActual.detalle || [];
    const productos: any[] = [];

    for (let i = 0; i < detalle.length; i++) {
      const l = detalle[i];
      const nombreTipo = this.tiposLineaTarifa.find((t: any) => t.codigo === l.tipo)?.nombre || '';

      if (!l.id_producto_servicio) {
        return `Falta el producto en una fila de ${nombreTipo}.`;
      }
      if (productos.includes(l.id_producto_servicio)) {
        return 'Hay un producto repetido en la tarifa. Cada fila debe tener su propio producto.';
      }
      productos.push(l.id_producto_servicio);

      if (l.tipo === 'paquete' && (!l.numero_sesiones || parseInt(l.numero_sesiones) < 1)) {
        return 'Cada paquete debe tener el número de sesiones.';
      }
      // En la pensión las sesiones del mes son opcionales, pero si se ponen
      // tienen que ser al menos una.
      if (l.tipo === 'pension' && l.numero_sesiones !== null && l.numero_sesiones !== '' &&
          l.numero_sesiones !== undefined && parseInt(l.numero_sesiones) < 1) {
        return 'Las sesiones del mes de la pensión deben ser al menos 1.';
      }
      if ((l.tipo === 'matricula' || l.tipo === 'unico') && (!l.cuotas || parseInt(l.cuotas) < 1)) {
        return `Las cuotas de ${nombreTipo} deben ser al menos 1.`;
      }
    }
    return null;
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
    const error = this.validarDetalleTarifa();
    if (error) {
      Swal.fire('Advertencia', error, 'warning');
      return;
    }

    // El tipo de cada fila no viaja: lo define el tipo de cobro del producto.
    // Las sesiones van en el paquete (las que se compran) y en la pensión
    // (las que incluye el mes).
    const data = {
      id_curso_extra: this.model.id,
      anio: parseInt(this.tarifaActual.anio),
      id_institucion_cliente: this.idInstitucionTarifa ? this.idInstitucionTarifa : null,
      detalle: (this.tarifaActual.detalle || []).map((l: any, i: number) => ({
        id: l.id || null,
        id_producto_servicio: l.id_producto_servicio,
        valor: l.valor || 0,
        cuotas: (l.tipo === 'matricula' || l.tipo === 'unico') ? (parseInt(l.cuotas) || 1) : 1,
        numero_sesiones: (l.tipo === 'paquete' || l.tipo === 'pension') && l.numero_sesiones
          ? parseInt(l.numero_sesiones) : null,
        vigencia_dias: l.tipo === 'paquete' && l.vigencia_dias ? parseInt(l.vigencia_dias) : null,
        orden: i + 1,
        activo: l.activo ? 1 : 0
      }))
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
          Swal.fire('Error', error?.error?.error || 'No se pudo actualizar la tarifa', 'error');
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

    // El valor que ya esté escrito en la fila se propone como valor sugerido.
    const linea = this.lineaProductoModal;
    const valorPrecargado = linea ? (linea.valor || 0) : 0;

    // El paquete se nombra por sus sesiones, que es como lo reconoce el
    // cliente ("Bola naranja - 8 sesiones").
    let sufijo = this.getNombreTipoProducto();
    if (tipo === 'paquete' && linea && linea.numero_sesiones) {
      sufijo = `${linea.numero_sesiones} sesiones`;
    }

    this.productoModal = {
      nombre: this.model.nombre ? `${this.model.nombre} - ${sufijo}` : '',
      detalles: '',
      valor_sugerido: valorPrecargado
    };
    this.valorSugeridoProductoFormateado = this.formatearNumero(valorPrecargado);
    this.mostrarModalProducto = true;
  }

  cerrarModalProducto() {
    this.mostrarModalProducto = false;
    this.lineaProductoModal = null;
  }

  getNombreTipoProducto(): string {
    const nombres: any = {
      'matricula': 'Matrícula',
      'pension': 'Pensión',
      'unico': 'Cobro único',
      'paquete': 'Paquete de sesiones'
    };
    return nombres[this.tipoProductoModal] || '';
  }

  getNombrePeriodicidadProducto(): string {
    const nombres: any = {
      'matricula': 'Anual',
      'pension': 'Mensual',
      'unico': 'Único',
      'paquete': 'Único'
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
        const lineaDestino = this.lineaProductoModal;
        this.cerrarModalProducto();

        // Se refrescan las listas y se deja el producto nuevo escogido en la
        // fila desde la que se abrió el modal.
        this.cargarProductosTarifas(() => {
          if (!idNuevo) return;

          if (lineaDestino) {
            lineaDestino.id_producto_servicio = idNuevo;
            this.onProductoLineaChange(lineaDestino);
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