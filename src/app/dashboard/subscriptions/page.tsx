
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { collection, doc, getDocs, serverTimestamp, updateDoc, addDoc, getDoc, Timestamp } from "firebase/firestore"
import { db, auth } from "@/lib/firebase"
import { useAuthState } from "react-firebase-hooks/auth"
import { useToast } from "@/hooks/use-toast"
import { format, lastDayOfMonth } from "date-fns"
import { it } from "date-fns/locale"

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, CheckCircle, XCircle, ArrowLeft, CreditCard, Landmark, University, CalendarClock, Info } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { cn } from "@/lib/utils"


interface Subscription {
    id: string;
    name: string;
    price: number;
    description: string;
    type: 'monthly' | 'seasonal';
    sumupLink: string;
    purchaseStartDate?: Timestamp;
    purchaseEndDate?: Timestamp;
    isAvailable?: boolean; // Questo verrà calcolato dinamicamente
}

interface UserSubscription {
    name: string;
    type: 'monthly' | 'seasonal';
    purchasedAt: Timestamp;
    expiresAt?: Timestamp;
    status: 'active' | 'pending' | 'expired';
}

type PaymentMethod = "in_person" | "online" | "bank_transfer"

interface ActivitySettings {
    startDate: Timestamp;
    endDate: Timestamp;
}

// Componente Card per lo stato dell'abbonamento
function SubscriptionStatusCard({ userSubscription }: { userSubscription: UserSubscription }) {
    const router = useRouter();

    const getStatusVariant = () => {
        switch(userSubscription.status) {
            case 'active': return 'default';
            case 'pending': return 'secondary';
            case 'expired': return 'destructive';
            default: return 'secondary';
        }
    }
    const getStatusLabel = () => {
        switch(userSubscription.status) {
            case 'active': return 'Attivo';
            case 'pending': return 'In attesa di approvazione';
            case 'expired': return 'Scaduto';
            default: return 'Sconosciuto';
        }
    }

    return (
        <Card className="w-full max-w-lg mb-8">
            <CardHeader>
                <CardTitle>Il Tuo Abbonamento Attuale</CardTitle>
                <CardDescription>Riepilogo del tuo piano.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                 <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Piano</span>
                    <span className="font-semibold">{userSubscription.name}</span>
                </div>
                 <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Acquistato il</span>
                    <span className="font-semibold">{format(userSubscription.purchasedAt.toDate(), "dd MMMM yyyy", { locale: it })}</span>
                </div>
                 {userSubscription.expiresAt && (
                    <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Scade il</span>
                        <span className="font-semibold">{format(userSubscription.expiresAt.toDate(), "dd MMMM yyyy", { locale: it })}</span>
                    </div>
                )}
                <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Stato</span>
                    <Badge variant={getStatusVariant()}>
                       {getStatusLabel()}
                    </Badge>
                </div>
            </CardContent>
            <CardFooter className="flex-col gap-4">
                {userSubscription.status === 'pending' && (
                     <Alert>
                        <CalendarClock className="h-4 w-4" />
                        <AlertTitle>Pagamento in Verifica</AlertTitle>
                        <AlertDescription>
                          Il tuo abbonamento sarà attivato non appena il pagamento verrà confermato dalla segreteria.
                        </AlertDescription>
                    </Alert>
                )}
                 {userSubscription.status === 'expired' && (
                     <Alert variant="destructive">
                        <CalendarClock className="h-4 w-4" />
                        <AlertTitle>Abbonamento Scaduto</AlertTitle>
                        <AlertDescription>
                          Il tuo abbonamento non è più valido. Acquistane uno nuovo per continuare ad accedere ai corsi.
                        </AlertDescription>
                    </Alert>
                )}
                 <Button className="w-full" onClick={() => router.push('/dashboard/payments')}>
                    Visualizza i Miei Pagamenti
                </Button>
                 {userSubscription.status === 'expired' && (
                     <Button className="w-full" variant="default" onClick={() => window.location.reload()}>
                        Acquista un nuovo abbonamento
                    </Button>
                )}
            </CardFooter>
        </Card>
    );
}

// Componente per la selezione dell'abbonamento
function SubscriptionSelectionStep({ subscriptions, onSelect, onBack }: { subscriptions: Subscription[], onSelect: (sub: Subscription) => void, onBack: () => void }) {
    return (
        <div className="flex w-full flex-col items-center">
            <div className="mb-8 text-center">
                <h1 className="text-3xl font-bold">Scegli il tuo Prossimo Abbonamento</h1>
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
                        <p className="text-muted-foreground">Al momento non ci sono abbonamenti acquistabili. Contatta la segreteria per maggiori informazioni.</p>
                    </CardContent>
                    <CardFooter>
                        <Button onClick={onBack} className="w-full">Torna alla Dashboard</Button>
                    </CardFooter>
                 </Card>
            ) : (
                <div className="grid w-full max-w-4xl grid-cols-1 gap-8 md:grid-cols-2">
                    {subscriptions.map((sub) => {
                         if (!sub.isAvailable && sub.type === 'seasonal' && sub.purchaseStartDate && sub.purchaseEndDate) {
                            return (
                                <Card key={sub.id} className="flex flex-col border-2 border-dashed bg-muted/50">
                                    <CardHeader>
                                        <CardTitle className="text-2xl text-muted-foreground">{sub.name}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="flex-grow space-y-4">
                                        <p className="text-muted-foreground">Questo abbonamento offre il massimo vantaggio per la stagione, ma non è ancora il momento giusto per acquistarlo.</p>
                                        <Alert variant="default" className="w-full border-primary/50 text-center">
                                            <CalendarClock className="h-4 w-4" />
                                            <AlertTitle className="font-semibold">Periodo di Acquisto Futuro</AlertTitle>
                                            <AlertDescription>
                                                Potrai acquistare questo piano dal {format(sub.purchaseStartDate.toDate(), "d MMM", { locale: it })} al {format(sub.purchaseEndDate.toDate(), "d MMM yyyy", { locale: it })}.
                                            </AlertDescription>
                                        </Alert>
                                    </CardContent>
                                    <CardFooter>
                                        <Button className="w-full" disabled={true} variant="secondary">Non Disponibile</Button>
                                    </CardFooter>
                                </Card>
                            );
                        }
                        
                        return (
                             <Card 
                                key={sub.id} 
                                className={cn("flex flex-col border-2 transition-all",
                                    sub.isAvailable ? "hover:border-primary" : "bg-muted/50 border-dashed"
                                )}
                            >
                                {sub.type === 'seasonal' && sub.isAvailable && <Badge className="absolute -top-3 right-4">Consigliato</Badge>}
                                <CardHeader>
                                    <CardTitle className="text-2xl">{sub.name}</CardTitle>
                                    
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
                                         {sub.type === 'seasonal' && (
                                            <li className="flex items-center">
                                                <CheckCircle className="h-4 w-4 mr-2 text-green-500 flex-shrink-0" />
                                                <span>Accesso a tutte le Palestre</span>
                                            </li>
                                        )}
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
                                <CardFooter className="flex-col">
                                    {sub.isAvailable && sub.type === 'seasonal' && sub.purchaseStartDate && sub.purchaseEndDate && (
                                         <Alert variant="default" className="w-full mb-4 border-primary/50 text-center">
                                            <Info className="h-4 w-4" />
                                            <AlertTitle className="font-semibold">
                                               Periodo di Acquisto Limitato
                                            </AlertTitle>
                                            <AlertDescription>
                                                Acquistabile fino al {format(sub.purchaseEndDate.toDate(), "d MMM yyyy", { locale: it })}.
                                            </AlertDescription>
                                        </Alert>
                                    )}
                                    <Button 
                                        className="w-full" 
                                        onClick={() => onSelect(sub)}
                                        variant={sub.type === 'seasonal' ? 'default' : 'secondary'}
                                        size="lg"
                                        disabled={!sub.isAvailable}
                                    >
                                        {sub.isAvailable ? `Scegli ${sub.name}` : "Non disponibile"}
                                    </Button>
                                </CardFooter>
                            </Card>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

// Componente per lo Step 2: Pagamento
function PaymentStep({ subscription, onBack, onNext }: { subscription: Subscription, onBack: () => void, onNext: (method: PaymentMethod) => void }) {
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null)
    const isSeasonal = subscription.type === 'seasonal';

    return (
        <Card className="w-full max-w-2xl">
            <CardHeader>
                <CardTitle>Passo 2: Metodo di Pagamento</CardTitle>
                <CardDescription>
                    Stai acquistando: <span className="font-semibold text-foreground">{subscription.name}</span>.
                    Scegli come versare la quota di <span className="font-semibold text-foreground">{subscription.price.toFixed(2)}€</span>.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <RadioGroup
                    value={paymentMethod || ""}
                    onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}
                    className="space-y-4"
                >
                    <Label
                        htmlFor="online"
                        className="flex cursor-pointer items-start space-x-4 rounded-md border p-4 transition-all hover:bg-accent/50 has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                    >
                        <RadioGroupItem value="online" id="online" className="mt-1" />
                        <div className="flex-1 space-y-1">
                            <h4 className="font-semibold">Online (Carta di Credito)</h4>
                            <p className="text-sm text-muted-foreground">
                                Paga in modo sicuro e veloce con la tua carta tramite SumUp.
                            </p>
                        </div>
                         <CreditCard className="h-6 w-6 text-muted-foreground" />
                    </Label>

                    <Label
                        htmlFor="bank_transfer"
                        className="flex cursor-pointer items-start space-x-4 rounded-md border p-4 transition-all hover:bg-accent/50 has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                    >
                        <RadioGroupItem value="bank_transfer" id="bank_transfer" className="mt-1" />
                        <div className="flex-1 space-y-1">
                            <h4 className="font-semibold">Bonifico Bancario</h4>
                            <p className="text-sm text-muted-foreground">
                                Si aprirà un popup con gli estremi per effettuare il bonifico.
                            </p>
                        </div>
                         <University className="h-6 w-6 text-muted-foreground" />
                    </Label>

                    {!isSeasonal && (
                         <Label
                            htmlFor="in_person"
                            className="flex cursor-pointer items-start space-x-4 rounded-md border p-4 transition-all hover:bg-accent/50 has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                        >
                            <RadioGroupItem value="in_person" id="in_person" className="mt-1" />
                            <div className="flex-1 space-y-1">
                                <h4 className="font-semibold">In Sede (Contanti o Bancomat)</h4>
                                <p className="text-sm text-muted-foreground">
                                    Potrai saldare la quota direttamente presso la nostra sede.
                                </p>
                            </div>
                            <Landmark className="h-6 w-6 text-muted-foreground" />
                        </Label>
                    )}
                </RadioGroup>
            </CardContent>
            <CardFooter className="justify-between">
                <Button variant="outline" onClick={onBack}>Indietro</Button>
                <Button onClick={() => onNext(paymentMethod!)} disabled={!paymentMethod}>Prosegui</Button>
            </CardFooter>
        </Card>
    )
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
        <Card className="w-full max-w-3xl">
            <CardHeader>
                <CardTitle>Passo 3: Pagamento Online</CardTitle>
                <CardDescription>
                    Completa il pagamento di {subscription.price}€ per l'abbonamento <span className="font-semibold text-foreground">{subscription.name}</span>.
                    Una volta terminato, clicca sul pulsante per procedere.
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

// Componente per il Popup del Bonifico
function BankTransferDialog({ open, onOpenChange, onConfirm, subscription }: { open: boolean, onOpenChange: (open: boolean) => void, onConfirm: () => void, subscription: Subscription | null }) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Dati per Bonifico Bancario</DialogTitle>
                    <DialogDescription>
                        Copia i dati seguenti per effettuare il bonifico.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4 text-sm">
                    <div className="space-y-1">
                        <p className="font-semibold text-foreground">Intestatario:</p>
                        <p>ASD Libera Energia</p>
                    </div>
                    <div className="space-y-1">
                        <p className="font-semibold text-foreground">Banca:</p>
                        <p>Banco BPM Verres</p>
                    </div>
                    <div className="space-y-1">
                        <p className="font-semibold text-foreground">IBAN:</p>
                        <p className="font-mono bg-muted p-2 rounded-md">IT66R0503431690000000025476</p>
                    </div>
                     <div className="space-y-1">
                        <p className="font-semibold text-foreground">Importo:</p>
                        <p>{subscription ? `${subscription.price.toFixed(2)} €` : <Loader2 className="h-4 w-4 animate-spin" />}</p>
                    </div>
                     <div className="space-y-1">
                        <p className="font-semibold text-foreground">Causale:</p>
                        <p className="font-mono bg-muted p-2 rounded-md">{`Abbonamento ${subscription?.name} [Nome Cognome Socio]`}</p>
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={onConfirm}>Ho capito, confermo</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default function SubscriptionsPage() {
    // Interruttore per la modalità di test
    const FORCE_PURCHASE_MODE = true; // Imposta su 'false' per tornare al comportamento normale

    const [user] = useAuthState(auth);
    const [step, setStep] = useState(1);
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [userSubscription, setUserSubscription] = useState<UserSubscription | null>(null);
    const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
    const [activitySettings, setActivitySettings] = useState<ActivitySettings | null>(null);
    const [isBankTransferDialogOpen, setIsBankTransferDialogOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const router = useRouter();
    const { toast } = useToast();

    useEffect(() => {
        const fetchData = async () => {
            if (!user) {
                setLoading(false);
                return;
            }

            try {
                const userDocRef = doc(db, "users", user.uid);
                const settingsDocRef = doc(db, "settings", "activity");
                
                const [userDocSnap, settingsDocSnap] = await Promise.all([
                    getDoc(userDocRef),
                    getDoc(settingsDocRef)
                ]);

                if (userDocSnap.exists()) {
                    const userData = userDocSnap.data();
                    if (userData.subscriptionAccessStatus && (userData.subscriptionAccessStatus === 'active' || userData.subscriptionAccessStatus === 'pending')) {
                        const subStatus: UserSubscription = {
                            name: userData.activeSubscription.name,
                            type: userData.activeSubscription.type,
                            purchasedAt: userData.activeSubscription.purchasedAt,
                            expiresAt: userData.activeSubscription.expiresAt,
                            status: userData.subscriptionAccessStatus
                        };
                        setUserSubscription(subStatus);
                        // Se l'abbonamento è STAGIONALE, blocchiamo la possibilità di nuovi acquisti
                        if (subStatus.type === 'seasonal') {
                            setLoading(false);
                            return; // Esce dalla funzione, mostrando solo la Status Card
                        }
                    }
                }
                
                if (settingsDocSnap.exists()) {
                    setActivitySettings(settingsDocSnap.data() as ActivitySettings);
                } else {
                     toast({ title: "Errore di configurazione", description: "Impostazioni delle attività non trovate.", variant: "destructive" });
                     setLoading(false);
                     return;
                }
                
                const subsCollection = collection(db, 'subscriptions');
                const subsSnapshot = await getDocs(subsCollection);

                const now = new Date();
                const activitySettingsData = settingsDocSnap.data() as ActivitySettings;

                const allSubs = subsSnapshot.docs.map(doc => {
                    const subData = doc.data() as Omit<Subscription, 'id' | 'isAvailable'>;
                    let isAvailable = false;
                    
                    if (subData.type === 'seasonal' && subData.purchaseStartDate && subData.purchaseEndDate) {
                        const startDate = subData.purchaseStartDate.toDate();
                        const endDate = subData.purchaseEndDate.toDate();
                        // La disponibilità dello stagionale dipende SOLO dalle sue date, non dalla modalità di forzatura
                        isAvailable = now >= startDate && now <= endDate;
                    } else if (subData.type === 'monthly') {
                        const seasonStartDate = activitySettingsData.startDate.toDate();
                        const seasonEndDate = activitySettingsData.endDate.toDate();
                        // Applica la modalità di forzatura solo per il mensile
                        isAvailable = FORCE_PURCHASE_MODE || (now >= seasonStartDate && now <= seasonEndDate);
                    }

                    return {
                        id: doc.id,
                        ...subData,
                        isAvailable: isAvailable
                    };
                }).sort((a,b) => b.price - a.price);

                setSubscriptions(allSubs);

            } catch (error) {
                console.error("Error fetching subscriptions data:", error);
                toast({ title: "Errore", description: "Impossibile caricare i dati degli abbonamenti.", variant: "destructive" });
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user, toast, FORCE_PURCHASE_MODE]);

    const handleSelectSubscription = (sub: Subscription) => {
        setSelectedSubscription(sub);
        setStep(2);
    };
    
    const handlePaymentSubmit = (method: PaymentMethod) => {
        setPaymentMethod(method);
        switch (method) {
            case 'online':
                setStep(3);
                break;
            case 'bank_transfer':
                setIsBankTransferDialogOpen(true);
                break;
            case 'in_person':
            default:
                handleConfirmPayment();
                break;
        }
    };
    
    const handleBankTransferConfirm = () => {
        setIsBankTransferDialogOpen(false);
        handleConfirmPayment();
    }
    
    const handleBack = () => {
        if (step > 1) {
            setStep(prev => prev - 1);
        } else {
            router.push('/dashboard');
        }
    }

    const handleConfirmPayment = async () => {
        if (!user || !selectedSubscription || !activitySettings) {
            toast({ title: "Errore", description: "Dati utente, abbonamento o impostazioni non validi.", variant: "destructive" });
            return;
        }
        
        const finalPaymentMethod = paymentMethod || 'in_person';

        setIsSubmitting(true);
        try {
            const paymentsCollectionRef = collection(db, "users", user.uid, "payments");
            const paymentDocRef = await addDoc(paymentsCollectionRef, {
                userId: user.uid,
                createdAt: serverTimestamp(),
                amount: selectedSubscription.price,
                description: `Abbonamento ${selectedSubscription.name}`,
                type: 'subscription',
                status: 'pending',
                paymentMethod: finalPaymentMethod,
                relatedId: selectedSubscription.id,
            });

            // Calcola la data di scadenza
            let expiryDate: Date;
            if (selectedSubscription.type === 'seasonal') {
                expiryDate = activitySettings.endDate.toDate();
            } else { // monthly
                expiryDate = lastDayOfMonth(new Date());
            }

            const userDocRef = doc(db, "users", user.uid);
            await updateDoc(userDocRef, {
                activeSubscription: {
                    subscriptionId: selectedSubscription.id,
                    name: selectedSubscription.name,
                    type: selectedSubscription.type,
                    purchasedAt: serverTimestamp(),
                    expiresAt: Timestamp.fromDate(expiryDate),
                    paymentId: paymentDocRef.id,
                },
                subscriptionAccessStatus: 'pending',
                updatedAt: serverTimestamp(),
            });

            toast({
                title: "Richiesta Inviata",
                description: `La tua richiesta per l'abbonamento ${selectedSubscription.name} è in fase di verifica.`,
            });
            
            // Ricarica la pagina per riflettere il nuovo stato
            window.location.reload(); 

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
    
    // Mostra solo la status card e blocca tutto se l'abbonamento è STAGIONALE e attivo/pending
    if (userSubscription && userSubscription.type === 'seasonal') {
        return (
             <div className="flex w-full flex-col items-center justify-center">
                <SubscriptionStatusCard userSubscription={userSubscription} />
            </div>
        )
    }

    return (
        <div className="flex w-full flex-col items-center justify-center">
            
            {/* Mostra la status card anche per i mensili, ma non blocca il resto */}
            {userSubscription && userSubscription.type === 'monthly' && (
                 <SubscriptionStatusCard userSubscription={userSubscription} />
            )}

            {step === 1 && (
                <SubscriptionSelectionStep
                    subscriptions={subscriptions}
                    onSelect={handleSelectSubscription}
                    onBack={() => router.push('/dashboard')}
                />
            )}
            {step === 2 && selectedSubscription && (
                <PaymentStep
                    subscription={selectedSubscription}
                    onBack={() => setStep(1)}
                    onNext={handlePaymentSubmit}
                />
            )}
            {step === 3 && selectedSubscription && paymentMethod === 'online' && (
                <OnlinePaymentStep 
                    subscription={selectedSubscription}
                    onBack={() => setStep(2)}
                    onNext={handleConfirmPayment}
                    isSubmitting={isSubmitting}
                />
            )}
            <BankTransferDialog
                open={isBankTransferDialogOpen}
                onOpenChange={setIsBankTransferDialogOpen}
                onConfirm={handleBankTransferConfirm}
                subscription={selectedSubscription}
            />
        </div>
    );
}
