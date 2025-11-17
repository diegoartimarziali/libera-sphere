import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Euro, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { doc, updateDoc, QueryDocumentSnapshot, DocumentData, collection, addDoc, Timestamp, onSnapshot, getDoc } from 'firebase/firestore';
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

  // Stato per i premi
  const [awardsSummary, setAwardsSummary] = useState({ spendableAwards: [], nonSpendableAwards: [] });
  useEffect(() => {
    async function fetchAwards() {
      const summary = await getAwardsSummary();
      setAwardsSummary(summary);
    }
    fetchAwards();
  }, [getAwardsSummary]);

  // 🧮 CALCOLO BONUS UNIFICATO: sostituisce logiche manuali precedenti
  const bonusCalculation = calculateBonus(price);
  const { bonusToUse, finalPrice, awardUsage } = bonusCalculation;
  const useBonus = bonusToUse > 0;
  
  // 📊 RIEPILOGO PREMI per visualizzazione UI
  const handleGymPayment = async () => {
    let paymentDocRef;
    let gymName = '';
    let lessonDate = Timestamp.now();
    try {
      // Recupera dati evento
      const eventDoc = await getDoc(doc(db, 'events', eventId));
      if (eventDoc.exists()) {
        const eventData = eventDoc.data();
        gymName = eventData.gymName || '';
        if (eventData.startDate) {
          lessonDate = eventData.startDate;
        }
      }
      // Oggetto pagamento per debug
      // Recupera la data dello stage
      let stageDate = lessonDate;
      try {
        const eventDoc = await getDoc(doc(db, 'events', eventId));
        if (eventDoc.exists()) {
          const eventData = eventDoc.data();
          stageDate = eventData.startTime || eventData.startDate || lessonDate;
        }
      } catch {}
      const paymentData = {
        eventId,
        amount: finalPrice,
        paymentMethod: "in_person",
        status: "pending",
        createdAt: Timestamp.now(),
        eventTitle: title,
        bonusUsed: bonusToUse,
        awardId: awardUsage.length === 1 ? awardUsage[0].id : awardUsage.map(u => u.id),
        description: `Tipologia Evento: ${eventType} - Disciplina: ${discipline}`,
        startTime: stageDate,
      };
      console.log('DEBUG pagamento palestra:', paymentData);
      paymentDocRef = await addDoc(collection(db, `users/${userId}/payments`), paymentData);
      if (!paymentDocRef || !paymentDocRef.id) {
        throw new Error('Documento pagamento non creato');
      }
    } catch (error) {
      console.error('Errore creazione pagamento:', error);
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

    // Listener per aggiornamento pagamento a "completed" (GYM PAYMENT)
    onSnapshot(paymentDocRef, async (docSnap: import('firebase/firestore').DocumentSnapshot<DocumentData>) => {
      const data = docSnap.data();
      if (data && data.status === 'completed') {
        // Applica il bonus se previsto e non ancora applicato (solo per pagamenti > 0)
        if (data.bonusUsed > 0 && data.awardId && finalPrice > 0) {
          try {
            await applyBonus(bonusCalculation);
            if (onRefresh) onRefresh();
          } catch (error) {
            console.error('Errore applicazione bonus dopo conferma:', error);
          }
        }
        // Aggiungi presenza solo se non già registrata
        const attendancesRef = collection(db, `users/${userId}/attendances`);
        await addDoc(attendancesRef, {
          lessonDate,
          lessonTime: '',
          discipline,
          gymName,
          status: 'presente',
          eventId,
          eventType,
          eventTitle: title
        });
      }
    });

    // 💸 APPLICAZIONE BONUS: Solo se il pagamento è completamente coperto dal bonus
    if (finalPrice === 0 && useBonus && bonusToUse > 0) {
      try {
        await applyBonus(bonusCalculation);
        if (onRefresh) onRefresh(); // Aggiorna UI premi nel wallet
        // Aggiungi immediatamente la presenza se l'iscrizione è gratuita
        let stageDate = lessonDate;
        try {
          const eventDoc = await getDoc(doc(db, 'events', eventId));
          if (eventDoc.exists()) {
            const eventData = eventDoc.data();
            stageDate = eventData.startTime || eventData.startDate || lessonDate;
          }
        } catch {}
        const attendancesRef = collection(db, `users/${userId}/attendances`);
        await addDoc(attendancesRef, {
          lessonDate: stageDate,
          lessonTime: '',
          discipline,
          gymName,
          status: 'presente',
          eventId,
          eventType,
          eventTitle: title
        });
      } catch (error) {
        console.error('Errore applicazione bonus:', error);
        // Interrompe se fallisce applicazione bonus
        return;
      }
    }
    toast({
      title: finalPrice > 0 ? "Pagamento in palestra selezionato" : "Iscrizione completata",
      description: finalPrice > 0 
        ? `Ti aspettiamo in palestra per completare l'iscrizione! (${finalPrice}€)${useBonus && bonusToUse > 0 ? ` Il bonus di ${bonusToUse}€ sarà applicato alla conferma del pagamento.` : ''}`
        : "Iscrizione confermata con il tuo bonus!",
    });
    onClose();
    router.push('/dashboard');
  };

  const handleOnlinePayment = async () => {
    let paymentDocRef;
    
    // Crea il documento pagamento in Firestore
    try {
      // Recupera la data dello stage
      let stageDate = Timestamp.now();
      try {
        const eventDoc = await getDoc(doc(db, 'events', eventId));
        if (eventDoc.exists()) {
          const eventData = eventDoc.data();
          stageDate = eventData.startTime || eventData.startDate || Timestamp.now();
        }
      } catch {}
      paymentDocRef = await addDoc(collection(db, `users/${userId}/payments`), {
        eventId,
        amount: finalPrice,
        paymentMethod: "online",
        status: "pending",
        createdAt: Timestamp.now(),
        eventTitle: title,
        bonusUsed: bonusToUse,
        awardId: awardUsage.length === 1 ? awardUsage[0].id : awardUsage.map(u => u.id),
        description: `Tipologia Evento: ${eventType} - Disciplina: ${discipline}`,
        startTime: stageDate,
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
        // Recupera la data dello stage
        let stageDate = Timestamp.now();
        try {
          const eventDoc = await getDoc(doc(db, 'events', eventId));
          if (eventDoc.exists()) {
            const eventData = eventDoc.data();
            stageDate = eventData.startTime || eventData.startDate || Timestamp.now();
          }
        } catch {}
        // Aggiungi presenza solo se non già registrata
        const attendancesRef = collection(db, `users/${userId}/attendances`);
        await addDoc(attendancesRef, {
          lessonDate: stageDate,
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
        title: "Link Pagamento Mancante",
        description: `Il link di pagamento per "${title}" non è configurato. Contatta la segreteria.`,
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
    
    // Verifica che il link SumUp sia valido prima di aprirlo
    try {
      new URL(sumupUrl); // Verifica che sia un URL valido
      const popup = window.open(sumupUrl, '_blank');
      // Verifica se il popup è stato bloccato (common on mobile)
      if (!popup || popup.closed || typeof popup.closed == 'undefined') {
        // Fallback per mobile: usa window.location
        window.location.href = sumupUrl;
        return; // Non continuare con il redirect alla dashboard
      }
    } catch (error) {
      console.error('Error opening SumUp link:', error);
      toast({
        variant: "destructive",
        title: "Link Pagamento Non Valido",
        description: "Il link di pagamento non è corretto. Contatta la segreteria.",
      });
      return;
    }
    
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
                    onClick={(e) => {
                      console.log('🔥 CLICK Paga in Palestra - evento ricevuto!', e);
                      e.preventDefault();
                      e.stopPropagation();
                      // Usa confirm nativo per debug
                      const confirmed = window.confirm(
                        `Confermi il pagamento in palestra?\n\n` +
                        `Importo stage: ${price}€\n` +
                        `Bonus disponibile: ${totalSpendable}€\n` +
                        `Da pagare in palestra: ${finalPrice}€\n` +
                        `Residuo bonus: ${totalSpendable - bonusToUse}€`
                      );
                      if (confirmed) {
                        console.log('🟢 Pagamento confermato, eseguendo handleGymPayment');
                        handleGymPayment();
                      } else {
                        console.log('🔴 Pagamento annullato');
                      }
                    }}
                  >
                    Paga in Palestra
                  </Button>
                )}
                {sumupUrl && finalPrice > 0 && (() => {
                  try {
                    new URL(sumupUrl); // Verifica che sia un URL valido
                    return (
                      <Button
                        size="lg" 
                        className="w-full text-lg font-medium bg-transparent text-green-600 border-2 border-green-600 hover:bg-green-50 hover:text-green-700 transition-colors"
                        onClick={(e) => {
                          console.log('🔥 CLICK Paga Online - evento ricevuto!', e);
                          e.preventDefault();
                          e.stopPropagation();
                          handleOnlinePayment();
                        }}
                      >
                        Paga Online con Carta
                      </Button>
                    );
                  } catch {
                    // Se l'URL non è valido, non mostrare il pulsante
                    return null;
                  }
                })()}
              </div>
            </React.Fragment>
          )}
        </CardContent>
      </Card>

    </>
  );
}
