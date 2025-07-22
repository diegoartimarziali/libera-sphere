
"use client"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { HeartPulse, Upload, AlertTriangle, FileCheck, FileX, Eye, Download, CheckCircle } from "lucide-react"
import { useState, useEffect, useRef } from "react"
import { format, differenceInDays } from "date-fns"
import { it } from "date-fns/locale"
import { Label } from "./ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "./ui/use-toast"
import { useRouter } from "next/navigation"
import { Alert, AlertDescription, AlertTitle } from "./ui/alert"

const months = Array.from({ length: 12 }, (_, i) => ({
    value: String(i + 1),
    label: it.localize?.month(i, { width: 'wide' }),
}));

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 10 }, (_, i) => String(currentYear + i));

export function MedicalCertificate() {
  const { toast } = useToast();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isCertificateUploaded, setIsCertificateUploaded] = useState(false)
  const [expirationDate, setExpirationDate] = useState<Date | undefined>(undefined);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  
  const [day, setDay] = useState<string | undefined>(undefined);
  const [month, setMonth] = useState<string | undefined>(undefined);
  const [year, setYear] = useState<string | undefined>(undefined);
  const [dateMessage, setDateMessage] = useState<{type: 'error' | 'warning', text: string} | null>(null);
  
  useEffect(() => {
    // Load existing certificate data from localStorage
    if (typeof window !== 'undefined') {
        const storedDate = localStorage.getItem('medicalCertificateExpirationDate');
        const storedFileName = localStorage.getItem('medicalCertificateFileName');
        const storedFileUrl = localStorage.getItem('medicalCertificateFileUrl');

        if (storedDate && storedFileName) {
            setIsCertificateUploaded(true);
            setExpirationDate(new Date(storedDate));
            setSelectedFile(new File([], storedFileName));
            if(storedFileUrl) {
                setFileUrl(storedFileUrl);
            }
        }
    }
  }, []);

  useEffect(() => {
    setDateMessage(null); // Reset message on date change
    if (day && month && year) {
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        if (date.getFullYear() === parseInt(year) && date.getMonth() === parseInt(month) - 1 && date.getDate() === parseInt(day)) {
            setExpirationDate(date);
            const today = new Date();
            today.setHours(0, 0, 0, 0); // Compare date part only
            const diffInDays = differenceInDays(date, today);

            if (diffInDays <= 5) {
                setDateMessage({ type: 'error', text: 'Certificato medico scaduto, o scadente a breve, non è possibile caricarlo.' });
            } else if (diffInDays <= 15) {
                setDateMessage({ type: 'warning', text: 'Attenzione, il tuo certificato è in scadenza, se non lo hai già fatto prenota subito la visita.' });
            } else {
                setDateMessage(null);
            }

        } else {
            setExpirationDate(undefined);
        }
    } else {
        setExpirationDate(undefined);
    }
  }, [day, month, year]);

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // Create a temporary URL for viewing/downloading
      const url = URL.createObjectURL(file);
      setFileUrl(url);
      handleRegisterCertificate(file, url);
    }
  };
  
  const handleRegisterCertificate = (file: File, url: string) => {
    if (file && expirationDate && url) {
      if (typeof window !== 'undefined') {
        // In a real application, you would upload the file to Firebase Storage
        // and store the permanent URL. For this prototype, we store it in localStorage.
        localStorage.setItem('medicalCertificateExpirationDate', expirationDate.toISOString());
        localStorage.setItem('medicalCertificateFileName', file.name);
        
        // This part is tricky with blob URLs as they expire.
        // For a prototype, this will work for the session. A real app would use a permanent URL.
        localStorage.setItem('medicalCertificateFileUrl', url);
      }
      
      setIsCertificateUploaded(true);
      toast({
        title: "Certificato Caricato!",
        description: `Il file "${file.name}" è stato registrato con successo.`,
      });
      // A small delay to allow the user to see the toast before navigation
      setTimeout(() => router.push('/dashboard'), 1000);
    }
  }

  const handleNewUpload = () => {
    if (typeof window !== 'undefined') {
        localStorage.removeItem('medicalCertificateExpirationDate');
        localStorage.removeItem('medicalCertificateFileName');
        localStorage.removeItem('medicalCertificateFileUrl');
    }
    if (fileUrl) {
      URL.revokeObjectURL(fileUrl);
    }
    setIsCertificateUploaded(false);
    setExpirationDate(undefined);
    setSelectedFile(null);
    setFileUrl(null);
    setDay(undefined);
    setMonth(undefined);
    setYear(undefined);
  }

  const renderCertificateStatus = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (!expirationDate) {
        return (
            <div className="flex flex-col items-center text-center text-red-600 font-medium">
                <AlertTriangle className="mr-2 h-8 w-8 mb-2" />
                <span>Attenzione, certificato medico mancante o scaduto.</span>
            </div>
        );
    }

    const daysUntilExpiration = differenceInDays(expirationDate, today);

    if (daysUntilExpiration < 0) {
        return (
             <div className="flex flex-col items-center text-center text-red-600 font-medium">
                <AlertTriangle className="mr-2 h-8 w-8 mb-2" />
                <span>Attenzione, certificato medico mancante o scaduto.</span>
            </div>
        );
    }

    if (daysUntilExpiration <= 30) {
        return (
            <div className="flex flex-col items-center text-center text-orange-500 font-medium">
                <AlertTriangle className="mr-2 h-8 w-8 mb-2" />
                <span>Attenzione, il tuo certificato è in scadenza, prenota la tua visita.</span>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center text-center text-green-600 font-medium">
            <CheckCircle className="mr-2 h-8 w-8 mb-2" />
            <span>Certificato valido.</span>
        </div>
    );
  };

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
          <div className="w-full max-w-sm flex flex-col items-center">
            {renderCertificateStatus()}
            <p className="text-muted-foreground text-sm mt-4">
              {selectedFile?.name}
            </p>
            <p className="text-muted-foreground text-sm">
              {expirationDate ? `Scade il: ${format(expirationDate, "PPP", { locale: it })}` : "Data di scadenza non impostata"}
            </p>
            <div className="flex gap-2 mt-4">
              {fileUrl && (
                <>
                  <a href={fileUrl} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline">
                      <Eye className="mr-2 h-4 w-4" /> Visualizza
                    </Button>
                  </a>
                  <a href={fileUrl} download={selectedFile?.name}>
                    <Button variant="outline">
                      <Download className="mr-2 h-4 w-4" /> Scarica
                    </Button>
                  </a>
                </>
              )}
            </div>
            <Button variant="secondary" className="mt-4" onClick={handleNewUpload}>
              <Upload className="mr-2 h-4 w-4" /> Carica Nuovo
            </Button>
          </div>
        ) : (
          <div className="w-full max-w-sm flex flex-col items-center">
            
            <p className="font-semibold text-lg mt-4">
              Carica Certificato Medico
            </p>
            
            <p className="text-muted-foreground text-sm mt-2">
              Seleziona prima la data di scadenza, poi carica il file.
            </p>
            
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept="application/pdf,image/jpeg,image/png"
            />
            
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

            {dateMessage && (
                <Alert variant={dateMessage.type === 'error' ? 'destructive' : 'default'} className={dateMessage.type === 'warning' ? 'mt-4 border-orange-400 text-orange-700 [&>svg]:text-orange-700' : 'mt-4'}>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>{dateMessage.type === 'error' ? 'Errore' : 'Attenzione'}</AlertTitle>
                    <AlertDescription>
                        {dateMessage.text}
                    </AlertDescription>
                </Alert>
            )}

            <Button className="mt-4 w-full" onClick={handleButtonClick} disabled={!expirationDate || dateMessage?.type === 'error'}>
                <Upload className="mr-2 h-4 w-4" /> Seleziona un file
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
