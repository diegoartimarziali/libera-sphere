
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
import { useState } from "react"
import { Separator } from "./ui/separator"
import { Checkbox } from "./ui/checkbox"
import { Label } from "./ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertTriangle, ArrowLeft, Copy, Loader2 } from "lucide-react"
import { doc, updateDoc } from "firebase/firestore"
import { db, auth } from "@/lib/firebase"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./ui/alert-dialog"

const SUMUP_ASSOCIATION_LINK = 'https://pay.sumup.com/b2c/QT5P5G2T';

export function AssociateCard({ initialData, onBack }: { initialData: any, onBack: () => void }) {
    const { toast } = useToast();
    const router = useRouter();
    
    const [paymentMethod, setPaymentMethod] = useState<string | undefined>();
    const [isLoading, setIsLoading] = useState(false);
    const [showBankTransferDialog, setShowBankTransferDialog] = useState(false);
    
    const bankDetails = {
      iban: "IT12A345B678C901D234E567F890",
      beneficiary: "Associazione Libera Energia ASD",
      cause: `Quota Associativa ${initialData.name}`
    }

    const copyToClipboard = (text: string) => {
      navigator.clipboard.writeText(text).then(() => {
          toast({ title: "Copiato!", description: "Dettagli bancari copiati negli appunti." });
      }, () => {
          toast({ title: "Errore", description: "Impossibile copiare i dettagli.", variant: "destructive" });
      });
    }

    const handleFinalSubmit = async () => {
        if (!paymentMethod) {
            toast({ title: "Attenzione", description: "Seleziona un metodo di pagamento.", variant: "destructive" });
            return;
        }

        setIsLoading(true);
        const user = auth.currentUser;
        if (!user) {
            toast({ title: "Errore", description: "Utente non autenticato", variant: "destructive" });
            setIsLoading(false);
            return;
        }
        
        const dataToUpdate = {
            ...initialData,
            paymentMethod,
            associationStatus: 'requested',
            associationRequestDate: format(new Date(), "dd/MM/yyyy"),
        };

        try {
            const userDocRef = doc(db, "users", user.uid);
            await updateDoc(userDocRef, dataToUpdate);

            if (paymentMethod === 'online') {
                const paymentUrl = encodeURIComponent(SUMUP_ASSOCIATION_LINK);
                const returnUrl = encodeURIComponent('/dashboard');
                router.push(`/dashboard/payment-gateway?url=${paymentUrl}&returnTo=${returnUrl}`);
                // Don't set loading to false, as we are navigating away
            } else if (paymentMethod === 'bank') {
                setShowBankTransferDialog(true);
            } else if (paymentMethod === 'cash') {
                 toast({
                    title: "Domanda Registrata!",
                    description: `Presentati in segreteria per completare il pagamento.`,
                 });
                 router.push('/dashboard');
            }

        } catch (error) {
            console.error("Error submitting association:", error);
            toast({ title: "Errore", description: "Impossibile inviare la domanda.", variant: "destructive" });
            setIsLoading(false);
        }
    }

    const handleConfirmBankTransfer = () => {
      setShowBankTransferDialog(false);
      toast({
          title: "Domanda Registrata!",
          description: "Effettua il bonifico usando i dati forniti. Vedrai lo stato aggiornato nella sezione pagamenti.",
      });
      router.push('/dashboard');
    };

    if (!initialData) {
        return (
            <Card>
                <CardHeader><CardTitle>Caricamento...</CardTitle></CardHeader>
                <CardContent><Loader2 className="animate-spin" /></CardContent>
            </Card>
        );
    }
    
    // Check if the user has ALREADY submitted. If so, show a read-only summary.
    const isAlreadySubmitted = initialData.associationStatus === 'requested' || initialData.associationStatus === 'approved';

    return (
        <>
        <Card className="h-full flex flex-col">
            <CardHeader>
                <CardTitle>Riepilogo Domanda di Associazione</CardTitle>
                <CardDescription>
                    Verifica che i tuoi dati siano corretti. {isAlreadySubmitted ? 'La tua domanda è stata inviata.' : 'Se lo sono, procedi con il pagamento per completare la tua domanda.'}
                </CardDescription>
            </CardHeader>
            <CardContent className="flex-grow space-y-4">
                <div className="space-y-4 text-sm text-muted-foreground">
                    <div className="space-y-3 text-base">
                        <h4 className="font-semibold text-lg mb-2 text-foreground">Dati Allievo</h4>
                        <p className="text-muted-foreground"><b>Nome e Cognome:</b> <span className="text-foreground font-bold">{initialData.name || 'Non specificato'}</span></p>
                        <p className="text-muted-foreground"><b>Nato il:</b> <span className="text-foreground font-bold">{initialData.birthDate || 'Non specificata'}</span> <b>a:</b> <span className="text-foreground font-bold">{initialData.birthplace || 'Non specificato'}</span></p>
                        <p className="text-muted-foreground"><b>Codice Fiscale:</b> <span className="text-foreground font-bold">{initialData.codiceFiscale || 'Non specificato'}</span></p>
                        <p className="text-muted-foreground"><b>Residenza:</b> <span className="text-foreground font-bold">{`${initialData.address || ''}, ${initialData.civicNumber || ''} - ${initialData.cap || ''} ${initialData.comune || ''} (${initialData.provincia || ''})` || 'Non specificata'}</span></p>
                        {!initialData.isMinor && <p className="text-muted-foreground"><b>Telefono:</b> <span className="text-foreground font-bold">{initialData.phone || 'Non specificato'}</span></p>}
                        <p className="text-muted-foreground"><b>Corso Scelto:</b> <span className="text-foreground font-bold capitalize">{initialData.martialArt || 'Non specificato'}</span></p>
                    </div>

                    {initialData.isMinor && (
                        <div>
                            <Separator className="my-4" />
                            <div className="space-y-3 text-base">
                                <h4 className="font-semibold text-lg mb-2 text-foreground">Dati Genitore/Tutore</h4>
                                <p className="text-muted-foreground"><b>Nome e Cognome:</b> <span className="text-foreground font-bold">{initialData.parentName || 'Non specificato'}</span></p>
                                <p className="text-muted-foreground"><b>Codice Fiscale:</b> <span className="text-foreground font-bold">{initialData.parentCf || 'Non specificato'}</span></p>
                                <p className="text-muted-foreground"><b>Telefono:</b> <span className="text-foreground font-bold">{initialData.parentPhone || 'Non specificato'}</span></p>
                            </div>
                        </div>
                    )}
                </div>
                
                {!isAlreadySubmitted && (
                    <>
                    <Separator />
                    <div className="space-y-2">
                        <Label htmlFor="payment-method" className="font-semibold">Metodo di Pagamento</Label>
                        <Select onValueChange={setPaymentMethod} value={paymentMethod}>
                            <SelectTrigger id="payment-method">
                                <SelectValue placeholder="Seleziona un'opzione" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="online">Carta di Credito on line</SelectItem>
                                <SelectItem value="bank">Bonifico Bancario</SelectItem>
                                <SelectItem value="cash">Contanti o Bancomat in Palestra</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    </>
                )}

            </CardContent>
            <CardFooter className="flex justify-between items-center">
                <Button variant="outline" onClick={onBack} disabled={isAlreadySubmitted}>
                   <ArrowLeft className="mr-2 h-4 w-4"/> Modifica Dati
                </Button>
                <Button onClick={handleFinalSubmit} disabled={isAlreadySubmitted || !paymentMethod || isLoading}>
                    {isLoading ? <Loader2 className="animate-spin" /> : "Conferma e Invia Domanda"}
                </Button>
            </CardFooter>
        </Card>
        
        <AlertDialog open={showBankTransferDialog} onOpenChange={setShowBankTransferDialog}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Dati per Bonifico Bancario</AlertDialogTitle>
                    <AlertDialogDescription>
                        Effettua il bonifico utilizzando i dati seguenti. La tua iscrizione verrà confermata alla ricezione del pagamento.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="space-y-4 my-4">
                    <div className="space-y-1">
                        <Label className="text-muted-foreground">Beneficiario</Label>
                        <div className="flex items-center justify-between rounded-md border bg-muted p-2">
                            <span className="font-mono text-sm">{bankDetails.beneficiary}</span>
                            <Button variant="ghost" size="icon" onClick={() => copyToClipboard(bankDetails.beneficiary)}>
                                <Copy className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                     <div className="space-y-1">
                        <Label className="text-muted-foreground">IBAN</Label>
                        <div className="flex items-center justify-between rounded-md border bg-muted p-2">
                            <span className="font-mono text-sm">{bankDetails.iban}</span>
                             <Button variant="ghost" size="icon" onClick={() => copyToClipboard(bankDetails.iban)}>
                                <Copy className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                     <div className="space-y-1">
                        <Label className="text-muted-foreground">Importo</Label>
                         <div className="flex items-center justify-between rounded-md border bg-muted p-2">
                            <span className="font-mono text-sm">€ 50</span>
                             <Button variant="ghost" size="icon" onClick={() => copyToClipboard("50")}>
                                <Copy className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                     <div className="space-y-1">
                        <Label className="text-muted-foreground">Causale</Label>
                        <div className="flex items-center justify-between rounded-md border bg-muted p-2">
                            <span className="font-mono text-sm">{bankDetails.cause}</span>
                             <Button variant="ghost" size="icon" onClick={() => copyToClipboard(bankDetails.cause)}>
                                <Copy className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
                <AlertDialogFooter>
                    <AlertDialogAction onClick={handleConfirmBankTransfer}>Ho capito, procedi</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
        </>
    )
}
