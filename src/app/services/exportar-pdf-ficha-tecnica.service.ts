import { Injectable } from '@angular/core';
import { InstitucionConfigService } from './institucion-config.service';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface DatosFichaTecnicaPDF {
    productoLimpieza: any;
    logoBase64?: string;
    fechaGeneracion: Date;
}

@Injectable({
    providedIn: 'root'
})
export class ExportarPdfFichaTecnicaService {

    constructor(private institucionConfigService: InstitucionConfigService) { }

    async generarPDF(datos: DatosFichaTecnicaPDF): Promise<void> {
        const doc = new jsPDF();
        let yPosition = 20;

        // Colores corporativos
        const colorPrimario = [245, 166, 35] as [number, number, number];
        const colorSecundario = [44, 44, 44] as [number, number, number];

        // Configurar fuente
        doc.setFontSize(10);

        // Encabezado con logo
        if (datos.logoBase64) {
            try {
                doc.addImage(datos.logoBase64, 'PNG', 20, yPosition, 25, 25);
            } catch (error) {
                console.error('Error al agregar logo:', error);
            }
        }

        // Título de la institución
        doc.setFontSize(18);
        doc.setTextColor(colorSecundario[0], colorSecundario[1], colorSecundario[2]);
        const nombreInstitucion = this.institucionConfigService.getNombreInstitucion();
    doc.text(nombreInstitucion, 55, yPosition + 10);

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text('Ficha Técnica - Producto de Limpieza', 55, yPosition + 18);

        // Línea divisoria
        yPosition += 35;

        // PRIMERO: Escribir el nombre del producto
        doc.setFontSize(14);
        doc.setTextColor(colorSecundario[0], colorSecundario[1], colorSecundario[2]);
        doc.text(datos.productoLimpieza.nombre_producto || '', 105, yPosition, { align: 'center' });


        // DESPUÉS: Dibujar la línea amarilla debajo del nombre
        yPosition += 10;
        doc.setDrawColor(colorPrimario[0], colorPrimario[1], colorPrimario[2]);
        doc.setLineWidth(2);
        doc.line(20, yPosition, 190, yPosition);

        // Ajustar posición para continuar con el resto del contenido
        yPosition += 15;

        // Intentar cargar la imagen del producto
        if (datos.productoLimpieza.imagen_producto &&
            !datos.productoLimpieza.imagen_producto.includes('/assets/images/producto.png') &&
            datos.productoLimpieza.imagen_producto.startsWith('data:image')) {
            try {
                // La imagen ya viene en base64
                doc.addImage(datos.productoLimpieza.imagen_producto, 'JPEG', 20, yPosition, 50, 50);
            } catch (error) {
                console.error('Error al agregar imagen del producto:', error);
                // Si falla, mostrar placeholder
                doc.setDrawColor(200);
                doc.rect(20, yPosition, 50, 50);
                doc.setFontSize(8);
                doc.setTextColor(150);
                doc.text('Error al cargar', 30, yPosition + 25);
                doc.text('imagen', 35, yPosition + 30);
            }
        } else {
            // Mostrar placeholder si no hay imagen
            doc.setDrawColor(200);
            doc.rect(20, yPosition, 50, 50);
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text('Sin imagen', 35, yPosition + 25);
        }

        // Información básica en tabla (al lado de la imagen)
        const infoBasica = [
            ['Tipo de Limpieza', datos.productoLimpieza.tipo_limpieza || 'N/A'],
            ['Precio', this.formatearMoneda(datos.productoLimpieza.precio_unitario || 0)],
            ['Unidad de Medida', datos.productoLimpieza.unidad_medida || 'N/A']
        ];

        autoTable(doc, {
            startY: yPosition,
            head: [],
            body: infoBasica,
            theme: 'plain',
            margin: { left: 80 },
            columnStyles: {
                0: { fontStyle: 'bold', cellWidth: 40 },
                1: { cellWidth: 70 }
            },
            styles: {
                fontSize: 10,
                cellPadding: 3
            }
        });

        // Ajustar posición Y después de la tabla o imagen (lo que sea más bajo)
        const tablaFinalY = (doc as any).lastAutoTable.finalY;
        yPosition = Math.max(tablaFinalY, yPosition + 55) + 15;

        // Descripción del producto
        if (datos.productoLimpieza.descripcion_producto) {
            doc.setFontSize(12);
            doc.setTextColor(colorSecundario[0], colorSecundario[1], colorSecundario[2]);
            doc.text('Descripción del Producto', 20, yPosition);
            yPosition += 7;

            doc.setFontSize(10);
            doc.setTextColor(60);
            const descripcionLineas = doc.splitTextToSize(
                datos.productoLimpieza.descripcion_producto || 'Sin descripción disponible',
                170
            );
            doc.text(descripcionLineas, 20, yPosition);
            yPosition += descripcionLineas.length * 5 + 10;
        }


        // COMPONENTES 
        if (datos.productoLimpieza.componentes) {
            // Verificar si no se pasa de página
            if (yPosition > 250) {
                doc.addPage();
                yPosition = 20;
            }

            doc.setFontSize(12);
            doc.setTextColor(colorSecundario[0], colorSecundario[1], colorSecundario[2]);
            doc.text('Componentes', 20, yPosition);
            yPosition += 7;

            // Procesar HTML de componentes
            const componentesHTML = datos.productoLimpieza.componentes;

            // Crear un elemento temporal para parsear el HTML
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = componentesHTML;

            // Extraer los elementos de lista
            const listItems = tempDiv.querySelectorAll('li');

            doc.setFontSize(10);
            doc.setTextColor(60);

            if (listItems.length > 0) {
                // Si hay elementos <li>, procesarlos uno por uno
                listItems.forEach((item: any) => {
                    const texto = '• ' + item.textContent.trim();
                    const lineas = doc.splitTextToSize(texto, 170);
                    doc.text(lineas, 20, yPosition);
                    yPosition += lineas.length * 5 + 2;
                });
            } else {
                // Si no hay elementos <li>, intentar procesar como texto plano con bullets
                const textoPlano = this.stripHtml(componentesHTML);
                const lineas = textoPlano.split('•').filter(l => l.trim());

                lineas.forEach(linea => {
                    const textoConBullet = '• ' + linea.trim();
                    const lineasProcesadas = doc.splitTextToSize(textoConBullet, 170);
                    doc.text(lineasProcesadas, 20, yPosition);
                    yPosition += lineasProcesadas.length * 5 + 2;
                });
            }

            yPosition += 8;
        }

        // MODO DE USO - Campo importante
        if (datos.productoLimpieza.modo_uso) {
            // Verificar si no se pasa de página
            if (yPosition > 250) {
                doc.addPage();
                yPosition = 20;
            }

            doc.setFontSize(12);
            doc.setTextColor(colorSecundario[0], colorSecundario[1], colorSecundario[2]);
            doc.text('Modo de Uso', 20, yPosition);
            yPosition += 7;

            doc.setFontSize(10);
            doc.setTextColor(60);
            const modoUsoLineas = doc.splitTextToSize(
                datos.productoLimpieza.modo_uso || 'Sin instrucciones disponibles',
                170
            );
            doc.text(modoUsoLineas, 20, yPosition);
            yPosition += modoUsoLineas.length * 5 + 10;
        }

        // Línea divisoria antes del pie
        doc.setDrawColor(200);
        doc.setLineWidth(0.5);
        doc.line(20, 270, 190, 270);

        // Pie de página
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(
            `Ficha técnica generada el ${datos.fechaGeneracion.toLocaleDateString('es-CO')} a las ${datos.fechaGeneracion.toLocaleTimeString('es-CO')}`,
            105,
            280,
            { align: 'center' }
        );

        // Información adicional en el pie
        doc.setFontSize(7);
        const nombreInst = this.institucionConfigService.getNombreInstitucion();
    const direccionInst = this.institucionConfigService.getDireccionInstitucion();
    const nitInst = this.institucionConfigService.getNitInstitucion();
    doc.text(`${nombreInst} - ${direccionInst} - NIT: ${nitInst}`, 105, 285, { align: 'center' });

        // Guardar el PDF
        const nombreArchivo = `ficha_tecnica_${(datos.productoLimpieza.nombre_producto || 'producto').replace(/\s+/g, '_')}_${new Date().getTime()}.pdf`;
        doc.save(nombreArchivo);
    }

    private stripHtml(html: string): string {
        if (!html) return '';

        const tmp = document.createElement('DIV');
        tmp.innerHTML = html;

        // Convertir <li> en viñetas
        const listItems = tmp.getElementsByTagName('li');
        for (let i = 0; i < listItems.length; i++) {
            listItems[i].innerHTML = '• ' + listItems[i].innerHTML;
        }

        // Obtener texto limpio
        let texto = tmp.textContent || tmp.innerText || '';

        // Limpiar espacios múltiples
        texto = texto.replace(/\s+/g, ' ').trim();

        return texto;
    }

    private formatearMoneda(valor: number): string {
        if (!valor || valor === 0) return 'No definido';

        return valor.toLocaleString('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        });
    }
}