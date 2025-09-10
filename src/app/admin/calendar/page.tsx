
"use client"

import { useState, useEffect, Fragment } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, writeBatch, query, where, Timestamp, orderBy, deleteDoc, addDoc, updateDoc, serverTimestamp, DocumentData, getDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { format, parseISO, addDays, eachDayOfInterval, isValid, isBefore, nextDay, startOfDay, eachMonthOfInterval, startOfMonth, endOfMonth, getDay, isWithinInterval, getYear, startOfYear, endOfYear } from "date-fns";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, PlusCircle, Trash2, X, Save, MessageSquareWarning, FileWarning, Upload, AlertTriangle, PartyPopper, TestTube2, Edit } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
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

// Helper per trasformare una data in una stringa 'yyyy-MM-dd' o undefined
const dateToInputString = (date?: Date | Timestamp): string | undefined => {
    if (!date) return undefined;
    const dateObj = date instanceof Timestamp ? date.toDate() : date;
    return format(dateObj, 'yyyy-MM-dd');
};

const lessonFormSchema = z.object({
    id: z.string().optional(),
    title: z.string().min(1, "Il titolo è obbligatorio."),
    startDate: z.string({ required_error: "La data di inizio è obbligatoria." }),
    startTime: z.string({ required_error: "L'ora di inizio è obbligatoria." }).regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Formato ora non valido (HH:mm)."),
    endDate: z.string({ required_error: "La data di fine è obbligatoria." }),
    endTime: z.string({ required_error: "L'ora di fine è obbligatoria." }).regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Formato ora non valido (HH:mm)."),
    discipline: z.string({ required_error: "La disciplina è obbligatoria." }).min(1, "La disciplina è obbligatoria."),
    gymId: z.string({ required_error: "La palestra è obbligatoria." }).min(1, "La palestra è obbligatoria."),
    status: z.enum(['confermata', 'annullata', 'festivita']).default('confermata'),
    notes: z.string().optional(),
});

type LessonFormData = z.infer<typeof lessonFormSchema>;

const testCalendarFormSchema = z.object({
    startDate: z.string({ required_error: "La data di inizio è obbligatoria." }),
    endDate: z.string({ required_error: "La data di fine è obbligatoria." }),
    gymId: z.string({ required_error: "La palestra è obbligatoria." }),
    discipline: z.enum(['Karate', 'Aikido'], { required_error: "La disciplina è obbligatoria." }),
}).refine(data => parseISO(data.endDate) >= parseISO(data.startDate), {
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
            startDate: format(new Date(), 'yyyy-MM-dd'),
            endDate: format(new Date(), 'yyyy-MM-dd'),
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
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 sm:space-y-4 px-1 sm:px-0">
                <FormField control={form.control} name="title" render={({ field }) => (
                    <FormItem><FormLabel className="text-amber-800 text-sm sm:text-base">Titolo</FormLabel><FormControl><Input {...field} className="bg-white text-black h-10 sm:h-auto" /></FormControl><FormMessage /></FormItem>
                )} />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
                    <FormField control={form.control} name="startDate" render={({ field }) => (
                        <FormItem><FormLabel className="text-amber-800 text-sm font-medium">Data Inizio</FormLabel><FormControl><Input type="date" {...field} placeholder="00/00/0000" className="bg-white text-black h-9 sm:h-10 text-sm" /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="startTime" render={({ field }) => (
                        <FormItem><FormLabel className="text-amber-800 text-sm font-medium">Ora Inizio</FormLabel><FormControl><Input type="time" {...field} placeholder="00:00" className="bg-white text-black h-9 sm:h-10 text-sm" /></FormControl><FormMessage /></FormItem>
                    )} />
                </div>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
                    <FormField control={form.control} name="endDate" render={({ field }) => (
                        <FormItem><FormLabel className="text-amber-800 text-sm font-medium">Data Fine</FormLabel><FormControl><Input type="date" {...field} placeholder="00/00/0000" className="bg-white text-black h-9 sm:h-10 text-sm" /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="endTime" render={({ field }) => (
                        <FormItem><FormLabel className="text-amber-800 text-sm font-medium">Ora Fine</FormLabel><FormControl><Input type="time" {...field} placeholder="00:00" className="bg-white text-black h-9 sm:h-10 text-sm" /></FormControl><FormMessage /></FormItem>
                    )} />
                </div>
                
                 <FormField control={form.control} name="discipline" render={({ field }) => (
                    <FormItem><FormLabel className="text-amber-800 text-sm font-medium">Disciplina</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger className="bg-white text-black h-9 sm:h-10 text-sm"><SelectValue placeholder="Seleziona disciplina..."/></SelectTrigger></FormControl><SelectContent><SelectItem value="Karate">Karate</SelectItem><SelectItem value="Aikido">Aikido</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                )} />
                
                <FormField control={form.control} name="gymId" render={({ field }) => (
                    <FormItem><FormLabel className="text-amber-800 text-sm font-medium">Palestra</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger className="bg-white text-black h-9 sm:h-10 text-sm"><SelectValue placeholder="Seleziona palestra..."/></SelectTrigger></FormControl><SelectContent>{gyms.map(g => <SelectItem key={g.id} value={g.id}>{g.id} - {g.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                )} />
                
                <FormField control={form.control} name="status" render={({ field }) => (
                    <FormItem><FormLabel className="text-amber-800 text-sm font-medium">Stato Lezione</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger className="bg-white text-black h-9 sm:h-10 text-sm"><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="confermata">Confermata</SelectItem><SelectItem value="annullata">Annullata</SelectItem><SelectItem value="festivita">Festività</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                )} />

                <FormField control={form.control} name="notes" render={({ field }) => (
                    <FormItem><FormLabel className="text-amber-800 text-sm font-medium">Note / Avvisi</FormLabel><FormControl><Textarea {...field} placeholder="Es. Portare protezioni, lezione annullata per maltempo..." className="bg-white text-black min-h-[60px] sm:min-h-[80px] text-sm resize-none" /></FormControl><FormMessage /></FormItem>
                )} />

                <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-4 border-t">
                    <Button type="button" variant="outline" onClick={onCancel} className="bg-transparent text-amber-800 border-amber-800 hover:bg-amber-50 w-full sm:w-auto order-2 sm:order-1 h-9 sm:h-10 text-sm">Annulla</Button>
                    <Button type="submit" variant="outline" className="bg-transparent text-green-600 border-green-600 hover:bg-green-50 w-full sm:w-auto order-1 sm:order-2 h-9 sm:h-10 text-sm font-medium">Salva Lezione</Button>
                </DialogFooter>
            </form>
        </Form>
    );
}

function TestCalendarDialog({ gyms, onGenerate, onOpenChange }: { gyms: Gym[], onGenerate: (data: TestCalendarFormData) => void, onOpenChange: (open: boolean) => void }) {
    const testForm = useForm<TestCalendarFormData>({
        resolver: zodResolver(testCalendarFormSchema),
        defaultValues: {
            startDate: dateToInputString(startOfDay(new Date())),
            endDate: dateToInputString(addDays(startOfDay(new Date()), 7)),
        }
    });

    const handleFormSubmit = (data: TestCalendarFormData) => {
        onGenerate(data);
        onOpenChange(false); // Chiude la modale dopo aver generato
    };

    return (
        <Form {...testForm}>
            <form onSubmit={testForm.handleSubmit(handleFormSubmit)} className="space-y-4 p-1 sm:p-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <FormField control={testForm.control} name="startDate" render={({ field }) => (
                        <FormItem><FormLabel className="text-sm sm:text-base">Dal</FormLabel><FormControl><Input type="date" {...field} className="bg-white text-black h-10 sm:h-auto" /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={testForm.control} name="endDate" render={({ field }) => (
                        <FormItem><FormLabel className="text-sm sm:text-base">Al</FormLabel><FormControl><Input type="date" {...field} className="bg-white text-black h-10 sm:h-auto" /></FormControl><FormMessage /></FormItem>
                    )} />
                </div>
                 <FormField control={testForm.control} name="gymId" render={({ field }) => (
                    <FormItem><FormLabel className="text-sm sm:text-base">Palestra</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger className="bg-white text-black h-10 sm:h-auto"><SelectValue placeholder="Seleziona una palestra..."/></SelectTrigger></FormControl><SelectContent>{gyms.map(g => <SelectItem key={g.id} value={g.id}>{g.id} - {g.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                )} />
                 <FormField control={testForm.control} name="discipline" render={({ field }) => (
                    <FormItem><FormLabel className="text-sm sm:text-base">Disciplina</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger className="bg-white text-black h-10 sm:h-auto"><SelectValue placeholder="Seleziona una disciplina..."/></SelectTrigger></FormControl><SelectContent><SelectItem value="Karate">Karate</SelectItem><SelectItem value="Aikido">Aikido</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                )} />
                <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-2 space-y-2 sm:space-y-0">
                     <DialogClose asChild>
                        <Button type="button" variant="ghost" className="w-full sm:w-auto order-2 sm:order-1">Annulla</Button>
                    </DialogClose>
                    <Button type="submit" className="w-full sm:w-auto order-1 sm:order-2">Genera Anteprima Test</Button>
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
    const [loadedCalendarId, setLoadedCalendarId] = useState<string | null>(null); // ID del calendario caricato per aggiornamenti
    
    // Stati per il generatore
    const [periodOptions, setPeriodOptions] = useState<PeriodOption[]>([]);
    const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');
    const [dateGroups, setDateGroups] = useState<DateGroup[]>([]);
    const [startDate, setStartDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState<string>(format(addDays(new Date(), 30), 'yyyy-MM-dd'));
    const [startTime, setStartTime] = useState<string>('18:00');
    const [endTime, setEndTime] = useState<string>('19:00');
    
    const [gymFilter, setGymFilter] = useState<string>('');
    const [disciplineFilter, setDisciplineFilter] = useState('Karate');

    // Stati per il form modale
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingLesson, setEditingLesson] = useState<LessonFormData | undefined>(undefined);
    const [isTestFormOpen, setIsTestFormOpen] = useState(false);


    // Funzione helper per aggiornare totalLessons per tutti gli utenti di una palestra/disciplina
    const updateTotalLessonsForGymDiscipline = async (gymId: string, discipline: string) => {
        try {
            console.log(`Aggiornamento totalLessons per ${gymId}-${discipline}`);
            
            // Trova tutti gli utenti con questa palestra e disciplina
            const usersQuery = query(
                collection(db, "users"),
                where("gym", "==", gymId),
                where("discipline", "==", discipline)
            );
            const usersSnapshot = await getDocs(usersQuery);
            
            // Aggiorna il totalLessons per ogni utente
            const updatePromises = [];
            for (const userDoc of usersSnapshot.docs) {
                const updatePromise = (async () => {
                    try {
                        const { updateUserTotalLessons } = await import('@/lib/updateUserTotalLessons');
                        await updateUserTotalLessons(userDoc.id, gymId, discipline);
                        console.log(`totalLessons aggiornato per utente ${userDoc.id}`);
                    } catch (error) {
                        console.error(`Errore aggiornamento totalLessons per utente ${userDoc.id}:`, error);
                    }
                })();
                updatePromises.push(updatePromise);
            }
            
            // Aspetta che tutti gli aggiornamenti siano completati
            await Promise.all(updatePromises);
            console.log(`totalLessons aggiornato per ${usersSnapshot.size} utenti di ${gymId}-${discipline}`);
            
        } catch (error) {
            console.error("Errore nell'aggiornamento totalLessons:", error);
        }
    };

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


    
    const handleGenerateCalendar = async () => {
        if (!startDate || !endDate || !startTime || !endTime || !gymFilter || !disciplineFilter) {
            toast({ variant: "destructive", title: "Dati Mancanti", description: "Inserisci date di inizio/fine, orari e seleziona palestra e disciplina." });
            return;
        }

        setIsGenerating(true);
        setLessons([]); 

        try {
            const periodStartDate = parseISO(startDate);
            const periodEndDate = parseISO(endDate);
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

            const allDates = eachDayOfInterval({ start: startOfDay(periodStartDate), end: startOfDay(periodEndDate) });
            let generatedLessons: Lesson[] = [];

            allDates.forEach(date => {
                const dateString = format(date, 'yyyy-MM-dd');
                const isHoliday = exclusionDates.has(dateString);
                // Ottiene il nome del giorno in italiano con la prima lettera maiuscola
                const dayName = format(date, 'EEEE', { locale: it }).charAt(0).toUpperCase() + format(date, 'EEEE', { locale: it }).slice(1);
                
                const scheduleForDay = selectedGym.weeklySchedule?.find(s => s.dayOfWeek === dayName);
                
                if (scheduleForDay?.slots) {
                    scheduleForDay.slots.forEach((slot: {startTime: string, endTime: string, discipline: string}, index: number) => {
                        if (slot.discipline === disciplineFilter) {
                            // Usa gli orari personalizzati invece di quelli del programma della palestra
                            const [startHour, startMinute] = startTime.split(':').map(Number);
                            const [endHour, endMinute] = endTime.split(':').map(Number);

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
            const periodString = `dal ${format(periodStartDate, 'dd/MM/yy')} al ${format(periodEndDate, 'dd/MM/yy')}`;
            
            setGeneratedTitle(`Anteprima Calendario Standard per ${gymDisplayName} - ${disciplineFilter} ${periodString} (${operationalLessonsCount} lezioni)`);
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

            const allDates = eachDayOfInterval({ start: startOfDay(parseISO(startDate)), end: startOfDay(parseISO(endDate)) });
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
        
        // Estrai i dati necessari dal titolo generato o dalle lezioni stesse
        const isTest = generatedTitle.includes("di Test");
        let gymId, discipline, periodLabel;

        if (isTest) {
            // Per il test, i dati sono nella prima lezione
            gymId = lessons[0].gymId;
            discipline = lessons[0].discipline;
            periodLabel = `Test dal ${format(lessons[0].startTime.toDate(), 'dd/MM/yy')} al ${format(lessons[lessons.length - 1].startTime.toDate(), 'dd/MM/yy')}`
        } else {
            // Per calendari generati o caricati, prova prima i filtri, poi ricava dalle lezioni
            gymId = gymFilter || lessons[0]?.gymId;
            discipline = disciplineFilter || lessons[0]?.discipline;
            
            // Calcola il periodo dalle lezioni effettive se i filtri non sono disponibili
            if (!startDate || !endDate || !gymFilter || !disciplineFilter) {
                const sortedLessons = [...lessons].sort((a, b) => a.startTime.toMillis() - b.startTime.toMillis());
                const firstLesson = sortedLessons[0];
                const lastLesson = sortedLessons[sortedLessons.length - 1];
                periodLabel = `dal ${format(firstLesson.startTime.toDate(), 'dd/MM/yy')} al ${format(lastLesson.startTime.toDate(), 'dd/MM/yy')}`;
            } else {
                periodLabel = `dal ${format(parseISO(startDate), 'dd/MM/yy')} al ${format(parseISO(endDate), 'dd/MM/yy')}`;
            }
        }

        if (!gymId || !discipline) {
             toast({ variant: "destructive", title: "Dati insufficienti", description: "Impossibile determinare palestra o disciplina dalle lezioni." });
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
            let calendarRefId;

            if (loadedCalendarId) {
                // Aggiorna calendario esistente
                calendarRefId = loadedCalendarId;
                
                // Aggiorna i metadati del calendario
                const calendarRef = doc(db, "calendars", loadedCalendarId);
                await updateDoc(calendarRef, {
                    gymId: selectedGym.id,
                    gymName: gymDisplayName,
                    year: getYear(lessons[0].startTime.toDate()),
                    discipline: discipline,
                    calendarName: `Calendario per ${gymDisplayName} - ${discipline} (${periodLabel})`,
                    updatedAt: serverTimestamp(),
                });
                
                // Elimina tutte le lezioni esistenti di questo calendario
                const existingEventsQuery = query(collection(db, "events"), where("calendarId", "==", loadedCalendarId));
                const existingEventsSnapshot = await getDocs(existingEventsQuery);
                const deleteBatch = writeBatch(db);
                existingEventsSnapshot.forEach(eventDoc => {
                    deleteBatch.delete(eventDoc.ref);
                });
                await deleteBatch.commit();
            } else {
                // Crea nuovo calendario
                const calendarData = {
                    gymId: selectedGym.id,
                    gymName: gymDisplayName,
                    year: getYear(lessons[0].startTime.toDate()),
                    discipline: discipline,
                    calendarName: `Calendario per ${gymDisplayName} - ${discipline} (${periodLabel})`,
                    createdAt: serverTimestamp(),
                };
                
                const calendarRef = await addDoc(collection(db, "calendars"), calendarData);
                calendarRefId = calendarRef.id;
            }

            // Aggiungi tutte le lezioni (nuove o aggiornate)
            const batch = writeBatch(db);
            const eventsCollectionRef = collection(db, "events");

            lessons.forEach(lesson => {
                const { id, ...lessonData } = lesson; // Escludiamo l'ID temporaneo
                const newEventRef = doc(eventsCollectionRef); 
                batch.set(newEventRef, {
                    ...lessonData,
                    type: 'lesson', // Aggiungiamo il tipo per distinguerli
                    calendarId: calendarRefId, // Colleghiamo l'evento al calendario
                    createdAt: serverTimestamp()
                });
            });

            await batch.commit();
            
            await fetchSavedCalendars();
            
            // SEMPRE aggiorna i totalLessons dopo aver salvato il calendario
            await updateTotalLessonsForGymDiscipline(gymId, discipline);
            
            const operationalLessonsCount = lessons.filter(l => l.status === 'confermata').length;

            toast({
                title: "Calendario Salvato!",
                description: `Calendario con ${operationalLessonsCount} lezioni effettive salvato e totalLessons aggiornato per tutti gli utenti interessati.`,
                variant: "default",
            });

            setLessons([]);
            setGeneratedTitle(null);
            setLoadedCalendarId(null);
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
        const startDateTime = parseISO(`${startDate}T${startTime}`);
        const endDateTime = parseISO(`${endDate}T${endTime}`);
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
            startDate: format(start, 'yyyy-MM-dd'),
            startTime: format(start, 'HH:mm'),
            endDate: format(end, 'yyyy-MM-dd'),
            endTime: format(end, 'HH:mm'),
            discipline: lesson.discipline || "",
            gymId: lesson.gymId || "",
            status: lesson.status,
            notes: lesson.notes || "",
        });
        setIsFormOpen(true);
    };

    const openCreateForm = () => {
        setEditingLesson(undefined);
        setIsFormOpen(true);
    }
    
    const handleLoadCalendar = async (calendar: SavedCalendar) => {
        try {
            console.log("Loading calendar:", calendar.id, calendar.calendarName);
            
            // Prima prova senza ordinamento per vedere se è un problema di indici
            const eventsQuery = query(collection(db, "events"), where("calendarId", "==", calendar.id));
            const eventsSnapshot = await getDocs(eventsQuery);
            console.log("Found events:", eventsSnapshot.size);
            
            if (eventsSnapshot.empty) {
                toast({ 
                    variant: "destructive", 
                    title: "Calendario Vuoto", 
                    description: `Nessuna lezione trovata per il calendario "${calendar.calendarName}". Il calendario potrebbe essere stato creato ma non salvato correttamente.` 
                });
                return;
            }
            
            const lessonsList = eventsSnapshot.docs.map(doc => {
                const data = doc.data();
                console.log("Event data:", data);
                return { id: doc.id, ...data } as Lesson;
            });

            // Ordina manualmente le lezioni per startTime
            lessonsList.sort((a, b) => a.startTime.toMillis() - b.startTime.toMillis());

            setLessons(lessonsList);
            const operationalLessonsCount = lessonsList.filter(l => l.status === 'confermata').length;
            
            // Estrae le parti essenziali dal nome del calendario
            const calendarName = calendar.calendarName;
            const gymName = calendar.gymName || '';
            const discipline = calendar.discipline || '';
            
            // Formato semplificato: "Villeneuve - Scuola Media - Karate (70 lezioni)"
            const simplifiedTitle = `${gymName} - ${discipline} (${operationalLessonsCount} lezioni)`;
            
            setGeneratedTitle(simplifiedTitle);
            setLoadedCalendarId(calendar.id); // Traccia il calendario caricato
            toast({ title: "Calendario Caricato", description: `Hai caricato ${lessonsList.length} lezioni totali nell'area di anteprima.`});

        } catch (error) {
            console.error("Error loading lessons for calendar:", error);
            console.error("Calendar ID:", calendar.id);
            toast({ 
                variant: "destructive", 
                title: "Errore Caricamento", 
                description: `Impossibile caricare le lezioni del calendario "${calendar.calendarName}". Controlla la console per dettagli tecnici.` 
            });
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

            // 5. Aggiorna i totalLessons per gli utenti interessati (prima di aggiornare l'interfaccia)
            const calendarToDelete = savedCalendars.find(cal => cal.id === calendarId);
            if (calendarToDelete) {
                // Estrai gymId dalla gymName (formato: "gymId - Nome Palestra")
                const gymId = calendarToDelete.gymName?.split(' - ')[0] || '';
                const discipline = calendarToDelete.discipline || '';
                if (gymId && discipline) {
                    await updateTotalLessonsForGymDiscipline(gymId, discipline);
                }
            }

            // 6. Aggiorna l'interfaccia
            await fetchSavedCalendars(); 
            toast({ 
                title: "Calendario Eliminato", 
                description: "Il calendario e tutte le sue lezioni associate sono stati rimossi con successo. TotalLessons aggiornato.", 
                variant: "default" 
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
        <div className="space-y-4 sm:space-y-8 p-4 sm:p-6">
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg sm:text-xl">Generatore Calendario Allenamenti</CardTitle>
                    <CardDescription className="text-sm sm:text-base">Crea in massa le lezioni di routine per un periodo, includendo le festività.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6">
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <div className="space-y-2">
                            <Label className="text-sm sm:text-base">Data Inizio Periodo</Label>
                            <Input 
                                type="date" 
                                value={startDate} 
                                onChange={(e) => setStartDate(e.target.value)}
                                className="bg-white text-black h-10 sm:h-auto"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm sm:text-base">Data Fine Periodo</Label>
                            <Input 
                                type="date" 
                                value={endDate} 
                                onChange={(e) => setEndDate(e.target.value)}
                                className="bg-white text-black h-10 sm:h-auto"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <div className="space-y-2">
                            <Label className="text-sm sm:text-base">Ora Inizio Lezione</Label>
                            <Input 
                                type="time" 
                                value={startTime} 
                                onChange={(e) => setStartTime(e.target.value)}
                                className="bg-white text-black h-10 sm:h-auto"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm sm:text-base">Ora Fine Lezione</Label>
                            <Input 
                                type="time" 
                                value={endTime} 
                                onChange={(e) => setEndTime(e.target.value)}
                                className="bg-white text-black h-10 sm:h-auto"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <div className="space-y-2">
                            <Label className="text-sm sm:text-base">Filtra per Disciplina</Label>
                            <Select value={disciplineFilter} onValueChange={setDisciplineFilter}>
                                <SelectTrigger className="bg-white text-black h-10 sm:h-auto"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Karate">Karate</SelectItem>
                                    <SelectItem value="Aikido">Aikido</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm sm:text-base">Filtra per Palestra</Label>
                            <Select value={gymFilter} onValueChange={setGymFilter}>
                                <SelectTrigger className="bg-white text-black h-10 sm:h-auto">
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
                <CardFooter className="flex flex-col sm:flex-row gap-2 sm:gap-2 space-y-2 sm:space-y-0">
                    <Button onClick={() => handleGenerateCalendar()} disabled={isGenerating || isSaving} className="text-green-600 border-green-600 hover:bg-green-50 font-bold w-full sm:w-auto">
                        {isGenerating ? <Loader2 className="animate-spin mr-2" /> : <PlusCircle className="mr-2" />}
                        Genera Anteprima
                    </Button>
                    <Dialog open={isTestFormOpen} onOpenChange={setIsTestFormOpen}>
                        <DialogTrigger asChild>
                             <Button variant="secondary" className="bg-transparent w-full sm:w-auto">
                                <TestTube2 className="mr-2" />
                                <span className="hidden sm:inline">Genera Calendario di Test</span>
                                <span className="sm:hidden">Test</span>
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
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" className="bg-transparent text-red-600 border-red-600 hover:bg-red-50 w-full sm:w-auto">
                                <AlertTriangle className="mr-2" />
                                <span className="hidden sm:inline">Reset TotalLessons</span>
                                <span className="sm:hidden">Reset</span>
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-white border-2 border-red-800">
                            <AlertDialogHeader>
                                <AlertDialogTitle className="text-red-800">ATTENZIONE!!</AlertDialogTitle>
                                <AlertDialogDescription className="space-y-2 text-red-800">
                                    <p>Vuoi portare il campo totalLessons a 0 per TUTTI gli utenti nel database?</p>
                                    <p>Questa funzione può essere usata solo quando hai eliminato tutti i calendari da Firebase per azzerare i conteggi delle lezioni totali di tutti gli utenti.</p>
                                    <p>È una funzione di manutenzione del database. Vuoi Procedere?</p>
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel className="bg-transparent border border-green-800 text-green-800 hover:bg-green-50">Annulla</AlertDialogCancel>
                                <AlertDialogAction className="bg-transparent border border-red-800 text-red-800 hover:bg-red-50" onClick={async () => {
                                    try {
                                        setIsSaving(true);
                                        const { resetAllUsersTotalLessons } = await import('@/lib/updateUserTotalLessons');
                                        await resetAllUsersTotalLessons();
                                        toast({ 
                                            title: "Reset Completato", 
                                            description: "TotalLessons resettato a 0 per tutti gli utenti." 
                                        });
                                    } catch (error) {
                                        console.error("Errore reset totalLessons:", error);
                                        toast({ 
                                            variant: "destructive", 
                                            title: "Errore", 
                                            description: "Impossibile resettare totalLessons." 
                                        });
                                    } finally {
                                        setIsSaving(false);
                                    }
                                }}>
                                    Sì, Resetta Tutto
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </CardFooter>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg sm:text-xl">Gestione Calendari Salvati</CardTitle>
                    <CardDescription className="text-sm sm:text-base">Carica, modifica o elimina i calendari che hai già creato e salvato su Firebase.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="hidden sm:block">
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
                                savedCalendars.map((cal, index) => {
                                    // Formato semplificato per il nome del calendario
                                    const simplifiedName = `${cal.gymName} - ${cal.discipline}`;
                                    return (
                                    <TableRow key={cal.id} className={`bg-gray-50 hover:bg-gray-100 ${index > 0 ? 'border-t-2 border-gray-300' : ''}`}>
                                        <TableCell className="font-medium py-4">{simplifiedName}</TableCell>
                                        <TableCell className="py-4">{cal.discipline}</TableCell>
                                        <TableCell className="py-4">{cal.gymName}</TableCell>
                                        <TableCell className="py-4">{cal.createdAt ? format(cal.createdAt.toDate(), 'dd/MM/yy HH:mm') : 'N/D'}</TableCell>
                                        <TableCell className="text-right space-x-2 py-4">
                                            <Button variant="outline" size="sm" onClick={() => handleLoadCalendar(cal)} disabled={isDeleting === cal.id} className="bg-transparent">
                                                <Upload className="h-4 w-4 mr-2" />
                                                Carica
                                            </Button>
                                            
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="destructive" size="sm" disabled={isDeleting === cal.id} className="bg-transparent text-red-600 border-red-600 hover:bg-red-50">
                                                        {isDeleting === cal.id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                                                        Elimina
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
                                    );
                                })
                            ) : (
                                <TableRow><TableCell colSpan={5} className="text-center h-24">Nessun calendario salvato trovato.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                    </div>
                    
                    {/* Vista mobile con card */}
                    <div className="sm:hidden space-y-4">
                        {loading ? (
                            <div className="flex justify-center h-24 items-center">
                                <Loader2 className="h-6 w-6 animate-spin" />
                            </div>
                        ) : savedCalendars.length > 0 ? (
                            savedCalendars.map((cal) => {
                                const simplifiedName = `${cal.gymName} - ${cal.discipline}`;
                                return (
                                    <Card key={cal.id} className="p-4">
                                        <div className="space-y-3">
                                            <div>
                                                <h3 className="font-medium text-sm">{simplifiedName}</h3>
                                                <p className="text-xs text-muted-foreground">{cal.discipline} • {cal.gymName}</p>
                                                <p className="text-xs text-muted-foreground">{cal.createdAt ? format(cal.createdAt.toDate(), 'dd/MM/yy HH:mm') : 'N/D'}</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button 
                                                    variant="outline" 
                                                    size="sm" 
                                                    onClick={() => handleLoadCalendar(cal)} 
                                                    disabled={isDeleting === cal.id} 
                                                    className="bg-transparent flex-1"
                                                >
                                                    <Upload className="h-4 w-4 mr-1" />
                                                    Carica
                                                </Button>
                                                
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button 
                                                            variant="destructive" 
                                                            size="sm" 
                                                            disabled={isDeleting === cal.id} 
                                                            className="bg-transparent text-red-600 border-red-600 hover:bg-red-50 flex-1"
                                                        >
                                                            {isDeleting === cal.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 mr-1" />}
                                                            Elimina
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
                                            </div>
                                        </div>
                                    </Card>
                                );
                            })
                        ) : (
                            <div className="text-center text-muted-foreground py-8">
                                Nessun calendario salvato trovato.
                            </div>
                        )}
                    </div>
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
                        <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-2">
                             <Button onClick={openCreateForm} variant="ghost" className="w-full sm:w-auto text-amber-800 hover:text-amber-900 bg-transparent border-0 shadow-none"><PlusCircle className="mr-2"/>Aggiungi Lezione</Button>
                             <Button onClick={() => { setLessons([]); setGeneratedTitle(null); setLoadedCalendarId(null); toast({ title: "Anteprima Cancellata", description: "Tutte le lezioni sono state rimosse dall'anteprima." }); }} disabled={lessons.length === 0} variant="ghost" className="w-full sm:w-auto text-red-600 hover:text-red-700 bg-transparent border-0 shadow-none">
                                <X className="mr-2" />
                                Cancella Anteprima
                             </Button>
                             <Button onClick={handleSaveCalendar} disabled={isSaving || isGenerating || lessons.length === 0} className="w-full sm:w-auto text-green-600 hover:text-green-700 font-bold bg-transparent border-0 shadow-none" variant="ghost">
                                {isSaving ? <Loader2 className="animate-spin mr-2"/> : <Save className="mr-2" />}
                                Salva su DB
                             </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? <div className="flex justify-center h-32 items-center"><Loader2 className="w-8 h-8 animate-spin"/></div> : (
                        <>
                        {/* Vista desktop */}
                        <div className="hidden lg:block">
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
                        </div>
                        
                        {/* Vista mobile con card */}
                        <div className="lg:hidden space-y-4">
                            {Object.entries(groupedLessons).length > 0 ? (
                                Object.entries(groupedLessons).map(([monthYear, monthLessons]) => (
                                    <div key={monthYear} className="space-y-3">
                                        <h3 className="font-bold text-lg capitalize text-primary py-2 border-b">
                                            {monthYear}
                                        </h3>
                                        {monthLessons.map(lesson => (
                                            <Card key={lesson.id} className={cn(
                                                "p-4",
                                                lesson.status === 'annullata' && 'bg-destructive/10',
                                                lesson.status === 'festivita' && 'bg-blue-500/10'
                                            )}>
                                                <div className="space-y-3">
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex-1">
                                                            <div className="flex items-start justify-between mb-2">
                                                                <div className="flex items-center">
                                                                    <h4 className="font-medium text-sm">{lesson.title}</h4>
                                                                    <span className="mx-2"></span>
                                                                    <p className="text-sm text-muted-foreground">{format(lesson.startTime.toDate(), "dd/MM/yy")} • {format(lesson.startTime.toDate(), "eeee", {locale: it})}</p>
                                                                </div>
                                                                <div className="flex flex-col items-end gap-1 ml-2">
                                                                    <Badge variant={
                                                                        lesson.status === 'annullata' ? 'destructive' : 
                                                                        lesson.status === 'festivita' ? 'info' : 'success'
                                                                    } className="text-xs py-0 px-2 h-5">
                                                                        {lesson.status === 'annullata' ? 'Annullata' : lesson.status === 'festivita' ? 'Festività' : 'OK'}
                                                                    </Badge>
                                                                    {lesson.notes && (
                                                                        <Popover>
                                                                            <PopoverTrigger asChild>
                                                                                <Button variant="ghost" size="icon" className="h-4 w-4 p-0">
                                                                                    {lesson.status === 'festivita' 
                                                                                        ? <PartyPopper className="h-3 w-3 text-blue-500" />
                                                                                        : <MessageSquareWarning className="h-3 w-3 text-amber-500" />
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
                                                            </div>
                                                            <div className="text-sm text-muted-foreground">
                                                                <p>{`${format(lesson.startTime.toDate(), "HH:mm")} - ${format(lesson.endTime.toDate(), "HH:mm")}`}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2 pt-2 border-t">
                                                        <Button variant="ghost" size="sm" onClick={() => openEditForm(lesson)} className="flex-1 bg-transparent border-0 shadow-none">
                                                            <Edit className="w-4 h-4"/>
                                                        </Button>
                                                        <Button 
                                                            variant="ghost" 
                                                            size="sm" 
                                                            className="text-destructive hover:text-destructive bg-transparent border-0 shadow-none" 
                                                            onClick={() => handleDeleteLesson(lesson.id)}
                                                        >
                                                            <Trash2 className="w-4 h-4"/>
                                                        </Button>
                                                    </div>
                                                </div>
                                            </Card>
                                        ))}
                                    </div>
                                ))
                            ) : (
                                <div className="text-center text-muted-foreground py-8">
                                    Nessuna lezione da mostrare. Genera un'anteprima o aggiungine una manualmente.
                                </div>
                            )}
                        </div>
                        </>
                    )}
                </CardContent>
             </Card>

              <Dialog open={isFormOpen} onOpenChange={(isOpen: boolean) => { setIsFormOpen(isOpen); if (!isOpen) setEditingLesson(undefined); }}>
                <DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-2xl bg-card mx-2 sm:mx-auto max-h-[90vh] overflow-y-auto">
                    <DialogHeader className="pb-4">
                        <DialogTitle className="text-amber-800 text-lg sm:text-xl">{editingLesson ? "Modifica Lezione" : "Crea Nuova Lezione"}</DialogTitle>
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
