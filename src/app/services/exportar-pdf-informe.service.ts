import { Injectable } from '@angular/core';
import { InstitucionConfigService } from './institucion-config.service';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import 'jspdf-autotable';

// Extender la interfaz de jsPDF para incluir autoTable
declare module 'jspdf' {
    interface jsPDF {
        lastAutoTable: {
            finalY: number;
        };
    }
}

export interface DatosInformePDF {
    // Configuración del jardín
    tituloInforme?: string;
    encabezado?: string;
    piePagina?: string;
    firmaUno?: string;
    firmaDos?: string;
    firmaAcudiente?: boolean;
    muestraAusencias?: boolean;
    logoBase64?: string;

    // Opciones de formato, configurables por jardín
    estiloMarca?: string;      // 'columnas' | 'columna_unica'
    simboloMarca?: string;     // 'x' | 'punto' | 'valor' | 'texto'
    colorPrincipal?: string;   // color del jardín; sin él se usa gris neutro
    mostrarConvencion?: boolean;

    // Datos del estudiante
    nombreEstudiante: string;
    nombreGrupo?: string;
    nombreCorte?: string;
    ausencias?: number | null;
    textoCierre?: string | null;
    estado?: string;

    // La escala del parámetro de evaluación, en orden de presentación
    valores: Array<{
        id: string;
        valor_cualitativo: string;
        valor_cuantitativo?: number;
        color?: string;
    }>;

    // Secciones con sus filas ya resueltas
    secciones: Array<{
        id: string;
        nombre: string;
        id_seccion_padre?: string | null;
        se_califica: number;
        tipo_contenido: string;
        evalua_a: string;
        texto?: string | null;
        filas?: Array<{
            texto_fila: string;
            id_valor_parametro?: string | null;
        }>;
    }>;
}

/**
 * Exportación del boletín a PDF.
 *
 * Sigue el patrón de los demás servicios exportar-pdf-*: jsPDF con
 * autoTable, márgenes fijos y control manual de los saltos de página.
 *
 * El formato sale de la configuración del jardín: encabezado, secciones,
 * escala, ausencias y firmas. No es una réplica del Word de cada jardín.
 */
@Injectable({
    providedIn: 'root'
})
export class ExportarPdfInformeService {

    private pdf!: jsPDF;
    private pageWidth = 210;
    private pageHeight = 297;
    private marginLeft = 15;
    private marginRight = 15;
    private marginTop = 18;
    private marginBottom = 20;
    private contentWidth = this.pageWidth - this.marginLeft - this.marginRight;
    private currentY = this.marginTop;

    // Neutros por defecto: el boletín lleva la marca del jardín, no la
    // nuestra, así que el dorado corporativo de Genialisis no va aquí.
    private colors = {
        acento: '#555555',
        black: '#222222',
        darkGray: '#666666',
        lightGray: '#f5f5f5',
        borde: '#dddddd'
    };

    /** El color del jardín si lo configuró; si no, el neutro */
    private acento(datos: DatosInformePDF): string {
        return datos.colorPrincipal || this.colors.acento;
    }

    constructor(private institucionConfigService: InstitucionConfigService) { }

    generarPDF(datos: DatosInformePDF): void {
        this.pdf = new jsPDF({
            orientation: 'p',
            unit: 'mm',
            format: 'a4'
        });

        this.currentY = this.marginTop;
        this.pdf.setFont('helvetica', 'normal');

        this.generarEncabezado(datos);
        this.generarDatosEstudiante(datos);

        // Solo las secciones de primer nivel: las subsecciones se pintan
        // dentro de su dimensión
        const raiz = datos.secciones.filter(s => !s.id_seccion_padre);
        raiz.forEach(sec => {
            const subs = datos.secciones.filter(s => s.id_seccion_padre === sec.id);
            this.generarSeccion(sec, subs, datos);
        });

        this.generarCierre(datos);
        this.generarFirmas(datos);
        this.generarPiePaginas(datos);

        const nombreArchivo = `Informe_${datos.nombreEstudiante.replace(/\s+/g, '_')}_${new Date().getTime()}.pdf`;
        this.pdf.save(nombreArchivo);
    }

    // =================================================================
    // ENCABEZADO
    // =================================================================

    private generarEncabezado(datos: DatosInformePDF): void {
        const acentoRgb = this.hexToRgb(this.acento(datos));
        const blackRgb = this.hexToRgb(this.colors.black);
        const grayRgb = this.hexToRgb(this.colors.darkGray);

        if (datos.logoBase64) {
            try {
                this.pdf.addImage(datos.logoBase64, 'PNG', this.marginLeft, this.currentY - 3, 20, 20);
            } catch (error) {
                console.error('No se pudo agregar el logo al PDF', error);
            }
        }

        const xTexto = datos.logoBase64 ? this.marginLeft + 25 : this.marginLeft;
        const anchoTexto = this.contentWidth - (datos.logoBase64 ? 25 : 0);

        // Nombre de la institución
        this.pdf.setFontSize(13);
        this.pdf.setFont('helvetica', 'bold');
        this.pdf.setTextColor(blackRgb.r, blackRgb.g, blackRgb.b);
        this.pdf.text(this.institucionConfigService.getNombreInstitucion() || '', xTexto, this.currentY + 3);

        let y = this.currentY + 9;

        // Texto institucional configurado (NIT, resolución, lema)
        if (datos.encabezado) {
            this.pdf.setFontSize(8);
            this.pdf.setFont('helvetica', 'normal');
            this.pdf.setTextColor(grayRgb.r, grayRgb.g, grayRgb.b);
            const lineas = this.pdf.splitTextToSize(datos.encabezado, anchoTexto);
            this.pdf.text(lineas, xTexto, y);
            y += lineas.length * 4;
        }

        this.currentY = Math.max(y + 3, this.currentY + 21);

        // Título del informe
        this.pdf.setFontSize(12);
        this.pdf.setFont('helvetica', 'bold');
        this.pdf.setTextColor(blackRgb.r, blackRgb.g, blackRgb.b);
        this.pdf.text(
            (datos.tituloInforme || 'Informe de Calificaciones').toUpperCase(),
            this.pageWidth / 2, this.currentY, { align: 'center' }
        );

        this.currentY += 3;
        this.pdf.setDrawColor(acentoRgb.r, acentoRgb.g, acentoRgb.b);
        this.pdf.setLineWidth(0.8);
        this.pdf.line(this.marginLeft, this.currentY, this.pageWidth - this.marginRight, this.currentY);
        this.currentY += 8;
    }

    // =================================================================
    // DATOS DEL ESTUDIANTE
    // =================================================================

    private generarDatosEstudiante(datos: DatosInformePDF): void {
        const blackRgb = this.hexToRgb(this.colors.black);
        const grayRgb = this.hexToRgb(this.colors.darkGray);
        const bgRgb = this.hexToRgb(this.colors.lightGray);

        const alto = 16;
        this.pdf.setFillColor(bgRgb.r, bgRgb.g, bgRgb.b);
        this.pdf.roundedRect(this.marginLeft, this.currentY, this.contentWidth, alto, 2, 2, 'F');

        this.pdf.setFontSize(11);
        this.pdf.setFont('helvetica', 'bold');
        this.pdf.setTextColor(blackRgb.r, blackRgb.g, blackRgb.b);
        this.pdf.text(datos.nombreEstudiante, this.marginLeft + 4, this.currentY + 6.5);

        this.pdf.setFontSize(8.5);
        this.pdf.setFont('helvetica', 'normal');
        this.pdf.setTextColor(grayRgb.r, grayRgb.g, grayRgb.b);

        const detalle: string[] = [];
        if (datos.nombreGrupo) {
            detalle.push(`Grupo: ${datos.nombreGrupo}`);
        }
        if (datos.nombreCorte) {
            detalle.push(`Periodo: ${datos.nombreCorte}`);
        }
        if (datos.muestraAusencias && datos.ausencias !== null && datos.ausencias !== undefined) {
            detalle.push(`Ausencias: ${datos.ausencias}`);
        }
        this.pdf.text(detalle.join('     '), this.marginLeft + 4, this.currentY + 12);

        this.currentY += alto + 7;

        // Convención de la escala
        this.generarConvencion(datos);
    }

    /** La leyenda de la escala, para que el acudiente entienda las marcas */
    private generarConvencion(datos: DatosInformePDF): void {
        if (!datos.valores || datos.valores.length === 0) {
            return;
        }

        // Con columnas por valor la leyenda sobra: el encabezado ya dice
        // qué es cada una.
        if (datos.mostrarConvencion === false) {
            return;
        }

        const grayRgb = this.hexToRgb(this.colors.darkGray);
        this.pdf.setFontSize(7.5);
        this.pdf.setFont('helvetica', 'normal');
        this.pdf.setTextColor(grayRgb.r, grayRgb.g, grayRgb.b);

        let x = this.marginLeft;
        datos.valores.forEach(v => {
            const rgb = this.hexToRgb(v.color || this.colors.acento);
            this.pdf.setFillColor(rgb.r, rgb.g, rgb.b);
            this.pdf.circle(x + 1.5, this.currentY - 1, 1.5, 'F');

            this.pdf.text(v.valor_cualitativo, x + 5, this.currentY);
            x += 5 + this.pdf.getTextWidth(v.valor_cualitativo) + 7;
        });

        this.currentY += 6;
    }

    // =================================================================
    // SECCIONES
    // =================================================================

    private generarSeccion(seccion: any, subsecciones: any[], datos: DatosInformePDF): void {
        this.verificarEspacio(28);
        this.generarTituloSeccion(seccion, datos);

        // Filas propias de la sección
        if (seccion.filas && seccion.filas.length > 0) {
            this.generarTablaFilas(seccion, datos);
        }

        // Subsecciones: van con su propio subtítulo dentro de la dimensión
        subsecciones.forEach(sub => {
            if (!sub.filas || sub.filas.length === 0) {
                return;
            }
            this.verificarEspacio(22);
            this.generarSubtitulo(sub.nombre);
            this.generarTablaFilas(sub, datos);
        });

        // Texto descriptivo de la sección
        if (seccion.tipo_contenido === 'texto' && seccion.texto) {
            this.generarParrafo(seccion.texto);
        }

        this.currentY += 3;
    }

    private generarTituloSeccion(seccion: any, datos: DatosInformePDF): void {
        const acentoRgb = this.hexToRgb(this.acento(datos));
        const blackRgb = this.hexToRgb(this.colors.black);

        this.pdf.setFillColor(255, 255, 255);
        this.pdf.setFontSize(10);
        this.pdf.setFont('helvetica', 'bold');
        this.pdf.setTextColor(blackRgb.r, blackRgb.g, blackRgb.b);

        let titulo = seccion.nombre;
        if (seccion.evalua_a === 'familia') {
            titulo += '  (familia)';
        }
        this.pdf.text(titulo.toUpperCase(), this.marginLeft, this.currentY);

        this.currentY += 1.5;
        this.pdf.setDrawColor(acentoRgb.r, acentoRgb.g, acentoRgb.b);
        this.pdf.setLineWidth(0.5);
        this.pdf.line(this.marginLeft, this.currentY, this.pageWidth - this.marginRight, this.currentY);
        this.currentY += 4;
    }

    private generarSubtitulo(nombre: string): void {
        const blackRgb = this.hexToRgb(this.colors.black);
        this.pdf.setFontSize(9);
        this.pdf.setFont('helvetica', 'bold');
        this.pdf.setTextColor(blackRgb.r, blackRgb.g, blackRgb.b);
        this.pdf.text(nombre, this.marginLeft + 2, this.currentY);
        this.currentY += 3;
    }

    /**
     * Una fila por logro o ítem.
     *
     * Dos formas de marcar, según lo que configure el jardín:
     *   columnas      -> una columna por valor, se marca la que aplica
     *                    (Taller Creativo, Play School)
     *   columna_unica -> una sola columna con el valor alcanzado
     *                    (Jugando y Creando, que usa semáforo)
     */
    private generarTablaFilas(seccion: any, datos: DatosInformePDF): void {
        const califica = seccion.se_califica == 1 && datos.valores.length > 0;
        const porColumnas = (datos.estiloMarca || 'columnas') === 'columnas';

        if (!califica) {
            this.generarTablaSimple(seccion, datos);
            return;
        }

        if (porColumnas) {
            this.generarTablaPorColumnas(seccion, datos);
        } else {
            this.generarTablaColumnaUnica(seccion, datos);
        }
    }

    /** Secciones informativas: solo el listado, sin marca */
    private generarTablaSimple(seccion: any, datos: DatosInformePDF): void {
        const body = (seccion.filas || []).map((f: any) => [f.texto_fila || '']);

        autoTable(this.pdf, {
            startY: this.currentY,
            body: body,
            theme: 'grid',
            margin: { left: this.marginLeft, right: this.marginRight, bottom: this.marginBottom },
            styles: this.estilosBase(),
            columnStyles: { 0: { cellWidth: this.contentWidth } }
        });

        this.currentY = this.pdf.lastAutoTable.finalY + 4;
    }

    /** Una columna por cada valor de la escala */
    private generarTablaPorColumnas(seccion: any, datos: DatosInformePDF): void {
        const head: any[] = [[{ content: '', styles: { halign: 'left' } }]];
        datos.valores.forEach(v => {
            head[0].push({ content: v.valor_cualitativo, styles: { halign: 'center' } });
        });

        const body = (seccion.filas || []).map((f: any) => {
            const fila: any[] = [f.texto_fila || ''];
            datos.valores.forEach(v => {
                fila.push(f.id_valor_parametro === v.id ? this.simbolo(v, datos) : '');
            });
            return fila;
        });

        const anchoValor = Math.min(26, (this.contentWidth * 0.45) / datos.valores.length);
        const columnStyles: any = {
            0: { cellWidth: this.contentWidth - (anchoValor * datos.valores.length) }
        };
        datos.valores.forEach((v, i) => {
            columnStyles[i + 1] = { cellWidth: anchoValor, halign: 'center', fontStyle: 'bold' };
        });

        autoTable(this.pdf, {
            startY: this.currentY,
            head: head,
            body: body,
            theme: 'grid',
            margin: { left: this.marginLeft, right: this.marginRight, bottom: this.marginBottom },
            styles: this.estilosBase(),
            headStyles: this.estilosCabecera(datos),
            columnStyles: columnStyles,
            // El punto se pinta a mano porque autoTable no dibuja formas
            didDrawCell: (data: any) => {
                if (datos.simboloMarca !== 'punto' || data.section !== 'body' || data.column.index === 0) {
                    return;
                }
                const valor = datos.valores[data.column.index - 1];
                const fila = (seccion.filas || [])[data.row.index];
                if (!fila || fila.id_valor_parametro !== valor.id) {
                    return;
                }
                this.pintarPunto(data, valor);
            }
        });

        this.currentY = this.pdf.lastAutoTable.finalY + 4;
    }

    /** Una sola columna con el valor alcanzado */
    private generarTablaColumnaUnica(seccion: any, datos: DatosInformePDF): void {
        const anchoMarca = 45;

        const body = (seccion.filas || []).map((f: any) => {
            const valor = datos.valores.find(v => v.id === f.id_valor_parametro);
            return [
                f.texto_fila || '',
                valor ? this.textoMarca(valor, datos) : ''
            ];
        });

        autoTable(this.pdf, {
            startY: this.currentY,
            body: body,
            theme: 'grid',
            margin: { left: this.marginLeft, right: this.marginRight, bottom: this.marginBottom },
            styles: this.estilosBase(),
            columnStyles: {
                0: { cellWidth: this.contentWidth - anchoMarca },
                1: { cellWidth: anchoMarca, halign: 'center', fontStyle: 'bold', fontSize: 7.5 }
            },
            didDrawCell: (data: any) => {
                if (datos.simboloMarca !== 'punto' || data.section !== 'body' || data.column.index !== 1) {
                    return;
                }
                const fila = (seccion.filas || [])[data.row.index];
                const valor = datos.valores.find(v => v.id === fila?.id_valor_parametro);
                if (!valor) {
                    return;
                }
                this.pintarPunto(data, valor, true);
            }
        });

        this.currentY = this.pdf.lastAutoTable.finalY + 4;
    }

    /** Lo que se imprime dentro de la celda marcada */
    private simbolo(valor: any, datos: DatosInformePDF): string {
        switch (datos.simboloMarca) {
            case 'valor': return String(valor.valor_cuantitativo ?? 'X');
            case 'texto': return valor.valor_cualitativo;
            case 'punto': return '';   // el punto se dibuja aparte
            default:      return 'X';
        }
    }

    /** Texto de la columna única: el nombre del valor, o nada si es punto */
    private textoMarca(valor: any, datos: DatosInformePDF): string {
        if (datos.simboloMarca === 'punto') {
            return '';
        }
        if (datos.simboloMarca === 'valor') {
            return String(valor.valor_cuantitativo ?? '');
        }
        return valor.valor_cualitativo;
    }

    /** Punto de color centrado en la celda */
    private pintarPunto(data: any, valor: any, conTexto: boolean = false): void {
        const rgb = this.hexToRgb(valor.color || this.colors.acento);
        const cx = data.cell.x + (data.cell.width / 2);
        const cy = data.cell.y + (data.cell.height / 2);

        if (conTexto) {
            // En columna única cabe el punto y el nombre al lado
            this.pdf.setFillColor(rgb.r, rgb.g, rgb.b);
            this.pdf.circle(data.cell.x + 4, cy, 1.8, 'F');

            const blackRgb = this.hexToRgb(this.colors.black);
            this.pdf.setTextColor(blackRgb.r, blackRgb.g, blackRgb.b);
            this.pdf.setFontSize(7);
            this.pdf.setFont('helvetica', 'normal');
            this.pdf.text(valor.valor_cualitativo, data.cell.x + 8, cy + 1);
            return;
        }

        this.pdf.setFillColor(rgb.r, rgb.g, rgb.b);
        this.pdf.circle(cx, cy, 2, 'F');
    }

    private estilosBase(): any {
        const blackRgb = this.hexToRgb(this.colors.black);
        return {
            font: 'helvetica',
            fontSize: 8,
            cellPadding: 2,
            lineColor: this.hexToArray(this.colors.borde),
            lineWidth: 0.1,
            textColor: [blackRgb.r, blackRgb.g, blackRgb.b],
            valign: 'middle'
        };
    }

    private estilosCabecera(datos: DatosInformePDF): any {
        const blackRgb = this.hexToRgb(this.colors.black);
        // Cabecera clara: el color fuerte solo va en las líneas de sección
        return {
            fillColor: this.hexToArray(this.colors.lightGray),
            textColor: [blackRgb.r, blackRgb.g, blackRgb.b],
            fontStyle: 'bold',
            fontSize: 7.5,
            lineColor: this.hexToArray(this.colors.borde),
            lineWidth: 0.1
        };
    }

    private generarParrafo(texto: string): void {
        const blackRgb = this.hexToRgb(this.colors.black);
        this.pdf.setFontSize(9);
        this.pdf.setFont('helvetica', 'normal');
        this.pdf.setTextColor(blackRgb.r, blackRgb.g, blackRgb.b);

        const lineas = this.pdf.splitTextToSize(texto, this.contentWidth - 4);
        this.verificarEspacio(lineas.length * 4.5 + 6);
        this.pdf.text(lineas, this.marginLeft + 2, this.currentY);
        this.currentY += lineas.length * 4.5 + 4;
    }

    // =================================================================
    // CIERRE Y FIRMAS
    // =================================================================

    private generarCierre(datos: DatosInformePDF): void {
        if (!datos.textoCierre) {
            return;
        }

        this.verificarEspacio(30);
        this.generarTituloSeccion({ nombre: 'Observaciones', evalua_a: 'estudiante' }, datos);
        this.generarParrafo(datos.textoCierre);
    }

    private generarFirmas(datos: DatosInformePDF): void {
        const firmas: string[] = [];
        if (datos.firmaUno) {
            firmas.push(datos.firmaUno);
        }
        if (datos.firmaDos) {
            firmas.push(datos.firmaDos);
        }
        if (datos.firmaAcudiente) {
            firmas.push('Firma de recibido del acudiente');
        }

        if (firmas.length === 0) {
            return;
        }

        this.verificarEspacio(32);
        this.currentY += 14;

        const grayRgb = this.hexToRgb(this.colors.darkGray);
        const anchoFirma = this.contentWidth / firmas.length;

        firmas.forEach((firma, i) => {
            const x = this.marginLeft + (anchoFirma * i);
            const centro = x + (anchoFirma / 2);

            this.pdf.setDrawColor(grayRgb.r, grayRgb.g, grayRgb.b);
            this.pdf.setLineWidth(0.2);
            this.pdf.line(x + 8, this.currentY, x + anchoFirma - 8, this.currentY);

            this.pdf.setFontSize(8);
            this.pdf.setFont('helvetica', 'normal');
            this.pdf.setTextColor(grayRgb.r, grayRgb.g, grayRgb.b);
            this.pdf.text(firma, centro, this.currentY + 4, { align: 'center' });
        });

        this.currentY += 12;
    }

    /**
     * Pie de página en todas las hojas. Se hace al final para poder poner
     * el total de páginas.
     */
    private generarPiePaginas(datos: DatosInformePDF): void {
        const grayRgb = this.hexToRgb(this.colors.darkGray);
        const total = this.pdf.getNumberOfPages();

        for (let i = 1; i <= total; i++) {
            this.pdf.setPage(i);
            this.pdf.setFontSize(7);
            this.pdf.setFont('helvetica', 'normal');
            this.pdf.setTextColor(grayRgb.r, grayRgb.g, grayRgb.b);

            if (datos.piePagina) {
                const lineas = this.pdf.splitTextToSize(datos.piePagina, this.contentWidth - 30);
                this.pdf.text(lineas, this.pageWidth / 2, this.pageHeight - 12, { align: 'center' });
            }

            this.pdf.text(
                `Página ${i} de ${total}`,
                this.pageWidth - this.marginRight,
                this.pageHeight - 8,
                { align: 'right' }
            );

            // El borrador se marca para que nadie entregue uno sin confirmar
            if (datos.estado === 'borrador') {
                this.pdf.setTextColor(200, 120, 0);
                this.pdf.text('BORRADOR', this.marginLeft, this.pageHeight - 8);
            }
        }
    }

    // =================================================================
    // AUXILIARES
    // =================================================================

    private verificarEspacio(alto: number): void {
        if (this.currentY + alto > this.pageHeight - this.marginBottom) {
            this.pdf.addPage();
            this.currentY = this.marginTop;
        }
    }

    /** Carga el logo de la institución como base64 para incrustarlo */
    async cargarLogoBase64(): Promise<string> {
        try {
            const logoUrl = this.institucionConfigService.getLogoUrl();
            const response = await fetch(logoUrl);
            const blob = await response.blob();
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        } catch (error) {
            console.error('Error al cargar el logo de la institución', error);
            return '';
        }
    }

    private hexToRgb(hex: string): { r: number, g: number, b: number } {
        if (!hex || typeof hex !== 'string') {
            return { r: 0, g: 0, b: 0 };
        }

        if (hex.startsWith('rgb')) {
            return { r: 0, g: 0, b: 0 };
        }

        const limpio = hex.replace('#', '');
        const completo = limpio.length === 3
            ? limpio.split('').map(c => c + c).join('')
            : limpio;

        const r = parseInt(completo.substring(0, 2), 16);
        const g = parseInt(completo.substring(2, 4), 16);
        const b = parseInt(completo.substring(4, 6), 16);

        return {
            r: isNaN(r) ? 0 : r,
            g: isNaN(g) ? 0 : g,
            b: isNaN(b) ? 0 : b
        };
    }

    private hexToArray(hex: string): [number, number, number] {
        const rgb = this.hexToRgb(hex);
        return [rgb.r, rgb.g, rgb.b];
    }
}
