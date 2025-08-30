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

export function StagePaymentCard({ title, price, sumupUrl, onClose, userId, eventId }: StagePaymentCardProps) {
  const [awardId, setAwardId] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const { toast } = useToast();
  const [bonusBalance, setBonusBalance] = useState<number>(0);
  const [isLoadingBonus, setIsLoadingBonus] = useState(true);
  const [useBonus, setUseBonus] = useState(false);

  useEffect(() => {
    const fetchBonusBalance = async () => {
      try {
        // Recupera il bonus dall'award associato all'utente
        const awardsQuery = collection(db, "awards");
        // Puoi filtrare per userId e used === false
        const awardsSnap = await getDocs(awardsQuery);
        let found = false;
        awardsSnap.forEach((docSnap: QueryDocumentSnapshot<DocumentData>) => {
          const data = docSnap.data() as {
            userId: string;
            used: boolean;
            value?: number;
            usedValue?: number;
          };
          if (data.userId === userId && !data.used) {
            setBonusBalance((data.value || 0) - (data.usedValue || 0));
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
    fetchBonusBalance();
  }, [userId, toast]);

  const finalPrice = useBonus ? Math.max(0, price - bonusBalance) : price;
  const bonusToUse = useBonus ? Math.min(price, bonusBalance) : 0;

  const handleGymPayment = async () => {
    // Crea il documento pagamento in Firestore
    try {
      await addDoc(collection(db, "payments"), {
        userId,
        eventId,
        amount: finalPrice,
        method: "gym",
        status: "pending",
        createdAt: Timestamp.now(),
        eventTitle: title,
        bonusUsed: bonusToUse,
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
        await updateUserBonus(awardId, userId, bonusToUse);
        toast({
          title: "Bonus applicato",
          description: `Utilizzati ${bonusToUse}€ dal tuo bonus. ${finalPrice > 0 ? 'Porta il saldo rimanente in palestra.' : 'Iscrizione completata!'}`,
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
      await addDoc(collection(db, "payments"), {
        userId,
        eventId,
        amount: finalPrice,
        method: "online",
        status: "pending",
        createdAt: Timestamp.now(),
        eventTitle: title,
        bonusUsed: bonusToUse,
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
        await updateUserBonus(awardId, userId, bonusToUse);
        toast({
          title: "Bonus applicato",
          description: `Utilizzati ${bonusToUse}€ dal tuo bonus.`,
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
          <CardDescription className="text-xl font-semibold">
            <Euro className="inline-block mr-1 h-5 w-5" />
            {price.toFixed(2)} €
          </CardDescription>
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
                <div className="flex flex-col items-center gap-1 mb-2">
                  <span className="text-sm text-muted-foreground">Bonus residuo nel wallet: <span className="font-bold text-green-700">{bonusBalance}€</span></span>
                </div>
                {bonusBalance > 0 && (
                  <div className="flex items-center space-x-2 p-4 bg-gray-50 rounded-lg">
                    <Checkbox
                      id="useBonus"
                      checked={useBonus}
                      onCheckedChange={(checked) => setUseBonus(checked as boolean)}
                    />
                    <Label htmlFor="useBonus" className="flex-1">
                      Usa il tuo bonus disponibile: {bonusBalance}€
                    </Label>
                  </div>
                )}
                <div className="text-center font-semibold">
                  {useBonus && bonusToUse > 0 ? (
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground line-through">
                        Prezzo stage: {price}€
                      </p>
                      <p className="text-lg text-green-700">
                        Bonus utilizzato: -{bonusToUse}€
                      </p>
                      <p className="text-xl text-green-600">
                        Da pagare: {finalPrice}€
                      </p>
                      <p className="text-xs text-muted-foreground">Bonus residuo dopo pagamento: <span className="font-bold">{bonusBalance - bonusToUse}€</span></p>
                    </div>
                  ) : (
                    <>
                      <p className="text-xl">Prezzo stage: {price}€</p>
                      <p className="text-xs text-muted-foreground">Bonus residuo nel wallet: <span className="font-bold">{bonusBalance}€</span></p>
                    </>
                  )}
                </div>
              </div>
              <div className="grid gap-4">
                <Button 
                  variant="outline"
                  size="lg"
                  className="w-full text-lg font-medium border-2 border-[var(--my-marscuro)] hover:bg-[var(--my-marscuro)] hover:text-white transition-colors"
                  onClick={() => setShowConfirmDialog(true)}
                >
                  Paga in Palestra
                </Button>
                {sumupUrl && (
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
      {showConfirmDialog && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40" onClick={() => setShowConfirmDialog(false)}>
          <div className="bg-white rounded-lg shadow-lg max-w-sm w-full p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-2">Conferma pagamento in palestra</h2>
            <div className="mb-4 space-y-1">
              <div className="font-semibold">Importo stage: {price}€</div>
              <div className="font-semibold">Bonus residuo nel wallet: <span className="text-green-700">{bonusBalance}€</span></div>
              {bonusToUse > 0 && (
                <div className="font-semibold text-green-700">Bonus utilizzato: -{bonusToUse}€</div>
              )}
              <div className="font-bold text-lg">Da pagare in palestra: {finalPrice}€</div>
              <div className="text-xs text-muted-foreground">Bonus residuo dopo pagamento: <span className="font-bold">{bonusBalance - bonusToUse}€</span></div>
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
