
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

import { useToast } from "@/hooks/use-toast"
import { PersonalDataForm, type PersonalDataSchemaType } from "@/components/dashboard/PersonalDataForm"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { format } from "date-fns"
import { it } from "date-fns/locale"
import { CreditCard, Landmark, ArrowLeft, CheckCircle, Clock, Building, Calendar as CalendarIconMonth } from "lucide-react"
import { auth, db } from "@/lib/firebase"
import { useAuthState } from "react-firebase-hooks/auth"
import { doc, updateDoc, collection, getDocs, getDoc } from "firebase/firestore"
import { Loader2 } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

interface FeeData {
    name: string;
    price: number;
    sumupLink: string;
}

// Tipi di dati
type PaymentMethod = "in_person" | "online"
interface Gym {
    id: string;
    name: string;
    time: string;
    availableDays?: number[];
}
interface GymSelectionData {
    gym: Gym;
    lessonMonth: string;
    lessonDay: string;
}

const getDayName = (dayNumber: number): string => {
    const days = ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"];
    return days[dayNumber] || '';
};

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

// Componente per lo Step 2: Selezione Palestra e Lezione
function GymSelectionStep({ 
    onBack, 
    onNext 
}: { 
    onBack: () => void, 
    onNext: (data: GymSelectionData) => void 
}) {
    const [gyms, setGyms] = useState<Gym[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedGym, setSelectedGym] = useState<Gym | null>(null);
    const [lessonMonth, setLessonMonth] = useState<string | null>(null);
    const [lessonDay, setLessonDay] = useState<string | null>(null);
    const { toast } = useToast();

    const months = [
        "Settembre", "Ottobre", "Novembre", "Dicembre", "Gennaio", 
        "Febbraio", "Marzo", "Aprile"
    ];

    useEffect(() => {
        const fetchGyms = async () => {
            try {
                const gymsCollection = collection(db, 'gyms');
                const gymSnapshot = await getDocs(gymsCollection);
                const gymsList = gymSnapshot.docs.map(doc => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        ...data,
                    } as Gym;
                }).sort((a, b) => a.name.localeCompare(b.name));
                setGyms(gymsList);
            } catch (error) {
                console.error("Error fetching gyms:", error);
                toast({ title: "Errore", description: "Impossibile caricare le palestre.", variant: "destructive" });
            } finally {
                setLoading(false);
            }
        };
        fetchGyms();
    }, [toast]);
    
    const handleGymChange = (gymId: string) => {
        const gym = gyms.find(g => g.id === gymId) || null;
        setSelectedGym(gym);
        setLessonDay(null);
    }

    const handleSubmit = () => {
        if (selectedGym && lessonMonth && lessonDay) {
            onNext({ gym: selectedGym, lessonMonth, lessonDay });
        }
    }

    if (loading) {
        return (
             <Card>
                <CardHeader>
                    <CardTitle>Passo 2: Scegli la Palestra</CardTitle>
                    <CardDescription>Caricamento delle palestre disponibili...</CardDescription>
                </CardHeader>
                <CardContent className="h-48 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </CardContent>
             </Card>
        )
    }

    const availableDaysSorted = selectedGym?.availableDays && Array.isArray(selectedGym.availableDays) 
    ? [...selectedGym.availableDays].sort((a, b) => a - b) 
    : [];

    return (
        <Card>
            <CardHeader>
                <CardTitle>Passo 2: Scegli Palestra e Lezione</CardTitle>
                <CardDescription>
                    Seleziona dove e quando vuoi iniziare la tua prova.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="gym-select">1. Palestra</Label>
                    <Select onValueChange={handleGymChange}>
                        <SelectTrigger id="gym-select">
                            <SelectValue placeholder="Seleziona una palestra" />
                        </SelectTrigger>
                        <SelectContent>
                            {gyms.map(gym => (
                                <SelectItem key={gym.id} value={gym.id}>
                                    {gym.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                     {selectedGym && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground animate-in fade-in-50">
                            <Clock size={14}/>
                            <span>Orario Lezioni: {selectedGym.time}</span>
                        </div>
                    )}
                </div>
                
                 {selectedGym && (
                     <div className="space-y-2 animate-in fade-in-50">
                        <Label htmlFor="day-select">2. Giorno della Lezione</Label>
                        <Select onValueChange={setLessonDay} value={lessonDay || ''} disabled={!availableDaysSorted.length}>
                            <SelectTrigger id="day-select">
                                <SelectValue placeholder="Seleziona un giorno" />
                            </SelectTrigger>
                            <SelectContent>
                                {availableDaysSorted.map(day => (
                                    <SelectItem key={day} value={String(day)}>
                                        {getDayName(day)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                         {!availableDaysSorted.length && (
                            <p className="text-sm text-muted-foreground">Nessun giorno disponibile per questa palestra.</p>
                         )}
                    </div>
                 )}
                 
                 {selectedGym && lessonDay && (
                     <div className="space-y-2 animate-in fade-in-50">
                        <Label htmlFor="month-select">3. Mese di Inizio</Label>
                        <Select onValueChange={setLessonMonth} value={lessonMonth || ''}>
                            <SelectTrigger id="month-select">
                                <SelectValue placeholder="Seleziona un mese" />
                            </SelectTrigger>
                            <SelectContent>
                                {months.map(month => (
                                    <SelectItem key={month} value={month}>
                                        {month}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                 )}

            </CardContent>
            <CardFooter className="justify-between">
                 <Button variant="outline" onClick={onBack}>Indietro</Button>
                 <Button onClick={handleSubmit} disabled={!selectedGym || !lessonMonth || !lessonDay}>Prosegui al Pagamento</Button>
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
                    Se hai problemi a visualizzare il modulo, puoi aprirlo in una nuova scheda <a href={fee.sumupLink} target="_blank" rel="noopener noreferrer" className="underline">cliccando qui</a>.
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
    fee
}: { 
    formData: PersonalDataSchemaType,
    gymSelection: GymSelectionData,
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
                    Controlla attentamente i dati e la scelta del pagamento. Se tutto è corretto,
                    conferma e completa l'iscrizione.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-4 rounded-md border p-4">
                     <h3 className="font-semibold text-lg">Dati Anagrafici</h3>
                     <dl className="space-y-2">
                        <DataRow label="Nome e Cognome" value={`${formData.name} ${formData.surname}`} />
                        <DataRow label="Codice Fiscale" value={formData.taxCode} />
                        <DataRow label="Data di Nascita" value={formData.birthDate ? format(formData.birthDate, "PPP", { locale: it }) : ''} />
                        <DataRow label="Luogo di Nascita" value={formData.birthPlace} />
                        <DataRow label="Indirizzo" value={`${formData.address}, ${formData.streetNumber}`} />
                        <DataRow label="Città" value={`${formData.city} (${formData.province}), ${formData.zipCode}`} />
                        <DataRow label="Telefono" value={formData.phone} />
                     </dl>
                </div>
                
                {formData.isMinor && formData.parentData && (
                    <div className="space-y-4 rounded-md border p-4">
                        <h3 className="font-semibold text-lg">Dati Genitore/Tutore</h3>
                        <dl className="space-y-2">
                           <DataRow label="Nome e Cognome" value={`${formData.parentData.parentName} ${formData.parentData.parentSurname}`} />
                           <DataRow label="Codice Fiscale" value={`${formData.parentData.parentTaxCode}`} />
                        </dl>
                    </div>
                )}
                
                <div className="space-y-4 rounded-md border p-4">
                    <h3 className="font-semibold text-lg">Lezione di Prova</h3>
                    <dl className="space-y-3">
                        <DataRow label="Palestra" value={gymSelection.gym.name} icon={<Building size={16} />} />
                        <DataRow label="Mese Inizio" value={gymSelection.lessonMonth} icon={<CalendarIconMonth size={16} />} />
                        <DataRow label="Giorno" value={getDayName(Number(gymSelection.lessonDay))} />
                        <DataRow label="Orario" value={gymSelection.gym.time} icon={<Clock size={16} />} />
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

    useEffect(() => {
        const fetchFee = async () => {
            try {
                const feeDocRef = doc(db, "fees", "trial");
                const feeDocSnap = await getDoc(feeDocRef);
                if (feeDocSnap.exists()) {
                    setFeeData(feeDocSnap.data() as FeeData);
                } else {
                    toast({ title: "Errore", description: "Impossibile caricare i dati della quota. Contatta la segreteria.", variant: "destructive" });
                }
            } catch (error) {
                console.error("Error fetching fee data:", error);
                toast({ title: "Errore di connessione", description: "Impossibile recuperare i dati della quota. Riprova.", variant: "destructive" });
            } finally {
                setLoadingFee(false);
            }
        };
        fetchFee();
    }, [toast]);

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
    
    const handleComplete = async () => {
        if (!user || !paymentMethod || !formData || !gymSelection || !feeData) {
            toast({ title: "Errore", description: "Dati mancanti per completare l'iscrizione.", variant: "destructive" });
            return;
        }
        setIsSubmitting(true);
        try {
            const userDocRef = doc(db, "users", user.uid);
            
            const { isMinor, ...dataToSave } = formData;
            if (!isMinor) {
                delete (dataToSave as any).parentData;
            }
            const fullName = `${dataToSave.name} ${dataToSave.surname}`.trim();
            
            await updateDoc(userDocRef, {
                ...dataToSave,
                name: fullName,
                applicationSubmitted: true,
                associationStatus: "not_associated",
                isInsured: true,
                trialLesson: {
                    gymId: gymSelection.gym.id,
                    gymName: gymSelection.gym.name,
                    lessonMonth: gymSelection.lessonMonth,
                    lessonDay: getDayName(Number(gymSelection.lessonDay)),
                    time: gymSelection.gym.time,
                },
                paymentMethod: paymentMethod,
                paymentDetails: {
                    feeName: feeData.name,
                    amount: feeData.price,
                    status: 'pending'
                }
            });

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
        } else {
            setStep(prev => prev - 1);
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
                <h1 className="text-3xl font-bold">Iscrizione al Passaporto Selezioni</h1>
                <p className="mt-2 text-muted-foreground">
                    Completa la procedura per accedere alle lezioni di selezione.
                </p>
            </div>
            
            <div className="w-full max-w-3xl">
                {step === 1 && (
                    <PersonalDataForm
                        title="Passo 1: Dati Anagrafici"
                        description="Completa le tue informazioni personali per procedere con l'iscrizione. Questi dati verranno salvati per future iscrizioni."
                        buttonText="Prosegui alla Scelta della Palestra"
                        onFormSubmit={handleNextStep1}
                    />
                )}
                {step === 2 && (
                    <GymSelectionStep 
                        onBack={() => setStep(1)}
                        onNext={handleNextStep2}
                    />
                )}
                {step === 3 && (
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
                    />
                )}
            </div>
        </div>
    )
}
