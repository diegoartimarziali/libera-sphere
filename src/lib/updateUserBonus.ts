import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

/**
 * Aggiorna il bonus dell'utente nell'award specificato.
 * Incrementa usedValue, aggiorna residuo, imposta used=true se residuo==0.
 */
export async function updateUserBonus(
  awardId: string,
  userId: string,
  bonusToUse: number
): Promise<void> {
  // Recupera il documento premio utente
  const userAwardRef = doc(db, 'users', userId, 'userAwards', awardId);
  const userAwardSnap = await getDoc(userAwardRef);
  if (!userAwardSnap.exists()) throw new Error('UserAward non trovato');
  const award = userAwardSnap.data() as {
    value: number;
    usedValue?: number;
    used?: boolean;
  };
  const prevValue = typeof award.value === 'number' ? award.value : 0;
  const prevUsedValue = typeof award.usedValue === 'number' ? award.usedValue : 0;
  let usedValue = prevUsedValue + bonusToUse;
  if (usedValue > prevValue) usedValue = prevValue;
  const residuo = Math.max(0, prevValue - usedValue);
  let used = false;
  if (residuo === 0) used = true;
  // Log dettagliato per debug
  console.log('[updateUserBonus] awardId:', awardId, 'userId:', userId, 'prevValue:', prevValue, 'prevUsedValue:', prevUsedValue, 'bonusToUse:', bonusToUse, 'usedValue:', usedValue, 'residuo:', residuo, 'used:', used);
  await updateDoc(userAwardRef, {
    usedValue,
    residuo,
    used,
  });
}
