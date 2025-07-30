
"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { auth, db, storage } from "@/lib/firebase"
import { useAuthState } from "react-firebase-hooks/auth"
import { doc, getDoc, updateDoc, serverTimestamp, Timestamp } from "firebase/firestore"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useToast } from "@/hooks/use-toast"
import { Loader2, UploadCloud, CheckCircle, Eye } from "lucide-react"
import { DatePicker } from "@/components/ui/date-picker"

interface ExistingMedicalInfo {
    type?: 'certificate' | 'booking';
    fileUrl?: string;
    fileName?: string;
    expiryDate?: Date;
    bookingDate?: Date;
}

const schema = z.object({
    submissionType: z.enum(["certificate", "booking"], {
        required_error: "Devi selezionare un'opzione.",
    }),
    certificateFile: z.instanceof(File).optional(),
    expiryDate: z.date({ required_error: "La data di scadenza è obbligatoria." }).optional(),
    bookingDate: z.date({ required_error: "La data della prenotazione è obbligatoria." }).optional(),
}).superRefine((data, ctx) => {
    if (data.submissionType === "certificate") {
        if (!data.certificateFile) {
             // Non è un errore se un file esiste già, lo rendiamo opzionale solo se ne carica uno nuovo
            // ctx.addIssue({
            //     code: z.ZodIssueCode.custom,
            //     path: ["certificateFile"],
            //     message: "Il file del certificato è obbligatorio.",
            // });
        }
        if (!data.expiryDate) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["expiryDate"],
                message: "La data di scadenza è obbligatoria.",
            });
        }
    }
    if (data.submissionType === "booking") {
        if (!data.bookingDate) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["bookingDate"],
                message: "La data della prenotazione è obbligatoria.",
            });
        }
    }
});

type MedicalCertificateSchema = z.infer<typeof schema>;

export default function MedicalCertificatePage() {
  const [user, authLoading] = useAuthState(auth)
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [existingMedicalInfo, setExistingMedicalInfo] = useState<ExistingMedicalInfo | null>(null);

  const form = useForm<MedicalCertificateSchema>({
    resolver: zodResolver(schema),
    defaultValues: {
        submissionType: undefined,
        certificateFile: undefined,
        expiryDate: undefined,
        bookingDate: undefined,
    }
  });

  const submissionType = form.watch("submissionType");

  const memoizedUserDataFetch = useCallback(async (uid: string) => {
    const userDocRef = doc(db, "users", uid);
    const userDocSnap = await getDoc(userDocRef);
    if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        if (userData.medicalInfo) {
            const info: ExistingMedicalInfo = {
                type: userData.medicalInfo.type,
                fileUrl: userData.medicalInfo.fileUrl,
                fileName: userData.medicalInfo.fileName,
                expiryDate: userData.medicalInfo.expiryDate?.toDate(),
                bookingDate: userData.medicalInfo.bookingDate?.toDate(),
            };
            setExistingMedicalInfo(info);
            // Pre-fill form
            form.reset({
                submissionType: info.type,
                expiryDate: info.expiryDate,
                bookingDate: info.bookingDate,
            });
            if(info.fileName) {
                setFileName(info.fileName);
            }
        }
    }
  }, [form]);

  useEffect(() => {
    if (user) {
        setIsLoading(true);
        memoizedUserDataFetch(user.uid).finally(() => setIsLoading(false));
    } else if (!authLoading) {
        setIsLoading(false);
    }
  }, [user, authLoading, memoizedUserDataFetch]);


  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Validate file type
      const allowedTypes = ["application/pdf", "image/jpeg", "image/png"];
      if (!allowedTypes.includes(file.type)) {
          toast({
              variant: "destructive",
              title: "Tipo di file non valido",
              description: "Puoi caricare solo file PDF, JPG o PNG.",
          });
          event.target.value = ""; // Clear the input
          return;
      }
      form.setValue("certificateFile", file, { shouldValidate: true })
      setFileName(file.name);
    }
  }

  const onSubmit = async (data: MedicalCertificateSchema) => {
    if (!user) {
        toast({ variant: "destructive", title: "Errore", description: "Utente non autenticato." });
        return;
    }
    
    if (data.submissionType === "certificate" && !data.certificateFile && !existingMedicalInfo?.fileUrl) {
         toast({ variant: "destructive", title: "File Mancante", description: "Per favore, carica il file del certificato." });
         return;
    }
    
    setIsSubmitting(true);

    try {
        const userDocRef = doc(db, "users", user.uid);
        let medicalInfo: any = {
            ...existingMedicalInfo,
            type: data.submissionType,
            updatedAt: serverTimestamp()
        };

        if (data.submissionType === "certificate" && data.expiryDate) {
            // Se un nuovo file è stato caricato, esegui l'upload
            if (data.certificateFile) {
                const fileRef = ref(storage, `medical-certificates/${user.uid}/${data.certificateFile.name}`);
                const snapshot = await uploadBytes(fileRef, data.certificateFile);
                const downloadURL = await getDownloadURL(snapshot.ref);
                medicalInfo.fileUrl = downloadURL;
                medicalInfo.fileName = data.certificateFile.name;
            }
            medicalInfo.expiryDate = Timestamp.fromDate(data.expiryDate);
            medicalInfo.bookingDate = null; // Rimuovi la data di prenotazione se si carica il certificato
        } else if (data.submissionType === "booking" && data.bookingDate) {
            medicalInfo.bookingDate = Timestamp.fromDate(data.bookingDate);
            // Non cancelliamo i dati del vecchio certificato, potrebbero servire
            // medicalInfo.fileUrl = null;
            // medicalInfo.fileName = null;
            // medicalInfo.expiryDate = null;
        }
        
        const dataToUpdate = {
             medicalCertificateSubmitted: true,
             medicalInfo: medicalInfo,
             updatedAt: serverTimestamp()
        };

        await updateDoc(userDocRef, dataToUpdate);

        toast({
            title: "Dati inviati con successo!",
            description: "Le tue informazioni mediche sono state aggiornate.",
        });
        
        router.push("/dashboard");

    } catch (error) {
        console.error("Errore durante l'invio dei dati medici:", error);
        toast({ variant: "destructive", title: "Errore", description: "Impossibile salvare i dati. Riprova." });
    } finally {
        setIsSubmitting(false);
    }
  };
  
    if (isLoading) {
      return (
          <div className="flex h-full w-full items-center justify-center">
             <Loader2 className="h-16 w-16 animate-spin text-primary" />
          </div>
      )
    }

  return (
    <div className="flex h-full w-full items-center justify-center">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Certificato Medico</CardTitle>
          <p className="text-sm font-medium text-foreground pt-1.5">
            Per completare la tua iscrizione, fornisci i dati relativi al tuo certificato medico per attività sportiva non agonistica, sono validi i certificati non agonistici in corso di validità rilasciati per qualsiasi sport o attività scolastiche.
          </p>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="submissionType"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Scegli la tua situazione attuale:</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value}
                        className="flex flex-col space-y-2"
                      >
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="certificate" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Ho già un certificato medico valido
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="booking" />
                          </FormControl>
                          <FormLabel className="font-normal">
                            Ho prenotato la visita medica
                          </FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {submissionType === 'certificate' && (
                <div className="space-y-4 rounded-md border p-4 animate-in fade-in-50">
                   <h4 className="font-semibold text-foreground">Carica o aggiorna il tuo certificato</h4>
                    <FormField
                        control={form.control}
                        name="certificateFile"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>File del certificato (PDF, JPG, PNG)</FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <Input 
                                            id="certificate-file-input"
                                            type="file"
                                            accept=".pdf,.jpg,.jpeg,.png"
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                            onChange={handleFileChange} 
                                        />
                                        <Label htmlFor="certificate-file-input" className="flex items-center justify-center w-full h-24 border-2 border-dashed rounded-md cursor-pointer hover:bg-muted">
                                            {fileName ? (
                                                <div className="flex items-center gap-2 text-green-600">
                                                   <CheckCircle className="h-5 w-5" />
                                                   <span>{fileName}</span>
                                                </div>
                                            ) : (
                                                 <div className="flex items-center gap-2 text-muted-foreground">
                                                    <UploadCloud className="h-5 w-5" />
                                                    <span>Clicca per scegliere un nuovo file</span>
                                                 </div>
                                            )}
                                        </Label>
                                    </div>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    {existingMedicalInfo?.fileUrl && (
                        <Button variant="outline" asChild className="w-full">
                           <Link href={existingMedicalInfo.fileUrl} target="_blank" rel="noopener noreferrer">
                                <Eye className="mr-2 h-4 w-4" />
                                Visualizza Certificato Caricato
                           </Link>
                        </Button>
                    )}
                  <FormField
                    control={form.control}
                    name="expiryDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data di scadenza del certificato</FormLabel>
                        <FormControl>
                           <DatePicker
                                value={field.value}
                                onChange={field.onChange}
                                disablePast
                            />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {submissionType === 'booking' && (
                <div className="space-y-4 rounded-md border p-4 animate-in fade-in-50">
                   <h4 className="font-semibold text-foreground">Inserisci la data della visita</h4>
                  <FormField
                    control={form.control}
                    name="bookingDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data della visita prenotata</FormLabel>
                        <FormControl>
                           <DatePicker
                                value={field.value}
                                onChange={field.onChange}
                                disablePast
                            />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" disabled={isSubmitting || !submissionType}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {existingMedicalInfo ? 'Aggiorna e vai alla Dashboard' : 'Completa e vai alla Dashboard'}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  )
}
