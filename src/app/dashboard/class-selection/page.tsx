
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

import { useToast } from "@/hooks/use-toast"
import { PersonalDataForm, type PersonalDataSchemaType } from "@/components/dashboard/PersonalDataForm"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { format, getDay, addDays, startOfDay, nextDay } from "date-fns"
import { it } from "date-fns/locale"
import { CreditCard, Landmark, ArrowLeft, CheckCircle, Clock, Building, Calendar as CalendarIconDay, CalendarCheck, Info, Sparkles } from "lucide-react"
import { auth, db } from "@/lib/firebase"
import { useAuthState } from "react-firebase-hooks/auth"
import { doc, updateDoc, collection, getDocs, getDoc, serverTimestamp, query, where } from "firebase/firestore"
import { Loader2 } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { cn } from "@/lib/utils"


interface FeeData {
    name: string;
    price: number;
    sumupLink: string;
}

interface Lesson {
    dayOfWeek: string; // Es. "Lunedì", "Martedì"
    time: string;
}

// Tipi di dati
type PaymentMethod = "in_person" | "online"
interface Gym {
    id: string;
    name: string;
    lessons: Lesson[];
    disciplines: string[];
}

interface UpcomingLesson {
    date: Date;
    time: string;
    gymId: string;
    gymName: string;
}

interface GymSelectionData {
    gymId: string;
    gymName: string;
    lessonDate: Date;
    time: string;
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

// Mappa per convertire il nome del giorno in numero (Domenica=0, Lunedì=1...)
const dayNameToJsGetDay: { [key: string]: number } = {
    'domenica': 0, 'lunedì': 1, 'martedì': 2, 'mercoledì': 3, 
    'giovedì': 4, 'venerdì': 5, 'sabato': 6
};

// Determina il punto di partenza per la ricerca delle lezioni
function getLessonSearchStartDate(): Date {
    const today = startOfDay(new Date());
    const month = today.getMonth(); // 0 = Gen, 4 = Mag, 8 = Set
    const day = today.getDate();
    const year = today.getFullYear();

    // Periodo di pre-iscrizione: 1 Maggio - 9 Settembre.
    // In questo periodo, le lezioni partono dal 10 Settembre.
    const isPreRegistration = 
        (month === 4 && day >= 1) || // Dal 1 Maggio in poi
        (month > 4 && month < 8) ||  // Giugno, Luglio, Agosto
        (month === 8 && day < 10);   // Dal 1 al 9 Settembre

    if (isPreRegistration) {
        return new Date(year, 8, 10); // 10 Settembre
    }

    // Altrimenti, parti da oggi
    return today;
}

// Verifica se siamo nel periodo di pre-iscrizione per mostrare l'avviso
function isPreRegistrationPeriod(): boolean {
    const today = startOfDay(new Date());
    const month = today.getMonth();
    const day = today.getDate();
     const isPreRegistration = 
        (month === 4 && day >= 1) || // Dal 1 Maggio in poi
        (month > 4 && month < 8) ||  // Giugno, Luglio, Agosto
        (month === 8 && day < 10);   // Dal 1 al 9 Settembre
    return isPreRegistration;
}


// Componente per lo Step 2: Selezione Palestra e Lezione
function GymSelectionStep({ onBack, onNext }: { onBack: () => void; onNext: (data: GymSelectionData) => void }) {
    const [user] = useAuthState(auth);
    const { toast } = useToast();

    const [loading, setLoading] = useState(true);
    const [gym, setGym] = useState<Gym | null>(null);
    const [userDiscipline, setUserDiscipline] = useState<string | null>(null);
    const [availableLessons, setAvailableLessons] = useState<Lesson[]>([]);
    const [upcomingLessonDates, setUpcomingLessonDates] = useState<{ [lessonKey: string]: Date[] }>({});

    const [selectedLessonKey, setSelectedLessonKey] = useState<string | null>(null);
    const [selectedDate, setSelectedDate] = useState<string | null>(null);

    useEffect(() => {
        const fetchGymData = async () => {
            if (!user) return;
            setLoading(true);
            try {
                const userDocRef = doc(db, "users", user.uid);
                const userDocSnap = await getDoc(userDocRef);

                if (userDocSnap.exists()) {
                    const userData = userDocSnap.data();
                    const discipline = userData.discipline;
                    const gymId = userData.gym; // gymId è l'ID del documento (es. "villeneuve")
                    setUserDiscipline(discipline);

                    if (discipline && gymId) {
                        const gymDocRef = doc(db, "gyms", gymId);
                        const gymDocSnap = await getDoc(gymDocRef);

                        if (gymDocSnap.exists()) {
                            const gymData = gymDocSnap.data() as Omit<Gym, 'id'>;
                            
                            // Verifica che la disciplina sia offerta dalla palestra
                            if (gymData.disciplines.includes(discipline)) {
                                setGym({ id: gymId, ...gymData });
                                setAvailableLessons(gymData.lessons);
                            } else {
                                toast({ title: "Errore Disciplina", description: `La disciplina ${discipline} non è disponibile presso la palestra selezionata.`, variant: "destructive" });
                            }
                        } else {
                            toast({ title: "Errore Palestra", description: `Nessuna palestra trovata con l'ID fornito.`, variant: "destructive" });
                        }
                    }
                }
            } catch (error) {
                console.error("Error fetching gym data:", error);
                toast({ title: "Errore di connessione", description: "Impossibile recuperare i dati della palestra.", variant: "destructive" });
            } finally {
                setLoading(false);
            }
        };

        fetchGymData();
    }, [user, toast]);

    useEffect(() => {
        if (availableLessons.length > 0) {
            const lessonDates: { [lessonKey: string]: Date[] } = {};
            const startDate = getLessonSearchStartDate();

            availableLessons.forEach(lesson => {
                const lessonKey = `${lesson.dayOfWeek}-${lesson.time}`;
                const dayIndex = dayNameToJsGetDay[lesson.dayOfWeek.toLowerCase()];

                if (dayIndex !== undefined) {
                    let nextLessonDate = nextDay(startDate, dayIndex);
                    const dates = [];
                    for (let i = 0; i < 4; i++) { // Calcola le prossime 4 occorrenze
                        dates.push(addDays(nextLessonDate, i * 7));
                    }
                    lessonDates[lessonKey] = dates;
                }
            });
            setUpcomingLessonDates(lessonDates);
        }
    }, [availableLessons]);

    const handleLessonSelect = (lessonKey: string) => {
        setSelectedLessonKey(lessonKey);
        setSelectedDate(null); // Resetta la data quando si cambia lezione
    };
    
    const handleConfirm = () => {
        if (!selectedLessonKey || !selectedDate || !userDiscipline || !gym) return;

        const [dayOfWeek, time] = selectedLessonKey.split('-');
        
        onNext({
            gymId: gym.id,
            gymName: gym.name,
            discipline: userDiscipline,
            lessonDate: new Date(selectedDate),
            time: time,
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
    
     if (!gym) {
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
                <CardTitle>Scegli la Prima lezione</CardTitle>
                <CardDescription>
                    Seleziona la disciplina che ti interessa e prenota la tua lezione di prova.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {isPreRegistrationPeriod() && (
                    <Alert>
                        <Info className="h-4 w-4" />
                        <AlertTitle>Periodo di Pre-iscrizione Attivo!</AlertTitle>
                        <AlertDescription>
                            Le lezioni inizieranno il 10 Settembre. Le date disponibili sono calcolate a partire da quel giorno.
                        </AlertDescription>
                    </Alert>
                )}

                <div className="space-y-4 rounded-md border p-4">
                    <h3 className="text-lg font-semibold">La tua scelta</h3>
                     <dl className="space-y-2">
                        <DataRow label="Disciplina" value={userDiscipline} icon={<Sparkles size={16} />} />
                        <DataRow label="Palestra" value={gym.name} icon={<Building size={16} />} />
                     </dl>
                </div>
                
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold">1. Scegli il Giorno e l'Orario</h3>
                    <RadioGroup
                        value={selectedLessonKey || ""}
                        onValueChange={handleLessonSelect}
                        className="grid grid-cols-1 md:grid-cols-2 gap-4"
                    >
                        {availableLessons.map(lesson => {
                            const key = `${lesson.dayOfWeek}-${lesson.time}`;
                            return (
                                <Label key={key} htmlFor={key} className="flex items-center space-x-3 rounded-md border p-3 cursor-pointer hover:bg-accent/50 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                                    <RadioGroupItem value={key} id={key} />
                                    <div className="flex justify-between w-full items-center">
                                        <span className="font-semibold capitalize">{lesson.dayOfWeek}</span>
                                        <span className="text-muted-foreground">{lesson.time}</span>
                                    </div>
                                </Label>
                            )
                        })}
                    </RadioGroup>
                </div>
                
                {selectedLessonKey && upcomingLessonDates[selectedLessonKey] && (
                    <div className="space-y-4 pt-4 border-t animate-in fade-in-50">
                        <h3 className="text-lg font-semibold">2. Scegli la Data</h3>
                        <RadioGroup
                            value={selectedDate || ""}
                            onValueChange={setSelectedDate}
                            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
                        >
                            {upcomingLessonDates[selectedLessonKey].map(date => {
                                const dateString = date.toISOString();
                                return (
                                    <Label key={dateString} htmlFor={dateString} className="flex flex-col items-center justify-center space-y-1 rounded-md border p-3 cursor-pointer text-center hover:bg-accent/50 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                                        <RadioGroupItem value={dateString} id={dateString} className="sr-only" />
                                        <span className="font-semibold capitalize">{format(date, 'EEEE', { locale: it })}</span>
                                        <span className="text-2xl font-bold">{format(date, 'd')}</span>
                                        <span className="text-sm text-muted-foreground">{format(date, 'MMMM yyyy', { locale: it })}</span>
                                    </Label>
                                )
                            })}
                        </RadioGroup>
                    </div>
                )}
            </CardContent>
            <CardFooter className="justify-between">
                 <Button variant="outline" onClick={onBack}>Indietro</Button>
                 <Button onClick={handleConfirm} disabled={!selectedDate}>Scegli il Pagamento</Button>
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
    lastGrade: string
}) {
    const [isConfirmed, setIsConfirmed] = useState(false);
    
    if (!fee) {
        return <Card><CardContent className="flex justify-center items-center h-48"><Loader2 className="h-8 w-8 animate-spin" /></CardContent></Card>
    }
    
    const formattedLessonDate = format(gymSelection.lessonDate, "EEEE d MMMM yyyy", { locale: it });

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
                    <h3 className="font-semibold text-lg">Lezione di Prova</h3>
                    <dl className="space-y-3">
                        <DataRow label="Disciplina" value={gymSelection.discipline} icon={<Sparkles size={16} />} />
                        <DataRow label="Grado" value={lastGrade} icon={<Sparkles size={16} />} />
                        <DataRow label="Palestra" value={gymSelection.gymName} icon={<Building size={16} />} />
                        <DataRow label="Data Lezione" value={formattedLessonDate} icon={<CalendarIconDay size={16} />} />
                        <DataRow label="Orario" value={gymSelection.time} icon={<Clock size={16} />} />
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
    const [loadingFee, setLoadingFee] = useState(true);
    const { toast } = useToast()
    const router = useRouter()
    const [user] = useAuthState(auth);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [userData, setUserData] = useState<any>(null);

    useEffect(() => {
        const fetchInitialData = async () => {
            if (user) {
                try {
                    const feeDocRef = doc(db, "fees", "trial");
                    const userDocRef = doc(db, "users", user.uid);
                    
                    const [feeDocSnap, userDocSnap] = await Promise.all([getDoc(feeDocRef), getDoc(userDocRef)]);
                    
                    if (feeDocSnap.exists()) {
                        setFeeData(feeDocSnap.data() as FeeData);
                    } else {
                        toast({ title: "Errore", description: "Impossibile caricare i dati della quota. Contatta la segreteria.", variant: "destructive" });
                    }

                    if (userDocSnap.exists()) {
                        setUserData(userDocSnap.data());
                    }

                } catch (error) {
                    console.error("Error fetching initial data:", error);
                    toast({ title: "Errore di connessione", description: "Impossibile recuperare i dati. Riprova.", variant: "destructive" });
                } finally {
                    setLoadingFee(false);
                }
            }
        };
        fetchInitialData();
    }, [user, toast]);

    const handleNextStep1 = (data: PersonalDataSchemaType) => {
        setFormData(data);
        setStep(2);
    }
    
    const handleNextStep2 = (data: GymSelectionData) => {
        setGymSelection(data);
        setStep(3);
    }

    const handleNextStep3 = (method: PaymentMethod) => {
        setPaymentMethod(method)
        if (method === 'online') {
            setStep(4); // Vai allo step dell'iFrame
        } else {
            setStep(5); // Vai direttamente al riepilogo
        }
    }

    const handleNextStep4 = () => {
        setStep(5); // Dal pagamento online, vai al riepilogo
    }

    const getFinalGrade = () => {
        if (!gymSelection) return "Cintura bianca"; // Default
        
        const hasPracticed = userData?.hasPracticedBefore === 'yes';
        const pastDiscipline = userData?.pastExperience?.discipline;
        const pastGrade = userData?.pastExperience?.grade;
        const currentDiscipline = gymSelection.discipline;

        // Se l'utente ha già praticato la stessa disciplina, usa il suo grado passato.
        // Altrimenti, è una cintura bianca.
        if (hasPracticed && pastDiscipline === currentDiscipline && pastGrade) {
            return pastGrade;
        }
        
        return "Cintura bianca";
    }
    
    const handleComplete = async () => {
        if (!user || !paymentMethod || !formData || !gymSelection || !feeData) {
            toast({ title: "Errore", description: "Dati mancanti per completare l'iscrizione.", variant: "destructive" });
            return;
        }
        setIsSubmitting(true);

        const finalGrade = getFinalGrade();

        try {
            const userDocRef = doc(db, "users", user.uid);
            
            const dataToUpdate: any = {
                uid: user.uid,
                name: `${formData.name} ${formData.surname}`.trim(),
                surname: formData.surname,
                birthPlace: formData.birthPlace,
                birthDate: formData.birthDate,
                taxCode: formData.taxCode,
                address: formData.address,
                streetNumber: formData.streetNumber,
                zipCode: formData.zipCode,
                city: formData.city,
                province: formData.province,
                email: user.email,
                phone: formData.phone,
                discipline: gymSelection.discipline,
                lastGrade: finalGrade,
                // `parentData` is next
                createdAt: serverTimestamp(),
                regulationsAccepted: true,
                applicationSubmitted: true,
                paymentMethod: paymentMethod,
                associationStatus: "not_associated",
                isInsured: true,
                medicalCertificateSubmitted: false,
                trialLesson: {
                    gymId: gymSelection.gymId,
                    gymName: gymSelection.gymName,
                    lessonDate: gymSelection.lessonDate,
                    time: gymSelection.time,
                },
                paymentDetails: {
                    feeName: feeData.name,
                    amount: feeData.price,
                    status: 'pending'
                },
            };
            
             // Aggiungiamo anche i dati dell'esperienza passata se esistono
            if (userData?.hasPracticedBefore === 'yes' && userData?.pastExperience) {
                dataToUpdate.pastExperience = userData.pastExperience;
            }


            if (formData.isMinor && formData.parentData) {
                dataToUpdate.parentData = formData.parentData;
            }

            await updateDoc(userDocRef, dataToUpdate);

            toast({ title: "Iscrizione Completata!", description: "Benvenuto nel Passaporto Selezioni. Verrai reindirizzato al prossimo passo."});
            router.push("/dashboard/medical-certificate")
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
    
     if (loadingFee) {
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
                {step === 4 && paymentMethod === 'online' && (
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
                        lastGrade={getFinalGrade()}
                    />
                )}
            </div>
        </div>
    )
}

    

    