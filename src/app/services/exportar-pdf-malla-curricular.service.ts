import { Injectable } from '@angular/core';
import { jsPDF } from 'jspdf';
import { InstitucionConfigService } from './institucion-config.service';

export interface DatosMallaCurricularPDF {
  logros: any[];
  totales: {
    totalLogros: number;
    totalIndicadores: number;
    totalAreas: number;
    totalGrados: number;
    totalCortes: number;
    promedioIndicadoresPorLogro: number;
  };
  filtrosDescripcion: string;
  fechaGeneracion: Date;
  logoBase64?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ExportarPdfMallaCurricularService {

  constructor(private institucionConfigService: InstitucionConfigService) { }

  generarPDF(datos: DatosMallaCurricularPDF): void {
    const doc = new jsPDF('l', 'mm', 'a4'); // Landscape para más espacio horizontal
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPos = 15;

    // Colores (consistentes con el comprobante de pago)
    const primaryColor = '#222';
    const goldColor = '#d4af37';
    const grayColor = '#7f8c8d';

    // Colores temáticos de la malla curricular
    const colorLogros = '#3498db';
    const colorIndicadores = '#27ae60';
    const colorGrados = '#9b59b6';
    const colorAreas = '#e67e22';
    const colorCortes = '#1abc9c';

    try {
      // 1. CABECERA
      yPos = this.dibujarCabecera(doc, datos, yPos, pageWidth, primaryColor, goldColor, grayColor);

      // Línea divisoria dorada
      doc.setDrawColor(goldColor);
      doc.setLineWidth(1.5);
      doc.line(15, yPos, pageWidth - 15, yPos);
      yPos += 10;

      // 2. RESUMEN ESTADÍSTICO
      yPos = this.dibujarResumenEstadistico(doc, datos, yPos, pageWidth, primaryColor, grayColor,
        colorLogros, colorIndicadores, colorGrados, colorAreas, colorCortes);

      // 3. TABLA DETALLADA
      yPos = this.dibujarTablaDetalle(doc, datos, yPos, pageWidth, pageHeight, primaryColor, grayColor, colorIndicadores);

      // 4. PIE DE PÁGINA (en todas las páginas)
      const totalPaginas = doc.getNumberOfPages();
      for (let i = 1; i <= totalPaginas; i++) {
        doc.setPage(i);
        this.dibujarPiePagina(doc, datos, pageWidth, pageHeight, grayColor, i, totalPaginas);
      }

      // Guardar el PDF
      let nombreArchivo = 'Malla_Curricular';
      if (datos.filtrosDescripcion && datos.filtrosDescripcion !== 'Todos los registros') {
        nombreArchivo += '_' + datos.filtrosDescripcion.replace(/\s·\s/g, '_').replace(/\s+/g, '_');
      }
      nombreArchivo += '.pdf';

      doc.save(nombreArchivo);

    } catch (error) {
      console.error('Error al generar PDF de malla curricular:', error);
      throw error;
    }
  }

  // ─── CABECERA ──────────────────────────────────────────────────────

  private dibujarCabecera(doc: jsPDF, datos: DatosMallaCurricularPDF, yPos: number,
    pageWidth: number, primaryColor: string, goldColor: string, grayColor: string): number {

    // Logo
    if (datos.logoBase64) {
      doc.addImage(datos.logoBase64, 'PNG', 15, yPos, 18, 18);
    } else {
      doc.setFillColor(34, 34, 34);
      doc.circle(24, yPos + 9, 10, 'F');
      doc.setFontSize(12);
      doc.setTextColor(goldColor);
      doc.text('LL', 24, yPos + 9, { align: 'center', baseline: 'middle' });
    }

    // Información de la institución
    const nombreInstitucion = this.institucionConfigService.getNombreInstitucion();
    const direccionInstitucion = this.institucionConfigService.getDireccionInstitucion();
    const nitInstitucion = this.institucionConfigService.getNitInstitucion();

    doc.setTextColor(primaryColor);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(nombreInstitucion, 38, yPos + 7);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(grayColor);
    doc.text(direccionInstitucion, 38, yPos + 12);
    doc.text(`NIT: ${nitInstitucion}`, 38, yPos + 16);

    // Título del reporte (derecha)
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryColor);
    doc.text('MALLA CURRICULAR', pageWidth - 15, yPos + 7, { align: 'right' });

    // Filtros aplicados
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(52, 152, 219);
    doc.text(datos.filtrosDescripcion, pageWidth - 15, yPos + 13, { align: 'right' });

    // Fecha de generación
    doc.setFontSize(8);
    doc.setTextColor(grayColor);
    const fechaStr = datos.fechaGeneracion.toLocaleDateString('es-CO', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
    doc.text(`Generado: ${fechaStr}`, pageWidth - 15, yPos + 18, { align: 'right' });

    return yPos + 25;
  }

  // ─── RESUMEN ESTADÍSTICO ──────────────────────────────────────────

  private dibujarResumenEstadistico(doc: jsPDF, datos: DatosMallaCurricularPDF, yPos: number,
    pageWidth: number, primaryColor: string, grayColor: string,
    colorLogros: string, colorIndicadores: string, colorGrados: string,
    colorAreas: string, colorCortes: string): number {

    const marginX = 15;
    const availableWidth = pageWidth - (marginX * 2);
    const boxCount = 5;
    const boxGap = 6;
    const boxWidth = (availableWidth - (boxGap * (boxCount - 1))) / boxCount;
    const boxHeight = 28;

    const estadisticas = [
      { valor: datos.totales.totalLogros, label: 'Total Logros', extra: 'registrados', color: colorLogros },
      { valor: datos.totales.totalIndicadores, label: 'Indicadores', extra: `prom. ${datos.totales.promedioIndicadoresPorLogro}/logro`, color: colorIndicadores },
      { valor: datos.totales.totalGrados, label: 'Grados', extra: 'cubiertos', color: colorGrados },
      { valor: datos.totales.totalAreas, label: 'Áreas', extra: 'académicas', color: colorAreas },
      { valor: datos.totales.totalCortes, label: 'Cortes', extra: 'académicos', color: colorCortes }
    ];

    estadisticas.forEach((stat, index) => {
      const xPos = marginX + (boxWidth + boxGap) * index;

      // Fondo de la caja (color claro: mezcla con blanco al 90%)
      const rgb = this.hexToRgb(stat.color);
      const bgR = Math.round(rgb.r + (255 - rgb.r) * 0.88);
      const bgG = Math.round(rgb.g + (255 - rgb.g) * 0.88);
      const bgB = Math.round(rgb.b + (255 - rgb.b) * 0.88);
      doc.setFillColor(bgR, bgG, bgB);
      doc.setDrawColor(rgb.r, rgb.g, rgb.b);
      doc.setLineWidth(0.5);
      doc.roundedRect(xPos, yPos, boxWidth, boxHeight, 2, 2, 'FD');

      // Valor
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(rgb.r, rgb.g, rgb.b);
      doc.text(String(stat.valor), xPos + boxWidth / 2, yPos + 10, { align: 'center' });

      // Label
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text(stat.label, xPos + boxWidth / 2, yPos + 17, { align: 'center' });

      // Extra
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.text(stat.extra, xPos + boxWidth / 2, yPos + 22, { align: 'center' });
    });

    return yPos + boxHeight + 8;
  }

  // ─── TABLA DETALLADA ──────────────────────────────────────────────

  private dibujarTablaDetalle(doc: jsPDF, datos: DatosMallaCurricularPDF, yPos: number,
    pageWidth: number, pageHeight: number, primaryColor: string,
    grayColor: string, colorIndicadores: string): number {

    const startX = 15;
    const endX = pageWidth - 15;
    const totalTableWidth = endX - startX;

    // Columnas: Grado, Área, Corte, Logro, Indicadores
    const headers = ['Grado', 'Área Académica', 'Corte', 'Esfera', 'Logro', 'Indicadores de Logro'];
    const colProportions = [0.09, 0.12, 0.08, 0.10, 0.26, 0.35];
    const columnWidths = colProportions.map(p => Math.floor(totalTableWidth * p));

    // Ajustar última columna para compensar redondeo
    const sumWidths = columnWidths.reduce((s, w) => s + w, 0);
    columnWidths[columnWidths.length - 1] += totalTableWidth - sumWidths;

    const headerHeight = 8;
    const rowPadding = 3;
    const fontSize = 7;
    const lineHeight = 3.5;

    // Título de sección
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryColor);
    doc.text('Detalle de Malla Curricular', startX, yPos);
    yPos += 7;

    // Función para dibujar encabezados de tabla
    const dibujarEncabezados = (y: number): number => {
      doc.setFillColor(248, 249, 250);
      doc.rect(startX, y, totalTableWidth, headerHeight, 'F');

      doc.setDrawColor(200);
      doc.setLineWidth(0.3);
      doc.line(startX, y + headerHeight, endX, y + headerHeight);

      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(51, 51, 51);

      let xOffset = startX;
      headers.forEach((header, index) => {
        doc.text(header, xOffset + 2, y + 5.5);
        xOffset += columnWidths[index];
      });

      return y + headerHeight;
    };

    yPos = dibujarEncabezados(yPos);

    // Dibujar filas de datos
    datos.logros.forEach((logro: any, index: number) => {
      // Calcular altura necesaria para esta fila
      const indicadoresTexto = (logro.indicadores && logro.indicadores.length > 0)
        ? logro.indicadores.map((ind: any, idx: number) => `${idx + 1}. ${ind.nombre}`).join('\n')
        : 'Sin indicadores';

      const maxWidthIndicadores = columnWidths[5] - 4;
      const maxWidthLogro = columnWidths[4] - 4;

      const indicadoresLines = doc.splitTextToSize(indicadoresTexto, maxWidthIndicadores);
      const logroLines = doc.splitTextToSize(logro.nombre || '', maxWidthLogro);

      doc.setFontSize(fontSize);
      const maxLines = Math.max(indicadoresLines.length, logroLines.length, 1);
      const rowHeight = Math.max((maxLines * lineHeight) + (rowPadding * 2), 8);

      // Verificar salto de página
      if (yPos + rowHeight > pageHeight - 20) {
        doc.addPage();
        yPos = 15;
        yPos = dibujarEncabezados(yPos);
      }

      // Fondo alternado
      if (index % 2 === 0) {
        doc.setFillColor(252, 252, 252);
        doc.rect(startX, yPos, totalTableWidth, rowHeight, 'F');
      }

      // Línea inferior de la fila
      doc.setDrawColor(230);
      doc.setLineWidth(0.2);
      doc.line(startX, yPos + rowHeight, endX, yPos + rowHeight);

      const textY = yPos + rowPadding + 3;
      let xOffset = startX;

      doc.setFontSize(fontSize);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0);

      // Grado
      const gradoLines = doc.splitTextToSize(logro.nombre_grado || '-', columnWidths[0] - 4);
      doc.text(gradoLines, xOffset + 2, textY);
      xOffset += columnWidths[0];

      // Área Académica
      const areaLines = doc.splitTextToSize(logro.nombre_area_academica || '-', columnWidths[1] - 4);
      doc.text(areaLines, xOffset + 2, textY);
      xOffset += columnWidths[1];

      // Corte
      const corteLines = doc.splitTextToSize(logro.nombre_corte_academico || '-', columnWidths[2] - 4);
      doc.text(corteLines, xOffset + 2, textY);
      xOffset += columnWidths[2];

      // Esfera
      const esferaLines = doc.splitTextToSize(logro.nombre_esfera_desarrollo || '-', columnWidths[3] - 4);
      doc.text(esferaLines, xOffset + 2, textY);
      xOffset += columnWidths[3];

      // Logro (bold)
      doc.setFont('helvetica', 'bold');
      doc.text(logroLines, xOffset + 2, textY);
      xOffset += columnWidths[4];

      // Indicadores
      doc.setFont('helvetica', 'normal');
      const rgbInd = this.hexToRgb(colorIndicadores);
      if (logro.indicadores && logro.indicadores.length > 0) {
        doc.setTextColor(40, 40, 40);
      } else {
        doc.setTextColor(160, 160, 160);
      }
      doc.text(indicadoresLines, xOffset + 2, textY);

      // Reset color
      doc.setTextColor(0);

      yPos += rowHeight;
    });

    return yPos + 5;
  }

  // ─── PIE DE PÁGINA ────────────────────────────────────────────────

  private dibujarPiePagina(doc: jsPDF, datos: DatosMallaCurricularPDF,
    pageWidth: number, pageHeight: number, grayColor: string,
    paginaActual: number, totalPaginas: number): void {

    // Línea separadora
    doc.setDrawColor(200);
    doc.setLineWidth(0.3);
    doc.line(15, pageHeight - 18, pageWidth - 15, pageHeight - 18);

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(grayColor);

    // Nombre de la institución (izquierda)
    const nombreInstitucion = this.institucionConfigService.getNombreInstitucion();
    doc.text(nombreInstitucion + ' · Malla Curricular', 15, pageHeight - 12);

    // Fecha de generación (centro)
    const fechaStr = datos.fechaGeneracion.toLocaleDateString('es-CO') +
      ' ' + datos.fechaGeneracion.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
    doc.text(`Generado: ${fechaStr}`, pageWidth / 2, pageHeight - 12, { align: 'center' });

    // Paginación (derecha)
    doc.text(`Página ${paginaActual} de ${totalPaginas}`, pageWidth - 15, pageHeight - 12, { align: 'right' });
  }

  // ─── UTILIDADES ───────────────────────────────────────────────────

  private hexToRgb(hex: string): { r: number, g: number, b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  }
}