
"use client"

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove, collection, getDocs, query, orderBy } from "firebase/firestore";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


interface Gym {
  id: string;
  name: string;
}

interface Award {
    name: string;
    value: number;
}

interface AwardsData {
    [key: string]: Award[]; // Disciplina -> Array di premi
}

const awardFormSchema = z.object({
    name: z.string().min(3, "Il nome del premio è obbligatorio (min. 3 caratteri)."),
    value: z.preprocess((val) => Number(val), z.number().min(0, "Il valore non può essere negativo.")),
});

type AwardFormData = z.infer<typeof awardFormSchema>;


export default function AdminAwardsPage() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [gyms, setGyms] = useState<Gym[]>([]);
    const [selectedGymId, setSelectedGymId] = useState<string>("");
    const [awards, setAwards] = useState<AwardsData | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Stati per il form modale
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingAward, setEditingAward] = useState<{ award: Award, discipline: string } | null>(null);
    const [currentDiscipline, setCurrentDiscipline] = useState<"Karate" | "Aikido">("Karate");

    const form = useForm<AwardFormData>({
        resolver: zodResolver(awardFormSchema),
        defaultValues: { name: '', value: 0 }
    });

    useEffect(() => {
        const fetchGyms = async () => {
            try {
                const gymsSnapshot = await getDocs(query(collection(db, "gyms"), orderBy("name")));
                const gymsList = gymsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Gym));
                setGyms(gymsList);
                if (gymsList.length > 0) {
                    setSelectedGymId(gymsList[0].id);
                }
            } catch (error) {
                console.error("Error fetching gyms:", error);
                toast({ variant: "destructive", title: "Errore", description: "Impossibile caricare le palestre." });
            } finally {
                setLoading(false);
            }
        };
        fetchGyms();
    }, [toast]);

    useEffect(() => {
        const fetchAwards = async () => {
            if (!selectedGymId) return;
            setLoading(true);
            try {
                const awardDocRef = doc(db, "premi", selectedGymId);
                const awardDocSnap = await getDoc(awardDocRef);
                if (awardDocSnap.exists()) {
                    setAwards(awardDocSnap.data() as AwardsData);
                } else {
                    setAwards(null); // Nessun premio per questa palestra
                }
            } catch (error) {
                console.error("Error fetching awards:", error);
                toast({ variant: "destructive", title: "Errore", description: "Impossibile caricare i premi." });
            } finally {
                setLoading(false);
            }
        };
        fetchAwards();
    }, [selectedGymId, toast]);
    
    const openCreateForm = (discipline: "Karate" | "Aikido") => {
        setEditingAward(null);
        setCurrentDiscipline(discipline);
        form.reset({ name: '', value: 0 });
        setIsFormOpen(true);
    }

    const openEditForm = (award: Award, discipline: string) => {
        setEditingAward({ award, discipline });
        setCurrentDiscipline(discipline as "Karate" | "Aikido");
        form.reset({ name: award.name, value: award.value });
        setIsFormOpen(true);
    };

    const handleSaveAward = async (data: AwardFormData) => {
        if (!selectedGymId) return;
        setIsSubmitting(true);

        const awardDocRef = doc(db, "premi", selectedGymId);

        try {
            if (editingAward) { // Modalità modifica
                const originalAward = editingAward.award;
                const discipline = editingAward.discipline;

                // Per modificare, rimuoviamo il vecchio e aggiungiamo il nuovo
                await updateDoc(awardDocRef, {
                    [discipline]: arrayRemove(originalAward)
                });
                await updateDoc(awardDocRef, {
                    [discipline]: arrayUnion({ name: data.name, value: data.value })
                });

                toast({ title: "Premio aggiornato!", variant: "success" });
            } else { // Modalità creazione
                const awardDocSnap = await getDoc(awardDocRef);
                if (awardDocSnap.exists()) {
                    await updateDoc(awardDocRef, {
                        [currentDiscipline]: arrayUnion({ name: data.name, value: data.value })
                    });
                } else {
                    // Crea il documento se non esiste
                    await setDoc(awardDocRef, {
                        [currentDiscipline]: [{ name: data.name, value: data.value }]
                    });
                }
                 toast({ title: "Premio creato!", variant: "success" });
            }
            
            // Ricarica i dati per aggiornare la UI
            const updatedDocSnap = await getDoc(awardDocRef);
            setAwards(updatedDocSnap.data() as AwardsData);

            setIsFormOpen(false);
            setEditingAward(null);

        } catch (error) {
            console.error("Error saving award:", error);
            toast({ variant: "destructive", title: "Errore", description: "Impossibile salvare il premio." });
        } finally {
            setIsSubmitting(false);
        }
    };
    
     const handleDeleteAward = async (awardToDelete: Award, discipline: string) => {
        if (!selectedGymId) return;
        
        try {
             const awardDocRef = doc(db, "premi", selectedGymId);
             await updateDoc(awardDocRef, {
                 [discipline]: arrayRemove(awardToDelete)
             });
             toast({ title: "Premio eliminato", variant: "success" });
             
             // Ricarica i dati per aggiornare la UI
             const updatedDocSnap = await getDoc(awardDocRef);
             setAwards(updatedDocSnap.data() as AwardsData);
        } catch (error) {
            console.error("Error deleting award:", error);
            toast({ variant: "destructive", title: "Errore", description: "Impossibile eliminare il premio." });
        }
    }

    const renderAwardsTable = (discipline: "Karate" | "Aikido") => {
        const disciplineAwards = awards ? awards[discipline] || [] : [];
        return (
            <div>
                 <Button className="mb-4" onClick={() => openCreateForm(discipline)}>
                    <PlusCircle className="mr-2" /> Aggiungi Premio a {discipline}
                </Button>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nome Premio</TableHead>
                                <TableHead className="w-[150px]">Valore (Punti)</TableHead>
                                <TableHead className="w-[180px] text-right">Azioni</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={3} className="text-center h-24"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></TableCell></TableRow>
                            ) : disciplineAwards.length > 0 ? (
                                disciplineAwards.map((award, index) => (
                                    <TableRow key={index}>
                                        <TableCell className="font-medium">{award.name}</TableCell>
                                        <TableCell>{award.value}</TableCell>
                                        <TableCell className="text-right space-x-1">
                                            <Button variant="outline" size="sm" onClick={() => openEditForm(award, discipline)}>Modifica</Button>
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
                                                        <AlertDialogAction onClick={() => handleDeleteAward(award, discipline)}>
                                                            Sì, elimina
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow><TableCell colSpan={3} className="text-center h-24 text-muted-foreground">Nessun premio trovato per questa disciplina.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        )
    };

    return (
        <div className="space-y-8">
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <Award className="h-8 w-8 text-primary" />
                        <div>
                            <CardTitle>Gestione Valori e Premi</CardTitle>
                            <CardDescription>Crea e gestisci i premi che possono essere accumulati dagli atleti per ogni palestra.</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="max-w-sm mb-6">
                         <Label>Seleziona una Palestra</Label>
                         <Select value={selectedGymId} onValueChange={setSelectedGymId} disabled={gyms.length === 0}>
                            <SelectTrigger>
                                <SelectValue placeholder={gyms.length > 0 ? "Seleziona..." : "Nessuna palestra trovata"} />
                            </SelectTrigger>
                            <SelectContent>
                                {gyms.map(gym => (
                                    <SelectItem key={gym.id} value={gym.id}>{gym.id} - {gym.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {selectedGymId && (
                         <Tabs defaultValue="Karate" className="w-full">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="Karate">Karate</TabsTrigger>
                                <TabsTrigger value="Aikido">Aikido</TabsTrigger>
                            </TabsList>
                            <TabsContent value="Karate" className="mt-6">
                                {renderAwardsTable("Karate")}
                            </TabsContent>
                            <TabsContent value="Aikido" className="mt-6">
                                {renderAwardsTable("Aikido")}
                            </TabsContent>
                        </Tabs>
                    )}
                </CardContent>
            </Card>

             <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingAward ? `Modifica Premio per ${currentDiscipline}` : `Crea Nuovo Premio per ${currentDiscipline}`}</DialogTitle>
                    </DialogHeader>
                     <Form {...form}>
                        <form onSubmit={form.handleSubmit(handleSaveAward)} className="space-y-4 py-4">
                             <FormField control={form.control} name="name" render={({ field }) => (
                                <FormItem><FormLabel>Nome del Premio</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                             <FormField control={form.control} name="value" render={({ field }) => (
                                <FormItem><FormLabel>Valore (Punti)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
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
