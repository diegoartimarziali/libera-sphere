#!/usr/bin/env tsx

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, doc, writeBatch } from 'firebase/firestore';

// Configurazione Firebase - sostituisci con la tua configurazione
const firebaseConfig = {
  // Aggiungi qui la tua configurazione Firebase
  // Puoi copiarla dal file firebase.ts
};

// Inizializza Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

interface EventUpdate {
  id: string;
  updates: Record<string, any>;
}

async function migrateEvents() {
  console.log('🚀 Avvio migrazione eventi...');
  
  try {
    // Ottieni tutti gli eventi
    const eventsSnapshot = await getDocs(collection(db, 'events'));
    const updates: EventUpdate[] = [];
    
    console.log(`📊 Trovati ${eventsSnapshot.size} eventi da controllare`);
    
    eventsSnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const eventUpdates: Record<string, any> = {};
      let needsUpdate = false;
      
      // Migra type: 'course' -> 'aggiornamento'
      if (data.type === 'course') {
        eventUpdates.type = 'aggiornamento';
        needsUpdate = true;
        console.log(`📝 Evento ${docSnap.id}: type 'course' -> 'aggiornamento'`);
      }
      
      // Migra open_to: 'Tecnici' -> 'Insegnanti'
      if (data.open_to === 'Tecnici') {
        eventUpdates.open_to = 'Insegnanti';
        needsUpdate = true;
        console.log(`📝 Evento ${docSnap.id}: open_to 'Tecnici' -> 'Insegnanti'`);
      }
      
      if (needsUpdate) {
        updates.push({
          id: docSnap.id,
          updates: eventUpdates
        });
      }
    });
    
    if (updates.length === 0) {
      console.log('✅ Nessun evento da aggiornare');
      return;
    }
    
    console.log(`🔄 Aggiornamento di ${updates.length} eventi...`);
    
    // Esegui aggiornamenti in batch per efficienza
    const batchSize = 500; // Firestore limit
    const batches = [];
    
    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = writeBatch(db);
      const batchUpdates = updates.slice(i, i + batchSize);
      
      batchUpdates.forEach(({ id, updates: eventUpdates }) => {
        const eventRef = doc(db, 'events', id);
        batch.update(eventRef, eventUpdates);
      });
      
      batches.push(batch);
    }
    
    // Esegui tutti i batch
    for (let i = 0; i < batches.length; i++) {
      await batches[i].commit();
      console.log(`✅ Batch ${i + 1}/${batches.length} completato`);
    }
    
    console.log('🎉 Migrazione completata con successo!');
    console.log(`📊 Aggiornati ${updates.length} eventi`);
    
  } catch (error) {
    console.error('❌ Errore durante la migrazione:', error);
    throw error;
  }
}

// Esegui la migrazione se chiamato direttamente
if (require.main === module) {
  migrateEvents()
    .then(() => {
      console.log('🏁 Script completato');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script fallito:', error);
      process.exit(1);
    });
}

export { migrateEvents };