import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  AlignmentType,
  BorderStyle,
  Document,
  ImageRun,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import { InstitucionConfigService } from './institucion-config.service';
import { ConfiguracionGlobalService } from './configuracion-global.service';

/**
 * Descarga el certificado como documento de Word editable (.docx).
 *
 * Se arma con la librería `docx` en vez de generar HTML porque Google Docs
 * ignora las imágenes en base64 al importar HTML, y el logo no aparecía. Aquí
 * las imágenes van embebidas dentro del archivo, así que se ven igual en Word,
 * Google Docs y LibreOffice.
 *
 * El contenido es el mismo HTML resuelto que el backend guardó, así que el Word
 * y el PDF dicen exactamente lo mismo.
 */
@Injectable({
  providedIn: 'root',
})
export class ExportarWordCertificadoService {

  constructor(
    private institucionConfigService: InstitucionConfigService,
    private configuracionGlobalService: ConfiguracionGlobalService
  ) {}

  /**
   * Genera y descarga el documento.
   * @param contenidoHtml HTML resuelto que devolvió el backend
   * @param nombreArchivo nombre del archivo, sin extensión
   */
  async generarWord(contenidoHtml: string, nombreArchivo: string): Promise<void> {
    const logo = await this.cargarImagen(await this.urlLogo());
    const firma = await this.cargarImagen(await this.cargarFirmaBase64());

    const meta = this.leerMeta(contenidoHtml);
    const bloques = this.parsearHtml(contenidoHtml);

    const indiceTitulo = bloques.findIndex((b: any) => b.tipo === 'titulo');
    const titulo = indiceTitulo >= 0 ? bloques.splice(indiceTitulo, 1)[0].texto : 'Certificado';

    const hijos: any[] = [
      ...this.cabecera(logo, titulo, meta.numero),
      ...this.separador(),
    ];

    bloques.forEach((bloque: any) => {
      hijos.push(...this.convertirBloque(bloque, firma));
    });

    if (meta.contacto) {
      hijos.push(...this.pie(meta.contacto));
    }

    const documento = new Document({
      styles: {
        default: {
          document: {
            run: { font: 'Arial', size: 22 },
          },
        },
      },
      sections: [{
        properties: {
          page: { margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 } },
        },
        children: hijos,
      }],
    });

    const blob = await Packer.toBlob(documento);
    const url = URL.createObjectURL(blob);

    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = `${nombreArchivo}.docx`;
    document.body.appendChild(enlace);
    enlace.click();
    document.body.removeChild(enlace);

    URL.revokeObjectURL(url);
  }

  // -----------------------------------------------------------------
  // Partes fijas
  // -----------------------------------------------------------------

  /** Logo a la izquierda y título a su derecha, en una tabla sin bordes. */
  private cabecera(logo: ArrayBuffer | null, titulo: string, numero: string): any[] {
    const celdaLogo: any[] = logo
      ? [new Paragraph({
          alignment: AlignmentType.LEFT,
          children: [new ImageRun({
            data: logo,
            type: 'png',
            transformation: { width: 90, height: 90 },
          } as any)],
        })]
      : [new Paragraph('')];

    const celdaTitulo: any[] = [
      new Paragraph({
        alignment: AlignmentType.LEFT,
        children: [new TextRun({ text: titulo, bold: true, size: 34 })],
      }),
    ];

    if (numero) {
      celdaTitulo.push(new Paragraph({
        alignment: AlignmentType.LEFT,
        children: [new TextRun({ text: `Certificado No. ${numero}`, size: 18, color: '777777' })],
      }));
    }

    // Los anchos van en twips y no en porcentaje: con porcentaje el visor corre
    // la celda del título y el texto queda contra el margen derecho.
    const ANCHO_UTIL = 9638;   // 17 cm de área imprimible
    const ANCHO_LOGO = 2200;

    return [
      new Table({
        width: { size: ANCHO_UTIL, type: WidthType.DXA },
        // Sin columnWidths el archivo sale sin tblGrid y el visor reparte las
        // columnas a su gusto: el título terminaba contra el margen derecho.
        columnWidths: [ANCHO_LOGO, ANCHO_UTIL - ANCHO_LOGO],
        borders: this.sinBordes(),
        rows: [
          new TableRow({
            children: [
              new TableCell({ width: { size: ANCHO_LOGO, type: WidthType.DXA }, borders: this.sinBordes(), children: celdaLogo }),
              new TableCell({ width: { size: ANCHO_UTIL - ANCHO_LOGO, type: WidthType.DXA }, borders: this.sinBordes(), children: celdaTitulo }),
            ],
          }),
        ],
      }),
    ];
  }

  private separador(): any[] {
    return [
      new Paragraph({
        text: '',
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'B4B4B4', space: 1 } },
        spacing: { before: 120, after: 240 },
      }),
    ];
  }

  private pie(contacto: string): any[] {
    return [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        border: { top: { style: BorderStyle.SINGLE, size: 6, color: 'CDB982', space: 6 } },
        spacing: { before: 480 },
        children: [new TextRun({ text: contacto, size: 15, color: '787878' })],
      }),
    ];
  }

  // -----------------------------------------------------------------
  // Conversión del HTML
  // -----------------------------------------------------------------

  private convertirBloque(bloque: any, firma: ArrayBuffer | null): any[] {
    if (bloque.tipo === 'firma_linea') {
      return this.bloqueFirma(firma);
    }

    if (bloque.tipo === 'tabla') {
      return [this.convertirTabla(bloque.filas), new Paragraph({ text: '', spacing: { after: 120 } })];
    }

    return [new Paragraph({
      alignment: this.alineacion(bloque.alineacion),
      spacing: { after: bloque.compacto ? 40 : 160, line: 300 },
      children: bloque.partes.map((parte: any) => new TextRun({
        text: parte.texto,
        bold: parte.negrita,
        size: bloque.tamano * 2,
      })),
    })];
  }

  /** Firma escaneada sobre la raya, centradas. */
  private bloqueFirma(firma: ArrayBuffer | null): any[] {
    const parrafos: any[] = [];

    if (firma) {
      parrafos.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 360 },
        children: [new ImageRun({
          data: firma,
          type: 'png',
          transformation: { width: 150, height: 42 },
        } as any)],
      }));
    } else {
      parrafos.push(new Paragraph({ text: '', spacing: { before: 720 } }));
    }

    parrafos.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: '________________________________________', size: 22 })],
    }));

    return parrafos;
  }

  private convertirTabla(filas: any[]): Table {
    return new Table({
      width: { size: 9638, type: WidthType.DXA },
      rows: filas.map((fila: any) => new TableRow({
        children: fila.celdas.map((celda: string, indice: number) => new TableCell({
          shading: fila.encabezado ? { fill: 'F3F0E7' } : undefined,
          children: [new Paragraph({
            // La última columna es el valor: a la derecha para que cuadren.
            alignment: indice === fila.celdas.length - 1 ? AlignmentType.RIGHT : AlignmentType.LEFT,
            children: [new TextRun({ text: celda, bold: fila.encabezado, size: 18 })],
          })],
        })),
      })),
    });
  }

  private alineacion(valor: string): any {
    if (valor === 'center') {
      return AlignmentType.CENTER;
    }
    if (valor === 'right') {
      return AlignmentType.RIGHT;
    }
    return AlignmentType.JUSTIFIED;
  }

  private sinBordes(): any {
    const ninguno = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
    return { top: ninguno, bottom: ninguno, left: ninguno, right: ninguno,
             insideHorizontal: ninguno, insideVertical: ninguno };
  }

  // -----------------------------------------------------------------
  // Lectura del HTML resuelto
  // -----------------------------------------------------------------

  /** Número y línea de contacto que el backend deja como metadatos. */
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
   * Mismo criterio de lectura que el PDF: títulos, párrafos con sus negritas,
   * tablas y el marcador de la firma.
   */
  private parsearHtml(html: string): any[] {
    const parser = new DOMParser();
    const documento = parser.parseFromString(`<div>${html}</div>`, 'text/html');
    const raiz = documento.body.firstElementChild;
    const bloques: any[] = [];

    if (!raiz) {
      return bloques;
    }

    // La plantilla pone {{tabla_pagos}} dentro de un párrafo: se saca al nivel
    // de arriba para que no se pinte como texto.
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

    // Lo que sigue a la raya de la firma es el pie del firmante: va junto.
    const indiceFirma = bloques.findIndex((b: any) => b.tipo === 'firma_linea');
    if (indiceFirma >= 0) {
      bloques.slice(indiceFirma + 1).forEach((b: any) => (b.compacto = true));
    }

    return bloques;
  }

  /** Trocea el párrafo en fragmentos con y sin negrita. */
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
  // Imágenes
  // -----------------------------------------------------------------

  /**
   * Las imágenes se embeben como binario dentro del .docx, que es lo que hace
   * que se vean también en Google Docs.
   */
  private async cargarImagen(origen: string): Promise<ArrayBuffer | null> {
    if (!origen) {
      return null;
    }

    try {
      const response = await fetch(origen);
      return await response.arrayBuffer();
    } catch (error) {
      console.error('No se pudo cargar la imagen del documento:', error);
      return null;
    }
  }

  private async urlLogo(): Promise<string> {
    try {
      return this.institucionConfigService.getLogoUrl();
    } catch (error) {
      console.error('Error al obtener el logo:', error);
      return '';
    }
  }

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
}