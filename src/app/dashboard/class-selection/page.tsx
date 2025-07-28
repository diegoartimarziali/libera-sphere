
"use client"

import { useState } from "react"

import { useToast } from "@/hooks/use-toast"
import { PersonalDataForm, type PersonalDataSchemaType } from "@/components/dashboard/PersonalDataForm"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { format } from "date-fns"
import { it } from "date-fns/locale"

// Componente per visualizzare i dati in modo pulito
const DataRow = ({ label, value }: { label: string; value?: string | null }) => (
    value ? (
        <div className="flex flex-col sm:flex-row sm:justify-between">
            <dt className="font-medium text-muted-foreground">{label}</dt>
            <dd className="mt-1 text-foreground sm:mt-0">{value}</dd>
        </div>
    ) : null
);

// Componente per lo Step 2: Riepilogo e Conferma
function ConfirmationStep({ 
    formData,
    onBack, 
    onComplete 
}: { 
    formData: PersonalDataSchemaType,
    onBack: () => void, 
    onComplete: () => void 
}) {
    const [isConfirmed, setIsConfirmed] = useState(false);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Passo 2: Riepilogo e Conferma Dati</CardTitle>
                <CardDescription>
                    Controlla attentamente i dati che hai inserito. Se tutto è corretto,
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
                           <DataRow label="Codice Fiscale" value={formData.parentData.parentTaxCode} />
                        </dl>
                    </div>
                )}
                
                <div className="flex items-center space-x-2 pt-4">
                    <Checkbox id="confirm-data" checked={isConfirmed} onCheckedChange={(checked) => setIsConfirmed(checked as boolean)} />
                    <Label htmlFor="confirm-data" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Dichiaro che i dati inseriti sono corretti.
                    </Label>
                </div>

            </CardContent>
            <CardFooter className="justify-between">
                <Button variant="outline" onClick={onBack}>Indietro</Button>
                <Button onClick={onComplete} disabled={!isConfirmed}>Completa Iscrizione</Button>
            </CardFooter>
        </Card>
    )
}


export default function ClassSelectionPage() {
    const [step, setStep] = useState(1)
    const [formData, setFormData] = useState<PersonalDataSchemaType | null>(null)
    const { toast } = useToast()

    const handleNextStep1 = (data: PersonalDataSchemaType) => {
        setFormData(data)
        setStep(2)
    }
    
    const handleComplete = () => {
        // Qui andrà la logica finale, es. salvataggio iscrizione e reindirizzamento
        console.log("Iscrizione completata con i seguenti dati:", formData);
        toast({ title: "Iscrizione Completata!", description: "Benvenuto nel Passaporto Selezioni."});
        // router.push("/dashboard/some-success-page")
    }

    const handleBack = () => {
        setStep(prev => prev - 1)
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
                        buttonText="Prosegui al Passo 2"
                        onFormSubmit={handleNextStep1}
                    />
                )}
                {step === 2 && formData && (
                    <ConfirmationStep 
                        formData={formData}
                        onBack={handleBack} 
                        onComplete={handleComplete} 
                    />
                )}
            </div>
        </div>
    )
}
