"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.storage = exports.db = exports.auth = exports.app = void 0;
// Import the functions you need from the SDKs you need
const app_1 = require("firebase/app");
const firestore_1 = require("firebase/firestore");
const storage_1 = require("firebase/storage");
const auth_1 = require("firebase/auth");
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
const app = !(0, app_1.getApps)().length ? (0, app_1.initializeApp)(firebaseConfig) : (0, app_1.getApp)();
exports.app = app;
const auth = (0, auth_1.getAuth)(app);
exports.auth = auth;
const db = (0, firestore_1.getFirestore)(app);
exports.db = db;
const storage = (0, storage_1.getStorage)(app);
exports.storage = storage;
