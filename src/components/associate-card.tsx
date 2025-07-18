
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
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Separator } from "./ui/separator"
  
export function AssociateCard({ setAssociated, setAssociationRequested }: { setAssociated?: (value: boolean) => void, setAssociationRequested?: (value: boolean) => void }) {
    const { toast } = useToast();
    const router = useRouter();
    const [userData, setUserData] = useState({
        name: '',
        codiceFiscale: '',
        birthDate: '',
        address: '',
        comune: '',
        provincia: '',
    });

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setUserData({
                name: localStorage.getItem('userName') || '',
                codiceFiscale: localStorage.getItem('codiceFiscale') || '',
                birthDate: localStorage.getItem('birthDate') || '',
                address: localStorage.getItem('address') || '',
                comune: localStorage.getItem('comune') || '',
                provincia: localStorage.getItem('provincia') || '',
            });
        }
    }, []);

    const handleAssociation = () => {
        const associationDate = format(new Date(), "dd/MM/yyyy");
        if (typeof window !== 'undefined') {
            localStorage.setItem('associationRequested', 'true');
            localStorage.setItem('associationRequestDate', associationDate);
        }
        
        if (setAssociationRequested) {
            setAssociationRequested(true);
        }
        
        toast({
            title: "Domanda Inviata!",
            description: `La tua domanda di associazione è stata inviata il ${associationDate}. Riceverai una notifica quando verrà approvata.`,
        });

        router.push('/dashboard');
    }

    return (
        <Card className="h-full flex flex-col">
            <CardHeader>
                <CardTitle>Conferma i tuoi dati e Associati</CardTitle>
                <CardDescription>
                    Verifica che i tuoi dati siano corretti. Se devi modificarli, puoi farlo dalla tua scheda personale una volta approvata l'associazione.
                </CardDescription>
            </CardHeader>
            <CardContent className="flex-grow space-y-4">
                <div className="space-y-2 text-sm text-muted-foreground">
                    <p><b>Nome e Cognome:</b> {userData.name || 'Non specificato'}</p>
                    <p><b>Codice Fiscale:</b> {userData.codiceFiscale || 'Non specificato'}</p>
                    <p><b>Data di Nascita:</b> {userData.birthDate || 'Non specificata'}</p>
                    <p><b>Residenza:</b> {`${userData.address || ''}, ${userData.comune || ''} (${userData.provincia || ''})` || 'Non specificata'}</p>
                </div>
                <Separator />
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
