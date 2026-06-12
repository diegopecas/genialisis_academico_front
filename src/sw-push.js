/*=============================================
SERVICE WORKER - PUSH NOTIFICATIONS
Archivo: src/sw-push.js
Ubicación: raíz de src/ (se copia a dist/ en el build)
=============================================*/

// Escuchar evento push
self.addEventListener('push', function (event) {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch (e) {
    data = {
      title: 'Nuevo mensaje',
      body: event.data.text(),
      icon: '/assets/images/logo_app.png',
    };
  }

  const options = {
    body: data.body || 'Tienes un nuevo mensaje de WhatsApp',
    icon: data.icon || '/assets/images/logo_app.png',
    badge: data.badge || '/assets/images/logo_app.png',
    tag: data.tag || 'wa-message-' + Date.now(),
    renotify: true,
    requireInteraction: false,
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/',
      id_conversacion: data.id_conversacion || null,
    },
  };

  event.waitUntil(self.registration.showNotification(data.title || 'WhatsApp', options));
});

// Al hacer clic en la notificación
self.addEventListener('notificationclick', function (event) {
  event.notification.close();

  const urlDestino = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      // Si ya hay una ventana abierta, enfocarla y navegar
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if ('focus' in client) {
          client.focus();
          client.postMessage({
            type: 'PUSH_NOTIFICATION_CLICK',
            id_conversacion: event.notification.data?.id_conversacion,
          });
          return;
        }
      }
      // Si no hay ventana abierta, abrir una nueva
      if (clients.openWindow) {
        return clients.openWindow(urlDestino);
      }
    })
  );
});

// Activación del Service Worker
self.addEventListener('activate', function (event) {
  event.waitUntil(clients.claim());
});