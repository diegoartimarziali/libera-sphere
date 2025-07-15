
"use client"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { CheckCircle } from "lucide-react"

const plans = [
    { name: "Mensile", price: "55", features: ["Accesso a tutte le palestre", "Corsi illimitati"] },
]

export function SubscriptionManagement() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Piano di Abbonamento</CardTitle>
        <CardDescription>
          Scegli il piano giusto per te.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RadioGroup defaultValue="mensile" className="grid gap-4">
            {plans.map(plan => (
                <Label key={plan.name} htmlFor={plan.name.toLowerCase()} className="block">
                    <RadioGroupItem value={plan.name.toLowerCase()} id={plan.name.toLowerCase()} className="sr-only" />
                    <Card className="cursor-pointer has-[:checked]:border-primary has-[:checked]:ring-2 has-[:checked]:ring-primary">
                        <CardHeader>
                            <CardTitle>{plan.name}</CardTitle>
                            <p className="text-2xl font-bold">€{plan.price}<span className="text-sm font-normal text-muted-foreground">/{plan.name === 'Mensile' ? 'mese' : plan.name === 'Trimestrale' ? 'trim' : 'anno'}</span></p>
                        </CardHeader>
                        <CardContent className="space-y-2">
                           {plan.features.map(feature => (
                               <div key={feature} className="flex items-center text-sm">
                                   <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                                   <span>{feature}</span>
                               </div>
                           ))}
                        </CardContent>
                    </Card>
                </Label>
            ))}
        </RadioGroup>
        <div className="mt-6 flex justify-end">
            <Button>Aggiorna Abbonamento</Button>
        </div>
      </CardContent>
    </Card>
  )
}
