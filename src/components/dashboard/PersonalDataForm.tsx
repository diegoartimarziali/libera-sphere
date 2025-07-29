
"use client"

import { useState, useEffect, useCallback } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { differenceInYears } from "date-fns"
import { auth, db } from "@/lib/firebase"
import { useAuthState } from "react-firebase-hooks/auth"
import { doc, getDoc } from "firebase/firestore"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import { DatePicker } from "@/components/ui/date-picker"


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

export function PersonalDataForm({ title, description, buttonText, onFormSubmit }: PersonalDataFormProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [isMinor, setIsMinor] = useState<boolean | null>(null)
  const [user] = useAuthState(auth)
  
  const form = useForm<PersonalDataSchemaType>({
    resolver: zodResolver(personalDataSchema),
    mode: "onBlur", // Changed to onBlur for better performance
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
              form.setValue("parentData", { parentName: "", parentSurname: "", parentTaxCode: "" }, { shouldValidate: true });
              form.clearErrors(["parentData.parentName", "parentData.parentSurname", "parentData.parentTaxCode"]);
          }
      } else {
          setIsMinor(null);
      }
  }, [birthDate, form]);

  const memoizedUserDataFetch = useCallback(async (uid: string) => {
    const userDocRef = doc(db, "users", uid);
    const userDocSnap = await getDoc(userDocRef);
    if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        
        const [firstName, ...lastNameParts] = (userData.name || "").split(" ");
        
        const defaultParentData = { parentName: "", parentSurname: "", parentTaxCode: "" };

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
            parentData: userData.parentData || defaultParentData
        };
        
        if (userData.birthDate?.toDate) {
            const age = differenceInYears(new Date(), userData.birthDate.toDate());
            existingData.isMinor = age < 18;
        } else {
            existingData.isMinor = false;
        }
        
        if (!existingData.parentData || Object.keys(existingData.parentData).length === 0) {
            existingData.parentData = defaultParentData;
        }
        
        form.reset(existingData);
        await form.trigger(); // Force validation after resetting the form
    }
  }, [form]);

  useEffect(() => {
    if (user) {
        setIsLoading(true);
        memoizedUserDataFetch(user.uid).finally(() => setIsLoading(false));
    } else {
        setIsLoading(false);
    }
  }, [user, memoizedUserDataFetch]);


  const onSubmit = async (data: PersonalDataSchemaType) => {
    setIsLoading(true)
    
    const formattedData: PersonalDataSchemaType = {
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
    
    onFormSubmit(formattedData)
    setIsLoading(false)
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
                      <Input placeholder="RSSMRA80A01H501U" {...field} value={field.value.toUpperCase()} />
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
                         <DatePicker 
                            value={field.value} 
                            onChange={field.onChange} 
                            disableFuture
                          />
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
                            <Input placeholder="Provincia (Sigla)" {...field} value={field.value.toUpperCase()} />
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
                                <FormControl><Input placeholder="Codice Fiscale" {...field} value={field.value.toUpperCase()} /></FormControl>
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
}

    