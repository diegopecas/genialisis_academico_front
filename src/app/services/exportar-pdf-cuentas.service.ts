import { Injectable } from '@angular/core';
import { InstitucionConfigService } from './institucion-config.service';
import { jsPDF } from 'jspdf';

export interface DatosCuentasPDF {
    nombreEstudiante: string;
    numeroIdentificacion?: string;
    nombreGrupo?: string;
    logoBase64?: string;
    anioAcademico?: number;
    resumenFinanciero: {
        saldoPendiente: number;
        valorPagado: number;
        saldoVencido: number;
        estado: 'AL DÍA' | 'PENDIENTE';
    };
    tabActiva: 'movimientos' | 'pagos';
    movimientos?: Array<{
        id: number;
        fecha: string;
        concepto: string;
        valorTotal: number;
        valorPagado: number;
        saldo: number;
        estado: string;
    }>;
    movimientosHistoricosPendientes?: Array<{
        id: number;
        fecha: string;
        concepto: string;
        valorTotal: number;
        valorPagado: number;
        saldo: number;
        estado: string;
    }>;
    pagos?: Array<{
        id: number;
        fecha: string;
        acudiente: string;
        tipoPago: string;
        valorRecibido: number;
        valorAplicado: number;
        saldo: number;
        estado: string;
    }>;
    pagosHistoricos?: Array<{
        id: number;
        fecha: string;
        acudiente: string;
        tipoPago: string;
        valorRecibido: number;
        valorAplicado: number;
        saldo: number;
        estado: string;
    }>;
    filtrosAplicados?: {
        descripciones?: string[];
        seleccionManual?: boolean;
        totalSeleccionados?: number;
        totalDisponibles?: number;
    };
}

@Injectable({
    providedIn: 'root'
})
export class ExportarPdfCuentasService {
    private pdf!: jsPDF;
    private pageWidth = 210;
    private pageHeight = 297;
    private marginLeft = 20;
    private marginRight = 20;
    private marginTop = 20;
    private marginBottom = 20;
    private contentWidth = this.pageWidth - this.marginLeft - this.marginRight;
    private currentY = this.marginTop;
    private pageNumber = 1;

    private colors = {
        gold: '#d4af37',
        black: '#222222',
        darkGray: '#666666',
        lightGray: '#f8f9fa',
        primaryColor: '#2c3e50',
        secondaryColor: '#7f8c8d',
        accentColor: '#3498db',
        greenColor: '#27ae60',
        redColor: '#e74c3c'
    };

    constructor(private institucionConfigService: InstitucionConfigService) { }

    generarPDF(datos: DatosCuentasPDF): void {
        this.pdf = new jsPDF({
            orientation: 'p',
            unit: 'mm',
            format: 'a4'
        });

        this.currentY = this.marginTop;
        this.pageNumber = 1;
        this.pdf.setFont('helvetica', 'normal');

        this.generarEncabezado(datos);
        this.generarDatosEstudiante(datos);
        this.generarResumenFinanciero(datos);
        this.generarFiltrosAplicados(datos);

        if (datos.tabActiva === 'movimientos') {
            // Primero: pendientes de años anteriores (si hay)
            if (datos.movimientosHistoricosPendientes && datos.movimientosHistoricosPendientes.length > 0) {
                this.generarTablaMovimientos(datos.movimientosHistoricosPendientes, 'Movimientos pendientes de años anteriores');
                this.currentY += 6;
            }
            // Segundo: movimientos del año actual (o seleccionados)
            if (datos.movimientos && datos.movimientos.length > 0) {
                let tituloMovimientos: string;
                if (datos.filtrosAplicados?.seleccionManual) {
                    tituloMovimientos = `Movimientos seleccionados (${datos.filtrosAplicados.totalSeleccionados} de ${datos.filtrosAplicados.totalDisponibles})`;
                } else {
                    tituloMovimientos = datos.anioAcademico ? `Movimientos del año ${datos.anioAcademico}` : 'Movimientos financieros';
                }
                this.generarTablaMovimientos(datos.movimientos, tituloMovimientos);
            }
        } else if (datos.tabActiva === 'pagos') {
            // Primero: pagos de años anteriores (si hay)
            if (datos.pagosHistoricos && datos.pagosHistoricos.length > 0) {
                this.generarTablaPagos(datos.pagosHistoricos, 'Pagos de años anteriores');
                this.currentY += 6;
            }
            // Segundo: pagos del año actual
            if (datos.pagos && datos.pagos.length > 0) {
                const tituloAnio = datos.anioAcademico ? `Pagos del año ${datos.anioAcademico}` : 'Historial de pagos';
                this.generarTablaPagos(datos.pagos, tituloAnio);
            }
        }

        const nombreArchivo = `Estado_Cuenta_${datos.nombreEstudiante.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
        this.pdf.save(nombreArchivo);
    }

    private generarEncabezado(datos: DatosCuentasPDF): void {
        const blackRgb = this.hexToRgb(this.colors.black);
        const grayRgb = this.hexToRgb(this.colors.darkGray);
        const goldRgb = this.hexToRgb(this.colors.gold);

        const nombreInstitucion = this.institucionConfigService.getNombreInstitucion().toUpperCase();
        const nitInstitucion = this.institucionConfigService.getNitInstitucion();

        const logoSize = 25;
        const logoX = this.marginLeft + 5;

        if (datos.logoBase64) {
            try {
                const logoY = this.currentY;
                this.pdf.addImage(datos.logoBase64, 'PNG', logoX, logoY, logoSize, logoSize);
            } catch (error) {
                console.error('Error al agregar el logo:', error);
                this.dibujarLogoFallback();
            }
        } else {
            this.dibujarLogoFallback();
        }

        this.pdf.setFontSize(13);
        this.pdf.setFont('helvetica', 'bold');
        this.pdf.setTextColor(blackRgb.r, blackRgb.g, blackRgb.b);

        const anchoNombre = this.pdf.getTextWidth(nombreInstitucion);
        const xNombreCentrado = (this.pageWidth - anchoNombre) / 2;
        this.pdf.text(nombreInstitucion, xNombreCentrado, this.currentY + 10);

        this.currentY += 14;

        this.pdf.setFontSize(9);
        this.pdf.setFont('helvetica', 'normal');
        this.pdf.setTextColor(grayRgb.r, grayRgb.g, grayRgb.b);

        const resolucion = this.institucionConfigService.getResolucion();
        const textoSubtitulo = resolucion && resolucion !== 'Por definir' && resolucion.trim() !== ''
            ? resolucion
            : `NIT: ${nitInstitucion}`;

        const anchoSubtitulo = this.pdf.getTextWidth(textoSubtitulo);
        const xSubtituloCentrado = (this.pageWidth - anchoSubtitulo) / 2;
        this.pdf.text(textoSubtitulo, xSubtituloCentrado, this.currentY);

        this.currentY += 8;

        this.pdf.setFontSize(13);
        this.pdf.setFont('helvetica', 'bold');
        this.pdf.setTextColor(blackRgb.r, blackRgb.g, blackRgb.b);

        const tituloDoc = 'ESTADO DE CUENTA';
        const anchoTitulo = this.pdf.getTextWidth(tituloDoc);
        const xTituloCentrado = (this.pageWidth - anchoTitulo) / 2;
        this.pdf.text(tituloDoc, xTituloCentrado, this.currentY);

        this.currentY += 8;

        this.pdf.setFontSize(9);
        this.pdf.setFont('helvetica', 'normal');
        this.pdf.setTextColor(grayRgb.r, grayRgb.g, grayRgb.b);

        const fechaActual = new Date();
        const fechaTexto = `Fecha: ${fechaActual.toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })}`;
        const fechaWidth = this.pdf.getTextWidth(fechaTexto);
        const xFechaCentrada = (this.pageWidth - fechaWidth) / 2;
        this.pdf.text(fechaTexto, xFechaCentrada, this.currentY);

        this.currentY += 6;
        this.pdf.setDrawColor(goldRgb.r, goldRgb.g, goldRgb.b);
        this.pdf.setLineWidth(2);
        this.pdf.line(this.marginLeft, this.currentY, this.pageWidth - this.marginRight, this.currentY);

        this.currentY += 10;
    }

    private generarDatosEstudiante(datos: DatosCuentasPDF): void {
        const grayBgRgb = this.hexToRgb(this.colors.lightGray);
        const blackRgb = this.hexToRgb(this.colors.black);
        const darkGrayRgb = this.hexToRgb(this.colors.darkGray);

        this.pdf.setFillColor(grayBgRgb.r, grayBgRgb.g, grayBgRgb.b);
        this.pdf.rect(this.marginLeft, this.currentY, 80, 25, 'F');

        this.pdf.setFontSize(11);
        this.pdf.setFont('helvetica', 'bold');
        this.pdf.setTextColor(blackRgb.r, blackRgb.g, blackRgb.b);
        this.pdf.text('Datos del Estudiante', this.marginLeft + 3, this.currentY + 6);

        this.pdf.setFontSize(9);
        this.pdf.setFont('helvetica', 'normal');
        this.pdf.setTextColor(darkGrayRgb.r, darkGrayRgb.g, darkGrayRgb.b);
        this.pdf.text(`Nombre: ${datos.nombreEstudiante}`, this.marginLeft + 3, this.currentY + 12);
        
        if (datos.numeroIdentificacion) {
            this.pdf.text(`Documento: ${datos.numeroIdentificacion}`, this.marginLeft + 3, this.currentY + 17);
        }
        
        if (datos.nombreGrupo) {
            this.pdf.text(`Grupo: ${datos.nombreGrupo}`, this.marginLeft + 3, this.currentY + 22);
        }

        this.currentY += 28;
    }

    private generarResumenFinanciero(datos: DatosCuentasPDF): void {
        const grayBgRgb = this.hexToRgb(this.colors.lightGray);
        const blackRgb = this.hexToRgb(this.colors.black);
        const darkGrayRgb = this.hexToRgb(this.colors.darkGray);
        const greenRgb = this.hexToRgb(this.colors.greenColor);
        const redRgb = this.hexToRgb(this.colors.redColor);

        this.pdf.setFillColor(grayBgRgb.r, grayBgRgb.g, grayBgRgb.b);
        this.pdf.rect(this.marginLeft, this.currentY, this.contentWidth, 25, 'F');

        this.pdf.setFontSize(11);
        this.pdf.setFont('helvetica', 'bold');
        this.pdf.setTextColor(blackRgb.r, blackRgb.g, blackRgb.b);
        this.pdf.text('Resumen Financiero', this.marginLeft + 3, this.currentY + 6);

        const estadoX = this.marginLeft + this.contentWidth - 3;
        if (datos.resumenFinanciero.estado === 'AL DÍA') {
            this.pdf.setTextColor(greenRgb.r, greenRgb.g, greenRgb.b);
        } else {
            this.pdf.setTextColor(redRgb.r, redRgb.g, redRgb.b);
        }
        this.pdf.text(`Estado: ${datos.resumenFinanciero.estado}`, estadoX, this.currentY + 6, { align: 'right' });

        this.pdf.setFontSize(9);
        this.pdf.setFont('helvetica', 'normal');
        this.pdf.setTextColor(darkGrayRgb.r, darkGrayRgb.g, darkGrayRgb.b);

        const col1X = this.marginLeft + 3;
        const col2X = this.marginLeft + 65;
        const col3X = this.marginLeft + 125;

        this.pdf.text(`Saldo Pendiente: ${this.formatearMoneda(datos.resumenFinanciero.saldoPendiente)}`, col1X, this.currentY + 15);
        this.pdf.text(`Valor Pagado: ${this.formatearMoneda(datos.resumenFinanciero.valorPagado)}`, col2X, this.currentY + 15);
        this.pdf.text(`Saldo Vencido: ${this.formatearMoneda(datos.resumenFinanciero.saldoVencido)}`, col3X, this.currentY + 15);

        this.currentY += 28;
    }

    private generarFiltrosAplicados(datos: DatosCuentasPDF): void {
        if (!datos.filtrosAplicados) return;

        const filtros = datos.filtrosAplicados;
        const grayRgb = this.hexToRgb(this.colors.darkGray);
        const accentRgb = this.hexToRgb(this.colors.accentColor);

        this.pdf.setFontSize(8);
        this.pdf.setFont('helvetica', 'italic');

        let partes: string[] = [];

        // Selección manual de registros
        if (filtros.seleccionManual && filtros.totalSeleccionados) {
            partes.push(`Selección específica de cuentas de productos o servicios (${filtros.totalSeleccionados} de ${filtros.totalDisponibles})`);
        }

        // Descripciones de filtros generadas en el componente
        if (filtros.descripciones && filtros.descripciones.length > 0) {
            partes.push(...filtros.descripciones);
        }

        let filtrosTexto: string;
        if (partes.length === 0) {
            filtrosTexto = 'Filtros aplicados: Ninguno';
        } else {
            filtrosTexto = 'Filtros aplicados: ' + partes.join(' | ');
        }

        // Si hay selección manual, destacar en azul
        if (filtros.seleccionManual) {
            this.pdf.setTextColor(accentRgb.r, accentRgb.g, accentRgb.b);
        } else {
            this.pdf.setTextColor(grayRgb.r, grayRgb.g, grayRgb.b);
        }

        const maxWidth = this.contentWidth;
        const lineas = this.pdf.splitTextToSize(filtrosTexto, maxWidth);
        this.pdf.text(lineas, this.marginLeft, this.currentY);
        this.currentY += (lineas.length * 4) + 4;

        // Restaurar color
        this.pdf.setTextColor(grayRgb.r, grayRgb.g, grayRgb.b);
    }

    private generarTablaMovimientos(movimientos: any[], titulo: string): void {
        const primaryRgb = this.hexToRgb(this.colors.primaryColor);
        const lightGrayRgb = this.hexToRgb(this.colors.lightGray);

        // Verificar espacio para título + encabezado + al menos 1 fila
        if (this.currentY > 245) {
            this.agregarPiePagina();
            this.pdf.addPage();
            this.currentY = this.marginTop;
            this.pageNumber++;
        }

        this.pdf.setFontSize(11);
        this.pdf.setFont('helvetica', 'bold');
        this.pdf.setTextColor(0, 0, 0);
        this.pdf.text(titulo, this.marginLeft, this.currentY);

        this.currentY += 8;

        const headers = ['#', 'Fecha', 'Concepto', 'Valor Total', 'Valor Pagado', 'Saldo', 'Estado'];
        const columnWidths = [8, 22, 52, 25, 25, 22, 20];

        this.dibujarEncabezadoTabla(headers, columnWidths, primaryRgb);

        this.pdf.setTextColor(0, 0, 0);
        this.pdf.setFont('helvetica', 'normal');
        this.pdf.setFontSize(7);

        const totalValorTotal = movimientos.reduce((sum: number, mov: any) => sum + mov.valorTotal, 0);
        const totalValorPagado = movimientos.reduce((sum: number, mov: any) => sum + mov.valorPagado, 0);
        const totalSaldo = movimientos.reduce((sum: number, mov: any) => sum + mov.saldo, 0);

        movimientos.forEach((mov, index) => {
            if (this.currentY > 260) {
                this.agregarPiePagina();
                this.pdf.addPage();
                this.currentY = this.marginTop;
                this.pageNumber++;
                this.dibujarEncabezadoTabla(headers, columnWidths, primaryRgb);
                this.pdf.setTextColor(0, 0, 0);
                this.pdf.setFont('helvetica', 'normal');
                this.pdf.setFontSize(7);
            }

            if (index % 2 === 0) {
                this.pdf.setFillColor(lightGrayRgb.r, lightGrayRgb.g, lightGrayRgb.b);
                this.pdf.rect(this.marginLeft, this.currentY, this.contentWidth, 8, 'F');
            }

            let currentX = this.marginLeft + 2;

            this.pdf.text(String(mov.id), currentX, this.currentY + 5);
            currentX += columnWidths[0];

            this.pdf.text(mov.fecha, currentX, this.currentY + 5);
            currentX += columnWidths[1];

            const concepto = this.truncarTexto(mov.concepto, 45);
            this.pdf.text(concepto, currentX, this.currentY + 5);
            currentX += columnWidths[2];

            this.pdf.text(this.formatearMoneda(mov.valorTotal), currentX + columnWidths[3] - 2, this.currentY + 5, { align: 'right' });
            currentX += columnWidths[3];

            this.pdf.text(this.formatearMoneda(mov.valorPagado), currentX + columnWidths[4] - 2, this.currentY + 5, { align: 'right' });
            currentX += columnWidths[4];

            this.pdf.text(this.formatearMoneda(mov.saldo), currentX + columnWidths[5] - 2, this.currentY + 5, { align: 'right' });
            currentX += columnWidths[5];

            const estadoMov = this.truncarTexto(mov.estado, 15);
            
            if (estadoMov.toLowerCase().includes('pagado')) {
                const greenRgb = this.hexToRgb(this.colors.greenColor);
                this.pdf.setTextColor(greenRgb.r, greenRgb.g, greenRgb.b);
            } else if (estadoMov.toLowerCase().includes('vencido')) {
                const redRgb = this.hexToRgb(this.colors.redColor);
                this.pdf.setTextColor(redRgb.r, redRgb.g, redRgb.b);
            } else {
                const accentRgb = this.hexToRgb(this.colors.accentColor);
                this.pdf.setTextColor(accentRgb.r, accentRgb.g, accentRgb.b);
            }
            
            this.pdf.text(estadoMov, currentX, this.currentY + 5);
            this.pdf.setTextColor(0, 0, 0);

            this.currentY += 8;
        });

        // Fila de totales
        this.currentY += 2;
        
        this.pdf.setFillColor(lightGrayRgb.r, lightGrayRgb.g, lightGrayRgb.b);
        this.pdf.rect(this.marginLeft, this.currentY, this.contentWidth, 10, 'F');

        this.pdf.setFont('helvetica', 'bold');
        this.pdf.setFontSize(8);
        this.pdf.setTextColor(0, 0, 0);

        let totalesX = this.marginLeft + 2;
        
        totalesX += columnWidths[0] + columnWidths[1];
        
        this.pdf.text('TOTALES:', totalesX, this.currentY + 6);
        totalesX += columnWidths[2];

        this.pdf.text(this.formatearMoneda(totalValorTotal), totalesX + columnWidths[3] - 2, this.currentY + 6, { align: 'right' });
        totalesX += columnWidths[3];

        this.pdf.text(this.formatearMoneda(totalValorPagado), totalesX + columnWidths[4] - 2, this.currentY + 6, { align: 'right' });
        totalesX += columnWidths[4];

        this.pdf.text(this.formatearMoneda(totalSaldo), totalesX + columnWidths[5] - 2, this.currentY + 6, { align: 'right' });

        this.currentY += 10;

        this.agregarPiePagina();
    }

    private generarTablaPagos(pagos: any[], titulo: string): void {
        const primaryRgb = this.hexToRgb(this.colors.primaryColor);
        const lightGrayRgb = this.hexToRgb(this.colors.lightGray);

        // Verificar espacio
        if (this.currentY > 245) {
            this.agregarPiePagina();
            this.pdf.addPage();
            this.currentY = this.marginTop;
            this.pageNumber++;
        }

        this.pdf.setFontSize(11);
        this.pdf.setFont('helvetica', 'bold');
        this.pdf.setTextColor(0, 0, 0);
        this.pdf.text(titulo, this.marginLeft, this.currentY);

        this.currentY += 8;

        const headers = ['#', 'Fecha', 'Acudiente', 'Tipo', 'Recibido', 'Aplicado', 'Saldo', 'Estado'];
        const columnWidths = [8, 20, 40, 22, 22, 22, 22, 18];

        this.dibujarEncabezadoTabla(headers, columnWidths, primaryRgb);

        this.pdf.setTextColor(0, 0, 0);
        this.pdf.setFont('helvetica', 'normal');
        this.pdf.setFontSize(7);

        const totalRecibido = pagos.reduce((sum: number, pago: any) => sum + pago.valorRecibido, 0);
        const totalAplicado = pagos.reduce((sum: number, pago: any) => sum + pago.valorAplicado, 0);
        const totalSaldoPagos = pagos.reduce((sum: number, pago: any) => sum + pago.saldo, 0);

        pagos.forEach((pago, index) => {
            if (this.currentY > 260) {
                this.agregarPiePagina();
                this.pdf.addPage();
                this.currentY = this.marginTop;
                this.pageNumber++;
                this.dibujarEncabezadoTabla(headers, columnWidths, primaryRgb);
                this.pdf.setTextColor(0, 0, 0);
                this.pdf.setFont('helvetica', 'normal');
                this.pdf.setFontSize(7);
            }

            if (index % 2 === 0) {
                this.pdf.setFillColor(lightGrayRgb.r, lightGrayRgb.g, lightGrayRgb.b);
                this.pdf.rect(this.marginLeft, this.currentY, this.contentWidth, 8, 'F');
            }

            let currentX = this.marginLeft + 2;

            this.pdf.text(String(pago.id), currentX, this.currentY + 5);
            currentX += columnWidths[0];

            this.pdf.text(pago.fecha, currentX, this.currentY + 5);
            currentX += columnWidths[1];

            const acudiente = this.truncarTexto(pago.acudiente, 35);
            this.pdf.text(acudiente, currentX, this.currentY + 5);
            currentX += columnWidths[2];

            const tipo = this.truncarTexto(pago.tipoPago, 18);
            this.pdf.text(tipo, currentX, this.currentY + 5);
            currentX += columnWidths[3];

            this.pdf.text(this.formatearMoneda(pago.valorRecibido), currentX + columnWidths[4] - 2, this.currentY + 5, { align: 'right' });
            currentX += columnWidths[4];

            this.pdf.text(this.formatearMoneda(pago.valorAplicado), currentX + columnWidths[5] - 2, this.currentY + 5, { align: 'right' });
            currentX += columnWidths[5];

            this.pdf.text(this.formatearMoneda(pago.saldo), currentX + columnWidths[6] - 2, this.currentY + 5, { align: 'right' });
            currentX += columnWidths[6];

            const estadoPago = this.truncarTexto(pago.estado, 15);
            
            if (estadoPago.toLowerCase().includes('aplicado') || estadoPago.toLowerCase().includes('completo')) {
                const greenRgb = this.hexToRgb(this.colors.greenColor);
                this.pdf.setTextColor(greenRgb.r, greenRgb.g, greenRgb.b);
            } else if (estadoPago.toLowerCase().includes('pendiente')) {
                const accentRgb = this.hexToRgb(this.colors.accentColor);
                this.pdf.setTextColor(accentRgb.r, accentRgb.g, accentRgb.b);
            } else {
                const redRgb = this.hexToRgb(this.colors.redColor);
                this.pdf.setTextColor(redRgb.r, redRgb.g, redRgb.b);
            }
            
            this.pdf.text(estadoPago, currentX, this.currentY + 5);
            this.pdf.setTextColor(0, 0, 0);

            this.currentY += 8;
        });

        // Fila de totales
        this.currentY += 2;

        this.pdf.setFillColor(lightGrayRgb.r, lightGrayRgb.g, lightGrayRgb.b);
        this.pdf.rect(this.marginLeft, this.currentY, this.contentWidth, 10, 'F');

        this.pdf.setFont('helvetica', 'bold');
        this.pdf.setFontSize(8);
        this.pdf.setTextColor(0, 0, 0);

        let totalesX = this.marginLeft + 2;
        totalesX += columnWidths[0] + columnWidths[1];

        this.pdf.text('TOTALES:', totalesX, this.currentY + 6);
        totalesX += columnWidths[2] + columnWidths[3];

        this.pdf.text(this.formatearMoneda(totalRecibido), totalesX + columnWidths[4] - 2, this.currentY + 6, { align: 'right' });
        totalesX += columnWidths[4];

        this.pdf.text(this.formatearMoneda(totalAplicado), totalesX + columnWidths[5] - 2, this.currentY + 6, { align: 'right' });
        totalesX += columnWidths[5];

        this.pdf.text(this.formatearMoneda(totalSaldoPagos), totalesX + columnWidths[6] - 2, this.currentY + 6, { align: 'right' });

        this.currentY += 10;

        this.agregarPiePagina();
    }

    private dibujarEncabezadoTabla(headers: string[], columnWidths: number[], primaryRgb: any): void {
        this.pdf.setFillColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
        this.pdf.rect(this.marginLeft, this.currentY, this.contentWidth, 8, 'F');

        this.pdf.setTextColor(255, 255, 255);
        this.pdf.setFontSize(8);
        this.pdf.setFont('helvetica', 'bold');

        let currentX = this.marginLeft + 2;
        headers.forEach((header, i) => {
            this.pdf.text(header, currentX, this.currentY + 5);
            currentX += columnWidths[i];
        });

        this.currentY += 8;
    }

    private dibujarLogoFallback(): void {
        const grayRgb = this.hexToRgb('#e0e0e0');
        const blackRgb = this.hexToRgb(this.colors.black);

        this.pdf.setFillColor(grayRgb.r, grayRgb.g, grayRgb.b);
        this.pdf.circle(this.marginLeft + 17, this.currentY + 12, 10, 'F');

        this.pdf.setFontSize(14);
        this.pdf.setFont('helvetica', 'bold');
        this.pdf.setTextColor(blackRgb.r, blackRgb.g, blackRgb.b);
        this.pdf.text('LL', this.marginLeft + 13, this.currentY + 16);
    }

    private agregarPiePagina(): void {
        const grayRgb = this.hexToRgb(this.colors.darkGray);

        this.pdf.setFontSize(8);
        this.pdf.setFont('helvetica', 'normal');
        this.pdf.setTextColor(grayRgb.r, grayRgb.g, grayRgb.b);

        const textoIzq = `Generado el ${new Date().toLocaleDateString('es-CO')}`;
        const textoDer = `Página ${this.pageNumber}`;

        this.pdf.text(textoIzq, this.marginLeft, this.pageHeight - 10);
        this.pdf.text(textoDer, this.pageWidth - this.marginRight, this.pageHeight - 10, { align: 'right' });
    }

    private hexToRgb(hex: string): { r: number; g: number; b: number } {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 0, g: 0, b: 0 };
    }

    private truncarTexto(texto: string, maxLength: number): string {
        if (!texto) return '-';
        return texto.length > maxLength ? texto.substring(0, maxLength - 3) + '...' : texto;
    }

    private formatearMoneda(valor: number): string {
        if (!valor && valor !== 0) {
            return '$ 0';
        }
        const valorFormateado = Math.round(valor).toLocaleString('es-CO');
        return `$ ${valorFormateado}`;
    }
}