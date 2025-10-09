/**
 * DOCUMENTAZIONE SISTEMA PREMI - LIBERA SPHERE
 * ==============================================
 * 
 * STRUTTURA FIREBASE:
 * - Collection: `awards` (contiene i template dei premi)
 * - Subcollection: `users/{userId}/userAwards` (premi assegnati agli utenti)
 * 
 * REGOLE DI SPENDIBILITÀ:
 * ✅ SPENDIBILI (possono essere usati per acquisti):
 *    - Tutti i premi eccetto "Premio Presenze"
 *    - Premi da pagamenti, premi convertiti dall'admin, etc.
 * 
 * ❌ NON SPENDIBILI (solo visualizzabili/accumulabili):
 *    - "Premio Presenze" - Si accumula durante la stagione
 *    - Può essere convertito dall'admin in premio spendibile quando opportuno
 * 
 * LOGICA IMPLEMENTATA:
 * - Funzione isPremioSpendibile() filtra solo "Premio Presenze"
 * - Tutti gli altri premi sono automaticamente spendibili
 * - Implementata in: abbonamenti mensili, stagionali, stage/eventi
 * 
 * CAMPI PRINCIPALI:
 * - name: Nome del premio (es. "Premio Presenze")
 * - value: Valore originale del premio
 * - residuo: Valore ancora disponibile/non utilizzato
 * - used: Se il premio è stato completamente utilizzato
 * - usedValue: Quanto del premio è già stato speso
 * 
 * NOTA: Il recupero del nome può avvenire sia dal documento userAward 
 * che dal template nel collection awards tramite awardId
 */

// Questo file serve solo come documentazione
export {};