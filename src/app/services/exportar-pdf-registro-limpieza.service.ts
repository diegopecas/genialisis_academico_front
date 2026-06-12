import { Injectable } from '@angular/core';
import { InstitucionConfigService } from './institucion-config.service';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

@Injectable({
    providedIn: 'root'
})
export class ExportarPdfRegistroLimpiezaService {

    constructor(private institucionConfigService: InstitucionConfigService) { }

    generarPDF(datos: any) {
        const doc = new jsPDF('p', 'mm', 'letter');
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        let yPosition = 20;

        // Configurar fuentes
        doc.setFont('helvetica');

        // Agregar logo si existe
        if (datos.logoBase64) {
            try {
                doc.addImage(datos.logoBase64, 'PNG', 15, 10, 30, 30);
            } catch (error) {
                console.error('Error agregando logo:', error);
            }
        }

        // AJUSTE: Mover el título más a la derecha para separarlo del logo
        // Si hay logo, empezar el título desde x=55, si no hay logo, centrar normalmente
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');

        if (datos.logoBase64) {
            // Con logo: posicionar el texto dejando espacio después del logo
            yPosition = 15; // Alinear verticalmente con el centro del logo
            doc.text('REGISTRO DE LIMPIEZA Y DESINFECCIÓN', 55, yPosition);

            yPosition += 8;
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            const nombreInstitucion = this.institucionConfigService.getNombreInstitucion();
    const nitInstitucion = this.institucionConfigService.getNitInstitucion();
    
    doc.text(nombreInstitucion, 55, yPosition);

            yPosition += 5;
            doc.text(`NIT: ${nitInstitucion}`, 55, yPosition);

            yPosition = 45; // Reposicionar después del logo
        } else {
            // Sin logo: centrar todo
            doc.text('REGISTRO DE LIMPIEZA Y DESINFECCIÓN', pageWidth / 2, yPosition, { align: 'center' });

            yPosition += 8;
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            const nombreInst = this.institucionConfigService.getNombreInstitucion();
            doc.text(nombreInst, pageWidth / 2, yPosition, { align: 'center' });

            yPosition += 5;
            const nitInst = this.institucionConfigService.getNitInstitucion();
            doc.text(`NIT: ${nitInst}`, pageWidth / 2, yPosition, { align: 'center' });

            yPosition += 15;
        }

        // Información del registro
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('INFORMACIÓN DEL REGISTRO', 15, yPosition);

        yPosition += 8;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');

        // Datos generales en dos columnas
        const col1X = 15;
        const col2X = pageWidth / 2 + 10;
        let tempY = yPosition;

        // Columna 1
        doc.setFont('helvetica', 'bold');
        doc.text('Registro #:', col1X, tempY);
        doc.setFont('helvetica', 'normal');
        doc.text(datos.registro.id.toString(), col1X + 25, tempY);

        tempY += 6;
        doc.setFont('helvetica', 'bold');
        doc.text('Área Física:', col1X, tempY);
        doc.setFont('helvetica', 'normal');
        doc.text(datos.registro.nombre_area || datos.nombreArea || '', col1X + 25, tempY);

        tempY += 6;
        doc.setFont('helvetica', 'bold');
        doc.text('Proceso:', col1X, tempY);
        doc.setFont('helvetica', 'normal');
        doc.text(datos.registro.nombre_proceso || datos.nombreProceso || '', col1X + 25, tempY);

        // Columna 2
        tempY = yPosition;
        doc.setFont('helvetica', 'bold');
        doc.text('Fecha Programada:', col2X, tempY);
        doc.setFont('helvetica', 'normal');
        doc.text(this.formatearFecha(datos.registro.fecha_programada), col2X + 35, tempY);

        tempY += 6;
        doc.setFont('helvetica', 'bold');
        doc.text('Fecha Ejecución:', col2X, tempY);
        doc.setFont('helvetica', 'normal');
        doc.text(this.formatearFecha(datos.registro.fecha || datos.fechaReal), col2X + 35, tempY);

        tempY += 6;
        doc.setFont('helvetica', 'bold');
        doc.text('Horario:', col2X, tempY);
        doc.setFont('helvetica', 'normal');
        const horaInicio = datos.registro.hora_inicio || datos.horaInicio || '--:--';
        const horaFin = datos.registro.hora_fin || datos.horaFin || '--:--';
        const horario = `${horaInicio} a ${horaFin}`;
        doc.text(horario, col2X + 35, tempY);

        yPosition = tempY + 12;

        // Estado del registro
        doc.setFont('helvetica', 'bold');
        doc.text('Estado:', col1X, yPosition);
        doc.setFont('helvetica', 'normal');
        const estadoTexto = datos.registro.nombre_estado || datos.nombreEstado ||
            (datos.estadoActual === 3 ? 'Realizado' :
                datos.estadoActual === 4 ? 'Supervisado' : 'En proceso');
        doc.text(estadoTexto, col1X + 25, yPosition);

        yPosition += 12;

        // Línea separadora
        doc.setLineWidth(0.5);
        doc.line(15, yPosition, pageWidth - 15, yPosition);
        yPosition += 8;

        // ELEMENTOS FÍSICOS LIMPIADOS
        if (datos.elementosFisicos && datos.elementosFisicos.length > 0) {
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text('ELEMENTOS FÍSICOS LIMPIADOS', 15, yPosition);
            yPosition += 8;

            const elementosData = datos.elementosFisicos.map((elem: any, index: number) => [
                (index + 1).toString(),
                elem.nombre || '',
                elem.descripcion || elem.descripcion_completa || '',
                elem.cantidad_actual ? `${elem.cantidad_actual}/${elem.cantidad_maxima}` : '1/1'
            ]);

            autoTable(doc, {
                startY: yPosition,
                head: [['#', 'Elemento', 'Descripción', 'Cantidad']],
                body: elementosData,
                theme: 'grid',
                headStyles: {
                    fillColor: [255, 189, 49],
                    textColor: [0, 0, 0],
                    fontStyle: 'bold',
                    fontSize: 10
                },
                bodyStyles: {
                    fontSize: 9
                },
                columnStyles: {
                    0: { cellWidth: 15, halign: 'center' },
                    1: { cellWidth: 60 },
                    2: { cellWidth: 90 },
                    3: { cellWidth: 25, halign: 'center' }
                },
                margin: { left: 15, right: 15 }
            });

            yPosition = (doc as any).lastAutoTable.finalY + 10;
        }

        // MOBILIARIO LIMPIADO
        if (datos.mobiliario && datos.mobiliario.length > 0) {
            // Verificar si necesitamos nueva página
            if (yPosition > pageHeight - 80) {
                doc.addPage();
                yPosition = 20;
            }

            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text('MOBILIARIO LIMPIADO', 15, yPosition);
            yPosition += 8;

            const mobiliarioData = datos.mobiliario.map((mob: any, index: number) => [
                (index + 1).toString(),
                mob.nombre || '',
                mob.cantidad_actual ? `${mob.cantidad_actual}/${mob.cantidad_maxima}` : '1/1'
            ]);

            autoTable(doc, {
                startY: yPosition,
                head: [['#', 'Mobiliario', 'Cantidad']],
                body: mobiliarioData,
                theme: 'grid',
                headStyles: {
                    fillColor: [255, 189, 49],
                    textColor: [0, 0, 0],
                    fontStyle: 'bold',
                    fontSize: 10
                },
                bodyStyles: {
                    fontSize: 9
                },
                columnStyles: {
                    0: { cellWidth: 15, halign: 'center' },
                    1: { cellWidth: 130 },
                    2: { cellWidth: 45, halign: 'center' }
                },
                margin: { left: 15, right: 15 }
            });

            yPosition = (doc as any).lastAutoTable.finalY + 10;
        }

        // PRODUCTOS DE LIMPIEZA CONSUMIDOS
        if (datos.consumos && datos.consumos.length > 0) {
            // Verificar si necesitamos nueva página
            if (yPosition > pageHeight - 80) {
                doc.addPage();
                yPosition = 20;
            }

            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text('PRODUCTOS DE LIMPIEZA CONSUMIDOS', 15, yPosition);
            yPosition += 8;

            const consumosData = datos.consumos.map((consumo: any, index: number) => [
                (index + 1).toString(),
                consumo.nombre_producto || consumo.nombre || '',
                consumo.cantidad_consumida ? consumo.cantidad_consumida.toFixed(2) :
                    consumo.cantidad ? consumo.cantidad.toFixed(2) : '0.00',
                consumo.unidad || consumo.abreviatura || ''
            ]);

            // REMOVIDO: El cálculo de totalConsumo y la fila foot

            autoTable(doc, {
                startY: yPosition,
                head: [['#', 'Producto', 'Cantidad', 'Unidad']],
                body: consumosData,
                // REMOVIDO: foot
                theme: 'grid',
                headStyles: {
                    fillColor: [255, 189, 49],
                    textColor: [0, 0, 0],
                    fontStyle: 'bold',
                    fontSize: 10
                },
                bodyStyles: {
                    fontSize: 9
                },
                columnStyles: {
                    0: { cellWidth: 15, halign: 'center' },
                    1: { cellWidth: 110 },
                    2: { cellWidth: 35, halign: 'right' },
                    3: { cellWidth: 30, halign: 'center' }
                },
                margin: { left: 15, right: 15 }
            });

            yPosition = (doc as any).lastAutoTable.finalY + 10;
        }

        // OBSERVACIONES
        if (datos.registro.observaciones) {
            // Verificar si necesitamos nueva página
            if (yPosition > pageHeight - 60) {
                doc.addPage();
                yPosition = 20;
            }

            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text('OBSERVACIONES', 15, yPosition);
            yPosition += 8;

            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            const observacionesLines = doc.splitTextToSize(datos.registro.observaciones, pageWidth - 30);
            doc.text(observacionesLines, 15, yPosition);
            yPosition += observacionesLines.length * 5 + 10;
        }

        // RESPONSABLES (sin espacio para firma)
        // Verificar si necesitamos nueva página
        if (yPosition > pageHeight - 40) {
            doc.addPage();
            yPosition = 20;
        }

        doc.setLineWidth(0.5);
        doc.line(15, yPosition, pageWidth - 15, yPosition);
        yPosition += 8;

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('RESPONSABLES', 15, yPosition);
        yPosition += 10;

        doc.setFontSize(10);

        // Ejecutor
        doc.setFont('helvetica', 'bold');
        doc.text('Ejecutado por:', 15, yPosition);
        doc.setFont('helvetica', 'normal');
        const ejecutor = datos.registro.nombre_ejecutor || datos.nombreEjecutor || 'No asignado';
        doc.text(ejecutor, 45, yPosition);

        yPosition += 6;

        // Supervisor (si existe)
        const supervisor = datos.registro.nombre_supervisor || datos.nombreSupervisor;
        if (supervisor) {
            doc.setFont('helvetica', 'bold');
            doc.text('Supervisado por:', 15, yPosition);
            doc.setFont('helvetica', 'normal');
            doc.text(supervisor, 45, yPosition);
            yPosition += 6;
        }

        // Pie de página
        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        doc.text(
            `Documento generado el ${new Date().toLocaleDateString('es-CO')} a las ${new Date().toLocaleTimeString('es-CO')}`,
            pageWidth / 2,
            pageHeight - 10,
            { align: 'center' }
        );

        // Guardar el PDF
        const nombreArchivo = `Registro_Limpieza_${datos.registro.id}_${this.formatearFechaArchivo(new Date())}.pdf`;
        doc.save(nombreArchivo);
    }

    private formatearFecha(fecha: string): string {
        if (!fecha || fecha === '0000-00-00' || fecha === '0000-00-00 00:00:00') return '--/--/----';

        try {
            const date = new Date(fecha);
            if (isNaN(date.getTime())) return '--/--/----';

            return date.toLocaleDateString('es-CO', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            });
        } catch {
            return fecha || '--/--/----';
        }
    }

    private formatearFechaArchivo(fecha: Date): string {
        const year = fecha.getFullYear();
        const month = String(fecha.getMonth() + 1).padStart(2, '0');
        const day = String(fecha.getDate()).padStart(2, '0');
        return `${year}${month}${day}`;
    }
}