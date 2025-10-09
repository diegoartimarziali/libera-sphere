/**
 * SISTEMA PREMI UNIFICATO - LIBERA SPHERE
 * ======================================
 * 
 * Gestione centralizzata di tutti i premi per eliminare inconsistenze
 * tra stage, abbonamenti mensili e stagionali.
 */

import { db } from '@/lib/firebase';
import { collection, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';

// ============================================================================
// TIPI E INTERFACCE
// ============================================================================

export interface UserAward {
  id: string;
  awardId?: string;
  name: string;
  value: number;      // Valore originale
  residuo: number;    // Valore ancora disponibile
  usedValue: number;  // Valore già utilizzato
  used: boolean;      // Se completamente esaurito
  assignedAt?: any;
}

export interface SpendableAward {
  id: string;
  name: string;
  availableAmount: number;  // Quanto può essere speso
}

export interface BonusCalculation {
  spendableAwards: SpendableAward[];
  totalAvailable: number;
  bonusToUse: number;
  finalPrice: number;
  awardUsage: Array<{ id: string, amount: number }>;
}

// ============================================================================
// CONFIGURAZIONE SISTEMA
// ============================================================================

/**
 * Lista dei premi NON spendibili (solo visualizzabili/accumulabili)
 */
const NON_SPENDABLE_AWARDS = [
  'Premio Presenze'
];

/**
 * Determina se un premio può essere speso per acquisti
 */
export function isAwardSpendable(awardName: string): boolean {
  return !NON_SPENDABLE_AWARDS.includes(awardName);
}

// ============================================================================
// CARICAMENTO PREMI UTENTE
// ============================================================================

/**
 * Carica e normalizza tutti i premi di un utente da Firebase
 * Recupera automaticamente i nomi mancanti dalla collection awards
 */
export async function loadUserAwards(userId: string): Promise<UserAward[]> {
  console.log(`🏆 [PremiumSystem] Caricamento premi per utente: ${userId}`);
  
  const userAwardsSnap = await getDocs(collection(db, 'users', userId, 'userAwards'));
  
  const awards = await Promise.all(userAwardsSnap.docs.map(async (docSnap) => {
    const data = docSnap.data();
    let name = data.name;
    let value = data.value || 0;
    
    console.log(`🔍 [PremiumSystem] Processing award ${docSnap.id}:`, {
      rawData: data,
      name: name,
      value: value,
      residuo: data.residuo,
      used: data.used
    });
    
    // Se manca il nome o valore, recupera dal documento awards
    if (!name || !value) {
      if (data.awardId) {
        try {
          const awardDoc = await getDoc(doc(db, 'awards', data.awardId));
          if (awardDoc.exists()) {
            const awardData = awardDoc.data();
            name = name || awardData.name;
            value = value || awardData.value || 0;
            console.log(`📚 [PremiumSystem] Retrieved from awards collection:`, {
              awardId: data.awardId,
              name: name,
              value: value
            });
          }
        } catch (error) {
          console.warn(`Errore recupero award ${data.awardId}:`, error);
        }
      }
    }
    
    // Calcola residuo se mancante
    let residuo = data.residuo;
    if (typeof residuo !== 'number') {
      const usedValue = data.usedValue || 0;
      residuo = Math.max(0, value - usedValue);
      console.log(`🧮 [PremiumSystem] Calculated residuo: ${value} - ${usedValue} = ${residuo}`);
    }
    
    const award: UserAward = {
      id: docSnap.id,
      awardId: data.awardId,
      name: name || 'Premio Sconosciuto',
      value: value,
      residuo: residuo,
      usedValue: data.usedValue || 0,
      used: data.used || residuo === 0,
      assignedAt: data.assignedAt
    };
    
    console.log(`🎖️ [PremiumSystem] Final award: "${award.name}" - Residuo: ${award.residuo}€ - Used: ${award.used} - Spendibile: ${isAwardSpendable(award.name)}`);
    
    return award;
  }));
  
  console.log(`🏆 [PremiumSystem] Caricati ${awards.length} premi totali`);
  return awards;
}

// ============================================================================
// FILTRO PREMI SPENDIBILI
// ============================================================================

/**
 * Filtra solo i premi che possono essere utilizzati per acquisti
 */
export function getSpendableAwards(userAwards: UserAward[]): SpendableAward[] {
  const spendable = userAwards
    .filter(award => 
      !award.used && 
      award.residuo > 0 && 
      isAwardSpendable(award.name)
    )
    .map(award => ({
      id: award.id,
      name: award.name,
      availableAmount: award.residuo
    }));
    
  console.log(`💰 [PremiumSystem] Premi spendibili: ${spendable.length}/${userAwards.length}`);
  spendable.forEach(award => {
    console.log(`  💳 ${award.name}: ${award.availableAmount}€`);
  });
  
  return spendable;
}

// ============================================================================
// CALCOLO BONUS PER ACQUISTO
// ============================================================================

/**
 * Calcola quanto bonus può essere utilizzato per un acquisto specifico
 * Restituisce la distribuzione ottimale dei premi da utilizzare
 */
export function calculateBonusForPurchase(
  userAwards: UserAward[], 
  purchasePrice: number
): BonusCalculation {
  console.log(`🧮 [PremiumSystem] Calcolo bonus per acquisto di ${purchasePrice}€`);
  
  const spendableAwards = getSpendableAwards(userAwards);
  const totalAvailable = spendableAwards.reduce((sum, award) => sum + award.availableAmount, 0);
  
  // Calcola quanto bonus utilizzare (non può superare il prezzo)
  const bonusToUse = Math.min(totalAvailable, purchasePrice);
  const finalPrice = Math.max(0, purchasePrice - bonusToUse);
  
  // Distribuzione ottimale: usa i premi in ordine fino a coprire l'importo
  const awardUsage: Array<{ id: string, amount: number }> = [];
  let remainingToUse = bonusToUse;
  
  for (const award of spendableAwards) {
    if (remainingToUse <= 0) break;
    
    const useAmount = Math.min(award.availableAmount, remainingToUse);
    if (useAmount > 0) {
      awardUsage.push({ id: award.id, amount: useAmount });
      remainingToUse -= useAmount;
    }
  }
  
  const result: BonusCalculation = {
    spendableAwards,
    totalAvailable,
    bonusToUse,
    finalPrice,
    awardUsage
  };
  
  console.log(`🧮 [PremiumSystem] Risultato calcolo:`, {
    totalAvailable: result.totalAvailable,
    bonusToUse: result.bonusToUse,
    finalPrice: result.finalPrice,
    awardsToUse: result.awardUsage.length
  });
  
  return result;
}

// ============================================================================
// APPLICAZIONE BONUS
// ============================================================================

/**
 * Applica effettivamente l'utilizzo dei bonus, aggiornando i documenti Firebase
 */
export async function applyBonusUsage(
  userId: string, 
  bonusCalculation: BonusCalculation
): Promise<void> {
  console.log(`💸 [PremiumSystem] Applicazione bonus per utente: ${userId}`);
  
  for (const usage of bonusCalculation.awardUsage) {
    try {
      await applyBonusToSingleAward(userId, usage.id, usage.amount);
      console.log(`  ✅ Applicato ${usage.amount}€ dal premio ${usage.id}`);
    } catch (error) {
      console.error(`  ❌ Errore applicando bonus dal premio ${usage.id}:`, error);
      throw error;
    }
  }
  
  console.log(`💸 [PremiumSystem] Bonus applicato con successo: ${bonusCalculation.bonusToUse}€`);
}

/**
 * Applica bonus a un singolo premio (funzione interna)
 */
async function applyBonusToSingleAward(
  userId: string, 
  awardId: string, 
  amount: number
): Promise<void> {
  const awardRef = doc(db, 'users', userId, 'userAwards', awardId);
  const awardSnap = await getDoc(awardRef);
  
  if (!awardSnap.exists()) {
    throw new Error(`Premio ${awardId} non trovato`);
  }
  
  const currentData = awardSnap.data();
  const currentValue = currentData.value || 0;
  const currentUsedValue = currentData.usedValue || 0;
  
  // Calcola nuovi valori
  const newUsedValue = Math.min(currentUsedValue + amount, currentValue);
  const newResiduo = Math.max(0, currentValue - newUsedValue);
  const newUsed = newResiduo === 0;
  
  // Aggiorna Firebase
  await updateDoc(awardRef, {
    usedValue: newUsedValue,
    residuo: newResiduo,
    used: newUsed
  });
  
  console.log(`🔄 [PremiumSystem] Premio ${awardId} aggiornato: residuo ${newResiduo}€, used: ${newUsed}`);
}

// ============================================================================
// RIMBORSO BONUS (per pagamenti falliti)
// ============================================================================

/**
 * Rimborsa bonus utilizzato quando un pagamento viene rifiutato
 */
export async function refundBonus(
  userId: string, 
  awardIds: string | string[], 
  totalRefundAmount: number
): Promise<void> {
  console.log(`🔙 [PremiumSystem] Rimborso bonus: ${totalRefundAmount}€ per utente ${userId}`);
  
  const idsArray = Array.isArray(awardIds) ? awardIds : [awardIds];
  let remainingRefund = totalRefundAmount;
  
  for (const awardId of idsArray) {
    if (remainingRefund <= 0) break;
    
    try {
      const awardRef = doc(db, 'users', userId, 'userAwards', awardId);
      const awardSnap = await getDoc(awardRef);
      
      if (!awardSnap.exists()) continue;
      
      const currentData = awardSnap.data();
      const currentValue = currentData.value || 0;
      const currentUsedValue = currentData.usedValue || 0;
      
      // Calcola quanto può essere rimborsato da questo premio
      const maxRefundFromThisAward = Math.min(remainingRefund, currentUsedValue);
      const newUsedValue = Math.max(0, currentUsedValue - maxRefundFromThisAward);
      const newResiduo = Math.max(0, currentValue - newUsedValue);
      const newUsed = newResiduo === 0;
      
      // Aggiorna Firebase
      await updateDoc(awardRef, {
        usedValue: newUsedValue,
        residuo: newResiduo,
        used: newUsed
      });
      
      remainingRefund -= maxRefundFromThisAward;
      console.log(`  🔙 Rimborsato ${maxRefundFromThisAward}€ dal premio ${awardId}`);
      
    } catch (error) {
      console.error(`Errore rimborso premio ${awardId}:`, error);
    }
  }
  
  console.log(`🔙 [PremiumSystem] Rimborso completato`);
}

// ============================================================================
// FUNZIONI DI UTILITÀ
// ============================================================================

/**
 * Verifica se l'utente ha bonus spendibili sufficienti per un acquisto
 */
export function hasInsufficientBonus(userAwards: UserAward[], requiredAmount: number): boolean {
  const calculation = calculateBonusForPurchase(userAwards, requiredAmount);
  return calculation.bonusToUse < requiredAmount;
}

/**
 * Ottieni riepilogo premi per l'utente (per UI)
 */
export function getAwardsSummary(userAwards: UserAward[]) {
  const spendable = getSpendableAwards(userAwards);
  const nonSpendable = userAwards.filter(award => !isAwardSpendable(award.name) && award.residuo > 0);
  
  return {
    totalSpendable: spendable.reduce((sum, award) => sum + award.availableAmount, 0),
    totalNonSpendable: nonSpendable.reduce((sum, award) => sum + award.residuo, 0),
    spendableAwards: spendable,
    nonSpendableAwards: nonSpendable.map(award => ({
      id: award.id,
      name: award.name,
      amount: award.residuo
    }))
  };
}

export default {
  loadUserAwards,
  getSpendableAwards,
  calculateBonusForPurchase,
  applyBonusUsage,
  refundBonus,
  isAwardSpendable,
  hasInsufficientBonus,
  getAwardsSummary
};