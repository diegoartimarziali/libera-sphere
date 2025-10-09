"use client"

import { useState, useEffect, Suspense } from "react"

import { doc, getDoc, Timestamp, collection, getDocs, query, where, writeBatch, serverTimestamp, addDoc, updateDoc } from "firebase/firestore"
import { db, auth } from "@/lib/firebase"
import { useAuthState } from "react-firebase-hooks/auth"
import { useToast } from "@/hooks/use-toast"
import { format, isAfter, isBefore, startOfMonth, endOfMonth, addMonths } from "date-fns"
import { Gift } from "lucide-react"
import { assignPremiPresenze } from "@/lib/assignPremiPresenze"
import { showPremiPresenzeMessage, showPremiPresenzeErrorMessage } from "@/lib/premiPresenzeMessages"
import { usePremiumSystem, BonusCalculation, SpendableAward } from "@/hooks/use-premium-system"
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
        name?: string;
        type?: 'monthly' | 'seasonal';
        purchasedAt?: Timestamp;
        expiresAt?: Timestamp;
    };
    subscriptionAccessStatus?: 'active' | 'pending' | 'expired';
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
        // 🔧 LOGICA CORRETTA: Controlla se l'utente ha GIÀ questo abbonamento E se è ancora valido
        if (userData?.activeSubscription?.subscriptionId === sub.id) {
            // Se l'abbonamento attivo è lo stesso, controlla se è ancora valido
            if (userData.activeSubscription.expiresAt) {
                const expiryDate = userData.activeSubscription.expiresAt.toDate();
                const isStillValid = expiryDate >= now;
                
                if (isStillValid) {
                    console.log(`🔥🔥🔥 [NUOVA LOGICA] Skipping ${sub.name} - user already has this subscription and it's still valid`);
                    return false;
                } else {
                    console.log(`🔥🔥🔥 [NUOVA LOGICA] User has ${sub.name} but it's expired - allowing repurchase`);
                    return true; // Permetti di ricomprare se scaduto
                }
            } else {
                console.log(`🔥🔥🔥 [NUOVA LOGICA] Skipping ${sub.name} - user already has this subscription (no expiry date)`);
                return false;
            }
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
 * Determina se un premio è spendibile per acquisti
 * REGOLA: Solo "Premio Presenze" NON è spendibile, tutti gli altri sì
 * @param award - Il premio da controllare
 * @returns true se il premio è spendibile, false altrimenti
 */
function isPremioSpendibile(award: any): boolean {
    const name = award.name;
    
    // Solo il Premio Presenze è non spendibile (accumulabile ma non utilizzabile)
    const isSpendibile = name !== 'Premio Presenze';
    
    console.log(`🔍 [Monthly] Premio "${name || 'SENZA NOME'}" - Spendibile: ${isSpendibile}`);
    
    return isSpendibile;
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
    bonusCalculation: BonusCalculation;
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
                    <span className={`font-bold text-3xl ${bonusCalculation.totalAvailable > 0 ? 'line-through text-gray-400' : ''}`}>
                        {subscription.totalPrice.toFixed(2)} €
                    </span>
                </div>
                
                {bonusCalculation.totalAvailable > 0 && (
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
                        // 🎯 SEMPRE apre dialog - anche per bonus gratuiti
                        console.log('� OPENING PAYMENT DIALOG - Final price:', bonusCalculation.finalPrice);
                        onOpenPaymentDialog();
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

function BonusDisplay({ spendableAwards, bonusCalculation }: { spendableAwards: SpendableAward[], bonusCalculation: BonusCalculation }) {
    return (
        <div className="w-full max-w-lg my-4 p-4 border-2 rounded-lg bg-green-50" style={{ borderColor: '#10b981' }}>
            <div className="flex items-center gap-2 mb-2">
                <Gift className="h-6 w-6 text-yellow-500" />
                <span className="font-bold" style={{ color: '#059669' }}>Bonus disponibili:</span>
                <span className="text-lg font-bold" style={{ color: '#059669' }}>€{bonusCalculation.totalAvailable.toFixed(2)}</span>
            </div>
            {spendableAwards.length > 0 ? (
                <ul className="text-sm">
                    {spendableAwards.map(award => (
                        <li key={award.id} className="flex justify-between">
                            <span className="font-bold" style={{ color: '#059669' }}>{award.name || award.id}</span>
                            <span className="font-bold" style={{ color: '#059669' }}>€{award.availableAmount.toFixed(2)}</span>
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
    return (
        <Suspense fallback={<div className="flex justify-center items-center h-64"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>}>
            <MonthlySubscriptionContent />
        </Suspense>
    )
}

function MonthlySubscriptionContent() {
    const [user] = useAuthState(auth);
    const [impersonateId, setImpersonateId] = useState<string | null>(null);
    const effectiveUserId = impersonateId || user?.uid;
    

    
    // Leggiamo l'impersonation dalla URL senza useSearchParams
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const urlParams = new URLSearchParams(window.location.search);
            const impersonate = urlParams.get('impersonate');
            setImpersonateId(impersonate);
        }
    }, []);
    
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [availableSubscription, setAvailableSubscription] = useState<Subscription | null>(null);
    const [userData, setUserData] = useState<UserData | null>(null);
    const [bankDetails, setBankDetails] = useState<BankDetails | null>(null);
    const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
    const [isBankTransferDialogOpen, setIsBankTransferDialogOpen] = useState(false);
    const [hasRealPendingPayments, setHasRealPendingPayments] = useState(false);
    
    // 🎁 Sistema premi unificato
    const { 
        spendableAwards, 
        totalSpendable, 
        calculateBonus, 
        applyBonus,
        isLoading: premiumLoading 
    } = usePremiumSystem(effectiveUserId);

    const bonusCalculation = availableSubscription ? 
        calculateBonus(availableSubscription.totalPrice) : 
        { 
            spendableAwards: [],
            totalAvailable: 0, 
            bonusToUse: 0, 
            finalPrice: 0, 
            awardUsage: [] 
        };

    // 🎁 DEBUG: Dettagli calcolo bonus
    if (availableSubscription && spendableAwards.length > 0) {
        console.log('🎁 BONUS CALCULATION DEBUG:');
        console.log('- Subscription price:', availableSubscription.totalPrice);
        console.log('- Available bonus items:', spendableAwards.length);
        console.log('- Total spendable:', totalSpendable);
        console.log('- Total bonus calculated:', bonusCalculation.totalAvailable);
        console.log('- Bonus to use:', bonusCalculation.bonusToUse);
        console.log('- Final price:', bonusCalculation.finalPrice);
    }

    // 🐛 DEBUG LOGGING per tracciare il bug dei pagamenti fantasma
    useEffect(() => {
        if (availableSubscription && userData) {
            console.log('🐛 MONTHLY SUB BUG TRACKING:');
            console.log('- Subscription:', availableSubscription.name);
            console.log('- User has active sub:', !!userData.activeSubscription);
            console.log('- Active sub ID:', userData.activeSubscription?.subscriptionId);
            console.log('- Subscription status:', userData.subscriptionAccessStatus);
            console.log('- Total bonus items:', spendableAwards.length);
            console.log('- Bonus calculation:', bonusCalculation);
            console.log('- Final price:', bonusCalculation.finalPrice);
            console.log('- Should show dialog:', bonusCalculation.finalPrice > 0);
        }
    }, [availableSubscription, userData, spendableAwards, bonusCalculation]);

    // Carica tutti i dati
    useEffect(() => {
        if (!effectiveUserId) {
            setLoading(false);
            return;
        }

        const fetchData = async () => {
            try {
                // Carica tutti i dati in parallelo
                const [subsSnapshot, userDocSnap, bankDetailsSnap] = await Promise.all([
                    getDocs(query(collection(db, "subscriptions"), where("type", "==", "monthly"))),
                    getDoc(doc(db, "users", effectiveUserId)),
                    getDoc(doc(db, "settings", "bankDetails"))
                ]);

                // Abbonamenti
                const allMonthlySubs = subsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Subscription));
                
                // Dati utente (da caricare prima della selezione abbonamento)
                const currentUserData = userDocSnap.exists() ? userDocSnap.data() as UserData : null;
                
                // 🔧 VERIFICA E RESET AUTOMATICO: Controlla inconsistenze nei dati
                if (currentUserData?.subscriptionAccessStatus === 'pending') {
                    // Controlla se esiste un pagamento pending corrispondente
                    const pendingPaymentsSnap = await getDocs(
                        query(
                            collection(db, "users", effectiveUserId, "payments"),
                            where("type", "==", "subscription"),
                            where("status", "==", "pending")
                        )
                    );
                    
                    if (pendingPaymentsSnap.empty) {
                        console.log('🔧 AUTO-RESET: User has pending status but no pending payments - resetting');
                        // Reset stato utente se non ci sono pagamenti pending
                        const userRef = doc(db, "users", effectiveUserId);
                        await updateDoc(userRef, {
                            subscriptionAccessStatus: 'expired',
                            subscriptionPaymentFailed: false
                        });
                        
                        // Aggiorna i dati locali
                        currentUserData.subscriptionAccessStatus = 'expired';
                        // NON cancellare activeSubscription automaticamente
                        setHasRealPendingPayments(false);
                        
                        toast({
                            title: "Stato ripristinato",
                            description: "Il tuo stato abbonamento è stato ripristinato. Puoi procedere con un nuovo acquisto.",
                            duration: 5000
                        });
                    } else {
                        console.log('✅ PENDING STATUS VALID: Found', pendingPaymentsSnap.size, 'pending payments');
                        setHasRealPendingPayments(true);
                    }
                } else if (currentUserData?.subscriptionAccessStatus === 'active' && currentUserData?.activeSubscription) {
                    // ✅ VERIFICA CONSISTENZA E AUTO-RESET per abbonamenti scaduti
                    console.log('🔍 CONSISTENCY CHECK: User has active subscription');
                    
                    // Controlla se l'abbonamento è effettivamente scaduto
                    if (currentUserData.activeSubscription.expiresAt) {
                        const expiryDate = currentUserData.activeSubscription.expiresAt.toDate();
                        const isExpired = expiryDate <= new Date();
                        
                        if (isExpired) {
                            console.log('🔧 AUTO-RESET: Subscription is expired, updating status');
                            
                            // Reset automatico per abbonamento scaduto
                            const userRef = doc(db, "users", effectiveUserId);
                            await updateDoc(userRef, {
                                subscriptionAccessStatus: 'expired'
                            });
                            
                            // Aggiorna i dati locali
                            currentUserData.subscriptionAccessStatus = 'expired';
                            
                            toast({
                                title: "Abbonamento scaduto",
                                description: "Il tuo abbonamento è scaduto. Puoi procedere con un nuovo acquisto.",
                                duration: 5000
                            });
                        }
                    }
                    
                    console.log('- Active subscription:', currentUserData.activeSubscription);
                    setHasRealPendingPayments(false);
                } else {
                    setHasRealPendingPayments(false);
                }
                
                setUserData(currentUserData);
                
                // Debug logging
                console.log('🔥🔥🔥 [NUOVA LOGICA ATTIVA] Monthly Subs Debug - Current date:', new Date());
                console.log('🔥🔥🔥 [NUOVA LOGICA ATTIVA] User data:', {
                    hasActiveSubscription: !!currentUserData?.activeSubscription,
                    activeSubscriptionId: currentUserData?.activeSubscription?.subscriptionId,
                    activeSubscriptionName: currentUserData?.activeSubscription?.name,
                    activeSubscriptionType: currentUserData?.activeSubscription?.type,
                    activeSubscriptionExpiresAt: currentUserData?.activeSubscription?.expiresAt?.toDate(),
                    subscriptionStatus: currentUserData?.subscriptionAccessStatus,
                    hasRealPendingPayments: hasRealPendingPayments
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

            } catch (error) {
                console.error("Error fetching data:", error);
                toast({ title: "Errore", description: "Impossibile caricare i dati.", variant: "destructive" });
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [effectiveUserId, toast]);

    // 🎯 Auto-selezione metodo bonus per pagamenti gratuiti
    useEffect(() => {
        if (isPaymentDialogOpen && availableSubscription) {
            if (bonusCalculation.finalPrice === 0) {
                setSelectedPaymentMethod('bonus');
            } else {
                setSelectedPaymentMethod(null); // Reset per pagamenti a pagamento
            }
        }
    }, [isPaymentDialogOpen, availableSubscription, bonusCalculation]);

    // Gestisce l'acquisto
    const handlePurchase = async (subscription: Subscription, method: PaymentMethod, userConfirmed: boolean = false) => {
        if (!effectiveUserId) return;
        
        // 🛡️ GUARDRAIL: Previeni creazione pagamenti senza conferma utente
        if (method !== 'bonus' && !userConfirmed) {
            console.error('🚨 BLOCKED: Tentativo di creare pagamento senza conferma utente!');
            console.error('- Method:', method);
            console.error('- UserConfirmed:', userConfirmed);
            console.error('- Subscription:', subscription.name);
            toast({ 
                title: "Errore di sicurezza", 
                description: "Pagamento bloccato per sicurezza. Riprova usando il dialog di pagamento.", 
                variant: "destructive" 
            });
            return;
        }
        
        // 🐛 DEBUG: Log dell'acquisto
        console.log('💳 PURCHASE ATTEMPT:');
        console.log('- Method:', method);
        console.log('- UserConfirmed:', userConfirmed);
        console.log('- Final price:', bonusCalculation.finalPrice);
        
        setIsSubmitting(true);
        try {
            // Aggiorna stato utente
            const userRef = doc(db, "users", effectiveUserId);
            await updateDoc(userRef, {
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

            // Applica il bonus usando il sistema unificato
            if (bonusCalculation.bonusToUse > 0) {
                await applyBonus(bonusCalculation);
            }

            // Registra pagamento
            const paymentsRef = collection(db, "users", effectiveUserId, "payments");
            await addDoc(paymentsRef, {
                createdAt: serverTimestamp(),
                description: `${subscription.name} - ${bonusCalculation.totalAvailable > 0 ? 'Con Bonus' : 'Pagamento Standard'}`,
                amount: bonusCalculation.finalPrice,
                paymentMethod: bonusCalculation.finalPrice === 0 ? 'bonus' : method,
                status: 'pending',
                type: 'subscription',
                userId: effectiveUserId,
                bonusUsed: bonusCalculation.bonusToUse,
                awardId: bonusCalculation.awardUsage.length === 1 ? bonusCalculation.awardUsage[0].id : bonusCalculation.awardUsage.map(a => a.id)
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
                description: `Pagamento: €${bonusCalculation.finalPrice.toFixed(2)}. Bonus utilizzati: €${bonusCalculation.bonusToUse.toFixed(2)}.`
            });

            // Apri link pagamento se necessario
            if (method === 'online' && subscription.sumupLink && bonusCalculation.finalPrice > 0) {
                window.open(subscription.sumupLink, '_blank');
            }

            // Aggiorna stato e naviga
            setUserData(prev => prev ? {...prev, subscriptionAccessStatus: 'pending'} : null);
            setIsPaymentDialogOpen(false);
            window.location.href = '/dashboard';

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
            handlePurchase(availableSubscription, selectedPaymentMethod, true); // userConfirmed = true
        }
    };

    const handleBankTransferConfirm = () => {
        if (availableSubscription) {
            handlePurchase(availableSubscription, 'bank_transfer', true); // userConfirmed = true
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

    // 🎯 LOGICA CORRETTA: Controlla stato active O pagamenti pending REALI + abbonamento stagionale
    const hasSeasonalSubscription = userData?.activeSubscription?.type === 'seasonal' && 
                                   userData?.subscriptionAccessStatus === 'active' &&
                                   userData?.activeSubscription?.expiresAt &&
                                   userData.activeSubscription.expiresAt.toDate() > new Date();
    
    // Controlla se l'abbonamento corrente è veramente attivo (non scaduto)
    const hasValidActiveSubscription = userData?.subscriptionAccessStatus === 'active' && 
                                      userData?.activeSubscription?.expiresAt &&
                                      userData.activeSubscription.expiresAt.toDate() > new Date();
    
    const hasActiveOrPending = hasValidActiveSubscription || 
                              (userData?.subscriptionAccessStatus === 'pending' && hasRealPendingPayments) ||
                              hasSeasonalSubscription;

    // 🔍 DEBUG: Stampa le variabili che determinano il blocco
    console.log('🔍 BLOCKING LOGIC DEBUG:');
    console.log('- subscriptionAccessStatus:', userData?.subscriptionAccessStatus);
    console.log('- hasRealPendingPayments:', hasRealPendingPayments);
    console.log('- hasSeasonalSubscription:', hasSeasonalSubscription);
    console.log('- hasValidActiveSubscription:', hasValidActiveSubscription);
    console.log('- hasActiveOrPending:', hasActiveOrPending);
    console.log('- activeSubType:', userData?.activeSubscription?.type);
    console.log('- activeSubName:', userData?.activeSubscription?.name);
    console.log('- activeSubExpiresAt:', userData?.activeSubscription?.expiresAt?.toDate());
    console.log('- isActiveSubExpired:', userData?.activeSubscription?.expiresAt ? userData.activeSubscription.expiresAt.toDate() <= new Date() : null);

    // 🔧 FUNZIONE RESET MANUALE per utenti bloccati
    const handleManualReset = async () => {
        if (!effectiveUserId || !userData) return;
        
        try {
            // Verifica se ci sono pagamenti pending
            const pendingPaymentsSnap = await getDocs(
                query(
                    collection(db, "users", effectiveUserId, "payments"),
                    where("type", "==", "subscription"),
                    where("status", "==", "pending")
                )
            );
            
            if (pendingPaymentsSnap.empty) {
                // Reset sicuro
                const userRef = doc(db, "users", effectiveUserId);
                await updateDoc(userRef, {
                    subscriptionAccessStatus: 'expired',
                    subscriptionPaymentFailed: false
                });
                
                setUserData(prev => prev ? {...prev, subscriptionAccessStatus: 'expired'} : null);
                setHasRealPendingPayments(false);
                
                toast({
                    title: "Reset completato",
                    description: "Il tuo stato è stato ripristinato. Puoi procedere con un nuovo acquisto.",
                    duration: 5000
                });
            } else {
                toast({
                    title: "Reset non possibile",
                    description: "Esistono pagamenti in elaborazione. Contatta la segreteria.",
                    variant: "destructive"
                });
            }
        } catch (error) {
            console.error("Error in manual reset:", error);
            toast({
                title: "Errore",
                description: "Impossibile resettare lo stato. Riprova più tardi.",
                variant: "destructive"
            });
        }
    };

    return (
        <div className="flex w-full flex-col items-center justify-center">
            {/* 🚨 ALERT per utenti bloccati in pending */}
            {userData?.subscriptionAccessStatus === 'pending' && (
                <Alert className="w-full max-w-lg mb-6 border-yellow-500 bg-yellow-50">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Stato in Verifica</AlertTitle>
                    <AlertDescription className="space-y-2">
                        <p>Il tuo abbonamento è in fase di approvazione.</p>
                        <p className="text-sm text-muted-foreground">
                            Se il problema persiste o non hai effettuato alcun pagamento, puoi ripristinare lo stato.
                        </p>
                        <Button 
                            onClick={handleManualReset}
                            variant="outline" 
                            size="sm"
                            className="mt-2 border-yellow-600 text-yellow-700 hover:bg-yellow-100"
                        >
                            🔧 Ripristina Stato
                        </Button>
                    </AlertDescription>
                </Alert>
            )}

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
                    
                    <BonusDisplay spendableAwards={spendableAwards} bonusCalculation={bonusCalculation} />

                    {/* Dialog scelta pagamento */}
                    <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
                        <DialogContent className="bg-gray-100 [&>button]:text-[hsl(var(--background))]">
                            <DialogHeader>
                                <DialogTitle style={{ color: 'hsl(var(--background))' }}>Scegli Metodo di Pagamento</DialogTitle>
                                <DialogDescription className="text-base">
                                    Prezzo abbonamento: <b>€{availableSubscription.totalPrice.toFixed(2)}</b><br />
                                    Bonus utilizzabili: <b>€{bonusCalculation.totalAvailable.toFixed(2)}</b><br />
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
                                <div className="py-4 space-y-4">
                                    <div className="text-center text-green-700 font-semibold">
                                        Il tuo abbonamento è interamente coperto dai bonus. Conferma per procedere.
                                    </div>
                                </div>
                            )}
                            
                            <DialogFooter className="justify-between gap-8 px-4">
                                <Button variant="ghost" onClick={() => setIsPaymentDialogOpen(false)} className="bg-transparent border-2" style={{ borderColor: 'hsl(var(--background))', color: 'hsl(var(--background))' }}>
                                    Annulla
                                </Button>
                                <Button
                                    onClick={() => {
                                        // ✅ Ora la scelta è sempre fatta nel dialog
                                        if (bonusCalculation.finalPrice === 0) {
                                            handlePurchase(availableSubscription, "bonus", true);
                                        } else {
                                            handlePaymentDialogSubmit();
                                        }
                                    }}
                                    disabled={isSubmitting || (!selectedPaymentMethod && bonusCalculation.finalPrice > 0)}
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