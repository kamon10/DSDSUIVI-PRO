self.addEventListener('push', function(event) {
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/logo.png', // Fallback icon
    badge: '/logo.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: '1'
    },
    actions: [
      {
        action: 'explore',
        title: 'Voir les détails',
        icon: '/logo.png'
      },
      {
        action: 'close',
        title: 'Fermer',
        icon: '/logo.png'
      },
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  } else {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});
