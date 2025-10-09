// SCRIPT DI RIPRISTINO ABBONAMENTO STAGIONALE 
// VERSIONE CORRETTA CON I TUOI DATI REALI DA FIREBASE

async function ripristinaAbbonamentoStagionale() {
    console.log('🚨 AVVIO RIPRISTINO STATUS ABBONAMENTO STAGIONALE');
    
    try {
        const userId = 'vO2ZZMNFFEQ9l9lJCHuzFAp8xwz1';
        
        // ✅ Usa i dati REALI del tuo abbonamento da Firebase
        const restoreData = {
            subscriptionAccessStatus: 'active', // ← QUESTO è quello che manca!
            subscriptionPaymentFailed: false,
            // NON tocchiamo activeSubscription perché è già corretto in Firebase
        };
        
        console.log('📋 Ripristino solo il campo subscriptionAccessStatus:', restoreData);
        
        // Cerca di importare Firebase dalla pagina corrente
        let db, updateDoc, doc;
        
        try {
            const firebaseModule = await import('firebase/firestore');
            const dbModule = await import('/src/lib/firebase.ts');
            
            updateDoc = firebaseModule.updateDoc;
            doc = firebaseModule.doc;
            db = dbModule.db;
            
            console.log('✅ Firebase caricato con successo');
        } catch (importError) {
            console.error('❌ Impossibile importare Firebase:', importError);
            
            // Fallback: salva in localStorage e reindirizza
            localStorage.setItem('pendingSubscriptionRestore', JSON.stringify({
                userId: userId,
                data: restoreData,
                timestamp: Date.now()
            }));
            
            alert('⚠️ Dati salvati in locale. Ricarica la pagina per completare il ripristino.');
            window.location.reload();
            return;
        }
        
        // Esegui il ripristino - aggiorna solo subscriptionAccessStatus
        console.log('🔧 Impostando subscriptionAccessStatus: active...');
        const userRef = doc(db, 'users', userId);
        
        await updateDoc(userRef, restoreData);
        
        console.log('✅ RIPRISTINO STATUS COMPLETATO!');
        console.log('📋 Il tuo abbonamento stagionale è ora riconosciuto come ATTIVO');
        console.log('📅 Scadenza: 10 giugno 2026');
        console.log('💎 Tipo: Stagionale');
        
        alert('✅ Status abbonamento ripristinato! Il sistema ora riconosce il tuo abbonamento stagionale come attivo. Ricarica la pagina.');
        
        // Ricarica automaticamente dopo 2 secondi
        setTimeout(() => {
            window.location.reload();
        }, 2000);
        
        return true;
        
    } catch (error) {
        console.error('❌ ERRORE DURANTE IL RIPRISTINO:', error);
        alert('❌ Errore durante il ripristino: ' + error.message);
        throw error;
    }
}

// Verifica se c'è un ripristino pendente al caricamento della pagina
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => {
        const pendingRestore = localStorage.getItem('pendingSubscriptionRestore');
        if (pendingRestore) {
            const data = JSON.parse(pendingRestore);
            console.log('🔄 Ripristino pendente trovato:', data);
            localStorage.removeItem('pendingSubscriptionRestore');
            
            // Riprova il ripristino
            setTimeout(() => {
                ripristinaAbbonamentoStagionale();
            }, 2000);
        }
    });
}

// Esegui il ripristino
ripristinaAbbonamentoStagionale();