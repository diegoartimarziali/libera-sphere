// Script di migrazione awards: da awards/ a users/idUtente/awards/
// Esegue la copia e cancella i vecchi documenti

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';

// Configura qui i tuoi parametri Firebase
const firebaseConfig = {
  // ...config...
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function migrateAwards() {
  const awardsSnap = await getDocs(collection(db, 'awards'));
  let migrated = 0;
  for (const awardDoc of awardsSnap.docs) {
    const data = awardDoc.data();
    const userId = data.userId;
    if (!userId) continue;
    // Scrivi nella nuova posizione
    const newRef = doc(db, `users/${userId}/awards/${awardDoc.id}`);
    await setDoc(newRef, data);
    // Cancella il vecchio documento
    await deleteDoc(awardDoc.ref);
    migrated++;
    console.log(`Migrato award ${awardDoc.id} per utente ${userId}`);
  }
  console.log(`Totale awards migrati: ${migrated}`);
}

migrateAwards().catch(console.error);
