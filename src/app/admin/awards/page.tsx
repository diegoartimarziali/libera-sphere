
"use client"

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, query, orderBy, addDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { sendPushNotification } from "@/hooks/use-push-notification";
import { createUserAward } from "@/lib/createUserAward";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, PlusCircle, Trash2, UserPlus, Pencil } from "lucide-react";
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
    residuo: number;
    used: boolean;
    usedValue: number;
}

interface AssignedAward {
    id: string;
    userId: string;
    userName: string;
    userSurname?: string;
    userGym?: string;
    userDiscipline?: string;
    name: string;
    value: number;
    assignedAt?: any;
}

interface User {
    id: string;
    name: string;
    surname: string;
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
    useEffect(() => {
        fetchAwards();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    // Funzione per assegnare il premio selezionato all'utente selezionato
    const handleAssignAward = async () => {
        if (!selectedAward || !selectedUserId) return;
        try {
            // Usa la nuova funzione con tutti i campi
            const { id, name, value } = selectedAward;
            await import('@/lib/userAwards').then(mod =>
                mod.createUserAward(selectedUserId, id, name, value)
            );
            toast({ title: "Premio assegnato!" });
            sendPushNotification("Hai ricevuto un nuovo premio!", `Tipo: ${name}, Valore: ${value}€`);
            setIsAssignOpen(false);
            setSelectedUserId("");
            fetchAssignedAwards(); // Ricarica la lista dei premi assegnati
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
    const [users, setUsers] = useState<{id: string, name: string, surname?: string, discipline?: string, gym?: string}[]>([]);
    // Stati per premi assegnati
    const [assignedAwards, setAssignedAwards] = useState<AssignedAward[]>([]);
    const [loadingAssigned, setLoadingAssigned] = useState(false);

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
                setUsers(snap.docs.map(doc => ({
                    id: doc.id,
                    name: doc.data().name,
                    surname: doc.data().surname,
                    gym: doc.data().gym,
                    discipline: doc.data().discipline
                })));
            } catch (e) {
                toast({ variant: "destructive", title: "Errore", description: "Impossibile caricare gli utenti." });
            } finally {
                setLoading(false);
            }
        };
        fetchUsers();
    }, [toast]);

    // Funzione per caricare i premi assegnati
    const fetchAssignedAwards = async () => {
        setLoadingAssigned(true);
        try {
            const assignedAwardsList: AssignedAward[] = [];
            
            // Carica tutti gli utenti
            const usersSnapshot = await getDocs(collection(db, "users"));
            
            // Per ogni utente, carica i suoi premi (dalla collezione userAwards)
            for (const userDoc of usersSnapshot.docs) {
                const userData = userDoc.data();
                
                const userAwardsSnapshot = await getDocs(collection(db, "users", userDoc.id, "userAwards"));
                
                userAwardsSnapshot.docs.forEach(awardDoc => {
                    const awardData = awardDoc.data();
                    assignedAwardsList.push({
                        id: awardDoc.id,
                        userId: userDoc.id,
                        userName: userData.name,
                        userSurname: userData.surname,
                        userGym: userData.gym,
                        userDiscipline: userData.discipline,
                        name: awardData.name,
                        value: awardData.value,
                        assignedAt: awardData.assignedAt
                    });
                });
            }
            
            // Ordina per data di assegnazione (più recenti prima)
            assignedAwardsList.sort((a, b) => {
                if (!a.assignedAt) return 1;
                if (!b.assignedAt) return -1;
                return b.assignedAt.toMillis() - a.assignedAt.toMillis();
            });
            
            setAssignedAwards(assignedAwardsList);
        } catch (error) {
            console.error("Error fetching assigned awards:", error);
            toast({ variant: "destructive", title: "Errore", description: "Impossibile caricare i premi assegnati." });
        } finally {
            setLoadingAssigned(false);
        }
    };

    // Carica i premi assegnati al caricamento della pagina
    useEffect(() => {
        fetchAssignedAwards();
    }, []);

    // Funzione per eliminare un premio assegnato
    const handleRemoveAssignedAward = async (assignedAward: AssignedAward) => {
        try {
            await deleteDoc(doc(db, "users", assignedAward.userId, "userAwards", assignedAward.id));
            toast({ title: "Successo", description: "Premio rimosso dall'utente con successo." });
            fetchAssignedAwards(); // Ricarica la lista
        } catch (error) {
            console.error("Error removing assigned award:", error);
            toast({ variant: "destructive", title: "Errore", description: "Errore nella rimozione del premio." });
        }
    };

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
                residuo: data.value,
                used: false,
                usedValue: 0
            };

            if (editingAward) {
                const awardRef = doc(db, "awards", editingAward.id);
                await updateDoc(awardRef, awardData);
                toast({ title: "Premio aggiornato!" });
            } else {
                if (selectedUserId) {
                    await addDoc(collection(db, `users/${selectedUserId}/awards`), awardData);
                } else {
                    await addDoc(collection(db, "awards"), awardData);
                }
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
                <Tabs defaultValue="disponibili" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="disponibili">Premi Disponibili</TabsTrigger>
                        <TabsTrigger value="assegnati">Premi Assegnati</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="disponibili" className="mt-6">
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
                                            <Button 
                                                size="sm" 
                                                onClick={() => openAssignDialog(award)}
                                                className="bg-green-600 hover:bg-green-700 text-white border-green-600 hover:border-green-700 p-2"
                                                title="Assegna premio"
                                            >
                                                <UserPlus className="w-4 h-4" />
                                            </Button>
                                            <Button 
                                                size="sm" 
                                                onClick={() => openEditForm(award)}
                                                className="bg-blue-600 hover:bg-blue-700 text-white border-blue-600 hover:border-blue-700 p-2"
                                                title="Modifica premio"
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </Button>
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
                            <SelectTrigger className="bg-white text-black border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                                <SelectValue placeholder="Seleziona utente..." />
                            </SelectTrigger>
                            <SelectContent className="bg-white">
                                {users.map(user => (
                                    <SelectItem key={user.id} value={user.id} className="text-black hover:bg-gray-50">
                                        {user.surname ? `${user.surname} ` : ''}{user.name}
                                        {user.gym ? ` - ${user.gym}` : ''}
                                        {user.discipline ? ` - ${user.discipline}` : ''}
                                    </SelectItem>
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
                    </TabsContent>
                    
                    <TabsContent value="assegnati" className="mt-6">
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Utente</TableHead>
                                        <TableHead>Premio</TableHead>
                                        <TableHead>Valore</TableHead>
                                        <TableHead>Utilizzato</TableHead>
                                        <TableHead>Residuo</TableHead>
                                        <TableHead>Data Assegnazione</TableHead>
                                        <TableHead className="text-right">Azioni</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loadingAssigned ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center h-24">
                                                <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                                                <span className="ml-2">Caricamento premi assegnati...</span>
                                            </TableCell>
                                        </TableRow>
                                    ) : assignedAwards.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
                                                Nessun premio assegnato ancora.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        assignedAwards.map((assignedAward) => (
                                            <TableRow key={`${assignedAward.userId}-${assignedAward.id}`}>
                                                <TableCell className="font-medium">
                                                    {assignedAward.userName} {assignedAward.userSurname}
                                                    {assignedAward.userGym && <div className="text-sm text-muted-foreground">{assignedAward.userGym}</div>}
                                                    {assignedAward.userDiscipline && <div className="text-sm text-muted-foreground">{assignedAward.userDiscipline}</div>}
                                                </TableCell>
                                                <TableCell>{assignedAward.name}</TableCell>
                                                <TableCell>€{assignedAward.value}</TableCell>
                                                <TableCell>€0</TableCell> {/* TODO: Implementare tracking utilizzo */}
                                                <TableCell>€{assignedAward.value}</TableCell> {/* TODO: Calcolare residuo */}
                                                <TableCell>
                                                    {assignedAward.assignedAt ? 
                                                        new Date(assignedAward.assignedAt.toDate()).toLocaleDateString('it-IT') : 
                                                        "-"
                                                    }
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button 
                                                                size="sm" 
                                                                className="bg-red-600 hover:bg-red-700 text-white border-red-600 hover:border-red-700 p-2"
                                                                title="Elimina premio assegnato"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Conferma eliminazione</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    Sei sicuro di voler rimuovere il premio "{assignedAward.name}" da {assignedAward.userName} {assignedAward.userSurname}? Questa azione non può essere annullata.
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Annulla</AlertDialogCancel>
                                                                <AlertDialogAction
                                                                    onClick={() => handleRemoveAssignedAward(assignedAward)}
                                                                    className="bg-red-600 hover:bg-red-700 text-white"
                                                                >
                                                                    Elimina
                                                                </AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </TabsContent>
                </Tabs>
            </CardContent>

             <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent className="bg-card">
                    {/* DialogHeader e DialogTitle personalizzato, nessun titolo generico */}
                    {/* DialogTitle nascosto per accessibilità */}
                    <DialogTitle style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(1px, 1px, 1px, 1px)" }}>
                        {editingAward ? `Modifica Premio` : `Crea Nuovo Premio`}
                    </DialogTitle>
                    <div className="flex flex-col space-y-1.5 text-center sm:text-left">
                        <h2 className="text-lg font-semibold leading-none tracking-tight text-background">{editingAward ? `Modifica Premio` : `Crea Nuovo Premio`}</h2>
                    </div>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(handleSaveAward)} className="space-y-4 py-4">
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-background">Tipo di Premio</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger className="bg-white border border-black text-black">
                                                <SelectValue placeholder="Seleziona un tipo di premio..." />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="Bonus Inizio Percorso">Bonus Inizio Percorso</SelectItem>
                                            <SelectItem value="Premio Best Samurai">Premio Best Samurai</SelectItem>
                                            <SelectItem value="Premio Kata">Premio Kata</SelectItem>
                                            <SelectItem value="Premio Kumite">Premio Kumite</SelectItem>
                                            <SelectItem value="Premio Stage">Premio Stage</SelectItem>
                                            <SelectItem value="Premio Presenze">Premio Presenze</SelectItem>
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
                                    <FormLabel className="text-background">Valore del Premio (€)</FormLabel>
                                     <FormControl>
                                        <Input type="number" step="0.01" placeholder="Es. 50.00" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                            
                            <DialogFooter>
                                <Button type="button" variant="ghost" onClick={() => setIsFormOpen(false)} className="bg-transparent text-background border border-background">Annulla</Button>
                                <Button type="submit" disabled={isSubmitting} className="text-green-600 border border-green-600">
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


