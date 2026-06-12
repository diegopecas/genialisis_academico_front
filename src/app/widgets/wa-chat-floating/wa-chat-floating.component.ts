import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  AfterViewChecked,
  Input,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, NavigationEnd } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { WaMensajeriaService } from '../../services/wa-mensajeria.service';
import { PushNotificationService } from '../../services/push-notification.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-wa-chat-floating',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './wa-chat-floating.component.html',
  styleUrl: './wa-chat-floating.component.scss',
})
export class WaChatFloatingComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;
  @ViewChild('inputMensaje') private inputMensaje!: ElementRef;
  @ViewChild('inputArchivo') private inputArchivo!: ElementRef;

  @Input() portal: 'institucional' | 'padres' = 'institucional';

  chatAbierto = false;
  vistaActual: 'lista' | 'chat' = 'lista';
  textoMensaje = '';
  buscador = '';
  enviando = false;
  cargandoConversaciones = true;
  cargandoMensajes = false;

  conversaciones: any[] = [];
  mensajes: any[] = [];
  conversacionActiva: any = null;
  totalNoLeidos = 0;

  // Archivo adjunto
  archivoSeleccionado: File | null = null;

  // Estado de notificaciones push
  notificacionesPush: string = 'pendiente';

  // Paginación: infinite scroll hacia arriba
  cargandoAnteriores = false;
  hayMasMensajes = true;

  // Etiqueta del remitente (se carga una vez al iniciar)
  etiquetaRemitente: string | null = null;
  private etiquetaCargada = false;

  // Selector de plantillas (ventana cerrada)
  mostrarSelectorTemplates = false;
  templatesAprobados: any[] = [];
  cargandoTemplates = false;
  templateSeleccionado: any = null;
  variablesTemplate: { [key: string]: string } = {};
  enviandoTemplate = false;

  // Tipos MIME permitidos por WhatsApp Cloud API
  private readonly MIME_PERMITIDOS: { [mime: string]: { categoria: string; maxMB: number } } = {
    'image/jpeg': { categoria: 'imagen', maxMB: 5 },
    'image/png':  { categoria: 'imagen', maxMB: 5 },
    'video/mp4':  { categoria: 'video', maxMB: 16 },
    'video/3gpp': { categoria: 'video', maxMB: 16 },
    'audio/aac':  { categoria: 'audio', maxMB: 16 },
    'audio/amr':  { categoria: 'audio', maxMB: 16 },
    'audio/mpeg': { categoria: 'audio', maxMB: 16 },
    'audio/mp4':  { categoria: 'audio', maxMB: 16 },
    'audio/ogg':  { categoria: 'audio', maxMB: 16 },
    'application/pdf': { categoria: 'documento', maxMB: 100 },
    'application/msword': { categoria: 'documento', maxMB: 100 },
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { categoria: 'documento', maxMB: 100 },
    'application/vnd.ms-excel': { categoria: 'documento', maxMB: 100 },
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { categoria: 'documento', maxMB: 100 },
    'application/vnd.ms-powerpoint': { categoria: 'documento', maxMB: 100 },
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': { categoria: 'documento', maxMB: 100 },
    'text/plain': { categoria: 'documento', maxMB: 100 },
  };

  // Polling
  private pollingConversaciones: any;
  private pollingMensajes: any;
  private ultimoMensajeId = 0;
  private deberiScrollear = false;
  private routerSub!: Subscription;

  // Acceso
  private tieneAcceso = false;
  private chatHabilitado = false;
  private verificado = false;

  // URL base para multimedia
  private mediaBaseUrl = environment.production
    ? environment.api + 'uploads/'
    : 'https://api.genialisis.com/uploads/';

  // =====================================================
  // FAB DRAGGABLE
  // =====================================================
  fabPosX = 24;
  fabPosY: number = window.innerHeight - 84;
  private dragging = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private fabStartX = 0;
  private fabStartY = 0;
  private dragMoved = false;

  constructor(
    private waSvc: WaMensajeriaService,
    private pushSvc: PushNotificationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.verificarAcceso();
    this.verificarEstadoPush();
    this.routerSub = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        this.verificarAcceso();
      });
  }

  ngOnDestroy(): void {
    this.detenerPolling();
    if (this.routerSub) {
      this.routerSub.unsubscribe();
    }
  }

  ngAfterViewChecked(): void {
    if (this.deberiScrollear) {
      this.scrollAlFinal();
      this.deberiScrollear = false;
    }
  }

  // =====================================================
  // USUARIO Y ETIQUETA REMITENTE
  // =====================================================
  private getIdPersonaRemitente(): number | null {
    const usuario = JSON.parse(sessionStorage.getItem('usuario') || '{}');
    return usuario.id_persona ?? null;
  }

  private cargarEtiquetaRemitente(): void {
    const idPersona = this.getIdPersonaRemitente();
    if (!idPersona) {
      this.etiquetaCargada = true;
      return;
    }
    this.waSvc.obtenerEtiquetaRemitente(idPersona).subscribe({
      next: (response: any) => {
        const data = response.body || response;
        this.etiquetaRemitente = data.etiqueta || null;
        this.etiquetaCargada = true;
      },
      error: () => {
        this.etiquetaCargada = true;
      }
    });
  }

  // =====================================================
  // ACCESO (lee de wa-config)
  // =====================================================
  private verificarAcceso(): void {
    const usuarioStr = sessionStorage.getItem('usuario');
    if (!usuarioStr) {
      this.resetear();
      return;
    }

    if (this.verificado) return;

    const clave = this.portal === 'padres'
      ? 'chat_wa_habilitado_padres'
      : 'chat_wa_habilitado_institucional';

    try {
      const usuario = JSON.parse(usuarioStr);
      if (String(usuario?.acceso_chat_wa) === '0') {
        this.resetear();
        this.verificado = true;
        return;
      }
    } catch (_) {}

    this.waSvc.obtenerWaConfig(clave).subscribe({
      next: (response: any) => {
        const config = response.body || response;
        if (String(config?.valor) === '1') {
          this.tieneAcceso = true;
          this.chatHabilitado = true;
          this.cargarEtiquetaRemitente();
          this.cargarConversaciones();
          this.iniciarPollingConversaciones();
        } else {
          this.resetear();
        }
        this.verificado = true;
      },
      error: () => {
        this.resetear();
        this.verificado = true;
      }
    });
  }

  private resetear(): void {
    this.tieneAcceso = false;
    this.chatHabilitado = false;
    this.chatAbierto = false;
    this.conversaciones = [];
    this.mensajes = [];
    this.conversacionActiva = null;
    this.totalNoLeidos = 0;
    this.verificado = false;
    this.archivoSeleccionado = null;
    this.etiquetaRemitente = null;
    this.etiquetaCargada = false;
    this.mostrarSelectorTemplates = false;
    this.templatesAprobados = [];
    this.templateSeleccionado = null;
    this.variablesTemplate = {};
    this.detenerPolling();
  }

  get visible(): boolean {
    return this.tieneAcceso && this.chatHabilitado;
  }

  // =====================================================
  // PUSH NOTIFICATIONS
  // =====================================================
  private verificarEstadoPush(): void {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      this.notificacionesPush = 'denied';
      return;
    }
    this.notificacionesPush = Notification.permission;
  }

  async activarNotificaciones(): Promise<void> {
    await this.pushSvc.inicializar();
    this.notificacionesPush = Notification.permission;
  }

  // =====================================================
  // CONVERSACIONES
  // =====================================================
  cargarConversaciones(): void {
    this.waSvc.obtenerConversaciones().subscribe({
      next: (response: any) => {
        this.conversaciones = response.body || [];
        this.totalNoLeidos = this.conversaciones.reduce(
          (sum: number, c: any) => sum + (parseInt(c.no_leidos) || 0), 0
        );
        this.cargandoConversaciones = false;
      },
      error: () => {
        this.cargandoConversaciones = false;
      }
    });
  }

  seleccionarConversacion(conv: any): void {
    this.conversacionActiva = conv;
    this.vistaActual = 'chat';
    this.mensajes = [];
    this.textoMensaje = '';
    this.archivoSeleccionado = null;
    this.ultimoMensajeId = 0;
    this.cargandoMensajes = true;
    this.deberiScrollear = true;
    this.hayMasMensajes = true;
    this.mostrarSelectorTemplates = false;

    this.waSvc.obtenerMensajes(conv.id).subscribe({
      next: (response: any) => {
        this.mensajes = response.body || [];
        this.cargandoMensajes = false;

        if (this.mensajes.length < 30) {
          this.hayMasMensajes = false;
        }

        if (this.mensajes.length > 0) {
          this.ultimoMensajeId = this.mensajes[this.mensajes.length - 1].id;
        }
        if (parseInt(conv.no_leidos) > 0) {
          this.waSvc.marcarConversacionLeida(conv.id).subscribe(() => {
            conv.no_leidos = 0;
            this.totalNoLeidos = this.conversaciones.reduce(
              (sum: number, c: any) => sum + (parseInt(c.no_leidos) || 0), 0
            );
          });
        }
        this.iniciarPollingMensajes();
        this.deberiScrollear = true;
        setTimeout(() => this.focusInput(), 200);
      },
      error: () => {
        this.cargandoMensajes = false;
      }
    });
  }

  volverALista(): void {
    this.vistaActual = 'lista';
    this.conversacionActiva = null;
    this.mensajes = [];
    this.archivoSeleccionado = null;
    this.mostrarSelectorTemplates = false;
    this.detenerPollingMensajes();
    this.cargarConversaciones();
  }

  // =====================================================
  // PAGINACIÓN: SCROLL HACIA ARRIBA
  // =====================================================
  onScrollMensajes(event: Event): void {
    const el = event.target as HTMLElement;
    if (el.scrollTop < 60 && !this.cargandoAnteriores && this.hayMasMensajes && this.mensajes.length > 0) {
      this.cargarMensajesAnteriores();
    }
  }

  private cargarMensajesAnteriores(): void {
    if (!this.conversacionActiva || this.mensajes.length === 0) return;

    this.cargandoAnteriores = true;
    const primerMensajeId = this.mensajes[0].id;
    const scrollEl = this.scrollContainer?.nativeElement;
    const scrollHeightAntes = scrollEl ? scrollEl.scrollHeight : 0;

    this.waSvc.obtenerMensajesAnteriores(this.conversacionActiva.id, primerMensajeId).subscribe({
      next: (response: any) => {
        const anteriores = response.body || [];
        if (anteriores.length === 0 || anteriores.length < 30) {
          this.hayMasMensajes = false;
        }
        if (anteriores.length > 0) {
          this.mensajes = [...anteriores, ...this.mensajes];
          setTimeout(() => {
            if (scrollEl) {
              scrollEl.scrollTop = scrollEl.scrollHeight - scrollHeightAntes;
            }
          }, 0);
        }
        this.cargandoAnteriores = false;
      },
      error: () => {
        this.cargandoAnteriores = false;
      }
    });
  }

  // =====================================================
  // VENTANA DE 24H
  // =====================================================
  get ventanaAbierta(): boolean {
    if (!this.conversacionActiva?.ventana_wa_fin) return false;
    return new Date(this.conversacionActiva.ventana_wa_fin).getTime() > Date.now();
  }

  get ventanaTexto(): string {
    if (!this.conversacionActiva?.ventana_wa_fin) return 'Ventana cerrada';
    const fin = new Date(this.conversacionActiva.ventana_wa_fin);
    if (fin.getTime() <= Date.now()) return 'Ventana cerrada';

    const hoy = new Date();
    const esHoy = fin.toDateString() === hoy.toDateString();
    const manana = new Date();
    manana.setDate(manana.getDate() + 1);
    const esManana = fin.toDateString() === manana.toDateString();

    const hora = fin.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });

    if (esHoy) return `Hasta hoy ${hora}`;
    if (esManana) return `Hasta mañana ${hora}`;
    return `Hasta ${fin.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })} ${hora}`;
  }

  // =====================================================
  // TEMPLATES (ventana cerrada)
  // =====================================================

  abrirSelectorTemplates(): void {
    this.mostrarSelectorTemplates = true;
    this.templateSeleccionado = null;
    this.variablesTemplate = {};

    if (this.templatesAprobados.length === 0) {
      this.cargandoTemplates = true;
      this.waSvc.obtenerTemplatesAprobados().subscribe({
        next: (response: any) => {
          const data = response.body || response;
          this.templatesAprobados = data.templates || [];
          this.cargandoTemplates = false;
        },
        error: () => {
          this.cargandoTemplates = false;
        }
      });
    }
  }

  cerrarSelectorTemplates(): void {
    this.mostrarSelectorTemplates = false;
    this.templateSeleccionado = null;
    this.variablesTemplate = {};
  }

  seleccionarTemplate(template: any): void {
    this.templateSeleccionado = template;
    this.variablesTemplate = {};

    const bodyComponent = template.components?.find((c: any) => c.type === 'BODY');
    if (bodyComponent?.text) {
      const matches = bodyComponent.text.match(/\{\{\d+\}\}/g) || [];
      matches.forEach((m: string) => {
        this.variablesTemplate[m] = '';
      });

      // Prellenar {{1}} con el nombre del contacto
      if (this.variablesTemplate['{{1}}'] !== undefined && this.conversacionActiva) {
        const nombre = this.conversacionActiva.nombre_display
          || this.conversacionActiva.nombre_whatsapp
          || '';
        this.variablesTemplate['{{1}}'] = nombre.trim();
      }
    }
  }

  getTemplateBodyText(template: any): string {
    const body = template.components?.find((c: any) => c.type === 'BODY');
    return body?.text || '';
  }

  getTemplateVariables(): string[] {
    return Object.keys(this.variablesTemplate);
  }

  getPreviewConVariables(): string {
    let texto = this.getTemplateBodyText(this.templateSeleccionado);
    for (const [variable, valor] of Object.entries(this.variablesTemplate)) {
      texto = texto.replace(variable, valor || variable);
    }
    return texto;
  }

  puedeEnviarTemplate(): boolean {
    const variables = this.getTemplateVariables();
    if (variables.length === 0) return true;
    return variables.every(v => this.variablesTemplate[v]?.trim());
  }

  enviarTemplateSeleccionado(): void {
    if (!this.templateSeleccionado || !this.conversacionActiva || this.enviandoTemplate) return;

    this.enviandoTemplate = true;
    this.deberiScrollear = true;

    const template = this.templateSeleccionado;
    const variables = this.getTemplateVariables();

    const components: any[] = [];
    if (variables.length > 0) {
      components.push({
        type: 'body',
        parameters: variables.map(v => ({
          type: 'text',
          text: this.variablesTemplate[v]
        }))
      });
    }

    const previewTexto = this.getPreviewConVariables();
    const contenidoDisplay = this.etiquetaRemitente
      ? `${this.etiquetaRemitente} 📋 ${previewTexto}`
      : `📋 ${previewTexto}`;

    const msgTemp: any = {
      id: Date.now(),
      direccion: 'salida',
      tipo: 'texto',
      contenido: contenidoDisplay,
      estado: 'enviando',
      fecha_creacion: new Date().toISOString(),
      _temporal: true
    };
    this.mensajes.push(msgTemp);

    const usuario = JSON.parse(sessionStorage.getItem('usuario') || '{}');

    this.waSvc.enviarTemplate(
      this.conversacionActiva.numero_telefono,
      template.name,
      template.language,
      components,
      usuario.id_persona
    ).subscribe({
      next: (response: any) => {
        const idx = this.mensajes.findIndex((m: any) => m._temporal && m.id === msgTemp.id);
        if (idx >= 0) {
          this.mensajes[idx].estado = 'enviado';
          this.mensajes[idx]._temporal = false;
          this.mensajes[idx].id_mensaje_wa = response.id_mensaje_wa;
        }
        this.enviandoTemplate = false;
        this.cerrarSelectorTemplates();
        this.deberiScrollear = true;
      },
      error: (err: any) => {
        const idx = this.mensajes.findIndex((m: any) => m._temporal && m.id === msgTemp.id);
        if (idx >= 0) {
          this.mensajes[idx].estado = 'fallido';
        }
        this.enviandoTemplate = false;
        const mensaje = err?.error?.detalle?.error?.message || err?.error?.error || 'Error al enviar plantilla';
        alert(mensaje);
      }
    });
  }

  // =====================================================
  // ENVIAR MENSAJE
  // =====================================================
  enviarMensaje(): void {
    if (this.archivoSeleccionado) {
      this.enviarArchivo();
    } else {
      this.enviarTexto();
    }
  }

  private enviarTexto(): void {
    const textoRaw = this.textoMensaje.trim();
    if (!textoRaw || !this.conversacionActiva || this.enviando || !this.etiquetaCargada) return;

    this.enviando = true;
    this.textoMensaje = '';
    this.deberiScrollear = true;

    const textoConEtiqueta = this.etiquetaRemitente
      ? `${this.etiquetaRemitente} ${textoRaw}`
      : textoRaw;

    const msgTemp: any = {
      id: Date.now(),
      direccion: 'salida',
      tipo: 'texto',
      contenido: textoConEtiqueta,
      estado: 'enviando',
      fecha_creacion: new Date().toISOString(),
      _temporal: true
    };
    this.mensajes.push(msgTemp);

    if (this.inputMensaje?.nativeElement) {
      this.inputMensaje.nativeElement.style.height = 'auto';
    }

    const usuario = JSON.parse(sessionStorage.getItem('usuario') || '{}');
    const idPersona = usuario.id_persona ?? null;

    this.waSvc.enviarTexto(this.conversacionActiva.numero_telefono, textoConEtiqueta, idPersona!).subscribe({
      next: (response: any) => {
        const idx = this.mensajes.findIndex((m: any) => m._temporal && m.contenido === textoConEtiqueta);
        if (idx >= 0) {
          this.mensajes[idx].estado = 'enviado';
          this.mensajes[idx]._temporal = false;
          this.mensajes[idx].id_mensaje_wa = response.id_mensaje_wa;
        }
        this.enviando = false;
        this.deberiScrollear = true;
        setTimeout(() => this.focusInput(), 100);
      },
      error: (err: any) => {
        if (err?.error?.error === 'ventana_cerrada') {
          const idx = this.mensajes.findIndex((m: any) => m._temporal && m.contenido === textoConEtiqueta);
          if (idx >= 0) {
            this.mensajes.splice(idx, 1);
          }
          if (confirm(err.error.mensaje + '\n\n¿Desea enviar una plantilla?')) {
            this.abrirSelectorTemplates();
          }
          this.textoMensaje = textoRaw;
        } else {
          const idx = this.mensajes.findIndex((m: any) => m._temporal && m.contenido === textoConEtiqueta);
          if (idx >= 0) {
            this.mensajes[idx].estado = 'fallido';
          }
        }
        this.enviando = false;
      }
    });
  }

  private enviarArchivo(): void {
    if (!this.archivoSeleccionado || !this.conversacionActiva || this.enviando || !this.etiquetaCargada) return;

    this.enviando = true;
    this.deberiScrollear = true;

    const archivo = this.archivoSeleccionado;
    const captionRaw = this.textoMensaje.trim();
    const tipoLocal = this.determinarTipoLocal(archivo.type);

    const captionConEtiqueta = this.etiquetaRemitente && captionRaw
      ? `${this.etiquetaRemitente} ${captionRaw}`
      : captionRaw;

    const contenidoTemp = captionConEtiqueta || (this.etiquetaRemitente
      ? `${this.etiquetaRemitente} ${archivo.name}`
      : archivo.name);

    const msgTemp: any = {
      id: Date.now(),
      direccion: 'salida',
      tipo: tipoLocal,
      contenido: contenidoTemp,
      nombre_archivo: archivo.name,
      estado: 'enviando',
      fecha_creacion: new Date().toISOString(),
      _temporal: true,
      _previewUrl: tipoLocal === 'imagen' ? URL.createObjectURL(archivo) : null,
      url_multimedia: tipoLocal === 'imagen' ? URL.createObjectURL(archivo) : null
    };
    this.mensajes.push(msgTemp);

    this.archivoSeleccionado = null;
    this.textoMensaje = '';

    if (this.inputMensaje?.nativeElement) {
      this.inputMensaje.nativeElement.style.height = 'auto';
    }

    const usuario = JSON.parse(sessionStorage.getItem('usuario') || '{}');

    const formData = new FormData();
    formData.append('archivo', archivo);
    formData.append('numero_destino', this.conversacionActiva.numero_telefono);
    formData.append('id_persona_remitente', String(usuario.id_persona || ''));
    if (captionConEtiqueta) {
      formData.append('caption', captionConEtiqueta);
    }

    this.waSvc.enviarArchivo(formData).subscribe({
      next: (response: any) => {
        const idx = this.mensajes.findIndex((m: any) => m._temporal && m.nombre_archivo === archivo.name);
        if (idx >= 0) {
          if (this.mensajes[idx]._previewUrl) {
            URL.revokeObjectURL(this.mensajes[idx]._previewUrl);
          }
          this.mensajes[idx].estado = 'enviado';
          this.mensajes[idx]._temporal = false;
          this.mensajes[idx].id_mensaje_wa = response.id_mensaje_wa;
          this.mensajes[idx].url_multimedia = response.url_multimedia;
          this.mensajes[idx].tipo = response.tipo;
        }
        this.enviando = false;
        this.deberiScrollear = true;
        setTimeout(() => this.focusInput(), 100);
      },
      error: (err: any) => {
        if (err?.error?.error === 'ventana_cerrada') {
          const idx = this.mensajes.findIndex((m: any) => m._temporal && m.nombre_archivo === archivo.name);
          if (idx >= 0) {
            this.mensajes.splice(idx, 1);
          }
          if (confirm(err.error.mensaje + '\n\n¿Desea enviar una plantilla?')) {
            this.abrirSelectorTemplates();
          }
        } else {
          const idx = this.mensajes.findIndex((m: any) => m._temporal && m.nombre_archivo === archivo.name);
          if (idx >= 0) {
            this.mensajes[idx].estado = 'fallido';
          }
        }
        this.enviando = false;
      }
    });
  }

  // =====================================================
  // ADJUNTAR ARCHIVO
  // =====================================================
  abrirSelectorArchivo(): void {
    this.inputArchivo?.nativeElement?.click();
  }

  onArchivoSeleccionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    const mimeBase = file.type.split(';')[0].trim();
    const tipoPermitido = this.MIME_PERMITIDOS[mimeBase];

    if (!tipoPermitido) {
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      alert(
        `El tipo de archivo ".${ext}" no es compatible con WhatsApp.\n\n` +
        `Formatos permitidos:\n` +
        `📷 Imágenes: JPG, PNG\n` +
        `🎬 Video: MP4, 3GP\n` +
        `🎵 Audio: AAC, AMR, MP3, M4A, OGG\n` +
        `📄 Documentos: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT`
      );
      input.value = '';
      return;
    }

    const maxBytes = tipoPermitido.maxMB * 1024 * 1024;
    if (file.size > maxBytes) {
      alert(`El archivo supera el límite de ${tipoPermitido.maxMB} MB para ${tipoPermitido.categoria}s.`);
      input.value = '';
      return;
    }

    this.archivoSeleccionado = file;
    input.value = '';
    setTimeout(() => this.focusInput(), 100);
  }

  cancelarArchivo(): void {
    this.archivoSeleccionado = null;
  }

  formatearTamano(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  private determinarTipoLocal(mimeType: string): string {
    const tipo = mimeType.split(';')[0].trim();
    if (tipo.startsWith('image/')) return 'imagen';
    if (tipo.startsWith('video/')) return 'video';
    if (tipo.startsWith('audio/')) return 'audio';
    return 'documento';
  }

  onEnter(event: Event): void {
    const keyEvent = event as KeyboardEvent;
    if (!keyEvent.shiftKey) {
      keyEvent.preventDefault();
      this.enviarMensaje();
    }
  }

  autoResize(event: Event): void {
    const textarea = event.target as HTMLTextAreaElement;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 100) + 'px';
  }

  // =====================================================
  // MULTIMEDIA
  // =====================================================
  getUrlMultimedia(msg: any): string {
    if (!msg.url_multimedia) return '';
    if (msg.url_multimedia.startsWith('http') || msg.url_multimedia.startsWith('blob:')) {
      return msg.url_multimedia;
    }
    return this.mediaBaseUrl + msg.url_multimedia;
  }

  abrirMultimedia(msg: any): void {
    const url = this.getUrlMultimedia(msg);
    if (url) {
      window.open(url, '_blank');
    }
  }

  getIconoDocumento(nombreArchivo: string): string {
    const ext = this.getExtension(nombreArchivo);
    switch (ext) {
      case 'pdf': return '📕';
      case 'doc': case 'docx': return '📘';
      case 'xls': case 'xlsx': return '📗';
      case 'ppt': case 'pptx': return '📙';
      case 'txt': return '📄';
      default: return '📎';
    }
  }

  getExtension(nombreArchivo: string): string {
    if (!nombreArchivo) return '';
    const partes = nombreArchivo.split('.');
    return partes.length > 1 ? partes[partes.length - 1].toLowerCase() : '';
  }

  // =====================================================
  // POLLING
  // =====================================================
  iniciarPollingConversaciones(): void {
    this.pollingConversaciones = setInterval(() => {
      if (document.hidden || !this.tieneAcceso) return;
      this.waSvc.obtenerConversaciones().subscribe({
        next: (response: any) => {
          this.conversaciones = response.body || [];
          this.totalNoLeidos = this.conversaciones.reduce(
            (sum: number, c: any) => sum + (parseInt(c.no_leidos) || 0), 0
          );
          if (this.conversacionActiva) {
            const actualizada = this.conversaciones.find((c: any) => c.id === this.conversacionActiva.id);
            if (actualizada) {
              this.conversacionActiva.ventana_wa_inicio = actualizada.ventana_wa_inicio;
              this.conversacionActiva.ventana_wa_fin = actualizada.ventana_wa_fin;
            }
          }
        }
      });
    }, 15000);
  }

  iniciarPollingMensajes(): void {
    this.detenerPollingMensajes();
    this.pollingMensajes = setInterval(() => {
      if (document.hidden || !this.conversacionActiva) return;
      this.waSvc.obtenerMensajesNuevos(this.conversacionActiva.id, this.ultimoMensajeId).subscribe({
        next: (response: any) => {
          const nuevos = response.body || [];
          if (nuevos.length > 0) {
            const reales = nuevos.filter(
              (n: any) => !this.mensajes.some((m: any) => m.id_mensaje_wa && m.id_mensaje_wa === n.id_mensaje_wa)
            );
            this.mensajes.push(...reales);
            this.ultimoMensajeId = this.mensajes[this.mensajes.length - 1].id;
            this.deberiScrollear = true;
          }
        }
      });
    }, 5000);
  }

  detenerPollingMensajes(): void {
    if (this.pollingMensajes) {
      clearInterval(this.pollingMensajes);
      this.pollingMensajes = null;
    }
  }

  detenerPolling(): void {
    if (this.pollingConversaciones) clearInterval(this.pollingConversaciones);
    this.detenerPollingMensajes();
  }

  // =====================================================
  // FAB DRAGGABLE
  // =====================================================
  onFabPointerDown(event: MouseEvent | TouchEvent): void {
    this.dragging = true;
    this.dragMoved = false;

    const point = this.getEventPoint(event);
    this.dragStartX = point.x;
    this.dragStartY = point.y;
    this.fabStartX = this.fabPosX;
    this.fabStartY = this.fabPosY;

    event.preventDefault();

    const onMove = (e: MouseEvent | TouchEvent) => {
      const p = this.getEventPoint(e);
      const dx = p.x - this.dragStartX;
      const dy = p.y - this.dragStartY;

      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        this.dragMoved = true;
      }

      if (this.dragMoved) {
        this.fabPosX = Math.max(0, Math.min(window.innerWidth - 60, this.fabStartX + dx));
        this.fabPosY = Math.max(0, Math.min(window.innerHeight - 60, this.fabStartY + dy));
      }
    };

    const onUp = () => {
      this.dragging = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onUp);

      if (!this.dragMoved) {
        this.toggleChat();
      }
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onUp);
  }

  private getEventPoint(event: MouseEvent | TouchEvent): { x: number; y: number } {
    if (event instanceof TouchEvent) {
      return { x: event.touches[0].clientX, y: event.touches[0].clientY };
    }
    return { x: event.clientX, y: event.clientY };
  }

  get panelStyle(): { [key: string]: string } {
    const panelHeight = 540;
    const panelWidth = 380;

    let top = this.fabPosY - panelHeight - 12;
    let left = this.fabPosX;

    if (top < 10) {
      top = this.fabPosY + 72;
    }

    if (left + panelWidth > window.innerWidth - 10) {
      left = window.innerWidth - panelWidth - 10;
    }

    if (left < 10) left = 10;

    return {
      top: top + 'px',
      left: left + 'px'
    };
  }

  // =====================================================
  // UI
  // =====================================================
  toggleChat(): void {
    this.chatAbierto = !this.chatAbierto;
    if (this.chatAbierto) {
      this.vistaActual = 'lista';
      this.cargarConversaciones();
    }
  }

  get conversacionesFiltradas(): any[] {
    if (!this.buscador.trim()) return this.conversaciones;
    const termino = this.buscador.toLowerCase();
    return this.conversaciones.filter((c: any) =>
      (c.nombre_display || '').toLowerCase().includes(termino) ||
      (c.numero_telefono || '').includes(termino)
    );
  }

  getIniciales(conv: any): string {
    const nombre = conv?.nombre_display || conv?.nombre_whatsapp || '?';
    const partes = nombre.trim().split(' ');
    if (partes.length >= 2) {
      return (partes[0][0] + partes[1][0]).toUpperCase();
    }
    return nombre.substring(0, 2).toUpperCase();
  }

  getColorAvatar(conv: any): string {
    const colores = ['#FFB3D9', '#FFCBA4', '#B3F5D9', '#A3D5FF', '#D4BAFF', '#FFB3A7', '#FFF4A3', '#D4FF9F'];
    return colores[(conv?.id || 0) % colores.length];
  }

  formatearHora(fecha: string): string {
    if (!fecha) return '';
    const d = new Date(fecha);
    const hoy = new Date();
    if (d.toDateString() === hoy.toDateString()) {
      return d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
    }
    const ayer = new Date();
    ayer.setDate(ayer.getDate() - 1);
    if (d.toDateString() === ayer.toDateString()) return 'Ayer';
    return d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit' });
  }

  formatearHoraMensaje(fecha: string): string {
    if (!fecha) return '';
    return new Date(fecha).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  }

  getIconoEstado(estado: string): string {
    switch (estado) {
      case 'enviando': return '⏳';
      case 'enviado': return '✔';
      case 'entregado': return '✔✔';
      case 'leido': return '✔✔';
      case 'fallido': return '⚠';
      default: return '';
    }
  }

  getPreviewMensaje(conv: any): string {
    if (!conv.ultimo_mensaje_contenido) return 'Sin mensajes';
    const prefijo = conv.ultimo_mensaje_direccion === 'salida' ? 'Tú: ' : '';
    let contenido = conv.ultimo_mensaje_contenido;
    if (conv.ultimo_mensaje_tipo !== 'texto') {
      contenido = this.getIconoTipo(conv.ultimo_mensaje_tipo);
    }
    return prefijo + (contenido.length > 35 ? contenido.substring(0, 35) + '...' : contenido);
  }

  getIconoTipo(tipo: string): string {
    switch (tipo) {
      case 'imagen': return '📷 Imagen';
      case 'audio': return '🎵 Audio';
      case 'video': return '🎬 Video';
      case 'documento': return '📄 Documento';
      default: return tipo;
    }
  }

  private scrollAlFinal(): void {
    try {
      if (this.scrollContainer?.nativeElement) {
        this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
      }
    } catch (_) {}
  }

  private focusInput(): void {
    try {
      this.inputMensaje?.nativeElement?.focus();
    } catch (_) {}
  }
}