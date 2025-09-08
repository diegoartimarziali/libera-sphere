// STOP. CERCA "OK" NEL MESSAGGIO DEL MAESTRO. SE NON C'È, NON MODIFICARE NULLA E CHIEDI IL PERMESSO.
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
import { format, addDays, nextDay, parseISO } from "date-fns"
import { it } from "date-fns/locale"
import { CreditCard, Landmark, ArrowLeft, CheckCircle, Clock, Building, Calendar as CalendarIconDay, CalendarCheck, Info, Sparkles, MessageSquareQuote, CalendarClock } from "lucide-react"
import { auth, db } from "@/lib/firebase"
import { useAuthState } from "react-firebase-hooks/auth"
import { doc, updateDoc, collection, getDocs, getDoc, serverTimestamp, query, where, Timestamp, addDoc, limit, orderBy, writeBatch } from "firebase/firestore"
import { setDoc } from "firebase/firestore";
import { Loader2 } from "lucide-react"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { cn } from "@/lib/utils"


interface FeeData {
    name: string;
    price: number;
    sumupLink: string;
}

interface UpcomingLesson {
    id: string; // eventId from firestore
    startTime: Timestamp;
    endTime: Timestamp;
    title: string;
}

// Tipi di dati
interface GymSelectionData {
    gymId: string;
    gymName: string;
    trialLessons: {
        eventId: string;
        startTime: Timestamp;
        endTime: Timestamp;
    }[];
    discipline: string;
    selectionLessonsSchedule?: string;
}

interface Settings {
    enrollment: {
        trialClassesOpenDate: Timestamp;
        trialClassesCloseDate: Timestamp;
    };
}

interface Award {
    id: string;
    name: string;
    value: number;
}


// Componente per visualizzare i dati in modo pulito
import type { ReactNode } from "react";
const DataRow = ({ label, value, icon }: { label: string; value?: ReactNode | null, icon?: React.ReactNode }) => (
    value ? (
        <div className="flex items-start">
            {icon && <div className="w-5 text-muted-foreground mt-0.5">{icon}</div>}
            <div className={`flex flex-col sm:flex-row sm:justify-between w-full ${icon ? 'ml-3' : ''}`}>
                <dt className={`font-medium text-muted-foreground ${label.match(/Disciplina|Grado|Palestra|Lezione/) ? 'text-[#1e3a8a]' : ''}`}>{label}</dt>
                <dd className="mt-1 text-foreground sm:mt-0 sm:text-right">{value}</dd>
            </div>
        </div>
    ) : null
);

function GymSelectionStep({ onNext, user }: { onNext: (data: GymSelectionData) => void, user: any }) {
    const { toast } = useToast();
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [userDiscipline, setUserDiscipline] = useState<string | null>(null);
    const [userGymId, setUserGymId] = useState<string | null>(null);
    const [userGymName, setUserGymName] = useState<string | null>(null);
    const [selectionLessonsSchedule, setSelectionLessonsSchedule] = useState<string | null>(null);
    const [upcomingLessons, setUpcomingLessons] = useState<UpcomingLesson[]>([]);
    const [selectedLessonValue, setSelectedLessonValue] = useState<string | null>(null);
    const [highlightedLessons, setHighlightedLessons] = useState<UpcomingLesson[]>([]);

    useEffect(() => {
        const fetchEventData = async () => {
            if (!user) {
                setLoading(false);
                return;
            }
            setLoading(true);
            setUpcomingLessons([]);
            try {
                const userDocRef = doc(db, "users", user.uid);
                const userDocSnap = await getDoc(userDocRef);
                if (userDocSnap.exists()) {
                    const userData = userDocSnap.data();
                    const discipline = userData.discipline;
                    const gymId = userData.gym;
                    setUserDiscipline(discipline);
                    setUserGymId(gymId);
                    if (discipline && gymId) {
                        const gymDocRef = doc(db, "gyms", gymId);
                        const gymDocSnap = await getDoc(gymDocRef);
                        if (gymDocSnap.exists()) {
                            const gymData = gymDocSnap.data();
                            setUserGymName(gymData.name);
                        }
                        const scheduleDocRef = doc(db, "orarigruppi", gymId);
                        const scheduleDocSnap = await getDoc(scheduleDocRef);
                        if (scheduleDocSnap.exists()) {
                            setSelectionLessonsSchedule(scheduleDocSnap.data().lezioniselezione || "Orario non disponibile");
                        } else {
                            setSelectionLessonsSchedule("Orario non disponibile");
                        }
                        const now = Timestamp.now();
                        const eventsQuery = query(
                            collection(db, "events"),
                            where("type", "==", "lesson"),
                            where("status", "==", "confermata"),
                            where("gymId", "==", gymId),
                            where("discipline", "==", discipline),
                            where("startTime", ">=", now),
                            orderBy("startTime", "asc"),
                            limit(20)
                        );
                        const eventsSnapshot = await getDocs(eventsQuery);
                        const lessonsList = eventsSnapshot.docs.map(doc => ({
                            id: doc.id,
                            title: doc.data().title,
                            startTime: doc.data().startTime,
                            endTime: doc.data().endTime,
                        } as UpcomingLesson));
                        setUpcomingLessons(lessonsList);
                    } else {
                        toast({ title: "Dati mancanti", description: "Disciplina o palestra non impostate nel tuo profilo.", variant: "destructive" });
                    }
                }
            } catch (error) {
                console.error("Error fetching gym/schedule data:", error);
                toast({ title: "Errore di connessione", description: "Impossibile recuperare i dati delle lezioni.", variant: "destructive" });
            } finally {
                setLoading(false);
            }
        };
        if (user) {
            fetchEventData();
        }
    }, [user]);

    useEffect(() => {
        if (selectedLessonValue && upcomingLessons.length > 0) {
            const selectedIndex = upcomingLessons.findIndex(l => l.id === selectedLessonValue);
            
            const lessonsToTake = 3;

            if (selectedIndex !== -1 && upcomingLessons.length >= selectedIndex + lessonsToTake) {
                const lessonsBundle = upcomingLessons.slice(selectedIndex, selectedIndex + lessonsToTake);
                setHighlightedLessons(lessonsBundle);
            } else if (selectedIndex !== -1) {
                setHighlightedLessons([]); 
                 toast({ 
                    variant: "destructive", 
                    title: "Lezioni insufficienti", 
                    description: `Non ci sono abbastanza lezioni consecutive disponibili a partire da questa data per completare il pacchetto di prova. Scegli una data di inizio precedente.`
                });
            } else {
                 setHighlightedLessons([]);
            }
        } else {
            setHighlightedLessons([]);
        }
    }, [selectedLessonValue, upcomingLessons, toast]);
    
    const handleConfirm = () => {
        if (!userDiscipline || !userGymId || !userGymName || highlightedLessons.length === 0) {
            toast({ variant: "destructive", title: "Selezione Incompleta", description: "Devi selezionare una lezione valida per cui ci siano abbastanza prove disponibili."})
            return;
        }
        
        const expectedLessons = 3;
        if (highlightedLessons.length < expectedLessons) {
            toast({ variant: "destructive", title: "Lezioni insufficienti", description: `Non ci sono abbastanza lezioni disponibili per completare il ciclo di prova da questa data. Scegli un'altra data di inizio.`});
            return;
        }
        
        onNext({
            gymId: userGymId,
            gymName: userGymName,
            discipline: userDiscipline,
            selectionLessonsSchedule: selectionLessonsSchedule || undefined,
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
                    <CardTitle>Caricamento Lezioni</CardTitle>
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
            </Card>
        );
    }

    if (upcomingLessons.length === 0 && !loading) {
         return (
            <Card>
                <CardHeader>
                    <CardTitle>Lezioni non disponibili</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>Al momento non ci sono lezioni di selezione disponibili per la disciplina e la palestra che hai scelto. Contatta la segreteria per maggiori informazioni.</p>
                </CardContent>
            </Card>
        );
    }
    
    const lessonsToOffer = 3;
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>Scegli la Prima lezione di {userDiscipline}</CardTitle>
                <CardDescription>
                   {lessonsToOffer > 1
                        ? `Selezionando la prima lezione, verranno automaticamente prenotate le ${lessonsToOffer - 1} successive disponibili per la tua categoria.`
                        : "Seleziona la lezione di prova per iniziare."
                   }
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
                            <Link href="/dashboard/reviews" className="font-bold">Leggi le recensioni di chi ha già provato</Link>
                        </Button>
                    </AlertDescription>
                </Alert>

                <div className="space-y-4 rounded-md border p-4" style={{ borderColor: 'hsl(var(--medical-upload-text))', borderWidth: 2 }}>
                    <h3 className="text-lg font-semibold text-center">La tua scelta</h3>
                     <dl className="space-y-2">
                        <DataRow label="Disciplina" value={<span className="font-bold" style={{ color: 'hsl(var(--medical-upload-text))' }}>{userDiscipline}</span>} icon={<Sparkles size={16} />} />
                        <DataRow label="Palestra" value={<span className="font-bold" style={{ color: 'hsl(var(--medical-upload-text))' }}>{userGymId ? `${userGymId} - ${userGymName}` : ''}</span>} icon={<Building size={16} />} />
                        <DataRow label="Orario Lezioni" value={<span className="font-bold" style={{ color: 'hsl(var(--medical-upload-text))' }}>{selectionLessonsSchedule}</span>} icon={<CalendarClock size={16} />} />
                     </dl>
                </div>
                
                 <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-center">Scegli il giorno della tua prima lezione</h3>
                    <p className="text-center text-sm text-muted-foreground mt-1">Le altre lezioni verranno scelte dal sistema in base alla disponibilità.</p>
                    <RadioGroup 
                        value={selectedLessonValue || ""} 
                        onValueChange={setSelectedLessonValue}
                        className="grid grid-cols-2 gap-3 sm:grid-cols-4"
                    >
                        {upcomingLessons.map((lesson) => {
                            const value = lesson.id;
                            const isHighlighted = highlightedLessons.some(h => h.id === lesson.id);
                            const isSelected = selectedLessonValue === value;
                            
                            return (
                                                                <Label 
                                                                        key={value} 
                                                                        htmlFor={value}
                                                                        className={cn(
                                                                            "flex flex-col items-center justify-center rounded-md p-3 cursor-pointer hover:bg-accent/80 transition-all",
                                                                              (isSelected || isHighlighted) ? "border-4 border-sky-600 bg-sky-100" : "border-2 border-sky-300"
                                                                        )}
                                                                >
                                    <RadioGroupItem value={value} id={value} className="sr-only" />
                                    <span className="font-semibold capitalize">{format(lesson.startTime.toDate(), "EEEE", { locale: it })}</span>
                                    <span className="text-sm">{format(lesson.startTime.toDate(), "dd MMMM yyyy")}</span>
                                    <span className="text-xs text-muted-foreground">{format(lesson.startTime.toDate(), "HH:mm")}</span>
                                </Label>
                            )
                        })}
                    </RadioGroup>
                </div>
                
            </CardContent>
            <CardFooter className="justify-center">
                                                 <Button 
                                                     onClick={handleConfirm} 
                                                     disabled={!selectedLessonValue || highlightedLessons.length === 0}
                                                     className="w-full font-bold"
                                                     style={{ backgroundColor: '#16a34a', color: '#fff' }}
                                                 >
                                                     Scegli il Pagamento
                                                 </Button>
            </CardFooter>
        </Card>
    )
}

// Componente per lo Step di Pagamento
function PaymentStep({ 
    onNext,
    onBack,
    fee
}: { 
    onNext: (method: PaymentMethodData) => void,
    onBack: () => void,
    fee: FeeData | null
}) {
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethodData | null>(null)

    return (
        <Card>
            <CardHeader>
                <CardTitle>Metodo di Pagamento</CardTitle>
                <CardDescription>
                    Scegli come preferisci pagare la quota di <span className="font-bold">iscrizione di {fee ? `${fee.price}€` : "..."}.</span>
                </CardDescription>
            </CardHeader>
            <CardContent>
                <RadioGroup 
                    value={paymentMethod ? String(paymentMethod) : ""} 
                    onValueChange={(value: string) => setPaymentMethod(value as unknown as PaymentMethodData)} 
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
                                   Paga in modo sicuro e veloce la quota di {fee ? `${fee.price}€` : "..."} con la tua carta tramite SumUp. Verrai indirizzato al sito sumup, <span className="font-bold">quando hai effettuato il pagamento con sumup <span className="underline">torna all'App per concludere l'iscrizione.</span></span>
                            </p>
                        </div>
                         <CreditCard className="h-6 w-6 text-muted-foreground" />
                    </Label>
                </RadioGroup>
            </CardContent>
                        <CardFooter className="justify-center">
                                <Button 
                                    onClick={() => onNext(paymentMethod!)} 
                                    disabled={!paymentMethod}
                                    className="font-bold"
                                    style={{ backgroundColor: '#f97316', color: '#fff' }}
                                >
                                    Prosegui
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
    onComplete,
    isSubmitting,
    fee,
    lastGrade
}: { 
    formData: PersonalDataSchemaType,
    gymSelection: GymSelectionData,
    paymentMethod: PaymentMethodData,
    onComplete: () => void,
    isSubmitting: boolean,
    fee: FeeData | null,
    lastGrade: string | null
}) {
    
    if (!fee || !lastGrade) {
        return <Card><CardContent className="flex justify-center items-center h-48"><Loader2 className="h-8 w-8 animate-spin" /></CardContent></Card>
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Riepilogo e Conferma</CardTitle>
                <CardDescription>
                    Controlla i dati e la scelta del pagamento e completa l'iscrizione.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-4 rounded-md border p-4">
                     <div className="bg-[#f8f6f3] border-2 border-[hsl(var(--medical-upload-text))] rounded-lg p-4">
                        <h3 className="font-semibold text-lg text-center">Dati Anagrafici</h3>
                        <dl className="space-y-2">
                            <DataRow label="Nome" value={<span className="font-bold" style={{ color: 'hsl(var(--medical-upload-text))' }}>{formData.name}</span>} />
                            <DataRow label="Cognome" value={<span className="font-bold" style={{ color: 'hsl(var(--medical-upload-text))' }}>{formData.surname}</span>} />
                            <DataRow label="Codice Fiscale" value={<span className="font-bold" style={{ color: 'hsl(var(--medical-upload-text))' }}>{formData.taxCode}</span>} />
                            <DataRow label="Data di Nascita" value={<span className="font-bold" style={{ color: 'hsl(var(--medical-upload-text))' }}>{formData.birthDate ? format(parseISO(formData.birthDate), "PPP", { locale: it }) : ''}</span>} />
                            <DataRow label="Luogo di Nascita" value={<span className="font-bold" style={{ color: 'hsl(var(--medical-upload-text))' }}>{formData.birthPlace}</span>} />
                            <DataRow label="Indirizzo" value={<span className="font-bold" style={{ color: 'hsl(var(--medical-upload-text))' }}>{`${formData.address}, ${formData.streetNumber}`}</span>} />
                            <DataRow label="Città" value={<span className="font-bold" style={{ color: 'hsl(var(--medical-upload-text))' }}>{`${formData.city} (${formData.province}), ${formData.zipCode}`}</span>} />
                            <DataRow label="Email" value={<span className="font-bold" style={{ color: 'hsl(var(--medical-upload-text))' }}>{auth.currentUser?.email}</span>} />
                            <DataRow label="Telefono" value={<span className="font-bold" style={{ color: 'hsl(var(--medical-upload-text))' }}>{formData.phone}</span>} />
                        </dl>
                     </div>
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
                    <div className="bg-[#eaf6fb] border-2 border-[#1e3a8a] rounded-lg p-4">
                        <h3 className="font-semibold text-lg text-center text-[#1e3a8a]">Lezioni di Prova</h3>
                        <dl className="space-y-3">
                            <DataRow label="Disciplina" value={<span className="font-bold text-[#1e3a8a]">{gymSelection.discipline}</span>} icon={<Sparkles size={16} />} />
                            <DataRow label="Grado" value={<span className="font-bold text-[#1e3a8a]">{lastGrade}</span>} icon={<Sparkles size={16} />} />
                            <DataRow label="Palestra" value={<span className="font-bold text-[#1e3a8a]">{`${gymSelection.gymId} - ${gymSelection.gymName}`}</span>} icon={<Building size={16} />} />
                            {gymSelection.trialLessons.map((lesson, index) => (
                               <DataRow 
                                    key={index}
                                    label={`${index + 1}ª Lezione`} 
                                    value={<span className="font-bold text-[#1e3a8a]">{`${format(lesson.startTime.toDate(), "EEEE d MMMM", { locale: it })} ${gymSelection.selectionLessonsSchedule ? `- Orario: ${gymSelection.selectionLessonsSchedule}` : ''}`}</span>} 
                                    icon={<CalendarIconDay size={16} />} 
                               />
                            ))}
                        </dl>
                    </div>
                </div>

                      <div className="bg-[#f8f6f3] border-2 border-[hsl(var(--medical-upload-text))] rounded-lg p-4">
                              <h3 className="font-semibold text-lg text-center">Metodo di Pagamento</h3>
                              <dl className="space-y-2">
                                  <DataRow 
                                      label="Metodo Scelto" 
                                      value={<span className="font-bold text-[#ea580c]">{String(paymentMethod) === 'in_person' ? 'In Palestra' : 'Online con Carta'}</span>} 
                                  />
                                  <DataRow 
                                      label={String(paymentMethod) === 'in_person' ? "Importo da Pagare" : "Importo"}
                                      value={<span className="font-bold text-[#ea580c]">{String(paymentMethod) === 'in_person' ? `${fee.price.toFixed(2)} €` : `${fee.price.toFixed(2)} € (In attesa di conferma)`}</span>} 
                                  />
                              </dl>
                      </div>
            </CardContent>
            <CardFooter>
                <Button 
                    onClick={onComplete} 
                    disabled={isSubmitting} 
                    className="w-full bg-[#6b3f19] hover:bg-[#4e2d13] text-[#ffd700] font-bold border-2 border-[#bfa100]"
                >
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Completa Iscrizione
                </Button>
            </CardFooter>
        </Card>
    )
}


export default function ClassSelectionPage() {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState<PersonalDataSchemaType | null>(null);
    const [gymSelection, setGymSelection] = useState<GymSelectionData | null>(null);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethodData | null>(null);
    const [feeData, setFeeData] = useState<FeeData | null>(null);
    const [settings, setSettings] = useState<Settings | null>(null);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();
    const router = useRouter();
    const [user] = useAuthState(auth);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [finalGrade, setFinalGrade] = useState<string | null>(null);
    const [gyms, setGyms] = useState<Map<string, {name: string}>>(new Map());
    const [awards, setAwards] = useState<Award[]>([]);

    useEffect(() => {
           const fetchInitialData = async () => {
               if (!user) {
                   setLoading(false);
                   return;
               }
               try {
                   const feeDocRef = doc(db, "fees", "trial");
                   const enrollmentSettingsRef = doc(db, "settings", "enrollment");
                   const userDocRef = doc(db, "users", user.uid);
                   const paymentsCollectionRef = collection(db, "users", user.uid, "payments");
                   const gymsSnap = await getDocs(collection(db, "gyms"));
                   // user è già controllato sopra
                   const awardsSnap = await getDocs(collection(db, `users/${user.uid}/awards`));

                const [feeDocSnap, enrollmentDocSnap, userDocSnap] = await Promise.all([
                    getDoc(feeDocRef),
                    getDoc(enrollmentSettingsRef),
                    getDoc(userDocRef),
                ]);
                
                const gymsMap = new Map<string, {name: string}>();
                gymsSnap.forEach(doc => gymsMap.set(doc.id, { name: doc.data().name }));
                setGyms(gymsMap);

                const awardsList = awardsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Award));
                setAwards(awardsList);

                if (feeDocSnap.exists()) setFeeData(feeDocSnap.data() as FeeData);
                else toast({ title: "Errore", description: "Impossibile caricare i dati della quota.", variant: "destructive" });

                if (enrollmentDocSnap.exists()) {
                    setSettings({ enrollment: enrollmentDocSnap.data() as Settings['enrollment'] });
                } else {
                    toast({ title: "Errore di configurazione", description: "Impostazioni per le iscrizioni non trovate.", variant: "destructive" });
                }

                if (userDocSnap.exists()) {
                    const userData = userDocSnap.data();
                    // Leggi le lezioni di prova dalla sottoraccolta
                    const trialLessonsDocRef = doc(db, `users/${user.uid}/trialLessons/main`);
                    const trialLessonsSnap = await getDoc(trialLessonsDocRef);
                    let trialLessons = [];
                    let trialStatus = undefined;
                    let trialExpiryDate = undefined;
                    if (trialLessonsSnap.exists()) {
                        const data = trialLessonsSnap.data();
                        trialLessons = data.lessons || [];
                        trialStatus = data.trialStatus;
                        trialExpiryDate = data.trialExpiryDate;
                    }
                    const hasPendingTrialPayment = trialStatus === 'pending_payment';
                    if (hasPendingTrialPayment && trialLessons.length > 0) {
                        const q = query(
                            paymentsCollectionRef,
                            where("type", "==", "trial"),
                            where("status", "==", "pending"),
                            orderBy("createdAt", "desc"),
                            limit(1)
                        );
                        const paymentSnap = await getDocs(q);

                        if (!paymentSnap.empty) {
                            const lastPayment = paymentSnap.docs[0].data();
                            setPaymentMethod(lastPayment.paymentMethod as PaymentMethodData);

                            setFormData({
                                name: userData.name || "", surname: userData.surname || "", taxCode: userData.taxCode || "",
                                birthDate: userData.birthDate ? format(userData.birthDate.toDate(), 'yyyy-MM-dd') : "",
                                birthPlace: userData.birthPlace || "",
                                address: userData.address || "", streetNumber: userData.streetNumber || "", city: userData.city || "",
                                zipCode: userData.zipCode || "", province: userData.province || "", phone: userData.phone || "",
                                isMinor: userData.isMinor || false, parentData: userData.parentData,
                            });

                            const scheduleDocRef = doc(db, "orarigruppi", userData.gym);
                            const scheduleDocSnap = await getDoc(scheduleDocRef);
                            const schedule = scheduleDocSnap.exists() ? scheduleDocSnap.data().lezioniselezione : undefined;

                            setGymSelection({
                                gymId: userData.gym,
                                gymName: gymsMap.get(userData.gym)?.name || userData.gym,
                                discipline: userData.discipline,
                                trialLessons: trialLessons,
                                selectionLessonsSchedule: schedule
                            });
                            setFinalGrade(userData.lastGrade);
                            setStep(4);
                        }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, toast]);

    
    const handleNextStep1 = async (data: PersonalDataSchemaType) => {
        if (!user) return;
        setIsSubmitting(true);
        try {
            const userDocRef = doc(db, "users", user.uid);
            const personalDataToUpdate: any = {
                name: data.name, surname: data.surname, birthPlace: data.birthPlace,
                birthDate: data.birthDate ? Timestamp.fromDate(parseISO(data.birthDate)) : null,
                taxCode: data.taxCode, address: data.address, streetNumber: data.streetNumber, zipCode: data.zipCode,
                city: data.city, province: data.province, phone: data.phone, isMinor: data.isMinor,
                parentData: data.isMinor ? data.parentData : null,
            };
            await updateDoc(userDocRef, personalDataToUpdate);
            setFormData(data);
            
            if (gymSelection && paymentMethod) {
                setStep(4);
            } else {
                setStep(2);
            }
        } catch (error) {
            toast({ title: "Errore", description: `Impossibile salvare i dati anagrafici.`, variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    }
    
    const handleNextStep2 = async (data: GymSelectionData) => {
        if (!user) {
            console.error("user non presente");
            return;
        }
        setIsSubmitting(true);
        try {
            const userDocRef = doc(db, "users", user.uid);
            const userDocSnap = await getDoc(userDocRef);
            if (!userDocSnap.exists()) throw new Error("User not found");

            const fetchedUserData = userDocSnap.data();
            const hasPracticed = fetchedUserData?.hasPracticedBefore === 'yes';
            const pastDiscipline = fetchedUserData?.discipline;
            const pastGrade = fetchedUserData?.lastGrade;
            let grade = "";

            if (hasPracticed && pastDiscipline === data.discipline && pastGrade) {
                grade = pastGrade;
            } else {
                const docRef = doc(db, "config", data.discipline.toLowerCase());
                const docSnap = await getDoc(docRef);
                if (docSnap.exists() && docSnap.data().grades?.[0]) {
                    const defaultGradeValue = docSnap.data().grades[0];
                    grade = data.discipline === 'Karate' ? `Cintura ${defaultGradeValue}` : defaultGradeValue;
                } else {
                    throw new Error(`Grado di default non trovato per ${data.discipline}`);
                }
            }

            // DEBUG: log dati prima di scrivere
            console.log("Scrittura trialLessons/main", {
                userUid: user.uid,
                trialLessons: data.trialLessons,
                trialStatus: 'pending_payment',
                trialExpiryDate: data.trialLessons.length > 1 ? data.trialLessons[2].endTime : data.trialLessons[0].endTime || null,
            });

            // Salva tutte le lezioni di prova in un unico documento users/userId/trialLessons/main
            const trialLessonsDocRef = doc(db, "users", user.uid, "trialLessons", "main");
            try {
                await setDoc(trialLessonsDocRef, {
                    lessons: data.trialLessons,
                    trialStatus: 'pending_payment',
                    trialExpiryDate: data.trialLessons.length > 1 ? data.trialLessons[2].endTime : data.trialLessons[0].endTime || null,
                });
                console.log("Documento trialLessons/main scritto correttamente");
            } catch (err) {
                console.error("Errore scrittura trialLessons/main", err);
                throw err;
            }
            await updateDoc(userDocRef, {
                lastGrade: grade
            });

            setFinalGrade(grade);
            setGymSelection(data);
            setStep(3);
        } catch (error) {
            toast({ title: "Errore", description: `Impossibile salvare la scelta delle lezioni: ${error instanceof Error ? error.message : 'sconosciuto'}`, variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    }

    const handleNextStep3 = async (method: PaymentMethodData) => {
        if (!user || !gymSelection || !feeData) return;
        setIsSubmitting(true);
        try {
            const batch = writeBatch(db);
            const userDocRef = doc(db, "users", user.uid);
            
            const paymentsRef = collection(db, 'users', user.uid, 'payments');
            const q = query(paymentsRef, where('type', '==', 'trial'), where('status', '==', 'pending'), limit(1));
            const existingPaymentSnap = await getDocs(q);

            if (existingPaymentSnap.empty) {
                 const newPaymentRef = doc(paymentsRef);
                 batch.set(newPaymentRef, {
                    userId: user.uid, createdAt: serverTimestamp(), amount: feeData.price,
                    description: feeData.name, type: 'trial', status: 'pending', paymentMethod: method,
                });
            }

            // Aggiorna trialStatus e trialExpiryDate nel documento main
            const trialLessonsDocRef = doc(db, "users", user.uid, "trialLessons", "main");
            await updateDoc(trialLessonsDocRef, {
                trialStatus: 'pending_payment',
                trialExpiryDate: gymSelection.trialLessons.length > 1 ? gymSelection.trialLessons[2].endTime : gymSelection.trialLessons[0].endTime || null,
            });

            // Logica per assegnare premio di benvenuto
            const gymName = gyms.get(gymSelection.gymId)?.name.toLowerCase() || '';
            let awardToAssign: Award | undefined;
            
            if (gymName.includes('verres')) {
                awardToAssign = awards.find(a => a.name.includes("3 Lezioni"));
            } else if (gymName.includes('aosta') || gymName.includes('villeneuve')) {
                awardToAssign = awards.find(a => a.name.includes("5 Lezioni"));
            }

            if (awardToAssign) {
                const userAwardDocRef = doc(db, "users", user.uid, "userAwards", awardToAssign.id);
                batch.set(userAwardDocRef, {
                    assignedAt: serverTimestamp(),
                    awardId: awardToAssign.id,
                    name: awardToAssign.name,
                    value: awardToAssign.value,
                    residuo: awardToAssign.value,
                    used: false,
                    usedValue: 0,
                    reason: "Iscrizione lezioni di prova",
                });
            }
            
            await batch.commit();
            
            setPaymentMethod(method);
            
            if (String(method) === 'online' && feeData?.sumupLink) {
                window.open(feeData.sumupLink, '_blank');
            }
            setStep(4);

        } catch(error) {
             toast({ title: "Errore", description: `Impossibile avviare il pagamento.`, variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    }
    
    const handleComplete = async () => {
        if (!user) {
            toast({ title: "Errore", description: "Utente non autenticato.", variant: "destructive" });
            return;
        }
        setIsSubmitting(true);
        try {
            // Imposta il flag solo se non è già scaduto (localStorage)
            if (!localStorage.getItem('showDataCorrectionMessageExpired')) {
                sessionStorage.setItem('showDataCorrectionMessage', new Date().toISOString());
            }
            toast({ title: "Iscrizione Inviata!", description: "La tua richiesta è stata inviata con successo. Verrai reindirizzato."});
            router.replace("/dashboard");
            window.location.href = "/dashboard";
        } catch (error) {
            console.error("Errore durante il completamento dell'iscrizione:", error);
            toast({ title: "Errore", description: "Impossibile completare l'iscrizione. Riprova.", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    }

    const handleBack = () => {
        if (step > 1) {
            setStep(prev => prev - 1);
        } else {
            router.push('/dashboard/liberasphere');
        }
    }
    
    if (loading || user === undefined) {
        return (
            <div className="flex h-full w-full items-center justify-center">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </div>
        );
    }

    if (user === null) {
        return (
            <div className="flex h-full w-full items-center justify-center">
                <Card>
                    <CardHeader>
                        <CardTitle>Accesso richiesto</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p>Devi essere autenticato per accedere a questa pagina.</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex w-full flex-col items-center">
            <div className="mb-8 text-center">
                <h1 className="text-3xl font-bold">Iscrizione alle Lezioni di Selezione</h1>
                <p className="mt-2 text-sm">
                    Completa la procedura per iscriverti.
                </p>
            </div>
            <div className="w-full max-w-3xl">
                {step === 1 && (
                    <PersonalDataForm
                        title="Dati Anagrafici"
                        description="Completa le tue informazioni personali per procedere con l'iscrizione. Questi dati verranno salvati per future iscrizioni."
                        buttonText="Prosegui"
                        onFormSubmit={handleNextStep1}
                    />
                )}
                {step === 2 && user && (
                    <GymSelectionStep 
                        onNext={handleNextStep2}
                        user={user}
                    />
                )}
                {step === 3 && (
                    <PaymentStep
                        onNext={handleNextStep3}
                        onBack={() => setStep(2)}
                        fee={feeData}
                    />
                )}
                {step === 4 && formData && paymentMethod && gymSelection && (
                    <ConfirmationStep 
                        formData={formData}
                        gymSelection={gymSelection}
                        paymentMethod={paymentMethod}
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
