import { Injectable } from '@angular/core';
import { InstitucionConfigService } from './institucion-config.service';
import { ConfiguracionGlobalService } from './configuracion-global.service';
import { jsPDF } from 'jspdf';
import { firstValueFrom } from 'rxjs';
import { PlantillasService } from './plantillas.service';
import { ContratosClausulasService } from './contratos-clausulas.service';

/**
 * Datos necesarios para generar el PDF del contrato laboral.
 * - contrato: registro congelado de contratos_colaborador (con joins).
 * - colaborador: datos de la persona (nombre, documento, etc.).
 * - configuracion: claves de configuracion_global (institución + representante).
 */
export interface DatosContratoColaboradorPDF {
  contrato: any;
  colaborador: any;
  configuracion: any;
}

/**
 * Estructura de la plantilla del contrato laboral (tipo 'contrato_laboral').
 * Plantilla autocontenida: título, introducción, cláusulas y pie de firma.
 * El bloque opcional 'firmas' permite forzar firma digital/impresa, aunque
 * para el contrato laboral la decisión del representante se inyecta por contrato.
 */
export interface PlantillaContratoLaboral {
  titulo: string;
  introduccion: string;
  clausulas: Array<{
    numero: number;
    subnumero?: number | null;
    titulo: string;
    contenido: string;
  }>;
  pie_firma: string;
  firmas?: {
    trabajador?: { firmaDigital?: boolean };
    representante?: { firmaDigital?: boolean };
  };
}

interface CoordenadaFirma {
  signIndex: number;
  recipientIndex: number;
  seccion: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

@Injectable({
  providedIn: 'root',
})
export class ExportarPdfContratoColaboradorService {
  // Contador global de campos de firma para todo el documento
  private signIndexGlobal: number = 0;

  // Coordenadas de firma generadas (para debug)
  private coordenadasFirmas: CoordenadaFirma[] = [];

  constructor(
    private plantillasService: PlantillasService,
    private clausulasService: ContratosClausulasService,
    private institucionConfigService: InstitucionConfigService,
    private configuracionGlobalService: ConfiguracionGlobalService
  ) {}

  /**
   * Genera y descarga el PDF del contrato laboral.
   * @param datos Datos del contrato, colaborador y configuración.
   * @param clavePlantilla Clave de la plantilla a usar (resuelta por cargo+tipo).
   */
  async generarPDF(
    datos: DatosContratoColaboradorPDF,
    clavePlantilla: string
  ): Promise<void> {
    try {
      this.signIndexGlobal = 0;
      this.coordenadasFirmas = [];

      const plantilla = await this.cargarPlantilla(clavePlantilla);

      // Las cláusulas vienen de la tabla contratos_clausulas, resueltas por cargo
      // (globales + las del cargo del contrato). Reemplazan las del JSON.
      plantilla.clausulas = await this.cargarClausulas(datos.contrato.id_cargo);

      const plantillaProcesada = this.reemplazarVariables(plantilla, datos);
      await this.generarPDFDesdePlantilla(plantillaProcesada, datos);

      console.log('📍 Coordenadas de firma generadas:', this.coordenadasFirmas);
    } catch (error) {
      console.error('Error al generar PDF del contrato laboral:', error);
      throw error;
    }
  }

  /**
   * Carga la plantilla del contrato laboral por clave (tipo 'contrato_laboral').
   */
  private async cargarPlantilla(
    clavePlantilla: string
  ): Promise<PlantillaContratoLaboral> {
    try {
      const response: any = await firstValueFrom(
        this.plantillasService.obtenerByTipoClave(
          'contrato_laboral',
          clavePlantilla
        )
      );

      if (response && response.body && response.body.contenido) {
        return response.body.contenido as PlantillaContratoLaboral;
      }

      throw new Error('No se pudo cargar la plantilla del contrato laboral');
    } catch (error) {
      console.error('Error al cargar plantilla del contrato laboral:', error);
      throw error;
    }
  }

  /**
   * Carga las cláusulas aplicables al contrato desde contratos_clausulas:
   * las globales más las del cargo, ya ordenadas (orden, numero, subnumero).
   */
  private async cargarClausulas(idCargo: string): Promise<
    Array<{
      numero: number;
      subnumero?: number | null;
      titulo: string;
      contenido: string;
    }>
  > {
    try {
      const response: any = await firstValueFrom(
        this.clausulasService.resolver(idCargo)
      );
      const filas = (response.body as any[]) || [];
      return filas.map((f) => ({
        numero: Number(f.numero),
        subnumero: f.subnumero !== null && f.subnumero !== undefined
          ? Number(f.subnumero)
          : null,
        titulo: f.titulo || '',
        contenido: f.contenido || '',
      }));
    } catch (error) {
      console.error('Error al cargar cláusulas del contrato:', error);
      return [];
    }
  }

  /**
   * Reemplaza las variables {{...}} de la plantilla con los datos del contrato.
   */
  private reemplazarVariables(
    plantilla: PlantillaContratoLaboral,
    datos: DatosContratoColaboradorPDF
  ): PlantillaContratoLaboral {
    const config = datos.configuracion;
    const contrato = datos.contrato;
    const colaborador = datos.colaborador;

    const reemplazos: { [key: string]: string } = {
      '{{representante_legal_nombre}}': config.representante_legal_nombre || '',
      '{{representante_legal_cedula}}': config.representante_legal_cedula || '',
      '{{representante_legal_cedula_lugar}}':
        config.representante_legal_cedula_lugar || '',
      '{{institucion_nombre}}':
        config.institucion_nombre ||
        this.institucionConfigService.getNombreInstitucion(),
      '{{institucion_razon_social}}':
        config.institucion_razon_social || config.institucion_nombre || '',
      '{{institucion_nit}}':
        config.institucion_nit ||
        this.institucionConfigService.getNitInstitucion(),
      '{{institucion_direccion}}': config.institucion_direccion || '',
      '{{colaborador_nombre}}': colaborador.colaborador_nombre || '',
      '{{colaborador_documento}}': colaborador.colaborador_documento || '',
      '{{cargo_nombre}}': contrato.cargo_nombre || '',
      '{{tipo_contrato_nombre}}': contrato.tipo_contrato_nombre || '',
      '{{salario_mensual_numero}}': this.formatearMoneda(
        contrato.salario_mensual
      ),
      '{{salario_mensual_letras}}': this.numeroALetras(
        Number(contrato.salario_mensual)
      ),
      '{{periodo_pago}}': contrato.periodo_pago || '',
      '{{jornada_horas}}': contrato.jornada_horas
        ? contrato.jornada_horas.toString()
        : '',
      '{{periodo_prueba}}': contrato.periodo_prueba || '',
      '{{lugar_desempeno}}': contrato.lugar_desempeno || '',
      '{{lugar_firma}}': contrato.lugar_firma || '',
      '{{fecha_inicio}}': this.formatearFechaTexto(contrato.fecha_inicio),
      '{{fecha_inicio_larga}}': this.formatearFechaLarga(contrato.fecha_inicio),
      '{{fecha_fin}}': this.formatearFechaTexto(contrato.fecha_fin),
      '{{fecha_fin_larga}}': this.formatearFechaLarga(contrato.fecha_fin),
      '{{fecha_firma_larga}}': this.formatearFechaLarga(contrato.fecha_firma),
      '{{anio}}': contrato.anio ? contrato.anio.toString() : '',
      '{{numero_contrato}}': this.generarNumeroContrato(
        contrato.numero,
        contrato.anio,
        'CL'
      ),
    };

    const plantillaProcesada: PlantillaContratoLaboral = JSON.parse(
      JSON.stringify(plantilla)
    );

    plantillaProcesada.titulo = this.aplicarReemplazos(
      plantilla.titulo,
      reemplazos
    );
    plantillaProcesada.introduccion = this.aplicarReemplazos(
      plantilla.introduccion,
      reemplazos
    );
    plantillaProcesada.pie_firma = this.aplicarReemplazos(
      plantilla.pie_firma,
      reemplazos
    );

    plantillaProcesada.clausulas = plantilla.clausulas.map((clausula) => ({
      numero: clausula.numero,
      subnumero: clausula.subnumero ?? null,
      titulo: this.aplicarReemplazos(clausula.titulo, reemplazos),
      contenido: this.aplicarReemplazos(clausula.contenido, reemplazos),
    }));

    return plantillaProcesada;
  }

  /**
   * Aplica reemplazos de variables y normaliza caracteres Unicode
   * que jsPDF con Helvetica no soporta.
   */
  private aplicarReemplazos(
    texto: string,
    reemplazos: { [key: string]: string }
  ): string {
    let resultado = texto;

    resultado = resultado.replace(/●/g, '-');
    resultado = resultado.replace(/•/g, '-');
    resultado = resultado.replace(/◦/g, '-');
    resultado = resultado.replace(/▪/g, '-');
    resultado = resultado.replace(/▸/g, '-');
    resultado = resultado.replace(/→/g, '-');
    resultado = resultado.replace(/►/g, '-');

    Object.keys(reemplazos).forEach((variable) => {
      resultado = resultado.replace(
        new RegExp(variable.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
        reemplazos[variable]
      );
    });
    return resultado;
  }

  private async generarPDFDesdePlantilla(
    plantilla: PlantillaContratoLaboral,
    datos: DatosContratoColaboradorPDF
  ): Promise<void> {
    const doc = new jsPDF('p', 'mm', 'letter');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginLeft = 20;
    const marginRight = 20;
    const contentWidth = pageWidth - marginLeft - marginRight;
    let yPos = 15;

    const primaryColor = '#222';
    const goldColor = '#d4af37';
    const grayColor = '#666';

    const logoBase64 = await this.cargarLogoBase64();
    const firmaBase64 = await this.cargarFirmaBase64();

    // El representante firma digital o con imagen, según el contrato.
    const representanteFirmaDigital =
      datos.contrato.representante_firma_digital === 1 ||
      datos.contrato.representante_firma_digital === '1';

    yPos = this.dibujarEncabezado(
      doc,
      logoBase64,
      yPos,
      pageWidth,
      goldColor,
      datos.configuracion
    );
    yPos = this.dibujarTitulo(doc, plantilla.titulo, yPos, pageWidth);

    yPos = this.dibujarTexto(
      doc,
      plantilla.introduccion,
      yPos,
      marginLeft,
      contentWidth,
      primaryColor,
      logoBase64,
      goldColor,
      datos.configuracion
    );

    for (let i = 0; i < plantilla.clausulas.length; i++) {
      const clausula = plantilla.clausulas[i];

      yPos = this.dibujarClausula(
        doc,
        clausula,
        yPos,
        marginLeft,
        contentWidth,
        pageHeight,
        logoBase64,
        goldColor,
        datos.configuracion
      );
    }

    if (yPos > pageHeight - 80) {
      doc.addPage();
      yPos = this.dibujarEncabezado(
        doc,
        logoBase64,
        15,
        pageWidth,
        goldColor,
        datos.configuracion
      );
    }

    yPos = this.dibujarTexto(
      doc,
      plantilla.pie_firma,
      yPos,
      marginLeft,
      contentWidth,
      primaryColor,
      logoBase64,
      goldColor,
      datos.configuracion
    );
    yPos += 5;

    yPos = await this.dibujarFirmas(
      doc,
      datos,
      firmaBase64,
      yPos,
      pageWidth,
      representanteFirmaDigital
    );

    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      this.dibujarPiePagina(
        doc,
        i,
        totalPages,
        pageWidth,
        pageHeight,
        grayColor,
        datos.configuracion
      );
    }

    const nombreArchivo = `Contrato_${(
      datos.colaborador.colaborador_nombre || 'colaborador'
    ).replace(/\s+/g, '_')}_${datos.contrato.anio}.pdf`;
    doc.save(nombreArchivo);
  }

  private dibujarEncabezado(
    doc: jsPDF,
    logoBase64: string,
    yPos: number,
    pageWidth: number,
    goldColor: string,
    config: any
  ): number {
    if (logoBase64) {
      try {
        doc.addImage(logoBase64, 'PNG', 20, yPos, 25, 25);
      } catch (error) {
        console.warn('No se pudo cargar el logo');
      }
    }

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor('#222');
    doc.text(
      config.institucion_nombre ||
        this.institucionConfigService.getNombreInstitucion(),
      pageWidth / 2,
      yPos + 10,
      { align: 'center' }
    );

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor('#666');
    doc.text(
      `NIT ${
        config.institucion_nit ||
        this.institucionConfigService.getNitInstitucion()
      }`,
      pageWidth / 2,
      yPos + 16,
      { align: 'center' }
    );

    doc.setFontSize(9);
    doc.text(
      config.institucion_eslogan || 'ILUMINANDO MENTES - FORJANDO LIDERES',
      pageWidth / 2,
      yPos + 21,
      { align: 'center' }
    );

    doc.setDrawColor(goldColor);
    doc.setLineWidth(1);
    doc.line(20, yPos + 28, pageWidth - 20, yPos + 28);

    return yPos + 35;
  }

  private dibujarTitulo(
    doc: jsPDF,
    titulo: string,
    yPos: number,
    pageWidth: number
  ): number {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor('#222');
    doc.text(titulo, pageWidth / 2, yPos, { align: 'center' });
    return yPos + 12;
  }

  private dibujarTexto(
    doc: jsPDF,
    texto: string,
    yPos: number,
    marginLeft: number,
    contentWidth: number,
    primaryColor: string,
    logoBase64?: string,
    goldColor?: string,
    config?: any
  ): number {
    const pageHeight = doc.internal.pageSize.getHeight();

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(primaryColor);

    const parrafos = texto.split('\n\n');

    parrafos.forEach((parrafo: string) => {
      const parrafoLimpio = parrafo.trim();
      if (!parrafoLimpio) return;

      const linesContenido = doc.splitTextToSize(parrafoLimpio, contentWidth);

      const espacioNecesario = linesContenido.length * 4.2 + 2;
      if (yPos + espacioNecesario > pageHeight - 30) {
        doc.addPage();
        yPos = 15;
        if (logoBase64 && goldColor && config) {
          yPos = this.dibujarEncabezado(
            doc,
            logoBase64,
            yPos,
            doc.internal.pageSize.getWidth(),
            goldColor,
            config
          );
        }
        doc.setTextColor(primaryColor);
        doc.setFontSize(10);
      }

      doc.text(linesContenido, marginLeft, yPos);
      yPos += espacioNecesario;
    });

    return yPos + 3;
  }

  private dibujarClausula(
    doc: jsPDF,
    clausula: any,
    yPos: number,
    marginLeft: number,
    contentWidth: number,
    pageHeight: number,
    logoBase64: string,
    goldColor: string,
    config: any
  ): number {
    const espacioTitulo = 12;
    if (yPos + espacioTitulo > pageHeight - 30) {
      doc.addPage();
      yPos = this.dibujarEncabezado(
        doc,
        logoBase64,
        15,
        doc.internal.pageSize.getWidth(),
        goldColor,
        config
      );
    }

    doc.setFontSize(10);
    doc.setTextColor('#222');

    const esSubnumeral =
      clausula.subnumero !== null && clausula.subnumero !== undefined;

    if (esSubnumeral) {
      // Sub-numeral: "2.1. " seguido del contenido, con sangría e indentado.
      const prefijo = `${clausula.numero}.${clausula.subnumero}.`;
      const sangria = 8;
      doc.setFont('helvetica', 'bold');
      doc.text(prefijo, marginLeft, yPos);

      doc.setFont('helvetica', 'normal');
      const anchoSub = contentWidth - sangria;
      const parrafosSub = clausula.contenido.split('\n\n');
      let primera = true;
      parrafosSub.forEach((parrafo: string) => {
        const limpio = parrafo.trim();
        if (!limpio) return;
        const lines = doc.splitTextToSize(limpio, anchoSub);
        const espacio = lines.length * 4.2 + 2;
        if (yPos + espacio > pageHeight - 30) {
          doc.addPage();
          yPos = this.dibujarEncabezado(
            doc,
            logoBase64,
            15,
            doc.internal.pageSize.getWidth(),
            goldColor,
            config
          );
          doc.setTextColor('#222');
          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
        }
        doc.text(lines, marginLeft + sangria, yPos);
        if (primera) primera = false;
        yPos += espacio;
      });
      return yPos + 3;
    }

    doc.setFont('helvetica', 'bold');

    const tituloCompleto = `CLAUSULA ${this.numeroATexto(
      clausula.numero
    ).toUpperCase()}. ${clausula.titulo}:`;
    const tituloLines = doc.splitTextToSize(tituloCompleto, contentWidth);

    // Evitar que el título quede solo al final de la página: si no caben el
    // título más al menos dos líneas de contenido, se salta de página antes.
    const espacioTituloClausula = tituloLines.length * 5 + 4 + 4.2 * 2;
    if (yPos + espacioTituloClausula > pageHeight - 30) {
      doc.addPage();
      yPos = this.dibujarEncabezado(
        doc,
        logoBase64,
        15,
        doc.internal.pageSize.getWidth(),
        goldColor,
        config
      );
      doc.setTextColor('#222');
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
    }

    doc.text(tituloLines, marginLeft, yPos);
    yPos += tituloLines.length * 5 + 4;

    doc.setFont('helvetica', 'normal');

    const parrafos = clausula.contenido.split('\n\n');
    const altoLinea = 4.2;

    parrafos.forEach((parrafo: string, idx: number) => {
      const parrafoLimpio = parrafo.trim();
      if (!parrafoLimpio) return;

      const linesContenido = doc.splitTextToSize(parrafoLimpio, contentWidth);

      // Se dibuja línea por línea para que el texto llene la página actual
      // y continúe en la siguiente, sin dejar huecos cuando el párrafo es largo.
      linesContenido.forEach((linea: string) => {
        if (yPos + altoLinea > pageHeight - 30) {
          doc.addPage();
          yPos = this.dibujarEncabezado(
            doc,
            logoBase64,
            15,
            doc.internal.pageSize.getWidth(),
            goldColor,
            config
          );
          doc.setTextColor('#222');
          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
        }
        doc.text(linea, marginLeft, yPos);
        yPos += altoLinea;
      });

      // Separación entre párrafos
      if (idx < parrafos.length - 1) {
        yPos += 2;
      }
    });

    return yPos + 3;
  }

  /**
   * Dibuja las firmas del contrato laboral: trabajador (R1) y representante (R99).
   * El trabajador siempre firma digital; el representante firma digital o con
   * imagen, según representanteFirmaDigital.
   */
  private async dibujarFirmas(
    doc: jsPDF,
    datos: DatosContratoColaboradorPDF,
    firmaBase64: string,
    yPos: number,
    pageWidth: number,
    representanteFirmaDigital: boolean
  ): Promise<number> {
    const firmaWidth = 70;
    const espacioEntreFirmas = 10;
    const pageHeight = doc.internal.pageSize.getHeight();
    const currentPage = doc.getCurrentPageInfo().pageNumber;

    const totalWidth = firmaWidth * 2 + espacioEntreFirmas;
    const xInicial = (pageWidth - totalWidth) / 2;

    // Trabajador (izquierda) - siempre firma digital, recipientIndex 1
    this.dibujarCampoFirmaDigital(
      doc,
      xInicial,
      yPos,
      firmaWidth,
      1,
      datos.colaborador.colaborador_nombre || '',
      datos.colaborador.colaborador_documento || '',
      'TRABAJADOR',
      currentPage,
      pageWidth,
      pageHeight,
      'CONTRATO'
    );

    // Representante legal (derecha)
    const xRepresentante = xInicial + firmaWidth + espacioEntreFirmas;

    if (representanteFirmaDigital) {
      this.dibujarCampoFirmaDigital(
        doc,
        xRepresentante,
        yPos,
        firmaWidth,
        99, // Índice especial para representante (temp_representante)
        datos.configuracion.representante_legal_nombre || '',
        datos.configuracion.representante_legal_cedula || '',
        'REPRESENTANTE LEGAL',
        currentPage,
        pageWidth,
        pageHeight,
        'CONTRATO'
      );
    } else {
      await this.dibujarFirmaTradicional(
        doc,
        xRepresentante,
        yPos,
        firmaWidth,
        datos.configuracion.representante_legal_nombre || '',
        datos.configuracion.representante_legal_cedula || '',
        'REPRESENTANTE LEGAL',
        firmaBase64
      );
    }

    doc.setTextColor('#222');
    return yPos + 28;
  }

  /**
   * Dibuja el recuadro visual de firma con texto "FIRMAR AQUI" y placeholder
   * invisible [[SIGN_...]] que luego lee PdfPlaceholderExtractor.
   */
  private dibujarCampoFirmaDigital(
    doc: jsPDF,
    x: number,
    y: number,
    width: number,
    recipientIndex: number,
    nombreFirmante: string,
    cedula: string,
    rol: string,
    pageNumber: number,
    pageWidth: number,
    pageHeight: number,
    seccion: string
  ): void {
    this.signIndexGlobal++;
    const signIndex = this.signIndexGlobal;

    const height = 20;

    const xPercent = Math.round((x / pageWidth) * 100);
    const yPercent = Math.round((y / pageHeight) * 100);
    const wPercent = Math.round((width / pageWidth) * 100);
    const hPercent = Math.round((height / pageHeight) * 100);

    this.coordenadasFirmas.push({
      signIndex,
      recipientIndex,
      seccion,
      page: pageNumber,
      x: xPercent,
      y: yPercent,
      width: wPercent,
      height: hPercent,
    });

    doc.setDrawColor('#1a73e8');
    doc.setLineWidth(0.3);
    this.dibujarLineaPunteada(doc, x, y, x + width, y);
    this.dibujarLineaPunteada(doc, x, y + height, x + width, y + height);
    this.dibujarLineaPunteadaVertical(doc, x, y, x, y + height);
    this.dibujarLineaPunteadaVertical(doc, x + width, y, x + width, y + height);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor('#1a73e8');
    doc.text('[FIRMAR AQUI]', x + width / 2, y + 5, { align: 'center' });

    doc.setDrawColor('#666');
    doc.setLineWidth(0.5);
    doc.line(x + 5, y + 12, x + width - 5, y + 12);

    const placeholder = `[[SIGN_${signIndex}:R${recipientIndex}:P${pageNumber}:X${xPercent}:Y${yPercent}:W${wPercent}:H${hPercent}]]`;
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(1);
    doc.text(placeholder, x + width / 2, y + 8, { align: 'center' });

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor('#222');
    doc.text(nombreFirmante, x + width / 2, y + 16, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(`CC. ${cedula}`, x + width / 2, y + 19, { align: 'center' });

    doc.setTextColor('#666');
    doc.setFontSize(6);
    doc.text(rol, x + width / 2, y + height + 3, { align: 'center' });
  }

  /**
   * Dibuja una imagen (posible PNG con transparencia) sobre un fondo blanco
   * y la devuelve como JPEG base64. Evita que jsPDF pinte la transparencia
   * de negro.
   */
  private aplanarImagen(base64: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width || 400;
        canvas.height = img.height || 120;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('No se pudo obtener el contexto del canvas'));
          return;
        }
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.95));
      };
      img.onerror = () =>
        reject(new Error('No se pudo cargar la imagen de firma'));
      img.src = base64;
    });
  }

  private async dibujarFirmaTradicional(
    doc: jsPDF,
    x: number,
    y: number,
    width: number,
    nombreFirmante: string,
    cedula: string,
    rol: string,
    firmaBase64?: string
  ): Promise<void> {
    if (firmaBase64) {
      try {
        const firmaPlana = await this.aplanarImagen(firmaBase64);
        doc.addImage(firmaPlana, 'JPEG', x + 10, y - 2, 50, 14);
      } catch (error) {
        console.warn('No se pudo insertar la firma:', error);
      }
    }

    doc.setDrawColor('#666');
    doc.setLineWidth(0.5);
    doc.line(x, y + 12, x + width, y + 12);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor('#222');
    doc.text(nombreFirmante, x + width / 2, y + 17, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(`CC. ${cedula}`, x + width / 2, y + 21, { align: 'center' });

    doc.setTextColor('#666');
    doc.setFontSize(7);
    doc.text(rol, x + width / 2, y + 24, { align: 'center' });
  }

  private dibujarLineaPunteada(
    doc: jsPDF,
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ): void {
    const dashLength = 2;
    const gapLength = 1;
    let currentX = x1;

    while (currentX < x2) {
      const endX = Math.min(currentX + dashLength, x2);
      doc.line(currentX, y1, endX, y2);
      currentX = endX + gapLength;
    }
  }

  private dibujarLineaPunteadaVertical(
    doc: jsPDF,
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ): void {
    const dashLength = 2;
    const gapLength = 1;
    let currentY = y1;

    while (currentY < y2) {
      const endY = Math.min(currentY + dashLength, y2);
      doc.line(x1, currentY, x2, endY);
      currentY = endY + gapLength;
    }
  }

  private dibujarPiePagina(
    doc: jsPDF,
    currentPage: number,
    totalPages: number,
    pageWidth: number,
    pageHeight: number,
    grayColor: string,
    config: any
  ): void {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(grayColor);

    doc.text(`Pagina ${currentPage} de ${totalPages}`, pageWidth / 2, pageHeight - 10, {
      align: 'center',
    });

    doc.text(
      config.institucion_nombre ||
        this.institucionConfigService.getNombreInstitucion(),
      20,
      pageHeight - 10
    );

    if (config.institucion_telefono) {
      doc.text(config.institucion_telefono, pageWidth - 20, pageHeight - 10, {
        align: 'right',
      });
    }
  }

  // Métodos para cargar recursos
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

  private async cargarFirmaBase64(): Promise<string> {
    try {
      const response: any = await firstValueFrom(
        this.configuracionGlobalService.obtenerByClave(
          'representante_legal_firma_base64'
        )
      );

      if (response && response.body && response.body.valor_texto) {
        return response.body.valor_texto;
      }

      return '';
    } catch (error) {
      console.error('Error al cargar firma:', error);
      return '';
    }
  }

  // Métodos de utilidad
  private formatearMoneda(valor: number): string {
    return valor?.toLocaleString('es-CO') || '0';
  }

  private formatearFechaTexto(fechaStr: string): string {
    if (!fechaStr) return '';
    const fecha = new Date(fechaStr + 'T00:00:00');
    return fecha.toLocaleDateString('es-CO');
  }

  private formatearFechaLarga(fechaStr: string): string {
    if (!fechaStr) return '';
    const fecha = new Date(fechaStr + 'T00:00:00');
    if (isNaN(fecha.getTime())) return '';
    const opciones: Intl.DateTimeFormatOptions = {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    };
    return fecha.toLocaleDateString('es-CO', opciones);
  }

  private generarNumeroContrato(
    numero: number,
    anio: number,
    prefijo: string
  ): string {
    return `${prefijo}-${anio}-${String(numero).padStart(5, '0')}`;
  }

  private numeroATexto(numero: number): string {
    const numeros = [
      '',
      'PRIMERA',
      'SEGUNDA',
      'TERCERA',
      'CUARTA',
      'QUINTA',
      'SEXTA',
      'SEPTIMA',
      'OCTAVA',
      'NOVENA',
      'DECIMA',
      'UNDECIMA',
      'DUODECIMA',
      'DECIMOTERCERA',
      'DECIMOCUARTA',
      'DECIMOQUINTA',
      'DECIMOSEXTA',
      'DECIMOSEPTIMA',
      'DECIMOCTAVA',
      'DECIMONOVENA',
      'VIGESIMA',
    ];
    return numeros[numero] || numero.toString();
  }

  /**
   * Convierte un valor numérico (pesos) a letras en español.
   * Usado para el salario en el contrato.
   */
  private numeroALetras(numero: number): string {
    if (!numero || isNaN(numero)) return '';
    const entero = Math.floor(numero);

    if (entero === 0) return 'CERO PESOS';

    const unidades = [
      '',
      'UNO',
      'DOS',
      'TRES',
      'CUATRO',
      'CINCO',
      'SEIS',
      'SIETE',
      'OCHO',
      'NUEVE',
      'DIEZ',
      'ONCE',
      'DOCE',
      'TRECE',
      'CATORCE',
      'QUINCE',
      'DIECISEIS',
      'DIECISIETE',
      'DIECIOCHO',
      'DIECINUEVE',
      'VEINTE',
    ];
    const decenas = [
      '',
      '',
      'VEINTE',
      'TREINTA',
      'CUARENTA',
      'CINCUENTA',
      'SESENTA',
      'SETENTA',
      'OCHENTA',
      'NOVENTA',
    ];
    const centenas = [
      '',
      'CIENTO',
      'DOSCIENTOS',
      'TRESCIENTOS',
      'CUATROCIENTOS',
      'QUINIENTOS',
      'SEISCIENTOS',
      'SETECIENTOS',
      'OCHOCIENTOS',
      'NOVECIENTOS',
    ];

    const convertirMenorMil = (n: number): string => {
      let texto = '';
      const c = Math.floor(n / 100);
      const resto = n % 100;

      if (c > 0) {
        if (n === 100) {
          return 'CIEN';
        }
        texto += centenas[c] + ' ';
      }

      if (resto <= 20) {
        texto += unidades[resto];
      } else {
        const d = Math.floor(resto / 10);
        const u = resto % 10;
        if (resto < 30) {
          texto += 'VEINTI' + unidades[u].toLowerCase().toUpperCase();
        } else {
          texto += decenas[d];
          if (u > 0) {
            texto += ' Y ' + unidades[u];
          }
        }
      }

      return texto.trim();
    };

    let texto = '';
    const millones = Math.floor(entero / 1000000);
    const miles = Math.floor((entero % 1000000) / 1000);
    const resto = entero % 1000;

    if (millones > 0) {
      if (millones === 1) {
        texto += 'UN MILLON ';
      } else {
        texto += convertirMenorMil(millones) + ' MILLONES ';
      }
    }

    if (miles > 0) {
      if (miles === 1) {
        texto += 'MIL ';
      } else {
        texto += convertirMenorMil(miles) + ' MIL ';
      }
    }

    if (resto > 0) {
      texto += convertirMenorMil(resto);
    }

    return texto.trim() + ' PESOS M/CTE';
  }
}