
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
import { AlertTriangle, ArrowLeft, Copy, Loader2, CheckCircle } from "lucide-react"
import { doc, updateDoc } from "firebase/firestore"
import { db, auth } from "@/lib/firebase"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./ui/alert-dialog"
import { Alert } from "./ui/alert"

const SUMUP_ASSOCIATION_LINK = 'https://pay.sumup.com/b2c/QT5P5G2T';

export function AssociateCard({ initialData, onBack }: { initialData: any, onBack: () => void }) {
    const { toast } = useToast();
    const router = useRouter();
    
    const [paymentMethod, setPaymentMethod] = useState<string | undefined>();
    const [paymentActionTaken, setPaymentActionTaken] = useState(false);
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

    const handlePaymentAction = () => {
        if (!paymentMethod) {
            toast({ title: "Attenzione", description: "Seleziona un metodo di pagamento.", variant: "destructive" });
            return;
        }

        if (paymentMethod === 'online') {
            const paymentUrl = encodeURIComponent(SUMUP_ASSOCIATION_LINK);
            // After payment, user will be redirected back here to finalize submission
            const returnUrl = encodeURIComponent('/dashboard/associates');
            setPaymentActionTaken(true); // Assume they will attempt payment
            router.push(`/dashboard/payment-gateway?url=${paymentUrl}&returnTo=${returnUrl}`);
        } else if (paymentMethod === 'bank') {
            setShowBankTransferDialog(true);
            setPaymentActionTaken(true);
        } else if (paymentMethod === 'cash') {
            setPaymentActionTaken(true);
            toast({
                title: "Metodo di Pagamento Selezionato",
                description: "Hai scelto di pagare in contanti. Clicca su 'Invia Domanda' per completare.",
            });
        }
    }


    const handleFinalSubmit = async () => {
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

            toast({
                title: "Domanda Inviata!",
                description: "La tua richiesta di associazione è stata registrata con successo.",
            });
            router.push('/dashboard');

        } catch (error) {
            console.error("Error submitting association:", error);
            toast({ title: "Errore", description: "Impossibile inviare la domanda.", variant: "destructive" });
            setIsLoading(false);
        }
    }

    const handleConfirmBankTransfer = () => {
      setShowBankTransferDialog(false);
      toast({
          title: "Istruzioni Bonifico",
          description: "Effettua il bonifico e poi clicca su 'Invia Domanda' per completare.",
      });
    };

    if (!initialData) {
        return (
            <Card>
                <CardHeader><CardTitle>Caricamento...</CardTitle></CardHeader>
                <CardContent><Loader2 className="animate-spin" /></CardContent>
            </Card>
        );
    }

    return (
        <>
        <Card className="h-full flex flex-col">
            <CardHeader>
                <CardTitle>Riepilogo Domanda di Associazione</CardTitle>
                <CardDescription>
                   Verifica che i tuoi dati siano corretti. Se lo sono, scegli un metodo di pagamento e invia la tua domanda.
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
                
                <Separator />

                <div className="space-y-4">
                    <div>
                        <Label htmlFor="payment-method" className="font-semibold text-lg">1. Scegli un Metodo di Pagamento</Label>
                        <Select onValueChange={setPaymentMethod} value={paymentMethod} disabled={paymentActionTaken}>
                            <SelectTrigger id="payment-method" className="mt-2">
                                <SelectValue placeholder="Seleziona un'opzione" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="online">Carta di Credito on line</SelectItem>
                                <SelectItem value="bank">Bonifico Bancario</SelectItem>
                                <SelectItem value="cash">Contanti o Bancomat in Palestra</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                     <Button onClick={handlePaymentAction} disabled={!paymentMethod || paymentActionTaken} className="w-full">
                        2. Procedi al Pagamento
                    </Button>
                </div>

                {paymentActionTaken && (
                     <Alert variant="default" className="border-green-500 text-green-800 [&>svg]:text-green-800">
                        <CheckCircle className="h-4 w-4" />
                        <CardTitle>Pronto per l'invio</CardTitle>
                        <CardDescription>
                            Ora puoi inviare la tua domanda di associazione.
                        </CardDescription>
                    </Alert>
                )}

            </CardContent>
            <CardFooter className="flex-col items-stretch space-y-4">
                <Button onClick={handleFinalSubmit} disabled={!paymentActionTaken || isLoading} className="w-full">
                    {isLoading ? <Loader2 className="animate-spin" /> : "3. Invia Domanda di Associazione"}
                </Button>
                 <Button variant="outline" onClick={onBack} disabled={isLoading}>
                   <ArrowLeft className="mr-2 h-4 w-4"/> Modifica Dati
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
