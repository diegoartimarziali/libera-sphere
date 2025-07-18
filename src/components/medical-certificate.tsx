
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
import { useState, useEffect } from "react"
import { format } from "date-fns"
import { it } from "date-fns/locale"
import { Label } from "./ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const months = Array.from({ length: 12 }, (_, i) => ({
    value: String(i + 1),
    label: it.localize?.month(i, { width: 'wide' }),
}));

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 10 }, (_, i) => String(currentYear + i));

export function MedicalCertificate() {
  const [isCertificateUploaded, setIsCertificateUploaded] = useState(false)
  const [expirationDate, setExpirationDate] = useState<Date | undefined>(undefined);
  
  const [day, setDay] = useState<string | undefined>(undefined);
  const [month, setMonth] = useState<string | undefined>(undefined);
  const [year, setYear] = useState<string | undefined>(undefined);
  
  useEffect(() => {
    if (day && month && year) {
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        if (date.getFullYear() === parseInt(year) && date.getMonth() === parseInt(month) - 1 && date.getDate() === parseInt(day)) {
            setExpirationDate(date);
        } else {
            setExpirationDate(undefined);
        }
    } else {
        setExpirationDate(undefined);
    }
  }, [day, month, year]);

  const handleUploadClick = () => {
    if(expirationDate) {
      setIsCertificateUploaded(true);
    }
  }
  
  const handleNewUpload = () => {
    setIsCertificateUploaded(false);
    setExpirationDate(undefined);
    setDay(undefined);
    setMonth(undefined);
    setYear(undefined);
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>Certificato Medico</CardTitle>
        <CardDescription className="pt-2">
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
            <div className="space-y-2 w-full pt-4 text-left">
                <Label>Data di Scadenza</Label>
                <div className="grid grid-cols-[1fr_1.5fr_1fr] gap-2">
                    <Select onValueChange={setDay} value={day}>
                        <SelectTrigger><SelectValue placeholder="Giorno" /></SelectTrigger>
                        <SelectContent>
                            {Array.from({ length: 31 }, (_, i) => String(i + 1)).map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Select onValueChange={setMonth} value={month}>
                        <SelectTrigger><SelectValue placeholder="Mese" /></SelectTrigger>
                        <SelectContent>
                            {months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Select onValueChange={setYear} value={year}>
                        <SelectTrigger><SelectValue placeholder="Anno" /></SelectTrigger>
                        <SelectContent>
                            {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
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
