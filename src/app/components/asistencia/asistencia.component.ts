import { Component, OnInit } from '@angular/core';
import { EstudiantesService } from '../../services/estudiantes.service';
import { AsistenciaEstudiantesService } from '../../services/asistencia-estudiantes.service';
import { ConstantesService } from '../../common/constantes/constantes.service';
import { PersonasService } from '../../services/personas.service';
import { DocumentosPersonasService } from '../../services/documentos-personas.service';
import { MotorCobrosAutomaticosService } from '../../services/motor-cobros-automaticos.service';
import { TiposIdentificacionService } from '../../services/tipos-identificacion.service';
import { TiposAcudienteService } from '../../services/tipos-acudiente.service';
import Swal from 'sweetalert2';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../common/header/header.component';
import { BuscarComponent } from '../../common/buscar/buscar.component';
import { GruposService } from '../../services/grupos.service';
import { UtilService } from '../../common/constantes/util.service';
import { SearchPipeGeneral } from '../../common/pipes/search';
import { RegistroUtilesDiariosService } from '../../services/utiles-diarios-registro.service';
import { SolicitudesService } from '../../services/solicitudes.service';
import { ColaboradoresService } from '../../services/colaboradores.service';

@Component({
  selector: 'app-asistencia',
  templateUrl: './asistencia.component.html',
  styleUrl: './asistencia.component.scss',
  standalone: true,
  providers: [SearchPipeGeneral],
  imports: [CommonModule, FormsModule, HeaderComponent, BuscarComponent]
})
export class AsistenciaComponent implements OnInit {

  titulo = "Módulo de registro de asistencia";

  public titulos = [] as any[];
  public datos = [] as any[];

  public listas = {
    noIngresos: [] as any[],
    noSalidas: [] as any[],
    // Ninos que ya se fueron hoy. Va al final de la pestana de Salidas, en
    // tono tenue y sin clic: es solo para consultar a que hora entro y salio.
    salidas: [] as any[],
    grupos: [] as any[],
    // Utiles y accesorios del nino seleccionado en el panel. En ingreso se
    // marca lo que trajo; en salida, lo que se lleva de vuelta.
    utiles: [] as any[],
    // Solicitudes vigentes del nino en la fecha. Es solo lectura: aqui la
    // docente ve lo que hay que cumplir hoy; marcar se hace en la agenda del
    // dia, desde Operaciones.
    compromisos: [] as any[],
    // Colaboradores activos, para escoger quien recibe o entrega al nino.
    colaboradores: [] as any[],
    // Acudientes y autorizados que pueden traer (ingreso) o recoger (salida)
    // al nino seleccionado.
    personas: [] as any[],
  };

  // Colaborador que recibe (ingreso) o entrega (salida) al nino. Arranca en
  // el colaborador del usuario que registra, pero se puede cambiar: es un
  // dato distinto de quien hace el registro.
  public idColaboradorMovimiento: any = null;
  // Persona que trae o recoge al nino. Arranca en la ultima eleccion, o en el
  // autorizado temporal del dia si lo hay.
  public idPersonaMovimiento: any = null;
  public cargandoPersonas = false;

  public model = {
    estudiante: {} as any,
    opcion: "actual"
  };
  private estudiantesCompletos: any[] = [];
  public buscarTexto: string = '';
  private salidasCompletas: any[] = [];

  // Propiedades para el panel de cobros automáticos
  public mostrarPanelCobros = false;
  public estudianteSeleccionadoCobro: any = null;
  public cobrosDetectados: any[] = [];
  public horaSalidaEditable: string = '';
  public horaIngresoEditable: string = '';
  public observacionActual: string = '';
  public evaluandoReglas = false;
  public tipoEventoActual: string = '';

  // === REGISTRO RÁPIDO ===
  public mostrarRegistroRapido = false;
  public registroRapidoEnProceso = false;
  public ninoCamposHabilitados = false;

  // Datos del estudiante inactivo encontrado por documento: sus acudientes y
  // su último grupo, para poder reactivarlo sin volver a digitar todo.
  public estudianteInactivo: any = null;
  public acudCamposHabilitados = false;
  public listasRegistroRapido = {
    tiposIdentificacion: [] as any[],
    grupos: [] as any[],
    tiposAcudiente: [] as any[],
  };
  public modelRegistroRapido = {
    nino_id_tipo_identificacion: '' as any,
    nino_numero_identificacion: '',
    nino_primer_nombre: '',
    nino_segundo_nombre: '',
    nino_primer_apellido: '',
    nino_segundo_apellido: '',
    id_grupo: '' as any,
    acud_id_tipo_identificacion: '' as any,
    acud_numero_identificacion: '',
    acud_primer_nombre: '',
    acud_segundo_nombre: '',
    acud_primer_apellido: '',
    acud_segundo_apellido: '',
    acud_telefono: '',
    id_tipo_acudiente: '' as any,
  };

  constructor(
    private asistenciaEstudiantesService: AsistenciaEstudiantesService,
    private estudiantesService: EstudiantesService,
    private gruposService: GruposService,
    private personasService: PersonasService,
    private documentosPersonasService: DocumentosPersonasService,
    private motorCobrosService: MotorCobrosAutomaticosService,
    private tiposIdentificacionService: TiposIdentificacionService,
    private tiposAcudienteService: TiposAcudienteService,
    private utilService: UtilService,
    private searchPipeGeneral: SearchPipeGeneral,
    private registroUtilesDiariosService: RegistroUtilesDiariosService,
    private solicitudesService: SolicitudesService,
    private colaboradoresService: ColaboradoresService
  ) { }

  ngOnInit(): void {
    this.consultaGrupos();
    this.consultaNoIngresos();
    this.consultaNoSalidas();
    this.consultaColaboradores();
  }

  consultaColaboradores() {
    this.colaboradoresService.obtenerPorFiltros({ estado: 'activo' }).subscribe({
      next: (response: any) => {
        this.listas.colaboradores = (response.body as any[]) || [];
        // Si el panel se abrio antes de que llegara la lista, se completa aqui.
        if (this.mostrarPanelCobros && !this.idColaboradorMovimiento) {
          this.idColaboradorMovimiento = this.colaboradorDelUsuario();
        }
      },
      error: () => {
        this.listas.colaboradores = [];
      }
    });
  }

  /**
   * Colaborador del usuario que esta registrando. Se busca primero por el
   * id_colaborador de la sesion y, si no viene, por la persona. Si el usuario
   * no es colaborador (por ejemplo un administrador), queda sin especificar.
   */
  private colaboradorDelUsuario(): any {
    const idColaborador = this.utilService.obtenerIdColaboradorActual();
    if (idColaborador && this.listas.colaboradores.some((c: any) => c.id == idColaborador)) {
      return idColaborador;
    }

    const idPersona = this.utilService.obtenerIdPersonaActual();
    const colaborador = idPersona
      ? this.listas.colaboradores.find((c: any) => c.id_persona == idPersona)
      : null;

    return colaborador ? colaborador.id : null;
  }

  /**
   * Quien puede traer o recoger al nino hoy, con la ultima eleccion ya
   * marcada. Los autorizados temporales nunca quedan como sugerencia.
   */
  consultaPersonas(estudiante: any) {
    this.listas.personas = [];
    this.idPersonaMovimiento = null;

    const idEstudiante = estudiante.id_estudiante || estudiante.id;
    if (!idEstudiante) return;

    this.cargandoPersonas = true;

    this.asistenciaEstudiantesService.obtenerPersonasEntregaRecoge(idEstudiante, this.tipoEventoActual, this.obtenerFechaActual()).subscribe({
      next: (respuesta: any) => {
        this.listas.personas = (respuesta.personas as any[]) || [];
        this.idPersonaMovimiento = respuesta.id_persona_sugerida || null;
        this.cargandoPersonas = false;
      },
      error: (error) => {
        console.error('Error al consultar quien trae o recoge al nino:', error);
        this.listas.personas = [];
        this.cargandoPersonas = false;
      }
    });
  }

  // Tocar a la persona seleccionada la deja sin especificar: el dato es
  // opcional.
  seleccionarPersona(persona: any) {
    this.idPersonaMovimiento = this.idPersonaMovimiento === persona.id_persona ? null : persona.id_persona;
  }

  /**
   * Persona marcada, para pintarle la ficha con foto y documento debajo de
   * los chips. Null mientras no haya ninguna escogida.
   */
  get personaMovimientoSeleccionada(): any {
    if (!this.idPersonaMovimiento) {
      return null;
    }

    return this.listas.personas.find((p: any) => p.id_persona === this.idPersonaMovimiento) || null;
  }

  /**
   * Foto de la persona. Si no tiene, la imagen por defecto.
   * Lleva el timestamp para que no se quede la del caché al cambiarla.
   */
  urlFotoPersona(persona: any): string {
    return persona && persona.foto
      ? this.personasService.obtenerUrlFoto(persona.foto) + '?t=' + new Date().getTime()
      : '/assets/images/foto.png';
  }

  /**
   * Abre la foto en grande, como hacía el modal de personas autorizadas.
   */
  ampliarFotoPersona(persona: any) {
    Swal.fire({
      title: persona.nombre_completo || persona.nombre,
      imageUrl: this.urlFotoPersona(persona),
      imageAlt: persona.nombre,
      showConfirmButton: true,
      confirmButtonText: 'Cerrar',
      width: 'auto',
      customClass: {
        image: 'swal-foto-ampliada'
      },
      didOpen: () => {
        const imgEl = document.querySelector('.swal-foto-ampliada') as HTMLElement;
        if (imgEl) {
          imgEl.style.maxWidth = '400px';
          imgEl.style.maxHeight = '400px';
          imgEl.style.borderRadius = '12px';
          imgEl.style.objectFit = 'cover';
          imgEl.style.boxShadow = '0 8px 24px rgba(0,0,0,0.15)';
        }
      }
    });
  }

  /**
   * Número de identificación con la sigla de su tipo: CC, CE, RC, NUIP, NIT.
   * La sigla sale del catálogo, no va quemada: si la persona no tiene tipo,
   * se muestra solo el número.
   */
  documentoPersona(persona: any): string {
    if (!persona || !persona.documento) {
      return '';
    }

    return persona.sigla_identificacion
      ? persona.sigla_identificacion + ': ' + persona.documento
      : persona.documento;
  }

  /**
   * Baja el documento de identidad de la persona. Cuál sirve de identidad lo
   * decide la bandera del catálogo de tipos de documento, así que aquí no se
   * asume que sea una cédula.
   */
  descargarIdentidadPersona(persona: any) {
    if (!persona || !persona.id_documento_identidad) {
      return;
    }

    const tipo = persona.nombre_documento_identidad || 'Documento de identidad';
    const nombre = (persona.nombre_completo || persona.nombre || 'Persona') + ' - ' + tipo;
    this.documentosPersonasService.descargarDocumentoArchivo(persona.id_documento_identidad, nombre);
  }

  /**
   * Texto de la autorización: solo lo traen los autorizados a recoger.
   */
  textoAutorizacionPersona(persona: any): string {
    if (!persona || persona.origen !== 'autorizado') {
      return '';
    }

    return persona.autorizado_por
      ? persona.parentesco + ' · Autorizado por ' + persona.autorizado_por
      : persona.parentesco;
  }

  consultaGrupos() {
    this.gruposService.obtenerTodos().subscribe((response: any) => {
      const body = response.body as any[];
      this.listas.grupos = body;
    });
  }

  consultaNoIngresos() {
    this.asistenciaEstudiantesService.obtenerNoIngresos().subscribe((response: any) => {
      const body = response.body as any[];
      console.log("consumo servicio docentes", body);
      this.estudiantesCompletos = [...body];
      this.listas.noIngresos = body;
      this.actualizarContadoresGrupos();
    });
  }

  consultaNoSalidas() {
    this.asistenciaEstudiantesService.obtenerNoSalidas().subscribe((response: any) => {
      // El back manda las dos listas en la misma respuesta: los que estan
      // adentro y los que ya se fueron hoy.
      const body = response.body as any;
      console.log("consumo servicio docentes", body);
      const noSalidas = (body?.no_salidas || []) as any[];
      this.salidasCompletas = [...noSalidas];
      this.listas.noSalidas = noSalidas;
      this.listas.salidas = (body?.salidas || []) as any[];
      this.actualizarContadoresGrupos();
    });
  }

  private actualizarContadoresGrupos() {
    this.listas.grupos.forEach((grupo: any) => {
      grupo.asistentes = this.listas.noSalidas.filter(f => f.nombre_grupo == grupo.nombre).length;
      const sinIngresar = this.listas.noIngresos.filter(f => f.nombre_grupo == grupo.nombre).length;
      grupo.totalGrupo = grupo.asistentes + sinIngresar;
    });
  }

  /**
   * Identidad de cada fila para el *ngFor. Sin esto, al filtrar Angular
   * destruye y vuelve a crear todos los <li> en vez de reutilizarlos.
   *
   * Se combina con la fecha de ingreso porque en salidas un mismo niño
   * podría aparecer más de una vez si tuvo varios ingresos en el día, y
   * un trackBy repetido rompe el *ngFor.
   */
  trackByEstudiante(index: number, estudiante: any): any {
    const id = estudiante.id_estudiante || estudiante.id || index;
    return id + '|' + (estudiante.fecha_ingreso || '');
  }

  trackByGrupo(index: number, grupo: any): any {
    return grupo.id || grupo.nombre || index;
  }

  buscar(event: any) {
    console.log("buscar", event);
    this.buscarTexto = event;
    if (this.model.opcion === 'ingresos') {
      this.listas.noIngresos = this.searchPipeGeneral.transform(
        this.estudiantesCompletos,
        this.buscarTexto
      );
    } else if (this.model.opcion === 'salidas') {
      this.listas.noSalidas = this.searchPipeGeneral.transform(
        this.salidasCompletas,
        this.buscarTexto
      );
      this.listas.grupos.forEach((grupo: any) => {
        grupo.asistentes = this.listas.noSalidas.filter(f => f.nombre_grupo == grupo.nombre).length;
      });
    }
  }

  seleccionarOpcion(opcion: any) {
    this.model.opcion = opcion;
    this.cerrarPanelCobros();
    this.cerrarRegistroRapido();
    switch (opcion) {
      case "ingresos":
        this.consultaNoIngresos();
        break;
      case "salidas":
        this.consultaNoSalidas();
        break;
      default:
        console.log("OPCION: ", opcion, this.model.opcion);
        this.consultaNoSalidas();
        break;
    }
  }

  private obtenerHoraActual(): string {
    const ahora = new Date();
    const horas = String(ahora.getHours()).padStart(2, '0');
    const minutos = String(ahora.getMinutes()).padStart(2, '0');
    return `${horas}:${minutos}`;
  }

  // El backend devuelve el resultado de la observación del observador del
  // estudiante junto con el registro de asistencia. Si no quedó, hay que
  // decirlo: antes esto se perdia en un console.error y la docente creia que
  // habia quedado todo.
  //
  // Siempre aclara que la asistencia SI se registro, porque eso pasa primero y
  // es independiente de la observacion.
  private avisarObservacionEstudiante(resultado: any, tipo: string) {
    // motivo en null = no habia nada que guardar (no escribio observacion).
    if (!resultado || resultado.creada || !resultado.motivo) return;

    let detalle: string;
    switch (resultado.motivo) {
      case 'tipo_no_configurado':
        detalle = `Falta configurar el tipo de observación "${tipo}" en el sistema.`;
        break;
      case 'sin_sprint':
        detalle = 'No hay un sprint que cubra la fecha de hoy.';
        break;
      default:
        detalle = 'Hubo un error al guardarla.';
    }

    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'warning',
      title: 'La observación no quedó en la ficha del niño',
      text: `El registro de ${tipo} sí se guardó. ${detalle}`,
      showConfirmButton: false,
      timer: 6000,
      timerProgressBar: true
    });
  }

  /**
   * Devuelve la fecha actual en formato YYYY-MM-DD usando hora local (no UTC).
   * No usar new Date().toISOString().split('T')[0] porque convierte a UTC y desfasa el día.
   */
  // Utiles del dia del nino. En ingreso se pide la propuesta, que el backend
  // arma sin escribir nada: si la docente cancela, no puede quedar creado un
  // registro que nadie reviso.
  //
  // Arrancan TODOS DESMARCADOS a proposito. Si la docente no alcanza a revisar
  // la maleta y confirma sin tocar nada, no se registra nada; lo hara despues
  // la docente principal desde la grilla de Operaciones.
  /**
   * Compromisos vigentes del nino en la fecha. Entran los autorizados y los
   * que siguen pendientes de aprobacion, para que la docente sepa que el papa
   * ya lo pidio aunque todavia no lo hayan aprobado.
   */
  consultaCompromisos(estudiante: any) {
    this.listas.compromisos = [];
    const idEstudiante = estudiante.id_estudiante || estudiante.id;
    if (!idEstudiante) return;

    const fecha = this.obtenerFechaActual();

    this.solicitudesService.obtenerPorEstudiante(idEstudiante, fecha).subscribe({
      next: (response: any) => {
        this.listas.compromisos = (response.body as any[]) || [];
      },
      error: (error) => {
        console.error('Error al consultar los compromisos del dia:', error);
        this.listas.compromisos = [];
      }
    });
  }

  consultaUtiles(estudiante: any) {
    this.listas.utiles = [];
    const idEstudiante = estudiante.id_estudiante || estudiante.id;
    if (!idEstudiante) return;

    const fecha = this.obtenerFechaActual();

    if (this.tipoEventoActual === 'salida') {
      this.registroUtilesDiariosService.obtenerPorEstudiante(idEstudiante, fecha).subscribe({
        next: (response: any) => {
          const body = (response.body as any[]) || [];
          // En salida solo tiene sentido revisar lo que el nino trajo: no se
          // puede llevar lo que nunca entro. Aqui arranca en lo que ya este
          // registrado, y sin verificar si todavia nadie lo reviso.
          this.listas.utiles = body.filter((i: any) => i.trajo == 1);
          this.listas.utiles.forEach((item: any) => {
            item.estadoUtil = (item.regreso === null || item.regreso === undefined) ? null : (item.regreso == 1 ? 1 : 0);
          });
        },
        error: (error) => {
          console.error('Error al consultar los utiles del dia:', error);
          this.listas.utiles = [];
        }
      });
      return;
    }

    this.registroUtilesDiariosService.obtenerPropuesta(idEstudiante, fecha).subscribe({
      next: (response: any) => {
        const body = (response.body as any[]) || [];
        // Todos arrancan sin verificar. Es distinto de decir que no trajo: si
        // la docente no alcanza a revisar la maleta, eso queda registrado como
        // tal y lo completa despues la docente principal en clase.
        this.listas.utiles = body.map((item: any) => ({ ...item, estadoUtil: null }));
      },
      error: (error) => {
        console.error('Error al consultar los utiles del dia:', error);
        this.listas.utiles = [];
      }
    });
  }

  // Marcar o desmarcar todo de una, para cuando la docente si alcanzo a
  // revisar y el nino trajo todo.
  get todosLosUtilesMarcados(): boolean {
    return this.listas.utiles.length > 0 && this.listas.utiles.every((item: any) => item.estadoUtil === 1);
  }

  alternarTodosLosUtiles() {
    const valor = this.todosLosUtilesMarcados ? null : 1;
    this.listas.utiles.forEach((item: any) => item.estadoUtil = valor);
  }

  // Agrega un util suelto a este nino, en un solo paso.
  async agregarUtilEnPanel() {
    const { value: texto } = await Swal.fire({
      title: 'Agregar útil',
      input: 'text',
      inputPlaceholder: 'Ej: Inhalador',
      showCancelButton: true,
      confirmButtonText: 'Agregar',
      cancelButtonText: 'Cancelar'
    });

    if (!texto || texto.trim() === '') return;

    this.listas.utiles.push({
      id: null,
      id_util_diario: null,
      nombre_libre: texto.trim(),
      nombre: texto.trim(),
      estadoUtil: 1
    });
  }

  // Lo que se manda al registrar el ingreso: la lista completa con el estado
  // de cada util (1 lo trajo, 0 no lo trajo, null sin verificar).
  private obtenerUtilesParaGuardar(): any[] {
    return this.listas.utiles.map((item: any) => ({
      id_util_diario: item.id_util_diario || null,
      nombre_libre: item.nombre_libre || null,
      trajo: item.estadoUtil === null || item.estadoUtil === undefined ? null : item.estadoUtil,
      observacion: item.observacion || null
    }));
  }

  // Cicla: sin verificar -> lo trajo -> no lo trajo -> sin verificar.
  alternarUtil(item: any) {
    if (item.estadoUtil === null || item.estadoUtil === undefined) {
      item.estadoUtil = 1;
    } else if (item.estadoUtil === 1) {
      item.estadoUtil = 0;
    } else {
      item.estadoUtil = null;
    }
  }

  // Nota corta por util, para cosas como "llego rota". Maximo 200 caracteres:
  // es una nota, no una observacion del estudiante.
  async editarNotaUtil(item: any, evento: Event) {
    evento.stopPropagation();

    const { value: texto } = await Swal.fire({
      title: item.nombre,
      input: 'text',
      inputLabel: 'Nota (opcional)',
      inputValue: item.observacion || '',
      inputPlaceholder: 'Ej: llegó rota',
      inputAttributes: { maxlength: '200' },
      showCancelButton: true,
      confirmButtonText: 'Guardar nota',
      cancelButtonText: 'Cancelar'
    });

    if (texto === undefined) return;

    const nota = String(texto).trim();
    item.observacion = nota === '' ? null : nota;
  }

  utilEnSi(item: any): boolean {
    return item.estadoUtil === 1;
  }

  utilEnNo(item: any): boolean {
    return item.estadoUtil === 0;
  }

  utilSinVerificar(item: any): boolean {
    return item.estadoUtil === null || item.estadoUtil === undefined;
  }

  // Ids de las filas que la usuaria dejo desmarcadas. En la salida viajan al
  // backend para que las marque como no regresadas.
  private obtenerUtilesNoMarcados(): any[] {
    return this.listas.utiles
      .filter((item: any) => item.estadoUtil === 0)
      .map((item: any) => item.id);
  }

  // Si nadie reviso nada, el aviso le recuerda que lo puede hacer la docente.
  get hayUtilesMarcados(): boolean {
    return this.listas.utiles.some((item: any) => item.estadoUtil !== null && item.estadoUtil !== undefined);
  }

  get hayUtilesPendientes(): boolean {
    return this.listas.utiles.some((item: any) => item.estadoUtil === 0);
  }

  private obtenerFechaActual(): string {
    const ahora = new Date();
    const año = ahora.getFullYear();
    const mes = String(ahora.getMonth() + 1).padStart(2, '0');
    const dia = String(ahora.getDate()).padStart(2, '0');
    return `${año}-${mes}-${dia}`;
  }

  private obtenerHoraActualCompleta(): string {
    const ahora = new Date();
    const horas = String(ahora.getHours()).padStart(2, '0');
    const minutos = String(ahora.getMinutes()).padStart(2, '0');
    const segundos = String(ahora.getSeconds()).padStart(2, '0');
    return `${horas}:${minutos}:${segundos}`;
  }

  seleccionarEstudiante(estudiante: any) {
    if (this.model.opcion === 'ingresos') {
      this.iniciarIngreso(estudiante);
    } else if (this.model.opcion === 'salidas') {
      this.iniciarSalida(estudiante);
    }
  }

  private iniciarIngreso(estudiante: any) {
    this.tipoEventoActual = 'ingreso';
    this.estudianteSeleccionadoCobro = estudiante;
    this.horaIngresoEditable = this.obtenerHoraActual();
    this.observacionActual = '';
    this.cobrosDetectados = [];
    this.mostrarPanelCobros = true;
    this.idColaboradorMovimiento = this.colaboradorDelUsuario();
    this.consultaPersonas(estudiante);
    this.consultaUtiles(estudiante);
    this.consultaCompromisos(estudiante);
    this.evaluarReglasIngreso(estudiante);
  }

  private iniciarSalida(estudiante: any) {
    this.tipoEventoActual = 'salida';
    this.estudianteSeleccionadoCobro = estudiante;
    this.horaSalidaEditable = this.obtenerHoraActual();
    this.observacionActual = '';
    this.cobrosDetectados = [];
    this.mostrarPanelCobros = true;
    this.idColaboradorMovimiento = this.colaboradorDelUsuario();
    this.consultaPersonas(estudiante);
    this.consultaUtiles(estudiante);
    this.consultaCompromisos(estudiante);
    this.evaluarReglasSalida(estudiante);
  }

  evaluarReglasIngreso(estudiante: any) {
    const idEstudiante = estudiante.id_estudiante || estudiante.id;
    this.evaluandoReglas = true;

    const data = {
      id_estudiante: idEstudiante,
      tipo_evento: 'ingreso',
      hora: this.horaIngresoEditable + ':00',
      fecha: this.obtenerFechaActual()
    };

    this.motorCobrosService.evaluar(data).subscribe({
      next: (respuesta: any) => {
        this.cobrosDetectados = (respuesta.cobros || []).map((c: any) => ({
          ...c,
          seleccionado: true
        }));
        this.evaluandoReglas = false;
      },
      error: (error) => {
        console.error('Error al evaluar reglas de ingreso:', error);
        this.cobrosDetectados = [];
        this.evaluandoReglas = false;
      }
    });
  }

  evaluarReglasSalida(estudiante: any) {
    const idEstudiante = estudiante.id_estudiante || estudiante.id;
    this.evaluandoReglas = true;

    const data = {
      id_estudiante: idEstudiante,
      tipo_evento: 'salida',
      hora: this.horaSalidaEditable + ':00',
      fecha: this.obtenerFechaActual()
    };

    this.motorCobrosService.evaluar(data).subscribe({
      next: (respuesta: any) => {
        this.cobrosDetectados = (respuesta.cobros || []).map((c: any) => ({
          ...c,
          seleccionado: true
        }));
        this.evaluandoReglas = false;
      },
      error: (error) => {
        console.error('Error al evaluar reglas de salida:', error);
        this.cobrosDetectados = [];
        this.evaluandoReglas = false;
      }
    });
  }

  onHoraChange() {
    if (!this.estudianteSeleccionadoCobro) return;

    if (this.tipoEventoActual === 'salida') {
      this.evaluarReglasSalida(this.estudianteSeleccionadoCobro);
    } else if (this.tipoEventoActual === 'ingreso') {
      this.evaluarReglasIngreso(this.estudianteSeleccionadoCobro);
    }
  }

  formatearMoneda(valor: number): string {
    if (valor === null || valor === undefined) return '$0';
    return '$' + valor.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }

  get totalCobrosSeleccionados(): number {
    return this.cobrosDetectados
      .filter(c => c.seleccionado)
      .reduce((sum, c) => sum + Number(c.valor), 0);
  }

  confirmarRegistro() {
    const estudiante = this.estudianteSeleccionadoCobro;
    if (!estudiante) return;

    if (this.tipoEventoActual === 'ingreso') {
      this.confirmarIngreso(estudiante);
    } else if (this.tipoEventoActual === 'salida') {
      this.confirmarSalida(estudiante);
    }
  }

  private confirmarIngreso(estudiante: any) {
    this.asistenciaEstudiantesService.obtenerNoIngresos().subscribe((response: any) => {
      const body = response.body as any[];
      const noIngresado = body.some(obj => obj.id === estudiante.id);
      if (noIngresado) {
        // Si hay cobros seleccionados, la notificacion al portal de padres la
        // dispara el motor de cobros al terminar, para que el mensaje los
        // incluya. Aqui se avisa que no notifique todavia.
        const notificarDesdeAsistencia = !this.hayCobrosSeleccionados();

        // La hora que viaja es la misma con la que se evaluaron los cobros:
        // antes se perdia y el backend guardaba la hora del servidor.
        this.asistenciaEstudiantesService.registroIngreso(estudiante.id, this.observacionActual, this.obtenerUtilesParaGuardar(), notificarDesdeAsistencia, this.horaIngresoEditable, this.idColaboradorMovimiento, this.idPersonaMovimiento).subscribe((response: any) => {
          if (response) {
            const idAsistencia = response.body?.id || response.id;
            this.avisarObservacionEstudiante(
              response.body?.observacion_estudiante || response.observacion_estudiante,
              'ingreso'
            );
            this.ejecutarCobrosAutomaticos(estudiante, idAsistencia);
            this.consultaNoIngresos();
            this.consultaNoSalidas();
          }
        });
      } else {
        Swal.fire({
          icon: 'info',
          title: 'Registro de Ingreso Existente',
          text: `El registro de ingreso de ${estudiante.primer_nombre} ${estudiante.segundo_nombre || ''} ${estudiante.primer_apellido} ${estudiante.segundo_apellido || ''}, se realizo previamente.`,
          confirmButtonText: 'Entendido'
        });
        this.consultaNoIngresos();
        this.cerrarPanelCobros();
      }
    });
  }

  private confirmarSalida(estudiante: any) {
    this.asistenciaEstudiantesService.obtenerNoSalidas().subscribe((response: any) => {
      // Solo interesa validar contra los que siguen adentro.
      const body = (response.body?.no_salidas || []) as any[];
      const noSalida = body.some(obj => obj.id_estudiante === estudiante.id_estudiante);
      if (noSalida) {
        const utilesNoRegresa = this.obtenerUtilesNoMarcados();
        // Mismo criterio que en el ingreso.
        const notificarDesdeAsistencia = !this.hayCobrosSeleccionados();

        // Mismo criterio que en el ingreso: se guarda la hora del panel.
        this.asistenciaEstudiantesService.registroSalida(estudiante.id, this.observacionActual, utilesNoRegresa, notificarDesdeAsistencia, this.horaSalidaEditable, this.idColaboradorMovimiento, this.idPersonaMovimiento).subscribe((response: any) => {
          if (response) {
            const idAsistencia = estudiante.id;
            const filas = response.body || response;
            this.avisarObservacionEstudiante(
              Array.isArray(filas) ? filas[0]?.observacion_estudiante : filas?.observacion_estudiante,
              'salida'
            );
            this.ejecutarCobrosAutomaticos(estudiante, idAsistencia);
            this.consultaNoSalidas();
            this.consultaNoIngresos();
          }
        });
      } else {
        Swal.fire({
          icon: 'info',
          title: 'Registro de Salida',
          text: `El registro de salida de ${estudiante.primer_nombre} ${estudiante.segundo_nombre || ''} ${estudiante.primer_apellido} ${estudiante.segundo_apellido || ''}, se realizo previamente.`,
          confirmButtonText: 'Entendido'
        });
        this.consultaNoSalidas();
        this.cerrarPanelCobros();
      }
    });
  }

  /**
   * Indica si el usuario dejo marcado algun cobro para ejecutar. De eso
   * depende cual de los dos endpoints notifica al portal de padres.
   */
  private hayCobrosSeleccionados(): boolean {
    return this.cobrosDetectados.some(c => c.seleccionado);
  }

  private ejecutarCobrosAutomaticos(estudiante: any, idAsistencia: any) {
    const cobrosSeleccionados = this.cobrosDetectados.filter(c => c.seleccionado);

    if (cobrosSeleccionados.length === 0) {
      this.mostrarExito();
      return;
    }

    const idEstudiante = estudiante.id_estudiante || estudiante.id;
    const idUsuario = this.utilService.obtenerIdUsuarioActual();

    // El tipo del movimiento viaja para que el backend redacte bien la
    // notificacion: en la salida el registro ya existia desde la manana.
    const tipoAsistencia = estudiante.id_estudiante ? 'salida' : 'ingreso';

    const data = {
      cobros: cobrosSeleccionados.map(c => ({
        id_regla: c.id_regla,
        id_producto_servicio: c.id_producto_servicio,
        id_asistencia: idAsistencia,
        valor: c.valor
      })),
      tipo_asistencia: tipoAsistencia,
      id_estudiante: idEstudiante,
      id_usuario: idUsuario,
      fecha: this.obtenerFechaActual()
    };

    this.motorCobrosService.ejecutar(data).subscribe({
      next: (respuesta: any) => {
        if (respuesta.success) {
          Swal.fire({
            icon: 'success',
            title: 'Registro exitoso',
            html: `Asistencia registrada.<br><strong>${respuesta.cobros_generados} cobro(s) automático(s) generado(s)</strong>`,
            timer: 3000,
            showConfirmButton: true,
            confirmButtonText: 'Entendido'
          });
        } else {
          this.mostrarExito();
        }
        this.cerrarPanelCobros();
      },
      error: (error) => {
        console.error('Error al ejecutar cobros automáticos:', error);
        Swal.fire({
          icon: 'warning',
          title: 'Asistencia registrada',
          text: 'La asistencia se registró pero hubo un error al generar los cobros automáticos.',
          confirmButtonText: 'Entendido'
        });
        this.cerrarPanelCobros();
      }
    });
  }

  private mostrarExito() {
    Swal.fire({
      icon: 'success',
      title: 'Registro exitoso',
      text: 'Asistencia registrada correctamente.',
      timer: 2000,
      showConfirmButton: false
    });
    this.cerrarPanelCobros();
  }

  cerrarPanelCobros() {
    this.mostrarPanelCobros = false;
    this.estudianteSeleccionadoCobro = null;
    this.cobrosDetectados = [];
    this.tipoEventoActual = '';
    this.observacionActual = '';
    this.idColaboradorMovimiento = null;
    this.idPersonaMovimiento = null;
    this.listas.personas = [];
  }

  recibirMensaje(event: any) {
    console.log("Mensaje: ", event);
  }

  /**
   * Ninos del grupo que estan en el jardin en este momento.
   *
   * El contenido va con estilos en linea porque lo pinta SweetAlert por fuera
   * del componente y el SCSS del componente no lo alcanza.
   */
  verActual(grupo: any) {
    const estudiantes = this.listas.noSalidas.filter(ns => ns.nombre_grupo == grupo.nombre);

    // Antes, con el grupo vacio, quedaba una caja blanca sin nada adentro.
    const cuerpo = estudiantes.length === 0
      ? `<div style="display:flex;flex-direction:column;align-items:center;gap:10px;padding:24px 8px;color:#adb5bd;">
           <i class="fas fa-door-open" style="font-size:2.2rem;opacity:.6;"></i>
           <span style="font-size:.95rem;">No hay ni&ntilde;os de ${grupo.nombre} en el jard&iacute;n en este momento.</span>
         </div>`
      : `<ul style="list-style:none;margin:0;padding:0;text-align:left;">`
        + estudiantes.map(li => `
            <li style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 12px;margin-bottom:6px;background:#ffffff;border:1px solid #ececec;border-left:4px solid ${grupo.color};border-radius:8px;">
              <span style="display:flex;flex-direction:column;min-width:0;">
                <span style="font-size:1rem;font-weight:600;color:#343a40;">${li.primer_nombre} ${li.primer_apellido}</span>
                ${li.observacion_ingreso ? `<span style="font-size:.78rem;color:#868e96;">${li.observacion_ingreso}</span>` : ''}
              </span>
              <span style="font-size:.85rem;color:#6c757d;white-space:nowrap;">${this.horaCorta(li.fecha_ingreso)}</span>
            </li>`).join('')
        + `</ul>`;

    Swal.fire({
      title: `${grupo.nombre}: ${estudiantes.length} de ${grupo.totalGrupo || 0}`,
      html: cuerpo,
      background: '#ffffff',
      showCancelButton: false,
      focusConfirm: true,
      confirmButtonText: "Cerrar"
    })
  }

  /**
   * Hora en formato corto a partir de la fecha que manda el back
   * (YYYY-MM-DD HH:MM:SS). Se corta el texto en vez de convertirlo a Date
   * para no correr la hora con la zona horaria del navegador.
   */
  horaCorta(fecha: any): string {
    if (!fecha) {
      return '';
    }
    const texto = String(fecha);
    return texto.length >= 16 ? texto.substring(11, 16) : texto;
  }

  // ============================================================
  // REGISTRO RÁPIDO
  // ============================================================

  abrirRegistroRapido() {
    this.cerrarPanelCobros();
    this.mostrarRegistroRapido = true;
    this.limpiarRegistroRapido();
    this.cargarListasRegistroRapido();
  }

  cerrarRegistroRapido() {
    this.mostrarRegistroRapido = false;
    this.registroRapidoEnProceso = false;
    this.ninoCamposHabilitados = false;
    this.acudCamposHabilitados = false;
  }

  limpiarRegistroRapido() {
    this.ninoCamposHabilitados = false;
    this.acudCamposHabilitados = false;
    this.modelRegistroRapido = {
      nino_id_tipo_identificacion: 2,
      nino_numero_identificacion: '',
      nino_primer_nombre: '',
      nino_segundo_nombre: '',
      nino_primer_apellido: '',
      nino_segundo_apellido: '',
      id_grupo: this.obtenerGrupoDefaultId(),
      acud_id_tipo_identificacion: 1,
      acud_numero_identificacion: '',
      acud_primer_nombre: '',
      acud_segundo_nombre: '',
      acud_primer_apellido: '',
      acud_segundo_apellido: '',
      acud_telefono: '',
      id_tipo_acudiente: '',
    };
  }

  private obtenerGrupoDefaultId(): any {
    const grupos = this.listasRegistroRapido.grupos.length > 0
      ? this.listasRegistroRapido.grupos
      : this.listas.grupos;

    if (grupos && grupos.length > 0) {
      const grupoDefault = grupos.find((g: any) => Number(g.calificable) === 0);
      if (grupoDefault) return grupoDefault.id;
    }
    return '';
  }

  seleccionarTipoAcudiente(tipo: any) {
    this.modelRegistroRapido.id_tipo_acudiente = tipo.id;
  }

  private cargarListasRegistroRapido() {
    if (this.listasRegistroRapido.tiposIdentificacion.length === 0) {
      this.tiposIdentificacionService.obtenerTodos().subscribe((response: any) => {
        this.listasRegistroRapido.tiposIdentificacion = response.body;
      });
    }
    if (this.listasRegistroRapido.grupos.length === 0) {
      this.gruposService.obtenerTodos().subscribe((response: any) => {
        this.listasRegistroRapido.grupos = response.body;
        if (!this.modelRegistroRapido.id_grupo) {
          this.modelRegistroRapido.id_grupo = this.obtenerGrupoDefaultId();
        }
      });
    }
    if (this.listasRegistroRapido.tiposAcudiente.length === 0) {
      this.tiposAcudienteService.obtenerTodos().subscribe((response: any) => {
        this.listasRegistroRapido.tiposAcudiente = response.body;
      });
    }
  }

  /**
   * Un estudiante no puede ser su propio acudiente.
   *
   * Se compara tipo Y numero: el mismo numero con distinto tipo son personas
   * distintas. Como la persona todavia no existe cuando se registra un
   * estudiante nuevo, la busqueda no la detecta y hay que compararlo aqui.
   */
  get documentosIguales(): boolean {
    const m = this.modelRegistroRapido;

    const documentoNino = String(m.nino_numero_identificacion || '').trim();
    const documentoAcudiente = String(m.acud_numero_identificacion || '').trim();

    if (!documentoNino || !documentoAcudiente) {
      return false;
    }

    // Solo el número: el mismo documento registrado una vez como NUIP y otra
    // como Cédula sigue siendo el mismo error.
    return documentoNino === documentoAcudiente;
  }

  /**
   * Devuelve el documento del estudiante a edición. El documento se bloquea
   * al verificarlo para que no se cambie después de haber cargado los datos
   * de esa persona.
   */
  cambiarDocumentoNino() {
    this.ninoCamposHabilitados = false;
    this.modelRegistroRapido.nino_numero_identificacion = '';
  }

  cambiarDocumentoAcudiente() {
    this.acudCamposHabilitados = false;
    this.modelRegistroRapido.acud_numero_identificacion = '';
  }

  formularioRegistroRapidoValido(): boolean {
    const m = this.modelRegistroRapido;
    return Boolean(
      this.ninoCamposHabilitados &&
      this.acudCamposHabilitados &&
      !this.documentosIguales &&
      m.nino_id_tipo_identificacion &&
      m.nino_numero_identificacion &&
      m.nino_primer_nombre &&
      m.nino_primer_apellido &&
      m.id_grupo &&
      m.acud_id_tipo_identificacion &&
      m.acud_numero_identificacion &&
      m.acud_primer_nombre &&
      m.acud_primer_apellido &&
      m.id_tipo_acudiente
    );
  }

  ejecutarRegistroRapido() {
    if (this.documentosIguales) {
      Swal.fire({
        icon: 'warning',
        title: 'Documento repetido',
        text: 'El documento del acudiente es el mismo del estudiante. Un estudiante no puede ser su propio acudiente.',
        confirmButtonText: 'Entendido'
      });
      return;
    }

    if (!this.formularioRegistroRapidoValido()) {
      Swal.fire({
        icon: 'warning',
        title: 'Campos incompletos',
        text: 'Verifique ambos documentos y complete todos los campos obligatorios marcados con *',
        confirmButtonText: 'Entendido'
      });
      return;
    }

    this.registroRapidoEnProceso = true;
    const id_usuario = this.utilService.obtenerIdUsuarioActual();

    const data = {
      ...this.modelRegistroRapido,
      id_usuario: id_usuario
    };

    this.estudiantesService.registroRapido(data).subscribe({
      next: (respuesta: any) => {
        this.registroRapidoEnProceso = false;

        if (respuesta.error) {
          Swal.fire({ icon: 'error', title: 'Error', text: respuesta.error, confirmButtonText: 'Entendido' });
          return;
        }

        const idEstudianteCreado = respuesta.id_estudiante;
        const nombreEstudiante = respuesta.nombre_estudiante;
        const yaExistia = respuesta.estudiante_ya_existia;

        let mensaje = `<strong>${nombreEstudiante}</strong> registrado correctamente.`;
        if (yaExistia) {
          mensaje += '<br><small>El estudiante ya existía en el sistema.</small>';
        }
        mensaje += '<br><br>Ahora puede registrar su ingreso.';

        Swal.fire({
          icon: 'success',
          title: 'Estudiante creado',
          html: mensaje,
          confirmButtonText: 'Registrar ingreso',
          timer: 3000,
          timerProgressBar: true,
        }).then(() => {
          this.abrirIngresoPostRegistro(idEstudianteCreado);
        });

        this.cerrarRegistroRapido();
      },
      error: (error: any) => {
        this.registroRapidoEnProceso = false;
        console.error('Error en registro rápido:', error);
        const mensajeError = error?.error?.error || 'Ocurrió un error al realizar el registro rápido';
        Swal.fire({ icon: 'error', title: 'Error', text: mensajeError, confirmButtonText: 'Entendido' });
      }
    });
  }

  /**
   * Después del registro rápido, fuerza la pestaña de ingresos,
   * refresca la lista y abre el panel de cobros con el estudiante recién creado.
   */
  private abrirIngresoPostRegistro(idEstudiante: string) {
    this.model.opcion = 'ingresos';
    this.asistenciaEstudiantesService.obtenerNoIngresos().subscribe((response: any) => {
      const body = response.body as any[];
      this.estudiantesCompletos = [...body];
      this.listas.noIngresos = body;

      const estudianteEncontrado = body.find(
        (e: any) => e.id === idEstudiante
      );

      if (estudianteEncontrado) {
        this.seleccionarEstudiante(estudianteEncontrado);
      }
    });
    this.consultaNoSalidas();
  }

  buscarPersonaNino() {
    const m = this.modelRegistroRapido;
    if (!m.nino_id_tipo_identificacion || !m.nino_numero_identificacion) {
      Swal.fire({ icon: 'warning', title: 'Datos incompletos', text: 'Seleccione tipo e ingrese número de documento del niño.', confirmButtonText: 'Entendido' });
      return;
    }

    // El acudiente puede haberse digitado primero: se revisa en los dos lados.
    if (this.documentosIguales) {
      Swal.fire({
        icon: 'warning',
        title: 'Documento repetido',
        text: 'Ese documento ya está puesto como el del acudiente. Un estudiante no puede ser su propio acudiente.',
        confirmButtonText: 'Entendido'
      });
      this.modelRegistroRapido.nino_numero_identificacion = '';
      this.ninoCamposHabilitados = false;
      return;
    }

    // El back resuelve el caso completo: si esa persona ya es estudiante y en
    // qué estado. Antes solo se miraba si la persona existía, así que un
    // estudiante ya matriculado pasaba derecho.
    this.estudiantesService.consultarPorDocumento(m.nino_numero_identificacion).subscribe({
      next: (response: any) => {
        const datos = response.body || response;
        const persona = datos?.persona;

        if (datos?.caso === 'estudiante_activo') {
          const grupo = datos.grupo?.nombre ? ` Está en el grupo ${datos.grupo.nombre}.` : '';

          Swal.fire({
            icon: 'info',
            title: 'Ya está matriculado',
            html: `<strong>${this.nombreDePersona(persona)}</strong> ya está registrado y activo.${grupo}`
              + '<br><br>Búsquelo en la lista de asistencia.',
            confirmButtonText: 'Entendido'
          });

          this.modelRegistroRapido.nino_numero_identificacion = '';
          this.ninoCamposHabilitados = false;
          return;
        }

        if (persona) {
          this.modelRegistroRapido.nino_primer_nombre = persona.primer_nombre || '';
          this.modelRegistroRapido.nino_segundo_nombre = persona.segundo_nombre || '';
          this.modelRegistroRapido.nino_primer_apellido = persona.primer_apellido || '';
          this.modelRegistroRapido.nino_segundo_apellido = persona.segundo_apellido || '';

          // El tipo puede venir distinto al que se escogió: la búsqueda va
          // por número, así que se corrige con el que tiene registrado.
          if (persona.id_tipo_identificacion) {
            this.modelRegistroRapido.nino_id_tipo_identificacion = persona.id_tipo_identificacion;
          }
        }

        if (datos?.caso === 'estudiante_inactivo') {
          this.estudianteInactivo = datos;

          // Se preselecciona el grupo que tenía: casi siempre vuelve al mismo,
          // y si no, se cambia en el combo.
          if (datos.grupo?.id) {
            this.modelRegistroRapido.id_grupo = datos.grupo.id;
          }

          const grupo = datos.grupo?.nombre ? ` Su último grupo fue ${datos.grupo.nombre}.` : '';
          const cuantos = (datos.acudientes || []).length;
          const acudientes = cuantos > 0
            ? `<br><br>Tiene ${cuantos} acudiente(s) registrado(s); puede escoger uno abajo o registrar otro.`
            : '';

          Swal.fire({
            icon: 'warning',
            title: 'Estudiante inactivo',
            html: `<strong>${this.nombreDePersona(persona)}</strong> ya fue estudiante y está inactivo.${grupo}`
              + '<br><br>Al guardar se reactivará. Puede corregir sus datos.'
              + acudientes,
            confirmButtonText: 'Entendido'
          });
        } else {
          this.estudianteInactivo = null;

          Swal.fire({
            icon: 'info',
            title: persona ? 'Persona encontrada' : 'Persona nueva',
            text: persona
              ? 'Se cargaron los datos. Puede modificarlos si es necesario.'
              : 'No se encontró en el sistema. Ingrese los datos.',
            timer: 2000,
            showConfirmButton: false
          });
        }

        this.ninoCamposHabilitados = true;
      },
      error: () => {
        this.estudianteInactivo = null;
        this.ninoCamposHabilitados = true;
      }
    });
  }

  /**
   * Nombre completo de una persona devuelta por el back.
   */
  nombreDePersona(persona: any): string {
    if (!persona) return 'El estudiante';

    return [persona.primer_nombre, persona.primer_apellido]
      .filter(p => !!p)
      .join(' ') || 'El estudiante';
  }

  /**
   * Toma uno de los acudientes que el estudiante ya tenía, en lugar de
   * volver a digitarlo.
   */
  usarAcudienteExistente(acudiente: any) {
    this.modelRegistroRapido.acud_id_tipo_identificacion = acudiente.id_tipo_identificacion;
    this.modelRegistroRapido.acud_numero_identificacion = acudiente.numero_identificacion;
    this.modelRegistroRapido.acud_primer_nombre = acudiente.primer_nombre || '';
    this.modelRegistroRapido.acud_segundo_nombre = acudiente.segundo_nombre || '';
    this.modelRegistroRapido.acud_primer_apellido = acudiente.primer_apellido || '';
    this.modelRegistroRapido.acud_segundo_apellido = acudiente.segundo_apellido || '';
    this.modelRegistroRapido.acud_telefono = acudiente.telefono || '';

    if (acudiente.id_tipo_acudiente) {
      this.modelRegistroRapido.id_tipo_acudiente = acudiente.id_tipo_acudiente;
    }

    this.acudCamposHabilitados = true;
  }

  buscarPersonaAcudiente() {
    const m = this.modelRegistroRapido;
    if (!m.acud_id_tipo_identificacion || !m.acud_numero_identificacion) {
      Swal.fire({ icon: 'warning', title: 'Datos incompletos', text: 'Seleccione tipo e ingrese número de documento del acudiente.', confirmButtonText: 'Entendido' });
      return;
    }

    // Se avisa aquí y no al guardar: es el momento en que el usuario acaba
    // de digitar el documento y todavía lo tiene en la cabeza.
    if (this.documentosIguales) {
      Swal.fire({
        icon: 'warning',
        title: 'Documento repetido',
        text: 'Ese es el documento del estudiante. Un estudiante no puede ser su propio acudiente.',
        confirmButtonText: 'Entendido'
      });
      this.modelRegistroRapido.acud_numero_identificacion = '';
      this.acudCamposHabilitados = false;
      return;
    }

    this.personasService.obtenerByIdentificacion(m.acud_id_tipo_identificacion, m.acud_numero_identificacion).subscribe({
      next: (response: any) => {
        const personas = response.body || response;
        if (personas && personas.length > 0) {
          const p = personas[0];
          this.modelRegistroRapido.acud_primer_nombre = p.primer_nombre || '';
          this.modelRegistroRapido.acud_segundo_nombre = p.segundo_nombre || '';
          this.modelRegistroRapido.acud_primer_apellido = p.primer_apellido || '';
          this.modelRegistroRapido.acud_segundo_apellido = p.segundo_apellido || '';
          this.modelRegistroRapido.acud_telefono = p.telefono || '';
          Swal.fire({ icon: 'info', title: 'Persona encontrada', text: 'Se cargaron los datos. Puede modificarlos si es necesario.', timer: 2000, showConfirmButton: false });
        } else {
          Swal.fire({ icon: 'info', title: 'Persona nueva', text: 'No se encontró en el sistema. Ingrese los datos.', timer: 2000, showConfirmButton: false });
        }
        this.acudCamposHabilitados = true;
      },
      error: () => {
        this.acudCamposHabilitados = true;
      }
    });
  }

}