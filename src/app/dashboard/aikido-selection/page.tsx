
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

import { useToast } from "@/hooks/use-toast"
import { PersonalDataForm, type PersonalDataSchemaType } from "@/components/dashboard/PersonalDataForm"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { format } from "date-fns"
import { it } from "date-fns/locale"
import { CreditCard, Landmark, ArrowLeft, CheckCircle, Clock, Building, Calendar as CalendarIconDay, CalendarCheck, Info, Sparkles, MessageSquareQuote } from "lucide-react"
import { auth, db } from "@/lib/firebase"
import { useAuthState } from "react-firebase-hooks/auth"
import { doc, updateDoc, collection, getDocs, getDoc, serverTimestamp, query, where, Timestamp, addDoc, limit, orderBy } from "firebase/firestore"
import { Loader2 } from "lucide-react"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { cn } from "@/lib/utils"


interface FeeData {
    name: string;
    price: number;
    sumupLink: string;
}

interface Event {
    id: string;
    startTime: Timestamp;
    endTime: Timestamp;
    title: string;
}

// Tipi di dati
type PaymentMethod = "in_person" | "online"

interface AikidoSelectionData {
    gymId: string;
    gymName: string;
    trialLessons: {
        eventId: string;
        startTime: Timestamp;
        endTime: Timestamp;
    }[];
    discipline: string;
}


// Componente per visualizzare i dati in modo pulito
const DataRow = ({ label, value, icon }: { label: string; value?: string | null, icon?: React.ReactNode }) => (
    value ? (
        <div className="flex items-start">
            {icon && <div className="w-5 text-muted-foreground mt-0.5">{icon}</div>}
            <div className={`flex flex-col sm:flex-row sm:justify-between w-full ${icon ? 'ml-3' : ''}`}>
                <dt className="font-medium text-muted-foreground">{label}</dt>
                <dd className="mt-1 text-foreground sm:mt-0 sm:text-right">{value}</dd>
            </div>
        </div>
    ) : null
);

function AikidoInfoStep({ onBack, onNext, selectionData }: { onBack: () => void; onNext: (data: AikidoSelectionData) => void, selectionData: AikidoSelectionData | null }) {
    const { toast } = useToast();

    if (!selectionData) {
        return (
             <Card>
                <CardHeader>
                    <CardTitle>Caricamento Informazioni Aikido</CardTitle>
                </CardHeader>
                <CardContent className="flex h-64 items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </CardContent>
            </Card>
        )
    }

    const handleConfirm = () => {
        onNext(selectionData);
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Iscrizione Prova di Aikido</CardTitle>
                <CardDescription>
                    Benvenuto! L'Aikido prevede un pacchetto di prova con tre lezioni consecutive. Controlla le date qui sotto e procedi.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-4 rounded-md border p-4">
                    <h3 className="text-lg font-semibold">Dettagli del tuo pacchetto di prova</h3>
                     <dl className="space-y-3">
                        <DataRow label="Disciplina" value={selectionData.discipline} icon={<Sparkles size={16} />} />
                        <DataRow label="Palestra" value={selectionData.gymName} icon={<Building size={16} />} />
                        {selectionData.trialLessons.map((lesson, index) => (
                           <DataRow 
                                key={index}
                                label={`${index + 1}ª Lezione`} 
                                value={`${format(lesson.startTime.toDate(), "EEEE d MMMM", { locale: it })} ore ${format(lesson.startTime.toDate(), "HH:mm")}`} 
                                icon={<CalendarIconDay size={16} />} 
                           />
                        ))}
                    </dl>
                </div>
                 <Alert variant="info">
                    <Info className="h-4 w-4" />
                    <AlertTitle>Nessuna Scelta Richiesta</AlertTitle>
                    <AlertDescription>
                        Le tue tre lezioni di prova vengono prenotate automaticamente. Clicca su "Prosegui" per andare alla scelta del pagamento.
                    </AlertDescription>
                </Alert>
            </CardContent>
            <CardFooter className="justify-between">
                 <Button variant="outline" onClick={onBack}>Indietro</Button>
                 <Button onClick={handleConfirm}>Prosegui al Pagamento</Button>
            </CardFooter>
        </Card>
    )
}

// Componente per lo Step di Pagamento
function PaymentStep({ 
    onBack, 
    onNext,
    fee
}: { 
    onBack: () => void, 
    onNext: (method: PaymentMethod) => void,
    fee: FeeData | null
}) {
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null)

    return (
        <Card>
            <CardHeader>
                <CardTitle>Passo 2: Metodo di Pagamento</CardTitle>
                <CardDescription>
                    Scegli come preferisci pagare la quota di iscrizione di {fee ? `${fee.price}€` : "..."}.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <RadioGroup 
                    value={paymentMethod || ""} 
                    onValueChange={(value) => setPaymentMethod(value as PaymentMethod)} 
                    className="space-y-4"
                >
                    <Label
                        htmlFor="in_person"
                        className="flex cursor-pointer items-start space-x-4 rounded-md border p-4 transition-all hover:bg-accent/50 has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                    >
                        <RadioGroupItem value="in_person" id="in_person" className="mt-1" />
                        <div className="flex-1 space-y-1">
                            <h4 className="font-semibold">In Palestra (Contanti o Bancomat)</h4>
                            <p className="text-sm text-muted-foreground">
                                Potrai saldare la quota di {fee ? `${fee.price}€` : "..."} direttamente presso la nostra sede prima dell'inizio delle lezioni.
                            </p>
                        </div>
                        <Landmark className="h-6 w-6 text-muted-foreground" />
                    </Label>

                    <Label
                        htmlFor="online"
                        className="flex cursor-pointer items-start space-x-4 rounded-md border p-4 transition-all hover:bg-accent/50 has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                    >
                        <RadioGroupItem value="online" id="online" className="mt-1" />
                        <div className="flex-1 space-y-1">
                            <h4 className="font-semibold">Online (Carta di Credito)</h4>
                            <p className="text-sm text-muted-foreground">
                                Paga in modo sicuro e veloce la quota di {fee ? `${fee.price}€` : "..."} con la tua carta tramite SumUp.
                            </p>
                        </div>
                         <CreditCard className="h-6 w-6 text-muted-foreground" />
                    </Label>
                </RadioGroup>
            </CardContent>
            <CardFooter className="justify-between">
                <Button variant="outline" onClick={onBack}>Indietro</Button>
                <Button onClick={() => onNext(paymentMethod!)} disabled={!paymentMethod}>Prosegui</Button>
            </CardFooter>
        </Card>
    )
}

// Componente per lo Step di Pagamento Online con iFrame
function OnlinePaymentStep({ 
    onBack, 
    onNext,
    fee
}: { 
    onBack: () => void, 
    onNext: () => void,
    fee: FeeData | null
}) {
    if (!fee) {
        return <Card><CardContent className="flex justify-center items-center h-48"><Loader2 className="h-8 w-8 animate-spin" /></CardContent></Card>
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Passo 3: Pagamento Online</CardTitle>
                <CardDescription>
                    Completa il pagamento di {fee.price}€ tramite il portale sicuro di SumUp qui sotto. Una volta terminato, clicca sul pulsante per procedere.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                 <div className="aspect-video w-full">
                    <iframe 
                        src={fee.sumupLink}
                        className="h-full w-full rounded-md border"
                        title="Pagamento SumUp"
                    ></iframe>
                </div>
                 <p className="text-sm text-muted-foreground">
                    Se hai problemi a visualizzare il modulo, puoi aprirlo in una nuova scheda <a href={fee.sumupLink} target="_blank" rel="noopener noreferrer" className="underline">clicca qui</a>.
                </p>
            </CardContent>
            <CardFooter className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
                <Button variant="outline" onClick={onBack}>
                    <ArrowLeft />
                    Non posso pagare ora
                </Button>
                <Button onClick={onNext}>
                    <CheckCircle />
                    Ho effettuato il pagamento
                </Button>
            </CardFooter>
        </Card>
    )
}


// Componente per lo Step Finale: Riepilogo e Conferma
function ConfirmationStep({ 
    formData,
    aikidoSelection,
    paymentMethod,
    onBack, 
    onComplete,
    isSubmitting,
    fee
}: { 
    formData: PersonalDataSchemaType,
    aikidoSelection: AikidoSelectionData,
    paymentMethod: PaymentMethod,
    onBack: () => void, 
    onComplete: () => void,
    isSubmitting: boolean,
    fee: FeeData | null
}) {
    const [isConfirmed, setIsConfirmed] = useState(false);
    
    if (!fee) {
        return <Card><CardContent className="flex justify-center items-center h-48"><Loader2 className="h-8 w-8 animate-spin" /></CardContent></Card>
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Passo Finale: Riepilogo e Conferma</CardTitle>
                <CardDescription>
                    Controlla attentamente i dati. Se tutto è corretto, conferma e completa l'iscrizione.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-4 rounded-md border p-4">
                     <h3 className="font-semibold text-lg">Dati Anagrafici</h3>
                     <dl className="space-y-2">
                        <DataRow label="Nome" value={formData.name} />
                        <DataRow label="Cognome" value={formData.surname} />
                        <DataRow label="Email" value={auth.currentUser?.email} />
                     </dl>
                </div>
                                
                <div className="space-y-4 rounded-md border p-4">
                    <h3 className="font-semibold text-lg">Lezioni di Prova di Aikido</h3>
                    <dl className="space-y-3">
                        <DataRow label="Disciplina" value={aikidoSelection.discipline} icon={<Sparkles size={16} />} />
                        <DataRow label="Palestra" value={aikidoSelection.gymName} icon={<Building size={16} />} />
                        {aikidoSelection.trialLessons.map((lesson, index) => (
                           <DataRow 
                                key={index}
                                label={`${index + 1}ª Lezione`} 
                                value={`${format(lesson.startTime.toDate(), "EEEE d MMMM", { locale: it })} ore ${format(lesson.startTime.toDate(), "HH:mm")}`} 
                                icon={<CalendarIconDay size={16} />} 
                           />
                        ))}
                    </dl>
                </div>

                 <div className="space-y-4 rounded-md border p-4">
                    <h3 className="font-semibold text-lg">Metodo di Pagamento</h3>
                    <dl className="space-y-2">
                       <DataRow 
                          label="Metodo Scelto" 
                          value={paymentMethod === 'in_person' ? 'In Palestra' : 'Online con Carta'} 
                       />
                       <DataRow 
                          label={paymentMethod === 'in_person' ? "Importo da Pagare" : "Importo"}
                          value={paymentMethod === 'in_person' ? `${fee.price.toFixed(2)} €` : `${fee.price.toFixed(2)} € (In attesa di conferma)`}
                       />
                    </dl>
                </div>
                
                <div className="flex items-center space-x-2 pt-4">
                    <Checkbox id="confirm-data" checked={isConfirmed} onCheckedChange={(checked) => setIsConfirmed(checked as boolean)} />
                    <Label htmlFor="confirm-data" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Dichiaro che i dati inseriti sono corretti.
                    </Label>
                </div>

            </CardContent>
            <CardFooter className="justify-between">
                <Button variant="outline" onClick={onBack}>Indietro</Button>
                <Button onClick={onComplete} disabled={!isConfirmed || isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Completa Iscrizione
                </Button>
            </CardFooter>
        </Card>
    )
}


export default function AikidoSelectionPage() {
    const [step, setStep] = useState(1)
    const [formData, setFormData] = useState<PersonalDataSchemaType | null>(null)
    const [aikidoSelection, setAikidoSelection] = useState<AikidoSelectionData | null>(null);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null)
    const [feeData, setFeeData] = useState<FeeData | null>(null);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast()
    const router = useRouter()
    const [user] = useAuthState(auth);
    const [isSubmitting, setIsSubmitting] = useState(false);


    useEffect(() => {
        const fetchInitialData = async () => {
            if (!user) {
                setLoading(false);
                return;
            }
            setLoading(true);
            try {
                const userDocRef = doc(db, "users", user.uid);
                const feeDocRef = doc(db, "fees", "trial");
                const paymentsQuery = query(
                    collection(db, 'users', user.uid, 'payments'),
                    where('type', '==', 'trial'),
                    where('status', '==', 'pending'),
                    limit(1)
                );
                
                const [userDocSnap, feeDocSnap, paymentsSnapshot] = await Promise.all([
                    getDoc(userDocRef),
                    getDoc(feeDocRef),
                    getDocs(paymentsQuery)
                ]);
                
                if (feeDocSnap.exists()) setFeeData(feeDocSnap.data() as FeeData);
                else toast({ title: "Errore", description: "Impossibile caricare i dati della quota.", variant: "destructive" });
                
                let fetchedUserData: any = null;
                if (userDocSnap.exists()) {
                    fetchedUserData = userDocSnap.data();

                    if (fetchedUserData.discipline !== 'Aikido') {
                        toast({ title: "Disciplina Errata", description: "Questa pagina è per l'Aikido.", variant: "destructive"});
                        router.push('/dashboard/class-selection');
                        return;
                    }

                    // Pre-fetch delle lezioni di Aikido
                    const eventsQuery = query(
                        collection(db, "events"),
                        where("gymId", "==", fetchedUserData.gym),
                        where("discipline", "==", "Aikido"),
                        where("type", "==", "lesson"),
                        where("startTime", ">=", Timestamp.now()),
                        orderBy("startTime", "asc"),
                        limit(3) // Prendiamo le prime 3 lezioni disponibili
                    );
                    const eventsSnapshot = await getDocs(eventsQuery);

                    if (eventsSnapshot.docs.length < 3) {
                         toast({ title: "Lezioni non disponibili", description: "Non ci sono abbastanza lezioni di Aikido programmate per completare un pacchetto di prova. Contatta la segreteria.", variant: "destructive"});
                         setLoading(false);
                         return;
                    }

                    const gymDoc = await getDoc(doc(db, "gyms", fetchedUserData.gym));

                    const selectionData: AikidoSelectionData = {
                        gymId: fetchedUserData.gym,
                        gymName: gymDoc.exists() ? gymDoc.data()!.name : '',
                        discipline: 'Aikido',
                        trialLessons: eventsSnapshot.docs.map(doc => ({
                            eventId: doc.id,
                            startTime: doc.data().startTime,
                            endTime: doc.data().endTime
                        }))
                    };
                    setAikidoSelection(selectionData);

                } else {
                     toast({ title: "Errore", description: "Dati utente non trovati.", variant: "destructive"});
                     setLoading(false);
                     return;
                }
                
                if (fetchedUserData) {
                     const prefilledData: PersonalDataSchemaType = {
                        name: fetchedUserData.name || "", surname: fetchedUserData.surname || "", taxCode: fetchedUserData.taxCode || "",
                        birthDate: fetchedUserData.birthDate?.toDate() || null, birthPlace: fetchedUserData.birthPlace || "",
                        address: fetchedUserData.address || "", streetNumber: fetchedUserData.streetNumber || "", city: fetchedUserData.city || "",
                        zipCode: fetchedUserData.zipCode || "", province: fetchedUserData.province || "", phone: fetchedUserData.phone || "",
                        isMinor: false, parentData: fetchedUserData.parentData || undefined,
                    };
                    setFormData(prefilledData);
                    
                    if (!paymentsSnapshot.empty) {
                         const paymentData = paymentsSnapshot.docs[0].data();
                         setPaymentMethod(paymentData.paymentMethod as PaymentMethod);
                         setStep(4);
                    }
                }

            } catch (error) {
                console.error("Error fetching initial data:", error);
                toast({ title: "Errore di connessione", description: "Impossibile recuperare i dati. Riprova.", variant: "destructive" });
            } finally {
                setLoading(false);
            }
        };
        fetchInitialData();
    }, [user, toast, router]);

        
    const handleNextStep1 = (data: AikidoSelectionData) => {
        setAikidoSelection(data);
        setStep(2);
    }

    const handleNextStep2 = (method: PaymentMethod) => {
        setPaymentMethod(method);
        if (method === 'online') {
            setStep(3);
        } else {
            setStep(4);
        }
    }
    
    const handleNextStep3 = () => {
        setStep(4);
    }
    
    const handleComplete = async () => {
        if (!user || !paymentMethod || !formData || !aikidoSelection || !feeData) {
            toast({ title: "Errore", description: "Dati mancanti per completare l'iscrizione.", variant: "destructive" });
            return;
        }
        setIsSubmitting(true);
        const trialExpiryDate = aikidoSelection.trialLessons[2]?.endTime;

        try {
            const userDocRef = doc(db, "users", user.uid);
            await updateDoc(userDocRef, {
                trialLessons: aikidoSelection.trialLessons.map(lesson => ({
                    eventId: lesson.eventId,
                    startTime: lesson.startTime,
                    endTime: lesson.endTime
                })),
            });
            
            const paymentsCollectionRef = collection(db, "users", user.uid, "payments");
            await addDoc(paymentsCollectionRef, {
                userId: user.uid,
                createdAt: serverTimestamp(),
                amount: feeData.price,
                description: feeData.name,
                type: 'trial',
                status: 'pending',
                paymentMethod: paymentMethod,
            });

            const dataToUpdate: any = {
                applicationSubmitted: true,
                associationStatus: "not_associated",
                trialStatus: 'pending_payment',
                trialExpiryDate: trialExpiryDate ? trialExpiryDate : null
            };
            await updateDoc(userDocRef, dataToUpdate);

            toast({ title: "Iscrizione Completata!", description: "La tua richiesta è stata inviata. Verrai reindirizzato al prossimo passo."});
            router.push("/dashboard")
        } catch (error) {
             console.error("Errore durante il completamento dell'iscrizione:", error);
             toast({ title: "Errore", description: "Impossibile completare l'iscrizione. Riprova.", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    }

    const handleBack = () => {
        if (step === 4) setStep(paymentMethod === 'online' ? 3 : 2);
        else if (step === 3) setStep(2);
        else if (step === 2) setStep(1);
        else router.push('/dashboard/liberasphere');
    }
    
     if (loading) {
        return (
             <div className="flex h-full w-full items-center justify-center">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="flex w-full flex-col items-center">
             <div className="mb-8 text-center">
                <h1 className="text-3xl font-bold">Iscrizione Prova Aikido</h1>
            </div>
            
            <div className="w-full max-w-3xl">
                {step === 1 && (
                    <AikidoInfoStep 
                        onBack={() => router.push('/dashboard/liberasphere')}
                        onNext={handleNextStep1}
                        selectionData={aikidoSelection}
                    />
                )}
                {step === 2 && (
                    <PaymentStep
                        onBack={() => setStep(1)}
                        onNext={handleNextStep2}
                        fee={feeData}
                    />
                )}
                {step === 3 && paymentMethod === 'online' && feeData && (
                    <OnlinePaymentStep
                        onBack={() => setStep(2)}
                        onNext={handleNextStep3}
                        fee={feeData}
                    />
                )}
                {step === 4 && formData && paymentMethod && aikidoSelection && (
                    <ConfirmationStep 
                        formData={formData}
                        aikidoSelection={aikidoSelection}
                        paymentMethod={paymentMethod}
                        onBack={handleBack} 
                        onComplete={handleComplete} 
                        isSubmitting={isSubmitting}
                        fee={feeData}
                    />
                )}
            </div>
        </div>
    )
}

    