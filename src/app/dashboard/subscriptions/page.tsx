
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { doc, getDoc, Timestamp } from "firebase/firestore"
import { db, auth } from "@/lib/firebase"
import { useAuthState } from "react-firebase-hooks/auth"
import { useToast } from "@/hooks/use-toast"
import { format, differenceInDays, startOfDay } from "date-fns"
import { it } from "date-fns/locale"
import Link from "next/link"

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, CalendarClock, ShieldCheck, Zap } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface UserData {
    activeSubscription?: {
        name: string;
        type: 'monthly' | 'seasonal';
        purchasedAt: Timestamp;
        expiresAt?: Timestamp;
    };
    subscriptionAccessStatus?: 'active' | 'pending' | 'expired';
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
function SubscriptionSelection() {
    return (
        <div className="flex w-full flex-col items-center">
            <div className="mb-8 text-center max-w-2xl">
                <h1 className="text-3xl font-bold">Acquista il tuo abbonamento</h1>
                <p className="mt-2 text-muted-foreground">
                    Scegli il piano più adatto a te per continuare ad allenarti.
                </p>
            </div>
            
            <div className="grid w-full max-w-4xl grid-cols-1 gap-8 md:grid-cols-2">
                
                {/* Card Abbonamento Mensile */}
                <Card className="flex flex-col border-2 hover:border-primary transition-all">
                    <CardHeader>
                        <CardTitle className="text-2xl">Abbonamento Mensile</CardTitle>
                        <CardDescription className="font-bold text-foreground">
                            Flessibilità totale, mese per mese.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-grow space-y-4">
                        <p className="text-muted-foreground">
                            Ideale per chi cerca la massima flessibilità. Paga mese per mese e accedi a tutti i corsi della tua disciplina in una singola palestra.
                        </p>
                        <ul className="space-y-2 text-sm">
                            <li className="flex items-center"><Zap className="h-4 w-4 mr-2 text-primary flex-shrink-0" /><span>Attivazione rapida.</span></li>
                            <li className="flex items-center"><CalendarClock className="h-4 w-4 mr-2 text-primary flex-shrink-0" /><span>Nessun vincolo a lungo termine.</span></li>
                            <li className="flex items-center"><ShieldCheck className="h-4 w-4 mr-2 text-primary flex-shrink-0" /><span>Copertura assicurativa sempre inclusa.</span></li>
                        </ul>
                    </CardContent>
                    <CardFooter>
                         <Button asChild className="w-full" size="lg">
                            <Link href="/dashboard/subscriptions/monthly">Scegli Piano Mensile</Link>
                        </Button>
                    </CardFooter>
                </Card>

                {/* Card Abbonamento Stagionale */}
                <Card className="flex flex-col border-2 border-primary hover:border-primary/80 transition-all relative">
                    <Badge className="absolute -top-3 right-4">Consigliato</Badge>
                    <CardHeader>
                        <CardTitle className="text-2xl">Abbonamento Stagionale</CardTitle>
                        <CardDescription className="font-bold text-foreground">
                            La scelta migliore per un anno di pratica.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-grow space-y-4">
                         <p className="text-muted-foreground">
                           La soluzione completa per chi si impegna per tutta la stagione sportiva. Un unico pagamento per accedere a tutte le lezioni della tua disciplina in qualsiasi palestra.
                        </p>
                        <ul className="space-y-2 text-sm">
                            <li className="flex items-center"><Zap className="h-4 w-4 mr-2 text-primary flex-shrink-0" /><span>Accesso a tutte le palestre.</span></li>
                            <li className="flex items-center"><CalendarClock className="h-4 w-4 mr-2 text-primary flex-shrink-0" /><span>Valido per l'intera stagione sportiva.</span></li>
                            <li className="flex items-center"><ShieldCheck className="h-4 w-4 mr-2 text-primary flex-shrink-0" /><span>Copertura assicurativa sempre inclusa.</span></li>
                        </ul>
                    </CardContent>
                    <CardFooter>
                        <Button asChild className="w-full" size="lg">
                            <Link href="/dashboard/subscriptions/seasonal">Scegli Piano Stagionale</Link>
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}

export default function SubscriptionsPage() {
    const [user] = useAuthState(auth);
    const [userData, setUserData] = useState<UserData | null>(null);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        const fetchUserData = async () => {
            if (!user) {
                setLoading(false);
                return;
            }

            try {
                const userDocRef = doc(db, "users", user.uid);
                const userDocSnap = await getDoc(userDocRef);
                
                if (userDocSnap.exists()) {
                    setUserData(userDocSnap.data() as UserData);
                }
            } catch (error) {
                console.error("Error fetching user data:", error);
                toast({ title: "Errore", description: "Impossibile caricare i dati utente.", variant: "destructive" });
            } finally {
                setLoading(false);
            }
        };

        fetchUserData();
    }, [user, toast]);
    
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
                <SubscriptionSelection />
            )}
        </div>
    );
}
