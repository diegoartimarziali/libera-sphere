
"use client"

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, writeBatch, query, where, Timestamp, orderBy, deleteDoc, addDoc, updateDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { format, parse, addDays, eachDayOfInterval, isValid, isBefore, nextDay, startOfDay, eachMonthOfInterval, startOfMonth, endOfMonth, getDay, isWithinInterval } from "date-fns";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, PlusCircle, Trash2, X, Save } from "lucide-react";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// =================================================================
// TIPI E SCHEMI
// =================================================================

interface Gym {
  id: string;
  name: string;
  address?: string;
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

interface DateGroup {
    id: string;
    name: string;
    dates: Timestamp[];
}

interface MonthOption {
    value: string; // 'all' or 'YYYY-MM'
    label: string; // 'Tutti i mesi' or 'Mese Anno'
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
                    <FormItem><FormLabel>Tipo Evento</FormLabel><Select onValuechange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="lesson">Lezione</SelectItem><SelectItem value="stage">Stage</SelectItem></SelectContent></Select><FormMessage /></FormItem>
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
    const [isSaving, setIsSaving] = useState(false);
    const [gyms, setGyms] = useState<Gym[]>([]);
    const [events, setEvents] = useState<Event[]>([]); // Contiene gli eventi dell'anteprima o quelli salvati
    const [generatedTitle, setGeneratedTitle] = useState<string | null>(null);
    
    // Stati per il generatore
    const [startDate, setStartDate] = useState<Date | undefined>();
    const [endDate, setEndDate] = useState<Date | undefined>();
    const [availableMonths, setAvailableMonths] = useState<MonthOption[]>([]);
    const [selectedMonth, setSelectedMonth] = useState('all');

    const [dateGroups, setDateGroups] = useState<DateGroup[]>([]);
    const [selectedDateGroupId, setSelectedDateGroupId] = useState<string>('none');
    
    const [gymFilter, setGymFilter] = useState<string>('');
    const [disciplineFilter, setDisciplineFilter] = useState('Karate');

    // Stati per il form modale
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState<EventFormData | undefined>(undefined);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            const gymsSnapshot = await getDocs(query(collection(db, "gyms"), orderBy("name")));
            const gymsList = gymsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Gym));
            setGyms(gymsList);
            
            const dateGroupsSnapshot = await getDocs(query(collection(db, "dateGroups"), orderBy("name")));
            const dateGroupsList = dateGroupsSnapshot.docs.map(doc => {
                 const data = doc.data();
                 const datesArray = Array.isArray(data.dates) ? data.dates : [];
                 return {
                    id: doc.id,
                    name: data.name,
                    // Assicura che le date siano oggetti Timestamp
                    dates: datesArray.map((d: any) => d instanceof Timestamp ? d : new Timestamp(d.seconds, d.nanoseconds))
                 } as DateGroup
            });
            setDateGroups(dateGroupsList);

        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Errore", description: "Impossibile caricare dati." });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (startDate && endDate && isBefore(endDate, startDate) === false) {
            const months = eachMonthOfInterval({ start: startDate, end: endDate });
            const monthOptions: MonthOption[] = months.map(monthStart => ({
                value: format(monthStart, 'yyyy-MM'),
                label: format(monthStart, 'MMMM yyyy', { locale: it })
            }));
            setAvailableMonths([
                { value: 'all', label: 'Tutti i mesi' },
                ...monthOptions
            ]);
        } else {
            setAvailableMonths([]);
        }
        setSelectedMonth('all');
    }, [startDate, endDate]);
    
    const handlePreviewCalendar = async () => {
        setIsGenerating(true);
        setEvents([]); 
        setGeneratedTitle(null);

        // --- VALIDAZIONE ---
        if (!startDate || !endDate || isBefore(endDate, startDate)) {
            toast({ variant: "destructive", title: "Date non valide", description: "Seleziona un intervallo di date valido." });
            setIsGenerating(false);
            return;
        }
         if (!gymFilter) {
            toast({ variant: "destructive", title: "Palestra non selezionata", description: "Devi selezionare una palestra specifica per generare il calendario." });
            setIsGenerating(false);
            return;
        }

        const selectedGym = gyms.find(g => g.id === gymFilter);
        if (!selectedGym || !selectedGym.weeklySchedule) {
            toast({ variant: "destructive", title: "Dati palestra incompleti", description: "La palestra selezionata non ha un orario settimanale definito. Controlla e aggiorna i dati della palestra." });
            setIsGenerating(false);
            return;
        }
        
        try {
            const allDates = eachDayOfInterval({ start: startDate, end: endDate });
            
            const selectedGroup = dateGroups.find(g => g.id === selectedDateGroupId);
            const excludedDates = selectedGroup && Array.isArray(selectedGroup.dates)
                ? selectedGroup.dates.map(ts => startOfDay(ts.toDate()).getTime())
                : [];
            
            let filteredDates = allDates;
            
            if (selectedMonth !== 'all') {
                const [year, month] = selectedMonth.split('-').map(Number);
                const monthStart = startOfMonth(new Date(year, month - 1));
                const monthEnd = endOfMonth(new Date(year, month - 1));
                filteredDates = filteredDates.filter(date => isWithinInterval(date, { start: monthStart, end: monthEnd }));
            }
            
            const newEvents: Event[] = [];

            filteredDates.forEach(date => {
                if (excludedDates.includes(startOfDay(date).getTime())) {
                    return;
                }
                
                const dayOfWeekName = format(date, "EEEE", { locale: it });

                selectedGym.weeklySchedule
                    ?.filter(schedule => schedule.dayOfWeek === dayOfWeekName && schedule.discipline === disciplineFilter)
                    .forEach((scheduleSlot, index) => {
                        scheduleSlot.slots.forEach((slot: any, slotIndex: number) => {
                            const [startHour, startMinute] = slot.startTime.split(':').map(Number);
                            const [endHour, endMinute] = slot.endTime.split(':').map(Number);

                            const eventStart = new Date(date.getFullYear(), date.getMonth(), date.getDate(), startHour, startMinute);
                            const eventEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate(), endHour, endMinute);

                            newEvents.push({
                                id: `preview-${format(date, 'yyyy-MM-dd')}-${slotIndex}-${index}`,
                                title: slot.category,
                                type: 'lesson',
                                startTime: Timestamp.fromDate(eventStart),
                                endTime: Timestamp.fromDate(eventEnd),
                                gymId: selectedGym.id,
                                gymName: selectedGym.name,
                                discipline: disciplineFilter,
                            });
                        });
                    });
            });
            
            setEvents(newEvents);
            
            const monthLabel = availableMonths.find(m => m.value === selectedMonth)?.label || "Tutti i mesi";
            const gymLabel = selectedGym.name;
            const title = `Calendario stagione ${format(startDate, "dd/MM/yy")} - ${format(endDate, "dd/MM/yy")} ${selectedMonth !== 'all' ? `(${monthLabel})` : ''} | Palestra: ${gymLabel}`;
            setGeneratedTitle(title);

            toast({
                title: "Anteprima Generata",
                description: `Sono state create ${newEvents.length} lezioni in memoria. Controlla e salva per renderle permanenti.`
            });

        } catch (error) {
             console.error("Error during calendar preview generation:", error);
             toast({ variant: "destructive", title: "Errore di Anteprima", description: "Si è verificato un errore durante la generazione." });
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSaveCalendar = async () => {
        if (events.length === 0) {
            toast({ variant: "destructive", title: "Nessun evento", description: "Non ci sono eventi nell'anteprima da salvare." });
            return;
        }
        setIsSaving(true);
        try {
            const batch = writeBatch(db);
            events.forEach(event => {
                const newEventRef = doc(collection(db, "events"));
                const { id, ...eventData } = event; // Escludi l'ID di anteprima
                batch.set(newEventRef, eventData);
            });
            await batch.commit();
            toast({
                title: "Calendario Salvato!",
                description: `${events.length} eventi sono stati salvati con successo su Firebase.`,
                variant: "success",
            });
            // Svuota l'anteprima dopo il salvataggio
            setEvents([]);
            setGeneratedTitle(null);
        } catch (error) {
            console.error("Error saving calendar to Firebase:", error);
            toast({ variant: "destructive", title: "Errore di Salvataggio", description: "Impossibile salvare il calendario. Riprova." });
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleDeleteEvent = async (eventId: string) => {
        // Questa funzione ora gestisce solo l'eliminazione dall'anteprima in memoria
        setEvents(prevEvents => prevEvents.filter(event => event.id !== eventId));
        toast({
            title: "Lezione Rimossa dall'Anteprima",
            description: "La lezione è stata eliminata solo dalla visualizzazione corrente. Per salvare le modifiche, clicca su 'Salva Calendario'."
        });
    }
    
    const handleSaveEvent = async (data: EventFormData) => {
        // Questa funzione ora gestisce solo aggiunta/modifica nell'anteprima in memoria
        const { startDate, startTime, endDate, endTime, ...restData } = data;
        const startDateTime = new Date(`${format(startDate, 'yyyy-MM-dd')}T${startTime}`);
        const endDateTime = new Date(`${format(endDate, 'yyyy-MM-dd')}T${endTime}`);
        
        const newOrUpdatedEvent: Event = {
            id: data.id || `manual-${new Date().getTime()}`,
            title: restData.title,
            type: restData.type,
            startTime: Timestamp.fromDate(startDateTime),
            endTime: Timestamp.fromDate(endDateTime),
            discipline: restData.discipline,
            gymId: restData.gymId,
            gymName: gyms.find(g => g.id === restData.gymId)?.name,
            location: restData.location,
        };

        if (data.id) { // Modifica
            setEvents(prev => prev.map(e => e.id === data.id ? newOrUpdatedEvent : e));
        } else { // Creazione
            setEvents(prev => [...prev, newOrUpdatedEvent]);
        }
        toast({ title: "Evento Aggiornato nell'Anteprima", description: "Salva il calendario per rendere la modifica permanente." });
        setIsFormOpen(false);
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
    
    const handleDateGroupChange = (groupId: string) => {
        setSelectedDateGroupId(groupId);
    };


    return (
        <div className="space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle>Generatore Calendario Stagionale</CardTitle>
                    <CardDescription>Crea in massa le lezioni di routine per un periodo, escludendo le festività.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                             <Label>Data Inizio Calendario</Label>
                             <DatePicker value={startDate} onChange={setStartDate} />
                        </div>
                         <div className="space-y-2">
                             <Label>Data Fine Calendario</Label>
                             <DatePicker value={endDate} onChange={setEndDate} />
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Periodo da escludere</Label>
                            <Select value={selectedDateGroupId} onValueChange={handleDateGroupChange}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleziona un gruppo di date..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Nessuna esclusione</SelectItem>
                                    {dateGroups.map(group => (
                                        <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Filtra per Mese</Label>
                             <Select value={selectedMonth} onValueChange={setSelectedMonth} disabled={availableMonths.length === 0}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleziona un mese..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableMonths.map(month => (
                                        <SelectItem key={month.value} value={month.value}>{month.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div className="space-y-2">
                            <Label>Filtra per Palestra</Label>
                            <Select value={gymFilter} onValueChange={setGymFilter}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleziona una palestra..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {gyms.map(gym => (
                                        <SelectItem key={gym.id} value={gym.id}>{gym.name} - {gym.address}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                         <div className="space-y-2">
                            <Label>Filtra per Disciplina</Label>
                            <Select value={disciplineFilter} onValueChange={setDisciplineFilter}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Karate">Karate</SelectItem>
                                    <SelectItem value="Aikido">Aikido</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button onClick={handlePreviewCalendar} disabled={isGenerating || isSaving}>
                        {isGenerating ? <Loader2 className="animate-spin mr-2" /> : null}
                        Genera Anteprima
                    </Button>
                </CardFooter>
            </Card>

             <Card>
                <CardHeader>
                    <div className="flex justify-between items-start sm:items-center flex-col sm:flex-row gap-4">
                        <div className="flex-1">
                            <CardTitle>Anteprima Calendario</CardTitle>
                            {generatedTitle ? (
                                <CardDescription className="mt-2">{generatedTitle}</CardDescription>
                            ) : (
                                <CardDescription className="mt-2">Genera un'anteprima per visualizzare gli eventi. Potrai modificarli o salvarli su Firebase.</CardDescription>
                            )}
                        </div>
                        <div className="flex w-full sm:w-auto gap-2">
                             <Button onClick={openCreateForm} variant="outline" className="w-full sm:w-auto"><PlusCircle className="mr-2"/>Aggiungi</Button>
                             <Button onClick={handleSaveCalendar} disabled={isSaving || isGenerating || events.length === 0} className="w-full sm:w-auto">
                                {isSaving ? <Loader2 className="animate-spin mr-2"/> : <Save className="mr-2" />}
                                Salva su DB
                             </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? <div className="flex justify-center h-32 items-center"><Loader2 className="w-8 h-8 animate-spin"/></div> : (
                         <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Titolo</TableHead>
                                    <TableHead>Tipo</TableHead>
                                    <TableHead>Giorno</TableHead>
                                    <TableHead>Data</TableHead>
                                    <TableHead>Luogo/Palestra</TableHead>
                                    <TableHead className="text-right">Azioni</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {events.map(event => (
                                    <TableRow key={event.id}>
                                        <TableCell className="font-medium">{event.title}</TableCell>
                                        <TableCell className="capitalize">{event.type}</TableCell>
                                        <TableCell className="capitalize">{format(event.startTime.toDate(), "eeee", {locale: it})}</TableCell>
                                        <TableCell>{format(event.startTime.toDate(), "dd/MM/yy HH:mm", {locale: it})}</TableCell>
                                        <TableCell>{event.gymName || event.location}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="sm" onClick={() => openEditForm(event)}>Modifica</Button>
                                            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDeleteEvent(event.id)}><Trash2 className="w-4 h-4"/></Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {events.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                                            Nessun evento da mostrare. Genera un'anteprima o aggiungine uno manualmente.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                         </Table>
                    )}
                </CardContent>
             </Card>

              <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{editingEvent ? "Modifica Evento" : "Crea Nuovo Evento"}</DialogTitle>
                    </DialogHeader>
                    <EventForm 
                        event={editingEvent} 
                        gyms={gyms} 
                        onSave={handleSaveEvent} 
                        onCancel={() => setIsFormOpen(false)} 
                    />
                </DialogContent>
            </Dialog>

        </div>
    );
}
    

    

    
