"use client"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useToast } from "./ui/use-toast"

export function RegulationsAcceptance() {
    const { toast } = useToast()

    const handleAccept = () => {
        toast({
            title: "Regolamenti Accettati",
            description: "Grazie per aver accettato i nostri termini e regolamenti.",
        })
    }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>Accettazione Regolamenti e Privacy</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow">
        <p className="text-sm text-muted-foreground">
          Prima di associarti ti chiediamo di prendere visione del Regolamento Interno, dello Statuto e del Documento sulla Privacy della nostra associazione.
        </p>
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button onClick={handleAccept}>Accetto i Termini</Button>
      </CardFooter>
    </Card>
  )
}
