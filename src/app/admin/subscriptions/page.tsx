
"use client"

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, query, orderBy, addDoc, updateDoc, deleteDoc, serverTimestamp, Timestamp } from "firebase/firestore";
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
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface Subscription {
    id: string;
    name: string;
    description: string;
    price: number;
    type: 'monthly' | 'seasonal';
    sumupLink: string;
    purchaseStartDate?: Timestamp;
    purchaseEndDate?: Timestamp;
}

const subscriptionFormSchema = z.object({
    id: z.string().optional(),
    name: z.string().min(3, "Il nome è obbligatorio."),
    description: z.string().min(3, "La descrizione è obbligatoria."),
    price: z.preprocess((val) => Number(val), z.number().min(0, "Il prezzo non può essere negativo.")),
    type: z.enum(['monthly', 'seasonal'], { required_error: "La tipologia è obbligatoria." }),
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
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null);

    const form = useForm<SubscriptionFormData>({
        resolver: zodResolver(subscriptionFormSchema),
        defaultValues: {
            name: '',
            description: '',
            price: 0,
            type: 'monthly',
            sumupLink: '',
        }
    });

    const fetchSubscriptions = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, "subscriptions"), orderBy("name"));
            const querySnapshot = await getDocs(q);
            const subs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Subscription));
            setSubscriptions(subs);
        } catch (error) {
            console.error("Error fetching subscriptions: ", error);
            toast({ variant: "destructive", title: "Errore", description: "Impossibile caricare gli abbonamenti." });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSubscriptions();
    }, [toast]);

    const openCreateForm = () => {
        setEditingSubscription(null);
        form.reset({
            name: '',
            description: '',
            price: 0,
            type: 'monthly',
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
            name: sub.name,
            description: sub.description,
            price: sub.price,
            type: sub.type,
            sumupLink: sub.sumupLink,
            purchaseStartDate: sub.purchaseStartDate?.toDate(),
            purchaseEndDate: sub.purchaseEndDate?.toDate(),
        });
        setIsFormOpen(true);
    };

    const handleSaveSubscription = async (data: SubscriptionFormData) => {
        setIsSubmitting(true);
        const subData: Omit<Subscription, 'id'> = {
            name: data.name,
            description: data.description,
            price: data.price,
            type: data.type,
            sumupLink: data.sumupLink || '',
            purchaseStartDate: data.purchaseStartDate ? Timestamp.fromDate(data.purchaseStartDate) : undefined,
            purchaseEndDate: data.purchaseEndDate ? Timestamp.fromDate(data.purchaseEndDate) : undefined,
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
                                    <TableHead>Tipo</TableHead>
                                    <TableHead>Prezzo</TableHead>
                                    <TableHead>Periodo Acquisto</TableHead>
                                    <TableHead className="text-right">Azioni</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {subscriptions.length > 0 ? (
                                    subscriptions.map((sub) => (
                                        <TableRow key={sub.id}>
                                            <TableCell className="font-medium">{sub.name}</TableCell>
                                            <TableCell><Badge variant={sub.type === 'monthly' ? 'secondary' : 'default'}>{sub.type === 'monthly' ? 'Mensile' : 'Stagionale'}</Badge></TableCell>
                                            <TableCell>{sub.price.toFixed(2)} €</TableCell>
                                            <TableCell>
                                                {sub.purchaseStartDate && sub.purchaseEndDate
                                                    ? `${format(sub.purchaseStartDate.toDate(), 'dd/MM/yy')} - ${format(sub.purchaseEndDate.toDate(), 'dd/MM/yy')}`
                                                    : 'Sempre disponibile'}
                                            </TableCell>
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
                            <FormField control={form.control} name="name" render={({ field }) => (
                                <FormItem><FormLabel>Nome Abbonamento</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                             <FormField control={form.control} name="description" render={({ field }) => (
                                <FormItem><FormLabel>Descrizione (visibile all'utente)</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
                            )} />

                            <div className="grid grid-cols-2 gap-4">
                                <FormField control={form.control} name="price" render={({ field }) => (
                                    <FormItem><FormLabel>Prezzo (€)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name="type" render={({ field }) => (
                                    <FormItem><FormLabel>Tipo</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="monthly">Mensile</SelectItem><SelectItem value="seasonal">Stagionale</SelectItem></SelectContent></Select><FormMessage /></FormItem>
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
