

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
import { db } from "@/lib/firebase"
import { collection, addDoc, serverTimestamp } from "firebase/firestore"
import { useToast } from "./ui/use-toast"
import { useRouter } from "next/navigation"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { format, addYears, setMonth, setDate, lastDayOfMonth } from "date-fns"
import { it } from "date-fns/locale"

const allPlans = [
    { id: "stagionale", name: "Stagionale", price: "440", period: "stagione", features: ["Accesso a tutte le palestre", "Corsi illimitati", "Paga in un'unica soluzione.", "Un mese gratis"], expiry: "L'Abbonamento Stagionale può essere acquistato dal 01/07 al 15/10" },
    { id: "mensile", name: "Mensile", price: "55", period: "mese", features: ["Accesso a tutte le palestre", "Corsi illimitati"] },
]

const seasonalPaymentOptions = [
    { id: "online", label: "Carta di Credito on line" },
    { id: "bank", label: "Bonifico Bancario" },
]

const monthlyPaymentOptions = [
    { id: "online", label: "Carta di Credito on line" },
    { id: "bank", label: "Bonifico Bancario" },
    { id: "cash", label: "Contanti o Bancomat in Palestra ( 2 euro costi di gestione)" },
]

const months = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: it.localize?.month(i, { width: 'wide' }),
}));

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 5 }, (_, i) => String(currentYear + i));

const SUMUP_SEASONAL_LINK = 'https://pay.sumup.com/b2c/QG1CK6T0';
const SUMUP_MONTHLY_LINK = 'https://pay.sumup.com/b2c/QHT1C8KC'; 


export function SubscriptionManagement() {
  const { toast } = useToast();
  const router = useRouter();
  const [isStagionaleAvailable, setIsStagionaleAvailable] = useState(false);
  const [hasMedicalCertificate, setHasMedicalCertificate] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | undefined>();
  const [seasonalPaymentMethod, setSeasonalPaymentMethod] = useState<string | undefined>();
  const [monthlyPaymentMethod, setMonthlyPaymentMethod] = useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showBankTransferDialog, setShowBankTransferDialog] = useState(false);
  const [userName, setUserName] = useState('');
  
  const [bookedAppointmentDate, setBookedAppointmentDate] = useState<Date | null>(null);
  const [appointmentDay, setAppointmentDay] = useState<string | undefined>();
  const [appointmentMonth, setAppointmentMonth] = useState<string | undefined>();
  const [appointmentYear, setAppointmentYear] = useState<string | undefined>();
  const [currentSubscriptionPlan, setCurrentSubscriptionPlan] = useState<string | null>(null);
  const [currentSubscriptionStatus, setCurrentSubscriptionStatus] = useState<string | null>(null);
  const [monthlyStatus, setMonthlyStatus] = useState<'valido' | 'in_scadenza' | 'scaduto' | 'non_attivo'>('non_attivo');

  const bankDetails = {
      iban: "IT12A345B678C901D234E567F890",
      beneficiary: "Associazione Libera Energia ASD",
      cause: `Abbonamento ${selectedPlan === 'stagionale' ? 'Stagionale' : 'Mensile'} ${userName}`
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
      const certDate = localStorage.getItem('medicalCertificateExpirationDate');
      const certFile = localStorage.getItem('medicalCertificateFileName');
      if (certDate && certFile) {
          setHasMedicalCertificate(true);
      }

      const appointmentDateStr = localStorage.getItem('medicalAppointmentDate');
      if (appointmentDateStr) {
          setBookedAppointmentDate(new Date(appointmentDateStr));
      }
      
      const plan = localStorage.getItem('subscriptionPlan');
      const status = localStorage.getItem('subscriptionStatus');
      setCurrentSubscriptionPlan(plan);
      setCurrentSubscriptionStatus(status);
      setUserName(localStorage.getItem('userName') || '');

      const today = new Date();
      today.setHours(0, 0, 0, 0); 
      const currentYear = today.getFullYear();
      
      const startDate = new Date(currentYear, 6, 1); // July 1st
      const endDate = new Date(currentYear, 9, 15); // October 15th
      
      const isAvailable = today >= startDate && today <= endDate;
      setIsStagionaleAvailable(isAvailable);
      
      if (!plan) { // Only set default if no plan is selected yet
        if (isAvailable) {
            setSelectedPlan("stagionale");
        } else {
            setSelectedPlan("mensile");
        }
      } else {
        setSelectedPlan(plan);
      }
      
      // Monthly status logic
      if (plan === 'mensile' && status === 'valido') {
        const paymentDateStr = localStorage.getItem('subscriptionPaymentDate');
        if (paymentDateStr) {
            const paymentDate = new Date(paymentDateStr);
            if (paymentDate.getFullYear() === today.getFullYear() && paymentDate.getMonth() === today.getMonth()) {
                const endOfMonth = lastDayOfMonth(today);
                const warningDate = new Date(endOfMonth);
                warningDate.setDate(warningDate.getDate() - 3);

                if (today > endOfMonth) {
                    setMonthlyStatus('scaduto');
                } else if (today >= warningDate) {
                    setMonthlyStatus('in_scadenza');
                } else {
                    setMonthlyStatus('valido');
                }
            } else {
                 setMonthlyStatus('scaduto');
            }
        } else {
            setMonthlyStatus('non_attivo');
        }
      } else if (!plan) {
          setMonthlyStatus('non_attivo');
      }

    }
  }, []);

  const handlePlanChange = (planId: string) => {
    setSelectedPlan(planId);
    setSeasonalPaymentMethod(undefined);
    setMonthlyPaymentMethod(undefined);
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

  const saveDataToLocalStorage = (planId: string) => {
    if (typeof window !== 'undefined') {
        localStorage.setItem('subscriptionPlan', planId);
        localStorage.setItem('subscriptionStatus', 'in_attesa');
        
        if (planId === 'stagionale') {
            const today = new Date();
            let expiryDate = setDate(setMonth(today, 5), 15); // June 15
            if (today.getMonth() >= 6 && today.getDate() > 15) { 
               expiryDate = addYears(expiryDate, 1);
            }
            localStorage.setItem('subscriptionExpiry', expiryDate.toISOString());
        } else {
            localStorage.removeItem('subscriptionExpiry'); 
        }
    }
  }

  const saveDataToFirestore = async (planId: string, paymentMethod: string) => {
    const userEmail = localStorage.getItem('registrationEmail');
    const planDetails = allPlans.find(p => p.id === planId);

    if (!userEmail || !planDetails) {
        toast({ title: "Errore", description: "Dati mancanti per la registrazione.", variant: "destructive" });
        return;
    }
    
    try {
        await addDoc(collection(db, "subscriptions"), {
            userEmail: userEmail,
            planId: planDetails.id,
            planName: `Abbonamento ${planDetails.name}`,
            price: planDetails.price,
            paymentMethod: paymentMethod,
            status: 'In attesa',
            subscriptionDate: serverTimestamp()
        });
    } catch (error) {
        console.error("Error writing to Firestore: ", error);
        toast({ title: "Errore Database", description: "Impossibile salvare i dati.", variant: "destructive" });
        throw error;
    }
  };

  const handleSubscription = async (planId: string, paymentMethod: string | undefined) => {
    if (!planId || !paymentMethod) return;

    setIsSubmitting(true);
    
    try {
        saveDataToLocalStorage(planId);
        await saveDataToFirestore(planId, paymentMethod);

        if (paymentMethod === 'online') {
            const paymentUrl = encodeURIComponent(planId === 'stagionale' ? SUMUP_SEASONAL_LINK : SUMUP_MONTHLY_LINK);
            const returnUrl = encodeURIComponent('/dashboard');
            router.push(`/dashboard/payment-gateway?url=${paymentUrl}&returnTo=${returnUrl}`);
        } else if (paymentMethod === 'bank') {
            setShowBankTransferDialog(true);
        } else if (paymentMethod === 'cash') {
             toast({
                title: "Iscrizione registrata!",
                description: `Presentati in segreteria per completare il pagamento.`,
             });
             router.push('/dashboard');
        }
    } catch(error) {
        // Error is already toasted in saveDataToFirestore
    } finally {
        setIsSubmitting(false);
    }
  }

  const handleConfirmBankTransfer = async () => {
      setShowBankTransferDialog(false);
      toast({
          title: "Iscrizione registrata!",
          description: "Effettua il bonifico usando i dati forniti. Vedrai lo stato aggiornato nella sezione pagamenti.",
      });
      router.push('/dashboard');
  };
  
  const canSubscribe = hasMedicalCertificate || !!bookedAppointmentDate;
  const plans = currentSubscriptionPlan === 'mensile' ? allPlans.filter(p => p.id === 'mensile') : allPlans;
  
  const renderMonthlyStatusAlert = () => {
      if (currentSubscriptionPlan !== 'mensile') return null;

      let variant: 'default' | 'destructive' = 'default';
      let title = '';
      let description = '';

      if (currentSubscriptionStatus === 'in_attesa') {
           return (
                 <Alert className="mb-4 border-orange-400 text-orange-700 [&>svg]:text-orange-700">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Abbonamento In Attesa</AlertTitle>
                    <AlertDescription>La tua richiesta di abbonamento è in attesa di approvazione.</AlertDescription>
                </Alert>
            );
      }

      switch (monthlyStatus) {
          case 'valido':
              title = 'Abbonamento Attivo';
              description = `Il tuo abbonamento mensile è attivo per ${format(new Date(), 'MMMM', {locale: it})}.`;
              return (
                 <Alert className="mb-4 border-green-500 text-green-800 [&>svg]:text-green-800">
                    <CheckCircle className="h-4 w-4" />
                    <AlertTitle>{title}</AlertTitle>
                    <AlertDescription>{description}</AlertDescription>
                </Alert>
              );
          case 'in_scadenza':
              title = 'Abbonamento in Scadenza';
              description = 'Il tuo abbonamento mensile scade tra meno di 3 giorni. Rinnovalo per non perdere l\'accesso ai corsi.';
               return (
                 <Alert className="mb-4 border-orange-400 text-orange-700 [&>svg]:text-orange-700">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>{title}</AlertTitle>
                    <AlertDescription>{description}</AlertDescription>
                </Alert>
              );
          case 'scaduto':
              variant = 'destructive';
              title = 'Abbonamento Scaduto';
              description = 'Il tuo abbonamento mensile è scaduto. Rinnovalo per continuare ad allenarti.';
              return (
                <Alert variant="destructive" className="mb-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>{title}</AlertTitle>
                    <AlertDescription>{description}</AlertDescription>
                </Alert>
              );
        case 'non_attivo':
             if (!currentSubscriptionStatus) {
                return (
                    <Alert variant="destructive" className="mb-4">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Abbonamento Non Attivo</AlertTitle>
                        <AlertDescription>Non hai un abbonamento attivo. Scegli un piano per iniziare ad allenarti.</AlertDescription>
                    </Alert>
                );
            }
            return null;
      }
      return null;
  }

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
                    Per poter partecipare ai corsi è necessario essere in possesso di certificato medico non agonistico in corso di validità. Carica il Certificato cliccando nel menu Certificato Medico.
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

        {renderMonthlyStatusAlert()}

        <RadioGroup
            value={selectedPlan}
            onValueChange={handlePlanChange}
            className="grid gap-4"
        >
            {plans.map(plan => {
              const isStagionalePlan = plan.id === 'stagionale';
              const isPlanDisabled = (isStagionalePlan && !isStagionaleAvailable) || !canSubscribe;
              const isSelected = selectedPlan === plan.id;
              
              const paymentMethod = plan.id === 'stagionale' ? seasonalPaymentMethod : monthlyPaymentMethod;
              const setPaymentMethod = plan.id === 'stagionale' ? setSeasonalPaymentMethod : setMonthlyPaymentMethod;
              const paymentOptions = plan.id === 'stagionale' ? seasonalPaymentOptions : monthlyPaymentOptions;

              return (
                <Label key={plan.id} htmlFor={plan.id} className={cn(
                    "block rounded-lg border p-4 cursor-pointer transition-all",
                    isSelected && !isPlanDisabled && "border-primary ring-2 ring-primary",
                    isPlanDisabled && "bg-muted/50 text-muted-foreground border-dashed ring-0 cursor-not-allowed"
                )}>
                <div className="flex flex-col h-full">
                    <RadioGroupItem value={plan.id} id={plan.id} className="sr-only" disabled={isPlanDisabled} />

                    <div className="flex justify-between items-start">
                        <div className="flex-grow">
                             <CardTitle className={cn("flex justify-between items-center mb-1", isPlanDisabled && "text-muted-foreground")}>
                                {plan.name}
                            </CardTitle>
                            {plan.id === 'mensile' && (
                                <p className="text-sm text-foreground pt-1">
                                    Per essere iscritto ai corsi usa questo form ogni mese, anche se paghi in contanti. In questo modo avrai sotto controllo i tuoi pagamenti e potrai richiedere la ricevuta a fine stagione. Ti ricordiamo che l'iscrizione mensile deve essere effettuata entro il primo giorno del mese.
                                </p>
                            )}
                            {plan.expiry && <p className="text-sm text-muted-foreground pt-1">{plan.expiry}</p>}
                            <p className="text-2xl font-bold pt-2">€{plan.price}<span className="text-sm font-normal text-muted-foreground">/{plan.period}</span></p>
                        </div>
                         {!isSelected && (
                            <span className="text-sm font-normal text-muted-foreground">
                                {isPlanDisabled ? 'Non disponibile' : 'Scegli'}
                            </span>
                        )}
                    </div>
                    
                    <div className="space-y-2 flex-grow pt-4">
                        {plan.features.map(feature => (
                            <div key={feature} className="flex items-center text-sm">
                                <CheckCircle className={cn("w-4 h-4 mr-2", isPlanDisabled ? "text-muted-foreground" : "text-green-500")} />
                                <span>{feature}</span>
                            </div>
                        ))}
                    </div>
                    
                     {isSelected && !isPlanDisabled && (
                        <div className="pt-4 mt-4 border-t">
                            <h4 className="font-semibold mb-2">Metodo di Pagamento</h4>
                            <div className="space-y-4">
                                <Select onValueChange={setPaymentMethod} value={paymentMethod}>
                                    <SelectTrigger id={`${plan.id}-payment`}>
                                    <SelectValue placeholder="Scegli un metodo" />
                                    </SelectTrigger>
                                    <SelectContent>
                                    {paymentOptions.map(option => (
                                        <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>
                                    ))}
                                    </SelectContent>
                                </Select>
                                <Button 
                                    className="w-full" 
                                    disabled={!paymentMethod || isSubmitting}
                                    onClick={() => handleSubscription(plan.id, paymentMethod)}
                                >
                                    {isSubmitting ? 'Salvataggio...' : 'ISCRIVITI'}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
                </Label>
              )
            })}
        </RadioGroup>
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
                        <span className="font-mono">€ {allPlans.find(p => p.id === selectedPlan)?.price}</span>
                         <Button variant="ghost" size="icon" onClick={() => copyToClipboard(allPlans.find(p => p.id === selectedPlan)?.price || '')}>
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
