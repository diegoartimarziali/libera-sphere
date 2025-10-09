
"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter } from "next/navigation"
import { doc, getDoc, Timestamp, collection, getDocs, query, where, writeBatch, serverTimestamp } from "firebase/firestore"
import { db, auth } from "@/lib/firebase"
import { useAuthState } from "react-firebase-hooks/auth"
import { useToast } from "@/hooks/use-toast"
import { format, differenceInDays, startOfDay, isAfter, isBefore } from "date-fns"
import { it } from "date-fns/locale"
import Link from "next/link"

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, CalendarClock, ShieldCheck, Zap, CreditCard, Landmark, University, ArrowLeft } from "lucide-react"
import { Badge } from "@/components/ui/badge"
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
        name: string;
        type: 'monthly' | 'seasonal';
        purchasedAt: Timestamp;
        expiresAt?: Timestamp;
    };
    subscriptionAccessStatus?: 'active' | 'pending' | 'expired';
}

interface BankDetails {
    recipientName: string;
    bankName: string;
    iban: string;
}

type PaymentMethod = "online" | "in_person" | "bank_transfer";

// Helper function to find available monthly subscription
function findAvailableMonthlySubscription(subscriptions: Subscription[], userData: UserData | null): Subscription | null {
    if (subscriptions.length === 0) return null;
    
    const now = new Date();
    
    // Filtra gli abbonamenti che l'utente può acquistare (non quelli già posseduti)
    const purchasableSubscriptions = subscriptions.filter(sub => {
        // Se l'utente ha già questo abbonamento attivo, non mostrarlo come acquistabile
        if (userData?.activeSubscription?.subscriptionId === sub.id) {
            return false;
        }
        
        // Mostra abbonamenti per il mese corrente o futuro, ma non passati
        const validityStart = sub.validityStartDate.toDate();
        const validityEnd = sub.validityEndDate.toDate();
        
        // Se l'abbonamento è completamente passato, non mostrarlo
        if (validityEnd < now) {
            return false;
        }
        
        return true;
    });
    
    if (purchasableSubscriptions.length === 0) return null;
    
    // Ordina per data di inizio validità e prendi il primo disponibile
    const sortedSubs = purchasableSubscriptions
        .sort((a, b) => a.validityStartDate.toMillis() - b.validityStartDate.toMillis());
    
    return sortedSubs[0];
}

// Funzione per trovare l'abbonamento stagionale disponibile
function findAvailableSeasonalSubscription(subscriptions: Subscription[]): Subscription | null {
    if (subscriptions.length === 0) return null;
    
    const now = new Date();
    
    // Priorità 1: abbonamento con finestra acquisto attiva
    const purchasableNow = subscriptions.find(sub =>
        sub.purchaseStartDate && sub.purchaseEndDate ?
        isAfter(now, sub.purchaseStartDate.toDate()) && isBefore(now, sub.purchaseEndDate.toDate())
        : true // Se non ci sono date, è sempre acquistabile
    );
    
    if (purchasableNow) return purchasableNow;
    
    // Priorità 2: abbonamento futuro acquistabile (più vicino)
    const futureSubs = subscriptions
        .filter(sub => sub.purchaseStartDate && isAfter(sub.purchaseStartDate.toDate(), now))
        .sort((a, b) => a.purchaseStartDate!.toMillis() - b.purchaseStartDate!.toMillis());
    
    if (futureSubs.length > 0) return futureSubs[0];
    
    // Priorità 3: qualsiasi abbonamento stagionale disponibile
    return subscriptions[0];
}

// Componente Card per lo stato dell'abbonamento esistente
function SubscriptionStatusCard({ userData }: { userData: UserData }) {
    const router = useRouter();
    const { activeSubscription, subscriptionAccessStatus } = userData;

    if (!activeSubscription || !subscriptionAccessStatus) return null;

    const getStatusInfo = () => {
        if (subscriptionAccessStatus === 'active' && activeSubscription.expiresAt) {
            const expiryDate = startOfDay(activeSubscription.expiresAt.toDate());
            const today = startOfDay(new Date());
            const daysDiff = differenceInDays(expiryDate, today);

            if (daysDiff <= 4 && daysDiff >= 0) {
                return { label: "In scadenza", variant: "warning" as const };
            }
        }
        
        switch(subscriptionAccessStatus) {
            case 'active': return { label: 'Attivo', variant: "success" as const };
            case 'pending': return { label: 'In attesa di approvazione', variant: "warning" as const };
            case 'expired': return { label: 'Scaduto', variant: "destructive" as const };
            default: return { label: 'Sconosciuto', variant: "secondary" as const };
        }
    }
    
    const statusInfo = getStatusInfo();

    return (
        <Card className="w-full max-w-lg mb-8">
            <CardHeader>
                <CardTitle>Il Tuo Abbonamento Attuale</CardTitle>
                <CardDescription>Riepilogo del tuo piano.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                 <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Piano</span>
                    <span className="font-semibold">{activeSubscription.name}</span>
                </div>
                 <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Acquistato il</span>
                    <span className="font-semibold">{format(activeSubscription.purchasedAt.toDate(), "dd MMMM yyyy", { locale: it })}</span>
                </div>
                 {activeSubscription.expiresAt && (
                    <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Scade il</span>
                        <span className="font-semibold">{format(activeSubscription.expiresAt.toDate(), "dd MMMM yyyy", { locale: it })}</span>
                    </div>
                )}
                <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Stato</span>
                    <Badge variant={statusInfo.variant}>
                       {statusInfo.label}
                    </Badge>
                </div>
            </CardContent>
            <CardFooter className="flex-col gap-4">
                {subscriptionAccessStatus === 'pending' && (
                     <Alert variant="warning">
                        <CalendarClock className="h-4 w-4" />
                        <AlertTitle>Pagamento in Verifica</AlertTitle>
                        <AlertDescription>
                          Il tuo abbonamento sarà attivato non appena il pagamento verrà confermato dalla segreteria.
                        </AlertDescription>
                    </Alert>
                )}
                 <Button className="w-full" onClick={() => router.push('/dashboard/payments')}>
                    Visualizza i Miei Pagamenti
                </Button>
            </CardFooter>
        </Card>
    );
}

// Componente per la selezione del nuovo abbonamento
function SubscriptionSelection({ 
    seasonalSub, 
    availableMonthly,
    bankDetails, 
    userData,
    onPurchase,
    impersonateId
}: { 
    seasonalSub: Subscription | null, 
    availableMonthly: Subscription | null,
    bankDetails: BankDetails | null, 
    userData: UserData | null,
    onPurchase: (sub: Subscription, method: PaymentMethod) => Promise<void>,
    impersonateId: string | null
}) {
    return (
        <div className="flex w-full flex-col items-center">
            <div className="mb-8 text-center max-w-2xl">
                <h1 className="text-3xl font-bold">Acquista il tuo abbonamento</h1>
                <p className="mt-2">
                    Scegli il piano più adatto a te per continuare ad allenarti.
                </p>
            </div>
            
            <div className="grid w-full max-w-3xl grid-cols-1 gap-6 md:grid-cols-2">
                
                {/* Card Abbonamento Mensile */}
                <Card className="flex flex-col border-4 transition-all bg-gray-50 hover:border-8" style={{ borderColor: 'hsl(var(--primary))' }}>
                    <CardHeader>
                        <CardTitle className="text-2xl">
                            {availableMonthly ? availableMonthly.name : 'Abbonamento Mensile'}
                        </CardTitle>
                        <CardDescription className="font-bold" style={{ color: 'hsl(30, 100%, 38%)' }}>
                            {availableMonthly ? 'Disponibile ora!' : 'Flessibilità totale, mese per mese.'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-grow" style={{ gap: '28px', display: 'flex', flexDirection: 'column' }}>
                        {availableMonthly ? (
                            <>
                                <div className="space-y-2 rounded-md border p-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground">Prezzo</span>
                                        <span className="font-bold text-2xl text-green-600">
                                            €{availableMonthly.totalPrice.toFixed(2)}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground">Valido dal</span>
                                        <span className="font-semibold">{format(availableMonthly.validityStartDate.toDate(), "dd MMM yyyy", { locale: it })}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground">Fino al</span>
                                        <span className="font-semibold">{format(availableMonthly.validityEndDate.toDate(), "dd MMM yyyy", { locale: it })}</span>
                                    </div>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    Abbonamento mensile disponibile per l'acquisto. Accedi a tutti i corsi della tua disciplina.
                                </p>
                            </>
                        ) : (
                            <p className="text-muted-foreground">
                                Ideale per chi cerca la massima flessibilità. Paga mese per mese e accedi a tutti i corsi della tua disciplina in una singola palestra.
                            </p>
                        )}
                        <ul className="space-y-3 text-sm">
                            <li className="flex items-center"><Zap className="h-4 w-4 mr-2 text-primary flex-shrink-0" /><span style={{ color: 'hsl(30, 100%, 38%)' }}>Attivazione rapida.</span></li>
                            <li className="flex items-center"><CalendarClock className="h-4 w-4 mr-2 text-primary flex-shrink-0" /><span style={{ color: 'hsl(30, 100%, 38%)' }}>Nessun vincolo a lungo termine.</span></li>
                            <li className="flex items-center"><ShieldCheck className="h-4 w-4 mr-2 text-primary flex-shrink-0" /><span style={{ color: 'hsl(30, 100%, 38%)' }}>Copertura assicurativa sempre inclusa.</span></li>
                        </ul>
                    </CardContent>
                    <CardFooter>
                         <Button asChild className="w-full text-white font-bold" size="lg" style={{ backgroundColor: 'hsl(var(--primary))' }}>
                            <Link href={`/dashboard/subscriptions/monthly${impersonateId ? `?impersonate=${impersonateId}` : ''}`}>
                                {availableMonthly ? `Acquista ${availableMonthly.name}` : 'Scegli Piano Mensile'}
                            </Link>
                        </Button>
                    </CardFooter>
                </Card>

                {/* Card Abbonamento Stagionale */}
                 <Dialog>
                    <Card className="flex flex-col border-4 transition-all relative bg-gray-50 hover:border-8" style={{ borderColor: '#0ea5e9' }}>
                        <Badge className="absolute -top-3 right-4 bg-sky-500 text-white">Consigliato</Badge>
                        <CardHeader>
                            <CardTitle className="text-2xl">
                                {seasonalSub ? seasonalSub.name : 'Abbonamento Stagionale'}
                            </CardTitle>
                            <CardDescription className="font-bold text-blue-600">
                                {seasonalSub ? ((() => {
                                    const now = new Date();
                                    const isPurchaseWindowOpen = 
                                        seasonalSub.purchaseStartDate && seasonalSub.purchaseEndDate ?
                                        isAfter(now, seasonalSub.purchaseStartDate.toDate()) && isBefore(now, seasonalSub.purchaseEndDate.toDate())
                                        : true;
                                    return isPurchaseWindowOpen ? 'Disponibile ora!' : 'Non ancora disponibile';
                                })()) : 'La scelta migliore per un anno di pratica.'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex-grow space-y-4">
                            {seasonalSub ? (
                                <>
                                    <div className="space-y-2 rounded-md border p-4">
                                        <div className="flex items-center justify-between">
                                            <span className="text-muted-foreground">Prezzo</span>
                                            <span className="font-bold text-2xl text-green-600">
                                                €{seasonalSub.totalPrice.toFixed(2)}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-muted-foreground">Valido dal</span>
                                            <span className="font-semibold">{format(seasonalSub.validityStartDate.toDate(), "dd MMM yyyy", { locale: it })}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-muted-foreground">Fino al</span>
                                            <span className="font-semibold">{format(seasonalSub.validityEndDate.toDate(), "dd MMM yyyy", { locale: it })}</span>
                                        </div>
                                        {seasonalSub.purchaseStartDate && seasonalSub.purchaseEndDate && (
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="text-muted-foreground">Acquistabile</span>
                                                <span className="font-medium">{format(seasonalSub.purchaseStartDate.toDate(), "dd MMM", { locale: it })} - {format(seasonalSub.purchaseEndDate.toDate(), "dd MMM yyyy", { locale: it })}</span>
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        Abbonamento stagionale per l'intera stagione sportiva. Accedi a tutte le palestre della rete.
                                    </p>
                                </>
                            ) : (
                                <p className="text-muted-foreground">
                                    La soluzione completa per tutta la stagione sportiva. Accedi a tutte le lezioni della tua disciplina in qualsiasi palestra.
                                </p>
                            )}
                            <ul className="space-y-2 text-sm">
                                <li className="flex items-center"><Zap className="h-4 w-4 mr-2 text-primary flex-shrink-0" /><span className="text-blue-600">Accesso a tutte le palestre.</span></li>
                                <li className="flex items-center"><CalendarClock className="h-4 w-4 mr-2 text-primary flex-shrink-0" /><span className="text-blue-600">Valido per l'intera stagione sportiva.</span></li>
                                <li className="flex items-center"><ShieldCheck className="h-4 w-4 mr-2 text-primary flex-shrink-0" /><span className="text-blue-600">Copertura assicurativa sempre inclusa.</span></li>
                            </ul>
                        </CardContent>
                        <CardFooter>
                            <Button 
                                asChild 
                                className={`w-full text-white font-bold ${!seasonalSub || (seasonalSub.purchaseStartDate && seasonalSub.purchaseEndDate && !(isAfter(new Date(), seasonalSub.purchaseStartDate.toDate()) && isBefore(new Date(), seasonalSub.purchaseEndDate.toDate()))) ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                                size="lg" 
                                disabled={!seasonalSub || (seasonalSub.purchaseStartDate && seasonalSub.purchaseEndDate && !(isAfter(new Date(), seasonalSub.purchaseStartDate.toDate()) && isBefore(new Date(), seasonalSub.purchaseEndDate.toDate())))}
                            >
                                <Link href="/dashboard/subscriptions/seasonal">
                                    {seasonalSub ? 
                                        (seasonalSub.purchaseStartDate && seasonalSub.purchaseEndDate && !(isAfter(new Date(), seasonalSub.purchaseStartDate.toDate()) && isBefore(new Date(), seasonalSub.purchaseEndDate.toDate())) ? 
                                            'Non Ancora Disponibile' : 
                                            `Acquista ${seasonalSub.name}`
                                        ) : 
                                        'Scegli Piano Stagionale'
                                    }
                                </Link>
                            </Button>
                        </CardFooter>
                    </Card>
                 </Dialog>
            </div>
        </div>
    );
}

function SubscriptionsContent() {
    const [user] = useAuthState(auth);
    const [impersonateId, setImpersonateId] = useState<string | null>(null);
    const effectiveUserId = impersonateId || user?.uid;
    
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const urlParams = new URLSearchParams(window.location.search);
            const impersonate = urlParams.get('impersonate');
            setImpersonateId(impersonate);
        }
    }, []);
    
    const [userData, setUserData] = useState<UserData | null>(null);
    const [seasonalSub, setSeasonalSub] = useState<Subscription | null>(null);
    const [availableMonthly, setAvailableMonthly] = useState<Subscription | null>(null);
    const [bankDetails, setBankDetails] = useState<BankDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();
    const router = useRouter();


    useEffect(() => {
        const fetchInitialData = async () => {
            if (!effectiveUserId) {
                setLoading(false);
                return;
            }

            try {
                const [subsSnapshot, userDocSnap, bankDetailsSnap] = await Promise.all([
                    getDocs(query(collection(db, "subscriptions"))),
                    getDoc(doc(db, "users", effectiveUserId)),
                    getDoc(doc(db, "settings", "bankDetails"))
                ]);
                
                if (bankDetailsSnap.exists()) {
                    setBankDetails(bankDetailsSnap.data() as BankDetails);
                }

                const currentUserData = userDocSnap.exists() ? userDocSnap.data() as UserData : null;
                setUserData(currentUserData);
                
                // Carica abbonamento stagionale
                const seasonalSubscriptions = subsSnapshot.docs
                    .filter(doc => doc.data().type === 'seasonal')
                    .map(doc => ({ id: doc.id, ...doc.data() } as Subscription));
                
                const availableSeasonalSubscription = findAvailableSeasonalSubscription(seasonalSubscriptions);
                setSeasonalSub(availableSeasonalSubscription);
                
                // Carica abbonamento mensile disponibile
                const monthlySubscriptions = subsSnapshot.docs
                    .filter(doc => doc.data().type === 'monthly')
                    .map(doc => ({ id: doc.id, ...doc.data() } as Subscription));
                
                const availableMonthlySubscription = findAvailableMonthlySubscription(monthlySubscriptions, currentUserData);
                setAvailableMonthly(availableMonthlySubscription);

            } catch (error) {
                console.error("Error fetching user data:", error);
                toast({ title: "Errore", description: "Impossibile caricare i dati utente.", variant: "destructive" });
            } finally {
                setLoading(false);
            }
        };

        fetchInitialData();
    }, [effectiveUserId, toast]);
    
    const handlePurchase = async (subscription: Subscription, method: PaymentMethod) => {
        if (!user) {
            toast({ title: "Utente non trovato", variant: "destructive" });
            return;
        }
        
        try {
            if (!effectiveUserId) {
                toast({ variant: "destructive", title: "Errore", description: "Utente non identificato." });
                return;
            }
            
            const batch = writeBatch(db);
            
            const paymentRef = doc(collection(db, "users", effectiveUserId, "payments"));
            batch.set(paymentRef, {
                userId: effectiveUserId, createdAt: serverTimestamp(), amount: subscription.totalPrice,
                description: subscription.name, type: 'subscription', status: 'pending',
                paymentMethod: method, subscriptionId: subscription.id,
            });

            const userRef = doc(db, "users", effectiveUserId);
            batch.update(userRef, {
                subscriptionAccessStatus: 'pending', subscriptionPaymentFailed: false,
                activeSubscription: {
                    subscriptionId: subscription.id, name: subscription.name, type: subscription.type,
                    purchasedAt: serverTimestamp(), expiresAt: subscription.validityEndDate,
                }
            });
            
            await batch.commit();

            toast({ title: "Richiesta Inviata!", description: "La tua richiesta di abbonamento è in attesa di approvazione." });
            
            // This needs to be the last step before routing
            if (method === 'online' && subscription.sumupLink) {
                window.open(subscription.sumupLink, '_blank');
            }

            router.push("/dashboard");

        } catch (error) {
            console.error("Error purchasing subscription: ", error);
            toast({ title: "Errore", description: "Impossibile completare l'acquisto. Riprova.", variant: "destructive" });
        }
    }
    
    if (loading) {
        return (
            <div className="flex h-full w-full items-center justify-center">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </div>
        );
    }
    
    const hasActiveOrPendingSubscription = userData?.subscriptionAccessStatus === 'active' || userData?.subscriptionAccessStatus === 'pending';
    
    // Controlla se l'abbonamento esistente è effettivamente ancora valido
    let subscriptionIsValid = false;
    if (hasActiveOrPendingSubscription && userData?.activeSubscription?.expiresAt) {
        const now = new Date();
        const expiryDate = userData.activeSubscription.expiresAt.toDate();
        subscriptionIsValid = expiryDate > now;
        
        console.log('🔥 [SUBSCRIPTION VALIDITY CHECK]', {
            hasActiveOrPending: hasActiveOrPendingSubscription,
            expiryDate: expiryDate,
            currentDate: now,
            isValid: subscriptionIsValid,
            subscriptionStatus: userData?.subscriptionAccessStatus,
            activeSubscription: userData?.activeSubscription,
            subscriptionType: userData?.activeSubscription?.type,
            subscriptionName: userData?.activeSubscription?.name
        });
    }

    return (
        <div className="flex w-full flex-col items-center justify-center space-y-8">
            {userData && hasActiveOrPendingSubscription && subscriptionIsValid ? (
                <SubscriptionStatusCard userData={userData} />
            ) : (
                <SubscriptionSelection 
                    seasonalSub={seasonalSub}
                    availableMonthly={availableMonthly}
                    bankDetails={bankDetails}
                    userData={userData}
                    onPurchase={handlePurchase}
                    impersonateId={impersonateId}
                />
            )}
        </div>
    );
}

export default function SubscriptionsPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center h-64"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>}>
            <SubscriptionsContent />
        </Suspense>
    )
}
