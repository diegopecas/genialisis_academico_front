import { Injectable } from '@angular/core';
import { InstitucionConfigService } from './institucion-config.service';
import { jsPDF } from 'jspdf';

export interface DatosObservacionesPDF {
    nombreEstudiante: string;
    numeroIdentificacion?: string;
    nombreGrupo?: string;
    logoBase64?: string;
    anioAcademico?: number;
    subTabActivo?: 'actual' | 'historico';
    observacionesOriginales: Array<{
        id: string;
        fecha: string;
        fechaFormateada?: string;
        descripcion: string;
        id_tipo_observacion_estudiante: string;
        nombre_tipo_observacion?: string;
        nombre_usuario?: string;
        id_estudiante_afectado?: string;
        nombre_estudiante_afectado?: string;
    }>;
    observacionesFiltradas: Array<any>;
    periodoObservaciones: string;
    filtrosAplicados?: {
        tipos?: string[];
        fechas?: string[];
        usuarios?: string[];
        busqueda?: string;
    };
}

@Injectable({
    providedIn: 'root'
})
export class ExportarPdfObservacionesService {
    private pdf!: jsPDF;
    private pageWidth = 210;
    private pageHeight = 297;
    private marginLeft = 20;
    private marginRight = 20;
    private marginTop = 20;
    private marginBottom = 20;
    private contentWidth = this.pageWidth - this.marginLeft - this.marginRight;
    private currentY = this.marginTop;
    private lineHeight = 7;
    private pageNumber = 1;

    // Colores corporativos
    private colors = {
        gold: '#d4af37',
        black: '#222222',
        darkGray: '#666666',
        lightGray: '#f8f9fa',
        primaryColor: '#2c3e50',
        secondaryColor: '#7f8c8d',
        accentColor: '#3498db'
    };

    constructor(private institucionConfigService: InstitucionConfigService) { }

    generarPDF(datos: DatosObservacionesPDF): void {
        // Configurar PDF
        this.pdf = new jsPDF({
            orientation: 'p',
            unit: 'mm',
            format: 'a4'
        });

        this.currentY = this.marginTop;
        this.pageNumber = 1;

        // Configurar la fuente por defecto
        this.pdf.setFont('helvetica', 'normal');

        // Generar secciones
        this.generarEncabezado(datos);
        this.generarDatosEstudiante(datos);
        this.generarResumenObservaciones(datos);
        this.generarFiltrosAplicados(datos);
        this.generarTablaObservaciones(datos);

        // Guardar PDF
        const nombreArchivo = `Observaciones_${datos.nombreEstudiante.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
        this.pdf.save(nombreArchivo);
    }

    private generarEncabezado(datos: DatosObservacionesPDF): void {
        const blackRgb = this.hexToRgb(this.colors.black);
        const grayRgb = this.hexToRgb(this.colors.darkGray);
        const goldRgb = this.hexToRgb(this.colors.gold);

        const nombreInstitucion = this.institucionConfigService.getNombreInstitucion().toUpperCase();
        const nitInstitucion = this.institucionConfigService.getNitInstitucion();

        // ===== LOGO FIJO A LA IZQUIERDA =====
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

        // ===== NOMBRE INSTITUCIÓN CENTRADO =====
        this.pdf.setFontSize(13);
        this.pdf.setFont('helvetica', 'bold');
        this.pdf.setTextColor(blackRgb.r, blackRgb.g, blackRgb.b);

        const anchoNombre = this.pdf.getTextWidth(nombreInstitucion);
        const xNombreCentrado = (this.pageWidth - anchoNombre) / 2;
        this.pdf.text(nombreInstitucion, xNombreCentrado, this.currentY + 10);

        this.currentY += 14;

        // ===== NIT O RESOLUCIÓN CENTRADO =====
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

        // ===== TÍTULO CENTRADO =====
        this.pdf.setFontSize(13);
        this.pdf.setFont('helvetica', 'bold');
        this.pdf.setTextColor(blackRgb.r, blackRgb.g, blackRgb.b);

        const tituloDoc = 'HISTORIAL DE OBSERVACIONES';
        const anchoTitulo = this.pdf.getTextWidth(tituloDoc);
        const xTituloCentrado = (this.pageWidth - anchoTitulo) / 2;
        this.pdf.text(tituloDoc, xTituloCentrado, this.currentY);

        this.currentY += 6;

        // Subtítulo con período (año actual o histórico)
        if (datos.anioAcademico && datos.subTabActivo) {
            this.pdf.setFontSize(10);
            this.pdf.setFont('helvetica', 'normal');
            const subtituloPeriodo = datos.subTabActivo === 'actual'
                ? `Año ${datos.anioAcademico}`
                : 'Años anteriores';
            const anchoSub = this.pdf.getTextWidth(subtituloPeriodo);
            const xSub = (this.pageWidth - anchoSub) / 2;
            this.pdf.text(subtituloPeriodo, xSub, this.currentY);
            this.currentY += 6;
        }

        // ===== FECHA CENTRADA =====
        this.pdf.setFontSize(9);
        this.pdf.setFont('helvetica', 'normal');
        this.pdf.setTextColor(grayRgb.r, grayRgb.g, grayRgb.b);

        const fechaActual = new Date();
        const fechaTexto = `Fecha: ${fechaActual.toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })}`;
        const fechaWidth = this.pdf.getTextWidth(fechaTexto);
        const xFechaCentrada = (this.pageWidth - fechaWidth) / 2;
        this.pdf.text(fechaTexto, xFechaCentrada, this.currentY);

        // Línea decorativa
        this.currentY += 6;
        this.pdf.setDrawColor(goldRgb.r, goldRgb.g, goldRgb.b);
        this.pdf.setLineWidth(2);
        this.pdf.line(this.marginLeft, this.currentY, this.pageWidth - this.marginRight, this.currentY);

        this.currentY += 10;
    }

    private generarDatosEstudiante(datos: DatosObservacionesPDF): void {
        const grayBgRgb = this.hexToRgb(this.colors.lightGray);
        const blackRgb = this.hexToRgb(this.colors.black);
        const darkGrayRgb = this.hexToRgb(this.colors.darkGray);

        // Recuadro izquierdo - Datos del estudiante
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

    private generarResumenObservaciones(datos: DatosObservacionesPDF): void {
        const grayBgRgb = this.hexToRgb(this.colors.lightGray);
        const blackRgb = this.hexToRgb(this.colors.black);
        const darkGrayRgb = this.hexToRgb(this.colors.darkGray);

        // Recuadro - Resumen
        this.pdf.setFillColor(grayBgRgb.r, grayBgRgb.g, grayBgRgb.b);
        this.pdf.rect(this.marginLeft, this.currentY, this.contentWidth, 20, 'F');

        this.pdf.setFontSize(11);
        this.pdf.setFont('helvetica', 'bold');
        this.pdf.setTextColor(blackRgb.r, blackRgb.g, blackRgb.b);
        this.pdf.text('Resumen de Observaciones', this.marginLeft + 3, this.currentY + 6);

        this.pdf.setFontSize(9);
        this.pdf.setFont('helvetica', 'normal');
        this.pdf.setTextColor(darkGrayRgb.r, darkGrayRgb.g, darkGrayRgb.b);

        const col1X = this.marginLeft + 3;
        const col2X = this.marginLeft + 65;
        const col3X = this.marginLeft + 125;

        this.pdf.text(`Total: ${datos.observacionesOriginales.length}`, col1X, this.currentY + 12);
        this.pdf.text(`Filtradas: ${datos.observacionesFiltradas.length}`, col2X, this.currentY + 12);
        this.pdf.text(`Período: ${datos.periodoObservaciones}`, col3X, this.currentY + 12);

        this.currentY += 23;
    }

    private generarFiltrosAplicados(datos: DatosObservacionesPDF): void {
        if (!datos.filtrosAplicados) return;

        const grayRgb = this.hexToRgb(this.colors.darkGray);

        this.pdf.setFontSize(8);
        this.pdf.setFont('helvetica', 'italic');
        this.pdf.setTextColor(grayRgb.r, grayRgb.g, grayRgb.b);

        let filtrosTexto = 'Filtros aplicados: ';
        const filtros = datos.filtrosAplicados;

        if (filtros.tipos && filtros.tipos.length > 0) {
            filtrosTexto += `Tipos (${filtros.tipos.join(', ')}), `;
        }

        if (filtros.fechas && filtros.fechas.length > 0) {
            filtrosTexto += `Fechas (${filtros.fechas.length} seleccionadas), `;
        }

        if (filtros.usuarios && filtros.usuarios.length > 0) {
            filtrosTexto += `Usuarios (${filtros.usuarios.join(', ')}), `;
        }

        if (filtros.busqueda) {
            filtrosTexto += `Búsqueda: "${filtros.busqueda}"`;
        }

        if (filtrosTexto === 'Filtros aplicados: ') {
            filtrosTexto += 'Ninguno';
        }

        this.pdf.text(filtrosTexto, this.marginLeft, this.currentY);
        this.currentY += 8;
    }

    private generarTablaObservaciones(datos: DatosObservacionesPDF): void {
        const primaryRgb = this.hexToRgb(this.colors.primaryColor);
        const lightGrayRgb = this.hexToRgb(this.colors.lightGray);

        // Título de la sección
        this.pdf.setFontSize(11);
        this.pdf.setFont('helvetica', 'bold');
        this.pdf.setTextColor(0, 0, 0);
        this.pdf.text('Detalle de Observaciones', this.marginLeft, this.currentY);

        this.currentY += 8;

        // Configurar tabla
        const headers = ['#', 'Fecha', 'Tipo', 'Descripción', 'Est. Afectado', 'Usuario'];
        const columnWidths = [8, 20, 22, 55, 30, 35];

        // Encabezado de tabla
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

        // Filas de datos
        this.pdf.setTextColor(0, 0, 0);
        this.pdf.setFont('helvetica', 'normal');
        this.pdf.setFontSize(7);

        datos.observacionesFiltradas.forEach((obs, index) => {
            // Descripción (multilinea si es necesaria)
            const maxCharsPerLine = 48;
            const descripcionCompleta = obs.descripcion || '-';
            const lineasDescripcion = this.dividirTextoEnLineas(descripcionCompleta, maxCharsPerLine);
            
            // Calcular altura necesaria para esta fila
            const alturaFila = Math.max(10, lineasDescripcion.length * 4 + 2);
            
            // Verificar si necesitamos nueva página ANTES de dibujar
            if (this.currentY + alturaFila > 260) {
                this.agregarPiePagina();
                this.pdf.addPage();
                this.currentY = this.marginTop;
                this.pageNumber++;

                // Re-dibujar encabezado de tabla
                this.pdf.setFillColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);
                this.pdf.rect(this.marginLeft, this.currentY, this.contentWidth, 8, 'F');
                this.pdf.setTextColor(255, 255, 255);
                this.pdf.setFontSize(8);
                this.pdf.setFont('helvetica', 'bold');

                let headerX = this.marginLeft + 2;
                headers.forEach((header, i) => {
                    this.pdf.text(header, headerX, this.currentY + 5);
                    headerX += columnWidths[i];
                });

                this.currentY += 8;
                this.pdf.setTextColor(0, 0, 0);
                this.pdf.setFont('helvetica', 'normal');
                this.pdf.setFontSize(7);
            }
            
            // Redibujar fondo alternado si aplica
            if (index % 2 === 0) {
                this.pdf.setFillColor(lightGrayRgb.r, lightGrayRgb.g, lightGrayRgb.b);
                this.pdf.rect(this.marginLeft, this.currentY, this.contentWidth, alturaFila, 'F');
            }
            
            // Resetear currentX para empezar desde el inicio
            currentX = this.marginLeft + 2;

            // Número
            this.pdf.text(String(index + 1), currentX, this.currentY + 6);
            currentX += columnWidths[0];

            // Fecha
            this.pdf.text(obs.fechaFormateada || obs.fecha, currentX, this.currentY + 6);
            currentX += columnWidths[1];

            // Tipo
            const tipoObs = this.truncarTexto(obs.nombre_tipo_observacion || '-', 18);
            this.pdf.text(tipoObs, currentX, this.currentY + 6);
            currentX += columnWidths[2];
            
            // Dibujar descripción línea por línea
            lineasDescripcion.forEach((linea, lineIndex) => {
                this.pdf.text(linea, currentX, this.currentY + 6 + (lineIndex * 4));
            });
            currentX += columnWidths[3];

            // Estudiante afectado
            const estudianteAfectado = obs.nombre_estudiante_afectado ? 
                this.truncarTexto(obs.nombre_estudiante_afectado, 22) : '-';
            this.pdf.text(estudianteAfectado, currentX, this.currentY + 6);
            currentX += columnWidths[4];

            // Usuario
            const usuario = this.truncarTexto(obs.nombre_usuario || 'Sistema', 25);
            this.pdf.text(usuario, currentX, this.currentY + 6);

            this.currentY += alturaFila;
        });

        // Pie de página final
        this.agregarPiePagina();
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

    private dividirTextoEnLineas(texto: string, maxChars: number): string[] {
        if (!texto) return ['-'];
        
        const palabras = texto.split(' ');
        const lineas: string[] = [];
        let lineaActual = '';

        palabras.forEach(palabra => {
            const lineaConPalabra = lineaActual ? `${lineaActual} ${palabra}` : palabra;
            
            if (lineaConPalabra.length <= maxChars) {
                lineaActual = lineaConPalabra;
            } else {
                if (lineaActual) {
                    lineas.push(lineaActual);
                }
                // Si una palabra sola es más larga que maxChars, la dividimos
                if (palabra.length > maxChars) {
                    for (let i = 0; i < palabra.length; i += maxChars) {
                        lineas.push(palabra.substring(i, i + maxChars));
                    }
                    lineaActual = '';
                } else {
                    lineaActual = palabra;
                }
            }
        });

        if (lineaActual) {
            lineas.push(lineaActual);
        }

        return lineas.length > 0 ? lineas : ['-'];
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
}