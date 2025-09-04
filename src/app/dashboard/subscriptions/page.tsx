
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { doc, getDoc, Timestamp, collection, getDocs, query, where, writeBatch, serverTimestamp } from "firebase/firestore"
import { db, auth } from "@/lib/firebase"
import { useAuthState } from "react-firebase-hooks/auth"
import { useToast } from "@/hooks/use-toast"
import { format, differenceInDays, startOfDay } from "date-fns"
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

function SeasonalPaymentDialog({ 
    seasonalSub, 
    bankDetails,
    userData,
    onPurchase 
}: { 
    seasonalSub: Subscription, 
    bankDetails: BankDetails | null, 
    userData: UserData | null,
    onPurchase: (sub: Subscription, method: PaymentMethod) => void 
}) {
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
    const [isBankTransferDialogOpen, setIsBankTransferDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleConfirm = async () => {
        if (!selectedPaymentMethod) return;
        setIsSubmitting(true);
        if (selectedPaymentMethod === 'bank_transfer') {
            setIsBankTransferDialogOpen(true);
        } else {
            await onPurchase(seasonalSub, selectedPaymentMethod);
        }
        setIsSubmitting(false);
    };
    
    const handleBankTransferConfirm = async () => {
        await onPurchase(seasonalSub, 'bank_transfer');
        setIsBankTransferDialogOpen(false);
    }

    return (
        <>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Acquista Abbonamento Stagionale</DialogTitle>
                    <DialogDescription>
                        Scegli come saldare la quota di {seasonalSub.totalPrice.toFixed(2)}€.
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
                </RadioGroup>
                <DialogFooter>
                    <DialogTrigger asChild>
                        <Button variant="ghost">Annulla</Button>
                    </DialogTrigger>
                    <Button onClick={handleConfirm} disabled={!selectedPaymentMethod || isSubmitting}>
                        {isSubmitting && <Loader2 className="animate-spin mr-2" />}
                        Conferma
                    </Button>
                </DialogFooter>
            </DialogContent>
            
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
                        <div className="space-y-1"><p className="font-semibold">Importo:</p><p>{seasonalSub.totalPrice.toFixed(2)} €</p></div>
                        <div className="space-y-1"><p className="font-semibold">Causale:</p><p className="font-mono bg-muted p-2 rounded-md">{`${seasonalSub.name} ${userData?.name || ''} ${userData?.surname || ''}`.trim()}</p></div>
                    </div>
                    <DialogFooter>
                        <Button onClick={handleBankTransferConfirm} className="w-full">Ho copiato i dati, invia richiesta</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}


// Componente per la selezione del nuovo abbonamento
function SubscriptionSelection({ 
    seasonalSub, 
    bankDetails, 
    userData,
    onPurchase 
}: { 
    seasonalSub: Subscription | null, 
    bankDetails: BankDetails | null, 
    userData: UserData | null,
    onPurchase: (sub: Subscription, method: PaymentMethod) => Promise<void> 
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
                        <CardTitle className="text-2xl">Abbonamento Mensile</CardTitle>
                        <CardDescription className="font-bold" style={{ color: 'hsl(30, 100%, 38%)' }}>
                            Flessibilità totale, mese per mese.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-grow" style={{ gap: '28px', display: 'flex', flexDirection: 'column' }}>
                        <p className="text-muted-foreground">
                            Ideale per chi cerca la massima flessibilità. Paga mese per mese e accedi a tutti i corsi della tua disciplina in una singola palestra.
                        </p>
                        <ul className="space-y-3 text-sm">
                            <li className="flex items-center"><Zap className="h-4 w-4 mr-2 text-primary flex-shrink-0" /><span style={{ color: 'hsl(30, 100%, 38%)' }}>Attivazione rapida.</span></li>
                            <li className="flex items-center"><CalendarClock className="h-4 w-4 mr-2 text-primary flex-shrink-0" /><span style={{ color: 'hsl(30, 100%, 38%)' }}>Nessun vincolo a lungo termine.</span></li>
                            <li className="flex items-center"><ShieldCheck className="h-4 w-4 mr-2 text-primary flex-shrink-0" /><span style={{ color: 'hsl(30, 100%, 38%)' }}>Copertura assicurativa sempre inclusa.</span></li>
                        </ul>
                    </CardContent>
                    <CardFooter>
                         <Button asChild className="w-full text-white font-bold" size="lg" style={{ backgroundColor: 'hsl(var(--primary))' }}>
                            <Link href="/dashboard/subscriptions/monthly">Scegli Piano Mensile</Link>
                        </Button>
                    </CardFooter>
                </Card>

                {/* Card Abbonamento Stagionale */}
                 <Dialog>
                    <Card className="flex flex-col border-4 transition-all relative bg-gray-50 hover:border-8" style={{ borderColor: '#0ea5e9' }}>
                        <Badge className="absolute -top-3 right-4 bg-sky-500 text-white">Consigliato</Badge>
                        <CardHeader>
                            <CardTitle className="text-2xl">Abbonamento Stagionale</CardTitle>
                            <CardDescription className="font-bold text-blue-600">
                                La scelta migliore per un anno di pratica.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex-grow space-y-4">
                             <p className="text-muted-foreground">
                               La soluzione completa per tutta la stagione sportiva. Accedi a tutte le lezioni della tua disciplina in qualsiasi palestra.
                            </p>
                            <ul className="space-y-2 text-sm">
                                <li className="flex items-center"><Zap className="h-4 w-4 mr-2 text-primary flex-shrink-0" /><span className="text-blue-600">Accesso a tutte le palestre.</span></li>
                                <li className="flex items-center"><CalendarClock className="h-4 w-4 mr-2 text-primary flex-shrink-0" /><span className="text-blue-600">Valido per l'intera stagione sportiva.</span></li>
                                <li className="flex items-center"><ShieldCheck className="h-4 w-4 mr-2 text-primary flex-shrink-0" /><span className="text-blue-600">Copertura assicurativa sempre inclusa.</span></li>
                            </ul>
                        </CardContent>
                        <CardFooter>
                            <DialogTrigger asChild>
                                <Button className="w-full text-white font-bold bg-blue-600 hover:bg-blue-700" size="lg" disabled={!seasonalSub}>
                                    Scegli Piano Stagionale
                                </Button>
                            </DialogTrigger>
                        </CardFooter>
                    </Card>
                    {seasonalSub && (
                        <SeasonalPaymentDialog 
                            seasonalSub={seasonalSub} 
                            bankDetails={bankDetails}
                            userData={userData}
                            onPurchase={onPurchase}
                        />
                    )}
                 </Dialog>
            </div>
        </div>
    );
}

export default function SubscriptionsPage() {
    const [user] = useAuthState(auth);
    const [userData, setUserData] = useState<UserData | null>(null);
    const [seasonalSub, setSeasonalSub] = useState<Subscription | null>(null);
    const [bankDetails, setBankDetails] = useState<BankDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();
    const router = useRouter();


    useEffect(() => {
        const fetchInitialData = async () => {
            if (!user) {
                setLoading(false);
                return;
            }

            try {
                const [subsSnapshot, userDocSnap, bankDetailsSnap] = await Promise.all([
                    getDocs(query(collection(db, "subscriptions"))),
                    getDoc(doc(db, "users", user.uid)),
                    getDoc(doc(db, "settings", "bankDetails"))
                ]);
                
                if (bankDetailsSnap.exists()) {
                    setBankDetails(bankDetailsSnap.data() as BankDetails);
                }

                if (userDocSnap.exists()) {
                    setUserData(userDocSnap.data() as UserData);
                }
                
                const seasonal = subsSnapshot.docs.find(doc => doc.data().type === 'seasonal');
                if(seasonal) {
                    setSeasonalSub({ id: seasonal.id, ...seasonal.data() } as Subscription);
                }

            } catch (error) {
                console.error("Error fetching user data:", error);
                toast({ title: "Errore", description: "Impossibile caricare i dati utente.", variant: "destructive" });
            } finally {
                setLoading(false);
            }
        };

        fetchInitialData();
    }, [user, toast]);
    
    const handlePurchase = async (subscription: Subscription, method: PaymentMethod) => {
        if (!user) {
            toast({ title: "Utente non trovato", variant: "destructive" });
            return;
        }
        
        try {
            const batch = writeBatch(db);
            
            const paymentRef = doc(collection(db, "users", user.uid, "payments"));
            batch.set(paymentRef, {
                userId: user.uid, createdAt: serverTimestamp(), amount: subscription.totalPrice,
                description: subscription.name, type: 'subscription', status: 'pending',
                paymentMethod: method, subscriptionId: subscription.id,
            });

            const userRef = doc(db, "users", user.uid);
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

    return (
        <div className="flex w-full flex-col items-center justify-center space-y-8">
            {userData && hasActiveOrPendingSubscription ? (
                <SubscriptionStatusCard userData={userData} />
            ) : (
                <SubscriptionSelection 
                    seasonalSub={seasonalSub}
                    bankDetails={bankDetails}
                    userData={userData}
                    onPurchase={handlePurchase}
                />
            )}
        </div>
    );
}
