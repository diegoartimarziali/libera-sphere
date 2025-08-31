import { db } from './firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { UserAward } from './userAwards';

/**
 * Rimborsa il bonus utente se il pagamento viene rifiutato.
 */
export async function refundUserBonus(userId: string, awardId: string, importo: number) {
  const awardRef = doc(db, 'users', userId, 'userAwards', awardId);
  const awardSnap = await getDoc(awardRef);
  if (!awardSnap.exists()) throw new Error('Premio non trovato');
  const award = awardSnap.data() as UserAward;
  let usedValue = Math.max(0, award.usedValue - importo);
  const residuo = Math.max(0, award.value - usedValue);
  const used = residuo === 0 ? true : false;
  await updateDoc(awardRef, { usedValue, residuo, used });
}
