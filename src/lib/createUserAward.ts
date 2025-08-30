import { db } from '@/lib/firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';

/**
 * Crea un documento bonus per l'utente in userAwards.
 * Da usare quando l'admin assegna manualmente un bonus.
 */
export async function createUserAward({
  userId,
  awardId,
  value
}: {
  userId: string;
  awardId: string;
  value: number;
}): Promise<void> {
  await addDoc(collection(db, 'userAwards'), {
    assignedAt: Timestamp.now(),
    awardId,
    value,
    usedValue: 0,
    userId,
    used: false
  });
}
