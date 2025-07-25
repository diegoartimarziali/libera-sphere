
"use client"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Upload, AlertTriangle, CheckCircle, FileText, Loader2 } from "lucide-react"
import { useState, useEffect, useRef } from "react"
import { format, differenceInDays, parseISO, isValid } from "date-fns"
import { it } from "date-fns/locale"
import { Label } from "./ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "./ui/use-toast"
import { useRouter } from "next/navigation"
import { Alert, AlertDescription, AlertTitle } from "./ui/alert"
import { auth, storage, db } from "@/lib/firebase"
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage"
import { Progress } from "./ui/progress"
import { doc, updateDoc, getDoc } from "firebase/firestore"

const months = Array.from({ length: 12 }, (_, i) => ({
    value: String(i + 1),
    label: it.localize?.month(i, { width: 'wide' }),
}));

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 10 }, (_, i) => String(currentYear + i));

export function MedicalCertificate({ userData }: { userData?: any }) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isCertificateUploaded, setIsCertificateUploaded] = useState(false)
  const [expirationDate, setExpirationDate] = useState<Date | undefined>(undefined);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  
  const [day, setDay] = useState<string | undefined>(undefined);
  const [month, setMonth] = useState<string | undefined>(undefined);
  const [year, setYear] = useState<string | undefined>(undefined);
  const [dateMessage, setDateMessage] = useState<{type: 'error' | 'warning', text: string} | null>(null);
  
  useEffect(() => {
    if (userData && userData.medicalCertificate) {
        const { expirationDate, fileName, fileUrl } = userData.medicalCertificate;
        if (expirationDate && fileName && fileUrl) {
            try {
                const storedDate = parseISO(expirationDate);
                if (isValid(storedDate)) {
                    setIsCertificateUploaded(true);
                    setExpirationDate(storedDate);
                    setFileName(fileName);
                    setFileUrl(fileUrl);
                    setDay(String(storedDate.getDate()));
                    setMonth(String(storedDate.getMonth() + 1));
                    setYear(String(storedDate.getFullYear()));
                }
            } catch (error) {
                console.error("Failed to parse expiration date from user data:", error);
            }
        }
    }
  }, [userData]);

  useEffect(() => {
    setDateMessage(null); // Reset message on date change
    if (day && month && year) {
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        if (date.getFullYear() === parseInt(year) && date.getMonth() === parseInt(month) - 1 && date.getDate() === parseInt(day)) {
            setExpirationDate(date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
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
    const user = auth.currentUser;

    if (!file) return;
    if (!expirationDate) {
        toast({ title: "Data mancante", description: "Seleziona una data di scadenza prima di caricare.", variant: "destructive" });
        return;
    }
    if (!user) {
        toast({ title: "Utente non autenticato", description: "Effettua di nuovo il login per caricare.", variant: "destructive" });
        return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    const storageRef = ref(storage, `medical-certificates/${user.uid}/${Date.now()}_${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on('state_changed',
        (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setUploadProgress(progress);
        },
        (error) => {
            console.error("Upload failed:", error);
            toast({ title: "Caricamento Fallito", description: `Errore: ${error.message}`, variant: "destructive" });
            setIsUploading(false);
        },
        () => {
            getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
                handleRegisterCertificate(file, downloadURL);
                setIsUploading(false);
            });
        }
    );
  };
  
  const handleRegisterCertificate = async (file: File, url: string) => {
    const user = auth.currentUser;
    if (file && expirationDate && url && user) {
      try {
        const userDocRef = doc(db, "users", user.uid);
        await updateDoc(userDocRef, {
            'medicalCertificate.expirationDate': expirationDate.toISOString(),
            'medicalCertificate.fileName': file.name,
            'medicalCertificate.fileUrl': url,
            'medicalCertificate.appointmentDate': null, // Clear appointment date
        });
      
        setIsCertificateUploaded(true);
        setFileName(file.name);
        setFileUrl(url);
        
        toast({
          title: "Certificato Caricato!",
          description: `Il file "${file.name}" è stato registrato con successo.`,
        });
        window.location.reload();
      } catch (error) {
        console.error("Error updating certificate in Firestore:", error);
        toast({ title: "Errore Database", description: "Impossibile salvare il certificato.", variant: "destructive" });
      }
    }
  }

  const handleNewUpload = async () => {
    const user = auth.currentUser;
    if (user) {
      try {
        const userDocRef = doc(db, "users", user.uid);
        await updateDoc(userDocRef, {
            'medicalCertificate.expirationDate': null,
            'medicalCertificate.fileName': null,
            'medicalCertificate.fileUrl': null,
        });
      } catch (error) {
        console.error("Error clearing certificate in Firestore:", error);
      }
    }
    setIsCertificateUploaded(false);
    setExpirationDate(undefined);
    setFileName(null);
    setFileUrl(null);
    setDay(undefined);
    setMonth(undefined);
    setYear(undefined);
    setUploadProgress(0);
    if(fileInputRef.current) fileInputRef.current.value = "";
  }

  const renderCertificateStatus = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let certDate: Date | null = null;
    if (userData?.medicalCertificate?.expirationDate) {
        try {
            certDate = parseISO(userData.medicalCertificate.expirationDate);
            if (!isValid(certDate)) certDate = null;
        } catch { certDate = null; }
    }

    if (!certDate) {
        return (
            <div className="flex flex-col items-center text-center text-red-600 font-medium">
                <AlertTriangle className="mr-2 h-8 w-8 mb-2" />
                <span>Attenzione, certificato medico mancante.</span>
            </div>
        );
    }

    const daysUntilExpiration = differenceInDays(certDate, today);

    if (daysUntilExpiration < 0) {
        return (
             <div className="flex flex-col items-center text-center text-red-600 font-medium">
                <AlertTriangle className="mr-2 h-8 w-8 mb-2" />
                <span>Attenzione, certificato medico scaduto.</span>
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
        <CardDescription className="pt-2 text-foreground">
          Il tuo certificato è richiesto per la partecipazione ai corsi, se non ne sei provvisto/a prenota subito la visita non agonistica presso un centro di medicina dello sport, il tuo medico di base o il pediatra di libera scelta e carica il certificato appena ne sei in possesso.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-grow flex-col items-center justify-center text-center gap-4 p-8">
        <div className="w-full max-w-sm flex flex-col items-center">
            {renderCertificateStatus()}
            {!isCertificateUploaded ? (
            <>
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

                <Button className="mt-4 w-full" onClick={handleButtonClick} disabled={!expirationDate || dateMessage?.type === 'error' || isUploading}>
                  {isUploading ? (
                     <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Caricamento... </>
                  ) : (
                     <><Upload className="mr-2 h-4 w-4" /> Seleziona un file</>
                  )}
                </Button>
                {isUploading && <Progress value={uploadProgress} className="w-full mt-2" />}
            </>
            ) : (
                <>
                    <a href={fileUrl!} target="_blank" rel="noopener noreferrer" className="mt-4 text-blue-600 hover:underline flex items-center gap-2">
                        <FileText className="h-5 w-5"/>
                        <p className="text-muted-foreground text-sm">
                            {fileName}
                        </p>
                    </a>

                    <p className="text-sm">
                        {expirationDate ? (
                            <span>
                                <span className="font-bold text-foreground">Scade il:</span> <span className="font-bold text-foreground">{format(expirationDate, "PPP", { locale: it })}</span>
                            </span>
                        ) : "Data di scadenza non impostata"}
                    </p>
                    <Button variant="secondary" className="mt-4" onClick={handleNewUpload}>
                        <Upload className="mr-2 h-4 w-4" /> Carica Nuovo
                    </Button>
                </>
            )}
        </div>
      </CardContent>
    </Card>
  )
}
