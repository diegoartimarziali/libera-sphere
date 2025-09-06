
"use client"

import { useState, useEffect, useCallback } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { differenceInYears, format, parseISO } from "date-fns"
import { auth, db } from "@/lib/firebase"
import { useAuthState } from "react-firebase-hooks/auth"
import { doc, getDoc, collection, getDocs, Timestamp } from "firebase/firestore"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import { updateUserTotalLessons } from '@/lib/updateUserTotalLessons';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"

// Helper per trasformare una data in una stringa 'yyyy-MM-dd' o undefined
const dateToInputString = (date?: Date | Timestamp): string | undefined => {
    if (!date) return undefined;
    const dateObj = date instanceof Timestamp ? date.toDate() : date;
    return format(dateObj, 'yyyy-MM-dd');
};

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
  birthDate: z.string({ required_error: "La data di nascita è obbligatoria." }).min(1, "La data di nascita è obbligatoria."),
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
    } else if (data.isMinor && data.parentData) {
        if (!data.parentData.parentName) {
            ctx.addIssue({ code: "custom", path: ["parentData.parentName"], message: "Il nome del genitore è obbligatorio." });
        }
        if (!data.parentData.parentSurname) {
            ctx.addIssue({ code: "custom", path: ["parentData.parentSurname"], message: "Il cognome del genitore è obbligatorio." });
        }
        if (!data.parentData.parentTaxCode || data.parentData.parentTaxCode.length !== 16) {
            ctx.addIssue({ code: "custom", path: ["parentData.parentTaxCode"], message: "Il codice fiscale del genitore deve essere di 16 caratteri." });
        }
    }
});


export type PersonalDataSchemaType = z.infer<typeof personalDataSchema>;

interface PersonalDataFormProps {
    title: string;
    description: string;
    buttonText: string;
    onFormSubmit: (data: PersonalDataSchemaType) => void;
    onBack?: () => void;
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

export function PersonalDataForm({ title, description, buttonText, onFormSubmit, onBack }: PersonalDataFormProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMinor, setIsMinor] = useState<boolean | null>(null)
  const [user] = useAuthState(auth)
  
  const form = useForm<PersonalDataSchemaType>({
    resolver: zodResolver(personalDataSchema),
    mode: "onChange",
    defaultValues: {
        name: "",
        surname: "",
        taxCode: "",
        birthDate: "",
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
        },
    }
  })

  const birthDate = form.watch("birthDate");

  useEffect(() => {
      if (birthDate) {
          try {
            const parsedDate = parseISO(birthDate);
            const age = differenceInYears(new Date(), parsedDate);
            const minor = age < 18;
            setIsMinor(minor);
            if (form.getValues("isMinor") !== minor) {
              form.setValue("isMinor", minor, { shouldValidate: true });
            }
            if (!minor) {
              form.setValue("parentData", undefined);
              form.clearErrors(["parentData.parentName", "parentData.parentSurname", "parentData.parentTaxCode"]);
            }
          } catch(e){
            // Invalid date string, do nothing
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
        
        const birthDateValue = userData.birthDate;
        let existingIsMinor = false;
        if(birthDateValue && birthDateValue.toDate){
             const age = differenceInYears(new Date(), birthDateValue.toDate());
             existingIsMinor = age < 18;
        }

        const existingData: Partial<PersonalDataSchemaType> = {
            name: userData.name || "",
            surname: userData.surname || "",
            taxCode: userData.taxCode || "",
            birthDate: dateToInputString(birthDateValue) || "",
            birthPlace: userData.birthPlace || "",
            address: userData.address || "",
            streetNumber: userData.streetNumber || "",
            city: userData.city || "",
            zipCode: userData.zipCode || "",
            province: userData.province || "",
            phone: userData.phone || "",
            isMinor: existingIsMinor,
        };
        
        if (existingIsMinor && userData.parentData) {
            existingData.parentData = {
                parentName: userData.parentData?.parentName || "",
                parentSurname: userData.parentData?.parentSurname || "",
                parentTaxCode: userData.parentData?.parentTaxCode || "",
            };
        } else {
            existingData.parentData = {
                parentName: "",
                parentSurname: "",
                parentTaxCode: "",
            };
        }

        form.reset(existingData);
        if(birthDateValue) {
           setIsMinor(existingIsMinor);
        }
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
    setIsSubmitting(true);

    const formattedData: PersonalDataSchemaType = {
        ...data,
        name: capitalizeWords(data.name),
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

    // Aggiorna totalLessons dopo la registrazione/modifica, leggendo i dati dal profilo utente
    if (user && user.uid) {
      const userDocRef = doc(db, "users", user.uid);
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        const gym = userData.gym;
        const discipline = userData.discipline;
        if (gym && discipline) {
          await updateUserTotalLessons(user.uid, gym, discipline);
        }
      }
    }

    onFormSubmit(formattedData)
    // Non impostare setIsSubmitting a false qui, perché la navigazione è gestita dal genitore
  }

  if (isLoading) {
      return (
          <Card>
              <CardHeader>
                  <CardTitle>{title}</CardTitle>
                  <CardDescription className="text-lg">{description}</CardDescription>
              </CardHeader>
              <CardContent className="flex h-64 items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin" />
              </CardContent>
          </Card>
      );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
  <CardDescription className="text-lg"><span className="font-bold">{description}</span></CardDescription>
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
                      <Input 
                        placeholder="RSSRSS33R33R333R"
                        maxLength={16}
                        value={(field.value || "").toUpperCase()}
                        onChange={e => {
                          // Limita a 16 caratteri e trasforma in maiuscolo
                          const val = e.target.value.slice(0, 16).toUpperCase();
                          field.onChange(val);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="phone"
                render={({ field }) => {
                  // Funzione per formattare il numero come 333-3333333
                  const formatPhone = (value: string) => {
                    const digits = value.replace(/\D/g, "").slice(0, 10);
                    if (digits.length <= 3) return digits;
                    return digits.slice(0, 3) + "-" + digits.slice(3);
                  };
                  const digits = (field.value || "").replace(/\D/g, "");
                  const isIncomplete = digits.length > 0 && digits.length < 10;
                  return (
                    <FormItem>
                      <FormLabel>Telefono</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Es. 333-3333333"
                          value={formatPhone(field.value || "")}
                          onChange={e => {
                            const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
                            field.onChange(digits);
                          }}
                          maxLength={11}
                        />
                      </FormControl>
                      <FormMessage />
                      {isIncomplete && (
                        <span className="text-sm text-red-600 font-semibold">Numero incompleto</span>
                      )}
                    </FormItem>
                  );
                }}
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
                         <Input type="date" {...field} />
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
                      <Input 
                        placeholder="Es. Roma"
                        value={field.value}
                        onChange={e => {
                          // Permetti solo lettere e spazi
                          let val = e.target.value.replace(/[^a-zA-Zàèéìòùç\s]/g, "");
                          // Prima lettera maiuscola, resto minuscolo
                          val = val.charAt(0).toUpperCase() + val.slice(1).toLowerCase();
                          field.onChange(val);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="space-y-2">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-4 items-end">
                  <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                      <FormItem className="sm:col-span-3">
                          <FormLabel>Indirizzo di Residenza</FormLabel>
                          <FormControl>
                          <Input
                            placeholder="Via / Piazza"
                            value={field.value}
                            onChange={e => {
                              // Permetti solo lettere, spazi e caratteri accentati, con capitalizzazione automatica e punto "."
                              let val = e.target.value.replace(/[^a-zA-Zàèéìòùç\s\.]/g, "");
                              // Prima lettera maiuscola per ogni parola
                              val = val.replace(/\b\w+/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
                              field.onChange(val);
                            }}
                          />
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
                          <FormLabel>N° civico</FormLabel>
                          <FormControl>
                          <Input 
                            placeholder="33"
                            value={field.value}
                            onChange={e => {
                              // Permetti numeri, lettere e "/"
                              const val = e.target.value.replace(/[^a-zA-Z0-9\/]/g, "");
                              field.onChange(val);
                            }}
                          />
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
              <FormLabel>Città</FormLabel>
              <FormControl>
                            <Input 
                              placeholder="Es. Roma"
                              value={field.value}
                              onChange={e => {
                                let val = e.target.value.replace(/[^a-zA-Zàèéìòùç\s]/g, "");
                                val = val.charAt(0).toUpperCase() + val.slice(1).toLowerCase();
                                field.onChange(val);
                              }}
                            />
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
              <FormLabel>CAP</FormLabel>
              <FormControl>
                            <Input 
                              placeholder="Es. 10100"
                              value={field.value}
                              maxLength={5}
                              onChange={e => {
                                // Permetti solo cifre, massimo 5
                                const val = e.target.value.replace(/\D/g, "").slice(0, 5);
                                field.onChange(val);
                              }}
                            />
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
              <FormLabel>Provincia</FormLabel>
              <FormControl>
                            <Input 
                              placeholder="Es. RM"
                              value={(field.value || "").toUpperCase()}
                              maxLength={2}
                              onChange={e => {
                                // Permetti solo lettere, massimo 2, sempre maiuscole
                                const val = e.target.value.replace(/[^a-zA-Z]/g, "").slice(0, 2).toUpperCase();
                                field.onChange(val);
                              }}
                            />
              </FormControl>
              <FormMessage />
            </FormItem>
            )}
          />
                </div>
            </div>

            {isMinor === true && (
                <div className="space-y-4 rounded-md border bg-muted/50 p-4 animate-in fade-in-50">
                    <h4 className="medical-upload-text text-2xl font-bold">Dati del Genitore/Tutore</h4>
           <p className="text-sm text-muted-foreground font-bold">
            Poiché l'iscritto è minorenne, è obbligatorio compilare i dati di un genitore o tutore legale.
          </p>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <FormField
                            control={form.control}
                            name="parentData.parentName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nome Genitore</FormLabel>
                                    <FormControl>
                                      <Input 
                                        placeholder="Nome"
                                        value={field.value}
                                        onChange={e => {
                                          let val = e.target.value.replace(/[^a-zA-Zàèéìòùç\s]/g, "");
                                          val = val.charAt(0).toUpperCase() + val.slice(1).toLowerCase();
                                          field.onChange(val);
                                        }}
                                      />
                                    </FormControl>
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
                                    <FormControl>
                                      <Input 
                                        placeholder="Cognome"
                                        value={field.value}
                                        onChange={e => {
                                          let val = e.target.value.replace(/[^a-zA-Zàèéìòùç\s]/g, "");
                                          val = val.charAt(0).toUpperCase() + val.slice(1).toLowerCase();
                                          field.onChange(val);
                                        }}
                                      />
                                    </FormControl>
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
                                <FormControl><Input placeholder="Codice Fiscale" {...field} value={(field.value || "").toUpperCase()} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
            )}
            
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button
              type="submit"
              className="w-full font-bold"
              style={{ backgroundColor: '#16a34a', color: '#fff' }}
              disabled={isSubmitting || Object.keys(form.formState.errors).length > 0}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {buttonText}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  )
}
