
"use client"

import { useState, useEffect } from "react";
import { db, auth } from "@/lib/firebase";
import { collection, query, where, getDocs, Timestamp, orderBy } from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import { useToast } from "@/hooks/use-toast";
import { format, isSameDay, isSameMonth, startOfMonth } from "date-fns";
import { it } from "date-fns/locale";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Calendar, MapPin, Tag, Users, Clock, Award, FileText, Sparkles, List, LayoutGrid } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Image from "next/image";
import { cn } from "@/lib/utils";

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
    const [events, setEvents] = useState<Event[]>([]);
    const [currentMonth, setCurrentMonth] = useState(new Date());

    useEffect(() => {
        const fetchEvents = async () => {
            if (!user) {
                setLoading(false);
                return;
            }
            setLoading(true);
            try {
                const now = Timestamp.now();
                const eventsQuery = query(
                    collection(db, "events"),
                    where("startTime", ">=", now),
                    orderBy("startTime", "asc")
                );

                const querySnapshot = await getDocs(eventsQuery);
                const eventsList = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as Event));
                
                setEvents(eventsList);
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

    const specialEvents = events.filter(e => e.type !== 'lesson');
    const lessons = events.filter(e => e.type === 'lesson');

    const DayWithDot = ({ date, children }: { date: Date, children: React.ReactNode }) => {
        const hasLesson = lessons.some(lesson => isSameDay(lesson.startTime.toDate(), date));
        const isSpecialEvent = specialEvents.some(event => isSameDay(event.startTime.toDate(), date));

        return (
            <div className="relative h-full w-full flex items-center justify-center">
                {children}
                {hasLesson && !isSpecialEvent && (
                    <div className="absolute bottom-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
                )}
            </div>
        );
    };


    return (
        <div className="space-y-6">
            <div className="text-center md:text-left">
                <h1 className="text-3xl font-bold">Calendari Attività</h1>
                <p className="text-muted-foreground">
                    Qui trovi il calendario completo delle lezioni e degli eventi speciali come stage ed esami.
                </p>
            </div>
            
             <Tabs defaultValue="calendar" className="w-full">
                <TabsList className="grid w-full grid-cols-2 max-w-lg mx-auto">
                    <TabsTrigger value="calendar"><Calendar className="mr-2 h-4 w-4" />Calendario Eventi</TabsTrigger>
                    <TabsTrigger value="list"><List className="mr-2 h-4 w-4"/>Elenco Eventi Speciali</TabsTrigger>
                </TabsList>

                <TabsContent value="calendar">
                     <Card>
                        <CardContent className="p-2 sm:p-4">
                             {loading ? (
                                <div className="flex justify-center items-center h-96"><Loader2 className="w-8 h-8 animate-spin" /></div>
                            ) : (
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
                            )}
                        </CardContent>
                     </Card>
                </TabsContent>

                <TabsContent value="list">
                    {loading ? (
                        <div className="flex justify-center items-center h-64"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>
                    ) : specialEvents.length > 0 ? (
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {specialEvents.map(event => (
                               <Card key={event.id} className="flex flex-col overflow-hidden">
                                     {event.imageUrl && (
                                        <div className="relative h-40 w-full">
                                            <Image
                                                src={event.imageUrl}
                                                alt={`Immagine per ${event.title}`}
                                                fill
                                                style={{ objectFit: 'cover' }}
                                                data-ai-hint="event martial-arts"
                                            />
                                        </div>
                                    )}
                                    <CardHeader>
                                        <div className="flex items-center text-sm text-primary font-semibold">
                                            {getEventTypeIcon(event.type)}
                                            {getEventTypeLabel(event.type)}
                                        </div>
                                        <CardTitle className="text-xl capitalize">{event.title}</CardTitle>
                                        {event.description && <CardDescription>{event.description}</CardDescription>}
                                    </CardHeader>
                                    <CardContent className="flex-grow space-y-3">
                                        <InfoRow icon={Calendar} text={format(event.startTime.toDate(), "eeee d MMMM yyyy", { locale: it })} />
                                        <InfoRow icon={Clock} text={`${format(event.startTime.toDate(), "HH:mm")} - ${format(event.endTime.toDate(), "HH:mm")}`} />
                                        <InfoRow icon={MapPin} text={event.location} />
                                        <InfoRow icon={Users} text={`Aperto a: ${event.open_to}`} />
                                        <InfoRow icon={Tag} text={`Costo: ${event.price?.toFixed(2)} €`} />
                                    </CardContent>
                                    <CardFooter className="bg-muted/50 p-3">
                                         <Button className="w-full">Maggiori Dettagli</Button>
                                    </CardFooter>
                                </Card>
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
                </TabsContent>

            </Tabs>
        </div>
    );
}

