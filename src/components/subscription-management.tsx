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
    { name: "Monthly", price: "29.99", features: ["Access to all gyms", "Unlimited classes", "Guest passes (2/mo)"] },
    { name: "Quarterly", price: "79.99", features: ["All Monthly benefits", "Save 10%", "Personal locker"] },
    { name: "Yearly", price: "299.99", features: ["All Quarterly benefits", "Save 20%", "Free merchandise"] },
]

export function SubscriptionManagement() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Subscription Plan</CardTitle>
        <CardDescription>
          Choose the plan that's right for you.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RadioGroup defaultValue="monthly" className="grid gap-4 md:grid-cols-3">
            {plans.map(plan => (
                <Label key={plan.name} htmlFor={plan.name.toLowerCase()} className="block">
                    <RadioGroupItem value={plan.name.toLowerCase()} id={plan.name.toLowerCase()} className="sr-only" />
                    <Card className="cursor-pointer has-[:checked]:border-primary has-[:checked]:ring-2 has-[:checked]:ring-primary">
                        <CardHeader>
                            <CardTitle>{plan.name}</CardTitle>
                            <p className="text-2xl font-bold">${plan.price}<span className="text-sm font-normal text-muted-foreground">/{plan.name === 'Monthly' ? 'mo' : plan.name === 'Quarterly' ? 'qtr' : 'yr'}</span></p>
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
            <Button>Update Subscription</Button>
        </div>
      </CardContent>
    </Card>
  )
}
