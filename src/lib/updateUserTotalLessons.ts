import { db } from '@/lib/firebase';
import { doc, getDocs, collection, query, where, addDoc, deleteDoc } from 'firebase/firestore';

/**
 * Aggiorna il campo totalLessons nel profilo utente in base alle lezioni EFFETTIVE per palestra e disciplina.
 * Conta solo lezioni con status: 'confermata' (escluse festività e annullate).
 */
/**
 * Reimposta totalLessons a 0 per tutti gli utenti quando non ci sono calendari/lezioni
 */
export async function resetAllUsersTotalLessons(): Promise<void> {
  try {
    console.log('Resettando totalLessons per tutti gli utenti...');
    
    // Ottieni tutti gli utenti
    const usersQuery = query(collection(db, 'users'));
    const usersSnapshot = await getDocs(usersQuery);
    
    let resetCount = 0;
    
    for (const userDoc of usersSnapshot.docs) {
      try {
        // Elimina tutti i documenti esistenti nella sottocollezione totalLessons
        const totalLessonsRef = collection(db, 'users', userDoc.id, 'totalLessons');
        const existingDocs = await getDocs(totalLessonsRef);
        
        for (const docSnap of existingDocs.docs) {
          await deleteDoc(docSnap.ref);
        }
        
        // Imposta totalLessons a 0
        await addDoc(totalLessonsRef, { value: 0 });
        resetCount++;
        
      } catch (error) {
        console.error(`Errore reset totalLessons per utente ${userDoc.id}:`, error);
      }
    }
    
    console.log(`totalLessons resettato a 0 per ${resetCount} utenti`);
    
  } catch (error) {
    console.error('Errore nel reset totalLessons per tutti gli utenti:', error);
    throw error;
  }
}

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
    
    // Scrivi SEMPRE il nuovo totale (anche se 0)
    await addDoc(totalLessonsRef, { value: totalEffectiveLessons });
    
  } catch (error) {
    console.error('Errore aggiornamento totalLessons:', error);
    throw error;
  }
}
