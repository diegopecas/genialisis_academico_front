import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { HeaderComponent } from '../../../common/header/header.component';
import { SearchableDropdownComponent, DropdownItem } from '../../../common/searchable-dropdown/searchable-dropdown.component';
import { HoraInputComponent } from '../../../common/hora-input/hora-input.component';
import { UtilService } from '../../../common/constantes/util.service';
import { GruposService } from '../../../services/grupos.service';
import { SprintsService } from '../../../services/sprints.service';
import { DocentesService } from '../../../services/docentes.service';
import { AreasAcademicasService } from '../../../services/areas-academicas.service';
import { ParametrosCalificacionesService } from '../../../services/parametros-calificaciones.service';
import { ValoresParametrosCalificacionesService } from '../../../services/valores-parametros-calificaciones.service';
import { CalificacionesService } from '../../../services/calificaciones.service';
import { AgregarActividadRapidaComponent, ActividadAgregada } from './agregar-actividad-rapida/agregar-actividad-rapida.component';
import Swal from 'sweetalert2';

/** Lo que tiene un estudiante en una franja: la actividad y su valor por parámetro. */
interface CeldaRapida {
  id_tarea: string | null;
  // Actividad que tenía al cargar la pantalla; si cambia, el back quita lo de la anterior
  id_tarea_anterior: string | null;
  valores: { [idParametro: string]: string };
}

/**
 * Una columna de la calificación rápida. Sale del horario del grupo para el
 * día, o es un área que se agregó fuera del horario (o que ya tenía una
 * actividad ejecutada ese día sin franja asociada).
 */
interface FranjaRapida {
  clave: string;
  id_horario: string | null;
  id_area_academica: string;
  nombre_area: string;
  color_area: string | null;
  nombre_franja: string | null;
  hora_inicial: string;
  hora_final: string;
  fuera_horario: boolean;
  id_docente: string | null;
  // "Aplicar a todos": lo que se escoge aquí se copia a las celdas que no se
  // han ajustado una por una
  actividadGeneral: string | null;
  valoresGenerales: { [idParametro: string]: string };
  celdas: { [idEstudiante: string]: CeldaRapida };
  opciones: DropdownItem[];
}

@Component({
  selector: 'app-calificacion-rapida',
  templateUrl: './calificacion-rapida.component.html',
  styleUrl: './calificacion-rapida.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, SearchableDropdownComponent, HoraInputComponent, AgregarActividadRapidaComponent]
})
export class CalificacionRapidaComponent implements OnInit, OnDestroy {

  public titulo = 'Calificación Rápida';

  // Filtros
  public fecha: string = '';
  public fechaTexto: string = '';
  public fechaInvalida: boolean = false;
  public fechaMinima: string = '';
  public fechaMaxima: string = '';
  public idGrupo: string = '';
  public grupos: any[] = [];
  public gruposItems: DropdownItem[] = [];

  // Datos de la vista
  public sprint: any = null;
  public estudiantes: any[] = [];
  public franjas: FranjaRapida[] = [];
  public parametros: any[] = [];
  public docentesItems: DropdownItem[] = [];
  public areasGrupo: any[] = [];
  private tareas: { [id: string]: any } = {};
  private valorPorId: { [id: string]: any } = {};
  private usuario: any = {};

  // Estado de la pantalla
  public cargandoInicial: boolean = true;
  public vistaCargada: boolean = false;
  public sinSprint: boolean = false;
  public guardando: boolean = false;
  public hayCambios: boolean = false;
  public esMovil: boolean = false;
  public indiceFranjaActiva: number = 0;

  // Agregar un área fuera del horario
  public mostrarAgregarArea: boolean = false;
  public intentoAgregarArea: boolean = false;
  public nuevaArea = { id_area_academica: '', hora_inicial: '', hora_final: '', id_docente: null as string | null };

  // Franja a la que se le está creando o importando una actividad
  public franjaAgregarActividad: FranjaRapida | null = null;

  private consultaMovil: MediaQueryList | null = null;
  private alCambiarMovil = (evento: MediaQueryListEvent) => { this.esMovil = evento.matches; };

  constructor(
    private utilService: UtilService,
    private gruposService: GruposService,
    private sprintsService: SprintsService,
    private docentesService: DocentesService,
    private areasAcademicasService: AreasAcademicasService,
    private parametrosCalificacionesService: ParametrosCalificacionesService,
    private valoresParametrosCalificacionesService: ValoresParametrosCalificacionesService,
    private calificacionesService: CalificacionesService
  ) {}

  ngOnInit(): void {
    this.usuario = this.utilService.obtenerUsuarioActual() || {};

    // En móvil no se pinta la tabla sino una franja a la vez
    this.consultaMovil = window.matchMedia('(max-width: 768px)');
    this.esMovil = this.consultaMovil.matches;
    this.consultaMovil.addEventListener('change', this.alCambiarMovil);

    forkJoin({
      grupos: this.gruposService.obtenerTodos(),
      sprints: this.sprintsService.obtenerTodos(),
      docentes: this.docentesService.obtenerTodos(),
      parametros: this.parametrosCalificacionesService.obtenerTodos(),
      valores: this.valoresParametrosCalificacionesService.obtenerTodos()
    }).subscribe({
      next: ({ grupos, sprints, docentes, parametros, valores }: any) => {
        // Igual que en Calificaciones: solo los grupos calificables
        this.grupos = (grupos.body || []).filter((g: any) => Number(g.calificable) === 1);
        this.gruposItems = this.grupos.map((g: any) => ({ id: g.id, nombre: g.nombre }));

        this.docentesItems = (docentes.body || [])
          .filter((d: any) => Number(d.activo) === 1)
          .map((d: any) => ({ id: d.id, nombre: d.nombre_completo }));

        const todosValores: any[] = valores.body || [];
        todosValores.forEach((v: any) => { this.valorPorId[v.id] = v; });
        this.parametros = (parametros.body || []).map((p: any) => ({
          ...p,
          valores: todosValores
            .filter((v: any) => v.id_parametros_calificaciones == p.id)
            .sort((a: any, b: any) => a.valor_cuantitativo - b.valor_cuantitativo)
        }));

        const sprintActual = (sprints.body || []).find((s: any) => Number(s.actual) === 1) || null;
        this.prepararRangoFechas(sprintActual);
        this.cargandoInicial = false;
      },
      error: () => {
        this.cargandoInicial = false;
      }
    });
  }

  ngOnDestroy(): void {
    if (this.consultaMovil) {
      this.consultaMovil.removeEventListener('change', this.alCambiarMovil);
    }
  }

  /** Avisa al salir o recargar el navegador si hay calificaciones sin guardar. */
  @HostListener('window:beforeunload', ['$event'])
  alSalirDelNavegador(evento: BeforeUnloadEvent): void {
    if (this.hayCambios) {
      evento.preventDefault();
      evento.returnValue = '';
    }
  }

  // ========================================================================
  // FECHA Y GRUPO
  // ========================================================================

  /**
   * Solo se pueden escoger fechas del sprint actual y nunca futuras. Por
   * defecto queda hoy, o el último día del sprint si ya terminó.
   */
  private prepararRangoFechas(sprintActual: any): void {
    if (!sprintActual) {
      this.sinSprint = true;
      return;
    }
    this.sprint = sprintActual;
    const hoy = this.hoyIso();
    this.fechaMinima = String(sprintActual.fecha_inicial).substring(0, 10);
    const finSprint = String(sprintActual.fecha_final).substring(0, 10);
    this.fechaMaxima = finSprint < hoy ? finSprint : hoy;

    if (this.fechaMaxima < this.fechaMinima) {
      // El sprint actual todavía no empieza
      this.sinSprint = true;
      return;
    }
    this.asignarFecha(hoy >= this.fechaMinima && hoy <= this.fechaMaxima ? hoy : this.fechaMaxima);
  }

  private hoyIso(): string {
    const ahora = new Date();
    return this.fechaIso(ahora);
  }

  private fechaIso(fecha: Date): string {
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
  }

  private asignarFecha(iso: string): void {
    this.fecha = iso;
    const [anio, mes, dia] = iso.split('-');
    this.fechaTexto = `${dia}/${mes}/${anio}`;
    this.fechaInvalida = false;
  }

  /** Nombre del día de la fecha escogida, para que se vea qué horario aplica. */
  get nombreDiaFecha(): string {
    if (!this.fecha) return '';
    const [anio, mes, dia] = this.fecha.split('-').map(Number);
    const nombres = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    return nombres[new Date(anio, mes - 1, dia).getDay()];
  }

  /**
   * La fecha se puede escribir (también en el celular): "20/10/2026",
   * "20-10-2026", "20102026" o "2026-10-20". Se interpreta al salir del campo.
   */
  confirmarFechaTexto(): void {
    const iso = this.interpretarFecha(this.fechaTexto);
    if (!iso || iso < this.fechaMinima || iso > this.fechaMaxima) {
      this.fechaInvalida = true;
      return;
    }
    this.fechaInvalida = false;
    if (iso !== this.fecha) {
      this.cambiarFecha(iso);
    } else {
      this.asignarFecha(iso);
    }
  }

  private interpretarFecha(texto: string): string | null {
    const limpio = (texto || '').trim();
    let anio: number, mes: number, dia: number;

    let m = limpio.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (m) {
      anio = +m[1]; mes = +m[2]; dia = +m[3];
    } else if ((m = limpio.match(/^(\d{1,2})[\/\-.\s](\d{1,2})[\/\-.\s](\d{2,4})$/))) {
      dia = +m[1]; mes = +m[2]; anio = +m[3];
    } else if ((m = limpio.match(/^(\d{2})(\d{2})(\d{4})$/))) {
      dia = +m[1]; mes = +m[2]; anio = +m[3];
    } else {
      return null;
    }
    if (anio < 100) anio += 2000;

    const fecha = new Date(anio, mes - 1, dia);
    if (fecha.getFullYear() !== anio || fecha.getMonth() !== mes - 1 || fecha.getDate() !== dia) {
      return null;
    }
    return this.fechaIso(fecha);
  }

  /** Fecha escogida en el selector nativo (el botón del calendario). */
  alEscogerFechaCalendario(valor: string): void {
    if (!valor || valor === this.fecha) return;
    if (valor < this.fechaMinima || valor > this.fechaMaxima) {
      this.asignarFecha(this.fecha);
      return;
    }
    this.cambiarFecha(valor);
  }

  abrirCalendario(selector: HTMLInputElement): void {
    const conPicker = selector as any;
    if (typeof conPicker.showPicker === 'function') {
      try {
        conPicker.showPicker();
        return;
      } catch (e) {
        // Algunos navegadores no dejan abrirlo así; se cae al focus
      }
    }
    selector.focus();
    selector.click();
  }

  moverDia(dias: number): void {
    if (!this.fecha) return;
    const [anio, mes, dia] = this.fecha.split('-').map(Number);
    const nueva = this.fechaIso(new Date(anio, mes - 1, dia + dias));
    if (nueva < this.fechaMinima || nueva > this.fechaMaxima) return;
    this.cambiarFecha(nueva);
  }

  get puedeRetroceder(): boolean {
    return !!this.fecha && this.fecha > this.fechaMinima;
  }

  get puedeAvanzar(): boolean {
    return !!this.fecha && this.fecha < this.fechaMaxima;
  }

  private async cambiarFecha(iso: string): Promise<void> {
    if (!(await this.confirmarDescartarCambios())) {
      this.asignarFecha(this.fecha);
      return;
    }
    this.asignarFecha(iso);
    this.cargarVista();
  }

  async alCambiarGrupo(idGrupo: any): Promise<void> {
    const anterior = this.idGrupo;
    if (idGrupo === anterior) return;
    if (!(await this.confirmarDescartarCambios())) {
      // Se devuelve el dropdown al grupo que estaba
      this.idGrupo = '';
      setTimeout(() => { this.idGrupo = anterior; });
      return;
    }
    this.idGrupo = idGrupo || '';
    this.areasGrupo = [];
    this.cargarVista();
  }

  private async confirmarDescartarCambios(): Promise<boolean> {
    if (!this.hayCambios) return true;
    const respuesta = await Swal.fire({
      title: 'Hay calificaciones sin guardar',
      text: 'Si cambias la fecha o el grupo se pierden. ¿Quieres descartarlas?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#F5A623',
      cancelButtonColor: '#2C2C2C',
      confirmButtonText: 'Sí, descartar',
      cancelButtonText: 'Seguir editando'
    });
    return respuesta.isConfirmed;
  }

  // ========================================================================
  // CARGA DE LA VISTA
  // ========================================================================

  cargarVista(): void {
    this.vistaCargada = false;
    this.hayCambios = false;
    this.estudiantes = [];
    this.franjas = [];
    this.tareas = {};
    this.mostrarAgregarArea = false;
    if (!this.idGrupo || !this.fecha) return;

    // Las áreas del grupo se necesitan para armar las franjas fuera del
    // horario, así que se piden junto con la vista
    forkJoin({
      vista: this.calificacionesService.obtenerVistaCalificacionRapida(this.idGrupo, this.fecha),
      areas: this.areasAcademicasService.obtenerAreasAcademicasGrupo(this.idGrupo)
    }).subscribe({
      next: ({ vista, areas }: any) => {
        this.areasGrupo = areas.body || [];
        this.armarVista(vista.body || {});
        this.vistaCargada = true;
      },
      error: () => {
        this.vistaCargada = false;
      }
    });
  }

  /**
   * Arma las franjas y las celdas. Lo que ya se ejecutó ese día se ubica en
   * su franja: primero por el horario con el que se inició, luego por el
   * área y la hora, y si no encaja en ninguna, como un área fuera del horario.
   */
  private armarVista(vista: any): void {
    this.sprint = vista.sprint || this.sprint;

    this.estudiantes = (vista.estudiantes || []).map((e: any) => ({
      ...e,
      nombre: [e.primer_nombre, e.primer_apellido].filter((x: any) => !!x).join(' '),
      hora_ingreso: e.fecha_ingreso ? String(e.fecha_ingreso).substring(11, 16) : '',
      hora_salida: e.fecha_salida ? String(e.fecha_salida).substring(11, 16) : ''
    }));
    const idsEstudiantes = new Set(this.estudiantes.map((e: any) => e.id_estudiante));

    this.tareas = {};
    (vista.tareas || []).forEach((t: any) => {
      this.tareas[t.id_tarea_x_sprint] = { ...t, titulo_texto: this.textoPlano(t.titulo) };
    });

    const franjas: FranjaRapida[] = (vista.franjas || []).map((f: any) => this.nuevaFranja({
      clave: 'h-' + f.id_horario,
      id_horario: f.id_horario,
      id_area_academica: f.id_area_academica,
      nombre_area: f.nombre_area,
      color_area: f.color_area,
      nombre_franja: f.nombre_franja,
      hora_inicial: this.hhmm(f.hora_inicial),
      hora_final: this.hhmm(f.hora_final),
      fuera_horario: false,
      id_docente: this.docenteInicial(f.id_docente_area)
    }));

    // Estudiantes que tienen algo en cada tarea del día (nota o participación)
    const estudiantesPorTarea: { [idTarea: string]: Set<string> } = {};
    const agregar = (idTarea: string, idEst: string) => {
      if (!idsEstudiantes.has(idEst)) return;
      if (!estudiantesPorTarea[idTarea]) estudiantesPorTarea[idTarea] = new Set<string>();
      estudiantesPorTarea[idTarea].add(idEst);
    };
    (vista.participaciones || []).forEach((p: any) => agregar(p.id_tarea_x_sprint, p.id_estudiante));
    (vista.calificaciones || []).forEach((c: any) => agregar(c.id_tarea_x_sprint, c.id_estudiante));

    const tareasDelDia = Object.values(this.tareas)
      .filter((t: any) => Number(t.es_del_dia) === 1 && estudiantesPorTarea[t.id_tarea_x_sprint]);

    const franjaDeTarea: { [idTarea: string]: FranjaRapida } = {};
    tareasDelDia.forEach((t: any) => {
      const franja = this.ubicarTareaDelDia(t, franjas);
      franjaDeTarea[t.id_tarea_x_sprint] = franja;
      // El docente de una franja ya ejecutada es el que quedó en la actividad
      const docente = t.id_docente_inicia || t.id_docente;
      if (docente) {
        franja.id_docente = docente;
        this.asegurarDocenteEnLista(docente);
      }
    });

    franjas.sort((a, b) => a.hora_inicial.localeCompare(b.hora_inicial));

    // Celdas vacías para todos y luego lo ya registrado
    franjas.forEach((f) => {
      this.estudiantes.forEach((e: any) => {
        f.celdas[e.id_estudiante] = { id_tarea: null, id_tarea_anterior: null, valores: {} };
      });
    });

    Object.keys(franjaDeTarea).forEach((idTarea) => {
      const franja = franjaDeTarea[idTarea];
      estudiantesPorTarea[idTarea].forEach((idEst) => {
        const celda = franja.celdas[idEst];
        // Si un niño quedó en dos actividades de la misma franja se muestra la primera
        if (celda && !celda.id_tarea) {
          celda.id_tarea = idTarea;
          celda.id_tarea_anterior = idTarea;
        }
      });
    });

    (vista.calificaciones || []).forEach((c: any) => {
      const franja = franjaDeTarea[c.id_tarea_x_sprint];
      const celda = franja ? franja.celdas[c.id_estudiante] : null;
      if (celda && celda.id_tarea === c.id_tarea_x_sprint) {
        celda.valores[c.id_parametro_calificacion] = c.id_valor_parametro_calificacion;
      }
    });

    // Si en la franja quedó una sola actividad, esa es la general
    franjas.forEach((f) => {
      const usadas = new Set(Object.values(f.celdas).map((c) => c.id_tarea).filter((x) => !!x));
      if (usadas.size === 1) {
        f.actividadGeneral = Array.from(usadas)[0] as string;
      }
    });

    this.franjas = franjas;
    this.indiceFranjaActiva = 0;
    this.recalcularOpciones();
  }

  /** Busca (o crea) la franja de una actividad que ya se ejecutó o inició ese día. */
  private ubicarTareaDelDia(tarea: any, franjas: FranjaRapida[]): FranjaRapida {
    // 1. Por el horario con el que se inició
    if (tarea.id_horario) {
      const porHorario = franjas.find((f) => f.id_horario === tarea.id_horario);
      if (porHorario) return porHorario;
    }

    const momento = tarea.fecha_ejecucion_inicia || tarea.fecha_ejecucion || '';
    const horaInicio = this.hhmm(tarea.hora_inicial_horario) || String(momento).substring(11, 16);

    // 2. Por área y hora: la franja del área en la que cae la hora de inicio
    if (horaInicio) {
      const porHora = franjas.find((f) =>
        f.id_area_academica === tarea.id_area_academica &&
        horaInicio >= f.hora_inicial && horaInicio < f.hora_final
      );
      if (porHora) return porHora;
    }

    // 3. Área fuera del horario, una por área y hora de inicio
    const inicio = horaInicio || '08:00';
    const fin = this.hhmm(tarea.hora_final_horario) || this.sumarMinutos(inicio, Number(tarea.minutos_duracion) || 45);
    const existente = franjas.find((f) =>
      f.fuera_horario && f.id_area_academica === tarea.id_area_academica && f.hora_inicial === inicio
    );
    if (existente) return existente;

    const area = this.areasGrupo.find((a: any) => a.id_area_academica == tarea.id_area_academica);
    const nueva = this.nuevaFranja({
      clave: 'x-' + tarea.id_tarea_x_sprint,
      id_horario: null,
      id_area_academica: tarea.id_area_academica,
      nombre_area: area ? area.nombre_area_academica : 'Área',
      color_area: area ? area.color : null,
      nombre_franja: null,
      hora_inicial: inicio,
      hora_final: fin,
      fuera_horario: true,
      id_docente: this.docenteInicial(area ? area.id_docente : null)
    });
    franjas.push(nueva);
    return nueva;
  }

  private nuevaFranja(datos: Partial<FranjaRapida>): FranjaRapida {
    return {
      clave: datos.clave || ('x-' + Date.now()),
      id_horario: datos.id_horario || null,
      id_area_academica: datos.id_area_academica || '',
      nombre_area: datos.nombre_area || '',
      color_area: datos.color_area || null,
      nombre_franja: datos.nombre_franja || null,
      hora_inicial: datos.hora_inicial || '',
      hora_final: datos.hora_final || '',
      fuera_horario: !!datos.fuera_horario,
      id_docente: datos.id_docente || null,
      actividadGeneral: null,
      valoresGenerales: {},
      celdas: {},
      opciones: []
    };
  }

  /** Docente por defecto: el usuario logueado si es docente; si no, el del área en el grupo. */
  private docenteInicial(idDocenteArea: string | null): string | null {
    if (this.usuario && this.usuario.id_docente) {
      this.asegurarDocenteEnLista(this.usuario.id_docente);
      return this.usuario.id_docente;
    }
    if (idDocenteArea) {
      this.asegurarDocenteEnLista(idDocenteArea);
    }
    return idDocenteArea || null;
  }

  /** Un docente inactivo que ya quedó en una actividad debe seguir saliendo en la lista. */
  private asegurarDocenteEnLista(idDocente: string): void {
    if (!idDocente || this.docentesItems.some((d) => d.id === idDocente)) return;
    const nombre = idDocente === this.usuario?.id_docente
      ? [this.usuario.primer_nombre, this.usuario.primer_apellido].filter((x: any) => !!x).join(' ') || 'Docente'
      : 'Docente inactivo';
    this.docentesItems = [...this.docentesItems, { id: idDocente, nombre }];
  }

  // ========================================================================
  // OPCIONES DE ACTIVIDAD POR FRANJA
  // ========================================================================

  /**
   * Cada franja ofrece las actividades de su área (pendientes o del día) que
   * no estén ya escogidas en otra franja: una actividad tiene una sola fecha
   * y hora de ejecución.
   */
  private recalcularOpciones(): void {
    const usadaEn: { [idTarea: string]: string } = {};
    this.franjas.forEach((f) => {
      if (f.actividadGeneral) usadaEn[f.actividadGeneral] = f.clave;
      Object.values(f.celdas).forEach((c) => {
        if (c.id_tarea) usadaEn[c.id_tarea] = f.clave;
      });
    });

    this.franjas.forEach((f) => {
      f.opciones = Object.values(this.tareas)
        .filter((t: any) => t.id_area_academica === f.id_area_academica)
        .filter((t: any) => !usadaEn[t.id_tarea_x_sprint] || usadaEn[t.id_tarea_x_sprint] === f.clave)
        .map((t: any) => ({
          id: t.id_tarea_x_sprint,
          nombre: t.titulo_texto || 'Actividad sin título',
          descripcion: this.descripcionTarea(t)
        }));
    });
  }

  private descripcionTarea(t: any): string {
    const partes: string[] = [];
    if (Number(t.id_estado_tarea) === 2) {
      partes.push('Ejecutada este día');
    } else if (t.orden_ejecucion) {
      partes.push('#' + t.orden_ejecucion);
    }
    if (t.minutos_duracion) partes.push(t.minutos_duracion + ' min');
    return partes.join(' · ');
  }

  tituloTarea(idTarea: string | null): string {
    if (!idTarea) return '';
    return this.tareas[idTarea]?.titulo_texto || '';
  }

  // ========================================================================
  // ACTIVIDAD Y CALIFICACIÓN
  // ========================================================================

  /**
   * La actividad general se copia a las celdas vacías y a las que tenían la
   * general anterior; las que se cambiaron una por una se respetan.
   */
  cambiarActividadGeneral(franja: FranjaRapida, idTarea: any): void {
    const anterior = franja.actividadGeneral;
    const nueva = idTarea || null;
    franja.actividadGeneral = nueva;
    Object.values(franja.celdas).forEach((celda) => {
      if (!celda.id_tarea || celda.id_tarea === anterior) {
        celda.id_tarea = nueva;
      }
    });
    this.hayCambios = true;
    this.recalcularOpciones();
  }

  cambiarActividadCelda(franja: FranjaRapida, idEstudiante: string, idTarea: any): void {
    const celda = franja.celdas[idEstudiante];
    if (!celda) return;
    celda.id_tarea = idTarea || null;
    this.hayCambios = true;
    this.recalcularOpciones();
  }

  /**
   * El valor general se copia a las celdas con actividad que no tienen nota
   * en ese parámetro o que tenían el valor general anterior.
   */
  calificarGeneral(franja: FranjaRapida, parametro: any, valor: any): void {
    const anterior = franja.valoresGenerales[parametro.id];
    franja.valoresGenerales[parametro.id] = valor.id;
    let aplicados = 0;
    Object.values(franja.celdas).forEach((celda) => {
      if (!celda.id_tarea) return;
      const actual = celda.valores[parametro.id];
      if (!actual || actual === anterior) {
        celda.valores[parametro.id] = valor.id;
        aplicados++;
      }
    });
    this.hayCambios = true;
    if (aplicados === 0 && !this.franjaTieneActividades(franja)) {
      Swal.fire({ toast: true, position: 'top-end', icon: 'info', title: 'Escoge primero la actividad de la franja', showConfirmButton: false, timer: 2200 });
    }
  }

  calificarCelda(franja: FranjaRapida, idEstudiante: string, parametro: any, valor: any): void {
    const celda = franja.celdas[idEstudiante];
    if (!celda) return;
    if (!celda.id_tarea) {
      Swal.fire({ toast: true, position: 'top-end', icon: 'info', title: 'Escoge primero la actividad', showConfirmButton: false, timer: 2000 });
      return;
    }
    celda.valores[parametro.id] = valor.id;
    this.hayCambios = true;
  }

  /** Estrella encendida: el valor escogido es igual o mayor que el de la estrella. */
  estrellaActiva(idValorEscogido: string | undefined, valor: any): boolean {
    if (!idValorEscogido) return false;
    const escogido = this.valorPorId[idValorEscogido];
    return !!escogido && Number(escogido.valor_cuantitativo) >= Number(valor.valor_cuantitativo);
  }

  cambiarDocente(franja: FranjaRapida, idDocente: any): void {
    franja.id_docente = idDocente || null;
    this.hayCambios = true;
  }

  cambiarHoraFranja(franja: FranjaRapida, campo: 'hora_inicial' | 'hora_final', valor: string): void {
    franja[campo] = valor || '';
    this.hayCambios = true;
    if (campo === 'hora_inicial') {
      const activa = this.franjaActiva;
      this.franjas.sort((a, b) => a.hora_inicial.localeCompare(b.hora_inicial));
      if (activa) this.indiceFranjaActiva = this.franjas.indexOf(activa);
    }
  }

  private franjaTieneActividades(franja: FranjaRapida): boolean {
    return Object.values(franja.celdas).some((c) => !!c.id_tarea);
  }

  /** Cuántos estudiantes de la franja ya tienen actividad, para mostrarlo en el chip. */
  conActividad(franja: FranjaRapida): number {
    return Object.values(franja.celdas).filter((c) => !!c.id_tarea).length;
  }

  // ========================================================================
  // NAVEGACIÓN MÓVIL
  // ========================================================================

  get franjaActiva(): FranjaRapida | null {
    return this.franjas[this.indiceFranjaActiva] || null;
  }

  seleccionarFranja(indice: number): void {
    this.indiceFranjaActiva = indice;
    this.mostrarAgregarArea = false;
  }

  // ========================================================================
  // ÁREAS FUERA DEL HORARIO
  // ========================================================================

  abrirAgregarArea(): void {
    this.intentoAgregarArea = false;
    this.nuevaArea = {
      id_area_academica: '',
      hora_inicial: '',
      hora_final: '',
      id_docente: this.docenteInicial(null)
    };
    this.mostrarAgregarArea = true;
  }

  alEscogerAreaNueva(): void {
    // Si el usuario no es docente, se propone el docente del área en el grupo
    const area = this.areasGrupo.find((a: any) => a.id_area_academica == this.nuevaArea.id_area_academica);
    if (!this.nuevaArea.id_docente && area && area.id_docente) {
      this.asegurarDocenteEnLista(area.id_docente);
      this.nuevaArea.id_docente = area.id_docente;
    }
  }

  get horasNuevaAreaValidas(): boolean {
    return !!this.nuevaArea.hora_inicial && !!this.nuevaArea.hora_final
      && this.nuevaArea.hora_final > this.nuevaArea.hora_inicial;
  }

  agregarArea(): void {
    this.intentoAgregarArea = true;
    if (!this.nuevaArea.id_area_academica || !this.horasNuevaAreaValidas) {
      return;
    }
    const area = this.areasGrupo.find((a: any) => a.id_area_academica == this.nuevaArea.id_area_academica);
    const franja = this.nuevaFranja({
      clave: 'x-' + Date.now(),
      id_horario: null,
      id_area_academica: this.nuevaArea.id_area_academica,
      nombre_area: area ? area.nombre_area_academica : 'Área',
      color_area: area ? area.color : null,
      hora_inicial: this.nuevaArea.hora_inicial,
      hora_final: this.nuevaArea.hora_final,
      fuera_horario: true,
      id_docente: this.nuevaArea.id_docente
    });
    this.estudiantes.forEach((e: any) => {
      franja.celdas[e.id_estudiante] = { id_tarea: null, id_tarea_anterior: null, valores: {} };
    });

    this.franjas.push(franja);
    this.franjas.sort((a, b) => a.hora_inicial.localeCompare(b.hora_inicial));
    this.indiceFranjaActiva = this.franjas.indexOf(franja);
    this.mostrarAgregarArea = false;
    this.hayCambios = true;
    this.recalcularOpciones();
  }

  /** Una franja que ya tiene algo guardado no se quita: se le cambia o quita la actividad a cada niño. */
  puedeQuitarFranja(franja: FranjaRapida): boolean {
    return franja.fuera_horario && !Object.values(franja.celdas).some((c) => !!c.id_tarea_anterior);
  }

  async quitarFranja(franja: FranjaRapida): Promise<void> {
    if (!this.puedeQuitarFranja(franja)) return;
    if (this.franjaTieneActividades(franja)) {
      const respuesta = await Swal.fire({
        title: '¿Quitar el área?',
        text: 'Se pierden las actividades y calificaciones que pusiste en ella.',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#F5A623',
        cancelButtonColor: '#2C2C2C',
        confirmButtonText: 'Sí, quitar',
        cancelButtonText: 'Cancelar'
      });
      if (!respuesta.isConfirmed) return;
    }
    this.franjas = this.franjas.filter((f) => f !== franja);
    this.indiceFranjaActiva = Math.min(this.indiceFranjaActiva, Math.max(this.franjas.length - 1, 0));
    this.recalcularOpciones();
  }

  // ========================================================================
  // CREAR O IMPORTAR ACTIVIDAD
  // ========================================================================

  abrirAgregarActividad(franja: FranjaRapida): void {
    if (!this.sprint) return;
    this.franjaAgregarActividad = franja;
  }

  cerrarAgregarActividad(): void {
    this.franjaAgregarActividad = null;
  }

  minutosFranja(franja: FranjaRapida): number {
    const [h1, m1] = franja.hora_inicial.split(':').map(Number);
    const [h2, m2] = franja.hora_final.split(':').map(Number);
    const minutos = (h2 * 60 + m2) - (h1 * 60 + m1);
    return minutos > 0 ? minutos : 45;
  }

  /** La actividad creada o importada queda como la general de la franja. */
  alAgregarActividad(actividad: ActividadAgregada): void {
    const franja = this.franjaAgregarActividad;
    this.franjaAgregarActividad = null;
    if (!franja) return;

    const titulo = this.textoPlano(actividad.titulo);
    this.tareas[actividad.id_tarea_x_sprint] = {
      id_tarea_x_sprint: actividad.id_tarea_x_sprint,
      id_area_academica: actividad.id_area_academica,
      id_estado_tarea: 1,
      es_del_dia: 0,
      orden_ejecucion: null,
      minutos_duracion: actividad.minutos_duracion,
      titulo: actividad.titulo,
      titulo_texto: titulo
    };
    this.recalcularOpciones();
    this.cambiarActividadGeneral(franja, actividad.id_tarea_x_sprint);
    Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Actividad lista en la franja', showConfirmButton: false, timer: 1800 });
  }

  get nombreGrupo(): string {
    return this.grupos.find((g: any) => g.id == this.idGrupo)?.nombre || '';
  }

  // ========================================================================
  // GUARDAR
  // ========================================================================

  /** Franjas con algo que guardar: actividades puestas o quitadas. */
  private franjasParaGuardar(): FranjaRapida[] {
    return this.franjas.filter((f) =>
      Object.values(f.celdas).some((c) => !!c.id_tarea || !!c.id_tarea_anterior)
    );
  }

  get totalCalificados(): number {
    let total = 0;
    this.franjas.forEach((f) => {
      Object.values(f.celdas).forEach((c) => {
        if (c.id_tarea && Object.keys(c.valores).length > 0) total++;
      });
    });
    return total;
  }

  async guardar(): Promise<void> {
    if (this.guardando) return;
    const franjas = this.franjasParaGuardar();
    if (franjas.length === 0) {
      Swal.fire('Nada para guardar', 'Escoge al menos una actividad y califica a los estudiantes.', 'info');
      return;
    }

    for (const f of franjas) {
      const etiqueta = `${f.nombre_area} (${f.hora_inicial || '--:--'})`;
      if (this.franjaTieneActividades(f) && !f.id_docente) {
        Swal.fire('Falta el docente', `Selecciona el docente de ${etiqueta}.`, 'warning');
        this.irAFranja(f);
        return;
      }
      if (!f.hora_inicial || !f.hora_final || f.hora_final <= f.hora_inicial) {
        Swal.fire('Revisa las horas', `La hora final de ${etiqueta} debe ser mayor que la inicial.`, 'warning');
        this.irAFranja(f);
        return;
      }
    }

    // Niños con actividad a los que les falta algún parámetro: se avisa pero se puede guardar
    let incompletos = 0;
    franjas.forEach((f) => {
      Object.values(f.celdas).forEach((c) => {
        if (c.id_tarea && this.parametros.some((p: any) => !c.valores[p.id])) incompletos++;
      });
    });
    if (incompletos > 0) {
      const respuesta = await Swal.fire({
        title: 'Hay calificaciones incompletas',
        text: `${incompletos} registro(s) tienen actividad pero les falta algún parámetro. ¿Guardas de todos modos?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#F5A623',
        cancelButtonColor: '#2C2C2C',
        confirmButtonText: 'Sí, guardar',
        cancelButtonText: 'Revisar'
      });
      if (!respuesta.isConfirmed) return;
    }

    const datos = {
      fecha: this.fecha,
      id_grupo: this.idGrupo,
      franjas: franjas.map((f) => ({
        id_horario: f.id_horario,
        id_area_academica: f.id_area_academica,
        hora_inicial: f.hora_inicial,
        hora_final: f.hora_final,
        id_docente: f.id_docente,
        celdas: this.estudiantes
          .map((e: any) => ({ id: e.id_estudiante, celda: f.celdas[e.id_estudiante] }))
          .filter((x) => x.celda && (x.celda.id_tarea || x.celda.id_tarea_anterior))
          .map((x) => ({
            id_estudiante: x.id,
            id_tarea_x_sprint: x.celda.id_tarea,
            id_tarea_anterior: x.celda.id_tarea_anterior,
            calificaciones: x.celda.id_tarea
              ? Object.keys(x.celda.valores).map((idParametro) => ({
                  id_parametro_calificacion: idParametro,
                  id_valor_parametro_calificacion: x.celda.valores[idParametro]
                }))
              : []
          }))
      }))
    };

    this.guardando = true;
    this.calificacionesService.guardarCalificacionRapida(datos).subscribe({
      next: (resp: any) => {
        this.guardando = false;
        this.hayCambios = false;
        const partes = [
          `${resp.actividades_ejecutadas || 0} actividad(es) ejecutada(s)`,
          `${resp.calificaciones_creadas || 0} calificación(es) nueva(s)`,
          `${resp.calificaciones_actualizadas || 0} actualizada(s)`
        ];
        if (resp.calificaciones_eliminadas) {
          partes.push(`${resp.calificaciones_eliminadas} quitada(s) por cambio de actividad`);
        }
        Swal.fire({
          title: 'Calificaciones guardadas',
          html: partes.join('<br>'),
          icon: 'success',
          confirmButtonColor: '#F5A623'
        });
        this.cargarVista();
      },
      error: () => {
        // El interceptor ya muestra el mensaje del backend
        this.guardando = false;
      }
    });
  }

  private irAFranja(franja: FranjaRapida): void {
    const indice = this.franjas.indexOf(franja);
    if (indice >= 0) this.indiceFranjaActiva = indice;
  }

  // ========================================================================
  // UTILIDADES
  // ========================================================================

  private textoPlano(html: string): string {
    return (html || '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/\*\*|__/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /** "07:30:00" -> "07:30" */
  private hhmm(hora: any): string {
    return hora ? String(hora).substring(0, 5) : '';
  }

  private sumarMinutos(hora: string, minutos: number): string {
    const [h, m] = hora.split(':').map(Number);
    const total = Math.min(h * 60 + m + minutos, 23 * 60 + 59);
    return String(Math.floor(total / 60)).padStart(2, '0') + ':' + String(total % 60).padStart(2, '0');
  }

  /** Hora en 12 horas para mostrar: "13:45" -> "1:45 pm" */
  hora12(hora: string): string {
    if (!hora) return '--:--';
    const [h, m] = hora.split(':').map(Number);
    const periodo = h >= 12 ? 'pm' : 'am';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${String(m).padStart(2, '0')} ${periodo}`;
  }

  trackByFranja(index: number, franja: FranjaRapida): string {
    return franja.clave;
  }

  trackByEstudiante(index: number, estudiante: any): string {
    return estudiante.id_estudiante;
  }

  trackById(index: number, item: any): any {
    return item.id;
  }
}
