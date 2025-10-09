
"use client"

import { useState, useEffect, Suspense } from "react";
import { db, auth } from "@/lib/firebase";
import { collection, query, where, getDocs, Timestamp, orderBy, doc, getDoc } from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import { useToast } from "@/hooks/use-toast";
import { format, isSameDay, isSameMonth, startOfMonth } from "date-fns";
import { it } from "date-fns/locale";
import { useSearchParams } from "next/navigation";

import { Card } from "@/components/ui/card";
import { CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CardContent } from "@/components/ui/card";
import { StageCard } from "@/components/dashboard/StageCard";
import { StageGridItem } from "@/components/dashboard/StageGridItem";
import { StagePaymentCard } from "@/components/dashboard/StagePaymentCard";
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
    type: 'lesson' | 'stage' | 'exam' | 'course' | 'aggiornamento' | 'other';
    status?: 'confermata' | 'annullata' | 'festivita';
    gymName?: string;
    gymId?: string;
    discipline?: string;
    requireConfirmation?: boolean;
    sumupUrl?: string;
}

const getEventTypeIcon = (type: Event['type']) => {
    switch (type) {
        case 'stage': return <Award className="h-4 w-4 mr-2 flex-shrink-0" />;
        case 'exam': return <FileText className="h-4 w-4 mr-2 flex-shrink-0" />;
        case 'course': return <Users className="h-4 w-4 mr-2 flex-shrink-0" />;
        case 'aggiornamento': return <Users className="h-4 w-4 mr-2 flex-shrink-0" />;
        default: return <Sparkles className="h-4 w-4 mr-2 flex-shrink-0" />;
    }
};

const getEventTypeLabel = (type: Event['type']) => {
    switch (type) {
        case 'stage': return 'Stage';
        case 'exam': return 'Esame';
        case 'course': return 'Corso';
        case 'aggiornamento': return 'Aggiornamento';
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
    const searchParams = useSearchParams();
    const impersonateId = searchParams.get('impersonate');
    const effectiveUserId = impersonateId || user?.uid;
    
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [lessons, setLessons] = useState<Event[]>([]);
    const [specialEvents, setSpecialEvents] = useState<Event[]>([]);
    // ...existing code...
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [userDiscipline, setUserDiscipline] = useState<string | null>(null);
    const [userGymName, setUserGymName] = useState<string | null>(null);
    const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
    const [showPayment, setShowPayment] = useState(false);
    const [userPaidEvents, setUserPaidEvents] = useState<string[]>([]);
    const [userPaymentDetails, setUserPaymentDetails] = useState<{[eventId: string]: string}>({});

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
                    where("type", "in", ["stage", "exam", "course", "aggiornamento", "other"]),
                    where("startTime", ">=", now),
                    orderBy("startTime", "asc")
                );
                const specialEventsSnapshot = await getDocs(specialEventsQuery);
                const specialEventsList = specialEventsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Event));

                // 4. Fetch user payments for events
                if (effectiveUserId) {
                    const paymentsSnap = await getDocs(collection(db, "users", effectiveUserId, "payments"));
                    const paidEventIds: string[] = [];
                    const paymentDetails: {[eventId: string]: string} = {};
                    paymentsSnap.forEach(docSnap => {
                        const data = docSnap.data();
                        if (data.eventId && (data.status === "completed" || data.status === "pending")) {
                            paidEventIds.push(data.eventId);
                            paymentDetails[data.eventId] = data.status;
                        }
                    });
                    setUserPaidEvents(paidEventIds);
                    setUserPaymentDetails(paymentDetails);
                }

                // Mostra tutti gli eventi speciali
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
    }, [effectiveUserId, toast]);

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
        <div className="space-y-6 sm:space-y-8 p-4 sm:p-6">
            <div className="text-center md:text-left">
                <h1 className="text-2xl sm:text-3xl font-bold">Stages, Esami e Corsi</h1>
                <p className="text-sm sm:text-base text-foreground">
                    Qui trovi tutti gli stage, gli esami e i corsi in programma
                </p>
            </div>
            
            {/* Calendario delle lezioni rimosso su richiesta */}

             <div className="space-y-8 sm:space-y-12">
                 {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    </div>
                ) : (
                    <>
                        {/* SEZIONE STAGE */}
                        {specialEvents.filter(event => event.type === 'stage').length > 0 && (
                            <div>
                                <h2 className="text-2xl font-bold mb-6">Stage</h2>
                                <div className="grid gap-4 sm:gap-6 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                                    {specialEvents
                                        .filter(event => event.type === 'stage')
                                        .sort((a, b) => a.startTime.toDate().getTime() - b.startTime.toDate().getTime())
                                        .map(event => {
                                            const isPaid = userPaidEvents.includes(event.id);
                                            return (
                                                <div key={event.id} className="relative">
                                                    <StageGridItem
                                                        event={{
                                                            id: event.id,
                                                            iconUrl: (event as any).iconUrl || event.imageUrl,
                                                            type: event.type,
                                                            discipline: event.discipline,
                                                            open_to: event.open_to,
                                                            startTime: event.startTime,
                                                            onClick: isPaid ? () => {} : () => setSelectedEvent(event)
                                                        }}
                                                    />
                                                    {isPaid && (
                                                        <span className={`absolute top-2 right-2 text-white text-xs font-bold px-2 py-1 rounded shadow ${
                                                            userPaymentDetails[event.id] === 'completed' ? 'bg-green-600' : 'bg-yellow-600'
                                                        }`}>
                                                            {userPaymentDetails[event.id] === 'completed' ? 'Iscritto' : 'Pending'}
                                                        </span>
                                                    )}
                                                </div>
                                            );
                                        })}
                                </div>
                            </div>
                        )}

                        {/* SEZIONE ESAMI */}
                        {specialEvents.filter(event => event.type === 'exam').length > 0 && (
                            <div>
                                <h2 className="text-2xl font-bold mb-6">Esami</h2>
                                <div className="grid gap-4 sm:gap-6 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                                    {specialEvents
                                        .filter(event => event.type === 'exam')
                                        .sort((a, b) => a.startTime.toDate().getTime() - b.startTime.toDate().getTime())
                                        .map(event => {
                                            const isPaid = userPaidEvents.includes(event.id);
                                            return (
                                                <div key={event.id} className="relative">
                                                    <StageGridItem
                                                        event={{
                                                            id: event.id,
                                                            iconUrl: (event as any).iconUrl || event.imageUrl,
                                                            type: event.type,
                                                            discipline: event.discipline,
                                                            open_to: event.open_to,
                                                            startTime: event.startTime,
                                                            onClick: isPaid ? () => {} : () => setSelectedEvent(event)
                                                        }}
                                                    />
                                                    {isPaid && (
                                                        <span className={`absolute top-2 right-2 text-white text-xs font-bold px-2 py-1 rounded shadow ${
                                                            userPaymentDetails[event.id] === 'completed' ? 'bg-green-600' : 'bg-yellow-600'
                                                        }`}>
                                                            {userPaymentDetails[event.id] === 'completed' ? 'Iscritto' : 'Pending'}
                                                        </span>
                                                    )}
                                                </div>
                                            );
                                        })}
                                </div>
                            </div>
                        )}

                        {/* SEZIONE CORSI */}
                        {specialEvents.filter(event => event.type === 'course').length > 0 && (
                            <div>
                                <h2 className="text-2xl font-bold mb-6">Corsi</h2>
                                <div className="grid gap-4 sm:gap-6 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                                    {specialEvents
                                        .filter(event => event.type === 'course')
                                        .sort((a, b) => a.startTime.toDate().getTime() - b.startTime.toDate().getTime())
                                        .map(event => {
                                            const isPaid = userPaidEvents.includes(event.id);
                                            return (
                                                <div key={event.id} className="relative">
                                                    <StageGridItem
                                                        event={{
                                                            id: event.id,
                                                            iconUrl: (event as any).iconUrl || event.imageUrl,
                                                            type: event.type,
                                                            discipline: event.discipline,
                                                            open_to: event.open_to,
                                                            startTime: event.startTime,
                                                            onClick: isPaid ? () => {} : () => setSelectedEvent(event)
                                                        }}
                                                    />
                                                    {isPaid && (
                                                        <span className={`absolute top-2 right-2 text-white text-xs font-bold px-2 py-1 rounded shadow ${
                                                            userPaymentDetails[event.id] === 'completed' ? 'bg-green-600' : 'bg-yellow-600'
                                                        }`}>
                                                            {userPaymentDetails[event.id] === 'completed' ? 'Iscritto' : 'Pending'}
                                                        </span>
                                                    )}
                                                </div>
                                            );
                                        })}
                                </div>
                            </div>
                        )}

                        {/* SEZIONE AGGIORNAMENTI */}
                        {specialEvents.filter(event => event.type === 'aggiornamento').length > 0 && (
                            <div>
                                <h2 className="text-2xl font-bold mb-6">Aggiornamenti</h2>
                                <div className="grid gap-4 sm:gap-6 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                                    {specialEvents
                                        .filter(event => event.type === 'aggiornamento')
                                        .sort((a, b) => a.startTime.toDate().getTime() - b.startTime.toDate().getTime())
                                        .map(event => {
                                            const isPaid = userPaidEvents.includes(event.id);
                                            return (
                                                <div key={event.id} className="relative">
                                                    <StageGridItem
                                                        event={{
                                                            id: event.id,
                                                            iconUrl: (event as any).iconUrl || event.imageUrl,
                                                            type: event.type,
                                                            discipline: event.discipline,
                                                            open_to: event.open_to,
                                                            startTime: event.startTime,
                                                            onClick: isPaid ? () => {} : () => setSelectedEvent(event)
                                                        }}
                                                    />
                                                    {isPaid && (
                                                        <span className={`absolute top-2 right-2 text-white text-xs font-bold px-2 py-1 rounded shadow ${
                                                            userPaymentDetails[event.id] === 'completed' ? 'bg-green-600' : 'bg-yellow-600'
                                                        }`}>
                                                            {userPaymentDetails[event.id] === 'completed' ? 'Iscritto' : 'Pending'}
                                                        </span>
                                                    )}
                                                </div>
                                            );
                                        })}
                                </div>
                            </div>
                        )}

                        {/* SEZIONE ALTRI EVENTI */}
                        {specialEvents.filter(event => event.type === 'other' || !['stage', 'exam', 'course', 'aggiornamento'].includes(event.type)).length > 0 && (
                            <div>
                                <h2 className="text-2xl font-bold mb-6">Altri Eventi</h2>
                                <div className="grid gap-4 sm:gap-6 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                                    {specialEvents
                                        .filter(event => event.type === 'other' || !['stage', 'exam', 'course', 'aggiornamento'].includes(event.type))
                                        .sort((a, b) => a.startTime.toDate().getTime() - b.startTime.toDate().getTime())
                                        .map(event => {
                                            const isPaid = userPaidEvents.includes(event.id);
                                            return (
                                                <div key={event.id} className="relative">
                                                    <StageGridItem
                                                        event={{
                                                            id: event.id,
                                                            iconUrl: (event as any).iconUrl || event.imageUrl,
                                                            type: event.type,
                                                            discipline: event.discipline,
                                                            open_to: event.open_to,
                                                            startTime: event.startTime,
                                                            onClick: isPaid ? () => {} : () => setSelectedEvent(event)
                                                        }}
                                                    />
                                                    {isPaid && (
                                                        <span className={`absolute top-2 right-2 text-white text-xs font-bold px-2 py-1 rounded shadow ${
                                                            userPaymentDetails[event.id] === 'completed' ? 'bg-green-600' : 'bg-yellow-600'
                                                        }`}>
                                                            {userPaymentDetails[event.id] === 'completed' ? 'Iscritto' : 'Pending'}
                                                        </span>
                                                    )}
                                                </div>
                                            );
                                        })}
                                </div>
                            </div>
                        )}

                        {/* MESSAGGIO QUANDO NON CI SONO EVENTI */}
                        {specialEvents.length === 0 && (
                            <div className="text-center py-16 border rounded-lg">
                                <h2 className="text-xl font-semibold">Nessun Evento Speciale</h2>
                                <p className="text-muted-foreground mt-2">
                                    Non ci sono stage, esami o corsi in programma.
                                </p>
                            </div>
                        )}

                        {/* Dialog/modal per card dettagliata evento */}
                        {selectedEvent && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setSelectedEvent(null)}>
                                <div className="bg-white rounded-lg shadow-lg max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                                    <StageCard
                                        stage={{
                                            id: selectedEvent.id,
                                            title: selectedEvent.title,
                                            description: selectedEvent.description ?? "",
                                            startTime: selectedEvent.startTime,
                                            endTime: selectedEvent.endTime,
                                            location: selectedEvent.location ?? "",
                                            price: selectedEvent.price ?? 0,
                                            imageUrl: selectedEvent.imageUrl,
                                            open_to: (selectedEvent.open_to === "Tutti" || selectedEvent.open_to === "Cinture Nere" || selectedEvent.open_to === "Insegnanti")
                                                ? selectedEvent.open_to
                                                : "Tutti",
                                            type: selectedEvent.type as "stage" | "exam" | "course" | "other",
                                            discipline: selectedEvent.discipline === "karate" || selectedEvent.discipline === "aikido" ? selectedEvent.discipline : undefined,
                                            requireConfirmation: selectedEvent.requireConfirmation ?? false,
                                        }}
                                    />
                                    <div className="mt-4 sm:mt-6 flex justify-end p-4">
                                        <div className="flex gap-4 w-full">
                                            <button
                                                className="flex items-center text-base sm:text-lg text-[hsl(var(--background))] bg-transparent border-none shadow-none px-0 font-normal"
                                                onClick={() => setSelectedEvent(null)}
                                                type="button"
                                            >
                                                {/* Icona Indietro */}
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                                                Indietro
                                            </button>
                                            {userPaidEvents.includes(selectedEvent.id) ? (
                                                <Button className="w-full px-4 sm:px-6 py-2 sm:py-3 text-base sm:text-lg font-bold" variant="secondary" disabled>
                                                    {userPaymentDetails[selectedEvent.id] === 'completed' ? 'Iscritto' : 'Pagamento in attesa'}
                                                </Button>
                                            ) : (
                                                <Button 
                                                    className="w-full px-4 sm:px-6 py-2 sm:py-3 text-base sm:text-lg font-bold text-[hsl(var(--my-verscur))] bg-transparent border-2 border-[hsl(var(--my-verscur))] shadow-none"
                                                    variant="default"
                                                    onClick={() => setShowPayment(true)}
                                                >
                                                    Iscriviti
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Dialog pagamento stage */}
                        {showPayment && selectedEvent && (
                            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40" onClick={() => setShowPayment(false)}>
                                <div onClick={e => e.stopPropagation()} className="p-4 w-full max-w-lg">
                                    <StagePaymentCard
                                        title={selectedEvent.title}
                                        price={selectedEvent.price || 0}
                                        sumupUrl={selectedEvent.sumupUrl}
                                        onClose={() => setShowPayment(false)}
                                        userId={effectiveUserId || ''}
                                        eventId={selectedEvent.id}
                                        eventType={selectedEvent.type || ""}
                                        discipline={selectedEvent.discipline || ""}
                                    />
                                </div>
                            </div>
                        )}
                    </>
                )}
             </div>

        </div>
    );
}