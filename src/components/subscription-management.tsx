
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

const plans = [
    { id: "stagionale", name: "Stagionale", price: "440", period: "stagione", features: ["Accesso a tutte le palestre", "Corsi illimitati", "Paga in un'unica soluzione.", "Un mese gratis"], expiry: "L'Abbonamento Stagionale può essere acquistato dal 01/09 al 15/10" },
    { id: "mensile", name: "Mensile", price: "55", period: "mese", features: ["Accesso a tutte le palestre", "Corsi illimitati"] },
]

export function SubscriptionManagement() {
  const [isStagionaleAvailable, setIsStagionaleAvailable] = useState(false);
  const [hasMedicalCertificate, setHasMedicalCertificate] = useState(false);

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
  }, []);

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
        <RadioGroup defaultValue="stagionale" className="grid gap-4" disabled={!hasMedicalCertificate}>
            {plans.map(plan => {
              const isStagionalePlan = plan.id === 'stagionale';
              const isPlanDisabled = (isStagionalePlan && !isStagionaleAvailable) || !hasMedicalCertificate;

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
                        </CardContent>
                        <CardFooter>
                            <Button className="w-full" disabled={isPlanDisabled}>
                                ISCRIVITI
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
