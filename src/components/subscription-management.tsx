
"use client"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { CheckCircle, AlertTriangle, Copy } from "lucide-react"
import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Separator } from "./ui/separator"
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useToast } from "./ui/use-toast"
import { useRouter } from "next/navigation"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { format } from "date-fns"
import { it } from "date-fns/locale"

const plans = [
    { id: "stagionale", name: "Stagionale", price: "440", period: "stagione", features: ["Accesso a tutte le palestre", "Corsi illimitati", "Paga in un'unica soluzione.", "Un mese gratis"], expiry: "L'Abbonamento Stagionale può essere acquistato dal 01/07 al 15/10" },
    { id: "mensile", name: "Mensile", price: "55", period: "mese", features: ["Accesso a tutte le palestre", "Corsi illimitati"] },
]

const seasonalPaymentOptions = [
    { id: "online", label: "Carta di Credito on line" },
    { id: "bank", label: "Bonifico Bancario" },
    { id: "cash", label: "Contanti o Bancomat in Palestra" },
]

const monthlyPaymentOptions = [
    { id: "online", label: "Carta di Credito on line" },
    { id: "cash", label: "Contanti o Bancomat in Palestra ( 2 euro costi di gestione)" },
]

const months = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: it.localize?.month(i, { width: 'wide' }),
}));

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 5 }, (_, i) => String(currentYear + i));

const SUMUP_SEASONAL_LINK = 'https://pay.sumup.com/b2c/QG1CK6T0';


export function SubscriptionManagement() {
  const { toast } = useToast();
  const router = useRouter();
  const [isStagionaleAvailable, setIsStagionaleAvailable] = useState(false);
  const [hasMedicalCertificate, setHasMedicalCertificate] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | undefined>();
  const [paymentMethod, setPaymentMethod] = useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showBankTransferDialog, setShowBankTransferDialog] = useState(false);
  const [userName, setUserName] = useState('');
  
  const [bookedAppointmentDate, setBookedAppointmentDate] = useState<Date | null>(null);
  const [appointmentDay, setAppointmentDay] = useState<string | undefined>();
  const [appointmentMonth, setAppointmentMonth] = useState<string | undefined>();
  const [appointmentYear, setAppointmentYear] = useState<string | undefined>();

  const bankDetails = {
      iban: "IT12A345B678C901D234E567F890",
      beneficiary: "Associazione Libera Energia ASD",
      cause: `Abbonamento Stagionale ${userName}`
  }

  const copyToClipboard = (text: string) => {
      navigator.clipboard.writeText(text).then(() => {
          toast({ title: "Copiato!", description: "Dettagli bancari copiati negli appunti." });
      }, (err) => {
          toast({ title: "Errore", description: "Impossibile copiare i dettagli.", variant: "destructive" });
      });
  }

  useEffect(() => {
    if(typeof window !== 'undefined'){
      // Check for medical certificate
      const certDate = localStorage.getItem('medicalCertificateExpirationDate');
      const certFile = localStorage.getItem('medicalCertificateFileName');
      if (certDate && certFile) {
          setHasMedicalCertificate(true);
      }

      // Check for booked appointment date
      const appointmentDateStr = localStorage.getItem('medicalAppointmentDate');
      if (appointmentDateStr) {
          setBookedAppointmentDate(new Date(appointmentDateStr));
      }

      setUserName(localStorage.getItem('userName') || '');

      // Check for seasonal plan availability
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Normalize to the start of the day
      const currentYear = today.getFullYear();
      
      const startDate = new Date(currentYear, 6, 1); // July 1st
      const endDate = new Date(currentYear, 9, 15); // October 15th
      
      const isAvailable = today >= startDate && today <= endDate;
      setIsStagionaleAvailable(isAvailable);
      
      if (isAvailable) {
          setSelectedPlan("stagionale");
      } else {
          setSelectedPlan("mensile");
      }
    }
  }, []);

  const handlePlanChange = (planId: string) => {
    setSelectedPlan(planId);
    setPaymentMethod(undefined); // Reset payment method when plan changes
  }

  const handleSaveAppointmentDate = () => {
      if (appointmentDay && appointmentMonth && appointmentYear) {
          const date = new Date(parseInt(appointmentYear), parseInt(appointmentMonth) - 1, parseInt(appointmentDay));
          if (date.getFullYear() === parseInt(appointmentYear) && date.getMonth() === parseInt(appointmentMonth) - 1 && date.getDate() === parseInt(appointmentDay)) {
              localStorage.setItem('medicalAppointmentDate', date.toISOString());
              setBookedAppointmentDate(date);
              toast({
                  title: "Data salvata!",
                  description: "Hai sbloccato temporaneamente i piani di abbonamento. Ricorda di caricare il certificato appena possibile."
              });
          } else {
               toast({
                  title: "Data non valida",
                  description: "Per favore inserisci una data corretta.",
                  variant: "destructive"
              });
          }
      }
  };

  const saveDataAndRedirect = async () => {
      const userEmail = localStorage.getItem('registrationEmail');
      const selectedPlanDetails = plans.find(p => p.id === selectedPlan);

      if (!userEmail || !selectedPlanDetails || !paymentMethod) return;

      try {
           await addDoc(collection(db, "subscriptions"), {
              userEmail: userEmail,
              planId: selectedPlanDetails.id,
              planName: selectedPlanDetails.name,
              price: selectedPlanDetails.price,
              paymentMethod: paymentMethod,
              status: 'In attesa',
              subscriptionDate: serverTimestamp()
          });

          if (typeof window !== 'undefined') {
              localStorage.setItem('subscriptionPlan', selectedPlanDetails.id);
              localStorage.setItem('paymentMethod', paymentMethod);
          }
          
          router.push('/dashboard/payments');

      } catch (error) {
           console.error("Error adding document: ", error);
          toast({
              title: "Errore nel salvataggio",
              description: "Non è stato possibile registrare il tuo abbonamento. Riprova più tardi.",
              variant: "destructive",
          });
      }
  }

  const handleSubscription = async () => {
    if (!selectedPlan || !paymentMethod) return;

    setIsSubmitting(true);
    
    if (paymentMethod === 'online') {
        const paymentUrl = encodeURIComponent(SUMUP_SEASONAL_LINK);
        const returnUrl = encodeURIComponent('/dashboard/payments');
        router.push(`/dashboard/payment-gateway?url=${paymentUrl}&returnTo=${returnUrl}`);
    } else if (paymentMethod === 'bank') {
        setShowBankTransferDialog(true);
    } else if (paymentMethod === 'cash') {
         toast({
            title: "Iscrizione registrata!",
            description: `Presentati in segreteria per completare il pagamento.`,
         });
         await saveDataAndRedirect();
    }
    
    setIsSubmitting(false);
  }

  const handleConfirmBankTransfer = async () => {
      setShowBankTransferDialog(false);
      toast({
          title: "Iscrizione registrata!",
          description: "Effettua il bonifico usando i dati forniti. Vedrai lo stato aggiornato nella sezione pagamenti.",
      });
      await saveDataAndRedirect();
  };

  const renderPaymentOptions = (planId: string) => {
    if (planId === 'stagionale') {
      return (
        <Select onValueChange={setPaymentMethod} value={paymentMethod}>
            <SelectTrigger id="seasonal-payment">
                <SelectValue placeholder="Scegli un metodo" />
            </SelectTrigger>
            <SelectContent>
                {seasonalPaymentOptions.map(option => (
                    <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>
                ))}
            </SelectContent>
        </Select>
      );
    }

    if (planId === 'mensile') {
        return (
          <Select onValueChange={setPaymentMethod} value={paymentMethod}>
              <SelectTrigger id="monthly-payment">
                  <SelectValue placeholder="Scegli un metodo" />
              </SelectTrigger>
              <SelectContent>
                  {monthlyPaymentOptions.map(option => (
                      <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>
                  ))}
              </SelectContent>
          </Select>
        );
    }
    return null;
  }
  
  const canSubscribe = hasMedicalCertificate || !!bookedAppointmentDate;

  return (
    <>
    <Card>
      <CardHeader>
        <CardTitle>Piano di Abbonamento</CardTitle>
        <CardDescription>
          Scegli il piano giusto per te.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!hasMedicalCertificate && (
            <>
            <Alert variant="destructive" className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Attenzione</AlertTitle>
                <AlertDescription>
                    Per poter partecipare ai corsi è necessario essere in possesso di certificato medico non agonistico in corso di validità. Prenota subito la tua visita o carica il certificato.
                </AlertDescription>
            </Alert>
            
            {!bookedAppointmentDate && (
                <Card className="bg-muted/40 border-dashed mb-4">
                    <CardHeader>
                        <CardTitle className="text-base">Non hai ancora il certificato?</CardTitle>
                        <CardDescription>
                            Se hai già prenotato la visita medica, inserisci qui la data per sbloccare temporaneamente la scelta del piano.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Label>Data della visita prenotata</Label>
                        <div className="grid grid-cols-[1fr_1.5fr_1fr] gap-2">
                            <Select onValueChange={setAppointmentDay} value={appointmentDay}>
                                <SelectTrigger><SelectValue placeholder="Giorno" /></SelectTrigger>
                                <SelectContent>
                                    {Array.from({ length: 31 }, (_, i) => String(i + 1)).map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <Select onValueChange={setAppointmentMonth} value={appointmentMonth}>
                                <SelectTrigger><SelectValue placeholder="Mese" /></SelectTrigger>
                                <SelectContent>
                                    {months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <Select onValueChange={setAppointmentYear} value={appointmentYear}>
                                <SelectTrigger><SelectValue placeholder="Anno" /></SelectTrigger>
                                <SelectContent>
                                    {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                    <CardFooter>
                         <Button onClick={handleSaveAppointmentDate} disabled={!appointmentDay || !appointmentMonth || !appointmentYear}>
                            Sblocca Piani
                        </Button>
                    </CardFooter>
                </Card>
            )}

             {bookedAppointmentDate && (
                 <Alert className="mb-4 border-blue-500 text-blue-800 [&>svg]:text-blue-800">
                    <CheckCircle className="h-4 w-4" />
                    <AlertTitle>Visita Prenotata</AlertTitle>
                    <AlertDescription>
                        Hai inserito la data della visita per il <b>{format(bookedAppointmentDate, 'dd/MM/yyyy')}</b>. Ricorda di caricare il certificato dopo la visita.
                    </AlertDescription>
                </Alert>
            )}

            </>
        )}

        <div className="grid gap-4">
            {plans.map(plan => {
              const isStagionalePlan = plan.id === 'stagionale';
              const isPlanDisabled = (isStagionalePlan && !isStagionaleAvailable) || !canSubscribe;
              const isSelected = selectedPlan === plan.id;

              return (
                <Card 
                    key={plan.id}
                    className={cn(
                        "h-full flex flex-col",
                        isSelected && !isPlanDisabled && "border-primary ring-2 ring-primary",
                        isPlanDisabled && "bg-muted/50 text-muted-foreground border-none ring-0"
                    )}
                >
                    <CardHeader>
                        <CardTitle className={cn(isPlanDisabled && "text-muted-foreground")}>{plan.name}</CardTitle>
                        {plan.expiry && <p className="text-sm text-muted-foreground">{plan.expiry}</p>}
                        <p className="text-2xl font-bold">€{plan.price}<span className="text-sm font-normal text-muted-foreground">/{plan.period}</span></p>
                    </CardHeader>
                    <CardContent className="space-y-2 flex-grow">
                        {plan.features.map(feature => (
                            <div key={feature} className="flex items-center text-sm">
                                <CheckCircle className={cn("w-4 h-4 mr-2", isPlanDisabled ? "text-muted-foreground" : "text-green-500")} />
                                <span>{feature}</span>
                            </div>
                        ))}
                        {isSelected && !isPlanDisabled && (
                            <div className="pt-4">
                                <Separator className="mb-4" />
                                <h4 className="font-semibold mb-2">Metodo di Pagamento</h4>
                                {renderPaymentOptions(plan.id)}
                            </div>
                        )}
                    </CardContent>
                    <CardFooter>
                        {!isSelected ? (
                             <Button 
                                className="w-full" 
                                disabled={isPlanDisabled}
                                onClick={() => handlePlanChange(plan.id)}
                            >
                                Scegli Piano
                            </Button>
                        ) : (
                             <Button 
                                className="w-full" 
                                disabled={isPlanDisabled || !paymentMethod || isSubmitting}
                                onClick={handleSubscription}
                            >
                                {isSubmitting ? 'Salvataggio...' : 'ISCRIVITI'}
                            </Button>
                        )}
                    </CardFooter>
                </Card>
              )
            })}
        </div>
      </CardContent>
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
                        <span className="font-mono">{bankDetails.beneficiary}</span>
                        <Button variant="ghost" size="icon" onClick={() => copyToClipboard(bankDetails.beneficiary)}>
                            <Copy className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
                 <div className="space-y-1">
                    <Label className="text-muted-foreground">IBAN</Label>
                    <div className="flex items-center justify-between rounded-md border bg-muted p-2">
                        <span className="font-mono">{bankDetails.iban}</span>
                         <Button variant="ghost" size="icon" onClick={() => copyToClipboard(bankDetails.iban)}>
                            <Copy className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
                 <div className="space-y-1">
                    <Label className="text-muted-foreground">Importo</Label>
                     <div className="flex items-center justify-between rounded-md border bg-muted p-2">
                        <span className="font-mono">€ {plans.find(p => p.id === selectedPlan)?.price}</span>
                         <Button variant="ghost" size="icon" onClick={() => copyToClipboard(plans.find(p => p.id === selectedPlan)?.price || '')}>
                            <Copy className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
                 <div className="space-y-1">
                    <Label className="text-muted-foreground">Causale</Label>
                    <div className="flex items-center justify-between rounded-md border bg-muted p-2">
                        <span className="font-mono">{bankDetails.cause}</span>
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
