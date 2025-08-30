import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

/**
 * Aggiorna il bonus dell'utente nell'award specificato.
 * Incrementa usedValue, decrementa value, imposta used=true se value==0.
 */
export async function updateUserBonus(
  awardId: string,
  userId: string,
  bonusToUse: number
): Promise<void> {
  // Aggiorna il documento nella sottocollezione utente
  const userAwardRef = doc(db, 'users', userId, 'userAwards', awardId);
  const userAwardSnap = await getDoc(userAwardRef);
  if (!userAwardSnap.exists()) throw new Error('UserAward non trovato');
  const award = userAwardSnap.data() as {
    value: number;
    usedValue?: number;
    used?: boolean;
  };
  const prevValue = award.value || 0;
  const prevUsedValue = award.usedValue || 0;
  const usedValue = prevUsedValue + bonusToUse;
  const residuo = prevValue - usedValue;
  await updateDoc(userAwardRef, {
    usedValue,
    residuo,
    used: residuo <= 0 ? true : false,
  });
}
