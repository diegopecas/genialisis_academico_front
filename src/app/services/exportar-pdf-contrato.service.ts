import { Injectable } from '@angular/core';
import { InstitucionConfigService } from './institucion-config.service';
import { ConfiguracionGlobalService } from './configuracion-global.service';
import { jsPDF } from 'jspdf';
import { firstValueFrom } from 'rxjs';
import { PlantillasService, PlantillaContrato } from './plantillas.service';

export interface DatosContratoPDF {
  contrato: any;
  estudiante: any;
  acudientes: any[];
  configuracion: any;
}

// Interfaz para la configuración de firmas desde el JSON
export interface ConfiguracionFirma {
  tipo: 'acudiente' | 'representante';
  placeholder: string;
  label: string;
  cedula: string;
  rol: string;
  firmaDigital: boolean; // true = firma digital, false = firma impresa
}

// Interfaz para coordenadas de firma digital
export interface CoordenadaFirma {
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
export class ExportarPdfContratoService {
  private plantillaCache: PlantillaContrato | null = null;
  
  // Contador global de campos de firma para todo el documento
  private signIndexGlobal: number = 0;
  
  // Array para almacenar todas las coordenadas de firma
  private coordenadasFirmas: CoordenadaFirma[] = [];

  constructor(
    private plantillasService: PlantillasService,
    private institucionConfigService: InstitucionConfigService,
    private configuracionGlobalService: ConfiguracionGlobalService
  ) {}

  async generarPDF(datos: DatosContratoPDF): Promise<void> {
    try {
      // Resetear contadores al inicio de cada generación
      this.signIndexGlobal = 0;
      this.coordenadasFirmas = [];
      
      const plantilla = await this.cargarPlantilla();
      const plantillaProcesada = this.reemplazarVariables(plantilla, datos);
      await this.generarPDFDesdePlantilla(plantillaProcesada, datos);
      
      // Log de coordenadas para debug
      console.log('📍 Coordenadas de firma generadas:', this.coordenadasFirmas);
    } catch (error) {
      console.error('Error al generar PDF:', error);
      throw error;
    }
  }

  private async cargarPlantilla(): Promise<PlantillaContrato> {
    if (this.plantillaCache) {
      return this.plantillaCache!;
    }

    try {
      const response: any = await firstValueFrom(
        this.plantillasService.obtenerByTipoClave(
          'contrato_matricula',
          'contrato_completo'
        )
      );
      console.log('cargarPlantilla', response);
      if (response && response.body && response.body.contenido) {
        this.plantillaCache = response.body.contenido;
        console.log('cargarPlantilla', this.plantillaCache);
        return this.plantillaCache!;
      }

      throw new Error('No se pudo cargar la plantilla del contrato');
    } catch (error) {
      console.error('Error al cargar plantilla:', error);
      throw error;
    }
  }

  private reemplazarVariables(
    plantilla: PlantillaContrato,
    datos: DatosContratoPDF
  ): PlantillaContrato {
    const config = datos.configuracion;
    const contrato = datos.contrato;
    const estudiante = datos.estudiante;
    const acudientes = datos.acudientes;

    const acudientesNombres = acudientes
      .map((a) => a.nombre_completo)
      .join(' y ');
    const acudientesDomicilio = acudientes[0]?.ciudad || this.institucionConfigService.getDireccionInstitucion();

    let textoPrimeraCuota = '';
    let numeroCuotasRestantes = contrato.numero_cuotas;
    if (contrato.valor_primera_cuota && contrato.valor_primera_cuota > 0) {
      textoPrimeraCuota = `, 1 cuota de ${this.formatearMoneda(
        contrato.valor_primera_cuota
      )}`;
      numeroCuotasRestantes = contrato.numero_cuotas - 1;
    }

    const reemplazos: { [key: string]: string } = {
      '{{representante_legal_nombre}}':
        config.representante_legal_nombre || 'Por definir',
      '{{representante_legal_cedula}}':
        config.representante_legal_cedula || '1.049.603.928',
      '{{representante_legal_cedula_lugar}}':
        config.representante_legal_cedula_lugar || 'Por definir',
      '{{institucion_nombre}}': config.institucion_nombre || this.institucionConfigService.getNombreInstitucion(),
      '{{institucion_nit}}': config.institucion_nit || this.institucionConfigService.getNitInstitucion(),
      '{{acudientes_nombres}}': acudientesNombres,
      '{{acudientes_domicilio}}': acudientesDomicilio,
      '{{estudiante_nombre}}': estudiante.nombre_completo,
      '{{estudiante_documento}}': estudiante.numero_identificacion,
      '{{nombre_grupo}}': estudiante.nombre_grupo || contrato.nombre_grupo,
      '{{valor_total_formateado}}': this.formatearMoneda(contrato.valor_total),
      '{{valor_matricula_formateado}}': this.formatearMoneda(
        contrato.valor_matricula
      ),
      '{{valor_pension_formateado}}': this.formatearMoneda(
        contrato.valor_pension
      ),
      '{{valor_pension_mensual_formateado}}': this.formatearMoneda(
        contrato.numero_cuotas > 0 
          ? Math.round(contrato.valor_pension / contrato.numero_cuotas) 
          : contrato.valor_pension
      ),
      '{{numero_cuotas}}': contrato.numero_cuotas.toString(),
      '{{texto_primera_cuota}}': textoPrimeraCuota,
      '{{numero_cuotas_restantes}}': numeroCuotasRestantes.toString(),
      '{{mes_inicio}}': this.obtenerMesInicio(
        contrato.fecha_inicio || contrato.fecha_firma
      ),
      '{{fecha_inicio}}': this.formatearFechaTexto(
        contrato.fecha_inicio || contrato.fecha_firma
      ),
      '{{fecha_inicio_larga}}': this.formatearFechaLarga(
        contrato.fecha_inicio || contrato.fecha_firma
      ),
      '{{anio}}': contrato.anio.toString(),
      '{{fecha_fin}}': this.formatearFechaTexto(contrato.fecha_fin),
      '{{lugar_firma}}': contrato.lugar_firma,
      '{{fecha_firma_larga}}': this.formatearFechaLarga(contrato.fecha_firma),
      '{{texto_autorizacion_imagenes}}':
        contrato.autoriza_imagenes === 1 ? 'SÍ' : 'NO',
      '{{numero_contrato}}': this.generarNumeroContrato(
        contrato.id,
        contrato.anio,
        'C'
      ),
      '{{numero_pagare}}': this.generarNumeroContrato(
        contrato.id,
        contrato.anio,
        'P'
      ),
    };

    const plantillaProcesada: PlantillaContrato = JSON.parse(
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
    (plantillaProcesada as any).introduccion_singular = (plantilla as any)
      .introduccion_singular
      ? this.aplicarReemplazos(
          (plantilla as any).introduccion_singular,
          reemplazos
        )
      : undefined;
    plantillaProcesada.pie_firma = this.aplicarReemplazos(
      plantilla.pie_firma,
      reemplazos
    );

    plantillaProcesada.clausulas = plantilla.clausulas.map((clausula: any) => ({
      numero: clausula.numero,
      titulo: this.aplicarReemplazos(clausula.titulo, reemplazos),
      titulo_singular: clausula.titulo_singular
        ? this.aplicarReemplazos(clausula.titulo_singular, reemplazos)
        : undefined,
      contenido: this.aplicarReemplazos(clausula.contenido, reemplazos),
      contenido_singular: clausula.contenido_singular
        ? this.aplicarReemplazos(clausula.contenido_singular, reemplazos)
        : undefined,
    }));

    if (plantilla.autorizacion_imagenes) {
      plantillaProcesada.autorizacion_imagenes = {
        titulo: this.aplicarReemplazos(
          plantilla.autorizacion_imagenes.titulo,
          reemplazos
        ),
        contenido: this.aplicarReemplazos(
          plantilla.autorizacion_imagenes.contenido,
          reemplazos
        ),
        pie_firma: this.aplicarReemplazos(
          plantilla.autorizacion_imagenes.pie_firma,
          reemplazos
        ),
      };
    }

    if (plantilla.pagare) {
      plantillaProcesada.pagare = {
        titulo: this.aplicarReemplazos(plantilla.pagare.titulo, reemplazos),
        numero: this.aplicarReemplazos(plantilla.pagare.numero, reemplazos),
        debo_pagare: this.aplicarReemplazos(
          plantilla.pagare.debo_pagare,
          reemplazos
        ),
        promesa: this.aplicarReemplazos(plantilla.pagare.promesa, reemplazos),
        beneficiario: {
          nombre: this.aplicarReemplazos(
            plantilla.pagare.beneficiario.nombre,
            reemplazos
          ),
          nit: this.aplicarReemplazos(
            plantilla.pagare.beneficiario.nit,
            reemplazos
          ),
        },
        lugar_pago: this.aplicarReemplazos(
          plantilla.pagare.lugar_pago,
          reemplazos
        ),
        valor: {
          numerico: this.aplicarReemplazos(
            plantilla.pagare.valor.numerico,
            reemplazos
          ),
          letras: this.aplicarReemplazos(
            plantilla.pagare.valor.letras,
            reemplazos
          ),
          complemento: this.aplicarReemplazos(
            plantilla.pagare.valor.complemento,
            reemplazos
          ),
        },
        intereses: this.aplicarReemplazos(
          plantilla.pagare.intereses,
          reemplazos
        ),
        valor_recibido: this.aplicarReemplazos(
          plantilla.pagare.valor_recibido,
          reemplazos
        ),
        vencimiento: this.aplicarReemplazos(
          plantilla.pagare.vencimiento,
          reemplazos
        ),
        nota_carta: this.aplicarReemplazos(
          plantilla.pagare.nota_carta,
          reemplazos
        ),
        pie_firma: this.aplicarReemplazos(
          plantilla.pagare.pie_firma,
          reemplazos
        ),
      };
    }

    if (plantilla.carta_instrucciones) {
      plantillaProcesada.carta_instrucciones = {
        titulo: this.aplicarReemplazos(
          plantilla.carta_instrucciones.titulo,
          reemplazos
        ),
        numero_pagare: this.aplicarReemplazos(
          plantilla.carta_instrucciones.numero_pagare,
          reemplazos
        ),
        fecha: this.aplicarReemplazos(
          plantilla.carta_instrucciones.fecha,
          reemplazos
        ),
        destinatario: this.aplicarReemplazos(
          plantilla.carta_instrucciones.destinatario,
          reemplazos
        ),
        contenido: this.aplicarReemplazos(
          plantilla.carta_instrucciones.contenido,
          reemplazos
        ),
        autorizacion_diligenciamiento: {
          titulo: this.aplicarReemplazos(
            plantilla.carta_instrucciones.autorizacion_diligenciamiento.titulo,
            reemplazos
          ),
          contenido: this.aplicarReemplazos(
            plantilla.carta_instrucciones.autorizacion_diligenciamiento
              .contenido,
            reemplazos
          ),
        },
        clausula_aceleratoria: {
          titulo: this.aplicarReemplazos(
            plantilla.carta_instrucciones.clausula_aceleratoria.titulo,
            reemplazos
          ),
          contenido: this.aplicarReemplazos(
            plantilla.carta_instrucciones.clausula_aceleratoria.contenido,
            reemplazos
          ),
        },
        regimen_legal: {
          titulo: this.aplicarReemplazos(
            plantilla.carta_instrucciones.regimen_legal.titulo,
            reemplazos
          ),
          contenido: this.aplicarReemplazos(
            plantilla.carta_instrucciones.regimen_legal.contenido,
            reemplazos
          ),
        },
        autorizacion_cobro: {
          titulo: this.aplicarReemplazos(
            plantilla.carta_instrucciones.autorizacion_cobro.titulo,
            reemplazos
          ),
          contenido: this.aplicarReemplazos(
            plantilla.carta_instrucciones.autorizacion_cobro.contenido,
            reemplazos
          ),
        },
        pie_firma: this.aplicarReemplazos(
          plantilla.carta_instrucciones.pie_firma,
          reemplazos
        ),
      };
    }

    return plantillaProcesada;
  }

  /**
   * Aplica reemplazos de variables y normaliza caracteres Unicode
   * que jsPDF con Helvetica no soporta
   */
  private aplicarReemplazos(
    texto: string,
    reemplazos: { [key: string]: string }
  ): string {
    let resultado = texto;
    
    // Normalizar bullets y caracteres Unicode que jsPDF no soporta
    resultado = resultado.replace(/●/g, '-');
    resultado = resultado.replace(/•/g, '-');
    resultado = resultado.replace(/◦/g, '-');
    resultado = resultado.replace(/▪/g, '-');
    resultado = resultado.replace(/▸/g, '-');
    resultado = resultado.replace(/→/g, '-');
    resultado = resultado.replace(/►/g, '-');
    
    // Aplicar reemplazos de variables
    Object.keys(reemplazos).forEach((variable) => {
      resultado = resultado.replace(
        new RegExp(variable.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
        reemplazos[variable]
      );
    });
    return resultado;
  }

  private async generarPDFDesdePlantilla(
    plantilla: PlantillaContrato,
    datos: DatosContratoPDF
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

    // Obtener configuración de firmas del JSON (si existe)
    const configFirmas = (plantilla as any).firmas || this.getConfiguracionFirmasDefault(datos);

    yPos = this.dibujarEncabezado(
      doc,
      logoBase64,
      yPos,
      pageWidth,
      goldColor,
      datos.configuracion
    );
    yPos = this.dibujarTitulo(doc, plantilla.titulo, yPos, pageWidth);
    // Seleccionar versión singular o plural según número de acudientes
    const numAcudientes = datos.acudientes.length;
    const introduccionFinal =
      numAcudientes === 1 && (plantilla as any).introduccion_singular
        ? (plantilla as any).introduccion_singular
        : plantilla.introduccion;

    yPos = this.dibujarTexto(
      doc,
      introduccionFinal,
      yPos,
      marginLeft,
      contentWidth,
      primaryColor
    );

    for (let i = 0; i < plantilla.clausulas.length; i++) {
      const clausula = plantilla.clausulas[i];

      if (yPos > pageHeight - 60) {
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

      // Seleccionar versión singular o plural
      const clausulaFinal = {
        numero: clausula.numero,
        titulo:
          numAcudientes === 1 && (clausula as any).titulo_singular
            ? (clausula as any).titulo_singular
            : clausula.titulo,
        contenido:
          numAcudientes === 1 && (clausula as any).contenido_singular
            ? (clausula as any).contenido_singular
            : clausula.contenido,
      };

      yPos = this.dibujarClausula(
        doc,
        clausulaFinal,
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
      primaryColor
    );
    yPos += 5;

    // SECCION 1: Firmas del contrato principal
    yPos = await this.dibujarFirmas(
      doc,
      datos,
      firmaBase64,
      yPos,
      pageWidth,
      marginLeft,
      configFirmas,
      'CONTRATO'
    );

    // SECCION 2: Autorización de imágenes
    if (
      datos.contrato.autoriza_imagenes === 1 &&
      plantilla.autorizacion_imagenes
    ) {
      doc.addPage();
      yPos = this.dibujarEncabezado(
        doc,
        logoBase64,
        15,
        pageWidth,
        goldColor,
        datos.configuracion
      );
      yPos = await this.dibujarAutorizacionImagenes(
        doc,
        plantilla.autorizacion_imagenes,
        datos,
        firmaBase64,
        yPos,
        pageWidth,
        marginLeft,
        contentWidth,
        primaryColor,
        configFirmas
      );
    }

    // Solo generar pagaré y carta si autoriza_pagare es 1
    const autorizaPagare =
      datos.contrato.autoriza_pagare === 1 ||
      datos.contrato.autoriza_pagare === '1';

    // SECCION 3: Carta de instrucciones
    if (autorizaPagare && plantilla.carta_instrucciones) {
      yPos = await this.dibujarCartaInstrucciones(
        doc,
        plantilla.carta_instrucciones,
        datos,
        logoBase64,
        pageWidth,
        marginLeft,
        contentWidth,
        primaryColor,
        goldColor,
        configFirmas
      );
    }

    // SECCION 4: Pagaré
    if (autorizaPagare && plantilla.pagare) {
      yPos = await this.dibujarPagareEjecutivo(
        doc,
        plantilla.pagare,
        datos,
        logoBase64,
        pageWidth,
        marginLeft,
        contentWidth,
        primaryColor,
        goldColor,
        configFirmas
      );
    }

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

    const nombreArchivo = `Contrato_${datos.estudiante.nombre_completo?.replace(
      /\s+/g,
      '_'
    )}_${datos.contrato.anio}.pdf`;
    doc.save(nombreArchivo);
  }

  /**
   * Configuración de firmas por defecto cuando no viene en el JSON
   */
  private getConfiguracionFirmasDefault(datos: DatosContratoPDF): any {
    return {
      acudientes: datos.acudientes.map((_, index) => ({
        tipo: 'acudiente',
        firmaDigital: true
      })),
      representante: {
        tipo: 'representante',
        firmaDigital: false
      }
    };
  }

  private dibujarEncabezado(
    doc: jsPDF,
    logoBase64: string,
    yPos: number,
    pageWidth: number,
    goldColor: string,
    config: any
  ): number {
    // Logo (25x25 para que sea cuadrado/redondo)
    if (logoBase64) {
      try {
        doc.addImage(logoBase64, 'PNG', 20, yPos, 25, 25);
      } catch (error) {
        console.warn('No se pudo cargar el logo');
      }
    }

    // Nombre de la institución
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor('#222');
    doc.text(
      config.institucion_nombre || this.institucionConfigService.getNombreInstitucion(),
      pageWidth / 2,
      yPos + 10,
      { align: 'center' }
    );

    // NIT
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor('#666');
    doc.text(
      `NIT ${config.institucion_nit || this.institucionConfigService.getNitInstitucion()}`,
      pageWidth / 2,
      yPos + 16,
      { align: 'center' }
    );

    // Eslogan
    doc.setFontSize(9);
    doc.text(
      config.institucion_eslogan || 'ILUMINANDO MENTES - FORJANDO LIDERES',
      pageWidth / 2,
      yPos + 21,
      { align: 'center' }
    );

    // Línea dorada
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
    doc.setFont('helvetica', 'bold');
    doc.setTextColor('#222');

    const tituloCompleto = `CLAUSULA ${this.numeroATexto(
      clausula.numero
    ).toUpperCase()}. ${clausula.titulo}:`;
    const tituloLines = doc.splitTextToSize(tituloCompleto, contentWidth);
    doc.text(tituloLines, marginLeft, yPos);
    yPos += tituloLines.length * 5 + 4;

    doc.setFont('helvetica', 'normal');

    const parrafos = clausula.contenido.split('\n\n');

    parrafos.forEach((parrafo: string) => {
      const parrafoLimpio = parrafo.trim();
      if (!parrafoLimpio) return;

      const linesContenido = doc.splitTextToSize(parrafoLimpio, contentWidth);

      const espacioNecesario = linesContenido.length * 4.2 + 2;
      if (yPos + espacioNecesario > pageHeight - 30) {
        doc.addPage();
        yPos = 15;
        yPos = this.dibujarEncabezado(
          doc,
          logoBase64,
          yPos,
          doc.internal.pageSize.getWidth(),
          goldColor,
          config
        );
        doc.setTextColor('#222');
        doc.setFontSize(10);
      }

      doc.text(linesContenido, marginLeft, yPos);
      yPos += espacioNecesario;
    });

    return yPos + 3;
  }

  /**
   * Dibuja el recuadro visual de firma con texto "FIRMAR AQUI" y placeholder invisible
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
    // Incrementar contador global
    this.signIndexGlobal++;
    const signIndex = this.signIndexGlobal;
    
    const height = 20; // Alto del recuadro

    // Calcular coordenadas en porcentaje para el placeholder
    const xPercent = Math.round((x / pageWidth) * 100);
    const yPercent = Math.round((y / pageHeight) * 100);
    const wPercent = Math.round((width / pageWidth) * 100);
    const hPercent = Math.round((height / pageHeight) * 100);

    // Guardar coordenadas
    this.coordenadasFirmas.push({
      signIndex,
      recipientIndex,
      seccion,
      page: pageNumber,
      x: xPercent,
      y: yPercent,
      width: wPercent,
      height: hPercent
    });

    // 1. Dibujar recuadro con borde punteado
    doc.setDrawColor('#1a73e8'); // Azul
    doc.setLineWidth(0.3);
    // Línea superior
    this.dibujarLineaPunteada(doc, x, y, x + width, y);
    // Línea inferior
    this.dibujarLineaPunteada(doc, x, y + height, x + width, y + height);
    // Línea izquierda
    this.dibujarLineaPunteadaVertical(doc, x, y, x, y + height);
    // Línea derecha
    this.dibujarLineaPunteadaVertical(doc, x + width, y, x + width, y + height);

    // 2. Dibujar texto "FIRMAR AQUI"
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor('#1a73e8');
    doc.text('[FIRMAR AQUI]', x + width / 2, y + 5, { align: 'center' });

    // 3. Línea para la firma
    doc.setDrawColor('#666');
    doc.setLineWidth(0.5);
    doc.line(x + 5, y + 12, x + width - 5, y + 12);

    // 4. PLACEHOLDER INVISIBLE con coordenadas codificadas
    const placeholder = `[[SIGN_${signIndex}:R${recipientIndex}:P${pageNumber}:X${xPercent}:Y${yPercent}:W${wPercent}:H${hPercent}]]`;
    doc.setTextColor(255, 255, 255); // Blanco (invisible)
    doc.setFontSize(1);
    doc.text(placeholder, x + width / 2, y + 8, { align: 'center' });

    // 5. Nombre del firmante
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor('#222');
    doc.text(nombreFirmante, x + width / 2, y + 16, { align: 'center' });

    // 6. Cédula
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(`CC. ${cedula}`, x + width / 2, y + 19, { align: 'center' });

    // 7. Rol (debajo del recuadro)
    doc.setTextColor('#666');
    doc.setFontSize(6);
    doc.text(rol, x + width / 2, y + height + 3, { align: 'center' });
  }

  /**
   * Dibuja línea punteada horizontal
   */
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

  /**
   * Dibuja línea punteada vertical
   */
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

  /**
   * Dibuja firma tradicional (sin recuadro de firma digital)
   */
  private dibujarFirmaTradicional(
    doc: jsPDF,
    x: number,
    y: number,
    width: number,
    nombreFirmante: string,
    cedula: string,
    rol: string,
    firmaBase64?: string
  ): void {
    // Si hay imagen de firma, dibujarla
    if (firmaBase64) {
      try {
        // Detectar formato de la imagen desde el base64
        let formato = 'PNG';
        if (firmaBase64.includes('data:image/jpeg') || firmaBase64.includes('data:image/jpg')) {
          formato = 'JPEG';
        } else if (firmaBase64.includes('data:image/png')) {
          formato = 'PNG';
        }
        doc.addImage(firmaBase64, formato, x + 10, y - 2, 50, 14);
      } catch (error) {
        console.warn('No se pudo insertar la firma:', error);
      }
    }

    // Línea para la firma
    doc.setDrawColor('#666');
    doc.setLineWidth(0.5);
    doc.line(x, y + 12, x + width, y + 12);

    // Nombre
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor('#222');
    doc.text(nombreFirmante, x + width / 2, y + 17, { align: 'center' });

    // Cédula
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(`CC. ${cedula}`, x + width / 2, y + 21, { align: 'center' });

    // Rol
    doc.setTextColor('#666');
    doc.setFontSize(7);
    doc.text(rol, x + width / 2, y + 24, { align: 'center' });
  }

  /**
   * Dibuja firmas de acudientes con campos de firma digital
   */
  private async dibujarFirmas(
    doc: jsPDF,
    datos: DatosContratoPDF,
    firmaBase64: string,
    yPos: number,
    pageWidth: number,
    marginLeft: number,
    configFirmas: any,
    seccion: string
  ): Promise<number> {
    const firmaWidth = 70;
    const espacioEntreFirmas = 10;
    const pageHeight = doc.internal.pageSize.getHeight();
    const currentPage = doc.getCurrentPageInfo().pageNumber;

    // Determinar si los acudientes firman digitalmente
    const acudientesFirmaDigital = configFirmas?.acudientes?.map((a: any) => a.firmaDigital !== false) 
      || datos.acudientes.map(() => true);
    
    // Determinar si el representante firma digitalmente
    const representanteFirmaDigital = configFirmas?.representante?.firmaDigital === true;

    const numFirmas = datos.acudientes.length;
    const totalWidth = firmaWidth * Math.min(numFirmas, 2) + espacioEntreFirmas;
    let xPos = (pageWidth - totalWidth) / 2;

    // Firmas de acudientes - primera fila (máximo 2)
    datos.acudientes.slice(0, 2).forEach((acudiente, index) => {
      const x = xPos + index * (firmaWidth + espacioEntreFirmas);
      const usarFirmaDigital = acudientesFirmaDigital[index] !== false;
      const recipientIndex = index + 1; // 1-based index para Firma.dev

      if (usarFirmaDigital) {
        // Dibujar campo de firma digital con recuadro visual
        this.dibujarCampoFirmaDigital(
          doc,
          x,
          yPos,
          firmaWidth,
          recipientIndex,
          acudiente.nombre_completo || '',
          acudiente.numero_identificacion || '',
          acudiente.tipo_acudiente || 'ACUDIENTE',
          currentPage,
          pageWidth,
          pageHeight,
          seccion
        );
      } else {
        // Dibujar firma tradicional
        this.dibujarFirmaTradicional(
          doc,
          x,
          yPos,
          firmaWidth,
          acudiente.nombre_completo || '',
          acudiente.numero_identificacion || '',
          acudiente.tipo_acudiente || 'ACUDIENTE'
        );
      }
    });

    yPos += 28;

    // Segunda fila de acudientes si hay más de 2
    if (numFirmas > 2) {
      xPos = (pageWidth - totalWidth) / 2;
      datos.acudientes.slice(2, 4).forEach((acudiente, index) => {
        const x = xPos + index * (firmaWidth + espacioEntreFirmas);
        const realIndex = index + 2;
        const usarFirmaDigital = acudientesFirmaDigital[realIndex] !== false;
        const recipientIndex = realIndex + 1; // 1-based index para Firma.dev

        if (usarFirmaDigital) {
          this.dibujarCampoFirmaDigital(
            doc,
            x,
            yPos,
            firmaWidth,
            recipientIndex,
            acudiente.nombre_completo || '',
            acudiente.numero_identificacion || '',
            acudiente.tipo_acudiente || 'ACUDIENTE',
            currentPage,
            pageWidth,
            pageHeight,
            seccion
          );
        } else {
          this.dibujarFirmaTradicional(
            doc,
            x,
            yPos,
            firmaWidth,
            acudiente.nombre_completo || '',
            acudiente.numero_identificacion || '',
            acudiente.tipo_acudiente || 'ACUDIENTE'
          );
        }
      });
      yPos += 28;
    }

    // Firma del representante legal
    const xRepresentante = (pageWidth - firmaWidth) / 2;

    if (representanteFirmaDigital) {
      // Representante firma digitalmente (recipient especial)
      this.dibujarCampoFirmaDigital(
        doc,
        xRepresentante,
        yPos,
        firmaWidth,
        99, // Índice especial para representante
        datos.configuracion.representante_legal_nombre || '',
        datos.configuracion.representante_legal_cedula || '',
        'REPRESENTANTE LEGAL',
        currentPage,
        pageWidth,
        pageHeight,
        seccion
      );
    } else {
      // Representante firma de forma tradicional (con imagen de firma)
      this.dibujarFirmaTradicional(
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
   * Dibuja sección de Autorización de Imágenes CON firma digital
   */
  private async dibujarAutorizacionImagenes(
    doc: jsPDF,
    autorizacion: any,
    datos: DatosContratoPDF,
    firmaBase64: string,
    yPos: number,
    pageWidth: number,
    marginLeft: number,
    contentWidth: number,
    primaryColor: string,
    configFirmas: any
  ): Promise<number> {
    const pageHeight = doc.internal.pageSize.getHeight();
    const currentPage = doc.getCurrentPageInfo().pageNumber;
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor('#222');
    const tituloLines = doc.splitTextToSize(autorizacion.titulo, contentWidth);
    doc.text(tituloLines, pageWidth / 2, yPos, { align: 'center' });
    yPos += tituloLines.length * 6 + 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    yPos = this.dibujarTexto(
      doc,
      autorizacion.contenido,
      yPos,
      marginLeft,
      contentWidth,
      primaryColor
    );

    yPos += 10;
    yPos = this.dibujarTexto(
      doc,
      autorizacion.pie_firma,
      yPos,
      marginLeft,
      contentWidth,
      primaryColor
    );

    yPos += 10;

    // FIRMAS CON CAMPO DE FIRMA DIGITAL
    const firmaWidth = 70;
    const espacioEntreFirmas = 10;
    const numFirmas = datos.acudientes.length;
    const totalWidth = firmaWidth * Math.min(numFirmas, 2) + espacioEntreFirmas;
    let xPos = (pageWidth - totalWidth) / 2;

    // Determinar si los acudientes firman digitalmente
    const acudientesFirmaDigital = configFirmas?.acudientes?.map((a: any) => a.firmaDigital !== false) 
      || datos.acudientes.map(() => true);

    // Primera fila de firmas
    datos.acudientes.slice(0, 2).forEach((acudiente, index) => {
      const x = xPos + index * (firmaWidth + espacioEntreFirmas);
      const usarFirmaDigital = acudientesFirmaDigital[index] !== false;
      const recipientIndex = index + 1;

      if (usarFirmaDigital) {
        this.dibujarCampoFirmaDigital(
          doc,
          x,
          yPos,
          firmaWidth,
          recipientIndex,
          acudiente.nombre_completo || '',
          acudiente.numero_identificacion || '',
          acudiente.tipo_acudiente || 'ACUDIENTE',
          currentPage,
          pageWidth,
          pageHeight,
          'AUTORIZACION_IMAGENES'
        );
      } else {
        this.dibujarFirmaTradicional(
          doc,
          x,
          yPos,
          firmaWidth,
          acudiente.nombre_completo || '',
          acudiente.numero_identificacion || '',
          acudiente.tipo_acudiente || 'ACUDIENTE'
        );
      }
    });

    yPos += 28;

    // Segunda fila si hay más de 2 acudientes
    if (numFirmas > 2) {
      datos.acudientes.slice(2, 4).forEach((acudiente, index) => {
        const x = xPos + index * (firmaWidth + espacioEntreFirmas);
        const realIndex = index + 2;
        const usarFirmaDigital = acudientesFirmaDigital[realIndex] !== false;
        const recipientIndex = realIndex + 1;

        if (usarFirmaDigital) {
          this.dibujarCampoFirmaDigital(
            doc,
            x,
            yPos,
            firmaWidth,
            recipientIndex,
            acudiente.nombre_completo || '',
            acudiente.numero_identificacion || '',
            acudiente.tipo_acudiente || 'ACUDIENTE',
            currentPage,
            pageWidth,
            pageHeight,
            'AUTORIZACION_IMAGENES'
          );
        } else {
          this.dibujarFirmaTradicional(
            doc,
            x,
            yPos,
            firmaWidth,
            acudiente.nombre_completo || '',
            acudiente.numero_identificacion || '',
            acudiente.tipo_acudiente || 'ACUDIENTE'
          );
        }
      });
      yPos += 28;
    }

    return yPos + 7;
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

    doc.text(
      `Pagina ${currentPage} de ${totalPages}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );

    doc.text(
      config.institucion_nombre || this.institucionConfigService.getNombreInstitucion(),
      20,
      pageHeight - 10
    );

    doc.text(
      config.institucion_telefono || 'Tel: 861 1636',
      pageWidth - 20,
      pageHeight - 10,
      { align: 'right' }
    );
  }

  /**
   * Dibuja Carta de Instrucciones CON firma digital
   */
  private async dibujarCartaInstrucciones(
    doc: jsPDF,
    cartaInstrucciones: any,
    datos: DatosContratoPDF,
    logoBase64: string,
    pageWidth: number,
    marginLeft: number,
    contentWidth: number,
    primaryColor: string,
    goldColor: string,
    configFirmas: any
  ): Promise<number> {
    doc.addPage();
    let yPos = 15;
    const pageHeight = doc.internal.pageSize.getHeight();
    const currentPage = doc.getCurrentPageInfo().pageNumber;

    yPos = this.dibujarEncabezado(
      doc,
      logoBase64,
      yPos,
      pageWidth,
      goldColor,
      datos.configuracion
    );

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor('#222');
    doc.text(cartaInstrucciones.titulo, pageWidth / 2, yPos, {
      align: 'center',
    });
    yPos += 8;

    doc.setFontSize(10);
    doc.text(cartaInstrucciones.numero_pagare, pageWidth / 2, yPos, {
      align: 'center',
    });
    yPos += 12;

    doc.setFontSize(10);
    doc.text(cartaInstrucciones.fecha, pageWidth - marginLeft, yPos, {
      align: 'right',
    });
    yPos += 12;

    const destinatarioLines = doc.splitTextToSize(
      cartaInstrucciones.destinatario,
      contentWidth
    );
    doc.text(destinatarioLines, marginLeft, yPos);
    yPos += destinatarioLines.length * 5 + 8;

    const contenidoLines = doc.splitTextToSize(
      cartaInstrucciones.contenido,
      contentWidth
    );
    doc.text(contenidoLines, marginLeft, yPos);
    yPos += contenidoLines.length * 5 + 7;

    doc.setFont('helvetica', 'bold');
    doc.text(
      cartaInstrucciones.autorizacion_diligenciamiento.titulo,
      marginLeft,
      yPos
    );
    yPos += 5;

    doc.setFont('helvetica', 'normal');
    const autDiligLines = doc.splitTextToSize(
      cartaInstrucciones.autorizacion_diligenciamiento.contenido,
      contentWidth
    );
    doc.text(autDiligLines, marginLeft, yPos);
    yPos += autDiligLines.length * 4.5 + 5;

    doc.setFont('helvetica', 'bold');
    doc.text(cartaInstrucciones.clausula_aceleratoria.titulo, marginLeft, yPos);
    yPos += 5;

    doc.setFont('helvetica', 'normal');
    const clausulaLines = doc.splitTextToSize(
      cartaInstrucciones.clausula_aceleratoria.contenido,
      contentWidth
    );
    doc.text(clausulaLines, marginLeft, yPos);
    yPos += clausulaLines.length * 4.5 + 5;

    doc.setFont('helvetica', 'bold');
    doc.text(cartaInstrucciones.regimen_legal.titulo, marginLeft, yPos);
    yPos += 5;

    doc.setFont('helvetica', 'normal');
    const regimenLines = doc.splitTextToSize(
      cartaInstrucciones.regimen_legal.contenido,
      contentWidth
    );
    doc.text(regimenLines, marginLeft, yPos);
    yPos += regimenLines.length * 4.5 + 5;

    doc.setFont('helvetica', 'bold');
    doc.text(cartaInstrucciones.autorizacion_cobro.titulo, marginLeft, yPos);
    yPos += 5;

    doc.setFont('helvetica', 'normal');
    const autCobroLines = doc.splitTextToSize(
      cartaInstrucciones.autorizacion_cobro.contenido,
      contentWidth
    );
    doc.text(autCobroLines, marginLeft, yPos);
    yPos += autCobroLines.length * 4.5 + 7;

    doc.setFont('helvetica', 'bold');
    doc.text(cartaInstrucciones.pie_firma, marginLeft, yPos);
    yPos += 10;

    // FIRMAS CON CAMPO DE FIRMA DIGITAL
    const firmaWidth = 70;
    const espacioEntreFirmas = 10;
    const numFirmas = datos.acudientes.length;
    const totalWidth = firmaWidth * Math.min(numFirmas, 2) + espacioEntreFirmas;
    let xPos = (pageWidth - totalWidth) / 2;

    // Determinar si los acudientes firman digitalmente
    const acudientesFirmaDigital = configFirmas?.acudientes?.map((a: any) => a.firmaDigital !== false) 
      || datos.acudientes.map(() => true);

    if (numFirmas === 1) {
      xPos = (pageWidth - firmaWidth) / 2;
      const usarFirmaDigital = acudientesFirmaDigital[0] !== false;
      
      if (usarFirmaDigital) {
        this.dibujarCampoFirmaDigital(
          doc,
          xPos,
          yPos,
          firmaWidth,
          1,
          datos.acudientes[0].nombre_completo || '',
          datos.acudientes[0].numero_identificacion || '',
          datos.acudientes[0].tipo_acudiente || 'ACUDIENTE',
          currentPage,
          pageWidth,
          pageHeight,
          'CARTA_INSTRUCCIONES'
        );
      } else {
        this.dibujarFirmaPagare(doc, datos.acudientes[0], xPos, yPos, firmaWidth);
      }
    } else if (numFirmas === 2) {
      datos.acudientes.forEach((acudiente, index) => {
        const x = xPos + index * (firmaWidth + espacioEntreFirmas);
        const usarFirmaDigital = acudientesFirmaDigital[index] !== false;
        const recipientIndex = index + 1;

        if (usarFirmaDigital) {
          this.dibujarCampoFirmaDigital(
            doc,
            x,
            yPos,
            firmaWidth,
            recipientIndex,
            acudiente.nombre_completo || '',
            acudiente.numero_identificacion || '',
            acudiente.tipo_acudiente || 'ACUDIENTE',
            currentPage,
            pageWidth,
            pageHeight,
            'CARTA_INSTRUCCIONES'
          );
        } else {
          this.dibujarFirmaPagare(doc, acudiente, x, yPos, firmaWidth);
        }
      });
    } else {
      // Más de 2 firmas
      const firmasPorFila = 2;
      datos.acudientes.forEach((acudiente, index) => {
        const fila = Math.floor(index / firmasPorFila);
        const columna = index % firmasPorFila;
        const x = xPos + columna * (firmaWidth + espacioEntreFirmas);
        const y = yPos + fila * 30;
        const usarFirmaDigital = acudientesFirmaDigital[index] !== false;
        const recipientIndex = index + 1;

        if (usarFirmaDigital) {
          this.dibujarCampoFirmaDigital(
            doc,
            x,
            y,
            firmaWidth,
            recipientIndex,
            acudiente.nombre_completo || '',
            acudiente.numero_identificacion || '',
            acudiente.tipo_acudiente || 'ACUDIENTE',
            currentPage,
            pageWidth,
            pageHeight,
            'CARTA_INSTRUCCIONES'
          );
        } else {
          this.dibujarFirmaPagare(doc, acudiente, x, y, firmaWidth);
        }
      });
    }

    return yPos;
  }

  /**
   * Dibuja Pagaré Ejecutivo CON firma digital
   */
  private async dibujarPagareEjecutivo(
    doc: jsPDF,
    pagare: any,
    datos: DatosContratoPDF,
    logoBase64: string,
    pageWidth: number,
    marginLeft: number,
    contentWidth: number,
    primaryColor: string,
    goldColor: string,
    configFirmas: any
  ): Promise<number> {
    doc.addPage();
    let yPos = 15;
    const pageHeight = doc.internal.pageSize.getHeight();
    const currentPage = doc.getCurrentPageInfo().pageNumber;

    yPos = this.dibujarEncabezado(
      doc,
      logoBase64,
      yPos,
      pageWidth,
      goldColor,
      datos.configuracion
    );

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor('#222');
    doc.text(pagare.titulo, pageWidth / 2, yPos, { align: 'center' });
    yPos += 8;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(pagare.numero, pageWidth / 2, yPos, { align: 'center' });
    yPos += 14;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(pagare.debo_pagare, marginLeft, yPos);
    yPos += 9;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(pagare.promesa, marginLeft, yPos);
    yPos += 8;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(pagare.beneficiario.nombre, pageWidth / 2, yPos, {
      align: 'center',
    });
    yPos += 6;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(pagare.beneficiario.nit, pageWidth / 2, yPos, { align: 'center' });
    yPos += 10;

    doc.setFontSize(10);
    const lugarPagoLines = doc.splitTextToSize(pagare.lugar_pago, contentWidth);
    doc.text(lugarPagoLines, marginLeft, yPos);
    yPos += lugarPagoLines.length * 5 + 6;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(pagare.valor.numerico, pageWidth / 2, yPos, { align: 'center' });
    yPos += 7;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(pagare.valor.letras, pageWidth / 2, yPos, { align: 'center' });
    yPos += 5;
    doc.text(pagare.valor.complemento, pageWidth / 2, yPos, {
      align: 'center',
    });
    yPos += 10;

    doc.text(pagare.intereses, marginLeft, yPos);
    yPos += 7;

    doc.text(pagare.valor_recibido, marginLeft, yPos);
    yPos += 10;

    doc.setFont('helvetica', 'bold');
    doc.text(pagare.vencimiento, marginLeft, yPos);
    yPos += 16;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    const notaLines = doc.splitTextToSize(pagare.nota_carta, contentWidth);
    doc.text(notaLines, marginLeft, yPos);
    yPos += notaLines.length * 4 + 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(pagare.pie_firma, marginLeft, yPos);
    yPos += 10;

    // FIRMAS CON CAMPO DE FIRMA DIGITAL
    const firmaWidth = 70;
    const espacioEntreFirmas = 10;
    const numFirmas = datos.acudientes.length;
    const totalWidth = firmaWidth * Math.min(numFirmas, 2) + espacioEntreFirmas;
    let xPos = (pageWidth - totalWidth) / 2;

    // Determinar si los acudientes firman digitalmente
    const acudientesFirmaDigital = configFirmas?.acudientes?.map((a: any) => a.firmaDigital !== false) 
      || datos.acudientes.map(() => true);

    if (numFirmas === 1) {
      xPos = (pageWidth - firmaWidth) / 2;
      const usarFirmaDigital = acudientesFirmaDigital[0] !== false;
      
      if (usarFirmaDigital) {
        this.dibujarCampoFirmaDigital(
          doc,
          xPos,
          yPos,
          firmaWidth,
          1,
          datos.acudientes[0].nombre_completo || '',
          datos.acudientes[0].numero_identificacion || '',
          datos.acudientes[0].tipo_acudiente || 'ACUDIENTE',
          currentPage,
          pageWidth,
          pageHeight,
          'PAGARE'
        );
      } else {
        this.dibujarFirmaPagare(doc, datos.acudientes[0], xPos, yPos, firmaWidth);
      }
    } else if (numFirmas === 2) {
      datos.acudientes.forEach((acudiente, index) => {
        const x = xPos + index * (firmaWidth + espacioEntreFirmas);
        const usarFirmaDigital = acudientesFirmaDigital[index] !== false;
        const recipientIndex = index + 1;

        if (usarFirmaDigital) {
          this.dibujarCampoFirmaDigital(
            doc,
            x,
            yPos,
            firmaWidth,
            recipientIndex,
            acudiente.nombre_completo || '',
            acudiente.numero_identificacion || '',
            acudiente.tipo_acudiente || 'ACUDIENTE',
            currentPage,
            pageWidth,
            pageHeight,
            'PAGARE'
          );
        } else {
          this.dibujarFirmaPagare(doc, acudiente, x, yPos, firmaWidth);
        }
      });
    } else {
      const firmasPorFila = 2;
      datos.acudientes.forEach((acudiente, index) => {
        const fila = Math.floor(index / firmasPorFila);
        const columna = index % firmasPorFila;
        const x = xPos + columna * (firmaWidth + espacioEntreFirmas);
        const y = yPos + fila * 30;
        const usarFirmaDigital = acudientesFirmaDigital[index] !== false;
        const recipientIndex = index + 1;

        if (usarFirmaDigital) {
          this.dibujarCampoFirmaDigital(
            doc,
            x,
            y,
            firmaWidth,
            recipientIndex,
            acudiente.nombre_completo || '',
            acudiente.numero_identificacion || '',
            acudiente.tipo_acudiente || 'ACUDIENTE',
            currentPage,
            pageWidth,
            pageHeight,
            'PAGARE'
          );
        } else {
          this.dibujarFirmaPagare(doc, acudiente, x, y, firmaWidth);
        }
      });
    }

    return yPos;
  }

  private dibujarFirmaPagare(
    doc: jsPDF,
    acudiente: any,
    x: number,
    y: number,
    width: number
  ): void {
    doc.setDrawColor('#666');
    doc.setLineWidth(0.5);
    doc.line(x, y + 15, x + width, y + 15);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor('#222');
    doc.text(acudiente.nombre_completo || '', x + width / 2, y + 20, {
      align: 'center',
    });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(`CC. ${acudiente.numero_identificacion}`, x + width / 2, y + 24, {
      align: 'center',
    });

    doc.setTextColor('#666');
    doc.setFontSize(7);
    doc.text(
      acudiente.tipo_acudiente || 'ACUDIENTE',
      x + width / 2,
      y + 28,
      { align: 'center' }
    );
    doc.setTextColor('#222');
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
      // La firma está guardada en configuracion_global como base64
      const response: any = await firstValueFrom(
        this.configuracionGlobalService.obtenerByClave('representante_legal_firma_base64')
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
    const opciones: Intl.DateTimeFormatOptions = {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    };
    return fecha.toLocaleDateString('es-CO', opciones);
  }

  private obtenerMesInicio(fechaStr: string): string {
    if (!fechaStr) return '';
    const fecha = new Date(fechaStr + 'T00:00:00');
    return fecha.toLocaleDateString('es-CO', { month: 'long' });
  }

  private generarNumeroContrato(id: string, anio: number, prefijo: string): string {
    return `${prefijo}-${anio}-${String(id).padStart(5, '0')}`;
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
    ];
    return numeros[numero] || numero.toString();
  }
}