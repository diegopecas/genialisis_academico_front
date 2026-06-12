import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class PushNotificationService {
  private api = environment.api + 'wa-push-subscriptions';

  // Clave pública VAPID
  private readonly VAPID_PUBLIC_KEY = 'BObkU8JSPUs8tC4Hk3m31gc_yfV9bPkrVPWxJPL9qpFd3wSnL8q4kDBTcnrYWn4ll9CUv5rcyebb8jU5o9ZL1vQ';

  constructor(private http: HttpClient) {}

  /**
   * Inicializa el sistema de push notifications.
   * Registra el Service Worker, pide permiso y envía la suscripción al backend.
   */
  async inicializar(): Promise<void> {
    // Validar soporte del navegador
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Push notifications no soportadas en este navegador');
      return;
    }

    try {
      // Paso 1: Registrar Service Worker
      const registration = await navigator.serviceWorker.register('/sw-push.js', { scope: '/' });
      await navigator.serviceWorker.ready;

      // Paso 2: Verificar/pedir permiso
      let permiso = Notification.permission;
      if (permiso === 'default') {
        permiso = await Notification.requestPermission();
      }

      if (permiso !== 'granted') {
        console.warn('Permiso de notificaciones denegado');
        return;
      }

      // Paso 3: Obtener o crear suscripción push
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        const applicationServerKey = this.urlBase64ToUint8Array(this.VAPID_PUBLIC_KEY);
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationServerKey,
        });
      }

      // Paso 4: Enviar suscripción al backend
      await this.enviarSuscripcionAlBackend(subscription);

      // Paso 5: Escuchar clics en notificaciones para navegar
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'PUSH_NOTIFICATION_CLICK') {
          const customEvent = new CustomEvent('push-notification-click', {
            detail: { id_conversacion: event.data.id_conversacion },
          });
          window.dispatchEvent(customEvent);
        }
      });

    } catch (error) {
      console.error('Error inicializando push notifications:', error);
    }
  }

  /**
   * Envía la suscripción push al backend para almacenarla
   */
  private async enviarSuscripcionAlBackend(subscription: PushSubscription): Promise<void> {
    const usuarioStr = sessionStorage.getItem('usuario');
    if (!usuarioStr) return;

    const usuario = JSON.parse(usuarioStr);
    const keys = subscription.toJSON().keys;

    const payload = {
      id_usuario: usuario.id,
      endpoint: subscription.endpoint,
      p256dh: keys?.['p256dh'] || '',
      auth: keys?.['auth'] || '',
    };

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'X-Silent': 'true',
    });

    try {
      await this.http.post(this.api, JSON.stringify(payload), { headers }).toPromise();
    } catch (error) {
      console.error('Error enviando suscripción push al backend:', error);
    }
  }

  /**
   * Elimina la suscripción push (al cerrar sesión)
   */
  async cancelarSuscripcion(): Promise<void> {
    try {
      if (!('serviceWorker' in navigator)) return;

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        const endpoint = subscription.endpoint;

        // Desuscribir del navegador
        await subscription.unsubscribe();

        // Notificar al backend
        const headers = new HttpHeaders({
          'Content-Type': 'application/json',
          'X-Silent': 'true',
        });
        await this.http
          .request('delete', this.api, {
            body: JSON.stringify({ endpoint }),
            headers,
          })
          .toPromise();
      }
    } catch (error) {
      console.error('Error cancelando suscripción push:', error);
    }
  }

  /**
   * Convierte la clave VAPID de base64 URL-safe a Uint8Array
   */
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }
}