import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ExportarPdfComprobanteColaboradorService, DatosComprobanteColaboradorPDF } from '../../../../services/exportar-pdf-comprobante-colaborador.service';
import { InstitucionConfigService } from '../../../../services/institucion-config.service';

// Interfaces para el modelo de datos
interface ColaboradorModel {
  nombre: string;
  documento: string;
  cargo?: string;
  fecha_ingreso?: string;
}

interface CuentaAplicadaModel {
  id: string;
  nombre_producto_servicio: string;
  valor: number;
  valor_aplicado: number;
  detalle?: string;
  id_cuenta_por_cobrar?: string;
  saldo_pendiente?: number;
  fecha_cuenta?: string;
  fecha?: string;
}

interface PagoModel {
  id: string;
  fecha: string;
  valor_recibido: number;
  saldo: number;
  id_tipo_pago: string;
  referencia_bancaria: string;
  observaciones: string;
  cuentas_aplicadas: CuentaAplicadaModel[];
  id_colaborador: string;
  anulado?: number;
  fecha_registro?: string;
  id_usuario_registro?: string;
  fecha_contabilizacion?: string;
  id_usuario_contable?: string;
  fecha_anulacion?: string;
  id_usuario_anulacion?: string;
  tipo_pago_nombre?: string;
  nombre_completo_usuario_registro?: string;
  nombre_completo_usuario_contable?: string;
}

@Component({
  selector: 'app-comprobante-pago-colaborador',
  templateUrl: './comprobante-pago-colaborador.component.html',
  styleUrls: ['./comprobante-pago-colaborador.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule]
})
export class ComprobantePagoColaboradorComponent implements OnInit {
  @Input() pago!: PagoModel;
  @Input() colaborador!: ColaboradorModel;
  @Input() tipoPago: any = {};

  fechaGeneracion: Date = new Date();
  
  // Propiedades dinámicas de institución
  public logoUrl: string = '';
  public nombreInstitucion: string = '';
  public direccionInstitucion: string = '';
  public nitInstitucion: string = '';
  public regresar = '/colaboradores-pagos-recibidos/';

  constructor(
    private router: Router,
    private exportarPdfComprobanteColaboradorService: ExportarPdfComprobanteColaboradorService,
    private institucionConfigService: InstitucionConfigService
  ) { }

  ngOnInit(): void {
    // Cargar configuración dinámica
    this.logoUrl = this.institucionConfigService.getLogoUrl();
    this.nombreInstitucion = this.institucionConfigService.getNombreInstitucion();
    this.direccionInstitucion = this.institucionConfigService.getDireccionInstitucion();
    this.nitInstitucion = this.institucionConfigService.getNitInstitucion();
    
    this.regresar = this.regresar + '0';
    console.log("ComprobantePagoColaboradorComponent", this.pago, this.colaborador);
    
    if (!this.pago || !this.colaborador) {
      console.error('Datos incompletos para generar el comprobante');
    }
  }

  formatearMoneda(valor: number): string {
    return valor.toLocaleString('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    });
  }

  formatearFecha(fechaStr: string): string {
    const fecha = new Date(fechaStr);
    return fecha.toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  formatearFechaCorta(fechaStr: string | undefined): string {
    if (!fechaStr) return '';

    try {
      const soloFecha = fechaStr.split('T')[0];
      const [año, mes, dia] = soloFecha.split('-');
      return `${dia}/${mes}/${año}`;
    } catch (error) {
      console.error('Error al formatear fecha:', error);
      return '';
    }
  }

  calcularTotalAplicado(): number {
    return this.pago.cuentas_aplicadas.reduce(
      (total, cuenta) => total + cuenta.valor_aplicado, 0
    );
  }

  compartirPorWhatsApp(): void {
    const mensaje = `*Comprobante de Pago N° ${this.pago.id}*
📆 Fecha: ${this.formatearFecha(this.pago.fecha)}
👤 Colaborador: ${this.colaborador.nombre}
💰 Valor recibido: ${this.formatearMoneda(this.pago.valor_recibido)}
🧾 Tipo de pago: ${this.tipoPago.nombre}

Este es un comprobante de pago del ${this.nombreInstitucion}. Gracias por su pago.`;

    const mensajeCodificado = encodeURIComponent(mensaje);

    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      z-index: 10000;
      text-align: center;
    `;

    modal.innerHTML = `
      <h4 style="margin-bottom: 15px; color: #333;">¿Dónde deseas compartir?</h4>
      <button id="wa-web" style="
        background-color: #25d366;
        color: white;
        border: none;
        padding: 10px 20px;
        margin: 5px;
        border-radius: 5px;
        cursor: pointer;
        font-size: 14px;
      ">
        <i class="bi bi-laptop"></i> WhatsApp Web
      </button>
      <button id="wa-app" style="
        background-color: #25d366;
        color: white;
        border: none;
        padding: 10px 20px;
        margin: 5px;
        border-radius: 5px;
        cursor: pointer;
        font-size: 14px;
      ">
        <i class="bi bi-phone"></i> WhatsApp App
      </button>
      <button id="wa-cancel" style="
        background-color: #6c757d;
        color: white;
        border: none;
        padding: 10px 20px;
        margin: 5px;
        border-radius: 5px;
        cursor: pointer;
        font-size: 14px;
      ">
        Cancelar
      </button>
    `;

    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.5);
      z-index: 9999;
    `;

    document.body.appendChild(overlay);
    document.body.appendChild(modal);

    document.getElementById('wa-web')?.addEventListener('click', () => {
      window.open(`https://web.whatsapp.com/send?text=${mensajeCodificado}`, '_blank');
      document.body.removeChild(modal);
      document.body.removeChild(overlay);
    });

    document.getElementById('wa-app')?.addEventListener('click', () => {
      window.open(`https://wa.me/?text=${mensajeCodificado}`, '_blank');
      document.body.removeChild(modal);
      document.body.removeChild(overlay);
    });

    document.getElementById('wa-cancel')?.addEventListener('click', () => {
      document.body.removeChild(modal);
      document.body.removeChild(overlay);
    });
  }

  private async cargarLogoBase64(): Promise<string> {
    try {
      const response = await fetch('assets/images/logo_basico.png');
      const blob = await response.blob();

      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve(reader.result as string);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Error al cargar el logo:', error);
      return '';
    }
  }

  async exportarPDF(): Promise<void> {
    try {
      this.mostrarMensajeCarga();

      const logoBase64 = await this.cargarLogoBase64();

      const datosPDF: DatosComprobanteColaboradorPDF = {
        pago: this.pago,
        colaborador: this.colaborador,
        tipoPago: this.tipoPago,
        fechaGeneracion: this.fechaGeneracion,
        logoBase64: logoBase64
      };

      this.exportarPdfComprobanteColaboradorService.generarPDF(datosPDF);

      this.ocultarMensajeCarga();
      this.mostrarMensajeExito('PDF generado exitosamente');
    } catch (error) {
      console.error('Error al generar el PDF:', error);
      this.ocultarMensajeCarga();
      alert('Ocurrió un error al generar el PDF. Por favor, intente nuevamente.');
    }
  }

  private mostrarMensajeCarga(): void {
    if (!document.getElementById('loading-message')) {
      const loadingMessage = document.createElement('div');
      loadingMessage.id = 'loading-message';
      loadingMessage.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0,0,0,0.5);
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
      `;
      loadingMessage.innerHTML = `
        <div style="background: white; padding: 20px; border-radius: 5px; color: #333;">
          <h3>Generando PDF...</h3>
          <p>Por favor espere un momento</p>
        </div>
      `;
      document.body.appendChild(loadingMessage);
    }
  }

  private ocultarMensajeCarga(): void {
    const loadingMessage = document.getElementById('loading-message');
    if (loadingMessage) {
      document.body.removeChild(loadingMessage);
    }
  }

  private mostrarMensajeExito(mensaje: string): void {
    const successMessage = document.createElement('div');
    successMessage.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background-color: #28a745;
      color: white;
      padding: 15px 20px;
      border-radius: 5px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.2);
      z-index: 9999;
      animation: slideIn 0.3s ease-out;
    `;
    successMessage.innerHTML = `
      <i class="bi bi-check-circle"></i> ${mensaje}
    `;

    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
    `;
    document.head.appendChild(style);

    document.body.appendChild(successMessage);

    setTimeout(() => {
      successMessage.style.animation = 'slideIn 0.3s ease-out reverse';
      setTimeout(() => {
        document.body.removeChild(successMessage);
        document.head.removeChild(style);
      }, 300);
    }, 3000);
  }

  imprimirComprobante(): void {
    window.print();
  }

  volver(): void {
    if (this.pago && this.pago.id_colaborador) {
      this.router.navigate([this.regresar + this.pago.id_colaborador]);
    } else {
      this.router.navigate([this.regresar]);
    }
  }
}