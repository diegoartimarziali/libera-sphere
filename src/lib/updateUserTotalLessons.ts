import { db } from '@/lib/firebase';
import { doc, updateDoc, getDocs, collection, where } from 'firebase/firestore';

/**
 * Aggiorna il campo totalLessons nel profilo utente in base alle lezioni disponibili per palestra e disciplina.
 * Da chiamare quando cambia il calendario o la disciplina/palestra utente.
 */
export async function updateUserTotalLessons(userId: string, gymId: string, discipline: string): Promise<void> {
  // Conta tutte le lezioni per palestra e disciplina
  const lessonsSnap = await getDocs(
    collection(db, 'events')
  );
  let totalLessons = 0;
  lessonsSnap.forEach(docSnap => {
    const data = docSnap.data();
    if (data.type === 'lesson' && data.gymId === gymId && data.discipline === discipline) {
      totalLessons++;
    }
  });
  // Scrivi il totale in una sottocollezione dedicata
  const totalLessonsRef = doc(collection(db, 'users', userId, 'totalLessons'));
  const { setDoc } = await import('firebase/firestore');
  await setDoc(totalLessonsRef, { value: totalLessons, gymId, discipline, updatedAt: new Date() });
}
