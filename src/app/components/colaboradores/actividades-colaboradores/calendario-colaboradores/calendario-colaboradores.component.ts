import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { HeaderComponent } from '../../../../common/header/header.component';
import { ActividadesColaboradoresService } from '../../../../services/actividades-colaboradores.service';
import { DiasSemanaService } from '../../../../services/dias-semana.service';
import { TareasColaboradoresService } from '../../../../services/tareas-colaboradores.service';

// Interfaces
interface Colaborador {
  id: number;
  nombre_completo: string;
  sobrenombre: string;
  id_docente: number | null;
  es_docente: boolean;
}

interface Actividad {
  id: number;
  id_colaborador: number;
  id_tipo_actividad: number;
  id_estado: number;
  fecha_hora_inicio: string;
  fecha_hora_fin: string;
  minutos_totales: number;
  observaciones: string;
  ruta_documento: string;
  nombre_tipo_actividad: string;
  valor_hora: number;
  id_categoria: number;
  nombre_categoria: string;
  color_categoria: string;
  icono_categoria: string;
  registro_x_horas: number;
  es_cruzable: number;
  nombre_estado: string;
  color_estado: string;
  nombre_colaborador: string;
  sobrenombre_colaborador: string;
  id_docente: number | null;
}

interface Horario {
  id: number;
  id_grupo: number;
  id_area_academica: number;
  id_dia_semana: number;
  hora_inicial: string;
  hora_final: string;
  total_minutos: number;
  id_docente: number;
  id_colaborador: number;
  nombre_docente: string;
  sobrenombre_docente: string;
  nombre_area_academica: string;
  icono_area: string;
  nombre_grupo: string;
  color_grupo: string;
  nombre_dia_semana: string;
  hora_entrada: string;
  hora_salida: string;
}

interface Tarea {
  id: number;
  id_colaborador: number;
  id_estudiante: number | null;
  id_tipo_tarea: number | null;
  nombre_tipo_tarea: string;
  descripcion: string;
  fecha_limite: string;
  hora_inicio: string | null;
  hora_fin: string | null;
  id_estado: number;
  nombre_estado: string;
  color_estado: string;
  origen: string;
  id_historial_origen: number | null;
  observaciones: string;
  id_usuario_registro: number;
  fecha_registro: string;
  nombre_colaborador: string;
  nombre_estudiante: string;
}

interface Grupo {
  id: number;
  nombre: string;
  icono: string;
  color: string;
  calificable: number;
  orden: number;
}

interface DiaCalendario {
  fecha: Date;
  dia: number;
  esHoy: boolean;
  esMesActual: boolean;
  actividades: Actividad[];
  horarios: Horario[];
  tareasConHora: Tarea[];
  tareasSinHora: Tarea[];
}

type TipoVista = 'dia' | 'semana' | 'mes';

@Component({
  selector: 'app-calendario-colaboradores',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent],
  templateUrl: './calendario-colaboradores.component.html',
  styleUrl: './calendario-colaboradores.component.scss'
})
export class CalendarioColaboradoresComponent implements OnInit {

  public titulo = "Calendario de Actividades de Colaboradores";

  // Icono usado para representar tareas en el calendario
  public readonly iconoTarea = '📋';

  // Duración por defecto (minutos) para tareas con hora_inicio pero sin hora_fin
  private readonly duracionTareaDefault = 30;

  // Estado del calendario
  public vistaActual: TipoVista = 'semana';
  public fechaActual: Date = new Date();
  public mesActual: number = new Date().getMonth();
  public anioActual: number = new Date().getFullYear();

  // Datos
  public actividades: Actividad[] = [];
  public horarios: Horario[] = [];
  public tareas: Tarea[] = [];
  public colaboradores: Colaborador[] = [];
  public grupos: Grupo[] = [];
  public diasCalendario: DiaCalendario[] = [];
  public diasSemana: DiaCalendario[] = [];

  // Fecha marcada por el usuario al hacer clic en una celda de la vista mes
  public fechaSeleccionada: Date | null = null;

  // Catálogo dias_semana del backend (tabla institucional)
  private catalogoDiasSemana: any[] = [];

  // Rango horario del grid (se recalcula con cada cambio de datos)
  public horaInicio: number = 6;
  public horaFin: number = 20;
  public horasDelDia: number[] = [];

  // Filtros
  public colaboradorSeleccionado: number | null = null;
  public grupoSeleccionado: number | null = null;
  public categoriaSeleccionada: number | null = null;
  public estadoSeleccionado: number | null = null;
  public mostrarHorarios: boolean = true;
  public mostrarActividades: boolean = true;
  public mostrarTareas: boolean = true;
  public mostrarFiltros: boolean = false;

  // Carga
  public cargando = false;
  public cargandoHorarios = false;

  // Días de la semana
  public nombresDias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  public nombresMeses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  // Años disponibles en el selector rápido (5 atrás, 2 adelante)
  public aniosDisponibles: number[] = [];

  // Categorías con colores pastel
  public categorias = [
    { id: 1, nombre: 'Permiso', color: '#FDB4BF', icono: '🚫' },
    { id: 2, nombre: 'Hora Adicional', color: '#A5EEA0', icono: '⏰' },
    { id: 3, nombre: 'Vacaciones', color: '#B4BFF4', icono: '🏖️' },
    { id: 4, nombre: 'Incapacidad', color: '#FFC34A', icono: '🏥' }
  ];

  constructor(
    private router: Router,
    private actividadesColaboradoresService: ActividadesColaboradoresService,
    private diaSemanaService: DiasSemanaService,
    private tareasColaboradoresService: TareasColaboradoresService
  ) { }

  ngOnInit() {
    this.generarAniosDisponibles();
    this.cargarCatalogoDiasSemana();
    this.cargarColaboradores();
    this.cargarGrupos();
    this.cargarDatosDelMes();
    this.cargarHorarios();
  }

  /**
   * Genera la lista de años para el selector rápido (5 años atrás, 2 adelante).
   */
  private generarAniosDisponibles() {
    const anioBase = new Date().getFullYear();
    this.aniosDisponibles = [];
    for (let a = anioBase - 5; a <= anioBase + 2; a++) {
      this.aniosDisponibles.push(a);
    }
  }

  // ==================== CARGA DE DATOS ====================

  cargarCatalogoDiasSemana() {
    this.diaSemanaService.obtenerTodos().subscribe({
      next: (response: any) => {
        this.catalogoDiasSemana = response.body || [];
        this.calcularRangoHorario();
      },
      error: error => {
        console.error('Error al cargar días de la semana:', error);
        this.catalogoDiasSemana = [];
        this.calcularRangoHorario();
      }
    });
  }

  cargarColaboradores() {
    this.actividadesColaboradoresService.obtenerColaboradoresParaCalendario().subscribe({
      next: (response: any) => {
        const datos = response.body as any[];
        this.colaboradores = datos.map(item => ({
          id: item.id,
          nombre_completo: item.nombre_completo,
          sobrenombre: item.sobrenombre,
          id_docente: item.id_docente,
          es_docente: item.id_docente !== null
        }));
      },
      error: error => {
        console.error('Error al cargar colaboradores:', error);
      }
    });
  }

  cargarGrupos() {
    this.actividadesColaboradoresService.obtenerGruposParaCalendario().subscribe({
      next: (response: any) => {
        this.grupos = response.body as Grupo[];
      },
      error: error => {
        console.error('Error al cargar grupos:', error);
      }
    });
  }

  cargarDatosDelMes() {
    this.cargando = true;
    const mes = this.mesActual + 1;

    this.actividadesColaboradoresService.obtenerActividadesPorMes(mes, this.anioActual).subscribe({
      next: (response: any) => {
        this.actividades = response.body as Actividad[];
        this.calcularRangoHorario();
        this.generarCalendario();
        this.cargando = false;
      },
      error: error => {
        console.error('Error al cargar actividades:', error);
        this.cargando = false;
        Swal.fire({
          title: 'Error',
          text: 'No se pudieron cargar las actividades',
          icon: 'error',
          confirmButtonText: 'Aceptar'
        });
      }
    });

    this.cargarTareas();
  }

  cargarTareas() {
    if (!this.mostrarTareas) return;

    const mes = this.mesActual + 1;
    this.tareasColaboradoresService.obtenerTareasPorMes(mes, this.anioActual).subscribe({
      next: (response: any) => {
        this.tareas = response.body as Tarea[];
        this.calcularRangoHorario();
        this.generarCalendario();
      },
      error: error => {
        console.error('Error al cargar tareas:', error);
      }
    });
  }

  cargarHorarios() {
    if (!this.mostrarHorarios) return;

    this.cargandoHorarios = true;
    this.actividadesColaboradoresService.obtenerHorariosDocentes().subscribe({
      next: (response: any) => {
        this.horarios = response.body as Horario[];
        this.calcularRangoHorario();
        this.generarCalendario();
        this.cargandoHorarios = false;
      },
      error: error => {
        console.error('Error al cargar horarios:', error);
        this.cargandoHorarios = false;
      }
    });
  }

  // ==================== RANGO HORARIO DEL GRID ====================

  /**
   * Calcula el rango horario del grid (día/semana).
   * Base: jornada institucional de dias_semana.
   * Expansión: si hay actividades, horarios de docentes o tareas con hora fuera del rango base, se extiende.
   * Fallback: 6-20 si dias_semana no está disponible.
   */
  private calcularRangoHorario() {
    let minMinutos = this.obtenerMinutosBaseDiasSemana('inicio');
    let maxMinutos = this.obtenerMinutosBaseDiasSemana('fin');

    // Expandir con actividades cargadas
    this.actividades.forEach(act => {
      const inicioAct = this.horaStringAMinutos(this.extraerHora(act.fecha_hora_inicio));
      const finAct = this.horaStringAMinutos(this.extraerHora(act.fecha_hora_fin));
      if (inicioAct >= 0 && inicioAct < minMinutos) minMinutos = inicioAct;
      if (finAct >= 0 && finAct > maxMinutos) maxMinutos = finAct;
    });

    // Expandir con horarios de docentes
    this.horarios.forEach(hor => {
      const inicioHor = this.horaStringAMinutos(hor.hora_inicial);
      const finHor = this.horaStringAMinutos(hor.hora_final);
      if (inicioHor >= 0 && inicioHor < minMinutos) minMinutos = inicioHor;
      if (finHor >= 0 && finHor > maxMinutos) maxMinutos = finHor;
    });

    // Expandir con tareas que tienen hora
    this.tareas.forEach(tarea => {
      if (!this.tareaTieneHoraValida(tarea)) return;
      const inicioTarea = this.horaStringAMinutos(tarea.hora_inicio!);
      const finTarea = tarea.hora_fin
        ? this.horaStringAMinutos(tarea.hora_fin)
        : inicioTarea + this.duracionTareaDefault;
      if (inicioTarea >= 0 && inicioTarea < minMinutos) minMinutos = inicioTarea;
      if (finTarea >= 0 && finTarea > maxMinutos) maxMinutos = finTarea;
    });

    // Redondear a bloques de 30 min + colchón de 30 min
    let horaMinMin = Math.floor(minMinutos / 30) * 30;
    let horaMaxMin = Math.ceil(maxMinutos / 30) * 30;
    horaMinMin = Math.max(0, horaMinMin - 30);
    horaMaxMin = Math.min(24 * 60, horaMaxMin + 30);

    this.horaInicio = Math.floor(horaMinMin / 60);
    this.horaFin = Math.ceil(horaMaxMin / 60);

    // Generar array de horas enteras para el template
    this.horasDelDia = [];
    for (let h = this.horaInicio; h <= this.horaFin; h++) {
      this.horasDelDia.push(h);
    }
  }

  /**
   * Obtiene los minutos de inicio/fin desde el catálogo dias_semana.
   * Si el catálogo está vacío, devuelve el fallback (6:00 o 20:00).
   */
  private obtenerMinutosBaseDiasSemana(tipo: 'inicio' | 'fin'): number {
    const fallback = tipo === 'inicio' ? 6 * 60 : 20 * 60;

    if (!this.catalogoDiasSemana || this.catalogoDiasSemana.length === 0) {
      return fallback;
    }

    const valores = this.catalogoDiasSemana
      .map(d => this.horaStringAMinutos(tipo === 'inicio' ? d.hora_entrada : d.hora_salida))
      .filter(v => v >= 0);

    if (valores.length === 0) return fallback;

    return tipo === 'inicio' ? Math.min(...valores) : Math.max(...valores);
  }

  /**
   * Convierte un string "HH:MM" o "HH:MM:SS" a minutos totales.
   * Devuelve -1 si el string es inválido.
   */
  private horaStringAMinutos(hora: string): number {
    if (!hora) return -1;
    const partes = hora.split(':');
    if (partes.length < 2) return -1;
    const h = Number(partes[0]);
    const m = Number(partes[1]);
    if (isNaN(h) || isNaN(m)) return -1;
    return h * 60 + m;
  }

  /**
   * Extrae la parte de hora de una fecha_hora_inicio/fin ("YYYY-MM-DD HH:MM:SS").
   */
  private extraerHora(fechaHora: string): string {
    if (!fechaHora) return '';
    const partes = fechaHora.split(' ');
    return partes.length >= 2 ? partes[1] : '';
  }

  /**
   * Calcula los minutos de duración de una tarea con hora.
   * Si no tiene hora_fin, usa la duración por defecto.
   */
  private minutosTarea(tarea: Tarea): number {
    if (!tarea.hora_inicio) return this.duracionTareaDefault;
    const inicio = this.horaStringAMinutos(tarea.hora_inicio);
    if (!tarea.hora_fin) return this.duracionTareaDefault;
    const fin = this.horaStringAMinutos(tarea.hora_fin);
    const dif = fin - inicio;
    return dif > 0 ? dif : this.duracionTareaDefault;
  }

  /**
   * Indica si una tarea está vencida: fecha_limite anterior a hoy y aún en estado Registrado (1).
   */
  esTareaVencida(tarea: Tarea): boolean {
    if (!tarea.fecha_limite) return false;
    if (tarea.id_estado !== 1) return false;

    const fechaTarea = this.fechaLimiteADate(tarea.fecha_limite);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    fechaTarea.setHours(0, 0, 0, 0);
    return fechaTarea.getTime() < hoy.getTime();
  }

  /**
   * Devuelve el icono a mostrar para una tarea: ⚠️ si está vencida, 📋 en caso normal.
   */
  iconoDeTarea(tarea: Tarea): string {
    return this.esTareaVencida(tarea) ? '⚠️' : this.iconoTarea;
  }

  /**
   * Devuelve la descripción de la tarea truncada para mostrar en bloques compactos.
   */
  descripcionCorta(tarea: Tarea): string {
    const desc = tarea.descripcion || 'Sin descripción';
    return desc.length > 10 ? desc.substring(0, 10) + '...' : desc;
  }

  // ==================== GENERACIÓN DEL CALENDARIO ====================

  generarCalendario() {
    if (this.vistaActual === 'mes') {
      this.generarVistaMes();
    } else if (this.vistaActual === 'semana') {
      this.generarVistaSemana();
    } else {
      this.generarVistaDia();
    }
  }

  generarVistaMes() {
    this.diasCalendario = [];
    const primerDia = new Date(this.anioActual, this.mesActual, 1);
    const ultimoDia = new Date(this.anioActual, this.mesActual + 1, 0);

    const diaSemanaInicio = primerDia.getDay();
    for (let i = diaSemanaInicio - 1; i >= 0; i--) {
      const fecha = new Date(this.anioActual, this.mesActual, -i);
      this.diasCalendario.push(this.crearDiaCalendario(fecha, false));
    }

    for (let dia = 1; dia <= ultimoDia.getDate(); dia++) {
      const fecha = new Date(this.anioActual, this.mesActual, dia);
      this.diasCalendario.push(this.crearDiaCalendario(fecha, true));
    }

    const diasRestantes = 42 - this.diasCalendario.length;
    for (let i = 1; i <= diasRestantes; i++) {
      const fecha = new Date(this.anioActual, this.mesActual + 1, i);
      this.diasCalendario.push(this.crearDiaCalendario(fecha, false));
    }
  }

  generarVistaSemana() {
    this.diasSemana = [];
    const inicioSemana = this.obtenerInicioSemana(this.fechaActual);

    for (let i = 0; i < 7; i++) {
      const fecha = new Date(inicioSemana);
      fecha.setDate(fecha.getDate() + i);
      this.diasSemana.push(this.crearDiaCalendario(fecha, true));
    }
  }

  generarVistaDia() {
    this.diasSemana = [this.crearDiaCalendario(this.fechaActual, true)];
  }

  crearDiaCalendario(fecha: Date, esMesActual: boolean): DiaCalendario {
    const hoy = new Date();
    const esHoy = fecha.toDateString() === hoy.toDateString();

    return {
      fecha: new Date(fecha),
      dia: fecha.getDate(),
      esHoy: esHoy,
      esMesActual: esMesActual,
      actividades: this.obtenerActividadesDia(fecha),
      horarios: this.obtenerHorariosDia(fecha),
      tareasConHora: this.obtenerTareasDia(fecha, true),
      tareasSinHora: this.obtenerTareasDia(fecha, false)
    };
  }

  obtenerActividadesDia(fecha: Date): Actividad[] {
    if (!this.mostrarActividades) return [];

    return this.actividades.filter(act => {
      const fechaActividad = new Date(act.fecha_hora_inicio);
      return fechaActividad.toDateString() === fecha.toDateString() &&
             this.cumpleFiltros(act);
    });
  }

  obtenerHorariosDia(fecha: Date): Horario[] {
    if (!this.mostrarHorarios) return [];

    const diaSemana = fecha.getDay() + 1;

    return this.horarios.filter(hor => {
      const cumpleColaborador = this.colaboradorSeleccionado === null ||
                                hor.id_colaborador === this.colaboradorSeleccionado;
      const cumpleGrupo = this.grupoSeleccionado === null ||
                         hor.id_grupo === this.grupoSeleccionado;

      return hor.id_dia_semana === diaSemana && cumpleColaborador && cumpleGrupo;
    });
  }

  /**
   * Obtiene las tareas de un día concreto.
   * @param conHora - true para tareas con hora_inicio, false para tareas sin hora (todo el día)
   */
  obtenerTareasDia(fecha: Date, conHora: boolean): Tarea[] {
    if (!this.mostrarTareas) return [];

    return this.tareas.filter(tarea => {
      if (!tarea.fecha_limite) return false;

      const fechaTarea = this.fechaLimiteADate(tarea.fecha_limite);
      if (fechaTarea.toDateString() !== fecha.toDateString()) return false;

      const tieneHora = this.tareaTieneHoraValida(tarea);
      if (conHora !== tieneHora) return false;

      return this.cumpleFiltrosTarea(tarea);
    });
  }

  /**
   * Indica si una tarea tiene una hora de inicio real.
   * Una hora "00:00" o "00:00:00" se considera sin hora (input vacío / medianoche por defecto).
   */
  private tareaTieneHoraValida(tarea: Tarea): boolean {
    if (!tarea.hora_inicio) return false;
    const minutos = this.horaStringAMinutos(tarea.hora_inicio);
    return minutos > 0;
  }

  /**
   * Convierte fecha_limite ("YYYY-MM-DD" o "YYYY-MM-DD HH:MM:SS") a Date local.
   */
  private fechaLimiteADate(fechaLimite: string): Date {
    const soloFecha = fechaLimite.split(' ')[0];
    const partes = soloFecha.split('-').map(Number);
    return new Date(partes[0], partes[1] - 1, partes[2]);
  }

  cumpleFiltros(actividad: Actividad): boolean {
    if (this.colaboradorSeleccionado !== null &&
        actividad.id_colaborador !== this.colaboradorSeleccionado) {
      return false;
    }

    if (this.categoriaSeleccionada !== null &&
        actividad.id_categoria !== this.categoriaSeleccionada) {
      return false;
    }

    if (this.estadoSeleccionado !== null &&
        actividad.id_estado !== this.estadoSeleccionado) {
      return false;
    }

    return true;
  }

  /**
   * Aplica el filtro de colaborador a una tarea.
   */
  cumpleFiltrosTarea(tarea: Tarea): boolean {
    if (this.colaboradorSeleccionado !== null &&
        tarea.id_colaborador !== this.colaboradorSeleccionado) {
      return false;
    }
    return true;
  }

  // ==================== NAVEGACIÓN ====================

  /**
   * Marca un día al hacer clic en su celda (vista mes). No cambia de vista.
   */
  seleccionarDia(dia: DiaCalendario) {
    this.fechaSeleccionada = new Date(dia.fecha);
  }

  /**
   * Indica si una celda corresponde al día actualmente marcado.
   */
  esDiaSeleccionado(dia: DiaCalendario): boolean {
    if (!this.fechaSeleccionada) return false;
    return dia.fecha.toDateString() === this.fechaSeleccionada.toDateString();
  }

  cambiarVista(vista: TipoVista) {
    const vistaAnterior = this.vistaActual;
    this.vistaActual = vista;

    // Al salir de la vista mes hacia semana/día, sincronizar fechaActual.
    if (vistaAnterior === 'mes' && vista !== 'mes') {
      if (this.fechaSeleccionada) {
        this.fechaActual = new Date(this.fechaSeleccionada);
      } else {
        this.sincronizarFechaConMes();
      }
    }

    // Al entrar a la vista mes desde semana/día, alinear mes/año con fechaActual.
    if (vistaAnterior !== 'mes' && vista === 'mes') {
      this.mesActual = this.fechaActual.getMonth();
      this.anioActual = this.fechaActual.getFullYear();
      this.cargarDatosDelMes();
      return;
    }

    this.generarCalendario();
  }

  /**
   * Ajusta fechaActual al mes/año seleccionado.
   * Si el mes seleccionado es el actual, usa el día de hoy; si no, el día 1.
   */
  private sincronizarFechaConMes() {
    const hoy = new Date();
    if (this.mesActual === hoy.getMonth() && this.anioActual === hoy.getFullYear()) {
      this.fechaActual = new Date();
    } else {
      this.fechaActual = new Date(this.anioActual, this.mesActual, 1);
    }
  }

  mesAnterior() {
    if (this.vistaActual === 'mes') {
      this.mesActual--;
      if (this.mesActual < 0) {
        this.mesActual = 11;
        this.anioActual--;
      }
      this.cargarDatosDelMes();
    } else if (this.vistaActual === 'semana') {
      this.fechaActual = new Date(this.fechaActual);
      this.fechaActual.setDate(this.fechaActual.getDate() - 7);
      this.refrescarTrasNavegar('semana');
    } else {
      this.fechaActual = new Date(this.fechaActual);
      this.fechaActual.setDate(this.fechaActual.getDate() - 1);
      this.refrescarTrasNavegar('dia');
    }
  }

  mesSiguiente() {
    if (this.vistaActual === 'mes') {
      this.mesActual++;
      if (this.mesActual > 11) {
        this.mesActual = 0;
        this.anioActual++;
      }
      this.cargarDatosDelMes();
    } else if (this.vistaActual === 'semana') {
      this.fechaActual = new Date(this.fechaActual);
      this.fechaActual.setDate(this.fechaActual.getDate() + 7);
      this.refrescarTrasNavegar('semana');
    } else {
      this.fechaActual = new Date(this.fechaActual);
      this.fechaActual.setDate(this.fechaActual.getDate() + 1);
      this.refrescarTrasNavegar('dia');
    }
  }

  /**
   * Tras navegar en vista semana/día: si fechaActual cambió de mes,
   * recarga los datos del nuevo mes; si no, solo regenera la vista.
   */
  private refrescarTrasNavegar(vista: 'semana' | 'dia') {
    const nuevoMes = this.fechaActual.getMonth();
    const nuevoAnio = this.fechaActual.getFullYear();

    if (nuevoMes !== this.mesActual || nuevoAnio !== this.anioActual) {
      this.mesActual = nuevoMes;
      this.anioActual = nuevoAnio;
      this.cargarDatosDelMes();
    } else if (vista === 'semana') {
      this.generarVistaSemana();
    } else {
      this.generarVistaDia();
    }
  }

  irHoy() {
    this.fechaActual = new Date();
    this.mesActual = this.fechaActual.getMonth();
    this.anioActual = this.fechaActual.getFullYear();

    if (this.vistaActual === 'mes') {
      this.cargarDatosDelMes();
    } else {
      this.generarCalendario();
    }
  }

  /**
   * Cambia el mes desde el selector rápido (vista mes).
   */
  cambiarMesSelector() {
    this.cargarDatosDelMes();
  }

  /**
   * Cambia el año desde el selector rápido (vista mes).
   */
  cambiarAnioSelector() {
    this.cargarDatosDelMes();
  }

  // ==================== FILTROS ====================

  aplicarFiltroColaborador(event: any) {
    const valor = event.target.value;
    this.colaboradorSeleccionado = valor === '' ? null : Number(valor);
    this.generarCalendario();
  }

  aplicarFiltroGrupo(event: any) {
    const valor = event.target.value;
    this.grupoSeleccionado = valor === '' ? null : Number(valor);
    this.generarCalendario();
  }

  aplicarFiltroCategoria(event: any) {
    const valor = event.target.value;
    this.categoriaSeleccionada = valor === '' ? null : Number(valor);
    this.generarCalendario();
  }

  toggleMostrarHorarios() {
    if (this.mostrarHorarios && this.horarios.length === 0) {
      this.cargarHorarios();
    } else {
      this.calcularRangoHorario();
      this.generarCalendario();
    }
  }

  toggleMostrarActividades() {
    this.calcularRangoHorario();
    this.generarCalendario();
  }

  toggleMostrarTareas() {
    if (this.mostrarTareas && this.tareas.length === 0) {
      this.cargarTareas();
    } else {
      this.calcularRangoHorario();
      this.generarCalendario();
    }
  }

  limpiarFiltros() {
    this.colaboradorSeleccionado = null;
    this.grupoSeleccionado = null;
    this.categoriaSeleccionada = null;
    this.estadoSeleccionado = null;
    this.mostrarHorarios = true;
    this.mostrarActividades = true;
    this.mostrarTareas = true;
    this.generarCalendario();
  }

  // ==================== ACCIONES ====================

  verDetalleActividad(actividad: Actividad) {
    const sobrenombre = actividad.sobrenombre_colaborador || actividad.nombre_colaborador;

    Swal.fire({
      title: `${actividad.icono_categoria} ${actividad.nombre_tipo_actividad}`,
      html: `
        <div style="text-align: left;">
          <p><strong>Colaborador:</strong> ${actividad.nombre_colaborador}</p>
          <p><strong>Categoría:</strong> ${actividad.icono_categoria} ${actividad.nombre_categoria}</p>
          <p><strong>Estado:</strong> <span style="color: ${actividad.color_estado}">${actividad.nombre_estado}</span></p>
          <p><strong>Inicio:</strong> ${this.formatearFechaHora(actividad.fecha_hora_inicio)}</p>
          <p><strong>Fin:</strong> ${this.formatearFechaHora(actividad.fecha_hora_fin)}</p>
          <p><strong>Duración:</strong> ${this.formatearMinutos(actividad.minutos_totales)}</p>
          ${actividad.valor_hora ? `<p><strong>Valor hora:</strong> $${actividad.valor_hora.toLocaleString('es-CO')}</p>` : ''}
          ${actividad.observaciones ? `<p><strong>Observaciones:</strong> ${actividad.observaciones}</p>` : ''}
        </div>
      `,
      icon: 'info',
      confirmButtonText: 'Cerrar',
      width: '500px'
    });
  }

  verDetalleHorario(horario: Horario) {
    const sobrenombre = horario.sobrenombre_docente || horario.nombre_docente;

    Swal.fire({
      title: `📚 ${this.capitalizar(horario.nombre_area_academica)}`,
      html: `
        <div style="text-align: left;">
          <p><strong>Colaborador:</strong> ${horario.nombre_docente}</p>
          <p><strong>Grupo:</strong> <span style="color: ${horario.color_grupo}">${horario.nombre_grupo}</span></p>
          <p><strong>Día:</strong> ${horario.nombre_dia_semana}</p>
          <p><strong>Horario:</strong> ${horario.hora_inicial} - ${horario.hora_final}</p>
          <p><strong>Duración:</strong> ${this.formatearMinutos(horario.total_minutos)}</p>
        </div>
      `,
      icon: 'info',
      confirmButtonText: 'Cerrar',
      width: '500px'
    });
  }

  verDetalleTarea(tarea: Tarea) {
    const horaTexto = this.tareaTieneHoraValida(tarea)
      ? `${this.formatearHora(tarea.hora_inicio!)}${tarea.hora_fin ? ' - ' + this.formatearHora(tarea.hora_fin) : ''}`
      : 'Todo el día';

    const vencida = this.esTareaVencida(tarea);

    Swal.fire({
      title: `${this.iconoDeTarea(tarea)} ${tarea.nombre_tipo_tarea || 'Tarea'}`,
      html: `
        <div style="text-align: left;">
          <p><strong>Colaborador:</strong> ${tarea.nombre_colaborador}</p>
          ${tarea.nombre_estudiante ? `<p><strong>Estudiante:</strong> ${tarea.nombre_estudiante}</p>` : ''}
          <p><strong>Descripción:</strong> ${tarea.descripcion}</p>
          <p><strong>Estado:</strong> <span style="color: ${tarea.color_estado}">${tarea.nombre_estado}</span></p>
          <p><strong>Fecha límite:</strong> ${this.formatearFechaCorta(tarea.fecha_limite)}</p>
          <p><strong>Hora:</strong> ${horaTexto}</p>
          ${vencida ? '<p style="color: #dc3545;"><strong>⚠️ Tarea vencida</strong></p>' : ''}
          ${tarea.observaciones ? `<p><strong>Observaciones:</strong> ${tarea.observaciones}</p>` : ''}
          <hr>
          <p style="margin-bottom: 6px;"><strong>Cambiar estado:</strong></p>
          <div style="display: flex; gap: 6px; flex-wrap: wrap;">
            <button class="btn-estado-tarea" data-estado="1"
              style="flex: 1; min-width: 90px; padding: 6px 10px; border: 1.5px solid #ffc107; background: ${tarea.id_estado === 1 ? '#ffc107' : 'white'}; color: ${tarea.id_estado === 1 ? 'white' : '#ffc107'}; border-radius: 6px; cursor: pointer; font-weight: 600;">
              Registrado
            </button>
            <button class="btn-estado-tarea" data-estado="2"
              style="flex: 1; min-width: 90px; padding: 6px 10px; border: 1.5px solid #28a745; background: ${tarea.id_estado === 2 ? '#28a745' : 'white'}; color: ${tarea.id_estado === 2 ? 'white' : '#28a745'}; border-radius: 6px; cursor: pointer; font-weight: 600;">
              Realizado
            </button>
            <button class="btn-estado-tarea" data-estado="3"
              style="flex: 1; min-width: 90px; padding: 6px 10px; border: 1.5px solid #dc3545; background: ${tarea.id_estado === 3 ? '#dc3545' : 'white'}; color: ${tarea.id_estado === 3 ? 'white' : '#dc3545'}; border-radius: 6px; cursor: pointer; font-weight: 600;">
              Cancelado
            </button>
          </div>
        </div>
      `,
      icon: 'info',
      confirmButtonText: 'Cerrar',
      width: '500px',
      didOpen: () => {
        const botones = document.querySelectorAll('.btn-estado-tarea');
        botones.forEach(boton => {
          boton.addEventListener('click', () => {
            const nuevoEstado = Number((boton as HTMLElement).dataset['estado']);
            if (nuevoEstado === tarea.id_estado) {
              return;
            }
            this.cambiarEstadoTarea(tarea, nuevoEstado);
          });
        });
      }
    });
  }

  /**
   * Cambia el estado de una tarea vía backend y refresca el calendario.
   */
  cambiarEstadoTarea(tarea: Tarea, nuevoEstado: number) {
    this.tareasColaboradoresService.cambiarEstado(tarea.id, nuevoEstado).subscribe({
      next: () => {
        Swal.close();
        Swal.fire({
          title: 'Estado actualizado',
          text: 'El estado de la tarea se actualizó correctamente.',
          icon: 'success',
          timer: 1500,
          showConfirmButton: false
        });
        this.cargarTareas();
      },
      error: error => {
        console.error('Error al cambiar estado de la tarea:', error);
        Swal.fire({
          title: 'Error',
          text: 'No se pudo actualizar el estado de la tarea.',
          icon: 'error',
          confirmButtonText: 'Aceptar'
        });
      }
    });
  }

  /**
   * Modal con listado completo de todas las actividades, horarios y tareas de un día.
   * Cada item es clickeable y abre el detalle individual correspondiente.
   */
  verTodoDia(dia: DiaCalendario) {
    const fechaFormateada = dia.fecha.toLocaleDateString('es-CO', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    const tareasDelDia = [...dia.tareasSinHora, ...dia.tareasConHora];

    let contenido = '<div style="text-align: left; max-height: 60vh; overflow-y: auto;">';

    if (dia.actividades.length > 0) {
      contenido += '<h6 style="margin-top: 0.5rem; color: #424242;">Actividades</h6>';
      dia.actividades.forEach((act, idx) => {
        const horaIni = this.formatearHora(this.extraerHora(act.fecha_hora_inicio));
        const horaFin = this.formatearHora(this.extraerHora(act.fecha_hora_fin));
        const colab = act.sobrenombre_colaborador || act.nombre_colaborador;
        contenido += `
          <div class="item-todo-dia" data-tipo="actividad" data-idx="${idx}"
               style="background: ${act.color_categoria}; color: white; padding: 8px 12px; border-radius: 6px; margin-bottom: 6px; cursor: pointer;">
            <div style="font-weight: 600;">${act.icono_categoria} ${act.nombre_tipo_actividad} - ${horaIni} - ${horaFin}</div>
            <small style="opacity: 0.9;">${colab}</small>
          </div>
        `;
      });
    }

    if (dia.horarios.length > 0) {
      contenido += '<h6 style="margin-top: 1rem; color: #424242;">Horarios de Clase</h6>';
      dia.horarios.forEach((hor, idx) => {
        const horaIni = this.formatearHora(hor.hora_inicial);
        const horaFin = this.formatearHora(hor.hora_final);
        const docente = hor.sobrenombre_docente || hor.nombre_docente;
        const area = this.capitalizar(hor.nombre_area_academica);
        contenido += `
          <div class="item-todo-dia" data-tipo="horario" data-idx="${idx}"
               style="background: #f5f5f5; border-left: 4px solid ${hor.color_grupo}; padding: 8px 12px; border-radius: 6px; margin-bottom: 6px; cursor: pointer; color: #424242;">
            <div style="font-weight: 600;">📚 ${hor.nombre_grupo} - ${area} - ${horaIni} - ${horaFin}</div>
            <small style="color: #757575;">${docente}</small>
          </div>
        `;
      });
    }

    if (tareasDelDia.length > 0) {
      contenido += '<h6 style="margin-top: 1rem; color: #424242;">Tareas</h6>';
      tareasDelDia.forEach((tarea, idx) => {
        const horaTexto = this.tareaTieneHoraValida(tarea)
          ? `${this.formatearHora(tarea.hora_inicio!)}${tarea.hora_fin ? ' - ' + this.formatearHora(tarea.hora_fin) : ''}`
          : 'Todo el día';
        contenido += `
          <div class="item-todo-dia" data-tipo="tarea" data-idx="${idx}"
               style="background: #f5f5f5; border-left: 4px solid ${tarea.color_estado}; padding: 8px 12px; border-radius: 6px; margin-bottom: 6px; cursor: pointer; color: #424242;">
            <div style="font-weight: 600;">${this.iconoDeTarea(tarea)} ${tarea.descripcion} - ${horaTexto}</div>
            <small style="color: #757575;">${tarea.nombre_colaborador}</small>
          </div>
        `;
      });
    }

    contenido += '</div>';

    Swal.fire({
      title: this.capitalizar(fechaFormateada),
      html: contenido,
      showConfirmButton: false,
      showCloseButton: true,
      width: '600px',
      didOpen: () => {
        const items = document.querySelectorAll('.item-todo-dia');
        items.forEach(item => {
          item.addEventListener('click', () => {
            const tipo = (item as HTMLElement).dataset['tipo'];
            const idx = Number((item as HTMLElement).dataset['idx']);
            Swal.close();
            setTimeout(() => {
              if (tipo === 'actividad') {
                this.verDetalleActividad(dia.actividades[idx]);
              } else if (tipo === 'horario') {
                this.verDetalleHorario(dia.horarios[idx]);
              } else {
                this.verDetalleTarea(tareasDelDia[idx]);
              }
            }, 200);
          });
        });
      }
    });
  }

  // ==================== CÁLCULOS PARA VISTAS ====================

  calcularPosicionActividad(fechaHora: string): string {
    const hora = fechaHora.split(' ')[1];
    const [horas, minutos] = hora.split(':').map(Number);
    const pixelesPorHora = 60;
    const horaRelativa = (horas - this.horaInicio) + (minutos / 60);
    const posicion = horaRelativa * pixelesPorHora;
    return `${posicion}px`;
  }

  calcularPosicionHorario(hora: string): string {
    const [horas, minutos] = hora.split(':').map(Number);
    const pixelesPorHora = 60;
    const horaRelativa = (horas - this.horaInicio) + (minutos / 60);
    const posicion = horaRelativa * pixelesPorHora;
    return `${posicion}px`;
  }

  /**
   * Posición vertical de una tarea con hora dentro del grid.
   */
  calcularPosicionTarea(tarea: Tarea): string {
    if (!tarea.hora_inicio) return '0px';
    return this.calcularPosicionHorario(tarea.hora_inicio);
  }

  calcularAlturaActividad(minutos: number): string {
    const pixelesPorMinuto = 1;
    const altura = Math.max(minutos * pixelesPorMinuto, 30);
    return `${altura}px`;
  }

  /**
   * Altura de una tarea con hora dentro del grid (usa duración default si no tiene hora_fin).
   */
  calcularAlturaTarea(tarea: Tarea): string {
    return this.calcularAlturaActividad(this.minutosTarea(tarea));
  }

  /**
   * Título compacto para un horario de clase en vista semana.
   * Formato: "Grupo - Area - HH:MM - HH:MM"
   */
  tituloCompactoHorario(horario: Horario): string {
    const inicio = this.formatearHora(horario.hora_inicial);
    const fin = this.formatearHora(horario.hora_final);
    const area = this.abreviarArea(horario.nombre_area_academica);
    return `${horario.nombre_grupo} - ${area} - ${inicio} - ${fin}`;
  }

  /**
   * Título compacto para una actividad en vista semana.
   * Formato: "Tipo - HH:MM - HH:MM"
   */
  tituloCompactoActividad(actividad: Actividad): string {
    const inicio = this.formatearHora(this.extraerHora(actividad.fecha_hora_inicio));
    const fin = this.formatearHora(this.extraerHora(actividad.fecha_hora_fin));
    return `${actividad.nombre_tipo_actividad} - ${inicio} - ${fin}`;
  }

  /**
   * Título compacto para una tarea con hora en vista semana.
   * Formato: "Descripción corta - HH:MM"
   */
  tituloCompactoTarea(tarea: Tarea): string {
    const inicio = this.tareaTieneHoraValida(tarea) ? this.formatearHora(tarea.hora_inicio!) : '';
    const desc = this.descripcionCorta(tarea);
    return inicio ? `${desc} - ${inicio}` : desc;
  }

  /**
   * Indica si un bloque es corto (<=30 min) para ocultar información secundaria.
   */
  esBloqueCorto(minutos: number): boolean {
    return minutos <= 30;
  }

  /**
   * Indica si una tarea ocupa un bloque corto en el grid.
   */
  esTareaCorta(tarea: Tarea): boolean {
    return this.esBloqueCorto(this.minutosTarea(tarea));
  }

  // Límites de items visibles por categoría en la vista mes
  private readonly maxActividadesMes = 3;
  private readonly maxHorariosMes = 2;
  private readonly maxTareasMes = 2;

  /**
   * Total de items (actividades + horarios + tareas) de un día en vista mes.
   */
  totalItemsDia(dia: DiaCalendario): number {
    return dia.actividades.length + dia.horarios.length +
           dia.tareasSinHora.length + dia.tareasConHora.length;
  }

  /**
   * Cantidad de items que realmente se muestran en la celda del mes
   * (considerando el límite por categoría).
   */
  itemsVisiblesDia(dia: DiaCalendario): number {
    const totalTareas = dia.tareasSinHora.length + dia.tareasConHora.length;
    return Math.min(dia.actividades.length, this.maxActividadesMes) +
           Math.min(dia.horarios.length, this.maxHorariosMes) +
           Math.min(totalTareas, this.maxTareasMes);
  }

  /**
   * Cantidad de items ocultos en la celda del mes (los que no se alcanzan a ver).
   */
  itemsOcultosDia(dia: DiaCalendario): number {
    return this.totalItemsDia(dia) - this.itemsVisiblesDia(dia);
  }

  /**
   * Convierte un texto a formato título: "CIENCIAS NUMÉRICAS Y LÓGICA" -> "Ciencias Numéricas Y Lógica"
   */
  capitalizar(texto: string): string {
    if (!texto) return '';
    return texto
      .toLowerCase()
      .split(/(\s+)/)
      .map(palabra => palabra.length > 0 ? palabra.charAt(0).toUpperCase() + palabra.slice(1) : palabra)
      .join('');
  }

  /**
   * Abrevia el nombre de un área para mostrar en bloques compactos.
   * - Una palabra >6 letras: trunca con "..." (ej: "Matemáticas" -> "Matemá...")
   * - Una palabra ≤6 letras: se deja igual capitalizada (ej: "Inglés")
   * - Varias palabras: iniciales ignorando conectores (ej: "Ciencias Del Lenguaje Y Comunicación" -> "CLC")
   */
  abreviarArea(texto: string): string {
    if (!texto) return '';

    const conectores = ['y', 'e', 'o', 'u', 'de', 'del', 'la', 'el', 'las', 'los', 'en', 'a'];
    const palabras = texto.trim().split(/\s+/);

    if (palabras.length === 1) {
      const unica = this.capitalizar(palabras[0]);
      return unica.length > 6 ? unica.substring(0, 6) + '...' : unica;
    }

    return palabras
      .filter(p => !conectores.includes(p.toLowerCase()))
      .map(p => p.charAt(0).toUpperCase())
      .join('');
  }

  /**
   * Devuelve el mapeo único de abreviaturas de áreas presentes en los horarios cargados.
   * Solo áreas con nombre >1 palabra o >6 letras (las que realmente se abrevian).
   */
  get abreviaturasAreas(): { abreviatura: string; nombreCompleto: string }[] {
    if (!this.horarios || this.horarios.length === 0) return [];

    const mapa = new Map<string, string>();
    this.horarios.forEach(h => {
      const nombre = h.nombre_area_academica;
      if (!nombre) return;
      const abreviatura = this.abreviarArea(nombre);
      const capitalizado = this.capitalizar(nombre);
      // Solo incluir si la abreviatura es diferente del nombre capitalizado
      if (abreviatura !== capitalizado && !mapa.has(abreviatura)) {
        mapa.set(abreviatura, capitalizado);
      }
    });

    return Array.from(mapa.entries())
      .map(([abreviatura, nombreCompleto]) => ({ abreviatura, nombreCompleto }))
      .sort((a, b) => a.abreviatura.localeCompare(b.abreviatura));
  }

  // ==================== UTILIDADES ====================

  obtenerInicioSemana(fecha: Date): Date {
    const dia = fecha.getDay();
    const diff = fecha.getDate() - dia;
    return new Date(fecha.getFullYear(), fecha.getMonth(), diff);
  }

  formatearMinutos(minutos: number): string {
    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;
    return `${horas}h ${mins}m`;
  }

  formatearFechaHora(fechaHora: string): string {
    const fecha = new Date(fechaHora);
    return fecha.toLocaleString('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Formatea una fecha "YYYY-MM-DD" a formato corto local sin desfase de zona horaria.
   */
  formatearFechaCorta(fecha: string): string {
    if (!fecha) return '';
    const soloFecha = fecha.split(' ')[0];
    const partes = soloFecha.split('-').map(Number);
    const d = new Date(partes[0], partes[1] - 1, partes[2]);
    return d.toLocaleDateString('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  formatearHora(hora: string): string {
    return hora.substring(0, 5);
  }

  obtenerNombreMesAnio(): string {
    return `${this.nombresMeses[this.mesActual]} ${this.anioActual}`;
  }

  obtenerRangoSemana(): string {
    if (this.diasSemana.length === 0) return '';
    const inicio = this.diasSemana[0].fecha;
    const fin = this.diasSemana[6].fecha;
    return `${inicio.getDate()} ${this.nombresMeses[inicio.getMonth()]} - ${fin.getDate()} ${this.nombresMeses[fin.getMonth()]} ${fin.getFullYear()}`;
  }

  obtenerFechaDia(): string {
    return this.fechaActual.toLocaleDateString('es-CO', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }

  regresar() {
    this.router.navigate(['/administracion/actividades-colaboradores']);
  }
}