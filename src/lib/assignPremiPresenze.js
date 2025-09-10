import { db } from './firebase';
import { collection, getDocs, addDoc, Timestamp } from 'firebase/firestore';

/**
 * Assegna automaticamente il "Premio Presenze" all'utente quando acquista 
 * un abbonamento mensile o stagionale (indipendentemente dal pagamento)
 * @param {string} userId - ID dell'utente
 * @param {'monthly'|'seasonal'} subscriptionType - Tipo di abbonamento
 */
export async function assignPremiPresenze(userId, subscriptionType) {
    try {
        console.log('[assignPremiPresenze] Inizio assegnazione per userId:', userId, 'tipo:', subscriptionType);
        
        // Prima controlla se l'utente ha già ricevuto il Premio Presenze
        const userAwardsSnap = await getDocs(collection(db, "users", userId, "userAwards"));
        const hasPremiPresenze = userAwardsSnap.docs.some(doc => {
            const data = doc.data();
            return data.name === "Premio Presenze";
        });
        
        if (hasPremiPresenze) {
            console.log('[assignPremiPresenze] Premio Presenze già assegnato all\'utente');
            return { 
                success: false, 
                message: "Premio Presenze già assegnato",
                alreadyAssigned: true
            };
        }
        
        // Cerca il premio "Premio Presenze" nella collezione awards
        const awardsSnap = await getDocs(collection(db, "awards"));
        const presenzeAward = awardsSnap.docs.find(doc => {
            const data = doc.data();
            return data.name === "Premio Presenze";
        });
        
        console.log('[assignPremiPresenze] Premio trovato:', !!presenzeAward);
        
        if (presenzeAward) {
            // Assegna il premio all'utente
            const awardData = {
                awardId: presenzeAward.id,
                name: "Premio Presenze",
                value: presenzeAward.data().value,
                residuo: presenzeAward.data().value,
                usedValue: 0,
                used: false,
                assignedAt: Timestamp.now(),
                subscriptionType: subscriptionType // Aggiunto per tracciabilità
            };
            
            await addDoc(collection(db, "users", userId, "userAwards"), awardData);
            console.log('[assignPremiPresenze] Premio assegnato con successo!');
            
            return { 
                success: true, 
                message: "Premio assegnato con successo",
                premioValue: presenzeAward.data().value,
                subscriptionType: subscriptionType
            };
        } else {
            console.log('[assignPremiPresenze] Premio Presenze NON trovato in awards!');
            
            return { success: false, message: "Premio Presenze non trovato" };
        }
    } catch (error) {
        console.error('[assignPremiPresenze] Errore durante assegnazione:', error);
        return { success: false, message: error.message };
    }
}