import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { DocumentoPersona, DocumentosPersonasService } from '../../services/documentos-personas.service';
import { FirmaDigitalService } from '../../services/firma-digital.service';
import { UtilService } from '../constantes/util.service';
import { TipoDocumento, TiposDocumentosService } from '../../services/tipos-documentos.service';


@Component({
  selector: 'app-documentos-persona',
  templateUrl: './documentos-persona.component.html',
  styleUrl: './documentos-persona.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule],
})
export class DocumentosPersonaComponent implements OnInit {
  @Input() idPersona!: string;
  @Input() tipoPersona!: string;
  @Input() nombrePersona?: string;
  @Input() idContrato?: string;
  @Input() soloContratoFirmado = false;
  @Input() soloLectura = false;
  @Input() emailsFirmantes: string[] = [];
  @Input() validarAcudientes = false;
  @Input() filtroCodigosTipoDocumento: string[] = [];
  @Input() modoSoloSubir = false;
  @Output() documentoSubido = new EventEmitter<{
    codigo_tipo: string;
    nombre_archivo: string;
    id_documento: string;
    tipo_documento: any;
    eliminado?: boolean;
  }>();

  public documentos: DocumentoPersona[] = [];
  public tiposDocumentos: TipoDocumento[] = [];
  public cargando = false;
  public mostrarModal = false;
  public mostrarModalDetalles = false;
  public mostrarModalFirma = false;
  public documentoSeleccionado?: DocumentoPersona;
  public maxLengthNombre = 35;

  public tipoDocumentoSeleccionado?: TipoDocumento;
  public archivoSeleccionado?: File;
  public fechaVencimiento?: string;
  public observaciones = '';
  public subiendoArchivo = false;

  public enviandoFirma = false;
  public consultandoEstado = false;
  public reenviandoCorreo = false;
  public documentoRecienSubido: any = null;
  public descargandoFirmado = false;

  constructor(
    private documentosService: DocumentosPersonasService,
    private tiposDocumentosService: TiposDocumentosService,
    private utilService: UtilService,
    private firmaDigitalService: FirmaDigitalService,
  ) {
    this.ajustarMaxLengthNombre();
  }

  @HostListener('window:resize', ['$event'])
  onResize(event?: any) {
    this.ajustarMaxLengthNombre();
  }

  ajustarMaxLengthNombre() {
    const ancho = window.innerWidth;
    if (ancho <= 480) {
      this.maxLengthNombre = 20;
    } else if (ancho <= 768) {
      this.maxLengthNombre = 25;
    } else {
      this.maxLengthNombre = 35;
    }
  }

  ngOnInit() {
    if (!this.idPersona || !this.tipoPersona) {
      console.error('❌ FALTAN DATOS');
      return;
    }

    this.cargarTiposDocumentos();
    this.cargarDocumentos();
  }

  cargarTiposDocumentos() {
    this.tiposDocumentosService
      .obtenerPorTipoPersona(this.tipoPersona)
      .subscribe({
        next: (response: any) => {
          this.tiposDocumentos = response.body;

          if (this.soloContratoFirmado) {
            this.tiposDocumentos = this.tiposDocumentos.filter(
              (td) => td.codigo === 'contrato_matricula_firmado',
            );
          }

          // Filtrar por códigos específicos si se proporcionaron
          if (this.filtroCodigosTipoDocumento && this.filtroCodigosTipoDocumento.length > 0) {
            this.tiposDocumentos = this.tiposDocumentos.filter(
              (td) => this.filtroCodigosTipoDocumento.includes(td.codigo),
            );
          }
        },
        error: (error: any) => {
          console.error('❌ ERROR al cargar tipos:', error);
        },
      });
  }

  cargarDocumentos() {
    this.cargando = true;

    const idTipoDoc = this.soloContratoFirmado
      ? this.tiposDocumentos.find(
          (td) => td.codigo === 'contrato_matricula_firmado',
        )?.id
      : undefined;

    this.documentosService
      .obtenerPorPersona(this.idPersona, this.idContrato, idTipoDoc)
      .subscribe({
        next: (response: any) => {
          this.documentos = response.body;
          this.cargando = false;
        },
        error: (error: any) => {
          console.error('Error al cargar documentos:', error);
          this.cargando = false;
        },
      });
  }

  /**
   * Determina si el acudiente puede modificar (subir/eliminar) un tipo de documento.
   * Si validarAcudientes es false, siempre retorna true (no restringe).
   * Si validarAcudientes es true, revisa modificable_acudientes del tipo de documento.
   */
  puedeModificar(tipoDoc: any): boolean {
    if (!this.validarAcudientes) return true;
    return tipoDoc.modificable_acudientes !== 0 && tipoDoc.modificable_acudientes !== '0';
  }

  abrirModal(tipoDocumento: TipoDocumento) {
    if (tipoDocumento.permite_multiples === 0) {
      const documentoExistente = this.documentos.find(
        (doc) =>
          doc.id_tipo_documento === tipoDocumento.id &&
          (this.idContrato
            ? doc.id_contrato === this.idContrato
            : !doc.id_contrato),
      );

      if (documentoExistente) {
        Swal.fire({
          icon: 'warning',
          title: 'Documento existente',
          text: `Ya existe un documento de tipo "${tipoDocumento.nombre}". Elimine el anterior para subir uno nuevo.`,
          confirmButtonText: 'Entendido',
        });
        return;
      }
    }

    this.tipoDocumentoSeleccionado = tipoDocumento;
    this.archivoSeleccionado = undefined;
    this.fechaVencimiento = undefined;
    this.observaciones = '';
    this.mostrarModal = true;
  }

  cerrarModal() {
    this.mostrarModal = false;
    this.tipoDocumentoSeleccionado = undefined;
    this.archivoSeleccionado = undefined;
    this.fechaVencimiento = undefined;
    this.observaciones = '';
  }

  abrirModalDetalles(documento: DocumentoPersona) {
    this.documentoSeleccionado = documento;
    this.mostrarModalDetalles = true;
  }

  cerrarModalDetalles() {
    this.mostrarModalDetalles = false;
    this.documentoSeleccionado = undefined;
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        Swal.fire('Error', 'El archivo no puede superar 10MB', 'error');
        event.target.value = '';
        return;
      }

      const extensionesPermitidas = [
        'pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx', 'xls', 'xlsx',
      ];
      const extension = file.name.split('.').pop()?.toLowerCase();
      if (!extension || !extensionesPermitidas.includes(extension)) {
        Swal.fire('Error', 'Formato de archivo no permitido', 'error');
        event.target.value = '';
        return;
      }

      this.archivoSeleccionado = file;
    }
  }

  subirDocumento() {
    if (!this.archivoSeleccionado || !this.tipoDocumentoSeleccionado) {
      Swal.fire('Error', 'Debe seleccionar un archivo', 'error');
      return;
    }

    if (
      this.tipoDocumentoSeleccionado.requiere_vencimiento &&
      !this.fechaVencimiento
    ) {
      Swal.fire('Error', 'Debe ingresar la fecha de vencimiento', 'error');
      return;
    }

    this.subiendoArchivo = true;

    const formData = new FormData();
    formData.append('archivo', this.archivoSeleccionado);
    formData.append('id_persona', this.idPersona.toString());
    formData.append(
      'id_tipo_documento',
      this.tipoDocumentoSeleccionado.id.toString(),
    );

    if (this.idContrato) {
      formData.append('id_contrato', this.idContrato.toString());
    }

    if (this.fechaVencimiento) {
      formData.append('fecha_vencimiento', this.fechaVencimiento);
    }

    if (this.observaciones) {
      formData.append('observaciones', this.observaciones);
    }

    const idUsuario = this.utilService.obtenerIdUsuarioActual();
    if (idUsuario) {
      formData.append('id_usuario_subio', idUsuario.toString());
    }

    this.documentosService.subirDocumento(formData).subscribe({
      next: (response: any) => {
        this.subiendoArchivo = false;

        this.documentoSubido.emit({
          codigo_tipo: this.tipoDocumentoSeleccionado?.codigo || '',
          nombre_archivo: this.archivoSeleccionado?.name || '',
          id_documento: response.id || response.body?.id || 0,
          tipo_documento: this.tipoDocumentoSeleccionado,
        });

        // Guardar referencia al documento recién subido para modoSoloSubir
        this.documentoRecienSubido = {
          nombre_archivo: this.archivoSeleccionado?.name || '',
          id: response.id || response.body?.id || 0,
        };

        Swal.fire('Éxito', 'Documento subido correctamente', 'success');
        this.cerrarModal();
        this.cargarDocumentos();
      },
      error: (error: any) => {
        this.subiendoArchivo = false;
        console.error('Error al subir documento:', error);
        Swal.fire('Error', 'No se pudo subir el documento', 'error');
      },
    });
  }

  descargarDocumento(documento: DocumentoPersona) {
    const url = this.documentosService.obtenerUrlDescarga(documento.id!);
    window.open(url, '_blank');
  }

  eliminarDocumento(documento: DocumentoPersona) {
    Swal.fire({
      title: '¿Eliminar documento?',
      text: `Se eliminará "${documento.nombre_documento}"`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (result.isConfirmed) {
        this.documentosService.eliminar(documento.id!).subscribe({
          next: () => {
            Swal.fire(
              'Eliminado',
              'Documento eliminado correctamente',
              'success',
            );
            this.cargarDocumentos();

            const tipoDoc = this.tiposDocumentos.find(
              (t) => t.id === documento.id_tipo_documento,
            );

            this.documentoSubido.emit({
              codigo_tipo: tipoDoc?.codigo || '',
              nombre_archivo: documento.nombre_documento || '',
              id_documento: documento.id || '',
              tipo_documento: tipoDoc,
              eliminado: true,
            });
          },
          error: (error: any) => {
            console.error('Error al eliminar documento:', error);
            Swal.fire('Error', 'No se pudo eliminar el documento', 'error');
          },
        });
      }
    });
  }

  getIconoDocumento(nombreArchivo: string): string {
    const extension = nombreArchivo.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf':
        return 'fas fa-file-pdf text-danger';
      case 'doc':
      case 'docx':
        return 'fas fa-file-word text-primary';
      case 'xls':
      case 'xlsx':
        return 'fas fa-file-excel text-success';
      case 'jpg':
      case 'jpeg':
      case 'png':
        return 'fas fa-file-image text-info';
      default:
        return 'fas fa-file text-secondary';
    }
  }

  getClaseEstadoVencimiento(estado: string): string {
    switch (estado) {
      case 'VENCIDO':
        return 'badge bg-danger';
      case 'PROXIMO_VENCER':
        return 'badge bg-warning text-dark';
      case 'VIGENTE':
        return 'badge bg-success';
      default:
        return 'badge bg-secondary';
    }
  }

  getTextoEstadoVencimiento(estado: string, dias?: number): string {
    switch (estado) {
      case 'VENCIDO':
        return 'VENCIDO';
      case 'PROXIMO_VENCER':
        return `Vence en ${dias} días`;
      case 'VIGENTE':
        return 'VIGENTE';
      default:
        return 'N/A';
    }
  }

  formatearFecha(fechaStr: string | undefined): string {
    if (!fechaStr) return '';
    const [fecha] = fechaStr.split('T');
    const [anio, mes, dia] = fecha.split('-');
    return `${dia}/${mes}/${anio}`;
  }

  formatearTamanio(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }

  tieneDocumento(idTipoDocumento: string): boolean {
    return this.documentos.some((d) => d.id_tipo_documento === idTipoDocumento);
  }

  obtenerDocumentosPorTipo(idTipoDocumento: string): DocumentoPersona[] {
    return this.documentos.filter(
      (d) => d.id_tipo_documento === idTipoDocumento,
    );
  }

  truncarNombre(nombre: string, maxLength?: number): string {
    if (!nombre) return '';

    const longitudMaxima = maxLength || this.maxLengthNombre;

    if (nombre.length <= longitudMaxima) return nombre;

    const partes = nombre.split('.');
    const extension = partes.length > 1 ? '.' + partes[partes.length - 1] : '';
    const nombreSinExtension = partes.slice(0, -1).join('.');

    const caracteresDisponibles = longitudMaxima - extension.length - 3;

    if (caracteresDisponibles <= 0) {
      return nombre.substring(0, longitudMaxima - 3) + '...';
    }

    return (
      nombreSinExtension.substring(0, caracteresDisponibles) + '...' + extension
    );
  }

  // ============================================
  // MÉTODOS DE FIRMA DIGITAL
  // ============================================

  abrirModalFirma(documento: DocumentoPersona) {
    if (!this.emailsFirmantes || this.emailsFirmantes.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Sin emails',
        text: 'No hay emails de firmantes configurados',
      });
      return;
    }

    this.documentoSeleccionado = documento;
    this.mostrarModalFirma = true;
  }

  cerrarModalFirma() {
    this.mostrarModalFirma = false;
    this.documentoSeleccionado = undefined;
  }

  enviarAFirmar() {
    if (!this.documentoSeleccionado?.id) return;

    this.enviandoFirma = true;

    this.firmaDigitalService
      .enviarAFirmar(this.documentoSeleccionado.id, this.emailsFirmantes)
      .subscribe({
        next: (response: any) => {
          this.enviandoFirma = false;
          this.cerrarModalFirma();

          Swal.fire({
            icon: 'success',
            title: 'Enviado a firma',
            text: 'El documento ha sido enviado a los firmantes',
            timer: 2000,
          });

          this.cargarDocumentos();
        },
        error: (error: any) => {
          this.enviandoFirma = false;
          console.error('Error:', error);
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo enviar el documento a firma',
          });
        },
      });
  }

  consultarEstadoFirma(documento: DocumentoPersona) {
    if (!documento.id) return;

    this.consultandoEstado = true;

    this.firmaDigitalService.consultarEstado(documento.id).subscribe({
      next: (response: any) => {
        this.consultandoEstado = false;

        let mensaje = this.getTextoEstadoFirma(response.estado);
        let htmlDetalle = '';

        if (response.progreso) {
          const { total, completados, porcentaje } = response.progreso;
          mensaje = `${completados} de ${total} firmantes (${porcentaje}%)`;

          if (response.firmantes && response.firmantes.length > 0) {
            htmlDetalle = '<div style="text-align: left; margin-top: 15px;">';
            htmlDetalle +=
              '<strong>Estado por firmante:</strong><ul style="margin-top: 8px; padding-left: 20px;">';

            response.firmantes.forEach((firmante: any) => {
              const icono = firmante.firmado ? '✅' : '⏳';
              const estado = firmante.firmado ? 'Firmado' : 'Pendiente';
              const fecha = firmante.fecha_firma
                ? ` (${this.formatearFecha(firmante.fecha_firma)})`
                : '';
              htmlDetalle += `<li style="margin-bottom: 5px;">${icono} ${firmante.nombre}: <strong>${estado}</strong>${fecha}</li>`;
            });

            htmlDetalle += '</ul></div>';
          }
        }

        const icono = response.estado === 'firmado' ? 'success' : 'info';

        Swal.fire({
          icon: icono,
          title: 'Estado de Firma Digital',
          html: `<p>${mensaje}</p>${htmlDetalle}`,
          confirmButtonText: 'Entendido',
        });

        this.cargarDocumentos();
      },
      error: (error: any) => {
        this.consultandoEstado = false;
        console.error('Error:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudo consultar el estado',
        });
      },
    });
  }

  descargarDocumentoFirmado(documento: DocumentoPersona) {
    if (!documento.id) return;

    this.descargandoFirmado = true;

    this.firmaDigitalService.descargarFirmado(documento.id).subscribe({
      next: (response: any) => {
        this.descargandoFirmado = false;

        Swal.fire({
          icon: 'success',
          title: 'Descargado',
          text: 'El documento firmado está listo',
          timer: 2000,
        });

        if (response.url_descarga) {
          window.open(response.url_descarga, '_blank');
        }

        this.cargarDocumentos();
      },
      error: (error: any) => {
        this.descargandoFirmado = false;
        console.error('Error:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudo descargar el documento firmado',
        });
      },
    });
  }

  getClaseEstadoFirma(estado?: string): string {
    if (!estado) return '';

    switch (estado) {
      case 'enviado':
        return 'badge bg-warning text-dark';
      case 'firmado':
        return 'badge bg-success';
      case 'rechazado':
        return 'badge bg-danger';
      default:
        return 'badge bg-secondary';
    }
  }

  getTextoEstadoFirma(estado?: string): string {
    if (!estado) return '';

    switch (estado) {
      case 'enviado':
        return 'Pendiente de firma';
      case 'firmado':
        return 'Firmado';
      case 'rechazado':
        return 'Rechazado';
      default:
        return estado;
    }
  }

  requiereFirma(documento: DocumentoPersona): boolean {
    return documento.requiere_firma === 1;
  }

  puedeEnviarAFirmar(documento: DocumentoPersona): boolean {
    const requiereFirma = this.requiereFirma(documento);
    const noTieneFirmaId = !documento.firma_digital_id;
    const noEsSoloLectura = !this.soloLectura;
    const tieneEmails = this.emailsFirmantes.length > 0;

    return requiereFirma && noTieneFirmaId && noEsSoloLectura && tieneEmails;
  }

  puedeConsultarEstado(documento: DocumentoPersona): boolean {
    return !!documento.firma_digital_id;
  }

  requiereSincronizacion(documento: DocumentoPersona): boolean {
    return (
      documento.firma_digital_estado === 'firmado' &&
      !documento.nombre_archivo?.includes('_firmado')
    );
  }

  puedeReenviarCorreo(documento: DocumentoPersona): boolean {
    return (
      !!documento.firma_digital_id &&
      documento.firma_digital_estado === 'enviado' &&
      !this.soloLectura
    );
  }

  reenviarCorreoFirma(documento: DocumentoPersona) {
    if (!documento.id) return;

    Swal.fire({
      title: '¿Reenviar correo de firma?',
      text: 'Se enviará nuevamente el correo a los firmantes pendientes',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, reenviar',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (result.isConfirmed) {
        this.reenviandoCorreo = true;

        this.firmaDigitalService.reenviarCorreo(documento.id!).subscribe({
          next: (response: any) => {
            this.reenviandoCorreo = false;

            Swal.fire({
              icon: 'success',
              title: 'Correo reenviado',
              text: 'Se ha reenviado el correo de firma a los firmantes pendientes',
              timer: 2000,
            });
          },
          error: (error: any) => {
            this.reenviandoCorreo = false;
            console.error('Error:', error);
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: error.error?.error || 'No se pudo reenviar el correo',
            });
          },
        });
      }
    });
  }

  puedeDescargarFirmado(documento: DocumentoPersona): boolean {
    return documento.firma_digital_estado === 'firmado';
  }

  hayDocumentosQueRequierenFirma(): boolean {
    return this.tiposDocumentos.some((td) => td.requiere_firma === 1);
  }
}