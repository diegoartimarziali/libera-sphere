
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


interface Award {
    id: string;
    name: string;
    value: number;
}

interface AssociateProfile {
    uid: string;
    name: string;
    surname: string;
    email: string;
    discipline?: string;
    gym?: string;
    birthDate?: Timestamp;
    lastGrade?: string;
}


interface Gym {
    id: string;
    name: string;
}

const awardFormSchema = z.object({
    name: z.string().min(3, "Il nome del premio è obbligatorio (min. 3 caratteri)."),
    value: z.preprocess((val) => Number(val), z.number().min(0, "Il valore non può essere negativo.")),
});

type AwardFormData = z.infer<typeof awardFormSchema>;


export default function AdminAwardsPage() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [awards, setAwards] = useState<Award[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingAward, setEditingAward] = useState<Award | null>(null);

    const [associates, setAssociates] = useState<AssociateProfile[]>([]);
    const [loadingAssociates, setLoadingAssociates] = useState(true);
    const [gyms, setGyms] = useState<Map<string, string>>(new Map());

    const form = useForm<AwardFormData>({
        resolver: zodResolver(awardFormSchema),
        defaultValues: { name: '', value: 0 }
    });
    
    useEffect(() => {
        const fetchAwards = async () => {
            setLoading(true);
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
        };

        const fetchAssociates = async () => {
            setLoadingAssociates(true);
            try {
                // Fetch gyms first
                const gymsSnapshot = await getDocs(collection(db, "gyms"));
                const gymsMap = new Map<string, string>();
                gymsSnapshot.forEach(doc => gymsMap.set(doc.id, doc.data().name));
                setGyms(gymsMap);

                // Fetch active associates
                const associatesQuery = query(
                    collection(db, "users"),
                    where("associationStatus", "==", "active"),
                    orderBy("surname")
                );
                const associatesSnapshot = await getDocs(associatesQuery);
                const associatesList = associatesSnapshot.docs.map(doc => ({
                    uid: doc.id,
                    ...doc.data()
                } as AssociateProfile));
                setAssociates(associatesList);
            } catch (error) {
                console.error("Error fetching associates:", error);
                toast({ variant: "destructive", title: "Errore", description: "Impossibile caricare l'elenco degli atleti associati." });
            } finally {
                setLoadingAssociates(false);
            }
        };

        fetchAwards();
        fetchAssociates();
    }, [toast]);
    
    const openCreateForm = () => {
        setEditingAward(null);
        form.reset({ name: '', value: 0 });
        setIsFormOpen(true);
    }

    const openEditForm = (award: Award) => {
        setEditingAward(award);
        form.reset({ name: award.name, value: award.value });
        setIsFormOpen(true);
    };

    const handleSaveAward = async (data: AwardFormData) => {
        setIsSubmitting(true);
        try {
            if (editingAward) { // Modalità modifica
                const awardDocRef = doc(db, "awards", editingAward.id);
                await updateDoc(awardDocRef, { name: data.name, value: data.value });
                toast({ title: "Premio aggiornato!", variant: "success" });
            } else { // Modalità creazione
                await addDoc(collection(db, "awards"), { name: data.name, value: data.value });
                toast({ title: "Premio creato!", variant: "success" });
            }
            
            // Re-fetch awards after saving
            const awardsSnapshot = await getDocs(query(collection(db, "awards"), orderBy("name")));
            const awardsList = awardsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Award));
            setAwards(awardsList);
            
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
             // Re-fetch awards after deleting
             const awardsSnapshot = await getDocs(query(collection(db, "awards"), orderBy("name")));
             const awardsList = awardsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Award));
             setAwards(awardsList);
        } catch (error) {
            console.error("Error deleting award:", error);
            toast({ variant: "destructive", title: "Errore", description: "Impossibile eliminare il premio." });
        }
    }
    
    const calculateAge = (birthDate: Timestamp | undefined) => {
        if (!birthDate) return 'N/D';
        return differenceInYears(new Date(), birthDate.toDate()).toString();
    }

    return (
        <div className="space-y-8">
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <Award className="h-8 w-8 text-primary" />
                        <div>
                            <CardTitle>Gestione Premi e Valori</CardTitle>
                            <CardDescription>Crea e gestisci i premi che possono essere accumulati dagli atleti. Questi premi sono globali e validi per tutti.</CardDescription>
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
                                    <TableHead className="w-[150px]">Valore (Punti)</TableHead>
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
                                            <TableCell>{award.value}</TableCell>
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
                                    <TableRow><TableCell colSpan={3} className="text-center h-24 text-muted-foreground">Nessun premio trovato. Creane uno per iniziare.</TableCell></TableRow>
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
            
             <Card>
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <Users className="h-8 w-8 text-primary" />
                        <div>
                            <CardTitle>Elenco Atleti Associati</CardTitle>
                            <CardDescription>Lista di tutti gli atleti con associazione attiva.</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                     <div className="rounded-md border">
                        <Table>
                             <TableHeader>
                                <TableRow>
                                    <TableHead>Nome e Cognome</TableHead>
                                    <TableHead>Età</TableHead>
                                    <TableHead>Disciplina</TableHead>
                                    <TableHead>Grado</TableHead>
                                    <TableHead>Palestra</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loadingAssociates ? (
                                    <TableRow><TableCell colSpan={5} className="text-center h-24"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></TableCell></TableRow>
                                ) : associates.length > 0 ? (
                                    associates.map((associate) => (
                                        <TableRow key={associate.uid}>
                                            <TableCell className="font-medium">{associate.name} {associate.surname}</TableCell>
                                            <TableCell>{calculateAge(associate.birthDate)}</TableCell>
                                            <TableCell><Badge variant="secondary">{associate.discipline || 'N/D'}</Badge></TableCell>
                                            <TableCell>{associate.lastGrade || 'N/D'}</TableCell>
                                            <TableCell>{associate.gym ? gyms.get(associate.gym) || associate.gym : 'N/D'}</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow><TableCell colSpan={5} className="text-center h-24 text-muted-foreground">Nessun atleta con associazione attiva trovato.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                     </div>
                </CardContent>
            </Card>
        </div>
    );
}
