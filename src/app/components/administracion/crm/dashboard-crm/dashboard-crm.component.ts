import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, registerables } from 'chart.js';
import { HeaderComponent } from '../../../../common/header/header.component';
import { VisitasService } from '../../../../services/visitas.service';

Chart.register(...registerables);

interface DashboardStats {
  visitasMesActual: number;
  visitasMesAnterior: number;
  porResultado: { nombre: string; codigo: string; cantidad: number }[];
  nivelInteres: { promedio: number; total: number };
  evolucionMensual: { mes: string; total: number }[];
  topComoConocio: { nombre: string; cantidad: number }[];
  objecionesFrecuentes: { nombre: string; cantidad: number; superadas: number }[];
  perfilesDisc: { perfil: string; cantidad: number }[];
}

@Component({
  selector: 'app-dashboard-crm',
  standalone: true,
  imports: [CommonModule, HeaderComponent],
  templateUrl: './dashboard-crm.component.html',
  styleUrl: './dashboard-crm.component.scss'
})
export class DashboardCrmComponent implements OnInit, OnDestroy, AfterViewInit {
  titulo = "Dashboard CRM";
  
  public cargando: boolean = true;
  public stats: DashboardStats | null = null;
  
  private charts: { [key: string]: Chart } = {};
  
  // KPIs calculados
  public tasaConversion: number = 0;
  public variacionMensual: number = 0;
  public nivelInteresPromedio: number = 0;
  
  constructor(
    private visitasService: VisitasService
  ) { }

  ngOnInit(): void {
    this.cargarEstadisticas();
  }

  ngAfterViewInit(): void {
    // Los gráficos se crearán después de cargar los datos
  }

  ngOnDestroy(): void {
    // Destruir todos los gráficos al salir
    Object.values(this.charts).forEach(chart => chart.destroy());
  }

  cargarEstadisticas(): void {
    this.cargando = true;
    console.log('🔍 Cargando estadísticas...');
    this.visitasService.obtenerEstadisticasDashboard().subscribe({
      next: (response: any) => {
        console.log('✅ Datos recibidos:', response.body);
        this.stats = response.body;
        this.calcularKPIs();
        console.log('📊 KPIs calculados:', {
          tasaConversion: this.tasaConversion,
          variacionMensual: this.variacionMensual,
          nivelInteresPromedio: this.nivelInteresPromedio
        });
        // Esperar a que Angular renderice los canvas
        setTimeout(() => {
          console.log('🎨 Creando gráficos...');
          this.crearGraficos();
          this.cargando = false;
        }, 100);
      },
      error: (error: any) => {
        console.error('❌ Error al cargar estadísticas:', error);
        this.cargando = false;
      }
    });
  }

  calcularKPIs(): void {
    if (!this.stats) return;

    // Tasa de conversión
    const matriculados = this.stats.porResultado.find(r => r.codigo === 'matriculado');
    const totalVisitas = this.stats.porResultado.reduce((sum, r) => sum + r.cantidad, 0);
    this.tasaConversion = totalVisitas > 0 
      ? ((matriculados?.cantidad || 0) / totalVisitas) * 100 
      : 0;

    // Variación mensual
    if (this.stats.visitasMesAnterior > 0) {
      this.variacionMensual = 
        ((this.stats.visitasMesActual - this.stats.visitasMesAnterior) / this.stats.visitasMesAnterior) * 100;
    }

    // Nivel de interés promedio
    this.nivelInteresPromedio = this.stats.nivelInteres.promedio || 0;
  }

  crearGraficos(): void {
    if (!this.stats) {
      console.warn('⚠️ No hay stats para crear gráficos');
      return;
    }

    console.log('📈 Stats disponibles:', this.stats);
    this.crearGraficoResultados();
    this.crearGraficoEvolucion();
    this.crearGraficoComoConocio();
    this.crearGraficoObjeciones();
    this.crearGraficoPerfilesDisc();
    console.log('✅ Gráficos creados');
  }

  crearGraficoResultados(): void {
    const canvas = document.getElementById('chartResultados') as HTMLCanvasElement;
    console.log('🎯 Canvas Resultados:', canvas);
    if (!canvas) {
      console.error('❌ No se encontró canvas chartResultados');
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx || !this.stats) {
      console.error('❌ No se pudo obtener contexto o stats');
      return;
    }

    console.log('📊 Datos para gráfico resultados:', this.stats.porResultado);

    // Destruir gráfico anterior si existe
    if (this.charts['resultados']) {
      this.charts['resultados'].destroy();
    }

    const colores = {
      'matriculado': '#28a745',
      'perdido_competencia': '#dc3545',
      'perdido_precio': '#fd7e14',
      'no_interesado': '#6c757d',
      'seguimiento': '#17a2b8',
      'pendiente': '#ffc107'
    };

    this.charts['resultados'] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: this.stats.porResultado.map(r => r.nombre),
        datasets: [{
          data: this.stats.porResultado.map(r => r.cantidad),
          backgroundColor: this.stats.porResultado.map(r => colores[r.codigo as keyof typeof colores] || '#6c757d'),
          borderWidth: 2,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 15,
              font: { size: 12 }
            }
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const label = context.label || '';
                const value = context.parsed || 0;
                const total = (context.dataset.data as number[]).reduce((a, b) => a + b, 0);
                const percentage = ((value / total) * 100).toFixed(1);
                return `${label}: ${value} (${percentage}%)`;
              }
            }
          }
        }
      }
    });
  }

  crearGraficoEvolucion(): void {
    const canvas = document.getElementById('chartEvolucion') as HTMLCanvasElement;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx || !this.stats) return;

    if (this.charts['evolucion']) {
      this.charts['evolucion'].destroy();
    }

    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    
    this.charts['evolucion'] = new Chart(ctx, {
      type: 'line',
      data: {
        labels: this.stats.evolucionMensual.map(e => {
          const [year, month] = e.mes.split('-');
          return `${meses[parseInt(month) - 1]} ${year}`;
        }),
        datasets: [{
          label: 'Visitas',
          data: this.stats.evolucionMensual.map(e => e.total),
          borderColor: '#007bff',
          backgroundColor: 'rgba(0, 123, 255, 0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 5,
          pointHoverRadius: 7
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: 12,
            displayColors: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { stepSize: 1 }
          }
        }
      }
    });
  }

  crearGraficoComoConocio(): void {
    const canvas = document.getElementById('chartComoConocio') as HTMLCanvasElement;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx || !this.stats) return;

    if (this.charts['comoConocio']) {
      this.charts['comoConocio'].destroy();
    }

    this.charts['comoConocio'] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: this.stats.topComoConocio.map(c => c.nombre),
        datasets: [{
          label: 'Cantidad',
          data: this.stats.topComoConocio.map(c => c.cantidad),
          backgroundColor: '#17a2b8',
          borderColor: '#138496',
          borderWidth: 1
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: 12
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            ticks: { stepSize: 1 }
          }
        }
      }
    });
  }

  crearGraficoObjeciones(): void {
    const canvas = document.getElementById('chartObjeciones') as HTMLCanvasElement;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx || !this.stats) return;

    if (this.charts['objeciones']) {
      this.charts['objeciones'].destroy();
    }

    this.charts['objeciones'] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: this.stats.objecionesFrecuentes.map(o => o.nombre),
        datasets: [
          {
            label: 'Total',
            data: this.stats.objecionesFrecuentes.map(o => o.cantidad),
            backgroundColor: '#dc3545',
            borderColor: '#c82333',
            borderWidth: 1
          },
          {
            label: 'Superadas',
            data: this.stats.objecionesFrecuentes.map(o => o.superadas),
            backgroundColor: '#28a745',
            borderColor: '#218838',
            borderWidth: 1
          }
        ]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: { padding: 15 }
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: 12
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            ticks: { stepSize: 1 }
          }
        }
      }
    });
  }

  crearGraficoPerfilesDisc(): void {
    const canvas = document.getElementById('chartPerfilesDisc') as HTMLCanvasElement;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx || !this.stats) return;

    if (this.charts['perfilesDisc']) {
      this.charts['perfilesDisc'].destroy();
    }

    const coloresDisc = {
      'D': '#dc3545',
      'I': '#ffc107',
      'S': '#28a745',
      'C': '#007bff'
    };

    this.charts['perfilesDisc'] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: this.stats.perfilesDisc.map(p => `Perfil ${p.perfil}`),
        datasets: [{
          data: this.stats.perfilesDisc.map(p => p.cantidad),
          backgroundColor: this.stats.perfilesDisc.map(p => coloresDisc[p.perfil as keyof typeof coloresDisc] || '#6c757d'),
          borderWidth: 2,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 15,
              font: { size: 12 }
            }
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const label = context.label || '';
                const value = context.parsed || 0;
                const total = (context.dataset.data as number[]).reduce((a, b) => a + b, 0);
                const percentage = ((value / total) * 100).toFixed(1);
                return `${label}: ${value} (${percentage}%)`;
              }
            }
          }
        }
      }
    });
  }

  getVariacionClass(): string {
    if (this.variacionMensual > 0) return 'text-success';
    if (this.variacionMensual < 0) return 'text-danger';
    return 'text-muted';
  }

  getVariacionIcon(): string {
    if (this.variacionMensual > 0) return 'fa-arrow-up';
    if (this.variacionMensual < 0) return 'fa-arrow-down';
    return 'fa-minus';
  }

  getTotalUltimos6Meses(): number {
    if (!this.stats) return 0;
    return this.stats.evolucionMensual.reduce((sum, m) => sum + m.total, 0);
  }
}