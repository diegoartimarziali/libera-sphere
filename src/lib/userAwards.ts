
// Import compatibile sia con Next.js che con script standalone
import { db } from './firebase';
import { doc, setDoc, getDoc, updateDoc, collection, getDocs, Timestamp } from 'firebase/firestore';


export interface UserAward {
  awardId: string;
  name: string;
  value: number;
  usedValue: number;
  residuo: number;
  used: boolean;
  assignedAt: Timestamp;
}


// Creazione premio
export async function createUserAward(userId: string, awardId: string, name: string, value: number) {
  const award: UserAward = {
    awardId,
    name,
    value,
    usedValue: 0,
    residuo: value,
    used: false,
    assignedAt: Timestamp.now()
  };
  await setDoc(doc(db, 'users', userId, 'userAwards', awardId), award);
}


// Utilizzo premio
export async function useUserAward(userId: string, awardId: string, importoDaScalare: number) {
  const awardRef = doc(db, 'users', userId, 'userAwards', awardId);
  const awardSnap = await getDoc(awardRef);
  if (!awardSnap.exists()) throw new Error('Premio non trovato');
  const award = awardSnap.data() as UserAward;
  let usedValue = award.usedValue + importoDaScalare;
  if (usedValue > award.value) usedValue = award.value;
  const residuo = Math.max(0, award.value - usedValue);
  const used = residuo === 0;
  await updateDoc(awardRef, { usedValue, residuo, used });
}

// Lettura premi utente
export async function getUserAwards(userId: string): Promise<UserAward[]> {
  const awardsSnap = await getDocs(collection(db, 'users', userId, 'userAwards'));
  return awardsSnap.docs.map(docSnap => docSnap.data() as UserAward);
}
