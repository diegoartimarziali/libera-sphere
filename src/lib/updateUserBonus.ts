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
  const awardRef = doc(db, 'awards', awardId);
  const awardSnap = await getDoc(awardRef);
  if (!awardSnap.exists()) throw new Error('Award non trovato');
  const award = awardSnap.data() as {
    value: number;
    usedValue?: number;
    used?: boolean;
  };
  const prevValue = award.value || 0;
  const prevUsedValue = award.usedValue || 0;
  const usedValue = prevUsedValue + bonusToUse;
  const value = prevValue - bonusToUse;
  await updateDoc(awardRef, {
    usedValue,
    value,
    used: value <= 0 ? true : false,
  });
}
