import { Injectable } from '@angular/core';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { InstitucionConfigService } from './institucion-config.service';

/**
 * Datos del PDF de un reporte de novedades (GET reportes-novedades-espacios/:id),
 * con la copia de cada novedad tal como salió en el reporte.
 */
export interface DatosReporteNovedadesPDF {
  nombre_lugar: string;
  fecha_desde: string;
  fecha_hasta: string;
  cantidad: number;
  total_minutos: number;
  fecha_registro: string;
  generado_por?: string;
  detalle: {
    fecha: string, nombre_espacio: string, hora_inicial: string, hora_final: string,
    nombre_tipo: string, observaciones: string | null, minutos: number
  }[];
  logoBase64?: string;
}

/**
 * PDF del reporte de novedades de los espacios que se le manda al club:
 * cada novedad con su fecha, cancha, horario, horas y tipo, las horas por
 * cancha y el total.
 */
@Injectable({
  providedIn: 'root'
})
export class ExportarPdfNovedadesEspaciosService {

  private readonly dorado: [number, number, number] = [212, 175, 55];
  private readonly oscuro = '#222222';
  private readonly gris = '#7f8c8d';

  constructor(private institucionConfigService: InstitucionConfigService) { }

  /** Arma el PDF y lo descarga */
  generarPDF(datos: DatosReporteNovedadesPDF): void {
    this.construirDocumento(datos).save(this.nombreArchivo(datos));
  }

  /** El mismo PDF como Blob, para compartirlo con el menú nativo del dispositivo */
  generarBlob(datos: DatosReporteNovedadesPDF): Blob {
    return this.construirDocumento(datos).output('blob');
  }

  nombreArchivo(datos: DatosReporteNovedadesPDF): string {
    const lugar = (datos.nombre_lugar || 'lugar').normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '');
    return `Novedades_${lugar}_${datos.fecha_desde}_a_${datos.fecha_hasta}.pdf`;
  }

  private construirDocumento(datos: DatosReporteNovedadesPDF): jsPDF {
    const doc: any = new jsPDF('p', 'mm', 'a4');
    const ancho = doc.internal.pageSize.getWidth();
    const alto = doc.internal.pageSize.getHeight();
    const margen = 15;
    let y = 15;

    // ---------- Cabecera
    if (datos.logoBase64) {
      try {
        doc.addImage(datos.logoBase64, 'PNG', margen, y, 20, 20);
      } catch {
        this.iniciales(doc, margen, y);
      }
    } else {
      this.iniciales(doc, margen, y);
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(this.oscuro);
    doc.text(doc.splitTextToSize(this.institucionConfigService.getNombreInstitucion() || '', ancho - margen * 2 - 28), margen + 26, y + 8);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(this.gris);
    doc.text('Reporte de novedades de canchas', margen + 26, y + 15);
    y += 26;

    doc.setDrawColor(...this.dorado);
    doc.setLineWidth(1.2);
    doc.line(margen, y, ancho - margen, y);
    y += 9;

    // ---------- Datos del reporte
    y = this.dato(doc, 'Lugar', datos.nombre_lugar, margen, y);
    y = this.dato(doc, 'Período', datos.fecha_desde === datos.fecha_hasta
      ? this.fechaLarga(datos.fecha_desde)
      : `Del ${this.fechaLarga(datos.fecha_desde)} al ${this.fechaLarga(datos.fecha_hasta)}`, margen, y);
    y = this.dato(doc, 'Novedades', `${datos.cantidad} · ${this.horas(datos.total_minutos)} en total`, margen, y);
    y = this.dato(doc, 'Generado', String(datos.fecha_registro || '').substring(0, 16) +
      (datos.generado_por ? ` por ${datos.generado_por}` : ''), margen, y);
    y += 3;

    // ---------- Detalle
    autoTable(doc, {
      startY: y,
      margin: { left: margen, right: margen },
      head: [['Fecha', 'Cancha', 'Horario', { content: 'Horas', styles: { halign: 'right' } }, 'Tipo', 'Observación']],
      body: (datos.detalle || []).map(d => [
        d.fecha,
        d.nombre_espacio,
        `${String(d.hora_inicial).substring(0, 5)} - ${String(d.hora_final).substring(0, 5)}`,
        this.horas(Number(d.minutos || 0)),
        d.nombre_tipo,
        d.observaciones || ''
      ]),
      styles: { fontSize: 9, cellPadding: 2, textColor: [34, 34, 34] },
      headStyles: { fillColor: this.dorado, textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [252, 248, 236] },
      columnStyles: { 0: { cellWidth: 22 }, 1: { cellWidth: 24 }, 2: { cellWidth: 26 }, 3: { cellWidth: 22, halign: 'right' } }
    });
    y = doc.lastAutoTable.finalY + 8;

    // ---------- Horas por cancha
    const porCancha = new Map<string, number>();
    (datos.detalle || []).forEach(d => porCancha.set(d.nombre_espacio, (porCancha.get(d.nombre_espacio) || 0) + Number(d.minutos || 0)));
    if (y > alto - 50) {
      doc.addPage();
      y = 20;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(this.oscuro);
    doc.text('Horas por cancha', margen, y);
    autoTable(doc, {
      startY: y + 3,
      margin: { left: margen, right: margen },
      tableWidth: 100,
      head: [['Cancha', { content: 'Horas', styles: { halign: 'right' } }]],
      body: Array.from(porCancha.entries())
        .sort((a, b) => a[0].localeCompare(b[0], 'es', { numeric: true }))
        .map(([cancha, minutos]) => [cancha, this.horas(minutos)]),
      foot: [['Total', { content: this.horas(datos.total_minutos), styles: { halign: 'right' } }]],
      styles: { fontSize: 9.5, cellPadding: 2, textColor: [34, 34, 34] },
      headStyles: { fillColor: this.dorado, textColor: [255, 255, 255], fontStyle: 'bold' },
      footStyles: { fillColor: [245, 240, 225], textColor: [34, 34, 34], fontStyle: 'bold' },
      columnStyles: { 1: { halign: 'right' } }
    });

    // ---------- Pie
    const total = doc.getNumberOfPages();
    for (let i = 1; i <= total; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(this.gris);
      doc.text(`Reporte de novedades · ${datos.nombre_lugar}`, margen, alto - 8);
      doc.text(`Página ${i} de ${total}`, ancho - margen, alto - 8, { align: 'right' });
    }
    return doc;
  }

  private iniciales(doc: any, x: number, y: number) {
    const nombre = this.institucionConfigService.getNombreInstitucion() || '';
    const iniciales = nombre.split(/\s+/).filter(Boolean).slice(0, 2).map((p: string) => p[0].toUpperCase()).join('');
    doc.setFillColor(34, 34, 34);
    doc.circle(x + 10, y + 10, 10, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...this.dorado);
    doc.text(iniciales, x + 10, y + 10, { align: 'center', baseline: 'middle' });
  }

  // Etiqueta en gris y valor a su derecha; devuelve la nueva y
  private dato(doc: any, etiqueta: string, valor: string, x: number, y: number): number {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(this.gris);
    doc.text(etiqueta, x, y);
    doc.setTextColor(this.oscuro);
    doc.text(String(valor || ''), x + 28, y);
    return y + 6;
  }

  // 150 minutos -> "2 h 30 min"
  private horas(minutos: number): string {
    const h = Math.floor(minutos / 60);
    const m = minutos % 60;
    return m === 0 ? `${h} h` : (h > 0 ? `${h} h ${m} min` : `${m} min`);
  }

  // 2026-11-07 -> 7 de noviembre de 2026
  private fechaLarga(fecha: string): string {
    const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto',
      'septiembre', 'octubre', 'noviembre', 'diciembre'];
    const [anio, mes, dia] = String(fecha).substring(0, 10).split('-').map(Number);
    return `${dia} de ${meses[mes - 1]} de ${anio}`;
  }
}
