"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUserAward = createUserAward;
exports.useUserAward = useUserAward;
exports.getUserAwards = getUserAwards;
const firebase_1 = require("@/lib/firebase");
const firestore_1 = require("firebase/firestore");
// Creazione premio
async function createUserAward(userId, awardId, name, value) {
    const award = {
        awardId,
        name,
        value,
        usedValue: 0,
        residuo: value,
        used: false,
        assignedAt: firestore_1.Timestamp.now()
    };
    await (0, firestore_1.setDoc)((0, firestore_1.doc)(firebase_1.db, 'users', userId, 'userAwards', awardId), award);
}
// Utilizzo premio
async function useUserAward(userId, awardId, importoDaScalare) {
    const awardRef = (0, firestore_1.doc)(firebase_1.db, 'users', userId, 'userAwards', awardId);
    const awardSnap = await (0, firestore_1.getDoc)(awardRef);
    if (!awardSnap.exists())
        throw new Error('Premio non trovato');
    const award = awardSnap.data();
    let usedValue = award.usedValue + importoDaScalare;
    if (usedValue > award.value)
        usedValue = award.value;
    const residuo = Math.max(0, award.value - usedValue);
    const used = residuo === 0;
    await (0, firestore_1.updateDoc)(awardRef, { usedValue, residuo, used });
}
// Lettura premi utente
async function getUserAwards(userId) {
    const awardsSnap = await (0, firestore_1.getDocs)((0, firestore_1.collection)(firebase_1.db, 'users', userId, 'userAwards'));
    return awardsSnap.docs.map(docSnap => docSnap.data());
}
