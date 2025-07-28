
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { auth, db, storage } from "@/lib/firebase"
import { useAuthState } from "react-firebase-hooks/auth"
import { doc, updateDoc, serverTimestamp } from "firebase/firestore"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { format } from "date-fns"
import { it } from "date-fns/locale"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { useToast } from "@/hooks/use-toast"
import { Loader2, UploadCloud, CalendarIcon, CheckCircle } from "lucide-react"

const schema = z.object({
    submissionType: z.enum(["certificate", "booking"], {
        required_error: "Devi selezionare un'opzione.",
    }),
    certificateFile: z.instanceof(File).optional(),
    expiryDate: z.date().optional(),
    bookingDate: z.date().optional(),
}).superRefine((data, ctx) => {
    if (data.submissionType === "certificate") {
        if (!data.certificateFile) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["certificateFile"],
                message: "Il file del certificato è obbligatorio.",
            });
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
  const [user] = useAuthState(auth)
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null);


  const form = useForm<MedicalCertificateSchema>({
    resolver: zodResolver(schema),
    defaultValues: {
        submissionType: undefined
    }
  });

  const submissionType = form.watch("submissionType");

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      form.setValue("certificateFile", file, { shouldValidate: true })
      setFileName(file.name);
    }
  }

  const onSubmit = async (data: MedicalCertificateSchema) => {
    if (!user) {
        toast({ variant: "destructive", title: "Errore", description: "Utente non autenticato." });
        return;
    }
    setIsLoading(true);

    try {
        const userDocRef = doc(db, "users", user.uid);
        let dataToUpdate: any = {
             medicalCertificateSubmitted: true,
             medicalInfo: {
                type: data.submissionType,
                updatedAt: serverTimestamp()
            }
        };

        if (data.submissionType === "certificate" && data.certificateFile && data.expiryDate) {
            const fileRef = ref(storage, `medical-certificates/${user.uid}/${data.certificateFile.name}`);
            const snapshot = await uploadBytes(fileRef, data.certificateFile);
            const downloadURL = await getDownloadURL(snapshot.ref);

            dataToUpdate.medicalInfo.fileUrl = downloadURL;
            dataToUpdate.medicalInfo.fileName = data.certificateFile.name;
            dataToUpdate.medicalInfo.expiryDate = data.expiryDate;
        } else if (data.submissionType === "booking" && data.bookingDate) {
            dataToUpdate.medicalInfo.bookingDate = data.bookingDate;
        }
        
        await updateDoc(userDocRef, dataToUpdate);

        toast({
            title: "Dati inviati con successo!",
            description: "Il tuo onboarding è completo. Benvenuto nella dashboard!",
        });
        
        router.push("/dashboard");

    } catch (error) {
        console.error("Errore durante l'invio dei dati medici:", error);
        toast({ variant: "destructive", title: "Errore", description: "Impossibile salvare i dati. Riprova." });
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="flex h-full w-full items-center justify-center">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Certificato Medico</CardTitle>
          <CardDescription>
            Per completare la tua iscrizione, fornisci i dati relativi al tuo certificato medico per attività sportiva non agonistica.
          </CardDescription>
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
                        defaultValue={field.value}
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
                   <h4 className="font-semibold text-foreground">Carica il tuo certificato</h4>
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
                                                    <span>Clicca per scegliere un file</span>
                                                 </div>
                                            )}
                                        </Label>
                                    </div>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                  <FormField
                    control={form.control}
                    name="expiryDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Data di scadenza del certificato</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className="w-full pl-3 text-left font-normal"
                              >
                                {field.value ? (
                                  format(field.value, "PPP", { locale: it })
                                ) : (
                                  <span>Scegli una data</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) => date < new Date()}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
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
                      <FormItem className="flex flex-col">
                        <FormLabel>Data della visita prenotata</FormLabel>
                         <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className="w-full pl-3 text-left font-normal"
                              >
                                {field.value ? (
                                  format(field.value, "PPP", { locale: it })
                                ) : (
                                  <span>Scegli una data</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) => date < new Date()}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" disabled={isLoading || !submissionType}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Completa e vai alla Dashboard
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  )
}
