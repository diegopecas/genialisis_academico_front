import { Injectable } from '@angular/core';
import { InstitucionConfigService } from './institucion-config.service';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Importar fuente con soporte UTF-8
import 'jspdf-autotable';

// Extender la interfaz de jsPDF para incluir autoTable
declare module 'jspdf' {
    interface jsPDF {
        lastAutoTable: {
            finalY: number;
        };
    }
}

export interface DatosEvaluacionPDF {
    nombreEstudiante: string;
    nombreSprint: string;
    fecha: string;
    logoBase64?: string;
    resumenEstudiante?: {
        promedio_general: number;
        valor_cualitativo_general: string;
        areas_fuertes: string[];
        areas_mejorar: string[];
        total_actividades: number;
        actividades_completadas: number;
        porcentaje_completado: number;
    };
    datosPromedio: Array<{
        area_academica_nombre: string;
        promedio: number;
        valor_cualitativo: string;
    }>;
    datosIndicadores: Array<{
        area_academica_nombre: string;
        descripcion_indicador_logro: string;
        promedio: number;
        valor_cualitativo: string;
    }>;
    datosLogros?: Array<{
        id_logro: string;
        logro_nombre: string;
        area_academica_nombre: string;
        promedio: number;
        valor_cualitativo: string;
        indicadores?: Array<{
            descripcion_indicador_logro: string;
            promedio: number;
            valor_cualitativo: string;
        }>;
    }>;
    observaciones?: Array<{
        id: string;
        fecha: string;
        fechaFormateada?: string;
        descripcion: string;
        id_tipo_observacion_estudiante: string;
        nombre_tipo_observacion?: string;
        nombre_usuario?: string;
    }>;
    medidasAntropometricas?: {
        peso: {
            valor: number;
            fecha: string;
            unidad: string;
        } | null;
        talla: {
            valor: number;
            fecha: string;
            unidad: string;
        } | null;
    };
}

@Injectable({
    providedIn: 'root'
})
export class ExportarPdfEvaluacionService {
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

    // Colores corporativos con versiones pastel - Alineados con el componente
    private colors = {
        gold: '#d4af37',
        black: '#222222',
        darkGray: '#666666',
        lightGray: '#f8f9fa',
        // Colores principales para las clasificaciones - mismos que el componente
        excelente: '#28a745',
        sobresaliente: '#5cb85c',
        bueno: '#ffc107',
        aceptable: '#fd7e14',
        insuficiente: '#dc3545',
        // Colores para las tarjetas de estadísticas - más suaves como en HTML
        promedioGeneralBg: 'rgba(52, 152, 219, 0.1)',  // Fondo azul muy claro
        promedioGeneral: '#3498db',
        progresoBg: 'rgba(46, 204, 113, 0.1)',  // Fondo verde muy claro
        progreso: '#2ecc71',
        areasFuertesBg: 'rgba(40, 167, 69, 0.1)',  // Fondo verde claro
        areasFuertes: '#28a745',
        areasMejorarBg: 'rgba(255, 193, 7, 0.1)',  // Fondo amarillo claro
        areasMejorar: '#ffc107',
        // Colores pastel para fondos de badges
        excelenteLight: '#d4edda',
        sobresalienteLight: '#d1ecf1',
        buenoLight: '#fff3cd',
        aceptableLight: '#ffeaa7',
        insuficienteLight: '#f8d7da'
    };

    constructor(private institucionConfigService: InstitucionConfigService) { }

    generarPDF(datos: DatosEvaluacionPDF): void {
        // Configurar PDF con soporte UTF-8
        this.pdf = new jsPDF({
            orientation: 'p',
            unit: 'mm',
            format: 'a4'
        });
        
        this.currentY = this.marginTop;
        this.pageNumber = 1;

        // Configurar la fuente por defecto para soportar UTF-8
        this.pdf.setFont('helvetica', 'normal');

        // Generar secciones
        this.generarEncabezado(datos);
        this.generarInformacionEstudiante(datos);

        if (datos.resumenEstudiante) {
            this.generarResumenDesempeno(datos.resumenEstudiante);
        }

        // Generar sección de medidas antropométricas si existen
        if (datos.medidasAntropometricas) {
            this.generarSeccionMedidasAntropometricas(datos.medidasAntropometricas);
        }

        if (datos.datosPromedio.length > 0) {
            this.generarTablaPromediosArea(datos.datosPromedio);
        }

        // Verificar que existan tanto el resumen como los datos de promedio
        if (datos.resumenEstudiante && datos.datosPromedio.length > 0) {
            this.generarAreasFuertesYMejorar(datos.resumenEstudiante, datos.datosPromedio);
        }

        if (datos.datosLogros && datos.datosLogros.length > 0) {
            this.generarTablaLogros(datos.datosLogros);
            this.generarResumenLogros(datos.datosLogros);
        }

        // Generar sección de observaciones
        if (datos.observaciones && datos.observaciones.length > 0) {
            this.generarSeccionObservaciones(datos.observaciones);
        }

        // Guardar PDF
        const nombreArchivo = `Evaluacion_Academica_${datos.nombreEstudiante.replace(/\s+/g, '_')}_${new Date().getTime()}.pdf`;
        this.pdf.save(nombreArchivo);
    }

    private generarEncabezado(datos: DatosEvaluacionPDF): void {
        const blackRgb = this.hexToRgb(this.colors.black);
        const grayRgb = this.hexToRgb(this.colors.darkGray);
        const goldRgb = this.hexToRgb(this.colors.gold);

        const nombreInstitucion = this.institucionConfigService.getNombreInstitucion().toUpperCase();
        const nitInstitucion = this.institucionConfigService.getNitInstitucion();
        
        // ===== LOGO FIJO A LA IZQUIERDA =====
        const logoSize = 25;
        const logoX = this.marginLeft + 5; // Fijo a la izquierda
        
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

        this.currentY += 14; // Pegadito al NIT/Resolución

        // ===== NIT O RESOLUCIÓN CENTRADO =====
        this.pdf.setFontSize(9);
        this.pdf.setFont('helvetica', 'normal');
        this.pdf.setTextColor(grayRgb.r, grayRgb.g, grayRgb.b);
        
        // Si hay resolución, mostrarla; si no, mostrar NIT
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
        
        const tituloDoc = 'EVALUACIÓN ACADÉMICA';
        const anchoTitulo = this.pdf.getTextWidth(tituloDoc);
        const xTituloCentrado = (this.pageWidth - anchoTitulo) / 2;
        this.pdf.text(tituloDoc, xTituloCentrado, this.currentY);

        this.currentY += 8;

        // ===== ESTUDIANTE CENTRADO =====
        this.pdf.setFontSize(12);
        this.pdf.setFont('helvetica', 'bold');
        this.pdf.setTextColor(goldRgb.r, goldRgb.g, goldRgb.b);
        
        const nombreWidth = this.pdf.getTextWidth(datos.nombreEstudiante);
        const xEstudianteCentrado = (this.pageWidth - nombreWidth) / 2;
        this.pdf.text(datos.nombreEstudiante, xEstudianteCentrado, this.currentY);

        this.currentY += 4;

        // ===== FECHA CENTRADA =====
        this.pdf.setFontSize(9);
        this.pdf.setFont('helvetica', 'normal');
        this.pdf.setTextColor(grayRgb.r, grayRgb.g, grayRgb.b);
        
        const fechaTexto = `Fecha: ${datos.fecha}`;
        const fechaWidth = this.pdf.getTextWidth(fechaTexto);
        const xFechaCentrada = (this.pageWidth - fechaWidth) / 2;
        this.pdf.text(fechaTexto, xFechaCentrada, this.currentY);

        // Línea decorativa
        this.currentY += 6;
        this.pdf.setDrawColor(goldRgb.r, goldRgb.g, goldRgb.b);
        this.pdf.setLineWidth(2);
        this.pdf.line(this.marginLeft, this.currentY, this.pageWidth - this.marginRight, this.currentY);

        this.currentY += 5;

        // Sprint centrado
        this.pdf.setFontSize(10);
        this.pdf.setFont('helvetica', 'italic');
        this.pdf.setTextColor(grayRgb.r, grayRgb.g, grayRgb.b);
        const textoSprint = `${datos.nombreSprint}`;
        const anchoTexto = this.pdf.getTextWidth(textoSprint);
        const xCentrado = (this.pageWidth - anchoTexto) / 2;
        this.pdf.text(textoSprint, xCentrado, this.currentY);

        this.currentY += 6;
    }









    private dibujarLogoFallback(): void {
        // Dibujar círculo con iniciales como fallback
        this.pdf.setFillColor(240, 240, 240);
        this.pdf.circle(this.marginLeft + 15, this.currentY + 15, 15, 'F');
        const goldRgb = this.hexToRgb(this.colors.gold);
        this.pdf.setDrawColor(goldRgb.r, goldRgb.g, goldRgb.b);
        this.pdf.setLineWidth(1);
        this.pdf.circle(this.marginLeft + 15, this.currentY + 15, 15);

        // Iniciales del logo
        this.pdf.setFontSize(16);
        const blackRgb = this.hexToRgb(this.colors.black);
        this.pdf.setTextColor(blackRgb.r, blackRgb.g, blackRgb.b);
        this.pdf.text('LL', this.marginLeft + 9, this.currentY + 20);
    }

    private generarInformacionEstudiante(datos: DatosEvaluacionPDF): void {
        // Ya no necesitamos esta sección porque el nombre del estudiante está en el encabezado
        // Solo mantenemos un espacio pequeño
        this.currentY += 5;
    }

    private generarResumenDesempeno(resumen: any): void {
        // Título de sección
        this.generarTituloSeccion('Resumen del Desempeño');

        // Cajas de resumen - 4 cajas como en el HTML
        const boxWidth = (this.contentWidth - 30) / 4;  // Ajustado para 4 cajas
        const boxHeight = 25; // Reducido de 30 a 25
        let xPos = this.marginLeft;

        // Caja 1: Promedio General
        this.generarCajaResumen(
            xPos, this.currentY,
            boxWidth, boxHeight,
            resumen.promedio_general.toFixed(1),
            'Promedio General',
            resumen.valor_cualitativo_general,
            this.colors.promedioGeneralBg,
            this.colors.promedioGeneral
        );

        // Caja 2: Actividades Completadas
        xPos += boxWidth + 10;
        this.generarCajaResumen(
            xPos, this.currentY,
            boxWidth, boxHeight,
            `${resumen.porcentaje_completado}%`,
            'Actividades Completadas',
            `${resumen.actividades_completadas}/${resumen.total_actividades}`,
            this.colors.progresoBg,
            this.colors.progreso
        );

        // Caja 3: Áreas Destacadas
        xPos += boxWidth + 10;
        this.generarCajaResumen(
            xPos, this.currentY,
            boxWidth, boxHeight,
            resumen.areas_fuertes.length.toString(),
            'Áreas Destacadas',
            'Promedio >= 4.0',
            this.colors.areasFuertesBg,
            this.colors.areasFuertes
        );

        // Caja 4: Áreas por mejorar
        xPos += boxWidth + 10;
        this.generarCajaResumen(
            xPos, this.currentY,
            boxWidth, boxHeight,
            resumen.areas_mejorar.length.toString(),
            'Áreas por mejorar',
            'Promedio < 3.5',
            this.colors.areasMejorarBg,
            this.colors.areasMejorar
        );

        this.currentY += boxHeight + 8;
    }

    private generarCajaResumen(x: number, y: number, width: number, height: number,
        valor: string, titulo: string, subtitulo: string,
        bgColor: string, textColor: string): void {
        // Convertir colores usando el nuevo método auxiliar
        const bgRgb = this.colorToRgb(bgColor);
        const textRgb = this.colorToRgb(textColor);

        // Fondo con esquinas redondeadas
        this.pdf.setFillColor(bgRgb.r, bgRgb.g, bgRgb.b);
        this.pdf.roundedRect(x, y, width, height, 3, 3, 'F');

        // Valor principal - mejor centrado
        this.pdf.setFontSize(14);
        this.pdf.setTextColor(textRgb.r, textRgb.g, textRgb.b);
        
        const valorWidth = this.pdf.getTextWidth(valor);
        this.pdf.text(valor, x + (width - valorWidth) / 2, y + 8);

        // Título - mejor centrado
        this.pdf.setFontSize(7);
        
        const grayRgb = this.hexToRgb(this.colors.darkGray);
        this.pdf.setTextColor(grayRgb.r, grayRgb.g, grayRgb.b);
        const tituloWidth = this.pdf.getTextWidth(titulo);
        this.pdf.text(titulo, x + (width - tituloWidth) / 2, y + 14);

        // Subtítulo - mejor centrado
        this.pdf.setFontSize(6);
        this.pdf.setTextColor(textRgb.r, textRgb.g, textRgb.b);
        
        const subtituloWidth = this.pdf.getTextWidth(subtitulo);
        this.pdf.text(subtitulo, x + (width - subtituloWidth) / 2, y + 20);
    }

    private generarTablaPromediosArea(datosPromedio: any[]): void {
        this.generarTituloSeccion('Promedios por Área Académica');

        const columns = [
            { header: 'Área Académica', dataKey: 'area' },
            { header: 'Promedio', dataKey: 'promedio' },
            { header: 'Clasificación', dataKey: 'clasificacion' }
        ];

        const rows = datosPromedio.map(area => ({
            area: area.area_academica_nombre,
            promedio: area.promedio.toFixed(1),
            clasificacion: area.valor_cualitativo
        }));

        // Guardar los valores de clasificación para usarlos después
        const clasificaciones = rows.map(row => row.clasificacion);

        autoTable(this.pdf, {
            startY: this.currentY,
            head: [columns.map(col => col.header)],
            body: rows.map(row => [row.area, row.promedio, row.clasificacion]),
            margin: { left: this.marginLeft, right: this.marginRight },
            styles: {
                fontSize: 9,
                cellPadding: 3,
                font: 'helvetica'
            },
            headStyles: {
                fillColor: [248, 249, 250],
                textColor: [51, 51, 51],
                fontStyle: 'bold',
                halign: 'center'
            },
            columnStyles: {
                0: { cellWidth: 80 },
                1: { cellWidth: 40, halign: 'center' },
                2: { cellWidth: 50, halign: 'center' }
            },
            didParseCell: (data: any) => {
                // Guardar el valor original antes de vaciarlo
                if (data.column.index === 2 && data.section === 'body') {
                    data.cell.raw = clasificaciones[data.row.index];
                }
            },
            willDrawCell: (data: any) => {
                // Prevenir que se dibuje el texto original en las celdas de clasificación
                if (data.column.index === 2 && data.section === 'body') {
                    data.cell.text = []; // Vaciar el texto para que autoTable no lo dibuje
                }
            },
            didDrawCell: (data: any) => {
                // Colorear las celdas de clasificación
                if (data.column.index === 2 && data.section === 'body') {
                    const valor = data.cell.raw || clasificaciones[data.row.index] || '';
                    if (!valor) return;

                    const color = this.getColorForCalificacion(valor);

                   // Calcular dimensiones para el badge
                    const cellHeight = data.cell.height;
                    const badgeHeight = cellHeight * 0.9;
                    const badgeWidth = data.cell.width * 0.85;
                    const badgeX = data.cell.x + (data.cell.width - badgeWidth) / 2;
                    const badgeY = data.cell.y + (cellHeight - badgeHeight) / 2;


                    // Dibujar el badge con bordes redondeados
                    this.pdf.setFillColor(color.light.r, color.light.g, color.light.b);
                    this.pdf.roundedRect(badgeX, badgeY, badgeWidth, badgeHeight, badgeHeight / 2, badgeHeight / 2, 'F');
                    
                    // Dibujar el texto centrado
                    this.pdf.setTextColor(color.dark.r, color.dark.g, color.dark.b);
                    this.pdf.setFontSize(9);
                    
                    
                    // Calcular el centro real del texto
                    const textWidth = this.pdf.getTextWidth(valor.toString());
                    const textX = data.cell.x + (data.cell.width - textWidth) / 2;
                    const textY = data.cell.y + (data.cell.height / 2) + 1; // Ajustado para mejor centrado vertical
                    this.pdf.text(valor.toString(), textX, textY);
                }
            }
        });

        this.currentY = this.pdf.lastAutoTable.finalY + 8;
    }

    private generarAreasFuertesYMejorar(resumen: any, datosPromedio: any[]): void {
        const halfWidth = (this.contentWidth - 10) / 2;

        // Asegurar que las áreas existan como arrays
        const areasFuertes = resumen.areas_fuertes || [];
        const areasMejorar = resumen.areas_mejorar || [];

        // Calcular altura necesaria - reducida para optimizar espacio
        const alturaFuertes = Math.max(30, 20 + (areasFuertes.length * 5));
        const alturaMejorar = Math.max(30, 20 + (areasMejorar.length * 5));
        const alturaMaxima = Math.max(alturaFuertes, alturaMejorar);

        // Verificar si hay espacio suficiente en la página
        if (this.currentY + alturaMaxima + 10 > this.pageHeight - this.marginBottom) {
            this.pdf.addPage();
            this.pageNumber++;
            this.currentY = this.marginTop;
        }

        // Áreas Destacadas
        this.generarListaAreas(
            this.marginLeft, this.currentY,
            halfWidth,
            'Áreas Destacadas',
            areasFuertes,
            datosPromedio,
            this.colors.areasFuertesBg,  // Usar el mismo verde suave
            this.colors.areasFuertes,
            alturaMaxima
        );

        // Áreas por Mejorar
        this.generarListaAreas(
            this.marginLeft + halfWidth + 10, this.currentY,
            halfWidth,
            'Áreas por Mejorar',
            areasMejorar,
            datosPromedio,
            this.colors.areasMejorarBg,  // Usar el mismo amarillo suave
            this.colors.areasMejorar,
            alturaMaxima
        );

        this.currentY += alturaMaxima + 10;

        // Verificar si los indicadores caben en la página actual
        if (this.currentY + 50 > this.pageHeight - this.marginBottom) {
            this.pdf.addPage();
            this.pageNumber++;
            this.currentY = this.marginTop;
        }
    }

    private generarListaAreas(x: number, y: number, width: number, titulo: string,
        areas: string[], datosPromedio: any[],
        bgColor: string, borderColor: string, alturaFija?: number): void {
        // Convertir colores usando el nuevo método auxiliar
        const bgRgb = this.colorToRgb(bgColor);
        const borderRgb = this.colorToRgb(borderColor);

        // Usar altura fija si se proporciona, sino calcular
        const height = alturaFija || Math.max(40, 25 + (areas.length * 7));

        // Fondo
        this.pdf.setFillColor(bgRgb.r, bgRgb.g, bgRgb.b);
        this.pdf.rect(x, y, width, height, 'F');

        // Borde izquierdo
        this.pdf.setFillColor(borderRgb.r, borderRgb.g, borderRgb.b);
        this.pdf.rect(x, y, 3, height, 'F');

        // Título
        this.pdf.setFontSize(10);
        this.pdf.setTextColor(borderRgb.r, borderRgb.g, borderRgb.b);
        
        this.pdf.text(titulo, x + 7, y + 7);

        // Lista
        this.pdf.setFontSize(8);
        const blackRgb = this.hexToRgb(this.colors.black);
        this.pdf.setTextColor(blackRgb.r, blackRgb.g, blackRgb.b);
        

        let listY = y + 14;
        if (areas && areas.length > 0) {
            areas.forEach(area => {
                const promedio = datosPromedio.find(p => p.area_academica_nombre === area)?.promedio || 0;
                // Usar bullet point • directamente
                const texto = `• ${area} (${promedio.toFixed(1)})`;
                
                // Verificar que no nos pasemos del ancho disponible
                const maxWidth = width - 14;
                const lines = this.pdf.splitTextToSize(texto, maxWidth);
                
                lines.forEach((line: string) => {
                    this.pdf.text(line, x + 7, listY);
                    listY += 6;
                });
            });
        } else {
            const grayRgb = this.hexToRgb(this.colors.darkGray);
            this.pdf.setTextColor(grayRgb.r, grayRgb.g, grayRgb.b);
            this.pdf.setFont('helvetica', 'italic');
            const mensaje = titulo.includes('Destacadas')
                ? 'No hay áreas destacadas (promedio >= 4.0)'
                : 'No hay áreas por mejorar (promedio < 3.5)';
            
            // Dividir el mensaje si es muy largo
            const maxWidth = width - 14;
            const lines = this.pdf.splitTextToSize(mensaje, maxWidth);
            
            lines.forEach((line: string) => {
                this.pdf.text(line, x + 7, listY);
                listY += 6;
            });
        }
    }

    private generarTablaLogros(datosLogros: any[]): void {
        this.verificarNuevaPagina(50);

        this.generarTituloSeccion('Promedios por Logro');

        // Agrupar por área académica
        const logrosPorArea = this.agruparLogrosPorArea(datosLogros);

        // Construir tableData con filas de logros + sub-filas de indicadores anidados
        const tableData: Array<{
            area: string;
            descripcion: string;
            promedio: string;
            clasificacion: string;
            esLogro: boolean;
        }> = [];
        const clasificacionesPorFila: string[] = [];

        Object.entries(logrosPorArea).forEach(([area, logros]) => {
            logros.forEach((logro, index) => {
                // Fila principal del logro
                tableData.push({
                    area: index === 0 ? area : '',
                    descripcion: logro.logro_nombre,
                    promedio: logro.promedio.toFixed(1),
                    clasificacion: logro.valor_cualitativo,
                    esLogro: true
                });
                clasificacionesPorFila.push(logro.valor_cualitativo);

                // Sub-filas con los indicadores anidados (letra pequeña)
                if (logro.indicadores && logro.indicadores.length > 0) {
                    logro.indicadores.forEach((ind: any) => {
                        tableData.push({
                            area: '',
                            descripcion: '   • ' + ind.descripcion_indicador_logro,
                            promedio: ind.promedio.toFixed(1),
                            clasificacion: ind.valor_cualitativo,
                            esLogro: false
                        });
                        clasificacionesPorFila.push(ind.valor_cualitativo);
                    });
                }
            });
        });

        autoTable(this.pdf, {
            startY: this.currentY,
            head: [[
                'Área Académica',
                'Logro / Indicador',
                'Promedio',
                'Clasificación'
            ]],
            body: tableData.map(row => [row.area, row.descripcion, row.promedio, row.clasificacion]),
            margin: { left: this.marginLeft, right: this.marginRight },
            styles: {
                fontSize: 9,
                cellPadding: 4,
                font: 'helvetica'
            },
            headStyles: {
                fillColor: [248, 249, 250],
                textColor: [51, 51, 51],
                fontStyle: 'bold'
            },
            columnStyles: {
                0: { cellWidth: 40 },
                1: { cellWidth: 80 },
                2: { cellWidth: 25, halign: 'center' },
                3: { cellWidth: 35, halign: 'center' }
            },
            didParseCell: (data: any) => {
                if (data.section === 'body') {
                    const filaInfo = tableData[data.row.index];
                    if (!filaInfo) return;

                    // Estilo para filas de logro (negrita)
                    if (filaInfo.esLogro) {
                        data.cell.styles.fontStyle = 'bold';
                        data.cell.styles.fontSize = 9;
                    } else {
                        // Estilo para filas de indicador anidado (más pequeño y gris)
                        data.cell.styles.fontSize = 7.5;
                        data.cell.styles.textColor = [110, 110, 110];
                    }

                    // Guardar el valor de clasificación antes de vaciarlo
                    if (data.column.index === 3) {
                        data.cell.raw = clasificacionesPorFila[data.row.index];
                    }
                }
            },
            willDrawCell: (data: any) => {
                if (data.column.index === 3 && data.section === 'body') {
                    data.cell.text = [];
                }
            },
            didDrawCell: (data: any) => {
                if (data.column.index === 3 && data.section === 'body') {
                    const valor = data.cell.raw || clasificacionesPorFila[data.row.index] || '';
                    if (!valor) return;

                    const filaInfo = tableData[data.row.index];
                    const esLogro = filaInfo ? filaInfo.esLogro : true;

                    const color = this.getColorForCalificacion(valor);

                    // Badge más pequeño para indicadores anidados
                    const cellHeight = data.cell.height;
                    const badgeHeight = cellHeight * (esLogro ? 0.65 : 0.55);
                    const badgeWidth = data.cell.width * (esLogro ? 0.85 : 0.75);
                    const badgeX = data.cell.x + (data.cell.width - badgeWidth) / 2;
                    const badgeY = data.cell.y + (cellHeight - badgeHeight) / 2;

                    this.pdf.setFillColor(color.light.r, color.light.g, color.light.b);
                    this.pdf.roundedRect(badgeX, badgeY, badgeWidth, badgeHeight, badgeHeight / 2, badgeHeight / 2, 'F');

                    this.pdf.setTextColor(color.dark.r, color.dark.g, color.dark.b);
                    this.pdf.setFontSize(esLogro ? 8 : 7);

                    const textWidth = this.pdf.getTextWidth(valor.toString());
                    const textX = data.cell.x + (data.cell.width - textWidth) / 2;
                    const textY = data.cell.y + (data.cell.height / 2) + 1;
                    this.pdf.text(valor.toString(), textX, textY);
                }
            }
        });

        this.currentY = this.pdf.lastAutoTable.finalY + 10;
    }

    private generarResumenLogros(datosLogros: any[]): void {
        this.verificarNuevaPagina(60);

        // Calcular resumen sobre los LOGROS (no sobre indicadores)
        const resumen = this.calcularResumenClasificaciones(datosLogros);

        // Información general
        const bgRgb = this.hexToRgb('#e3f2fd');
        this.pdf.setFillColor(bgRgb.r, bgRgb.g, bgRgb.b);
        this.pdf.roundedRect(this.marginLeft, this.currentY, this.contentWidth, 20, 3, 3, 'F');

        const borderRgb = this.hexToRgb('#2196f3');
        this.pdf.setFillColor(borderRgb.r, borderRgb.g, borderRgb.b);
        this.pdf.rect(this.marginLeft, this.currentY, 3, 20, 'F');

        this.pdf.setFontSize(10);
        const textRgb = this.hexToRgb('#1565c0');
        this.pdf.setTextColor(textRgb.r, textRgb.g, textRgb.b);
        this.pdf.text(`Total de logros evaluados: ${datosLogros.length}`,
            this.marginLeft + 8, this.currentY + 12);

        this.currentY += 30;

        // Tabla de resumen por clasificación
        if (resumen.length > 0) {
            this.pdf.setFontSize(11);
            const blackRgb = this.hexToRgb(this.colors.black);
            this.pdf.setTextColor(blackRgb.r, blackRgb.g, blackRgb.b);
            this.pdf.text('Resumen por Clasificación', this.marginLeft, this.currentY);
            this.currentY += 8;

            autoTable(this.pdf, {
                startY: this.currentY,
                head: [['Clasificación', 'Cantidad', 'Porcentaje']],
                body: resumen.map(item => [
                    item.clasificacion,
                    item.cantidad.toString(),
                    `${item.porcentaje.toFixed(1)}%`
                ]),
                margin: { left: this.marginLeft, right: this.marginLeft + 80 },
                styles: {
                    fontSize: 9,
                    cellPadding: 4,
                    font: 'helvetica'
                },
                headStyles: {
                    fillColor: [248, 249, 250],
                    textColor: [51, 51, 51],
                    fontStyle: 'bold',
                    halign: 'center'
                },
                columnStyles: {
                    0: { cellWidth: 40 },
                    1: { cellWidth: 30, halign: 'center' },
                    2: { cellWidth: 30, halign: 'center' }
                }
            });

            this.currentY = this.pdf.lastAutoTable.finalY + 10;
        }
    }

    private generarTituloSeccion(titulo: string): void {
        this.pdf.setFontSize(11);
        const blackRgb = this.hexToRgb(this.colors.black);
        this.pdf.setTextColor(blackRgb.r, blackRgb.g, blackRgb.b);
        

        // Línea decorativa antes del título
        this.pdf.setDrawColor(200, 200, 200);
        this.pdf.setLineWidth(0.5);
        const lineY = this.currentY + 3;
        this.pdf.line(this.marginLeft, lineY, this.pageWidth - this.marginRight, lineY);

        // Calcular el ancho del texto
        const textWidth = this.pdf.getTextWidth(titulo);
        
        // Si el título es muy largo, ajustar el tamaño de fuente o dividirlo
        if (textWidth > this.contentWidth - 20) {
            // Opción 1: Reducir ligeramente el tamaño de fuente
            this.pdf.setFontSize(10);
            
            // Opción 2: Si aún es muy largo, dividir en líneas
            const lines = this.pdf.splitTextToSize(titulo, this.contentWidth - 20);
            
            // Fondo blanco para el texto
            const bgHeight = lines.length * 7 + 4;
            const bgWidth = Math.min(this.contentWidth - 20, Math.max(...lines.map((line: string) => this.pdf.getTextWidth(line))) + 10);
            const bgX = (this.pageWidth - bgWidth) / 2;
            
            this.pdf.setFillColor(255, 255, 255);
            this.pdf.rect(bgX, this.currentY - 2, bgWidth, bgHeight, 'F');
            
            // Dibujar cada línea centrada
            let textY = this.currentY + 5;
            lines.forEach((line: string) => {
                const lineWidth = this.pdf.getTextWidth(line);
                const textX = (this.pageWidth - lineWidth) / 2;
                this.pdf.text(line, textX, textY);
                textY += 6;
            });
            
            this.currentY += bgHeight + 5;
        } else {
            // Título corto - mantener el diseño original
            const bgWidth = textWidth + 10;
            const bgX = (this.pageWidth - bgWidth) / 2;
            
            this.pdf.setFillColor(255, 255, 255);
            this.pdf.rect(bgX, this.currentY - 2, bgWidth, 10, 'F');
            
            // Texto centrado
            this.pdf.text(titulo, this.pageWidth / 2 - (textWidth / 2), this.currentY + 5);
            this.currentY += 12;
        }
    }

    private verificarNuevaPagina(espacioNecesario: number): void {
        if (this.currentY + espacioNecesario > this.pageHeight - this.marginBottom) {
            this.pdf.addPage();
            this.pageNumber++;
            this.currentY = this.marginTop;
        }
    }

    private getColorForCalificacion(valor: string): { light: { r: number, g: number, b: number }, dark: { r: number, g: number, b: number } } {
        const colores: { [key: string]: { light: { r: number, g: number, b: number }, dark: { r: number, g: number, b: number } } } = {
            'Excelente': {
                light: { r: 40, g: 167, b: 69 },     // #28a745 - Verde para fondo
                dark: { r: 255, g: 255, b: 255 }     // Blanco para texto
            },
            'Sobresaliente': {
                light: { r: 92, g: 184, b: 92 },     // #5cb85c - Verde claro para fondo
                dark: { r: 255, g: 255, b: 255 }     // Blanco para texto
            },
            'Bueno': {
                light: { r: 255, g: 193, b: 7 },     // #ffc107 - Amarillo para fondo
                dark: { r: 255, g: 255, b: 255 }     // Blanco para texto
            },
            'Aceptable': {
                light: { r: 253, g: 126, b: 20 },    // #fd7e14 - Naranja para fondo
                dark: { r: 255, g: 255, b: 255 }     // Blanco para texto
            },
            'Insuficiente': {
                light: { r: 220, g: 53, b: 69 },     // #dc3545 - Rojo para fondo
                dark: { r: 255, g: 255, b: 255 }     // Blanco para texto
            }
        };

        // Validar que el valor existe y es una cadena
        const valorStr = (valor || '').toString().trim();

        return colores[valorStr] || {
            light: { r: 233, g: 236, b: 239 },  // Gris claro para fondo
            dark: { r: 73, g: 80, b: 87 }       // Gris oscuro para texto
        };
    }

    private agruparIndicadoresPorArea(indicadores: any[]): { [key: string]: any[] } {
        return indicadores.reduce((acc, indicador) => {
            const area = indicador.area_academica_nombre;
            if (!acc[area]) {
                acc[area] = [];
            }
            acc[area].push(indicador);
            return acc;
        }, {} as { [key: string]: any[] });
    }

    private agruparLogrosPorArea(logros: any[]): { [key: string]: any[] } {
        return logros.reduce((acc, logro) => {
            const area = logro.area_academica_nombre;
            if (!acc[area]) {
                acc[area] = [];
            }
            acc[area].push(logro);
            return acc;
        }, {} as { [key: string]: any[] });
    }

    private calcularResumenClasificaciones(indicadores: any[]): Array<{ clasificacion: string, cantidad: number, porcentaje: number }> {
        const conteo: { [key: string]: number } = {};

        indicadores.forEach(indicador => {
            const clasificacion = indicador.valor_cualitativo;
            conteo[clasificacion] = (conteo[clasificacion] || 0) + 1;
        });

        const total = indicadores.length;
        const resumen = Object.entries(conteo).map(([clasificacion, cantidad]) => ({
            clasificacion,
            cantidad,
            porcentaje: (cantidad / total) * 100
        }));

        const orden = ['Excelente', 'Sobresaliente', 'Bueno', 'Aceptable', 'Insuficiente'];
        resumen.sort((a, b) => {
            const indexA = orden.indexOf(a.clasificacion);
            const indexB = orden.indexOf(b.clasificacion);
            return indexA - indexB;
        });

        return resumen;
    }

    private generarSeccionObservaciones(observaciones: any[]): void {
        // Verificar espacio necesario
        this.verificarNuevaPagina(40);

        // Título de la sección
        this.generarTituloSeccion('Observaciones Académicas, Disciplinarias y Sociales');

        // Agrupar observaciones por tipo
        const observacionesAcademicas = observaciones.filter(o => o.id_tipo_observacion_estudiante === 1);
        const observacionesDisciplinarias = observaciones.filter(o => o.id_tipo_observacion_estudiante === 2);
        const observacionesSociales = observaciones.filter(o => o.id_tipo_observacion_estudiante === 4);

        let hayObservaciones = false;

        // Observaciones Académicas
        if (observacionesAcademicas.length > 0) {
            hayObservaciones = true;
            this.generarSubseccionObservaciones('Observaciones Académicas', observacionesAcademicas, '#3498db');
        }

        // Observaciones Disciplinarias
        if (observacionesDisciplinarias.length > 0) {
            hayObservaciones = true;
            this.generarSubseccionObservaciones('Observaciones Disciplinarias', observacionesDisciplinarias, '#e67e22');
        }

        // Observaciones Sociales
        if (observacionesSociales.length > 0) {
            hayObservaciones = true;
            this.generarSubseccionObservaciones('Observaciones Sociales', observacionesSociales, '#9b59b6');
        }

        // Si no hay observaciones
        if (!hayObservaciones) {
            this.pdf.setFontSize(9);
            const grayRgb = this.hexToRgb(this.colors.darkGray);
            this.pdf.setTextColor(grayRgb.r, grayRgb.g, grayRgb.b);
            this.pdf.setFont('helvetica', 'italic');
            this.pdf.text('No hay observaciones académicas, disciplinarias o sociales registradas para este estudiante.', 
                this.marginLeft, this.currentY);
            this.currentY += 10;
        }
    }

    private generarSubseccionObservaciones(titulo: string, observaciones: any[], color: string): void {
        // Verificar si necesitamos nueva página
        this.verificarNuevaPagina(30 + (observaciones.length * 20));

        // Título de subsección
        this.pdf.setFontSize(10);
        const colorRgb = this.hexToRgb(color);
        this.pdf.setTextColor(colorRgb.r, colorRgb.g, colorRgb.b);
        this.pdf.setFont('helvetica', 'bold');
        this.pdf.text(titulo, this.marginLeft + 5, this.currentY);
        
        // Línea decorativa
        this.pdf.setDrawColor(colorRgb.r, colorRgb.g, colorRgb.b);
        this.pdf.setLineWidth(2);
        this.pdf.line(this.marginLeft, this.currentY + 2, this.marginLeft + 3, this.currentY + 2);
        
        this.currentY += 8;

        // Ordenar observaciones por fecha (más recientes primero)
        const observacionesOrdenadas = [...observaciones].sort((a, b) => 
            new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
        );

        // Mostrar cada observación
        this.pdf.setFont('helvetica', 'normal');
        observacionesOrdenadas.forEach((obs, index) => {
            // Verificar si necesitamos nueva página para cada observación
            this.verificarNuevaPagina(25);

            // Fondo alternado
            if (index % 2 === 0) {
                const bgRgb = this.hexToRgb('#f8f9fa');
                this.pdf.setFillColor(bgRgb.r, bgRgb.g, bgRgb.b);
                this.pdf.rect(this.marginLeft, this.currentY - 3, this.contentWidth, 20, 'F');
            }

            // Fecha
            this.pdf.setFontSize(8);
            this.pdf.setTextColor(100, 100, 100);
            this.pdf.text(obs.fechaFormateada || this.formatearFecha(obs.fecha), 
                this.marginLeft + 5, this.currentY);
            
            this.currentY += 5;

            // Descripción
            this.pdf.setFontSize(9);
            const blackRgb = this.hexToRgb(this.colors.black);
            this.pdf.setTextColor(blackRgb.r, blackRgb.g, blackRgb.b);
            
            // Dividir texto largo en líneas
            const maxWidth = this.contentWidth - 10;
            const lines = this.pdf.splitTextToSize(obs.descripcion, maxWidth);
            
            lines.forEach((line: string) => {
                if (this.currentY > this.pageHeight - this.marginBottom - 10) {
                    this.pdf.addPage();
                    this.pageNumber++;
                    this.currentY = this.marginTop;
                }
                this.pdf.text(line, this.marginLeft + 5, this.currentY);
                this.currentY += 5;
            });

            // Autor
            if (obs.nombre_usuario) {
                this.pdf.setFontSize(8);
                this.pdf.setTextColor(100, 100, 100);
                this.pdf.setFont('helvetica', 'italic');
                this.pdf.text(`Registrado por: Miss ${obs.nombre_usuario}`, 
                    this.marginLeft + 5, this.currentY);
                this.currentY += 3;
            }

            this.currentY += 5; // Espacio entre observaciones
        });

        this.currentY += 10; // Espacio después de la subsección
    }

    private generarSeccionMedidasAntropometricas(medidas: any): void {
        // Título de sección
        this.generarTituloSeccion('Medidas Antropométricas');

        // Contenedor para las medidas
        const boxWidth = (this.contentWidth - 10) / 2;
        const boxHeight = 20; // Reducido de 25 a 20
        let xPos = this.marginLeft;

        // Medida de Peso
        if (medidas.peso) {
            this.generarCajaMedida(
                xPos, this.currentY,
                boxWidth, boxHeight,
                'Peso',
                `${medidas.peso.valor} ${medidas.peso.unidad}`,
                this.formatearFecha(medidas.peso.fecha),
                'rgba(212, 175, 55, 0.1)',
                '#d4af37'
            );
        } else {
            this.generarCajaMedidaVacia(
                xPos, this.currentY,
                boxWidth, boxHeight,
                'Peso',
                'Sin registro',
                'rgba(212, 175, 55, 0.1)',
                '#d4af37'
            );
        }

        // Medida de Talla
        xPos += boxWidth + 10;
        if (medidas.talla) {
            this.generarCajaMedida(
                xPos, this.currentY,
                boxWidth, boxHeight,
                'Talla',
                `${medidas.talla.valor} ${medidas.talla.unidad}`,
                this.formatearFecha(medidas.talla.fecha),
                'rgba(34, 34, 34, 0.05)',
                '#222222'
            );
        } else {
            this.generarCajaMedidaVacia(
                xPos, this.currentY,
                boxWidth, boxHeight,
                'Talla',
                'Sin registro',
                'rgba(34, 34, 34, 0.05)',
                '#222222'
            );
        }

        this.currentY += boxHeight + 8;
    }

    private generarCajaMedida(x: number, y: number, width: number, height: number,
        titulo: string, valor: string, fecha: string,
        bgColor: string, textColor: string): void {
        // Convertir colores
        const bgRgb = this.colorToRgb(bgColor);
        const textRgb = this.colorToRgb(textColor);

        // Fondo con esquinas redondeadas
        this.pdf.setFillColor(bgRgb.r, bgRgb.g, bgRgb.b);
        this.pdf.roundedRect(x, y, width, height, 3, 3, 'F');

        // Borde izquierdo
        this.pdf.setFillColor(textRgb.r, textRgb.g, textRgb.b);
        this.pdf.rect(x, y, 3, height, 'F');

        // Título
        this.pdf.setFontSize(8);
        this.pdf.setTextColor(textRgb.r, textRgb.g, textRgb.b);
        this.pdf.setFont('helvetica', 'bold');
        this.pdf.text(titulo, x + 8, y + 6);

        // Valor
        this.pdf.setFontSize(10);
        this.pdf.setFont('helvetica', 'bold');
        this.pdf.text(valor, x + 8, y + 12);

        // Fecha
        this.pdf.setFontSize(7);
        this.pdf.setFont('helvetica', 'normal');
        const grayRgb = this.hexToRgb(this.colors.darkGray);
        this.pdf.setTextColor(grayRgb.r, grayRgb.g, grayRgb.b);
        this.pdf.text(`Fecha: ${fecha}`, x + 8, y + 17);
    }

    private generarCajaMedidaVacia(x: number, y: number, width: number, height: number,
        titulo: string, mensaje: string,
        bgColor: string, textColor: string): void {
        // Convertir colores
        const bgRgb = this.colorToRgb(bgColor);
        const textRgb = this.colorToRgb(textColor);

        // Fondo con esquinas redondeadas
        this.pdf.setFillColor(bgRgb.r, bgRgb.g, bgRgb.b);
        this.pdf.roundedRect(x, y, width, height, 3, 3, 'F');

        // Borde izquierdo
        this.pdf.setFillColor(textRgb.r, textRgb.g, textRgb.b);
        this.pdf.rect(x, y, 3, height, 'F');

        // Título
        this.pdf.setFontSize(8);
        this.pdf.setTextColor(textRgb.r, textRgb.g, textRgb.b);
        this.pdf.setFont('helvetica', 'bold');
        this.pdf.text(titulo, x + 8, y + 7);

        // Mensaje
        this.pdf.setFontSize(9);
        this.pdf.setFont('helvetica', 'italic');
        const grayRgb = this.hexToRgb(this.colors.darkGray);
        this.pdf.setTextColor(grayRgb.r, grayRgb.g, grayRgb.b);
        this.pdf.text(mensaje, x + 8, y + 13);
    }

    private formatearFecha(fecha: string): string {
        if (!fecha) return '';
        const date = new Date(fecha);
        const dia = date.getDate().toString().padStart(2, '0');
        const mes = (date.getMonth() + 1).toString().padStart(2, '0');
        const anio = date.getFullYear();
        return `${dia}/${mes}/${anio}`;
    }

    private hexToRgb(hex: string): { r: number, g: number, b: number } {
        // Validar entrada
        if (!hex || typeof hex !== 'string') {
            return { r: 0, g: 0, b: 0 }; // Negro por defecto
        }

        // Si es un color rgba o rgb, retornar negro (no debería llegar aquí)
        if (hex.startsWith('rgb')) {
            console.warn('hexToRgb recibió un color RGB en lugar de HEX:', hex);
            return { r: 0, g: 0, b: 0 };
        }

        // Remover el # si está presente
        hex = hex.replace('#', '');

        // Validar longitud
        if (hex.length !== 6 && hex.length !== 3) {
            console.warn('Color hex inválido:', hex);
            return { r: 0, g: 0, b: 0 };
        }

        // Si es formato corto (3 caracteres), expandir
        if (hex.length === 3) {
            hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
        }

        // Convertir a RGB
        const r = parseInt(hex.substring(0, 2), 16) || 0;
        const g = parseInt(hex.substring(2, 4), 16) || 0;
        const b = parseInt(hex.substring(4, 6), 16) || 0;

        return { r, g, b };
    }

    // Método auxiliar para convertir cualquier formato de color a RGB
    private colorToRgb(color: string): { r: number, g: number, b: number } {
        if (!color || typeof color !== 'string') {
            return { r: 0, g: 0, b: 0 };
        }

        // Si es rgba o rgb
        if (color.startsWith('rgba') || color.startsWith('rgb')) {
            const matches = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
            if (matches) {
                const r = parseInt(matches[1]) || 0;
                const g = parseInt(matches[2]) || 0;
                const b = parseInt(matches[3]) || 0;
                const alpha = parseFloat(matches[4]) || 1;
                
                // Si tiene transparencia, mezclarlo con blanco para simular el efecto
                if (alpha < 1) {
                    const white = 255;
                    return {
                        r: Math.round(r * alpha + white * (1 - alpha)),
                        g: Math.round(g * alpha + white * (1 - alpha)),
                        b: Math.round(b * alpha + white * (1 - alpha))
                    };
                }
                
                return { r, g, b };
            }
            return { r: 0, g: 0, b: 0 };
        }

        // Si es hex
        return this.hexToRgb(color);
    }
}