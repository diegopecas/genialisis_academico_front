import { CommonModule } from '@angular/common';
import { Component, OnInit, NgZone } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../../../common/header/header.component';
import { WaOnboardingService } from '../../../services/wa-onboarding.service';
import { LineaWhatsapp, WaLineasService } from '../../../services/wa-lineas.service';
import { environment } from '../../../../environments/environment';

declare var FB: any;
declare var window: any;

@Component({
  selector: 'app-conectar-whatsapp',
  standalone: true,
  imports: [CommonModule, FormsModule, HeaderComponent],
  templateUrl: './conectar-whatsapp.component.html',
  styleUrl: './conectar-whatsapp.component.scss'
})
export class ConectarWhatsappComponent implements OnInit {
  titulo = 'Conexión de WhatsApp';

  cargandoEstado = true;
  // Líneas del jardín: cada una es un número de WhatsApp conectado
  lineas: LineaWhatsapp[] = [];
  errorEstado = '';

  // Nombre de la línea que se va a conectar (Cartera, Académico...)
  nombreNuevaLinea = '';
  mostrarModalNuevaLinea = false;

  // Cambio de nombre de una línea
  idLineaEditando: number | null = null;
  nombreEditado = '';

  sdkCargado = false;
  cargandoSdk = false;
  procesando = false;

  // Datos capturados del Embedded Signup
  datosOnboarding: any = {};

  // Listener registrado para evitar duplicados
  private listenerRegistrado = false;

  // Modal notificación
  mostrarNotificacion = false;
  mensajeNotificacion = '';
  tipoNotificacion: 'exito' | 'error' | 'info' = 'info';

  // Modal confirmar desconexión
  mostrarConfirmarDesconexion = false;
  lineaADesconectar: LineaWhatsapp | null = null;

  constructor(
    private onboardingSvc: WaOnboardingService,
    private lineasSvc: WaLineasService,
    private ngZone: NgZone
  ) { }

  ngOnInit(): void {
    this.cargarEstado();
  }

  // =====================================================
  // ESTADO (líneas del jardín)
  // =====================================================
  cargarEstado(): void {
    this.cargandoEstado = true;
    this.errorEstado = '';
    this.lineasSvc.obtenerLineas().subscribe({
      next: (response: any) => {
        this.lineas = (response.body as LineaWhatsapp[]) || [];
        this.cargandoEstado = false;
      },
      error: (err: any) => {
        this.errorEstado = err?.error?.error || 'Error al cargar el estado';
        this.cargandoEstado = false;
      }
    });
  }

  /** Solo se listan las líneas conectadas; las desconectadas quedan para el historial del chat */
  get lineasConectadas(): LineaWhatsapp[] {
    return this.lineas.filter(l => l.activo === 1 && l.estado_onboarding === 'active');
  }

  estaConectado(): boolean {
    return this.lineasConectadas.length > 0;
  }

  // =====================================================
  // NUEVA LÍNEA
  // =====================================================
  abrirModalNuevaLinea(): void {
    this.nombreNuevaLinea = '';
    this.mostrarModalNuevaLinea = true;
  }

  cerrarModalNuevaLinea(): void {
    this.mostrarModalNuevaLinea = false;
  }

  /** Desde el modal de otra línea: cierra el modal y abre el registro de Meta */
  conectarNuevaLinea(): void {
    if (!this.nombreNuevaLinea.trim()) return;
    this.mostrarModalNuevaLinea = false;
    this.iniciarConexion();
  }

  // =====================================================
  // NOMBRE DE LA LÍNEA
  // =====================================================
  editarNombre(linea: LineaWhatsapp): void {
    this.idLineaEditando = linea.id;
    this.nombreEditado = linea.nombre || '';
  }

  cancelarEdicionNombre(): void {
    this.idLineaEditando = null;
    this.nombreEditado = '';
  }

  guardarNombre(linea: LineaWhatsapp): void {
    const nombre = this.nombreEditado.trim();
    if (!nombre || this.procesando) return;

    this.procesando = true;
    this.lineasSvc.cambiarNombre(linea.id, nombre).subscribe({
      next: () => {
        this.procesando = false;
        linea.nombre = nombre;
        this.cancelarEdicionNombre();
      },
      error: (err: any) => {
        this.procesando = false;
        this.mostrarMensaje(err?.error?.error || 'Error al cambiar el nombre', 'error');
      }
    });
  }

  // =====================================================
  // CARGA SDK FACEBOOK (lazy)
  // =====================================================
  cargarSdkFacebook(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.sdkCargado && typeof FB !== 'undefined') {
        resolve();
        return;
      }

      this.cargandoSdk = true;

      window.fbAsyncInit = () => {
        FB.init({
          appId: environment.whatsapp.appId,
          cookie: true,
          xfbml: true,
          version: environment.whatsapp.graphVersion
        });
        console.log('[WA-Onboarding] SDK Facebook inicializado', {
          appId: environment.whatsapp.appId,
          version: environment.whatsapp.graphVersion
        });
        this.sdkCargado = true;
        this.cargandoSdk = false;
        resolve();
      };

      const scriptId = 'facebook-jssdk';
      if (document.getElementById(scriptId)) {
        if (typeof FB !== 'undefined') {
          this.sdkCargado = true;
          this.cargandoSdk = false;
          resolve();
        }
        return;
      }

      const script = document.createElement('script');
      script.id = scriptId;
      script.async = true;
      script.defer = true;
      script.crossOrigin = 'anonymous';
      script.src = `https://connect.facebook.net/en_US/sdk.js`;
      script.onerror = () => {
        this.cargandoSdk = false;
        reject('No se pudo cargar el SDK de Facebook');
      };
      document.body.appendChild(script);
    });
  }

  // =====================================================
  // EMBEDDED SIGNUP
  // =====================================================
  async iniciarConexion(): Promise<void> {
    if (!this.nombreNuevaLinea.trim()) {
      this.mostrarMensaje('Escribe el nombre de la línea antes de conectar', 'info');
      return;
    }
    try {
      this.datosOnboarding = {};
      await this.cargarSdkFacebook();
      this.escucharMensajesMeta();
      this.lanzarEmbeddedSignup();
    } catch (err: any) {
      this.mostrarMensaje(err || 'Error al cargar el SDK de Facebook', 'error');
    }
  }

  /**
   * Escucha mensajes de Meta con phone_number_id y waba_id.
   * Estos llegan vía postMessage durante el flujo del popup.
   */
  private escucharMensajesMeta(): void {
    if (this.listenerRegistrado) {
      console.log('[WA-Onboarding] Listener ya estaba registrado');
      return;
    }
    this.listenerRegistrado = true;

    const handler = (event: MessageEvent) => {
      // Loguear TODO mensaje que venga de facebook.com
      if (event.origin && event.origin.includes('facebook.com')) {
        console.log('[WA-Onboarding] Mensaje recibido de Facebook:', {
          origin: event.origin,
          data: event.data
        });
      }

      if (!event.origin || !event.origin.endsWith('facebook.com')) return;

      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;

        console.log('[WA-Onboarding] Data parseada:', data);

        if (data?.type === 'WA_EMBEDDED_SIGNUP') {
          this.ngZone.run(() => {
            console.log('[WA-Onboarding] Evento WA_EMBEDDED_SIGNUP detectado:', data.event, data.data);

            // Capturar cualquier dato útil que venga (sin importar el nombre del evento)
            if (data.data) {
              if (data.data.phone_number_id) {
                this.datosOnboarding.phone_number_id = data.data.phone_number_id;
              }
              if (data.data.waba_id) {
                this.datosOnboarding.waba_id = data.data.waba_id;
              }
              if (data.data.business_id) {
                this.datosOnboarding.business_id = data.data.business_id;
              }
              console.log('[WA-Onboarding] Datos acumulados:', this.datosOnboarding);
            }

            // Manejar eventos de cancelación o error explícitos
            if (data.event === 'CANCEL') {
              this.mostrarMensaje('Conexión cancelada por el usuario', 'info');
            } else if (data.event === 'ERROR') {
              this.mostrarMensaje('Error en el proceso de conexión: ' + (data.data?.error_message || ''), 'error');
            }
          });
        }
      } catch (e) {
        console.warn('[WA-Onboarding] Error parseando mensaje:', e, event.data);
      }
    };
    window.addEventListener('message', handler);
    console.log('[WA-Onboarding] Listener de postMessage registrado');
  }

  private lanzarEmbeddedSignup(): void {
    console.log('[WA-Onboarding] Lanzando FB.login con config_id:', environment.whatsapp.configId);
    FB.login(
      (response: any) => {
        console.log('[WA-Onboarding] FB.login response:', response);
        this.ngZone.run(() => this.manejarRespuestaLogin(response));
      },
      {
        config_id: environment.whatsapp.configId,
        response_type: 'code',
        override_default_response_type: true,
        extras: {
          featureType: 'whatsapp_business_app_onboarding',
          sessionInfoVersion: '3'
        }
      }
    );
  }

  private manejarRespuestaLogin(response: any): void {
    console.log('[WA-Onboarding] manejarRespuestaLogin - datosOnboarding antes:', this.datosOnboarding);

    if (!response?.authResponse?.code) {
      if (response?.status !== 'unknown') {
        this.mostrarMensaje('Conexión cancelada o no autorizada', 'info');
      }
      return;
    }

    const code = response.authResponse.code;
    console.log('[WA-Onboarding] Code recibido:', code);

    // Esperar un poco por si el postMessage llega después del callback
    setTimeout(() => {
      this.intentarProcesar(code);
    }, 500);
  }

  private intentarProcesar(code: string): void {
    const phoneNumberId = this.datosOnboarding?.phone_number_id;
    const wabaId = this.datosOnboarding?.waba_id;
    const businessId = this.datosOnboarding?.business_id;

    console.log('[WA-Onboarding] Intentando procesar:', {
      code: code?.substring(0, 20) + '...',
      phoneNumberId,
      wabaId,
      businessId
    });

    if (!phoneNumberId || !wabaId) {
      console.error('[WA-Onboarding] Faltan datos del onboarding:', this.datosOnboarding);
      this.mostrarMensaje(
        'No se recibio el numero de telefono o la cuenta de WhatsApp Business. Revisa la consola del navegador (F12) para ver el detalle.',
        'error'
      );
      return;
    }

    this.procesarEnBackend(code, phoneNumberId, wabaId, businessId);
  }

  private procesarEnBackend(
    code: string,
    phoneNumberId: string,
    wabaId: string,
    businessId?: string
  ): void {
    console.log('[WA-Onboarding] Llamando al backend con:', {
      phoneNumberId,
      wabaId,
      businessId
    });

    this.procesando = true;
    this.onboardingSvc.procesarOnboarding({
      code,
      phone_number_id: phoneNumberId,
      waba_id: wabaId,
      business_id: businessId,
      es_coexistence: true,
      nombre: this.nombreNuevaLinea.trim()
    }).subscribe({
      next: (respuesta: any) => {
        console.log('[WA-Onboarding] Backend respondio OK:', respuesta);
        this.procesando = false;
        this.datosOnboarding = {};
        this.nombreNuevaLinea = '';
        this.mostrarMensaje('WhatsApp conectado exitosamente', 'exito');
        this.cargarEstado();
      },
      error: (err: any) => {
        console.error('[WA-Onboarding] Backend respondio ERROR:', err);
        this.procesando = false;
        const detalle = err?.error?.error || err?.error?.detalle?.error?.message || 'Error al procesar el onboarding';
        this.mostrarMensaje(detalle, 'error');
      }
    });
  }

  // =====================================================
  // DESCONEXIÓN
  // =====================================================
  abrirConfirmarDesconexion(linea: LineaWhatsapp): void {
    this.lineaADesconectar = linea;
    this.mostrarConfirmarDesconexion = true;
  }

  cerrarConfirmarDesconexion(): void {
    this.mostrarConfirmarDesconexion = false;
    this.lineaADesconectar = null;
  }

  confirmarDesconexion(): void {
    if (!this.lineaADesconectar) return;
    this.procesando = true;
    this.onboardingSvc.desconectar(this.lineaADesconectar.id).subscribe({
      next: () => {
        this.procesando = false;
        this.cerrarConfirmarDesconexion();
        this.mostrarMensaje('Línea desconectada correctamente', 'info');
        this.cargarEstado();
      },
      error: (err: any) => {
        this.procesando = false;
        const detalle = err?.error?.error || 'Error al desconectar';
        this.mostrarMensaje(detalle, 'error');
      }
    });
  }

  // =====================================================
  // NOTIFICACION MODAL
  // =====================================================
  mostrarMensaje(mensaje: string, tipo: 'exito' | 'error' | 'info' = 'info'): void {
    this.mensajeNotificacion = mensaje;
    this.tipoNotificacion = tipo;
    this.mostrarNotificacion = true;
  }

  cerrarNotificacion(): void {
    this.mostrarNotificacion = false;
    this.mensajeNotificacion = '';
  }
}