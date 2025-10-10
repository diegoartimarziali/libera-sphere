// Script di Debug SPECIFICO per Query Firebase
// Da eseguire nella console del browser per trovare il pagamento pending fantasma

async function debugRobertoQuery() {
    console.log('🔍 DEBUG QUERY FIREBASE PER ROBERTO');
    console.log('===================================');
    
    const ROBERTO_USER_ID = 'JZQhkgnXsTdvoiU5fLIgXfJqIR82';
    
    try {
        // Carica Firebase SDK
        const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js');
        const { getFirestore, doc, collection, getDocs, query, where } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
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
        
        const app = initializeApp(firebaseConfig, 'debug-query-' + Date.now());
        const db = getFirestore(app);
        const auth = getAuth(app);
        
        const ADMIN_EMAIL = prompt('Email admin:', 'diego.arti.marziali@gmail.com');
        const ADMIN_PASSWORD = prompt('Password admin:');
        
        await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
        console.log('✅ Autenticato come:', auth.currentUser.email);
        
        // 1. TUTTI I PAGAMENTI (senza filtri)
        console.log('📄 1. TUTTI I PAGAMENTI DI ROBERTO:');
        console.log('----------------------------------');
        const allPayments = await getDocs(collection(db, 'users', ROBERTO_USER_ID, 'payments'));
        console.log('Totale pagamenti:', allPayments.size);
        
        allPayments.docs.forEach((doc, index) => {
            const data = doc.data();
            console.log(`💳 ${index + 1}. ${doc.id}:`, {
                description: data.description,
                status: data.status,
                type: data.type,
                amount: data.amount,
                createdAt: data.createdAt?.toDate()?.toISOString()
            });
        });
        
        // 2. QUERY ESATTA DELL'APP (subscription + pending)
        console.log('\n🔍 2. QUERY ESATTA DELL\'APP:');
        console.log('where("type", "==", "subscription")');
        console.log('where("status", "==", "pending")');
        console.log('----------------------------------');
        
        const subscriptionPending = await getDocs(
            query(
                collection(db, 'users', ROBERTO_USER_ID, 'payments'),
                where("type", "==", "subscription"),
                where("status", "==", "pending")
            )
        );
        
        console.log('Risultati query:', subscriptionPending.size);
        subscriptionPending.docs.forEach((doc, index) => {
            const data = doc.data();
            console.log(`⏳ PENDING ${index + 1}. ${doc.id}:`, {
                description: data.description,
                status: data.status,
                type: data.type,
                amount: data.amount,
                createdAt: data.createdAt?.toDate()?.toISOString(),
                FULL_DATA: data
            });
        });
        
        // 3. SOLO STATUS PENDING (qualunque tipo)
        console.log('\n🔍 3. TUTTI I PENDING (qualunque tipo):');
        console.log('where("status", "==", "pending")');
        console.log('----------------------------------');
        
        const allPending = await getDocs(
            query(
                collection(db, 'users', ROBERTO_USER_ID, 'payments'),
                where("status", "==", "pending")
            )
        );
        
        console.log('Tutti i pending:', allPending.size);
        allPending.docs.forEach((doc, index) => {
            const data = doc.data();
            console.log(`⏳ ANY PENDING ${index + 1}. ${doc.id}:`, {
                description: data.description,
                status: data.status,
                type: data.type,
                amount: data.amount,
                createdAt: data.createdAt?.toDate()?.toISOString()
            });
        });
        
        // 4. SOLO TYPE SUBSCRIPTION (qualunque status)
        console.log('\n🔍 4. TUTTI I SUBSCRIPTION (qualunque status):');
        console.log('where("type", "==", "subscription")');
        console.log('----------------------------------');
        
        const allSubscriptions = await getDocs(
            query(
                collection(db, 'users', ROBERTO_USER_ID, 'payments'),
                where("type", "==", "subscription")
            )
        );
        
        console.log('Tutti i subscription:', allSubscriptions.size);
        allSubscriptions.docs.forEach((doc, index) => {
            const data = doc.data();
            console.log(`📋 SUBSCRIPTION ${index + 1}. ${doc.id}:`, {
                description: data.description,
                status: data.status,
                type: data.type,
                amount: data.amount,
                createdAt: data.createdAt?.toDate()?.toISOString()
            });
        });
        
        console.log('\n🎯 CONCLUSIONI:');
        console.log('==============');
        if (subscriptionPending.size === 0) {
            console.log('✅ NESSUN pagamento subscription+pending trovato - la query è corretta');
            console.log('❌ BUG: L\'app dice di trovare pending ma la query restituisce 0');
            console.log('💡 Possibile cache React o bug nella logica dell\'app');
        } else {
            console.log('❌ TROVATI', subscriptionPending.size, 'pagamenti subscription+pending');
            console.log('🐛 Questo spiega perché l\'app è confusa');
        }
        
    } catch (error) {
        console.error('❌ ERRORE:', error);
    }
}

// Esegui automaticamente
debugRobertoQuery();