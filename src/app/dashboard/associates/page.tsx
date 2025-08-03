
"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { PersonalDataForm, type PersonalDataSchemaType } from "@/components/dashboard/PersonalDataForm"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { CreditCard, Landmark, ArrowLeft, CheckCircle, University, Sparkles, Award, Star } from "lucide-react"
import { format } from "date-fns"
import { it } from "date-fns/locale"
import { Checkbox } from "@/components/ui/checkbox"
import { auth, db } from "@/lib/firebase"
import { useAuthState } from "react-firebase-hooks/auth"
import { doc, updateDoc, getDoc, Timestamp, collection, addDoc, serverTimestamp, getDocs, query, where, limit } from "firebase/firestore"
import { Loader2 } from "lucide-react"

interface FeeData {
    name: string;
    price: number;
    sumupLink: string;
}

interface SeasonSettings {
    endDate: Timestamp;
    label?: string;
}

type PaymentMethod = "in_person" | "online" | "bank_transfer"

// Componente per visualizzare i dati in modo pulito
const DataRow = ({ label, value, icon }: { label: string; value?: string | null, icon?: React.ReactNode }) => (
    value ? (
        <div className="flex items-center">
            {icon && <div className="w-5 text-muted-foreground">{icon}</div>}
            <div className={`flex flex-col sm:flex-row sm:justify-between w-full ${icon ? 'ml-3' : ''}`}>
                 <dt className="font-medium text-muted-foreground">{label}</dt>
                 <dd className="mt-1 text-foreground sm:mt-0 sm:text-right">{value}</dd>
            </div>
        </div>
    ) : null
);

// Componente per il Popup del Bonifico
function BankTransferDialog({ open, onOpenChange, onConfirm, fee }: { open: boolean, onOpenChange: (open: boolean) => void, onConfirm: () => void, fee: FeeData | null }) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Dati per Bonifico Bancario</DialogTitle>
                    <DialogDescription>
                        Copia i dati seguenti per effettuare il bonifico. Potrai completare il pagamento con calma dopo aver finalizzato la domanda di associazione.
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
                        <p>{fee ? `${fee.price.toFixed(2)} €` : <Loader2 className="h-4 w-4 animate-spin" />}</p>
                    </div>
                     <div className="space-y-1">
                        <p className="font-semibold text-foreground">Causale:</p>
                        <p className="font-mono bg-muted p-2 rounded-md">Quota Associativa [Nome Cognome Socio]</p>
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={onConfirm}>Prosegui al Riepilogo</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

// Componente per lo Step di Pagamento Online (iFrame)
function OnlinePaymentStep({ onBack, onNext, fee }: { onBack: () => void; onNext: () => void, fee: FeeData | null }) {
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
                        title="Pagamento SumUp Quota Associativa"
                    ></iframe>
                </div>
                <p className="text-sm text-muted-foreground">
                    Se hai problemi a visualizzare il modulo, puoi aprirlo in una nuova scheda <a href={fee.sumupLink} target="_blank" rel="noopener noreferrer" className="underline">cliccando qui</a>.
                </p>
            </CardContent>
            <CardFooter className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
                <Button variant="outline" onClick={onBack}>
                    <ArrowLeft />
                    Torna alla scelta
                </Button>
                <Button onClick={onNext}>
                    <CheckCircle />
                    Ho effettuato il pagamento
                </Button>
            </CardFooter>
        </Card>
    );
}


// Componente per lo Step 2: Pagamento
function PaymentStep({ onBack, onNext, fee }: { onBack: () => void, onNext: (method: PaymentMethod) => void, fee: FeeData | null }) {
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null)

    return (
        <Card>
            <CardHeader>
                <CardTitle>Passo 2: Quota Associativa</CardTitle>
                <CardDescription>
                    Scegli come versare la quota associativa annuale di {fee ? `${fee.price}€` : "..."}.
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
                                Paga in modo sicuro e veloce la quota di {fee ? `${fee.price}€` : "..."} con la tua carta tramite SumUp.
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
                                Si aprirà un popup con gli estremi per effettuare il bonifico di {fee ? `${fee.price}€` : "..."}. La richiesta sarà valida dopo la verifica.
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
                                Potrai saldare la quota di {fee ? `${fee.price}€` : "..."} direttamente presso la nostra sede.
                            </p>
                        </div>
                        <Landmark className="h-6 w-6 text-muted-foreground" />
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

function getPaymentDescription(method: PaymentMethod | null) {
    switch (method) {
        case 'online': return 'Online con Carta';
        case 'bank_transfer': return 'Bonifico Bancario';
        case 'in_person': return 'In Sede';
        default: return '';
    }
}

function getPaymentStatus(method: PaymentMethod | null, price: number) {
     switch (method) {
        case 'online': return `${price.toFixed(2)} € (In attesa di conferma)`;
        case 'bank_transfer': return `${price.toFixed(2)} € (In attesa di accredito)`;
        case 'in_person': return `${price.toFixed(2)} € (Da versare in sede)`;
        default: return `${price.toFixed(2)} €`;
    }
}

function ConfirmationStep({
    formData,
    paymentMethod,
    onBack,
    onComplete,
    isSubmitting,
    fee,
    discipline,
    lastGrade,
    qualification,
}: {
    formData: PersonalDataSchemaType,
    paymentMethod: PaymentMethod | null,
    onBack: () => void,
    onComplete: () => void,
    isSubmitting: boolean,
    fee: FeeData | null,
    discipline: string | null,
    lastGrade: string | null,
    qualification: string | null,
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
                    Controlla i tuoi dati. Se tutto è corretto, conferma e invia la tua domanda di associazione.
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
                     <h3 className="font-semibold text-lg">Carriera Sportiva</h3>
                     <dl className="space-y-2">
                        <DataRow label="Disciplina" value={discipline} icon={<Sparkles size={16}/>} />
                        <DataRow label="Grado" value={lastGrade} icon={<Award size={16}/>} />
                        <DataRow label="Qualifica" value={qualification} icon={<Star size={16}/>}/>
                     </dl>
                </div>

                 <div className="space-y-4 rounded-md border p-4">
                    <h3 className="font-semibold text-lg">Quota Associativa</h3>
                    <dl className="space-y-2">
                       <DataRow label="Metodo Scelto" value={getPaymentDescription(paymentMethod)} />
                       <DataRow label="Stato Pagamento" value={getPaymentStatus(paymentMethod, fee.price)} />
                    </dl>
                </div>

                <div className="flex items-center space-x-2 pt-4">
                    <Checkbox id="confirm-data" checked={isConfirmed} onCheckedChange={(checked) => setIsConfirmed(checked as boolean)} />
                    <Label htmlFor="confirm-data" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Dichiaro che i dati inseriti sono corretti e confermo la richiesta.
                    </Label>
                </div>
            </CardContent>
            <CardFooter className="justify-between">
                <Button variant="outline" onClick={onBack}>Indietro</Button>
                <Button onClick={onComplete} disabled={!isConfirmed || isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Invia Domanda di Associazione
                </Button>
            </CardFooter>
        </Card>
    )
}

export default function AssociatesPage() {
    const [step, setStep] = useState(1)
    const [formData, setFormData] = useState<PersonalDataSchemaType | null>(null)
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null)
    const [isBankTransferDialogOpen, setIsBankTransferDialogOpen] = useState(false);
    const [user] = useAuthState(auth);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [feeData, setFeeData] = useState<FeeData | null>(null);
    const [seasonSettings, setSeasonSettings] = useState<SeasonSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [discipline, setDiscipline] = useState<string | null>(null);
    const [lastGrade, setLastGrade] = useState<string | null>(null);
    const [qualification, setQualification] = useState<string | null>(null);


    const { toast } = useToast()
    const router = useRouter()

    useEffect(() => {
        const fetchInitialData = async () => {
             if (!user) return;
            try {
                const userDocRef = doc(db, "users", user.uid);
                const feeDocRef = doc(db, "fees", "association");
                const seasonSettingsRef = doc(db, "settings", "season");
                const paymentsQuery = query(
                    collection(db, 'users', user.uid, 'payments'),
                    where('type', '==', 'association'),
                    where('status', '==', 'pending'),
                    limit(1)
                );
                
                const [userDocSnap, feeDocSnap, seasonDocSnap, paymentsSnapshot] = await Promise.all([
                    getDoc(userDocRef),
                    getDoc(feeDocRef),
                    getDoc(seasonSettingsRef),
                    getDocs(paymentsQuery)
                ]);

                if (feeDocSnap.exists()) {
                    setFeeData(feeDocSnap.data() as FeeData);
                } else {
                    toast({ title: "Errore", description: "Impossibile caricare i dati della quota. Contatta la segreteria.", variant: "destructive" });
                }
                
                if (seasonDocSnap.exists()) {
                    setSeasonSettings(seasonDocSnap.data() as SeasonSettings);
                } else {
                     toast({ title: "Errore", description: "Impossibile caricare le impostazioni della stagione.", variant: "destructive" });
                }

                if (userDocSnap.exists()) {
                    const userData = userDocSnap.data();
                    
                    // Set career data
                    setDiscipline(userData.discipline || null);
                    setLastGrade(userData.lastGrade || null);
                    setQualification(userData.qualification || null);

                    const prefilledData: PersonalDataSchemaType = {
                        name: userData.name || "",
                        surname: userData.surname || "",
                        taxCode: userData.taxCode || "",
                        birthDate: userData.birthDate?.toDate() || new Date(),
                        birthPlace: userData.birthPlace || "",
                        address: userData.address || "",
                        streetNumber: userData.streetNumber || "",
                        city: userData.city || "",
                        zipCode: userData.zipCode || "",
                        province: userData.province || "",
                        phone: userData.phone || "",
                        isMinor: false,
                        parentData: userData.parentData || undefined,
                    };
                    setFormData(prefilledData);

                    // LOGICA DI AVANZAMENTO STEP
                    const hasPersonalData = userData.taxCode && userData.birthDate;

                    if (!paymentsSnapshot.empty) { // Se c'è un pagamento in sospeso
                        const paymentData = paymentsSnapshot.docs[0].data();
                        setPaymentMethod(paymentData.paymentMethod as PaymentMethod);
                        setStep(4); // Vai direttamente al riepilogo
                    } else if (hasPersonalData) { // Se ha dati ma non pagamento
                        setStep(2); // Vai alla scelta del pagamento
                    } else { // Altrimenti
                        setStep(1); // Inizia dai dati anagrafici
                    }
                }

            } catch (error) {
                console.error("Error fetching initial data:", error);
                toast({ title: "Errore di connessione", description: "Impossibile recuperare i dati iniziali. Riprova.", variant: "destructive" });
            } finally {
                setLoading(false);
            }
        };
        fetchInitialData();
    }, [user, toast]);

    const handleNextStep1 = (data: PersonalDataSchemaType) => {
        setFormData(data)
        setStep(2)
    }

    const handlePaymentSubmit = (method: PaymentMethod) => {
        setPaymentMethod(method);
        switch (method) {
            case 'online':
                setStep(3); // Vai allo step dell'iframe SumUp
                break;
            case 'bank_transfer':
                setIsBankTransferDialogOpen(true); // Apri il popup del bonifico
                break;
            case 'in_person':
            default:
                setStep(4); // Per il pagamento in sede, vai al riepilogo
                break;
        }
    };
    
    const handleOnlinePaymentNext = () => {
        // L'utente ha cliccato "Ho effettuato il pagamento" dallo step dell'iframe
        setStep(4);
    }

    const handleBankTransferConfirm = () => {
        // L'utente ha confermato di aver letto i dati del bonifico
        setIsBankTransferDialogOpen(false);
        setStep(4);
    }

    const submitApplication = async () => {
         if (!user || !formData || !feeData || !seasonSettings || !paymentMethod) {
             toast({ title: "Errore", description: "Dati mancanti per completare la richiesta.", variant: "destructive" });
             return;
         }
         setIsSubmitting(true);
         try {
            const userDocRef = doc(db, "users", user.uid);
            
            const dataToUpdate: any = {
                name: formData.name,
                surname: formData.surname,
                birthPlace: formData.birthPlace,
                birthDate: formData.birthDate,
                taxCode: formData.taxCode,
                address: formData.address,
                streetNumber: formData.streetNumber,
                zipCode: formData.zipCode,
                city: formData.city,
                province: formData.province,
                phone: formData.phone,
                applicationSubmitted: true,
                associationStatus: "pending",
                associationExpiryDate: seasonSettings.endDate,
                trialStatus: 'not_applicable',
                // Aggiungiamo anche la qualifica per mantenerla aggiornata
                qualification: qualification,
            };

            if (formData.isMinor && formData.parentData) {
                dataToUpdate.parentData = formData.parentData;
            }

            await updateDoc(userDocRef, dataToUpdate);
            
            // Create payment record
            const paymentsCollectionRef = collection(db, "users", user.uid, "payments");
            await addDoc(paymentsCollectionRef, {
                userId: user.uid,
                createdAt: serverTimestamp(),
                amount: feeData.price,
                description: feeData.name,
                type: 'association',
                status: 'pending',
                paymentMethod: paymentMethod,
            });

            toast({ title: "Richiesta Inviata", description: "La tua domanda di associazione è stata inviata con successo. Verrai reindirizzato al prossimo passo." });
            router.push("/dashboard");
         } catch (error) {
            console.error("Errore durante l'invio della domanda:", error);
            toast({ title: "Errore", description: "Impossibile inviare la domanda. Riprova.", variant: "destructive" });
         } finally {
            setIsSubmitting(false);
         }
    }

    const handleBack = () => {
        if (step === 4) { // Riepilogo
            if (paymentMethod === 'online') {
                setStep(3); // torna all'iframe
            } else {
                setStep(2); // torna alla scelta del pagamento
            }
        } else if (step === 3) { // Iframe
             setStep(2); // torna alla scelta del pagamento
        } else if (step === 2) { // Scelta pagamento
             router.push('/dashboard'); // Dallo step 2, torna alla dashboard
        } else {
            router.push('/dashboard'); // Dallo step 1, torna alla dashboard
        }
    }

    const handleBackFromOnlinePayment = () => {
        setStep(2);
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
                <h1 className="text-3xl font-bold">Domanda di Associazione</h1>
                <p className="mt-2 text-muted-foreground">
                    {seasonSettings?.label 
                        ? `Completa e verifica i tuoi dati per inviare la domanda di associazione per la stagione ${seasonSettings.label}.`
                        : "Completa e verifica i tuoi dati per inviare la domanda di associazione."
                    }
                </p>
            </div>
            
            <div className="w-full max-w-3xl">
                {step === 1 && (
                    <PersonalDataForm
                        title="Inserisci i tuoi dati anagrafici"
                        description="Assicurati che tutte le informazioni siano corrette prima di inviare la tua domanda di associazione."
                        buttonText="Prosegui alla Scelta del Pagamento"
                        onFormSubmit={handleNextStep1}
                        onBack={() => router.push('/dashboard')}
                    />
                )}
                {step === 2 && (
                    <PaymentStep
                        onBack={handleBack}
                        onNext={handlePaymentSubmit}
                        fee={feeData}
                    />
                )}
                {step === 3 && paymentMethod === 'online' && (
                     <OnlinePaymentStep onBack={handleBackFromOnlinePayment} onNext={handleOnlinePaymentNext} fee={feeData} />
                )}
                {step === 4 && formData && (
                    <ConfirmationStep
                        formData={formData}
                        paymentMethod={paymentMethod}
                        onBack={handleBack}
                        onComplete={submitApplication}
                        isSubmitting={isSubmitting}
                        fee={feeData}
                        discipline={discipline}
                        lastGrade={lastGrade}
                        qualification={qualification}
                    />
                )}
            </div>
            
            <BankTransferDialog 
                open={isBankTransferDialogOpen}
                onOpenChange={setIsBankTransferDialogOpen}
                onConfirm={handleBankTransferConfirm}
                fee={feeData}
            />
        </div>
    )
}
