import { Injectable } from '@angular/core';
import { jsPDF } from 'jspdf';
import { InstitucionConfigService } from './institucion-config.service';

/**
 * Dibuja en PDF el certificado que el backend ya dejó resuelto.
 *
 * El HTML que llega es deliberadamente pobre: <h1>, <p> con
 * style="text-align:...", <b>/<strong> y <table>. No se usa html2canvas ni
 * jsPDF.html() para no meter dependencias nuevas ni depender del renderizado
 * del navegador: el documento debe salir igual en cualquier equipo.
 *
 * El marcador {{firma_linea}} se reemplaza por la raya de la firma, que no es
 * texto sino un trazo.
 */
@Injectable({
  providedIn: 'root',
})
export class ExportarPdfCertificadoService {

  private readonly MARGEN = 20;
  private readonly ANCHO_PAGINA = 210;
  private readonly ALTO_PAGINA = 297;
  private readonly ANCHO_UTIL = this.ANCHO_PAGINA - this.MARGEN * 2;

  constructor(private institucionConfigService: InstitucionConfigService) {}

  /**
   * Genera y descarga el PDF.
   * @param contenidoHtml HTML resuelto que devolvió el backend
   * @param nombreArchivo nombre del archivo, sin extensión
   */
  async generarPDF(contenidoHtml: string, nombreArchivo: string): Promise<void> {
    const doc = new jsPDF('p', 'mm', 'a4');
    const logoBase64 = await this.cargarLogoBase64();

    let y = this.MARGEN;

    if (logoBase64) {
      try {
        doc.addImage(logoBase64, 'PNG', this.MARGEN, y, 28, 28);
      } catch (error) {
        console.error('No se pudo dibujar el logo del certificado:', error);
      }
    }

    y += 34;

    // Línea separadora bajo el logo, como en los certificados impresos.
    doc.setDrawColor(180, 180, 180);
    doc.line(this.MARGEN, y, this.ANCHO_PAGINA - this.MARGEN, y);
    y += 10;

    const bloques = this.parsearHtml(contenidoHtml);

    for (const bloque of bloques) {
      y = this.dibujarBloque(doc, bloque, y);
    }

    doc.save(`${nombreArchivo}.pdf`);
  }

  /**
   * Convierte el HTML en bloques que el dibujante entiende. Se usa DOMParser
   * en vez de expresiones regulares para no romperse con atributos o espacios
   * que la plantilla del jardín pueda traer.
   */
  private parsearHtml(html: string): any[] {
    const parser = new DOMParser();
    const documento = parser.parseFromString(`<div>${html}</div>`, 'text/html');
    const raiz = documento.body.firstElementChild;
    const bloques: any[] = [];

    if (!raiz) {
      return bloques;
    }

    raiz.childNodes.forEach((nodo: any) => {
      if (nodo.nodeType !== 1) {
        return;
      }

      const etiqueta = nodo.tagName.toLowerCase();

      if (etiqueta === 'h1') {
        bloques.push({ tipo: 'titulo', texto: (nodo.textContent || '').trim() });
        return;
      }

      if (etiqueta === 'table') {
        bloques.push({ tipo: 'tabla', filas: this.leerTabla(nodo) });
        return;
      }

      if (etiqueta === 'p') {
        const texto = (nodo.textContent || '').trim();

        if (texto.indexOf('{{firma_linea}}') >= 0) {
          bloques.push({ tipo: 'firma_linea' });
          return;
        }

        if (texto === '') {
          return;
        }

        bloques.push({
          tipo: 'parrafo',
          partes: this.leerPartes(nodo),
          alineacion: this.leerAlineacion(nodo),
          tamano: this.leerTamano(nodo)
        });
      }
    });

    return bloques;
  }

  /**
   * Trocea el párrafo en fragmentos con y sin negrita, para poder dibujar
   * "identificado con <b>No. 123</b>" en una sola línea.
   */
  private leerPartes(nodo: any): any[] {
    const partes: any[] = [];

    const recorrer = (elemento: any, negrita: boolean) => {
      elemento.childNodes.forEach((hijo: any) => {
        if (hijo.nodeType === 3) {
          const texto = (hijo.textContent || '').replace(/\s+/g, ' ');
          if (texto !== '') {
            partes.push({ texto, negrita });
          }
          return;
        }
        if (hijo.nodeType === 1) {
          const etiqueta = hijo.tagName.toLowerCase();
          recorrer(hijo, negrita || etiqueta === 'b' || etiqueta === 'strong');
        }
      });
    };

    recorrer(nodo, false);

    return partes;
  }

  private leerAlineacion(nodo: any): string {
    const estilo = (nodo.getAttribute('style') || '').toLowerCase();
    if (estilo.indexOf('text-align:center') >= 0 || estilo.indexOf('text-align: center') >= 0) {
      return 'center';
    }
    if (estilo.indexOf('text-align:right') >= 0 || estilo.indexOf('text-align: right') >= 0) {
      return 'right';
    }
    return 'justify';
  }

  private leerTamano(nodo: any): number {
    const estilo = (nodo.getAttribute('style') || '').toLowerCase();
    const coincidencia = estilo.match(/font-size:\s*(\d+)/);
    return coincidencia ? parseInt(coincidencia[1], 10) : 11;
  }

  private leerTabla(nodo: any): any[] {
    const filas: any[] = [];

    nodo.querySelectorAll('tr').forEach((tr: any) => {
      const celdas: any[] = [];
      let encabezado = false;

      tr.querySelectorAll('th,td').forEach((celda: any) => {
        if (celda.tagName.toLowerCase() === 'th') {
          encabezado = true;
        }
        celdas.push((celda.textContent || '').trim());
      });

      if (celdas.length > 0) {
        filas.push({ encabezado, celdas });
      }
    });

    return filas;
  }

  // -----------------------------------------------------------------
  // Dibujo
  // -----------------------------------------------------------------

  private dibujarBloque(doc: jsPDF, bloque: any, y: number): number {
    if (bloque.tipo === 'titulo') {
      y = this.saltarSiNoCabe(doc, y, 14);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.setTextColor(0, 0, 0);
      doc.text(bloque.texto, this.ANCHO_PAGINA / 2, y, { align: 'center' });
      return y + 12;
    }

    if (bloque.tipo === 'firma_linea') {
      y = this.saltarSiNoCabe(doc, y, 25);
      y += 18;
      doc.setDrawColor(0, 0, 0);
      const mitad = this.ANCHO_PAGINA / 2;
      doc.line(mitad - 45, y, mitad + 45, y);
      return y + 6;
    }

    if (bloque.tipo === 'tabla') {
      return this.dibujarTabla(doc, bloque.filas, y);
    }

    return this.dibujarParrafo(doc, bloque, y);
  }

  /**
   * Dibuja el párrafo respetando las negritas dentro de la línea. Se arma
   * palabra por palabra para poder justificar y cortar donde corresponde.
   */
  private dibujarParrafo(doc: jsPDF, bloque: any, y: number): number {
    const tamano = bloque.tamano;
    const altoLinea = tamano * 0.45 + 2.2;

    doc.setFontSize(tamano);
    doc.setTextColor(0, 0, 0);

    const palabras: any[] = [];
    bloque.partes.forEach((parte: any) => {
      parte.texto.split(' ').forEach((palabra: string) => {
        if (palabra !== '') {
          palabras.push({ texto: palabra, negrita: parte.negrita });
        }
      });
    });

    let linea: any[] = [];
    let anchoLinea = 0;
    const anchoEspacio = doc.getTextWidth(' ');

    const pintarLinea = (lineaActual: any[], anchoActual: number, posicionY: number) => {
      let x = this.MARGEN;

      if (bloque.alineacion === 'center') {
        x = (this.ANCHO_PAGINA - anchoActual) / 2;
      } else if (bloque.alineacion === 'right') {
        x = this.ANCHO_PAGINA - this.MARGEN - anchoActual;
      }

      lineaActual.forEach((palabra: any, indice: number) => {
        doc.setFont('helvetica', palabra.negrita ? 'bold' : 'normal');
        doc.text(palabra.texto, x, posicionY);
        x += doc.getTextWidth(palabra.texto);
        if (indice < lineaActual.length - 1) {
          x += anchoEspacio;
        }
      });
    };

    for (const palabra of palabras) {
      doc.setFont('helvetica', palabra.negrita ? 'bold' : 'normal');
      const ancho = doc.getTextWidth(palabra.texto);
      const anchoConEspacio = linea.length === 0 ? ancho : anchoLinea + anchoEspacio + ancho;

      if (anchoConEspacio > this.ANCHO_UTIL && linea.length > 0) {
        y = this.saltarSiNoCabe(doc, y, altoLinea);
        pintarLinea(linea, anchoLinea, y);
        y += altoLinea;
        linea = [palabra];
        anchoLinea = ancho;
        continue;
      }

      linea.push(palabra);
      anchoLinea = anchoConEspacio;
    }

    if (linea.length > 0) {
      y = this.saltarSiNoCabe(doc, y, altoLinea);
      pintarLinea(linea, anchoLinea, y);
      y += altoLinea;
    }

    return y + 4;
  }

  private dibujarTabla(doc: jsPDF, filas: any[], y: number): number {
    if (filas.length === 0) {
      return y;
    }

    const columnas = filas[0].celdas.length;
    const anchoColumna = this.ANCHO_UTIL / columnas;
    const altoFila = 7;

    doc.setFontSize(9);

    for (const fila of filas) {
      y = this.saltarSiNoCabe(doc, y, altoFila);

      doc.setFont('helvetica', fila.encabezado ? 'bold' : 'normal');

      if (fila.encabezado) {
        doc.setFillColor(240, 240, 240);
        doc.rect(this.MARGEN, y - 4.5, this.ANCHO_UTIL, altoFila, 'F');
      }

      fila.celdas.forEach((celda: string, indice: number) => {
        const x = this.MARGEN + anchoColumna * indice + 1.5;
        // La última columna es el valor: va a la derecha para que los montos cuadren.
        const esUltima = indice === columnas - 1;
        const texto = doc.splitTextToSize(celda, anchoColumna - 3)[0];

        if (esUltima) {
          doc.text(texto, this.MARGEN + anchoColumna * (indice + 1) - 1.5, y, { align: 'right' });
        } else {
          doc.text(texto, x, y);
        }
      });

      doc.setDrawColor(210, 210, 210);
      doc.line(this.MARGEN, y + 2.5, this.ANCHO_PAGINA - this.MARGEN, y + 2.5);

      y += altoFila;
    }

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');

    return y + 5;
  }

  private saltarSiNoCabe(doc: jsPDF, y: number, alto: number): number {
    if (y + alto > this.ALTO_PAGINA - this.MARGEN) {
      doc.addPage();
      return this.MARGEN;
    }
    return y;
  }

  private async cargarLogoBase64(): Promise<string> {
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
      console.error('Error al cargar logo:', error);
      return '';
    }
  }
}
