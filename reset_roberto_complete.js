// SCRIPT DI RESET COMPLETO PER ROBERTO
// Da eseguire nella console del browser per resettare TUTTO

async function resetRobertoCompletely() {
    console.log('🔥 RESET COMPLETO DI ROBERTO ALLEGRI');
    console.log('===================================');
    
    const ROBERTO_USER_ID = 'JZQhkgnXsTdvoiU5fLIgXfJqIR82';
    
    try {
        // Carica Firebase SDK
        const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js');
        const { getFirestore, doc, updateDoc, collection, getDocs, writeBatch } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        const { getAuth, signInWithEmailAndPassword } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
        
        // Configurazione e autenticazione
        const firebaseConfig = {
            apiKey: "AIzaSyAeNVPO7H0mlsM3FXjjZJqpeB5Fi6ITISw",
            authDomain: "libera-energia-soci.firebaseapp.com",
            projectId: "libera-energia-soci",
            storageBucket: "libera-energia-soci.firebasestorage.app",
            messagingSenderId: "371255545862",
            appId: "1:371255545862:web:295479b2e6d2dadebaf387",
            measurementId: "G-4NWSYM1KPW"
        };
        
        const app = initializeApp(firebaseConfig, 'reset-roberto-' + Date.now());
        const db = getFirestore(app);
        const auth = getAuth(app);
        
        const ADMIN_EMAIL = prompt('Email admin:', 'diego.arti.marziali@gmail.com');
        const ADMIN_PASSWORD = prompt('Password admin:');
        
        await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
        console.log('✅ Autenticato come:', auth.currentUser.email);
        
        // 1. RESET COMPLETO STATO UTENTE
        console.log('🔄 1. RESETTANDO STATO UTENTE...');
        const userRef = doc(db, 'users', ROBERTO_USER_ID);
        await updateDoc(userRef, {
            subscriptionAccessStatus: 'expired',
            subscriptionPaymentFailed: false,
            activeSubscription: null,
            subscriptionActivationDate: null
        });
        console.log('✅ Stato utente resettato');
        
        // 2. RIMUOVI TUTTI I PAGAMENTI PENDING E STALE
        console.log('🗑️ 2. RIMUOVENDO TUTTI I PAGAMENTI SOSPETTI...');
        const paymentsRef = collection(db, 'users', ROBERTO_USER_ID, 'payments');
        const allPayments = await getDocs(paymentsRef);
        
        const batch = writeBatch(db);
        let removedCount = 0;
        
        allPayments.docs.forEach(docSnap => {
            const payment = docSnap.data();
            
            // Rimuovi pagamenti pending o con problemi
            if (payment.status === 'pending' || 
                (payment.type === 'subscription' && payment.description?.includes('OTTOBRE') && payment.status === 'cancelled')) {
                console.log(`🗑️ Rimuovendo pagamento: ${payment.description} (${payment.status})`);
                batch.delete(docSnap.ref);
                removedCount++;
            }
        });
        
        if (removedCount > 0) {
            await batch.commit();
            console.log(`✅ Rimossi ${removedCount} pagamenti problematici`);
        } else {
            console.log('ℹ️ Nessun pagamento da rimuovere');
        }
        
        // 3. VERIFICA STATO FINALE
        console.log('🔍 3. VERIFICA STATO FINALE...');
        const finalUserDoc = await getDoc(userRef);
        const finalUserData = finalUserDoc.data();
        
        console.log('📊 STATO FINALE:');
        console.log('- subscriptionAccessStatus:', finalUserData.subscriptionAccessStatus);
        console.log('- activeSubscription:', finalUserData.activeSubscription);
        console.log('- subscriptionPaymentFailed:', finalUserData.subscriptionPaymentFailed);
        
        const finalPayments = await getDocs(paymentsRef);
        console.log('- Pagamenti totali rimasti:', finalPayments.size);
        
        finalPayments.docs.forEach((docSnap, index) => {
            const payment = docSnap.data();
            console.log(`  ${index + 1}. ${payment.description}: ${payment.status}`);
        });
        
        console.log('\n🎯 RESET COMPLETATO!');
        console.log('================');
        console.log('✅ Roberto dovrebbe ora essere completamente pulito');
        console.log('✅ Ricarica la pagina e prova ad andare su /dashboard/subscriptions/monthly/');
        console.log('✅ Dovrebbe mostrare OTTOBRE senza interferenze');
        
    } catch (error) {
        console.error('❌ ERRORE:', error);
    }
}

// Esegui automaticamente
resetRobertoCompletely();