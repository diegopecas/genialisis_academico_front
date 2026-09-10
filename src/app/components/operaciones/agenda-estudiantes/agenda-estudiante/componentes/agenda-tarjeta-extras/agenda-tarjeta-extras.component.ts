import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

import { PermisosService } from '../../../../../../services/permisos.service';
import { PagosRecibidosService } from '../../../../../../services/pagos-recibidos.service';
import { DocumentosPersonasService } from '../../../../../../services/documentos-personas.service';
import { InstitucionConfigService } from '../../../../../../services/institucion-config.service';
import {
  ExportarPdfComprobanteService,
  DatosComprobantePDF,
} from '../../../../../../services/exportar-pdf-comprobante.service';

import { AgendaCalificacionesComponent } from '../agenda-calificaciones/agenda-calificaciones.component';
import {
  EventoAgenda,
  ItemAgenda,
  NotaAgenda,
  PERMISO_FINANZAS_AGENDA,
  calificacionesDe,
  esActividadExtensa,
  estaRestringido,
  itemsDe,
  notasDe,
} from '../../mi-agenda.types';

/**
 * Todo lo que va al pie de la tarjeta de un evento: los ítems, las
 * calificaciones y las acciones.
 *
 * Existe porque el detalle dejó de abrirse para todo. Ahora la tarjeta
 * muestra la información completa y el detalle se reserva para las fotos,
 * así que esto tiene que aparecer igual en las tres vistas y no tiene
 * sentido repetirlo tres veces.
 *
 * En el institucional la agenda solo se consulta: no hay "Ver más" hacia
 * otras pantallas. El único "Ver más" es el de la actividad plegada, que
 * abre el detalle sin salir de la agenda.
 */
@Component({
  selector: 'app-agenda-tarjeta-extras',
  standalone: true,
  imports: [CommonModule, AgendaCalificacionesComponent],
  templateUrl: './agenda-tarjeta-extras.component.html',
  styleUrl: './agenda-tarjeta-extras.component.scss',
})
export class AgendaTarjetaExtrasComponent {
  @Input() evento: EventoAgenda | null = null;

  /** Aprieta lo que se pinta cuando la tarjeta es angosta (camino, libro). */
  @Input() compacto: boolean = false;

  /**
   * Modo resumen: de una actividad se muestran solo las calificaciones y un
   * "Ver más". Lo usan el camino y las listas, donde el texto largo de la
   * actividad no cabe. El libro va en falso: en la hoja cabe todo.
   */
  @Input() resumido: boolean = false;

  /** El usuario pidió ver el contenido completo de la actividad. */
  @Output() ampliar = new EventEmitter<void>();

  /** Mientras se arma el PDF, para no dejar disparar dos veces. */
  public generandoRecibo = false;

  constructor(
    private pagosRecibidosService: PagosRecibidosService,
    private documentosPersonasService: DocumentosPersonasService,
    private institucionConfigService: InstitucionConfigService,
    private exportarPdfComprobanteService: ExportarPdfComprobanteService,
    public permisosService: PermisosService
  ) { }

  items(): ItemAgenda[] {
    return itemsDe(this.evento);
  }

  /**
   * Lo que la docente escribió: la observación de la clase y la del
   * estudiante. Van rotuladas para que se distinga cuál es cuál, y aparte
   * de la descripción de la actividad, que cuenta qué se hizo en clase.
   */
  notas(): NotaAgenda[] {
    return notasDe(this.evento);
  }

  /** En resumen el texto largo de la actividad se guarda tras el "Ver más". */
  get plegado(): boolean {
    return this.resumido && esActividadExtensa(this.evento);
  }

  pedirAmpliar(event: Event): void {
    event.stopPropagation();
    this.ampliar.emit();
  }

  calificaciones() {
    return calificacionesDe(this.evento);
  }

  // -----------------------------------------------------------------
  // Descargas del pago
  // -----------------------------------------------------------------

  /**
   * Pago con detalle. El recortado no ofrece descargas: el backend ya le
   * quitó el soporte, y el id del pago no debe servir para bajar un recibo
   * que el usuario no puede ver.
   */
  esPago(): boolean {
    return this.evento?.clave === 'pagos'
      && !estaRestringido(this.evento)
      && this.permisosService.tienePermiso(PERMISO_FINANZAS_AGENDA);
  }

  /** El recibo de caja es el PDF que arma el sistema con el consecutivo del pago. */
  puedeVerRecibo(): boolean {
    return this.esPago();
  }

  /**
   * El comprobante es el soporte que subió el acudiente al registrar el
   * pago (la consignación). No todos los pagos tienen uno: si el backend no
   * manda id_documento, el enlace no se ofrece.
   */
  idDocumentoComprobante(): string | null {
    if (!this.esPago()) return null;
    return this.evento?.meta?.id_documento || null;
  }

  hayAcciones(): boolean {
    if (this.plegado) {
      return true;
    }

    return this.puedeVerRecibo() || !!this.idDocumentoComprobante();
  }

  /**
   * Genera el recibo de caja. Misma secuencia de Mi Cuenta: se piden los
   * datos del pago, se baja el logo en base64 y se arma el PDF en el
   * navegador con jsPDF.
   */
  descargarRecibo(event: Event): void {
    event.stopPropagation();

    const idPago = this.evento?.id;
    if (!idPago || this.generandoRecibo) return;

    this.generandoRecibo = true;

    this.pagosRecibidosService.obtenerDatosComprobante(idPago).subscribe({
      next: async (response: any) => {
        const datos = response.body;

        if (!datos) {
          this.generandoRecibo = false;
          return;
        }

        // El logo va en base64 igual que en Mi Cuenta. Sin esto el recibo
        // cae al circulo con iniciales en vez del logo.
        const logoBase64 = await this.cargarLogoBase64();

        const datosPDF: DatosComprobantePDF = {
          pago: datos.pago,
          estudiante: datos.estudiante,
          acudiente: datos.acudiente,
          tipoPago: datos.tipoPago,
          fechaGeneracion: new Date(),
          logoBase64: logoBase64
        };

        this.exportarPdfComprobanteService.generarPDF(datosPDF);
        this.generandoRecibo = false;
      },
      error: () => {
        this.generandoRecibo = false;
      }
    });
  }

  /** Baja el soporte adjunto del pago. */
  descargarComprobante(event: Event): void {
    event.stopPropagation();

    const idDocumento = this.idDocumentoComprobante();
    if (!idDocumento) return;

    this.documentosPersonasService.descargarDocumentoArchivo(
      idDocumento,
      'comprobante-pago'
    );
  }

  /**
   * Descarga el logo de la institucion y lo devuelve en base64 para jsPDF.
   * Si falla, devuelve cadena vacia y el recibo usa el circulo con
   * iniciales. Mismo metodo que usa Mi Cuenta.
   */
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
      console.error('Error al cargar el logo:', error);
      return '';
    }
  }

  trackByNombre(index: number, item: ItemAgenda): string {
    return item.nombre + index;
  }
}
