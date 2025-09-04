import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

/**
 * Rimborsa un bonus quando un pagamento fallisce
 */
export async function refundBonus(
  userId: string, 
  awardIds: string | string[], 
  bonusAmount: number
): Promise<void> {
  try {
    const ids = Array.isArray(awardIds) ? awardIds : [awardIds];
    let remainingRefund = bonusAmount;
    
    // Rimborsa bonus in ordine inverso (LIFO - Last In, First Out)
    for (const awardId of ids.reverse()) {
      if (remainingRefund <= 0) break;
      
      const bonusRef = doc(db, 'users', userId, 'userAwards', awardId);
      const bonusSnap = await getDoc(bonusRef);
      
      if (bonusSnap.exists()) {
        const currentData = bonusSnap.data();
        const valoreIniziale = currentData.value || 0;
        const usedValueCorrente = currentData.usedValue || 0;
        
        // Calcola quanto rimborso applicare a questo bonus
        const refundAmount = Math.min(remainingRefund, usedValueCorrente);
        const nuovoUsedValue = Math.max(0, usedValueCorrente - refundAmount);
        const nuovoResiduo = valoreIniziale - nuovoUsedValue;
        
        await updateDoc(bonusRef, {
          usedValue: nuovoUsedValue,
          residuo: nuovoResiduo,
          used: nuovoResiduo === 0
        });
        
        remainingRefund -= refundAmount;
        
        console.log(`[refundBonus] Riaccreditato ${refundAmount}€ al bonus ${awardId}. Nuovo residuo: ${nuovoResiduo}€`);
      }
    }
    
    if (remainingRefund > 0) {
      console.warn(`[refundBonus] Non è stato possibile rimborsare completamente. Residuo: ${remainingRefund}€`);
    }
    
  } catch (error) {
    console.error('[refundBonus] Errore durante il rimborso:', error);
    throw error;
  }
}
