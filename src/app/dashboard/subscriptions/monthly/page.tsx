"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { doc, getDoc, Timestamp, collection, getDocs, query, where, writeBatch, serverTimestamp, addDoc } from "firebase/firestore"
import { db, auth } from "@/lib/firebase"
import { useAuthState } from "react-firebase-hooks/auth"
import { useToast } from "@/hooks/use-toast"
import { format, isAfter, isBefore, startOfMonth, endOfMonth, addMonths } from "date-fns"
import { Gift } from "lucide-react"
import { assignPremiPresenze } from "@/lib/assignPremiPresenze"
import { showPremiPresenzeMessage, showPremiPresenzeErrorMessage } from "@/lib/premiPresenzeMessages"
import { it } from "date-fns/locale"
import Link from "next/link"

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, CalendarClock, ArrowLeft, ShieldCheck, Zap, AlertTriangle, CreditCard, Landmark, University } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"

// =================================================================
// TIPI E INTERFACCE SEMPLIFICATE
// =================================================================

interface Subscription {
    id: string;
    name: string;
    type: 'monthly' | 'seasonal';
    totalPrice: number;
    sumupLink: string;
    validityStartDate: Timestamp;
    validityEndDate: Timestamp;
}

interface UserData {
    name?: string;
    surname?: string;
    activeSubscription?: {
        subscriptionId: string;
        expiresAt?: Timestamp;
    };
    subscriptionAccessStatus?: 'active' | 'pending' | 'expired';
}

interface BonusItem {
    id: string;
    value: number;
    used?: boolean;
}

interface BankDetails {
    recipientName: string;
    bankName: string;
    iban: string;
}

type PaymentMethod = "online" | "in_person" | "bank_transfer" | "bonus";

// =================================================================
// HELPER FUNCTIONS SEMPLIFICATE
// =================================================================

/**
 * Logica semplificata per trovare l'abbonamento mensile da mostrare
 * Mostra sempre l'abbonamento ACQUISTABILE, non quello già posseduto
 */
function findAvailableSubscription(subscriptions: Subscription[], userData: UserData | null): Subscription | null {
    if (subscriptions.length === 0) return null;
    
    const now = new Date();
    
    // Filtra gli abbonamenti che l'utente può acquistare (non quelli già posseduti)
    const purchasableSubscriptions = subscriptions.filter(sub => {
        // Se l'utente ha già questo abbonamento attivo, non mostrarlo come acquistabile
        if (userData?.activeSubscription?.subscriptionId === sub.id) {
            console.log(`🔥🔥🔥 [NUOVA LOGICA] Skipping ${sub.name} - user already has this subscription`);
            return false;
        }
        
        // Mostra abbonamenti per il mese corrente o futuro, ma non passati
        const validityStart = sub.validityStartDate.toDate();
        const validityEnd = sub.validityEndDate.toDate();
        
        // Se l'abbonamento è completamente passato, non mostrarlo
        if (validityEnd < now) {
            console.log(`🔥🔥🔥 [NUOVA LOGICA] Skipping ${sub.name} - completely expired`);
            return false;
        }
        
        // Se l'abbonamento inizia nel futuro, è acquistabile
        if (validityStart > now) {
            console.log(`🔥🔥🔥 [NUOVA LOGICA] ${sub.name} is purchasable - starts in future`);
            return true;
        }
        
        // Se l'abbonamento è in corso ma l'utente non lo ha acquistato, potrebbe essere acquistabile
        // (caso edge: abbonamento di ottobre iniziato ma utente non l'ha ancora comprato)
        console.log(`🔥🔥🔥 [NUOVA LOGICA] ${sub.name} is current and purchasable`);
        return true;
    });
    
    if (purchasableSubscriptions.length === 0) {
        console.log('🔥🔥🔥 [NUOVA LOGICA] No purchasable subscriptions found');
        return null;
    }
    
    // Ordina per data di inizio validità e prendi il primo disponibile
    const sortedSubs = purchasableSubscriptions
        .sort((a, b) => a.validityStartDate.toMillis() - b.validityStartDate.toMillis());
    
    console.log('🔥🔥🔥 [NUOVA LOGICA] Purchasable subscriptions:', sortedSubs.map(s => s.name));
    return sortedSubs[0];
}

/**
 * Calcola quanto bonus può essere utilizzato per un abbonamento
 */
function calculateBonusUsage(bonusItems: BonusItem[], subscriptionPrice: number) {
    let totalBonus = 0;
    let bonusToUse: {id: string, value: number}[] = [];
    let remainingPrice = subscriptionPrice;
    
    for (const bonus of bonusItems) {
        if (remainingPrice <= 0) break;
        
        const useAmount = Math.min(bonus.value, remainingPrice);
        totalBonus += useAmount;
        remainingPrice -= useAmount;
        bonusToUse.push({ id: bonus.id, value: useAmount });
    }
    
    return {
        totalBonus,
        bonusToUse,
        finalPrice: Math.max(0, subscriptionPrice - totalBonus)
    };
}

/**
 * Carica i bonus disponibili dell'utente
 */
async function loadUserBonus(userId: string): Promise<BonusItem[]> {
    const bonusSnap = await getDocs(collection(db, "users", userId, "userAwards"));
    const bonus = await Promise.all(bonusSnap.docs.map(async docSnap => {
        const data = docSnap.data();
        let value = data.value || 0;
        let residuo = data.residuo || 0;
        
        // Recupera valore dal documento awards se necessario
        if (!data.value && data.awardId) {
            const awardDoc = await getDoc(doc(db, "awards", data.awardId));
            if (awardDoc.exists()) {
                value = awardDoc.data().value || 0;
                residuo = value - (data.usedValue || 0);
            }
        }
        
        return {
            id: docSnap.id,
            value: residuo,
            used: data.used || residuo === 0
        };
    }));
    
    return bonus.filter(b => !b.used && b.value > 0);
}

// =================================================================
// COMPONENTI
// =================================================================

function SubscriptionCard({ 
    subscription, 
    onPurchase, 
    isSubmitting, 
    hasActiveOrPending, 
    onOpenPaymentDialog, 
    bonusCalculation 
}: { 
    subscription: Subscription; 
    onPurchase: (sub: Subscription, method: PaymentMethod) => void; 
    isSubmitting: boolean; 
    hasActiveOrPending: boolean; 
    onOpenPaymentDialog: () => void; 
    bonusCalculation: ReturnType<typeof calculateBonusUsage>;
}) {
    const now = new Date();
    const isExpired = isAfter(now, subscription.validityEndDate.toDate());
    
    return (
        <Card className="w-full max-w-lg border-4 bg-gray-50" style={{ borderColor: 'hsl(var(--primary))' }}>
            <CardHeader>
                <CardTitle className="text-2xl">{subscription.name}</CardTitle>
                <CardDescription>
                    Abbonamento mensile per l'accesso a tutti i corsi.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-lg">
                    <span className="text-muted-foreground">Prezzo</span>
                    <span className={`font-bold text-3xl ${bonusCalculation.totalBonus > 0 ? 'line-through text-gray-400' : ''}`}>
                        {subscription.totalPrice.toFixed(2)} €
                    </span>
                </div>
                
                {bonusCalculation.totalBonus > 0 && (
                    <div className="flex items-center justify-between text-lg">
                        <span className="text-muted-foreground">Prezzo finale dopo bonus:</span>
                        <span className="font-bold text-3xl text-green-600">
                            {bonusCalculation.finalPrice.toFixed(2)} €
                        </span>
                    </div>
                )}
                
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
                    <li className="flex items-center">
                        <Zap className="h-4 w-4 mr-2 text-primary flex-shrink-0" />
                        <span style={{ color: 'hsl(var(--primary))' }}>Attivazione rapida dopo conferma del pagamento</span>
                    </li>
                    <li className="flex items-center">
                        <ShieldCheck className="h-4 w-4 mr-2 text-primary flex-shrink-0" />
                        <span style={{ color: 'hsl(var(--primary))' }}>Copertura assicurativa richiesta</span>
                    </li>
                </ul>
            </CardContent>
            <CardFooter className="flex-col gap-2">
                <Button 
                    onClick={() => {
                        if (bonusCalculation.finalPrice === 0) {
                            onPurchase(subscription, 'bonus');
                        } else {
                            onOpenPaymentDialog();
                        }
                    }} 
                    disabled={isSubmitting || hasActiveOrPending || isExpired}
                    className="w-full text-white font-bold" 
                    size="lg"
                    style={{ backgroundColor: 'hsl(var(--primary))' }}
                >
                    {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : null}
                    {hasActiveOrPending ? "Pagamento in fase di approvazione" : 
                     isExpired ? "Abbonamento scaduto" :
                     bonusCalculation.finalPrice === 0 ? "Acquista con Bonus" : "Acquista Ora"}
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

function BonusDisplay({ bonusItems, bonusCalculation }: { bonusItems: BonusItem[], bonusCalculation: ReturnType<typeof calculateBonusUsage> }) {
    return (
        <div className="w-full max-w-lg my-4 p-4 border-2 rounded-lg bg-green-50" style={{ borderColor: '#10b981' }}>
            <div className="flex items-center gap-2 mb-2">
                <Gift className="h-6 w-6 text-yellow-500" />
                <span className="font-bold" style={{ color: '#059669' }}>Bonus disponibili:</span>
                <span className="text-lg font-bold" style={{ color: '#059669' }}>€{bonusCalculation.totalBonus.toFixed(2)}</span>
            </div>
            {bonusItems.length > 0 ? (
                <ul className="text-sm">
                    {bonusItems.map(b => (
                        <li key={b.id} className="flex justify-between">
                            <span className="font-bold" style={{ color: '#059669' }}>ID: {b.id}</span>
                            <span className="font-bold" style={{ color: '#059669' }}>€{b.value.toFixed(2)}</span>
                        </li>
                    ))}
                </ul>
            ) : (
                <span className="text-muted-foreground">Nessun bonus disponibile</span>
            )}
        </div>
    );
}

// =================================================================
// COMPONENTE PRINCIPALE
// =================================================================

export default function MonthlySubscriptionPage() {
    const [user] = useAuthState(auth);
    const searchParams = useSearchParams();
    const impersonateId = searchParams.get('impersonate');
    const effectiveUserId = impersonateId || user?.uid;
    
    const router = useRouter();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [availableSubscription, setAvailableSubscription] = useState<Subscription | null>(null);
    const [userData, setUserData] = useState<UserData | null>(null);
    const [bankDetails, setBankDetails] = useState<BankDetails | null>(null);
    const [bonusItems, setBonusItems] = useState<BonusItem[]>([]);
    const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
    const [isBankTransferDialogOpen, setIsBankTransferDialogOpen] = useState(false);

    const bonusCalculation = availableSubscription ? 
        calculateBonusUsage(bonusItems, availableSubscription.totalPrice) : 
        { totalBonus: 0, bonusToUse: [], finalPrice: 0 };

    // Carica tutti i dati
    useEffect(() => {
        if (!effectiveUserId) {
            setLoading(false);
            return;
        }

        const fetchData = async () => {
            try {
                // Carica tutti i dati in parallelo
                const [subsSnapshot, userDocSnap, bankDetailsSnap, bonusData] = await Promise.all([
                    getDocs(query(collection(db, "subscriptions"), where("type", "==", "monthly"))),
                    getDoc(doc(db, "users", effectiveUserId)),
                    getDoc(doc(db, "settings", "bankDetails")),
                    loadUserBonus(effectiveUserId)
                ]);

                // Abbonamenti
                const allMonthlySubs = subsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Subscription));
                
                // Dati utente (da caricare prima della selezione abbonamento)
                const currentUserData = userDocSnap.exists() ? userDocSnap.data() as UserData : null;
                setUserData(currentUserData);
                
                // Debug logging
                console.log('🔥🔥🔥 [NUOVA LOGICA ATTIVA] Monthly Subs Debug - Current date:', new Date());
                console.log('🔥🔥🔥 [NUOVA LOGICA ATTIVA] User data:', {
                    hasActiveSubscription: !!currentUserData?.activeSubscription,
                    activeSubscriptionId: currentUserData?.activeSubscription?.subscriptionId,
                    subscriptionStatus: currentUserData?.subscriptionAccessStatus
                });
                console.log('🔥🔥🔥 [NUOVA LOGICA ATTIVA] All subscriptions:', allMonthlySubs.map(sub => ({
                    id: sub.id,
                    name: sub.name,
                    validityStart: sub.validityStartDate?.toDate?.(),
                    validityEnd: sub.validityEndDate?.toDate?.()
                })));
                
                const selectedSub = findAvailableSubscription(allMonthlySubs, currentUserData);
                console.log('🔥🔥🔥 [NUOVA LOGICA ATTIVA] Selected subscription:', selectedSub?.name || 'None');
                
                setAvailableSubscription(selectedSub);

                // Dati bancari
                if (bankDetailsSnap.exists()) {
                    setBankDetails(bankDetailsSnap.data() as BankDetails);
                }

                // Bonus
                setBonusItems(bonusData);

            } catch (error) {
                console.error("Error fetching data:", error);
                toast({ title: "Errore", description: "Impossibile caricare i dati.", variant: "destructive" });
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [effectiveUserId, toast]);

    // Gestisce l'acquisto
    const handlePurchase = async (subscription: Subscription, method: PaymentMethod) => {
        if (!effectiveUserId) return;
        
        setIsSubmitting(true);
        try {
            const calculation = calculateBonusUsage(bonusItems, subscription.totalPrice);
            
            // Aggiorna stato utente
            const batch = writeBatch(db);
            const userRef = doc(db, "users", effectiveUserId);
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

            // Aggiorna bonus utilizzati
            for (const bonusUsed of calculation.bonusToUse) {
                const bonusDocRef = doc(db, "users", effectiveUserId, "userAwards", bonusUsed.id);
                const bonusDocSnap = await getDoc(bonusDocRef);
                
                if (bonusDocSnap.exists()) {
                    const currentData = bonusDocSnap.data();
                    const usedValuePrecedente = currentData.usedValue || 0;
                    const nuovoUsedValue = usedValuePrecedente + bonusUsed.value;
                    const residuo = Math.max(0, currentData.value - nuovoUsedValue);
                    
                    batch.update(bonusDocRef, {
                        used: residuo === 0,
                        usedValue: nuovoUsedValue,
                        residuo: residuo
                    });
                }
            }

            await batch.commit();

            // Registra pagamento
            const paymentsRef = collection(db, "users", effectiveUserId, "payments");
            await addDoc(paymentsRef, {
                createdAt: serverTimestamp(),
                description: `${subscription.name} - ${calculation.totalBonus > 0 ? 'Con Bonus' : 'Pagamento Standard'}`,
                amount: calculation.finalPrice,
                paymentMethod: calculation.finalPrice === 0 ? 'bonus' : method,
                status: 'pending',
                type: 'subscription',
                userId: effectiveUserId,
                bonusUsed: calculation.totalBonus,
                awardId: calculation.bonusToUse.length === 1 ? calculation.bonusToUse[0].id : calculation.bonusToUse.map(b => b.id)
            });

            // Assegna premio presenze
            const premiResult = await assignPremiPresenze(effectiveUserId, 'monthly');
            if (premiResult.success) {
                showPremiPresenzeMessage(premiResult.premioValue, premiResult.subscriptionType ?? "monthly", toast);
            } else {
                showPremiPresenzeErrorMessage(toast);
            }

            toast({ 
                title: "Acquisto completato!", 
                description: `Pagamento: €${calculation.finalPrice.toFixed(2)}. Bonus utilizzati: €${calculation.totalBonus.toFixed(2)}.`
            });

            // Apri link pagamento se necessario
            if (method === 'online' && subscription.sumupLink && calculation.finalPrice > 0) {
                window.open(subscription.sumupLink, '_blank');
            }

            // Aggiorna stato e naviga
            setUserData(prev => prev ? {...prev, subscriptionAccessStatus: 'pending'} : null);
            setIsPaymentDialogOpen(false);
            router.push('/dashboard');

        } catch (error) {
            console.error("Error purchasing subscription:", error);
            toast({ title: "Errore", description: "Impossibile completare l'acquisto. Riprova.", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Gestori dialog
    const handlePaymentDialogSubmit = () => {
        if (!availableSubscription || !selectedPaymentMethod) {
            toast({ title: "Selezione mancante", description: "Scegli un metodo di pagamento.", variant: "destructive" });
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
                        bonusCalculation={bonusCalculation}
                    />
                    
                    <BonusDisplay bonusItems={bonusItems} bonusCalculation={bonusCalculation} />

                    {/* Dialog scelta pagamento */}
                    <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
                        <DialogContent className="bg-gray-100 [&>button]:text-[hsl(var(--background))]">
                            <DialogHeader>
                                <DialogTitle style={{ color: 'hsl(var(--background))' }}>Scegli Metodo di Pagamento</DialogTitle>
                                <DialogDescription className="text-base">
                                    Prezzo abbonamento: <b>€{availableSubscription.totalPrice.toFixed(2)}</b><br />
                                    Bonus utilizzabili: <b>€{bonusCalculation.totalBonus.toFixed(2)}</b><br />
                                    <span style={{ color: '#059669' }}>Prezzo finale: <b>€{bonusCalculation.finalPrice.toFixed(2)}</b></span>
                                </DialogDescription>
                            </DialogHeader>
                            
                            {bonusCalculation.finalPrice > 0 ? (
                                <RadioGroup
                                    value={selectedPaymentMethod || ""}
                                    onValueChange={(value: string) => setSelectedPaymentMethod(value as PaymentMethod)}
                                    className="space-y-4 py-4"
                                >
                                    <Label
                                        htmlFor="online"
                                        className="flex cursor-pointer items-start space-x-4 rounded-md border-2 p-4 transition-all bg-white hover:bg-accent/50 has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                                        style={{ borderColor: 'hsl(var(--background))' }}
                                    >
                                        <RadioGroupItem value="online" id="online" className="mt-1" style={{ borderColor: 'hsl(var(--background))' }} />
                                        <div className="flex-1 space-y-1">
                                            <h4 className="font-semibold" style={{ color: 'hsl(var(--background))' }}>Online (Carta di Credito)</h4>
                                            <p className="text-sm text-muted-foreground">
                                                Paga in modo sicuro con SumUp. Verrai reindirizzato al sito del gestore.
                                            </p>
                                        </div>
                                        <CreditCard className="h-6 w-6 text-muted-foreground" />
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
                                                Visualizza i dati per effettuare il bonifico. Attivazione con verifica manuale.
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
                                                Paga direttamente in palestra. Attivazione con verifica manuale.
                                            </p>
                                        </div>
                                        <Landmark className="h-6 w-6 text-muted-foreground" />
                                    </Label>
                                </RadioGroup>
                            ) : (
                                <div className="py-4 text-center text-green-700 font-semibold">
                                    Il tuo abbonamento è interamente coperto dai bonus. Nessun pagamento richiesto.
                                </div>
                            )}
                            
                            <DialogFooter className="justify-between gap-8 px-4">
                                <Button variant="ghost" onClick={() => setIsPaymentDialogOpen(false)} className="bg-transparent border-2" style={{ borderColor: 'hsl(var(--background))', color: 'hsl(var(--background))' }}>
                                    Annulla
                                </Button>
                                <Button
                                    onClick={() => {
                                        if (bonusCalculation.finalPrice === 0) {
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

                    {/* Dialog bonifico */}
                    <Dialog open={isBankTransferDialogOpen} onOpenChange={setIsBankTransferDialogOpen}>
                        <DialogContent className="bg-gray-100 [&>button]:text-[hsl(var(--background))]">
                            <DialogHeader>
                                <DialogTitle style={{ color: 'hsl(var(--background))' }}>Dati per Bonifico Bancario</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4 text-sm">
                                {bankDetails ? (
                                    <>
                                        <div className="space-y-1">
                                            <p className="font-semibold text-black">Intestatario:</p>
                                            <p className="text-black">{bankDetails.recipientName}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="font-semibold text-black">Banca:</p>
                                            <p className="text-black">{bankDetails.bankName}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="font-semibold text-black">IBAN:</p>
                                            <p className="font-mono bg-muted p-2 rounded-md text-black">{bankDetails.iban}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="font-semibold text-black">Importo:</p>
                                            <p className="text-black">{bonusCalculation.finalPrice.toFixed(2)} €</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="font-semibold text-black">Causale:</p>
                                            <p className="font-mono bg-muted p-2 rounded-md text-black">
                                                {`${availableSubscription.name} ${userData?.name || ''} ${userData?.surname || ''}`.trim()}
                                            </p>
                                        </div>
                                    </>
                                ) : (
                                    <Loader2 className="h-6 w-6 animate-spin" />
                                )}
                            </div>
                            <DialogFooter>
                                <Button 
                                    onClick={handleBankTransferConfirm} 
                                    className="w-full bg-green-600 hover:bg-green-700 text-white font-bold"
                                >
                                    Ho copiato i dati, invia richiesta
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </>
            ) : (
                <Card className="w-full max-w-lg">
                    <CardHeader>
                        <CardTitle>Nessun Abbonamento Disponibile</CardTitle>
                        <CardDescription>
                            Al momento non ci sono abbonamenti mensili acquistabili. Contatta la segreteria per maggiori informazioni.
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