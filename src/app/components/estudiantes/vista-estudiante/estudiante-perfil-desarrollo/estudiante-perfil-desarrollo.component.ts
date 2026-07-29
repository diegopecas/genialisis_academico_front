import { Component, Input, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chart, registerables } from 'chart.js';
import { Subscription } from 'rxjs';

import { PdeAplicacionesService } from '../../../../services/pde-aplicaciones.service';
import { PdeAplicacionesEsferasService } from '../../../../services/pde-aplicaciones-esferas.service';
import { PdeAplicacionesDetalleService } from '../../../../services/pde-aplicaciones-detalle.service';
import { ExportarPdfPerfilDesarrolloService } from '../../../../services/exportar-pdf-perfil-desarrollo.service';
import { InstitucionConfigService } from '../../../../services/institucion-config.service';

Chart.register(...registerables);

@Component({
    selector: 'app-estudiante-perfil-desarrollo',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './estudiante-perfil-desarrollo.component.html',
    styleUrl: './estudiante-perfil-desarrollo.component.scss'
})
export class EstudiantePerfilDesarrolloComponent implements OnInit, OnDestroy {
    @Input() idEstudiante: string = '0';

    @ViewChild('graficoEsferas') graficoEsferasCanvas!: ElementRef<HTMLCanvasElement>;

    public aplicaciones: any[] = [];
    public aplicacionSeleccionadaId: string = '';
    public aplicacionSeleccionada: any = null;
    public esferas: any[] = [];
    public detalleItems: any[] = [];

    public cargando: boolean = true;
    public cargandoDetalle: boolean = false;
    public exportandoPdf: boolean = false;

    public esferasAbiertas: { [idEsfera: string]: boolean } = {};

    private chartEsferas: Chart | null = null;
    private subscriptions: Subscription[] = [];

    constructor(
        private pdeAplicacionesService: PdeAplicacionesService,
        private pdeAplicacionesEsferasService: PdeAplicacionesEsferasService,
        private pdeAplicacionesDetalleService: PdeAplicacionesDetalleService,
        private exportarPdfService: ExportarPdfPerfilDesarrolloService,
        private institucionConfigService: InstitucionConfigService
    ) { }

    ngOnInit(): void {
        if (this.idEstudiante && this.idEstudiante !== '0') {
            this.cargarAplicaciones();
        }
    }

    ngOnDestroy(): void {
        this.subscriptions.forEach(sub => sub.unsubscribe());
        this.destruirGrafico();
    }

    // --- CARGA ---

    cargarAplicaciones(): void {
        this.cargando = true;
        const sub = this.pdeAplicacionesService.obtenerByEstudiante(this.idEstudiante).subscribe({
            next: (res: any) => {
                const todas = (res.body || []) as any[];
                this.aplicaciones = todas.filter(a => a.estado === 'finalizada');

                if (this.aplicaciones.length > 0) {
                    this.aplicacionSeleccionadaId = this.aplicaciones[0].id;
                    this.seleccionarAplicacion();
                }
                this.cargando = false;
            },
            error: () => { this.cargando = false; }
        });
        this.subscriptions.push(sub);
    }

    seleccionarAplicacion(): void {
        if (!this.aplicacionSeleccionadaId) {
            this.aplicacionSeleccionada = null;
            this.esferas = [];
            this.detalleItems = [];
            this.destruirGrafico();
            return;
        }

        const aplicacion = this.aplicaciones.find(a => a.id === this.aplicacionSeleccionadaId);
        if (!aplicacion) { return; }

        this.aplicacionSeleccionada = aplicacion;
        this.cargandoDetalle = true;
        this.esferasAbiertas = {};

        const subEsferas = this.pdeAplicacionesEsferasService.obtenerByAplicacion(aplicacion.id).subscribe({
            next: (res: any) => {
                this.esferas = (res.body || []) as any[];
                this.cargarDetalleItems(aplicacion.id);
            },
            error: () => { this.cargandoDetalle = false; }
        });
        this.subscriptions.push(subEsferas);
    }

    cargarDetalleItems(idAplicacion: string): void {
        const sub = this.pdeAplicacionesDetalleService.obtenerAplicados(idAplicacion).subscribe({
            next: (res: any) => {
                this.detalleItems = (res.body || []) as any[];
                this.cargandoDetalle = false;
                setTimeout(() => this.crearGrafico(), 300);
            },
            error: () => { this.cargandoDetalle = false; }
        });
        this.subscriptions.push(sub);
    }

    // --- ACORDEON ---

    toggleEsfera(idEsfera: string): void {
        this.esferasAbiertas[idEsfera] = !this.esferasAbiertas[idEsfera];
    }

    itemsPorEsfera(idEsfera: string): any[] {
        return this.detalleItems.filter(item => item.id_esfera === idEsfera);
    }

    // Desglose por subarea dentro de una esfera. Solo aplica donde los items la traen.
    resumenSubareas(idEsfera: string): any[] {
        const items = this.itemsPorEsfera(idEsfera).filter(item => item.subarea);
        if (items.length === 0) { return []; }

        const mapa: { [subarea: string]: { obtenidos: number, posibles: number } } = {};

        items.forEach(item => {
            const clave = item.subarea;
            if (!mapa[clave]) { mapa[clave] = { obtenidos: 0, posibles: 0 }; }
            mapa[clave].obtenidos += Number(item.puntaje);
            mapa[clave].posibles += Number(item.puntaje_maximo);
        });

        return Object.keys(mapa).map(clave => {
            const datos = mapa[clave];
            const porcentaje = datos.posibles > 0 ? (datos.obtenidos / datos.posibles) * 100 : 0;
            return {
                subarea: clave,
                etiqueta: clave.charAt(0).toUpperCase() + clave.slice(1),
                obtenidos: datos.obtenidos,
                posibles: datos.posibles,
                porcentaje: Math.round(porcentaje)
            };
        });
    }

    claseSubarea(porcentaje: number): string {
        if (porcentaje >= 70) { return 'sub-verde'; }
        if (porcentaje >= 40) { return 'sub-amarillo'; }
        return 'sub-rojo';
    }

    // --- GRAFICO ---

    destruirGrafico(): void {
        if (this.chartEsferas) {
            this.chartEsferas.destroy();
            this.chartEsferas = null;
        }
    }

    crearGrafico(): void {
        this.destruirGrafico();

        if (!this.aplicacionSeleccionada || !this.graficoEsferasCanvas) { return; }

        const ctx = this.graficoEsferasCanvas.nativeElement.getContext('2d');
        if (!ctx) { return; }

        const etiquetas = this.esferas.map(e => e.nombre_esfera);
        const edadDesarrollo = this.esferas.map(e => Math.round(Number(e.edad_desarrollo_meses)));
        const edadReal = this.esferas.map(() => Number(this.aplicacionSeleccionada.edad_meses));

        this.chartEsferas = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: etiquetas,
                datasets: [
                    {
                        label: 'Edad de desarrollo (meses)',
                        data: edadDesarrollo,
                        backgroundColor: edadDesarrollo.map((valor, i) =>
                            valor >= edadReal[i] * 0.95 ? '#4CAF50' : valor >= edadReal[i] * 0.8 ? '#FF9800' : '#F44336'
                        ),
                        borderRadius: 4
                    },
                    {
                        label: 'Edad real (meses)',
                        data: edadReal,
                        type: 'line',
                        borderColor: '#1565C0',
                        borderWidth: 2,
                        pointRadius: 3,
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { font: { size: 11 }, usePointStyle: true } },
                    title: { display: true, text: 'Edad alcanzada por esfera', font: { size: 13 } }
                },
                scales: {
                    x: { grid: { display: false } },
                    y: { beginAtZero: true, title: { display: true, text: 'Meses' } }
                }
            }
        });
    }

    private capturarGrafico(): { base64: string, ancho: number, alto: number } {
        const ancho = 700;
        const alto = 300;

        if (!this.chartEsferas) {
            return { base64: '', ancho, alto };
        }

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = ancho;
        tempCanvas.height = alto;
        const tempCtx = tempCanvas.getContext('2d');
        if (!tempCtx) { return { base64: '', ancho, alto }; }

        tempCtx.fillStyle = '#FFFFFF';
        tempCtx.fillRect(0, 0, ancho, alto);
        tempCtx.drawImage(this.chartEsferas.canvas, 0, 0, ancho, alto);

        return { base64: tempCanvas.toDataURL('image/png'), ancho, alto };
    }

    // --- UTILIDADES ---

    claseIndice(indice: any): string {
        if (indice === null || indice === undefined || indice === '') { return 'idx-neutro'; }
        const valor = Number(indice);
        if (valor >= 95) { return 'idx-verde'; }
        if (valor >= 80) { return 'idx-amarillo'; }
        return 'idx-rojo';
    }

    textoLectura(indice: any): string {
        if (indice === null || indice === undefined || indice === '') { return 'Sin resultado'; }
        const valor = Number(indice);
        if (valor >= 95) { return 'En lo esperado o por encima'; }
        if (valor >= 80) { return 'Ligeramente por debajo'; }
        return 'Diferencia amplia frente a su edad';
    }

    redondear(valor: any): string {
        if (valor === null || valor === undefined || valor === '') { return '-'; }
        return `${Math.round(Number(valor))}`;
    }

    etiquetaPuntaje(item: any): string {
        const puntaje = Number(item.puntaje);
        const maximo = Number(item.puntaje_maximo);
        if (puntaje === 0) { return 'No lo logra'; }
        if (puntaje === maximo) { return 'Lo logra solo'; }
        return 'Con apoyo';
    }

    clasePuntaje(item: any): string {
        const puntaje = Number(item.puntaje);
        const maximo = Number(item.puntaje_maximo);
        if (puntaje === 0) { return 'pt-no'; }
        if (puntaje === maximo) { return 'pt-si'; }
        return 'pt-parcial';
    }

    formatearEtiquetaAplicacion(aplicacion: any): string {
        const indice = this.redondear(aplicacion.indice_global);
        return `${aplicacion.fecha_aplicacion} — índice ${indice}`;
    }

    tieneTexto(html: string): boolean {
        if (!html) { return false; }
        return html.replace(/<[^>]*>/g, '').trim().length > 0;
    }

    tieneAnalisis(): boolean {
        if (!this.aplicacionSeleccionada) { return false; }
        return this.tieneTexto(this.aplicacionSeleccionada.analisis) ||
            this.tieneTexto(this.aplicacionSeleccionada.recomendaciones);
    }

    // --- PDF ---

    async exportarPDF(): Promise<void> {
        if (!this.aplicacionSeleccionada) { return; }

        this.exportandoPdf = true;
        try {
            const logoBase64 = await this.cargarLogoBase64();
            const grafico = this.capturarGrafico();

            this.exportarPdfService.generarPDF({
                aplicacion: this.aplicacionSeleccionada,
                esferas: this.esferas,
                detalleItems: this.detalleItems,
                logoBase64,
                nombreInstitucion: this.institucionConfigService.getNombreInstitucion(),
                nitInstitucion: this.institucionConfigService.getNitInstitucion(),
                resolucion: this.institucionConfigService.getResolucion(),
                graficoBarrasBase64: grafico.base64,
                canvasWidth: grafico.ancho,
                canvasHeight: grafico.alto
            });
        } catch (error) {
            console.error('Error PDF Perfil de Desarrollo:', error);
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
        } catch {
            return '';
        }
    }
}
