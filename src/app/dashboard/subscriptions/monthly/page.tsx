
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
import { Loader2, CalendarClock, ArrowLeft, ShieldCheck, Zap, AlertTriangle, CreditCard, Landmark, University } from "lucide-react"
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
    };
    subscriptionAccessStatus?: 'active' | 'pending' | 'expired';
}

interface BankDetails {
    recipientName: string;
    bankName: string;
    iban: string;
}

type PaymentMethod = "online" | "in_person" | "bank_transfer";

function SubscriptionCard({ subscription, onPurchase, isSubmitting, hasActiveOrPending, onOpenPaymentDialog }: { subscription: Subscription; onPurchase: (sub: Subscription, method: PaymentMethod) => void; isSubmitting: boolean; hasActiveOrPending: boolean; onOpenPaymentDialog: () => void }) {
    const now = new Date();
    const isPurchaseWindowOpen = 
        subscription.purchaseStartDate && subscription.purchaseEndDate ?
        isAfter(now, subscription.purchaseStartDate.toDate()) && isBefore(now, subscription.purchaseEndDate.toDate())
        : true; // Se non ci sono date, è sempre acquistabile

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
                    onClick={onOpenPaymentDialog} 
                    disabled={isSubmitting || hasActiveOrPending || !isPurchaseWindowOpen}
                    className="w-full" 
                    size="lg"
                >
                    {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : null}
                    {hasActiveOrPending ? "Pagamento già in corso" : !isPurchaseWindowOpen ? "Non ancora acquistabile" : "Acquista Ora"}
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
    const [bankDetails, setBankDetails] = useState<BankDetails | null>(null);
    
    // Stati per il modale di pagamento
    const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
    const [isBankTransferDialogOpen, setIsBankTransferDialogOpen] = useState(false);


    useEffect(() => {
        const fetchSubscriptionData = async () => {
            if (!user) {
                setLoading(false);
                return;
            }

            try {
                 const [subsSnapshot, userDocSnap, bankDetailsSnap] = await Promise.all([
                    getDocs(query(collection(db, "subscriptions"), where("type", "==", "monthly"))),
                    getDoc(doc(db, "users", user.uid)),
                    getDoc(doc(db, "settings", "bankDetails"))
                ]);
                
                if (bankDetailsSnap.exists()) {
                    setBankDetails(bankDetailsSnap.data() as BankDetails);
                }

                const allMonthlySubs = subsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Subscription));
                const currentUserData = userDocSnap.exists() ? userDocSnap.data() as UserData : null;
                setUserData(currentUserData);
                
                const now = new Date();
                let subToShow: Subscription | null = null;
                
                if (allMonthlySubs.length > 0) {
                     // Priorità 1: C'è una finestra di acquisto attiva?
                    const purchasableSub = allMonthlySubs.find(sub => 
                        sub.purchaseStartDate && sub.purchaseEndDate &&
                        isAfter(now, sub.purchaseStartDate.toDate()) && isBefore(now, sub.purchaseEndDate.toDate())
                    );
                    
                    if (purchasableSub) {
                        subToShow = purchasableSub;
                    } else {
                        // Priorità 2: Se no, c'è un abbonamento la cui validità copre oggi? (per mostrare info all'utente)
                        const validSub = allMonthlySubs.find(sub =>
                            isAfter(now, sub.validityStartDate.toDate()) && isBefore(now, sub.validityEndDate.toDate())
                        );
                        if (validSub) {
                             subToShow = validSub;
                        } else {
                            // Priorità 3: Se no, c'è un abbonamento futuro acquistabile?
                            const futureSubs = allMonthlySubs
                                .filter(sub => sub.purchaseStartDate && isAfter(sub.purchaseStartDate.toDate(), now))
                                .sort((a, b) => a.purchaseStartDate!.toMillis() - b.purchaseStartDate!.toMillis());
                            
                            if (futureSubs.length > 0) {
                                subToShow = futureSubs[0];
                            }
                        }
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
    
    const handlePurchase = async (subscription: Subscription, method: PaymentMethod) => {
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
                paymentMethod: method,
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

            if (method === 'online' && subscription.sumupLink) {
                window.open(subscription.sumupLink, '_blank');
            }
            
            // Refresh data on the page
             setUserData(prev => prev ? ({...prev, subscriptionAccessStatus: 'pending'}) : null);
             setIsPaymentDialogOpen(false);


        } catch (error) {
            console.error("Error purchasing subscription: ", error);
            toast({ title: "Errore", description: "Impossibile completare l'acquisto. Riprova.", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    }
    
    const handlePaymentDialogSubmit = () => {
        if (!availableSubscription || !selectedPaymentMethod) {
            toast({ title: "Selezione mancante", description: "Per favore, scegli un metodo di pagamento.", variant: "destructive" });
            return;
        }
        
        if (selectedPaymentMethod === 'bank_transfer') {
            setIsBankTransferDialogOpen(true);
        } else {
            handlePurchase(availableSubscription, selectedPaymentMethod);
        }
    }
    
    const handleBankTransferConfirm = () => {
        if (availableSubscription) {
            handlePurchase(availableSubscription, 'bank_transfer');
        }
        setIsBankTransferDialogOpen(false);
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
                <>
                    <SubscriptionCard 
                        subscription={availableSubscription} 
                        onPurchase={handlePurchase}
                        isSubmitting={isSubmitting}
                        hasActiveOrPending={!!hasActiveOrPending}
                        onOpenPaymentDialog={() => setIsPaymentDialogOpen(true)}
                    />

                    <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Scegli Metodo di Pagamento</DialogTitle>
                                <DialogDescription>
                                    Come preferisci saldare la quota di {availableSubscription.totalPrice.toFixed(2)}€ per {availableSubscription.name}?
                                </DialogDescription>
                            </DialogHeader>
                            <RadioGroup
                                value={selectedPaymentMethod || ""}
                                onValueChange={(value) => setSelectedPaymentMethod(value as PaymentMethod)}
                                className="space-y-4 py-4"
                            >
                               <Label
                                    htmlFor="online"
                                    className="flex cursor-pointer items-start space-x-4 rounded-md border p-4 transition-all hover:bg-accent/50 has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                                >
                                    <RadioGroupItem value="online" id="online" className="mt-1" />
                                    <div className="flex-1 space-y-1">
                                        <h4 className="font-semibold">Online (Carta di Credito)</h4>
                                        <p className="text-sm text-muted-foreground">
                                            Paga in modo sicuro con SumUp. Verrai reindirizzato al sito del gestore.
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
                                            Visualizza i dati per effettuare il bonifico. L'attivazione richiede verifica manuale.
                                        </p>
                                    </div>
                                    <University className="h-6 w-6 text-muted-foreground" />
                                </Label>

                                <Label
                                    htmlFor="in_person"
                                    className="flex cursor-pointer items-start space-x-4 rounded-md border p-4 transition-all hover:bg-accent/50 has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                                >
                                    <RadioGroupItem value="in_person" id="in_person" className="mt-1" />
                                    <div className="flex-1 space-y-1">
                                        <h4 className="font-semibold">In Sede (Contanti o Bancomat)</h4>
                                        <p className="text-sm text-muted-foreground">
                                           Paga direttamente in palestra. L'attivazione richiede verifica manuale.
                                        </p>
                                    </div>
                                    <Landmark className="h-6 w-6 text-muted-foreground" />
                                </Label>
                            </RadioGroup>
                            <DialogFooter>
                                <Button variant="ghost" onClick={() => setIsPaymentDialogOpen(false)}>Annulla</Button>
                                <Button onClick={handlePaymentDialogSubmit} disabled={!selectedPaymentMethod || isSubmitting}>
                                    {isSubmitting && <Loader2 className="animate-spin mr-2" />}
                                    Conferma
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                    
                     <Dialog open={isBankTransferDialogOpen} onOpenChange={setIsBankTransferDialogOpen}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Dati per Bonifico Bancario</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4 text-sm">
                                {bankDetails ? (
                                    <>
                                        <div className="space-y-1"><p className="font-semibold">Intestatario:</p><p>{bankDetails.recipientName}</p></div>
                                        <div className="space-y-1"><p className="font-semibold">Banca:</p><p>{bankDetails.bankName}</p></div>
                                        <div className="space-y-1"><p className="font-semibold">IBAN:</p><p className="font-mono bg-muted p-2 rounded-md">{bankDetails.iban}</p></div>
                                    </>
                                ) : <Loader2 className="h-6 w-6 animate-spin" />}
                                <div className="space-y-1"><p className="font-semibold">Importo:</p><p>{availableSubscription.totalPrice.toFixed(2)} €</p></div>
                                <div className="space-y-1"><p className="font-semibold">Causale:</p><p className="font-mono bg-muted p-2 rounded-md">{`${availableSubscription.name} ${userData?.name || ''} ${userData?.surname || ''}`.trim()}</p></div>
                            </div>
                            <DialogFooter>
                                <Button onClick={handleBankTransferConfirm} className="w-full">Ho copiato i dati, invia richiesta</Button>
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
