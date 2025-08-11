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
  apiKey: "AIzaSyCV3G4s-32K-1dKx772nVe9MnaoIqQ5M5M",
  authDomain: "liberasphere.firebaseapp.com",
  projectId: "liberasphere",
  storageBucket: "liberasphere.appspot.com",
  messagingSenderId: "389081515282",
  appId: "1:389081515282:web:a8d1112435ea56a2973950",
  measurementId: "G-5TE4V7G7P4"
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
