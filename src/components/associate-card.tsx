
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
import { AlertTriangle, Loader2 } from "lucide-react"
import { doc, updateDoc } from "firebase/firestore"
import { db, auth } from "@/lib/firebase"


const translatePaymentMethod = (method: string | null) => {
    if (!method) return 'Non specificato';
    switch (method) {
        case 'online': return 'Carta di Credito on line';
        case 'bank': return 'Bonifico Bancario';
        case 'cash': return 'Contanti o Bancomat in Palestra (+ 2 € costi di gestione)';
        default: return method;
    }
}
  
export function AssociateCard({ setAssociated, setAssociationRequested, setWantsToEdit, userData: initialUserData }: { setAssociated?: (value: boolean) => void, setAssociationRequested?: (value: boolean) => void, setWantsToEdit?: (value: boolean) => void, userData?: any }) {
    const { toast } = useToast();
    const router = useRouter();
    const [dataConfirmed, setDataConfirmed] = useState(false);
    const [userData, setUserData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        setUserData(initialUserData);
    }, [initialUserData]);


    const handleAssociation = async () => {
        setIsLoading(true);
        const user = auth.currentUser;
        if (!user) {
            toast({ title: "Errore", description: "Utente non trovato.", variant: "destructive" });
            setIsLoading(false);
            return;
        }

        const associationDate = format(new Date(), "dd/MM/yyyy");
        try {
            const userDocRef = doc(db, "users", user.uid);
            await updateDoc(userDocRef, {
                associationStatus: 'approved', // Or 'requested' if there's an approval flow
                associationApprovalDate: associationDate, // Assuming direct approval for now
                isInsured: true,
            });

            if (setAssociationRequested) {
                setAssociationRequested(false);
            }
             if (setAssociated) {
                setAssociated(true);
            }
            
            toast({
                title: "Domanda Inviata!",
                description: `La tua domanda di associazione è stata inviata il ${associationDate}.`,
            });
            
            window.location.href = '/dashboard';

        } catch (error) {
             toast({
                title: "Errore",
                description: "Impossibile salvare la domanda di associazione.",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    }

    if (!userData) {
        return (
            <Card>
                <CardHeader><CardTitle>Caricamento...</CardTitle></CardHeader>
                <CardContent><Loader2 className="animate-spin" /></CardContent>
            </Card>
        );
    }

    return (
        <Card className="h-full flex flex-col">
            <CardHeader>
                <CardTitle>Conferma i tuoi dati e Associati</CardTitle>
                <CardDescription>
                    Verifica che i tuoi dati siano corretti.
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
                        {!userData.isMinor && <p className="text-muted-foreground"><b>Telefono:</b> <span className="text-foreground font-bold">{userData.phone || 'Non specificato'}</span></p>}
                    </div>

                    {userData.isMinor && (
                        <div>
                            <Separator className="my-4" />
                            <div className="space-y-3 text-base">
                                <h4 className="font-semibold text-lg mb-2 text-foreground">Dati Genitore/Tutore</h4>
                                <p className="text-muted-foreground"><b>Nome e Cognome:</b> <span className="text-foreground font-bold">{userData.parentName || 'Non specificato'}</span></p>
                                <p className="text-muted-foreground"><b>Codice Fiscale:</b> <span className="text-foreground font-bold">{userData.parentCf || 'Non specificato'}</span></p>
                                <p className="text-muted-foreground"><b>Telefono:</b> <span className="text-foreground font-bold">{userData.parentPhone || 'Non specificato'}</span></p>
                            </div>
                        </div>
                    )}
                </div>
                <Separator />
                <div className="space-y-2">
                    <h4 className="font-semibold text-lg text-foreground">Metodo di Pagamento Scelto</h4>
                    <p className="text-muted-foreground"><b>Metodo:</b> <span className="text-foreground font-bold">{translatePaymentMethod(userData.paymentMethod)}</span></p>
                    <p className="text-muted-foreground"><b>Importo:</b> <span className="text-foreground font-bold">€ {userData.paymentAmount}</span></p>
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
                    <Button onClick={handleAssociation} disabled={!dataConfirmed || isLoading}>
                        {isLoading ? <Loader2 className="animate-spin" /> : "Procedi"}
                    </Button>
                </div>
            </CardFooter>
        </Card>
    )
}
