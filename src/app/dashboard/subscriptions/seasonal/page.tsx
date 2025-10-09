
"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter } from "next/navigation"
import { doc, getDoc, Timestamp, collection, getDocs, query, where, writeBatch, serverTimestamp, addDoc } from "firebase/firestore"
import { db, auth } from "@/lib/firebase"
import { useAuthState } from "react-firebase-hooks/auth"
import { useToast } from "@/hooks/use-toast"
import { format, isAfter, isBefore, startOfDay } from "date-fns"
import { it } from "date-fns/locale"
import { assignPremiPresenze } from "@/lib/assignPremiPresenze"
import { showPremiPresenzeMessage, showPremiPresenzeErrorMessage } from "@/lib/premiPresenzeMessages"
import Link from "next/link"

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, CalendarClock, ArrowLeft, ShieldCheck, Zap, AlertTriangle, CreditCard, Landmark, University, Gift } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"


interface Subscription {
    id: string;
    name: string;
    type: 'monthly' | 'seasonal';
    totalPrice: number;
    sumupLink: string;
    purchaseStartDate?: Timestamp;
    purchaseEndDate?: Timestamp;
    validityStartDate: Timestamp;
    validityEndDate: Timestamp;
    expiryWarningDate: Timestamp;
}

interface UserData {
    name?: string;
    surname?: string;
    activeSubscription?: {
        subscriptionId: string;
    };
    subscriptionAccessStatus?: 'active' | 'pending' | 'expired';
}

interface BankDetails {
    recipientName: string;
    bankName: string;
    iban: string;
}

type PaymentMethod = "online" | "in_person" | "bank_transfer" | "bonus";

/**
 * Determina se un premio è spendibile per acquisti
 * REGOLA: Solo "Premio Presenze" NON è spendibile, tutti gli altri sì
 * @param award - Il premio da controllare
 * @returns true se il premio è spendibile, false altrimenti
 */
function isPremioSpendibile(award: any): boolean {
    const name = award.name;
    
    // Solo il Premio Presenze è non spendibile (accumulabile ma non utilizzabile)
    const isSpendibile = name !== 'Premio Presenze';
    
    console.log(`🔍 [Seasonal] Premio "${name || 'SENZA NOME'}" - Spendibile: ${isSpendibile}`);
    
    return isSpendibile;
}

function SubscriptionCard({ subscription, onPurchase, isSubmitting, hasActiveOrPending, onOpenPaymentDialog, totaleBonus }: { subscription: Subscription; onPurchase: (sub: Subscription, method: PaymentMethod) => void; isSubmitting: boolean; hasActiveOrPending: boolean; onOpenPaymentDialog: () => void; totaleBonus: number }) {
    const now = new Date();
    const isPurchaseWindowOpen = 
        subscription.purchaseStartDate && subscription.purchaseEndDate ?
        isAfter(now, subscription.purchaseStartDate.toDate()) && isBefore(now, subscription.purchaseEndDate.toDate())
        : true; // Se non ci sono date, è sempre acquistabile

    const isExpiring = subscription.expiryWarningDate && isAfter(now, subscription.expiryWarningDate.toDate());

    return (
        <Card className="w-full max-w-lg border-4 bg-gray-50" style={{ borderColor: '#0ea5e9' }}>
            <CardHeader>
                <CardTitle className="text-2xl">{subscription.name}</CardTitle>
                <CardDescription>
                    Acquista l'accesso ai corsi per l'intera stagione sportiva.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {isExpiring && !hasActiveOrPending && (
                     <Alert variant="warning">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Abbonamento in Scadenza!</AlertTitle>
                        <AlertDescription>
                          Il tuo attuale abbonamento sta per scadere. Acquistalo per non perdere l'accesso ai corsi.
                        </AlertDescription>
                    </Alert>
                )}
                <div className="flex items-center justify-between text-lg">
                    <span className="text-muted-foreground">Prezzo</span>
                    <span className={`font-bold text-3xl ${totaleBonus > 0 ? 'line-through text-gray-400' : ''}`}>
                        {subscription.totalPrice.toFixed(2)} €
                    </span>
                </div>
                {totaleBonus > 0 && (
                    <div className="flex items-center justify-between text-lg">
                        <span className="text-muted-foreground">Prezzo finale dopo bonus:</span>
                        <span className="font-bold text-3xl text-green-600">
                            {Math.max(0, subscription.totalPrice - totaleBonus).toFixed(2)} €
                        </span>
                    </div>
                )}
                    {/* Finestra di acquisto */}
                    <div className="w-full text-center text-base font-bold mb-2" style={{ color: '#0ea5e9' }}>
                        Acquistabile dal {subscription.purchaseStartDate ? format(subscription.purchaseStartDate.toDate(), "dd MMMM yyyy", { locale: it }) : "-"} al {subscription.purchaseEndDate ? format(subscription.purchaseEndDate.toDate(), "dd MMMM yyyy", { locale: it }) : "-"}
                    </div>
                 <div className="space-y-2 rounded-md border p-4">
                     <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Valido dal</span>
                        <span className="font-semibold">{format(subscription.validityStartDate.toDate(), "dd MMMM yyyy", { locale: it })}</span>
                    </div>
                     <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Fino al</span>
                        <span className="font-semibold">{format(subscription.validityEndDate.toDate(), "dd MMMM yyyy", { locale: it })}</span>
                    </div>
                </div>
                 <ul className="space-y-2 text-sm pt-2">
                    <li className="flex items-center"><Zap className="h-4 w-4 mr-2 text-primary flex-shrink-0" /><span className="text-blue-600">Accesso a tutte le palestre della rete.</span></li>
                    <li className="flex items-center"><ShieldCheck className="h-4 w-4 mr-2 text-primary flex-shrink-0" /><span className="text-blue-600">La copertura assicurativa deve essere già attiva.</span></li>
                </ul>
            </CardContent>
            <CardFooter className="flex-col gap-2">
                 <Button 
                    onClick={() => {
                        // Se il bonus copre interamente l'importo, procedi direttamente con il pagamento bonus
                        if (totaleBonus >= subscription.totalPrice) {
                            onPurchase(subscription, 'bonus');
                        } else {
                            // Altrimenti apri il dialog di scelta pagamento
                            onOpenPaymentDialog();
                        }
                    }} 
                    disabled={isSubmitting || hasActiveOrPending || !isPurchaseWindowOpen}
                    className="w-full text-white font-bold bg-blue-600 hover:bg-blue-700" 
                    size="lg"
                >
                    {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : null}
                    {hasActiveOrPending ? "Pagamento in fase di approvazione" : !isPurchaseWindowOpen ? "Non ancora acquistabile" : totaleBonus >= subscription.totalPrice ? "Acquista con Bonus" : "Acquista Ora"}
                </Button>
                <Button asChild variant="outline" className="w-full bg-transparent border-2" style={{ color: 'hsl(var(--background))', borderColor: 'hsl(var(--background))' }}>
                    <Link href="/dashboard/subscriptions">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Torna Indietro
                    </Link>
                </Button>
            </CardFooter>
        </Card>
    );
}

export default function SeasonalSubscriptionPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center h-64"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>}>
            <SeasonalSubscriptionContent />
        </Suspense>
    )
}

function SeasonalSubscriptionContent() {
    const [user] = useAuthState(auth);
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [availableSubscription, setAvailableSubscription] = useState<Subscription | null>(null);
    const [userData, setUserData] = useState<UserData | null>(null);
    const [bankDetails, setBankDetails] = useState<BankDetails | null>(null);
    const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
    const [isBankTransferDialogOpen, setIsBankTransferDialogOpen] = useState(false);
    const [bonusDisponibili, setBonusDisponibili] = useState<{id: string, name: string, value: number, used?: boolean}[]>([]);
    const [totaleBonus, setTotaleBonus] = useState(0);

    useEffect(() => {
        // Listener rimborso bonus su pagamento fallito
        if (user) {
            import('firebase/firestore').then(({ collection, query, onSnapshot, where }) => {
                const paymentsRef = collection(db, 'users', user.uid, 'payments');
                const q = query(paymentsRef, where('status', '==', 'failed'));
                onSnapshot(q, async (snapshot) => {
                    snapshot.docChanges().forEach(async change => {
                        if (change.type === 'modified') {
                            const data = change.doc.data();
                            if (data.bonusUsed > 0 && data.awardId) {
                                console.log('[Pagamento fallito] Riaccredito bonus:', data);
                                
                                try {
                                    // Importa e usa la funzione di rimborso
                                    const { refundBonus } = await import('@/lib/refundBonus');
                                    await refundBonus(user.uid, data.awardId, data.bonusUsed);
                                    
                                    // Refresh bonus dopo rimborso
                                    const bonusSnap = await getDocs(collection(db, "users", user.uid, "userAwards"));
                                    const bonus = await Promise.all(bonusSnap.docs.map(async docSnap => {
                                        const data = docSnap.data();
                                        let name = data.name;
                                        let value = data.value || 0;
                                        let residuo = data.residuo || 0;
                                        
                                        if (!data.value && data.awardId) {
                                            const awardDoc = await getDoc(doc(db, "awards", data.awardId));
                                            if (awardDoc.exists()) {
                                                name = awardDoc.data().name;
                                                value = awardDoc.data().value || 0;
                                                residuo = value - (data.usedValue || 0);
                                            }
                                        }
                                        
                                        return {
                                            id: docSnap.id,
                                            name: name,
                                            value: residuo,
                                            used: data.used || residuo === 0
                                        };
                                    }));
                                    
                                    // ⚠️ FILTRO CRITICO: Esclude solo premi specificamente non spendibili
                                    const bonusNonUsati = bonus.filter(b => 
                                        !b.used && 
                                        b.value > 0 && 
                                        isPremioSpendibile(b)
                                    );
                                    setBonusDisponibili(bonusNonUsati);
                                    setTotaleBonus(bonusNonUsati.reduce((acc, b) => acc + (b.value || 0), 0));
                                    
                                    toast({
                                        title: "Bonus riaccreditato",
                                        description: `Il tuo bonus di ${data.bonusUsed}€ è stato riaccreditato perché il pagamento non è stato accettato.`,
                                        variant: "success"
                                    });
                                } catch (error) {
                                    console.error('Errore durante il rimborso bonus:', error);
                                }
                            }
                        }
                    });
                });
            });
        }
        if (!user) {
            setLoading(false);
            return;
        }
        
        const fetchAll = async () => {
            try {
                // Bonus: recupera dati dalla sottocollezione utente
                const bonusSnap = await getDocs(collection(db, "users", user.uid, "userAwards"));
                const bonus = await Promise.all(bonusSnap.docs.map(async docSnap => {
                    const data = docSnap.data();
                    let name = data.name;
                    let value = data.value || 0;
                    let residuo = data.residuo || 0;
                    
                    // Se non c'è il campo residuo, recupera dal documento awards
                    if (!data.value && data.awardId) {
                        const awardDoc = await getDoc(doc(db, "awards", data.awardId));
                        if (awardDoc.exists()) {
                            name = awardDoc.data().name;
                            value = awardDoc.data().value || 0;
                            residuo = value - (data.usedValue || 0);
                        }
                    }
                    
                    return {
                        id: docSnap.id,
                        name: name,  // Necessario per il filtering
                        value: residuo, // Usa il residuo come valore disponibile
                        used: data.used || residuo === 0
                    };
                }));
                
                // ⚠️ FILTRO CRITICO: Esclude solo premi specificamente non spendibili
                const bonusNonUsati = bonus.filter(b => 
                    !b.used && 
                    b.value > 0 && 
                    isPremioSpendibile(b)
                );
                setBonusDisponibili(bonusNonUsati);
                setTotaleBonus(bonusNonUsati.reduce((acc, b) => acc + (b.value || 0), 0));

                const [subsSnapshot, userDocSnap, bankDetailsSnap] = await Promise.all([
                    getDocs(query(collection(db, "subscriptions"), where("type", "==", "seasonal"))),
                    getDoc(doc(db, "users", user.uid)),
                    getDoc(doc(db, "settings", "bankDetails"))
                ]);

                if (bankDetailsSnap.exists()) {
                    setBankDetails(bankDetailsSnap.data() as BankDetails);
                }

                const allSeasonalSubs = subsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Subscription));
                const currentUserData = userDocSnap.exists() ? userDocSnap.data() as UserData : null;
                setUserData(currentUserData);

                // Scegli abbonamento stagionale da mostrare
                const now = new Date();
                let subToShow: Subscription | null = null;
                if (allSeasonalSubs.length > 0) {
                    // Priorità 1: finestra acquisto attiva
                    const purchasableSub = allSeasonalSubs.find(sub =>
                        sub.purchaseStartDate && sub.purchaseEndDate ?
                        isAfter(now, sub.purchaseStartDate.toDate()) && isBefore(now, sub.purchaseEndDate.toDate())
                        : true
                    );
                    if (purchasableSub) {
                        subToShow = purchasableSub;
                    } else {
                        // Priorità 2: validità copre oggi
                        const validSub = allSeasonalSubs.find(sub =>
                            isAfter(now, sub.validityStartDate.toDate()) && isBefore(now, sub.validityEndDate.toDate())
                        );
                        if (validSub) {
                            subToShow = validSub;
                        } else {
                            // Priorità 3: abbonamento futuro acquistabile
                            const futureSubs = allSeasonalSubs
                                .filter(sub => sub.purchaseStartDate && isAfter(sub.purchaseStartDate.toDate(), now))
                                .sort((a, b) => a.purchaseStartDate!.toMillis() - b.purchaseStartDate!.toMillis());
                            if (futureSubs.length > 0) {
                                subToShow = futureSubs[0];
                            }
                        }
                    }
                }
                setAvailableSubscription(subToShow);
            } catch (error) {
                console.error("Error fetching dati:", error);
                toast({ title: "Errore", description: "Impossibile caricare i dati.", variant: "destructive" });
            } finally {
                setLoading(false);
            }
        };
        fetchAll();
    }, [user, toast]);

    // Reset metodo pagamento se selezionato "online" e ci sono bonus
    useEffect(() => {
        if (totaleBonus > 0 && selectedPaymentMethod === 'online') {
            setSelectedPaymentMethod(null);
        }
    }, [totaleBonus, selectedPaymentMethod]);

    const handlePurchase = async (subscription: Subscription, method: PaymentMethod) => {
        setIsSubmitting(true);
        try {
            // Controllo: impedisci pagamento online se si usano bonus
            if (method === 'online' && totaleBonus > 0) {
                toast({ 
                    title: "Metodo di pagamento non valido", 
                    description: "Il pagamento online non è disponibile quando si utilizzano bonus.", 
                    variant: "destructive" 
                });
                setIsSubmitting(false);
                return;
            }

            const batch = writeBatch(db);
            const userRef = doc(db, "users", user!.uid);
            
            // Calcola bonus da utilizzare SEMPRE (se disponibili)
            let bonusUsed = 0;
            let awardIdsUsati: string[] = [];
            let prezzoResiduo = subscription.totalPrice;
            
            // Utilizza automaticamente tutti i bonus disponibili
            for (const bonus of bonusDisponibili) {
                if (prezzoResiduo <= 0) break;
                const useAmount = Math.min(bonus.value, prezzoResiduo);
                bonusUsed += useAmount;
                prezzoResiduo -= useAmount;
                awardIdsUsati.push(bonus.id);
                
                // Aggiorna il bonus nel database
                const bonusDocRef = doc(db, "users", user!.uid, "userAwards", bonus.id);
                const bonusDocSnap = await getDoc(bonusDocRef);
                
                if (bonusDocSnap.exists()) {
                    const currentData = bonusDocSnap.data();
                    const valoreIniziale = currentData.value || 0;
                    const usedValuePrecedente = currentData.usedValue || 0;
                    const nuovoUsedValue = usedValuePrecedente + useAmount;
                    const residuo = Math.max(0, valoreIniziale - nuovoUsedValue);
                    
                    batch.update(bonusDocRef, {
                        used: residuo === 0,
                        usedValue: nuovoUsedValue,
                        residuo: residuo
                    });
                }
            }
            
            batch.update(userRef, {
                subscriptionAccessStatus: 'pending',
                subscriptionPaymentFailed: false,
                activeSubscription: {
                    subscriptionId: subscription.id,
                    name: subscription.name,
                    type: subscription.type,
                    purchasedAt: serverTimestamp(),
                    expiresAt: subscription.validityEndDate,
                }
            });
            await batch.commit();
            
            // REFRESH BONUS DOPO L'ACQUISTO
            const bonusSnapRefresh = await getDocs(collection(db, "users", user!.uid, "userAwards"));
            const bonusRefresh = await Promise.all(bonusSnapRefresh.docs.map(async docSnap => {
                const data = docSnap.data();
                let name = data.name;
                let value = data.value || 0;
                let residuo = data.residuo || 0;
                
                if (!data.value && data.awardId) {
                    const awardDoc = await getDoc(doc(db, "awards", data.awardId));
                    if (awardDoc.exists()) {
                        name = awardDoc.data().name;
                        value = awardDoc.data().value || 0;
                        residuo = value - (data.usedValue || 0);
                    }
                }
                
                return {
                    id: docSnap.id,
                    name: name,
                    value: residuo,
                    used: data.used || residuo === 0
                };
            }));
            
            // ⚠️ FILTRO CRITICO: Esclude solo premi specificamente non spendibili
            const bonusNonUsatiRefresh = bonusRefresh.filter(b => 
                !b.used && 
                b.value > 0 && 
                isPremioSpendibile(b)
            );
            setBonusDisponibili(bonusNonUsatiRefresh);
            setTotaleBonus(bonusNonUsatiRefresh.reduce((acc, b) => acc + (b.value || 0), 0));
            
            // Registra pagamento
            const paymentsRef = collection(db, "users", user!.uid, "payments");
            const finalAmount = Math.max(0, subscription.totalPrice - bonusUsed);
            const description = bonusUsed > 0 
                ? `${subscription.name} (${subscription.totalPrice.toFixed(2)} €) - Bonus`
                : `${subscription.name} (${subscription.totalPrice.toFixed(2)} €)`;
            
            const paymentData: any = {
                createdAt: serverTimestamp(),
                description: description,
                amount: finalAmount,
                paymentMethod: finalAmount === 0 ? 'bonus' : method, // Se importo è 0, usa 'bonus'
                status: 'pending',
                type: 'subscription',
                userId: user!.uid,
            };
            
            // Aggiungi informazioni sui bonus se utilizzati
            if (bonusUsed > 0) {
                paymentData.bonusUsed = bonusUsed;
                paymentData.awardId = awardIdsUsati.length === 1 ? awardIdsUsati[0] : awardIdsUsati;
            }
            
            await addDoc(paymentsRef, paymentData);

            // Assegna automaticamente il Premio Presenze
            const premiResult = await assignPremiPresenze(user!.uid, 'seasonal');
            if (premiResult.success) {
                showPremiPresenzeMessage(
                    premiResult.premioValue,
                    premiResult.subscriptionType ?? "seasonal",
                    toast
                );
            } else {
                showPremiPresenzeErrorMessage(toast);
            }

            toast({ 
                title: "Richiesta Inviata!", 
                description: bonusUsed > 0 
                    ? `Pagamento: €${Math.max(0, subscription.totalPrice - bonusUsed).toFixed(2)}. Bonus usati: €${bonusUsed.toFixed(2)}.`
                    : "La tua richiesta di abbonamento stagionale è in attesa di approvazione."
            });
            if (method === 'online' && subscription.sumupLink && Math.max(0, subscription.totalPrice - bonusUsed) > 0) {
                window.open(subscription.sumupLink, '_blank');
            }
            setUserData(prev => prev ? ({...prev, subscriptionAccessStatus: 'pending', subscriptionPaymentFailed: false}) : null);
            
            // Aggiorna bonus dopo l'uso
            if (bonusUsed > 0) {
                setBonusDisponibili([]);
                setTotaleBonus(0);
            }
            
            setIsPaymentDialogOpen(false);
            window.location.href = '/dashboard';
        } catch (error) {
            console.error("Error purchasing subscription: ", error);
            toast({ title: "Errore", description: "Impossibile completare l'acquisto. Riprova.", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlePaymentDialogSubmit = () => {
        if (!availableSubscription || !selectedPaymentMethod) {
            toast({ title: "Selezione mancante", description: "Per favore, scegli un metodo di pagamento.", variant: "destructive" });
            return;
        }
        if (selectedPaymentMethod === 'bank_transfer') {
            setIsBankTransferDialogOpen(true);
        } else {
            handlePurchase(availableSubscription, selectedPaymentMethod);
        }
    };

    const handleBankTransferConfirm = () => {
        if (availableSubscription) {
            handlePurchase(availableSubscription, 'bank_transfer');
            window.location.href = '/dashboard';
        }
        setIsBankTransferDialogOpen(false);
    };

    if (loading) {
        return (
            <div className="flex h-full w-full items-center justify-center">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </div>
        );
    }
    
    const hasActiveOrPending = userData?.subscriptionAccessStatus === 'active' || userData?.subscriptionAccessStatus === 'pending';

    return (
        <div className="flex w-full flex-col items-center justify-center">
            {availableSubscription ? (
                <>
                    <SubscriptionCard 
                        subscription={availableSubscription} 
                        onPurchase={handlePurchase}
                        isSubmitting={isSubmitting}
                        hasActiveOrPending={!!hasActiveOrPending}
                        onOpenPaymentDialog={() => setIsPaymentDialogOpen(true)}
                        totaleBonus={totaleBonus}
                    />
                    {/* Messaggio abbonamento in attesa */}
                    {userData?.subscriptionAccessStatus === 'pending' && (
                        <div className="w-full max-w-lg my-4 p-4 rounded-lg border-2 font-semibold text-base text-center" style={{ background: '#FFF6E5', color: 'hsl(var(--primary))', borderColor: 'hsl(var(--primary))' }}>
                            <div className="mb-2 text-xl font-bold">Abbonamento in Attesa</div>
                            Il tuo accesso ai corsi sarà attivato non appena il pagamento del tuo abbonamento verrà confermato dalla segreteria.
                        </div>
                    )}
                    {/* Bonus disponibili e totale */}
                    <div className="w-full max-w-lg my-4 p-4 border-2 rounded-lg bg-green-50" style={{ borderColor: '#10b981' }}>
                        <div className="flex items-center gap-2 mb-2">
                            <Gift className="h-6 w-6 text-yellow-500" />
                            <span className="font-bold" style={{ color: '#059669' }}>Bonus disponibili:</span>
                            <span className="text-lg font-bold" style={{ color: '#059669' }}>€{totaleBonus.toFixed(2)}</span>
                        </div>
                        {bonusDisponibili.length > 0 ? (
                            <ul className="text-sm">
                                {bonusDisponibili.map(b => (
                                    <li key={b.id} className="flex justify-between">
                                        <span className="font-bold" style={{ color: '#059669' }}>ID: {b.id}</span>
                                        <span className="font-bold" style={{ color: '#059669' }}>Valore: €{typeof b.value === "number" ? b.value.toFixed(2) : "0.00"}</span>
                                    </li>
                                ))}
                            </ul>
                        ) : <span className="text-muted-foreground">Nessun bonus disponibile</span>}
                    </div>
                    
                    <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
                        <DialogContent className="bg-gray-100 [&>button]:text-[hsl(var(--background))]">
                            <DialogHeader>
                                <DialogTitle style={{ color: 'hsl(var(--background))' }}>Scegli Metodo di Pagamento</DialogTitle>
                                <DialogDescription className="text-base">
                                    Riepilogo abbonamento stagionale
                                </DialogDescription>
                                <div className="space-y-1 mt-2">
                                    <div className="flex justify-between">
                                        <span>Prezzo abbonamento:</span>
                                        <span>{totaleBonus > 0 ? (
                                            <span style={{ textDecoration: 'line-through', color: '#888', fontWeight: 'bold' }}>€{availableSubscription.totalPrice.toFixed(2)}</span>
                                        ) : (
                                            <b>€{availableSubscription.totalPrice.toFixed(2)}</b>
                                        )}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Bonus utilizzabili:</span>
                                        <b>€{totaleBonus.toFixed(2)}</b>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Prezzo finale dopo bonus:</span>
                                        <span className="font-bold" style={{ color: '#059669' }}>€{Math.max(0, availableSubscription.totalPrice - totaleBonus).toFixed(2)}</span>
                                    </div>
                                    {totaleBonus >= availableSubscription.totalPrice && (
                                        <div className="text-center mt-2">
                                            <span className="font-bold" style={{ color: '#059669' }}>Il tuo abbonamento è completamente coperto dai bonus!</span>
                                        </div>
                                    )}
                                </div>
                            </DialogHeader>
                            {Math.max(0, availableSubscription.totalPrice - totaleBonus) > 0 ? (
                                <RadioGroup
                                    value={selectedPaymentMethod || ""}
                                    onValueChange={(value: string) => setSelectedPaymentMethod(value as PaymentMethod)}
                                    className="space-y-4 py-4"
                                >
                                   {/* Carta di credito - Disabilitata se si usano bonus */}
                                   <Label
                                        htmlFor="online"
                                        className={`flex cursor-pointer items-start space-x-4 rounded-md border-2 p-4 transition-all bg-white hover:bg-accent/50 has-[:checked]:border-primary has-[:checked]:bg-primary/5 ${
                                            totaleBonus > 0 ? 'opacity-50 cursor-not-allowed' : ''
                                        }`}
                                        style={{ borderColor: 'hsl(var(--background))' }}
                                    >
                                        <RadioGroupItem 
                                            value="online" 
                                            id="online" 
                                            className="mt-1" 
                                            style={{ borderColor: 'hsl(var(--background))' }}
                                            disabled={totaleBonus > 0}
                                        />
                                        <div className="flex-1 space-y-1">
                                            <h4 className="font-semibold" style={{ color: 'hsl(var(--background))' }}>
                                                Online (Carta di Credito)
                                                {totaleBonus > 0 && <span className="text-red-500 ml-2">(Non disponibile con bonus)</span>}
                                            </h4>
                                            <p className="text-sm text-muted-foreground">
                                                {totaleBonus > 0 ? 
                                                    "Il pagamento online non è disponibile quando si utilizzano bonus. Utilizza bonifico bancario o pagamento in sede." :
                                                    "Paga in modo sicuro con SumUp. Verrai reindirizzato al sito del gestore, a pagamento effettuato torna all'app per conferma e concludere l'iscrizione ai corsi."
                                                }
                                            </p>
                                        </div>
                                        <CreditCard className={`h-6 w-6 ${totaleBonus > 0 ? 'text-gray-400' : 'text-muted-foreground'}`} />
                                    </Label>
                                    <Label
                                        htmlFor="bank_transfer"
                                        className="flex cursor-pointer items-start space-x-4 rounded-md border-2 p-4 transition-all bg-white hover:bg-accent/50 has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                                        style={{ borderColor: 'hsl(var(--background))' }}
                                    >
                                        <RadioGroupItem value="bank_transfer" id="bank_transfer" className="mt-1" style={{ borderColor: 'hsl(var(--background))' }} />
                                        <div className="flex-1 space-y-1">
                                            <h4 className="font-semibold" style={{ color: 'hsl(var(--background))' }}>Bonifico Bancario</h4>
                                            <p className="text-sm text-muted-foreground">
                                                Visualizza i dati per effettuare il bonifico. L'attivazione richiede verifica manuale.
                                            </p>
                                        </div>
                                        <University className="h-6 w-6 text-muted-foreground" />
                                    </Label>
                                    <Label
                                        htmlFor="in_person"
                                        className="flex cursor-pointer items-start space-x-4 rounded-md border-2 p-4 transition-all bg-white hover:bg-accent/50 has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                                        style={{ borderColor: 'hsl(var(--background))' }}
                                    >
                                        <RadioGroupItem value="in_person" id="in_person" className="mt-1" style={{ borderColor: 'hsl(var(--background))' }} />
                                        <div className="flex-1 space-y-1">
                                            <h4 className="font-semibold" style={{ color: 'hsl(var(--background))' }}>In Sede (Contanti o Bancomat)</h4>
                                            <p className="text-sm text-muted-foreground">
                                               Paga direttamente in palestra. L'attivazione richiede verifica manuale.
                                            </p>
                                        </div>
                                        <Landmark className="h-6 w-6 text-muted-foreground" />
                                    </Label>
                                </RadioGroup>
                            ) : (
                                <div className="py-4 text-center text-green-700 font-semibold">Il tuo abbonamento è interamente coperto dai bonus. Nessun pagamento richiesto.</div>
                            )}
                            <DialogFooter className="justify-between gap-8 px-4">
                                <Button variant="ghost" onClick={() => setIsPaymentDialogOpen(false)} className="bg-transparent border-2" style={{ borderColor: 'hsl(var(--background))', color: 'hsl(var(--background))' }}>Annulla</Button>
                                <Button
                                    onClick={() => {
                                        if (Math.max(0, availableSubscription.totalPrice - totaleBonus) === 0) {
                                            handlePurchase(availableSubscription, "bonus");
                                        } else {
                                            handlePaymentDialogSubmit();
                                        }
                                    }}
                                    disabled={isSubmitting}
                                    className="text-white font-bold"
                                    style={{ backgroundColor: 'hsl(var(--primary))' }}
                                    size="lg"
                                >
                                    {isSubmitting && <Loader2 className="animate-spin mr-2" />}
                                    Conferma
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                    
                    <Dialog open={isBankTransferDialogOpen} onOpenChange={setIsBankTransferDialogOpen}>
                        <DialogContent className="bg-gray-100 [&>button]:text-[hsl(var(--background))]">
                            <DialogHeader>
                                <DialogTitle style={{ color: 'hsl(var(--background))' }}>Dati per Bonifico Bancario</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4 text-sm">
                                {bankDetails ? (
                                    <>
                                        <div className="space-y-1"><p className="font-semibold text-black">Intestatario:</p><p className="text-black">{bankDetails.recipientName}</p></div>
                                        <div className="space-y-1"><p className="font-semibold text-black">Banca:</p><p className="text-black">{bankDetails.bankName}</p></div>
                                        <div className="space-y-1"><p className="font-semibold text-black">IBAN:</p><p className="font-mono bg-muted p-2 rounded-md text-black">{bankDetails.iban}</p></div>
                                    </>
                                ) : <Loader2 className="h-6 w-6 animate-spin" />}
                                <div className="space-y-1"><p className="font-semibold text-black">Importo:</p><p className="text-black">{availableSubscription.totalPrice.toFixed(2)} €</p></div>
                                <div className="space-y-1"><p className="font-semibold text-black">Causale:</p><p className="font-mono bg-muted p-2 rounded-md text-black">{`${availableSubscription.name} ${userData?.name || ''} ${userData?.surname || ''}`.trim()}</p></div>
                            </div>
                            <DialogFooter>
                                <Button onClick={handleBankTransferConfirm} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold">Ho copiato i dati, invia richiesta</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </>
            ) : (
                <Card className="w-full max-w-lg">
                    <CardHeader>
                        <CardTitle>Nessun Abbonamento Disponibile</CardTitle>
                        <CardDescription>
                           Al momento non ci sono abbonamenti stagionali acquistabili. Contatta la segreteria per maggiori informazioni.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col items-center justify-center h-48 text-center text-muted-foreground border-2 border-dashed rounded-lg">
                            <CalendarClock className="h-16 w-16 mb-4" />
                            <p>Torna a trovarci presto!</p>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button asChild variant="outline" className="w-full">
                            <Link href="/dashboard/subscriptions">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Torna Indietro
                            </Link>
                        </Button>
                    </CardFooter>
                </Card>
            )}
        </div>
    );
}