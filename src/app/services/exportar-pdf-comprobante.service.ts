import { Injectable } from '@angular/core';
import { jsPDF } from 'jspdf';
import { InstitucionConfigService } from './institucion-config.service';

export interface DatosComprobantePDF {
  pago: any;
  estudiante: any;
  acudiente: any;
  tipoPago: any;
  fechaGeneracion: Date;
  logoBase64?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ExportarPdfComprobanteService {

  constructor(private institucionConfigService: InstitucionConfigService) { }

  generarPDF(datos: DatosComprobantePDF): void {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPos = 20;

    // Colores
    const primaryColor = '#222';
    const goldColor = '#d4af37';
    const grayColor = '#7f8c8d';
    const greenColor = '#27ae60';

    try {
      // 1. CABECERA con logo y título
      this.dibujarCabecera(doc, datos, yPos, pageWidth, primaryColor, goldColor, grayColor);
      yPos += 35;

      // Línea divisoria dorada
      doc.setDrawColor(goldColor);
      doc.setLineWidth(2);
      doc.line(15, yPos, pageWidth - 15, yPos);
      yPos += 15;

      // 2. INFORMACIÓN DEL ESTUDIANTE Y ACUDIENTE
      this.dibujarInformacionPersonas(doc, datos, yPos, pageWidth, primaryColor, grayColor);
      yPos += 45;

      // 3. DETALLE DE CUENTAS APLICADAS
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(primaryColor);
      doc.text('Detalle de Pago', 20, yPos);
      yPos += 10;

      // Iniciar la tabla
      yPos = this.dibujarTablaDetalle(doc, datos, yPos, pageWidth, pageHeight, primaryColor, grayColor, greenColor);

      // 4. RESUMEN DE TOTALES
      yPos = this.dibujarResumenTotales(doc, datos, yPos, pageWidth, grayColor, greenColor);

      // 5. OBSERVACIONES (si existen)
      if (datos.pago.observaciones && datos.pago.observaciones.trim() !== '') {
        yPos = this.dibujarObservaciones(doc, datos, yPos, pageWidth, pageHeight, primaryColor);
      }

      // 6. FIRMAS
      yPos = this.dibujarFirmas(doc, datos, yPos, pageWidth, pageHeight, primaryColor, grayColor);

      // 7. PIE DE PÁGINA
      this.dibujarPiePagina(doc, datos, pageWidth, pageHeight, grayColor);

      // Guardar el PDF
      doc.save(`Comprobante_Pago_${datos.pago.id}.pdf`);

    } catch (error) {
      console.error('Error al generar PDF:', error);
      throw error;
    }
  }

  private dibujarCabecera(doc: jsPDF, datos: DatosComprobantePDF, yPos: number, pageWidth: number,
    primaryColor: string, goldColor: string, grayColor: string): void {
    // Logo con el mismo estilo que la evaluación académica
    if (datos.logoBase64) {


      // Logo dentro del círculo - más pequeño y centrado
      doc.addImage(datos.logoBase64, 'PNG', 22, yPos + 2, 20, 20);
    } else {
      // Círculo con iniciales si no hay logo
      doc.setFillColor(34, 34, 34);
      doc.circle(30, yPos + 10, 12, 'F');
      doc.setFontSize(14);
      doc.setTextColor(goldColor);
      doc.text('LL', 30, yPos + 10, { align: 'center', baseline: 'middle' });
    }

    // Información de la institución - DINÁMICO
    const nombreInstitucion = this.institucionConfigService.getNombreInstitucion();
    const direccionInstitucion = this.institucionConfigService.getDireccionInstitucion();
    const nitInstitucion = this.institucionConfigService.getNitInstitucion();

    doc.setTextColor(primaryColor);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(nombreInstitucion, 45, yPos + 8);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(grayColor);
    doc.text(direccionInstitucion, 45, yPos + 14);
    doc.text(`NIT: ${nitInstitucion}`, 45, yPos + 19);

    // Título y número del comprobante (derecha)
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryColor);
    doc.text('COMPROBANTE DE PAGO', pageWidth - 15, yPos + 8, { align: 'right' });

    // Número en color azul como en la evaluación
    doc.setFontSize(14);
    doc.setTextColor(52, 152, 219);
    doc.setFont('helvetica', 'bold');
    doc.text(`No. ${datos.pago.id}`, pageWidth - 15, yPos + 15, { align: 'right' });

    // Fecha en gris
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(grayColor);
    doc.text(`Fecha: ${this.formatearFecha(datos.pago.fecha)}`, pageWidth - 15, yPos + 21, { align: 'right' });
  }

  private dibujarInformacionPersonas(doc: jsPDF, datos: DatosComprobantePDF, yPos: number,
    pageWidth: number, primaryColor: string, grayColor: string): void {
    // Cajas para estudiante y acudiente con márgenes más pequeños
    const marginX = 15;  // Margen reducido
    const boxWidth = (pageWidth - (marginX * 2) - 10) / 2;

    // Caja del estudiante
    doc.setDrawColor(200);
    doc.setLineWidth(0.5);
    doc.setFillColor(248, 249, 250);
    doc.roundedRect(marginX, yPos, boxWidth, 38, 3, 3, 'FD');

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryColor);
    doc.text('Datos del Estudiante', marginX + 5, yPos + 8);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');

    const datosEstudiante = [
      { label: 'Nombre:', valor: datos.estudiante.nombre },
      { label: 'Documento:', valor: datos.estudiante.documento },
      { label: 'Grado:', valor: datos.estudiante.grado }
    ];

    let yOffset = yPos + 16;
    datosEstudiante.forEach(item => {
      doc.setTextColor(grayColor);
      doc.text(item.label, marginX + 5, yOffset);
      doc.setTextColor(0);
      doc.text(item.valor, marginX + 35, yOffset);
      yOffset += 6;
    });

    // Caja del acudiente
    const xPosAcudiente = marginX + boxWidth + 10;
    doc.setFillColor(248, 249, 250);
    doc.roundedRect(xPosAcudiente, yPos, boxWidth, 38, 3, 3, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryColor);
    doc.text('Datos del Acudiente', xPosAcudiente + 5, yPos + 8);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');

    const datosAcudiente = [
      { label: 'Nombre:', valor: datos.acudiente.nombre },
      { label: 'Documento:', valor: datos.acudiente.documento },
      { label: 'Tipo de Pago:', valor: datos.tipoPago.nombre || 'No especificado' }
    ];

    yOffset = yPos + 16;
    datosAcudiente.forEach(item => {
      doc.setTextColor(grayColor);
      doc.text(item.label, xPosAcudiente + 5, yOffset);
      doc.setTextColor(0);
      const maxWidth = boxWidth - 40;
      const lines = doc.splitTextToSize(item.valor, maxWidth);
      doc.text(lines[0], xPosAcudiente + 35, yOffset);
      yOffset += 6;
    });
  }

  private dibujarTablaDetalle(doc: jsPDF, datos: DatosComprobantePDF, yPos: number,
    pageWidth: number, pageHeight: number, primaryColor: string,
    grayColor: string, greenColor: string): number {
    const headers = ['Fecha', 'Concepto', 'Saldo Anterior', 'Valor Aplicado', 'Saldo Actual'];
    const columnWidths = [22, 48, 30, 30, 30];
    const startX = 15;
    const endX = pageWidth - 15;
    const totalTableWidth = endX - startX;
    const rowHeight = 7;
    const headerHeight = 8;

    // Ajustar anchos de columna para que sumen exactamente el ancho disponible
    const totalColumnWidth = columnWidths.reduce((sum, width) => sum + width, 0);
    if (totalColumnWidth > totalTableWidth) {
      const factor = totalTableWidth / totalColumnWidth;
      columnWidths.forEach((width, index) => {
        columnWidths[index] = Math.floor(width * factor);
      });
    }

    // Función para dibujar encabezados
    const dibujarEncabezados = () => {
      doc.setFillColor(240, 240, 240);
      doc.rect(startX, yPos, totalTableWidth, headerHeight, 'F');

      // Línea inferior del encabezado
      doc.setDrawColor(200);
      doc.setLineWidth(0.5);
      doc.line(startX, yPos + headerHeight, startX + totalTableWidth, yPos + headerHeight);

      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(51, 51, 51);

      let xOffset = startX;
      headers.forEach((header, index) => {
        if (index > 1) {
          doc.text(header, xOffset + columnWidths[index] - 2, yPos + 5.5, { align: 'right' });
        } else {
          doc.text(header, xOffset + 2, yPos + 5.5);
        }
        xOffset += columnWidths[index];
      });

      yPos += headerHeight + 2;
    };

    dibujarEncabezados();

    // Dibujar filas de datos
    datos.pago.cuentas_aplicadas.forEach((cuenta: any, index: number) => {
      if (yPos > pageHeight - 40) {
        doc.addPage();
        yPos = 20;
        dibujarEncabezados();
      }

      if (index % 2 === 0) {
        doc.setFillColor(250, 250, 250);
        doc.rect(startX, yPos - 4, totalTableWidth, rowHeight, 'F');
      }

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');

      let xOffset = startX;

      // Fecha
      doc.setTextColor(0);
      const fecha = this.formatearFechaCorta(cuenta.fecha_cuenta || cuenta.fecha);
      doc.text(fecha, xOffset + 2, yPos);

      // Concepto
      xOffset += columnWidths[0];
      const conceptoMaxWidth = columnWidths[1] - 4;
      const conceptoLines = doc.splitTextToSize(cuenta.nombre_producto_servicio, conceptoMaxWidth);
      doc.text(conceptoLines[0], xOffset + 2, yPos);

      // Saldo Anterior (viene directo del backend)
      xOffset += columnWidths[1];
      const saldoAnterior = cuenta.saldo_antes_pago || 0;
      doc.text(this.formatearMoneda(saldoAnterior), xOffset + columnWidths[2] - 2, yPos, { align: 'right' });

      // Valor Aplicado
      xOffset += columnWidths[2];
      doc.setTextColor(greenColor);
      doc.setFont('helvetica', 'bold');
      doc.text(this.formatearMoneda(cuenta.valor_aplicado), xOffset + columnWidths[3] - 2, yPos, { align: 'right' });

      // Saldo Actual
      xOffset += columnWidths[3];
      doc.setTextColor(0);
      doc.setFont('helvetica', 'normal');
      const saldoActual = cuenta.saldo_actual_cuenta || 0;
      doc.text(this.formatearMoneda(saldoActual), xOffset + columnWidths[4] - 2, yPos, { align: 'right' });

      yPos += rowHeight;
    });

    return yPos + 5;
  }

  private formatearFechaCorta(fechaStr: string): string {
    if (!fechaStr) return '';

    try {
      const soloFecha = fechaStr.split('T')[0];
      const [año, mes, dia] = soloFecha.split('-');
      return `${dia}/${mes}/${año}`;
    } catch (error) {
      console.error('Error al formatear fecha:', error);
      return '';
    }
  }

  private dibujarResumenTotales(doc: jsPDF, datos: DatosComprobantePDF, yPos: number,
    pageWidth: number, grayColor: string, greenColor: string): number {
    if (yPos > doc.internal.pageSize.getHeight() - 60) {
      doc.addPage();
      yPos = 20;
    }

    const totalAplicado = datos.pago.cuentas_aplicadas.reduce((total: number, cuenta: any) =>
      total + cuenta.valor_aplicado, 0
    );

    const totalesX = pageWidth - 90;
    const totalesWidth = 70;
    const totalesHeight = datos.pago.saldo > 0 ? 32 : 24;

    doc.setFillColor(248, 249, 250);
    doc.setDrawColor(200);
    doc.setLineWidth(0.5);
    doc.roundedRect(totalesX, yPos, totalesWidth, totalesHeight, 3, 3, 'FD');

    let yTotales = yPos + 8;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(grayColor);
    doc.text('Valor Recibido:', totalesX + 5, yTotales);
    doc.setTextColor(0);
    doc.setFont('helvetica', 'bold');
    doc.text(this.formatearMoneda(datos.pago.valor_recibido), totalesX + totalesWidth - 5, yTotales, { align: 'right' });

    yTotales += 8;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(grayColor);
    doc.text('Valor Aplicado:', totalesX + 5, yTotales);
    doc.setTextColor(0);
    doc.setFont('helvetica', 'bold');
    doc.text(this.formatearMoneda(totalAplicado), totalesX + totalesWidth - 5, yTotales, { align: 'right' });

    if (datos.pago.saldo > 0) {
      yTotales += 8;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(grayColor);
      doc.text('Saldo a Favor:', totalesX + 5, yTotales);
      doc.setTextColor(greenColor);
      doc.setFont('helvetica', 'bold');
      doc.text(this.formatearMoneda(datos.pago.saldo), totalesX + totalesWidth - 5, yTotales, { align: 'right' });
    }

    return yPos + totalesHeight + 10;
  }

  private dibujarObservaciones(doc: jsPDF, datos: DatosComprobantePDF, yPos: number,
    pageWidth: number, pageHeight: number, primaryColor: string): number {
    if (yPos > pageHeight - 50) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryColor);
    doc.text('Observaciones', 15, yPos);
    yPos += 8;

    const obsBoxHeight = 25;
    doc.setFillColor(252, 252, 252);
    doc.setDrawColor(200);
    doc.setLineWidth(0.5);
    doc.roundedRect(15, yPos - 2, pageWidth - 30, obsBoxHeight, 3, 3, 'FD');

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0);

    const observacionesLines = doc.splitTextToSize(datos.pago.observaciones, pageWidth - 40);
    doc.text(observacionesLines, 20, yPos + 5);

    return yPos + obsBoxHeight + 10;
  }

  private dibujarFirmas(doc: jsPDF, datos: DatosComprobantePDF, yPos: number,
    pageWidth: number, pageHeight: number, primaryColor: string, grayColor: string): number {
    if (yPos > pageHeight - 50) {
      doc.addPage();
      yPos = 20;
    }

    const firmaWidth = 75;
    const firmaSpacing = 15;
    const firmaStartX = (pageWidth - (firmaWidth * 2 + firmaSpacing)) / 2;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryColor);

    if (datos.pago.nombre_completo_usuario_registro) {
      doc.text(datos.pago.nombre_completo_usuario_registro, firmaStartX + firmaWidth / 2, yPos, { align: 'center' });
    }

    doc.setDrawColor(180);
    doc.setLineWidth(0.5);
    doc.line(firmaStartX, yPos + 15, firmaStartX + firmaWidth, yPos + 15);

    doc.setFontSize(10);
    doc.text('Recibido por', firmaStartX + firmaWidth / 2, yPos + 20, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(grayColor);
    doc.text('Nombre y firma', firmaStartX + firmaWidth / 2, yPos + 25, { align: 'center' });

    const firmaAprobadoX = firmaStartX + firmaWidth + firmaSpacing;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(primaryColor);

    const nombreContable = datos.pago.nombre_completo_usuario_contable || 'Pendiente';
    doc.text(nombreContable, firmaAprobadoX + firmaWidth / 2, yPos, { align: 'center' });

    doc.line(firmaAprobadoX, yPos + 15, firmaAprobadoX + firmaWidth, yPos + 15);

    doc.text('Aprobado por', firmaAprobadoX + firmaWidth / 2, yPos + 20, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(grayColor);
    doc.text('Nombre y firma', firmaAprobadoX + firmaWidth / 2, yPos + 25, { align: 'center' });

    return yPos + 35;
  }

  private dibujarPiePagina(doc: jsPDF, datos: DatosComprobantePDF,
    pageWidth: number, pageHeight: number, grayColor: string): void {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(grayColor);
    doc.text(
      'Este comprobante es válido como soporte de pago. Conserve este documento.',
      pageWidth / 2,
      pageHeight - 15,
      { align: 'center' }
    );

    const fechaGeneracionStr = `Generado el ${datos.fechaGeneracion.toLocaleDateString('es-CO')} a las ${datos.fechaGeneracion.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}`;
    doc.setFontSize(8);
    doc.setTextColor(149, 165, 166);
    doc.text(fechaGeneracionStr, pageWidth / 2, pageHeight - 10, { align: 'center' });
  }

  private formatearFecha(fechaStr: string): string {
    if (!fechaStr) return '';

    try {
      const [fechaParte] = fechaStr.split('T');
      const [año, mes, dia] = fechaParte.split('-');

      const fecha = new Date(parseInt(año), parseInt(mes) - 1, parseInt(dia), 12, 0, 0);

      const opciones: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      };
      return fecha.toLocaleDateString('es-CO', opciones);
    } catch (error) {
      console.error('Error al formatear fecha:', error);
      return fechaStr;
    }
  }

  private formatearMoneda(valor: number): string {
    return valor.toLocaleString('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  }
}