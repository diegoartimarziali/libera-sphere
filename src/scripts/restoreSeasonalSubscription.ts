/**
 * SCRIPT DI RIPRISTINO ABBONAMENTO STAGIONALE
 * 
 * Ripristina l'abbonamento stagionale per l'utente vO2ZZMNFFEQ9l9lJCHuzFAp8xwz1
 * che ha un pagamento completato con bonus ma l'abbonamento è stato cancellato dal bug.
 */

import { db } from '../lib/firebase';
import { doc, updateDoc, getDocs, collection, query, where } from 'firebase/firestore';

const USER_ID = 'vO2ZZMNFFEQ9l9lJCHuzFAp8xwz1';

/**
 * Trova l'abbonamento stagionale corretto basandosi sulla data del pagamento
 */
async function findSeasonalSubscription(): Promise<any> {
    console.log('🔍 Cercando abbonamento stagionale per settembre 2025...');
    
    const subsSnapshot = await getDocs(
        query(collection(db, 'subscriptions'), where('type', '==', 'seasonal'))
    );
    
    let bestMatch: any = null;
    const paymentDate = new Date(2025, 8, 9); // 9 settembre 2025
    
    subsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const validityStart = data.validityStartDate?.toDate();
        const validityEnd = data.validityEndDate?.toDate();
        
        console.log(`📋 Abbonamento: ${data.name}`);
        console.log(`   ID: ${doc.id}`);
        console.log(`   Validità: ${validityStart} - ${validityEnd}`);
        
        // Controlla se il pagamento del 9 settembre rientra nella validità
        if (validityStart && validityEnd && 
            paymentDate >= validityStart && paymentDate <= validityEnd) {
            bestMatch = { id: doc.id, ...data };
            console.log(`✅ MATCH: Questo abbonamento copre la data del pagamento`);
        }
    });
    
    return bestMatch;
}

/**
 * Verifica il pagamento esistente
 */
async function verifyPayment(): Promise<any> {
    console.log('🔍 Verificando pagamento esistente...');
    
    const paymentsSnapshot = await getDocs(
        query(
            collection(db, `users/${USER_ID}/payments`),
            where('type', '==', 'subscription'),
            where('status', '==', 'completed')
        )
    );
    
    let seasonalPayment: any = null;
    
    paymentsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        console.log(`💳 Pagamento ${doc.id}:`);
        console.log(`   Description: ${data.description}`);
        console.log(`   Amount: ${data.amount}`);
        console.log(`   Payment Method: ${data.paymentMethod}`);
        console.log(`   Created: ${data.createdAt?.toDate()}`);
        console.log(`   Award ID: ${data.awardId}`);
        
        if (data.description && data.description.includes('Stagionale') && 
            data.paymentMethod === 'bonus' && data.awardId) {
            seasonalPayment = { id: doc.id, ...data };
            console.log(`✅ FOUND: Pagamento stagionale con bonus`);
        }
    });
    
    return seasonalPayment;
}

/**
 * Ripristina l'abbonamento dell'utente
 */
async function restoreSubscription() {
    try {
        console.log('🚨 AVVIO RIPRISTINO ABBONAMENTO STAGIONALE');
        console.log(`👤 Utente: ${USER_ID}`);
        
        // 1. Trova l'abbonamento stagionale corretto
        const seasonalSub = await findSeasonalSubscription();
        if (!seasonalSub) {
            throw new Error('Nessun abbonamento stagionale trovato per settembre 2025');
        }
        
        // 2. Verifica il pagamento
        const payment = await verifyPayment();
        if (!payment) {
            throw new Error('Pagamento stagionale con bonus non trovato');
        }
        
        // 3. Ripristina i dati utente
        console.log('🔧 Ripristinando dati utente...');
        const userRef = doc(db, 'users', USER_ID);
        
        const restoreData = {
            subscriptionAccessStatus: 'active',
            subscriptionPaymentFailed: false,
            activeSubscription: {
                subscriptionId: seasonalSub.id,
                name: seasonalSub.name,
                type: 'seasonal',
                purchasedAt: payment.createdAt,
                expiresAt: seasonalSub.validityEndDate
            }
        };
        
        await updateDoc(userRef, restoreData);
        
        console.log('✅ RIPRISTINO COMPLETATO!');
        console.log('📋 Dati ripristinati:');
        console.log(`   - Subscription ID: ${seasonalSub.id}`);
        console.log(`   - Name: ${seasonalSub.name}`);
        console.log(`   - Type: seasonal`);
        console.log(`   - Purchased At: ${payment.createdAt?.toDate()}`);
        console.log(`   - Expires At: ${seasonalSub.validityEndDate?.toDate()}`);
        console.log(`   - Status: active`);
        
        return true;
        
    } catch (error) {
        console.error('❌ ERRORE DURANTE IL RIPRISTINO:', error);
        throw error;
    }
}

/**
 * Esegui il ripristino
 */
export async function restoreSeasonalSubscription(): Promise<boolean> {
    return await restoreSubscription();
}

// Se eseguito direttamente
if (require.main === module) {
    restoreSubscription()
        .then(() => {
            console.log('🎉 Script completato con successo');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Script fallito:', error);
            process.exit(1);
        });
}