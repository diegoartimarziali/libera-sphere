
"use client"

import { PersonalDataForm, type PersonalDataSchemaType } from "@/components/dashboard/PersonalDataForm"
import { useToast } from "@/hooks/use-toast"


export default function AssociatesPage() {
    const { toast } = useToast()

    const handleAssociateSubmit = (data: PersonalDataSchemaType) => {
        console.log("Dati per associazione:", data)
        // Qui andrà la logica specifica per la richiesta di associazione
        toast({ title: "Richiesta Inviata", description: "La tua richiesta di associazione è stata inviata con successo." })
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
                 <PersonalDataForm
                    title="Verifica i tuoi Dati Anagrafici"
                    description="Assicurati che tutte le informazioni siano corrette prima di inviare la tua domanda di associazione."
                    buttonText="Invia Domanda di Associazione"
                    onFormSubmit={handleAssociateSubmit}
                />
            </div>
        </div>
    )
}
