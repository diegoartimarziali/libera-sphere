"use client"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { HeartPulse, Upload } from "lucide-react"

export function MedicalCertificate() {
  const expirationDate = new Date()
  expirationDate.setFullYear(expirationDate.getFullYear() + 1)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Certificato Medico</CardTitle>
        <CardDescription>
          Il tuo certificato è richiesto per la partecipazione.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center text-center gap-4 p-8">
        <HeartPulse className="w-16 h-16 text-green-500" />
        <p className="font-semibold text-lg">Certificato Registrato</p>
        <p className="text-muted-foreground text-sm">
          Scade il: {expirationDate.toLocaleDateString('it-IT')}
        </p>
        <Button variant="outline" className="mt-4">
          <Upload className="mr-2 h-4 w-4" /> Carica Nuovo
        </Button>
      </CardContent>
    </Card>
  )
}
