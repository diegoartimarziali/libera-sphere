
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
    // MODIFICA TEMPORANEA PER SVILUPPO: mostra sempre lo stagionale.
    // In produzione, questa funzione controllerà la data.
    return true; 
    
    /*
    const today = new Date();
    const currentYear = today.getFullYear();
    // La finestra va dal 31 Agosto al 10 Ottobre
    const start = new Date(currentYear, 7, 31); // Mese 7 è Agosto
    const end = new Date(currentYear, 9, 10);   // Mese 9 è Ottobre

    return today >= start && today <= end;
    */
}

export default function SubscriptionsPage() {
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [loading, setLoading] = useState(true);
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
            <div className="flex h-full w-full items-center justify-center">
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
                 <Card className="w-full max-w-md text-center">
                    <CardHeader>
                        <CardTitle>Nessun Abbonamento Disponibile</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">Al momento non ci sono abbonamenti acquistabili. L'abbonamento stagionale è disponibile solo dal 31 Agosto al 10 Ottobre. Contatta la segreteria per maggiori informazioni.</p>
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
