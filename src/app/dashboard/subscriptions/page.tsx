
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { collection, doc, getDocs, serverTimestamp, updateDoc } from "firebase/firestore"
import { db, auth } from "@/lib/firebase"
import { useAuthState } from "react-firebase-hooks/auth"
import { useToast } from "@/hooks/use-toast"

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, CheckCircle, XCircle, ArrowLeft } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface Subscription {
    id: string;
    name: string;
    price: number;
    description: string;
    type: 'monthly' | 'seasonal';
    sumupLink: string;
}

function isSeasonalWindowActive(): boolean {
    const today = new Date();
    const currentYear = today.getFullYear();
    // La finestra va dal 1 Settembre al 31 Ottobre
    const start = new Date(currentYear, 8, 1); // Mese 8 è Settembre
    const end = new Date(currentYear, 9, 31);   // Mese 9 è Ottobre

    return today >= start && today <= end;
}

// Componente per lo Step di Pagamento Online (iFrame)
function OnlinePaymentStep({ 
    subscription,
    onBack, 
    onNext,
    isSubmitting
}: { 
    subscription: Subscription,
    onBack: () => void; 
    onNext: () => void,
    isSubmitting: boolean
}) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Pagamento Abbonamento</CardTitle>
                <CardDescription>
                    Stai per acquistare l'abbonamento <span className="font-semibold text-foreground">{subscription.name}</span>.
                    Completa il pagamento di {subscription.price}€ tramite il portale sicuro di SumUp qui sotto.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="aspect-video w-full">
                    <iframe
                        src={subscription.sumupLink}
                        className="h-full w-full rounded-md border"
                        title={`Pagamento SumUp ${subscription.name}`}
                    ></iframe>
                </div>
                <p className="text-sm text-muted-foreground">
                    Se hai problemi a visualizzare il modulo, puoi aprirlo in una nuova scheda <a href={subscription.sumupLink} target="_blank" rel="noopener noreferrer" className="underline">cliccando qui</a>.
                </p>
            </CardContent>
            <CardFooter className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
                <Button variant="outline" onClick={onBack} disabled={isSubmitting}>
                    <ArrowLeft />
                    Torna alla Scelta
                </Button>
                <Button onClick={onNext} disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="animate-spin" /> : <CheckCircle />}
                    Ho effettuato il pagamento
                </Button>
            </CardFooter>
        </Card>
    );
}

export default function SubscriptionsPage() {
    const [user] = useAuthState(auth);
    const [step, setStep] = useState(1);
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const router = useRouter();
    const { toast } = useToast();

    useEffect(() => {
        const fetchSubscriptions = async () => {
            try {
                const subsCollection = collection(db, 'subscriptions');
                const subsSnapshot = await getDocs(subsCollection);
                const subsList = subsSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as Subscription));
                
                const seasonalActive = isSeasonalWindowActive();

                const availableSubs = subsList.filter(sub => {
                    if (sub.type === 'seasonal') {
                        return seasonalActive;
                    }
                    return true;
                }).sort((a,b) => a.price - b.price); // Ordina per prezzo

                setSubscriptions(availableSubs);
            } catch (error) {
                console.error("Error fetching subscriptions:", error);
                toast({ title: "Errore", description: "Impossibile caricare gli abbonamenti.", variant: "destructive" });
            } finally {
                setLoading(false);
            }
        };

        fetchSubscriptions();
    }, [toast]);

    const handleSelectSubscription = (sub: Subscription) => {
        setSelectedSubscription(sub);
        setStep(2);
    };

    const handleConfirmPayment = async () => {
        if (!user || !selectedSubscription) {
            toast({ title: "Errore", description: "Utente o abbonamento non valido.", variant: "destructive" });
            return;
        }

        setIsSubmitting(true);
        try {
            const userDocRef = doc(db, "users", user.uid);
            await updateDoc(userDocRef, {
                subscription: {
                    id: selectedSubscription.id,
                    name: selectedSubscription.name,
                    type: selectedSubscription.type,
                    price: selectedSubscription.price,
                    purchasedAt: serverTimestamp(),
                    paymentStatus: 'pending_confirmation',
                }
            });

            toast({
                title: "Pagamento Inviato",
                description: `La tua richiesta per l'abbonamento ${selectedSubscription.name} è in fase di verifica.`,
            });
            router.push('/dashboard');

        } catch (error) {
            console.error("Error confirming payment:", error);
            toast({ title: "Errore", description: "Impossibile confermare il pagamento. Riprova.", variant: "destructive" });
        } finally {
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
    
    if (step === 2 && selectedSubscription) {
        return (
             <div className="flex w-full flex-col items-center">
                <div className="w-full max-w-3xl">
                    <OnlinePaymentStep 
                        subscription={selectedSubscription}
                        onBack={() => setStep(1)}
                        onNext={handleConfirmPayment}
                        isSubmitting={isSubmitting}
                    />
                </div>
            </div>
        )
    }

    return (
        <div className="flex w-full flex-col items-center">
            <div className="mb-8 text-center">
                <h1 className="text-3xl font-bold">Scegli il tuo Abbonamento</h1>
                <p className="mt-2 text-muted-foreground">
                    Seleziona il piano più adatto a te per accedere a tutte le attività.
                </p>
            </div>
            
            {subscriptions.length === 0 ? (
                 <Card className="w-full max-w-md text-center">
                    <CardHeader>
                        <CardTitle>Nessun Abbonamento Disponibile</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">Al momento non ci sono abbonamenti acquistabili. L'abbonamento stagionale è disponibile solo dal 1 Settembre al 31 Ottobre. Contatta la segreteria per maggiori informazioni.</p>
                    </CardContent>
                    <CardFooter>
                        <Button onClick={() => router.push('/dashboard')} className="w-full">Torna alla Dashboard</Button>
                    </CardFooter>
                 </Card>
            ) : (
                <div className="grid w-full max-w-4xl grid-cols-1 gap-8 md:grid-cols-2">
                    {subscriptions.map((sub) => (
                        <Card key={sub.id} className="flex flex-col border-2 hover:border-primary transition-all">
                            {sub.type === 'seasonal' && <Badge className="absolute -top-3 right-4">Consigliato</Badge>}
                            <CardHeader>
                                <CardTitle className="text-2xl">{sub.name}</CardTitle>
                                <CardDescription>{sub.description}</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-grow space-y-4">
                                <div className="text-5xl font-bold">
                                    {sub.price}€
                                    <span className="text-lg font-normal text-muted-foreground">/{sub.type === 'monthly' ? 'mese' : 'stagione'}</span>
                                </div>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-center">
                                        <CheckCircle className="h-4 w-4 mr-2 text-green-500 flex-shrink-0" />
                                        <span>Accesso a tutte le lezioni della tua disciplina</span>
                                    </li>
                                    <li className="flex items-center">
                                         <CheckCircle className="h-4 w-4 mr-2 text-green-500 flex-shrink-0" />
                                         <span>Copertura assicurativa sempre inclusa</span>
                                    </li>
                                    {sub.type === 'monthly' ? (
                                        <li className="flex items-center">
                                            <XCircle className="h-4 w-4 mr-2 text-destructive flex-shrink-0" />
                                            <span>Nessun vincolo a lungo termine, massima flessibilità</span>
                                        </li>
                                    ) : (
                                         <li className="flex items-center">
                                            <CheckCircle className="h-4 w-4 mr-2 text-green-500 flex-shrink-0" />
                                            <span>Il modo più conveniente per vivere un anno di sport</span>
                                        </li>
                                    )}
                                </ul>
                            </CardContent>
                            <CardFooter>
                                <Button 
                                    className="w-full" 
                                    onClick={() => handleSelectSubscription(sub)}
                                    variant={sub.type === 'seasonal' ? 'default' : 'secondary'}
                                    size="lg"
                                >
                                    Scegli {sub.name}
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
