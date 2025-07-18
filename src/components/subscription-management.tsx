
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
import { CheckCircle, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Separator } from "./ui/separator"
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useToast } from "./ui/use-toast"
import { useRouter } from "next/navigation"

const plans = [
    { id: "stagionale", name: "Stagionale", price: "440", period: "stagione", features: ["Accesso a tutte le palestre", "Corsi illimitati", "Paga in un'unica soluzione.", "Un mese gratis"], expiry: "L'Abbonamento Stagionale può essere acquistato dal 01/09 al 15/10" },
    { id: "mensile", name: "Mensile", price: "55", period: "mese", features: ["Accesso a tutte le palestre", "Corsi illimitati"] },
]

const paymentOptions = [
    { id: "online", label: "Pagamento con carta di credito on line. Rapido e sicuro." },
    { id: "transfer", label: "Bonifico Bancario." },
    { id: "cash", label: "Contanti o bancomat e carta in palestra (€ 2 spese di gestione)" },
]

export function SubscriptionManagement() {
  const { toast } = useToast();
  const router = useRouter();
  const [isStagionaleAvailable, setIsStagionaleAvailable] = useState(false);
  const [hasMedicalCertificate, setHasMedicalCertificate] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | undefined>();
  const [paymentMethod, setPaymentMethod] = useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Check for medical certificate
    const certDate = localStorage.getItem('medicalCertificateExpirationDate');
    const certFile = localStorage.getItem('medicalCertificateFileName');
    if (certDate && certFile) {
        setHasMedicalCertificate(true);
    }

    // Check for seasonal plan availability
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to the start of the day
    const currentYear = today.getFullYear();
    
    const startDate = new Date(currentYear, 8, 1); // September 1st
    const endDate = new Date(currentYear, 9, 15); // October 15th
    
    setIsStagionaleAvailable(today >= startDate && today <= endDate);
    if (today >= startDate && today <= endDate) {
        setSelectedPlan("stagionale");
    } else {
        setSelectedPlan("mensile");
    }
  }, []);

  const handlePlanChange = (planId: string) => {
    setSelectedPlan(planId);
    setPaymentMethod(undefined); // Reset payment method when plan changes
  }

  const handleSubscription = async (planId: string | undefined, payment: string | undefined) => {
    if (!planId || !payment) return;

    setIsSubmitting(true);
    const userEmail = localStorage.getItem('registrationEmail');

    if (!userEmail) {
        toast({
            title: "Errore",
            description: "Utente non riconosciuto. Effettua nuovamente il login.",
            variant: "destructive",
        });
        setIsSubmitting(false);
        return;
    }

    const selectedPlanDetails = plans.find(p => p.id === planId);
    if (!selectedPlanDetails) {
         toast({
            title: "Errore",
            description: "Piano selezionato non valido.",
            variant: "destructive",
        });
        setIsSubmitting(false);
        return;
    }

    try {
        await addDoc(collection(db, "subscriptions"), {
            userEmail: userEmail,
            planId: selectedPlanDetails.id,
            planName: selectedPlanDetails.name,
            price: selectedPlanDetails.price,
            paymentMethod: payment,
            subscriptionDate: serverTimestamp()
        });

        toast({
            title: "Iscrizione Avvenuta!",
            description: "Il tuo abbonamento è stato registrato con successo.",
        });

        if (typeof window !== 'undefined') {
            localStorage.setItem('subscriptionPlan', selectedPlanDetails.id);
            localStorage.setItem('paymentMethod', payment);
        }
        
        // Optional: redirect or refresh
        router.push('/dashboard');

    } catch (error) {
        console.error("Error adding document: ", error);
        toast({
            title: "Errore nel salvataggio",
            description: "Non è stato possibile registrare il tuo abbonamento. Riprova più tardi.",
            variant: "destructive",
        });
    } finally {
        setIsSubmitting(false);
    }
  }


  return (
    <Card>
      <CardHeader>
        <CardTitle>Piano di Abbonamento</CardTitle>
        <CardDescription>
          Scegli il piano giusto per te.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!hasMedicalCertificate && (
            <Alert variant="destructive" className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Attenzione</AlertTitle>
                <AlertDescription>
                    Per poter partecipare ai corsi è necessario essere in possesso di certificato medico non agonistico in corso di validità. Prenota subito la tua visita o carica il certificato.
                    <br/>
                    <b>Non sarà possibile procedere senza certificato.</b>
                </AlertDescription>
            </Alert>
        )}
        <RadioGroup 
            value={selectedPlan} 
            onValueChange={handlePlanChange} 
            className="grid gap-4" 
            disabled={!hasMedicalCertificate}
        >
            {plans.map(plan => {
              const isStagionalePlan = plan.id === 'stagionale';
              const isPlanDisabled = (isStagionalePlan && !isStagionaleAvailable) || !hasMedicalCertificate;
              const isSelected = selectedPlan === plan.id;

              return (
                <Label key={plan.id} htmlFor={plan.id} className={cn("block h-full", isPlanDisabled ? "cursor-not-allowed" : "")}>
                    <RadioGroupItem value={plan.id} id={plan.id} className="sr-only" disabled={isPlanDisabled} />
                    <Card className={cn(
                      "cursor-pointer has-[:checked]:border-primary has-[:checked]:ring-2 has-[:checked]:ring-primary h-full flex flex-col",
                      isPlanDisabled && "bg-muted/50 text-muted-foreground border-none ring-0"
                    )}>
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
                                   <RadioGroup onValueChange={setPaymentMethod} value={paymentMethod}>
                                       {paymentOptions.map(option => (
                                           <div key={option.id} className="flex items-center space-x-2">
                                               <RadioGroupItem value={option.id} id={`${plan.id}-${option.id}`} />
                                               <Label htmlFor={`${plan.id}-${option.id}`} className="font-normal">{option.label}</Label>
                                           </div>
                                       ))}
                                   </RadioGroup>
                               </div>
                           )}
                        </CardContent>
                        <CardFooter>
                            <Button 
                                className="w-full" 
                                disabled={isPlanDisabled || (isSelected && !paymentMethod) || isSubmitting}
                                onClick={() => handleSubscription(selectedPlan, paymentMethod)}
                            >
                                {isSubmitting ? 'Salvataggio...' : 'ISCRIVITI'}
                            </Button>
                        </CardFooter>
                    </Card>
                </Label>
              )
            })}
        </RadioGroup>
      </CardContent>
    </Card>
  )
}
