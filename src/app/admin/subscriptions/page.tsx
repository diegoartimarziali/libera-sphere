
"use client"

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, query, orderBy, addDoc, updateDoc, deleteDoc, serverTimestamp, Timestamp, getDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { format, parseISO } from "date-fns";
import { it } from "date-fns/locale";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, PlusCircle, Trash2, Edit, Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface ActivitySettings {
    startDate?: Timestamp;
    endDate?: Timestamp;
}

interface Subscription {
    id: string;
    name: string;
    type: 'monthly' | 'seasonal';
    totalPrice: number;
    sumupLink: string;
    purchaseStartDate?: Timestamp;
    purchaseEndDate?: Timestamp;
    validityStartDate?: Timestamp;
    validityEndDate?: Timestamp;
    expiryWarningDate?: Timestamp;
}

// Helper per trasformare una data in una stringa 'yyyy-MM-dd' o undefined
const dateToInputString = (date?: Date | Timestamp): string | undefined => {
    if (!date) return undefined;
    const dateObj = date instanceof Timestamp ? date.toDate() : date;
    return format(dateObj, 'yyyy-MM-dd');
};

const subscriptionFormSchema = z.object({
    id: z.string().optional(),
    type: z.enum(['monthly', 'seasonal'], { required_error: "La tipologia è obbligatoria." }),
    name: z.string().min(3, "Il nome è obbligatorio (es. Abbonamento Ottobre)."),
    totalPrice: z.preprocess((val) => Number(String(val).replace(',', '.')), z.number().min(0, "Il prezzo non può essere negativo.")),
    sumupLink: z.string().url("Deve essere un URL SumUp valido.").optional().or(z.literal('')),
    purchaseStartDate: z.string().optional(),
    purchaseEndDate: z.string().optional(),
    validityStartDate: z.string({ required_error: "La data di inizio validità è obbligatoria." }),
    validityEndDate: z.string({ required_error: "La data di fine validità è obbligatoria." }),
    expiryWarningDate: z.string({ required_error: "La data per l'avviso di scadenza è obbligatoria." }),
}).refine(data => {
    if (data.purchaseStartDate && data.purchaseEndDate) {
        return parseISO(data.purchaseEndDate) >= parseISO(data.purchaseStartDate);
    }
    return true;
}, {
    message: "La data di fine acquisto non può precedere quella di inizio.",
    path: ["purchaseEndDate"],
}).refine(data => {
    return parseISO(data.validityEndDate) >= parseISO(data.validityStartDate);
}, {
    message: "La data di fine validità non può precedere quella di inizio.",
    path: ["validityEndDate"],
}).refine(data => {
    return parseISO(data.expiryWarningDate) <= parseISO(data.validityEndDate) && parseISO(data.expiryWarningDate) >= parseISO(data.validityStartDate);
}, {
    message: "La data di avviso deve essere compresa nel periodo di validità.",
    path: ["expiryWarningDate"],
});


type SubscriptionFormData = z.infer<typeof subscriptionFormSchema>;

export default function AdminSubscriptionsPage() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null);
    const [activitySettings, setActivitySettings] = useState<ActivitySettings | null>(null);

    const form = useForm<SubscriptionFormData>({
        resolver: zodResolver(subscriptionFormSchema),
        defaultValues: {
            type: 'monthly',
            name: '',
            totalPrice: 0,
            sumupLink: '',
            purchaseStartDate: '',
            purchaseEndDate: '',
            validityStartDate: '',
            validityEndDate: '',
            expiryWarningDate: ''
        }
    });
    
    const subscriptionType = form.watch('type');

    useEffect(() => {
        if (isFormOpen && !editingSubscription && subscriptionType === 'seasonal' && activitySettings?.startDate && activitySettings?.endDate) {
            form.setValue('validityStartDate', dateToInputString(activitySettings.startDate?.toDate()) || '', { shouldValidate: true });
            form.setValue('validityEndDate', dateToInputString(activitySettings.endDate?.toDate()) || '', { shouldValidate: true });
            form.setValue('name', 'Abbonamento Stagionale');
        } else if (isFormOpen && !editingSubscription && subscriptionType === 'monthly') {
             form.setValue('name', '');
             form.setValue('validityStartDate', '');
             form.setValue('validityEndDate', '');
        }
    }, [subscriptionType, activitySettings, form, editingSubscription, isFormOpen]);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
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
            const q = query(collection(db, "subscriptions"), orderBy("validityStartDate", "asc"));
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
            name: '',
            totalPrice: 0,
            sumupLink: '',
            purchaseStartDate: '',
            purchaseEndDate: '',
            validityStartDate: '',
            validityEndDate: '',
            expiryWarningDate: ''
        });
        setIsFormOpen(true);
    };

    const openEditForm = (sub: Subscription) => {
        setEditingSubscription(sub);
        form.reset({
            id: sub.id,
            type: sub.type,
            name: sub.name,
            totalPrice: sub.totalPrice,
            sumupLink: sub.sumupLink,
            purchaseStartDate: dateToInputString(sub.purchaseStartDate) || '',
            purchaseEndDate: dateToInputString(sub.purchaseEndDate) || '',
            validityStartDate: dateToInputString(sub.validityStartDate) || '',
            validityEndDate: dateToInputString(sub.validityEndDate) || '',
            expiryWarningDate: dateToInputString(sub.expiryWarningDate) || '',
        });
        setIsFormOpen(true);
    };

    const handleSaveSubscription = async (data: SubscriptionFormData) => {
        setIsSubmitting(true);
        
        const subData: { [key: string]: any } = {
            name: data.name,
            type: data.type,
            totalPrice: data.totalPrice,
            sumupLink: data.sumupLink || '',
            validityStartDate: Timestamp.fromDate(parseISO(data.validityStartDate)),
            validityEndDate: Timestamp.fromDate(parseISO(data.validityEndDate)),
            expiryWarningDate: Timestamp.fromDate(parseISO(data.expiryWarningDate)),
            purchaseStartDate: data.purchaseStartDate ? Timestamp.fromDate(parseISO(data.purchaseStartDate)) : null,
            purchaseEndDate: data.purchaseEndDate ? Timestamp.fromDate(parseISO(data.purchaseEndDate)) : null,
        };
        
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
        if (sub.validityStartDate && sub.validityEndDate) {
            return `${format(sub.validityStartDate.toDate(), 'dd/MM/yy')} - ${format(sub.validityEndDate.toDate(), 'dd/MM/yy')}`;
        }
        return 'Non definita';
    };


    return (
        <Card className="mx-2 sm:mx-4 lg:mx-6 p-3 sm:p-4 lg:p-6">
            <CardHeader className="p-3 sm:p-4 lg:p-6">
                <div className="flex flex-col gap-4">
                    <div>
                        <CardTitle className="text-xl sm:text-2xl font-bold">Gestione Abbonamenti</CardTitle>
                        <CardDescription className="text-sm sm:text-base text-muted-foreground mt-1">Crea e gestisci i piani di abbonamento per gli utenti.</CardDescription>
                    </div>
                    <Button onClick={openCreateForm} className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-medium h-11 sm:h-10">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        <span className="hidden sm:inline">Aggiungi Abbonamento</span>
                        <span className="sm:hidden">Nuovo Abbonamento</span>
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 lg:p-6">
                {loading ? (
                    <div className="flex justify-center items-center h-48"><Loader2 className="w-8 h-8 animate-spin" /></div>
                ) : (
                    <div className="rounded-lg border overflow-hidden">
                        <div className="overflow-x-auto">
                            <Table className="w-full">
                            <TableHeader>
                                <TableRow className="border-b">
                                    <TableHead className="text-xs sm:text-sm font-semibold px-2 sm:px-4 py-3">Abbonamento</TableHead>
                                    <TableHead className="text-xs sm:text-sm font-semibold hidden sm:table-cell px-2 sm:px-4 py-3">Prezzo</TableHead>
                                    <TableHead className="text-xs sm:text-sm font-semibold hidden md:table-cell px-2 sm:px-4 py-3">Validità</TableHead>
                                    <TableHead className="text-xs sm:text-sm font-semibold hidden lg:table-cell px-2 sm:px-4 py-3">Acquistabile</TableHead>
                                    <TableHead className="text-right text-xs sm:text-sm font-semibold px-2 sm:px-4 py-3 w-[100px] sm:w-[120px]">Azioni</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {subscriptions.length > 0 ? (
                                    subscriptions.map((sub) => (
                                        <TableRow key={sub.id} className="border-b hover:bg-muted/50">
                                            <TableCell className="px-2 sm:px-4 py-3">
                                                <div className="flex flex-col gap-2">
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant={sub.type === 'monthly' ? 'secondary' : 'default'} className="text-xs font-medium px-2 py-1">
                                                            {sub.type === 'monthly' ? '📅 Men' : '🗓️ Stag'}
                                                        </Badge>
                                                        <span className="font-semibold text-sm sm:text-base flex-1 min-w-0">
                                                            <span className="block truncate">{sub.name}</span>
                                                        </span>
                                                    </div>
                                                    <div className="text-xs text-muted-foreground sm:hidden space-y-1 pl-1">
                                                        <div className="flex items-center gap-1">
                                                            <span className="font-medium">💰 €{(sub.totalPrice || 0).toFixed(2)}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <span>📅 {renderValidity(sub)}</span>
                                                        </div>
                                                        {sub.purchaseEndDate && (
                                                            <div className="flex items-center gap-1 text-orange-600">
                                                                <span>⏰ Fino: {format(sub.purchaseEndDate.toDate(), 'dd/MM/yy')}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="hidden sm:table-cell px-2 sm:px-4 py-3 text-sm font-semibold">€{(sub.totalPrice || 0).toFixed(2)}</TableCell>
                                            <TableCell className="hidden md:table-cell px-2 sm:px-4 py-3 text-sm">{renderValidity(sub)}</TableCell>
                                            <TableCell className="hidden lg:table-cell px-2 sm:px-4 py-3 text-sm">{sub.purchaseEndDate ? format(sub.purchaseEndDate.toDate(), 'dd/MM/yyyy') : 'Sempre'}</TableCell>
                                            <TableCell className="text-right px-2 sm:px-4 py-3">
                                                <div className="flex flex-col sm:flex-row gap-2 sm:gap-1 sm:justify-end">
                                                <Button 
                                                    size="sm" 
                                                    onClick={() => openEditForm(sub)} 
                                                    className="bg-blue-600 hover:bg-blue-700 text-white h-8 sm:h-7 text-xs font-medium px-2 sm:px-3"
                                                    title="Modifica abbonamento"
                                                >
                                                    <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
                                                    <span className="hidden sm:inline ml-1">Modifica</span>
                                                </Button>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button 
                                                            size="sm" 
                                                            className="bg-red-600 hover:bg-red-700 text-white h-8 sm:h-7 text-xs font-medium px-2 sm:px-3"
                                                            title="Elimina abbonamento"
                                                        >
                                                            <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                                                            <span className="hidden sm:inline ml-1">Elimina</span>
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent className="w-[90vw] max-w-md">
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle className="text-base sm:text-lg">Sei sicuro?</AlertDialogTitle>
                                                            <AlertDialogDescription className="text-sm">
                                                                Questa azione è irreversibile. L'abbonamento <strong className="mx-1">{sub.name}</strong> sarà eliminato.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0">
                                                            <AlertDialogCancel className="w-full sm:w-auto">Annulla</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleDeleteSubscription(sub.id)} className="w-full sm:w-auto bg-red-600 hover:bg-red-700">
                                                                Sì, elimina
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center h-32 text-muted-foreground px-4 py-8">
                                            <div className="flex flex-col items-center gap-2">
                                                <div className="text-2xl">📋</div>
                                                <div className="text-sm font-medium">Nessun abbonamento trovato</div>
                                                <div className="text-xs">Creane uno per iniziare</div>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                            </Table>
                        </div>
                    </div>
                )}
            </CardContent>

            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent className="w-[96vw] sm:w-[90vw] max-w-3xl max-h-[90vh] bg-card [&>button]:text-amber-800 [&>button]:hover:text-amber-900 flex flex-col m-2">
                    <DialogHeader className="flex-shrink-0 pb-4 border-b">
                        <DialogTitle className="text-lg sm:text-xl font-bold text-amber-800 flex items-center gap-2">
                            {editingSubscription ? (
                                <><Edit className="w-5 h-5" /> Modifica Abbonamento</>
                            ) : (
                                <><PlusCircle className="w-5 h-5" /> Nuovo Abbonamento</>
                            )}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto px-1 sm:px-2 -mx-1 sm:-mx-2">
                        <Form {...form}>
                            <form id="subscription-form" onSubmit={form.handleSubmit(handleSaveSubscription)} className="space-y-5 sm:space-y-6 py-4 sm:py-5">
                                 <FormField control={form.control} name="type" render={({ field }) => (
                                    <FormItem className="space-y-2">
                                        <FormLabel className="text-amber-800 text-sm sm:text-base font-medium">Tipo Abbonamento</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger className="bg-white text-black h-11 text-base">
                                                    <SelectValue placeholder="Seleziona tipo..." />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent className="bg-white">
                                                <SelectItem value="monthly" className="text-black py-3">📅 Mensile</SelectItem>
                                                <SelectItem value="seasonal" className="text-black py-3">🗓️ Stagionale</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                                <FormField control={form.control} name="name" render={({ field }) => (
                                    <FormItem className="space-y-2">
                                        <FormLabel className="text-amber-800 text-sm sm:text-base font-medium">Nome Abbonamento</FormLabel>
                                        <FormControl>
                                            <Input 
                                                placeholder="Es. Abbonamento Ottobre" 
                                                className="bg-white text-black h-11 text-base" 
                                                {...field} 
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="totalPrice" render={({ field }) => (
                                    <FormItem className="space-y-2">
                                        <FormLabel className="text-amber-800 text-sm sm:text-base font-medium">Prezzo Totale (€)</FormLabel>
                                        <FormControl>
                                            <Input 
                                                type="number" 
                                                step="0.01" 
                                                placeholder="0.00"
                                                className="bg-white text-black h-11 text-base" 
                                                {...field} 
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            </div>
                            
                            <div className="space-y-3 rounded-lg border-2 border-amber-200 bg-amber-50/30 p-4">
                                 <h4 className="text-sm sm:text-base font-bold text-amber-800 flex items-center gap-2">
                                     📅 Periodo di Validità
                                 </h4>
                                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                                     <FormField control={form.control} name="validityStartDate" render={({ field }) => (
                                        <FormItem className="space-y-2">
                                            <FormLabel className="text-amber-800 text-sm sm:text-base font-medium">📍 Valido Dal</FormLabel>
                                            <FormControl>
                                                <Input 
                                                    type="date" 
                                                    className="bg-white text-black h-11 text-base" 
                                                    {...field} 
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                     <FormField control={form.control} name="validityEndDate" render={({ field }) => (
                                        <FormItem className="space-y-2">
                                            <FormLabel className="text-amber-800 text-sm sm:text-base font-medium">🏁 Valido Fino Al</FormLabel>
                                            <FormControl>
                                                <Input 
                                                    type="date" 
                                                    className="bg-white text-black h-11 text-base" 
                                                    {...field} 
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                 </div>
                                  {subscriptionType === 'seasonal' && activitySettings?.startDate && (
                                     <div className="text-xs sm:text-sm text-muted-foreground pt-2">
                                         Le date per l'abbonamento stagionale vengono pre-compilate automaticamente ma possono essere modificate: <strong>{format(activitySettings.startDate.toDate(), 'dd/MM/yy')} - {format(activitySettings.endDate?.toDate() || new Date(), 'dd/MM/yy')}</strong>.
                                     </div>
                                 )}
                            </div>
                            
                            <div className="space-y-3 rounded-lg border-2 border-blue-200 bg-blue-50/30 p-4">
                                <h4 className="text-sm sm:text-base font-bold text-amber-800 flex items-center gap-2">
                                    ⚙️ Impostazioni Avanzate
                                </h4>
                                <FormField control={form.control} name="expiryWarningDate" render={({ field }) => (
                                    <FormItem className="space-y-2">
                                        <FormLabel className="text-amber-800 text-sm sm:text-base font-medium">⚠️ Avviso Scadenza Dal</FormLabel>
                                        <FormControl>
                                            <Input 
                                                type="date" 
                                                className="bg-white text-black h-11 text-base" 
                                                {...field} 
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="sumupLink" render={({ field }) => (
                                    <FormItem className="space-y-2">
                                        <FormLabel className="text-amber-800 text-sm sm:text-base font-medium">💳 Link Pagamento SumUp (Opzionale)</FormLabel>
                                        <FormControl>
                                            <Input 
                                                className="bg-white text-black h-11 text-base" 
                                                {...field} 
                                                placeholder="https://checkout.sumup.com/..." 
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 mt-4">
                                     <FormField control={form.control} name="purchaseStartDate" render={({ field }) => (
                                        <FormItem className="space-y-2">
                                            <FormLabel className="text-amber-800 text-sm sm:text-base font-medium">🟢 Acquistabile Dal</FormLabel>
                                            <FormControl>
                                                <Input 
                                                    type="date" 
                                                    className="bg-white text-black h-11 text-base" 
                                                    {...field} 
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                     <FormField control={form.control} name="purchaseEndDate" render={({ field }) => (
                                        <FormItem className="space-y-2">
                                            <FormLabel className="text-amber-800 text-sm sm:text-base font-medium">🔴 Acquistabile Fino Al</FormLabel>
                                            <FormControl>
                                                <Input 
                                                    type="date" 
                                                    className="bg-white text-black h-11 text-base" 
                                                    {...field} 
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </div>
                            </div>
                            </form>
                        </Form>
                    </div>
                    
                    <DialogFooter className="flex-shrink-0 flex flex-col sm:flex-row gap-3 sm:gap-2 pt-4 sm:pt-5 border-t bg-card">
                        <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => setIsFormOpen(false)} 
                            className="w-full sm:w-auto h-11 text-base font-medium border-amber-200 text-amber-800 hover:text-amber-900 hover:bg-amber-50"
                        >
                            ❌ Annulla
                        </Button>
                        <Button 
                            type="submit" 
                            form="subscription-form"
                            disabled={isSubmitting} 
                            className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto h-11 text-base font-semibold shadow-sm"
                        >
                            {isSubmitting ? (
                                <><Loader2 className="animate-spin mr-2 h-4 w-4" /> Salvando...</>
                            ) : (
                                <>💾 Salva Abbonamento</>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}
