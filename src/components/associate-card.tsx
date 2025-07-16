
"use client"

import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
  } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "./ui/use-toast"
import { format } from "date-fns"
  
export function AssociateCard({ setAssociated }: { setAssociated?: (value: boolean) => void }) {
    const { toast } = useToast();

    const handleAssociation = () => {
        const associationDate = format(new Date(), "dd/MM/yyyy");
        // In a real app, this would trigger a request to the backend.
        // For this prototype, we'll set a state in localStorage to indicate a request has been made.
        if (typeof window !== 'undefined') {
            localStorage.setItem('associationRequested', 'true');
            localStorage.setItem('associationRequestDate', associationDate);
        }
        
        toast({
            title: "Domanda Inviata!",
            description: `La tua domanda di associazione è stata inviata il ${associationDate}. Riceverai una notifica quando verrà approvata.`,
        });

        // We don't call setAssociated(true) here anymore, as it depends on manual approval.
        // We can refresh the component state if needed, but for now a toast is enough.
    }

    return (
        <Card className="h-full flex flex-col">
            <CardHeader>
                <CardTitle>Associati</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow">
                <p className="text-sm text-muted-foreground">
                    Far parte della nostra associazione no profit non significa semplicemente iscriversi a un corso di Arti Marziali. Significa intraprendere un percorso di crescita condiviso, dove l'allenamento fisico è solo una parte di un'esperienza molto più ricca e profonda.
                    <br /><br />
                    Siamo una associazione senza scopo di lucro, nata dalla profonda passione per le arti marziali e dalla volontà di condividerne i valori autentici. Ogni aspetto della nostra gestione è guidato da principi di trasparenza e dedizione, tutti i ricavi derivanti dai contributi associativi vengono interamente reinvestiti in Didattica, Formazione, Aggiornamento e progetti di utilità sociale.
                </p>
            </CardContent>
            <CardFooter className="flex flex-col items-end gap-2">
                <Button onClick={handleAssociation}>Fai Domanda di Associazione</Button>
            </CardFooter>
        </Card>
    )
}
