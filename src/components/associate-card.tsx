
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

  
export function AssociateCard({ setAssociated, setAssociationRequested, setWantsToEdit, userData: initialUserData }: { setAssociated?: (value: boolean) => void, setAssociationRequested?: (value: boolean) => void, setWantsToEdit?: (value: boolean) => void, userData?: any }) {
    const { toast } = useToast();
    const router = useRouter();
    const [dataConfirmed, setDataConfirmed] = useState(false);
    const [userData, setUserData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        setUserData(initialUserData);
    }, [initialUserData]);

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
                <CardTitle>Riepilogo Domanda di Associazione</CardTitle>
                <CardDescription>
                    Verifica che i tuoi dati siano corretti. Se lo sono, procedi con il pagamento per completare la tua domanda.
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
                <p className="text-sm text-muted-foreground">
                    Far parte della nostra associazione no profit non significa semplicemente iscriversi a un corso di Arti Marziali. Significa intraprendere un percorso di crescita condiviso, dove l'allenamento fisico è solo una parte di un'esperienza molto più ricca e profonda.
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
                        Confermo che i dati riportati sono corretti e procedo con il pagamento.
                    </Label>
                </div>
                <div className="self-end">
                    <Button disabled={!dataConfirmed || isLoading}>
                        {isLoading ? <Loader2 className="animate-spin" /> : "Procedi con il Pagamento"}
                    </Button>
                </div>
            </CardFooter>
        </Card>
    )
}
