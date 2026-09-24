import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import Swal from 'sweetalert2';
import { BotonInstalarAppComponent } from '../boton-instalar-app/boton-instalar-app.component';
import { PushNotificationService } from '../../services/push-notification.service';

/**
 * Estado del permiso de notificaciones en este dispositivo:
 * - 'no-soportado': el navegador no maneja notificaciones ni push.
 * - 'default': el usuario todavia no ha decidido; se le puede preguntar.
 * - 'granted': ya autorizo.
 * - 'denied': ya nego el permiso. El navegador no vuelve a preguntar nunca:
 *   solo se arregla desde los ajustes del sitio, por eso se muestran los pasos.
 */
export type EstadoNotificaciones = 'no-soportado' | 'default' | 'granted' | 'denied';

/**
 * Panel de configuracion del usuario. Se abre desde el engranaje del menu y
 * por ahora agrupa la instalacion de la aplicacion y la activacion de las
 * notificaciones.
 *
 * El panel lo abre la plantilla del menu con una referencia local
 * (#panelConfiguracion), asi el componente del menu no necesita estado propio.
 */
@Component({
  selector: 'app-panel-configuracion',
  templateUrl: './panel-configuracion.component.html',
  styleUrl: './panel-configuracion.component.scss',
  standalone: true,
  imports: [CommonModule, BotonInstalarAppComponent],
})
export class PanelConfiguracionComponent {
  public abierto: boolean = false;
  public estadoNotificaciones: EstadoNotificaciones = 'default';
  public activando: boolean = false;

  constructor(private pushService: PushNotificationService) {
    this.leerEstadoNotificaciones();
  }

  abrir(): void {
    // Se relee al abrir: el permiso pudo cambiar desde los ajustes del
    // navegador sin que la pagina se recargue
    this.leerEstadoNotificaciones();
    this.abierto = true;
  }

  cerrar(): void {
    this.abierto = false;
  }

  /**
   * Pide el permiso de notificaciones desde el clic del usuario.
   *
   * Es la razon de ser de este boton: cuando la solicitud sale sola al cargar
   * la pagina, Chrome en Android la descarta sin mostrarla. Pedida desde un
   * gesto del usuario si aparece el dialogo del sistema.
   */
  async activarNotificaciones(): Promise<void> {
    if (this.estadoNotificaciones === 'no-soportado') {
      return;
    }

    if (this.estadoNotificaciones === 'denied') {
      this.mostrarInstruccionesBloqueadas();
      return;
    }

    this.activando = true;
    try {
      // inicializar() registra el Service Worker, pide el permiso, crea la
      // suscripcion push y la envia al backend
      await this.pushService.inicializar();
    } catch (error) {
      console.error('Error activando las notificaciones:', error);
    } finally {
      this.activando = false;
    }

    // Se trabaja sobre el valor que devuelve la lectura y no sobre la
    // propiedad: TypeScript ya descarto 'denied' en las validaciones de
    // arriba y no sabe que el permiso acaba de cambiar
    const estado: EstadoNotificaciones = this.leerEstadoNotificaciones();

    if (estado === 'granted') {
      Swal.fire({
        title: 'Notificaciones activadas',
        text: 'Te avisaremos en este dispositivo cuando haya novedades.',
        icon: 'success',
        confirmButtonText: 'Listo',
        confirmButtonColor: '#FFC107',
      });
      return;
    }

    if (estado === 'denied') {
      this.mostrarInstruccionesBloqueadas();
    }
  }

  /** Relee el permiso del navegador, lo guarda y lo devuelve. */
  private leerEstadoNotificaciones(): EstadoNotificaciones {
    if (typeof Notification === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      this.estadoNotificaciones = 'no-soportado';
      return this.estadoNotificaciones;
    }

    this.estadoNotificaciones = Notification.permission as EstadoNotificaciones;
    return this.estadoNotificaciones;
  }

  private mostrarInstruccionesBloqueadas(): void {
    Swal.fire({
      title: 'Notificaciones bloqueadas',
      html: this.armarPasos([
        'Toca el <strong>candado</strong> (o el ícono a la izquierda de la dirección web).',
        'Entra a <strong>Permisos</strong> o <strong>Configuración del sitio</strong>.',
        'En <strong>Notificaciones</strong> elige <strong>Permitir</strong>.',
        'Vuelve a esta pantalla y toca <strong>Activar</strong> otra vez.',
      ]),
      confirmButtonText: 'Entendido',
      confirmButtonColor: '#FFC107',
    });
  }

  private armarPasos(pasos: string[]): string {
    const items = pasos
      .map((paso) => `<li style="margin-bottom: 10px;">${paso}</li>`)
      .join('');
    return `
      <ol style="text-align: left; font-size: 15px; color: #2D2D2D; line-height: 1.6; padding-left: 20px; margin: 0;">
        ${items}
      </ol>
    `;
  }
}