"use client"

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, query, orderBy, addDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, PlusCircle, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Tipi e schema fuori dalla funzione
interface Award {
    id: string;
    name: string;
    value: number;
}

const awardFormSchema = z.object({
    name: z.string().min(1, "La selezione del tipo di premio è obbligatoria."),
    value: z.preprocess(
        (val) => Number(String(val).replace(',', '.')),
        z.number().nonnegative("Il valore non può essere negativo.")
    )
});

type AwardFormData = z.infer<typeof awardFormSchema>;

export default function AdminAwardsPage() {
    // Funzione per assegnare il premio selezionato all'utente selezionato
    const handleAssignAward = async () => {
        if (!selectedAward || !selectedUserId) return;
        try {
            await addDoc(collection(db, "userAwards"), {
                userId: selectedUserId,
                awardId: selectedAward.id,
                assignedAt: new Date()
            });
            toast({ title: "Premio assegnato!" });
            setIsAssignOpen(false);
            setSelectedUserId("");
        } catch (error) {
            toast({ variant: "destructive", title: "Errore", description: "Impossibile assegnare il premio." });
        }
    };
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [awards, setAwards] = useState<Award[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    // Stato per form creazione/modifica premio
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingAward, setEditingAward] = useState<Award | null>(null);
    // Stato per assegnazione premi
    const [isAssignOpen, setIsAssignOpen] = useState(false);
    const [selectedAward, setSelectedAward] = useState<Award | null>(null);
    const [selectedUserId, setSelectedUserId] = useState<string>("");
    const [users, setUsers] = useState<{id: string, name: string}[]>([]);

    // Funzione per aprire il dialog di assegnazione premio
    const openAssignDialog = (award: Award) => {
        setSelectedAward(award);
        setIsAssignOpen(true);
    };

    // Carica utenti per il select (esempio: collezione 'users')
    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const snap = await getDocs(collection(db, "users"));
                setUsers(snap.docs.map(doc => ({ id: doc.id, name: doc.data().name })));
            } catch (e) {
                toast({ variant: "destructive", title: "Errore", description: "Impossibile caricare gli utenti." });
            } finally {
                setLoading(false);
            }
        };
        fetchUsers();
    }, [toast]);

    const form = useForm<AwardFormData>({
        resolver: zodResolver(awardFormSchema),
        defaultValues: { name: '', value: 0 }
    });
    
    const fetchAwards = async () => {
        try {
            const awardsSnapshot = await getDocs(query(collection(db, "awards"), orderBy("name")));
            const awardsList = awardsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Award));
            setAwards(awardsList);
        } catch (error) {
            console.error("Error fetching awards:", error);
            toast({ variant: "destructive", title: "Errore", description: "Impossibile caricare i premi." });
        } finally {
            setLoading(false);
        }
    }
    
    const openCreateForm = () => {
        setEditingAward(null);
        form.reset({
            name: '',
            value: 0
        });
        setIsFormOpen(true);
    };

    const openEditForm = (award: Award) => {
        setEditingAward(award);
        form.reset({ 
            name: award.name,
            value: award.value,
        });
        setIsFormOpen(true);
    };

    const handleSaveAward = async (data: AwardFormData) => {
        setIsSubmitting(true);
        try {
            const awardData: Omit<Award, 'id'> = {
                name: data.name,
                value: data.value,
            };

            if (editingAward) {
                const awardRef = doc(db, "awards", editingAward.id);
                await updateDoc(awardRef, awardData);
                toast({ title: "Premio aggiornato!" });
            } else {
                await addDoc(collection(db, "awards"), awardData);
                toast({ title: "Premio creato!" });
            }

            await fetchAwards();
            setIsFormOpen(false);
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
             toast({ title: "Premio eliminato" });
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
                        <CardDescription>Crea e gestisci i premi e i bonus che possono essere accumulati dagli atleti.</CardDescription>
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
                                <TableHead>Valore</TableHead>
                                <TableHead className="w-[180px] text-right">Azioni</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={3} className="text-center h-24"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></TableCell></TableRow>
                            ) : awards.length > 0 ? (
                                awards.map((award) => (
                                    <TableRow key={award.id}>
                                        <TableCell className="font-medium">{award.name}</TableCell>
                                        <TableCell className="font-bold">{award.value.toFixed(2)} €</TableCell>
                                        <TableCell className="text-right space-x-1">
                                            <Button variant="secondary" size="sm" onClick={() => openAssignDialog(award)}>Assegna</Button>
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
            {/* Dialog di assegnazione premio */}
            <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Assegna Premio</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <label className="block font-medium mb-2">Seleziona utente</label>
                        <Select onValueChange={setSelectedUserId} value={selectedUserId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Seleziona utente..." />
                            </SelectTrigger>
                            <SelectContent>
                                {users.map(user => (
                                    <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => setIsAssignOpen(false)}>Annulla</Button>
                        <Button type="button" onClick={handleAssignAward} disabled={!selectedUserId}>Assegna</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow><TableCell colSpan={3} className="text-center h-24 text-muted-foreground">Nessun premio trovato. Creane uno per iniziare.</TableCell></TableRow>
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
                                            <SelectItem value="Bonus Inizio Percorso">Bonus Inizio Percorso</SelectItem>
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
                            
                             <FormField
                                control={form.control}
                                name="value"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Valore del Premio (€)</FormLabel>
                                     <FormControl>
                                        <Input type="number" step="0.01" placeholder="Es. 50.00" {...field} />
                                    </FormControl>
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


