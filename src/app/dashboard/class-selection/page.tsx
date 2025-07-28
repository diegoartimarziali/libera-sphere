

"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { useToast } from "@/hooks/use-toast"
import { PersonalDataForm, type PersonalDataSchemaType } from "@/components/dashboard/PersonalDataForm"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { format } from "date-fns"
import { it } from "date-fns/locale"
import { CreditCard, Landmark, ArrowLeft, CheckCircle } from "lucide-react"
import { auth, db } from "@/lib/firebase"
import { useAuthState } from "react-firebase-hooks/auth"
import { doc, updateDoc } from "firebase/firestore"
import { Loader2 } from "lucide-react"


type PaymentMethod = "in_person" | "online"

// Componente per visualizzare i dati in modo pulito
const DataRow = ({ label, value }: { label: string; value?: string | null }) => (
    value ? (
        <div className="flex flex-col sm:flex-row sm:justify-between">
            <dt className="font-medium text-muted-foreground">{label}</dt>
            <dd className="mt-1 text-foreground sm:mt-0">{value}</dd>
        </div>
    ) : null
);

// Componente per lo Step 2: Pagamento
function PaymentStep({ 
    onBack, 
    onNext 
}: { 
    onBack: () => void, 
    onNext: (method: PaymentMethod) => void 
}) {
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null)

    return (
        <Card>
            <CardHeader>
                <CardTitle>Passo 2: Metodo di Pagamento</CardTitle>
                <CardDescription>
                    Scegli come preferisci pagare la quota di iscrizione di 30€.
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
                                Potrai saldare la quota di 30€ direttamente presso la nostra sede prima dell'inizio delle lezioni.
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
                                Paga in modo sicuro e veloce la quota di 30€ con la tua carta tramite SumUp.
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

// Componente per lo Step 3: Pagamento Online con iFrame
function OnlinePaymentStep({ 
    onBack, 
    onNext 
}: { 
    onBack: () => void, 
    onNext: () => void 
}) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Passo 3: Pagamento Online</CardTitle>
                <CardDescription>
                    Completa il pagamento di 30€ tramite il portale sicuro di SumUp qui sotto. Una volta terminato, clicca sul pulsante per procedere.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                 <div className="aspect-video w-full">
                    <iframe 
                        src="https://pay.sumup.com/b2c/Q25VI0NJ" 
                        className="h-full w-full rounded-md border"
                        title="Pagamento SumUp"
                    ></iframe>
                </div>
                 <p className="text-sm text-muted-foreground">
                    Se hai problemi a visualizzare il modulo, puoi aprirlo in una nuova scheda <a href="https://pay.sumup.com/b2c/Q25VI0NJ" target="_blank" rel="noopener noreferrer" className="underline">cliccando qui</a>.
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


// Componente per lo Step 4: Riepilogo e Conferma
function ConfirmationStep({ 
    formData,
    paymentMethod,
    onBack, 
    onComplete,
    isSubmitting
}: { 
    formData: PersonalDataSchemaType,
    paymentMethod: PaymentMethod,
    onBack: () => void, 
    onComplete: () => void,
    isSubmitting: boolean
}) {
    const [isConfirmed, setIsConfirmed] = useState(false);

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
                    <h3 className="font-semibold text-lg">Metodo di Pagamento</h3>
                    <dl className="space-y-2">
                       <DataRow 
                          label="Metodo Scelto" 
                          value={paymentMethod === 'in_person' ? 'In Palestra' : 'Online con Carta'} 
                       />
                       <DataRow 
                          label={paymentMethod === 'in_person' ? "Importo da Pagare" : "Importo"}
                          value={paymentMethod === 'in_person' ? "30,00 €" : "30,00 € (In attesa di conferma)"}
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
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null)
    const { toast } = useToast()
    const router = useRouter()
    const [user] = useAuthState(auth);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleNextStep1 = (data: PersonalDataSchemaType) => {
        setFormData(data)
        setStep(2)
    }

    const handleNextStep2 = (method: PaymentMethod) => {
        setPaymentMethod(method)
        if (method === 'online') {
            setStep(3); // Vai allo step dell'iFrame
        } else {
            setStep(4); // Vai direttamente al riepilogo
        }
    }

    const handleNextStep3 = () => {
        setStep(4); // Dal pagamento online, vai al riepilogo
    }
    
    const handleComplete = async () => {
        if (!user || !paymentMethod || !formData) {
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
                paymentMethod: paymentMethod,
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
        if (step === 4 && paymentMethod === 'online') {
            setStep(3); // Se vengo dal pagamento online, torno lì
        } else if (step === 4 && paymentMethod === 'in_person') {
            setStep(2); // Se ho scelto in persona, torno alla scelta del pagamento
        }
        else {
            setStep(prev => prev - 1);
        }
    }

    const handleBackFromPayment = () => {
         setStep(2); // Torna sempre alla selezione metodo di pagamento
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
                        buttonText="Prosegui"
                        onFormSubmit={handleNextStep1}
                    />
                )}
                {step === 2 && (
                    <PaymentStep
                        onBack={() => setStep(1)}
                        onNext={handleNextStep2}
                    />
                )}
                {step === 3 && paymentMethod === 'online' && (
                    <OnlinePaymentStep
                        onBack={handleBackFromPayment}
                        onNext={handleNextStep3}
                    />
                )}
                {step === 4 && formData && paymentMethod && (
                    <ConfirmationStep 
                        formData={formData}
                        paymentMethod={paymentMethod}
                        onBack={handleBack} 
                        onComplete={handleComplete} 
                        isSubmitting={isSubmitting}
                    />
                )}
            </div>
        </div>
    )
}

    