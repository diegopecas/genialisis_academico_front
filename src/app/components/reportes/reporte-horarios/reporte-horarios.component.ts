import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription, forkJoin } from 'rxjs';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';

import { HeaderComponent } from '../../../common/header/header.component';
import { HorariosService } from '../../../services/horarios.service';
import { GruposService } from '../../../services/grupos.service';
import { DiasSemanaService } from '../../../services/dias-semana.service';

interface Columna {
  id: any;
  nombre: string;
  color?: string;
}

interface CeldaHorario {
  horario: any;
  esInicio: boolean;
  esFin: boolean;
  esIntermedio: boolean;
  tieneCruce: boolean;
}

interface Tablero {
  id: any;
  titulo: string;
  color?: string;
  columnas: Columna[];
  celdas: Map<string, CeldaHorario>;
  totalMinutos: number;
  totalFranjas: number;
  cruces: number;
}

@Component({
  selector: 'app-reporte-horarios',
  standalone: true,
  imports: [CommonModule, HeaderComponent],
  templateUrl: './reporte-horarios.component.html',
  styleUrl: './reporte-horarios.component.scss'
})
export class ReporteHorariosComponent implements OnInit, OnDestroy {

  titulo = 'Reporte de Horarios';

  public cargando: boolean = false;
  public datosDisponibles: boolean = false;
  private subscriptions: Subscription[] = [];

  // Vista activa: un tablero por grupo, o un tablero por día con todos los grupos
  public vista: 'grupo' | 'dia' = 'grupo';

  // Catálogos y datos
  public grupos: any[] = [];
  public diasSemana: any[] = [];
  public horarios: any[] = [];

  // Filtro de grupos (por defecto todos)
  public gruposSeleccionados: { [idGrupo: string]: boolean } = {};

  // Grilla
  public franjas: string[] = [];
  public tableros: Tablero[] = [];

  // Cruces de docente: id_horario -> descripción del cruce
  public crucesPorHorario: Map<string, string> = new Map();
  public totalCruces: number = 0;

  // Resolución de la grilla: franjas de 5 minutos con etiqueta cada media hora,
  // igual que la grilla de configuración de horarios del grupo.
  private readonly minutosPorBloque: number = 5;
  private readonly minutosPorEtiqueta: number = 30;

  constructor(
    private horariosService: HorariosService,
    private gruposService: GruposService,
    private diasSemanaService: DiasSemanaService
  ) { }

  ngOnInit(): void {
    this.cargarDatos();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  // ========== Carga ==========

  cargarDatos(): void {
    this.cargando = true;
    this.datosDisponibles = false;

    const sub = forkJoin({
      horarios: this.horariosService.obtenerTodos(),
      grupos: this.gruposService.obtenerTodos(),
      dias: this.diasSemanaService.obtenerTodos()
    }).subscribe({
      next: (response: any) => {
        this.horarios = response.horarios.body || [];
        this.grupos = (response.grupos.body || [])
          .sort((a: any, b: any) => (a.orden ?? Number.MAX_SAFE_INTEGER) - (b.orden ?? Number.MAX_SAFE_INTEGER));
        this.diasSemana = response.dias.body || [];

        this.grupos.forEach(grupo => {
          if (this.gruposSeleccionados[grupo.id] === undefined) {
            this.gruposSeleccionados[grupo.id] = true;
          }
        });

        this.detectarCruces();
        this.construirVista();

        this.datosDisponibles = true;
        this.cargando = false;
      },
      error: (error: any) => {
        console.error('Error al cargar los horarios:', error);
        this.cargando = false;
      }
    });

    this.subscriptions.push(sub);
  }

  // ========== Filtros ==========

  cambiarVista(vista: 'grupo' | 'dia'): void {
    this.vista = vista;
    this.construirVista();
  }

  toggleGrupo(idGrupo: string): void {
    this.gruposSeleccionados[idGrupo] = !this.gruposSeleccionados[idGrupo];
    this.construirVista();
  }

  seleccionarTodosLosGrupos(): void {
    this.grupos.forEach(grupo => this.gruposSeleccionados[grupo.id] = true);
    this.construirVista();
  }

  get gruposVisibles(): any[] {
    return this.grupos.filter(g => this.gruposSeleccionados[g.id]);
  }

  private get horariosFiltrados(): any[] {
    return this.horarios.filter(h => this.gruposSeleccionados[h.id_grupo]);
  }

  // ========== Cruces de docente ==========

  /**
   * Marca los horarios en los que un mismo docente queda dictando en dos
   * grupos distintos a la misma hora. Se evalúa sobre todos los horarios,
   * no solo los filtrados, para no ocultar un cruce por el filtro de grupos.
   */
  private detectarCruces(): void {
    this.crucesPorHorario = new Map();

    const conDocente = this.horarios.filter(h => h.id_docente);

    for (let i = 0; i < conDocente.length; i++) {
      for (let j = i + 1; j < conDocente.length; j++) {
        const uno = conDocente[i];
        const otro = conDocente[j];

        if (String(uno.id_docente) !== String(otro.id_docente)) continue;
        if (String(uno.id_dia_semana) !== String(otro.id_dia_semana)) continue;
        if (String(uno.id_grupo) === String(otro.id_grupo)) continue;

        const seCruzan =
          this.aMinutos(uno.hora_inicial) < this.aMinutos(otro.hora_final) &&
          this.aMinutos(otro.hora_inicial) < this.aMinutos(uno.hora_final);

        if (!seCruzan) continue;

        this.agregarCruce(uno, otro);
        this.agregarCruce(otro, uno);
      }
    }

    this.totalCruces = this.crucesPorHorario.size;
  }

  private agregarCruce(horario: any, contra: any): void {
    const detalle = `${contra.grupo_nombre} · ${contra.area_academica_nombre} ` +
      `(${this.horaCorta(contra.hora_inicial)} - ${this.horaCorta(contra.hora_final)})`;

    const previo = this.crucesPorHorario.get(horario.id);
    this.crucesPorHorario.set(horario.id, previo ? previo + ' | ' + detalle : detalle);
  }

  /** Lista de cruces para el aviso de la parte superior */
  get listaCruces(): any[] {
    const lista: any[] = [];
    this.horarios.forEach(horario => {
      const detalle = this.crucesPorHorario.get(horario.id);
      if (!detalle) return;
      lista.push({
        docente: horario.docente_nombre_completo || 'Sin docente',
        dia: horario.dia_semana_nombre,
        grupo: horario.grupo_nombre,
        area: horario.area_academica_nombre,
        franja: `${this.horaCorta(horario.hora_inicial)} - ${this.horaCorta(horario.hora_final)}`,
        contra: detalle
      });
    });
    return lista;
  }

  // ========== Construcción de la grilla ==========

  private construirVista(): void {
    this.calcularFranjas();

    this.tableros = this.vista === 'grupo'
      ? this.construirTablerosPorGrupo()
      : this.construirTableroPorDia();
  }

  /**
   * Franjas de 5 minutos que cubren únicamente las horas con horarios cargados.
   * Los extremos se redondean a la media hora para que la primera y la última
   * fila caigan en una etiqueta visible. Si no hay datos, no hay franjas.
   */
  private calcularFranjas(): void {
    const horarios = this.horariosFiltrados;

    if (horarios.length === 0) {
      this.franjas = [];
      return;
    }

    let minutoMinimo = Number.MAX_SAFE_INTEGER;
    let minutoMaximo = 0;

    horarios.forEach(horario => {
      const inicio = this.aMinutos(horario.hora_inicial);
      const fin = this.aMinutos(horario.hora_final);
      if (inicio < minutoMinimo) minutoMinimo = inicio;
      if (fin > minutoMaximo) minutoMaximo = fin;
    });

    const inicio = Math.floor(minutoMinimo / this.minutosPorEtiqueta) * this.minutosPorEtiqueta;
    const fin = Math.ceil(minutoMaximo / this.minutosPorEtiqueta) * this.minutosPorEtiqueta;

    const franjas: string[] = [];
    for (let minutos = inicio; minutos < fin; minutos += this.minutosPorBloque) {
      franjas.push(this.aTexto(minutos));
    }
    this.franjas = franjas;
  }

  /**
   * Un tablero por grupo, con los días en las columnas.
   * Solo salen los grupos que tienen horarios y solo los días que se usan.
   */
  private construirTablerosPorGrupo(): Tablero[] {
    const tableros: Tablero[] = [];

    this.gruposVisibles.forEach(grupo => {
      const horariosGrupo = this.horarios.filter(h => String(h.id_grupo) === String(grupo.id));
      if (horariosGrupo.length === 0) return;

      // Solo los días en los que ese grupo tiene clase
      const diasConDatos = new Set(horariosGrupo.map(h => String(h.id_dia_semana)));
      const columnas: Columna[] = this.diasSemana
        .filter(dia => diasConDatos.has(String(dia.id)))
        .map(dia => ({ id: dia.id, nombre: dia.nombre }));

      const tablero = this.armarTablero(
        grupo.id,
        grupo.nombre,
        columnas,
        horariosGrupo,
        (horario: any) => horario.id_dia_semana
      );
      tablero.color = grupo.color || undefined;

      tableros.push(tablero);
    });

    return tableros;
  }

  /**
   * Un tablero por día, con los grupos en las columnas.
   * Solo salen los días que tienen horarios y, en cada uno, solo los grupos
   * que tienen clase ese día.
   */
  private construirTableroPorDia(): Tablero[] {
    const tableros: Tablero[] = [];
    const horariosVisibles = this.horariosFiltrados;

    this.diasSemana.forEach(dia => {
      const horariosDia = horariosVisibles
        .filter(h => String(h.id_dia_semana) === String(dia.id));

      if (horariosDia.length === 0) return;

      const gruposConDatos = new Set(horariosDia.map(h => String(h.id_grupo)));
      const columnas: Columna[] = this.gruposVisibles
        .filter(grupo => gruposConDatos.has(String(grupo.id)))
        .map(grupo => ({ id: grupo.id, nombre: grupo.nombre, color: grupo.color || undefined }));

      tableros.push(this.armarTablero(
        dia.id,
        dia.nombre,
        columnas,
        horariosDia,
        (horario: any) => horario.id_grupo
      ));
    });

    return tableros;
  }

  /**
   * Indexa los horarios en celdas de la grilla. columnaDe dice a qué columna
   * pertenece cada horario (el día o el grupo, según la vista).
   */
  private armarTablero(
    id: any,
    titulo: string,
    columnas: Columna[],
    horarios: any[],
    columnaDe: (horario: any) => any
  ): Tablero {
    const celdas = new Map<string, CeldaHorario>();
    let totalMinutos = 0;
    let cruces = 0;

    horarios.forEach(horario => {
      totalMinutos += Number(horario.total_minutos || 0);

      const idColumna = columnaDe(horario);
      const tieneCruce = this.crucesPorHorario.has(horario.id);
      if (tieneCruce) cruces++;

      const inicio = this.aMinutos(horario.hora_inicial);
      const fin = this.aMinutos(horario.hora_final);

      this.franjas.forEach((franja, indice) => {
        const minutosFranja = this.aMinutos(franja);
        if (minutosFranja < inicio || minutosFranja >= fin) return;

        celdas.set(`${idColumna}|${indice}`, {
          horario: horario,
          esInicio: inicio >= minutosFranja && inicio < (minutosFranja + this.minutosPorBloque),
          esFin: (minutosFranja + this.minutosPorBloque) >= fin,
          esIntermedio: !(inicio >= minutosFranja && inicio < (minutosFranja + this.minutosPorBloque)) &&
                        !((minutosFranja + this.minutosPorBloque) >= fin),
          tieneCruce: tieneCruce
        });
      });
    });

    return {
      id: id,
      titulo: titulo,
      columnas: columnas,
      celdas: celdas,
      totalMinutos: totalMinutos,
      totalFranjas: horarios.length,
      cruces: cruces
    };
  }

  // ========== Helpers de presentación ==========

  celdaDe(tablero: Tablero, idColumna: any, indice: number): CeldaHorario | undefined {
    return tablero.celdas.get(`${idColumna}|${indice}`);
  }

  /**
   * Color del encabezado. En la vista por grupo lo pone el tablero (que es un
   * grupo); en la vista por día lo pone cada columna (que es un grupo).
   * Si el grupo no tiene color se cae al degradado naranja por defecto.
   */
  colorEncabezado(tablero: Tablero, columna?: Columna): string | null {
    const color = this.vista === 'grupo' ? tablero.color : (columna ? columna.color : null);
    return color ? color : null;
  }

  /** Texto oscuro o claro según qué tan claro sea el fondo del grupo */
  colorTextoEncabezado(color: string | null): string {
    if (!color) return '#ffffff';

    const rgb = this.colorRgb(color);
    const luminancia = (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255;
    return luminancia > 0.65 ? '#2c3e50' : '#ffffff';
  }

  esFilaEtiqueta(franja: string): boolean {
    return this.aMinutos(franja) % this.minutosPorEtiqueta === 0;
  }

  esFilaHoraEnPunto(franja: string): boolean {
    return this.aMinutos(franja) % 60 === 0;
  }

  etiquetaFranja(franja: string): string {
    return this.esFilaEtiqueta(franja) ? franja : '';
  }

  horaCorta(hora: string): string {
    return (hora || '').substring(0, 5);
  }

  horasDeMinutos(minutos: number): string {
    return (Math.round(minutos / 60 * 10) / 10) + ' h';
  }

  tituloCelda(celda: CeldaHorario): string {
    const horario = celda.horario;
    let texto = `${horario.area_academica_nombre} · ${this.horaCorta(horario.hora_inicial)} - ${this.horaCorta(horario.hora_final)} · ${horario.total_minutos} min`;
    if (horario.docente_nombre_completo) {
      texto += ` · ${horario.docente_nombre_completo}`;
    }
    const cruce = this.crucesPorHorario.get(horario.id);
    if (cruce) {
      texto += ` · CRUCE con ${cruce}`;
    }
    return texto;
  }

  trackByTablero(index: number, tablero: Tablero): any {
    return tablero.id;
  }

  private aMinutos(hora: string): number {
    if (!hora) return 0;
    const partes = hora.split(':').map(Number);
    return (partes[0] * 60) + (partes[1] || 0);
  }

  private aTexto(minutos: number): string {
    const h = Math.floor(minutos / 60);
    const m = minutos % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }

  // ========== Exportar Excel ==========

  exportarExcel(): void {
    if (this.tableros.length === 0) {
      alert('No hay horarios para exportar.');
      return;
    }

    const libro: XLSX.WorkBook = XLSX.utils.book_new();

    // Una hoja por tablero (por grupo, o la del día según la vista)
    this.tableros.forEach(tablero => {
      const filas: any[][] = [];

      const encabezado: any[] = ['Hora'];
      tablero.columnas.forEach(columna => encabezado.push(columna.nombre));
      filas.push(encabezado);

      // En el Excel se listan solo las franjas con etiqueta para que sea legible:
      // cada bloque se escribe en la franja donde arranca.
      this.franjas.forEach((franja, indice) => {
        const registro: any[] = [franja];
        let tieneAlgo = false;

        tablero.columnas.forEach(columna => {
          const celda = this.celdaDe(tablero, columna.id, indice);
          if (celda && celda.esInicio) {
            const horario = celda.horario;
            let texto = `${horario.area_academica_nombre} (${this.horaCorta(horario.hora_inicial)}-${this.horaCorta(horario.hora_final)}, ${horario.total_minutos} min)`;
            if (horario.docente_nombre_completo) texto += ` - ${horario.docente_nombre_completo}`;
            if (celda.tieneCruce) texto += ' [CRUCE]';
            registro.push(texto);
            tieneAlgo = true;
          } else {
            registro.push('');
          }
        });

        if (tieneAlgo || this.esFilaEtiqueta(franja)) {
          filas.push(registro);
        }
      });

      filas.push([]);
      filas.push(['Total franjas', tablero.totalFranjas]);
      filas.push(['Total horas', this.horasDeMinutos(tablero.totalMinutos)]);
      if (tablero.cruces > 0) {
        filas.push(['Cruces de docente', tablero.cruces]);
      }

      const hoja: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(filas);
      hoja['!cols'] = [{ wch: 10 }].concat(new Array(tablero.columnas.length).fill({ wch: 34 }));

      XLSX.utils.book_append_sheet(libro, hoja, this.nombreHoja(tablero.titulo));
    });

    // Hoja plana con todas las franjas, para filtrar
    const detalle: any[] = [];
    this.horariosFiltrados.forEach(horario => {
      detalle.push({
        'Grupo': horario.grupo_nombre,
        'Día': horario.dia_semana_nombre,
        'Hora inicial': this.horaCorta(horario.hora_inicial),
        'Hora final': this.horaCorta(horario.hora_final),
        'Área académica': horario.area_academica_nombre,
        'Docente': horario.docente_nombre_completo || '',
        'Minutos': Number(horario.total_minutos || 0),
        'Cruce de docente': this.crucesPorHorario.get(horario.id) || ''
      });
    });

    if (detalle.length > 0) {
      const hojaDetalle: XLSX.WorkSheet = XLSX.utils.json_to_sheet(detalle);
      hojaDetalle['!cols'] = [
        { wch: 18 }, { wch: 14 }, { wch: 12 }, { wch: 12 },
        { wch: 26 }, { wch: 26 }, { wch: 10 }, { wch: 45 }
      ];
      XLSX.utils.book_append_sheet(libro, hojaDetalle, 'Detalle');
    }

    XLSX.writeFile(libro, `horarios_por_${this.vista}.xlsx`);
  }

  /** Excel no admite nombres de hoja de más de 31 caracteres ni ciertos signos */
  private nombreHoja(titulo: string): string {
    return (titulo || 'Hoja').replace(/[\\\/\?\*\[\]:]/g, ' ').substring(0, 31);
  }

  // ========== Exportar PDF ==========

  /**
   * Dibuja la misma grilla del reporte. En la vista por grupo cada grupo sale
   * en su propia hoja; en la vista por día sale una sola hoja con todos los grupos.
   */
  exportarPDF(): void {
    if (this.tableros.length === 0) {
      alert('No hay horarios para exportar.');
      return;
    }

    const doc = new jsPDF('l', 'mm', 'a4');
    const anchoPagina = doc.internal.pageSize.getWidth();
    const altoPagina = doc.internal.pageSize.getHeight();

    const margen = 12;
    const anchoColumnaHora = 14;
    const topeGrilla = 34;
    const altoDisponible = altoPagina - topeGrilla - 18;

    this.tableros.forEach((tablero, indiceTablero) => {
      if (indiceTablero > 0) doc.addPage();

      // Cabecera
      doc.setFontSize(13);
      doc.setTextColor(34, 34, 34);
      doc.text(
        this.vista === 'grupo' ? `Horario · ${tablero.titulo}` : `Horarios · ${tablero.titulo}`,
        margen,
        16
      );

      doc.setFontSize(8);
      doc.setTextColor(127, 140, 141);
      let subtitulo = this.vista === 'grupo'
        ? `${tablero.totalFranjas} franjas · ${this.horasDeMinutos(tablero.totalMinutos)} a la semana`
        : `${tablero.totalFranjas} franjas · ${this.horasDeMinutos(tablero.totalMinutos)} · ${tablero.columnas.length} grupos`;
      if (tablero.cruces > 0) {
        subtitulo += ` · ${tablero.cruces} con cruce de docente`;
      }
      doc.text(subtitulo, margen, 22);
      doc.text(
        `Generado: ${new Date().toLocaleDateString('es-CO')}`,
        anchoPagina - margen,
        22,
        { align: 'right' }
      );

      const columnas = tablero.columnas;
      if (columnas.length === 0) return;

      const anchoColumna = (anchoPagina - (margen * 2) - anchoColumnaHora) / columnas.length;
      const altoFranja = Math.min(altoDisponible / Math.max(this.franjas.length, 1), 3.2);

      // Encabezado de columnas.
      // En la vista por grupo la franja completa lleva el color del grupo;
      // en la vista por día cada columna lleva el color de su grupo.
      const colorTablero = this.vista === 'grupo' && tablero.color
        ? this.colorRgb(tablero.color)
        : [245, 166, 35];

      doc.setFillColor(colorTablero[0], colorTablero[1], colorTablero[2]);
      doc.rect(margen, topeGrilla - 7, anchoPagina - (margen * 2), 7, 'F');

      doc.setFontSize(7.5);
      columnas.forEach((columna, indice) => {
        const x = margen + anchoColumnaHora + (indice * anchoColumna);

        let colorColumna = colorTablero;
        if (this.vista === 'dia' && columna.color) {
          colorColumna = this.colorRgb(columna.color);
          doc.setFillColor(colorColumna[0], colorColumna[1], colorColumna[2]);
          doc.rect(x, topeGrilla - 7, anchoColumna, 7, 'F');
        }

        const textoClaro = this.colorTextoEncabezado(
          '#' + colorColumna.map(c => c.toString(16).padStart(2, '0')).join('')
        ) === '#ffffff';

        doc.setTextColor(textoClaro ? 255 : 44, textoClaro ? 255 : 62, textoClaro ? 255 : 80);
        doc.text(columna.nombre, x + (anchoColumna / 2), topeGrilla - 2.2, {
          align: 'center',
          maxWidth: anchoColumna - 2
        });
      });

      // Líneas de la grilla y etiquetas de hora
      this.franjas.forEach((franja, indice) => {
        const y = topeGrilla + (indice * altoFranja);

        if (this.esFilaEtiqueta(franja)) {
          const esEnPunto = this.esFilaHoraEnPunto(franja);
          doc.setDrawColor(esEnPunto ? 200 : 232);
          doc.setLineWidth(esEnPunto ? 0.25 : 0.1);
          doc.line(margen, y, anchoPagina - margen, y);

          doc.setFontSize(esEnPunto ? 6.5 : 5.5);
          doc.setTextColor(esEnPunto ? 90 : 160);
          doc.text(franja, margen + anchoColumnaHora - 2, y + 2, { align: 'right' });
        }
      });

      // Borde inferior de la grilla
      const yFinal = topeGrilla + (this.franjas.length * altoFranja);
      doc.setDrawColor(200);
      doc.setLineWidth(0.25);
      doc.line(margen, yFinal, anchoPagina - margen, yFinal);

      // Separadores verticales
      doc.setDrawColor(225);
      doc.setLineWidth(0.1);
      for (let indice = 0; indice <= columnas.length; indice++) {
        const x = margen + anchoColumnaHora + (indice * anchoColumna);
        doc.line(x, topeGrilla, x, yFinal);
      }

      // Bloques
      columnas.forEach((columna, indiceColumna) => {
        const x = margen + anchoColumnaHora + (indiceColumna * anchoColumna);

        this.franjas.forEach((franja, indiceFranja) => {
          const celda = this.celdaDe(tablero, columna.id, indiceFranja);
          if (!celda || !celda.esInicio) return;

          const horario = celda.horario;
          const inicio = this.aMinutos(horario.hora_inicial);
          const fin = this.aMinutos(horario.hora_final);
          const franjasBloque = Math.max((fin - inicio) / this.minutosPorBloque, 1);

          const y = topeGrilla + (indiceFranja * altoFranja);
          const alto = franjasBloque * altoFranja;

          const color = this.colorRgb(horario.area_academica_color);
          doc.setFillColor(color[0], color[1], color[2]);
          doc.setDrawColor(celda.tieneCruce ? 220 : 190, celda.tieneCruce ? 53 : 190, celda.tieneCruce ? 69 : 190);
          doc.setLineWidth(celda.tieneCruce ? 0.5 : 0.15);
          doc.roundedRect(x + 0.4, y + 0.4, anchoColumna - 0.8, alto - 0.8, 0.8, 0.8, 'FD');

          doc.setTextColor(44, 62, 80);
          doc.setFontSize(5.6);

          const textoArea = (celda.tieneCruce ? '! ' : '') + (horario.area_academica_nombre || '');
          doc.text(textoArea, x + 1.4, y + 2.6, { maxWidth: anchoColumna - 2.6 });

          if (alto > 5) {
            doc.setFontSize(4.8);
            doc.setTextColor(90, 100, 110);
            doc.text(
              `${this.horaCorta(horario.hora_inicial)}-${this.horaCorta(horario.hora_final)} · ${horario.total_minutos}min`,
              x + 1.4,
              y + 5,
              { maxWidth: anchoColumna - 2.6 }
            );
          }

          if (alto > 8 && horario.docente_nombre_completo) {
            doc.setFontSize(4.8);
            doc.setTextColor(120, 130, 140);
            doc.text(horario.docente_nombre_completo, x + 1.4, y + 7.4, { maxWidth: anchoColumna - 2.6 });
          }
        });
      });
    });

    // Última página con el detalle de cruces
    const cruces = this.listaCruces;
    if (cruces.length > 0) {
      doc.addPage();
      doc.setFontSize(13);
      doc.setTextColor(34, 34, 34);
      doc.text('Cruces de docente', margen, 16);

      doc.setFontSize(8);
      doc.setTextColor(127, 140, 141);
      doc.text('Un mismo docente aparece en dos grupos a la misma hora.', margen, 22);

      let y = 32;
      doc.setFontSize(7.5);
      cruces.forEach(cruce => {
        if (y > altoPagina - 15) {
          doc.addPage();
          y = 20;
        }
        doc.setTextColor(44, 62, 80);
        doc.text(`${cruce.docente} · ${cruce.dia} ${cruce.franja} · ${cruce.grupo} / ${cruce.area}`, margen, y);
        y += 4;
        doc.setTextColor(150, 150, 150);
        doc.text(`Se cruza con: ${cruce.contra}`, margen + 4, y, { maxWidth: anchoPagina - margen * 2 - 8 });
        y += 6;
      });
    }

    doc.save(`horarios_por_${this.vista}.pdf`);
  }

  /** Convierte un color '#rrggbb' a [r, g, b]; si no es válido usa un gris claro */
  private colorRgb(color: string): number[] {
    const limpio = (color || '').replace('#', '').trim();
    if (limpio.length !== 6) return [240, 240, 240];

    const r = parseInt(limpio.substring(0, 2), 16);
    const g = parseInt(limpio.substring(2, 4), 16);
    const b = parseInt(limpio.substring(4, 6), 16);

    if (isNaN(r) || isNaN(g) || isNaN(b)) return [240, 240, 240];
    return [r, g, b];
  }
}