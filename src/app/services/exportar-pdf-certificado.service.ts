import { Injectable } from '@angular/core';
import { jsPDF } from 'jspdf';
import { firstValueFrom } from 'rxjs';
import { InstitucionConfigService } from './institucion-config.service';
import { ConfiguracionGlobalService } from './configuracion-global.service';

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

  constructor(
    private institucionConfigService: InstitucionConfigService,
    private configuracionGlobalService: ConfiguracionGlobalService
  ) {}

  /**
   * Genera y descarga el PDF.
   * @param contenidoHtml HTML resuelto que devolvió el backend
   * @param nombreArchivo nombre del archivo, sin extensión
   */
  async generarPDF(contenidoHtml: string, nombreArchivo: string): Promise<void> {
    const doc = new jsPDF('p', 'mm', 'a4');
    const logoBase64 = await this.cargarLogoBase64();
    const firmaBase64 = await this.cargarFirmaBase64();

    const meta = this.leerMeta(contenidoHtml);
    const bloques = this.parsearHtml(contenidoHtml);

    // El título va al lado del logo, no debajo: la cabecera lo consume y no se
    // vuelve a dibujar como bloque.
    const indiceTitulo = bloques.findIndex((b: any) => b.tipo === 'titulo');
    const titulo = indiceTitulo >= 0 ? bloques.splice(indiceTitulo, 1)[0].texto : '';

    let y = this.dibujarCabecera(doc, logoBase64, titulo, meta.numero);

    for (const bloque of bloques) {
      y = this.dibujarBloque(doc, bloque, y, firmaBase64);
    }

    this.dibujarPies(doc, meta.contacto);

    doc.save(`${nombreArchivo}.pdf`);
  }

  /**
   * Número y línea de contacto que el backend deja como metadatos, para
   * dibujarlos en la cabecera y el pie en vez de dentro del cuerpo.
   */
  private leerMeta(html: string): any {
    const parser = new DOMParser();
    const documento = parser.parseFromString(`<div>${html}</div>`, 'text/html');
    const nodo: any = documento.querySelector('[data-numero]');

    return {
      numero: nodo ? nodo.getAttribute('data-numero') || '' : '',
      contacto: nodo ? nodo.getAttribute('data-contacto') || '' : ''
    };
  }

  /**
   * Logo a la izquierda y título a su derecha, con el consecutivo bajo el
   * título. Devuelve la Y donde empieza el cuerpo.
   */
  private dibujarCabecera(doc: jsPDF, logoBase64: string, titulo: string, numero: string): number {
    const ALTO_LOGO = 26;
    const y = this.MARGEN;

    if (logoBase64) {
      try {
        doc.addImage(logoBase64, 'PNG', this.MARGEN, y, ALTO_LOGO, ALTO_LOGO);
      } catch (error) {
        console.error('No se pudo dibujar el logo del certificado:', error);
      }
    }

    if (titulo) {
      const xTitulo = this.MARGEN + (logoBase64 ? ALTO_LOGO + 8 : 0);
      const anchoTitulo = this.ANCHO_PAGINA - this.MARGEN - xTitulo;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(17);
      doc.setTextColor(0, 0, 0);

      const lineas = doc.splitTextToSize(titulo, anchoTitulo);
      const altoNumero = numero ? 5 : 0;
      const altoTexto = lineas.length * 7.5 + altoNumero;
      // Centrado contra el logo; +5 compensa la línea base del texto.
      let yTitulo = y + (ALTO_LOGO - altoTexto) / 2 + 5;

      lineas.forEach((linea: string) => {
        doc.text(linea, xTitulo, yTitulo);
        yTitulo += 7.5;
      });

      if (numero) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(120, 120, 120);
        doc.text(`Certificado No. ${numero}`, xTitulo, yTitulo);
        doc.setTextColor(0, 0, 0);
      }
    }

    const yLinea = y + ALTO_LOGO + 7;
    doc.setDrawColor(180, 180, 180);
    doc.line(this.MARGEN, yLinea, this.ANCHO_PAGINA - this.MARGEN, yLinea);

    return yLinea + 10;
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

    // La plantilla pone {{tabla_pagos}} dentro de un párrafo, así que la tabla
    // queda anidada en el <p> y se pintaría como texto corrido. Se saca al
    // nivel de arriba antes de recorrer.
    raiz.querySelectorAll('p > table').forEach((tabla: any) => {
      const parrafo = tabla.parentElement;
      if (parrafo && parrafo.parentElement) {
        parrafo.parentElement.insertBefore(tabla, parrafo);
        if ((parrafo.textContent || '').trim() === '') {
          parrafo.remove();
        }
      }
    });

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

  private dibujarBloque(doc: jsPDF, bloque: any, y: number, firmaBase64: string): number {
    if (bloque.tipo === 'firma_linea') {
      y = this.saltarSiNoCabe(doc, y, 25);
      y += 18;

      const mitad = this.ANCHO_PAGINA / 2;

      // Firma escaneada del representante legal, la misma que usan los
      // contratos. Si el jardin no la tiene cargada, queda solo la linea.
      if (firmaBase64) {
        try {
          let formato = 'PNG';
          if (firmaBase64.includes('data:image/jpeg') || firmaBase64.includes('data:image/jpg')) {
            formato = 'JPEG';
          }
          doc.addImage(firmaBase64, formato, mitad - 25, y - 16, 50, 14);
        } catch (error) {
          console.warn('No se pudo insertar la firma:', error);
        }
      }

      doc.setDrawColor(0, 0, 0);
      doc.line(mitad - 45, y, mitad + 45, y);
      return y + 6;
    }

    if (bloque.tipo === 'tabla') {
      return this.dibujarTabla(doc, bloque.filas, y);
    }

    return this.dibujarParrafo(doc, bloque, y);
  }

  /**
   * Dibuja el párrafo respetando las negritas dentro de la línea.
   *
   * Las palabras seguidas con el mismo estilo se pintan en una sola llamada,
   * con sus espacios incluidos: midiendo y avanzando palabra por palabra el
   * espacio quedaba más angosto que el de la fuente y el texto salía pegado
   * ("SESENTAY SEIS").
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

    const anchoDe = (palabrasLinea: any[]): number => {
      let total = 0;
      this.agruparPorEstilo(palabrasLinea).forEach((grupo: any) => {
        doc.setFont('helvetica', grupo.negrita ? 'bold' : 'normal');
        total += doc.getTextWidth(grupo.texto);
      });
      return total;
    };

    const pintarLinea = (palabrasLinea: any[], posicionY: number) => {
      const ancho = anchoDe(palabrasLinea);
      let x = this.MARGEN;

      if (bloque.alineacion === 'center') {
        x = (this.ANCHO_PAGINA - ancho) / 2;
      } else if (bloque.alineacion === 'right') {
        x = this.ANCHO_PAGINA - this.MARGEN - ancho;
      }

      this.agruparPorEstilo(palabrasLinea).forEach((grupo: any) => {
        doc.setFont('helvetica', grupo.negrita ? 'bold' : 'normal');
        doc.text(grupo.texto, x, posicionY);
        x += doc.getTextWidth(grupo.texto);
      });
    };

    for (const palabra of palabras) {
      const tentativa = linea.concat([palabra]);

      if (anchoDe(tentativa) > this.ANCHO_UTIL && linea.length > 0) {
        y = this.saltarSiNoCabe(doc, y, altoLinea);
        pintarLinea(linea, y);
        y += altoLinea;
        linea = [palabra];
        continue;
      }

      linea = tentativa;
    }

    if (linea.length > 0) {
      y = this.saltarSiNoCabe(doc, y, altoLinea);
      pintarLinea(linea, y);
      y += altoLinea;
    }

    return y + 4;
  }

  /**
   * Junta las palabras seguidas del mismo estilo en un solo texto. Los signos
   * de puntuación se pegan a la palabra anterior, para que no quede
   * "LICEO LUMEN , identificado".
   */
  private agruparPorEstilo(palabras: any[]): any[] {
    const grupos: any[] = [];

    palabras.forEach((palabra: any, indice: number) => {
      const anterior = grupos[grupos.length - 1];
      const separador = (indice === 0 || this.pegaConAnterior(palabra.texto)) ? '' : ' ';

      if (anterior && anterior.negrita === palabra.negrita) {
        anterior.texto += separador + palabra.texto;
        return;
      }

      // Cambia el estilo: el espacio se antepone al grupo nuevo para no
      // perderlo entre un fragmento en negrita y el siguiente normal.
      grupos.push({ texto: separador + palabra.texto, negrita: palabra.negrita });
    });

    return grupos;
  }

  /** Signos que van pegados a la palabra anterior, sin espacio. */
  private pegaConAnterior(texto: string): boolean {
    return /^[,.;:)\]!?%]/.test(texto);
  }

  /**
   * Dibuja la tabla con anchos proporcionales al contenido y celdas de varias
   * líneas. Con columnas iguales el concepto no cabía y se cortaba.
   */
  private dibujarTabla(doc: jsPDF, filas: any[], y: number): number {
    if (filas.length === 0) {
      return y;
    }

    const TAMANO = 8.5;
    const ALTO_LINEA = 4;
    const PADDING = 2;

    doc.setFontSize(TAMANO);

    const columnas = filas[0].celdas.length;
    const anchos = this.calcularAnchos(doc, filas, columnas);
    const encabezado = filas.find((f: any) => f.encabezado);

    for (const fila of filas) {
      doc.setFont('helvetica', fila.encabezado ? 'bold' : 'normal');

      // Cada celda se parte en líneas y la fila crece con la más alta.
      const celdas = fila.celdas.map((celda: string, indice: number) =>
        doc.splitTextToSize(celda, anchos[indice] - PADDING * 2)
      );
      const lineas = Math.max(...celdas.map((c: string[]) => c.length));
      const altoFila = lineas * ALTO_LINEA + 2.5;

      // Si la fila no cabe, salta de página y repite el encabezado.
      if (y + altoFila > this.ALTO_PAGINA - this.MARGEN - 12) {
        doc.addPage();
        y = this.MARGEN;

        if (encabezado && !fila.encabezado) {
          y = this.dibujarFilaTabla(doc, encabezado, anchos, y, ALTO_LINEA, PADDING, true);
        }
      }

      y = this.dibujarFilaTabla(doc, fila, anchos, y, ALTO_LINEA, PADDING, fila.encabezado);
    }

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');

    return y + 6;
  }

  private dibujarFilaTabla(
    doc: jsPDF,
    fila: any,
    anchos: number[],
    y: number,
    altoLinea: number,
    padding: number,
    esEncabezado: boolean
  ): number {
    doc.setFont('helvetica', esEncabezado ? 'bold' : 'normal');

    const celdas = fila.celdas.map((celda: string, indice: number) =>
      doc.splitTextToSize(celda, anchos[indice] - padding * 2)
    );
    const lineas = Math.max(...celdas.map((c: string[]) => c.length));
    const altoFila = lineas * altoLinea + 2.5;

    if (esEncabezado) {
      doc.setFillColor(243, 240, 231);
      doc.rect(this.MARGEN, y, this.ANCHO_UTIL, altoFila, 'F');
    }

    let x = this.MARGEN;
    const ultima = fila.celdas.length - 1;

    celdas.forEach((texto: string[], indice: number) => {
      // La última columna es el valor: alineado a la derecha para que los
      // montos cuadren entre sí.
      const alDerecha = indice === ultima;
      let yTexto = y + altoLinea;

      texto.forEach((linea: string) => {
        if (alDerecha) {
          doc.text(linea, x + anchos[indice] - padding, yTexto, { align: 'right' });
        } else {
          doc.text(linea, x + padding, yTexto);
        }
        yTexto += altoLinea;
      });

      x += anchos[indice];
    });

    doc.setDrawColor(215, 215, 215);
    doc.line(this.MARGEN, y + altoFila, this.ANCHO_PAGINA - this.MARGEN, y + altoFila);

    return y + altoFila;
  }

  /**
   * Reparte el ancho según el texto más largo de cada columna, con un mínimo
   * por columna para que fecha y valor no queden estrujados.
   */
  private calcularAnchos(doc: jsPDF, filas: any[], columnas: number): number[] {
    const PADDING = 4;
    const deseados: number[] = [];
    const minimos: number[] = [];

    for (let i = 0; i < columnas; i++) {
      let mayorCelda = 0;
      let mayorPalabra = 0;

      filas.forEach((fila: any) => {
        const contenido = fila.celdas[i] || '';
        doc.setFont('helvetica', fila.encabezado ? 'bold' : 'normal');

        const anchoCelda = doc.getTextWidth(contenido);
        if (anchoCelda > mayorCelda) {
          mayorCelda = anchoCelda;
        }

        // La palabra más larga marca el mínimo: sin esto una fecha o un monto
        // se partía en dos líneas ("26/01/20" / "26").
        contenido.split(' ').forEach((palabra: string) => {
          const anchoPalabra = doc.getTextWidth(palabra);
          if (anchoPalabra > mayorPalabra) {
            mayorPalabra = anchoPalabra;
          }
        });
      });

      deseados.push(mayorCelda + PADDING);
      // La última columna es el valor y nunca se parte: los certificados
      // expedidos antes traen "$ 900.000" con espacio y el signo caía solo.
      minimos.push((i === columnas - 1 ? mayorCelda : mayorPalabra) + PADDING);
    }

    doc.setFont('helvetica', 'normal');

    const totalDeseado = deseados.reduce((a, b) => a + b, 0);

    // Si todo cabe, se respeta el ancho natural de cada columna.
    if (totalDeseado <= this.ANCHO_UTIL) {
      const sobra = this.ANCHO_UTIL - totalDeseado;
      const mayor = deseados.indexOf(Math.max(...deseados));
      return deseados.map((ancho, i) => (i === mayor ? ancho + sobra : ancho));
    }

    // Si no cabe, se reparte lo que queda tras cubrir los mínimos, en
    // proporción a lo que cada columna pedía de más.
    const totalMinimo = minimos.reduce((a, b) => a + b, 0);

    if (totalMinimo >= this.ANCHO_UTIL) {
      return minimos.map(ancho => (ancho / totalMinimo) * this.ANCHO_UTIL);
    }

    const disponible = this.ANCHO_UTIL - totalMinimo;
    const extras = deseados.map((ancho, i) => Math.max(0, ancho - minimos[i]));
    const totalExtra = extras.reduce((a, b) => a + b, 0);

    return minimos.map((minimo, i) =>
      totalExtra > 0 ? minimo + (extras[i] / totalExtra) * disponible : minimo
    );
  }

  /**
   * Pie con los datos de contacto, en todas las páginas. Se dibuja al final,
   * cuando ya se sabe cuántas hay.
   */
  private dibujarPies(doc: jsPDF, contacto: string): void {
    if (!contacto) {
      return;
    }

    const total = doc.getNumberOfPages();
    const yLinea = this.ALTO_PAGINA - 16;

    for (let pagina = 1; pagina <= total; pagina++) {
      doc.setPage(pagina);

      doc.setDrawColor(205, 185, 130);
      doc.setLineWidth(0.4);
      doc.line(this.MARGEN, yLinea, this.ANCHO_PAGINA - this.MARGEN, yLinea);
      doc.setLineWidth(0.2);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(120, 120, 120);

      const lineas = doc.splitTextToSize(contacto, this.ANCHO_UTIL);
      let y = yLinea + 4.5;
      lineas.forEach((linea: string) => {
        doc.text(linea, this.ANCHO_PAGINA / 2, y, { align: 'center' });
        y += 3.6;
      });

      if (total > 1) {
        doc.text(`${pagina} de ${total}`, this.ANCHO_PAGINA - this.MARGEN, yLinea - 2, { align: 'right' });
      }

      doc.setTextColor(0, 0, 0);
    }
  }

  private saltarSiNoCabe(doc: jsPDF, y: number, alto: number): number {
    // Se reserva el espacio del pie de página.
    if (y + alto > this.ALTO_PAGINA - this.MARGEN - 12) {
      doc.addPage();
      return this.MARGEN;
    }
    return y;
  }

  /**
   * Firma escaneada del representante legal. Vive en configuracion_global como
   * base64, con la misma clave que usan los contratos.
   */
  private async cargarFirmaBase64(): Promise<string> {
    try {
      const response: any = await firstValueFrom(
        this.configuracionGlobalService.obtenerByClave('representante_legal_firma_base64')
      );

      if (response && response.body && response.body.valor_texto) {
        return response.body.valor_texto;
      }

      return '';
    } catch (error) {
      console.error('Error al cargar la firma:', error);
      return '';
    }
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
