import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { HeaderComponent } from '../../../common/header/header.component';
import { TablasComponent } from '../../../common/tablas/tablas.component';
import { FechaInputComponent } from '../../../common/fecha-input/fecha-input.component';
import { colorFondoBloque } from '../../../common/constantes/color-horario';
import { GruposService } from '../../../services/grupos.service';
import { EjecucionHorarioGrupoService } from '../../../services/ejecucion-horario-grupo.service';

/** Color de la franja según lo que pasó en ella */
type ColorFranja = 'verde' | 'amarillo' | 'rojo' | 'azul' | 'gris';

/** Una celda de 5 minutos ocupada por una franja */
interface CeldaFranja {
  franja: any;
  esInicio: boolean;
  esFin: boolean;
}

/** Lo consultado de un grupo en un rango, ya listo para pintar */
interface ResultadoGrupo {
  clave: string;
  rango: string;
  grupo: any;
  resumen: any;
  dias: any[];
  horas: string[];
  celdas: { [fecha: string]: { [hora: string]: CeldaFranja } };
}

/**
 * Ejecución de las actividades del horario de los grupos en un rango de
 * fechas. Se consulta un grupo o todos; cada grupo consultado queda en su tab
 * y el primer tab es el resumen general de los grupos consultados. Lo ya
 * consultado se guarda por grupo y rango, así que volver a un grupo no vuelve
 * a llamar al back (el botón Actualizar sí).
 *
 * Matriz de cada grupo: horas en las filas y un día por columna, con los días
 * hábiles en que el grupo tenía horario (aunque no se haya dictado nada) y los
 * no hábiles en que hubo clases. Encabezados y horas quedan fijos; en el
 * computador se arrastra con la manito.
 *
 * Cada franja es una sola caja con el fondo pastel de su área, una barra
 * lateral del color de lo que pasó y el texto de lo que pasó adentro (nada
 * se superpone):
 *   verde    se dictó su área dentro de la hora
 *   amarillo su área se dictó a otra hora, o en esa hora se dictó otra área
 *   rojo     no se dictó nada
 *   azul     en curso
 * Debajo del horario, en una franja adicional, van las clases que se dictaron
 * fuera de horario, como bloques. Los filtros de área, resultado y días sin
 * clases se aplican en el front, sin volver a consultar.
 */
@Component({
  selector: 'app-reporte-ejecucion-horario-grupo',
  templateUrl: './reporte-ejecucion-horario-grupo.component.html',
  styleUrl: './reporte-ejecucion-horario-grupo.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent, TablasComponent, FechaInputComponent],
})
export class ReporteEjecucionHorarioGrupoComponent implements OnInit {
  titulo = 'Ejecución Actividades Del Horario';

  // Valor del selector para consultar todos los grupos
  public readonly TODOS = 'todos';
  private readonly maxDias = 31;

  public grupos: any[] = [];
  public idGrupo: string = '';
  public fechaInicio = '';
  public fechaFin = '';

  public cargando = false;

  // Lo consultado, por grupo y rango; y los rangos en que ya se pidieron todos
  private resultados: { [clave: string]: ResultadoGrupo } = {};
  private ordenResultados: string[] = [];
  private rangosTodos = new Set<string>();
  // Sube con cada consulta; con el rango, decide cuándo rearmar el resumen
  private version = 0;
  private memoResumen: { llave: string; datos: any[] } = { llave: '', datos: [] };

  // Tabs: 'resumen' o la clave de un grupo
  public pestanaActiva: string = 'resumen';
  public menuMovilAbierto = false;

  // Filtros de la vista (no consultan)
  public filtroArea = '';
  public filtroResultado: '' | ColorFranja = '';
  public ocultarSinClases = false;

  // Grilla: filas de 5 minutos con etiqueta cada media hora
  private readonly minutosPorBloque = 5;
  private readonly minutosPorEtiqueta = 30;
  // Alto en px de cada fila de 5 minutos; debe coincidir con $alto-fila del SCSS
  public readonly altoFila = 12;
  private readonly anchoMinimoColumna = 150;

  // Detalle al tocar una franja o una clase fuera de horario
  public franjaSeleccionada: any = null;
  public claseSeleccionada: any = null;

  // Arrastre de la matriz con el mouse (en touch el scroll es nativo)
  public arrastrando = false;
  private arrastre = { x: 0, y: 0, left: 0, top: 0, movido: false };

  // Resumen general
  public titulosResumen = [
    { clave: 'nombre_grupo', alias: 'Grupo', alinear: 'izquierda' },
    { clave: 'dias_con_ejecucion', alias: 'Días con clases', alinear: 'centrado' },
    { clave: 'dias_habiles_sin_ejecucion', alias: 'Días sin clases', alinear: 'centrado' },
    { clave: 'total_franjas', alias: 'Franjas', alinear: 'centrado' },
    { clave: 'ejecutadas', alias: 'En horario', alinear: 'centrado' },
    { clave: 'fuera_hora', alias: 'Fuera de hora', alinear: 'centrado' },
    { clave: 'sin_ejecutar', alias: 'Sin dictar', alinear: 'centrado' },
    { clave: 'porcentaje_texto', alias: '% Cumplimiento', alinear: 'centrado' },
    { clave: 'clases_fuera_horario', alias: 'Clases fuera de horario', alinear: 'centrado' },
    { clave: 'cruces_area', alias: 'En hora de otra área', alinear: 'centrado' },
  ];

  public readonly leyenda: { color: ColorFranja; texto: string }[] = [
    { color: 'verde', texto: 'Se dictó su área en su hora' },
    { color: 'amarillo', texto: 'Se dictó a otra hora u otra área' },
    { color: 'rojo', texto: 'No se dictó' },
    { color: 'azul', texto: 'En curso' },
  ];

  constructor(
    private gruposService: GruposService,
    private ejecucionHorarioGrupoService: EjecucionHorarioGrupoService
  ) { }

  ngOnInit(): void {
    // Por defecto, desde el lunes de esta semana hasta hoy
    const hoy = new Date();
    const lunes = new Date(hoy);
    lunes.setDate(hoy.getDate() - ((hoy.getDay() + 6) % 7));
    this.fechaInicio = this.formatoIso(lunes);
    this.fechaFin = this.formatoIso(hoy);
    this.cargarGrupos();
  }

  cargarGrupos(): void {
    this.gruposService.obtenerTodos().subscribe((response: any) => {
      const body = (response.body || []) as any[];
      this.grupos = [...body].sort((a: any, b: any) =>
        (Number(a.orden) || 9999) - (Number(b.orden) || 9999) || String(a.nombre).localeCompare(String(b.nombre)));
    });
  }

  // ---------------------------------------------------------------
  // Consulta
  // ---------------------------------------------------------------

  get rangoActual(): string {
    return `${this.fechaInicio}|${this.fechaFin}`;
  }

  /** true si lo escogido ya está consultado para el rango actual */
  get yaConsultado(): boolean {
    if (!this.idGrupo) {
      return false;
    }
    return this.idGrupo === this.TODOS
      ? this.rangosTodos.has(this.rangoActual)
      : !!this.resultados[`${this.idGrupo}|${this.rangoActual}`];
  }

  /**
   * Consulta el grupo escogido o todos. Si ya está consultado para ese rango
   * solo muestra su tab; con forzar vuelve a pedirlo al back.
   */
  consultar(forzar: boolean = false): void {
    if (!this.validarFiltros()) {
      return;
    }

    if (!forzar && this.yaConsultado) {
      this.pestanaActiva = this.idGrupo === this.TODOS ? 'resumen' : `${this.idGrupo}|${this.rangoActual}`;
      return;
    }

    const idGrupo = this.idGrupo;
    const rango = this.rangoActual;
    this.cargando = true;
    this.ejecucionHorarioGrupoService.obtener(idGrupo, this.fechaInicio, this.fechaFin).subscribe({
      next: (response: any) => {
        const gruposRespuesta = (response.body?.grupos || []) as any[];
        gruposRespuesta.forEach((g: any) => this.guardarResultado(g, rango));

        if (idGrupo === this.TODOS) {
          this.rangosTodos.add(rango);
          this.pestanaActiva = 'resumen';
        } else {
          this.pestanaActiva = `${idGrupo}|${rango}`;
        }
        if (gruposRespuesta.length === 0) {
          Swal.fire('Sin datos', 'Ningún grupo tenía horario ni clases en ese rango', 'info');
        }
        this.cargando = false;
      },
      error: () => {
        // El mensaje del backend lo muestra el interceptor
        this.cargando = false;
      },
    });
  }

  actualizar(): void {
    this.consultar(true);
  }

  private validarFiltros(): boolean {
    if (!this.idGrupo) {
      Swal.fire('Falta el grupo', 'Escoge el grupo que quieres revisar o "Todos los grupos"', 'warning');
      return false;
    }
    if (!this.fechaInicio || !this.fechaFin) {
      Swal.fire('Fechas incompletas', 'Escribe la fecha inicial y la final', 'warning');
      return false;
    }
    if (this.fechaInicio > this.fechaFin) {
      Swal.fire('Rango inválido', 'La fecha inicial no puede ser mayor que la final', 'warning');
      return false;
    }
    const dias = this.diasEntre(this.fechaInicio, this.fechaFin) + 1;
    if (dias > this.maxDias) {
      Swal.fire('Rango muy largo', `El rango puede tener máximo ${this.maxDias} días y escogiste ${dias}`, 'warning');
      return false;
    }
    return true;
  }

  private guardarResultado(g: any, rango: string): void {
    const clave = `${g.grupo.id}|${rango}`;
    const dias = (g.dias || []).map((d: any) => this.prepararDia(d));
    const grilla = this.armarGrilla(dias);
    if (!this.resultados[clave]) {
      this.ordenResultados.push(clave);
    }
    this.resultados[clave] = { clave, rango, grupo: g.grupo, resumen: g.resumen, dias, horas: grilla.horas, celdas: grilla.celdas };
    this.version++;
  }

  // ---------------------------------------------------------------
  // Tabs
  // ---------------------------------------------------------------

  /** Grupos consultados para el rango actual, en el orden en que se consultaron */
  get gruposConsultados(): ResultadoGrupo[] {
    return this.ordenResultados
      .map((clave: string) => this.resultados[clave])
      .filter((r: ResultadoGrupo) => r.rango === this.rangoActual);
  }

  get grupoActivo(): ResultadoGrupo | null {
    return this.pestanaActiva === 'resumen' ? null : (this.resultados[this.pestanaActiva] || null);
  }

  seleccionarPestana(pestana: string): void {
    this.pestanaActiva = pestana;
    this.menuMovilAbierto = false;
    this.filtroArea = '';
  }

  get etiquetaPestanaActiva(): string {
    return this.grupoActivo ? this.grupoActivo.grupo.nombre : 'Resumen general';
  }

  // ---------------------------------------------------------------
  // Resumen general
  // ---------------------------------------------------------------

  get resumenGeneral(): any {
    const total: any = {
      dias_con_ejecucion: 0, dias_habiles_sin_ejecucion: 0, total_franjas: 0, ejecutadas: 0,
      fuera_hora: 0, sin_ejecutar: 0, en_curso: 0, por_venir: 0, clases_fuera_horario: 0, cruces_area: 0
    };
    this.gruposConsultados.forEach((g: ResultadoGrupo) => {
      Object.keys(total).forEach((k: string) => total[k] += Number(g.resumen[k]) || 0);
    });
    total.evaluables = total.total_franjas - total.por_venir;
    total.porcentaje_cumplimiento = total.evaluables > 0
      ? Math.round((total.ejecutadas / total.evaluables) * 1000) / 10 : 0;
    return total;
  }

  /**
   * Filas de la tabla del resumen. Se guardan mientras no cambie lo
   * consultado ni el rango, para no entregarle a la tabla un arreglo nuevo en
   * cada ciclo de pintado.
   */
  get datosResumen(): any[] {
    const llave = `${this.rangoActual}|${this.version}`;
    if (this.memoResumen.llave !== llave) {
      this.memoResumen = { llave, datos: this.armarDatosResumen() };
    }
    return this.memoResumen.datos;
  }

  private armarDatosResumen(): any[] {
    const filas = this.gruposConsultados.map((g: ResultadoGrupo) => ({
      nombre_grupo: g.grupo.nombre,
      ...g.resumen,
      porcentaje_texto: `${g.resumen.porcentaje_cumplimiento}%`,
      color: this.colorPorcentaje(g.resumen.porcentaje_cumplimiento)
    }));
    if (filas.length > 1) {
      const t = this.resumenGeneral;
      filas.push({ nombre_grupo: 'TOTAL', ...t, porcentaje_texto: `${t.porcentaje_cumplimiento}%`, color: '#f6ecd6' });
    }
    return filas;
  }

  /** Fondo pastel de la fila según el cumplimiento */
  private colorPorcentaje(pct: number): string {
    if (pct >= 70) return '#e3f1ea';
    if (pct >= 40) return '#fbf1d6';
    return '#f8e4e1';
  }

  // ---------------------------------------------------------------
  // Filtros de la vista
  // ---------------------------------------------------------------

  /** Áreas del grupo activo, para el filtro */
  get areasDisponibles(): string[] {
    const g = this.grupoActivo;
    if (!g) {
      return [];
    }
    const areas = new Set<string>();
    g.dias.forEach((d: any) => {
      d.franjas.forEach((f: any) => f.nombre_area && areas.add(f.nombre_area));
      d.fuera.forEach((a: any) => a.nombre_area && areas.add(a.nombre_area));
    });
    return Array.from(areas).sort();
  }

  /** Días que se muestran del grupo; con el filtro, solo los que tuvieron clases */
  diasVisibles(g: ResultadoGrupo): any[] {
    if (!this.ocultarSinClases) {
      return g.dias;
    }
    return g.dias.filter((d: any) =>
      (d.resumen.ejecutadas + d.resumen.fuera_hora + d.resumen.en_curso) > 0 || d.fuera.length > 0);
  }

  /** Las cajas que no coinciden con los filtros se atenúan, no se quitan */
  cajaCoincide(f: any): boolean {
    return (!this.filtroArea || f.nombre_area === this.filtroArea)
      && (!this.filtroResultado || f.color === this.filtroResultado);
  }

  fueraCoincide(a: any): boolean {
    return (!this.filtroArea || a.nombre_area === this.filtroArea)
      && (!this.filtroResultado || this.filtroResultado === 'amarillo');
  }

  get hayFiltros(): boolean {
    return !!this.filtroArea || !!this.filtroResultado || this.ocultarSinClases;
  }

  limpiarFiltros(): void {
    this.filtroArea = '';
    this.filtroResultado = '';
    this.ocultarSinClases = false;
  }

  // ---------------------------------------------------------------
  // Lo que pasó en cada franja
  // ---------------------------------------------------------------

  /**
   * A cada franja le pone su color y las líneas de texto de lo que pasó, y
   * ordena por hora las clases fuera de horario para la franja de abajo.
   */
  private prepararDia(d: any): any {
    const franjas = d.franjas.map((f: any) => {
      // Clases de otra área que arrancaron dentro de esta franja
      const otrasAreas = d.fuera.filter((a: any) => a.id_franja_ocupada === f.id_franja && a.en_hora_de);
      return {
        ...f,
        otras_areas: otrasAreas,
        color: this.colorFranja(f, otrasAreas),
        lineas: this.lineasFranja(f, otrasAreas)
      };
    });

    // Todas las clases fuera de horario van como bloques debajo del horario
    const fuera = [...d.fuera].sort((a: any, b: any) =>
      String(a.hora_inicio || a.hora_fin || '').localeCompare(String(b.hora_inicio || b.hora_fin || '')));

    return { ...d, franjas, fuera };
  }

  private colorFranja(f: any, otrasAreas: any[]): ColorFranja {
    if (f.estado === 'ejecutada') {
      return 'verde';
    }
    if (f.estado === 'en_curso') {
      return 'azul';
    }
    if (f.estado === 'fuera_hora' || otrasAreas.length > 0) {
      return 'amarillo';
    }
    if (f.estado === 'sin_ejecutar') {
      return 'rojo';
    }
    return 'gris';
  }

  private lineasFranja(f: any, otrasAreas: any[]): string[] {
    const lineas: string[] = [];

    (f.actividades || []).forEach((a: any) => {
      if (a.en_horario && a.id_estado_tarea === 2) {
        lineas.push(`✅ ${a.titulo_actividad} · ${a.docente}`);
      } else if (a.en_horario) {
        lineas.push(`▶️ En curso: ${a.titulo_actividad}`);
      } else if (a.hora_inicio) {
        lineas.push(`⏰ Se dictó a las ${a.hora_inicio} (${this.textoDiferencia(a.minutos_diferencia)}): ${a.titulo_actividad}`);
      } else {
        lineas.push(`⏰ Sin hora de inicio: ${a.titulo_actividad}`);
      }
    });

    otrasAreas.forEach((a: any) => {
      lineas.push(`⇄ En esta hora se dictó ${this.capitalizar(a.nombre_area)} (${a.hora_inicio})`);
    });

    if (lineas.length === 0) {
      lineas.push(f.estado === 'por_venir' ? '⏳ Por venir' : '✖ No se dictó');
    }
    return lineas;
  }

  // ---------------------------------------------------------------
  // Grilla
  // ---------------------------------------------------------------

  /**
   * Filas de la primera a la última franja de los días, redondeadas a la
   * media hora, y la franja que ocupa cada celda. Se arma una vez por grupo.
   */
  private armarGrilla(dias: any[]): { horas: string[]; celdas: { [fecha: string]: { [hora: string]: CeldaFranja } } } {
    const celdas: { [fecha: string]: { [hora: string]: CeldaFranja } } = {};
    let minimo = 24 * 60;
    let maximo = 0;

    dias.forEach((d: any) => {
      d.franjas.forEach((f: any) => {
        minimo = Math.min(minimo, this.horaAMinutos(f.hora_inicial));
        maximo = Math.max(maximo, this.horaAMinutos(f.hora_final));
      });
    });

    if (maximo <= minimo) {
      return { horas: [], celdas };
    }

    const inicio = Math.floor(minimo / this.minutosPorEtiqueta) * this.minutosPorEtiqueta;
    const fin = Math.ceil(maximo / this.minutosPorEtiqueta) * this.minutosPorEtiqueta;
    const horas: string[] = [];
    for (let m = inicio; m < fin; m += this.minutosPorBloque) {
      horas.push(this.minutosAHora(m));
    }

    dias.forEach((d: any) => {
      const celdasDia: { [hora: string]: CeldaFranja } = {};
      d.franjas.forEach((f: any) => {
        const ini = this.horaAMinutos(f.hora_inicial);
        const finFranja = this.horaAMinutos(f.hora_final);
        horas.forEach((h: string) => {
          const m = this.horaAMinutos(h);
          if (m + this.minutosPorBloque <= ini || m >= finFranja || celdasDia[h]) {
            return;
          }
          // Se compara por rango: una hora que no cae exacta en la grilla igual pinta su texto
          celdasDia[h] = {
            franja: f,
            esInicio: ini >= m && ini < m + this.minutosPorBloque,
            esFin: m + this.minutosPorBloque >= finFranja
          };
        });
      });
      celdas[d.fecha] = celdasDia;
    });

    return { horas, celdas };
  }

  getCelda(g: ResultadoGrupo, fecha: string, hora: string): CeldaFranja | null {
    return g.celdas[fecha]?.[hora] || null;
  }

  /** Alto en px del texto de la franja: lo que dura, para que no se salga de su caja */
  altoTexto(f: any): number {
    const minutos = this.horaAMinutos(f.hora_final) - this.horaAMinutos(f.hora_inicial);
    return Math.max(1, Math.round(minutos / this.minutosPorBloque)) * this.altoFila - 2;
  }

  esFilaEtiqueta(hora: string): boolean {
    return this.horaAMinutos(hora) % this.minutosPorEtiqueta === 0;
  }

  esFilaHoraEnPunto(hora: string): boolean {
    return this.horaAMinutos(hora) % 60 === 0;
  }

  etiquetaHora(hora: string): string {
    return this.esFilaEtiqueta(hora) ? hora : '';
  }

  anchoMinimoGrilla(g: ResultadoGrupo): number {
    return 60 + this.diasVisibles(g).length * this.anchoMinimoColumna;
  }

  hayFuera(g: ResultadoGrupo): boolean {
    return this.diasVisibles(g).some((d: any) => d.fuera.length > 0);
  }

  /** Fondo pastel del área, como en el resto de grillas de horario */
  colorFondoArea(color: string): string | null {
    return colorFondoBloque(color);
  }

  /** "Mar 19/05" para el encabezado de la columna */
  encabezadoDia(d: any): string {
    const [, mes, dia] = String(d.fecha).split('-');
    return `${String(d.nombre_dia || '').substring(0, 3)} ${dia}/${mes}`;
  }

  textoResumenDia(d: any): string {
    const r = d.resumen || {};
    return `${r.ejecutadas || 0} en horario, ${r.fuera_hora || 0} fuera de hora, ${r.en_curso || 0} en curso, ` +
      `${r.sin_ejecutar || 0} sin ejecutar, de ${r.total_franjas || 0} franjas. ${d.fuera.length} clase(s) fuera de horario.`;
  }

  textoClase(a: any): string {
    return a.en_hora_de
      ? `${this.capitalizar(a.nombre_area)} en la hora de ${this.capitalizar(a.en_hora_de)}`
      : `${this.capitalizar(a.nombre_area)} fuera de horario`;
  }

  fechasSinEjecucionTexto(g: ResultadoGrupo): string {
    return (g.resumen?.fechas_sin_ejecucion || [])
      .map((f: string) => this.fechaCorta(f))
      .join(', ');
  }

  // ---------------------------------------------------------------
  // Detalle
  // ---------------------------------------------------------------

  abrirFranja(f: any) {
    // El clic que llega al soltar un arrastre no abre el detalle
    if (this.arrastre.movido) {
      return;
    }
    this.claseSeleccionada = null;
    this.franjaSeleccionada = f;
  }

  abrirClase(a: any) {
    if (this.arrastre.movido) {
      return;
    }
    this.franjaSeleccionada = null;
    this.claseSeleccionada = a;
  }

  cerrarDetalle() {
    this.franjaSeleccionada = null;
    this.claseSeleccionada = null;
  }

  // ---------------------------------------------------------------
  // Arrastre con la manito
  // ---------------------------------------------------------------

  iniciarArrastre(evento: MouseEvent, contenedor: HTMLElement): void {
    if (evento.button !== 0) {
      return;
    }
    this.arrastrando = true;
    this.arrastre = {
      x: evento.clientX,
      y: evento.clientY,
      left: contenedor.scrollLeft,
      top: contenedor.scrollTop,
      movido: false
    };
  }

  moverArrastre(evento: MouseEvent, contenedor: HTMLElement): void {
    if (!this.arrastrando) {
      return;
    }
    const dx = evento.clientX - this.arrastre.x;
    const dy = evento.clientY - this.arrastre.y;
    // Un pequeño margen para que un clic normal no cuente como arrastre
    if (!this.arrastre.movido && Math.abs(dx) < 5 && Math.abs(dy) < 5) {
      return;
    }
    this.arrastre.movido = true;
    evento.preventDefault();
    contenedor.scrollLeft = this.arrastre.left - dx;
    contenedor.scrollTop = this.arrastre.top - dy;
  }

  terminarArrastre(): void {
    if (!this.arrastrando) {
      return;
    }
    this.arrastrando = false;
    setTimeout(() => this.arrastre.movido = false);
  }

  textoDiferencia(minutos: any): string {
    if (minutos === null || minutos === undefined) {
      return '';
    }
    const m = Number(minutos);
    return m < 0 ? `${Math.abs(m)} min antes` : `${m} min después`;
  }

  // ---------------------------------------------------------------
  // Ayudantes
  // ---------------------------------------------------------------

  /** "CIENCIAS NUMÉRICAS" → "Ciencias numéricas", para leerlo dentro de una frase */
  capitalizar(texto: string): string {
    const t = String(texto || '').toLowerCase();
    return t.charAt(0).toUpperCase() + t.slice(1);
  }

  private diasEntre(desde: string, hasta: string): number {
    const a = new Date(`${desde}T00:00:00`);
    const b = new Date(`${hasta}T00:00:00`);
    return Math.round((b.getTime() - a.getTime()) / 86400000);
  }

  private horaAMinutos(hora: string): number {
    const [h, m] = String(hora).split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  }

  private minutosAHora(minutos: number): string {
    const h = String(Math.floor(minutos / 60)).padStart(2, '0');
    const m = String(minutos % 60).padStart(2, '0');
    return `${h}:${m}`;
  }

  private fechaCorta(fecha: string): string {
    const [anio, mes, dia] = String(fecha).split('-');
    return `${dia}/${mes}/${anio}`;
  }

  private formatoIso(fecha: Date): string {
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${fecha.getFullYear()}-${mes}-${dia}`;
  }
}