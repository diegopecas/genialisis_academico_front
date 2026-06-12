import { Injectable } from '@angular/core';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

// Interfaces
export interface DatosCarteraPDF {
  titulo: string;
  fechaReporte: string;
  periodo: {
    fechaInicio: string;
    fechaFin: string;
  };
  resumen: {
    totalCobrado: number;
    totalRecaudado: number;
    saldoPendiente: number;
    saldoVencido: number;
    porcentajeRecaudo: number;
    cantidadCuentas: number;
    cantidadPagadas: number;
    cantidadPendientes: number;
    cantidadVencidas: number;
  };
  analisisAntiguedad: {
    label: string;
    valor: number;
    cantidad: number;
    porcentaje: number;
  }[];
  topDeudores: {
    nombre: string;
    saldo: number;
  }[];
  detalleCuentas: {
    fecha: string;
    persona: string;
    grupo: string;
    clasificacion: string;
    producto: string;
    valor: number;
    pagado: number;
    saldo: number;
    estado: string;
    diasVencimiento: number;
  }[];
  filtrosAplicados: {
    clasificacion?: string;
    producto?: string;
    grupo?: string;
    estadoPago?: string;
  };
  logoBase64?: string;
}

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
    lastAutoTable: {
      finalY: number;
    };
  }
}

@Injectable({
  providedIn: 'root'
})
export class ExportarPdfCarteraService {

  constructor() { }

  generarPDF(datos: DatosCarteraPDF): void {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'letter'
    });

    let yPos = 20;

    // Agregar logo si existe
    if (datos.logoBase64) {
      pdf.addImage(datos.logoBase64, 'PNG', 10, 10, 30, 30);
    }

    // Encabezado
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.text(datos.titulo, datos.logoBase64 ? 50 : 10, yPos);
    
    yPos += 10;
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Fecha de generación: ${datos.fechaReporte}`, datos.logoBase64 ? 50 : 10, yPos);
    
    yPos += 5;
    pdf.text(`Período: ${datos.periodo.fechaInicio} al ${datos.periodo.fechaFin}`, datos.logoBase64 ? 50 : 10, yPos);

    // Línea separadora
    yPos += 10;
    pdf.setLineWidth(0.5);
    pdf.line(10, yPos, 200, yPos);
    yPos += 10;

    // Resumen ejecutivo
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Resumen Ejecutivo', 10, yPos);
    yPos += 10;

    // Cuadros de resumen
    this.dibujarCuadrosResumen(pdf, datos.resumen, yPos);
    yPos += 40;

    // Análisis de antigüedad
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Análisis de Antigüedad de Cartera', 10, yPos);
    yPos += 8;

    this.dibujarTablaAntiguedad(pdf, datos.analisisAntiguedad, yPos);
    yPos = pdf.lastAutoTable.finalY + 10;

    // Top deudores
    if (datos.topDeudores.length > 0) {
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Top 10 Deudores', 10, yPos);
      yPos += 8;

      this.dibujarTablaTopDeudores(pdf, datos.topDeudores, yPos);
      yPos = pdf.lastAutoTable.finalY + 10;
    }

    // Nueva página para el detalle
    pdf.addPage();
    yPos = 20;

    // Título del detalle
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Detalle de Cuentas por Cobrar', 10, yPos);
    yPos += 10;

    // Filtros aplicados
    if (Object.keys(datos.filtrosAplicados).length > 0) {
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'italic');
      pdf.text('Filtros aplicados:', 10, yPos);
      yPos += 5;
      
      Object.entries(datos.filtrosAplicados).forEach(([key, value]) => {
        if (value) {
          pdf.text(`• ${this.formatearNombreFiltro(key)}: ${value}`, 15, yPos);
          yPos += 5;
        }
      });
      yPos += 5;
    }

    // Tabla de detalle
    this.dibujarTablaDetalle(pdf, datos.detalleCuentas, yPos);

    // Guardar el PDF
    pdf.save(`reporte_cartera_${new Date().getTime()}.pdf`);
  }

  private dibujarCuadrosResumen(pdf: jsPDF, resumen: any, yPos: number): void {
    const cuadros = [
      {
        titulo: 'Total Cobrado',
        valor: this.formatearMoneda(resumen.totalCobrado),
        color: [102, 126, 234]
      },
      {
        titulo: 'Total Recaudado',
        valor: this.formatearMoneda(resumen.totalRecaudado),
        color: [132, 250, 176]
      },
      {
        titulo: 'Saldo Pendiente',
        valor: this.formatearMoneda(resumen.saldoPendiente),
        color: [250, 112, 154]
      },
      {
        titulo: 'Saldo Vencido',
        valor: this.formatearMoneda(resumen.saldoVencido),
        color: [240, 147, 251]
      }
    ];

    const anchoTotal = 190;
    const anchoCuadro = anchoTotal / 4 - 5;
    let xPos = 10;

    cuadros.forEach(cuadro => {
      // Fondo del cuadro
      pdf.setFillColor(cuadro.color[0], cuadro.color[1], cuadro.color[2]);
      pdf.roundedRect(xPos, yPos, anchoCuadro, 30, 3, 3, 'F');

      // Texto
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.text(cuadro.titulo, xPos + anchoCuadro / 2, yPos + 10, { align: 'center' });

      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text(cuadro.valor, xPos + anchoCuadro / 2, yPos + 20, { align: 'center' });

      xPos += anchoCuadro + 5;
    });

    // Restaurar color de texto
    pdf.setTextColor(0, 0, 0);
  }

  private dibujarTablaAntiguedad(pdf: jsPDF, antiguedad: any[], yPos: number): void {
    const headers = ['Rango', 'Valor', 'Cantidad', 'Porcentaje'];
    const data = antiguedad.map(item => [
      item.label,
      this.formatearMoneda(item.valor),
      item.cantidad.toString(),
      `${item.porcentaje.toFixed(1)}%`
    ]);

    (pdf as any).autoTable({
      head: [headers],
      body: data,
      startY: yPos,
      styles: {
        fontSize: 9,
        cellPadding: 3
      },
      headStyles: {
        fillColor: [23, 162, 184],
        textColor: 255,
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 50, halign: 'right' },
        2: { cellWidth: 40, halign: 'center' },
        3: { cellWidth: 40, halign: 'center' }
      }
    });
  }

  private dibujarTablaTopDeudores(pdf: jsPDF, deudores: any[], yPos: number): void {
    const headers = ['#', 'Nombre', 'Saldo'];
    const data = deudores.map((deudor, index) => [
      (index + 1).toString(),
      deudor.nombre,
      this.formatearMoneda(deudor.saldo)
    ]);

    (pdf as any).autoTable({
      head: [headers],
      body: data,
      startY: yPos,
      styles: {
        fontSize: 9,
        cellPadding: 3
      },
      headStyles: {
        fillColor: [255, 193, 7],
        textColor: 0,
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [255, 253, 235]
      },
      columnStyles: {
        0: { cellWidth: 15, halign: 'center' },
        1: { cellWidth: 100 },
        2: { cellWidth: 50, halign: 'right' }
      }
    });
  }

  private dibujarTablaDetalle(pdf: jsPDF, detalle: any[], yPos: number): void {
    const headers = ['Fecha', 'Persona', 'Producto', 'Valor', 'Saldo', 'Estado'];
    const data = detalle.map(cuenta => [
      cuenta.fecha,
      cuenta.persona,
      cuenta.producto,
      this.formatearMoneda(cuenta.valor),
      this.formatearMoneda(cuenta.saldo),
      cuenta.estado
    ]);

    // Configurar colores para estados
    const bodyStyles = (data: any) => {
      if (data.row.index !== undefined) {
        const estado = detalle[data.row.index].estado;
        if (estado === 'Pagado') {
          return { fillColor: [200, 230, 201] };
        } else if (estado === 'Vencido') {
          return { fillColor: [255, 205, 210] };
        }
      }
      return {};
    };

    (pdf as any).autoTable({
      head: [headers],
      body: data,
      startY: yPos,
      styles: {
        fontSize: 8,
        cellPadding: 2
      },
      headStyles: {
        fillColor: [0, 123, 255],
        textColor: 255,
        fontStyle: 'bold'
      },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 45 },
        2: { cellWidth: 50 },
        3: { cellWidth: 30, halign: 'right' },
        4: { cellWidth: 30, halign: 'right' },
        5: { cellWidth: 25, halign: 'center' }
      },
      didParseCell: function(data: any) {
        if (data.section === 'body') {
          const estado = detalle[data.row.index]?.estado;
          if (estado === 'Pagado' && data.column.index === 5) {
            data.cell.styles.textColor = [39, 174, 96];
            data.cell.styles.fontStyle = 'bold';
          } else if (estado === 'Vencido' && data.column.index === 5) {
            data.cell.styles.textColor = [231, 76, 60];
            data.cell.styles.fontStyle = 'bold';
          }
        }
      }
    });
  }

  private formatearMoneda(valor: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(valor);
  }

  private formatearNombreFiltro(filtro: string): string {
    const nombres: { [key: string]: string } = {
      clasificacion: 'Clasificación',
      producto: 'Producto/Servicio',
      grupo: 'Grupo',
      estadoPago: 'Estado de pago'
    };
    return nombres[filtro] || filtro;
  }
}