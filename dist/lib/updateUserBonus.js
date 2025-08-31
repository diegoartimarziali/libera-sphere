"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateUserBonus = updateUserBonus;
const firebase_1 = require("@/lib/firebase");
const firestore_1 = require("firebase/firestore");
/**
 * Aggiorna il bonus dell'utente nell'award specificato.
 * Incrementa usedValue, aggiorna residuo, imposta used=true se residuo==0.
 */
async function updateUserBonus(awardId, userId, bonusToUse) {
    // Recupera il documento premio utente
    const userAwardRef = (0, firestore_1.doc)(firebase_1.db, 'users', userId, 'userAwards', awardId);
    const userAwardSnap = await (0, firestore_1.getDoc)(userAwardRef);
    if (!userAwardSnap.exists())
        throw new Error('UserAward non trovato');
    const award = userAwardSnap.data();
    const prevValue = typeof award.value === 'number' ? award.value : 0;
    const prevUsedValue = typeof award.usedValue === 'number' ? award.usedValue : 0;
    let usedValue = prevUsedValue + bonusToUse;
    if (usedValue > prevValue)
        usedValue = prevValue;
    const residuo = Math.max(0, prevValue - usedValue);
    const used = residuo === 0;
    // Log di debug per verifica valori
    console.log('Aggiorno bonus:', { awardId, userId, usedValue, residuo, used });
    await (0, firestore_1.updateDoc)(userAwardRef, {
        usedValue,
        residuo,
        used,
    });
}
