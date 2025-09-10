import { db } from '@/lib/firebase';
import { doc, getDocs, collection, query, where, addDoc, deleteDoc } from 'firebase/firestore';

/**
 * Aggiorna il campo totalLessons nel profilo utente in base alle lezioni EFFETTIVE per palestra e disciplina.
 * Conta solo lezioni con status: 'confermata' (escluse festività e annullate).
 */
export async function updateUserTotalLessons(userId: string, gymId: string, discipline: string): Promise<void> {
  try {
    // Conta solo le lezioni confermate per palestra e disciplina
    const lessonsQuery = query(
      collection(db, 'events'),
      where('type', '==', 'lesson'),
      where('gymId', '==', gymId),
      where('discipline', '==', discipline),
      where('status', '==', 'confermata') // SOLO lezioni confermate
    );
    
    const lessonsSnap = await getDocs(lessonsQuery);
    const totalEffectiveLessons = lessonsSnap.size;
    
    console.log(`updateUserTotalLessons: ${totalEffectiveLessons} lezioni effettive per ${gymId}-${discipline}`);
    
    // Elimina documenti esistenti nella sottocollezione totalLessons
    const totalLessonsRef = collection(db, 'users', userId, 'totalLessons');
    const existingDocs = await getDocs(totalLessonsRef);
    
    for (const docSnap of existingDocs.docs) {
      await deleteDoc(docSnap.ref);
    }
    
    // Scrivi il nuovo totale (solo se > 0)
    if (totalEffectiveLessons > 0) {
      await addDoc(totalLessonsRef, { value: totalEffectiveLessons });
    }
    
  } catch (error) {
    console.error('Errore aggiornamento totalLessons:', error);
    throw error;
  }
}
