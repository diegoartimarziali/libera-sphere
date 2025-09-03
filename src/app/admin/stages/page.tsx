"use client"
"use client"

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, writeBatch, query, where, Timestamp, deleteDoc, addDoc, updateDoc, serverTimestamp, DocumentData, getDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { format, parseISO } from "date-fns";
import { it } from "date-fns/locale";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, PlusCircle, Trash2, Save, Calendar, MapPin, Tag, Users, ExternalLink, Clock, Image as ImageIcon, Award, FileText, Sparkles, LayoutGrid, List } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Image from "next/image";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// =================================================================
// TIPI E SCHEMI
// =================================================================
interface Gym {
    id: string;
    name: string;
    address?: string;
}

export interface Stage {
    id: string;
    title: string;
    description: string;
    startTime: Timestamp;
    endTime: Timestamp;
    location: string;
    price: number;
    imageUrl?: string;
    open_to: 'Tutti' | 'Cinture Nere';
    type: 'stage' | 'exam' | 'course' | 'other';
    discipline?: 'karate' | 'aikido';
    alertDate?: string;
    requireConfirmation?: boolean;
}

// Helper per trasformare una data in una stringa 'yyyy-MM-dd HH:mm' o undefined
const dateTimeToInputString = (date?: Date | Timestamp): { date: string, time: string } | undefined => {
    if (!date) return undefined;
    const dateObj = date instanceof Timestamp ? date.toDate() : date;
    return {
        date: format(dateObj, 'yyyy-MM-dd'),
        time: format(dateObj, 'HH:mm')
    };
};


const stageFormSchema = z.object({
    alertDate: z.string().optional(),
    requireConfirmation: z.boolean().optional(),
    id: z.string().optional(),
    type: z.enum(['stage', 'exam', 'course', 'other'], { required_error: "La tipologia è obbligatoria." }),
    discipline: z.enum(['karate', 'aikido'], { required_error: "La disciplina è obbligatoria." }),
    title: z.string().min(3, "Il titolo è obbligatorio."),
    startDate: z.string({ required_error: "La data di inizio è obbligatoria." }),
    startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Formato ora non valido (HH:mm)."),
    endDate: z.string({ required_error: "La data di fine è obbligatoria." }),
    endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Formato ora non valido (HH:mm)."),
    location: z.string().min(3, "Il luogo è obbligatorio."),
    description: z.string().optional(),
    price: z.preprocess((val) => Number(val), z.number().min(0, "Il prezzo non può essere negativo.")),
    open_to: z.enum(['Tutti', 'Cinture Nere'], { required_error: "Specifica a chi è rivolto l'evento." }),
    imageUrl: z.string().url("Deve essere un URL valido (es. https://images.unsplash.com/...).")
        .refine(val => !val || val.startsWith('https://images.unsplash.com/') || val.startsWith('https://firebasestorage.googleapis.com/'), {
            message: "Solo URL da Unsplash o Firebase Storage sono permessi."
        })
        .refine(val => !val || /\.(jpg|jpeg|png|gif|webp)$/.test(val.split('?')[0]), {
            message: "L'URL deve puntare a un file immagine (jpg, png, ecc.)."
        })
        .optional()
        .or(z.literal('')),
        sumupUrl: z.string().url("Inserisci un link SumUp valido (https://...)").optional().or(z.literal('')),
        iconUrl: z.string().url("Inserisci un URL icona quadrata valido (https://...)").optional().or(z.literal('')),
});

type StageFormData = z.infer<typeof stageFormSchema>;

// =================================================================
// FUNZIONI HELPER
// =================================================================

const getEventTypeIcon = (type: Stage['type']) => {
    switch (type) {
        case 'stage': return <Award className="h-4 w-4 mr-2 flex-shrink-0" />;
        case 'exam': return <FileText className="h-4 w-4 mr-2 flex-shrink-0" />;
        case 'course': return <Users className="h-4 w-4 mr-2 flex-shrink-0" />;
        default: return <Sparkles className="h-4 w-4 mr-2 flex-shrink-0" />;
    }
}
const getEventTypeLabel = (type: Stage['type']) => {
    switch (type) {
        case 'stage': return 'Stage';
        case 'exam': return 'Esame';
        case 'course': return 'Corso';
        default: return 'Evento';
    }
}

const InfoRow = ({ icon: Icon, text }: { icon: React.ElementType, text: string }) => (
    <div className="flex items-center text-sm text-muted-foreground">
        <Icon className="h-4 w-4 mr-2 flex-shrink-0" />
        <span>{text}</span>
    </div>
);

// =================================================================
// COMPONENTI
// =================================================================

function StageForm({ stage, gyms, onSave, onCancel }: { stage?: StageFormData, gyms: Gym[], onSave: (data: StageFormData) => void, onCancel: () => void }) {
    const form = useForm<StageFormData>({
        resolver: zodResolver(stageFormSchema),
        defaultValues: {
            title: stage?.title ?? '',
            alertDate: stage?.alertDate ?? '',
            requireConfirmation: stage?.requireConfirmation ?? false,
            type: stage?.type ?? 'stage',
            discipline: stage?.discipline ?? 'karate',
            startDate: stage?.startDate ?? format(new Date(), 'yyyy-MM-dd'),
            endDate: stage?.endDate ?? format(new Date(), 'yyyy-MM-dd'),
            startTime: stage?.startTime ?? '09:00',
            endTime: stage?.endTime ?? '18:00',
            location: stage?.location ?? '',
            description: stage?.description ?? '',
            price: stage?.price ?? 0,
            open_to: stage?.open_to ?? 'Tutti',
            imageUrl: stage?.imageUrl ?? '',
            iconUrl: stage?.iconUrl ?? '',
            sumupUrl: stage?.sumupUrl ?? ''
        }
    });

    const onSubmit = (data: StageFormData) => {
        onSave(data);
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                    <FormField control={form.control} name="type" render={({ field }) => (
                        <FormItem><FormLabel>Tipologia Evento</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Seleziona una tipologia..." /></SelectTrigger></FormControl>
                                <SelectContent>
                                    <SelectItem value="stage">Stage</SelectItem>
                                    <SelectItem value="exam">Esami</SelectItem>
                                    <SelectItem value="course">Corso</SelectItem>
                                    <SelectItem value="other">Altro</SelectItem>
                                </SelectContent>
                            </Select>
                        <FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="discipline" render={({ field }) => (
                        <FormItem><FormLabel>Disciplina</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Seleziona disciplina..." /></SelectTrigger></FormControl>
                                <SelectContent>
                                    <SelectItem value="karate">Karate</SelectItem>
                                    <SelectItem value="aikido">Aikido</SelectItem>
                                </SelectContent>
                            </Select>
                        <FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="location" render={({ field }) => (
                        <FormItem><FormLabel>Luogo</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Seleziona una palestra..." /></SelectTrigger></FormControl>
                                <SelectContent>
                                    {gyms.map(g => (
                                        <SelectItem key={g.id} value={g.name + (g.address ? ` - ${g.address}` : '')}>
                                            {g.name}{g.address ? ` - ${g.address}` : ''}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="title" render={({ field }) => (
                        <FormItem><FormLabel>Titolo Evento</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="description" render={({ field }) => (
                        <FormItem><FormLabel>Descrizione</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="startDate" render={({ field }) => (
                        <FormItem><FormLabel>Data</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="alertDate" render={({ field }) => (
                        <FormItem><FormLabel>Data Alert</FormLabel>
                            <FormControl><Input type="date" {...field} /></FormControl>
                        <FormMessage /></FormItem>
                    )} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="startTime" render={({ field }) => (
                        <FormItem><FormLabel>Ora Inizio</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="endTime" render={({ field }) => (
                        <FormItem><FormLabel>Ora Fine</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                </div>
                <div className="grid grid-cols-3 gap-4">
                    <FormField control={form.control} name="price" render={({ field }) => (
                        <FormItem><FormLabel>Prezzo (€)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="sumupUrl" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Link SumUp Pagamento</FormLabel>
                            <FormControl><Input {...field} placeholder="https://sumup.it/pay/xyz" /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                    <FormField control={form.control} name="open_to" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Aperto a</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleziona a chi è rivolto..." />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="Tutti">Tutti</SelectItem>
                                    <SelectItem value="Cinture Nere">Cinture Nere</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="imageUrl" render={({ field }) => (
                        <FormItem><FormLabel>URL Immagine</FormLabel><FormControl><Input {...field} placeholder="https://..." /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="iconUrl" render={({ field }) => (
                        <FormItem>
                            <FormLabel>URL Icona Quadrata Evento</FormLabel>
                            <FormControl><Input {...field} placeholder="https://..." /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                </div>
                    {/* ...existing code... */}
                <DialogFooter>
                    <Button type="button" variant="ghost" onClick={onCancel}>Annulla</Button>
                    <Button type="submit">Salva Evento</Button>
                </DialogFooter>
            </form>
        </Form>
    );
}


// =================================================================
// PAGINA PRINCIPALE
// =================================================================

export default function AdminStagesPage() {
    const openEditForm = (stage: Stage) => {
        setEditingStage({
            ...stage,
            discipline: stage.discipline ?? "karate",
            startDate: stage.startTime ? format(stage.startTime.toDate(), 'yyyy-MM-dd') : '',
            startTime: stage.startTime ? format(stage.startTime.toDate(), 'HH:mm') : '',
            endDate: stage.endTime ? format(stage.endTime.toDate(), 'yyyy-MM-dd') : '',
            endTime: stage.endTime ? format(stage.endTime.toDate(), 'HH:mm') : '',
        });
        setIsFormOpen(true);
    };
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [stages, setStages] = useState<Stage[]>([]);
    const [gyms, setGyms] = useState<Gym[]>([]);
    const [viewMode, setViewMode] = useState<'card' | 'list'>('card');

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingStage, setEditingStage] = useState<StageFormData | undefined>(undefined);

    const handleDeleteStage = async (stageId: string) => {
        setLoading(true);
        try {
            await deleteDoc(doc(db, "events", stageId));
            setStages(prev => prev.filter(s => s.id !== stageId));
            toast({ variant: "success", title: "Evento eliminato", description: "Lo stage è stato rimosso correttamente." });
        } catch (error) {
            console.error("Errore eliminazione stage:", error);
            toast({ variant: "destructive", title: "Errore", description: "Impossibile eliminare l'evento." });
        } finally {
            setLoading(false);
        }
    };
    const fetchInitialData = async () => {
        setLoading(true);
        try {
            const eventsCollection = collection(db, "events");
            // Filtra per tutti i tipi che non sono 'lesson'
            const q = query(
                eventsCollection,
                where("type", "in", ["stage", "exam", "course", "other"])
            );
            const stagesSnapshot = await getDocs(q);
            const stagesList = stagesSnapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() } as Stage))
                .sort((a,b) => b.startTime.toMillis() - a.startTime.toMillis()); // Ordina qui
            
            setStages(stagesList);

            const gymsSnapshot = await getDocs(collection(db, "gyms"));
            const gymsList = gymsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data()} as Gym));
            setGyms(gymsList);

        } catch (error) {
            console.error("Error fetching stages:", error);
            toast({ variant: "destructive", title: "Errore", description: "Impossibile caricare gli eventi." });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleSaveStage = async (data: StageFormData) => {
        setIsSubmitting(true);
        try {
            // Prepara i dati per Firestore
            const eventData = {
                ...data,
                sumupUrl: data.sumupUrl ?? "",
                startTime: Timestamp.fromDate(new Date(`${data.startDate}T${data.startTime}`)),
                endTime: Timestamp.fromDate(new Date(`${data.endDate}T${data.endTime}`)),
            };
            if (data.id) {
                // Modifica evento esistente
                await updateDoc(doc(db, "events", data.id), eventData);
                toast({ variant: "success", title: "Evento aggiornato", description: "Le modifiche sono state salvate." });
            } else {
                // Crea nuovo evento
                const docRef = await addDoc(collection(db, "events"), eventData);
                toast({ variant: "success", title: "Evento creato", description: "Il nuovo evento è stato salvato." });
            }
            setIsFormOpen(false);
            fetchInitialData();
        } catch (error) {
            console.error("Errore salvataggio evento:", error);
            toast({ variant: "destructive", title: "Errore", description: "Impossibile salvare l'evento." });
        } finally {
            setIsSubmitting(false);
        }
    };

    const openCreateForm = () => {
        setEditingStage(undefined);
        setIsFormOpen(true);
    }
    
    return (
        <div className="space-y-8">
            <Card>
                <CardHeader className="flex-row items-center justify-between">
                    <div>
                        <CardTitle>Gestione Stage ed Eventi</CardTitle>
                        <CardDescription>Crea e gestisci tutti gli eventi speciali.</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                         <div className="hidden sm:flex items-center gap-1 rounded-md bg-muted p-1">
                            <Button variant={viewMode === 'card' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('card')} className="h-8 w-8"><LayoutGrid className="h-4 w-4" /></Button>
                            <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('list')} className="h-8 w-8"><List className="h-4 w-4" /></Button>
                         </div>
                         <Button onClick={openCreateForm}>
                            <PlusCircle className="mr-2" />
                            Crea Nuovo Evento
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center items-center h-48"><Loader2 className="w-8 h-8 animate-spin" /></div>
                    ) : stages.length === 0 ? (
                        <p className="text-center text-muted-foreground py-12">Nessuno stage o evento trovato. Creane uno per iniziare.</p>
                    ) : viewMode === 'card' ? (
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {stages.map(stage => (
                                <Card key={stage.id} className="flex flex-col overflow-hidden max-h-[600px] overflow-y-auto">
                                     {stage.imageUrl && (
                                        <div className="relative h-64 w-full bg-[var(--my-gialchiar)]">
                                            <Image
                                                src={stage.imageUrl}
                                                alt={`Immagine per ${stage.title}`}
                                                layout="fill"
                                                objectFit="cover"
                                                data-ai-hint="event martial-arts"
                                            />
                                        </div>
                                    )}
                                    <CardHeader className="p-0">
                                        <div className="flex flex-col space-y-1.5 p-6 bg-[var(--my-gialchiar)] rounded-t-md">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center text-sm text-primary font-semibold">
                                                    {getEventTypeIcon(stage.type)}
                                                    {getEventTypeLabel(stage.type)}
                                                </div>
                                                <div className="text-xs font-medium text-[var(--my-marscuro)]">
                                                    {stage.discipline ? `Disciplina: ${stage.discipline.charAt(0).toUpperCase() + stage.discipline.slice(1)}` : ''}
                                                </div>
                                            </div>
                                            <CardTitle className="font-semibold tracking-tight text-xl capitalize">{stage.title}</CardTitle>
                                            <CardDescription className="text-sm text-muted-foreground">{stage.description}</CardDescription>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="flex-grow space-y-3 bg-[var(--my-gialchiar)] overflow-y-auto max-h-[350px]">
                                        <InfoRow icon={Calendar} text={stage.startTime ? format(stage.startTime.toDate(), "eeee d MMMM yyyy", { locale: it }) : "Data da definire"} />
                                        <InfoRow icon={Clock} text={stage.startTime && stage.endTime ? `${format(stage.startTime.toDate(), "HH:mm")} - ${format(stage.endTime.toDate(), "HH:mm")}` : "Orario da definire"} />
                                        <InfoRow icon={MapPin} text={stage.location} />
                                        <InfoRow icon={Users} text={`Aperto a: ${stage.open_to}`} />
                                        <InfoRow icon={Tag} text={`Costo: ${stage.price.toFixed(2)} €`} />
                                    </CardContent>
                                    <CardFooter className="flex justify-end gap-2 bg-muted/50 p-3">
                                        <Button variant="outline" size="sm" onClick={() => openEditForm(stage)}>Modifica</Button>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                 <Button variant="destructive" size="sm"><Trash2 className="h-4 w-4" /></Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Sei sicuro di voler eliminare l'evento?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        Questa azione non può essere annullata. L'evento <strong className="mx-1">{stage.title}</strong> sarà rimosso permanentemente.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Annulla</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDeleteStage(stage.id)}>
                                                        Sì, elimina
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>

                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    ) : (
                         <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Tipo</TableHead>
                                    <TableHead>Titolo</TableHead>
                                    <TableHead>Data e Ora</TableHead>
                                    <TableHead>Luogo</TableHead>
                                    <TableHead>Aperto a</TableHead>
                                    <TableHead className="text-right">Costo</TableHead>
                                    <TableHead className="text-right">Azioni</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {stages.map(stage => (
                                    <TableRow key={stage.id}>
                                        <TableCell><Badge variant="secondary">{getEventTypeLabel(stage.type)}</Badge></TableCell>
                                        <TableCell className="font-medium capitalize">{stage.title}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span>{stage.startTime ? format(stage.startTime.toDate(), "dd/MM/yy", { locale: it }) : "N/D"}</span>
                                                <span className="text-xs text-muted-foreground">{stage.startTime ? format(stage.startTime.toDate(), "HH:mm") : "N/D"}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>{stage.location}</TableCell>
                                        <TableCell>{stage.open_to}</TableCell>
                                        <TableCell className="text-right">{stage.price.toFixed(2)} €</TableCell>
                                        <TableCell className="text-right space-x-1">
                                             <Button variant="ghost" size="sm" onClick={() => openEditForm(stage)}>Modifica</Button>
                                              <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive h-8 w-8"><Trash2 className="h-4 w-4" /></Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Sei sicuro?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            Eliminare l'evento <strong className="mx-1">{stage.title}</strong>? L'azione è irreversibile.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Annulla</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDeleteStage(stage.id)}>
                                                            Sì, elimina
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                         </Table>
                    )}
                </CardContent>
            </Card>

            <Dialog open={isFormOpen} onOpenChange={(isOpen) => { setIsFormOpen(isOpen); if (!isOpen) setEditingStage(undefined); }}>
                                                <DialogContent className="sm:max-w-2xl" aria-describedby="dialog-desc-stages">
                                                    <p id="dialog-desc-stages" className="text-muted-foreground text-sm mb-2">
                                                        Inserisci o modifica i dati dello stage.
                                                    </p>
                    <DialogHeader>
                        <DialogTitle>{editingStage ? "Modifica Evento" : "Crea Nuovo Evento"}</DialogTitle>
                    </DialogHeader>
                    <StageForm 
                        stage={editingStage} 
                        gyms={gyms}
                        onSave={handleSaveStage} 
                        onCancel={() => setIsFormOpen(false)} 
                    />
                </DialogContent>
            </Dialog>
        </div>
    );
}
