"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.testSimulatoUserAward = testSimulatoUserAward;
const updateUserBonus_1 = require("./updateUserBonus");
const userAwards_1 = require("./userAwards");
/**
 * Test simulato: utilizza un premio e verifica l'aggiornamento del residuo.
 */
async function testSimulatoUserAward(userId, awardId, importo) {
    console.log('--- TEST SIMULATO USER AWARD ---');
    console.log('User:', userId, 'Award:', awardId, 'Importo:', importo);
    await (0, updateUserBonus_1.updateUserBonus)(awardId, userId, importo);
    const premi = await (0, userAwards_1.getUserAwards)(userId);
    const premio = premi.find(p => p.awardId === awardId);
    console.log('Risultato dopo utilizzo:', premio);
    return premio;
}
// Esempio di chiamata (da terminale o altro script):
// testSimulatoUserAward('USER_ID', 'AWARD_ID', 20);
