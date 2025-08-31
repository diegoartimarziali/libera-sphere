import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  eventType: string;
  discipline: string;
  onRefresh?: () => void;
}

export function StagePaymentCard({ title, price, sumupUrl, onClose, userId, eventId, eventType, discipline, onRefresh }: StagePaymentCardProps): JSX.Element {
  const router = useRouter();

  const [userAwards, setUserAwards] = useState<any[]>([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const { toast } = useToast();
  const [isLoadingBonus, setIsLoadingBonus] = useState(true);
  // Bonus viene usato automaticamente se disponibile
  const useBonus = userAwards.length > 0 && userAwards.some(a => a.residuo > 0 && !a.used);

  const fetchUserAwards = async () => {
    try {
      const userAwardsQuery = collection(db, `users/${userId}/userAwards`);
      const userAwardsSnap = await getDocs(userAwardsQuery);
      const awards = userAwardsSnap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
      setUserAwards(awards);
    } catch (error) {
      console.error("Errore nel recupero dei premi:", error);
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Impossibile recuperare i premi."
      });
    } finally {
      setIsLoadingBonus(false);
    }
  };
  useEffect(() => {
    fetchUserAwards();
  }, [userId, toast]);

  // Calcola il totale bonus residuo
  const totalBonus = userAwards.filter(a => !a.used && a.residuo > 0).reduce((acc, a) => acc + a.residuo, 0);
  const bonusToUse = useBonus ? (totalBonus >= price ? price : totalBonus) : 0;
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
    if (useBonus && bonusToUse > 0) {
      let importoDaScalare = bonusToUse;
      for (const award of userAwards.filter(a => !a.used && a.residuo > 0)) {
        if (importoDaScalare <= 0) break;
        const daUsare = Math.min(award.residuo, importoDaScalare);
        await updateUserBonus(award.id, userId, daUsare);
        importoDaScalare -= daUsare;
      }
      await fetchUserAwards(); // Aggiorna lo stato premi locale
      if (onRefresh) onRefresh(); // Aggiorna la UI premi nel wallet
      toast({
        title: "Bonus applicato",
        description: `Utilizzati ${bonusToUse}€ dal tuo bonus. ${finalPrice > 0 ? 'Porta il saldo rimanente in palestra.' : 'Iscrizione completata!'}`,
      });
    }

    toast({
      title: finalPrice > 0 ? "Pagamento in palestra selezionato" : "Iscrizione completata",
      description: finalPrice > 0 
        ? `Ti aspettiamo in palestra per completare l'iscrizione! (${finalPrice}€)`
        : "Iscrizione confermata con il tuo bonus!",
    });
  onClose();
  router.push('/dashboard');
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
    // ...già aggiornato sopra...
    if (!sumupUrl) {
      toast({
        variant: "destructive",
        title: "Errore",
        description: "Link di pagamento non disponibile. Contatta la segreteria.",
      });
      return;
    }
    router.push('/dashboard');

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
                  <span className="text-sm font-bold text-green-700">Bonus totale disponibile: {totalBonus}€</span>
                  {userAwards.filter(a => !a.used && a.residuo > 0).length > 0 && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Premi residui:
                      <ul className="list-disc ml-4">
                        {userAwards.filter(a => !a.used && a.residuo > 0).map(a => (
                          <li key={a.id}>{a.name || 'Premio'}: {a.residuo}€</li>
                        ))}
                      </ul>
                    </div>
                  )}
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
                    <div className="font-semibold text-green-700 text-center">Residuo bonus dopo il pagamento: {totalBonus - bonusToUse}€</div>
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
              <div className="font-semibold">Bonus totale disponibile: <span className="text-green-700">{totalBonus}€</span></div>
              <div className="font-bold text-lg">Da pagare in palestra: {finalPrice}€</div>
              <div className="font-semibold text-green-700">Residuo bonus dopo il pagamento: {totalBonus - bonusToUse}€</div>
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
