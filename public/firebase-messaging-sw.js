// Service worker per Firebase Cloud Messaging
importScripts('https://www.gstatic.com/firebasejs/10.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAeNVPO7H0mlsM3FXjjZJqpeB5Fi6ITISw",
  authDomain: "libera-energia-soci.firebaseapp.com",
  projectId: "libera-energia-soci",
  storageBucket: "libera-energia-soci.firebasestorage.app",
  messagingSenderId: "371255545862",
  appId: "1:371255545862:web:295479b2e6d2dadebaf387",
    // measurementId: 'INSERISCI_MEASUREMENT_ID' // opzionale
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  self.registration.showNotification(payload.notification.title, {
    body: payload.notification.body,
    icon: '/icon-192.png'
  });
});
