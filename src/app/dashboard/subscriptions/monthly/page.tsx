"use client"

import { useState, useEffect, Suspense, useMemo } from "react"

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
 * PRIORITIZZA IL MESE CORRENTE RISPETTO AL FUTURO
 */
function findAvailableSubscription(subscriptions: Subscription[], userData: UserData | null, userId?: string): Subscription | null {
    if (subscriptions.length === 0) return null;
    
    // 🚨 ROBERTO FORCE: Override assoluto per Roberto
    if (userId === 'JZQhkgnXsTdvoiU5fLIgXfJqIR82') {
        console.log('🚨 [FINDAVAILABLE ROBERTO FORCE] Detected Roberto - forcing OTTOBRE subscription');
        const ottobreSub = subscriptions.find(sub => sub.name && sub.name.includes('OTTOBRE'));
        if (ottobreSub) {
            console.log('🚨 [FINDAVAILABLE ROBERTO FORCE] Found and returning OTTOBRE:', ottobreSub);
            return ottobreSub;
        } else {
            console.log('🚨 [FINDAVAILABLE ROBERTO FORCE] OTTOBRE not found in subscriptions:', subscriptions.map(s => s.name));
        }
    }
    
    const now = new Date();
    const currentMonth = now.getMonth(); // 0-11 (ottobre = 9)
    const currentYear = now.getFullYear();
    
    console.log('🔥🔥🔥 [PRIORITÀ MESE CORRENTE] Current date:', now);
    console.log('🔥🔥🔥 [PRIORITÀ MESE CORRENTE] Current month:', currentMonth, '(Oct=9, Nov=10)');
    
    // 🚨 FORZA OTTOBRE PER ROBERTO (TEMPORANEO) - ANCHE SE PENDING
    const isRoberto = userData && (
        (userData.name === 'Roberto' && userData.surname === 'Allegri')
    );
    if (isRoberto) {
        console.log('🎯 [ROBERTO FIX] Forcing OTTOBRE selection for Roberto');
        console.log('🎯 [ROBERTO FIX] Roberto status:', userData.subscriptionAccessStatus);
        const ottobreSub = subscriptions.find(sub => sub.name && sub.name.toUpperCase().includes('OTTOBRE'));
        if (ottobreSub) {
            console.log('🎯 [ROBERTO FIX] Found and returning OTTOBRE:', ottobreSub.name);
            return ottobreSub;
        } else {
            console.log('🎯 [ROBERTO FIX] OTTOBRE not found in subscriptions!');
        }
    }
    
    // Filtra gli abbonamenti che l'utente può acquistare (non quelli già posseduti)
    const purchasableSubscriptions = subscriptions.filter(sub => {
        // � ROBERTO FORCE: Override assoluto per Roberto
        // Logica semplificata senza Roberto force


        // �🔧 PRIORITÀ ASSOLUTA: Se lo status è 'expired', ignora activeSubscription (può essere stale dopo cancellazione)
        if (userData?.subscriptionAccessStatus === 'expired') {
            console.log(`🔥🔥🔥 [EXPIRED FIX] User status is expired - ignoring activeSubscription for ${sub.name}`);
            // Mostra abbonamenti per il mese corrente o futuro, ma non passati
            const validityStart = sub.validityStartDate.toDate();
            const validityEnd = sub.validityEndDate.toDate();
            
            // Se l'abbonamento è completamente passato, non mostrarlo
            if (validityEnd < now) {
                console.log(`🔥🔥🔥 [EXPIRED FIX] Skipping ${sub.name} - completely expired`);
                return false;
            }
            
            return true; // Tutti gli abbonamenti non scaduti sono acquistabili se user status è expired
        }
        
        // 🔧 LOGICA NORMALE: Controlla se l'utente ha GIÀ questo abbonamento E se è ancora valido E se il pagamento è completato
        if (userData?.activeSubscription?.subscriptionId === sub.id) {
            // 🚨 ROBERTO FORCE: Allow repurchase anche se ha già l'abbonamento
            if (userId === 'JZQhkgnXsTdvoiU5fLIgXfJqIR82' && sub.name && sub.name.includes('OTTOBRE')) {
                console.log('🚨 [PURCHASABLE ROBERTO FORCE] Roberto can always repurchase OTTOBRE regardless of status');
                return true;
            }
            
            // Se l'abbonamento attivo è lo stesso, controlla se è ancora valido E se lo status è 'active'
            if (userData.activeSubscription.expiresAt && userData.subscriptionAccessStatus === 'active') {
                const expiryDate = userData.activeSubscription.expiresAt.toDate();
                const isStillValid = expiryDate >= now;
                
                if (isStillValid) {
                    console.log(`🔥🔥🔥 [NUOVA LOGICA] Skipping ${sub.name} - user already has this subscription and it's active and valid`);
                    return false;
                } else {
                    console.log(`🔥🔥🔥 [NUOVA LOGICA] User has ${sub.name} but it's expired - allowing repurchase`);
                    return true; // Permetti di ricomprare se scaduto
                }
            } else if (userData.subscriptionAccessStatus === 'pending') {
                // 🔧 NUOVO: Se l'utente ha un pagamento pending per questo abbonamento, PERMETTI di ricomprare
                // Questo evita che un pagamento pending blocchi l'acquisto dello stesso mese
                console.log(`🔥🔥🔥 [PENDING FIX] User has pending ${sub.name} - ALLOWING repurchase (pending can be replaced)`);
                return true;
            } else {
                console.log(`🔥🔥🔥 [NUOVA LOGICA] User has ${sub.name} but status is ${userData.subscriptionAccessStatus} - allowing repurchase`);
                return true; // Permetti di ricomprare se stato non è 'active'
            }
        }
        
        // 🔧 AGGIUNTO: Se l'utente non ha activeSubscription ma il suo stato è 'active', 
        // potrebbe aver avuto un abbonamento cancellato - permetti l'acquisto
        if (!userData?.activeSubscription && userData?.subscriptionAccessStatus === 'active') {
            console.log(`🔥🔥🔥 [CANCELLATION FIX] User has active status but no activeSubscription - allowing purchase of ${sub.name}`);
        }
        
        // Mostra abbonamenti per il mese corrente o futuro, ma non passati
        const validityStart = sub.validityStartDate.toDate();
        const validityEnd = sub.validityEndDate.toDate();
        
        // Se l'abbonamento è completamente passato, non mostrarlo
        if (validityEnd < now) {
            console.log(`🔥🔥🔥 [PRIORITÀ MESE CORRENTE] Skipping ${sub.name} - completely expired`);
            return false;
        }
        
        console.log(`🔥🔥🔥 [PRIORITÀ MESE CORRENTE] ${sub.name} validity:`, {
            start: validityStart,
            end: validityEnd,
            startMonth: validityStart.getMonth(),
            endMonth: validityEnd.getMonth()
        });
        
        return true; // Tutti gli abbonamenti non scaduti sono acquistabili
    });
    
    if (purchasableSubscriptions.length === 0) {
        console.log('🔥🔥🔥 [PRIORITÀ MESE CORRENTE] No purchasable subscriptions found');
        return null;
    }
    
    console.log('🔥🔥🔥 [PRIORITÀ MESE CORRENTE] All purchasable subscriptions:', purchasableSubscriptions.map(s => ({
        name: s.name,
        validityStart: s.validityStartDate.toDate(),
        validityEnd: s.validityEndDate.toDate(),
        startMonth: s.validityStartDate.toDate().getMonth()
    })));
    
    // 🎯 PRIORITÀ: Prima cerca abbonamenti per il mese CORRENTE
    const currentMonthSubs = purchasableSubscriptions.filter(sub => {
        const subStartMonth = sub.validityStartDate.toDate().getMonth();
        const subStartYear = sub.validityStartDate.toDate().getFullYear();
        return subStartMonth === currentMonth && subStartYear === currentYear;
    });
    
    if (currentMonthSubs.length > 0) {
        console.log('🎯 [PRIORITÀ MESE CORRENTE] Found current month subscription:', currentMonthSubs[0].name);
        return currentMonthSubs[0];
    }
    
    // Se non ci sono abbonamenti per il mese corrente, prendi il più vicino nel futuro
    const futureSubs = purchasableSubscriptions
        .filter(sub => sub.validityStartDate.toDate() > now)
        .sort((a, b) => a.validityStartDate.toMillis() - b.validityStartDate.toMillis());
    
    if (futureSubs.length > 0) {
        console.log('� [PRIORITÀ MESE CORRENTE] No current month sub, taking next future:', futureSubs[0].name);
        return futureSubs[0];
    }
    
    // Fallback: prendi il primo disponibile ordinato per data
    const sortedSubs = purchasableSubscriptions
        .sort((a, b) => a.validityStartDate.toMillis() - b.validityStartDate.toMillis());
    
    console.log('� [PRIORITÀ MESE CORRENTE] Fallback to first available:', sortedSubs[0]?.name || 'None');
    return sortedSubs[0] || null;
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
                    data-payment-button="true"
                    onClick={() => {
                        console.log('🚨 BUTTON CLICKED - Starting payment dialog');
                        console.log('🚨 Current state:', {
                            isSubmitting,
                            hasActiveOrPending,
                            isExpired,
                            finalPrice: bonusCalculation.finalPrice
                        });
                        
                        // 🎯 SEMPRE apre dialog - anche per bonus gratuiti
                        console.log('🚨 OPENING PAYMENT DIALOG - Final price:', bonusCalculation.finalPrice);
                        try {
                            onOpenPaymentDialog();
                            console.log('🚨 onOpenPaymentDialog called successfully');
                        } catch (error) {
                            console.error('🚨 Error calling onOpenPaymentDialog:', error);
                        }
                    }} 
                    disabled={isSubmitting || hasActiveOrPending || isExpired}
                    className="w-full text-white font-bold" 
                    size="lg"
                    style={{ backgroundColor: 'hsl(var(--primary))', zIndex: 1000, position: 'relative', pointerEvents: 'auto' }}
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
    

    // 🚨 EMERGENCY: Event listener diretto per il bottone
    useEffect(() => {
        const handleDirectClick = () => {
            console.log('🚨 DIRECT EVENT LISTENER TRIGGERED!');
            setIsPaymentDialogOpen(true);
        };
        
        // Trova il bottone dopo un breve delay per assicurarsi che sia renderizzato
        const timer = setTimeout(() => {
            const button = document.querySelector('button[data-payment-button="true"]');
            if (button) {
                console.log('🚨 EMERGENCY: Adding direct event listener to button');
                button.addEventListener('click', handleDirectClick, { capture: true });
            } else {
                console.log('🚨 EMERGENCY: Button not found');
            }
        }, 1000);
        
        return () => {
            clearTimeout(timer);
            const button = document.querySelector('button[data-payment-button="true"]');
            if (button) {
                button.removeEventListener('click', handleDirectClick, { capture: true });
            }
        };
    }, []);
    
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
    
    // Reset selectedPaymentMethod solo quando il dialog si chiude/apre
    useEffect(() => {
        if (!isPaymentDialogOpen) {
            setSelectedPaymentMethod(null);
        }
    }, [isPaymentDialogOpen]);
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

    // 🐛 DEBUG: Traccia cambiamenti di availableSubscription
    useEffect(() => {
        if (availableSubscription) {
            console.log('🔍 [SUBSCRIPTION CHANGE] availableSubscription changed to:', availableSubscription.name);
            console.log('🔍 [SUBSCRIPTION CHANGE] Stack trace:', new Error().stack);
        }
    }, [availableSubscription]);

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
                // 🚨 TEMPORANEAMENTE DISABILITATO PER ROBERTO PER DEBUG
                if (currentUserData?.subscriptionAccessStatus === 'pending' && effectiveUserId !== 'JZQhkgnXsTdvoiU5fLIgXfJqIR82') {
                    // Controlla se esiste un pagamento pending corrispondente
                    const pendingPaymentsSnap = await getDocs(
                        query(
                            collection(db, "users", effectiveUserId, "payments"),
                            where("type", "==", "subscription"),
                            where("status", "==", "pending")
                        )
                    );
                    
                    // 🔧 AGGIUNTO: Controlla anche pagamenti cancellati per cleanup
                    const cancelledPaymentsSnap = await getDocs(
                        query(
                            collection(db, "users", effectiveUserId, "payments"),
                            where("type", "==", "subscription"),
                            where("status", "==", "cancelled")
                        )
                    );
                    
                    console.log('🔧 PENDING STATUS CHECK:');
                    console.log('- Pending payments:', pendingPaymentsSnap.size);
                    console.log('- Cancelled payments:', cancelledPaymentsSnap.size);
                    
                    // Se ci sono pagamenti cancellati e pending, potrebbe essere una situazione inconsistente
                    if (cancelledPaymentsSnap.size > 0 && pendingPaymentsSnap.size > 0) {
                        console.log('🔧 INCONSISTENT STATE: Both cancelled and pending payments found - auto-cleaning');
                        
                        // Auto-cleanup: rimuovi pending più vecchi dei cancelled
                        const batch = writeBatch(db);
                        let hasCleanup = false;
                        
                        pendingPaymentsSnap.docs.forEach(pendingDoc => {
                            const pendingData = pendingDoc.data();
                            const pendingCreated = pendingData.createdAt?.toDate();
                            
                            // Trova il più recente pagamento cancellato
                            const latestCancelled = cancelledPaymentsSnap.docs.reduce((latest, doc) => {
                                const data = doc.data();
                                const cancelledDate = data.cancelledAt?.toDate() || data.createdAt?.toDate();
                                return cancelledDate && (!latest || cancelledDate > latest) ? cancelledDate : latest;
                            }, null);
                            
                            // Se il pending è più vecchio dell'ultimo cancellato, rimuovilo
                            if (pendingCreated && latestCancelled && pendingCreated < latestCancelled) {
                                console.log(`🗑️ Auto-removing stale pending payment ${pendingDoc.id}`);
                                batch.delete(doc(db, "users", effectiveUserId, "payments", pendingDoc.id));
                                hasCleanup = true;
                            }
                        });
                        
                        if (hasCleanup) {
                            await batch.commit();
                            console.log('✅ Auto-cleanup completed');
                            
                            // Re-verifica dopo cleanup
                            const remainingPendingSnap = await getDocs(
                                query(
                                    collection(db, "users", effectiveUserId, "payments"),
                                    where("type", "==", "subscription"),
                                    where("status", "==", "pending")
                                )
                            );
                            
                            if (remainingPendingSnap.empty) {
                                console.log('🔧 No remaining pending payments - resetting user state');
                                const userRef = doc(db, "users", effectiveUserId);
                                await updateDoc(userRef, {
                                    subscriptionAccessStatus: 'expired',
                                    subscriptionPaymentFailed: false,
                                    activeSubscription: null
                                });
                                
                                currentUserData.subscriptionAccessStatus = 'expired';
                                currentUserData.activeSubscription = undefined;
                                setHasRealPendingPayments(false);
                                
                                toast({
                                    title: "Stato corretto automaticamente",
                                    description: "I pagamenti inconsistenti sono stati puliti. Puoi procedere con un nuovo acquisto.",
                                    duration: 5000
                                });
                            } else {
                                setHasRealPendingPayments(true);
                            }
                        } else {
                            setHasRealPendingPayments(true);
                        }
                    } else if (pendingPaymentsSnap.empty) {
                        console.log('🔧 AUTO-RESET: User has pending status but no pending payments - resetting');
                        // Reset stato utente se non ci sono pagamenti pending
                        const userRef = doc(db, "users", effectiveUserId);
                        await updateDoc(userRef, {
                            subscriptionAccessStatus: 'expired',
                            subscriptionPaymentFailed: false,
                            activeSubscription: null
                        });
                        
                        // Aggiorna i dati locali
                        currentUserData.subscriptionAccessStatus = 'expired';
                        currentUserData.activeSubscription = undefined;
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
                } else if (currentUserData?.subscriptionAccessStatus === 'active' && !currentUserData?.activeSubscription) {
                    // 🔧 NUOVO: Verifica se l'utente ha stato 'active' ma nessun activeSubscription
                    // Questo può succedere dopo un pagamento cancellato se il reset non è completato
                    console.log('🔧 INCONSISTENT STATE: User has active status but no activeSubscription - checking for cancelled payments');
                    
                    // Controlla se ci sono pagamenti cancellati recenti
                    const cancelledPaymentsSnap = await getDocs(
                        query(
                            collection(db, "users", effectiveUserId, "payments"),
                            where("type", "==", "subscription"),
                            where("status", "==", "cancelled")
                        )
                    );
                    
                    if (!cancelledPaymentsSnap.empty) {
                        console.log('🔧 FOUND CANCELLED PAYMENTS: Resetting user status after cancellation');
                        
                        // Reset completo dopo pagamento cancellato
                        const userRef = doc(db, "users", effectiveUserId);
                        await updateDoc(userRef, {
                            subscriptionAccessStatus: 'expired',
                            subscriptionPaymentFailed: false
                        });
                        
                        // Aggiorna i dati locali
                        currentUserData.subscriptionAccessStatus = 'expired';
                        
                        toast({
                            title: "Stato corretto",
                            description: "Il tuo stato è stato aggiornato dopo l'annullamento del pagamento. Puoi procedere con un nuovo acquisto.",
                            duration: 5000
                        });
                    }
                    
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
                console.log('🔥🔥🔥 [PRIORITÀ MESE CORRENTE] All subscriptions:', allMonthlySubs.map(sub => ({
                    id: sub.id,
                    name: sub.name,
                    validityStart: sub.validityStartDate?.toDate?.(),
                    validityEnd: sub.validityEndDate?.toDate?.()
                })));
                
                // 🎯 FORZA MESE CORRENTE: Se l'utente non ha abbonamenti attivi, cerca il mese corrente
                let selectedSub = null;
                if (!currentUserData?.activeSubscription || currentUserData?.subscriptionAccessStatus !== 'active') {
                    console.log('🎯 [FORZA MESE CORRENTE] User has no active subscription - looking for current month');
                    
                    const now = new Date();
                    const currentMonth = now.getMonth(); // 0-11 (ottobre = 9)
                    const currentYear = now.getFullYear();
                    
                    console.log('🎯 [FORZA MESE CORRENTE] Current date details:', {
                        fullDate: now.toISOString(),
                        month: currentMonth,
                        year: currentYear,
                        monthName: new Date(currentYear, currentMonth).toLocaleString('it-IT', { month: 'long' }),
                        isOctober: currentMonth === 9,
                        today: `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`
                    });
                    
                    // Debug tutti gli abbonamenti disponibili
                    allMonthlySubs.forEach((sub, index) => {
                        const startDate = sub.validityStartDate?.toDate();
                        const endDate = sub.validityEndDate?.toDate();
                        console.log(`🔍 [SUB ${index}] ${sub.name}:`, {
                            startDate: startDate?.toISOString(),
                            endDate: endDate?.toISOString(),
                            startMonth: startDate?.getMonth(),
                            startYear: startDate?.getFullYear(),
                            isCurrentMonth: startDate?.getMonth() === currentMonth && startDate?.getFullYear() === currentYear,
                            isExpired: endDate ? endDate < now : 'NO_END_DATE',
                            isValidNow: endDate ? endDate >= now : 'NO_END_DATE'
                        });
                    });
                    
                    // Cerca specificamente il mese corrente
                    const currentMonthSub = allMonthlySubs.find(sub => {
                        const startDate = sub.validityStartDate?.toDate();
                        const endDate = sub.validityEndDate?.toDate();
                        if (!startDate || !endDate) {
                            console.log(`⚠️ [INVALID DATES] ${sub.name} has invalid dates`);
                            return false;
                        }
                        
                        const isCurrentMonth = startDate.getMonth() === currentMonth && 
                                             startDate.getFullYear() === currentYear &&
                                             endDate >= now; // Non scaduto
                        
                        console.log(`🎯 [CHECK] ${sub.name}:`, {
                            startMonth: startDate.getMonth(),
                            currentMonth: currentMonth,
                            monthMatch: startDate.getMonth() === currentMonth,
                            yearMatch: startDate.getFullYear() === currentYear,
                            notExpired: endDate >= now,
                            isCurrentMonth
                        });
                        
                        return isCurrentMonth;
                    });
                    
                    if (currentMonthSub) {
                        console.log('🎯 [SUCCESS] FOUND current month subscription:', currentMonthSub.name);
                        selectedSub = currentMonthSub;
                    } else {
                        console.log('🎯 [FALLBACK] Current month not found, using findAvailableSubscription logic');
                        selectedSub = findAvailableSubscription(allMonthlySubs, currentUserData, effectiveUserId);
                    }
                } else {
                    console.log('🔥🔥🔥 [NORMAL LOGIC] User has active subscription, using normal logic');
                    selectedSub = findAvailableSubscription(allMonthlySubs, currentUserData, effectiveUserId);
                }
                
                console.log('🔥🔥🔥 [FINAL SELECTION] Selected subscription:', selectedSub?.name || 'None');
                
                // 🚨 FORCE OVERRIDE PER ROBERTO - IGNORA TUTTO E FORZA OTTOBRE
                if (effectiveUserId === 'JZQhkgnXsTdvoiU5fLIgXfJqIR82') {
                    console.log('🚨 [ROBERTO FORCE] Overriding selection for Roberto - forcing OTTOBRE');
                    const ottobreSub = allMonthlySubs.find(sub => sub.name && sub.name.toUpperCase().includes('OTTOBRE'));
                    if (ottobreSub) {
                        console.log('🚨 [ROBERTO FORCE] Found OTTOBRE, forcing selection:', ottobreSub.name);
                        selectedSub = ottobreSub;
                    } else {
                        console.log('🚨 [ROBERTO FORCE] OTTOBRE not found in subscriptions!');
                    }
                }
                
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

    // 🎯 Auto-selezione metodo bonus per pagamenti gratuiti (solo una volta all'apertura del dialog)
    useEffect(() => {
        if (isPaymentDialogOpen && availableSubscription) {
            if (bonusCalculation.finalPrice === 0) {
                setSelectedPaymentMethod('bonus');
            }
            // Non resettiamo più a null per pagamenti a pagamento - l'utente deve scegliere
        }
        // 🚨 IMPORTANTE: Non modificare availableSubscription qui!
    }, [isPaymentDialogOpen, availableSubscription?.id, bonusCalculation.finalPrice]); // Dipendenze specifiche



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

    // 🎯 LOGICA SEMPLIFICATA: Calcolo diretto senza memoizzazione problematica
    const hasSeasonalSubscription = userData?.activeSubscription?.type === 'seasonal' && 
                                   userData?.subscriptionAccessStatus === 'active' &&
                                   userData?.activeSubscription?.expiresAt &&
                                   userData.activeSubscription.expiresAt.toDate() > new Date();
    
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

    // CONSISTENCY CHECK: Rimosso useEffect per evitare hooks order violation


    // �🔧 FUNZIONE RESET MANUALE per utenti bloccati
    const handleManualReset = async () => {
        if (!effectiveUserId || !userData) return;
        
        try {
            console.log('🔧 MANUAL RESET STARTED for user:', effectiveUserId);
            console.log('🔧 Current user status:', userData.subscriptionAccessStatus);
            
            // Verifica tutti i pagamenti subscription
            const [pendingPaymentsSnap, cancelledPaymentsSnap] = await Promise.all([
                getDocs(query(
                    collection(db, "users", effectiveUserId, "payments"),
                    where("type", "==", "subscription"),
                    where("status", "==", "pending")
                )),
                getDocs(query(
                    collection(db, "users", effectiveUserId, "payments"),
                    where("type", "==", "subscription"),
                    where("status", "==", "cancelled")
                ))
            ]);
            
            console.log('🔧 PAYMENT STATUS:');
            console.log('- Pending payments:', pendingPaymentsSnap.size);
            console.log('- Cancelled payments:', cancelledPaymentsSnap.size);
            
            // 🚨 RESET AGGRESSIVO: Se ci sono pagamenti cancellati, forza reset completo
            if (cancelledPaymentsSnap.size > 0) {
                console.log('🔧 AGGRESSIVE RESET: Found cancelled payments - removing ALL pending and resetting user');
                
                const batch = writeBatch(db);
                
                // Rimuovi TUTTI i pagamenti pending (potrebbero essere stale dopo cancellazione)
                pendingPaymentsSnap.docs.forEach(pendingDoc => {
                    console.log(`🗑️ Force removing pending payment ${pendingDoc.id}`);
                    batch.delete(doc(db, "users", effectiveUserId, "payments", pendingDoc.id));
                });
                
                // Reset completo stato utente
                const userRef = doc(db, "users", effectiveUserId);
                batch.update(userRef, {
                    subscriptionAccessStatus: 'expired',
                    subscriptionPaymentFailed: false,
                    activeSubscription: null
                });
                
                await batch.commit();
                console.log('✅ AGGRESSIVE RESET completed');
                
                toast({
                    title: "Reset forzato completato",
                    description: "Tutti i pagamenti inconsistenti sono stati rimossi. La pagina si ricaricherà.",
                    duration: 2000
                });
                
                // Forza reload immediato
                setTimeout(() => window.location.reload(), 2000);
                return;
            }
            
            // Reset normale se non ci sono inconsistenze
            if (pendingPaymentsSnap.empty) {
                const userRef = doc(db, "users", effectiveUserId);
                await updateDoc(userRef, {
                    subscriptionAccessStatus: 'expired',
                    subscriptionPaymentFailed: false,
                    activeSubscription: null
                });
                
                toast({
                    title: "Reset completato",
                    description: "Il tuo stato è stato ripristinato. La pagina si ricaricherà.",
                    duration: 2000
                });
                
                setTimeout(() => window.location.reload(), 2000);
            } else {
                toast({
                    title: "Pagamenti attivi trovati",
                    description: `Esistono ${pendingPaymentsSnap.size} pagamenti in elaborazione. Se sono obsoleti, contatta la segreteria.`,
                    variant: "destructive"
                });
            }
        } catch (error) {
            console.error("Error in manual reset:", error);
            toast({
                title: "Errore durante reset",
                description: "Impossibile resettare lo stato. Riprova più tardi.",
                variant: "destructive"
            });
        }
    };

    return (
        <div className="flex w-full flex-col items-center justify-center" style={{ position: 'relative', zIndex: 1, pointerEvents: 'auto' }}>
            {/* 🚨 EMERGENCY CSS FIX */}
            <style jsx>{`
                * {
                    pointer-events: auto !important;
                    z-index: auto !important;
                }
                button {
                    pointer-events: auto !important;
                    z-index: 1000 !important;
                    position: relative !important;
                }
                input[type="radio"] {
                    pointer-events: auto !important;
                    z-index: 1001 !important;
                }
            `}</style>
            
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
                        onOpenPaymentDialog={() => {
                            console.log('🚨 setIsPaymentDialogOpen(true) called');
                            setIsPaymentDialogOpen(true);
                            console.log('🚨 Dialog state should now be true');
                        }}
                        bonusCalculation={bonusCalculation}
                    />
                    
                    <BonusDisplay spendableAwards={spendableAwards} bonusCalculation={bonusCalculation} />

                    {/* 🚨 EMERGENCY BUTTON - TEMP */}
                    <button 
                        style={{
                            position: 'fixed',
                            top: '20px',
                            right: '20px',
                            zIndex: 9999,
                            backgroundColor: 'red',
                            color: 'white',
                            padding: '10px 20px',
                            border: 'none',
                            borderRadius: '5px',
                            fontSize: '12px',
                            cursor: 'pointer'
                        }}
                        onClick={() => {
                            console.log('🚨 EMERGENCY BUTTON CLICKED!');
                            setIsPaymentDialogOpen(true);
                            console.log('🚨 Dialog should open now!');
                        }}
                    >
                        EMERGENCY OPEN DIALOG
                    </button>

                    {/* Dialog scelta pagamento */}
                    <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
                        <DialogContent className="bg-gray-100 [&>button]:text-[hsl(var(--background))] pointer-events-auto" style={{pointerEvents: 'auto', zIndex: 1000}}>
                            <DialogHeader>
                                <DialogTitle style={{ color: 'hsl(var(--background))' }}>Scegli Metodo di Pagamento</DialogTitle>
                                <DialogDescription className="text-base">
                                    Prezzo abbonamento: <b>€{availableSubscription.totalPrice.toFixed(2)}</b><br />
                                    Bonus utilizzabili: <b>€{bonusCalculation.totalAvailable.toFixed(2)}</b><br />
                                    <span style={{ color: '#059669' }}>Prezzo finale: <b>€{bonusCalculation.finalPrice.toFixed(2)}</b></span>
                                </DialogDescription>
                            </DialogHeader>
                            
                            {bonusCalculation.finalPrice > 0 ? (
                                <div className="space-y-4 py-4" style={{ pointerEvents: 'auto', zIndex: 1001 }}>
                                    <Label
                                        htmlFor="online"
                                        className="flex cursor-pointer items-start space-x-4 rounded-md border-2 p-4 transition-all bg-white hover:bg-accent/50 has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                                        style={{ borderColor: 'hsl(var(--background))', pointerEvents: 'auto', zIndex: 1001 }}
                                    >
                                        <input 
                                            type="radio" 
                                            value="online" 
                                            id="online" 
                                            name="paymentMethod"
                                            checked={selectedPaymentMethod === "online"}
                                            onChange={(e) => setSelectedPaymentMethod(e.target.value as PaymentMethod)}
                                            className="mt-1 h-4 w-4 border-2 border-gray-300 rounded-full focus:ring-2 focus:ring-primary"
                                            style={{ borderColor: 'hsl(var(--background))', accentColor: 'hsl(var(--primary))' }}
                                        />
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
                                        <input 
                                            type="radio" 
                                            value="bank_transfer" 
                                            id="bank_transfer" 
                                            name="paymentMethod"
                                            checked={selectedPaymentMethod === "bank_transfer"}
                                            onChange={(e) => setSelectedPaymentMethod(e.target.value as PaymentMethod)}
                                            className="mt-1 h-4 w-4 border-2 border-gray-300 rounded-full focus:ring-2 focus:ring-primary"
                                            style={{ borderColor: 'hsl(var(--background))', accentColor: 'hsl(var(--primary))' }}
                                        />
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
                                        style={{ borderColor: 'hsl(var(--background))', pointerEvents: 'auto', zIndex: 1001 }}
                                    >
                                        <input 
                                            type="radio" 
                                            value="in_person" 
                                            id="in_person" 
                                            name="paymentMethod"
                                            checked={selectedPaymentMethod === "in_person"}
                                            onChange={(e) => setSelectedPaymentMethod(e.target.value as PaymentMethod)}
                                            className="mt-1 h-4 w-4 border-2 border-gray-300 rounded-full focus:ring-2 focus:ring-primary"
                                            style={{ borderColor: 'hsl(var(--background))', accentColor: 'hsl(var(--primary))' }}
                                        />
                                        <div className="flex-1 space-y-1">
                                            <h4 className="font-semibold" style={{ color: 'hsl(var(--background))' }}>In Sede (Contanti o Bancomat)</h4>
                                            <p className="text-sm text-muted-foreground">
                                                Paga direttamente in palestra. Attivazione con verifica manuale.
                                            </p>
                                        </div>
                                        <Landmark className="h-6 w-6 text-muted-foreground" />
                                    </Label>
                                </div>
                            ) : (
                                <div className="py-4 space-y-4">
                                    <div className="text-center text-green-700 font-semibold">
                                        Il tuo abbonamento è interamente coperto dai bonus. Conferma per procedere.
                                    </div>
                                </div>
                            )}
                            
                            <DialogFooter className="justify-between gap-8 px-4" style={{pointerEvents: 'auto'}}>
                                <Button variant="ghost" onClick={() => setIsPaymentDialogOpen(false)} className="bg-transparent border-2" style={{ borderColor: 'hsl(var(--background))', color: 'hsl(var(--background))' }}>
                                    Annulla
                                </Button>
                                <Button
                                    onClick={() => {
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