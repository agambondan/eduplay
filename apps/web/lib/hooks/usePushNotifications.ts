'use client';

import { useCallback, useEffect, useState } from 'react';
import api from '@/lib/api/client';
import { useAuthStore } from '@/lib/stores/authStore';

export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [subscribed, setSubscribed] = useState(false);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const subscribe = useCallback(async () => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      console.warn('Push notifications not supported');
      return;
    }

    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm !== 'granted') return;

      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      if (existing) {
        await existing.unsubscribe();
      }

      const res = await api.get('/push/vapid-public-key');
      const publicKey = res.data.data?.public_key;
      if (!publicKey) return;

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as any,
      });

      if (!user) return;

      await api.post('/push/subscribe', {
        endpoint: subscription.endpoint,
        p256dh_key: arrayBufferToBase64(subscription.getKey('p256dh')!),
        auth_key: arrayBufferToBase64(subscription.getKey('auth')!),
      });

      setSubscribed(true);
    } catch (err) {
      console.error('Push subscription failed:', err);
    }
  }, [user]);

  const unsubscribe = useCallback(async () => {
    try {
      if (!user) return;
      await api.post('/push/unsubscribe');
      setSubscribed(false);
    } catch (err) {
      console.error('Unsubscribe failed:', err);
    }
  }, [user]);

  return { permission, subscribed, subscribe, unsubscribe };
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from(rawData.split('').map((c) => c.charCodeAt(0)));
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}
