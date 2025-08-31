"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUserAward = createUserAward;
const firebase_1 = require("@/lib/firebase");
const firestore_1 = require("firebase/firestore");
/**
 * Crea un documento bonus per l'utente in userAwards.
 * Da usare quando l'admin assegna manualmente un bonus.
 */
async function createUserAward({ userId, awardId, value }) {
    // Recupera il nome del premio dalla collezione awards
    let awardName = '';
    try {
        const awardDoc = await (0, firestore_1.getDoc)((0, firestore_1.doc)(firebase_1.db, 'awards', awardId));
        if (awardDoc.exists()) {
            const data = awardDoc.data();
            awardName = data.name || '';
        }
    }
    catch { }
    await (0, firestore_1.addDoc)((0, firestore_1.collection)(firebase_1.db, 'users', userId, 'userAwards'), {
        assignedAt: firestore_1.Timestamp.now(),
        awardId,
        name: awardName,
        value,
        usedValue: 0,
        residuo: value,
        used: false
    });
}
