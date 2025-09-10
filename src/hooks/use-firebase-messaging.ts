import { useEffect } from 'react';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { app } from '@/lib/firebase';

export function useFirebaseMessaging(onForegroundMessage: (payload: any) => void) {
  useEffect(() => {
    const requestNotificationPermission = async () => {
      try {
        // Check if we're in a browser environment
        if (typeof window === 'undefined') return;
        
        // Check if browser supports notifications
        if (!('Notification' in window)) {
          console.warn('Browser does not support notifications');
          return;
        }

        // Get messaging instance
        const messaging = getMessaging(app);

        // If already denied, don't show the prompt again
        if (Notification.permission === 'denied') {
          console.log('Notification permission was previously denied');
          return;
        }

        // Show custom prompt first if permission not granted yet
        if (Notification.permission !== 'granted') {
          const customPromptResult = confirm(
            'LiberaSphere vorrebbe inviarti notifiche per tenerti aggiornato sulle tue attività. Vuoi attivare le notifiche?'
          );

          if (!customPromptResult) {
            console.log('User declined custom notification prompt');
            return;
          }

          const permission = await Notification.requestPermission();
          if (permission !== 'granted') {
            console.log('Browser notification permission denied');
            return;
          }
        }

        try {
          // Register service worker
          const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
          
          // Get FCM token
          const currentToken = await getToken(messaging, {
            vapidKey: 'BOI3i5-vI456ivaSxwQ0RcaZLe7Bz77LCL9QlMA65_kbogFNtMZCnjpd74KYEaL4nORtZ0bBbntvTdGovK4IpsU',
            serviceWorkerRegistration: registration,
          });

          if (currentToken) {
            console.log('FCM Token:', currentToken);
          } else {
            console.warn('No FCM token available');
          }

          // Setup foreground message handler
          onMessage(messaging, (payload) => {
            if (onForegroundMessage) onForegroundMessage(payload);
          });
        } catch (err) {
          console.error('Error setting up notifications:', err);
        }
      } catch (error) {
        console.error('Error requesting notification permission:', error);
      }
    };

    requestNotificationPermission();
  }, [onForegroundMessage]);
}