
"use client"

import { useState, useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { differenceInYears } from "date-fns"
import { auth, db } from "@/lib/firebase"
import { useAuthState } from "react-firebase-hooks/auth"
import { doc, getDoc, updateDoc } from "firebase/firestore"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// Schema combinato
const parentDataSchema = z.object({
    parentName: z.string().min(2, "Il nome del genitore è obbligatorio."),
    parentSurname: z.string().min(2, "Il cognome del genitore è obbligatorio."),
    parentTaxCode: z.string().length(16, "Il codice fiscale del genitore deve essere di 16 caratteri."),
});

const personalDataSchema = z.object({
  name: z.string().min(2, "Il nome è obbligatorio."),
  surname: z.string().min(2, "Il cognome è obbligatorio."),
  taxCode: z.string().length(16, "Il codice fiscale deve essere di 16 caratteri."),
  birthDate: z.date({ required_error: "La data di nascita è obbligatoria." }),
  birthPlace: z.string().min(1, "Il luogo di nascita è obbligatorio."),
  address: z.string().min(1, "L'indirizzo è obbligatorio."),
  streetNumber: z.string().min(1, "Il N° civico è obbligatorio."),
  city: z.string().min(1, "La città è obbligatoria."),
  zipCode: z.string().length(5, "Il CAP deve essere di 5 cifre."),
  province: z.string().length(2, "La sigla della provincia è obbligatoria."),
  phone: z.string().min(1, "Il numero di telefono è obbligatorio."),
  isMinor: z.boolean(),
  parentData: parentDataSchema.optional(),
}).superRefine((data, ctx) => {
    if (data.isMinor && !data.parentData) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["parentData.parentName"],
            message: "Dati del genitore richiesti per i minorenni.",
        });
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["parentData.parentSurname"],
            message: "Dati del genitore richiesti per i minorenni.",
        });
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["parentData.parentTaxCode"],
            message: "Dati del genitore richiesti per i minorenni.",
        });
    }
});


export type PersonalDataSchemaType = z.infer<typeof personalDataSchema>;

interface PersonalDataFormProps {
    title: string;
    description: string;
    buttonText: string;
    onFormSubmit: (data: PersonalDataSchemaType) => void;
}

// Funzioni di utilità per la formattazione
const capitalizeFirstLetter = (str: string) => {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};
const capitalizeWords = (str: string) => {
    if (!str) return str;
    return str.split(' ').map(word => capitalizeFirstLetter(word)).join(' ');
};

// Componente per il selettore della data
function DateOfBirthSelector({ value, onChange }: { value?: Date; onChange: (date?: Date) => void }) {
    const [day, setDay] = useState<string>(value ? String(value.getDate()) : "");
    const [month, setMonth] = useState<string>(value ? String(value.getMonth() + 1) : "");
    const [year, setYear] = useState<string>(value ? String(value.getFullYear()) : "");

    useEffect(() => {
        if (day && month && year) {
            const newDate = new Date(Number(year), Number(month) - 1, Number(day));
            if (!isNaN(newDate.getTime())) {
                onChange(newDate);
            }
        } else {
            onChange(undefined);
        }
    }, [day, month, year, onChange]);
    
    useEffect(() => {
        if (value) {
            setDay(String(value.getDate()));
            setMonth(String(value.getMonth() + 1));
            setYear(String(value.getFullYear()));
        }
    }, [value]);

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: currentYear - 1930 + 1 }, (_, i) => currentYear - i);
    const months = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: new Date(0, i).toLocaleString('it-IT', { month: 'long' }) }));
    const days = Array.from({ length: 31 }, (_, i) => i + 1);

    return (
        <div className="grid grid-cols-3 gap-2">
            <Select value={day} onValueChange={setDay}>
                <SelectTrigger><SelectValue placeholder="Giorno" /></SelectTrigger>
                <SelectContent>
                    {days.map(d => <SelectItem key={d} value={String(d)}>{d}</SelectItem>)}
                </SelectContent>
            </Select>
            <Select value={month} onValueChange={setMonth}>
                <SelectTrigger><SelectValue placeholder="Mese" /></SelectTrigger>
                <SelectContent>
                    {months.map(m => <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>)}
                </SelectContent>
            </Select>
            <Select value={year} onValueChange={setYear}>
                <SelectTrigger><SelectValue placeholder="Anno" /></SelectTrigger>
                <SelectContent>
                    {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                </SelectContent>
            </Select>
        </div>
    );
}

export function PersonalDataForm({ title, description, buttonText, onFormSubmit }: PersonalDataFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isMinor, setIsMinor] = useState<boolean | null>(null)
  const [user] = useAuthState(auth)
  const { toast } = useToast()
  
  const form = useForm<PersonalDataSchemaType>({
    resolver: zodResolver(personalDataSchema),
    mode: "onChange",
    defaultValues: {
        name: "",
        surname: "",
        taxCode: "",
        birthPlace: "",
        address: "",
        streetNumber: "",
        city: "",
        zipCode: "",
        province: "",
        phone: "",
        isMinor: false,
        parentData: {
            parentName: "",
            parentSurname: "",
            parentTaxCode: "",
        }
    }
  })

  const birthDate = form.watch("birthDate");

  useEffect(() => {
      if (birthDate) {
          const age = differenceInYears(new Date(), birthDate);
          const minor = age < 18;
          setIsMinor(minor);
          form.setValue("isMinor", minor, { shouldValidate: true });
          if (!minor) {
              form.setValue("parentData", undefined, { shouldValidate: true });
              // Pulisci gli errori se ce ne sono
               form.clearErrors(["parentData.parentName", "parentData.parentSurname", "parentData.parentTaxCode"]);
          }
      } else {
          setIsMinor(null);
      }
  }, [birthDate, form]);

  useEffect(() => {
    if (user) {
        const fetchUserData = async () => {
            const userDocRef = doc(db, "users", user.uid);
            const userDocSnap = await getDoc(userDocRef);
            if (userDocSnap.exists()) {
                const userData = userDocSnap.data();
                
                const [firstName, ...lastNameParts] = (userData.name || "").split(" ");
                
                const existingData: Partial<PersonalDataSchemaType> = {
                    name: firstName || "",
                    surname: lastNameParts.join(" ") || "",
                    taxCode: userData.taxCode || "",
                    birthDate: userData.birthDate?.toDate() || undefined,
                    birthPlace: userData.birthPlace || "",
                    address: userData.address || "",
                    streetNumber: userData.streetNumber || "",
                    city: userData.city || "",
                    zipCode: userData.zipCode || "",
                    province: userData.province || "",
                    phone: userData.phone || "",
                };
                
                if (userData.birthDate) {
                    const age = differenceInYears(new Date(), userData.birthDate.toDate());
                    const isMinor = age < 18;
                    existingData.isMinor = isMinor;
                    if (isMinor) {
                       existingData.parentData = userData.parentData || { parentName: "", parentSurname: "", parentTaxCode: "" };
                    }
                }
                
                form.reset(existingData);
            }
        };
        fetchUserData();
    }
  }, [user, form, form.reset]);


  const onSubmit = async (data: PersonalDataSchemaType) => {
    if (!user) {
        toast({ title: "Errore", description: "Utente non autenticato.", variant: "destructive" });
        return;
    }
    setIsLoading(true)
    try {
        const userDocRef = doc(db, "users", user.uid);
        
        const formattedData = {
            ...data,
            name: capitalizeFirstLetter(data.name),
            surname: capitalizeWords(data.surname),
            taxCode: data.taxCode.toUpperCase(),
            birthPlace: capitalizeWords(data.birthPlace),
            address: capitalizeWords(data.address),
            city: capitalizeWords(data.city),
            province: data.province.toUpperCase(),
            parentData: data.isMinor && data.parentData ? {
                ...data.parentData,
                parentName: capitalizeWords(data.parentData.parentName),
                parentSurname: capitalizeWords(data.parentData.parentSurname),
                parentTaxCode: data.parentData.parentTaxCode.toUpperCase(),
            } : undefined,
        };
        
        const fullName = `${formattedData.name} ${formattedData.surname}`.trim();
        const { isMinor, ...dataToSave } = formattedData;

        if (!isMinor) {
          delete (dataToSave as any).parentData;
        }

        await updateDoc(userDocRef, {
            ...dataToSave,
            name: fullName 
        });
        toast({ title: "Successo", description: "Dati anagrafici salvati correttamente." });
        onFormSubmit(formattedData)
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
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            
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
            
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
               <FormField
                  control={form.control}
                  name="birthDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data di Nascita</FormLabel>
                      <FormControl>
                         <DateOfBirthSelector value={field.value} onChange={field.onChange} />
                      </FormControl>
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
            
            <div className="space-y-2">
                <Label>Indirizzo di Residenza</Label>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                  <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                      <FormItem className="sm:col-span-3">
                          <FormControl>
                          <Input placeholder="Via / Piazza" {...field} />
                          </FormControl>
                          <FormMessage />
                      </FormItem>
                      )}
                  />
                   <FormField
                      control={form.control}
                      name="streetNumber"
                      render={({ field }) => (
                      <FormItem>
                          <FormControl>
                          <Input placeholder="N° Civico" {...field} />
                          </FormControl>
                          <FormMessage />
                      </FormItem>
                      )}
                  />
                </div>
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

            {isMinor === true && (
                <div className="space-y-4 rounded-md border bg-muted/50 p-4 animate-in fade-in-50">
                    <h4 className="font-semibold text-foreground">Dati del Genitore/Tutore</h4>
                     <p className="text-sm text-muted-foreground">
                        Poiché l'iscritto è minorenne, è obbligatorio compilare i dati di un genitore o tutore legale.
                    </p>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <FormField
                            control={form.control}
                            name="parentData.parentName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nome Genitore</FormLabel>
                                    <FormControl><Input placeholder="Nome" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="parentData.parentSurname"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Cognome Genitore</FormLabel>
                                    <FormControl><Input placeholder="Cognome" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                     <FormField
                        control={form.control}
                        name="parentData.parentTaxCode"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Codice Fiscale Genitore</FormLabel>
                                <FormControl><Input placeholder="Codice Fiscale" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
            )}

          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={isLoading || !form.formState.isValid}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {buttonText}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  )

    