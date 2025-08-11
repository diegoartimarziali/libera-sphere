

"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { collection, doc, getDocs, serverTimestamp, updateDoc, addDoc, getDoc, Timestamp } from "firebase/firestore"
import { db, auth } from "@/lib/firebase"
import { useAuthState } from "react-firebase-hooks/auth"
import { useToast } from "@/hooks/use-toast"
import { format, lastDayOfMonth, isWithinInterval, startOfMonth, endOfMonth, addMonths, getDate, differenceInDays, startOfDay } from "date-fns"
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
    isAvailableForPurchase?: boolean;
    targetDate?: Date; // Data target per l'abbonamento mensile (es. 1 Novembre)
}

interface UserData {
    name: string;
    surname: string;
    activeSubscription?: {
        name: string;
        type: 'monthly' | 'seasonal';
        purchasedAt: Timestamp;
        expiresAt?: Timestamp;
    };
    subscriptionAccessStatus?: 'active' | 'pending' | 'expired';
}

type PaymentMethod = "in_person" | "online" | "bank_transfer"

interface BankDetails {
    recipientName: string;
    bankName: string;
    iban: string;
}

// Componente Card per lo stato dell'abbonamento
function SubscriptionStatusCard({ userData }: { userData: UserData }) {
    if (!userData.activeSubscription || !userData.subscriptionAccessStatus) return null;

    const router = useRouter();
    const { activeSubscription, subscriptionAccessStatus } = userData;

    const getStatusInfo = () => {
        if (activeSubscription.type === 'monthly' && subscriptionAccessStatus === 'active' && activeSubscription.expiresAt) {
            const expiryDate = startOfDay(activeSubscription.expiresAt.toDate());
            const today = startOfDay(new Date());
            const daysDiff = differenceInDays(expiryDate, today);

            if (daysDiff <= 4) {
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
                 {subscriptionAccessStatus === 'expired' && (
                     <Alert variant="destructive">
                        <CalendarClock className="h-4 w-4" />
                        <AlertTitle>Abbonamento Scaduto</AlertTitle>
                        <AlertDescription>
                          Il tuo abbonamento non è più valido. Acquista uno nuovo per continuare ad accedere ai corsi.
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

// Componente per la selezione dell'abbonamento
function SubscriptionSelectionStep({ subscriptions, onSelect }: { subscriptions: Subscription[], onSelect: (sub: Subscription) => void }) {
    
    const containerClasses = subscriptions.length > 1
        ? "grid w-full max-w-4xl grid-cols-1 gap-8 md:grid-cols-2"
        : "flex justify-center w-full";
        
    const cardContainerClasses = subscriptions.length === 1 ? "w-full max-w-md" : "";

    return (
        <div className="flex w-full flex-col items-center">
            <div className="mb-8 text-center max-w-2xl">
                <h1 className="text-3xl font-bold">Acquista il tuo abbonamento</h1>
                <p className="mt-2 text-muted-foreground">
                    Scegli il piano più adatto a te per continuare ad allenarti.
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
                 </Card>
            ) : (
                <div className={containerClasses}>
                    {subscriptions.map((sub) => {
                        let isPurchasable = sub.isAvailableForPurchase ?? false;
                        
                        let disabledReason = "";
                        if (!isPurchasable) {
                             if (sub.type === 'seasonal' && sub.purchaseStartDate && sub.purchaseEndDate) {
                                disabledReason = `Acquistabile dal ${format(sub.purchaseStartDate.toDate(), 'dd/MM/yy')} al ${format(sub.purchaseEndDate.toDate(), 'dd/MM/yy')}`;
                             } else {
                                disabledReason = "Hai già un abbonamento attivo per questo periodo.";
                             }
                        }

                        let dynamicDescription = sub.description;
                        if (sub.type === 'monthly' && sub.targetDate) {
                            dynamicDescription = `Abbonamento valido per il mese di ${format(sub.targetDate, "MMMM yyyy", { locale: it })}`;
                        }


                        return (
                            <div key={sub.id} className={cardContainerClasses}>
                                <Card 
                                    className={cn(
                                        "flex flex-col border-2 transition-all h-full",
                                        !isPurchasable 
                                            ? "border-dashed border-muted-foreground/50 bg-muted/30" 
                                            : "hover:border-primary"
                                    )}
                                >
                                    {sub.type === 'seasonal' && isPurchasable && <Badge className="absolute -top-3 right-4">Consigliato</Badge>}
                                    <CardHeader>
                                        <CardTitle className={cn("text-2xl", !isPurchasable && "text-muted-foreground")}>{sub.name}</CardTitle>
                                        <CardDescription className="font-bold text-foreground">
                                            {dynamicDescription}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="flex-grow space-y-4">
                                        <div className={cn("text-5xl font-bold", !isPurchasable && "text-muted-foreground/80")}>
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
                                            <li className="flex items-center">
                                                 <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                                                <span>Massima flessibilità</span>
                                            </li>
                                        </ul>
                                    </CardContent>
                                    <CardFooter className="flex-col items-start space-y-2">
                                         {!isPurchasable && (
                                            <Alert variant="info" className="w-full text-center">
                                                <Info className="h-4 w-4" />
                                                <AlertDescription>
                                                    {disabledReason}
                                                </AlertDescription>
                                            </Alert>
                                        )}
                                        <Button 
                                            className="w-full" 
                                            onClick={() => onSelect(sub)}
                                            variant={sub.type === 'seasonal' && isPurchasable ? 'default' : 'secondary'}
                                            size="lg"
                                            disabled={!isPurchasable}
                                        >
                                            {!isPurchasable ? "Non Acquistabile" : `Scegli ${sub.name}`}
                                        </Button>
                                    </CardFooter>
                                </Card>
                            </div>
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
                               Paga in modo sicuro e veloce con la tua carta tramite SumUp. Verrai indirizzato al sito SumUp, quando hai effettuato il pagamento torna qui per concludere l'acquisto.
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
                <Button onClick={() => onNext(paymentMethod!)} disabled={!paymentMethod}>Conferma Acquisto</Button>
            </CardFooter>
        </Card>
    )
}

// Componente per il Popup del Bonifico
function BankTransferDialog({ open, onOpenChange, onConfirm, subscription, bankDetails, userName, userSurname }: { open: boolean, onOpenChange: (open: boolean) => void, onConfirm: () => void, subscription: Subscription | null, bankDetails: BankDetails | null, userName?: string, userSurname?: string }) {
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
                    {bankDetails ? (
                        <>
                            <div className="space-y-1">
                                <p className="font-semibold text-foreground">Intestatario:</p>
                                <p>{bankDetails.recipientName}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="font-semibold text-foreground">Banca:</p>
                                <p>{bankDetails.bankName}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="font-semibold text-foreground">IBAN:</p>
                                <p className="font-mono bg-muted p-2 rounded-md">{bankDetails.iban}</p>
                            </div>
                        </>
                    ) : (
                        <div className="flex justify-center items-center h-24">
                            <Loader2 className="h-6 w-6 animate-spin" />
                        </div>
                    )}
                     <div className="space-y-1">
                        <p className="font-semibold text-foreground">Importo:</p>
                        <p>{subscription ? `${subscription.price.toFixed(2)} €` : <Loader2 className="h-4 w-4 animate-spin" />}</p>
                    </div>
                     <div className="space-y-1">
                        <p className="font-semibold text-foreground">Causale:</p>
                        <p className="font-mono bg-muted p-2 rounded-md">{`${subscription?.name} ${userName || ''} ${userSurname || ''}`.trim()}</p>
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
    const [user] = useAuthState(auth);
    const [step, setStep] = useState(1);
    const [availableSubscriptions, setAvailableSubscriptions] = useState<Subscription[]>([]);
    const [userData, setUserData] = useState<UserData | null>(null);
    const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
    const [bankDetails, setBankDetails] = useState<BankDetails | null>(null);
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
                const bankDetailsRef = doc(db, "settings", "bankDetails");
                const subsCollection = collection(db, 'subscriptions');
                
                const [userDocSnap, subsSnapshot, bankDetailsSnap] = await Promise.all([
                    getDoc(userDocRef),
                    getDocs(subsCollection),
                    getDoc(bankDetailsRef)
                ]);
                
                let fetchedUserData: UserData | null = null;
                if (userDocSnap.exists()) {
                    fetchedUserData = userDocSnap.data() as UserData;
                    setUserData(fetchedUserData);
                }
                
                if (bankDetailsSnap.exists()) {
                    setBankDetails(bankDetailsSnap.data() as BankDetails);
                }

                // Logica per determinare gli abbonamenti disponibili
                const now = new Date();
                const dayOfMonth = getDate(now);
                const lastDay = getDate(endOfMonth(now));
                
                let targetDate = startOfMonth(now);
                // Se siamo negli ultimi 5 giorni del mese, l'abbonamento è per il mese successivo
                if (lastDay - dayOfMonth < 5) {
                    targetDate = startOfMonth(addMonths(now, 1));
                }

                const allSubs = subsSnapshot.docs.map(doc => {
                    const subData = doc.data() as Omit<Subscription, 'id' | 'isAvailableForPurchase'>;
                    let isAvailableForPurchase = false;
                    let subTargetDate: Date | undefined = undefined;

                    if (subData.type === 'seasonal') {
                        if (subData.purchaseStartDate && subData.purchaseEndDate) {
                            isAvailableForPurchase = isWithinInterval(now, {
                                start: subData.purchaseStartDate.toDate(),
                                end: subData.purchaseEndDate.toDate()
                            });
                        }
                    } else if (subData.type === 'monthly') {
                        isAvailableForPurchase = true; // Disponibile per l'acquisto
                        subTargetDate = targetDate; // Assegna il mese target
                    }

                    // Ulteriore controllo: l'utente ha già un abbonamento attivo per questo periodo?
                    if (fetchedUserData?.activeSubscription && isAvailableForPurchase) {
                         const expiry = fetchedUserData.activeSubscription.expiresAt?.toDate();
                         if(expiry) {
                             if (subData.type === 'seasonal') {
                                // Se l'abbonamento attivo è stagionale, non può comprarne un altro
                                if (fetchedUserData.activeSubscription.type === 'seasonal' && (fetchedUserData.subscriptionAccessStatus === 'active' || fetchedUserData.subscriptionAccessStatus === 'pending')) {
                                    isAvailableForPurchase = false;
                                }
                             } else if (subData.type === 'monthly' && subTargetDate) {
                                // Se la scadenza dell'abbonamento attivo è nello stesso mese del target, non può comprarlo
                                if (startOfMonth(expiry).getTime() === startOfMonth(subTargetDate).getTime() && (fetchedUserData.subscriptionAccessStatus === 'active' || fetchedUserData.subscriptionAccessStatus === 'pending')) {
                                     isAvailableForPurchase = false;
                                }
                             }
                         }
                    }
                    
                    return {
                        id: doc.id,
                        ...subData,
                        isAvailableForPurchase: isAvailableForPurchase,
                        targetDate: subTargetDate,
                    };
                })
                .filter(s => s.isAvailableForPurchase) // Mostra solo quelli acquistabili
                .sort((a,b) => b.price - a.price); // Ordina per prezzo

                setAvailableSubscriptions(allSubs);

            } catch (error) {
                console.error("Error fetching subscriptions data:", error);
                toast({ title: "Errore", description: "Impossibile caricare i dati degli abbonamenti.", variant: "destructive" });
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user, toast]);

    const handleSelectSubscription = (sub: Subscription) => {
        setSelectedSubscription(sub);
        setStep(2);
    };
    
    const handlePaymentSubmit = (method: PaymentMethod) => {
        switch (method) {
            case 'online':
                if (selectedSubscription?.sumupLink) {
                    window.open(selectedSubscription.sumupLink, '_blank');
                }
                handleConfirmPayment(method);
                break;
            case 'bank_transfer':
                setIsBankTransferDialogOpen(true);
                break;
            case 'in_person':
            default:
                handleConfirmPayment(method);
                break;
        }
    };
    
    const handleBankTransferConfirm = () => {
        setIsBankTransferDialogOpen(false);
        handleConfirmPayment('bank_transfer');
    }

    const handleConfirmPayment = async (finalPaymentMethod: PaymentMethod) => {
        if (!user || !selectedSubscription) {
            toast({ title: "Errore", description: "Dati utente o abbonamento non validi.", variant: "destructive" });
            return;
        }
        
        setIsSubmitting(true);
        try {
            const paymentsCollectionRef = collection(db, "users", user.uid, "payments");
            const paymentDocRef = await addDoc(paymentsCollectionRef, {
                userId: user.uid,
                createdAt: serverTimestamp(),
                amount: selectedSubscription.price,
                description: selectedSubscription.name,
                type: 'subscription',
                status: 'pending',
                paymentMethod: finalPaymentMethod,
                relatedId: selectedSubscription.id,
            });
            
            let expiryDate: Date;
            if (selectedSubscription.type === 'seasonal') {
                const settingsDocRef = doc(db, "settings", "activity");
                const settingsDocSnap = await getDoc(settingsDocRef);
                if (!settingsDocSnap.exists()) throw new Error("Activity settings not found");
                expiryDate = (settingsDocSnap.data() as {endDate: Timestamp}).endDate.toDate();
            } else {
                const target = selectedSubscription.targetDate || new Date();
                expiryDate = endOfMonth(target);
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
    
    const hasActiveOrPendingSubscription = userData?.subscriptionAccessStatus === 'active' || userData?.subscriptionAccessStatus === 'pending';


    return (
        <div className="flex w-full flex-col items-center justify-center space-y-8">
            
             {userData && (userData.subscriptionAccessStatus) && (
                <SubscriptionStatusCard userData={userData} />
            )}

            {!hasActiveOrPendingSubscription && (
              <>
                {step === 1 && (
                     <SubscriptionSelectionStep
                        subscriptions={availableSubscriptions}
                        onSelect={handleSelectSubscription}
                    />
                )}
                {step === 2 && selectedSubscription && (
                    <PaymentStep
                        subscription={selectedSubscription}
                        onBack={() => setStep(1)}
                        onNext={handlePaymentSubmit}
                    />
                )}
              </>
            )}

            <BankTransferDialog
                open={isBankTransferDialogOpen}
                onOpenChange={setIsBankTransferDialogOpen}
                onConfirm={handleBankTransferConfirm}
                subscription={selectedSubscription}
                bankDetails={bankDetails}
                userName={userData?.name}
                userSurname={userData?.surname}
            />
        </div>
    );
}
