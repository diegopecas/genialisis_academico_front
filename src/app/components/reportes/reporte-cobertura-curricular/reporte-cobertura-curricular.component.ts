import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription, forkJoin } from 'rxjs';
import { Chart, ChartType, registerables } from 'chart.js';

import { HeaderComponent } from '../../../common/header/header.component';
import { SprintsService } from '../../../services/sprints.service';
import { IaCoberturaCurricularService } from '../../../services/ia-cobertura-curricular.service';
import { GruposService } from '../../../services/grupos.service';
import { CortesAcademicosService } from '../../../services/cortes-academicos.service';
import { AreasAcademicasService } from '../../../services/areas-academicas.service';
import { EsferasDesarrolloService } from '../../../services/esferas-desarrollo.service';

import Swal from 'sweetalert2';

Chart.register(...registerables);

@Component({
  selector: 'app-reporte-cobertura-curricular',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent],
  templateUrl: './reporte-cobertura-curricular.component.html',
  styleUrl: './reporte-cobertura-curricular.component.scss'
})
export class ReporteCoberturaCurricularComponent implements OnInit, OnDestroy {
  @ViewChild('graficoEsferas') graficoEsferasCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('graficoDiversion') graficoDiversionCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('graficoOriginalidad') graficoOriginalidadCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('graficoEstimulacion') graficoEstimulacionCanvas!: ElementRef<HTMLCanvasElement>;

  titulo = "Análisis de Cobertura Curricular";

  public cargando = false;
  public cargandoIA = false;
  public datosDisponibles = false;
  private subscriptions: Subscription[] = [];

  public grupoSeleccionado = '';
  public corteSeleccionado = '';
  public areaSeleccionada = '';
  public esferaSeleccionada = '';
  public busquedaLogro = '';
  public filtroEstado = '';
  public filtroAreaLogro = '';
  public filtroEsferaLogro = '';
  public ordenColumna = '';
  public ordenDireccion: 'asc' | 'desc' = 'asc';

  // Filtros tabla IA
  public filtroEntornoIA = '';
  public filtroModalidadIA = '';
  public filtroTipoIA = '';
  public filtroAsignacionIA = '';
  public ordenColumnaIA = '';
  public ordenDireccionIA: 'asc' | 'desc' = 'asc';

  // Estadísticas consolidadas IA
  public estadisticasIA: any = null;
  private graficoDiversion: Chart | null = null;
  private graficoOriginalidad: Chart | null = null;
  private graficoEstimulacion: Chart | null = null;

  public grupos: any[] = [];
  public cortes: any[] = [];
  public areas: any[] = [];
  public esferas: any[] = [];

  public analisis: any = null;
  public logrosFiltrados: any[] = [];

  // IA - tabs por área
  public analisisPorArea: any[] = [];
  public tabActivo = 0;
  public mostrarAnalisisIA = false;

  private graficoEsferas: Chart | null = null;

  public paginaActual = 1;
  public registrosPorPagina = 15;
  public totalPaginas = 1;

  public todosExpandidos = false;
  public mostrarMateriales = false;
  public _seccionActiva = 'resumen';
  public menuSeccionesAbierto = false;

  get seccionActiva(): string { return this._seccionActiva; }
  set seccionActiva(val: string) {
    this._seccionActiva = val;
    this.menuSeccionesAbierto = false;
    if (val === 'resumen') {
      setTimeout(() => { this.crearGraficoEsferas(); }, 200);
    }
    if (val === 'ia' && this.estadisticasIA) {
      setTimeout(() => { this.crearGraficosIA(); }, 200);
    }
  }

  constructor(
    private sprintsService: SprintsService,
    private iaCoberturaCurricularService: IaCoberturaCurricularService,
    private gruposService: GruposService,
    private cortesAcademicosService: CortesAcademicosService,
    private areasAcademicasService: AreasAcademicasService,
    private esferasDesarrolloService: EsferasDesarrolloService
  ) {}

  ngOnInit(): void {
    this.cargarCatalogos();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    if (this.graficoEsferas) this.graficoEsferas.destroy();
    if (this.graficoDiversion) this.graficoDiversion.destroy();
    if (this.graficoOriginalidad) this.graficoOriginalidad.destroy();
    if (this.graficoEstimulacion) this.graficoEstimulacion.destroy();
  }

  cargarCatalogos(): void {
    this.cargando = true;
    const sub = forkJoin({
      grupos: this.gruposService.obtenerTodos(),
      cortes: this.cortesAcademicosService.obtenerTodos(),
      areas: this.areasAcademicasService.obtenerTodos(),
      esferas: this.esferasDesarrolloService.obtenerTodos()
    }).subscribe({
      next: (response: any) => {
        this.grupos = (response.grupos.body || []).sort((a: any, b: any) => (a.orden || a.id) - (b.orden || b.id));
        this.cortes = (response.cortes.body || []).sort((a: any, b: any) => (a.orden || a.id) - (b.orden || b.id));
        this.areas = response.areas.body || [];
        this.esferas = response.esferas.body || [];
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error al cargar catálogos:', error);
        this.cargando = false;
      }
    });
    this.subscriptions.push(sub);
  }

  cargarAnalisis(): void {
    if (!this.grupoSeleccionado || !this.corteSeleccionado) {
      Swal.fire({ title: 'Filtros requeridos', text: 'Seleccione un grupo y un corte académico.', icon: 'warning', confirmButtonText: 'Aceptar', confirmButtonColor: '#F5A623' });
      return;
    }

    this.cargando = true;
    this.datosDisponibles = false;
    this.analisisPorArea = [];
    this.mostrarAnalisisIA = false;
    this.tabActivo = 0;

    const opciones: any = {};
    if (this.areaSeleccionada) opciones.id_area = this.areaSeleccionada;

    const sub = this.sprintsService.obtenerAnalisisCoberturaCurricular(this.grupoSeleccionado, this.corteSeleccionado, opciones).subscribe({
      next: (response: any) => {
        this.analisis = response.body;
        this.datosDisponibles = this.analisis.logros.length > 0;
        this.aplicarFiltrosLocales();
        this.cargando = false;

        if (this.datosDisponibles) {
          setTimeout(() => { this.crearGraficoEsferas(); }, 200);
          this.buscarAnalisisGuardado();
        }
      },
      error: (error) => {
        console.error('Error al cargar análisis:', error);
        this.cargando = false;
        Swal.fire({ title: 'Error', text: 'No se pudo cargar el análisis.', icon: 'error', confirmButtonText: 'Aceptar' });
      }
    });
    this.subscriptions.push(sub);
  }

  buscarAnalisisGuardado(): void {
    const opciones: any = {};
    if (this.areaSeleccionada) opciones.id_area = this.areaSeleccionada;

    const sub = this.iaCoberturaCurricularService.obtenerAnalisisGuardado(this.grupoSeleccionado, this.corteSeleccionado, opciones).subscribe({
      next: (response: any) => {
        const data = response.body as any;
        if (data && data.existe && data.resultados?.length) {
          this.analisisPorArea = data.resultados.map((r: any) => ({
            ...r,
            nombre_area: this.getNombreArea(r.id_area)
          }));
          this.mostrarAnalisisIA = true;
          this.calcularEstadisticasIA();
        }
      },
      error: () => {}
    });
    this.subscriptions.push(sub);
  }

  solicitarAnalisisIA(): void {
    if (!this.analisis) return;

    this.cargandoIA = true;
    const nombreGrupo = this.grupos.find(g => g.id == this.grupoSeleccionado)?.nombre || '';
    const nombreCorte = this.cortes.find(c => c.id == this.corteSeleccionado)?.nombre || '';

    const datosParaIA = {
      id_grupo: this.grupoSeleccionado,
      id_corte: this.corteSeleccionado,
      id_area: this.areaSeleccionada || null,
      nombre_grupo: nombreGrupo,
      nombre_corte: nombreCorte,
      resumen: this.analisis.resumen,
      por_area: this.analisis.por_area,
      logros: this.analisis.logros,
      materiales_consolidados: this.analisis.materiales_consolidados
    };

    const sub = this.iaCoberturaCurricularService.analizarCobertura(datosParaIA).subscribe({
      next: (response: any) => {
        this.cargandoIA = false;
        this.mostrarAnalisisIA = true;

        if (response.resultados) {
          // Respuesta multi-área
          this.analisisPorArea = response.resultados.map((r: any) => ({
            ...r,
            nombre_area: r.nombre_area || this.getNombreArea(r.id_area)
          }));
        } else if (response.analisis) {
          // Respuesta single-área (con id_area seleccionada)
          this.analisisPorArea = [{
            id_area: this.areaSeleccionada,
            nombre_area: this.getNombreArea(this.areaSeleccionada),
            analisis: response.analisis,
            proveedor: response.proveedor,
            tiempo_ms: response.tiempo_ms,
            desde_bd: false
          }];
        } else if (response.analisis_texto) {
          this.analisisPorArea = [{
            id_area: this.areaSeleccionada,
            nombre_area: this.getNombreArea(this.areaSeleccionada),
            analisis_texto: response.analisis_texto,
            proveedor: response.proveedor,
            tiempo_ms: response.tiempo_ms,
            desde_bd: false
          }];
        }

        this.tabActivo = 0;
        this.calcularEstadisticasIA();
      },
      error: (error) => {
        this.cargandoIA = false;
        console.error('Error en análisis IA:', error);
        Swal.fire({ title: 'Error en Análisis IA', text: 'No se pudo generar el análisis.', icon: 'error', confirmButtonText: 'Aceptar', confirmButtonColor: '#F5A623' });
      }
    });
    this.subscriptions.push(sub);
  }

  getNombreArea(idArea: string): string {
    const area = this.areas.find(a => a.id === idArea);
    return area ? area.nombre : 'Área ' + idArea;
  }

  getAnalisisActivo(): any {
    return this.analisisPorArea[this.tabActivo] || null;
  }

  verDetalleActividad(act: any): void {
    let actCompleta: any = null;
    if (this.analisis) {
      for (const logro of this.analisis.logros) {
        if (logro.actividades) {
          const found = logro.actividades.find((a: any) => a.titulo === act.titulo);
          if (found) { actCompleta = found; break; }
        }
      }
    }

    let html = `<div class="text-start">`;
    html += `<p><strong>Entorno:</strong> ${act.entorno === 'aire_libre' ? 'Aire libre' : 'Aula'}</p>`;
    html += `<p><strong>Modalidad:</strong> ${act.modalidad === 'grupal' ? 'Grupal' : 'Individual'}</p>`;
    html += `<p><strong>Tipo:</strong> ${act.tipo}</p>`;
    html += `<p><strong>Asignación:</strong> ${act.bien_asignada ? 'Correcta' : 'Revisar'} - ${act.observacion_asignacion || ''}</p>`;

    // Indicadores lúdicos
    if (act.nivel_diversion || act.nivel_originalidad || act.nivel_estimulacion) {
      html += `<hr><div style="display:flex;gap:1rem;flex-wrap:wrap;margin-bottom:0.5rem;">`;
      if (act.nivel_diversion) html += `<span>😄 Diversión: <strong>${act.nivel_diversion}</strong></span>`;
      if (act.nivel_originalidad) html += `<span>💡 Originalidad: <strong>${act.nivel_originalidad}</strong></span>`;
      if (act.nivel_estimulacion) html += `<span>⚡ Estimulación: <strong>${act.nivel_estimulacion}</strong></span>`;
      html += `</div>`;
      if (act.observacion_ludica) html += `<p style="font-style:italic;color:#666;">${act.observacion_ludica}</p>`;
    }

    if (actCompleta) {
      if (actCompleta.minutos_duracion) html += `<p><strong>Duración:</strong> ${actCompleta.minutos_duracion} min</p>`;
      if (actCompleta.descripcion) html += `<hr><p><strong>Descripción:</strong></p><div style="max-height:150px;overflow-y:auto;font-size:0.85rem;">${actCompleta.descripcion}</div>`;
      if (actCompleta.materiales) html += `<hr><p><strong>Materiales:</strong></p><p style="font-size:0.9rem;">${actCompleta.materiales}</p>`;
      if (actCompleta.nivel_uno) html += `<hr><p><strong>Nivel 1:</strong></p><div style="max-height:150px;overflow-y:auto;font-size:0.85rem;">${actCompleta.nivel_uno}</div>`;
      if (actCompleta.nivel_dos) html += `<p class="mt-2"><strong>Nivel 2:</strong></p><div style="max-height:150px;overflow-y:auto;font-size:0.85rem;">${actCompleta.nivel_dos}</div>`;
    }

    if (act.logros_adicionales_sugeridos?.length) {
      html += `<hr><p><strong>Logros adicionales sugeridos:</strong></p><ul>`;
      act.logros_adicionales_sugeridos.forEach((l: string) => { html += `<li>${l}</li>`; });
      html += `</ul>`;
    }
    html += `</div>`;

    Swal.fire({ title: act.titulo, html, width: '700px', confirmButtonText: 'Cerrar', confirmButtonColor: '#F5A623' });
  }

  aplicarFiltrosLocales(): void {
    if (!this.analisis) return;
    let filtrados = [...this.analisis.logros];

    if (this.filtroEstado === 'cubierto') filtrados = filtrados.filter((l: any) => l.cubierto);
    else if (this.filtroEstado === 'sin_cobertura') filtrados = filtrados.filter((l: any) => !l.cubierto);

    if (this.filtroAreaLogro) filtrados = filtrados.filter((l: any) => l.nombre_area === this.filtroAreaLogro);

    if (this.filtroEsferaLogro) filtrados = filtrados.filter((l: any) => l.nombre_esfera === this.filtroEsferaLogro);

    if (this.busquedaLogro) {
      const busqueda = this.busquedaLogro.toLowerCase().trim();
      filtrados = filtrados.filter((l: any) =>
        l.nombre.toLowerCase().includes(busqueda) ||
        l.nombre_area.toLowerCase().includes(busqueda) ||
        (l.nombre_esfera && l.nombre_esfera.toLowerCase().includes(busqueda))
      );
    }

    if (this.ordenColumna) {
      filtrados.sort((a: any, b: any) => {
        let valA = a[this.ordenColumna]; let valB = b[this.ordenColumna];
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();
        if (typeof valA === 'boolean') { valA = valA ? 1 : 0; valB = valB ? 1 : 0; }
        if (valA < valB) return this.ordenDireccion === 'asc' ? -1 : 1;
        if (valA > valB) return this.ordenDireccion === 'asc' ? 1 : -1;
        return 0;
      });
    }

    this.logrosFiltrados = filtrados;
    this.calcularPaginacion();
  }

  buscarLogro(): void { this.paginaActual = 1; this.aplicarFiltrosLocales(); }

  crearGraficoEsferas(): void {
    if (!this.graficoEsferasCanvas || !this.analisis) return;
    const datos = this.analisis.por_esfera;
    if (datos.length === 0) return;

    if (this.graficoEsferas) this.graficoEsferas.destroy();
    const ctx = this.graficoEsferasCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    const colores = ['#2196F3', '#FF9800', '#9C27B0', '#009688', '#F44336', '#4CAF50', '#FFC107'];

    this.graficoEsferas = new Chart(ctx, {
      type: 'radar' as ChartType,
      data: {
        labels: datos.map((e: any) => e.nombre),
        datasets: [{
          label: '% Cobertura', data: datos.map((e: any) => e.porcentaje),
          backgroundColor: 'rgba(33, 150, 243, 0.2)', borderColor: '#2196F3', borderWidth: 2,
          pointBackgroundColor: colores.slice(0, datos.length), pointBorderColor: '#fff', pointBorderWidth: 2, pointRadius: 6
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { title: { display: true, text: 'Cobertura por Esfera de Desarrollo', font: { size: 16, weight: 'bold' } } },
        scales: { r: { beginAtZero: true, max: 100, ticks: { stepSize: 20, callback: (v) => v + '%' } } }
      }
    });
  }

  toggleLogro(logro: any): void { logro.expandido = !logro.expandido; }
  toggleTodos(): void { this.todosExpandidos = !this.todosExpandidos; this.logrosFiltrados.forEach(l => l.expandido = this.todosExpandidos); }

  calcularPaginacion(): void {
    this.totalPaginas = Math.ceil(this.logrosFiltrados.length / this.registrosPorPagina);
    if (this.paginaActual > this.totalPaginas) this.paginaActual = 1;
  }

  getLogrosPaginados(): any[] {
    const inicio = (this.paginaActual - 1) * this.registrosPorPagina;
    return this.logrosFiltrados.slice(inicio, inicio + this.registrosPorPagina);
  }

  cambiarPagina(pagina: number): void { if (pagina >= 1 && pagina <= this.totalPaginas) this.paginaActual = pagina; }

  getPaginasVisibles(): number[] {
    const paginas: number[] = []; const rango = 2;
    let inicio = Math.max(1, this.paginaActual - rango); let fin = Math.min(this.totalPaginas, this.paginaActual + rango);
    if (inicio > 1) paginas.push(1); if (inicio > 2) paginas.push(-1);
    for (let i = inicio; i <= fin; i++) { paginas.push(i); }
    if (fin < this.totalPaginas - 1) paginas.push(-1); if (fin < this.totalPaginas) paginas.push(this.totalPaginas);
    return paginas;
  }

  getClaseCobertura(porcentaje: number): string {
    if (porcentaje >= 80) return 'cobertura-alta'; if (porcentaje >= 50) return 'cobertura-media'; return 'cobertura-baja';
  }

  getColorPuntaje(puntaje: number): string {
    if (puntaje >= 80) return '#4CAF50'; if (puntaje >= 60) return '#FF9800'; if (puntaje >= 40) return '#FFC107'; return '#F44336';
  }

  getDescripcionFiltros(): string {
    const partes: string[] = [];
    const grupo = this.grupos.find(g => g.id == this.grupoSeleccionado);
    if (grupo) partes.push(grupo.nombre);
    const corte = this.cortes.find(c => c.id == this.corteSeleccionado);
    if (corte) partes.push(corte.nombre);
    if (this.areaSeleccionada) { const area = this.areas.find(a => a.id == this.areaSeleccionada); if (area) partes.push(area.nombre); }
    return partes.length > 0 ? partes.join(' · ') : '';
  }

  ordenarPor(columna: string): void {
    if (this.ordenColumna === columna) this.ordenDireccion = this.ordenDireccion === 'asc' ? 'desc' : 'asc';
    else { this.ordenColumna = columna; this.ordenDireccion = 'asc'; }
    this.aplicarFiltrosLocales();
  }

  getAreasDisponibles(): string[] {
    if (!this.analisis) return [];
    const set = new Set<string>();
    this.analisis.logros.forEach((l: any) => { if (l.nombre_area) set.add(l.nombre_area); });
    return Array.from(set).sort();
  }

  getEsferasDisponibles(): string[] {
    if (!this.analisis) return [];
    const set = new Set<string>();
    this.analisis.logros.forEach((l: any) => { if (l.nombre_esfera) set.add(l.nombre_esfera); });
    return Array.from(set).sort();
  }

  getActividadesIAFiltradas(actividades: any[]): any[] {
    if (!actividades) return [];
    let filtradas = [...actividades];
    if (this.filtroEntornoIA) filtradas = filtradas.filter(a => a.entorno === this.filtroEntornoIA);
    if (this.filtroModalidadIA) filtradas = filtradas.filter(a => a.modalidad === this.filtroModalidadIA);
    if (this.filtroTipoIA) filtradas = filtradas.filter(a => a.tipo && a.tipo.toLowerCase().includes(this.filtroTipoIA.toLowerCase()));
    if (this.filtroAsignacionIA === 'bien') filtradas = filtradas.filter(a => a.bien_asignada);
    if (this.filtroAsignacionIA === 'revisar') filtradas = filtradas.filter(a => !a.bien_asignada);

    if (this.ordenColumnaIA) {
      filtradas.sort((a: any, b: any) => {
        let valA = a[this.ordenColumnaIA]; let valB = b[this.ordenColumnaIA];
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();
        if (typeof valA === 'boolean') { valA = valA ? 1 : 0; valB = valB ? 1 : 0; }
        if (valA < valB) return this.ordenDireccionIA === 'asc' ? -1 : 1;
        if (valA > valB) return this.ordenDireccionIA === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return filtradas;
  }

  ordenarPorIA(columna: string): void {
    if (this.ordenColumnaIA === columna) this.ordenDireccionIA = this.ordenDireccionIA === 'asc' ? 'desc' : 'asc';
    else { this.ordenColumnaIA = columna; this.ordenDireccionIA = 'asc'; }
  }

  calcularEstadisticasIA(): void {
    const todasActividades: any[] = [];
    let totalPuntaje = 0; let countPuntaje = 0;

    for (const area of this.analisisPorArea) {
      if (area.analisis?.analisis_actividades) {
        todasActividades.push(...area.analisis.analisis_actividades);
      }
      if (area.analisis?.puntaje_general) { totalPuntaje += area.analisis.puntaje_general; countPuntaje++; }
    }

    const contarNiveles = (campo: string) => {
      const c = { alto: 0, medio: 0, bajo: 0 };
      todasActividades.forEach(a => { const v = a[campo]; if (v && c.hasOwnProperty(v)) (c as any)[v]++; });
      return c;
    };

    this.estadisticasIA = {
      totalActividades: todasActividades.length,
      totalAreas: this.analisisPorArea.filter(a => a.analisis).length,
      puntajePromedio: countPuntaje > 0 ? Math.round(totalPuntaje / countPuntaje) : 0,
      bienAsignadas: todasActividades.filter(a => a.bien_asignada).length,
      revisar: todasActividades.filter(a => !a.bien_asignada).length,
      entornoAula: todasActividades.filter(a => a.entorno === 'aula').length,
      entornoAireLibre: todasActividades.filter(a => a.entorno === 'aire_libre').length,
      grupal: todasActividades.filter(a => a.modalidad === 'grupal').length,
      individual: todasActividades.filter(a => a.modalidad === 'individual').length,
      diversion: contarNiveles('nivel_diversion'),
      originalidad: contarNiveles('nivel_originalidad'),
      estimulacion: contarNiveles('nivel_estimulacion')
    };

    setTimeout(() => { this.crearGraficosIA(); }, 300);
  }

  crearGraficosIA(): void {
    const coloresNivel = ['#4CAF50', '#FF9800', '#F44336'];
    const labels = ['Alto', 'Medio', 'Bajo'];
    const opcionesDonut: any = {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } } },
      cutout: '60%'
    };

    const crearDonut = (canvas: ElementRef<HTMLCanvasElement> | undefined, chartRef: Chart | null, datos: any, titulo: string): Chart | null => {
      if (!canvas) return chartRef;
      if (chartRef) chartRef.destroy();
      const ctx = canvas.nativeElement.getContext('2d');
      if (!ctx) return null;
      return new Chart(ctx, {
        type: 'doughnut' as ChartType,
        data: { labels, datasets: [{ data: [datos.alto, datos.medio, datos.bajo], backgroundColor: coloresNivel, borderWidth: 0 }] },
        options: { ...opcionesDonut, plugins: { ...opcionesDonut.plugins, title: { display: true, text: titulo, font: { size: 13, weight: 'bold' } } } }
      });
    };

    if (this.estadisticasIA) {
      this.graficoDiversion = crearDonut(this.graficoDiversionCanvas, this.graficoDiversion, this.estadisticasIA.diversion, 'Diversión');
      this.graficoOriginalidad = crearDonut(this.graficoOriginalidadCanvas, this.graficoOriginalidad, this.estadisticasIA.originalidad, 'Originalidad');
      this.graficoEstimulacion = crearDonut(this.graficoEstimulacionCanvas, this.graficoEstimulacion, this.estadisticasIA.estimulacion, 'Estimulación');
    }
  }

  getValoresUnicosIA(actividades: any[], campo: string): string[] {
    if (!actividades) return [];
    const set = new Set<string>();
    actividades.forEach((a: any) => { if (a[campo]) set.add(a[campo]); });
    return Array.from(set).sort();
  }

  resetearFiltros(): void {
    this.areaSeleccionada = ''; this.busquedaLogro = '';
    this.filtroEstado = ''; this.filtroAreaLogro = ''; this.filtroEsferaLogro = '';
    this.ordenColumna = ''; this.ordenDireccion = 'asc';
    this.filtroEntornoIA = ''; this.filtroModalidadIA = ''; this.filtroTipoIA = ''; this.filtroAsignacionIA = '';
    this.ordenColumnaIA = ''; this.ordenDireccionIA = 'asc';
    if (this.grupoSeleccionado && this.corteSeleccionado) this.cargarAnalisis();
  }
}