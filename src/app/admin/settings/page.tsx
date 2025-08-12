
"use client"

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";

const settingsSchema = z.object({
  subscriptionWarningDays: z.preprocess(
    (val) => Number(val),
    z.number().int().min(0, "Il valore non può essere negativo.")
  ),
});

type SettingsFormData = z.infer<typeof settingsSchema>;

export default function AdminSettingsPage() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<SettingsFormData>({
        resolver: zodResolver(settingsSchema),
        defaultValues: {
            subscriptionWarningDays: 4, // Un valore di default ragionevole
        }
    });

    useEffect(() => {
        const fetchSettings = async () => {
            setLoading(true);
            try {
                const docRef = doc(db, "settings", "expirations");
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    form.reset(docSnap.data());
                }
            } catch (error) {
                console.error("Error fetching settings: ", error);
                toast({ variant: "destructive", title: "Errore", description: "Impossibile caricare le impostazioni." });
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
    }, [form, toast]);

    const onSubmit = async (data: SettingsFormData) => {
        setIsSubmitting(true);
        try {
            const docRef = doc(db, "settings", "expirations");
            await setDoc(docRef, data, { merge: true });
            toast({
                title: "Impostazioni Salvate!",
                description: "Le tue configurazioni sono state aggiornate.",
                variant: "success",
            });
        } catch (error) {
            console.error("Error saving settings: ", error);
            toast({ variant: "destructive", title: "Errore", description: "Impossibile salvare le impostazioni." });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Impostazioni Generali</CardTitle>
                <CardDescription>
                    Configura i parametri globali dell'applicazione.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="flex justify-center items-center h-48">
                        <Loader2 className="w-8 h-8 animate-spin" />
                    </div>
                ) : (
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                            <div className="space-y-4">
                                <h3 className="text-lg font-medium">Scadenze</h3>
                                <Separator />
                                 <FormField
                                    control={form.control}
                                    name="subscriptionWarningDays"
                                    render={({ field }) => (
                                        <FormItem className="max-w-md">
                                            <FormLabel>Preavviso Scadenza Abbonamento (Giorni)</FormLabel>
                                            <FormControl>
                                                <Input type="number" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                            <p className="text-sm text-muted-foreground pt-1">
                                                Indica quanti giorni prima della scadenza un abbonamento deve essere considerato "In scadenza".
                                            </p>
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="flex justify-end">
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Salva Impostazioni
                                </Button>
                            </div>
                        </form>
                    </Form>
                )}
            </CardContent>
        </Card>
    );
}
