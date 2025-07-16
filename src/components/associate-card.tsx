
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
  
export function AssociateCard({ setAssociated }: { setAssociated?: (value: boolean) => void }) {

    const handleAssociation = () => {
        if (setAssociated) {
            setAssociated(true);
        }
        if (typeof window !== 'undefined') {
            localStorage.setItem('associated', 'true');
        }
        // You might want to show a toast message here as well
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
