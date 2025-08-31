import { db } from '@/lib/firebase';
import { collection, addDoc, Timestamp, doc, getDoc } from 'firebase/firestore';

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
  // Recupera il nome del premio dalla collezione awards
  let awardName = '';
  try {
    const awardDoc = await getDoc(doc(db, 'awards', awardId));
    if (awardDoc.exists()) {
      const data = awardDoc.data();
      awardName = data.name || '';
    }
  } catch {}
  await addDoc(collection(db, 'users', userId, 'userAwards'), {
    assignedAt: Timestamp.now(),
    awardId,
    name: awardName,
    value,
    usedValue: 0,
    residuo: value,
    used: false
  });
}
