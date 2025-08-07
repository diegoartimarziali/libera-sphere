
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

interface GymSelectionData {
    gymId: string;
    gymName: string;
    trialLessons: {
        eventId: string;
        startTime: Timestamp;
        endTime: Timestamp;
    }[];
    discipline: string;
}

interface Settings {
    enrollment: {
        trialClassesOpenDate: Timestamp;
        trialClassesCloseDate: Timestamp;
    };
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

function GymSelectionStep({ onBack, onNext }: { onBack: () => void; onNext: (data: GymSelectionData) => void }) {
    const [user] = useAuthState(auth);
    const { toast } = useToast();

    const [loading, setLoading] = useState(true);
    const [userDiscipline, setUserDiscipline] = useState<string | null>(null);
    const [userGymId, setUserGymId] = useState<string | null>(null);
    const [userGymName, setUserGymName] = useState<string | null>(null);
    const [upcomingLessons, setUpcomingLessons] = useState<Event[]>([]);
    const [selectedLessonValue, setSelectedLessonValue] = useState<string | null>(null);
    const [highlightedLessons, setHighlightedLessons] = useState<Event[]>([]);
    
    useEffect(() => {
        const fetchEventData = async () => {
            if (!user) return;
            setLoading(true);
            try {
                const userDocRef = doc(db, "users", user.uid);
                const userDocSnap = await getDoc(userDocRef);

                if (userDocSnap.exists()) {
                    const userData = userDocSnap.data();
                    const discipline = userData.discipline;
                    const gymId = userData.gym;

                    // This page is for Karate only
                    if (discipline !== 'Karate') {
                        toast({ title: "Disciplina errata", description: "Questa pagina è riservata all'iscrizione per il Karate.", variant: "destructive" });
                        // Optionally redirect to a more appropriate page or dashboard
                        // router.push('/dashboard'); 
                        setLoading(false);
                        return;
                    }

                    setUserDiscipline(discipline);
                    setUserGymId(gymId);

                    if (discipline && gymId) {
                        const gymDocRef = doc(db, "gyms", gymId);
                        const gymDocSnap = await getDoc(gymDocRef);
                        if (gymDocSnap.exists()) {
                            setUserGymName(gymDocSnap.data().name);
                        }

                        const eventsQuery = query(
                            collection(db, "events"),
                            where("gymId", "==", gymId),
                            where("discipline", "==", discipline),
                            where("type", "==", "lesson"),
                            where("startTime", ">=", Timestamp.now()),
                            orderBy("startTime", "asc")
                        );
                        
                        const eventsSnapshot = await getDocs(eventsQuery);
                        const eventsList = eventsSnapshot.docs.map(doc => ({
                            id: doc.id,
                            ...doc.data()
                        } as Event));
                        setUpcomingLessons(eventsList);

                    } else {
                         toast({ title: "Dati mancanti", description: "Disciplina o palestra non impostate nel tuo profilo.", variant: "destructive" });
                    }
                }
            } catch (error) {
                console.error("Error fetching event data:", error);
                toast({ title: "Errore di connessione", description: "Impossibile recuperare i dati delle lezioni.", variant: "destructive" });
            } finally {
                setLoading(false);
            }
        };

        fetchEventData();
    }, [user, toast]);

    useEffect(() => {
        if (selectedLessonValue) {
            const selectedIndex = upcomingLessons.findIndex(l => l.id === selectedLessonValue);

            if (selectedIndex !== -1 && upcomingLessons.length >= selectedIndex + 3) {
                const threeLessons = upcomingLessons.slice(selectedIndex, selectedIndex + 3);
                setHighlightedLessons(threeLessons);
            } else {
                 setHighlightedLessons([]);
            }
        } else {
            setHighlightedLessons([]);
        }
    }, [selectedLessonValue, upcomingLessons]);
    
    const handleConfirm = () => {
        if (!userDiscipline || !userGymId || !userGymName || highlightedLessons.length < 3) return;
        
        onNext({
            gymId: userGymId,
            gymName: userGymName,
            discipline: userDiscipline,
            trialLessons: highlightedLessons.map(event => ({
                eventId: event.id,
                startTime: event.startTime,
                endTime: event.endTime
            })),
        });
    }

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Scegli la Prima lezione</CardTitle>
                </CardHeader>
                <CardContent className="flex h-64 items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </CardContent>
            </Card>
        );
    }
    
     if (!userGymName) {
        return (
            <Card>
                <CardHeader><CardTitle>Dati non trovati</CardTitle></CardHeader>
                <CardContent><p>Non è stato possibile caricare le informazioni sulla palestra. Torna indietro e riprova.</p></CardContent>
                <CardFooter><Button variant="outline" onClick={onBack}>Indietro</Button></CardFooter>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Scegli la Prima lezione di Karate</CardTitle>
                <CardDescription>
                    Selezionando la prima lezione, verranno automaticamente prenotate le due successive disponibili per la tua categoria.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

                 <Alert variant="info" className="w-full text-center">
                    <MessageSquareQuote className="h-4 w-4" />
                    <AlertTitle className="font-semibold">
                       Curioso di sapere cosa ne pensano gli altri?
                    </AlertTitle>
                    <AlertDescription>
                        <Button asChild variant="link" className="p-0 h-auto">
                            <Link href="/dashboard/reviews">Leggi le recensioni di chi ha già provato</Link>
                        </Button>
                    </AlertDescription>
                </Alert>

                <div className="space-y-4 rounded-md border p-4">
                    <h3 className="text-lg font-semibold">La tua scelta</h3>
                     <dl className="space-y-2">
                        <DataRow label="Disciplina" value={userDiscipline} icon={<Sparkles size={16} />} />
                        <DataRow label="Palestra" value={userGymName} icon={<Building size={16} />} />
                     </dl>
                </div>
                
                 <div className="space-y-4">
                    <h3 className="text-lg font-semibold">2. Scegli il giorno della tua prima lezione</h3>
                    <RadioGroup 
                        value={selectedLessonValue || ""} 
                        onValueChange={setSelectedLessonValue}
                        className="grid grid-cols-2 gap-3 sm:grid-cols-4"
                    >
                        {upcomingLessons.slice(0, -2).map((event) => { // slice per non permettere di scegliere date per cui non ce ne sono 2 successive
                            const value = event.id;
                            const isHighlighted = highlightedLessons.some(h => h.id === event.id);
                            const isSelected = selectedLessonValue === value;
                            
                            return (
                                <Label 
                                    key={value} 
                                    htmlFor={value}
                                    className={cn("flex flex-col items-center justify-center rounded-md border-2 p-3 cursor-pointer hover:bg-accent/80 transition-all",
                                      isSelected && "border-primary bg-primary/5",
                                      !isSelected && isHighlighted && "border-primary/50 bg-primary/5"
                                    )}
                                >
                                    <RadioGroupItem value={value} id={value} className="sr-only" />
                                    <span className="font-semibold capitalize">{format(event.startTime.toDate(), "EEEE", { locale: it })}</span>
                                    <span className="text-sm">{format(event.startTime.toDate(), "dd MMMM yyyy")}</span>
                                    <span className="text-xs text-muted-foreground">{format(event.startTime.toDate(), "HH:mm")}</span>
                                </Label>
                            )
                        })}
                    </RadioGroup>
                </div>
                
            </CardContent>
            <CardFooter className="justify-between">
                 <Button variant="outline" onClick={onBack}>Indietro</Button>
                 <Button onClick={handleConfirm} disabled={!selectedLessonValue}>Scegli il Pagamento</Button>
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
                <CardTitle>Passo 3: Metodo di Pagamento</CardTitle>
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
                <CardTitle>Passo 4: Pagamento Online</CardTitle>
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
    gymSelection,
    paymentMethod,
    onBack, 
    onComplete,
    isSubmitting,
    fee,
    lastGrade
}: { 
    formData: PersonalDataSchemaType,
    gymSelection: GymSelectionData,
    paymentMethod: PaymentMethod,
    onBack: () => void, 
    onComplete: () => void,
    isSubmitting: boolean,
    fee: FeeData | null,
    lastGrade: string | null
}) {
    const [isConfirmed, setIsConfirmed] = useState(false);
    
    if (!fee || !lastGrade) {
        return <Card><CardContent className="flex justify-center items-center h-48"><Loader2 className="h-8 w-8 animate-spin" /></CardContent></Card>
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Passo Finale: Riepilogo e Conferma</CardTitle>
                <CardDescription>
                    Controlla attentamente i dati e la scelta del pagamento. Se tutto è corretto,
                    conferma e completa l'iscrizione.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-4 rounded-md border p-4">
                     <h3 className="font-semibold text-lg">Dati Anagrafici</h3>
                     <dl className="space-y-2">
                        <DataRow label="Nome" value={formData.name} />
                        <DataRow label="Cognome" value={formData.surname} />
                        <DataRow label="Codice Fiscale" value={formData.taxCode} />
                        <DataRow label="Data di Nascita" value={formData.birthDate ? format(formData.birthDate, "PPP", { locale: it }) : ''} />
                        <DataRow label="Luogo di Nascita" value={formData.birthPlace} />
                        <DataRow label="Indirizzo" value={`${formData.address}, ${formData.streetNumber}`} />
                        <DataRow label="Città" value={`${formData.city} (${formData.province}), ${formData.zipCode}`} />
                        <DataRow label="Email" value={auth.currentUser?.email} />
                        <DataRow label="Telefono" value={formData.phone} />
                     </dl>
                </div>
                
                {formData.isMinor && formData.parentData && (
                    <div className="space-y-4 rounded-md border p-4">
                        <h3 className="font-semibold text-lg">Dati Genitore/Tutore</h3>
                        <dl className="space-y-2">
                           <DataRow label="Nome" value={formData.parentData.parentName} />
                           <DataRow label="Cognome" value={formData.parentData.parentSurname} />
                           <DataRow label="Codice Fiscale" value={formData.parentData.parentTaxCode} />
                        </dl>
                    </div>
                )}
                
                <div className="space-y-4 rounded-md border p-4">
                    <h3 className="font-semibold text-lg">Lezioni di Prova</h3>
                    <dl className="space-y-3">
                        <DataRow label="Disciplina" value={gymSelection.discipline} icon={<Sparkles size={16} />} />
                        <DataRow label="Grado" value={lastGrade} icon={<Sparkles size={16} />} />
                        <DataRow label="Palestra" value={gymSelection.gymName} icon={<Building size={16} />} />
                        {gymSelection.trialLessons.map((lesson, index) => (
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


export default function ClassSelectionPage() {
    const [step, setStep] = useState(1)
    const [formData, setFormData] = useState<PersonalDataSchemaType | null>(null)
    const [gymSelection, setGymSelection] = useState<GymSelectionData | null>(null);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null)
    const [feeData, setFeeData] = useState<FeeData | null>(null);
    const [settings, setSettings] = useState<Settings | null>(null);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast()
    const router = useRouter()
    const [user] = useAuthState(auth);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [finalGrade, setFinalGrade] = useState<string | null>(null);


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
                const enrollmentSettingsRef = doc(db, "settings", "enrollment");
                 const paymentsQuery = query(
                    collection(db, 'users', user.uid, 'payments'),
                    where('type', '==', 'trial'),
                    where('status', '==', 'pending'),
                    limit(1)
                );
                
                const [userDocSnap, feeDocSnap, enrollmentDocSnap, paymentsSnapshot] = await Promise.all([
                    getDoc(userDocRef),
                    getDoc(feeDocRef),
                    getDoc(enrollmentSettingsRef),
                    getDocs(paymentsSnapshot)
                ]);
                
                if (feeDocSnap.exists()) setFeeData(feeDocSnap.data() as FeeData);
                else toast({ title: "Errore", description: "Impossibile caricare i dati della quota.", variant: "destructive" });
                
                let fetchedUserData: any = null;
                if (userDocSnap.exists()) {
                    fetchedUserData = userDocSnap.data();
                    if (fetchedUserData.discipline !== 'Karate') {
                        toast({ title: "Disciplina Errata", description: "Questa pagina è per il Karate.", variant: "destructive"});
                        router.push('/dashboard/aikido-selection');
                        return;
                    }
                }
                
                if (enrollmentDocSnap.exists()) {
                     const enrollmentData = enrollmentDocSnap.data();
                     if (enrollmentData) {
                        setSettings({
                            enrollment: enrollmentData as Settings['enrollment']
                        });
                     } else {
                         toast({ title: "Errore di configurazione", description: "Dati di configurazione mancanti.", variant: "destructive" });
                     }
                } else {
                    toast({ title: "Errore di configurazione", description: "Impostazioni per le iscrizioni non trovate.", variant: "destructive" });
                }

                // LOGICA DI AVANZAMENTO STEP
                if (fetchedUserData) {
                     const prefilledData: PersonalDataSchemaType = {
                        name: fetchedUserData.name || "", surname: fetchedUserData.surname || "", taxCode: fetchedUserData.taxCode || "",
                        birthDate: fetchedUserData.birthDate?.toDate() || null, birthPlace: fetchedUserData.birthPlace || "",
                        address: fetchedUserData.address || "", streetNumber: fetchedUserData.streetNumber || "", city: fetchedUserData.city || "",
                        zipCode: fetchedUserData.zipCode || "", province: fetchedUserData.province || "", phone: fetchedUserData.phone || "",
                        isMinor: false, parentData: fetchedUserData.parentData || undefined,
                    };
                    setFormData(prefilledData);

                    const hasPersonalData = fetchedUserData.taxCode && fetchedUserData.birthDate;
                    const hasTrialLessons = fetchedUserData.trialLessons && fetchedUserData.trialLessons.length > 0;
                    
                    if (!paymentsSnapshot.empty) { // C'è un pagamento in sospeso
                         const paymentData = paymentsSnapshot.docs[0].data();
                         const gymDoc = await getDoc(doc(db, "gyms", fetchedUserData.gym));

                         setPaymentMethod(paymentData.paymentMethod as PaymentMethod);
                         setGymSelection({
                             gymId: fetchedUserData.gym || '',
                             gymName: gymDoc.exists() ? gymDoc.data().name : '',
                             discipline: fetchedUserData.discipline || '',
                             trialLessons: (fetchedUserData.trialLessons || []).map((l: any) => ({...l, startTime: l.startTime.toDate(), endTime: l.endTime.toDate()}))
                         });
                         setFinalGrade(fetchedUserData.lastGrade || null);
                         setStep(5); // Vai al riepilogo
                    } else if (hasTrialLessons) { // Ha scelto le lezioni ma non il pagamento
                        const gymDoc = await getDoc(doc(db, "gyms", fetchedUserData.gym));
                        setGymSelection({
                             gymId: fetchedUserData.gym || '',
                             gymName: gymDoc.exists() ? gymDoc.data().name : '',
                             discipline: fetchedUserData.discipline || '',
                             trialLessons: (fetchedUserData.trialLessons || []).map((l: any) => ({...l, startTime: l.startTime.toDate(), endTime: l.endTime.toDate()}))
                         });
                         setFinalGrade(fetchedUserData.lastGrade || null);
                        setStep(3); // Vai alla scelta pagamento
                    } else if (hasPersonalData) { // Ha i dati personali ma non ha scelto le lezioni
                        setStep(2); // Vai alla scelta palestra/lezioni
                    } else { // Non ha neanche i dati
                        setStep(1); // Parti dall'inizio
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

    
    const handleNextStep1 = async (data: PersonalDataSchemaType) => {
        if (!user) return;
        setIsSubmitting(true);
        try {
            const userDocRef = doc(db, "users", user.uid);
            const dataToUpdate: any = {
                name: data.name, surname: data.surname, birthPlace: data.birthPlace, birthDate: data.birthDate,
                taxCode: data.taxCode, address: data.address, streetNumber: data.streetNumber, zipCode: data.zipCode,
                city: data.city, province: data.province, phone: data.phone,
            };
            if (data.isMinor && data.parentData) { dataToUpdate.parentData = data.parentData; }
            await updateDoc(userDocRef, dataToUpdate);

            setFormData(data);
            setStep(2);
        } catch (error) {
             toast({ title: "Errore", description: "Impossibile salvare i dati anagrafici.", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    }
    
    const handleNextStep2 = async (data: GymSelectionData) => {
        if (!user) return;
         setIsSubmitting(true);
        try {
             const userDocRef = doc(db, "users", user.uid);
             const userDocSnap = await getDoc(userDocRef);
             const fetchedUserData = userDocSnap.data();

            const grade = await getFinalGrade(fetchedUserData, data.discipline);
            if (!grade) {
                toast({ title: "Errore", description: "Impossibile recuperare il grado di default da Firestore.", variant: "destructive" });
                return;
            }
            setFinalGrade(grade);

             await updateDoc(userDocRef, {
                 trialLessons: data.trialLessons.map(lesson => ({
                    eventId: lesson.eventId,
                    startTime: lesson.startTime,
                    endTime: lesson.endTime
                })),
                lastGrade: grade
             });
             setGymSelection(data);
             setStep(3);
        } catch (error) {
             toast({ title: "Errore", description: "Impossibile salvare la scelta delle lezioni.", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    }

    const handleNextStep3 = async (method: PaymentMethod) => {
        if (!user || !feeData) {
             toast({ title: "Errore", description: "Dati mancanti per procedere.", variant: "destructive" });
             return;
        }
        setIsSubmitting(true);
        
        try {
            // Crea il record di pagamento PENDING immediatamente
            const paymentsCollectionRef = collection(db, "users", user.uid, "payments");
            await addDoc(paymentsCollectionRef, {
                userId: user.uid,
                createdAt: serverTimestamp(),
                amount: feeData.price,
                description: feeData.name,
                type: 'trial',
                status: 'pending',
                paymentMethod: method,
            });

            setPaymentMethod(method);

            // Ora naviga allo step successivo
            if (method === 'online') {
                setStep(4);
            } else {
                setStep(5);
            }
        } catch (error) {
            console.error("Errore durante la creazione del pagamento:", error);
            toast({ title: "Errore", description: "Impossibile registrare la scelta del pagamento. Riprova.", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    }

    const handleNextStep4 = () => {
        // L'utente ha (presumibilmente) pagato, il record di pagamento pending esiste già.
        // Lo mandiamo solo al riepilogo.
        setStep(5);
    }

    const getFinalGrade = async (userData: any, currentDiscipline: string) => {
        const hasPracticed = userData?.hasPracticedBefore === 'yes';
        const pastDiscipline = userData?.pastExperience?.discipline;
        const pastGrade = userData?.pastExperience?.grade;
    
        if (hasPracticed && pastDiscipline === currentDiscipline && pastGrade) {
            return pastGrade;
        } else {
            // Se non ha praticato o ha cambiato disciplina, prendi il grado di default da Firestore
            try {
                const docRef = doc(db, "config", currentDiscipline.toLowerCase());
                const docSnap = await getDoc(docRef);
                if (docSnap.exists() && docSnap.data().grades && docSnap.data().grades.length > 0) {
                    const grade = docSnap.data().grades[0];
                    return `Cintura ${grade}`;
                } else {
                    return null; // Errore o nessun grado trovato
                }
            } catch (e) {
                console.error("Error fetching default grade:", e);
                return null;
            }
        }
    }
    
    const handleComplete = async () => {
        if (!user || !paymentMethod || !formData || !gymSelection || !feeData || !finalGrade) {
            toast({ title: "Errore", description: "Dati mancanti per completare l'iscrizione.", variant: "destructive" });
            return;
        }
        setIsSubmitting(true);

        const trialExpiryDate = gymSelection.trialLessons[2]?.endTime;

        try {
            const userDocRef = doc(db, "users", user.uid);
            
            // Aggiorniamo lo stato dell'utente. Il record di pagamento è già stato creato.
            const dataToUpdate: any = {
                applicationSubmitted: true,
                associationStatus: "not_associated",
                trialStatus: 'pending_payment',
                trialExpiryDate: trialExpiryDate ? trialExpiryDate : null,
                lastGrade: finalGrade,
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
        if (step === 5) { // Riepilogo
             if (paymentMethod === 'online') {
                setStep(4); // Torna all'iframe
            } else {
                setStep(3); // Torna alla scelta pagamento
            }
        } else if (step === 4) { // Iframe
            setStep(3); // Torna alla scelta pagamento
        } else if (step === 3) { // Scelta pagamento
            setStep(2); // Torna alla scelta palestra
        } else if (step === 2) { // Scelta palestra
             setStep(1); // Torna ai dati anagrafici
        } else {
            router.push('/dashboard/liberasphere');
        }
    }
    
    const handleBackFromPayment = () => {
         setStep(3); // Torna sempre alla selezione metodo di pagamento
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
                <h1 className="text-3xl font-bold">Iscrizione alle Lezioni di Selezione</h1>
                <p className="mt-2 text-muted-foreground">
                    Completa la procedura per iscriverti.
                </p>
            </div>
            
            <div className="w-full max-w-3xl">
                {step === 1 && (
                    <PersonalDataForm
                        title="Passo 1: Dati Anagrafici"
                        description="Completa le tue informazioni personali per procedere con l'iscrizione. Questi dati verranno salvati per future iscrizioni."
                        buttonText="Prosegui alla Scelta della Palestra"
                        onFormSubmit={handleNextStep1}
                        onBack={() => router.push('/dashboard/liberasphere')}
                    />
                )}
                {step === 2 && (
                    <GymSelectionStep 
                        onBack={handleBack}
                        onNext={handleNextStep2}
                    />
                )}
                {step === 3 && gymSelection &&(
                    <PaymentStep
                        onBack={() => setStep(2)}
                        onNext={handleNextStep3}
                        fee={feeData}
                    />
                )}
                {step === 4 && paymentMethod === 'online' && feeData && (
                    <OnlinePaymentStep
                        onBack={handleBackFromPayment}
                        onNext={handleNextStep4}
                        fee={feeData}
                    />
                )}
                {step === 5 && formData && paymentMethod && gymSelection && (
                    <ConfirmationStep 
                        formData={formData}
                        gymSelection={gymSelection}
                        paymentMethod={paymentMethod}
                        onBack={handleBack} 
                        onComplete={handleComplete} 
                        isSubmitting={isSubmitting}
                        fee={feeData}
                        lastGrade={finalGrade}
                    />
                )}
            </div>
        </div>
    )
}

    