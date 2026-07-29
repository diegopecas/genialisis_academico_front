import { Injectable } from '@angular/core';
import { jsPDF } from 'jspdf';

export interface DatosPerfilDesarrolloPDF {
    aplicacion: any;
    esferas: any[];
    detalleItems: any[];
    logoBase64?: string;
    nombreInstitucion: string;
    nitInstitucion: string;
    resolucion?: string;
    graficoBarrasBase64?: string;
    canvasWidth?: number;
    canvasHeight?: number;
}

@Injectable({
    providedIn: 'root'
})
export class ExportarPdfPerfilDesarrolloService {
    private pdf!: jsPDF;
    private pageWidth = 210;
    private pageHeight = 297;
    private marginLeft = 18;
    private marginRight = 18;
    private contentWidth = 210 - 18 - 18;
    private currentY = 18;

    private colors = {
        principal: '#1565C0',
        principalOscuro: '#0D47A1',
        negro: '#222222',
        grisOscuro: '#555555',
        grisMedio: '#888888',
        grisClaro: '#f5f5f5',
        borde: '#e0e0e0',
        verde: '#4CAF50',
        naranja: '#FF9800',
        rojo: '#F44336'
    };

    generarPDF(datos: DatosPerfilDesarrolloPDF): void {
        this.pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
        this.currentY = 18;
        this.pdf.setFont('helvetica', 'normal');

        this.dibujarEncabezado(datos);
        this.dibujarDatosEstudiante(datos);
        this.dibujarResultadoGlobal(datos);
        this.dibujarEsferas(datos);
        this.dibujarGrafico(datos);
        this.dibujarTextos(datos);
        this.dibujarNotaInterpretacion();
        this.dibujarPie(datos);

        const nombre = (datos.aplicacion.nombre_estudiante || 'estudiante').replace(/\s+/g, '_');
        const fecha = datos.aplicacion.fecha_aplicacion || '';
        this.pdf.save(`PerfilDesarrollo_${nombre}_${fecha}.pdf`);
    }

    private verificarEspacio(alto: number): void {
        if (this.currentY + alto > this.pageHeight - 25) {
            this.pdf.addPage();
            this.currentY = 18;
        }
    }

    private dibujarEncabezado(datos: DatosPerfilDesarrolloPDF): void {
        this.pdf.setFillColor(this.colors.grisClaro);
        this.pdf.roundedRect(this.marginLeft, this.currentY, this.contentWidth, 26, 2, 2, 'F');

        if (datos.logoBase64) {
            try {
                this.pdf.addImage(datos.logoBase64, 'PNG', this.marginLeft + 4, this.currentY + 3, 20, 20);
            } catch {
                // Si el logo no se puede incrustar el informe sigue saliendo sin el.
            }
        }

        this.pdf.setTextColor(this.colors.negro);
        this.pdf.setFontSize(12);
        this.pdf.setFont('helvetica', 'bold');
        this.pdf.text(datos.nombreInstitucion || '', this.marginLeft + 28, this.currentY + 9);

        this.pdf.setFontSize(8);
        this.pdf.setFont('helvetica', 'normal');
        this.pdf.setTextColor(this.colors.grisOscuro);

        let linea = this.currentY + 14;
        if (datos.nitInstitucion) {
            this.pdf.text(`NIT ${datos.nitInstitucion}`, this.marginLeft + 28, linea);
            linea += 4;
        }
        if (datos.resolucion) {
            this.pdf.text(datos.resolucion, this.marginLeft + 28, linea);
        }

        this.currentY += 30;

        this.pdf.setFontSize(13);
        this.pdf.setFont('helvetica', 'bold');
        this.pdf.setTextColor(this.colors.principalOscuro);
        this.pdf.text('Perfil de Desarrollo por Edades', this.marginLeft, this.currentY);
        this.currentY += 5;

        this.pdf.setFontSize(8);
        this.pdf.setFont('helvetica', 'normal');
        this.pdf.setTextColor(this.colors.grisMedio);
        this.pdf.text('Tamizaje pedagogico por esferas de desarrollo', this.marginLeft, this.currentY);
        this.currentY += 8;
    }

    private dibujarDatosEstudiante(datos: DatosPerfilDesarrolloPDF): void {
        const aplicacion = datos.aplicacion;

        this.pdf.setDrawColor(this.colors.borde);
        this.pdf.setFillColor('#FFFFFF');
        this.pdf.roundedRect(this.marginLeft, this.currentY, this.contentWidth, 20, 2, 2, 'FD');

        this.pdf.setFontSize(9);
        this.pdf.setFont('helvetica', 'bold');
        this.pdf.setTextColor(this.colors.negro);
        this.pdf.text(aplicacion.nombre_estudiante || '', this.marginLeft + 4, this.currentY + 7);

        this.pdf.setFontSize(8);
        this.pdf.setFont('helvetica', 'normal');
        this.pdf.setTextColor(this.colors.grisOscuro);
        this.pdf.text(`Fecha: ${aplicacion.fecha_aplicacion || ''}`, this.marginLeft + 4, this.currentY + 14);
        this.pdf.text(`Edad: ${aplicacion.edad_meses} meses`, this.marginLeft + 60, this.currentY + 14);
        this.pdf.text(`Inicio: ${aplicacion.nombre_rango_inicio || ''}`, this.marginLeft + 105, this.currentY + 14);

        this.currentY += 26;
    }

    private dibujarResultadoGlobal(datos: DatosPerfilDesarrolloPDF): void {
        const aplicacion = datos.aplicacion;
        const indice = aplicacion.indice_global !== null ? Math.round(Number(aplicacion.indice_global)) : null;
        const edadDesarrollo = aplicacion.edad_desarrollo_promedio !== null ? Math.round(Number(aplicacion.edad_desarrollo_promedio)) : null;

        this.pdf.setFillColor(this.colorPorIndice(indice));
        this.pdf.roundedRect(this.marginLeft, this.currentY, this.contentWidth, 18, 2, 2, 'F');

        this.pdf.setTextColor('#FFFFFF');
        this.pdf.setFontSize(9);
        this.pdf.setFont('helvetica', 'normal');
        this.pdf.text('Indice global de desarrollo', this.marginLeft + 5, this.currentY + 7);

        this.pdf.setFontSize(14);
        this.pdf.setFont('helvetica', 'bold');
        this.pdf.text(indice !== null ? `${indice}` : '-', this.marginLeft + 5, this.currentY + 14);

        this.pdf.setFontSize(8);
        this.pdf.setFont('helvetica', 'normal');
        const detalle = `Rinde como un nino de ${edadDesarrollo !== null ? edadDesarrollo : '-'} meses y tiene ${aplicacion.edad_meses} meses`;
        this.pdf.text(detalle, this.marginLeft + 35, this.currentY + 12);

        this.currentY += 24;
    }

    private dibujarEsferas(datos: DatosPerfilDesarrolloPDF): void {
        this.verificarEspacio(20);

        this.pdf.setFontSize(10);
        this.pdf.setFont('helvetica', 'bold');
        this.pdf.setTextColor(this.colors.principalOscuro);
        this.pdf.text('Resultado por esfera', this.marginLeft, this.currentY);
        this.currentY += 6;

        this.pdf.setFillColor(this.colors.grisClaro);
        this.pdf.rect(this.marginLeft, this.currentY, this.contentWidth, 7, 'F');

        this.pdf.setFontSize(8);
        this.pdf.setFont('helvetica', 'bold');
        this.pdf.setTextColor(this.colors.grisOscuro);
        this.pdf.text('Esfera', this.marginLeft + 3, this.currentY + 5);
        this.pdf.text('Hasta', this.marginLeft + 75, this.currentY + 5);
        this.pdf.text('Edad desarrollo', this.marginLeft + 105, this.currentY + 5);
        this.pdf.text('Indice', this.marginLeft + 150, this.currentY + 5);
        this.currentY += 7;

        this.pdf.setFont('helvetica', 'normal');

        datos.esferas.forEach(esfera => {
            this.verificarEspacio(8);

            const indice = Math.round(Number(esfera.indice));
            const edadDesarrollo = Math.round(Number(esfera.edad_desarrollo_meses));

            this.pdf.setDrawColor(this.colors.borde);
            this.pdf.line(this.marginLeft, this.currentY + 6.5, this.marginLeft + this.contentWidth, this.currentY + 6.5);

            this.pdf.setTextColor(this.colors.negro);
            this.pdf.setFontSize(8);
            this.pdf.text(esfera.nombre_esfera || '', this.marginLeft + 3, this.currentY + 5);
            this.pdf.setTextColor(this.colors.grisOscuro);
            this.pdf.text(esfera.nombre_rango_techo || '-', this.marginLeft + 75, this.currentY + 5);
            this.pdf.text(`${edadDesarrollo} meses`, this.marginLeft + 105, this.currentY + 5);

            this.pdf.setFillColor(this.colorPorIndice(indice));
            this.pdf.roundedRect(this.marginLeft + 148, this.currentY + 1, 16, 5.5, 1, 1, 'F');
            this.pdf.setTextColor('#FFFFFF');
            this.pdf.setFont('helvetica', 'bold');
            this.pdf.text(`${indice}`, this.marginLeft + 153, this.currentY + 5);
            this.pdf.setFont('helvetica', 'normal');

            this.currentY += 8;
        });

        this.currentY += 4;

        if (datos.aplicacion.nombre_esfera_mas_baja) {
            this.verificarEspacio(12);
            this.pdf.setFillColor('#FFF8E1');
            this.pdf.roundedRect(this.marginLeft, this.currentY, this.contentWidth, 10, 2, 2, 'F');
            this.pdf.setFontSize(8);
            this.pdf.setTextColor('#8D6E63');
            this.pdf.text(
                `Esfera rezagada frente al promedio: ${datos.aplicacion.nombre_esfera_mas_baja}`,
                this.marginLeft + 4, this.currentY + 6.5
            );
            this.currentY += 15;
        }
    }

    private dibujarGrafico(datos: DatosPerfilDesarrolloPDF): void {
        if (!datos.graficoBarrasBase64) { return; }

        const alto = 60;
        this.verificarEspacio(alto + 8);

        try {
            this.pdf.addImage(datos.graficoBarrasBase64, 'PNG', this.marginLeft, this.currentY, this.contentWidth, alto);
            this.currentY += alto + 8;
        } catch {
            // El informe sigue saliendo aunque el grafico no se pueda incrustar.
        }
    }

    private dibujarTextos(datos: DatosPerfilDesarrolloPDF): void {
        const aplicacion = datos.aplicacion;

        const bloques = [
            { titulo: 'Observaciones', texto: aplicacion.observaciones },
            { titulo: 'Analisis', texto: this.limpiarHtml(aplicacion.analisis) },
            { titulo: 'Recomendaciones', texto: this.limpiarHtml(aplicacion.recomendaciones) }
        ];

        bloques.forEach(bloque => {
            if (!bloque.texto || bloque.texto.trim() === '') { return; }

            this.verificarEspacio(20);

            this.pdf.setFontSize(10);
            this.pdf.setFont('helvetica', 'bold');
            this.pdf.setTextColor(this.colors.principalOscuro);
            this.pdf.text(bloque.titulo, this.marginLeft, this.currentY);
            this.currentY += 5;

            this.pdf.setFontSize(8.5);
            this.pdf.setFont('helvetica', 'normal');
            this.pdf.setTextColor(this.colors.negro);

            const lineas = this.pdf.splitTextToSize(bloque.texto, this.contentWidth);
            lineas.forEach((linea: string) => {
                this.verificarEspacio(6);
                this.pdf.text(linea, this.marginLeft, this.currentY);
                this.currentY += 4.5;
            });

            this.currentY += 4;
        });
    }

    private dibujarNotaInterpretacion(): void {
        this.verificarEspacio(30);

        this.pdf.setFillColor(this.colors.grisClaro);
        this.pdf.roundedRect(this.marginLeft, this.currentY, this.contentWidth, 26, 2, 2, 'F');

        this.pdf.setFontSize(8.5);
        this.pdf.setFont('helvetica', 'bold');
        this.pdf.setTextColor(this.colors.grisOscuro);
        this.pdf.text('Como leer este informe', this.marginLeft + 4, this.currentY + 6);

        this.pdf.setFontSize(7.5);
        this.pdf.setFont('helvetica', 'normal');

        const nota = 'El indice compara la edad de desarrollo alcanzada con la edad real del nino: 100 significa que rinde ' +
            'lo esperado para su edad. Es un tamizaje pedagogico de apoyo al seguimiento en el aula, no una medida de ' +
            'inteligencia ni un diagnostico. Ante diferencias amplias conviene la valoracion de un profesional.';

        const lineas = this.pdf.splitTextToSize(nota, this.contentWidth - 8);
        let y = this.currentY + 11;
        lineas.forEach((linea: string) => {
            this.pdf.text(linea, this.marginLeft + 4, y);
            y += 4;
        });

        this.currentY += 32;
    }

    private dibujarPie(datos: DatosPerfilDesarrolloPDF): void {
        const totalPaginas = this.pdf.getNumberOfPages();

        for (let i = 1; i <= totalPaginas; i++) {
            this.pdf.setPage(i);
            this.pdf.setFontSize(7);
            this.pdf.setTextColor(this.colors.grisMedio);
            this.pdf.text(datos.nombreInstitucion || '', this.marginLeft, this.pageHeight - 12);
            this.pdf.text(
                `Pagina ${i} de ${totalPaginas}`,
                this.pageWidth - this.marginRight,
                this.pageHeight - 12,
                { align: 'right' }
            );
        }
    }

    private colorPorIndice(indice: number | null): string {
        if (indice === null) { return this.colors.grisMedio; }
        if (indice >= 95) { return this.colors.verde; }
        if (indice >= 80) { return this.colors.naranja; }
        return this.colors.rojo;
    }

    private limpiarHtml(html: string): string {
        if (!html) { return ''; }
        return html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
    }
}
