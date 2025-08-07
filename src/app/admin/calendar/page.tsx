
"use client"

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, writeBatch, query, where, Timestamp, orderBy, deleteDoc, addDoc, updateDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { format, parse, addDays, eachDayOfInterval } from "date-fns";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, PlusCircle, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { it } from "date-fns/locale";

// =================================================================
// TIPI E SCHEMI
// =================================================================

interface Gym {
  id: string;
  name: string;
  weeklySchedule?: any[];
}

interface Event {
    id: string;
    title: string;
    type: 'lesson' | 'stage';
    startTime: Timestamp;
    endTime: Timestamp;
    location?: string;
    gymId?: string;
    gymName?: string;
    discipline?: string;
}

const eventFormSchema = z.object({
    id: z.string().optional(),
    title: z.string().min(3, "Il titolo è obbligatorio."),
    type: z.enum(['lesson', 'stage'], { required_error: "Il tipo è obbligatorio." }),
    startDate: z.date({ required_error: "La data di inizio è obbligatoria." }),
    startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Formato ora non valido (HH:mm)."),
    endDate: z.date({ required_error: "La data di fine è obbligatoria." }),
    endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Formato ora non valido (HH:mm)."),
    discipline: z.string().optional(),
    gymId: z.string().optional(),
    location: z.string().optional(),
    price: z.number().optional(),
    open_to: z.string().optional(),
    description: z.string().optional(),
    imageUrl: z.string().url("URL non valido.").optional().or(z.literal('')),
}).refine(data => {
    if (data.type === 'stage' && !data.location) {
        return false;
    }
    return true;
}, { message: "Il luogo è obbligatorio per gli stage", path: ["location"] });

type EventFormData = z.infer<typeof eventFormSchema>;


// =================================================================
// COMPONENTI
// =================================================================

function EventForm({ event, gyms, onSave, onCancel }: { event?: EventFormData, gyms: Gym[], onSave: (data: EventFormData) => void, onCancel: () => void }) {
    const form = useForm<EventFormData>({
        resolver: zodResolver(eventFormSchema),
        defaultValues: event || {
            type: 'lesson',
            title: '',
            startDate: new Date(),
            endDate: new Date(),
            startTime: '00:00',
            endTime: '00:00',
        }
    });

    const onSubmit = (data: EventFormData) => {
        onSave(data);
    };

    const type = form.watch("type");

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="title" render={({ field }) => (
                    <FormItem><FormLabel>Titolo</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="type" render={({ field }) => (
                    <FormItem><FormLabel>Tipo Evento</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="lesson">Lezione</SelectItem><SelectItem value="stage">Stage</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                )} />

                <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="startDate" render={({ field }) => (
                        <FormItem><FormLabel>Data Inizio</FormLabel><FormControl><DatePicker value={field.value} onChange={field.onChange} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="startTime" render={({ field }) => (
                        <FormItem><FormLabel>Ora Inizio</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                </div>
                 <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="endDate" render={({ field }) => (
                        <FormItem><FormLabel>Data Fine</FormLabel><FormControl><DatePicker value={field.value} onChange={field.onChange} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="endTime" render={({ field }) => (
                        <FormItem><FormLabel>Ora Fine</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                </div>
                
                 <FormField control={form.control} name="discipline" render={({ field }) => (
                    <FormItem><FormLabel>Disciplina</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Seleziona disciplina..."/></SelectTrigger></FormControl><SelectContent><SelectItem value="Karate">Karate</SelectItem><SelectItem value="Aikido">Aikido</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                )} />
                
                {type === 'lesson' && (
                     <FormField control={form.control} name="gymId" render={({ field }) => (
                        <FormItem><FormLabel>Palestra</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Seleziona palestra..."/></SelectTrigger></FormControl><SelectContent>{gyms.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                    )} />
                )}

                {type === 'stage' && (
                    <>
                         <FormField control={form.control} name="location" render={({ field }) => (
                            <FormItem><FormLabel>Luogo</FormLabel><FormControl><Input {...field} placeholder="Es. Palazzetto dello Sport, Milano" /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="price" render={({ field }) => (
                            <FormItem><FormLabel>Prezzo</FormLabel><FormControl><Input type="number" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} /></FormControl><FormMessage /></FormItem>
                        )} />
                         <FormField control={form.control} name="open_to" render={({ field }) => (
                            <FormItem><FormLabel>Aperto a</FormLabel><FormControl><Input {...field} placeholder="Es. Cinture Nere, Tutti i soci" /></FormControl><FormMessage /></FormItem>
                        )} />
                         <FormField control={form.control} name="description" render={({ field }) => (
                            <FormItem><FormLabel>Descrizione</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                         <FormField control={form.control} name="imageUrl" render={({ field }) => (
                            <FormItem><FormLabel>URL Immagine</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                    </>
                )}


                <DialogFooter>
                    <Button type="button" variant="ghost" onClick={onCancel}>Annulla</Button>
                    <Button type="submit">Salva Evento</Button>
                </DialogFooter>
            </form>
        </Form>
    );
}


export default function AdminCalendarPage() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [gyms, setGyms] = useState<Gym[]>([]);
    const [events, setEvents] = useState<Event[]>([]);
    
    // Stati per il generatore
    const [startDate, setStartDate] = useState<Date | undefined>();
    const [endDate, setEndDate] = useState<Date | undefined>();
    const [holidays, setHolidays] = useState('');
    const [selectedGyms, setSelectedGyms] = useState<Record<string, boolean>>({});

    // Stati per il form modale
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState<EventFormData | undefined>(undefined);

    // Mappa per convertire il nome del giorno in un numero (0=Domenica, 1=Lunedì, ecc.)
    const dayNameToIndex: { [key: string]: number } = { 'Domenica': 0, 'Lunedì': 1, 'Martedì': 2, 'Mercoledì': 3, 'Giovedì': 4, 'Venerdì': 5, 'Sabato': 6 };
    const dayIndexToName: { [key: number]: string } = { 0: 'Domenica', 1: 'Lunedì', 2: 'Martedì', 3: 'Mercoledì', 4: 'Giovedì', 5: 'Venerdì', 6: 'Sabato' };

    const fetchAllData = async () => {
        setLoading(true);
        try {
            const gymsSnapshot = await getDocs(collection(db, "gyms"));
            const gymsList = gymsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Gym));
            setGyms(gymsList);
            
            const eventsQuery = query(collection(db, "events"), where("startTime", ">=", Timestamp.now()), orderBy("startTime", "asc"));
            const eventsSnapshot = await getDocs(eventsQuery);
            const eventsList = eventsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data()} as Event));
            setEvents(eventsList);

        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Errore", description: "Impossibile caricare dati." });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAllData();
    }, [toast]);
    
    const handleGenerateCalendar = async () => {
        if (!startDate || !endDate || Object.values(selectedGyms).every(v => !v)) {
            toast({ variant: 'destructive', title: 'Dati mancanti', description: 'Seleziona un periodo e almeno una palestra.' });
            return;
        }

        setIsGenerating(true);
        try {
            const batch = writeBatch(db);
            const eventsCollectionRef = collection(db, "events");

            const parsedHolidays = holidays.split('\n').map(h => h.trim()).filter(Boolean)
              .map(h => format(parse(h, 'dd/MM/yyyy', new Date()), 'yyyy-MM-dd'));

            const interval = eachDayOfInterval({ start: startDate, end: endDate });

            const gymsToProcess = gyms.filter(g => selectedGyms[g.id]);

            for (const gym of gymsToProcess) {
                if (!gym.weeklySchedule) continue;

                for (const date of interval) {
                    const dayOfWeek = date.getDay(); // 0 = Domenica
                    const dateString = format(date, 'yyyy-MM-dd');

                    if (parsedHolidays.includes(dateString)) {
                        continue; // Salta festività
                    }
                    
                    const daySchedule = gym.weeklySchedule.find(s => dayNameToIndex[s.dayOfWeek] === dayOfWeek);

                    if (daySchedule && daySchedule.slots) {
                        for (const slot of daySchedule.slots) {
                            if(slot.category === 'Lezioni Selezione') continue; // Salta lezioni di selezione
                            
                            const [startH, startM] = slot.startTime.split(':').map(Number);
                            const [endH, endM] = slot.endTime.split(':').map(Number);
                            const startTime = new Date(date);
                            startTime.setHours(startH, startM, 0, 0);
                            const endTime = new Date(date);
                            endTime.setHours(endH, endM, 0, 0);

                            const newEvent = {
                                type: 'lesson',
                                title: `${slot.discipline} - ${slot.category}`,
                                startTime: Timestamp.fromDate(startTime),
                                endTime: Timestamp.fromDate(endTime),
                                discipline: slot.discipline,
                                gymId: gym.id,
                                gymName: gym.name,
                            };

                            const newDocRef = doc(eventsCollectionRef);
                            batch.set(newDocRef, newEvent);
                        }
                    }
                }
            }

            await batch.commit();
            toast({ title: 'Successo!', description: `Calendario generato per il periodo selezionato.` });
            await fetchAllData();

        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Errore', description: 'Impossibile generare il calendario.' });
        } finally {
            setIsGenerating(false);
        }
    }
    
    const handleDeleteEvent = async (eventId: string) => {
        if (!window.confirm("Sei sicuro di voler eliminare questo evento? L'azione è irreversibile.")) return;
        try {
            await deleteDoc(doc(db, "events", eventId));
            toast({ title: "Evento eliminato" });
            await fetchAllData();
        } catch (error) {
            toast({ variant: "destructive", title: "Errore", description: "Impossibile eliminare l'evento." });
        }
    }
    
    const handleSaveEvent = async (data: EventFormData) => {
        try {
            const [startH, startM] = data.startTime.split(':').map(Number);
            const [endH, endM] = data.endTime.split(':').map(Number);
            const startTime = new Date(data.startDate);
            startTime.setHours(startH, startM, 0, 0);
            const endTime = new Date(data.endDate);
            endTime.setHours(endH, endM, 0, 0);

            const eventData: any = {
                title: data.title,
                type: data.type,
                startTime: Timestamp.fromDate(startTime),
                endTime: Timestamp.fromDate(endTime),
                discipline: data.discipline || null,
            };
            
            if (data.type === 'lesson') {
                const gym = gyms.find(g => g.id === data.gymId);
                eventData.gymId = data.gymId;
                eventData.gymName = gym?.name;
            } else { // stage
                 eventData.location = data.location;
                 eventData.price = data.price;
                 eventData.open_to = data.open_to;
                 eventData.description = data.description;
                 eventData.imageUrl = data.imageUrl;
            }

            if(data.id) { // Update
                await updateDoc(doc(db, "events", data.id), eventData);
                toast({ title: "Evento aggiornato!" });
            } else { // Create
                await addDoc(collection(db, "events"), eventData);
                toast({ title: "Evento creato!" });
            }

            setIsFormOpen(false);
            setEditingEvent(undefined);
            await fetchAllData();
        } catch (error) {
            console.error(error);
             toast({ variant: "destructive", title: "Errore", description: "Impossibile salvare l'evento." });
        }
    }

    const openEditForm = (event: Event) => {
        const start = event.startTime.toDate();
        const end = event.endTime.toDate();
        setEditingEvent({
            id: event.id,
            title: event.title,
            type: event.type,
            startDate: start,
            startTime: format(start, 'HH:mm'),
            endDate: end,
            endTime: format(end, 'HH:mm'),
            discipline: event.discipline,
            gymId: event.gymId,
            location: event.location,
            // ...altri campi da mappare se necessario
        });
        setIsFormOpen(true);
    };

    const openCreateForm = () => {
        setEditingEvent(undefined);
        setIsFormOpen(true);
    }

    return (
        <div className="space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle>Generatore Calendario Stagionale</CardTitle>
                    <CardDescription>Crea in massa le lezioni di routine per un periodo, escludendo le festività.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                             <Label>Data Inizio Periodo</Label>
                             <DatePicker value={startDate} onChange={setStartDate} />
                        </div>
                         <div className="space-y-2">
                             <Label>Data Fine Periodo</Label>
                             <DatePicker value={endDate} onChange={setEndDate} />
                        </div>
                    </div>
                     <div className="space-y-2">
                        <Label>Palestre da includere</Label>
                        <div className="flex flex-wrap gap-4">
                           {gyms.map(gym => (
                                <div key={gym.id} className="flex items-center space-x-2">
                                    <Checkbox id={gym.id} checked={selectedGyms[gym.id] || false} onCheckedChange={(checked) => setSelectedGyms(prev => ({...prev, [gym.id]: !!checked}))} />
                                    <Label htmlFor={gym.id}>{gym.name}</Label>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Festività da Escludere (una per riga, formato GG/MM/AAAA)</Label>
                        <Textarea placeholder="25/12/2024&#x0a;01/01/2025" value={holidays} onChange={(e) => setHolidays(e.target.value)} />
                    </div>
                </CardContent>
                <CardFooter>
                    <Button onClick={handleGenerateCalendar} disabled={isGenerating}>
                        {isGenerating ? <Loader2 className="animate-spin mr-2" /> : null}
                        Genera Calendario
                    </Button>
                </CardFooter>
            </Card>

             <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>Gestione Eventi</CardTitle>
                            <CardDescription>Gestisci manualmente eventi singoli come stage o lezioni extra.</CardDescription>
                        </div>
                         <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                            <DialogTrigger asChild>
                                 <Button onClick={openCreateForm}><PlusCircle className="mr-2"/>Crea Evento</Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-2xl">
                                <DialogHeader>
                                    <DialogTitle>{editingEvent ? "Modifica Evento" : "Crea Nuovo Evento"}</DialogTitle>
                                </DialogHeader>
                                <EventForm event={editingEvent} gyms={gyms} onSave={handleSaveEvent} onCancel={() => setIsFormOpen(false)} />
                            </DialogContent>
                        </Dialog>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? <div className="flex justify-center h-32 items-center"><Loader2 className="w-8 h-8 animate-spin"/></div> : (
                         <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Titolo</TableHead>
                                    <TableHead>Tipo</TableHead>
                                    <TableHead>Data</TableHead>
                                    <TableHead>Luogo/Palestra</TableHead>
                                    <TableHead className="text-right">Azioni</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {events.map(event => (
                                    <TableRow key={event.id}>
                                        <TableCell className="font-medium">{event.title}</TableCell>
                                        <TableCell>{event.type}</TableCell>
                                        <TableCell>{format(event.startTime.toDate(), "dd/MM/yy HH:mm", {locale: it})}</TableCell>
                                        <TableCell>{event.gymName || event.location}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="sm" onClick={() => openEditForm(event)}>Modifica</Button>
                                            <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDeleteEvent(event.id)}><Trash2 className="w-4 h-4"/></Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                         </Table>
                    )}
                </CardContent>
             </Card>

        </div>
    );
}

