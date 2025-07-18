
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
        birthplace: '',
        address: '',
        civicNumber: '',
        cap: '',
        comune: '',
        provincia: '',
        phone: '',
        email: '',
    });

    const [parentData, setParentData] = useState({
        name: '',
        cf: '',
        phone: '',
        email: '',
    });

    const [isMinor, setIsMinor] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const birthDateStr = localStorage.getItem('birthDate');
            if (birthDateStr) {
                const [day, month, year] = birthDateStr.split('/');
                const birthDateObj = new Date(parseInt(year!), parseInt(month!) - 1, parseInt(day!));
                const today = new Date();
                let age = today.getFullYear() - birthDateObj.getFullYear();
                const m = today.getMonth() - birthDateObj.getMonth();
                if (m < 0 || (m === 0 && today.getDate() < birthDateObj.getDate())) {
                    age--;
                }
                setIsMinor(age < 18);
            }

            setUserData({
                name: localStorage.getItem('userName') || '',
                codiceFiscale: localStorage.getItem('codiceFiscale') || '',
                birthDate: localStorage.getItem('birthDate') || '',
                birthplace: localStorage.getItem('birthplace') || '',
                address: localStorage.getItem('address') || '',
                civicNumber: localStorage.getItem('civicNumber') || '',
                cap: localStorage.getItem('cap') || '',
                comune: localStorage.getItem('comune') || '',
                provincia: localStorage.getItem('provincia') || '',
                phone: localStorage.getItem('phone') || '',
                email: localStorage.getItem('registrationEmail') || '',
            });

            if (isMinor) {
                 setParentData({
                    name: localStorage.getItem('parentName') || '',
                    cf: localStorage.getItem('parentCf') || '',
                    phone: localStorage.getItem('parentPhone') || '',
                    email: localStorage.getItem('parentEmail') || '',
                });
            }
        }
    }, [isMinor]);

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
                <div className="space-y-4 text-sm text-muted-foreground">
                    <div>
                        <h4 className="font-semibold text-base mb-2 text-foreground">Dati Allievo</h4>
                        <p><b>Nome e Cognome:</b> {userData.name || 'Non specificato'}</p>
                        <p><b>Nato/a il:</b> {userData.birthDate || 'Non specificata'} <b>a:</b> {userData.birthplace || 'Non specificato'}</p>
                        <p><b>Codice Fiscale:</b> {userData.codiceFiscale || 'Non specificato'}</p>
                        <p><b>Residenza:</b> {`${userData.address || ''}, ${userData.civicNumber || ''} - ${userData.cap || ''} ${userData.comune || ''} (${userData.provincia || ''})` || 'Non specificata'}</p>
                        {!isMinor && <p><b>Telefono:</b> {userData.phone || 'Non specificato'}</p>}
                        <p><b>Email:</b> {userData.email || 'Non specificata'}</p>
                    </div>

                    {isMinor && (
                        <div>
                            <Separator className="my-4" />
                            <h4 className="font-semibold text-base mb-2 text-foreground">Dati Genitore/Tutore</h4>
                            <p><b>Nome e Cognome:</b> {parentData.name || 'Non specificato'}</p>
                            <p><b>Codice Fiscale:</b> {parentData.cf || 'Non specificato'}</p>
                            <p><b>Telefono:</b> {parentData.phone || 'Non specificato'}</p>
                            <p><b>Email di contatto:</b> {parentData.email || 'Non specificata'}</p>
                        </div>
                    )}
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
