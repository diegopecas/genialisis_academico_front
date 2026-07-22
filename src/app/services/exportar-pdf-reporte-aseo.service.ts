import { Injectable } from '@angular/core';
import { InstitucionConfigService } from './institucion-config.service';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * PDF del reporte de aseo de un rango de fechas y un proceso.
 * - Encabezado con logo, institución, periodo y agrupación.
 * - Bloque de productos utilizados (con modo de uso, sin cantidades).
 * - Una tabla. Por Área: columnas Área/Fecha/Horario/... Por Fecha: la fecha va
 *   como fila-título de sección y las filas de abajo solo llevan el Área.
 */
@Injectable({
    providedIn: 'root'
})
export class ExportarPdfReporteAseoService {

    private readonly AMBAR: [number, number, number] = [201, 138, 0];
    private readonly GRIS_HEAD: [number, number, number] = [245, 243, 238];
    private readonly GRIS_GRUPO: [number, number, number] = [237, 231, 218];
    private readonly TINTA: [number, number, number] = [42, 38, 32];
    private readonly LINEA: [number, number, number] = [214, 205, 185];

    constructor(private institucionConfigService: InstitucionConfigService) { }

    /**
     * datos: { proceso, fechaDesde, fechaHasta, logoBase64, agruparPor, productosUsados, filas }
     */
    generarPDF(datos: any) {
        const doc = new jsPDF('l', 'mm', 'letter');
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margen = 12;

        doc.setFont('helvetica');

        // ---- Encabezado ----
        if (datos.logoBase64) {
            try {
                doc.addImage(datos.logoBase64, 'PNG', margen, 10, 22, 22);
            } catch (error) {
                console.error('Error agregando logo:', error);
            }
        }

        const titleX = datos.logoBase64 ? margen + 28 : pageWidth / 2;
        const titleAlign: any = datos.logoBase64 ? 'left' : 'center';

        doc.setTextColor(this.TINTA[0], this.TINTA[1], this.TINTA[2]);
        doc.setFontSize(15);
        doc.setFont('helvetica', 'bold');
        doc.text(`REGISTRO DE ${(datos.proceso || '').toUpperCase()}`, titleX, 17, { align: titleAlign });

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(this.institucionConfigService.getNombreInstitucion(), titleX, 23, { align: titleAlign });
        doc.text(`NIT: ${this.institucionConfigService.getNitInstitucion()}`, titleX, 28, { align: titleAlign });

        doc.setFontSize(8.5);
        doc.text(
            `Periodo: ${this.formatearFecha(datos.fechaDesde)} a ${this.formatearFecha(datos.fechaHasta)}`,
            pageWidth - margen, 17, { align: 'right' }
        );
        doc.text(`Agrupado por: ${datos.agruparPor === 'area' ? 'Área' : 'Fecha'}`,
            pageWidth - margen, 23, { align: 'right' });

        doc.setDrawColor(this.AMBAR[0], this.AMBAR[1], this.AMBAR[2]);
        doc.setLineWidth(0.6);
        doc.line(margen, 34, pageWidth - margen, 34);

        let cursorY = 40;

        // ---- Productos utilizados (modo de uso en letra chica, sin cantidades) ----
        const productos = datos.productosUsados || [];
        if (productos.length > 0) {
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(this.TINTA[0], this.TINTA[1], this.TINTA[2]);
            doc.text('Productos utilizados', margen, cursorY);
            cursorY += 5;

            const anchoUtil = pageWidth - margen * 2;
            productos.forEach((prod: any) => {
                // Nombre del producto
                doc.setFontSize(8);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(this.TINTA[0], this.TINTA[1], this.TINTA[2]);
                doc.text(`\u2022 ${prod.producto}`, margen, cursorY);
                cursorY += 3.6;

                // Modo de uso: debajo del nombre, indentado, en gris y chico
                if (prod.modo_uso) {
                    doc.setFontSize(6.5);
                    doc.setFont('helvetica', 'normal');
                    doc.setTextColor(120, 115, 105);
                    const modo = doc.splitTextToSize(prod.modo_uso, anchoUtil - 6);
                    doc.text(modo, margen + 4, cursorY);
                    doc.setTextColor(this.TINTA[0], this.TINTA[1], this.TINTA[2]);
                    cursorY += modo.length * 2.8 + 1.5;
                } else {
                    cursorY += 1;
                }
            });

            cursorY += 3;
        }

        // ---- Tabla ----
        const porArea = datos.agruparPor === 'area';
        const filas = datos.filas || [];

        if (porArea) {
            // Área como bloque (1a col), luego Fecha, Horario y el resto. Sin Consumo ni Estado.
            const claveDe = (f: any) => f.area;
            const body = filas.map((f: any) => [
                f.area,
                this.formatearFecha(f.fecha),
                f.horario,
                f.mobiliario,
                f.ejecutor || '\u2014',
                f.supervisor || '\u2014'
            ]);

            autoTable(doc, {
                startY: cursorY,
                head: [['Área', 'Fecha', 'Horario', 'Mobiliario aseado', 'Ejecutó', 'Supervisó']],
                body: body,
                theme: 'grid',
                headStyles: {
                    fillColor: this.GRIS_HEAD, textColor: this.TINTA, fontStyle: 'bold',
                    fontSize: 8, lineColor: this.LINEA, lineWidth: 0.1
                },
                bodyStyles: { fontSize: 7.5, textColor: this.TINTA, lineColor: this.LINEA, lineWidth: 0.1 },
                alternateRowStyles: { fillColor: [250, 249, 246] },
                // Anchos que caben en letter horizontal (util ~ 255mm)
                columnStyles: {
                    0: { cellWidth: 42 },
                    1: { cellWidth: 24, halign: 'center' },
                    2: { cellWidth: 26, halign: 'center' },
                    3: { cellWidth: 73 },
                    4: { cellWidth: 45 },
                    5: { cellWidth: 45 }
                },
                margin: { left: margen, right: margen },
                didParseCell: (data: any) => {
                    if (data.section === 'body' && data.column.index === 0) {
                        const actual = data.row.index;
                        const val = claveDe(filas[actual]);
                        const prev = actual > 0 ? claveDe(filas[actual - 1]) : null;
                        if (val === prev) {
                            data.cell.text = [''];
                        } else {
                            data.cell.styles.fontStyle = 'bold';
                        }
                    }
                }
            });
        } else {
            // Por Fecha: la fecha+horario van como fila-título de sección; las filas
            // de datos solo llevan Área, Mobiliario, Ejecutó, Supervisó.
            const body: any[] = [];
            let claveActual: string | null = null;

            filas.forEach((f: any) => {
                const clave = f.fecha + '|' + (f.horario || '');
                if (clave !== claveActual) {
                    claveActual = clave;
                    // Fila-título de sección: ocupa toda la fila (colSpan)
                    body.push([{
                        content: `${this.formatearFecha(f.fecha)}   \u00b7   ${f.horario || ''}`,
                        colSpan: 4,
                        styles: {
                            fillColor: this.GRIS_GRUPO,
                            textColor: this.TINTA,
                            fontStyle: 'bold',
                            fontSize: 8.5
                        }
                    }]);
                }
                body.push([
                    f.area,
                    f.mobiliario,
                    f.ejecutor || '\u2014',
                    f.supervisor || '\u2014'
                ]);
            });

            autoTable(doc, {
                startY: cursorY,
                head: [['Área', 'Mobiliario aseado', 'Ejecutó', 'Supervisó']],
                body: body,
                theme: 'grid',
                headStyles: {
                    fillColor: this.GRIS_HEAD, textColor: this.TINTA, fontStyle: 'bold',
                    fontSize: 8, lineColor: this.LINEA, lineWidth: 0.1
                },
                bodyStyles: { fontSize: 7.5, textColor: this.TINTA, lineColor: this.LINEA, lineWidth: 0.1 },
                columnStyles: {
                    0: { cellWidth: 55 },
                    1: { cellWidth: 95 },
                    2: { cellWidth: 52 },
                    3: { cellWidth: 53 }
                },
                margin: { left: margen, right: margen }
            });
        }

        // ---- Pie ----
        const totalPaginas = (doc as any).internal.getNumberOfPages();
        for (let i = 1; i <= totalPaginas; i++) {
            doc.setPage(i);
            doc.setFontSize(7.5);
            doc.setFont('helvetica', 'italic');
            doc.setTextColor(120, 115, 105);
            doc.text(
                `Generado el ${new Date().toLocaleDateString('es-CO')} \u2014 Página ${i} de ${totalPaginas}`,
                pageWidth / 2, pageHeight - 7, { align: 'center' }
            );
        }

        const nombreArchivo = `Reporte_${(datos.proceso || 'Aseo').replace(/\s+/g, '_')}_${this.formatearFechaArchivo(new Date())}.pdf`;
        doc.save(nombreArchivo);
    }

    private formatearFecha(fecha: string): string {
        if (!fecha || fecha === '0000-00-00') return '--/--/----';
        try {
            const date = new Date(fecha + 'T00:00:00');
            if (isNaN(date.getTime())) return fecha;
            return date.toLocaleDateString('es-CO', { year: 'numeric', month: '2-digit', day: '2-digit' });
        } catch {
            return fecha;
        }
    }

    private formatearFechaArchivo(fecha: Date): string {
        const year = fecha.getFullYear();
        const month = String(fecha.getMonth() + 1).padStart(2, '0');
        const day = String(fecha.getDate()).padStart(2, '0');
        return `${year}${month}${day}`;
    }
}