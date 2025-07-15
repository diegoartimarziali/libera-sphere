"use client"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { HeartPulse, Upload, AlertTriangle } from "lucide-react"
import { useState } from "react"

export function MedicalCertificate() {
  // We'll use state to track if the certificate is uploaded.
  // Let's default to false to show the "missing" state.
  const [isCertificateUploaded, setIsCertificateUploaded] = useState(false)

  const expirationDate = new Date()
  expirationDate.setFullYear(expirationDate.getFullYear() + 1)

  // This function would handle the file upload in a real app.
  // For now, it just toggles the state.
  const handleUploadClick = () => {
    setIsCertificateUploaded(true);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Certificato Medico</CardTitle>
        <CardDescription>
          Il tuo certificato è richiesto per la partecipazione.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center text-center gap-4 p-8">
        {isCertificateUploaded ? (
          <>
            <HeartPulse className="w-16 h-16 text-green-500" />
            <p className="font-semibold text-lg">Certificato Registrato</p>
            <p className="text-muted-foreground text-sm">
              Scade il: {expirationDate.toLocaleDateString('it-IT')}
            </p>
            <Button variant="outline" className="mt-4">
              <Upload className="mr-2 h-4 w-4" /> Carica Nuovo
            </Button>
          </>
        ) : (
          <>
            <AlertTriangle className="w-16 h-16 text-destructive" />
            <p className="font-semibold text-lg">Certificato Mancante</p>
            <p className="text-muted-foreground text-sm">
              Carica il tuo certificato per continuare.
            </p>
            <Button className="mt-4" onClick={handleUploadClick}>
              <Upload className="mr-2 h-4 w-4" /> Carica Ora
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}
