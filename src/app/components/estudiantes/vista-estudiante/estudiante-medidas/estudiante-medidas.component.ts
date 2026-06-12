import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chart, registerables } from 'chart.js';

import { MedidasXEstudianteService } from '../../../../services/medidas-x-estudiante.service';
import { CategoriasMedidasService } from '../../../../services/categorias-medidas.service';
import { InstitucionConfigService } from '../../../../services/institucion-config.service';

interface MedidaTipo {
  id: number;
  nombre: string;
  id_categoria: number;
  categoria_nombre: string;
  unidad_abreviatura: string;
  tipo_valor: string;
  color: string;
  activa: boolean;
}

interface RegistroMedida {
  id: number;
  id_medida: number;
  fecha: string;
  valor: number;
  nombre_medida: string;
  unidad_abreviatura: string;
  nombre_usuario: string;
}

interface RangoSlider {
  min: number;
  max: number;
  desde: number;
  hasta: number;
  desdeLabel: string;
  hastaLabel: string;
  minLabel: string;
  maxLabel: string;
}

// Paleta de colores para las series del gráfico
const COLORES_SERIES = [
  '#d4af37', '#e74c3c', '#3498db', '#2ecc71', '#9b59b6',
  '#f39c12', '#1abc9c', '#e67e22', '#34495e', '#16a085',
  '#c0392b', '#2980b9', '#8e44ad', '#27ae60', '#d35400',
  '#7f8c8d', '#f1c40f', '#e84393', '#00cec9', '#6c5ce7',
  '#fd79a8', '#a29bfe', '#ffeaa7', '#fab1a0', '#74b9ff'
];

@Component({
  selector: 'app-estudiante-medidas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './estudiante-medidas.component.html',
  styleUrl: './estudiante-medidas.component.scss'
})
export class EstudianteMedidasComponent implements OnInit {
  @Input() idEstudiante: string = "0";

  // Datos
  medidas: RegistroMedida[] = [];
  medidasTipos: MedidaTipo[] = [];
  categorias: { id: number; nombre: string; icono: string; medidas: MedidaTipo[] }[] = [];

  // Medidas filtradas por rango
  medidasFiltradas: RegistroMedida[] = [];

  // Slider
  rango: RangoSlider = this.crearRangoVacio();
  anioAcademico: number = new Date().getFullYear();

  // Estado
  cargando = false;
  busquedaMedida = '';

  // Gráfico
  private chart: any = null;

  constructor(
    private medidasXEstudianteService: MedidasXEstudianteService,
    private categoriasMedidasService: CategoriasMedidasService,
    private institucionConfigService: InstitucionConfigService
  ) {
    Chart.register(...registerables);
  }

  ngOnInit(): void {
    this.anioAcademico = this.institucionConfigService.getAnioAcademicoActual();
    if (this.idEstudiante && this.idEstudiante !== "0") {
      this.cargarDatos();
    }
  }

  // ============================================
  // CARGA DE DATOS
  // ============================================

  cargarDatos(): void {
    this.cargando = true;
    this.categoriasMedidasService.obtenerConMedidas().subscribe({
      next: (categoriasData: any[]) => {
        let colorIndex = 0;
        this.categorias = categoriasData.map(cat => ({
          id: cat.id,
          nombre: cat.nombre,
          icono: cat.icono || 'fas fa-ruler',
          medidas: (cat.medidas || []).map((m: any) => {
            const medidaTipo: MedidaTipo = {
              id: m.id,
              nombre: m.nombre,
              id_categoria: m.id_categoria,
              categoria_nombre: cat.nombre,
              unidad_abreviatura: m.unidad_abreviatura || '',
              tipo_valor: m.tipo_valor || 'numerico',
              color: COLORES_SERIES[colorIndex % COLORES_SERIES.length],
              activa: false
            };
            colorIndex++;
            return medidaTipo;
          })
        }));

        this.medidasTipos = this.categorias.flatMap(c => c.medidas);
        this.categoriasFiltradas = [...this.categorias];

        // Activar peso y estatura por defecto
        this.medidasTipos.forEach(m => {
          if (m.id === 1 || m.id === 2) m.activa = true;
        });

        this.cargarMedidasEstudiante();
      },
      error: (error) => {
        console.error('Error al cargar categorías:', error);
        this.cargando = false;
      }
    });
  }

  private cargarMedidasEstudiante(): void {
    this.medidasXEstudianteService.obtenerTodosXEstudiante(this.idEstudiante).subscribe({
      next: (response: any) => {
        const datos = response.body || [];
        this.medidas = datos.map((m: any) => ({
          id: m.id,
          id_medida: m.id_medida,
          fecha: m.fecha,
          valor: parseFloat(m.valor || '0'),
          nombre_medida: m.nombre_medida || '',
          unidad_abreviatura: m.unidad_abreviatura || this.obtenerUnidad(m.id_medida),
          nombre_usuario: m.nombre_usuario || ''
        }));

        this.inicializarRango();
        this.aplicarFiltro();
        this.cargando = false;

        setTimeout(() => this.actualizarGrafico(), 300);
      },
      error: (error) => {
        console.error('Error al cargar medidas:', error);
        this.cargando = false;
      }
    });
  }

  // ============================================
  // SELECTOR DE MEDIDAS
  // ============================================

  toggleMedida(medida: MedidaTipo): void {
    if (medida.tipo_valor === 'select') return;
    medida.activa = !medida.activa;
    this.actualizarRegistrosTabla();
    this.actualizarGrafico();
  }

  get medidasActivas(): MedidaTipo[] {
    return this.medidasTipos.filter(m => m.activa);
  }

  get totalActivas(): number {
    return this.medidasActivas.length;
  }

  desactivarTodas(): void {
    this.medidasTipos.forEach(m => m.activa = false);
    this.actualizarRegistrosTabla();
    this.actualizarGrafico();
  }

  categoriasFiltradas: { id: number; nombre: string; icono: string; medidas: MedidaTipo[] }[] = [];

  private filtrarCategorias(): void {
    if (!this.busquedaMedida.trim()) {
      this.categoriasFiltradas = this.categorias;
      return;
    }
    const termino = this.normalizarTexto(this.busquedaMedida);
    this.categoriasFiltradas = this.categorias
      .map(c => ({ ...c, medidas: c.medidas.filter(m => this.normalizarTexto(m.nombre).includes(termino)) }))
      .filter(c => c.medidas.length > 0);
  }

  onBusquedaMedidaCambiada(): void {
    this.filtrarCategorias();
  }

  // ============================================
  // SLIDER DE RANGO
  // ============================================

  private crearRangoVacio(): RangoSlider {
    const ahora = Date.now();
    return { min: ahora, max: ahora, desde: ahora, hasta: ahora, desdeLabel: '', hastaLabel: '', minLabel: '', maxLabel: '' };
  }

  private inicializarRango(): void {
    if (!this.medidas || this.medidas.length === 0) {
      this.rango = this.crearRangoVacio();
      return;
    }
    const fechas = this.medidas.map(m => new Date(m.fecha).getTime()).sort((a, b) => a - b);
    const minAbsoluto = fechas[0];
    const hoy = new Date().setHours(23, 59, 59, 999);
    const inicioAnio = new Date(this.anioAcademico, 0, 1).getTime();
    const desdePorDefecto = inicioAnio < minAbsoluto ? minAbsoluto : inicioAnio;

    this.rango = {
      min: minAbsoluto, max: hoy,
      desde: desdePorDefecto, hasta: hoy,
      desdeLabel: this.timestampAFecha(desdePorDefecto), hastaLabel: this.timestampAFecha(hoy),
      minLabel: this.timestampAFecha(minAbsoluto), maxLabel: this.timestampAFecha(hoy)
    };
  }

  onDesdeChange(event: Event): void {
    const valor = Number((event.target as HTMLInputElement).value);
    this.rango.desde = valor > this.rango.hasta ? this.rango.hasta : valor;
    this.rango.desdeLabel = this.timestampAFecha(this.rango.desde);
    this.aplicarFiltro();
    this.actualizarGrafico();
  }

  onHastaChange(event: Event): void {
    const valor = Number((event.target as HTMLInputElement).value);
    this.rango.hasta = valor < this.rango.desde ? this.rango.desde : valor;
    this.rango.hastaLabel = this.timestampAFecha(this.rango.hasta);
    this.aplicarFiltro();
    this.actualizarGrafico();
  }

  getPorcentajeDesde(): number {
    if (this.rango.max === this.rango.min) return 0;
    return ((this.rango.desde - this.rango.min) / (this.rango.max - this.rango.min)) * 100;
  }

  getPorcentajeHasta(): number {
    if (this.rango.max === this.rango.min) return 100;
    return ((this.rango.hasta - this.rango.min) / (this.rango.max - this.rango.min)) * 100;
  }

  private aplicarFiltro(): void {
    this.medidasFiltradas = this.medidas.filter(m => {
      const ts = new Date(m.fecha).getTime();
      return ts >= this.rango.desde && ts <= this.rango.hasta;
    });
    this.actualizarRegistrosTabla();
  }

  // ============================================
  // GRÁFICO
  // ============================================

  actualizarGrafico(): void {
    const canvas = document.getElementById('medidasChart') as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }

    const activas = this.medidasActivas;
    if (activas.length === 0 || this.medidasFiltradas.length === 0) {
      this.chart = new Chart(ctx, {
        type: 'bar',
        data: { labels: ['Sin datos'], datasets: [{ label: 'Selecciona medidas', data: [0], backgroundColor: 'rgba(200,200,200,0.5)' }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { title: { display: true, text: activas.length === 0 ? 'Selecciona medidas para ver el gráfico' : 'No hay datos en el rango seleccionado', font: { size: 12 } } } }
      });
      return;
    }

    // Recopilar todas las fechas únicas ordenadas
    const fechasSet = new Set<string>();
    activas.forEach(mt => {
      this.medidasFiltradas.filter(m => m.id_medida === mt.id).forEach(m => fechasSet.add(m.fecha));
    });
    const fechasOrdenadas = Array.from(fechasSet).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    const labels = fechasOrdenadas.map(f => new Date(f).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: '2-digit' }));

    // Crear datasets
    const datasets = activas.map(mt => {
      const medidasDeTipo = this.medidasFiltradas.filter(m => m.id_medida === mt.id);
      const mapaValores = new Map<string, number>();
      medidasDeTipo.forEach(m => mapaValores.set(m.fecha, m.valor));

      const data = fechasOrdenadas.map(f => mapaValores.get(f) ?? null);

      return {
        label: `${mt.nombre} (${mt.unidad_abreviatura})`,
        data: data,
        borderColor: mt.color,
        backgroundColor: mt.color + '1A',
        pointBackgroundColor: mt.color,
        tension: 0.4,
        borderWidth: 2,
        pointRadius: 3,
        pointHoverRadius: 5,
        spanGaps: true
      };
    });

    this.chart = new Chart(ctx, {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 12, padding: 10, font: { size: 10, weight: 'bold' } } },
          tooltip: { titleFont: { size: 10 }, bodyFont: { size: 10 } }
        },
        scales: {
          x: { ticks: { font: { size: 9 }, maxRotation: 45 }, grid: { display: false } },
          y: { ticks: { font: { size: 9 } }, title: { display: false } }
        }
      }
    });
  }

  // ============================================
  // TABLA
  // ============================================

  registrosTabla: RegistroMedida[] = [];

  private actualizarRegistrosTabla(): void {
    const idsActivas = new Set(this.medidasActivas.map(m => m.id));
    this.registrosTabla = this.medidasFiltradas
      .filter(m => idsActivas.has(m.id_medida))
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  }

  obtenerColorMedida(idMedida: number): string {
    const tipo = this.medidasTipos.find(m => m.id === idMedida);
    return tipo ? tipo.color : '#666';
  }

  obtenerUnidad(idMedida: number): string {
    const tipo = this.medidasTipos.find(m => m.id === idMedida);
    return tipo ? tipo.unidad_abreviatura : '';
  }

  // ============================================
  // UTILIDADES
  // ============================================

  private timestampAFecha(ts: number): string {
    const d = new Date(ts);
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
  }

  private normalizarTexto(texto: string): string {
    if (!texto) return '';
    return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  }
}