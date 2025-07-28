
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { PersonalDataForm, type PersonalDataSchemaType } from "@/components/dashboard/PersonalDataForm"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { CreditCard, Landmark } from "lucide-react"

type PaymentMethod = "in_person" | "online"

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
                <CardTitle>Passo 2: Quota Associativa</CardTitle>
                <CardDescription>
                    Scegli come versare la quota associativa annuale di 50€.
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
                            <h4 className="font-semibold">In Sede (Contanti o Bancomat)</h4>
                            <p className="text-sm text-muted-foreground">
                                Potrai saldare la quota di 50€ direttamente presso la nostra sede.
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
                                Paga in modo sicuro e veloce la quota di 50€ con la tua carta tramite SumUp.
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

export default function AssociatesPage() {
    const [step, setStep] = useState(1)
    const [formData, setFormData] = useState<PersonalDataSchemaType | null>(null)
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null)

    const { toast } = useToast()
    const router = useRouter()

    const handleNextStep1 = (data: PersonalDataSchemaType) => {
        setFormData(data)
        setStep(2)
    }

    const handlePaymentSubmit = (method: PaymentMethod) => {
        setPaymentMethod(method)
        console.log("Dati per associazione:", formData)
        console.log("Metodo di pagamento:", method, "Quota: 50€")
        // Qui andrà la logica specifica per la richiesta di associazione
        toast({ title: "Richiesta Inviata", description: "La tua domanda di associazione è stata inviata con successo." })
        router.push("/dashboard")
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
            </div>
        </div>
    )
}
