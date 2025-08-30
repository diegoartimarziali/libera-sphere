// Script di migrazione pagamenti: da payments/ a users/idUtente/payments/
// Esegue la copia e cancella i vecchi documenti

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';

// Configura qui i tuoi parametri Firebase
const firebaseConfig = {
  // ...config...
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function migratePayments() {
  const paymentsSnap = await getDocs(collection(db, 'payments'));
  let migrated = 0;
  for (const paymentDoc of paymentsSnap.docs) {
    const data = paymentDoc.data();
    const userId = data.userId;
    if (!userId) continue;
    // Scrivi nella nuova posizione
    const newRef = doc(db, `users/${userId}/payments/${paymentDoc.id}`);
    await setDoc(newRef, data);
    // Cancella il vecchio documento
    await deleteDoc(paymentDoc.ref);
    migrated++;
    console.log(`Migrato pagamento ${paymentDoc.id} per utente ${userId}`);
  }
  console.log(`Totale pagamenti migrati: ${migrated}`);
}

migratePayments().catch(console.error);
