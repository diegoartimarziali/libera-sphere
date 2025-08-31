"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateUserTotalLessons = updateUserTotalLessons;
const firebase_1 = require("@/lib/firebase");
const firestore_1 = require("firebase/firestore");
/**
 * Aggiorna il campo totalLessons nel profilo utente in base alle lezioni disponibili per palestra e disciplina.
 * Da chiamare quando cambia il calendario o la disciplina/palestra utente.
 */
async function updateUserTotalLessons(userId, gymId, discipline) {
    // Conta tutte le lezioni per palestra e disciplina
    const lessonsSnap = await (0, firestore_1.getDocs)((0, firestore_1.collection)(firebase_1.db, 'events'));
    let totalLessons = 0;
    lessonsSnap.forEach(docSnap => {
        const data = docSnap.data();
        if (data.type === 'lesson' && data.gymId === gymId && data.discipline === discipline) {
            totalLessons++;
        }
    });
    // Scrivi il totale in una sottocollezione dedicata
    const totalLessonsRef = (0, firestore_1.doc)((0, firestore_1.collection)(firebase_1.db, 'users', userId, 'totalLessons'));
    const { setDoc } = await Promise.resolve().then(() => __importStar(require('firebase/firestore')));
    await setDoc(totalLessonsRef, { value: totalLessons, gymId, discipline, updatedAt: new Date() });
}
