
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
import { CheckCircle } from "lucide-react"

const plans = [
    { id: "stagionale", name: "Stagionale", price: "500", period: "anno", features: ["Accesso a tutte le palestre", "Corsi illimitati", "Sconto eventi speciali"] },
    { id: "mensile", name: "Mensile", price: "55", period: "mese", features: ["Accesso a tutte le palestre", "Corsi illimitati"] },
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
        <RadioGroup defaultValue="stagionale" className="grid gap-4">
            {plans.map(plan => (
                <Label key={plan.id} htmlFor={plan.id} className="block h-full">
                    <RadioGroupItem value={plan.id} id={plan.id} className="sr-only" />
                    <Card className="cursor-pointer has-[:checked]:border-primary has-[:checked]:ring-2 has-[:checked]:ring-primary h-full flex flex-col">
                        <CardHeader>
                            <CardTitle>{plan.name}</CardTitle>
                            <p className="text-2xl font-bold">€{plan.price}<span className="text-sm font-normal text-muted-foreground">/{plan.period}</span></p>
                        </CardHeader>
                        <CardContent className="space-y-2 flex-grow">
                           {plan.features.map(feature => (
                               <div key={feature} className="flex items-center text-sm">
                                   <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                                   <span>{feature}</span>
                               </div>
                           ))}
                        </CardContent>
                        <CardFooter>
                            <Button className="w-full">Scegli Piano</Button>
                        </CardFooter>
                    </Card>
                </Label>
            ))}
        </RadioGroup>
      </CardContent>
    </Card>
  )
}
