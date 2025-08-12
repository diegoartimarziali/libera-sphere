
"use client"

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, query, orderBy, addDoc, updateDoc, deleteDoc, Timestamp } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, PlusCircle, Trash2, Award } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Award {
    id: string;
    name: string;
    gymId?: string;
    lessonsCount?: number;
    pricePerLesson?: number;
    value?: number;
}

interface Gym {
    id: string;
    name: string;
}

const awardFormSchema = z.object({
    name: z.string().min(1, "La selezione del tipo di premio è obbligatoria."),
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
        defaultValues: { name: '' }
    });

    useEffect(() => {
        const fetchInitialData = async () => {
            setLoading(true);
            try {
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
        form.reset({
            name: '',
        });
        setIsFormOpen(true);
    };

    const openEditForm = (award: Award) => {
        // Questa funzione sarà estesa in futuro
        setEditingAward(award);
        form.reset({ 
            name: award.name,
        });
        setIsFormOpen(true);
    };

    const handleSaveAward = async (data: AwardFormData) => {
        // La logica di salvataggio sarà implementata nei prossimi passi
        console.log("Dati da salvare:", data);
        toast({ title: "Logica da implementare", description: "La creazione del premio sarà completata in futuro."});
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
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>Gestione Premi</CardTitle>
                        <CardDescription>Crea e gestisci i premi che possono essere accumulati dagli atleti.</CardDescription>
                    </div>
                     <Button onClick={openCreateForm}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Crea Premio
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
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
                                        <TableCell>{typeof award.pricePerLesson === 'number' ? `${award.pricePerLesson.toFixed(2)} €` : 'N/A'}</TableCell>
                                        <TableCell className="font-bold">{typeof award.value === 'number' ? `${award.value.toFixed(2)} €` : 'N/A'}</TableCell>
                                        <TableCell className="text-right space-x-1">
                                            <Button variant="outline" size="sm" onClick={() => openEditForm(award)}>Modifica</Button>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="destructive" size="sm"><Trash2 className="h-4 w-4" /></Button>
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

             <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingAward ? `Modifica Premio` : `Crea Nuovo Premio`}</DialogTitle>
                    </DialogHeader>
                     <Form {...form}>
                        <form onSubmit={form.handleSubmit(handleSaveAward)} className="space-y-4 py-4">
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Tipo di Premio</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Seleziona un tipo di premio..." />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="Bonus di Inizio Percorso 3 Lezioni">Bonus di Inizio Percorso 3 Lezioni</SelectItem>
                                            <SelectItem value="Bonus di Inizio Percorso 5 Lezioni">Bonus di Inizio Percorso 5 Lezioni</SelectItem>
                                            <SelectItem value="Premio Best Samurai">Premio Best Samurai</SelectItem>
                                            <SelectItem value="Premio Frequenza 1 lezione">Premio Frequenza 1 lezione</SelectItem>
                                            <SelectItem value="Premio Frequenza 2 lezioni">Premio Frequenza 2 lezioni</SelectItem>
                                            <SelectItem value="Premio Stage">Premio Stage</SelectItem>
                                            <SelectItem value="Altro premio">Altro premio</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                            
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
        </Card>
    );
}
