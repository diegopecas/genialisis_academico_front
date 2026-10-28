import { Injectable } from '@angular/core';
import { jsPDF } from 'jspdf';
import { InstitucionConfigService } from './institucion-config.service';

/**
 * Datos del PDF para pagar por transferencia (GET links-pago/datos-pago/:id).
 * Lleva lo mismo del correo de aprobación más las cuentas bancarias.
 */
export interface DatosPagoPDF {
  institucion: string;
  participante: string;
  curso: string;
  fecha_inicio_clases: string | null;
  horarios: { dia: string, hora_inicial: string, hora_final: string }[];
  lineas: { detalle: string, valor: any }[];
  valor: number;
  referencia: string;
  cuentas: { nombre: string, numero_cuenta: string, descripcion: string | null }[];
  logoBase64?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ExportarPdfDatosPagoService {

  private readonly dorado = '#d4af37';
  private readonly oscuro = '#222222';
  private readonly gris = '#7f8c8d';

  constructor(private institucionConfigService: InstitucionConfigService) { }

  /** Arma el PDF y lo descarga */
  generarPDF(datos: DatosPagoPDF): void {
    this.construirDocumento(datos).save(this.nombreArchivo(datos));
  }

  /** El mismo PDF como Blob, para compartirlo con el menú nativo del dispositivo */
  generarBlob(datos: DatosPagoPDF): Blob {
    return this.construirDocumento(datos).output('blob');
  }

  nombreArchivo(datos: DatosPagoPDF): string {
    const participante = (datos.participante || 'pago').normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '');
    return `Datos_para_pagar_${participante}.pdf`;
  }

  private construirDocumento(datos: DatosPagoPDF): jsPDF {
    const doc = new jsPDF('p', 'mm', 'a4');
    const ancho = doc.internal.pageSize.getWidth();
    const alto = doc.internal.pageSize.getHeight();
    const margen = 18;
    const util = ancho - margen * 2;
    let y = 18;

    // Salta de página si lo que sigue no cabe
    const espacio = (necesario: number) => {
      if (y + necesario > alto - 20) {
        doc.addPage();
        y = 20;
      }
    };

    // ---------- Cabecera
    if (datos.logoBase64) {
      try {
        doc.addImage(datos.logoBase64, 'PNG', margen, y, 20, 20);
      } catch {
        this.iniciales(doc, datos, margen, y);
      }
    } else {
      this.iniciales(doc, datos, margen, y);
    }
    const nombreInstitucion = datos.institucion || this.institucionConfigService.getNombreInstitucion();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(this.oscuro);
    doc.text(doc.splitTextToSize(nombreInstitucion, util - 28), margen + 26, y + 8);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(this.gris);
    doc.text('Datos para el pago de la inscripción', margen + 26, y + 15);
    y += 26;

    doc.setDrawColor(this.dorado);
    doc.setLineWidth(1.2);
    doc.line(margen, y, ancho - margen, y);
    y += 10;

    // ---------- Inscripción
    this.titulo(doc, 'Inscripción', margen, y);
    y += 7;
    y = this.dato(doc, 'Participante', datos.participante, margen, y, util);
    y = this.dato(doc, 'Curso', datos.curso, margen, y, util);
    if (datos.fecha_inicio_clases) {
      y = this.dato(doc, 'Empieza el', this.fechaLarga(datos.fecha_inicio_clases), margen, y, util);
    }
    if (datos.horarios && datos.horarios.length > 0) {
      const horarios = datos.horarios
        .map(h => `${h.dia} de ${String(h.hora_inicial).substring(0, 5)} a ${String(h.hora_final).substring(0, 5)}`)
        .join(' · ');
      y = this.dato(doc, 'Horarios', horarios, margen, y, util);
    }
    y += 4;

    // ---------- Lo que va a pagar
    espacio(30);
    this.titulo(doc, 'Lo que vas a pagar', margen, y);
    y += 7;
    doc.setFontSize(10);
    (datos.lineas || []).forEach(l => {
      const lineas = doc.splitTextToSize(String(l.detalle || ''), util - 40);
      espacio(lineas.length * 5 + 3);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(this.oscuro);
      doc.text(lineas, margen, y);
      doc.text(this.pesos(l.valor), ancho - margen, y, { align: 'right' });
      y += lineas.length * 5 + 2;
      doc.setDrawColor('#eeeeee');
      doc.setLineWidth(0.2);
      doc.line(margen, y - 1, ancho - margen, y - 1);
      y += 2;
    });
    espacio(10);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Total', margen, y + 2);
    doc.text(this.pesos(datos.valor), ancho - margen, y + 2, { align: 'right' });
    y += 12;

    // ---------- Cuentas
    espacio(30);
    this.titulo(doc, 'Cómo pagar', margen, y);
    y += 7;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(this.oscuro);
    if (!datos.cuentas || datos.cuentas.length === 0) {
      doc.text('Te enviamos los datos para el pago por WhatsApp.', margen, y);
      y += 8;
    } else {
      doc.text('Haz la transferencia a cualquiera de estas cuentas:', margen, y);
      y += 7;
      datos.cuentas.forEach(c => {
        const descripcion = c.descripcion ? doc.splitTextToSize(c.descripcion, util - 10) : [];
        const altoCaja = 14 + descripcion.length * 4.5;
        espacio(altoCaja + 4);
        doc.setDrawColor(this.dorado);
        doc.setFillColor(252, 248, 236);
        doc.roundedRect(margen, y, util, altoCaja, 2.5, 2.5, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(this.oscuro);
        doc.text(c.nombre, margen + 5, y + 6);
        doc.setFont('helvetica', 'normal');
        doc.text('Cuenta ' + c.numero_cuenta, margen + 5, y + 11.5);
        if (descripcion.length > 0) {
          doc.setFontSize(9);
          doc.setTextColor(this.gris);
          doc.text(descripcion, margen + 5, y + 16);
        }
        y += altoCaja + 4;
      });
    }
    y += 2;
    espacio(14);
    doc.setFontSize(9.5);
    doc.setTextColor(this.gris);
    doc.text(doc.splitTextToSize('Cuando pagues, envía el comprobante con el nombre del participante para registrar el pago.', util), margen, y);

    // ---------- Pie
    const total = doc.getNumberOfPages();
    for (let i = 1; i <= total; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(this.gris);
      doc.text(`Referencia ${datos.referencia || ''}`, margen, alto - 10);
      doc.text(`Página ${i} de ${total}`, ancho - margen, alto - 10, { align: 'right' });
    }

    return doc;
  }

  private iniciales(doc: jsPDF, datos: DatosPagoPDF, x: number, y: number) {
    const nombre = datos.institucion || this.institucionConfigService.getNombreInstitucion() || '';
    const iniciales = nombre.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join('');
    doc.setFillColor(34, 34, 34);
    doc.circle(x + 10, y + 10, 10, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(this.dorado);
    doc.text(iniciales, x + 10, y + 10, { align: 'center', baseline: 'middle' });
  }

  private titulo(doc: jsPDF, texto: string, x: number, y: number) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(this.oscuro);
    doc.text(texto, x, y);
  }

  // Etiqueta en gris y valor a la derecha de ella; devuelve la nueva y
  private dato(doc: jsPDF, etiqueta: string, valor: string, x: number, y: number, util: number): number {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(this.gris);
    doc.text(etiqueta, x, y);
    doc.setTextColor(this.oscuro);
    const lineas = doc.splitTextToSize(String(valor || ''), util - 35);
    doc.text(lineas, x + 35, y);
    return y + lineas.length * 5 + 1.5;
  }

  private pesos(valor: any): string {
    return Number(valor || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
  }

  // 2026-11-07 -> 7 de noviembre de 2026
  private fechaLarga(fecha: string): string {
    const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto',
      'septiembre', 'octubre', 'noviembre', 'diciembre'];
    const [anio, mes, dia] = fecha.substring(0, 10).split('-').map(Number);
    return `${dia} de ${meses[mes - 1]} de ${anio}`;
  }
}
