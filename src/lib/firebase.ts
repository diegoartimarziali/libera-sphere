// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";

// =================================================================
// COPIA E INCOLLA QUI LA CONFIGURAZIONE DI FIREBASE
// Sostituisci l'oggetto `firebaseConfig` d'esempio con quello
// che trovi nelle impostazioni del tuo progetto Firebase.
// =================================================================
const firebaseConfig = {
  apiKey: "AIzaSyAeNVPO7H0mlsM3FXjjZJqpeB5Fi6ITISw",
  authDomain: "libera-energia-soci.firebaseapp.com",
  projectId: "libera-energia-soci",
  storageBucket: "libera-energia-soci.firebasestorage.app",
  messagingSenderId: "371255545862",
  appId: "1:371255545862:web:295479b2e6d2dadebaf387",
  measurementId: "G-4NWSYM1KPW"
};
// =================================================================
// FINE DELLA SEZIONE DA MODIFICARE
// =================================================================


// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
