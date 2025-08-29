
"use client"

import { useState, useEffect } from "react";
import { db, auth } from "@/lib/firebase";
import { collection, query, where, getDocs, Timestamp, orderBy, doc, getDoc } from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import { useToast } from "@/hooks/use-toast";
import { format, isSameDay, isSameMonth, startOfMonth } from "date-fns";
import { it } from "date-fns/locale";

import { Card } from "@/components/ui/card";
import { CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CardContent } from "@/components/ui/card";
import { StageCard } from "@/components/dashboard/StageCard";
import { Button } from "@/components/ui/button";
import { Loader2, Calendar, MapPin, Tag, Users, Clock, Award, FileText, Sparkles, List, LayoutGrid } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

// =================================================================
// TIPI E INTERFACCE
// =================================================================

interface Event {
    id: string;
    title: string;
    description?: string;
    startTime: Timestamp;
    endTime: Timestamp;
    location?: string;
    price?: number;
    imageUrl?: string;
    open_to?: string;
    type: 'lesson' | 'stage' | 'exam' | 'course' | 'other';
    status?: 'confermata' | 'annullata' | 'festivita';
    gymName?: string;
    gymId?: string;
    discipline?: string;
    requireConfirmation?: boolean;
}

const getEventTypeIcon = (type: Event['type']) => {
    switch (type) {
        case 'stage': return <Award className="h-4 w-4 mr-2 flex-shrink-0" />;
        case 'exam': return <FileText className="h-4 w-4 mr-2 flex-shrink-0" />;
        case 'course': return <Users className="h-4 w-4 mr-2 flex-shrink-0" />;
        default: return <Sparkles className="h-4 w-4 mr-2 flex-shrink-0" />;
    }
};

const getEventTypeLabel = (type: Event['type']) => {
    switch (type) {
        case 'stage': return 'Stage';
        case 'exam': return 'Esame';
        case 'course': return 'Corso';
        case 'lesson': return 'Lezione';
        default: return 'Evento';
    }
};

const InfoRow = ({ icon: Icon, text }: { icon: React.ElementType, text: string | undefined }) => {
    if (!text) return null;
    return (
        <div className="flex items-center text-sm text-muted-foreground">
            <Icon className="h-4 w-4 mr-2 flex-shrink-0" />
            <span>{text}</span>
        </div>
    );
};


// =================================================================
// PAGINA PRINCIPALE
// =================================================================

export default function CalendarPage() {
    const [user] = useAuthState(auth);
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    
    const [lessons, setLessons] = useState<Event[]>([]);
    const [specialEvents, setSpecialEvents] = useState<Event[]>([]);
    
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [userDiscipline, setUserDiscipline] = useState<string | null>(null);
    const [userGymName, setUserGymName] = useState<string | null>(null);

    useEffect(() => {
        const fetchEvents = async () => {
            if (!user) {
                setLoading(false);
                return;
            }
            setLoading(true);
            try {
                // 1. Get user's discipline and gym
                const userDocRef = doc(db, "users", user.uid);
                const userDocSnap = await getDoc(userDocRef);
                if (!userDocSnap.exists()) {
                    toast({ variant: "destructive", title: "Errore", description: "Utente non trovato." });
                    setLoading(false);
                    return;
                }
                const userData = userDocSnap.data();
                const gymId = userData.gym;
                const discipline = userData.discipline;
                
                setUserDiscipline(discipline);

                if (gymId) {
                    const gymDocRef = doc(db, "gyms", gymId);
                    const gymDocSnap = await getDoc(gymDocRef);
                    if (gymDocSnap.exists()) {
                        setUserGymName(gymDocSnap.data().name);
                    }
                }

                const now = Timestamp.now();
                const eventsCollection = collection(db, "events");

                // 2. Fetch user's specific lessons
                if (gymId && discipline) {
                    const lessonsQuery = query(
                        eventsCollection,
                        where("type", "==", "lesson"),
                        where("gymId", "==", gymId),
                        where("discipline", "==", discipline),
                        where("startTime", ">=", now),
                        orderBy("startTime", "asc")
                    );
                    const lessonsSnapshot = await getDocs(lessonsQuery);
                    const lessonsList = lessonsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Event));
                    setLessons(lessonsList);
                }

                // 3. Fetch all special events (stages, exams, etc.)
                const specialEventsQuery = query(
                    eventsCollection,
                    where("type", "in", ["stage", "exam", "course", "other"]),
                    where("startTime", ">=", now),
                    orderBy("startTime", "asc")
                );
                const specialEventsSnapshot = await getDocs(specialEventsQuery);
                const specialEventsList = specialEventsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Event));
                setSpecialEvents(specialEventsList);
                
            } catch (error) {
                console.error("Error fetching events:", error);
                toast({
                    variant: "destructive",
                    title: "Errore",
                    description: "Impossibile caricare gli eventi del calendario.",
                });
            } finally {
                setLoading(false);
            }
        };

        fetchEvents();
    }, [user, toast]);

    const DayWithDot = ({ date, children }: { date: Date, children: React.ReactNode }) => {
        const hasLesson = lessons.some(lesson => isSameDay(lesson.startTime.toDate(), date) && lesson.status !== 'festivita');
        const isSpecialEvent = specialEvents.some(event => isSameDay(event.startTime.toDate(), date));
        const isHoliday = lessons.some(lesson => isSameDay(lesson.startTime.toDate(), date) && lesson.status === 'festivita');

        return (
            <div className={cn("relative h-full w-full flex items-center justify-center", isHoliday && "bg-blue-500/10 text-blue-800 rounded-md")}>
                {children}
                {hasLesson && !isSpecialEvent && (
                    <div className="absolute bottom-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
                )}
            </div>
        );
    };


    return (
        <div className="space-y-8">
            <div className="text-center md:text-left">
                <h1 className="text-3xl font-bold">Calendari Attività</h1>
                <p className="text-muted-foreground">
                    Qui trovi il calendario dei tuoi allenamenti e degli eventi speciali come stage ed esami.
                </p>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>I Tuoi Allenamenti</CardTitle>
                    {loading ? <div className="animate-pulse bg-muted h-5 w-1/2 rounded-md mt-2"></div> : (
                        <CardDescription>
                            Calendario delle lezioni di {userDiscipline} presso {userGymName || 'la tua palestra'}.
                        </CardDescription>
                    )}
                </CardHeader>
                <CardContent className="p-2 sm:p-4">
                     {loading ? (
                        <div className="flex justify-center items-center h-96"><Loader2 className="w-8 h-8 animate-spin" /></div>
                    ) : lessons.length > 0 || specialEvents.length > 0 ? (
                        <CalendarComponent
                            mode="single"
                            month={currentMonth}
                            onMonthChange={setCurrentMonth}
                            className="w-full"
                            classNames={{
                                day_selected: "bg-transparent text-primary hover:bg-transparent",
                                day: "h-12 w-12 text-base",
                                head_cell: "w-12",
                            }}
                            components={{
                                Day: ({ date }) => <DayWithDot date={date}>{format(date, "d")}</DayWithDot>,
                            }}
                            modifiers={{
                                specialEvent: specialEvents.map(e => e.startTime.toDate())
                            }}
                            modifiersClassNames={{
                                specialEvent: 'bg-primary/10 text-primary font-bold rounded-md',
                            }}
                        />
                    ) : (
                        <div className="text-center py-16 text-muted-foreground">
                            <h2 className="text-xl font-semibold">Nessuna Lezione Trovata</h2>
                            <p className="mt-2">
                               Non sono state ancora caricate lezioni per la tua disciplina.
                            </p>
                        </div>
                    )}
                </CardContent>
             </Card>
             
             <Separator />

             <div>
                <h2 className="text-2xl font-bold mb-4">Eventi Speciali in Programma</h2>
                 {loading ? (
                    <div className="flex justify-center items-center h-64"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>
                ) : specialEvents.length > 0 ? (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {specialEvents.map(event => (
                                                        <StageCard
                                                            key={event.id}
                                                            stage={{
                                                                id: event.id,
                                                                title: event.title,
                                                                description: event.description ?? "",
                                                                startTime: event.startTime,
                                                                endTime: event.endTime,
                                                                location: event.location ?? "",
                                                                price: event.price ?? 0,
                                                                imageUrl: event.imageUrl,
                                                                open_to: event.open_to === "Cinture Nere" ? "Cinture Nere" : "Tutti",
                                                                type: event.type as "stage" | "exam" | "course" | "other",
                                                                discipline: event.discipline === "karate" || event.discipline === "aikido" ? event.discipline : undefined,
                                                                requireConfirmation: event.requireConfirmation ?? false,
                                                            }}
                                                        />
                        ))}
                    </div>
                 ) : (
                     <div className="text-center py-16 border rounded-lg">
                        <h2 className="text-xl font-semibold">Nessun Evento Speciale</h2>
                        <p className="text-muted-foreground mt-2">
                           Non ci sono stage, esami o corsi in programma.
                        </p>
                    </div>
                 )}
             </div>

        </div>
    );
}

