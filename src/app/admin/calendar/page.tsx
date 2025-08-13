
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
import { Loader2, PlusCircle, Trash2, X, Save, MessageSquareWarning, FileWarning, Upload, AlertTriangle, PartyPopper, TestTube2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose, DialogDescription } from "@/components/ui/dialog";
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

interface Lesson {
    id: string;
    title: string;
    startTime: Timestamp;
    endTime: Timestamp;
    gymId?: string;
    gymName?: string;
    discipline?: string;
    status: 'confermata' | 'annullata' | 'festivita';
    notes?: string;
}

interface SavedCalendar {
    id: string;
    calendarName: string;
    gymName: string;
    discipline: string;
    createdAt: Timestamp;
    lessons: Lesson[]; 
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

const lessonFormSchema = z.object({
    id: z.string().optional(),
    title: z.string().min(3, "Il titolo è obbligatorio."),
    startDate: z.date({ required_error: "La data di inizio è obbligatoria." }),
    startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Formato ora non valido (HH:mm)."),
    endDate: z.date({ required_error: "La data di fine è obbligatoria." }),
    endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Formato ora non valido (HH:mm)."),
    discipline: z.string().optional(),
    gymId: z.string().optional(),
    status: z.enum(['confermata', 'annullata', 'festivita']).default('confermata'),
    notes: z.string().optional(),
});

type LessonFormData = z.infer<typeof lessonFormSchema>;

const testCalendarFormSchema = z.object({
    startDate: z.date({ required_error: "La data di inizio è obbligatoria." }),
    endDate: z.date({ required_error: "La data di fine è obbligatoria." }),
    gymId: z.string({ required_error: "La palestra è obbligatoria." }),
    discipline: z.enum(['Karate', 'Aikido'], { required_error: "La disciplina è obbligatoria." }),
}).refine(data => data.endDate >= data.startDate, {
    message: "La data di fine non può essere precedente a quella di inizio.",
    path: ["endDate"],
});

type TestCalendarFormData = z.infer<typeof testCalendarFormSchema>;

// =================================================================
// COMPONENTI
// =================================================================

function LessonForm({ lesson, gyms, onSave, onCancel }: { lesson?: LessonFormData, gyms: Gym[], onSave: (data: LessonFormData) => void, onCancel: () => void }) {
    const form = useForm<LessonFormData>({
        resolver: zodResolver(lessonFormSchema),
        defaultValues: lesson || {
            title: '',
            startDate: new Date(),
            endDate: new Date(),
            startTime: '00:00',
            endTime: '00:00',
            status: 'confermata',
            notes: '',
        }
    });

    const onSubmit = (data: LessonFormData) => {
        onSave(data);
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="title" render={({ field }) => (
                    <FormItem><FormLabel>Titolo</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
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
                
                <FormField control={form.control} name="gymId" render={({ field }) => (
                    <FormItem><FormLabel>Palestra</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Seleziona palestra..."/></SelectTrigger></FormControl><SelectContent>{gyms.map(g => <SelectItem key={g.id} value={g.id}>{g.id} - {g.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                )} />
                
                <FormField control={form.control} name="status" render={({ field }) => (
                    <FormItem><FormLabel>Stato Lezione</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="confermata">Confermata</SelectItem><SelectItem value="annullata">Annullata</SelectItem><SelectItem value="festivita">Festività</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                )} />

                <FormField control={form.control} name="notes" render={({ field }) => (
                    <FormItem><FormLabel>Note / Avvisi</FormLabel><FormControl><Textarea {...field} placeholder="Es. Portare protezioni, lezione annullata per maltempo..." /></FormControl><FormMessage /></FormItem>
                )} />

                <DialogFooter>
                    <Button type="button" variant="ghost" onClick={onCancel}>Annulla</Button>
                    <Button type="submit">Salva Lezione</Button>
                </DialogFooter>
            </form>
        </Form>
    );
}

function TestCalendarDialog({ gyms, onGenerate, onOpenChange }: { gyms: Gym[], onGenerate: (data: TestCalendarFormData) => void, onOpenChange: (open: boolean) => void }) {
    const testForm = useForm<TestCalendarFormData>({
        resolver: zodResolver(testCalendarFormSchema),
        defaultValues: {
            startDate: startOfDay(new Date()),
            endDate: addDays(startOfDay(new Date()), 7),
        }
    });

    const handleFormSubmit = (data: TestCalendarFormData) => {
        onGenerate(data);
        onOpenChange(false); // Chiude la modale dopo aver generato
    };

    return (
        <Form {...testForm}>
            <form onSubmit={testForm.handleSubmit(handleFormSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <FormField control={testForm.control} name="startDate" render={({ field }) => (
                        <FormItem><FormLabel>Dal</FormLabel><FormControl><DatePicker value={field.value} onChange={field.onChange} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={testForm.control} name="endDate" render={({ field }) => (
                        <FormItem><FormLabel>Al</FormLabel><FormControl><DatePicker value={field.value} onChange={field.onChange} /></FormControl><FormMessage /></FormItem>
                    )} />
                </div>
                 <FormField control={testForm.control} name="gymId" render={({ field }) => (
                    <FormItem><FormLabel>Palestra</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Seleziona una palestra..."/></SelectTrigger></FormControl><SelectContent>{gyms.map(g => <SelectItem key={g.id} value={g.id}>{g.id} - {g.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                )} />
                 <FormField control={testForm.control} name="discipline" render={({ field }) => (
                    <FormItem><FormLabel>Disciplina</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Seleziona una disciplina..."/></SelectTrigger></FormControl><SelectContent><SelectItem value="Karate">Karate</SelectItem><SelectItem value="Aikido">Aikido</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                )} />
                <DialogFooter>
                     <DialogClose asChild>
                        <Button type="button" variant="ghost">Annulla</Button>
                    </DialogClose>
                    <Button type="submit">Genera Anteprima Test</Button>
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
    const [lessons, setLessons] = useState<Lesson[]>([]); // Contiene le lezioni dell'anteprima o quelle salvate
    const [generatedTitle, setGeneratedTitle] = useState<string | null>(null);
    
    // Stati per il generatore
    const [periodOptions, setPeriodOptions] = useState<PeriodOption[]>([]);
    const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');
    const [dateGroups, setDateGroups] = useState<DateGroup[]>([]);
    
    const [gymFilter, setGymFilter] = useState<string>('');
    const [disciplineFilter, setDisciplineFilter] = useState('Karate');

    // Stati per il form modale
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingLesson, setEditingLesson] = useState<LessonFormData | undefined>(undefined);
    const [isTestFormOpen, setIsTestFormOpen] = useState(false);


    const fetchInitialData = async () => {
        setLoading(true);
        try {
            const gymsSnapshot = await getDocs(query(collection(db, "gyms"), orderBy("name")));
            const gymsList = gymsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), address: doc.data().address || '' } as Gym));
            setGyms(gymsList);
            
            const dateGroupsSnapshot = await getDocs(query(collection(db, "dateGroups")));
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
    
    const handleGenerateCalendar = async () => {
        if (!selectedPeriod || !gymFilter || !disciplineFilter) {
            toast({ variant: "destructive", title: "Dati Mancanti", description: "Seleziona periodo, palestra e disciplina." });
            return;
        }

        setIsGenerating(true);
        setLessons([]); 

        try {
            const { startDate, endDate } = selectedPeriod;
            const selectedGym = gyms.find(g => g.id === gymFilter);
            if (!selectedGym) {
                toast({ variant: "destructive", title: "Palestra non trovata", description: "La palestra selezionata non è valida." });
                setIsGenerating(false);
                return;
            }
            
            let exclusionDates = new Set<string>();
            const exclusionGroup = dateGroups.find(g => g.id === selectedGym.id);
            if (exclusionGroup) {
                exclusionGroup.dates.forEach(d => {
                    exclusionDates.add(format(d.toDate(), 'yyyy-MM-dd'));
                });
            }

            const allDates = eachDayOfInterval({ start: startOfDay(startDate), end: startOfDay(endDate) });
            let generatedLessons: Lesson[] = [];

            allDates.forEach(date => {
                const dateString = format(date, 'yyyy-MM-dd');
                const isHoliday = exclusionDates.has(dateString);
                const dayOfWeek = getDay(date); // Domenica = 0, Lunedì = 1, etc.
                
                const scheduleForDay = selectedGym.weeklySchedule?.find(s => s.dayOfWeek === dayOfWeek);

                if (scheduleForDay) {
                    scheduleForDay.timeSlots.forEach((slot: {startTime: string, endTime: string, discipline: string}, index: number) => {
                        if (slot.discipline === disciplineFilter) {
                            const [startHour, startMinute] = slot.startTime.split(':').map(Number);
                            const [endHour, endMinute] = slot.endTime.split(':').map(Number);

                            const eventStart = new Date(date);
                            eventStart.setHours(startHour, startMinute, 0, 0);

                            const eventEnd = new Date(date);
                            eventEnd.setHours(endHour, endMinute, 0, 0);
                            
                             generatedLessons.push({
                                id: `${dateString}-${index}`,
                                title: isHoliday ? "Chiuso per festività" : disciplineFilter, 
                                startTime: Timestamp.fromDate(eventStart),
                                endTime: Timestamp.fromDate(eventEnd),
                                gymId: selectedGym.id,
                                gymName: `${selectedGym.id} - ${selectedGym.name}`,
                                discipline: disciplineFilter,
                                status: isHoliday ? 'festivita' : 'confermata',
                                notes: isHoliday ? dateGroups.find(g => g.id === selectedGym.id)?.name || 'Festività' : ''
                            });
                        }
                    });
                }
            });

            const operationalLessonsCount = generatedLessons.filter(l => l.status === 'confermata').length;
            setLessons(generatedLessons);
            const gymDisplayName = `${selectedGym.id} - ${selectedGym.name}`;
            
            setGeneratedTitle(`Anteprima Calendario Standard per ${gymDisplayName} - ${disciplineFilter} (${operationalLessonsCount} lezioni)`);
            toast({ title: "Anteprima Generata", description: `Trovate ${operationalLessonsCount} lezioni per i criteri selezionati.` });

        } catch (error) {
            console.error("Error generating preview:", error);
            toast({ variant: "destructive", title: "Errore", description: "Si è verificato un errore durante la generazione dell'anteprima." });
        } finally {
            setIsGenerating(false);
        }
    };
    
    const handleGenerateTestCalendar = async (data: TestCalendarFormData) => {
        setIsGenerating(true);
        setLessons([]);
        try {
            const { startDate, endDate, gymId, discipline } = data;
            const selectedGym = gyms.find(g => g.id === gymId);
            if (!selectedGym) {
                toast({ variant: "destructive", title: "Palestra non trovata" });
                setIsGenerating(false);
                return;
            }

            const allDates = eachDayOfInterval({ start: startOfDay(startDate), end: startOfDay(endDate) });
            let generatedLessons: Lesson[] = [];
            
            allDates.forEach(date => {
                const dateString = format(date, 'yyyy-MM-dd');
                const eventStart = new Date(date);
                eventStart.setHours(18, 0, 0, 0); // Orario fisso 18:00

                const eventEnd = new Date(date);
                eventEnd.setHours(19, 0, 0, 0); // Orario fisso 19:00

                generatedLessons.push({
                    id: `${dateString}-TEST`,
                    title: `${discipline} (Test)`,
                    startTime: Timestamp.fromDate(eventStart),
                    endTime: Timestamp.fromDate(eventEnd),
                    gymId: selectedGym.id,
                    gymName: `${selectedGym.id} - ${selectedGym.name}`,
                    discipline: discipline,
                    status: 'confermata',
                    notes: 'Lezione di test generata automaticamente'
                });
            });

            setLessons(generatedLessons);
            const gymDisplayName = `${selectedGym.id} - ${selectedGym.name}`;
            setGeneratedTitle(`Anteprima Calendario di Test per ${gymDisplayName} - ${discipline} (${generatedLessons.length} lezioni)`);
            toast({ title: "Anteprima Test Generata", description: `Create ${generatedLessons.length} lezioni giornaliere.` });
        } catch (error) {
            console.error("Error generating test preview:", error);
            toast({ variant: "destructive", title: "Errore", description: "Impossibile generare l'anteprima di test." });
        } finally {
            setIsGenerating(false);
        }
    }


    const handleSaveCalendar = async () => {
        if (lessons.length === 0 || !generatedTitle) {
            toast({ variant: "destructive", title: "Dati insufficienti", description: "Non ci sono lezioni nell'anteprima o mancano i filtri per salvare." });
            return;
        }
        
        // Estrai i dati necessari dal titolo generato o da altre fonti di stato
        const isTest = generatedTitle.includes("di Test");
        let gymId, discipline, periodLabel;

        if (isTest) {
            // Per il test, i dati sono nella prima lezione
            gymId = lessons[0].gymId;
            discipline = lessons[0].discipline;
            periodLabel = `Test dal ${format(lessons[0].startTime.toDate(), 'dd/MM/yy')} al ${format(lessons[lessons.length - 1].startTime.toDate(), 'dd/MM/yy')}`
        } else {
             gymId = gymFilter;
             discipline = disciplineFilter;
             periodLabel = selectedPeriod?.label;
        }

        if (!gymId || !discipline || !periodLabel) {
             toast({ variant: "destructive", title: "Dati insufficienti", description: "Impossibile determinare palestra, disciplina o periodo." });
             return;
        }

        setIsSaving(true);
        try {
            const selectedGym = gyms.find(g => g.id === gymId);
            if (!selectedGym) {
                 toast({ variant: "destructive", title: "Palestra non trovata", description: "La palestra selezionata non è valida." });
                 setIsSaving(false);
                 return;
            }
            
            const gymDisplayName = `${selectedGym.id} - ${selectedGym.name}`;

            const calendarData = {
                gymId: selectedGym.id,
                gymName: gymDisplayName,
                year: getYear(lessons[0].startTime.toDate()),
                discipline: discipline,
                calendarName: `Calendario per ${gymDisplayName} - ${discipline} (${periodLabel})`,
                createdAt: serverTimestamp(),
            };
            
            const calendarRef = await addDoc(collection(db, "calendars"), calendarData);

            const batch = writeBatch(db);
            const eventsCollectionRef = collection(db, "events");

            lessons.forEach(lesson => {
                const { id, ...lessonData } = lesson; // Escludiamo l'ID temporaneo
                const newEventRef = doc(eventsCollectionRef); 
                batch.set(newEventRef, {
                    ...lessonData,
                    type: 'lesson', // Aggiungiamo il tipo per distinguerli
                    calendarId: calendarRef.id, // Colleghiamo l'evento al calendario
                    createdAt: serverTimestamp()
                });
            });

            await batch.commit();
            
            await fetchSavedCalendars();
            
            const operationalLessonsCount = lessons.filter(l => l.status === 'confermata').length;

            toast({
                title: "Calendario Salvato!",
                description: `Un nuovo calendario con ${operationalLessonsCount} lezioni operative è stato salvato con successo.`,
                variant: "success",
            });

            setLessons([]);
            setGeneratedTitle(null);
        } catch (error) {
            console.error("Error saving calendar to Firebase:", error);
            toast({ variant: "destructive", title: "Errore di Salvataggio", description: "Impossibile salvare il calendario. Riprova." });
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleDeleteLesson = async (lessonId: string) => {
        setLessons(prevLessons => prevLessons.filter(lesson => lesson.id !== lessonId));
        toast({
            title: "Lezione Rimossa dall'Anteprima",
            description: "La lezione è stata eliminata solo dalla visualizzazione corrente. Per salvare le modifiche, clicca su 'Salva su DB'."
        });
    }
    
    const handleSaveLesson = async (data: LessonFormData) => {
        const { startDate, startTime, endDate, endTime, ...restData } = data;
        const startDateTime = new Date(`${format(startDate, 'yyyy-MM-dd')}T${startTime}`);
        const endDateTime = new Date(`${format(endDate, 'yyyy-MM-dd')}T${endTime}`);
        const selectedGym = gyms.find(g => g.id === restData.gymId)
        
        const newOrUpdatedLesson: Lesson = {
            id: data.id || `manual-${new Date().getTime()}`,
            title: restData.title,
            startTime: Timestamp.fromDate(startDateTime),
            endTime: Timestamp.fromDate(endDateTime),
            discipline: restData.discipline,
            gymId: restData.gymId,
            gymName: selectedGym ? `${selectedGym.id} - ${selectedGym.name}` : undefined,
            status: restData.status,
            notes: restData.notes,
        };

        if (data.id && !data.id.startsWith('manual-')) { // Modifica
            setLessons(prev => prev.map(e => e.id === data.id ? newOrUpdatedLesson : e));
        } else { // Creazione o modifica di una lezione manuale
            const existingIndex = lessons.findIndex(e => e.id === newOrUpdatedLesson.id);
            if (existingIndex > -1) {
                 setLessons(prev => {
                    const newLessons = [...prev];
                    newLessons[existingIndex] = newOrUpdatedLesson;
                    return newLessons;
                 });
            } else {
                setLessons(prev => [...prev, newOrUpdatedLesson].sort((a, b) => a.startTime.toMillis() - b.startTime.toMillis()));
            }
        }
        toast({ title: "Lezione Aggiornata nell'Anteprima", description: "Salva il calendario per rendere la modifica permanente." });
        setIsFormOpen(false);
        setEditingLesson(undefined);
    }

    const openEditForm = (lesson: Lesson) => {
        const start = lesson.startTime.toDate();
        const end = lesson.endTime.toDate();
        setEditingLesson({
            id: lesson.id,
            title: lesson.title,
            startDate: start,
            startTime: format(start, 'HH:mm'),
            endDate: end,
            endTime: format(end, 'HH:mm'),
            discipline: lesson.discipline,
            gymId: lesson.gymId,
            status: lesson.status,
            notes: lesson.notes,
        });
        setIsFormOpen(true);
    };

    const openCreateForm = () => {
        setEditingLesson(undefined);
        setIsFormOpen(true);
    }
    
    const handleLoadCalendar = async (calendar: SavedCalendar) => {
        try {
            const eventsQuery = query(collection(db, "events"), where("calendarId", "==", calendar.id), orderBy("startTime", "asc"));
            const eventsSnapshot = await getDocs(eventsQuery);
            const lessonsList = eventsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data()} as Lesson));

            setLessons(lessonsList);
            const operationalLessonsCount = lessonsList.filter(l => l.status === 'confermata').length;
            setGeneratedTitle(`Calendario Caricato: ${calendar.calendarName} (${operationalLessonsCount} lezioni)`);
            toast({ title: "Calendario Caricato", description: `Hai caricato ${lessonsList.length} lezioni totali nell'area di anteprima.`});

        } catch (error) {
            console.error("Error loading lessons for calendar:", error);
            toast({ variant: "destructive", title: "Errore", description: "Impossibile caricare le lezioni del calendario." });
        }
    };
    
    const handleDeleteCalendar = async (calendarId: string) => {
        setIsDeleting(calendarId);
        try {
            const batch = writeBatch(db);

            // 1. Trova tutti gli eventi associati al calendario
            const eventsQuery = query(collection(db, "events"), where("calendarId", "==", calendarId));
            const eventsSnapshot = await getDocs(eventsQuery);
            
            // 2. Aggiungi l'eliminazione di ogni evento al batch
            eventsSnapshot.forEach(eventDoc => {
                batch.delete(eventDoc.ref);
            });

            // 3. Aggiungi l'eliminazione del calendario stesso al batch
            const calendarRef = doc(db, "calendars", calendarId);
            batch.delete(calendarRef);

            // 4. Esegui il batch
            await batch.commit();

            // 5. Aggiorna l'interfaccia
            await fetchSavedCalendars(); 
            toast({ 
                title: "Calendario Eliminato", 
                description: "Il calendario e tutte le sue lezioni associate sono stati rimossi con successo.", 
                variant: "success" 
            });

        } catch (error) {
            console.error("Error deleting calendar and its events:", error);
            toast({ variant: "destructive", title: "Errore", description: "Impossibile eliminare il calendario e le sue lezioni. Se il problema persiste, crea un indice su 'calendarId' in Firestore (verrà generato un link nella console del browser se necessario)." });
        } finally {
            setIsDeleting(null);
        }
    };
    
    const groupedLessons = lessons.reduce((acc, lesson) => {
        const monthYear = format(lesson.startTime.toDate(), 'MMMM yyyy', { locale: it });
        if (!acc[monthYear]) {
            acc[monthYear] = [];
        }
        acc[monthYear].push(lesson);
        return acc;
    }, {} as Record<string, Lesson[]>);


    return (
        <div className="space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle>Generatore Calendario Allenamenti</CardTitle>
                    <CardDescription>Crea in massa le lezioni di routine per un periodo, includendo le festività.</CardDescription>
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
                     <div className="grid grid-cols-1">
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
                    </div>
                </CardContent>
                <CardFooter className="flex gap-2">
                    <Button onClick={() => handleGenerateCalendar()} disabled={isGenerating || isSaving}>
                        {isGenerating ? <Loader2 className="animate-spin mr-2" /> : null}
                        Genera Anteprima
                    </Button>
                    <Dialog open={isTestFormOpen} onOpenChange={setIsTestFormOpen}>
                        <DialogTrigger asChild>
                             <Button variant="secondary">
                                <TestTube2 className="mr-2" />
                                Genera Calendario di Test
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                             <DialogHeader>
                                <DialogTitle>Crea Calendario di Test</DialogTitle>
                                <DialogDescription>
                                    Seleziona un intervallo di date, una palestra e una disciplina. Verrà creata una lezione al giorno (18:00-19:00).
                                </DialogDescription>
                            </DialogHeader>
                           <TestCalendarDialog gyms={gyms} onGenerate={handleGenerateTestCalendar} onOpenChange={setIsTestFormOpen} />
                        </DialogContent>
                    </Dialog>
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
                                                            e tutte le lezioni associate dal database.
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
                                <CardDescription className="mt-2">Genera o carica un calendario per visualizzare le lezioni. Potrai modificarle o salvarle su Firebase.</CardDescription>
                            )}
                        </div>
                        <div className="flex w-full sm:w-auto gap-2">
                             <Button onClick={openCreateForm} variant="outline" className="w-full sm:w-auto"><PlusCircle className="mr-2"/>Aggiungi Lezione</Button>
                             <Button onClick={handleSaveCalendar} disabled={isSaving || isGenerating || lessons.length === 0} className="w-full sm:w-auto">
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
                                    <TableHead>Titolo Lezione</TableHead>
                                    <TableHead>Luogo/Palestra</TableHead>
                                    <TableHead className="text-right">Azioni</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {Object.entries(groupedLessons).length > 0 ? (
                                    Object.entries(groupedLessons).map(([monthYear, monthLessons]) => (
                                        <Fragment key={monthYear}>
                                            <TableRow className="bg-muted/50 hover:bg-muted/50">
                                                <TableCell colSpan={7} className="font-bold text-lg capitalize text-primary py-3">
                                                    {monthYear}
                                                </TableCell>
                                            </TableRow>
                                            {monthLessons.map(lesson => (
                                                <TableRow key={lesson.id} className={cn(
                                                    lesson.status === 'annullata' && 'bg-destructive/10 text-muted-foreground',
                                                    lesson.status === 'festivita' && 'bg-blue-500/10 text-blue-800'
                                                    )}>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <Badge variant={
                                                                lesson.status === 'annullata' ? 'destructive' : 
                                                                lesson.status === 'festivita' ? 'info' : 'success'
                                                                }>
                                                                {lesson.status === 'annullata' ? 'Annullata' : lesson.status === 'festivita' ? 'Festività' : 'OK'}
                                                            </Badge>
                                                            {lesson.notes && (
                                                                <Popover>
                                                                    <PopoverTrigger asChild>
                                                                        <Button variant="ghost" size="icon" className="h-6 w-6">
                                                                            {lesson.status === 'festivita' 
                                                                                ? <PartyPopper className="h-4 w-4 text-blue-500" />
                                                                                : <MessageSquareWarning className="h-4 w-4 text-amber-500" />
                                                                            }
                                                                        </Button>
                                                                    </PopoverTrigger>
                                                                    <PopoverContent className="text-sm w-80">
                                                                        <p className="font-bold mb-2">Note lezione:</p>
                                                                        {lesson.notes}
                                                                    </PopoverContent>
                                                                </Popover>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>{format(lesson.startTime.toDate(), "dd/MM/yy", {locale: it})}</TableCell>
                                                    <TableCell className="capitalize">{format(lesson.startTime.toDate(), "eeee", {locale: it})}</TableCell>
                                                    <TableCell>{`${format(lesson.startTime.toDate(), "HH:mm")} - ${format(lesson.endTime.toDate(), "HH:mm")}`}</TableCell>
                                                    <TableCell className="font-medium capitalize">{lesson.title}</TableCell>
                                                    <TableCell>{lesson.gymName}</TableCell>
                                                    <TableCell className="text-right">
                                                        <Button variant="ghost" size="sm" onClick={() => openEditForm(lesson)}>Modifica</Button>
                                                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDeleteLesson(lesson.id)}><Trash2 className="w-4 h-4"/></Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </Fragment>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
                                            Nessuna lezione da mostrare. Genera un'anteprima o aggiungine una manualmente.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                         </Table>
                    )}
                </CardContent>
             </Card>

              <Dialog open={isFormOpen} onOpenChange={(isOpen) => { setIsFormOpen(isOpen); if (!isOpen) setEditingLesson(undefined); }}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{editingLesson ? "Modifica Lezione" : "Crea Nuova Lezione"}</DialogTitle>
                    </DialogHeader>
                    <LessonForm 
                        lesson={editingLesson} 
                        gyms={gyms} 
                        onSave={handleSaveLesson} 
                        onCancel={() => setIsFormOpen(false)} 
                    />
                </DialogContent>
            </Dialog>

        </div>
    );
}
