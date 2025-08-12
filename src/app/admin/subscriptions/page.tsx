
"use client"

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, query, orderBy, addDoc, updateDoc, deleteDoc, serverTimestamp, Timestamp, getDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { format } from "date-fns";
import { it } from "date-fns/locale";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, PlusCircle, Trash2, Edit } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DatePicker } from "@/components/ui/date-picker";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Calendar } from "lucide-react";

interface Gym {
    id: string;
    name: string;
}

interface ActivitySettings {
    startDate?: Timestamp;
    endDate?: Timestamp;
}

interface Subscription {
    id: string;
    name: string;
    type: 'monthly' | 'seasonal';
    gymIds?: string[];
    lessonsPerMonth?: number;
    totalPrice: number;
    sumupLink: string;
    purchaseStartDate?: Timestamp;
    purchaseEndDate?: Timestamp;
    validityStartDate?: Timestamp;
    validityEndDate?: Timestamp;
}

const subscriptionFormSchema = z.object({
    id: z.string().optional(),
    type: z.enum(['monthly', 'seasonal'], { required_error: "La tipologia è obbligatoria." }),
    totalPrice: z.preprocess((val) => Number(String(val).replace(',', '.')), z.number().min(0, "Il prezzo non può essere negativo.")),
    sumupLink: z.string().url("Deve essere un URL SumUp valido.").optional().or(z.literal('')),
    purchaseStartDate: z.date().optional(),
    purchaseEndDate: z.date().optional(),
}).refine(data => {
    if (data.purchaseStartDate && data.purchaseEndDate) {
        return data.purchaseEndDate >= data.purchaseStartDate;
    }
    return true;
}, {
    message: "La data di fine acquisto non può precedere quella di inizio.",
    path: ["purchaseEndDate"],
});

type SubscriptionFormData = z.infer<typeof subscriptionFormSchema>;

export default function AdminSubscriptionsPage() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [gyms, setGyms] = useState<Gym[]>([]);
    const [gymsMap, setGymsMap] = useState<Map<string, string>>(new Map());
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null);
    const [activitySettings, setActivitySettings] = useState<ActivitySettings | null>(null);

    const form = useForm<SubscriptionFormData>({
        resolver: zodResolver(subscriptionFormSchema),
        defaultValues: {
            type: 'monthly',
            totalPrice: 0,
            sumupLink: '',
        }
    });
    
    const subscriptionType = form.watch('type');

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            const gymsSnapshot = await getDocs(query(collection(db, "gyms"), orderBy("name")));
            const gymsList = gymsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Gym));
            setGyms(gymsList);
            const newGymsMap = new Map<string, string>();
            gymsList.forEach(gym => newGymsMap.set(gym.id, `${gym.id} - ${gym.name}`));
            setGymsMap(newGymsMap);
            
            const activitySettingsSnap = await getDoc(doc(db, "settings", "activity"));
            if (activitySettingsSnap.exists()) {
                setActivitySettings(activitySettingsSnap.data() as ActivitySettings);
            } else {
                 toast({ variant: "destructive", title: "Impostazioni mancanti", description: "Le impostazioni di validità della stagione (settings/activity) non sono state trovate." });
            }

            await fetchSubscriptions();

        } catch (error) {
            console.error("Error fetching initial data: ", error);
            toast({ variant: "destructive", title: "Errore", description: "Impossibile caricare i dati." });
        } finally {
            setLoading(false);
        }
    };

    const fetchSubscriptions = async () => {
        try {
            const q = query(collection(db, "subscriptions"), orderBy("type"));
            const querySnapshot = await getDocs(q);
            const subs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Subscription));
            setSubscriptions(subs);
        } catch (error) {
            console.error("Error fetching subscriptions: ", error);
            toast({ variant: "destructive", title: "Errore", description: "Impossibile caricare gli abbonamenti." });
        }
    };

    useEffect(() => {
        fetchInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const openCreateForm = () => {
        setEditingSubscription(null);
        form.reset({
            type: 'monthly',
            totalPrice: 0,
            sumupLink: '',
            purchaseStartDate: undefined,
            purchaseEndDate: undefined
        });
        setIsFormOpen(true);
    };

    const openEditForm = (sub: Subscription) => {
        setEditingSubscription(sub);
        form.reset({
            id: sub.id,
            type: sub.type,
            totalPrice: sub.totalPrice,
            sumupLink: sub.sumupLink,
            purchaseStartDate: sub.purchaseStartDate?.toDate(),
            purchaseEndDate: sub.purchaseEndDate?.toDate(),
        });
        setIsFormOpen(true);
    };

    const handleSaveSubscription = async (data: SubscriptionFormData) => {
        setIsSubmitting(true);
        
        const subData: { [key: string]: any } = {
            name: data.type === 'monthly' ? "Abbonamento Mensile" : "Abbonamento Stagionale",
            type: data.type,
            gymIds: [],
            totalPrice: data.totalPrice,
            sumupLink: data.sumupLink || '',
            lessonsPerMonth: null,
        };
        
        if (data.purchaseStartDate) {
            subData.purchaseStartDate = Timestamp.fromDate(data.purchaseStartDate);
        }
        if (data.purchaseEndDate) {
            subData.purchaseEndDate = Timestamp.fromDate(data.purchaseEndDate);
        }
        
        if (data.type === 'seasonal' && activitySettings) {
            subData.validityStartDate = activitySettings.startDate;
            subData.validityEndDate = activitySettings.endDate;
        } else {
             subData.validityStartDate = null;
             subData.validityEndDate = null;
        }

        try {
            if (editingSubscription) {
                const subDocRef = doc(db, "subscriptions", editingSubscription.id);
                await updateDoc(subDocRef, subData);
                toast({ title: "Abbonamento aggiornato!", variant: "success" });
            } else {
                await addDoc(collection(db, "subscriptions"), subData);
                toast({ title: "Abbonamento creato!", variant: "success" });
            }
            await fetchSubscriptions();
            setIsFormOpen(false);
            setEditingSubscription(null);
        } catch (error) {
            console.error("Error saving subscription:", error);
            toast({ variant: "destructive", title: "Errore", description: "Impossibile salvare l'abbonamento." });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteSubscription = async (subId: string) => {
        try {
            await deleteDoc(doc(db, "subscriptions", subId));
            toast({ title: "Abbonamento eliminato", variant: "success" });
            await fetchSubscriptions();
        } catch (error) {
            console.error("Error deleting subscription:", error);
            toast({ variant: "destructive", title: "Errore", description: "Impossibile eliminare l'abbonamento." });
        }
    };
    
    const renderValidity = (sub: Subscription) => {
        if (sub.type === 'seasonal' && sub.validityStartDate && sub.validityEndDate) {
            return `${format(sub.validityStartDate.toDate(), 'dd/MM/yy')} - ${format(sub.validityEndDate.toDate(), 'dd/MM/yy')}`;
        }
        if (sub.purchaseStartDate && sub.purchaseEndDate) {
            return `${format(sub.purchaseStartDate.toDate(), 'dd/MM/yy')} - ${format(sub.purchaseEndDate.toDate(), 'dd/MM/yy')}`;
        }
        return 'Sempre disponibile';
    };


    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>Gestione Abbonamenti</CardTitle>
                        <CardDescription>Crea e gestisci i piani di abbonamento per gli utenti.</CardDescription>
                    </div>
                    <Button onClick={openCreateForm}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Aggiungi Abbonamento
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="flex justify-center items-center h-48"><Loader2 className="w-8 h-8 animate-spin" /></div>
                ) : (
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nome</TableHead>
                                    <TableHead>Palestre</TableHead>
                                    <TableHead>Prezzo Totale</TableHead>
                                    <TableHead>Validità</TableHead>
                                    <TableHead className="text-right">Azioni</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {subscriptions.length > 0 ? (
                                    subscriptions.map((sub) => (
                                        <TableRow key={sub.id}>
                                            <TableCell className="font-medium">
                                                <Badge variant={sub.type === 'monthly' ? 'secondary' : 'default'}>{sub.name}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                {'Tutte le Palestre'}
                                            </TableCell>
                                            <TableCell>{(sub.totalPrice || 0).toFixed(2)} €</TableCell>
                                            <TableCell>{renderValidity(sub)}</TableCell>
                                            <TableCell className="text-right space-x-2">
                                                <Button variant="outline" size="sm" onClick={() => openEditForm(sub)}>
                                                    <Edit className="h-4 w-4 mr-1" />
                                                    Modifica
                                                </Button>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="destructive" size="sm">
                                                            <Trash2 className="h-4 w-4 mr-1" />
                                                            Elimina
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Sei sicuro?</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                Questa azione è irreversibile. L'abbonamento <strong className="mx-1">{sub.name}</strong> sarà eliminato.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Annulla</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleDeleteSubscription(sub.id)}>
                                                                Sì, elimina
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                                            Nessun abbonamento trovato. Creane uno per iniziare.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>

            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{editingSubscription ? "Modifica Abbonamento" : "Crea Nuovo Abbonamento"}</DialogTitle>
                    </DialogHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(handleSaveSubscription)} className="space-y-4 py-4">
                             <FormField control={form.control} name="type" render={({ field }) => (
                                <FormItem><FormLabel>Tipo</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="monthly">Mensile</SelectItem><SelectItem value="seasonal">Stagionale</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                            )} />

                             {subscriptionType === 'seasonal' && activitySettings && (
                                <div className="space-y-2">
                                    <FormLabel>Validità Stagione</FormLabel>
                                    <div className="flex items-center gap-2 text-sm p-3 rounded-md border bg-muted">
                                        <Calendar className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-muted-foreground">Dal</span>
                                        <span className="font-semibold text-foreground">{activitySettings.startDate ? format(activitySettings.startDate.toDate(), 'dd/MM/yyyy') : 'N/D'}</span>
                                        <span className="text-muted-foreground">al</span>
                                        <span className="font-semibold text-foreground">{activitySettings.endDate ? format(activitySettings.endDate.toDate(), 'dd/MM/yyyy') : 'N/D'}</span>
                                    </div>
                                </div>
                            )}
                            
                            <div className="space-y-2">
                                <FormField control={form.control} name="totalPrice" render={({ field }) => (
                                   <FormItem><FormLabel>Prezzo Totale Abbonamento (€)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                               )} />
                            </div>

                             <FormField control={form.control} name="sumupLink" render={({ field }) => (
                                <FormItem><FormLabel>Link Pagamento SumUp (Opzionale)</FormLabel><FormControl><Input {...field} placeholder="https://..." /></FormControl><FormMessage /></FormItem>
                            )} />
                            
                            <div className="space-y-2 rounded-md border p-4">
                                <h4 className="text-sm font-medium">Periodo di Acquistabilità (Opzionale)</h4>
                                <p className="text-xs text-muted-foreground">Lascia vuoto per rendere l'abbonamento sempre acquistabile (es. mensili). Imposta le date per abbonamenti a tempo (es. stagionali).</p>
                                <div className="grid grid-cols-2 gap-4 pt-2">
                                     <FormField control={form.control} name="purchaseStartDate" render={({ field }) => (
                                        <FormItem><FormLabel>Acquistabile Dal</FormLabel><FormControl><DatePicker value={field.value} onChange={field.onChange} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                     <FormField control={form.control} name="purchaseEndDate" render={({ field }) => (
                                        <FormItem><FormLabel>Acquistabile Fino Al</FormLabel><FormControl><DatePicker value={field.value} onChange={field.onChange} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                </div>
                            </div>

                            <DialogFooter>
                                <Button type="button" variant="ghost" onClick={() => setIsFormOpen(false)}>Annulla</Button>
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting && <Loader2 className="animate-spin mr-2" />}
                                    Salva
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
        </Card>
    );
}
