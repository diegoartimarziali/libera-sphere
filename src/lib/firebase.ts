// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// ATTENZIONE: Sostituisci queste credenziali con quelle del tuo progetto Firebase!
const firebaseConfig = {
  apiKey: "AIzaSyAeNVPO7H0mlsM3FXjjZJqpeB5Fi6ITISw",
  authDomain: "libera-energia-soci.firebaseapp.com",
  projectId: "libera-energia-soci",
  storageBucket: "libera-energia-soci.appspot.com",
  messagingSenderId: "371255545862",
  appId: "1:371255545862:web:295479b2e6d2dadebaf387"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

export { db, storage };
