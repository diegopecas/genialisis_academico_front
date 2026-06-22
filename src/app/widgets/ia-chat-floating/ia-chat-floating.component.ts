import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  AfterViewChecked,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, NavigationEnd } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import {
  IaChatService,
} from '../../services/ia-chat.service';

@Component({
  selector: 'app-ia-chat-floating',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ia-chat-floating.component.html',
  styleUrl: './ia-chat-floating.component.scss',
})
export class IaChatFloatingComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;
  @ViewChild('inputMensaje') private inputMensaje!: ElementRef;

  portal: string = 'institucional';

  chatAbierto = false;
  verHistorial = false;
  textoMensaje = '';
  esperandoRespuesta = false;
  cargando = false;

  mensajes: any[] = [];
  conversaciones: any[] = [];
  idConversacionActual: string | null = null;

  nombreUsuario = '';
  nombreAsistente = 'Lumi';
  idPersona: string = '';
  tieneAcceso: boolean = false;
  private deberiScrollear = false;
  private routerSub!: Subscription;

  sugerencias: string[] = [];

  private sugerenciasPorRol: Record<string, string[]> = {
    acudiente: [
      '¿Cuánto debo?',
      '¿Cómo va mi hijo?',
      '¿Cuál es el horario?',
    ],
    docente: [
      '¿Cuántos estudiantes tengo?',
      '¿Qué pendientes tengo?',
      'Resumen de asistencia',
    ],
    admin: [
      'Resumen del jardín',
      '¿Cuántos estudiantes hay?',
      'Estado financiero',
    ],
    general: [
      '¿Cómo me puedes ayudar?',
      'Información del jardín',
      'Horarios',
    ],
  };

  constructor(
    private iaChatService: IaChatService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.cargarDatosUsuario();

    this.routerSub = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        this.cargarDatosUsuario();
      });
  }

  ngOnDestroy(): void {
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

  private cargarDatosUsuario(): void {
    const usuarioStr = sessionStorage.getItem('usuario');
    if (usuarioStr) {
      try {
        const usuario = JSON.parse(usuarioStr);
        const nuevoIdPersona = usuario.id_persona;

        if (nuevoIdPersona === this.idPersona && this.tieneAcceso) {
          return;
        }

        this.idPersona = nuevoIdPersona;
        this.nombreUsuario =
          usuario.sobrenombre || usuario.primer_nombre || 'Usuario';
        this.portal = usuario.portal || 'institucional';

        const rol = this.determinarRolLocal(usuario);
        this.sugerencias = this.sugerenciasPorRol[rol] || this.sugerenciasPorRol['general'];

        // Verificar acceso según portal del usuario
        const verificar$ = this.portal === 'padres'
          ? this.iaChatService.verificarAccesoPadres(this.idPersona)
          : this.iaChatService.verificarAccesoInstitucional(this.idPersona);

        verificar$.subscribe({
          next: (response: any) => {
            const respuesta: any = response.body;
            if (respuesta?.success && respuesta.tiene_acceso) {
              this.tieneAcceso = true;
              if (respuesta.nombre_asistente) {
                this.nombreAsistente = respuesta.nombre_asistente;
              }
            } else {
              this.tieneAcceso = false;
            }
          },
          error: () => {
            this.tieneAcceso = false;
          },
        });
      } catch (e) {
        console.error('Error parseando usuario:', e);
        this.resetearChat();
      }
    } else {
      this.resetearChat();
    }
  }

  private resetearChat(): void {
    this.idPersona = '';
    this.nombreUsuario = '';
    this.tieneAcceso = false;
    this.chatAbierto = false;
    this.mensajes = [];
    this.conversaciones = [];
    this.idConversacionActual = null;
    this.textoMensaje = '';
  }

  private determinarRolLocal(usuario: any): string {
    if (usuario.id_docente) return 'docente';
    if (usuario.id_colaborador) return 'admin';
    return 'acudiente';
  }

  // =====================================================
  // ACCIONES DEL CHAT
  // =====================================================

  toggleChat(): void {
    this.chatAbierto = !this.chatAbierto;
    if (this.chatAbierto) {
      this.verHistorial = false;
      setTimeout(() => this.focusInput(), 200);
    }
  }

  toggleHistorial(): void {
    if (!this.verHistorial) {
      this.cargarListaConversaciones();
    }
    this.verHistorial = !this.verHistorial;
  }

  volverAlChat(): void {
    this.verHistorial = false;
    setTimeout(() => this.focusInput(), 100);
  }

  nuevaConversacion(): void {
    this.mensajes = [];
    this.idConversacionActual = null;
    this.textoMensaje = '';
    setTimeout(() => this.focusInput(), 100);
  }

  enviarSugerencia(sugerencia: string): void {
    this.textoMensaje = sugerencia;
    this.enviarMensaje();
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

  enviarMensaje(): void {
    const texto = this.textoMensaje.trim();
    if (!texto || this.esperandoRespuesta || !this.idPersona) return;

    const msgUsuario: any = {
      id: 0,
      rol_mensaje: 'user',
      mensaje: texto,
      proveedor: null,
      fecha: new Date().toISOString(),
    };
    this.mensajes.push(msgUsuario);
    this.textoMensaje = '';
    this.esperandoRespuesta = true;
    this.deberiScrollear = true;

    if (this.inputMensaje?.nativeElement) {
      this.inputMensaje.nativeElement.style.height = 'auto';
    }

    this.iaChatService
      .enviarMensaje(this.idPersona, texto, this.idConversacionActual)
      .subscribe({
        next: (res: any) => {
          this.esperandoRespuesta = false;

          if (res.success) {
            this.idConversacionActual = res.id_conversacion;

            const msgAsistente: any = {
              id: 0,
              rol_mensaje: 'assistant',
              mensaje: res.respuesta,
              proveedor: res.proveedor,
              fecha: new Date().toISOString(),
            };
            this.mensajes.push(msgAsistente);
          } else {
            const msgError: any = {
              id: 0,
              rol_mensaje: 'assistant',
              mensaje: 'Hubo un error procesando tu mensaje. Intenta de nuevo.',
              proveedor: 'error',
              fecha: new Date().toISOString(),
            };
            this.mensajes.push(msgError);
          }

          this.deberiScrollear = true;
          setTimeout(() => this.focusInput(), 100);
        },
        error: () => {
          this.esperandoRespuesta = false;
          const msgError: any = {
            id: 0,
            rol_mensaje: 'assistant',
            mensaje:
              'No pude conectarme al servidor. Intenta de nuevo en un momento.',
            proveedor: 'error',
            fecha: new Date().toISOString(),
          };
          this.mensajes.push(msgError);
          this.deberiScrollear = true;
        },
      });
  }

  // =====================================================
  // HISTORIAL
  // =====================================================

  cargarListaConversaciones(): void {
    if (!this.idPersona) return;

    this.iaChatService.listarConversaciones(this.idPersona).subscribe({
      next: (response: any) => {
        let respuesta: any = response.body;
        this.conversaciones = respuesta?.success ? respuesta.conversaciones : [];
      },
    });
  }

  cargarConversacion(conv: any): void {
    this.cargando = true;
    this.verHistorial = false;
    this.idConversacionActual = conv.id;

    this.iaChatService.obtenerConversacion(conv.id).subscribe({
      next: (response: any) => {
        this.cargando = false;
        let respuesta: any = response.body;
        this.mensajes = respuesta?.success ? respuesta.mensajes : [];
        this.deberiScrollear = true;
      },
      error: () => {
        this.cargando = false;
      },
    });
  }

  eliminarConversacion(conv: any, event: Event): void {
    event.stopPropagation();

    this.iaChatService.eliminarConversacion(conv.id).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.conversaciones = this.conversaciones.filter(
            (c) => c.id !== conv.id
          );
          if (this.idConversacionActual === conv.id) {
            this.nuevaConversacion();
          }
        }
      },
    });
  }

  // =====================================================
  // UTILIDADES
  // =====================================================

  get visible(): boolean {
    return !!this.idPersona && this.tieneAcceso;
  }

  private scrollAlFinal(): void {
    try {
      if (this.scrollContainer?.nativeElement) {
        const el = this.scrollContainer.nativeElement;
        el.scrollTop = el.scrollHeight;
      }
    } catch (_) {}
  }

  private focusInput(): void {
    try {
      this.inputMensaje?.nativeElement?.focus();
    } catch (_) {}
  }

  formatearMensaje(texto: string): string {
    if (!texto) return '';

    let formateado = texto
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Convertir rutas internas /algo/algo en links clickeables (con #)
    formateado = formateado.replace(
      /`?(\/[a-zA-Z0-9\-_\/:.]+)`?/g,
      '<a href="#$1" class="chat-link">$1</a>'
    );

    // Convertir **texto** en negrita
    formateado = formateado.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

    // Convertir saltos de línea
    formateado = formateado.replace(/\n/g, '<br>');

    return formateado;
  }
}