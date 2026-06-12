import { Component, Input, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chart, registerables } from 'chart.js';
import { Subscription } from 'rxjs';

import { Ead3EvaluacionesService } from '../../../../services/ead3-evaluaciones.service';
import { ExportarPdfEad3Service } from '../../../../services/exportar-pdf-ead3.service';
import { InstitucionConfigService } from '../../../../services/institucion-config.service';

Chart.register(...registerables);

@Component({
    selector: 'app-estudiante-ead3',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './estudiante-ead3.component.html',
    styleUrl: './estudiante-ead3.component.scss'
})
export class EstudianteEad3Component implements OnInit, OnDestroy {
    @Input() idEstudiante: string = '0';

    @ViewChild('graficoBarrasEad3') graficoBarrasCanvas!: ElementRef<HTMLCanvasElement>;
    @ViewChild('graficoRadarEad3') graficoRadarCanvas!: ElementRef<HTMLCanvasElement>;

    public evaluaciones: any[] = [];
    public evaluacionSeleccionadaId: string = '';
    public evaluacionSeleccionada: any = null;
    public detalleItems: any[] = [];

    public cargando: boolean = true;
    public cargandoDetalle: boolean = false;
    public exportandoPdf: boolean = false;

    // Acordeón
    public areasAbiertas: { [key: string]: boolean } = { MG: false, MF: false, AL: false, PS: false };

    public areas = ['MG', 'MF', 'AL', 'PS'];
    public areaNombres: { [key: string]: string } = {
        'MG': 'Motricidad Gruesa',
        'MF': 'Motricidad Fino Adaptativa',
        'AL': 'Audición y Lenguaje',
        'PS': 'Personal Social'
    };
    public areaNombresCortos: { [key: string]: string } = {
        'MG': 'Mot. Gruesa',
        'MF': 'Mot. Fina',
        'AL': 'Aud. y Leng.',
        'PS': 'Personal Social'
    };
    public areaIconos: { [key: string]: string } = {
        'MG': 'fas fa-running',
        'MF': 'fas fa-hand-paper',
        'AL': 'fas fa-comments',
        'PS': 'fas fa-users'
    };

    private chartBarras: Chart | null = null;
    private chartRadar: Chart | null = null;
    private subscriptions: Subscription[] = [];

    constructor(
        private ead3Service: Ead3EvaluacionesService,
        private exportarPdfEad3Service: ExportarPdfEad3Service,
        private institucionConfigService: InstitucionConfigService
    ) { }

    ngOnInit(): void {
        if (this.idEstudiante && this.idEstudiante !== '0') {
            this.cargarEvaluaciones();
        }
    }

    ngOnDestroy(): void {
        this.subscriptions.forEach(sub => sub.unsubscribe());
        this.destruirGraficos();
    }

    // --- CARGA ---

    cargarEvaluaciones(): void {
        this.cargando = true;
        const sub = this.ead3Service.obtenerByEstudiante(this.idEstudiante).subscribe({
            next: (res: any) => {
                const todas = res.body || [];
                this.evaluaciones = todas.filter((ev: any) => ev.estado === 'finalizado');
                if (this.evaluaciones.length > 0) {
                    this.evaluacionSeleccionadaId = this.evaluaciones[0].id.toString();
                    this.seleccionarEvaluacion();
                }
                this.cargando = false;
            },
            error: () => { this.cargando = false; }
        });
        this.subscriptions.push(sub);
    }

    seleccionarEvaluacion(): void {
        if (!this.evaluacionSeleccionadaId) {
            this.evaluacionSeleccionada = null;
            this.detalleItems = [];
            this.destruirGraficos();
            return;
        }

        const ev = this.evaluaciones.find((e: any) => e.id.toString() === this.evaluacionSeleccionadaId);
        if (!ev) return;

        this.evaluacionSeleccionada = ev;
        this.cargandoDetalle = true;
        this.areasAbiertas = { MG: false, MF: false, AL: false, PS: false };

        const sub = this.ead3Service.obtenerDetalle(ev.id).subscribe({
            next: (res: any) => {
                this.detalleItems = res.body || [];
                this.cargandoDetalle = false;
                setTimeout(() => this.crearGraficos(), 300);
            },
            error: () => { this.cargandoDetalle = false; }
        });
        this.subscriptions.push(sub);
    }

    // --- ACORDEÓN ---

    toggleArea(area: string): void {
        this.areasAbiertas[area] = !this.areasAbiertas[area];
    }

    // --- GRÁFICOS ---

    destruirGraficos(): void {
        if (this.chartBarras) { this.chartBarras.destroy(); this.chartBarras = null; }
        if (this.chartRadar) { this.chartRadar.destroy(); this.chartRadar = null; }
    }

    crearGraficos(): void {
        this.destruirGraficos();
        if (!this.evaluacionSeleccionada || !this.graficoBarrasCanvas || !this.graficoRadarCanvas) return;
        this.crearGraficoBarras();
        this.crearGraficoRadar();
    }

    private crearGraficoBarras(): void {
        const ctx = this.graficoBarrasCanvas.nativeElement.getContext('2d');
        if (!ctx) return;

        const labels = this.areas.map(a => this.areaNombresCortos[a]);
        const cumple = this.areas.map(a => this.getCumplePorArea(a));
        const noCumple = this.areas.map(a => this.getNoCumplePorArea(a));

        this.chartBarras = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    { label: 'Cumple', data: cumple, backgroundColor: '#4CAF50', borderRadius: 4 },
                    { label: 'No cumple', data: noCumple, backgroundColor: '#F44336', borderRadius: 4 }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { font: { size: 11 }, usePointStyle: true } },
                    title: { display: true, text: 'Ítems por Área', font: { size: 13 } }
                },
                scales: {
                    x: { grid: { display: false } },
                    y: { beginAtZero: true, ticks: { stepSize: 1 } }
                }
            }
        });
    }

    private crearGraficoRadar(): void {
        const ctx = this.graficoRadarCanvas.nativeElement.getContext('2d');
        if (!ctx) return;

        const labels = this.areas.map(a => this.areaNombresCortos[a]);
        const porcentajes = this.areas.map(a => this.getPorcentajeArea(a));

        this.chartRadar = new Chart(ctx, {
            type: 'radar',
            data: {
                labels,
                datasets: [{
                    label: '% Cumplimiento',
                    data: porcentajes,
                    backgroundColor: 'rgba(76, 175, 80, 0.2)',
                    borderColor: '#4CAF50',
                    pointBackgroundColor: porcentajes.map(p =>
                        p >= 70 ? '#4CAF50' : p >= 40 ? '#FF9800' : '#F44336'
                    ),
                    pointBorderColor: '#fff',
                    pointRadius: 5,
                    pointBorderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    title: { display: true, text: 'Perfil de Desarrollo', font: { size: 13 } }
                },
                scales: {
                    r: {
                        beginAtZero: true,
                        max: 100,
                        ticks: { stepSize: 25, font: { size: 10 } },
                        pointLabels: { font: { size: 11 } }
                    }
                }
            }
        });
    }

    private capturarGraficos(): { barrasBase64: string; radarBase64: string; canvasWidth: number; canvasHeight: number } {
        let barrasBase64 = '';
        let radarBase64 = '';
        const exportWidth = 600;
        const exportHeight = 350;

        // Capturar gráfico de barras a canvas temporal
        if (this.chartBarras) {
            barrasBase64 = this.exportarChartComoImagen(this.chartBarras, exportWidth, exportHeight);
        }

        // Capturar gráfico radar a canvas temporal
        if (this.chartRadar) {
            radarBase64 = this.exportarChartComoImagen(this.chartRadar, exportWidth, exportHeight);
        }

        return { barrasBase64, radarBase64, canvasWidth: exportWidth, canvasHeight: exportHeight };
    }

    private exportarChartComoImagen(chart: Chart, width: number, height: number): string {
        // Crear canvas temporal con dimensiones controladas
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = height;
        const tempCtx = tempCanvas.getContext('2d');
        if (!tempCtx) return '';

        // Fondo blanco
        tempCtx.fillStyle = '#FFFFFF';
        tempCtx.fillRect(0, 0, width, height);

        // Dibujar el chart original escalado al canvas temporal
        const originalCanvas = chart.canvas;
        tempCtx.drawImage(originalCanvas, 0, 0, width, height);

        return tempCanvas.toDataURL('image/png');
    }

    // --- UTILIDADES ---

    getClaseSemaforo(resultado: string): string {
        return { 'verde': 'semaforo-verde', 'amarillo': 'semaforo-amarillo', 'rojo': 'semaforo-rojo' }[resultado] || '';
    }

    getTextoResultado(resultado: string): string {
        return { 'verde': 'Desarrollo esperado', 'amarillo': 'Riesgo de problemas', 'rojo': 'Sospecha de problemas' }[resultado] || 'Sin evaluar';
    }

    getTextoResultadoCorto(resultado: string): string {
        return { 'verde': 'Esperado', 'amarillo': 'Riesgo', 'rojo': 'Sospecha' }[resultado] || '';
    }

    getIconoResultado(resultado: string): string {
        return { 'verde': 'fas fa-check-circle', 'amarillo': 'fas fa-exclamation-triangle', 'rojo': 'fas fa-times-circle' }[resultado] || 'fas fa-question-circle';
    }

    getCumplePorArea(area: string): number {
        return this.detalleItems.filter(i => i.area === area && i.cumple === 1).length;
    }

    getNoCumplePorArea(area: string): number {
        return this.detalleItems.filter(i => i.area === area && i.cumple === 0).length;
    }

    getTotalPorArea(area: string): number {
        return this.detalleItems.filter(i => i.area === area).length;
    }

    getPorcentajeArea(area: string): number {
        const total = this.getTotalPorArea(area);
        if (total === 0) return 0;
        return Math.round((this.getCumplePorArea(area) / total) * 100);
    }

    getItemsNoCumple(area: string): any[] {
        return this.detalleItems.filter(i => i.area === area && i.cumple === 0);
    }

    getItemsCumple(area: string): any[] {
        return this.detalleItems.filter(i => i.area === area && i.cumple === 1);
    }

    formatearFechaLabel(ev: any): string {
        const fecha = ev.fecha_evaluacion || '';
        const resultado = this.getTextoResultadoCorto(ev.resultado_global);
        return `EAD-3 — ${fecha} — ${resultado}`;
    }

    tieneTexto(html: string): boolean {
        if (!html) return false;
        return html.replace(/<[^>]*>/g, '').trim().length > 0;
    }

    tieneObservaciones(): boolean {
        return this.evaluacionSeleccionada && this.tieneTexto(this.evaluacionSeleccionada.observaciones);
    }

    tieneAnalisis(): boolean {
        if (!this.evaluacionSeleccionada) return false;
        return this.tieneTexto(this.evaluacionSeleccionada.analisis) ||
            this.tieneTexto(this.evaluacionSeleccionada.recomendaciones);
    }

    // --- PDF ---

    async exportarPDF(): Promise<void> {
        if (!this.evaluacionSeleccionada) return;
        this.exportandoPdf = true;
        try {
            const logoBase64 = await this.cargarLogoBase64();
            const graficos = this.capturarGraficos();
            this.exportarPdfEad3Service.generarPDF({
                evaluacion: this.evaluacionSeleccionada,
                detalleItems: this.detalleItems,
                logoBase64,
                nombreInstitucion: this.institucionConfigService.getNombreInstitucion(),
                nitInstitucion: this.institucionConfigService.getNitInstitucion(),
                resolucion: this.institucionConfigService.getResolucion(),
                graficoBarrasBase64: graficos.barrasBase64,
                graficoRadarBase64: graficos.radarBase64,
                canvasWidth: graficos.canvasWidth,
                canvasHeight: graficos.canvasHeight
            });
        } catch (error) {
            console.error('Error PDF EAD-3:', error);
        } finally {
            this.exportandoPdf = false;
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
        } catch { return ''; }
    }
}