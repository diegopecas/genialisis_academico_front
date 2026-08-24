import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

import { HeaderComponent } from '../../../common/header/header.component';
import { LogrosService } from '../../../services/logros.service';

// Estado de una celda de la matriz
type EstadoCelda = 'con-contenido' | 'falta-contenido' | 'no-aplica';

interface Catalogo {
  id: string;
  nombre: string;
  orden?: number;
  color?: string;
}

interface Celda {
  idGrado: string;
  idCorte: string;
  valor: number;
  estado: EstadoCelda;
  intensidad: number; // 0 a 1, para el degradado del verde
}

interface FilaMatriz {
  idArea: string;
  nombreArea: string;
  celdas: Celda[];
  totalLogros: number;
  totalIndicadores: number;
}

@Component({
  selector: 'app-reporte-distribucion-malla',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent],
  templateUrl: './reporte-distribucion-malla.component.html',
  styleUrl: './reporte-distribucion-malla.component.scss'
})
export class ReporteDistribucionMallaComponent implements OnInit, OnDestroy {

  titulo = 'Distribución de la Malla';

  public cargando: boolean = false;
  public datosDisponibles: boolean = false;
  private subscriptions: Subscription[] = [];

  // Vista activa: 'indicadores' o 'logros'
  public vista: 'indicadores' | 'logros' = 'indicadores';

  // Catálogos
  public grados: Catalogo[] = [];
  public cortes: Catalogo[] = [];
  public areas: Catalogo[] = [];

  // Datos crudos del backend
  private conteos: any[] = [];
  private cobertura: any[] = [];

  // Logros con sus indicadores, indexados por área|grado|corte.
  // Todo llega en la carga inicial, así el modal no vuelve al servidor.
  private logrosPorCelda: Map<string, any[]> = new Map();

  // Matriz calculada
  public filas: FilaMatriz[] = [];

  // Totales del pie de la matriz
  public totalesPorColumna: number[] = [];
  public totalGeneral: number = 0;
  public totalCeldasFaltantes: number = 0;

  // Filtros
  public gradosSeleccionados: { [idGrado: string]: boolean } = {};
  public soloFaltantes: boolean = false;

  // Modal de detalle de la celda
  public modalContexto: any = null;
  public modalLogros: any[] = [];
  public modalCelda: Celda | null = null;
  public modalArea: string = '';

  // Tonos suaves para separar visualmente un grado del otro en el encabezado.
  // Se rotan en el orden en que salen los grados.
  private readonly paletaGrados: string[] = [
    '#e3f2fd', // azul
    '#fce4ec', // rosa
    '#e8f5e9', // verde
    '#fff3e0', // naranja
    '#ede7f6', // morado
    '#e0f7fa'  // turquesa
  ];

  private readonly paletaGradosBorde: string[] = [
    '#90caf9',
    '#f48fb1',
    '#a5d6a7',
    '#ffcc80',
    '#b39ddb',
    '#80deea'
  ];

  constructor(private logrosService: LogrosService) { }

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

    const sub = this.logrosService.obtenerDistribucionMalla().subscribe({
      next: (response: any) => {
        const datos = response.body || {};
        const catalogos = datos.catalogos || {};

        this.grados = catalogos.grados || [];
        this.cortes = catalogos.cortes || [];
        this.areas = catalogos.areas || [];
        this.conteos = datos.conteos || [];
        this.cobertura = datos.cobertura || [];
        this.indexarLogros(datos.logros || []);

        this.grados.forEach(grado => {
          if (this.gradosSeleccionados[grado.id] === undefined) {
            this.gradosSeleccionados[grado.id] = true;
          }
        });

        this.construirMatriz();
        this.datosDisponibles = true;
        this.cargando = false;
      },
      error: (error: any) => {
        console.error('Error al cargar la distribución de la malla:', error);
        this.cargando = false;
      }
    });

    this.subscriptions.push(sub);
  }

  // ========== Construcción de la matriz ==========

  cambiarVista(vista: 'indicadores' | 'logros'): void {
    this.vista = vista;
    this.construirMatriz();
  }

  toggleGrado(idGrado: string): void {
    this.gradosSeleccionados[idGrado] = !this.gradosSeleccionados[idGrado];
    this.construirMatriz();
  }

  toggleSoloFaltantes(): void {
    this.soloFaltantes = !this.soloFaltantes;
    this.construirMatriz();
  }

  get gradosVisibles(): Catalogo[] {
    return this.grados.filter(g => this.gradosSeleccionados[g.id]);
  }

  /** Total de columnas de la matriz: cada grado se abre en sus cortes */
  get totalColumnas(): number {
    return this.gradosVisibles.length * this.cortes.length;
  }

  /**
   * Arma la matriz de áreas por (grado x corte) con el conteo de la vista activa.
   * El estado de cada celda decide el color:
   * - no-aplica: ese grado no ve esa área (según los grupos)
   * - falta-contenido: la ve pero no hay nada cargado
   * - con-contenido: tiene logros/indicadores
   */
  private construirMatriz(): void {
    // Índice de conteos por área|grado|corte
    const indiceConteos = new Map<string, any>();
    this.conteos.forEach(c => {
      indiceConteos.set(this.clave(c.id_area_academica, c.id_grado, c.id_corte_academico), c);
    });

    // Índice de cobertura por grado|área
    const indiceCobertura = new Set<string>();
    this.cobertura.forEach(c => {
      indiceCobertura.add(`${c.id_grado}|${c.id_area_academica}`);
    });

    const gradosVisibles = this.gradosVisibles;
    const filas: FilaMatriz[] = [];

    // Máximo de la vista activa, para calcular la intensidad del verde
    let maximo = 0;
    this.conteos.forEach(c => {
      const valor = this.valorDeConteo(c);
      if (valor > maximo) maximo = valor;
    });

    this.areas.forEach(area => {
      const celdas: Celda[] = [];
      let totalLogros = 0;
      let totalIndicadores = 0;

      gradosVisibles.forEach(grado => {
        const aplica = indiceCobertura.has(`${grado.id}|${area.id}`);

        this.cortes.forEach(corte => {
          const conteo = indiceConteos.get(this.clave(area.id, grado.id, corte.id));
          const valor = conteo ? this.valorDeConteo(conteo) : 0;

          if (conteo) {
            totalLogros += Number(conteo.total_logros || 0);
            totalIndicadores += Number(conteo.total_indicadores || 0);
          }

          let estado: EstadoCelda;
          if (valor > 0) {
            estado = 'con-contenido';
          } else if (aplica) {
            estado = 'falta-contenido';
          } else {
            estado = 'no-aplica';
          }

          celdas.push({
            idGrado: grado.id,
            idCorte: corte.id,
            valor: valor,
            estado: estado,
            intensidad: maximo > 0 ? Math.min(valor / maximo, 1) : 0
          });
        });
      });

      const tieneFaltantes = celdas.some(c => c.estado === 'falta-contenido');
      if (this.soloFaltantes && !tieneFaltantes) {
        return;
      }

      filas.push({
        idArea: area.id,
        nombreArea: area.nombre,
        celdas: celdas,
        totalLogros: totalLogros,
        totalIndicadores: totalIndicadores
      });
    });

    this.filas = filas;
    this.calcularTotales();
  }

  private calcularTotales(): void {
    const totalColumnas = this.totalColumnas;
    const totales = new Array(totalColumnas).fill(0);
    let general = 0;
    let faltantes = 0;

    this.filas.forEach(fila => {
      fila.celdas.forEach((celda, indice) => {
        totales[indice] += celda.valor;
        general += celda.valor;
        if (celda.estado === 'falta-contenido') faltantes++;
      });
    });

    this.totalesPorColumna = totales;
    this.totalGeneral = general;
    this.totalCeldasFaltantes = faltantes;
  }

  private clave(idArea: string, idGrado: string, idCorte: string): string {
    return `${idArea}|${idGrado}|${idCorte}`;
  }

  /** Devuelve el número que corresponde a la vista activa */
  private valorDeConteo(conteo: any): number {
    return this.vista === 'indicadores'
      ? Number(conteo.total_indicadores || 0)
      : Number(conteo.total_logros || 0);
  }

  // ========== Presentación ==========

  get etiquetaVista(): string {
    return this.vista === 'indicadores' ? 'Indicadores de logro' : 'Logros';
  }

  /** Color de fondo de la celda según su estado e intensidad */
  colorCelda(celda: Celda): string {
    if (celda.estado === 'no-aplica') return '#ffffff';
    if (celda.estado === 'falta-contenido') return '#e74c3c';

    // Verde que se oscurece con la cantidad
    const alpha = 0.18 + (celda.intensidad * 0.72);
    return `rgba(64, 196, 160, ${alpha})`;
  }

  claseCelda(celda: Celda): string {
    return 'celda-' + celda.estado;
  }

  textoCelda(celda: Celda): string {
    return celda.estado === 'no-aplica' ? '' : String(celda.valor);
  }

  tituloCelda(fila: FilaMatriz, celda: Celda): string {
    const grado = this.grados.find(g => g.id == celda.idGrado);
    const corte = this.cortes.find(c => c.id == celda.idCorte);
    const base = `${fila.nombreArea} · ${grado?.nombre || ''} · ${corte?.nombre || ''}`;

    if (celda.estado === 'no-aplica') return base + ' · no la ve ese grado';
    if (celda.estado === 'falta-contenido') return base + ' · sin contenido cargado';
    return `${base} · ${celda.valor} ${this.etiquetaVista.toLowerCase()}`;
  }

  totalFila(fila: FilaMatriz): number {
    return this.vista === 'indicadores' ? fila.totalIndicadores : fila.totalLogros;
  }

  nombreGrado(idGrado: string): string {
    return this.grados.find(g => g.id == idGrado)?.nombre || '';
  }

  nombreCorte(idCorte: string): string {
    return this.cortes.find(c => c.id == idCorte)?.nombre || '';
  }

  trackByFila(index: number, fila: FilaMatriz): any {
    return fila.idArea;
  }

  trackByCelda(index: number, celda: Celda): any {
    return celda.idGrado + '|' + celda.idCorte;
  }

  // ========== Separación visual por grado ==========

  /** Fondo del encabezado del grado y de sus cortes */
  colorGrado(indiceGrado: number): string {
    return this.paletaGrados[indiceGrado % this.paletaGrados.length];
  }

  /** Borde que separa un grado del siguiente */
  colorBordeGrado(indiceGrado: number): string {
    return this.paletaGradosBorde[indiceGrado % this.paletaGradosBorde.length];
  }

  /** Índice del grado al que pertenece una celda, según su posición en la fila */
  indiceGradoDeCelda(indiceCelda: number): number {
    return this.cortes.length > 0 ? Math.floor(indiceCelda / this.cortes.length) : 0;
  }

  /** true en la primera columna de cada grado, para pintar el separador */
  esInicioDeGrado(indiceCelda: number): boolean {
    return this.cortes.length > 0 && indiceCelda % this.cortes.length === 0;
  }

  // ========== Modal de detalle ==========

  /** Agrupa los logros por área|grado|corte una sola vez, al cargar */
  private indexarLogros(logros: any[]): void {
    const indice = new Map<string, any[]>();

    logros.forEach(logro => {
      const clave = this.clave(logro.id_area_academica, logro.id_grado, logro.id_corte_academico);
      if (!indice.has(clave)) {
        indice.set(clave, []);
      }
      indice.get(clave)!.push(logro);
    });

    this.logrosPorCelda = indice;
  }

  /**
   * Abre el modal con los logros e indicadores de la celda.
   * Los datos ya están en memoria desde la carga inicial, no se consulta nada.
   * Las celdas que el grado no ve no abren nada.
   */
  abrirDetalle(fila: FilaMatriz, celda: Celda): void {
    if (celda.estado === 'no-aplica') return;

    this.modalCelda = celda;
    this.modalArea = fila.nombreArea;
    this.modalLogros = this.logrosPorCelda.get(this.clave(fila.idArea, celda.idGrado, celda.idCorte)) || [];
    this.modalContexto = {
      nombre_area: fila.nombreArea,
      nombre_grado: this.nombreGrado(celda.idGrado),
      nombre_corte: this.nombreCorte(celda.idCorte)
    };

    const modal = new (window as any).bootstrap.Modal(document.getElementById('modalDetalleCeldaMalla'));
    modal.show();
  }

  /** Total de indicadores que se están mostrando en el modal */
  get totalIndicadoresModal(): number {
    return this.modalLogros
      .reduce((total, logro) => total + (logro.indicadores ? logro.indicadores.length : 0), 0);
  }

  trackByLogro(index: number, logro: any): any {
    return logro.id;
  }

  // ========== Exportar Excel ==========

  exportarExcel(): void {
    if (this.filas.length === 0) {
      alert('No hay datos para exportar.');
      return;
    }

    // Hoja 1: la matriz tal como se ve
    const encabezadoGrados: any[] = ['Área Académica'];
    const encabezadoCortes: any[] = [''];

    this.gradosVisibles.forEach(grado => {
      this.cortes.forEach((corte, indice) => {
        encabezadoGrados.push(indice === 0 ? grado.nombre : '');
        encabezadoCortes.push(corte.nombre);
      });
    });
    encabezadoGrados.push('Total');
    encabezadoCortes.push('');

    const matriz: any[][] = [encabezadoGrados, encabezadoCortes];

    this.filas.forEach(fila => {
      const registro: any[] = [fila.nombreArea];
      fila.celdas.forEach(celda => {
        registro.push(celda.estado === 'no-aplica' ? '' : celda.valor);
      });
      registro.push(this.totalFila(fila));
      matriz.push(registro);
    });

    const totalesFila: any[] = ['Total'];
    this.totalesPorColumna.forEach(total => totalesFila.push(total));
    totalesFila.push(this.totalGeneral);
    matriz.push(totalesFila);

    const hojaMatriz: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(matriz);
    hojaMatriz['!cols'] = [{ wch: 32 }].concat(
      new Array(this.totalColumnas + 1).fill({ wch: 10 })
    );

    // Hoja 2: el mismo dato en formato plano, para filtrar y hacer tablas dinámicas
    const detalle: any[] = [];
    this.filas.forEach(fila => {
      fila.celdas.forEach(celda => {
        detalle.push({
          'Área Académica': fila.nombreArea,
          'Grado': this.nombreGrado(celda.idGrado),
          'Corte': this.nombreCorte(celda.idCorte),
          'Cantidad': celda.estado === 'no-aplica' ? '' : celda.valor,
          'Estado': this.descripcionEstado(celda.estado)
        });
      });
    });

    const hojaDetalle: XLSX.WorkSheet = XLSX.utils.json_to_sheet(detalle);
    hojaDetalle['!cols'] = [{ wch: 32 }, { wch: 18 }, { wch: 18 }, { wch: 12 }, { wch: 22 }];

    const libro: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hojaMatriz, 'Matriz');
    XLSX.utils.book_append_sheet(libro, hojaDetalle, 'Detalle');

    XLSX.writeFile(libro, `distribucion_malla_${this.vista}.xlsx`);
  }

  private descripcionEstado(estado: EstadoCelda): string {
    if (estado === 'no-aplica') return 'No la ve ese grado';
    if (estado === 'falta-contenido') return 'Falta contenido';
    return 'Con contenido';
  }

  // ========== Exportar PDF ==========

  exportarPDF(): void {
    if (this.filas.length === 0) {
      alert('No hay datos para exportar.');
      return;
    }

    const doc = new jsPDF('l', 'mm', 'a4');
    const anchoPagina = doc.internal.pageSize.getWidth();

    doc.setFontSize(14);
    doc.setTextColor(34, 34, 34);
    doc.text('Distribución de la Malla Curricular', 14, 15);

    doc.setFontSize(9);
    doc.setTextColor(127, 140, 141);
    doc.text(`Vista: ${this.etiquetaVista}`, 14, 21);
    doc.text(
      `Generado: ${new Date().toLocaleDateString('es-CO')}`,
      anchoPagina - 14,
      21,
      { align: 'right' }
    );

    // Encabezado de dos niveles: grado y, debajo, sus cortes
    const filaGrados: any[] = [{ content: 'Área', rowSpan: 2 }];
    this.gradosVisibles.forEach(grado => {
      filaGrados.push({ content: grado.nombre, colSpan: this.cortes.length, styles: { halign: 'center' } });
    });
    filaGrados.push({ content: 'Total', rowSpan: 2 });

    const filaCortes: any[] = this.gradosVisibles
      .map(() => this.cortes.map(corte => ({ content: corte.nombre, styles: { halign: 'center' } })))
      .reduce((acumulado, actual) => acumulado.concat(actual), [] as any[]);

    const cuerpo = this.filas.map(fila => {
      const registro: any[] = [fila.nombreArea];
      fila.celdas.forEach(celda => {
        registro.push(this.textoCelda(celda));
      });
      registro.push(this.totalFila(fila));
      return registro;
    });

    const pie: any[] = ['Total'];
    this.totalesPorColumna.forEach(total => pie.push(total));
    pie.push(this.totalGeneral);
    cuerpo.push(pie);

    const filasMatriz = this.filas;
    const totalCeldas = this.totalColumnas;

    autoTable(doc, {
      startY: 26,
      head: [filaGrados, filaCortes],
      body: cuerpo,
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 1.5, halign: 'center', textColor: [44, 62, 80] },
      headStyles: { fillColor: [245, 166, 35], textColor: 255, fontSize: 7 },
      columnStyles: { 0: { halign: 'left', cellWidth: 40 } },
      didParseCell: (data: any) => {
        if (data.section !== 'body') return;

        // Fila de totales
        if (data.row.index === filasMatriz.length) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [248, 249, 250];
          return;
        }

        const indiceCelda = data.column.index - 1;
        if (indiceCelda < 0 || indiceCelda >= totalCeldas) return;

        const celda = filasMatriz[data.row.index].celdas[indiceCelda];
        if (celda.estado === 'falta-contenido') {
          data.cell.styles.fillColor = [231, 76, 60];
          data.cell.styles.textColor = 255;
          data.cell.styles.fontStyle = 'bold';
        } else if (celda.estado === 'con-contenido') {
          // Mismo degradado del verde de la pantalla, mezclado sobre blanco
          const alpha = 0.18 + (celda.intensidad * 0.72);
          data.cell.styles.fillColor = [
            Math.round(255 + (64 - 255) * alpha),
            Math.round(255 + (196 - 255) * alpha),
            Math.round(255 + (160 - 255) * alpha)
          ];
        }
      }
    });

    doc.save(`distribucion_malla_${this.vista}.pdf`);
  }
}
