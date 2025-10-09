// Script per verificare lo stato degli abbonamenti di tutti gli utenti
// Esegui questo script nella console del browser su Firebase Console

// Importa Firebase se necessario
if (typeof firebase === 'undefined') {
  console.log('Importando Firebase...');
  const script = document.createElement('script');
  script.src = 'https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js';
  document.head.appendChild(script);
  
  const firestoreScript = document.createElement('script');
  firestoreScript.src = 'https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js';
  document.head.appendChild(firestoreScript);
}

async function checkAllUserSubscriptions() {
  try {
    console.log('🔍 Iniziando analisi abbonamenti di tutti gli utenti...');
    
    // Inizializza Firebase se necessario
    let db;
    try {
      const { getFirestore, collection, getDocs } = await import('firebase/firestore');
      db = getFirestore();
    } catch (error) {
      console.log('Usando Firebase v8/v9 compatibility...');
      db = firebase.firestore();
    }
    
    // Recupera tutti gli utenti
    const usersSnapshot = await db.collection('users').get();
    console.log(`📊 Trovati ${usersSnapshot.size} utenti totali`);
    
    const subscriptionReport = {
      total: 0,
      withActiveSubscription: 0,
      withSeasonalSubscription: 0,
      withMonthlySubscription: 0,
      withBonusPayment: 0,
      inconsistentStatus: 0,
      missingAccessStatus: 0,
      validSubscriptionsWithoutAccess: 0,
      problematicUsers: []
    };
    
    const currentDate = new Date();
    
    usersSnapshot.forEach((doc) => {
      const userData = doc.data();
      const userId = doc.id;
      
      subscriptionReport.total++;
      
      // Analizza lo stato dell'abbonamento
      const subscriptionAccessStatus = userData.subscriptionAccessStatus;
      const activeSubscription = userData.activeSubscription;
      
      let hasValidSubscription = false;
      let subscriptionDetails = null;
      
      if (activeSubscription) {
        // Controlla se l'abbonamento è ancora valido
        let expirationDate;
        if (activeSubscription.expirationDate) {
          expirationDate = activeSubscription.expirationDate.toDate ? 
            activeSubscription.expirationDate.toDate() : 
            new Date(activeSubscription.expirationDate);
        }
        
        hasValidSubscription = expirationDate && expirationDate > currentDate;
        
        if (hasValidSubscription) {
          subscriptionReport.withActiveSubscription++;
          
          // Determina il tipo di abbonamento
          if (activeSubscription.type === 'seasonal') {
            subscriptionReport.withSeasonalSubscription++;
          } else if (activeSubscription.type === 'monthly') {
            subscriptionReport.withMonthlySubscription++;
          }
          
          // Controlla se pagato con bonus
          if (activeSubscription.paymentMethod === 'bonus') {
            subscriptionReport.withBonusPayment++;
          }
          
          subscriptionDetails = {
            type: activeSubscription.type,
            paymentMethod: activeSubscription.paymentMethod,
            expirationDate: expirationDate,
            purchasedAt: activeSubscription.purchasedAt
          };
        }
      }
      
      // Identifica problemi
      const isProblematic = hasValidSubscription && subscriptionAccessStatus !== 'active';
      
      if (isProblematic) {
        subscriptionReport.inconsistentStatus++;
        
        if (!subscriptionAccessStatus) {
          subscriptionReport.missingAccessStatus++;
        }
        
        subscriptionReport.validSubscriptionsWithoutAccess++;
        
        subscriptionReport.problematicUsers.push({
          userId,
          email: userData.email || 'N/A',
          name: userData.name || 'N/A',
          subscriptionAccessStatus,
          hasValidSubscription,
          subscriptionDetails,
          problem: !subscriptionAccessStatus ? 'Missing subscriptionAccessStatus' : 
                  `Invalid status: ${subscriptionAccessStatus} (should be 'active')`
        });
      }
    });
    
    // Stampa il report
    console.log('\n📋 REPORT ABBONAMENTI UTENTI');
    console.log('================================');
    console.log(`👥 Utenti totali: ${subscriptionReport.total}`);
    console.log(`✅ Con abbonamento attivo: ${subscriptionReport.withActiveSubscription}`);
    console.log(`🌟 Abbonamenti stagionali: ${subscriptionReport.withSeasonalSubscription}`);
    console.log(`📅 Abbonamenti mensili: ${subscriptionReport.withMonthlySubscription}`);
    console.log(`💰 Pagati con bonus: ${subscriptionReport.withBonusPayment}`);
    console.log(`⚠️  Status inconsistenti: ${subscriptionReport.inconsistentStatus}`);
    console.log(`❌ Senza subscriptionAccessStatus: ${subscriptionReport.missingAccessStatus}`);
    console.log(`🔴 Abbonamenti validi non riconosciuti: ${subscriptionReport.validSubscriptionsWithoutAccess}`);
    
    if (subscriptionReport.problematicUsers.length > 0) {
      console.log('\n🚨 UTENTI CON PROBLEMI:');
      console.log('========================');
      subscriptionReport.problematicUsers.forEach((user, index) => {
        console.log(`\n${index + 1}. ${user.name} (${user.email})`);
        console.log(`   UserID: ${user.userId}`);
        console.log(`   Problema: ${user.problem}`);
        console.log(`   Access Status: ${user.subscriptionAccessStatus || 'MISSING'}`);
        if (user.subscriptionDetails) {
          console.log(`   Tipo abbonamento: ${user.subscriptionDetails.type}`);
          console.log(`   Metodo pagamento: ${user.subscriptionDetails.paymentMethod}`);
          console.log(`   Scadenza: ${user.subscriptionDetails.expirationDate}`);
        }
      });
      
      console.log('\n💡 SUGGERIMENTI:');
      console.log('- Gli utenti con abbonamenti validi ma senza subscriptionAccessStatus "active" non possono accedere ai servizi');
      console.log('- Questo è probabilmente causato dalla logica di auto-pulizia che rimuove il campo subscriptionAccessStatus');
      console.log('- È necessario ripristinare il campo subscriptionAccessStatus per tutti gli utenti problematici');
    } else {
      console.log('\n✅ Nessun problema rilevato negli abbonamenti utenti!');
    }
    
    // Salva il report per uso successivo
    window.subscriptionReport = subscriptionReport;
    console.log('\n📄 Report salvato in window.subscriptionReport per ulteriori analisi');
    
    return subscriptionReport;
    
  } catch (error) {
    console.error('❌ Errore durante l\'analisi degli abbonamenti:', error);
    return null;
  }
}

// Funzione per correggere tutti gli utenti problematici
async function fixAllProblematicUsers() {
  if (!window.subscriptionReport || window.subscriptionReport.problematicUsers.length === 0) {
    console.log('❌ Nessun utente problematico trovato. Esegui prima checkAllUserSubscriptions()');
    return;
  }
  
  console.log(`🔧 Iniziando correzione di ${window.subscriptionReport.problematicUsers.length} utenti...`);
  
  let db;
  try {
    const { getFirestore, doc, updateDoc } = await import('firebase/firestore');
    db = getFirestore();
  } catch (error) {
    db = firebase.firestore();
  }
  
  let fixed = 0;
  let errors = 0;
  
  for (const user of window.subscriptionReport.problematicUsers) {
    try {
      if (db.collection) {
        // Firebase v8
        await db.collection('users').doc(user.userId).update({
          subscriptionAccessStatus: 'active'
        });
      } else {
        // Firebase v9+
        const userRef = doc(db, 'users', user.userId);
        await updateDoc(userRef, {
          subscriptionAccessStatus: 'active'
        });
      }
      
      console.log(`✅ Corretto utente: ${user.name} (${user.userId})`);
      fixed++;
    } catch (error) {
      console.error(`❌ Errore correggendo utente ${user.name}:`, error);
      errors++;
    }
  }
  
  console.log(`\n🎉 Correzione completata: ${fixed} utenti corretti, ${errors} errori`);
}

// Esegui automaticamente l'analisi
console.log('🚀 Avviando analisi abbonamenti...');
checkAllUserSubscriptions();

// Rendi disponibili le funzioni globalmente
window.checkAllUserSubscriptions = checkAllUserSubscriptions;
window.fixAllProblematicUsers = fixAllProblematicUsers;

console.log('\n📋 COMANDI DISPONIBILI:');
console.log('- checkAllUserSubscriptions(): Rianalizza tutti gli abbonamenti');
console.log('- fixAllProblematicUsers(): Correggi tutti gli utenti problematici');
console.log('- window.subscriptionReport: Visualizza l\'ultimo report generato');