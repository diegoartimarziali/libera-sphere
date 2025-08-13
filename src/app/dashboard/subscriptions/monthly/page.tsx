
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { db, auth } from "@/lib/firebase"
import { useAuthState } from "react-firebase-hooks/auth"
import { collection, query, where, getDocs, Timestamp, addDoc, serverTimestamp, writeBatch, doc, orderBy } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { format, isAfter, isBefore, startOfDay } from "date-fns"
import { it } from "date-fns/locale"
import Link from "next/link"

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, ArrowLeft, CalendarClock, Tag, Info, ShieldCheck, Zap, Calendar } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface Subscription {
    id: string;
    name: string;
    type: 'monthly' | 'seasonal';
    totalPrice: number;
    sumupLink?: string;
    validityStartDate: Timestamp;
    validityEndDate: Timestamp;
}

export default function MonthlySubscriptionPage() {
    const [user] = useAuthState(auth);
    const router = useRouter();
    const { toast } = useToast();

    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [subscription, setSubscription] = useState<Subscription | null>(null);

    useEffect(() => {
        const fetchCurrentSubscription = async () => {
            try {
                const now = new Date();
                
                // Query semplice che non richiede indici complessi
                const q = query(
                    collection(db, "subscriptions"),
                    where("type", "==", "monthly")
                );
                
                const querySnapshot = await getDocs(q);
                
                // Filtra i risultati in locale per trovare quello valido
                const allMonthlySubs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Subscription));

                const validSubscription = allMonthlySubs.find(sub => {
                    const startDate = sub.validityStartDate.toDate();
                    const endDate = sub.validityEndDate.toDate();
                    // L'abbonamento è valido se la data di oggi è uguale o successiva alla data di inizio
                    // E se la data di oggi è precedente alla data di fine
                    return isAfter(now, startDate) && isBefore(now, endDate);
                });

                if (validSubscription) {
                    setSubscription(validSubscription);
                } else {
                    setSubscription(null);
                }

            } catch (error) {
                console.error("Error fetching monthly subscription:", error);
                toast({
                    variant: "destructive",
                    title: "Errore",
                    description: "Impossibile caricare l'abbonamento del mese corrente.",
                });
            } finally {
                setLoading(false);
            }
        };

        fetchCurrentSubscription();
    }, [toast]);

     const handlePurchase = async () => {
        if (!user || !subscription) {
            toast({ variant: "destructive", title: "Errore", description: "Dati mancanti per procedere." });
            return;
        }

        setIsSubmitting(true);
        const paymentMethod = subscription.sumupLink ? "online" : "in_person";

        try {
            const batch = writeBatch(db);

            // 1. Create payment record
            const paymentRef = doc(collection(db, "users", user.uid, "payments"));
            batch.set(paymentRef, {
                userId: user.uid,
                createdAt: serverTimestamp(),
                amount: subscription.totalPrice,
                description: subscription.name,
                type: 'subscription',
                status: 'pending',
                paymentMethod: paymentMethod,
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

            toast({
                title: "Richiesta Inviata!",
                description: "La tua richiesta di abbonamento è in attesa di approvazione.",
            });
            
            if (paymentMethod === 'online' && subscription.sumupLink) {
                 window.open(subscription.sumupLink, '_blank');
            }

            router.push("/dashboard/subscriptions");

        } catch (error) {
             console.error("Error during purchase:", error);
             toast({ variant: "destructive", title: "Errore", description: "Impossibile completare l'acquisto." });
             setIsSubmitting(false);
        }
    };


    if (loading) {
        return (
            <div className="flex h-full w-full items-center justify-center">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </div>
        );
    }
    
    return (
        <div className="flex w-full flex-col items-center">
            <Card className="w-full max-w-2xl">
                <CardHeader>
                    <CardTitle className="text-2xl">Abbonamento Mensile</CardTitle>
                    {subscription ? (
                        <CardDescription>
                            Acquista l'accesso ai corsi per il mese di <strong className="capitalize text-foreground">{format(subscription.validityStartDate.toDate(), 'MMMM yyyy', { locale: it })}</strong>.
                        </CardDescription>
                    ) : (
                         <CardDescription>
                            Informazioni sull'abbonamento mensile.
                        </CardDescription>
                    )}
                </CardHeader>
                <CardContent>
                    {subscription ? (
                        <div className="space-y-6">
                            <div className="p-6 border rounded-lg bg-background/50 space-y-4">
                               <div className="flex justify-between items-baseline">
                                     <h3 className="text-xl font-bold text-primary">{subscription.name}</h3>
                                     <p className="text-3xl font-bold">{subscription.totalPrice.toFixed(2)}€</p>
                               </div>
                                <div className="text-sm text-muted-foreground space-y-2">
                                     <div className="flex items-center">
                                        <Calendar className="h-4 w-4 mr-2"/>
                                        <span>Valido dal {format(subscription.validityStartDate.toDate(), 'dd/MM/yyyy')} al {format(subscription.validityEndDate.toDate(), 'dd/MM/yyyy')}</span>
                                    </div>
                                    <div className="flex items-center">
                                        <Zap className="h-4 w-4 mr-2"/>
                                        <span>Accesso a tutti i corsi della tua disciplina in una palestra.</span>
                                    </div>
                                     <div className="flex items-center">
                                        <ShieldCheck className="h-4 w-4 mr-2"/>
                                        <span>Copertura assicurativa inclusa per il periodo di validità.</span>
                                    </div>
                                </div>
                            </div>
                             <Alert variant="info">
                                <Info className="h-4 w-4" />
                                <AlertTitle>Procedura di Acquisto</AlertTitle>
                                <AlertDescription>
                                   Cliccando su "Acquista Ora", la tua richiesta verrà inviata alla segreteria. L'abbonamento sarà attivo dopo la conferma del pagamento. {subscription.sumupLink ? "Verrai reindirizzato alla pagina di pagamento SumUp." : "Potrai pagare in sede."}
                                </AlertDescription>
                            </Alert>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-64 text-center text-muted-foreground border-2 border-dashed rounded-lg">
                            <CalendarClock className="h-16 w-16 mb-4" />
                            <h2 className="text-xl font-semibold">Nessun Abbonamento Disponibile</h2>
                            <p className="mt-2">Al momento non ci sono abbonamenti mensili acquistabili. Contatta la segreteria per maggiori informazioni.</p>
                        </div>
                    )}
                </CardContent>
                <CardFooter className="flex-col gap-4">
                     {subscription && (
                        <Button className="w-full" size="lg" onClick={handlePurchase} disabled={isSubmitting}>
                           {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <Tag className="mr-2" />}
                           Acquista Ora
                        </Button>
                    )}
                    <Button asChild variant="outline" className="w-full">
                        <Link href="/dashboard/subscriptions">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Torna Indietro
                        </Link>
                    </Button>
                </CardFooter>
            </Card>
        </div>
    )
}
