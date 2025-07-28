
"use client"

import { useState, useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { format } from "date-fns"
import { it } from "date-fns/locale"
import { auth, db } from "@/lib/firebase"
import { useAuthState } from "react-firebase-hooks/auth"
import { doc, getDoc, updateDoc } from "firebase/firestore"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarIcon, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

// Schema per il primo step: Dati Anagrafici
const personalDataSchema = z.object({
  name: z.string().min(2, "Il nome è obbligatorio."),
  surname: z.string().min(2, "Il cognome è obbligatorio."),
  taxCode: z.string().min(16, "Il codice fiscale deve essere di 16 caratteri.").max(16, "Il codice fiscale deve essere di 16 caratteri."),
  birthDate: z.date({ required_error: "La data di nascita è obbligatoria." }),
  birthPlace: z.string().min(1, "Il luogo di nascita è obbligatorio."),
  address: z.string().min(1, "L'indirizzo è obbligatorio."),
  city: z.string().min(1, "La città è obbligatoria."),
  zipCode: z.string().min(5, "Il CAP deve essere di 5 cifre.").max(5, "Il CAP deve essere di 5 cifre."),
  province: z.string().min(2, "La sigla della provincia è obbligatoria.").max(2, "La sigla della provincia è obbligatoria."),
  phone: z.string().min(1, "Il numero di telefono è obbligatorio."),
})

// Componente per lo Step 1
function PersonalDataStep({ onNext }: { onNext: (data: z.infer<typeof personalDataSchema>) => void }) {
  const [isLoading, setIsLoading] = useState(false)
  const [user] = useAuthState(auth)
  const { toast } = useToast()
  
  const form = useForm<z.infer<typeof personalDataSchema>>({
    resolver: zodResolver(personalDataSchema),
    defaultValues: {
        name: "",
        surname: "",
        taxCode: "",
        birthPlace: "",
        address: "",
        city: "",
        zipCode: "",
        province: "",
        phone: "",
    }
  })

  useEffect(() => {
    if (user) {
        const fetchUserData = async () => {
            const userDocRef = doc(db, "users", user.uid);
            const userDocSnap = await getDoc(userDocRef);
            if (userDocSnap.exists()) {
                const userData = userDocSnap.data();
                // Pre-fill form with existing data
                const [name, ...surnameParts] = (userData.name || "").split(" ");
                form.reset({
                    name: name || "",
                    surname: surnameParts.join(" ") || "",
                    taxCode: userData.taxCode || "",
                    birthDate: userData.birthDate?.toDate() || undefined,
                    birthPlace: userData.birthPlace || "",
                    address: userData.address || "",
                    city: userData.city || "",
                    zipCode: userData.zipCode || "",
                    province: userData.province || "",
                    phone: userData.phone || "",
                });
            }
        };
        fetchUserData();
    }
  }, [user, form]);


  const onSubmit = async (data: z.infer<typeof personalDataSchema>) => {
    if (!user) {
        toast({ title: "Errore", description: "Utente non autenticato.", variant: "destructive" });
        return;
    }
    setIsLoading(true)
    try {
        const userDocRef = doc(db, "users", user.uid);
        // Combine name and surname for the 'name' field in Firestore
        const fullName = `${data.name} ${data.surname}`.trim();
        await updateDoc(userDocRef, {
            ...data,
            name: fullName // We save the full name in the main 'name' field
        });
        toast({ title: "Successo", description: "Dati anagrafici salvati correttamente." });
        onNext(data)
    } catch (error) {
        console.error("Errore salvataggio dati anagrafici:", error)
        toast({ title: "Errore", description: "Impossibile salvare i dati. Riprova.", variant: "destructive" });
    } finally {
        setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Passo 1: Dati Anagrafici</CardTitle>
        <CardDescription>
          Completa le tue informazioni personali per procedere con l'iscrizione. Questi dati verranno salvati per future iscrizioni.
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            
            {/* Nome e Cognome */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                 <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Nome</FormLabel>
                        <FormControl>
                        <Input placeholder="Mario" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="surname"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Cognome</FormLabel>
                        <FormControl>
                        <Input placeholder="Rossi" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
            </div>

            {/* Codice Fiscale e Telefono */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="taxCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Codice Fiscale</FormLabel>
                    <FormControl>
                      <Input placeholder="RSSMRA80A01H501U" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefono</FormLabel>
                    <FormControl>
                      <Input placeholder="3331234567" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            {/* Data e Luogo di Nascita */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField
                  control={form.control}
                  name="birthDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Data di Nascita</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP", { locale: it })
                              ) : (
                                <span>Seleziona una data</span>
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
                            disabled={(date) =>
                              date > new Date() || date < new Date("1930-01-01")
                            }
                            initialFocus
                            captionLayout="dropdown-buttons"
                            fromYear={1930}
                            toYear={new Date().getFullYear()}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
               <FormField
                control={form.control}
                name="birthPlace"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Comune di Nascita</FormLabel>
                    <FormControl>
                      <Input placeholder="Es. Roma" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            {/* Indirizzo di Residenza */}
            <div className="space-y-2">
                <Label>Indirizzo di Residenza</Label>
                <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                    <FormItem className="!mt-0">
                        <FormControl>
                        <Input placeholder="Via / Piazza" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <FormField
                        control={form.control}
                        name="city"
                        render={({ field }) => (
                        <FormItem>
                            <FormControl>
                            <Input placeholder="Città" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="zipCode"
                        render={({ field }) => (
                        <FormItem>
                            <FormControl>
                            <Input placeholder="CAP" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="province"
                        render={({ field }) => (
                        <FormItem>
                            <FormControl>
                            <Input placeholder="Provincia (Sigla)" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                </div>
            </div>

          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Prosegui
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  )
}

// Componente per lo Step 2 (placeholder)
function HealthStep({ onBack }: { onBack: () => void }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Passo 2: Certificato Medico</CardTitle>
                <CardDescription>Work in progress...</CardDescription>
            </CardHeader>
            <CardContent>
                <p>Qui andrà il modulo per caricare il certificato medico.</p>
            </CardContent>
            <CardFooter className="justify-between">
                <Button variant="outline" onClick={onBack}>Indietro</Button>
                <Button>Prosegui</Button>
            </CardFooter>
        </Card>
    )
}


export default function ClassSelectionPage() {
    const [step, setStep] = useState(1)
    const [formData, setFormData] = useState({})

    const handleNextStep1 = (data: z.infer<typeof personalDataSchema>) => {
        setFormData(prev => ({ ...prev, ...data }))
        setStep(2)
    }

    const handleBack = () => {
        setStep(prev => prev - 1)
    }

    return (
        <div className="flex w-full flex-col items-center">
            <div className="mb-8 text-center">
                <h1 className="text-3xl font-bold">Iscrizione al Passaporto Selezioni</h1>
                <p className="mt-2 text-muted-foreground">
                    Completa la procedura per accedere alle lezioni di selezione.
                </p>
            </div>
            
            <div className="w-full max-w-3xl">
                {step === 1 && <PersonalDataStep onNext={handleNextStep1} />}
                {step === 2 && <HealthStep onBack={handleBack} />}
            </div>
        </div>
    )
}
