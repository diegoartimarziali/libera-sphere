import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Euro, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { doc, updateDoc, QueryDocumentSnapshot, DocumentData, collection, addDoc, Timestamp, onSnapshot } from 'firebase/firestore';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { usePremiumSystem } from '@/hooks/use-premium-system';

interface StagePaymentCardProps {
  title: string;
  price: number;
  sumupUrl?: string;
  onClose: () => void;
  userId: string;
  eventId: string;
  eventType: string;
  discipline: string;
  onRefresh?: () => void;
}

export function StagePaymentCard({ title, price, sumupUrl, onClose, userId, eventId, eventType, discipline, onRefresh }: StagePaymentCardProps): JSX.Element {
  const router = useRouter();
  const { toast } = useToast();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  
  // 🚀 SISTEMA UNIFICATO: sostituisce tutta la logica sparsa precedente
  const {
    totalSpendable,
    calculateBonus,
    applyBonus,
    refundBonus,
    isLoading: isLoadingBonus,
    getAwardsSummary
  } = usePremiumSystem(userId);

  
  // 🧮 CALCOLO BONUS UNIFICATO: sostituisce logiche manuali precedenti
  const bonusCalculation = calculateBonus(price);
  const { bonusToUse, finalPrice, awardUsage } = bonusCalculation;
  const useBonus = bonusToUse > 0;
  
  // 📊 RIEPILOGO PREMI per visualizzazione UI
  const awardsSummary = getAwardsSummary();
  
  console.log('� [StagePayment] Sistema unificato - Bonus disponibile:', totalSpendable);
  console.log('� [StagePayment] Calcolo per acquisto €', price, '→ Bonus da usare:', bonusToUse, '€');
  console.log('🚀 [StagePayment] Prezzo finale:', finalPrice, '€');

  const handleGymPayment = async () => {
    let paymentDocRef;
    try {
      // Crea documento pagamento
      paymentDocRef = await addDoc(collection(db, `users/${userId}/payments`), {
        eventId,
        amount: finalPrice,
        method: "gym",
        status: "pending",
        createdAt: Timestamp.now(),
        eventTitle: title,
        bonusUsed: bonusToUse,
        awardId: awardUsage.length === 1 ? awardUsage[0].id : awardUsage.map(u => u.id),
        description: `Tipologia Evento: ${eventType} - Disciplina: ${discipline}`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Errore pagamento",
        description: "Impossibile registrare il pagamento. Riprova più tardi."
      });
      return;
    }

    // Listener per aggiornamento pagamento a "failed" (rimborso bonus)
    onSnapshot(paymentDocRef, async (docSnap: import('firebase/firestore').DocumentSnapshot<DocumentData>) => {
      const data = docSnap.data();
      if (data && data.status === 'failed' && data.bonusUsed > 0 && data.awardId) {
        // 🔙 RIMBORSO UNIFICATO: sostituisce logica manuale
        try {
          await refundBonus(data.awardId, data.bonusUsed);
        } catch (error) {
          console.error('Errore rimborso:', error);
        }
      }
    });

    // Listener per aggiornamento pagamento a "completed"
    onSnapshot(paymentDocRef, async (docSnap: import('firebase/firestore').DocumentSnapshot<DocumentData>) => {
      const data = docSnap.data();
      if (data && data.status === 'completed') {
        // Aggiungi presenza solo se non già registrata
        const attendancesRef = collection(db, `users/${userId}/attendances`);
        await addDoc(attendancesRef, {
          lessonDate: Timestamp.now(),
          lessonTime: '',
          discipline,
          gymName: '',
          status: 'presente',
          eventId,
          eventType,
          eventTitle: title
        });
      }
    });
    
    // 💸 APPLICAZIONE BONUS UNIFICATA: sostituisce loop manuale
    if (useBonus && bonusToUse > 0) {
      try {
        await applyBonus(bonusCalculation);
        if (onRefresh) onRefresh(); // Aggiorna UI premi nel wallet
      } catch (error) {
        console.error('Errore applicazione bonus:', error);
        return; // Interrompe se fallisce applicazione bonus
      }
    }    toast({
      title: finalPrice > 0 ? "Pagamento in palestra selezionato" : "Iscrizione completata",
      description: finalPrice > 0 
        ? `Ti aspettiamo in palestra per completare l'iscrizione! (${finalPrice}€)`
        : "Iscrizione confermata con il tuo bonus!",
    });
    onClose();
    router.push('/dashboard');
  };

  const handleOnlinePayment = async () => {
    let paymentDocRef;
    
    // Crea il documento pagamento in Firestore
    try {
      paymentDocRef = await addDoc(collection(db, `users/${userId}/payments`), {
        eventId,
        amount: finalPrice,
        method: "online",
        status: "pending",
        createdAt: Timestamp.now(),
        eventTitle: title,
        bonusUsed: bonusToUse,
        awardId: awardUsage.length === 1 ? awardUsage[0].id : awardUsage.map(u => u.id),
        description: `Tipologia Evento: ${eventType} - Disciplina: ${discipline}`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Errore pagamento",
        description: "Impossibile registrare il pagamento. Riprova più tardi."
      });
      return;
    }

    // Listener per aggiornamento pagamento a "failed" (rimborso bonus)
    onSnapshot(paymentDocRef, async (docSnap: import('firebase/firestore').DocumentSnapshot<DocumentData>) => {
      const data = docSnap.data();
      if (data && data.status === 'failed' && data.bonusUsed > 0 && data.awardId) {
        // 🔙 RIMBORSO UNIFICATO
        try {
          await refundBonus(data.awardId, data.bonusUsed);
        } catch (error) {
          console.error('Errore rimborso:', error);
        }
      }
    });

    // Listener per aggiornamento pagamento a "completed"
    onSnapshot(paymentDocRef, async (docSnap: import('firebase/firestore').DocumentSnapshot<DocumentData>) => {
      const data = docSnap.data();
      if (data && data.status === 'completed') {
        // Aggiungi presenza solo se non già registrata
        const attendancesRef = collection(db, `users/${userId}/attendances`);
        await addDoc(attendancesRef, {
          lessonDate: Timestamp.now(),
          lessonTime: '',
          discipline,
          gymName: '',
          status: 'presente',
          eventId,
          eventType,
          eventTitle: title
        });
      }
    });

    if (!sumupUrl) {
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Link di pagamento non disponibile. Contatta la segreteria.",
      });
      return;
    }

    // Se il prezzo finale è 0, non serve andare su SumUp
    if (finalPrice === 0) {
      // 💸 APPLICAZIONE BONUS UNIFICATA per acquisto a costo zero
      if (useBonus && bonusToUse > 0) {
        try {
          await applyBonus(bonusCalculation);
          if (onRefresh) onRefresh(); // Aggiorna UI premi nel wallet
        } catch (error) {
          console.error('Errore applicazione bonus:', error);
          return;
        }
      }
      
      toast({
        title: "Iscrizione completata",
        description: "Iscrizione confermata con il tuo bonus!"
      });
      onClose();
      router.push('/dashboard');
      return;
    }

    // 💸 APPLICAZIONE BONUS UNIFICATA prima di reindirizzare a SumUp
    if (useBonus && bonusToUse > 0) {
      try {
        await applyBonus(bonusCalculation);
        if (onRefresh) onRefresh(); // Aggiorna UI premi nel wallet
      } catch (error) {
        console.error('Errore applicazione bonus:', error);
        return;
      }
    }

    // Chiudi il dialog
    onClose();
    
    // Reindirizza a SumUp per il pagamento
    window.open(sumupUrl, '_blank');
    
    // Torna alla dashboard
    router.push('/dashboard');
  };

  return (
    <>
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-2xl font-bold text-[var(--my-marscuro)]">
            {title}
          </CardTitle>
          {/* Rimosso prezzo stage doppio sotto il titolo */}
        </CardHeader>
        <CardContent className="space-y-6">
          {isLoadingBonus ? (
            <div className="flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <React.Fragment>
              <div className="space-y-4">
                <div className="text-center text-lg text-muted-foreground">
                  Scegli la modalità di pagamento
                </div>
                {/* 🏆 VISUALIZZAZIONE PREMI UNIFICATA */}
                <div className="flex flex-col items-center gap-1 mb-2">
                  <span className="text-sm font-bold text-green-700">Bonus totale disponibile: {totalSpendable}€</span>
                  <div className="text-xs text-muted-foreground mt-1">
                    Premi nel wallet:
                    <ul className="list-disc ml-4">
                      {/* Premi spendibili */}
                      {awardsSummary.spendableAwards.map(award => (
                        <li key={award.id} className="font-semibold text-green-700">
                          {award.name}: {award.availableAmount}€
                        </li>
                      ))}
                      {/* Premi non spendibili (es. Premio Presenze) */}
                      {awardsSummary.nonSpendableAwards.map(award => (
                        <li key={award.id} className="text-blue-600">
                          {award.name}: {award.amount}€ <span className="italic">(non spendibile)</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                {/* Nessun messaggio automatico sul bonus */}
                <div className="text-center font-semibold">
                  {useBonus && bonusToUse > 0 ? (
                    <div className="space-y-1">
                      <p className="text-2xl font-bold text-muted-foreground">
                        Prezzo stage: {price}€
                      </p>
                      <p className="text-xl text-green-600">
                        Da pagare: {finalPrice}€
                      </p>
                    </div>
                  ) : (
                    <>
                      <p className="text-xl">Prezzo stage: {price}€</p>
                      {/* Bonus residuo già visualizzato sopra, non serve qui */}
                    </>
                  )}
                </div>
              </div>
              <div className="grid gap-4">
                {finalPrice === 0 ? (
                  <div className="space-y-2">
                    <div className="font-semibold text-green-700 text-center">Residuo bonus dopo il pagamento: {totalSpendable - bonusToUse}€</div>
                    <Button 
                      variant="default"
                      size="lg"
                      className="w-full text-lg font-bold bg-green-600 hover:bg-green-700 text-white"
                      onClick={handleGymPayment}
                    >
                      Iscriviti
                    </Button>
                  </div>
                ) : (
                  <Button 
                    variant="outline"
                    size="lg"
                    className="w-full text-lg font-medium bg-transparent text-green-600 border-2 border-green-600 hover:bg-green-50 hover:text-green-700 transition-colors"
                    onClick={() => setShowConfirmDialog(true)}
                  >
                    Paga in Palestra
                  </Button>
                )}
                {sumupUrl && finalPrice > 0 && (
                  <Button
                    size="lg" 
                    className="w-full text-lg font-medium bg-transparent text-green-600 border-2 border-green-600 hover:bg-green-50 hover:text-green-700 transition-colors"
                    onClick={handleOnlinePayment}
                  >
                    Paga Online con Carta
                  </Button>
                )}
              </div>
            </React.Fragment>
          )}
        </CardContent>
      </Card>

      {/* Dialog di conferma pagamento palestra */}
      {showConfirmDialog && finalPrice > 0 && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40" onClick={() => setShowConfirmDialog(false)}>
          <div className="bg-white rounded-lg shadow-lg max-w-sm w-full p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-2 text-[hsl(22.5_55%_11%)]">Conferma pagamento in palestra</h2>
            <div className="mb-4 space-y-1">
              <div className="font-semibold text-[hsl(22.5_55%_11%)]">Importo stage: {price}€</div>
              <div className="font-semibold text-[hsl(22.5_55%_11%)]">Bonus totale disponibile: <span className="text-green-700">{totalSpendable}€</span></div>
              <div className="font-bold text-lg text-[hsl(22.5_55%_11%)]">Da pagare in palestra: {finalPrice}€</div>
              <div className="font-semibold text-green-700">Residuo bonus dopo il pagamento: {totalSpendable - bonusToUse}€</div>
            </div>
            <div className="flex gap-2 justify-end mt-6">
              <Button variant="outline" className="bg-transparent text-[hsl(22.5_55%_11%)] border-[hsl(22.5_55%_11%)] hover:bg-[hsl(22.5_55%_11%)] hover:text-white" onClick={() => setShowConfirmDialog(false)}>Annulla</Button>
              <Button variant="outline" className="bg-transparent text-green-600 border-green-600 hover:bg-green-50 hover:text-green-700 font-bold" onClick={() => { handleGymPayment(); setShowConfirmDialog(false); }}>Conferma</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
