import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Euro, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, QueryDocumentSnapshot, DocumentData, collection, addDoc, Timestamp } from 'firebase/firestore';
import { getDocs } from 'firebase/firestore';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { updateUserBonus } from '../../lib/updateUserBonus';

interface StagePaymentCardProps {
  title: string;
  price: number;
  sumupUrl?: string;
  onClose: () => void;
  userId: string;
  eventId: string;
}

// Aggiungi la prop opzionale onRefresh
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

export function StagePaymentCard({ title, price, sumupUrl, onClose, userId, eventId, eventType, discipline, onRefresh }: StagePaymentCardProps) {
  const [awardId, setAwardId] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const { toast } = useToast();
  const [bonusBalance, setBonusBalance] = useState<number>(0);
  const [isLoadingBonus, setIsLoadingBonus] = useState(true);
  // Bonus viene usato automaticamente se disponibile
  const useBonus = bonusBalance > 0;

  const fetchBonusBalance = async () => {
    try {
      // Recupera il bonus dalla sottocollezione userAwards dell'utente
      const userAwardsQuery = collection(db, `users/${userId}/userAwards`);
      const userAwardsSnap = await getDocs(userAwardsQuery);
      let found = false;
      userAwardsSnap.forEach((docSnap: QueryDocumentSnapshot<DocumentData>) => {
        const data = docSnap.data() as {
          residuo?: number;
          used?: boolean;
        };
        // Considera solo premi non completamente utilizzati
        if ((data.residuo || 0) > 0 && !data.used) {
          setBonusBalance(data.residuo || 0);
          setAwardId(docSnap.id);
          found = true;
        }
      });
      if (!found) setBonusBalance(0);
    } catch (error) {
      console.error("Errore nel recupero del bonus:", error);
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Impossibile recuperare il saldo bonus."
      });
    } finally {
      setIsLoadingBonus(false);
    }
  };
  useEffect(() => {
    fetchBonusBalance();
  }, [userId, toast]);

  // Se il bonus è sufficiente, bonusToUse = price, altrimenti bonusToUse = bonusBalance
  const bonusToUse = useBonus ? (bonusBalance >= price ? price : bonusBalance) : 0;
  const finalPrice = useBonus ? Math.max(0, price - bonusToUse) : price;

  const handleGymPayment = async () => {
    // Crea il documento pagamento in Firestore
    try {
      await addDoc(collection(db, `users/${userId}/payments`), {
        eventId,
        amount: finalPrice,
        method: "gym",
        status: "pending",
        createdAt: Timestamp.now(),
        eventTitle: title,
        bonusUsed: bonusToUse,
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
    if (useBonus && bonusToUse > 0 && awardId) {
      try {
        // Log di debug per bonusToUse
        console.log('Chiamo updateUserBonus con:', { awardId, userId, bonusToUse });
        // Garantisco che bonusToUse non superi il residuo
        const safeBonusToUse = Math.min(bonusBalance, bonusToUse);
        await updateUserBonus(awardId, userId, safeBonusToUse);
        await fetchBonusBalance(); // Aggiorna lo stato bonus locale
        if (onRefresh) onRefresh(); // Aggiorna la UI premi nel wallet
        toast({
          title: "Bonus applicato",
          description: `Utilizzati ${safeBonusToUse}€ dal tuo bonus. ${finalPrice > 0 ? 'Porta il saldo rimanente in palestra.' : 'Iscrizione completata!'}`,
        });
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Errore bonus",
          description: "Impossibile aggiornare il bonus. Riprova più tardi."
        });
        return;
      }
    }

    toast({
      title: finalPrice > 0 ? "Pagamento in palestra selezionato" : "Iscrizione completata",
      description: finalPrice > 0 
        ? `Ti aspettiamo in palestra per completare l'iscrizione! (${finalPrice}€)`
        : "Iscrizione confermata con il tuo bonus!",
    });
    onClose();
  };

  const handleOnlinePayment = async () => {
    // Crea il documento pagamento in Firestore
    try {
      await addDoc(collection(db, `users/${userId}/payments`), {
        eventId,
        amount: finalPrice,
        method: "online",
        status: "pending",
        createdAt: Timestamp.now(),
        eventTitle: title,
        bonusUsed: bonusToUse,
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
    if (useBonus && bonusToUse > 0 && awardId) {
      try {
        // Log di debug per bonusToUse
        console.log('Chiamo updateUserBonus con:', { awardId, userId, bonusToUse });
        // Garantisco che bonusToUse non superi il residuo
        const safeBonusToUse = Math.min(bonusBalance, bonusToUse);
        await updateUserBonus(awardId, userId, safeBonusToUse);
        await fetchBonusBalance(); // Aggiorna lo stato bonus dopo pagamento
        toast({
          title: "Bonus applicato",
          description: `Utilizzati ${safeBonusToUse}€ dal tuo bonus.`,
        });
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Errore bonus",
          description: "Impossibile aggiornare il bonus. Riprova più tardi."
        });
        return;
      }
    }
    if (!sumupUrl) {
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Link di pagamento non disponibile. Contatta la segreteria.",
      });
      return;
    }

    if (useBonus && bonusBalance > 0) {
      try {
        // Aggiorna il saldo bonus dell'utente
        const newBonusBalance = bonusBalance - bonusToUse;
        await updateDoc(doc(db, "users", userId), {
          bonusBalance: newBonusBalance
        });

        toast({
          title: "Bonus applicato",
          description: `Utilizzati ${bonusToUse}€ dal tuo bonus.`,
        });
      } catch (error) {
        console.error("Errore nell'aggiornamento del bonus:", error);
        toast({
          variant: "destructive",
          title: "Errore",
          description: "Impossibile applicare il bonus. Riprova più tardi.",
        });
        return;
      }
    }

    // Se il prezzo finale è 0, non serve andare su SumUp
    if (finalPrice === 0) {
      toast({
        title: "Iscrizione completata",
        description: "Iscrizione confermata con il tuo bonus!"
      });
      onClose();
      return;
    }
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
                {/* Visualizza il bonus residuo solo una volta, in modo chiaro */}
                <div className="flex flex-col items-center gap-1 mb-2">
                  <span className="text-sm font-bold text-green-700">Premi da utilizzare: {bonusBalance}€</span>
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
                  <Button 
                    variant="default"
                    size="lg"
                    className="w-full text-lg font-bold bg-green-600 hover:bg-green-700 text-white"
                    onClick={handleGymPayment}
                  >
                    Iscriviti
                  </Button>
                ) : (
                  <Button 
                    variant="outline"
                    size="lg"
                    className="w-full text-lg font-medium border-2 border-[var(--my-marscuro)] hover:bg-[var(--my-marscuro)] hover:text-white transition-colors"
                    onClick={() => setShowConfirmDialog(true)}
                  >
                    Paga in Palestra
                  </Button>
                )}
                {sumupUrl && finalPrice > 0 && (
                  <Button
                    size="lg" 
                    className="w-full text-lg font-medium bg-[var(--my-arancio)] hover:bg-[var(--my-aranscuro)] text-white transition-colors"
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
            <h2 className="text-xl font-bold mb-2">Conferma pagamento in palestra</h2>
            <div className="mb-4 space-y-1">
              <div className="font-semibold">Importo stage: {price}€</div>
              <div className="font-semibold">Premi da utilizzare: <span className="text-green-700">{bonusBalance}€</span></div>
              <div className="font-bold text-lg">Da pagare in palestra: {finalPrice}€</div>
            </div>
            <div className="flex gap-2 justify-end mt-6">
              <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>Annulla</Button>
              <Button variant="default" onClick={() => { handleGymPayment(); setShowConfirmDialog(false); }}>Conferma</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
