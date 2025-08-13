
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { doc, getDoc, Timestamp, collection, getDocs, query, where, writeBatch, serverTimestamp } from "firebase/firestore"
import { db, auth } from "@/lib/firebase"
import { useAuthState } from "react-firebase-hooks/auth"
import { useToast } from "@/hooks/use-toast"
import { format, isAfter, isBefore, startOfDay } from "date-fns"
import { it } from "date-fns/locale"
import Link from "next/link"

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, CalendarClock, ArrowLeft, ShieldCheck, Zap, AlertTriangle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

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
    activeSubscription?: {
        subscriptionId: string;
    };
    subscriptionAccessStatus?: 'active' | 'pending' | 'expired';
}

function SubscriptionCard({ subscription, onPurchase, isSubmitting, hasActiveOrPending }: { subscription: Subscription; onPurchase: (sub: Subscription) => void; isSubmitting: boolean; hasActiveOrPending: boolean }) {
    const now = new Date();
    const isExpiring = subscription.expiryWarningDate && isAfter(now, subscription.expiryWarningDate.toDate());

    return (
        <Card className="w-full max-w-lg">
            <CardHeader>
                <CardTitle className="text-2xl">{subscription.name}</CardTitle>
                <CardDescription>
                    Acquista l'accesso ai corsi per il periodo di validità indicato.
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
                    <span className="font-bold text-3xl">{subscription.totalPrice.toFixed(2)} €</span>
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
                    <li className="flex items-center"><Zap className="h-4 w-4 mr-2 text-primary flex-shrink-0" /><span>Attivazione rapida dopo la conferma del pagamento.</span></li>
                    <li className="flex items-center"><ShieldCheck className="h-4 w-4 mr-2 text-primary flex-shrink-0" /><span>La copertura assicurativa deve essere già attiva.</span></li>
                </ul>
            </CardContent>
            <CardFooter className="flex-col gap-2">
                 <Button 
                    onClick={() => onPurchase(subscription)} 
                    disabled={isSubmitting || hasActiveOrPending}
                    className="w-full" 
                    size="lg"
                >
                    {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : null}
                    {hasActiveOrPending ? "Pagamento già in corso" : "Acquista Ora"}
                </Button>
                <Button asChild variant="outline" className="w-full">
                    <Link href="/dashboard/subscriptions">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Torna Indietro
                    </Link>
                </Button>
            </CardFooter>
        </Card>
    );
}


export default function MonthlySubscriptionPage() {
    const [user] = useAuthState(auth);
    const router = useRouter();
    const { toast } = useToast();

    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [availableSubscription, setAvailableSubscription] = useState<Subscription | null>(null);
    const [userData, setUserData] = useState<UserData | null>(null);

    useEffect(() => {
        const fetchSubscriptionData = async () => {
            if (!user) {
                setLoading(false);
                return;
            }

            try {
                // Fetch all monthly subscriptions
                const subsQuery = query(collection(db, "subscriptions"), where("type", "==", "monthly"));
                const subsSnapshot = await getDocs(subsQuery);
                const allMonthlySubs = subsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Subscription));

                // Fetch user data
                const userDocRef = doc(db, "users", user.uid);
                const userDocSnap = await getDoc(userDocRef);
                const currentUserData = userDocSnap.exists() ? userDocSnap.data() as UserData : null;
                setUserData(currentUserData);

                // Determine which subscription to show
                const now = new Date();
                let subToShow: Subscription | null = null;
                
                // Sort by purchase start date to find the most relevant
                allMonthlySubs.sort((a,b) => (b.purchaseStartDate?.toMillis() || 0) - (a.purchaseStartDate?.toMillis() || 0));

                // 1. Find currently purchasable subscription
                subToShow = allMonthlySubs.find(sub => 
                    sub.purchaseStartDate && sub.purchaseEndDate &&
                    isAfter(now, sub.purchaseStartDate.toDate()) &&
                    isBefore(now, sub.purchaseEndDate.toDate())
                ) || null;

                // 2. If none, find the one that is currently valid (already purchased)
                if (!subToShow && currentUserData?.activeSubscription?.subscriptionId) {
                     subToShow = allMonthlySubs.find(sub => sub.id === currentUserData.activeSubscription!.subscriptionId) || null;
                }
                
                // 3. If none, find the next one available for purchase
                if (!subToShow) {
                    const futureSubs = allMonthlySubs
                        .filter(sub => sub.purchaseStartDate && isAfter(sub.purchaseStartDate.toDate(), now))
                        .sort((a,b) => (a.purchaseStartDate?.toMillis() || 0) - (b.purchaseStartDate?.toMillis() || 0));
                    if (futureSubs.length > 0) {
                        subToShow = futureSubs[0];
                    }
                }

                setAvailableSubscription(subToShow);

            } catch (error) {
                console.error("Error fetching subscription data:", error);
                toast({ title: "Errore", description: "Impossibile caricare i dati degli abbonamenti.", variant: "destructive" });
            } finally {
                setLoading(false);
            }
        };

        fetchSubscriptionData();
    }, [user, toast]);
    
    const handlePurchase = async (subscription: Subscription) => {
        if (!user) {
            toast({ title: "Utente non trovato", variant: "destructive" });
            return;
        }
        setIsSubmitting(true);
        
        try {
            const batch = writeBatch(db);
            
            // 1. Create a new payment document
            const paymentRef = doc(collection(db, "users", user.uid, "payments"));
            batch.set(paymentRef, {
                userId: user.uid,
                createdAt: serverTimestamp(),
                amount: subscription.totalPrice,
                description: subscription.name,
                type: 'subscription',
                status: 'pending',
                paymentMethod: 'online', // Default a online, poi si potrà scegliere
                subscriptionId: subscription.id,
            });

            // 2. Update user's status
            const userRef = doc(db, "users", user.uid);
            batch.update(userRef, {
                subscriptionAccessStatus: 'pending',
                activeSubscription: {
                    subscriptionId: subscription.id,
                    name: subscription.name,
                    type: subscription.type,
                    purchasedAt: serverTimestamp(),
                    expiresAt: subscription.validityEndDate,
                }
            });
            
            await batch.commit();

            toast({ title: "Richiesta Inviata!", description: "La tua richiesta di abbonamento è in attesa di approvazione." });

            if (subscription.sumupLink) {
                window.open(subscription.sumupLink, '_blank');
            }
            
            router.push('/dashboard');

        } catch (error) {
            console.error("Error purchasing subscription: ", error);
            toast({ title: "Errore", description: "Impossibile completare l'acquisto. Riprova.", variant: "destructive" });
            setIsSubmitting(false);
        }
    }

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
                <SubscriptionCard 
                    subscription={availableSubscription} 
                    onPurchase={handlePurchase}
                    isSubmitting={isSubmitting}
                    hasActiveOrPending={hasActiveOrPending}
                />
            ) : (
                <Card>
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

    