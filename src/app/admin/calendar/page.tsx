
"use client"

import { useState, useEffect, Fragment } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, writeBatch, query, where, Timestamp, orderBy, deleteDoc, addDoc, updateDoc, serverTimestamp, DocumentData, getDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { format, parse, addDays, eachDayOfInterval, isValid, isBefore, nextDay, startOfDay, eachMonthOfInterval, startOfMonth, endOfMonth, getDay, isWithinInterval, getYear, startOfYear, endOfYear } from "date-fns";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, PlusCircle, Trash2, X, Save, MessageSquareWarning, FileWarning, Upload, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
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
    status: 'confermata' | 'annullata';
    notes?: string;
}

interface SavedCalendar {
    id: string;
    calendarName: string;
    gymName: string;
    discipline: string;
    createdAt: Timestamp;
    lessons: Event[]; // Usiamo Event per consistenza
}


interface DateGroup {
    id: string;
    name: string;
    dates: Timestamp[];
}

interface PeriodOption {
    id: string;
    label: string;
    startDate: Date;
    endDate: Date;
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
    status: z.enum(['confermata', 'annullata']).default('confermata'),
    notes: z.string().optional(),
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
            status: 'confermata'
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
                    <>
                        <FormField control={form.control} name="gymId" render={({ field }) => (
                            <FormItem><FormLabel>Palestra</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Seleziona palestra..."/></SelectTrigger></FormControl><SelectContent>{gyms.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                        )} />
                        
                        <FormField control={form.control} name="status" render={({ field }) => (
                            <FormItem><FormLabel>Stato Lezione</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="confermata">Confermata</SelectItem><SelectItem value="annullata">Annullata</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                        )} />

                        <FormField control={form.control} name="notes" render={({ field }) => (
                            <FormItem><FormLabel>Note / Avvisi</FormLabel><FormControl><Textarea {...field} placeholder="Es. Portare protezioni, lezione annullata per maltempo..." /></FormControl><FormMessage /></FormItem>
                        )} />
                    </>
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
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const [gyms, setGyms] = useState<Gym[]>([]);
    const [savedCalendars, setSavedCalendars] = useState<SavedCalendar[]>([]);
    const [events, setEvents] = useState<Event[]>([]); // Contiene gli eventi dell'anteprima o quelli salvati
    const [generatedTitle, setGeneratedTitle] = useState<string | null>(null);
    
    // Stati per il generatore
    const [periodOptions, setPeriodOptions] = useState<PeriodOption[]>([]);
    const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');
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
            const gymsList = gymsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), address: doc.data().address || '' } as Gym));
            setGyms(gymsList);
            
            const dateGroupsSnapshot = await getDocs(query(collection(db, "dateGroups"), orderBy("name")));
            const dateGroupsList = dateGroupsSnapshot.docs.map(doc => {
                 const data = doc.data();
                 const datesArray = Array.isArray(data.dates) ? data.dates : [];
                 return {
                    id: doc.id,
                    name: data.name,
                    dates: datesArray.map((d: any) => d instanceof Timestamp ? d : new Timestamp(d.seconds, d.nanoseconds))
                 } as DateGroup
            });
            setDateGroups(dateGroupsList);

            // Fetch period options
            const activitySettingsSnap = await getDoc(doc(db, "settings", "activity"));
            const seasonSettingsSnap = await getDoc(doc(db, "settings", "season"));
            
            const newPeriodOptions: PeriodOption[] = [];
            if(activitySettingsSnap.exists()) {
                const data = activitySettingsSnap.data();
                newPeriodOptions.push({
                    id: 'activity',
                    label: 'Stagione Allenamenti',
                    startDate: data.startDate.toDate(),
                    endDate: data.endDate.toDate()
                });
            }
             if(seasonSettingsSnap.exists()) {
                const data = seasonSettingsSnap.data();
                newPeriodOptions.push({
                    id: 'season',
                    label: data.label || 'Stagione Sportiva',
                    startDate: data.startDate.toDate(),
                    endDate: data.endDate.toDate()
                });
            }
            const currentYear = new Date();
            newPeriodOptions.push({
                id: 'solar',
                label: `Anno Solare ${getYear(currentYear)}`,
                startDate: startOfYear(currentYear),
                endDate: endOfYear(currentYear)
            });
            setPeriodOptions(newPeriodOptions);
            
            await fetchSavedCalendars();

        } catch (error) {
            console.error(error);
            toast({ variant: "destructive", title: "Errore", description: "Impossibile caricare dati." });
        } finally {
            setLoading(false);
        }
    };
    
     const fetchSavedCalendars = async () => {
        try {
            const calendarsSnapshot = await getDocs(query(collection(db, "calendars"), orderBy("createdAt", "desc")));
            const calendarsList = calendarsSnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data
                } as SavedCalendar;
            });
            setSavedCalendars(calendarsList);
        } catch (error) {
            console.error("Error fetching saved calendars:", error);
            toast({ variant: "destructive", title: "Errore", description: "Impossibile caricare i calendari salvati." });
        } finally {
            setIsSaving(false);
        }
    };


    useEffect(() => {
        fetchInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const selectedPeriod = periodOptions.find(p => p.id === selectedPeriodId);
    
    const handlePreviewCalendar = async () => {
        if (!selectedPeriod || !gymFilter || !disciplineFilter) {
            toast({ variant: "destructive", title: "Dati Mancanti", description: "Seleziona periodo, palestra e disciplina." });
            return;
        }

        setIsGenerating(true);
        setEvents([]); 

        try {
            const { startDate, endDate } = selectedPeriod;
            const selectedGym = gyms.find(g => g.id === gymFilter);
            if (!selectedGym || !selectedGym.weeklySchedule) {
                toast({ variant: "destructive", title: "Dati Palestra Mancanti", description: "La palestra selezionata non ha un orario settimanale configurato." });
                setIsGenerating(false);
                return;
            }

            const exclusionDates = new Set<string>();
            if (selectedDateGroupId !== 'none') {
                const group = dateGroups.find(g => g.id === selectedDateGroupId);
                group?.dates.forEach(d => {
                    exclusionDates.add(format(d.toDate(), 'yyyy-MM-dd'));
                });
            }

            const allDates = eachDayOfInterval({ start: startOfDay(startDate), end: startOfDay(endDate) });
            const dayNames = ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"];
            let generatedEvents: Event[] = [];

            allDates.forEach(date => {
                const dateString = format(date, 'yyyy-MM-dd');
                if (exclusionDates.has(dateString)) {
                    return;
                }

                const dayOfWeekName = dayNames[getDay(date)];
                
                const scheduleForDay = selectedGym.weeklySchedule?.find(d => d.dayOfWeek === dayOfWeekName);

                if (scheduleForDay && scheduleForDay.slots) {
                    scheduleForDay.slots.forEach((slot: any, index: number) => {
                        if (slot.discipline === disciplineFilter) {
                            const [startHour, startMinute] = slot.startTime.split(':').map(Number);
                            const [endHour, endMinute] = slot.endTime.split(':').map(Number);
                            
                            const eventStart = new Date(date);
                            eventStart.setHours(startHour, startMinute, 0, 0);

                            const eventEnd = new Date(date);
                            eventEnd.setHours(endHour, endMinute, 0, 0);
                            
                            generatedEvents.push({
                                id: `${dateString}-${disciplineFilter}-${index}`,
                                title: disciplineFilter, 
                                type: 'lesson',
                                startTime: Timestamp.fromDate(eventStart),
                                endTime: Timestamp.fromDate(eventEnd),
                                gymId: selectedGym.id,
                                gymName: selectedGym.name,
                                discipline: disciplineFilter,
                                status: 'confermata',
                                notes: ''
                            });
                        }
                    });
                }
            });

            setEvents(generatedEvents);
            setGeneratedTitle(`Anteprima per Id (${selectedGym.id}) name (${selectedGym.name}) - ${disciplineFilter} (${generatedEvents.length} lezioni)`);
            toast({ title: "Anteprima Generata", description: `Trovate ${generatedEvents.length} lezioni per i criteri selezionati.` });

        } catch (error) {
            console.error("Error generating preview:", error);
            toast({ variant: "destructive", title: "Errore", description: "Si è verificato un errore durante la generazione dell'anteprima." });
        } finally {
            setIsGenerating(false);
        }
    };


    const handleSaveCalendar = async () => {
        if (events.length === 0 || !gymFilter || !disciplineFilter || !selectedPeriod) {
            toast({ variant: "destructive", title: "Dati insufficienti", description: "Non ci sono eventi nell'anteprima o mancano i filtri per salvare." });
            return;
        }
        setIsSaving(true);
        try {
            const selectedGym = gyms.find(g => g.id === gymFilter);
            if (!selectedGym) {
                 toast({ variant: "destructive", title: "Palestra non trovata", description: "La palestra selezionata non è valida." });
                 setIsSaving(false);
                 return;
            }

            const lessonsToSave = events.map(({ id, ...lessonData }) => lessonData);
            
            const now = new Date();
            const calendarName = `${disciplineFilter} - ${selectedGym.name} - ${selectedPeriod.label} (${format(now, "dd/MM/yy HH:mm")})`;

            const calendarData = {
                gymId: selectedGym.id,
                gymName: selectedGym.name,
                year: getYear(selectedPeriod.startDate),
                discipline: disciplineFilter,
                calendarName: calendarName,
                createdAt: serverTimestamp(),
                lessons: lessonsToSave
            };

            await addDoc(collection(db, "calendars"), calendarData);
            
            await fetchSavedCalendars();

            toast({
                title: "Calendario Salvato!",
                description: `Una nuova versione del calendario con ${events.length} eventi è stata salvata con successo.`,
                variant: "success",
            });

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
        setEvents(prevEvents => prevEvents.filter(event => event.id !== eventId));
        toast({
            title: "Lezione Rimossa dall'Anteprima",
            description: "La lezione è stata eliminata solo dalla visualizzazione corrente. Per salvare le modifiche, clicca su 'Salva su DB'."
        });
    }
    
    const handleSaveEvent = async (data: EventFormData) => {
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
            status: restData.status,
            notes: restData.notes,
        };

        if (data.id) { // Modifica
            setEvents(prev => prev.map(e => e.id === data.id ? newOrUpdatedEvent : e));
        } else { // Creazione
            setEvents(prev => [...prev, newOrUpdatedEvent].sort((a, b) => a.startTime.toMillis() - b.startTime.toMillis()));
        }
        toast({ title: "Evento Aggiornato nell'Anteprima", description: "Salva il calendario per rendere la modifica permanente." });
        setIsFormOpen(false);
        setEditingEvent(undefined);
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
            status: event.status,
            notes: event.notes,
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
    
    const handleLoadCalendar = (calendar: SavedCalendar) => {
        const eventsWithTempIds = calendar.lessons.map((lesson, index) => ({
            ...lesson,
            id: `${calendar.id}-${index}`
        }));
        setEvents(eventsWithTempIds);
        setGeneratedTitle(`Calendario Caricato: ${calendar.calendarName}`);
        toast({ title: "Calendario Caricato", description: `Hai caricato ${calendar.lessons.length} lezioni nell'area di anteprima.`});
    };
    
    const handleDeleteCalendar = async (calendarId: string) => {
        setIsDeleting(calendarId);
        try {
            await deleteDoc(doc(db, "calendars", calendarId));
            await fetchSavedCalendars(); // Ricarica la lista
            toast({ title: "Calendario Eliminato", description: "Il calendario selezionato è stato rimosso con successo.", variant: "success" });
        } catch (error) {
            console.error("Error deleting calendar:", error);
            toast({ variant: "destructive", title: "Errore", description: "Impossibile eliminare il calendario." });
        } finally {
            setIsDeleting(null);
        }
    };
    
    const groupedEvents = events.reduce((acc, event) => {
        const monthYear = format(event.startTime.toDate(), 'MMMM yyyy', { locale: it });
        if (!acc[monthYear]) {
            acc[monthYear] = [];
        }
        acc[monthYear].push(event);
        return acc;
    }, {} as Record<string, Event[]>);


    return (
        <div className="space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle>Generatore Calendario Allenamenti</CardTitle>
                    <CardDescription>Crea in massa le lezioni di routine per un periodo, escludendo le festività.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Periodo Calendario</Label>
                            <Select value={selectedPeriodId} onValueChange={setSelectedPeriodId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleziona un periodo..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {periodOptions.map(option => (
                                        <SelectItem key={option.id} value={option.id}>
                                            {option.label} ({format(option.startDate, 'dd/MM/yy')} - {format(option.endDate, 'dd/MM/yy')})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
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
                                        <SelectItem key={gym.id} value={gym.id}>{gym.id} - {gym.name}</SelectItem>
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
                    <CardTitle>Gestione Calendari Salvati</CardTitle>
                    <CardDescription>Carica, modifica o elimina i calendari che hai già creato e salvato su Firebase.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nome Calendario</TableHead>
                                <TableHead>Disciplina</TableHead>
                                <TableHead>Palestra</TableHead>
                                <TableHead>Creato il</TableHead>
                                <TableHead className="text-right">Azioni</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={5} className="text-center h-24"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></TableCell></TableRow>
                            ) : savedCalendars.length > 0 ? (
                                savedCalendars.map(cal => (
                                    <TableRow key={cal.id}>
                                        <TableCell className="font-medium">{cal.calendarName}</TableCell>
                                        <TableCell>{cal.discipline}</TableCell>
                                        <TableCell>{cal.gymName}</TableCell>
                                        <TableCell>{cal.createdAt ? format(cal.createdAt.toDate(), 'dd/MM/yy HH:mm') : 'N/D'}</TableCell>
                                        <TableCell className="text-right space-x-2">
                                            <Button variant="outline" size="sm" onClick={() => handleLoadCalendar(cal)} disabled={isDeleting === cal.id}>
                                                <Upload className="h-4 w-4 mr-2" />
                                                Carica
                                            </Button>
                                            
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="destructive" size="sm" disabled={isDeleting === cal.id}>
                                                        {isDeleting === cal.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Sei assolutamente sicuro?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            Questa azione non può essere annullata. Questo eliminerà permanentemente il calendario
                                                            <strong className="mx-1">{cal.calendarName}</strong>
                                                            dal database.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Annulla</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDeleteCalendar(cal.id)}>
                                                            Sì, elimina
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>

                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow><TableCell colSpan={5} className="text-center h-24">Nessun calendario salvato trovato.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>


             <Card>
                <CardHeader>
                    <div className="flex justify-between items-start sm:items-center flex-col sm:flex-row gap-4">
                        <div className="flex-1">
                            <CardTitle>Anteprima Calendario</CardTitle>
                            {generatedTitle ? (
                                <CardDescription className="mt-2">{generatedTitle}</CardDescription>
                            ) : (
                                <CardDescription className="mt-2">Genera o carica un calendario per visualizzare gli eventi. Potrai modificarli o salvarli su Firebase.</CardDescription>
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
                                    <TableHead>Stato</TableHead>
                                    <TableHead>Data</TableHead>
                                    <TableHead>Giorno</TableHead>
                                    <TableHead>Orario</TableHead>
                                    <TableHead>Disciplina</TableHead>
                                    <TableHead>Luogo/Palestra</TableHead>
                                    <TableHead className="text-right">Azioni</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {Object.entries(groupedEvents).length > 0 ? (
                                    Object.entries(groupedEvents).map(([monthYear, monthEvents]) => (
                                        <Fragment key={monthYear}>
                                            <TableRow className="bg-muted/50 hover:bg-muted/50">
                                                <TableCell colSpan={7} className="font-bold text-lg capitalize text-primary py-3">
                                                    {monthYear}
                                                </TableCell>
                                            </TableRow>
                                            {monthEvents.map(event => (
                                                <TableRow key={event.id} className={cn(event.status === 'annullata' && 'bg-destructive/10 text-muted-foreground')}>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <Badge variant={event.status === 'annullata' ? 'destructive' : 'success'}>
                                                                {event.status === 'annullata' ? 'Annullata' : 'OK'}
                                                            </Badge>
                                                            {event.notes && (
                                                                <Popover>
                                                                    <PopoverTrigger asChild>
                                                                        <Button variant="ghost" size="icon" className="h-6 w-6">
                                                                            <MessageSquareWarning className="h-4 w-4 text-amber-500" />
                                                                        </Button>
                                                                    </PopoverTrigger>
                                                                    <PopoverContent className="text-sm w-80">
                                                                        <p className="font-bold mb-2">Note lezione:</p>
                                                                        {event.notes}
                                                                    </PopoverContent>
                                                                </Popover>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>{format(event.startTime.toDate(), "dd/MM/yy", {locale: it})}</TableCell>
                                                    <TableCell className="capitalize">{format(event.startTime.toDate(), "eeee", {locale: it})}</TableCell>
                                                    <TableCell>{`${format(event.startTime.toDate(), "HH:mm")} - ${format(event.endTime.toDate(), "HH:mm")}`}</TableCell>
                                                    <TableCell className="font-medium capitalize">{event.discipline}</TableCell>
                                                    <TableCell>{event.gymName || event.location}</TableCell>
                                                    <TableCell className="text-right">
                                                        <Button variant="ghost" size="sm" onClick={() => openEditForm(event)}>Modifica</Button>
                                                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDeleteEvent(event.id)}><Trash2 className="w-4 h-4"/></Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </Fragment>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
                                            Nessun evento da mostrare. Genera un'anteprima o aggiungine uno manualmente.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                         </Table>
                    )}
                </CardContent>
             </Card>

              <Dialog open={isFormOpen} onOpenChange={(isOpen) => { setIsFormOpen(isOpen); if (!isOpen) setEditingEvent(undefined); }}>
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
    

    