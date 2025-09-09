// Firebase Messaging hook per Next.js/React
import { useEffect } from 'react';
import { getApps, initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: 'INSERISCI_API_KEY',
  authDomain: 'INSERISCI_AUTH_DOMAIN',
  projectId: 'INSERISCI_PROJECT_ID',
  storageBucket: 'INSERISCI_STORAGE_BUCKET',
  messagingSenderId: 'INSERISCI_MESSAGING_SENDER_ID',
  appId: 'INSERISCI_APP_ID',
  // measurementId: 'INSERISCI_MEASUREMENT_ID' // opzionale
};

// Inizializza solo se non esiste già
const firebaseApp = getApps().length === 0
  ? initializeApp(firebaseConfig)
  : getApps()[0];

export function useFirebaseMessaging(onForegroundMessage: (payload: any) => void) {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const messaging = getMessaging(firebaseApp);

    // Registra il service worker
    navigator.serviceWorker
      .register('/firebase-messaging-sw.js')
      .then((registration) => {
        // Ottieni il token FCM
        getToken(messaging, {
          vapidKey: 'BOI3i5-vI456ivaSxwQ0RcaZLe7Bz77LCL9QlMA65_kbogFNtMZCnjpd74KYEaL4nORtZ0bBbntvTdGovK4IpsU', // Prendi la VAPID key da Firebase Console
          serviceWorkerRegistration: registration,
        })
          .then((currentToken) => {
            if (currentToken) {
              // Salva il token nel backend associato all'utente
              console.log('FCM Token:', currentToken);
            } else {
              console.warn('Nessun token FCM disponibile. Permesso richiesto?');
            }
          })
          .catch((err) => {
            console.error('Errore nel recupero token FCM:', err);
          });

        // Gestisci notifiche in foreground
        onMessage(messaging, (payload) => {
          if (onForegroundMessage) onForegroundMessage(payload);
        });
      });
  }, [onForegroundMessage]);
}
