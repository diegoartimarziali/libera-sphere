import { updateUserBonus } from './updateUserBonus';
import { getUserAwards } from './userAwards';

/**
 * Test simulato: utilizza un premio e verifica l'aggiornamento del residuo.
 */
export async function testSimulatoUserAward(userId: string, awardId: string, importo: number) {
  console.log('--- TEST SIMULATO USER AWARD ---');
  console.log('User:', userId, 'Award:', awardId, 'Importo:', importo);
  await updateUserBonus(awardId, userId, importo);
  const premi = await getUserAwards(userId);
  const premio = premi.find(p => p.awardId === awardId);
  console.log('Risultato dopo utilizzo:', premio);
  return premio;
}

// Esempio di chiamata (da terminale o altro script):
// testSimulatoUserAward('USER_ID', 'AWARD_ID', 20);
