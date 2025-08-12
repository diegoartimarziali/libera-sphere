
"use client"

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, updateDoc, collection, getDocs, query, orderBy, addDoc, deleteDoc, where, Timestamp } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { differenceInYears } from 'date-fns';


import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, PlusCircle, Trash2, Award, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


interface Award {
    id: string;
    name: string;
    value: number; // Valore totale
    gymId?: string; // opzionale, se non c'è è per tutte
    lessonsCount?: number;
    pricePerLesson?: number;
}

interface Gym {
    id: string;
    name: string;
}

const awardFormSchema = z.object({
    name: z.string().min(3, "Il nome del premio è obbligatorio (min. 3 caratteri)."),
    gymId: z.string().optional(),
    lessonsCount: z.preprocess((val) => Number(val), z.number().min(0, "Il numero di lezioni non può essere negativo.")),
    pricePerLesson: z.preprocess((val) => Number(val), z.number().min(0, "Il valore per lezione non può essere negativo.")),
    value: z.number() // Questo verrà calcolato
});

type AwardFormData = z.infer<typeof awardFormSchema>;


export default function AdminAwardsPage() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [awards, setAwards] = useState<Award[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingAward, setEditingAward] = useState<Award | null>(null);

    const [allGyms, setAllGyms] = useState<Gym[]>([]);
    const [gymsMap, setGymsMap] = useState<Map<string, string>>(new Map());

    const form = useForm<AwardFormData>({
        resolver: zodResolver(awardFormSchema),
        defaultValues: { name: '', value: 0, lessonsCount: 0, pricePerLesson: 0 }
    });
    
    const lessonsCount = form.watch('lessonsCount');
    const pricePerLesson = form.watch('pricePerLesson');
    const totalValue = (lessonsCount || 0) * (pricePerLesson || 0);

    useEffect(() => {
        form.setValue('value', totalValue);
    }, [totalValue, form]);


    useEffect(() => {
        const fetchInitialData = async () => {
            setLoading(true);
            try {
                // Fetch gyms first
                const gymsSnapshot = await getDocs(query(collection(db, "gyms"), orderBy("name")));
                const gymsList = gymsSnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name } as Gym));
                setAllGyms(gymsList);
                const newGymsMap = new Map<string, string>();
                gymsList.forEach(gym => newGymsMap.set(gym.id, gym.name));
                setGymsMap(newGymsMap);

                await fetchAwards();
                
            } catch (error) {
                 console.error("Error fetching initial data:", error);
                 toast({ variant: "destructive", title: "Errore", description: "Impossibile caricare i dati iniziali." });
            } finally {
                setLoading(false);
            }
        };
        
        fetchInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [toast]);
    
    const fetchAwards = async () => {
        try {
            const awardsSnapshot = await getDocs(query(collection(db, "awards"), orderBy("name")));
            const awardsList = awardsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Award));
            setAwards(awardsList);
        } catch (error) {
            console.error("Error fetching awards:", error);
            toast({ variant: "destructive", title: "Errore", description: "Impossibile caricare i premi." });
        }
    }
    
    const openCreateForm = () => {
        setEditingAward(null);
        form.reset({ name: '', value: 0, lessonsCount: 0, pricePerLesson: 0, gymId: '' });
        setIsFormOpen(true);
    }

    const openEditForm = (award: Award) => {
        setEditingAward(award);
        form.reset({ 
            name: award.name, 
            value: award.value,
            lessonsCount: award.lessonsCount,
            pricePerLesson: award.pricePerLesson,
            gymId: award.gymId
        });
        setIsFormOpen(true);
    };

    const handleSaveAward = async (data: AwardFormData) => {
        setIsSubmitting(true);
        const awardData = {
            name: data.name,
            gymId: data.gymId || null,
            lessonsCount: data.lessonsCount,
            pricePerLesson: data.pricePerLesson,
            value: data.value,
        };

        try {
            if (editingAward) {
                const awardDocRef = doc(db, "awards", editingAward.id);
                await updateDoc(awardDocRef, awardData);
                toast({ title: "Premio aggiornato!", variant: "success" });
            } else {
                await addDoc(collection(db, "awards"), awardData);
                toast({ title: "Premio creato!", variant: "success" });
            }
            
            await fetchAwards();
            setIsFormOpen(false);
            setEditingAward(null);

        } catch (error) {
            console.error("Error saving award:", error);
            toast({ variant: "destructive", title: "Errore", description: "Impossibile salvare il premio." });
        } finally {
            setIsSubmitting(false);
        }
    };
    
     const handleDeleteAward = async (awardId: string) => {
        try {
             await deleteDoc(doc(db, "awards", awardId));
             toast({ title: "Premio eliminato", variant: "success" });
             await fetchAwards();
        } catch (error) {
            console.error("Error deleting award:", error);
            toast({ variant: "destructive", title: "Errore", description: "Impossibile eliminare il premio." });
        }
    }
    
    return (
        <div className="space-y-8">
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <Award className="h-8 w-8 text-primary" />
                        <div>
                            <CardTitle>Gestione Premi e Valori</CardTitle>
                            <CardDescription>Crea e gestisci i premi che possono essere accumulati dagli atleti.</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex justify-end mb-4">
                        <Button onClick={openCreateForm}>
                            <PlusCircle className="mr-2" /> Aggiungi Premio
                        </Button>
                    </div>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nome Premio</TableHead>
                                    <TableHead>Palestra</TableHead>
                                    <TableHead>N. Lezioni</TableHead>
                                    <TableHead>Valore Lezione</TableHead>
                                    <TableHead>Valore Totale</TableHead>
                                    <TableHead className="w-[180px] text-right">Azioni</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow><TableCell colSpan={6} className="text-center h-24"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></TableCell></TableRow>
                                ) : awards.length > 0 ? (
                                    awards.map((award) => (
                                        <TableRow key={award.id}>
                                            <TableCell className="font-medium">{award.name}</TableCell>
                                            <TableCell>{award.gymId ? gymsMap.get(award.gymId) || award.gymId : 'Tutte'}</TableCell>
                                            <TableCell>{award.lessonsCount || 'N/A'}</TableCell>
                                            <TableCell>{award.pricePerLesson?.toFixed(2) || 'N/A'} €</TableCell>
                                            <TableCell className="font-bold">{award.value.toFixed(2)} €</TableCell>
                                            <TableCell className="text-right space-x-1">
                                                <Button variant="outline" size="sm" onClick={() => openEditForm(award)}>Modifica</Button>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="destructive" size="sm"><Trash2 className="h-4 w-4 mr-1" />Elimina</Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Sei sicuro?</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                Eliminare il premio <strong className="mx-1">{award.name}</strong>? L'azione è irreversibile.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Annulla</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleDeleteAward(award.id)}>
                                                                Sì, elimina
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow><TableCell colSpan={6} className="text-center h-24 text-muted-foreground">Nessun premio trovato. Creane uno per iniziare.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

             <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingAward ? `Modifica Premio` : `Crea Nuovo Premio`}</DialogTitle>
                    </DialogHeader>
                     <Form {...form}>
                        <form onSubmit={form.handleSubmit(handleSaveAward)} className="space-y-4 py-4">
                             <FormField control={form.control} name="name" render={({ field }) => (
                                <FormItem><FormLabel>Nome del Premio</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                             <FormField control={form.control} name="gymId" render={({ field }) => (
                                <FormItem><FormLabel>Palestra</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Valido per tutte le palestre..." /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            <SelectItem value="">Tutte le Palestre</SelectItem>
                                            {allGyms.map(gym => (
                                                <SelectItem key={gym.id} value={gym.id}>{gym.id} - {gym.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                <FormMessage /></FormItem>
                            )} />
                            <div className="grid grid-cols-2 gap-4">
                                <FormField control={form.control} name="lessonsCount" render={({ field }) => (
                                    <FormItem><FormLabel>Numero Lezioni</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name="pricePerLesson" render={({ field }) => (
                                    <FormItem><FormLabel>Prezzo a Lezione (€)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                            </div>
                            <div>
                                <Label>Valore Totale Calcolato</Label>
                                <Input type="text" readOnly disabled value={`${totalValue.toFixed(2)} €`} className="font-bold text-lg h-12" />
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="ghost" onClick={() => setIsFormOpen(false)}>Annulla</Button>
                                <Button type="submit" disabled={isSubmitting}>
                                     {isSubmitting ? <Loader2 className="animate-spin mr-2"/> : null}
                                     Salva Premio
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
            
        </div>
    );
}
    