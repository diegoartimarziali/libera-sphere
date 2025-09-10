import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, updateDoc, doc } from 'firebase/firestore';
import { calculatePremiPresenzeValue } from './premiPresenzeCalculator';

/**
 * Aggiorna il valore del Premio Presenze in Firebase basato sulla percentuale di presenze
 */
export async function updatePremiPresenzeValue(userId: string, percentage: number): Promise<void> {
  try {
    // Calcola il nuovo valore basato sulla percentuale
    const { value: newValue } = calculatePremiPresenzeValue(percentage);
    
    // Trova il Premio Presenze dell'utente
    const userAwardsRef = collection(db, 'users', userId, 'userAwards');
    const q = query(userAwardsRef, where('name', '==', 'Premio Presenze'));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const premiPresenzeDoc = querySnapshot.docs[0];
      const currentData = premiPresenzeDoc.data();
      const currentValue = currentData.value || 0;
      const currentUsedValue = currentData.usedValue || 0;
      
      // Calcola il nuovo residuo: nuovo valore - quello già utilizzato
      const newResiduo = Math.max(0, newValue - currentUsedValue);
      
      // Aggiorna sempre residuo e valore per mantenere sincronizzazione
      await updateDoc(doc(db, 'users', userId, 'userAwards', premiPresenzeDoc.id), {
        value: newValue,
        residuo: newResiduo,
        updatedAt: new Date(),
        percentage: percentage // Salva anche la percentuale per riferimento
      });
        
      console.log(`Premio Presenze aggiornato per utente ${userId}: ${currentValue}€ → ${newValue}€ (${percentage}% presenze)`);
    } else {
      console.log(`Premio Presenze non trovato per utente ${userId}`);
    }
    
  } catch (error) {
    console.error('Errore aggiornamento Premio Presenze:', error);
    throw error;
  }
}