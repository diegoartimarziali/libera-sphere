/**
 * SCRIPT DI EMERGENZA: Sblocco utenti con pending fantasma
 * 
 * Questo script identifica e risolve utenti bloccati con:
 * - subscriptionAccessStatus: 'pending' 
 * - Ma NESSUN pagamento pending nel database
 */

import { db } from '../lib/firebase';
import { collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';

interface UserWithPendingIssue {
    uid: string;
    name: string;
    surname: string;
    email: string;
    subscriptionAccessStatus: string;
    hasPendingPayments: boolean;
}

/**
 * Identifica utenti con pending fantasma
 */
async function findUsersWithPendingIssues(): Promise<UserWithPendingIssue[]> {
    console.log('🔍 Scanning for users with pending status...');
    
    const usersRef = collection(db, 'users');
    const pendingUsersQuery = query(usersRef, where('subscriptionAccessStatus', '==', 'pending'));
    const pendingUsersSnap = await getDocs(pendingUsersQuery);
    
    const problematicUsers: UserWithPendingIssue[] = [];
    
    for (const userDoc of pendingUsersSnap.docs) {
        const userData = userDoc.data();
        const userId = userDoc.id;
        
        // Controlla se ha pagamenti pending reali
        const paymentsQuery = query(
            collection(db, 'users', userId, 'payments'),
            where('type', '==', 'subscription'),
            where('status', '==', 'pending')
        );
        const paymentsSnap = await getDocs(paymentsQuery);
        
        const userInfo: UserWithPendingIssue = {
            uid: userId,
            name: userData.name || 'N/A',
            surname: userData.surname || 'N/A', 
            email: userData.email || 'N/A',
            subscriptionAccessStatus: userData.subscriptionAccessStatus,
            hasPendingPayments: !paymentsSnap.empty
        };
        
        // Se pending ma nessun pagamento reale = problema
        if (paymentsSnap.empty) {
            problematicUsers.push(userInfo);
        }
        
        console.log(`👤 ${userInfo.name} ${userInfo.surname} - Pending payments: ${!paymentsSnap.empty ? paymentsSnap.size : 0}`);
    }
    
    return problematicUsers;
}

/**
 * Sblocca utenti problematici
 */
async function unlockProblematicUsers(users: UserWithPendingIssue[]): Promise<void> {
    console.log(`🔧 Unlocking ${users.length} users with phantom pending status...`);
    
    for (const user of users) {
        try {
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, {
                subscriptionAccessStatus: 'expired',
                subscriptionPaymentFailed: false
            });
            
            console.log(`✅ UNLOCKED: ${user.name} ${user.surname} (${user.email})`);
        } catch (error) {
            console.error(`❌ FAILED to unlock ${user.email}:`, error);
        }
    }
}

/**
 * Funzione principale di sblocco
 */
export async function emergencyUnlockUsers(): Promise<void> {
    try {
        console.log('🚨 EMERGENCY UNLOCK STARTED');
        
        // 1. Trova utenti problematici
        const problematicUsers = await findUsersWithPendingIssues();
        
        if (problematicUsers.length === 0) {
            console.log('✅ No users with phantom pending status found!');
            return;
        }
        
        // 2. Mostra riassunto
        console.log('\n📊 SUMMARY:');
        console.log(`Found ${problematicUsers.length} users with phantom pending status:`);
        problematicUsers.forEach(user => {
            console.log(`  - ${user.name} ${user.surname} (${user.email})`);
        });
        
        // 3. Sblocca utenti
        await unlockProblematicUsers(problematicUsers);
        
        console.log('\n🎉 EMERGENCY UNLOCK COMPLETED!');
        
    } catch (error) {
        console.error('💥 EMERGENCY UNLOCK FAILED:', error);
        throw error;
    }
}

/**
 * Esegui lo script se chiamato direttamente
 */
if (require.main === module) {
    emergencyUnlockUsers()
        .then(() => {
            console.log('Script completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Script failed:', error);
            process.exit(1);
        });
}