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
    colorPrincipal?: string;   // color del jardín; sin él se usa un azul suave
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
 * escala, ausencias y firmas. Toda la paleta se deriva del color que
 * configure el jardín, así que el documento se siente suyo y no nuestro.
 */
@Injectable({
    providedIn: 'root'
})
export class ExportarPdfInformeService {

    private pdf!: jsPDF;
    private pageWidth = 210;
    private pageHeight = 297;
    private marginLeft = 14;
    private marginRight = 14;
    private marginTop = 42;      // deja sitio a la banda del encabezado
    private marginBottom = 25;
    private contentWidth = this.pageWidth - this.marginLeft - this.marginRight;
    private currentY = this.marginTop;

    private alturaBanda = 32;

    // Neutros de base. El acento sale del color del jardín.
    private colors = {
        acento: '#4A6FA5',
        black: '#2B2B2B',
        texto: '#444444',
        darkGray: '#777777',
        lightGray: '#F7F8FA',
        borde: '#E3E6EB',
        blanco: '#FFFFFF'
    };

    // Datos del informe en curso, para no pasarlos por cada método
    private datos!: DatosInformePDF;

    constructor(private institucionConfigService: InstitucionConfigService) { }

    generarPDF(datos: DatosInformePDF): void {
        this.datos = datos;

        this.pdf = new jsPDF({
            orientation: 'p',
            unit: 'mm',
            format: 'a4'
        });

        this.currentY = this.marginTop;
        this.pdf.setFont('helvetica', 'normal');

        this.generarDatosEstudiante();

        // Solo las secciones de primer nivel: las subsecciones se pintan
        // dentro de su dimensión
        const raiz = datos.secciones.filter(s => !s.id_seccion_padre);
        raiz.forEach(sec => {
            const subs = datos.secciones.filter(s => s.id_seccion_padre === sec.id);
            this.generarSeccion(sec, subs);
        });

        this.generarCierre();
        this.generarFirmas();

        // El encabezado y el pie se pintan al final, sobre todas las hojas,
        // para poder poner el total de páginas.
        this.decorarPaginas();

        const nombreArchivo = `Informe_${datos.nombreEstudiante.replace(/\s+/g, '_')}_${new Date().getTime()}.pdf`;
        this.pdf.save(nombreArchivo);
    }

    // =================================================================
    // PALETA
    // =================================================================

    /** El color del jardín si lo configuró; si no, el neutro */
    private get acento(): string {
        return this.datos.colorPrincipal || this.colors.acento;
    }

    /**
     * Mezcla un color con blanco. Con esto toda la paleta del boletín sale
     * del color del jardín, sin pedirle que configure cinco colores.
     */
    private aclarar(hex: string, factor: number): { r: number, g: number, b: number } {
        const c = this.hexToRgb(hex);
        return {
            r: Math.round(c.r + (255 - c.r) * factor),
            g: Math.round(c.g + (255 - c.g) * factor),
            b: Math.round(c.b + (255 - c.b) * factor)
        };
    }

    private oscurecer(hex: string, factor: number): { r: number, g: number, b: number } {
        const c = this.hexToRgb(hex);
        return {
            r: Math.round(c.r * (1 - factor)),
            g: Math.round(c.g * (1 - factor)),
            b: Math.round(c.b * (1 - factor))
        };
    }

    // =================================================================
    // ENCABEZADO Y PIE, SOBRE TODAS LAS PÁGINAS
    // =================================================================

    private decorarPaginas(): void {
        const total = this.pdf.getNumberOfPages();

        for (let i = 1; i <= total; i++) {
            this.pdf.setPage(i);
            this.marcaDeAgua();
            this.bandaEncabezado(i);
            this.piePagina(i, total);
        }
    }

    /**
     * El logo al fondo, muy tenue. Se dibuja primero para que todo lo demás
     * quede encima; como el contenido ya está pintado, se usa la opacidad
     * del estado gráfico para que no tape nada.
     */
    private marcaDeAgua(): void {
        if (!this.datos.logoBase64) {
            return;
        }

        try {
            const ancho = 110;
            const x = (this.pageWidth - ancho) / 2;
            const y = (this.pageHeight - ancho) / 2;

            const gs = (this.pdf as any).GState;
            if (gs) {
                (this.pdf as any).setGState(new gs({ opacity: 0.045 }));
                this.pdf.addImage(this.datos.logoBase64, 'PNG', x, y, ancho, ancho, undefined, 'FAST');
                (this.pdf as any).setGState(new gs({ opacity: 1 }));
            }
        } catch (error) {
            // Si la versión de jsPDF no soporta opacidad se sigue sin marca
            console.warn('No se pudo dibujar la marca de agua', error);
        }
    }

    /** Banda de color con el logo y el título del informe */
    private bandaEncabezado(pagina: number): void {
        const fuerte = this.hexToRgb(this.acento);
        const medio = this.oscurecer(this.acento, 0.12);
        const suave = this.aclarar(this.acento, 0.55);

        // Dos tonos en vez de uno plano: jsPDF no hace degradados, pero una
        // franja más oscura arriba da algo de profundidad.
        this.pdf.setFillColor(medio.r, medio.g, medio.b);
        this.pdf.rect(0, 0, this.pageWidth, this.alturaBanda, 'F');
        this.pdf.setFillColor(fuerte.r, fuerte.g, fuerte.b);
        this.pdf.rect(0, 3, this.pageWidth, this.alturaBanda - 3, 'F');

        // La banda termina en curva, que se siente menos rígido que un filo
        this.curvaInferior(fuerte);

        this.pdf.setFillColor(suave.r, suave.g, suave.b);
        this.pdf.rect(0, this.alturaBanda + 4, this.pageWidth, 1.2, 'F');

        // Logo sobre un círculo blanco, que funciona con cualquier logo
        let xTexto = this.marginLeft;
        if (this.datos.logoBase64) {
            try {
                this.pdf.setFillColor(255, 255, 255);
                this.pdf.circle(this.marginLeft + 10, this.alturaBanda / 2, 11.5, 'F');
                this.pdf.addImage(
                    this.datos.logoBase64, 'PNG',
                    this.marginLeft + 2.5, (this.alturaBanda / 2) - 7.5, 15, 15
                );
                xTexto = this.marginLeft + 27;
            } catch (error) {
                console.error('No se pudo agregar el logo al PDF', error);
            }
        }

        // El bloque institucional va a la derecha para equilibrar con el
        // logo; el nombre y el título quedan con aire a la izquierda.
        const lineasInst = (pagina === 1 && this.datos.encabezado)
            ? this.datos.encabezado.split('\n').map(l => l.trim()).filter(l => l !== '').slice(0, 2)
            : [];

        const anchoInst = lineasInst.length > 0 ? 62 : 0;
        const anchoTexto = this.pageWidth - xTexto - this.marginRight - anchoInst - 6;

        // El nombre puede ocupar una o dos líneas según el ancho que le deje
        // el bloque institucional, así que el título se ubica después de
        // medirlo: si va fijo, se monta encima.
        const nombre = this.institucionConfigService.getNombreInstitucion() || '';

        this.pdf.setFont('helvetica', 'bold');
        let tamNombre = 13;
        this.pdf.setFontSize(tamNombre);
        let lineasNombre = this.pdf.splitTextToSize(nombre, anchoTexto);

        // Con dos líneas se baja un punto para que no quede apretado
        if (lineasNombre.length > 1) {
            tamNombre = 11.5;
            this.pdf.setFontSize(tamNombre);
            lineasNombre = this.pdf.splitTextToSize(nombre, anchoTexto);
        }

        // Máximo dos líneas: más no cabe en la banda
        lineasNombre = lineasNombre.slice(0, 2);

        const altoLinea = tamNombre * 0.42;
        const yNombre = lineasNombre.length > 1 ? 12 : 14.5;

        this.pdf.setTextColor(255, 255, 255);
        this.pdf.text(lineasNombre, xTexto, yNombre);

        const claro = this.aclarar(this.acento, 0.72);
        this.pdf.setTextColor(claro.r, claro.g, claro.b);
        this.pdf.setFontSize(9);
        this.pdf.setFont('helvetica', 'normal');
        this.pdf.text(
            this.datos.tituloInforme || 'Informe de Calificaciones',
            xTexto, yNombre + (lineasNombre.length * altoLinea) + 2.5,
            { maxWidth: anchoTexto }
        );

        if (lineasInst.length === 0) {
            return;
        }

        // Bloque institucional alineado a la derecha, con una línea fina
        // que lo separa del título.
        const xDer = this.pageWidth - this.marginRight;

        this.pdf.setDrawColor(claro.r, claro.g, claro.b);
        this.pdf.setLineWidth(0.25);
        this.pdf.line(xDer - anchoInst, 11, xDer - anchoInst, 24);

        let y = 15;
        lineasInst.forEach((linea, i) => {
            this.pdf.setFontSize(i === 0 ? 7.5 : 6.8);
            this.pdf.setFont('helvetica', i === 0 ? 'italic' : 'normal');
            this.pdf.setTextColor(i === 0 ? 255 : claro.r, i === 0 ? 255 : claro.g, i === 0 ? 255 : claro.b);
            this.pdf.text(linea, xDer, y, { align: 'right', maxWidth: anchoInst - 4 });
            y += 4.4;
        });

        this.pdf.setFont('helvetica', 'normal');
    }

    /**
     * Cierra la banda con una curva suave. Se dibuja con una curva de Bézier
     * rellena, que es lo más parecido a un borde redondeado amplio que
     * permite jsPDF.
     */
    private curvaInferior(color: { r: number, g: number, b: number }): void {
        const y = this.alturaBanda;
        const alto = 4;

        this.pdf.setFillColor(color.r, color.g, color.b);

        // El trazo baja por el centro y vuelve a subir en los extremos
        (this.pdf as any).lines(
            [
                [this.pageWidth / 2, alto * 1.4, this.pageWidth / 2, alto * 1.4, this.pageWidth, 0],
                [0, -alto],
                [-this.pageWidth, 0]
            ],
            0, y,
            [1, 1],
            'F',
            true
        );
    }

    private piePagina(pagina: number, total: number): void {
        const suave = this.aclarar(this.acento, 0.88);
        const linea = this.aclarar(this.acento, 0.6);
        const texto = this.oscurecer(this.acento, 0.2);
        const grisRgb = this.hexToRgb(this.colors.darkGray);

        const altoPie = 17;
        const yPie = this.pageHeight - altoPie;

        this.pdf.setFillColor(suave.r, suave.g, suave.b);
        this.pdf.rect(0, yPie, this.pageWidth, altoPie, 'F');

        // Línea fina de acento al borde superior del pie
        this.pdf.setFillColor(linea.r, linea.g, linea.b);
        this.pdf.rect(0, yPie, this.pageWidth, 0.5, 'F');

        // Datos de contacto y frase de cierre. El pie viene con un salto de
        // línea: la primera es el contacto y la segunda la frase, que va en
        // cursiva porque habla a la familia y no es un dato.
        if (this.datos.piePagina) {
            const lineas = this.datos.piePagina
                .split('\n')
                .map(l => l.trim())
                .filter(l => l !== '')
                .slice(0, 2);

            let y = yPie + 6;
            lineas.forEach((l, i) => {
                if (i === 0) {
                    this.pdf.setFontSize(7);
                    this.pdf.setFont('helvetica', 'normal');
                    this.pdf.setTextColor(texto.r, texto.g, texto.b);
                } else {
                    this.pdf.setFontSize(7.2);
                    this.pdf.setFont('helvetica', 'italic');
                    this.pdf.setTextColor(grisRgb.r, grisRgb.g, grisRgb.b);
                }
                this.pdf.text(l, this.pageWidth / 2, y, { align: 'center', maxWidth: this.contentWidth - 34 });
                y += 5;
            });
        }

        this.pdf.setFont('helvetica', 'normal');
        this.pdf.setFontSize(6.8);
        this.pdf.setTextColor(texto.r, texto.g, texto.b);
        this.pdf.text(
            `${pagina} / ${total}`,
            this.pageWidth - this.marginRight, yPie + 11, { align: 'right' }
        );

        // El borrador se marca para que nadie entregue uno sin confirmar
        if (this.datos.estado === 'borrador') {
            const x = this.marginLeft;
            const y = yPie + 7.5;

            this.pdf.setFillColor(255, 235, 210);
            this.pdf.roundedRect(x, y, 22, 5.6, 2.8, 2.8, 'F');

            this.pdf.setFontSize(6.5);
            this.pdf.setFont('helvetica', 'bold');
            this.pdf.setTextColor(190, 90, 10);
            this.pdf.text('BORRADOR', x + 11, y + 3.8, { align: 'center' });
            this.pdf.setFont('helvetica', 'normal');
        }
    }

    // =================================================================
    // DATOS DEL ESTUDIANTE
    // =================================================================

    private generarDatosEstudiante(): void {
        const blackRgb = this.hexToRgb(this.colors.black);
        const grisRgb = this.hexToRgb(this.colors.darkGray);
        const fondo = this.aclarar(this.acento, 0.92);
        const fuerte = this.hexToRgb(this.acento);

        const alto = 20;
        this.pdf.setFillColor(fondo.r, fondo.g, fondo.b);
        this.pdf.roundedRect(this.marginLeft, this.currentY, this.contentWidth, alto, 3, 3, 'F');

        // Barra de acento a la izquierda de la tarjeta
        this.pdf.setFillColor(fuerte.r, fuerte.g, fuerte.b);
        this.pdf.roundedRect(this.marginLeft, this.currentY, 2.6, alto, 1.3, 1.3, 'F');

        this.pdf.setFontSize(13);
        this.pdf.setFont('helvetica', 'bold');
        this.pdf.setTextColor(blackRgb.r, blackRgb.g, blackRgb.b);
        this.pdf.text(this.datos.nombreEstudiante, this.marginLeft + 7, this.currentY + 8.5);

        this.pdf.setFontSize(8.5);
        this.pdf.setFont('helvetica', 'normal');
        this.pdf.setTextColor(grisRgb.r, grisRgb.g, grisRgb.b);

        const detalle: string[] = [];
        if (this.datos.nombreGrupo) {
            detalle.push(this.datos.nombreGrupo);
        }
        if (this.datos.nombreCorte) {
            detalle.push(this.datos.nombreCorte);
        }
        if (this.datos.muestraAusencias && this.datos.ausencias !== null && this.datos.ausencias !== undefined) {
            detalle.push(`${this.datos.ausencias} ausencias`);
        }
        this.pdf.text(detalle.join('   ·   '), this.marginLeft + 7, this.currentY + 14.5);

        this.currentY += alto + 6;

        this.generarConvencion();
    }

    /** La leyenda de la escala, en pastillas de color */
    private generarConvencion(): void {
        if (!this.datos.valores || this.datos.valores.length === 0) {
            return;
        }

        // Con columnas por valor la leyenda sobra: el encabezado ya dice
        // qué es cada una.
        if (this.datos.mostrarConvencion === false) {
            return;
        }

        let x = this.marginLeft;
        const alto = 6;

        this.datos.valores.forEach(v => {
            const rgb = this.hexToRgb(v.color || this.acento);
            const claro = this.aclarar(v.color || this.acento, 0.86);

            this.pdf.setFontSize(7.5);
            this.pdf.setFont('helvetica', 'bold');
            const ancho = this.pdf.getTextWidth(v.valor_cualitativo) + 11;

            // Salta de renglón si no cabe
            if (x + ancho > this.pageWidth - this.marginRight) {
                x = this.marginLeft;
                this.currentY += alto + 2;
            }

            this.pdf.setFillColor(claro.r, claro.g, claro.b);
            this.pdf.roundedRect(x, this.currentY - 4, ancho, alto, 3, 3, 'F');

            this.pdf.setFillColor(rgb.r, rgb.g, rgb.b);
            this.pdf.circle(x + 3.5, this.currentY - 1, 1.5, 'F');

            const oscuro = this.oscurecer(v.color || this.acento, 0.25);
            this.pdf.setTextColor(oscuro.r, oscuro.g, oscuro.b);
            this.pdf.text(v.valor_cualitativo, x + 6.5, this.currentY);

            x += ancho + 3;
        });

        this.currentY += 8;
    }

    // =================================================================
    // SECCIONES
    // =================================================================

    private generarSeccion(seccion: any, subsecciones: any[]): void {
        this.verificarEspacio(30);
        this.generarTituloSeccion(seccion);

        // Filas propias de la sección
        if (seccion.filas && seccion.filas.length > 0) {
            this.generarTablaFilas(seccion);
        }

        // Subsecciones: van con su propio subtítulo dentro de la dimensión
        subsecciones.forEach(sub => {
            if (!sub.filas || sub.filas.length === 0) {
                return;
            }
            this.verificarEspacio(24);
            this.generarSubtitulo(sub.nombre);
            this.generarTablaFilas(sub);
        });

        // Texto descriptivo de la sección
        if (seccion.tipo_contenido === 'texto' && seccion.texto) {
            this.generarParrafo(seccion.texto);
        }

        this.currentY += 4;
    }

    /** Encabezado de sección: barra de acento, fondo suave y esquinas */
    private generarTituloSeccion(seccion: any): void {
        const fuerte = this.hexToRgb(this.acento);
        const fondo = this.aclarar(this.acento, 0.9);
        const oscuro = this.oscurecer(this.acento, 0.3);

        const alto = 9.5;

        this.pdf.setFillColor(fondo.r, fondo.g, fondo.b);
        this.pdf.roundedRect(this.marginLeft, this.currentY, this.contentWidth, alto, 2.2, 2.2, 'F');

        this.pdf.setFillColor(fuerte.r, fuerte.g, fuerte.b);
        this.pdf.roundedRect(this.marginLeft, this.currentY, 2.2, alto, 1.1, 1.1, 'F');

        this.pdf.setFontSize(9.5);
        this.pdf.setFont('helvetica', 'bold');
        this.pdf.setTextColor(oscuro.r, oscuro.g, oscuro.b);
        this.pdf.text(seccion.nombre.toUpperCase(), this.marginLeft + 6, this.currentY + 6.3);

        // Marca de que la sección evalúa a la familia, no al niño
        if (seccion.evalua_a === 'familia') {
            const etiqueta = 'FAMILIA';
            this.pdf.setFontSize(6.5);
            const ancho = this.pdf.getTextWidth(etiqueta) + 7;
            const x = this.pageWidth - this.marginRight - ancho - 3;

            this.pdf.setFillColor(fuerte.r, fuerte.g, fuerte.b);
            this.pdf.roundedRect(x, this.currentY + 2.4, ancho, 5, 2.5, 2.5, 'F');
            this.pdf.setTextColor(255, 255, 255);
            this.pdf.text(etiqueta, x + ancho / 2, this.currentY + 5.9, { align: 'center' });
        }

        this.currentY += alto + 3;
    }

    private generarSubtitulo(nombre: string): void {
        const oscuro = this.oscurecer(this.acento, 0.15);

        this.pdf.setFillColor(oscuro.r, oscuro.g, oscuro.b);
        this.pdf.circle(this.marginLeft + 3, this.currentY - 1, 1.1, 'F');

        this.pdf.setFontSize(8.5);
        this.pdf.setFont('helvetica', 'bold');
        this.pdf.setTextColor(oscuro.r, oscuro.g, oscuro.b);
        this.pdf.text(nombre, this.marginLeft + 6, this.currentY);
        this.currentY += 3.5;
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
    private generarTablaFilas(seccion: any): void {
        const califica = seccion.se_califica == 1 && this.datos.valores.length > 0;
        const porColumnas = (this.datos.estiloMarca || 'columnas') === 'columnas';

        if (!califica) {
            this.generarTablaSimple(seccion);
            return;
        }

        if (porColumnas) {
            this.generarTablaPorColumnas(seccion);
        } else {
            this.generarTablaColumnaUnica(seccion);
        }
    }

    /** Secciones informativas: solo el listado, sin marca */
    private generarTablaSimple(seccion: any): void {
        const body = (seccion.filas || []).map((f: any) => [f.texto_fila || '']);

        autoTable(this.pdf, {
            startY: this.currentY,
            body: body,
            theme: 'plain',
            margin: { left: this.marginLeft, right: this.marginRight, bottom: this.marginBottom, top: this.marginTop },
            styles: this.estilosBase(),
            alternateRowStyles: { fillColor: this.hexToArray(this.colors.lightGray) },
            columnStyles: { 0: { cellWidth: this.contentWidth } }
        });

        this.currentY = this.pdf.lastAutoTable.finalY + 4;
    }

    /** Una columna por cada valor de la escala */
    private generarTablaPorColumnas(seccion: any): void {
        const head: any[] = [[{ content: '', styles: { halign: 'left' } }]];
        this.datos.valores.forEach(v => {
            head[0].push({ content: v.valor_cualitativo, styles: { halign: 'center' } });
        });

        const body = (seccion.filas || []).map((f: any) => {
            const fila: any[] = [f.texto_fila || ''];
            this.datos.valores.forEach(v => {
                fila.push(f.id_valor_parametro === v.id ? this.simbolo(v) : '');
            });
            return fila;
        });

        const anchoValor = Math.min(26, (this.contentWidth * 0.45) / this.datos.valores.length);
        const columnStyles: any = {
            0: { cellWidth: this.contentWidth - (anchoValor * this.datos.valores.length) }
        };
        this.datos.valores.forEach((v, i) => {
            columnStyles[i + 1] = { cellWidth: anchoValor, halign: 'center', fontStyle: 'bold' };
        });

        autoTable(this.pdf, {
            startY: this.currentY,
            head: head,
            body: body,
            theme: 'plain',
            margin: { left: this.marginLeft, right: this.marginRight, bottom: this.marginBottom, top: this.marginTop },
            styles: this.estilosBase(),
            headStyles: this.estilosCabecera(),
            alternateRowStyles: { fillColor: this.hexToArray(this.colors.lightGray) },
            columnStyles: columnStyles,
            // El punto se pinta a mano porque autoTable no dibuja formas
            didDrawCell: (data: any) => {
                if (this.datos.simboloMarca !== 'punto' || data.section !== 'body' || data.column.index === 0) {
                    return;
                }
                const valor = this.datos.valores[data.column.index - 1];
                const fila = (seccion.filas || [])[data.row.index];
                if (!fila || fila.id_valor_parametro !== valor.id) {
                    return;
                }
                this.pintarPunto(data, valor);
            }
        });

        this.currentY = this.pdf.lastAutoTable.finalY + 4;
    }

    /** Una sola columna con el valor alcanzado, en pastilla de color */
    private generarTablaColumnaUnica(seccion: any): void {
        const anchoMarca = 48;

        const body = (seccion.filas || []).map((f: any) => {
            const valor = this.datos.valores.find(v => v.id === f.id_valor_parametro);
            return [
                f.texto_fila || '',
                // El texto va vacío: la pastilla se dibuja encima de la celda
                valor ? '' : ''
            ];
        });

        autoTable(this.pdf, {
            startY: this.currentY,
            body: body,
            theme: 'plain',
            margin: { left: this.marginLeft, right: this.marginRight, bottom: this.marginBottom, top: this.marginTop },
            styles: this.estilosBase(),
            alternateRowStyles: { fillColor: this.hexToArray(this.colors.lightGray) },
            columnStyles: {
                0: { cellWidth: this.contentWidth - anchoMarca },
                1: { cellWidth: anchoMarca, halign: 'center' }
            },
            didDrawCell: (data: any) => {
                if (data.section !== 'body' || data.column.index !== 1) {
                    return;
                }
                const fila = (seccion.filas || [])[data.row.index];
                const valor = this.datos.valores.find(v => v.id === fila?.id_valor_parametro);
                if (!valor) {
                    return;
                }
                this.pintarPastilla(data, valor);
            }
        });

        this.currentY = this.pdf.lastAutoTable.finalY + 4;
    }

    /** Lo que se imprime dentro de la celda marcada */
    private simbolo(valor: any): string {
        switch (this.datos.simboloMarca) {
            case 'valor': return String(valor.valor_cuantitativo ?? 'X');
            case 'texto': return valor.valor_cualitativo;
            case 'punto': return '';   // el punto se dibuja aparte
            default:      return 'X';
        }
    }

    /** Punto de color centrado en la celda */
    private pintarPunto(data: any, valor: any): void {
        const rgb = this.hexToRgb(valor.color || this.acento);
        const cx = data.cell.x + (data.cell.width / 2);
        const cy = data.cell.y + (data.cell.height / 2);

        const claro = this.aclarar(valor.color || this.acento, 0.78);
        this.pdf.setFillColor(claro.r, claro.g, claro.b);
        this.pdf.circle(cx, cy, 3.1, 'F');

        this.pdf.setFillColor(rgb.r, rgb.g, rgb.b);
        this.pdf.circle(cx, cy, 1.9, 'F');
    }

    /** Pastilla con el nombre del valor, para la columna única */
    private pintarPastilla(data: any, valor: any): void {
        const color = valor.color || this.acento;
        const claro = this.aclarar(color, 0.85);
        const rgb = this.hexToRgb(color);
        const oscuro = this.oscurecer(color, 0.28);

        const texto = this.datos.simboloMarca === 'valor'
            ? String(valor.valor_cuantitativo ?? '')
            : valor.valor_cualitativo;

        this.pdf.setFontSize(6.8);
        this.pdf.setFont('helvetica', 'bold');

        const anchoTexto = this.pdf.getTextWidth(texto);
        const ancho = Math.min(anchoTexto + 11, data.cell.width - 3);
        const alto = 5.4;
        const x = data.cell.x + (data.cell.width - ancho) / 2;
        const y = data.cell.y + (data.cell.height - alto) / 2;

        this.pdf.setFillColor(claro.r, claro.g, claro.b);
        this.pdf.roundedRect(x, y, ancho, alto, 2.7, 2.7, 'F');

        this.pdf.setFillColor(rgb.r, rgb.g, rgb.b);
        this.pdf.circle(x + 3.2, y + alto / 2, 1.3, 'F');

        this.pdf.setTextColor(oscuro.r, oscuro.g, oscuro.b);
        this.pdf.text(texto, x + 5.6, y + 3.7, { maxWidth: ancho - 7 });
    }

    private estilosBase(): any {
        const textoRgb = this.hexToRgb(this.colors.texto);
        return {
            font: 'helvetica',
            fontSize: 8,
            cellPadding: { top: 2.4, bottom: 2.4, left: 3, right: 3 },
            lineColor: this.hexToArray(this.colors.borde),
            lineWidth: 0,
            textColor: [textoRgb.r, textoRgb.g, textoRgb.b],
            valign: 'middle'
        };
    }

    private estilosCabecera(): any {
        const oscuro = this.oscurecer(this.acento, 0.3);
        const fondo = this.aclarar(this.acento, 0.86);
        return {
            fillColor: [fondo.r, fondo.g, fondo.b],
            textColor: [oscuro.r, oscuro.g, oscuro.b],
            fontStyle: 'bold',
            fontSize: 7,
            cellPadding: { top: 2.2, bottom: 2.2, left: 2, right: 2 },
            lineWidth: 0
        };
    }

    private generarParrafo(texto: string): void {
        const textoRgb = this.hexToRgb(this.colors.texto);
        const fondo = this.aclarar(this.acento, 0.94);

        this.pdf.setFontSize(8.5);
        this.pdf.setFont('helvetica', 'normal');

        const lineas = this.pdf.splitTextToSize(texto, this.contentWidth - 12);
        const alto = lineas.length * 4.4 + 8;

        this.verificarEspacio(alto + 4);

        this.pdf.setFillColor(fondo.r, fondo.g, fondo.b);
        this.pdf.roundedRect(this.marginLeft, this.currentY, this.contentWidth, alto, 2.5, 2.5, 'F');

        this.pdf.setTextColor(textoRgb.r, textoRgb.g, textoRgb.b);
        this.pdf.text(lineas, this.marginLeft + 6, this.currentY + 6);

        this.currentY += alto + 4;
    }

    // =================================================================
    // CIERRE Y FIRMAS
    // =================================================================

    private generarCierre(): void {
        if (!this.datos.textoCierre) {
            return;
        }

        this.verificarEspacio(34);
        this.generarTituloSeccion({ nombre: 'Observaciones', evalua_a: 'estudiante' });
        this.generarParrafo(this.datos.textoCierre);
    }

    private generarFirmas(): void {
        const firmas: string[] = [];
        if (this.datos.firmaUno) {
            firmas.push(this.datos.firmaUno);
        }
        if (this.datos.firmaDos) {
            firmas.push(this.datos.firmaDos);
        }
        if (this.datos.firmaAcudiente) {
            firmas.push('Firma de recibido del acudiente');
        }

        if (firmas.length === 0) {
            return;
        }

        // Las firmas necesitan poco: si caben con el contenido, se pegan
        // debajo en vez de saltar a una hoja nueva casi vacía.
        const altoFirmas = 22;
        const espacioLibre = this.pageHeight - this.marginBottom - this.currentY;

        if (espacioLibre < altoFirmas) {
            this.pdf.addPage();
            this.currentY = this.marginTop;
            this.currentY += 10;
        } else {
            // Si sobra sitio, se bajan un poco para separarlas del contenido,
            // sin pasarse del borde.
            const aire = Math.min(16, espacioLibre - altoFirmas);
            this.currentY += aire;
        }

        const grisRgb = this.hexToRgb(this.colors.darkGray);
        const suave = this.aclarar(this.acento, 0.5);
        const anchoFirma = this.contentWidth / firmas.length;

        firmas.forEach((firma, i) => {
            const x = this.marginLeft + (anchoFirma * i);
            const centro = x + (anchoFirma / 2);

            this.pdf.setDrawColor(suave.r, suave.g, suave.b);
            this.pdf.setLineWidth(0.4);
            this.pdf.line(x + 8, this.currentY, x + anchoFirma - 8, this.currentY);

            this.pdf.setFontSize(7.5);
            this.pdf.setFont('helvetica', 'normal');
            this.pdf.setTextColor(grisRgb.r, grisRgb.g, grisRgb.b);
            this.pdf.text(firma, centro, this.currentY + 4.5, { align: 'center', maxWidth: anchoFirma - 6 });
        });

        this.currentY += 12;
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