
"use client"

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, query, orderBy, addDoc, updateDoc, deleteDoc, Timestamp } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch, Controller } from "react-hook-form";
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
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

interface Award {
    id: string;
    name: string;
    gymIds?: string[];
    lessonsCount?: number;
    value?: number;
    lessonValues?: number[]; // Array per i valori delle singole lezioni
    monthlyValue?: number; // Nuovo campo per il valore mensile da dividere
}

interface Gym {
    id: string;
    name: string;
}

const awardFormSchema = z.object({
    name: z.string().min(1, "La selezione del tipo di premio è obbligatoria."),
    lessonsCount: z.number().optional(),
    lessonValues: z.array(z.number().nonnegative("Il valore non può essere negativo.")).optional(),
    gymIds: z.array(z.string()).optional(),
    total: z.number().optional(),
    monthlyValue: z.number().optional(), // Nuovo campo
});

type AwardFormData = z.infer<typeof awardFormSchema>;

const BonusFields = ({ control, lessonCount, form }: { control: any, lessonCount: number, form: any }) => {
    const lessonValues = useWatch({ control, name: 'lessonValues' }) || [];
    const monthlyValue = useWatch({ control, name: 'monthlyValue' }) || 0;
    
     useEffect(() => {
        if (monthlyValue > 0 && lessonCount > 0) {
            const perLessonValue = parseFloat((monthlyValue / lessonCount).toFixed(2));
            const newLessonValues = Array(lessonCount).fill(perLessonValue);
            
            // Per aggiustare l'arrotondamento, aggiungo la differenza al primo elemento
            const calculatedTotal = newLessonValues.reduce((acc, v) => acc + v, 0);
            const remainder = parseFloat((monthlyValue - calculatedTotal).toFixed(2));
            if (newLessonValues.length > 0) {
                 newLessonValues[0] += remainder;
                 newLessonValues[0] = parseFloat(newLessonValues[0].toFixed(2));
            }

            form.setValue('lessonValues', newLessonValues);
        } else if (monthlyValue === 0) {
            // Se l'utente azzera il valore, azzera anche le lezioni
            form.setValue('lessonValues', Array(lessonCount).fill(0));
        }
    }, [monthlyValue, lessonCount, form]);

    const totalFromLessons = lessonValues.reduce((acc: number, val: number | string) => acc + (Number(val) || 0), 0);

    return (
        <div className="space-y-4 rounded-md border p-4">
             <FormField
                control={control}
                name="monthlyValue"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Valore Mensile Totale (€)</FormLabel>
                     <FormControl>
                        <Input 
                            type="number" 
                            step="0.01"
                            placeholder="Es. 55.00"
                            {...field}
                            onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
            <div className="text-xs text-muted-foreground">Il valore mensile verrà diviso automaticamente per le lezioni.</div>
            
            <FormField
                control={control}
                name="lessonsCount"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Numero di Lezioni</FormLabel>
                    <FormControl>
                        <Input type="number" {...field} readOnly disabled />
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />

            {Array.from({ length: lessonCount }).map((_, index) => (
                 <FormField
                    key={index}
                    control={control}
                    name={`lessonValues.${index}`}
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Valore Lezione {index + 1} (€)</FormLabel>
                            <FormControl>
                                <Input 
                                    type="number" 
                                    step="0.01" 
                                    placeholder="0.00"
                                    {...field}
                                    onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                                    readOnly 
                                    className="bg-muted/50"
                                />
                            </FormControl>
                             <FormMessage />
                        </FormItem>
                    )}
                />
            ))}
             <div className="pt-2 text-right">
                <p className="text-sm text-muted-foreground">Valore Totale del Bonus:</p>
                <p className="text-xl font-bold">{totalFromLessons.toFixed(2)} €</p>
            </div>
        </div>
    )
}


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
        defaultValues: { 
            name: '',
            lessonsCount: 0,
            lessonValues: [],
            gymIds: [],
            total: 0,
            monthlyValue: 0
        }
    });
    
    const selectedAwardType = form.watch('name');

    useEffect(() => {
        if (selectedAwardType?.includes('3 Lezioni')) {
            form.setValue('lessonsCount', 3);
            form.setValue('lessonValues', Array(3).fill(0));
        } else if (selectedAwardType?.includes('5 Lezioni')) {
            form.setValue('lessonsCount', 5);
             form.setValue('lessonValues', Array(5).fill(0));
        } else {
            form.setValue('lessonsCount', undefined);
            form.setValue('lessonValues', undefined);
            form.setValue('gymIds', undefined);
            form.setValue('monthlyValue', undefined);
        }
    }, [selectedAwardType, form]);

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
            gymIds: [],
            lessonValues: [],
            lessonsCount: 0,
            monthlyValue: 0
        });
        setIsFormOpen(true);
    };

    const openEditForm = (award: Award) => {
        setEditingAward(award);
        form.reset({ 
            name: award.name,
            lessonsCount: award.lessonsCount,
            lessonValues: award.lessonValues,
            gymIds: award.gymIds || [],
            monthlyValue: award.monthlyValue,
        });
        setIsFormOpen(true);
    };

    const handleSaveAward = async (data: AwardFormData) => {
        setIsSubmitting(true);
        try {
            const totalValue = data.lessonValues?.reduce((acc, val) => acc + (val || 0), 0) || 0;
            
            const awardData = {
                name: data.name,
                lessonsCount: data.lessonsCount,
                lessonValues: data.lessonValues,
                value: totalValue,
                gymIds: data.gymIds,
                monthlyValue: data.monthlyValue
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
                                <TableHead>Palestre</TableHead>
                                <TableHead>N. Lezioni</TableHead>
                                <TableHead>Valore Totale</TableHead>
                                <TableHead className="w-[180px] text-right">Azioni</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={5} className="text-center h-24"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></TableCell></TableRow>
                            ) : awards.length > 0 ? (
                                awards.map((award) => (
                                    <TableRow key={award.id}>
                                        <TableCell className="font-medium">{award.name}</TableCell>
                                        <TableCell>{award.gymIds && award.gymIds.length > 0 ? award.gymIds.map(id => allGyms.find(g => g.id === id)?.name || id).join(', ') : 'Tutte'}</TableCell>
                                        <TableCell>{award.lessonsCount || 'N/A'}</TableCell>
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
                                <TableRow><TableCell colSpan={5} className="text-center h-24 text-muted-foreground">Nessun premio trovato. Creane uno per iniziare.</TableCell></TableRow>
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
                             {(selectedAwardType === 'Bonus di Inizio Percorso 3 Lezioni' || selectedAwardType === 'Bonus di Inizio Percorso 5 Lezioni') && (
                                <div className="space-y-2 rounded-md border p-4">
                                    <FormLabel>Palestre Associate</FormLabel>
                                    <p className="text-sm text-muted-foreground">Seleziona una o più palestre per cui questo bonus è valido. Lascia deselezionato per renderlo valido per tutte.</p>
                                    <FormField
                                        control={form.control}
                                        name="gymIds"
                                        render={() => (
                                            <FormItem className="space-y-2">
                                            {allGyms.map((gym) => (
                                                <FormField
                                                key={gym.id}
                                                control={form.control}
                                                name="gymIds"
                                                render={({ field }) => {
                                                    return (
                                                    <FormItem
                                                        key={gym.id}
                                                        className="flex flex-row items-start space-x-3 space-y-0"
                                                    >
                                                        <FormControl>
                                                        <Checkbox
                                                            checked={field.value?.includes(gym.id)}
                                                            onCheckedChange={(checked) => {
                                                            return checked
                                                                ? field.onChange([...(field.value || []), gym.id])
                                                                : field.onChange(
                                                                    (field.value || []).filter(
                                                                    (value) => value !== gym.id
                                                                    )
                                                                )
                                                            }}
                                                        />
                                                        </FormControl>
                                                        <FormLabel className="font-normal">
                                                            {gym.id} - {gym.name}
                                                        </FormLabel>
                                                    </FormItem>
                                                    )
                                                }}
                                                />
                                            ))}
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            )}

                            {selectedAwardType === 'Bonus di Inizio Percorso 3 Lezioni' && (
                                <BonusFields control={form.control} lessonCount={3} form={form} />
                            )}
                             {selectedAwardType === 'Bonus di Inizio Percorso 5 Lezioni' && (
                                <BonusFields control={form.control} lessonCount={5} form={form} />
                            )}
                            
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
