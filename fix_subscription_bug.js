const admin = require('firebase-admin');

// Inizializza Firebase Admin se non già inizializzato
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: 'libera-energia-soci'
  });
}

async function fixUserSubscription() {
  const db = admin.firestore();
  const userId = 'vO2ZZMNFFEQ9l9lJCHuzFAp8xwz1';
  
  try {
    console.log('🔍 Controllo abbonamenti stagionali...');
    
    // 1. Trova abbonamenti stagionali
    const subsSnapshot = await db.collection('subscriptions').where('type', '==', 'seasonal').get();
    console.log('Abbonamenti stagionali trovati:', subsSnapshot.size);
    
    subsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      console.log('📋 ID:', doc.id, '- Nome:', data.name);
      if (data.validityStartDate && data.validityEndDate) {
        console.log('   Validità: dal', data.validityStartDate.toDate(), 'al', data.validityEndDate.toDate());
      }
    });
    
    // 2. Controlla il pagamento dell'utente
    console.log('\n🔍 Controllo pagamenti utente...');
    const paymentsSnapshot = await db.collection(`users/${userId}/payments`)
      .where('type', '==', 'subscription')
      .where('status', '==', 'completed')
      .get();
    
    console.log('Pagamenti completati trovati:', paymentsSnapshot.size);
    
    paymentsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      console.log('💳 Pagamento ID:', doc.id);
      console.log('   Description:', data.description);
      console.log('   Created:', data.createdAt?.toDate());
      console.log('   Amount:', data.amount);
      console.log('   Payment Method:', data.paymentMethod);
      console.log('   Award ID:', data.awardId);
      console.log('   Subscription ID:', data.subscriptionId);
      console.log('---');
    });
    
    // 3. Controlla documento utente attuale
    console.log('\n🔍 Controllo documento utente...');
    const userDoc = await db.doc(`users/${userId}`).get();
    if (userDoc.exists()) {
      const userData = userDoc.data();
      console.log('📋 Stato abbonamento utente:');
      console.log('   subscriptionAccessStatus:', userData.subscriptionAccessStatus);
      console.log('   activeSubscription:', userData.activeSubscription);
    }
    
  } catch (error) {
    console.error('❌ Errore:', error);
  }
}

fixUserSubscription();