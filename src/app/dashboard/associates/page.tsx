
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { PersonalDataForm, type PersonalDataSchemaType } from "@/components/dashboard/PersonalDataForm"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { CreditCard, Landmark, ArrowLeft, CheckCircle, University } from "lucide-react"

type PaymentMethod = "in_person" | "online" | "bank_transfer"

// Componente per il Popup del Bonifico
function BankTransferDialog({ open, onOpenChange, onConfirm }: { open: boolean, onOpenChange: (open: boolean) => void, onConfirm: () => void }) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Dati per Bonifico Bancario</DialogTitle>
                    <DialogDescription>
                        Effettua un bonifico utilizzando i dati seguenti. Una volta eseguito, clicca su "Pagamento Effettuato".
                        La tua richiesta verrà approvata dopo la verifica della transazione.
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
                        <p>120,00 €</p>
                    </div>
                     <div className="space-y-1">
                        <p className="font-semibold text-foreground">Causale:</p>
                        <p className="font-mono bg-muted p-2 rounded-md">Quota Associativa [Nome Cognome Socio]</p>
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={onConfirm}>Ho effettuato il pagamento</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

// Componente per lo Step di Pagamento Online (iFrame)
function OnlinePaymentStep({ onBack, onNext }: { onBack: () => void; onNext: () => void }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Passo 3: Pagamento Online</CardTitle>
                <CardDescription>
                    Completa il pagamento di 120€ tramite il portale sicuro di SumUp qui sotto. Una volta terminato, clicca sul pulsante per procedere.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="aspect-video w-full">
                    <iframe
                        src="https://pay.sumup.com/b2c/Q9ZH35JE"
                        className="h-full w-full rounded-md border"
                        title="Pagamento SumUp Quota Associativa"
                    ></iframe>
                </div>
                <p className="text-sm text-muted-foreground">
                    Se hai problemi a visualizzare il modulo, puoi aprirlo in una nuova scheda <a href="https://pay.sumup.com/b2c/Q9ZH35JE" target="_blank" rel="noopener noreferrer" className="underline">cliccando qui</a>.
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
function PaymentStep({ onBack, onNext }: { onBack: () => void, onNext: (method: PaymentMethod) => void }) {
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null)

    return (
        <Card>
            <CardHeader>
                <CardTitle>Passo 2: Quota Associativa</CardTitle>
                <CardDescription>
                    Scegli come versare la quota associativa annuale di 120€.
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
                                Paga in modo sicuro e veloce la quota di 120€ con la tua carta tramite SumUp.
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
                                Si aprirà un popup con gli estremi per effettuare il bonifico di 120€. La richiesta sarà valida dopo la verifica.
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
                                Potrai saldare la quota di 120€ direttamente presso la nostra sede.
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

export default function AssociatesPage() {
    const [step, setStep] = useState(1)
    const [formData, setFormData] = useState<PersonalDataSchemaType | null>(null)
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null)
    const [isBankTransferDialogOpen, setIsBankTransferDialogOpen] = useState(false);


    const { toast } = useToast()
    const router = useRouter()

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
                // Per il pagamento in sede, andiamo direttamente alla fine.
                // Potremmo aggiungere uno step di riepilogo qui se necessario.
                submitApplication('in_person');
                break;
        }
    };
    
    const handleOnlinePaymentNext = () => {
        // L'utente ha cliccato "Ho effettuato il pagamento" dallo step dell'iframe
        submitApplication('online');
    }

    const handleBankTransferConfirm = () => {
        // L'utente ha confermato di aver effettuato il bonifico
        setIsBankTransferDialogOpen(false);
        submitApplication('bank_transfer');
    }

    const submitApplication = (finalPaymentMethod: PaymentMethod) => {
         console.log("Dati per associazione:", formData);
         console.log("Metodo di pagamento:", finalPaymentMethod, "Quota: 120€");
         // Qui andrà la logica specifica per la richiesta di associazione
         toast({ title: "Richiesta Inviata", description: "La tua domanda di associazione è stata inviata con successo." });
         router.push("/dashboard");
    }

    const handleBack = () => {
        setStep(prev => prev - 1);
    }

    return (
        <div className="flex w-full flex-col items-center">
            <div className="mb-8 text-center">
                <h1 className="text-3xl font-bold">Domanda di Associazione</h1>
                <p className="mt-2 text-muted-foreground">
                    Completa e verifica i tuoi dati per inviare la domanda.
                </p>
            </div>
            
            <div className="w-full max-w-3xl">
                {step === 1 && (
                    <PersonalDataForm
                        title="Inserisci i tuoi dati anagrafici"
                        description="Assicurati che tutte le informazioni siano corrette prima di inviare la tua domanda di associazione."
                        buttonText="Prosegui alla Scelta del Pagamento"
                        onFormSubmit={handleNextStep1}
                    />
                )}
                {step === 2 && (
                    <PaymentStep
                        onBack={() => setStep(1)}
                        onNext={handlePaymentSubmit}
                    />
                )}
                {step === 3 && paymentMethod === 'online' && (
                     <OnlinePaymentStep onBack={handleBack} onNext={handleOnlinePaymentNext} />
                )}
            </div>
            
            <BankTransferDialog 
                open={isBankTransferDialogOpen}
                onOpenChange={setIsBankTransferDialogOpen}
                onConfirm={handleBankTransferConfirm}
            />
        </div>
    )
}
