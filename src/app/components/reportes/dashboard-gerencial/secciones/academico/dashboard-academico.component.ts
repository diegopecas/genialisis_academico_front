import { Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DashboardGerencialService } from '../../../../../services/dashboard-gerencial.service';
import { colorVivo, colorFondoBloque } from '../../../../../common/constantes/color-horario';
import Swal from 'sweetalert2';

// Un mismo componente sirve dos tabs del dashboard:
//   'grupos' → tab Académico (franjas del horario de cada grupo)
//   'cursos' → tab Extracurricular (sesiones del horario de cada curso)
type ModoAcademico = 'grupos' | 'cursos';

type VistaAcademico = 'kpis' | 'horario' | 'fuera';

type DireccionOrden = 'asc' | 'desc';

type EstadoFranja = 'ejecutada' | 'en_curso' | 'fuera_hora' | 'sin_ejecutar' | 'por_venir';

type ColumnaFuera =
  | 'hora_inicio'
  | 'nombre_destino'
  | 'nombre_area'
  | 'titulo_actividad'
  | 'docente'
  | 'motivo'
  | 'minutos_diferencia';

@Component({
  selector: 'app-dashboard-academico',
  templateUrl: './dashboard-academico.component.html',
  styleUrl: './dashboard-academico.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class DashboardAcademicoComponent implements OnInit, OnChanges, OnDestroy {

  @Input() fecha: string = '';
  @Input() esFechaHoy: boolean = true;
  @Input() modo: ModoAcademico = 'grupos';

  public vista: VistaAcademico = 'kpis';

  // ==== KPIs ====
  private readonly INTERVALO_AUTO_REFRESH_MS = 2 * 60 * 1000;
  private intervaloAutoRefresh: any = null;
  public autoRefreshActivo = true;
  public ultimaActualizacion: Date | null = null;
  public cargandoResumen = false;

  public resumen: any = this.resumenVacio();

  // ==== Detalle (sirve para las dos vistas de detalle) ====
  public cargandoDetalle = false;
  private fechaDetalleCargada: string = '';
  public detalle: any = { franjas: [] as any[], fuera_horario: [] as any[] };

  // Detalle por horario (grilla: una columna por grupo/curso)
  public destinosHorario: any[] = [];
  public destinoFiltradoHorario: string | null = null;
  public busquedaHorario: string = '';
  public horasDelDia: string[] = [];
  // celdasGrilla[id_destino][hora] → franja que ocupa esa celda de 5 minutos
  private celdasGrilla: { [idDestino: string]: { [hora: string]: any } } = {};
  public franjaSeleccionada: any = null;
  public indiceDestinoMovil: number = 0;

  // Resolución de la grilla, igual que en calificación: franjas de 5
  // minutos con etiqueta cada media hora.
  private readonly minutosPorBloque: number = 5;
  private readonly minutosPorEtiqueta: number = 30;
  // Ancho mínimo de cada columna de grupo/curso en la grilla
  private readonly anchoMinimoColumna: number = 120;

  // Detalle fuera de horario
  public fueraFiltrados: any[] = [];
  public destinosFuera: any[] = [];
  public motivosFuera: any[] = [];
  public destinoFiltradoFuera: string | null = null;
  public motivoFiltrado: string = '';
  public busquedaFuera: string = '';
  public columnaOrdenFuera: ColumnaFuera = 'hora_inicio';
  public direccionOrdenFuera: DireccionOrden = 'asc';

  public readonly textoEstadoFranja: { [key: string]: string } = {
    ejecutada: 'Ejecutada en horario',
    en_curso: 'En curso',
    fuera_hora: 'Ejecutada fuera de hora',
    sin_ejecutar: 'Sin ejecutar',
    por_venir: 'Por venir'
  };

  public readonly iconoEstadoFranja: { [key: string]: string } = {
    ejecutada: '✅',
    en_curso: '▶️',
    fuera_hora: '⏰',
    sin_ejecutar: '⚠️',
    por_venir: '⏳'
  };

  public readonly estadosLeyenda: string[] = ['ejecutada', 'en_curso', 'fuera_hora', 'sin_ejecutar', 'por_venir'];

  constructor(private dashboardGerencialService: DashboardGerencialService) { }

  ngOnInit(): void {
    this.cargarResumen();
    this.iniciarAutoRefresh();
  }

  ngOnDestroy(): void {
    this.detenerAutoRefresh();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['fecha'] && !changes['fecha'].firstChange) {
      this.cargarResumen();
      if (this.vista !== 'kpis') {
        this.cargarDetalle();
      }
      this.reiniciarAutoRefresh();
    }
    if (changes['esFechaHoy'] && !changes['esFechaHoy'].firstChange) {
      this.reiniciarAutoRefresh();
    }
  }

  // =========================================
  // TEXTOS SEGÚN EL MODO
  // =========================================
  get esCursos(): boolean {
    return this.modo === 'cursos';
  }

  get textoDestino(): string {
    return this.esCursos ? 'Curso' : 'Grupo';
  }

  get textoDestinos(): string {
    return this.esCursos ? 'cursos' : 'grupos';
  }

  get textoFranjas(): string {
    return this.esCursos ? 'Sesiones' : 'Franjas';
  }

  // =========================================
  // AUTO-REFRESH DE KPIs
  // =========================================
  iniciarAutoRefresh(): void {
    this.detenerAutoRefresh();
    if (!this.autoRefreshActivo || !this.esFechaHoy || this.vista !== 'kpis') {
      return;
    }
    this.intervaloAutoRefresh = setInterval(() => {
      this.cargarResumen(true);
    }, this.INTERVALO_AUTO_REFRESH_MS);
  }

  detenerAutoRefresh(): void {
    if (this.intervaloAutoRefresh) {
      clearInterval(this.intervaloAutoRefresh);
      this.intervaloAutoRefresh = null;
    }
  }

  reiniciarAutoRefresh(): void {
    this.detenerAutoRefresh();
    this.iniciarAutoRefresh();
  }

  toggleAutoRefresh(): void {
    this.autoRefreshActivo = !this.autoRefreshActivo;
    this.reiniciarAutoRefresh();
  }

  // =========================================
  // CARGA DE KPIs
  // =========================================
  cargarResumen(silencioso: boolean = false) {
    if (!silencioso) {
      this.cargandoResumen = true;
    }
    this.dashboardGerencialService.obtenerAcademicoResumen(this.fecha, this.modo, silencioso).subscribe({
      next: (response: any) => {
        this.resumen = response.body || this.resumenVacio();
        this.cargandoResumen = false;
        this.ultimaActualizacion = new Date();
      },
      error: () => {
        this.cargandoResumen = false;
        if (!silencioso) {
          Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo cargar el resumen académico' });
        }
      }
    });
  }

  refrescarKpis() {
    this.cargarResumen();
  }

  private resumenVacio(): any {
    return {
      fecha: '',
      modo: this.modo,
      es_hoy: true,
      dia_habil: true,
      nombre_dia: '',
      kpis: {
        total_franjas: 0,
        ejecutadas: 0,
        en_curso: 0,
        fuera_hora: 0,
        sin_ejecutar: 0,
        por_venir: 0,
        franjas_evaluables: 0,
        porcentaje_cumplimiento: 0,
        total_actividades: 0,
        actividades_en_horario: 0,
        actividades_fuera_horario: 0,
        fuera_por_motivo: [] as any[]
      },
      por_destino: [] as any[]
    };
  }

  // =========================================
  // NAVEGACIÓN ENTRE VISTAS
  // =========================================
  abrirDetalleHorario() {
    this.vista = 'horario';
    this.detenerAutoRefresh();
    this.cargarDetalleSiHaceFalta();
  }

  abrirDetalleFuera() {
    this.vista = 'fuera';
    this.detenerAutoRefresh();
    this.cargarDetalleSiHaceFalta();
  }

  volverAKpis() {
    this.vista = 'kpis';
    this.iniciarAutoRefresh();
  }

  // Si es hoy se recarga siempre (los estados cambian con la hora);
  // para otras fechas se reutiliza lo ya cargado.
  private cargarDetalleSiHaceFalta() {
    if (this.esFechaHoy || this.fechaDetalleCargada !== this.fecha) {
      this.cargarDetalle();
    } else {
      this.procesarDetalle();
    }
  }

  // =========================================
  // DETALLE
  // =========================================
  cargarDetalle() {
    this.cargandoDetalle = true;
    this.dashboardGerencialService.obtenerAcademicoDetalle(this.fecha, this.modo).subscribe({
      next: (response: any) => {
        this.detalle = response.body || { franjas: [], fuera_horario: [] };
        this.fechaDetalleCargada = this.fecha;
        this.procesarDetalle();
        this.cargandoDetalle = false;
      },
      error: () => {
        this.cargandoDetalle = false;
        Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo cargar el detalle académico' });
      }
    });
  }

  private procesarDetalle() {
    this.agruparFranjas();
    this.prepararFuera();
  }

  // ---- Detalle por horario (grilla) ----
  private agruparFranjas() {
    const mapa: { [id: string]: any } = {};
    (this.detalle.franjas || []).forEach((f: any) => {
      if (!mapa[f.id_destino]) {
        mapa[f.id_destino] = {
          id_destino: f.id_destino,
          nombre_destino: f.nombre_destino,
          color_destino: f.color_destino,
          icono_destino: f.icono_destino,
          orden_destino: f.orden_destino,
          franjas: [] as any[],
          resumen: { ejecutada: 0, en_curso: 0, fuera_hora: 0, sin_ejecutar: 0, por_venir: 0 }
        };
      }
      mapa[f.id_destino].franjas.push(f);
      if (mapa[f.id_destino].resumen[f.estado] !== undefined) {
        mapa[f.id_destino].resumen[f.estado]++;
      }
    });

    this.destinosHorario = Object.values(mapa).sort((a: any, b: any) => this.compararDestinos(a, b));

    if (this.destinoFiltradoHorario && !mapa[this.destinoFiltradoHorario]) {
      this.destinoFiltradoHorario = null;
    }
    if (this.indiceDestinoMovil >= this.destinosHorario.length) {
      this.indiceDestinoMovil = 0;
    }

    this.calcularHorasDelDia();
    this.construirCeldas();
  }

  // Filas de la grilla: de la primera franja del día a la última, con los
  // extremos redondeados a la media hora para que caigan en una etiqueta.
  private calcularHorasDelDia() {
    const franjas = this.detalle.franjas || [];
    if (franjas.length === 0) {
      this.horasDelDia = [];
      return;
    }

    let minimo = 24 * 60;
    let maximo = 0;
    franjas.forEach((f: any) => {
      minimo = Math.min(minimo, this.horaAMinutos(f.hora_inicial));
      maximo = Math.max(maximo, this.horaAMinutos(f.hora_final));
    });

    const inicio = Math.floor(minimo / this.minutosPorEtiqueta) * this.minutosPorEtiqueta;
    const fin = Math.ceil(maximo / this.minutosPorEtiqueta) * this.minutosPorEtiqueta;

    const horas: string[] = [];
    for (let minutos = inicio; minutos < fin; minutos += this.minutosPorBloque) {
      horas.push(this.minutosAHora(minutos));
    }
    this.horasDelDia = horas;
  }

  // Se arma una sola vez por carga, para no recorrer las franjas en cada
  // ciclo de detección de cambios por cada celda de la grilla.
  private construirCeldas() {
    this.celdasGrilla = {};
    this.destinosHorario.forEach((d: any) => {
      const celdas: { [hora: string]: any } = {};
      d.franjas.forEach((f: any) => {
        const ini = this.horaAMinutos(f.hora_inicial);
        const fin = this.horaAMinutos(f.hora_final);
        this.horasDelDia.forEach((hora: string) => {
          const m = this.horaAMinutos(hora);
          if (m >= ini && m < fin && !celdas[hora]) {
            // Se compara por rango y no por texto: así una franja que
            // arranque en una hora que no cae exacta en la grilla igual
            // pinta su encabezado
            const esInicio = ini >= m && ini < (m + this.minutosPorBloque);
            const esFin = (m + this.minutosPorBloque) >= fin;
            celdas[hora] = {
              franja: f,
              esInicio,
              esFin,
              esIntermedio: !esInicio && !esFin
            };
          }
        });
      });
      this.celdasGrilla[d.id_destino] = celdas;
    });
  }

  getCelda(idDestino: string, hora: string): any | null {
    return this.celdasGrilla[idDestino]?.[hora] || null;
  }

  /** true cuando la franja cae en una etiqueta visible (cada media hora) */
  esFilaEtiqueta(hora: string): boolean {
    return this.horaAMinutos(hora) % this.minutosPorEtiqueta === 0;
  }

  /** true en el arranque de cada hora, para pintar la línea más marcada */
  esFilaHoraEnPunto(hora: string): boolean {
    return this.horaAMinutos(hora) % 60 === 0;
  }

  /** Texto de la columna de horas: vacío en las franjas intermedias */
  etiquetaHora(hora: string): string {
    return this.esFilaEtiqueta(hora) ? hora : '';
  }

  /** Barra lateral del bloque, en el color intenso del área */
  colorVivoArea(color: string): string {
    return colorVivo(color);
  }

  /** Fondo del bloque, apenas teñido con el color del área */
  colorFondoArea(color: string): string | null {
    return colorFondoBloque(color);
  }

  filtrarDestinoHorario(idDestino: string | null) {
    this.destinoFiltradoHorario = this.destinoFiltradoHorario === idDestino ? null : idDestino;
  }

  // Columnas que se ven en la grilla (el filtro deja una sola)
  destinosVisiblesHorario(): any[] {
    if (!this.destinoFiltradoHorario) {
      return this.destinosHorario;
    }
    return this.destinosHorario.filter((d: any) => d.id_destino === this.destinoFiltradoHorario);
  }

  get anchoMinimoGrilla(): number {
    return 60 + this.destinosVisiblesHorario().length * this.anchoMinimoColumna;
  }

  // La búsqueda no quita bloques de la grilla: atenúa los que no coinciden
  franjaCoincide(f: any): boolean {
    const q = this.normalizar(this.busquedaHorario);
    if (q.length === 0) {
      return true;
    }
    const textoActividades = (f.actividades || [])
      .map((a: any) => `${a.titulo_actividad} ${a.docente}`)
      .join(' ');
    return this.normalizar(
      `${f.nombre_area} ${f.nombre_franja || ''} ${f.docente_asignado} ${f.lugar || ''} ` +
      `${this.textoEstadoFranja[f.estado] || ''} ${textoActividades}`
    ).includes(q);
  }

  get totalFranjasDetalle(): number {
    return (this.detalle.franjas || []).length;
  }

  get totalCoincidenciasHorario(): number {
    return this.destinosVisiblesHorario().reduce(
      (suma: number, d: any) => suma + d.franjas.filter((f: any) => this.franjaCoincide(f)).length, 0);
  }

  textoResumenDestino(destino: any): string {
    const r = destino?.resumen || {};
    const total = (destino?.franjas || []).length;
    return `${r.ejecutada || 0} en horario, ${r.en_curso || 0} en curso, ${r.fuera_hora || 0} fuera de hora, ` +
      `${r.sin_ejecutar || 0} sin ejecutar, ${r.por_venir || 0} por venir, de ${total}`;
  }

  // ---- Modal con el detalle de una franja ----
  abrirFranja(f: any) {
    this.franjaSeleccionada = f;
  }

  cerrarFranja() {
    this.franjaSeleccionada = null;
  }

  // ---- Vista móvil: un grupo/curso a la vez ----
  get destinoMovil(): any | null {
    return this.destinosHorario[this.indiceDestinoMovil] || null;
  }

  destinoMovilAnterior() {
    if (this.indiceDestinoMovil > 0) this.indiceDestinoMovil--;
  }

  destinoMovilSiguiente() {
    if (this.indiceDestinoMovil < this.destinosHorario.length - 1) this.indiceDestinoMovil++;
  }

  // ---- Detalle fuera de horario ----
  private prepararFuera() {
    const mapa: { [id: string]: any } = {};
    const motivos: { [motivo: string]: any } = {};
    (this.detalle.fuera_horario || []).forEach((a: any) => {
      if (!motivos[a.motivo]) {
        motivos[a.motivo] = { motivo: a.motivo, texto_motivo: a.texto_motivo, cantidad: 0 };
      }
      motivos[a.motivo].cantidad++;
      if (!mapa[a.id_destino]) {
        mapa[a.id_destino] = {
          id_destino: a.id_destino,
          nombre_destino: a.nombre_destino,
          icono_destino: a.icono_destino,
          orden_destino: a.orden_destino
        };
      }
    });
    this.destinosFuera = Object.values(mapa).sort((a: any, b: any) => this.compararDestinos(a, b));

    this.motivosFuera = Object.values(motivos);

    if (this.destinoFiltradoFuera && !mapa[this.destinoFiltradoFuera]) {
      this.destinoFiltradoFuera = null;
    }
    if (this.motivoFiltrado && !motivos[this.motivoFiltrado]) {
      this.motivoFiltrado = '';
    }

    this.aplicarFiltrosFuera();
  }


  filtrarDestinoFuera(idDestino: string | null) {
    this.destinoFiltradoFuera = this.destinoFiltradoFuera === idDestino ? null : idDestino;
    this.aplicarFiltrosFuera();
  }

  cambiarMotivo() {
    this.aplicarFiltrosFuera();
  }

  buscarFuera() {
    this.aplicarFiltrosFuera();
  }

  aplicarFiltrosFuera() {
    let lista = [...(this.detalle.fuera_horario || [])];

    if (this.destinoFiltradoFuera) {
      lista = lista.filter((a: any) => a.id_destino === this.destinoFiltradoFuera);
    }

    if (this.motivoFiltrado) {
      lista = lista.filter((a: any) => a.motivo === this.motivoFiltrado);
    }

    const q = this.normalizar(this.busquedaFuera);
    if (q.length > 0) {
      lista = lista.filter((a: any) => this.normalizar(
        `${a.nombre_destino} ${a.nombre_area} ${a.titulo_actividad} ${a.docente} ${a.texto_motivo} ${a.nombre_estado}`
      ).includes(q));
    }

    const factor = this.direccionOrdenFuera === 'asc' ? 1 : -1;
    lista.sort((a: any, b: any) => this.compararFuera(a, b) * factor);

    this.fueraFiltrados = lista;
  }

  ordenarFuera(columna: ColumnaFuera) {
    if (this.columnaOrdenFuera === columna) {
      this.direccionOrdenFuera = this.direccionOrdenFuera === 'asc' ? 'desc' : 'asc';
    } else {
      this.columnaOrdenFuera = columna;
      this.direccionOrdenFuera = columna === 'minutos_diferencia' ? 'desc' : 'asc';
    }
    this.aplicarFiltrosFuera();
  }

  private compararFuera(a: any, b: any): number {
    switch (this.columnaOrdenFuera) {
      case 'hora_inicio':
        return this.compararStringsConVacio(a.hora_inicio, b.hora_inicio, this.direccionOrdenFuera);
      case 'nombre_destino':
        return (a.nombre_destino || '').localeCompare(b.nombre_destino || '');
      case 'nombre_area':
        return (a.nombre_area || '').localeCompare(b.nombre_area || '');
      case 'titulo_actividad':
        return (a.titulo_actividad || '').localeCompare(b.titulo_actividad || '');
      case 'docente':
        return (a.docente || '').localeCompare(b.docente || '');
      case 'motivo':
        return (a.texto_motivo || '').localeCompare(b.texto_motivo || '');
      case 'minutos_diferencia':
        return this.compararNumeroConNull(
          a.minutos_diferencia !== null ? Math.abs(a.minutos_diferencia) : null,
          b.minutos_diferencia !== null ? Math.abs(b.minutos_diferencia) : null,
          this.direccionOrdenFuera
        );
      default:
        return 0;
    }
  }

  iconoOrdenFuera(columna: ColumnaFuera): string {
    if (this.columnaOrdenFuera !== columna) return 'fa-sort';
    return this.direccionOrdenFuera === 'asc' ? 'fa-sort-up' : 'fa-sort-down';
  }

  get hayFiltrosFuera(): boolean {
    return !!(this.destinoFiltradoFuera || this.motivoFiltrado || this.normalizar(this.busquedaFuera));
  }

  // =========================================
  // HELPERS
  // =========================================
  // "2 h 29 min después", "15 min antes"
  textoDiferencia(minutos: number | null): string {
    if (minutos === null || minutos === undefined) return '';
    const abs = Math.abs(minutos);
    const h = Math.floor(abs / 60);
    const m = abs % 60;
    const tiempo = h > 0 ? (m > 0 ? `${h} h ${m} min` : `${h} h`) : `${m} min`;
    return `${tiempo} ${minutos < 0 ? 'antes' : 'después'}`;
  }

  private horaAMinutos(hora: string): number {
    const [h, m] = String(hora || '0:0').split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  }

  private minutosAHora(minutos: number): string {
    const h = Math.floor(minutos / 60);
    const m = minutos % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }

  private compararDestinos(a: any, b: any): number {
    const oa = a.orden_destino ?? 9999;
    const ob = b.orden_destino ?? 9999;
    if (oa !== ob) return oa - ob;
    return (a.nombre_destino || '').localeCompare(b.nombre_destino || '');
  }

  // Minúsculas y sin tildes, para que la búsqueda no dependa de eso
  private normalizar(texto: any): string {
    return String(texto ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .trim();
  }

  private compararStringsConVacio(a: any, b: any, direccion: DireccionOrden): number {
    const aVacio = !a;
    const bVacio = !b;
    if (aVacio && bVacio) return 0;
    if (aVacio) return direccion === 'asc' ? 1 : -1;
    if (bVacio) return direccion === 'asc' ? -1 : 1;
    return String(a).localeCompare(String(b));
  }

  private compararNumeroConNull(a: any, b: any, direccion: DireccionOrden): number {
    const aNull = a === null || a === undefined;
    const bNull = b === null || b === undefined;
    if (aNull && bNull) return 0;
    if (aNull) return direccion === 'asc' ? 1 : -1;
    if (bNull) return direccion === 'asc' ? -1 : 1;
    return Number(a) - Number(b);
  }
}