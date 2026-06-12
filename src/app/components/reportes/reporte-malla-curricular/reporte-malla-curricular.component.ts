import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription, forkJoin } from 'rxjs';
import * as XLSX from 'xlsx';

import { HeaderComponent } from '../../../common/header/header.component';
import { LogrosService } from '../../../services/logros.service';
import { GradosService } from '../../../services/grados.service';
import { AreasAcademicasService } from '../../../services/areas-academicas.service';
import { CortesAcademicosService } from '../../../services/cortes-academicos.service';
import { EsferasDesarrolloService } from '../../../services/esferas-desarrollo.service';
import { CompetenciasCognitivasService } from '../../../services/competencias-cognitivas.service';
import { EjesCurricularesService } from '../../../services/ejes-curriculares.service';
import { IndicadoresLogrosService } from '../../../services/indicadores-logros.service';
import { ExportarPdfMallaCurricularService, DatosMallaCurricularPDF } from '../../../services/exportar-pdf-malla-curricular.service';
import { InstitucionConfigService } from '../../../services/institucion-config.service';

// Interfaces
interface Indicador {
  id: number;
  nombre: string;
}

interface Logro {
  id: number;
  nombre: string;
  id_grado: number;
  id_area_academica: number;
  id_eje_curricular: number;
  id_esfera_desarrollo: number;
  id_competencia_cognitiva: number;
  id_estandar_basico: number;
  id_corte_academico: number;
  nombre_grado: string;
  nombre_area_academica: string;
  nombre_eje_curricular: string;
  nombre_esfera_desarrollo: string;
  nombre_competencia_cognitiva: string;
  nombre_estandar_basico: string;
  nombre_corte_academico: string;
  indicadores?: Indicador[];
  indicadoresCargados?: boolean;
  expandido?: boolean;
}

interface Catalogo {
  id: number;
  nombre: string;
  orden?: number;
}

@Component({
  selector: 'app-reporte-malla-curricular',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent],
  templateUrl: './reporte-malla-curricular.component.html',
  styleUrl: './reporte-malla-curricular.component.scss'
})
export class ReporteMallaCurricularComponent implements OnInit, OnDestroy {
  titulo = "Reporte Malla Curricular";

  // Control
  public cargando: boolean = false;
  public datosDisponibles: boolean = false;
  private subscriptions: Subscription[] = [];

  // Filtros
  public gradoSeleccionado: string = '';
  public areaSeleccionada: string = '';
  public corteSeleccionado: string = '';
  public esferaSeleccionada: string = '';
  public busquedaLogro: string = '';

  // Catálogos para filtros
  public grados: Catalogo[] = [];
  public areas: Catalogo[] = [];
  public cortes: Catalogo[] = [];
  public esferas: Catalogo[] = [];

  // Datos
  public logros: Logro[] = [];
  public logrosFiltrados: Logro[] = [];
  public logrosAgrupados: Map<string, Logro[]> = new Map();

  // Totales
  public totales = {
    totalLogros: 0,
    totalIndicadores: 0,
    totalAreas: 0,
    totalGrados: 0,
    totalCortes: 0,
    promedioIndicadoresPorLogro: 0
  };

  // Paginación
  public paginaActual: number = 1;
  public registrosPorPagina: number = 20;
  public totalPaginas: number = 1;

  // Expandir/Colapsar
  public todosExpandidos: boolean = false;

  // Ordenamiento
  public columnaOrden: string = '';
  public direccionOrden: 'asc' | 'desc' = 'asc';

  // Mapas de orden de catálogos (para orden por defecto)
  private ordenGrados: Map<number, number> = new Map();
  private ordenCortes: Map<number, number> = new Map();

  constructor(
    private logrosService: LogrosService,
    private indicadoresLogrosService: IndicadoresLogrosService,
    private gradosService: GradosService,
    private areasAcademicasService: AreasAcademicasService,
    private cortesAcademicosService: CortesAcademicosService,
    private esferasDesarrolloService: EsferasDesarrolloService,
    private competenciasCognitivasService: CompetenciasCognitivasService,
    private ejesCurricularesService: EjesCurricularesService,
    private exportarPdfService: ExportarPdfMallaCurricularService,
    private institucionConfigService: InstitucionConfigService
  ) { }

  ngOnInit(): void {
    this.cargarCatalogos();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  // ─── Carga de datos ───────────────────────────────────────────────

  cargarCatalogos(): void {
    this.cargando = true;

    const sub = forkJoin({
      grados: this.gradosService.obtenerTodos(),
      areas: this.areasAcademicasService.obtenerTodos(),
      cortes: this.cortesAcademicosService.obtenerTodos(),
      esferas: this.esferasDesarrolloService.obtenerTodos()
    }).subscribe({
      next: (response: any) => {
        this.grados = (response.grados.body || []).sort((a: any, b: any) => (a.orden || a.id) - (b.orden || b.id));
        this.areas = response.areas.body || [];
        this.cortes = (response.cortes.body || []).sort((a: any, b: any) => (a.orden || a.id) - (b.orden || b.id));
        this.esferas = response.esferas.body || [];

        // Guardar mapas de orden para el sort por defecto
        this.grados.forEach((g: any, idx: number) => this.ordenGrados.set(g.id, g.orden || idx));
        this.cortes.forEach((c: any, idx: number) => this.ordenCortes.set(c.id, c.orden || idx));

        this.cargarLogros();
      },
      error: (error) => {
        console.error('Error al cargar catálogos:', error);
        this.cargando = false;
      }
    });

    this.subscriptions.push(sub);
  }

  cargarLogros(): void {
    this.cargando = true;
    this.datosDisponibles = false;

    const sub = forkJoin({
      logros: this.logrosService.obtenerTodos(),
      indicadores: this.indicadoresLogrosService.obtenerTodos()
    }).subscribe({
      next: (response: any) => {
        const logrosData = response.logros.body || [];
        const indicadoresData = response.indicadores.body || [];

        // Agrupar indicadores por id_logro en un Map
        const indicadoresPorLogro = new Map<number, Indicador[]>();
        indicadoresData.forEach((ind: any) => {
          const idLogro = Number(ind.id_logro);
          if (!indicadoresPorLogro.has(idLogro)) {
            indicadoresPorLogro.set(idLogro, []);
          }
          indicadoresPorLogro.get(idLogro)!.push({
            id: ind.id,
            nombre: ind.nombre
          });
        });

        // Mapear logros con sus indicadores ya asociados
        this.logros = logrosData.map((l: any) => ({
          ...l,
          indicadores: indicadoresPorLogro.get(Number(l.id)) || [],
          indicadoresCargados: true,
          expandido: false
        }));

        if (this.logros.length > 0) {
          this.datosDisponibles = true;
          this.aplicarFiltros();
        }

        this.cargando = false;
      },
      error: (error) => {
        console.error('Error al cargar logros e indicadores:', error);
        this.cargando = false;
        this.datosDisponibles = false;
      }
    });

    this.subscriptions.push(sub);
  }

  // ─── Filtros ──────────────────────────────────────────────────────

  aplicarFiltros(): void {
    let filtrados = [...this.logros];

    if (this.gradoSeleccionado) {
      filtrados = filtrados.filter(l => l.id_grado == Number(this.gradoSeleccionado));
    }

    if (this.areaSeleccionada) {
      filtrados = filtrados.filter(l => l.id_area_academica == Number(this.areaSeleccionada));
    }

    if (this.corteSeleccionado) {
      filtrados = filtrados.filter(l => l.id_corte_academico == Number(this.corteSeleccionado));
    }

    if (this.esferaSeleccionada) {
      filtrados = filtrados.filter(l => l.id_esfera_desarrollo == Number(this.esferaSeleccionada));
    }

    if (this.busquedaLogro && this.busquedaLogro.trim() !== '') {
      const termino = this.busquedaLogro.toLowerCase().trim();
      filtrados = filtrados.filter(l =>
        l.nombre.toLowerCase().includes(termino)
      );
    }

    this.logrosFiltrados = filtrados;

    // Aplicar ordenamiento
    this.ordenarLogros();

    this.agruparLogros();
    this.calcularTotales();
    this.calcularPaginacion();
  }

  resetearFiltros(): void {
    this.gradoSeleccionado = '';
    this.areaSeleccionada = '';
    this.corteSeleccionado = '';
    this.esferaSeleccionada = '';
    this.busquedaLogro = '';
    this.paginaActual = 1;
    this.aplicarFiltros();
  }

  buscarLogro(): void {
    this.paginaActual = 1;
    this.aplicarFiltros();
  }

  // ─── Ordenamiento ──────────────────────────────────────────────────

  ordenarPorColumna(columna: string): void {
    if (this.columnaOrden === columna) {
      // Si ya está ordenado por esta columna, alternar dirección o resetear
      if (this.direccionOrden === 'asc') {
        this.direccionOrden = 'desc';
      } else {
        // Volver al orden por defecto
        this.columnaOrden = '';
        this.direccionOrden = 'asc';
      }
    } else {
      this.columnaOrden = columna;
      this.direccionOrden = 'asc';
    }

    this.ordenarLogros();
    this.paginaActual = 1;
    this.calcularPaginacion();
  }

  private ordenarLogros(): void {
    if (this.columnaOrden) {
      // Ordenamiento por columna seleccionada por el usuario
      this.logrosFiltrados.sort((a: any, b: any) => {
        let valA = this.getValorOrden(a, this.columnaOrden);
        let valB = this.getValorOrden(b, this.columnaOrden);

        if (valA == null) valA = '';
        if (valB == null) valB = '';

        let comparacion: number;
        if (typeof valA === 'number' && typeof valB === 'number') {
          comparacion = valA - valB;
        } else {
          comparacion = String(valA).localeCompare(String(valB), 'es');
        }

        return this.direccionOrden === 'desc' ? -comparacion : comparacion;
      });
    } else {
      // Orden por defecto: corte (orden) → grado (orden) → área → esfera
      this.logrosFiltrados.sort((a: any, b: any) => {
        const ordenCorteA = this.ordenCortes.get(Number(a.id_corte_academico)) ?? 999;
        const ordenCorteB = this.ordenCortes.get(Number(b.id_corte_academico)) ?? 999;
        if (ordenCorteA !== ordenCorteB) return ordenCorteA - ordenCorteB;

        const ordenGradoA = this.ordenGrados.get(Number(a.id_grado)) ?? 999;
        const ordenGradoB = this.ordenGrados.get(Number(b.id_grado)) ?? 999;
        if (ordenGradoA !== ordenGradoB) return ordenGradoA - ordenGradoB;

        const areaA = (a.nombre_area_academica || '').localeCompare(b.nombre_area_academica || '', 'es');
        if (areaA !== 0) return areaA;

        return (a.nombre_esfera_desarrollo || '').localeCompare(b.nombre_esfera_desarrollo || '', 'es');
      });
    }
  }

  private getValorOrden(logro: any, columna: string): any {
    switch (columna) {
      case 'nombre': return logro.nombre || '';
      case 'grado': return this.ordenGrados.get(Number(logro.id_grado)) ?? 999;
      case 'area': return logro.nombre_area_academica || '';
      case 'corte': return this.ordenCortes.get(Number(logro.id_corte_academico)) ?? 999;
      case 'esfera': return logro.nombre_esfera_desarrollo || '';
      case 'eje': return logro.nombre_eje_curricular || '';
      case 'competencia': return logro.nombre_competencia_cognitiva || '';
      case 'indicadores': return logro.indicadores?.length || 0;
      default: return '';
    }
  }

  getClaseOrden(columna: string): string {
    if (this.columnaOrden !== columna) return '';
    return this.direccionOrden === 'asc' ? 'sorted-asc' : 'sorted-desc';
  }

  getIconoOrden(columna: string): string {
    if (this.columnaOrden !== columna) return 'fas fa-sort';
    return this.direccionOrden === 'asc' ? 'fas fa-sort-up' : 'fas fa-sort-down';
  }

  // ─── Agrupación ───────────────────────────────────────────────────

  agruparLogros(): void {
    this.logrosAgrupados = new Map();

    this.logrosFiltrados.forEach(logro => {
      const clave = `${logro.nombre_grado || 'Sin grado'} | ${logro.nombre_area_academica || 'Sin área'} | ${logro.nombre_corte_academico || 'Sin corte'}`;
      if (!this.logrosAgrupados.has(clave)) {
        this.logrosAgrupados.set(clave, []);
      }
      this.logrosAgrupados.get(clave)!.push(logro);
    });
  }

  getGruposOrdenados(): string[] {
    return Array.from(this.logrosAgrupados.keys()).sort();
  }

  // ─── Estadísticas ─────────────────────────────────────────────────

  calcularTotales(): void {
    const gradosUnicos = new Set(this.logrosFiltrados.map(l => l.id_grado));
    const areasUnicas = new Set(this.logrosFiltrados.map(l => l.id_area_academica));
    const cortesUnicos = new Set(this.logrosFiltrados.map(l => l.id_corte_academico));

    const totalIndicadores = this.logrosFiltrados.reduce(
      (sum, l) => sum + (l.indicadores?.length || 0), 0
    );
    const totalLogros = this.logrosFiltrados.length;

    this.totales = {
      totalLogros: totalLogros,
      totalIndicadores: totalIndicadores,
      totalAreas: areasUnicas.size,
      totalGrados: gradosUnicos.size,
      totalCortes: cortesUnicos.size,
      promedioIndicadoresPorLogro: totalLogros > 0
        ? Math.round((totalIndicadores / totalLogros) * 10) / 10
        : 0
    };
  }

  // ─── Expandir / Colapsar ──────────────────────────────────────────

  toggleLogro(logro: Logro): void {
    logro.expandido = !logro.expandido;
  }

  toggleTodos(): void {
    this.todosExpandidos = !this.todosExpandidos;
    this.logrosFiltrados.forEach(logro => {
      logro.expandido = this.todosExpandidos;
    });
  }

  // ─── Paginación ───────────────────────────────────────────────────

  calcularPaginacion(): void {
    this.totalPaginas = Math.ceil(this.logrosFiltrados.length / this.registrosPorPagina);
    if (this.paginaActual > this.totalPaginas) {
      this.paginaActual = 1;
    }
  }

  getLogrosPaginados(): Logro[] {
    const inicio = (this.paginaActual - 1) * this.registrosPorPagina;
    const fin = inicio + this.registrosPorPagina;
    return this.logrosFiltrados.slice(inicio, fin);
  }

  cambiarPagina(pagina: number): void {
    if (pagina < 1 || pagina > this.totalPaginas) return;
    this.paginaActual = pagina;
  }

  getPaginasVisibles(): number[] {
    const paginas: number[] = [];
    const rango = 2;
    let inicio = Math.max(1, this.paginaActual - rango);
    let fin = Math.min(this.totalPaginas, this.paginaActual + rango);

    if (inicio > 1) paginas.push(1);
    if (inicio > 2) paginas.push(-1); // separador

    for (let i = inicio; i <= fin; i++) {
      paginas.push(i);
    }

    if (fin < this.totalPaginas - 1) paginas.push(-1); // separador
    if (fin < this.totalPaginas) paginas.push(this.totalPaginas);

    return paginas;
  }

  // ─── Exportar Excel ───────────────────────────────────────────────

  exportarExcel(): void {
    const datosExport: any[] = [];

    this.logrosFiltrados.forEach(logro => {
      if (logro.indicadores && logro.indicadores.length > 0) {
        // Una fila por cada indicador, con los datos del logro
        logro.indicadores.forEach(indicador => {
          datosExport.push({
            'Grado': logro.nombre_grado || '',
            'Área Académica': logro.nombre_area_academica || '',
            'Corte Académico': logro.nombre_corte_academico || '',
            'Esfera de Desarrollo': logro.nombre_esfera_desarrollo || '',
            'Eje Curricular': logro.nombre_eje_curricular || '',
            'Competencia Cognitiva': logro.nombre_competencia_cognitiva || '',
            'Estándar Básico': logro.nombre_estandar_basico || '',
            'Logro': logro.nombre || '',
            'Indicador de Logro': indicador.nombre || ''
          });
        });
      } else {
        // Logro sin indicadores
        datosExport.push({
          'Grado': logro.nombre_grado || '',
          'Área Académica': logro.nombre_area_academica || '',
          'Corte Académico': logro.nombre_corte_academico || '',
          'Esfera de Desarrollo': logro.nombre_esfera_desarrollo || '',
          'Eje Curricular': logro.nombre_eje_curricular || '',
          'Competencia Cognitiva': logro.nombre_competencia_cognitiva || '',
          'Estándar Básico': logro.nombre_estandar_basico || '',
          'Logro': logro.nombre || '',
          'Indicador de Logro': ''
        });
      }
    });

    if (datosExport.length === 0) {
      alert('No hay datos para exportar con los filtros aplicados.');
      return;
    }

    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(datosExport);

    // Ajustar ancho de columnas
    ws['!cols'] = [
      { wch: 15 }, // Grado
      { wch: 25 }, // Área
      { wch: 18 }, // Corte
      { wch: 22 }, // Esfera
      { wch: 22 }, // Eje
      { wch: 25 }, // Competencia
      { wch: 18 }, // Estándar
      { wch: 50 }, // Logro
      { wch: 50 }, // Indicador
    ];

    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Malla Curricular');

    // Nombre del archivo con filtros aplicados
    let nombreArchivo = 'malla_curricular';
    if (this.gradoSeleccionado) {
      const grado = this.grados.find(g => g.id == Number(this.gradoSeleccionado));
      if (grado) nombreArchivo += `_${grado.nombre.replace(/\s+/g, '_')}`;
    }
    if (this.areaSeleccionada) {
      const area = this.areas.find(a => a.id == Number(this.areaSeleccionada));
      if (area) nombreArchivo += `_${area.nombre.replace(/\s+/g, '_')}`;
    }
    nombreArchivo += '.xlsx';

    XLSX.writeFile(wb, nombreArchivo);
  }

  exportarExcelCompleto(): void {
    this.exportarExcel();
  }

  // ─── Exportar PDF ───────────────────────────────────────────────

  async exportarPDF(): Promise<void> {
    try {
      const logoBase64 = await this.cargarLogoBase64();

      const datosPDF: DatosMallaCurricularPDF = {
        logros: this.logrosFiltrados,
        totales: this.totales,
        filtrosDescripcion: this.getDescripcionFiltros(),
        fechaGeneracion: new Date(),
        logoBase64: logoBase64
      };

      this.exportarPdfService.generarPDF(datosPDF);
    } catch (error) {
      console.error('Error al generar el PDF:', error);
      alert('Ocurrió un error al generar el PDF. Por favor, intente nuevamente.');
    }
  }

  private async cargarLogoBase64(): Promise<string> {
    try {
      const logoUrl = this.institucionConfigService.getLogoUrl();
      const response = await fetch(logoUrl);
      const blob = await response.blob();

      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Error al cargar el logo:', error);
      return '';
    }
  }

  // ─── Utilidades ───────────────────────────────────────────────────

  getConteoLogrosPorGrupo(clave: string): number {
    return this.logrosAgrupados.get(clave)?.length || 0;
  }

  getDescripcionFiltros(): string {
    const partes: string[] = [];
    if (this.gradoSeleccionado) {
      const grado = this.grados.find(g => g.id == Number(this.gradoSeleccionado));
      if (grado) partes.push(grado.nombre);
    }
    if (this.areaSeleccionada) {
      const area = this.areas.find(a => a.id == Number(this.areaSeleccionada));
      if (area) partes.push(area.nombre);
    }
    if (this.corteSeleccionado) {
      const corte = this.cortes.find(c => c.id == Number(this.corteSeleccionado));
      if (corte) partes.push(corte.nombre);
    }
    if (this.esferaSeleccionada) {
      const esfera = this.esferas.find(e => e.id == Number(this.esferaSeleccionada));
      if (esfera) partes.push(esfera.nombre);
    }
    return partes.length > 0 ? partes.join(' · ') : 'Todos los registros';
  }
}