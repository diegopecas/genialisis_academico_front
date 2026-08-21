import { Injectable } from '@angular/core';
import { InstitucionConfigService } from './institucion-config.service';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface DatosComprobanteColaboradorPDF {
  pago: any;
  colaborador: any;
  tipoPago: any;
  fechaGeneracion: Date;
  logoBase64?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ExportarPdfComprobanteColaboradorService {

  constructor(private institucionConfigService: InstitucionConfigService) { }

  generarPDF(datos: DatosComprobanteColaboradorPDF): void {
    const doc = new jsPDF();
    
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;

    // Logo (si existe)
    if (datos.logoBase64) {
      try {
        doc.addImage(datos.logoBase64, 'PNG', margin, margin, 25, 25);
      } catch (error) {
        console.error('Error al agregar logo:', error);
      }
    } else {
      // Sin logo se dibuja un círculo con las iniciales de la institución, en
      // lugar de dejar el espacio vacío.
      doc.setFillColor(34, 34, 34);
      doc.circle(margin + 12, margin + 12, 12, 'F');
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(212, 175, 55);
      doc.text(this.obtenerIniciales(this.institucionConfigService.getNombreInstitucion()),
        margin + 12, margin + 12, { align: 'center', baseline: 'middle' });
      doc.setTextColor(0);
    }

    // Encabezado institución
    const nombreInstitucion = this.institucionConfigService.getNombreInstitucion();
    const direccionInstitucion = this.institucionConfigService.getDireccionInstitucion();
    const nitInstitucion = this.institucionConfigService.getNitInstitucion();

    // La cabecera se reparte en dos zonas que no se pisan: la institución a la
    // izquierda y el título con la fecha a la derecha. Antes las dos escribían
    // sin límite de ancho y con nombres largos el texto se montaba encima.
    const xIzquierda = margin + 30;
    const tituloX = pageWidth - margin;
    const anchoDerecha = 58;
    const anchoIzquierda = tituloX - anchoDerecha - xIzquierda - 4;

    // El nombre se parte en varias líneas y baja de tamaño si sigue sin caber.
    let tamanoNombre = 16;
    let lineasNombre: string[] = [];

    doc.setFont('helvetica', 'bold');
    do {
      doc.setFontSize(tamanoNombre);
      lineasNombre = doc.splitTextToSize(nombreInstitucion, anchoIzquierda);
      if (lineasNombre.length <= 2) {
        break;
      }
      tamanoNombre -= 1;
    } while (tamanoNombre > 9);

    doc.setFontSize(tamanoNombre);
    let yNombre = margin + 8;
    lineasNombre.slice(0, 2).forEach((linea: string) => {
      doc.text(linea, xIzquierda, yNombre);
      yNombre += tamanoNombre * 0.42;
    });

    // La dirección y el NIT arrancan debajo del nombre, no en una posición
    // fija: si el nombre ocupó dos líneas, bajan con él.
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const lineasDireccion = doc.splitTextToSize(direccionInstitucion, anchoIzquierda);
    doc.text(lineasDireccion[0], xIzquierda, yNombre + 2);
    doc.text(`NIT: ${nitInstitucion}`, xIzquierda, yNombre + 7);

    // Título del comprobante (derecha)
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('COMPROBANTE DE PAGO', tituloX, margin + 7, { align: 'right' });

    // El numero de comprobante queda oculto a proposito. Antes se imprimia el
    // id, que desde la migracion a UUID es una cadena larga que no sirve como
    // consecutivo ni se puede dictar por telefono. Se vuelve a mostrar cuando
    // exista un numero de verdad por tenant.
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Fecha: ${this.formatearFecha(datos.pago.fecha)}`, tituloX, margin + 13, { align: 'right' });

    // Línea separadora
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, margin + 28, pageWidth - margin, margin + 28);

    let yPosition = margin + 38;

    // Sección: Datos del Colaborador
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Datos del Colaborador', margin, yPosition);
    yPosition += 7;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Nombre: ${datos.colaborador.nombre}`, margin + 5, yPosition);
    yPosition += 6;
    doc.text(`Documento: ${datos.colaborador.documento}`, margin + 5, yPosition);
    yPosition += 6;
    
    if (datos.colaborador.cargo) {
      doc.text(`Cargo: ${datos.colaborador.cargo}`, margin + 5, yPosition);
      yPosition += 6;
    }
    
    if (datos.colaborador.fecha_ingreso) {
      doc.text(`Fecha de Ingreso: ${this.formatearFechaCorta(datos.colaborador.fecha_ingreso)}`, margin + 5, yPosition);
      yPosition += 6;
    }

    yPosition += 5;

    // Sección: Datos del Pago
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Datos del Pago', margin, yPosition);
    yPosition += 7;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Tipo de Pago: ${datos.tipoPago.nombre}`, margin + 5, yPosition);
    yPosition += 6;
    
    if (datos.pago.referencia_bancaria) {
      doc.text(`Referencia: ${datos.pago.referencia_bancaria}`, margin + 5, yPosition);
      yPosition += 6;
    }
    
    doc.text(`Valor Recibido: ${this.formatearMoneda(datos.pago.valor_recibido)}`, margin + 5, yPosition);
    yPosition += 10;

    // Tabla de cuentas aplicadas
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Detalle de Pago', margin, yPosition);
    yPosition += 5;

    const cuentasData = datos.pago.cuentas_aplicadas.map((cuenta: any) => [
      this.formatearFechaCorta(cuenta.fecha_cuenta || cuenta.fecha),
      cuenta.nombre_producto_servicio,
      this.formatearMoneda(cuenta.valor),
      this.formatearMoneda(cuenta.valor_aplicado),
      this.formatearMoneda(cuenta.valor - cuenta.valor_aplicado)
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [['Fecha', 'Concepto', 'Valor Total', 'Valor Aplicado', 'Saldo Pendiente']],
      body: cuentasData,
      theme: 'striped',
      headStyles: {
        fillColor: [74, 145, 201],
        textColor: 255,
        fontStyle: 'bold'
      },
      styles: {
        fontSize: 9,
        cellPadding: 3
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 25 },
        1: { halign: 'left' },
        2: { halign: 'right', cellWidth: 30 },
        3: { halign: 'right', cellWidth: 30 },
        4: { halign: 'right', cellWidth: 30 }
      },
      margin: { left: margin, right: margin }
    });

    // Obtener la posición Y después de la tabla
    const finalY = (doc as any).lastAutoTable.finalY || yPosition + 40;
    yPosition = finalY + 10;

    // Resumen de totales
    const totalAplicado = datos.pago.cuentas_aplicadas.reduce(
      (sum: number, cuenta: any) => sum + cuenta.valor_aplicado, 0
    );

    const boxX = pageWidth - margin - 70;
    const boxY = yPosition;
    const boxWidth = 70;
    const boxHeight = datos.pago.saldo > 0 ? 30 : 20;

    doc.setDrawColor(200, 200, 200);
    doc.setFillColor(248, 249, 250);
    doc.rect(boxX, boxY, boxWidth, boxHeight, 'FD');

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    
    let boxYPosition = boxY + 7;
    doc.text('Valor Recibido:', boxX + 3, boxYPosition);
    doc.text(this.formatearMoneda(datos.pago.valor_recibido), boxX + boxWidth - 3, boxYPosition, { align: 'right' });
    
    boxYPosition += 7;
    doc.text('Valor Aplicado:', boxX + 3, boxYPosition);
    doc.text(this.formatearMoneda(totalAplicado), boxX + boxWidth - 3, boxYPosition, { align: 'right' });
    
    if (datos.pago.saldo > 0) {
      boxYPosition += 7;
      doc.setTextColor(39, 174, 96);
      doc.text('Saldo a Favor:', boxX + 3, boxYPosition);
      doc.text(this.formatearMoneda(datos.pago.saldo), boxX + boxWidth - 3, boxYPosition, { align: 'right' });
      doc.setTextColor(0, 0, 0);
    }

    yPosition = boxY + boxHeight + 10;

    // Observaciones (si existen)
    if (datos.pago.observaciones) {
      yPosition += 5;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Observaciones:', margin, yPosition);
      yPosition += 7;
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      const splitObservaciones = doc.splitTextToSize(datos.pago.observaciones, pageWidth - (2 * margin));
      doc.text(splitObservaciones, margin, yPosition);
      yPosition += (splitObservaciones.length * 5) + 5;
    }

    // Firmas
    if (yPosition > pageHeight - 60) {
      doc.addPage();
      yPosition = margin + 20;
    } else {
      yPosition += 15;
    }

    const firmaWidth = 70;
    const firma1X = margin + 20;
    const firma2X = pageWidth - margin - firmaWidth - 20;

    // Firma 1: Recibido por
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(datos.pago.nombre_completo_usuario_registro || '', firma1X + (firmaWidth / 2), yPosition, { align: 'center' });
    doc.line(firma1X, yPosition + 3, firma1X + firmaWidth, yPosition + 3);
    doc.setFont('helvetica', 'bold');
    doc.text('Recibido por', firma1X + (firmaWidth / 2), yPosition + 8, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Nombre y firma', firma1X + (firmaWidth / 2), yPosition + 13, { align: 'center' });

    // Firma 2: Aprobado por
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(datos.pago.nombre_completo_usuario_contable || 'Pendiente', firma2X + (firmaWidth / 2), yPosition, { align: 'center' });
    doc.line(firma2X, yPosition + 3, firma2X + firmaWidth, yPosition + 3);
    doc.setFont('helvetica', 'bold');
    doc.text('Aprobado por', firma2X + (firmaWidth / 2), yPosition + 8, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Nombre y firma', firma2X + (firmaWidth / 2), yPosition + 13, { align: 'center' });

    // Pie de página
    yPosition = pageHeight - margin - 10;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(128, 128, 128);
    doc.text('Este comprobante es válido como soporte de pago. Conserve este documento.', pageWidth / 2, yPosition, { align: 'center' });
    
    yPosition += 5;
    const fechaGeneracion = new Date();
    const textoFecha = `Generado el ${fechaGeneracion.toLocaleDateString('es-CO')} a las ${fechaGeneracion.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}`;
    doc.text(textoFecha, pageWidth / 2, yPosition, { align: 'center' });

    // Guardar PDF
    doc.save(`Comprobante_Pago_${datos.pago.id}_Colaborador.pdf`);
  }

  private formatearMoneda(valor: number): string {
    return valor.toLocaleString('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    });
  }

  private formatearFecha(fechaStr: string): string {
    const fecha = new Date(fechaStr);
    return fecha.toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  private formatearFechaCorta(fechaStr: string): string {
    if (!fechaStr) return '';
    try {
      const soloFecha = fechaStr.split('T')[0];
      const [año, mes, dia] = soloFecha.split('-');
      return `${dia}/${mes}/${año}`;
    } catch (error) {
      return '';
    }
  }

  /**
   * Iniciales para el círculo cuando no hay logo: la primera letra de las dos
   * primeras palabras largas del nombre de la institución.
   */
  private obtenerIniciales(nombre: string): string {
    const palabras = String(nombre || '')
      .split(/\s+/)
      .filter((p: string) => p.length > 2);

    if (palabras.length === 0) {
      return 'G';
    }

    return palabras.slice(0, 2).map((p: string) => p.charAt(0).toUpperCase()).join('');
  }
}