
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
import { useToast } from "@/hooks/use-toast"
import { Loader2, UploadCloud, CheckCircle, Eye } from "lucide-react"
import { DatePicker } from "@/components/ui/date-picker"

interface ExistingMedicalInfo {
    type?: 'certificate';
    fileUrl?: string;
    fileName?: string;
    expiryDate?: Date;
}

const schema = z.object({
    certificateFile: z.instanceof(File).optional(),
    expiryDate: z.date({ required_error: "La data di scadenza è obbligatoria." }),
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
        certificateFile: undefined,
        expiryDate: undefined,
    }
  });

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
            };
            setExistingMedicalInfo(info);
            // Pre-fill form
            form.reset({
                expiryDate: info.expiryDate,
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
    
    if (!data.certificateFile && !existingMedicalInfo?.fileUrl) {
         toast({ variant: "destructive", title: "File Mancante", description: "Per favore, carica il file del certificato." });
         return;
    }
    
    setIsSubmitting(true);

    try {
        const userDocRef = doc(db, "users", user.uid);
        let medicalInfo: any = {
            ...existingMedicalInfo,
            type: 'certificate',
            updatedAt: serverTimestamp()
        };

        if (data.expiryDate) {
            // Se un nuovo file è stato caricato, esegui l'upload
            if (data.certificateFile) {
                const fileRef = ref(storage, `medical-certificates/${user.uid}/${data.certificateFile.name}`);
                const snapshot = await uploadBytes(fileRef, data.certificateFile);
                const downloadURL = await getDownloadURL(snapshot.ref);
                medicalInfo.fileUrl = downloadURL;
                medicalInfo.fileName = data.certificateFile.name;
            }
            medicalInfo.expiryDate = Timestamp.fromDate(data.expiryDate);
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
        
        router.push("/dashboard/liberasphere");

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
            Per proseguire con la tua iscrizione, carica il tuo certificato medico per attività sportiva non agonistica in corso di validità.
            Sono validi anche i certificati non agonistici rilasciati per qualsiasi altro sport o per attività scolastiche.
          </p>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-6">
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
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" disabled={isSubmitting || !form.formState.isValid}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {existingMedicalInfo ? 'Aggiorna e prosegui' : 'Salva e prosegui'}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  )
}
