const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc, collection, getDocs, query, where } = require('firebase/firestore');

// Configurazione Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBFqbhbO5doihW8lP38qbfQdNiprIFEqKo",
  authDomain: "libera-energia-soci.firebaseapp.com",
  projectId: "libera-energia-soci",
  storageBucket: "libera-energia-soci.appspot.com",
  messagingSenderId: "525534479617",
  appId: "1:525534479617:web:c5a6bbc4b4a8c7c1a90f8e",
  measurementId: "G-1H4L9L9L9L"
};

// ID di Roberto
const ROBERTO_USER_ID = 'JZQhkgnXsTdvoiU5fLIgXfJqIR82';

async function debugRobertoDatabase() {
    console.log('🔍 DEBUG DATABASE ROBERTO ALLEGRI');
    console.log('================================');
    console.log('User ID:', ROBERTO_USER_ID);
    console.log('Data:', new Date().toLocaleString('it-IT'));
    console.log('');

    try {
        // Inizializza Firebase
        const app = initializeApp(firebaseConfig);
        const db = getFirestore(app);

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
        
        allPaymentsSnap.docs.forEach((doc, index) => {
            const payment = doc.data();
            console.log(`💳 Pagamento ${index + 1} (ID: ${doc.id}):`);
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
        
        pendingSnap.docs.forEach((doc, index) => {
            const payment = doc.data();
            console.log(`⏳ Pending ${index + 1} (ID: ${doc.id}):`);
            console.log('   - Description:', payment.description);
            console.log('   - Amount:', payment.amount);
            console.log('   - Type:', payment.type);
            console.log('   - Created At:', payment.createdAt?.toDate?.());
            console.log('   - User ID:', payment.userId);
            console.log('');
        });

        // 4. Pagamenti CANCELLED specifici
        console.log('❌ 4. PAGAMENTI CANCELLED:');
        console.log('-------------------------');
        const cancelledQuery = query(paymentsRef, where('status', '==', 'cancelled'));
        const cancelledSnap = await getDocs(cancelledQuery);
        
        console.log(`Pagamenti cancelled: ${cancelledSnap.size}`);
        console.log('');
        
        cancelledSnap.docs.forEach((doc, index) => {
            const payment = doc.data();
            console.log(`❌ Cancelled ${index + 1} (ID: ${doc.id}):`);
            console.log('   - Description:', payment.description);
            console.log('   - Amount:', payment.amount);
            console.log('   - Type:', payment.type);
            console.log('   - Created At:', payment.createdAt?.toDate?.());
            console.log('   - Cancelled At:', payment.cancelledAt?.toDate?.());
            console.log('   - Cancelled By:', payment.cancelledBy);
            console.log('');
        });

        // 5. Pagamenti di tipo SUBSCRIPTION
        console.log('📋 5. PAGAMENTI SUBSCRIPTION:');
        console.log('----------------------------');
        const subscriptionQuery = query(paymentsRef, where('type', '==', 'subscription'));
        const subscriptionSnap = await getDocs(subscriptionQuery);
        
        console.log(`Pagamenti subscription: ${subscriptionSnap.size}`);
        console.log('');
        
        subscriptionSnap.docs.forEach((doc, index) => {
            const payment = doc.data();
            console.log(`📋 Subscription ${index + 1} (ID: ${doc.id}):`);
            console.log('   - Description:', payment.description);
            console.log('   - Amount:', payment.amount);
            console.log('   - Status:', payment.status);
            console.log('   - Created At:', payment.createdAt?.toDate?.());
            console.log('   - Cancelled At:', payment.cancelledAt?.toDate?.());
            console.log('');
        });

        // 6. ANALISI FINALE
        console.log('🎯 6. ANALISI DELLO STATO:');
        console.log('-------------------------');
        const userData = userDocSnap.data();
        console.log('- User Status:', userData.subscriptionAccessStatus);
        console.log('- Has Active Subscription:', !!userData.activeSubscription);
        console.log('- Active Sub ID:', userData.activeSubscription?.subscriptionId);
        console.log('- Active Sub Name:', userData.activeSubscription?.name);
        console.log('- Active Sub Expires:', userData.activeSubscription?.expiresAt?.toDate?.());
        console.log('- Total Pending Payments:', pendingSnap.size);
        console.log('- Total Cancelled Payments:', cancelledSnap.size);
        console.log('');
        
        // Diagnosi
        console.log('🩺 DIAGNOSI:');
        console.log('-----------');
        if (userData.subscriptionAccessStatus === 'pending' && pendingSnap.size > 0) {
            console.log('❗ PROBLEMA: User ha status pending E ci sono pagamenti pending');
            console.log('   Soluzione: Rimuovere i pagamenti pending stale');
        } else if (userData.subscriptionAccessStatus === 'pending' && pendingSnap.size === 0) {
            console.log('❗ PROBLEMA: User ha status pending MA non ci sono pagamenti pending');
            console.log('   Soluzione: Reset status utente a expired');
        } else if (userData.subscriptionAccessStatus === 'active' && !userData.activeSubscription) {
            console.log('❗ PROBLEMA: User ha status active MA non ha activeSubscription');
            console.log('   Soluzione: Reset status utente');
        } else {
            console.log('✅ Stato sembra coerente');
        }

    } catch (error) {
        console.error('❌ ERRORE:', error);
    }
}

// Esegui il debug
debugRobertoDatabase();