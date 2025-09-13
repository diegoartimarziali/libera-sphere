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
import { Loader2, PlusCircle, Trash2, Save, Calendar, MapPin, Tag, Users, ExternalLink, Clock, Image as ImageIcon, Award, FileText, Sparkles, LayoutGrid, List, Edit2 } from "lucide-react";
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
    open_to: 'Tutti' | 'Cinture Nere' | 'Insegnanti';
    type: 'stage' | 'exam' | 'aggiornamento' | 'other';
    customEventType?: string;
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
    type: z.enum(['stage', 'exam', 'aggiornamento', 'other'], { required_error: "La tipologia è obbligatoria." }),
    customEventType: z.string().optional(),
    discipline: z.enum(['karate', 'aikido'], { required_error: "La disciplina è obbligatoria." }),
    title: z.string().min(3, "Il titolo è obbligatorio."),
    startDate: z.string({ required_error: "La data di inizio è obbligatoria." }),
    startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Formato ora non valido (HH:mm)."),
    endDate: z.string({ required_error: "La data di fine è obbligatoria." }),
    endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Formato ora non valido (HH:mm)."),
    location: z.string().min(3, "Il luogo è obbligatorio."),
    description: z.string().optional(),
    price: z.preprocess((val) => Number(val), z.number().min(0, "Il prezzo non può essere negativo.")),
    open_to: z.enum(['Tutti', 'Cinture Nere', 'Insegnanti'], { required_error: "Specifica a chi è rivolto l'evento." }),
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
}).refine(data => {
    // Se il tipo è "other", customEventType deve essere presente
    if (data.type === 'other' && (!data.customEventType || data.customEventType.trim() === '')) {
        return false;
    }
    return true;
}, {
    message: "Quando selezioni 'Altro', devi specificare il tipo di evento",
    path: ["customEventType"]
});

type StageFormData = z.infer<typeof stageFormSchema>;

// =================================================================
// FUNZIONI HELPER
// =================================================================

const getEventTypeIcon = (type: Stage['type']) => {
    switch (type) {
        case 'stage': return <Award className="h-4 w-4 mr-2 flex-shrink-0" />;
        case 'exam': return <FileText className="h-4 w-4 mr-2 flex-shrink-0" />;
        case 'aggiornamento': return <Users className="h-4 w-4 mr-2 flex-shrink-0" />;
        default: return <Sparkles className="h-4 w-4 mr-2 flex-shrink-0" />;
    }
}
const getEventTypeLabel = (type: Stage['type'], customType?: string) => {
    switch (type) {
        case 'stage': return 'Stage';
        case 'exam': return 'Esame';
        case 'aggiornamento': return 'Aggiornamento';
        case 'other': return customType || 'Altro';
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
            title: stage?.title || '',
            alertDate: stage?.alertDate || '',
            requireConfirmation: stage?.requireConfirmation || false,
            type: stage?.type || 'stage',
            customEventType: stage?.customEventType || '',
            discipline: stage?.discipline || 'karate',
            startDate: stage?.startDate || format(new Date(), 'yyyy-MM-dd'),
            endDate: stage?.endDate || format(new Date(), 'yyyy-MM-dd'),
            startTime: stage?.startTime || '09:00',
            endTime: stage?.endTime || '18:00',
            location: stage?.location || '',
            description: stage?.description || '',
            price: stage?.price || 0,
            open_to: stage?.open_to || 'Tutti',
            imageUrl: stage?.imageUrl || '',
            iconUrl: stage?.iconUrl || '',
            sumupUrl: stage?.sumupUrl || ''
        }
    });

    const onSubmit = (data: StageFormData) => {
        console.log("Dati form al submit:", data);
        onSave(data);
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 sm:space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    <FormField control={form.control} name="type" render={({ field }) => {
                        console.log("Select type field value:", field.value);
                        return (
                        <FormItem><FormLabel>Tipologia Evento</FormLabel>
                            <Select onValueChange={(value) => {
                                console.log("Type selected:", value);
                                field.onChange(value);
                            }} value={field.value}>
                                <FormControl><SelectTrigger className="bg-white text-black"><SelectValue placeholder="Seleziona una tipologia..." /></SelectTrigger></FormControl>
                                <SelectContent className="bg-white">
                                    <SelectItem value="stage" className="text-black">Stage</SelectItem>
                                    <SelectItem value="exam" className="text-black">Esami</SelectItem>
                                    <SelectItem value="aggiornamento" className="text-black">Aggiornamento</SelectItem>
                                    <SelectItem value="other" className="text-black">Altro</SelectItem>
                                </SelectContent>
                            </Select>
                        <FormMessage /></FormItem>
                        );
                    }} />
                    {form.watch("type") === "other" && (
                        <FormField control={form.control} name="customEventType" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Specifica Tipologia</FormLabel>
                                <FormControl>
                                    <Input {...field} placeholder="Es. Seminario, Workshop..." className="bg-white text-black" />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                    )}
                    <FormField control={form.control} name="discipline" render={({ field }) => (
                        <FormItem><FormLabel>Disciplina</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl><SelectTrigger className="bg-white text-black"><SelectValue placeholder="Seleziona disciplina..." /></SelectTrigger></FormControl>
                                <SelectContent className="bg-white">
                                    <SelectItem value="karate" className="text-black">Karate</SelectItem>
                                    <SelectItem value="aikido" className="text-black">Aikido</SelectItem>
                                </SelectContent>
                            </Select>
                        <FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="location" render={({ field }) => (
                        <FormItem><FormLabel>Luogo</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl><SelectTrigger className="bg-white text-black"><SelectValue placeholder="Seleziona una palestra..." /></SelectTrigger></FormControl>
                                <SelectContent className="bg-white">
                                    {gyms.map(g => (
                                        <SelectItem key={g.id} value={g.name + (g.address ? ` - ${g.address}` : '')} className="text-black">
                                            {g.name}{g.address ? ` - ${g.address}` : ''}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <FormField control={form.control} name="title" render={({ field }) => (
                        <FormItem><FormLabel>Titolo Evento</FormLabel><FormControl><Input {...field} className="bg-white text-black" /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="description" render={({ field }) => (
                        <FormItem><FormLabel>Descrizione</FormLabel><FormControl><Textarea {...field} className="bg-white text-black" /></FormControl><FormMessage /></FormItem>
                    )} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <FormField control={form.control} name="startDate" render={({ field }) => (
                        <FormItem><FormLabel>Data</FormLabel><FormControl><Input type="date" {...field} className="bg-white text-black" /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="alertDate" render={({ field }) => (
                        <FormItem><FormLabel>Data Alert</FormLabel>
                            <FormControl><Input type="date" {...field} className="bg-white text-black" /></FormControl>
                        <FormMessage /></FormItem>
                    )} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <FormField control={form.control} name="startTime" render={({ field }) => (
                        <FormItem><FormLabel>Ora Inizio</FormLabel><FormControl><Input type="time" {...field} className="bg-white text-black" /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="endTime" render={({ field }) => (
                        <FormItem><FormLabel>Ora Fine</FormLabel><FormControl><Input type="time" {...field} className="bg-white text-black" /></FormControl><FormMessage /></FormItem>
                    )} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    <FormField control={form.control} name="price" render={({ field }) => (
                        <FormItem><FormLabel>Prezzo (€)</FormLabel><FormControl><Input type="number" step="0.01" {...field} className="bg-white text-black" /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="sumupUrl" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Link SumUp Pagamento</FormLabel>
                            <FormControl><Input {...field} placeholder="https://sumup.it/pay/xyz" className="bg-white text-black" /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                    <FormField control={form.control} name="open_to" render={({ field }) => {
                        console.log("Select open_to field value:", field.value);
                        return (
                        <FormItem>
                            <FormLabel>Aperto a</FormLabel>
                            <Select onValueChange={(value) => {
                                console.log("Open_to selected:", value);
                                field.onChange(value);
                            }} value={field.value}>
                                <FormControl>
                                    <SelectTrigger className="bg-white text-black">
                                        <SelectValue placeholder="Seleziona a chi è rivolto..." />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent className="bg-white">
                                    <SelectItem value="Tutti" className="text-black">Tutti</SelectItem>
                                    <SelectItem value="Cinture Nere" className="text-black">Cinture Nere</SelectItem>
                                    <SelectItem value="Insegnanti" className="text-black">Insegnanti</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                        );
                    }} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <FormField control={form.control} name="imageUrl" render={({ field }) => (
                        <FormItem><FormLabel>URL Immagine</FormLabel><FormControl><Input {...field} placeholder="https://..." className="bg-white text-black" /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="iconUrl" render={({ field }) => (
                        <FormItem>
                            <FormLabel>URL Icona Quadrata Evento</FormLabel>
                            <FormControl><Input {...field} placeholder="https://..." className="bg-white text-black" /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                </div>
                    {/* ...existing code... */}
                <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0">
                    <Button type="button" variant="ghost" onClick={onCancel} className="w-full sm:w-auto">Annulla</Button>
                    <Button type="submit" className="w-full sm:w-auto">Salva Evento</Button>
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
            customEventType: stage.customEventType ?? '',
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

    const migrateEventData = async () => {
        setIsSubmitting(true);
        try {
            console.log('🚀 Avvio migrazione eventi...');
            
            // Ottieni tutti gli eventi
            const eventsSnapshot = await getDocs(collection(db, 'events'));
            let updatedCount = 0;
            
            console.log(`📊 Controllando ${eventsSnapshot.size} eventi...`);
            
            for (const docSnap of eventsSnapshot.docs) {
                const data = docSnap.data();
                const updates: Record<string, any> = {};
                let needsUpdate = false;
                
                // Migra type: 'course' -> 'aggiornamento'
                if (data.type === 'course') {
                    updates.type = 'aggiornamento';
                    needsUpdate = true;
                    console.log(`📝 Evento ${docSnap.id}: type 'course' -> 'aggiornamento'`);
                }
                
                // Migra open_to: 'Tecnici' -> 'Insegnanti'
                if (data.open_to === 'Tecnici') {
                    updates.open_to = 'Insegnanti';
                    needsUpdate = true;
                    console.log(`📝 Evento ${docSnap.id}: open_to 'Tecnici' -> 'Insegnanti'`);
                }
                
                if (needsUpdate) {
                    await updateDoc(doc(db, 'events', docSnap.id), updates);
                    updatedCount++;
                }
            }
            
            toast({ 
                variant: "success", 
                title: "Migrazione completata", 
                description: `Aggiornati ${updatedCount} eventi` 
            });
            
            console.log(`🎉 Migrazione completata! Aggiornati ${updatedCount} eventi`);
            
            // Ricarica i dati aggiornati
            fetchInitialData();
            
        } catch (error) {
            console.error('❌ Errore durante la migrazione:', error);
            toast({ 
                variant: "destructive", 
                title: "Errore migrazione", 
                description: "Impossibile completare la migrazione" 
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            const eventsCollection = collection(db, "events");
            // Filtra per tutti i tipi che non sono 'lesson'
            const q = query(
                eventsCollection,
                where("type", "in", ["stage", "exam", "aggiornamento", "other"])
            );
            const stagesSnapshot = await getDocs(q);
            const stagesList = stagesSnapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() } as Stage))
                .sort((a,b) => a.startTime.toMillis() - b.startTime.toMillis()); // Ordina dalla più vicina alla più lontana
            
            console.log(`📊 Caricati ${stagesList.length} eventi:`, stagesList.map(s => `${s.title} (${s.type})`));
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
            console.log("Dati ricevuti dal form:", data);
            
            // Validazione date
            if (!data.startDate || !data.startTime || !data.endDate || !data.endTime) {
                throw new Error("Date e orari sono obbligatori");
            }
            
            // Prepara i dati per Firestore - rimuovi campi temporanei del form
            const { startDate, startTime, endDate, endTime, id, ...eventData } = data;
            
            // Pulisci i campi vuoti
            const cleanedData = Object.fromEntries(
                Object.entries(eventData).filter(([_, value]) => value !== "" && value !== undefined && value !== null)
            );
            
            const finalEventData = {
                title: data.title,
                type: data.type,
                discipline: data.discipline,
                location: data.location,
                description: data.description || "",
                price: Number(data.price) || 0,
                open_to: data.open_to,
                imageUrl: data.imageUrl || "",
                iconUrl: data.iconUrl || "",
                sumupUrl: data.sumupUrl || "",
                alertDate: data.alertDate || "",
                requireConfirmation: data.requireConfirmation || false,
                ...(data.type === "other" && data.customEventType && { customEventType: data.customEventType }),
                startTime: Timestamp.fromDate(new Date(`${startDate}T${startTime}`)),
                endTime: Timestamp.fromDate(new Date(`${endDate}T${endTime}`)),
            };
            
            console.log("Dati finali per il salvataggio:", finalEventData);
            if (data.id) {
                // Modifica evento esistente
                await updateDoc(doc(db, "events", data.id), finalEventData);
                toast({ variant: "success", title: "Evento aggiornato", description: "Le modifiche sono state salvate." });
            } else {
                // Crea nuovo evento
                const docRef = await addDoc(collection(db, "events"), finalEventData);
                toast({ variant: "success", title: "Evento creato", description: "Il nuovo evento è stato salvato." });
            }
            setIsFormOpen(false);
            fetchInitialData();
        } catch (error) {
            console.error("Errore salvataggio evento:", error);
            console.error("Dati ricevuti dal form:", data);
            toast({ 
                variant: "destructive", 
                title: "Errore", 
                description: `Impossibile salvare l'evento: ${error instanceof Error ? error.message : 'Errore sconosciuto'}` 
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const openCreateForm = () => {
        setEditingStage(undefined);
        setIsFormOpen(true);
    }
    
    return (
        <div className="space-y-4 sm:space-y-8 p-4 sm:p-6">
            <Card>
                <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
                    <div>
                        <CardTitle className="text-lg sm:text-xl">Gestione Stage ed Eventi</CardTitle>
                        <CardDescription className="text-sm sm:text-base">Crea e gestisci tutti gli eventi speciali.</CardDescription>
                    </div>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                         <div className="hidden sm:flex items-center gap-1 rounded-md bg-muted p-1">
                            <Button variant={viewMode === 'card' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('card')} className="h-8 w-8"><LayoutGrid className="h-4 w-4" /></Button>
                            <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('list')} className="h-8 w-8"><List className="h-4 w-4" /></Button>
                         </div>
                         <Button 
                            onClick={migrateEventData} 
                            variant="ghost" 
                            disabled={isSubmitting}
                            className="w-full sm:w-auto hover:bg-transparent"
                            size="sm"
                        >
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "🔄"}
                            <span className="hidden sm:inline">Migra Dati Eventi</span>
                            <span className="sm:hidden">Migra</span>
                        </Button>
                         <Button onClick={openCreateForm} className="w-full sm:w-auto">
                            <PlusCircle className="mr-2" />
                            <span className="hidden sm:inline">Crea Nuovo Evento</span>
                            <span className="sm:hidden">Nuovo Evento</span>
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center items-center h-48"><Loader2 className="w-8 h-8 animate-spin" /></div>
                    ) : stages.length === 0 ? (
                        <p className="text-center text-muted-foreground py-12">Nessuno stage o evento trovato. Creane uno per iniziare.</p>
                    ) : viewMode === 'card' ? (
                        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                            {stages.map(stage => (
                                <Card key={stage.id} className="flex flex-col overflow-hidden">
                                     {stage.imageUrl && (
                                        <div className="relative h-40 sm:h-64 w-full bg-[var(--my-gialchiar)]">
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
                                        <div className="flex flex-col space-y-1.5 p-4 sm:p-6 bg-[var(--my-gialchiar)] rounded-t-md">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center text-xs sm:text-sm text-primary font-semibold">
                                                    {getEventTypeIcon(stage.type)}
                                                    {getEventTypeLabel(stage.type, stage.customEventType)}
                                                </div>
                                                <div className="text-xs font-medium text-[var(--my-marscuro)]">
                                                    {stage.discipline ? `Disciplina: ${stage.discipline.charAt(0).toUpperCase() + stage.discipline.slice(1)}` : ''}
                                                </div>
                                            </div>
                                            <CardTitle className="font-semibold tracking-tight text-lg sm:text-xl capitalize">{stage.title}</CardTitle>
                                            <CardDescription className="text-xs sm:text-sm text-muted-foreground">{stage.description}</CardDescription>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="flex-grow space-y-2 sm:space-y-3 bg-[var(--my-gialchiar)] p-3 sm:p-4">
                                        <InfoRow icon={Calendar} text={stage.startTime ? format(stage.startTime.toDate(), "eeee d MMMM yyyy", { locale: it }) : "Data da definire"} />
                                        <InfoRow icon={Clock} text={stage.startTime && stage.endTime ? `${format(stage.startTime.toDate(), "HH:mm")} - ${format(stage.endTime.toDate(), "HH:mm")}` : "Orario da definire"} />
                                        <InfoRow icon={MapPin} text={stage.location} />
                                        <InfoRow icon={Users} text={`Aperto a: ${stage.open_to}`} />
                                        <InfoRow icon={Tag} text={`Costo: ${stage.price.toFixed(2)} €`} />
                                    </CardContent>
                                    <CardFooter className="flex flex-col sm:flex-row justify-end gap-2 bg-muted/50 p-3">
                                        <Button variant="ghost" size="sm" onClick={() => openEditForm(stage)} className="h-8 w-8 p-0 hover:bg-blue-100 text-blue-600 hover:text-blue-700" title="Modifica evento">
                                            <Edit2 className="h-4 w-4" />
                                        </Button>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                 <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-red-100 text-red-600 hover:text-red-700" title="Elimina evento">
                                                    <Trash2 className="h-4 w-4" />
                                                 </Button>
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
                                        <TableCell><Badge variant="secondary">{getEventTypeLabel(stage.type, stage.customEventType)}</Badge></TableCell>
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
                                        <TableCell className="text-right">
                                            <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1 sm:gap-1 sm:space-x-1">
                                             <Button variant="ghost" size="sm" onClick={() => openEditForm(stage)} className="h-8 w-8 p-0 hover:bg-blue-100 text-blue-600 hover:text-blue-700" title="Modifica evento">
                                                <Edit2 className="h-4 w-4" />
                                             </Button>
                                              <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-red-100 text-red-600 hover:text-red-700" title="Elimina evento">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
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
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                         </Table>
                    )}
                </CardContent>
            </Card>

            <Dialog open={isFormOpen} onOpenChange={(isOpen) => { setIsFormOpen(isOpen); if (!isOpen) setEditingStage(undefined); }}>
                                                <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto" aria-describedby="dialog-desc-stages">
                    <DialogHeader>
                        <DialogTitle className="text-lg sm:text-xl">{editingStage ? "Modifica Evento" : "Crea Nuovo Evento"}</DialogTitle>
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
