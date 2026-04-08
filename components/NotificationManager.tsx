import React, { useEffect, useState } from 'react';
import { Bell, BellOff, Loader2 } from 'lucide-react';

const PUBLIC_VAPID_KEY = "BPLjXKH2h_m6gC9ZBoGc0fOzPryzRCVg2qp1lcUoXv0AZHmkFsnvkuieqivubuzKaxkF8Hyk9-_sBQgmKTuPJHQ";

export const NotificationManager: React.FC = () => {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );

  useEffect(() => {
    checkSubscription();
  }, []);

  const checkSubscription = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setLoading(false);
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (err) {
      console.error('Error checking subscription:', err);
    } finally {
      setLoading(false);
    }
  };

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const subscribe = async () => {
    setLoading(true);
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY)
      });

      await fetch('/api/notifications/subscribe', {
        method: 'POST',
        body: JSON.stringify(subscription),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      setIsSubscribed(true);
      setPermission(Notification.permission);
    } catch (err) {
      console.error('Error subscribing to notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const unsubscribe = async () => {
    setLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
        await fetch('/api/notifications/unsubscribe', {
          method: 'POST',
          body: JSON.stringify(subscription),
          headers: {
            'Content-Type': 'application/json'
          }
        });
      }
      
      setIsSubscribed(false);
    } catch (err) {
      console.error('Error unsubscribing from notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!('Notification' in window)) return null;

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={isSubscribed ? unsubscribe : subscribe}
        disabled={loading}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
          isSubscribed 
            ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
            : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
        }`}
      >
        {loading ? (
          <Loader2 size={14} className="animate-spin" />
        ) : isSubscribed ? (
          <>
            <Bell size={14} className="fill-emerald-600" />
            Notifications Activées
          </>
        ) : (
          <>
            <BellOff size={14} />
            Activer Notifications
          </>
        )}
      </button>
    </div>
  );
};
