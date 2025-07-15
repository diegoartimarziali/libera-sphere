"use client"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { HeartPulse, Upload, AlertTriangle, Calendar as CalendarIcon } from "lucide-react"
import { useState } from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { it } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { Label } from "./ui/label"


export function MedicalCertificate() {
  const [isCertificateUploaded, setIsCertificateUploaded] = useState(false)
  const [expirationDate, setExpirationDate] = useState<Date | undefined>(undefined);

  const handleUploadClick = () => {
    if(expirationDate) {
      setIsCertificateUploaded(true);
    }
  }
  
  const handleNewUpload = () => {
    setIsCertificateUploaded(false);
    setExpirationDate(undefined);
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>Certificato Medico</CardTitle>
        <CardDescription>
          Il tuo certificato è richiesto per la partecipazione ai corsi, se non ne sei provvisto/a prenota subito la visita non agonistica presso un centro di medicina dello sport, il tuo medico di base o il pediatra di libera scelta e carica il certificato appena ne sei in possesso.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-grow flex-col items-center justify-center text-center gap-4 p-8">
        {isCertificateUploaded ? (
          <>
            <HeartPulse className="w-16 h-16 text-green-500" />
            <p className="font-semibold text-lg">Certificato Registrato</p>
            <p className="text-muted-foreground text-sm">
              {expirationDate ? `Scade il: ${format(expirationDate, "PPP", { locale: it })}` : "Data di scadenza non impostata"}
            </p>
            <Button variant="outline" className="mt-4" onClick={handleNewUpload}>
              <Upload className="mr-2 h-4 w-4" /> Carica Nuovo
            </Button>
          </>
        ) : (
          <div className="w-full max-w-sm flex flex-col items-center">
            <AlertTriangle className="w-16 h-16 text-destructive" />
            <p className="font-semibold text-lg mt-4">Certificato Mancante</p>
            <p className="text-muted-foreground text-sm">
              Carica il tuo certificato per continuare.
            </p>
            <div className="flex flex-col space-y-2 w-full items-center pt-4">
               <Label htmlFor="expiry-date" className="self-start text-left w-full">Data di Scadenza</Label>
               <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="expiry-date"
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !expirationDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {expirationDate ? format(expirationDate, "PPP", { locale: it }) : <span>Seleziona una data</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={expirationDate}
                    onSelect={setExpirationDate}
                    initialFocus
                    locale={it}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <Button className="mt-4 w-full" onClick={handleUploadClick} disabled={!expirationDate}>
              <Upload className="mr-2 h-4 w-4" /> Carica il Certificato
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
