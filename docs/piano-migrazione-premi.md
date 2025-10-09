# PIANO DI MIGRAZIONE SISTEMA PREMI UNIFICATO

Questa guida spiega come migrare gradualmente dal sistema attuale al nuovo sistema unificato per garantire zero downtime.

## FASE 1: IMPLEMENTAZIONE SISTEMA UNIFICATO ✅

* [x] Creato /src/lib/premiumSystem.ts con logiche centralizzate
* [x] Creato /src/hooks/use-premium-system.ts con hook React unificato

## FASE 2: MIGRAZIONE COMPONENTI (PRIORITÀ ALTA)

### A. Stage/Eventi (SEMPLICE)

FILE: /src/components/dashboard/StagePaymentCard.tsx

PRIMA (ATTUALE):

```typescript
// Logica sparsa e complessa
const availableAwards = userAwards.filter(a => isPremioSpendibile(a));
const totalBonus = availableAwards.reduce((acc, a) => acc + a.residuo, 0);
// ... calcoli manuali complessi
```

DOPO (NUOVO):

```typescript
import { usePremiumSystem } from '@/hooks/use-premium-system';

function StagePaymentCard({ price, userId, ... }) {
  const { 
    totalSpendable, 
    calculateBonus, 
    applyBonus,
    refundBonus 
  } = usePremiumSystem(userId);
  
  const bonusCalculation = calculateBonus(price);
  
  const handlePayment = async () => {
    if (bonusCalculation.bonusToUse > 0) {
      await applyBonus(bonusCalculation);
    }
    // ... resto logica pagamento
  };
}
```

### B. Abbonamenti Mensili (MEDIO)

FILE: /src/app/dashboard/subscriptions/monthly/page.tsx

SOSTITUIRE:

* calculateBonusUsage() → premiumSystem.calculateBonusForPurchase()
* loadUserBonus() → usePremiumSystem()
* Logica applicazione bonus manuale → applyBonus()

### C. Abbonamenti Stagionali (MEDIO)

FILE: /src/app/dashboard/subscriptions/seasonal/page.tsx

SOSTITUIRE:

* Stato bonusDisponibili → spendableAwards
* Calcoli totaleBonus → totalSpendable
* Logica update manuale → applyBonus()

## FASE 3: PULIZIA CODICE OBSOLETO

### Rimuovere funzioni duplicate

* /src/lib/updateUserBonus.ts → premiumSystem.applyBonusUsage()
* /src/lib/refundUserBonus.ts → premiumSystem.refundBonus()
* Logiche isPremioSpendibile() sparse → premiumSystem.isAwardSpendable()

### Unificare context

* /src/context/UserAwardsContext.tsx → usePremiumSystem()

## FASE 4: TESTING E VALIDAZIONE

### Test di regressione

1. Stage: acquisto con bonus parziale/totale
2. Abbonamenti: utilizzo bonus multi-premio
3. Rimborsi: pagamenti falliti
4. Visualizzazione: wallet premi corretti

## VANTAGGI POST-MIGRAZIONE

✅ UNA SOLA LOGICA per tutti i tipi di acquisto
✅ FILTRO COERENTE per Premio Presenze in tutto il sistema
✅ GESTIONE ERRORI centralizzata e uniforme
✅ LOGGING DEBUG unificato per troubleshooting
✅ MANUTENIBILITÀ drasticamente migliorata
✅ TESTING semplificato (un solo modulo da testare)

## ROLLBACK PLAN

In caso di problemi, ogni componente può essere ripristinato individualmente alla versione precedente senza impatti sistemici.
