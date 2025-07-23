
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
import { Checkbox } from "./ui/checkbox"
import { Label } from "./ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertTriangle } from "lucide-react"
  
export function AssociateCard({ setAssociated, setAssociationRequested, setWantsToEdit }: { setAssociated?: (value: boolean) => void, setAssociationRequested?: (value: boolean) => void, setWantsToEdit?: (value: boolean) => void }) {
    const { toast } = useToast();
    const router = useRouter();
    const [dataConfirmed, setDataConfirmed] = useState(false);
    const [hasMedicalCertificate, setHasMedicalCertificate] = useState(false);
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
    });

    const [parentData, setParentData] = useState({
        name: '',
        cf: '',
        phone: '',
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

            const certDate = localStorage.getItem('medicalCertificateExpirationDate');
            const certFile = localStorage.getItem('medicalCertificateFileName');
            if (certDate && certFile) {
                setHasMedicalCertificate(true);
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
            });

            if (isMinor) {
                 setParentData({
                    name: localStorage.getItem('parentName') || '',
                    cf: localStorage.getItem('parentCf') || '',
                    phone: localStorage.getItem('parentPhone') || '',
                });
            }
        }
    }, [isMinor]);

    const handleAssociation = () => {
        const associationDate = format(new Date(), "dd/MM/yyyy");
        if (typeof window !== 'undefined') {
            localStorage.setItem('associationRequested', 'true');
            localStorage.setItem('associationRequestDate', associationDate);
            localStorage.setItem('lessonSelected', 'true'); // Hide menu item
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
                    <div className="space-y-3 text-base">
                        <h4 className="font-semibold text-lg mb-2 text-foreground">Dati Allievo</h4>
                        <p className="text-muted-foreground"><b>Nome e Cognome:</b> <span className="text-foreground font-bold">{userData.name || 'Non specificato'}</span></p>
                        <p className="text-muted-foreground"><b>Nato il:</b> <span className="text-foreground font-bold">{userData.birthDate || 'Non specificata'}</span> <b>a:</b> <span className="text-foreground font-bold">{userData.birthplace || 'Non specificato'}</span></p>
                        <p className="text-muted-foreground"><b>Codice Fiscale:</b> <span className="text-foreground font-bold">{userData.codiceFiscale || 'Non specificato'}</span></p>
                        <p className="text-muted-foreground"><b>Residenza:</b> <span className="text-foreground font-bold">{`${userData.address || ''}, ${userData.civicNumber || ''} - ${userData.cap || ''} ${userData.comune || ''} (${userData.provincia || ''})` || 'Non specificata'}</span></p>
                        {!isMinor && <p className="text-muted-foreground"><b>Telefono:</b> <span className="text-foreground font-bold">{userData.phone || 'Non specificato'}</span></p>}
                    </div>

                    {isMinor && (
                        <div>
                            <Separator className="my-4" />
                            <div className="space-y-3 text-base">
                                <h4 className="font-semibold text-lg mb-2 text-foreground">Dati Genitore/Tutore</h4>
                                <p className="text-muted-foreground"><b>Nome e Cognome:</b> <span className="text-foreground font-bold">{parentData.name || 'Non specificato'}</span></p>
                                <p className="text-muted-foreground"><b>Codice Fiscale:</b> <span className="text-foreground font-bold">{parentData.cf || 'Non specificato'}</span></p>
                                <p className="text-muted-foreground"><b>Telefono:</b> <span className="text-foreground font-bold">{parentData.phone || 'Non specificato'}</span></p>
                            </div>
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
            <CardFooter className="flex flex-col items-start gap-4">
                 <div className="flex items-center space-x-2">
                    <Checkbox id="edit-data" onCheckedChange={(checked) => setWantsToEdit?.(!!checked)} />
                    <Label htmlFor="edit-data" className="text-sm font-normal text-muted-foreground">
                        Voglio modificare i dati.
                    </Label>
                </div>
                <div className="flex items-center space-x-2">
                    <Checkbox id="confirm-data" onCheckedChange={(checked) => setDataConfirmed(!!checked)} />
                    <Label htmlFor="confirm-data" className="text-sm font-normal text-muted-foreground">
                        Confermo che i dati riportati sono corretti e procedo con la domanda di associazione.
                    </Label>
                </div>
                <div className="self-end">
                    <Button onClick={handleAssociation} disabled={!dataConfirmed}>Procedi</Button>
                </div>
            </CardFooter>
        </Card>
    )
}
