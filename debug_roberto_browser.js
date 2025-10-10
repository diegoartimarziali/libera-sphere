// Script di Debug per Roberto Allegri
// Da eseguire nella console del browser (F12 -> Console) su https://libera-energia-soci.web.app
// 
// ISTRUZIONI:
// 1. Aprire https://libera-energia-soci.web.app/admin/payments/ nel browser
// 2. Fare login come admin
// 3. Aprire console del browser (F12 -> Console)
// 4. Copiare e incollare questo script e premere INVIO

async function debugRobertoDatabase() {
    console.log('🔍 DEBUG DATABASE ROBERTO ALLEGRI');
    console.log('================================');
    
    const ROBERTO_USER_ID = 'JZQhkgnXsTdvoiU5fLIgXfJqIR82';
    console.log('User ID:', ROBERTO_USER_ID);
    console.log('Data:', new Date().toLocaleString('it-IT'));
    console.log('');

    try {
        console.log('🔍 Caricando Firebase SDK...');
        
        // Carica Firebase SDK direttamente e crea una nuova connessione autenticata
        const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js');
        const { getFirestore, doc, getDoc, collection, getDocs, query, where, writeBatch } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        const { getAuth, signInWithEmailAndPassword } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
        
        // Configurazione Firebase
        const firebaseConfig = {
            apiKey: "AIzaSyAeNVPO7H0mlsM3FXjjZJqpeB5Fi6ITISw",
            authDomain: "libera-energia-soci.firebaseapp.com",
            projectId: "libera-energia-soci",
            storageBucket: "libera-energia-soci.firebasestorage.app",
            messagingSenderId: "371255545862",
            appId: "1:371255545862:web:295479b2e6d2dadebaf387",
            measurementId: "G-4NWSYM1KPW"
        };
        
        // Inizializza Firebase (con nome unico per evitare conflitti)
        const app = initializeApp(firebaseConfig, 'debug-app-' + Date.now());
        const db = getFirestore(app);
        const auth = getAuth(app);
        
        // Prova ad autenticarsi automaticamente
        console.log('� Autenticazione come admin...');
        
        // INSERISCI QUI LE CREDENZIALI ADMIN
        const ADMIN_EMAIL = prompt('Inserisci email admin:', 'diego.arti.marziali@gmail.com');
        const ADMIN_PASSWORD = prompt('Inserisci password admin:');
        
        if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
            console.log('❌ Credenziali non inserite');
            return;
        }
        
        try {
            await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
            console.log('✅ Autenticazione riuscita come:', auth.currentUser.email);
        } catch (authError) {
            console.error('❌ Errore autenticazione:', authError.message);
            console.log('💡 Assicurati di usare le credenziali corrette di superAdmin');
            return;
        }
        
        // 1. Documento utente principale
        console.log('📄 1. DOCUMENTO UTENTE PRINCIPALE:');
        console.log('----------------------------------');
        const userDocRef = doc(db, 'users', ROBERTO_USER_ID);
        const userDocSnap = await getDoc(userDocRef);
        
        if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            console.log('✅ Documento trovato:');
            console.log('- Nome:', userData.name);
            console.log('- Cognome:', userData.surname);
            console.log('- Email:', userData.email);
            console.log('- subscriptionAccessStatus:', userData.subscriptionAccessStatus);
            console.log('- subscriptionPaymentFailed:', userData.subscriptionPaymentFailed);
            console.log('- subscriptionActivationDate:', userData.subscriptionActivationDate?.toDate?.());
            console.log('- activeSubscription:', userData.activeSubscription);
            console.log('');
        } else {
            console.log('❌ Documento utente non trovato!');
            return;
        }

        // 2. Tutti i pagamenti dell'utente
        console.log('💳 2. TUTTI I PAGAMENTI:');
        console.log('------------------------');
        const paymentsRef = collection(db, 'users', ROBERTO_USER_ID, 'payments');
        const allPaymentsSnap = await getDocs(paymentsRef);
        
        console.log(`Totale pagamenti: ${allPaymentsSnap.size}`);
        console.log('');
        
        allPaymentsSnap.docs.forEach((docSnap, index) => {
            const payment = docSnap.data();
            console.log(`💳 Pagamento ${index + 1} (ID: ${docSnap.id}):`);
            console.log('   - Description:', payment.description);
            console.log('   - Amount:', payment.amount);
            console.log('   - Status:', payment.status);
            console.log('   - Type:', payment.type);
            console.log('   - Payment Method:', payment.paymentMethod);
            console.log('   - Created At:', payment.createdAt?.toDate?.());
            console.log('   - Cancelled At:', payment.cancelledAt?.toDate?.());
            console.log('   - Cancelled By:', payment.cancelledBy);
            console.log('   - Award ID:', payment.awardId);
            console.log('   - Bonus Used:', payment.bonusUsed);
            console.log('');
        });

        // 3. Pagamenti PENDING specifici
        console.log('⏳ 3. PAGAMENTI PENDING:');
        console.log('-----------------------');
        const pendingQuery = query(paymentsRef, where('status', '==', 'pending'));
        const pendingSnap = await getDocs(pendingQuery);
        
        console.log(`Pagamenti pending: ${pendingSnap.size}`);
        console.log('');
        
        pendingSnap.docs.forEach((docSnap, index) => {
            const payment = docSnap.data();
            console.log(`⏳ Pending ${index + 1} (ID: ${docSnap.id}):`);
            console.log('   - Description:', payment.description);
            console.log('   - Amount:', payment.amount);
            console.log('   - Type:', payment.type);
            console.log('   - Created At:', payment.createdAt?.toDate?.());
            console.log('   - User ID:', payment.userId);
            console.log('   ⚠️  QUESTO PAGAMENTO STA BLOCCANDO ROBERTO!');
            console.log('');
        });

        // 4. Pagamenti CANCELLED specifici
        console.log('❌ 4. PAGAMENTI CANCELLED:');
        console.log('-------------------------');
        const cancelledQuery = query(paymentsRef, where('status', '==', 'cancelled'));
        const cancelledSnap = await getDocs(cancelledQuery);
        
        console.log(`Pagamenti cancelled: ${cancelledSnap.size}`);
        console.log('');
        
        cancelledSnap.docs.forEach((docSnap, index) => {
            const payment = docSnap.data();
            console.log(`❌ Cancelled ${index + 1} (ID: ${docSnap.id}):`);
            console.log('   - Description:', payment.description);
            console.log('   - Amount:', payment.amount);
            console.log('   - Type:', payment.type);
            console.log('   - Created At:', payment.createdAt?.toDate?.());
            console.log('   - Cancelled At:', payment.cancelledAt?.toDate?.());
            console.log('   - Cancelled By:', payment.cancelledBy);
            console.log('');
        });

        // 5. DIAGNOSI E SOLUZIONE
        console.log('🩺 DIAGNOSI:');
        console.log('-----------');
        const userData = userDocSnap.data();
        
        if (userData.subscriptionAccessStatus === 'pending' && pendingSnap.size > 0) {
            console.log('❗ PROBLEMA IDENTIFICATO:');
            console.log('   - Roberto ha status "pending"');
            console.log('   - Ci sono', pendingSnap.size, 'pagamenti pending che lo bloccano');
            console.log('   - Il sistema pensa che abbia un pagamento in elaborazione');
            console.log('');
            console.log('🔧 SOLUZIONE AUTOMATICA:');
            console.log('   Eliminare i pagamenti pending stale...');
            
            // RIMUOVI I PAGAMENTI PENDING STALE
            const batch = writeBatch(db);
            
            pendingSnap.docs.forEach(docSnap => {
                console.log('🗑️ Rimuovendo pagamento pending:', docSnap.id);
                batch.delete(doc(db, 'users', ROBERTO_USER_ID, 'payments', docSnap.id));
            });
            
            // Reset stato utente
            console.log('🔄 Resettando stato utente...');
            batch.update(userDocRef, {
                subscriptionAccessStatus: 'expired',
                subscriptionPaymentFailed: false,
                activeSubscription: null
            });
            
            await batch.commit();
            
            console.log('✅ RIPARAZIONE COMPLETATA!');
            console.log('   - Pagamenti pending rimossi');
            console.log('   - Stato utente resettato a "expired"');
            console.log('   - Roberto può ora acquistare ottobre');
            console.log('');
            console.log('🚀 ISTRUZIONI PER ROBERTO:');
            console.log('   1. Ricaricare la pagina (F5)');
            console.log('   2. Andare su /dashboard/subscriptions/');
            console.log('   3. Cliccare "Acquista OTTOBRE"');
            console.log('   4. Dovrebbe funzionare ora!');
            
        } else {
            console.log('✅ Stato sembra coerente');
            console.log('   - Status:', userData.subscriptionAccessStatus);
            console.log('   - Pending payments:', pendingSnap.size);
        }

    } catch (error) {
        console.error('❌ ERRORE:', error);
        console.log('');
        console.log('💡 NOTA: Questo script deve essere eseguito:');
        console.log('   1. Su una pagina admin già autenticata');
        console.log('   2. Con accesso Firebase già caricato');
        console.log('   3. Prova su: https://libera-energia-soci.web.app/admin/payments/');
    }
}

// Esegui automaticamente il debug
debugRobertoDatabase();