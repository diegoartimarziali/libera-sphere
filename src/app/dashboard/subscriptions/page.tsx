
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { collection, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, CheckCircle, XCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface Subscription {
    id: string;
    name: string;
    price: number;
    description: string;
    type: 'monthly' | 'seasonal';
}

function isSeasonalWindowActive(): boolean {
    const today = new Date();
    const currentYear = today.getFullYear();
    const start = new Date(currentYear, 7, 31); // 31 Agosto
    const end = new Date(currentYear, 9, 10);   // 10 Ottobre

    return today >= start && today <= end;
}

export default function SubscriptionsPage() {
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
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
                });

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
        // Per ora, logghiamo la selezione. In futuro qui ci sarà la logica di pagamento.
        console.log("Selected subscription:", sub);
        toast({
            title: "Abbonamento Selezionato",
            description: `Hai selezionato ${sub.name}. Prossimamente, il pagamento!`,
        });
        // router.push(`/dashboard/payment?subId=${sub.id}`);
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-full">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </div>
        );
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
                 <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle>Nessun Abbonamento Disponibile</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">Al momento non ci sono abbonamenti acquistabili. Controlla più tardi o contatta la segreteria.</p>
                    </CardContent>
                 </Card>
            ) : (
                <div className="grid w-full max-w-4xl grid-cols-1 gap-6 md:grid-cols-2">
                    {subscriptions.map((sub) => (
                        <Card key={sub.id} className="flex flex-col">
                            {sub.type === 'seasonal' && <Badge className="absolute -top-3 right-4">Consigliato</Badge>}
                            <CardHeader>
                                <CardTitle className="text-2xl">{sub.name}</CardTitle>
                                <CardDescription>{sub.description}</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-grow space-y-4">
                                <div className="text-4xl font-bold">
                                    {sub.price}€
                                    <span className="text-lg font-normal text-muted-foreground">/{sub.type === 'monthly' ? 'mese' : 'stagione'}</span>
                                </div>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-center">
                                        <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                                        Accesso a tutte le lezioni
                                    </li>
                                    <li className="flex items-center">
                                         <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                                        Copertura assicurativa inclusa
                                    </li>
                                    {sub.type === 'monthly' ? (
                                        <li className="flex items-center">
                                            <XCircle className="h-4 w-4 mr-2 text-destructive" />
                                            Nessun vincolo a lungo termine
                                        </li>
                                    ) : (
                                         <li className="flex items-center">
                                            <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                                            Massimo risparmio
                                        </li>
                                    )}
                                </ul>
                            </CardContent>
                            <CardFooter>
                                <Button 
                                    className="w-full" 
                                    onClick={() => handleSelectSubscription(sub)}
                                    variant={sub.type === 'seasonal' ? 'default' : 'secondary'}
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
