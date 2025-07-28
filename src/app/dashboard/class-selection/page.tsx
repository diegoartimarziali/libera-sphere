
"use client"

import { useState } from "react"
import { z } from "zod"

import { useToast } from "@/hooks/use-toast"
import { PersonalDataForm, type PersonalDataSchemaType } from "@/components/dashboard/PersonalDataForm"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

// Componente per lo Step 2
function HealthStep({ onBack, onComplete }: { onBack: () => void, onComplete: () => void }) {
    // Logica per il caricamento del certificato e pagamento andrà qui
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>Passo 2: Certificato Medico e Pagamento</CardTitle>
                <CardDescription>
                    Carica il tuo certificato medico e completa l'iscrizione.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex h-48 items-center justify-center rounded-lg border-2 border-dashed">
                     <p className="text-muted-foreground">
                        Work in Progress: Modulo di upload e pagamento.
                    </p>
                </div>
            </CardContent>
            <CardFooter className="justify-between">
                <Button variant="outline" onClick={onBack}>Indietro</Button>
                <Button onClick={onComplete}>Completa Iscrizione</Button>
            </CardFooter>
        </Card>
    )
}


export default function ClassSelectionPage() {
    const [step, setStep] = useState(1)
    const [formData, setFormData] = useState({})
    const { toast } = useToast()

    const handleNextStep1 = (data: PersonalDataSchemaType) => {
        setFormData(prev => ({ ...prev, ...data }))
        setStep(2)
    }
    
    const handleComplete = () => {
        // Qui andrà la logica finale, es. reindirizzamento
        toast({ title: "Iscrizione Completata!", description: "Benvenuto nel Passaporto Selezioni."});
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
                {step === 2 && <HealthStep onBack={handleBack} onComplete={handleComplete} />}
            </div>
        </div>
    )
}
