import { Injectable } from '@angular/core';
import { jsPDF } from 'jspdf';

export interface DatosEad3PDF {
    evaluacion: any;
    detalleItems: any[];
    logoBase64?: string;
    nombreInstitucion: string;
    nitInstitucion: string;
    resolucion?: string;
    graficoBarrasBase64?: string;
    graficoRadarBase64?: string;
    canvasWidth?: number;
    canvasHeight?: number;
}

@Injectable({
    providedIn: 'root'
})
export class ExportarPdfEad3Service {
    private pdf!: jsPDF;
    private pageWidth = 210;
    private pageHeight = 297;
    private marginLeft = 18;
    private marginRight = 18;
    private contentWidth = 210 - 18 - 18; // 174
    private currentY = 18;
    private pageNumber = 1;
    private totalPages = 0;

    private colors = {
        ead3: '#00695C',
        ead3Dark: '#004D40',
        black: '#222222',
        darkGray: '#555555',
        medGray: '#888888',
        lightGray: '#f5f5f5',
        borderGray: '#e0e0e0',
        green: '#4CAF50',
        greenBg: '#F1F8E9',
        orange: '#FF9800',
        orangeBg: '#FFF8E1',
        red: '#F44336',
        redBg: '#FFF5F5',
        blue: '#2196F3'
    };

    private areas = ['MG', 'MF', 'AL', 'PS'];
    private areaNombres: { [key: string]: string } = {
        'MG': 'Motricidad Gruesa',
        'MF': 'Motricidad Fino Adaptativa',
        'AL': 'Audición y Lenguaje',
        'PS': 'Personal Social'
    };

    generarPDF(datos: DatosEad3PDF): void {
        this.pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
        this.currentY = 18;
        this.pageNumber = 1;
        this.pdf.setFont('helvetica', 'normal');

        const ev = datos.evaluacion;
        const items = datos.detalleItems;

        // Generar secciones
        this.generarEncabezado(datos);
        this.generarDatosEstudiante(ev);
        this.generarResultadoGlobal(ev);
        this.generarResultadosPorArea(ev, items);
        this.generarGraficos(datos);
        this.generarTablaItemsPorArea(ev, items);
        this.generarObservaciones(ev);
        this.generarAnalisis(ev);
        this.generarComoLeer();

        // Pie de página en todas las páginas
        this.totalPages = this.pageNumber;
        for (let i = 1; i <= this.totalPages; i++) {
            this.pdf.setPage(i);
            this.dibujarPiePagina(i);
        }

        // Guardar
        const nombre = (ev.nombre_estudiante || 'Estudiante').replace(/\s+/g, '_');
        const fecha = (ev.fecha_evaluacion || '').replace(/\//g, '-');
        this.pdf.save(`EAD3_${nombre}_${fecha}.pdf`);
    }

    // ============================
    // ENCABEZADO
    // ============================
    private generarEncabezado(datos: DatosEad3PDF): void {
        const ead3 = this.rgb(this.colors.ead3);
        const black = this.rgb(this.colors.black);
        const gray = this.rgb(this.colors.medGray);

        // Logo
        if (datos.logoBase64) {
            try {
                this.pdf.addImage(datos.logoBase64, 'PNG', this.marginLeft + 5, this.currentY, 20, 20);
            } catch (e) { /* sin logo */ }
        }

        // Nombre institución
        this.pdf.setFontSize(13);
        this.pdf.setFont('helvetica', 'bold');
        this.pdf.setTextColor(black.r, black.g, black.b);
        const nombre = datos.nombreInstitucion.toUpperCase();
        this.centrarTexto(nombre, this.currentY + 8);

        // Resolución / NIT
        this.pdf.setFontSize(8);
        this.pdf.setFont('helvetica', 'normal');
        this.pdf.setTextColor(gray.r, gray.g, gray.b);
        const sub = (datos.resolucion && datos.resolucion !== 'Por definir' && datos.resolucion.trim())
            ? datos.resolucion : `NIT: ${datos.nitInstitucion}`;
        this.centrarTexto(sub, this.currentY + 13);

        this.currentY += 18;

        // Título
        this.pdf.setFontSize(12);
        this.pdf.setFont('helvetica', 'bold');
        this.pdf.setTextColor(ead3.r, ead3.g, ead3.b);
        this.centrarTexto('INFORME DE EVALUACIÓN DEL DESARROLLO — EAD-3', this.currentY);

        // Línea decorativa
        this.currentY += 4;
        this.pdf.setDrawColor(ead3.r, ead3.g, ead3.b);
        this.pdf.setLineWidth(1.5);
        this.pdf.line(this.marginLeft, this.currentY, this.pageWidth - this.marginRight, this.currentY);

        this.currentY += 7;
    }

    // ============================
    // DATOS DEL ESTUDIANTE
    // ============================
    private generarDatosEstudiante(ev: any): void {
        const bg = this.rgb(this.colors.lightGray);

        this.pdf.setFillColor(bg.r, bg.g, bg.b);
        this.pdf.roundedRect(this.marginLeft, this.currentY, this.contentWidth, 22, 3, 3, 'F');

        const y1 = this.currentY + 8;
        const y2 = this.currentY + 16;
        const col1 = this.marginLeft + 5;
        const col2 = this.marginLeft + 90;

        this.campoLabel('Estudiante:', col1, y1);
        this.campoValor(ev.nombre_estudiante || 'N/A', col1 + 22, y1);

        this.campoLabel('Fecha:', col2, y1);
        this.campoValor(ev.fecha_evaluacion || 'N/A', col2 + 14, y1);

        this.campoLabel('Edad:', col1, y2);
        this.campoValor(`${ev.edad_meses || 0} meses`, col1 + 12, y2);

        this.campoLabel('Rango:', col2, y2);
        this.campoValor(ev.nombre_rango || 'N/A', col2 + 14, y2);

        this.currentY += 26;

        this.campoLabel('Evaluador(a):', col1, this.currentY);
        this.campoValor(ev.nombre_evaluador || 'N/A', col1 + 28, this.currentY);

        this.currentY += 8;
    }

    // ============================
    // RESULTADO GLOBAL
    // ============================
    private generarResultadoGlobal(ev: any): void {
        const resultado = ev.resultado_global || '';
        const color = this.rgb(this.getColor(resultado));
        const bg = this.rgb(this.getBgColor(resultado));

        this.pdf.setFillColor(bg.r, bg.g, bg.b);
        this.pdf.roundedRect(this.marginLeft, this.currentY, this.contentWidth, 12, 3, 3, 'F');

        // Borde izquierdo de color
        this.pdf.setFillColor(color.r, color.g, color.b);
        this.pdf.rect(this.marginLeft, this.currentY, 3, 12, 'F');

        this.pdf.setFontSize(11);
        this.pdf.setFont('helvetica', 'bold');
        this.pdf.setTextColor(color.r, color.g, color.b);
        this.centrarTexto(`Resultado Global: ${this.textoResultado(resultado)}`, this.currentY + 8);

        this.currentY += 16;
    }

    // ============================
    // RESULTADOS POR ÁREA
    // ============================
    private generarResultadosPorArea(ev: any, items: any[]): void {
        this.seccionTitulo('Resultados por Área');

        const colWidth = this.contentWidth / 4;

        this.areas.forEach((area, i) => {
            const x = this.marginLeft + (i * colWidth);
            const resultado = ev['resultado_' + area.toLowerCase()] || '';
            const pd = ev['puntaje_directo_' + area.toLowerCase()] || 0;
            const pt = ev['puntaje_tipico_' + area.toLowerCase()] || 0;
            const areaItems = items.filter(it => it.area === area);
            const cumple = areaItems.filter(it => it.cumple === 1).length;
            const total = areaItems.length;

            const color = this.rgb(this.getColor(resultado));
            const bg = this.rgb(this.getBgColor(resultado));

            // Fondo
            this.pdf.setFillColor(bg.r, bg.g, bg.b);
            this.pdf.roundedRect(x + 1, this.currentY, colWidth - 2, 30, 2, 2, 'F');

            // Borde izquierdo
            this.pdf.setFillColor(color.r, color.g, color.b);
            this.pdf.rect(x + 1, this.currentY, 2, 30, 'F');

            // Nombre
            this.pdf.setFontSize(7.5);
            this.pdf.setFont('helvetica', 'bold');
            this.pdf.setTextColor(color.r, color.g, color.b);
            this.pdf.text(this.areaNombres[area], x + 5, this.currentY + 6);

            // PD → PT
            this.pdf.setFontSize(7);
            this.pdf.setFont('helvetica', 'normal');
            const dg = this.rgb(this.colors.darkGray);
            this.pdf.setTextColor(dg.r, dg.g, dg.b);
            this.pdf.text(`PD: ${pd}  →  PT: ${pt}`, x + 5, this.currentY + 13);

            // Ítems
            this.pdf.text(`${cumple}/${total} ítems`, x + 5, this.currentY + 19);

            // Clasificación
            this.pdf.setFontSize(7.5);
            this.pdf.setFont('helvetica', 'bold');
            this.pdf.setTextColor(color.r, color.g, color.b);
            this.pdf.text(this.textoResultadoCorto(resultado), x + 5, this.currentY + 26);
        });

        this.currentY += 36;
    }

    // ============================
    // GRÁFICOS
    // ============================
    private generarGraficos(datos: DatosEad3PDF): void {
        if (!datos.graficoBarrasBase64 && !datos.graficoRadarBase64) return;

        const halfWidth = (this.contentWidth - 8) / 2;
        // El canvas HTML es aprox 2:1 (ancho:alto), respetar esa proporción
        const ratio = (datos.canvasWidth && datos.canvasHeight)
            ? datos.canvasHeight / datos.canvasWidth
            : 0.55; // fallback ~220/400
        const imgHeight = Math.round(halfWidth * ratio);

        this.verificarEspacio(imgHeight + 8);

        if (datos.graficoBarrasBase64) {
            try {
                this.pdf.addImage(datos.graficoBarrasBase64, 'PNG', this.marginLeft, this.currentY, halfWidth, imgHeight);
            } catch (e) { /* sin gráfico */ }
        }

        if (datos.graficoRadarBase64) {
            try {
                this.pdf.addImage(datos.graficoRadarBase64, 'PNG', this.marginLeft + halfWidth + 8, this.currentY, halfWidth, imgHeight);
            } catch (e) { /* sin gráfico */ }
        }

        this.currentY += imgHeight + 6;
    }

    // ============================
    // TABLA DE ÍTEMS POR ÁREA
    // ============================
    private generarTablaItemsPorArea(ev: any, items: any[]): void {
        this.areas.forEach(area => {
            const areaItems = items.filter(i => i.area === area);
            if (areaItems.length === 0) return;

            this.verificarEspacio(22);

            const resultado = ev['resultado_' + area.toLowerCase()] || '';
            const color = this.rgb(this.getColor(resultado));

            // Título
            this.pdf.setFontSize(9);
            this.pdf.setFont('helvetica', 'bold');
            this.pdf.setTextColor(color.r, color.g, color.b);
            this.pdf.text(`${this.areaNombres[area]} (${area})`, this.marginLeft, this.currentY);
            this.currentY += 5;

            // Encabezado tabla
            const ead3 = this.rgb(this.colors.ead3);
            this.pdf.setFillColor(ead3.r, ead3.g, ead3.b);
            this.pdf.rect(this.marginLeft, this.currentY, this.contentWidth, 6, 'F');

            this.pdf.setFontSize(7);
            this.pdf.setFont('helvetica', 'bold');
            this.pdf.setTextColor(255, 255, 255);
            this.pdf.text('#', this.marginLeft + 2, this.currentY + 4.5);
            this.pdf.text('Descripción del ítem', this.marginLeft + 10, this.currentY + 4.5);
            this.pdf.text('Resultado', this.marginLeft + this.contentWidth - 22, this.currentY + 4.5);
            this.currentY += 6;

            // Filas
            const bgAlt = this.rgb(this.colors.lightGray);

            areaItems.forEach((item, idx) => {
                this.verificarEspacio(6);

                if (idx % 2 === 0) {
                    this.pdf.setFillColor(bgAlt.r, bgAlt.g, bgAlt.b);
                    this.pdf.rect(this.marginLeft, this.currentY, this.contentWidth, 6, 'F');
                }

                const blackRgb = this.rgb(this.colors.black);
                this.pdf.setFontSize(6.5);
                this.pdf.setFont('helvetica', 'normal');
                this.pdf.setTextColor(blackRgb.r, blackRgb.g, blackRgb.b);
                this.pdf.text(String(item.numero_item || idx + 1), this.marginLeft + 2, this.currentY + 4.5);

                const desc = this.truncar(item.descripcion_item || item.descripcion || '-', 100);
                this.pdf.text(desc, this.marginLeft + 10, this.currentY + 4.5);

                const cumple = item.cumple === 1;
                const resColor = this.rgb(cumple ? this.colors.green : this.colors.red);
                this.pdf.setTextColor(resColor.r, resColor.g, resColor.b);
                this.pdf.setFont('helvetica', 'bold');
                this.pdf.text(cumple ? 'Cumple' : 'No cumple', this.marginLeft + this.contentWidth - 22, this.currentY + 4.5);

                this.currentY += 6;
            });

            this.currentY += 5;
        });
    }

    // ============================
    // OBSERVACIONES (condicional)
    // ============================
    private generarObservaciones(ev: any): void {
        const texto = this.limpiarHtml(ev.observaciones);
        if (!texto) return;

        this.verificarEspacio(18);
        this.seccionTitulo('Observaciones');

        this.pdf.setFontSize(8);
        this.pdf.setFont('helvetica', 'normal');
        const dg = this.rgb(this.colors.darkGray);
        this.pdf.setTextColor(dg.r, dg.g, dg.b);

        const lineas = this.pdf.splitTextToSize(texto, this.contentWidth - 6);
        lineas.forEach((linea: string) => {
            this.verificarEspacio(5);
            this.pdf.text(linea, this.marginLeft + 3, this.currentY);
            this.currentY += 4.2;
        });

        this.currentY += 4;
    }

    // ============================
    // ANÁLISIS (condicional)
    // ============================
    private generarAnalisis(ev: any): void {
        const analisisTexto = this.limpiarHtml(ev.analisis);
        const recomTexto = this.limpiarHtml(ev.recomendaciones);

        if (!analisisTexto && !recomTexto) return;

        this.verificarEspacio(18);
        this.seccionTitulo('Análisis Profesional');

        const dg = this.rgb(this.colors.darkGray);

        if (analisisTexto) {
            this.pdf.setFontSize(8);
            this.pdf.setFont('helvetica', 'bold');
            this.pdf.setTextColor(dg.r, dg.g, dg.b);
            this.pdf.text('Análisis:', this.marginLeft + 3, this.currentY);
            this.currentY += 4;

            this.pdf.setFont('helvetica', 'normal');
            const lineas = this.pdf.splitTextToSize(analisisTexto, this.contentWidth - 6);
            lineas.forEach((l: string) => {
                this.verificarEspacio(5);
                this.pdf.text(l, this.marginLeft + 3, this.currentY);
                this.currentY += 4.2;
            });
            this.currentY += 3;
        }

        if (recomTexto) {
            this.pdf.setFontSize(8);
            this.pdf.setFont('helvetica', 'bold');
            this.pdf.setTextColor(dg.r, dg.g, dg.b);
            this.pdf.text('Recomendaciones:', this.marginLeft + 3, this.currentY);
            this.currentY += 4;

            this.pdf.setFont('helvetica', 'normal');
            const lineas = this.pdf.splitTextToSize(recomTexto, this.contentWidth - 6);
            lineas.forEach((l: string) => {
                this.verificarEspacio(5);
                this.pdf.text(l, this.marginLeft + 3, this.currentY);
                this.currentY += 4.2;
            });
            this.currentY += 3;
        }

        if (ev.nombre_analista) {
            this.verificarEspacio(6);
            this.pdf.setFontSize(7);
            this.pdf.setFont('helvetica', 'italic');
            const mg = this.rgb(this.colors.medGray);
            this.pdf.setTextColor(mg.r, mg.g, mg.b);
            this.pdf.text(
                `Analista: ${ev.nombre_analista}${ev.fecha_analisis ? ' — ' + ev.fecha_analisis : ''}`,
                this.marginLeft + 3, this.currentY
            );
            this.currentY += 6;
        }
    }

    // ============================
    // CÓMO LEER ESTE INFORME
    // ============================
    private generarComoLeer(): void {
        this.verificarEspacio(50);

        this.seccionTitulo('¿Cómo leer este informe?');

        const dg = this.rgb(this.colors.darkGray);
        const bk = this.rgb(this.colors.black);

        const items = [
            {
                titulo: 'PD (Puntaje Directo):',
                texto: 'Número de ítems que el niño(a) logra realizar correctamente en cada área.'
            },
            {
                titulo: 'PT (Puntaje Típico):',
                texto: 'Puntaje normalizado según la edad. Permite comparar el desempeño del niño(a) con otros de la misma edad.'
            },
            {
                titulo: 'Clasificación por semáforo:',
                texto: 'Verde = Desarrollo esperado para la edad. Amarillo = Riesgo, requiere seguimiento. Rojo = Sospecha de problemas, requiere valoración profesional.'
            },
            {
                titulo: 'Nota:',
                texto: 'Un niño(a) puede cumplir la mayoría de ítems y obtener un PT bajo si esos ítems corresponden a rangos de edad inferiores. El PT evalúa el nivel de desarrollo esperado para la edad, no solo la cantidad de logros.'
            }
        ];

        items.forEach(item => {
            this.verificarEspacio(12);

            this.pdf.setFontSize(7.5);
            this.pdf.setFont('helvetica', 'bold');
            this.pdf.setTextColor(bk.r, bk.g, bk.b);
            this.pdf.text(item.titulo, this.marginLeft + 3, this.currentY);
            this.currentY += 4;

            this.pdf.setFont('helvetica', 'normal');
            this.pdf.setTextColor(dg.r, dg.g, dg.b);
            const lineas = this.pdf.splitTextToSize(item.texto, this.contentWidth - 8);
            lineas.forEach((l: string) => {
                this.verificarEspacio(4);
                this.pdf.text(l, this.marginLeft + 5, this.currentY);
                this.currentY += 3.8;
            });

            this.currentY += 2;
        });
    }

    // ============================
    // PIE DE PÁGINA
    // ============================
    private dibujarPiePagina(pagina: number): void {
        const gray = this.rgb(this.colors.medGray);
        const ead3 = this.rgb(this.colors.ead3);

        // Línea
        this.pdf.setDrawColor(ead3.r, ead3.g, ead3.b);
        this.pdf.setLineWidth(0.3);
        this.pdf.line(this.marginLeft, this.pageHeight - 14, this.pageWidth - this.marginRight, this.pageHeight - 14);

        this.pdf.setFontSize(7);
        this.pdf.setFont('helvetica', 'normal');
        this.pdf.setTextColor(gray.r, gray.g, gray.b);

        const fecha = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });
        this.pdf.text(`Generado: ${fecha}`, this.marginLeft, this.pageHeight - 10);
        this.pdf.text(`Página ${pagina} de ${this.totalPages}`, this.pageWidth - this.marginRight, this.pageHeight - 10, { align: 'right' });
    }

    // ============================
    // UTILIDADES
    // ============================
    private verificarEspacio(necesario: number): void {
        if (this.currentY + necesario > this.pageHeight - 20) {
            this.pdf.addPage();
            this.currentY = 18;
            this.pageNumber++;
        }
    }

    private seccionTitulo(titulo: string): void {
        const bk = this.rgb(this.colors.black);
        this.pdf.setFontSize(10);
        this.pdf.setFont('helvetica', 'bold');
        this.pdf.setTextColor(bk.r, bk.g, bk.b);
        this.pdf.text(titulo, this.marginLeft, this.currentY);
        this.currentY += 5;
    }

    private campoLabel(texto: string, x: number, y: number): void {
        const mg = this.rgb(this.colors.medGray);
        this.pdf.setFontSize(7.5);
        this.pdf.setFont('helvetica', 'normal');
        this.pdf.setTextColor(mg.r, mg.g, mg.b);
        this.pdf.text(texto, x, y);
    }

    private campoValor(texto: string, x: number, y: number): void {
        const bk = this.rgb(this.colors.black);
        this.pdf.setFontSize(8);
        this.pdf.setFont('helvetica', 'bold');
        this.pdf.setTextColor(bk.r, bk.g, bk.b);
        this.pdf.text(texto, x, y);
    }

    private centrarTexto(texto: string, y: number): void {
        const x = (this.pageWidth - this.pdf.getTextWidth(texto)) / 2;
        this.pdf.text(texto, x, y);
    }

    private getColor(resultado: string): string {
        return { 'verde': this.colors.green, 'amarillo': this.colors.orange, 'rojo': this.colors.red }[resultado] || this.colors.medGray;
    }

    private getBgColor(resultado: string): string {
        return { 'verde': this.colors.greenBg, 'amarillo': this.colors.orangeBg, 'rojo': this.colors.redBg }[resultado] || this.colors.lightGray;
    }

    private textoResultado(resultado: string): string {
        return { 'verde': 'Desarrollo esperado', 'amarillo': 'Riesgo de problemas', 'rojo': 'Sospecha de problemas' }[resultado] || 'Sin evaluar';
    }

    private textoResultadoCorto(resultado: string): string {
        return { 'verde': 'Esperado', 'amarillo': 'Riesgo', 'rojo': 'Sospecha' }[resultado] || '';
    }

    private limpiarHtml(html: string): string {
        if (!html) return '';
        const limpio = html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
        return limpio;
    }

    private truncar(texto: string, max: number): string {
        if (!texto) return '-';
        return texto.length > max ? texto.substring(0, max - 3) + '...' : texto;
    }

    private rgb(hex: string): { r: number; g: number; b: number } {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 0, g: 0, b: 0 };
    }
}