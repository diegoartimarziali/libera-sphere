    import { useState, useEffect } from "react";

import { auth, db } from "@/lib/firebase";
import { doc, getDoc, collection, addDoc, serverTimestamp, query, where, getDocs, Timestamp, writeBatch, increment, orderBy, limit } from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import { format, isToday } from "date-fns";
import { it } from "date-fns/locale";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Loader2, CalendarCheck, PartyPopper } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface UserData {
    name: string;
    surname: string;
    discipline: string;
    gym: string;
    associationStatus?: 'active';
    subscriptionAccessStatus?: 'active';
}

interface LessonEvent {
    id: string;
    startTime: Timestamp;
    endTime: Timestamp;
    title: string;
    discipline: string;
    gymId: string;
    gymName: string;
    status: 'confermata' | 'annullata' | 'festivita';
}

export function AttendancePrompt() {
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [userData, setUserData] = useState<UserData | null>(null);
    const [todaysLesson, setTodaysLesson] = useState<LessonEvent | null>(null);
    // Dichiarazione unica delle variabili toastKey e alreadySeen
    const toastKey = todaysLesson ? `attendance-toast-${todaysLesson.id}` : null;
    const alreadySeen = toastKey ? localStorage.getItem(toastKey) : null;
    const [alreadyResponded, setAlreadyResponded] = useState(false);
    const [showAutoToast, setShowAutoToast] = useState(false);
    const [user] = useAuthState(auth);
    const { toast } = useToast();

    useEffect(() => {
        const checkAttendance = async () => {
            if (!user) {
                setIsLoading(false);
                return;
            }

            try {
                // 1. Controlla se l'utente ha già risposto oggi per una lezione
                const today_start = new Date();
                today_start.setHours(0, 0, 0, 0);
                const today_end = new Date();
                today_end.setHours(23, 59, 59, 999);

                const attendanceQuery = query(
                    collection(db, "attendances"),
                    where("userId", "==", user.uid),
                    where("lessonDate", ">=", Timestamp.fromDate(today_start)),
                    where("lessonDate", "<=", Timestamp.fromDate(today_end))
                );
                const attendanceSnap = await getDocs(attendanceQuery);

                if (!attendanceSnap.empty) {
                    setAlreadyResponded(true);
                    setIsLoading(false);
                    return;
                }

                // 2. Recupera i dati utente
                const userDocRef = doc(db, "users", user.uid);
                const userDocSnap = await getDoc(userDocRef);

                if (!userDocSnap.exists()) {
                    setIsLoading(false);
                    return;
                }
                const fetchedUserData = userDocSnap.data() as UserData;
                // 3. Controlla se l'utente è operativo (socio attivo e abbonamento attivo)
                if (fetchedUserData.associationStatus !== 'active' || fetchedUserData.subscriptionAccessStatus !== 'active') {
                    setIsLoading(false);
                    return;
                }
                setUserData(fetchedUserData);

                // 4. Recupera la lezione di oggi dalla collezione events
                if (fetchedUserData.gym && fetchedUserData.discipline) {
                    const eventsQuery = query(
                        collection(db, "events"),
                        where("type", "==", "lesson"),
                        where("gymId", "==", fetchedUserData.gym),
                        where("discipline", "==", fetchedUserData.discipline),
                        where("startTime", ">=", Timestamp.fromDate(today_start)),
                        where("startTime", "<=", Timestamp.fromDate(today_end)),
                        orderBy("startTime"),
                        limit(1)
                    );
                    const eventsSnap = await getDocs(eventsQuery);

                    if (!eventsSnap.empty) {
                        const lessonDoc = eventsSnap.docs[0];
                        setTodaysLesson({ id: lessonDoc.id, ...lessonDoc.data() } as LessonEvent);
                    }
                }
            } catch (error) {
                console.error("Error checking for attendance prompt:", error);
                toast({ variant: "destructive", title: "Errore", description: "Impossibile verificare le lezioni di oggi." });
            } finally {
                setIsLoading(false);
            }
        };
        checkAttendance();
    }, [user, toast]);

    // Dichiarazione unica delle variabili toastKey e alreadySeen
    // Mostra il toast 2h30m prima della lezione se non già visto e non già risposto
    useEffect(() => {
        if (!todaysLesson) return;
        if (alreadyResponded || alreadySeen) {
            setShowAutoToast(false);
            return;
        }
        const lessonDate = todaysLesson.startTime.toDate();
        const now = new Date();
        // Calcola il tempo in ms fino a 2h30m prima della lezione
        const msUntilToast = lessonDate.getTime() - now.getTime() - (2.5 * 60 * 60 * 1000);
        if (msUntilToast <= 0) {
            setShowAutoToast(true);
        } else {
            const timer = setTimeout(() => {
                setShowAutoToast(true);
            }, msUntilToast);
            return () => clearTimeout(timer);
        }
    }, [todaysLesson, alreadyResponded, alreadySeen]);

    const handleRespond = async (status: 'presente' | 'assente', fromToast = false) => {
        if (!user || !userData || !todaysLesson) return;
        setIsSubmitting(true);
        try {
            const today_start = new Date();
            today_start.setHours(0, 0, 0, 0);
            const batch = writeBatch(db);
            const newAttendanceRef = doc(collection(db, "users", user.uid, "attendances"));
            batch.set(newAttendanceRef, {
                userId: user.uid,
                userName: userData.name,
                userSurname: userData.surname,
                gymId: todaysLesson.gymId,
                gymName: todaysLesson.gymName,
                discipline: todaysLesson.discipline,
                lessonDate: Timestamp.fromDate(today_start),
                status: status,
                recordedAt: serverTimestamp(),
                eventId: todaysLesson.id
            });
            if (status === 'presente') {
                const userDocRef = doc(db, "users", user.uid);
                batch.update(userDocRef, {
                    "progress.presences": increment(1)
                });
            }
            await batch.commit();
            setAlreadyResponded(true);
            // Imposta SEMPRE il flag in localStorage per la lezione dopo risposta
            setShowAutoToast(false);
            localStorage.setItem(`attendance-toast-${todaysLesson.id}`, "true");
            toast({
                title: "Risposta Registrata!",
                description: "Grazie per averci fatto sapere."
            });
        } catch (error) {
            console.error("Error recording attendance:", error);
            toast({ variant: "destructive", title: "Errore", description: "Impossibile registrare la tua risposta." });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return <div className="h-24 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
    }

    // Toast automatico 2h30m prima della lezione
    if (showAutoToast && todaysLesson && !alreadyResponded && !alreadySeen) {
    return (
            <Alert className="mb-6 animate-in fade-in-50 border-[4px] !border-green-600" style={{borderWidth: 4, borderColor: '#16a34a'}}>
                <CalendarCheck className="h-4 w-4 text-green-600" />
                <AlertTitle className="font-bold">Appello per la lezione di oggi, ogni presenza ti premia!</AlertTitle>
                <AlertDescription>
                    Sei dei nostri stasera per la lezione di {userData?.discipline} delle {format(todaysLesson.startTime.toDate(), "HH:mm", { locale: it })}?
                </AlertDescription>
                <div className="mt-4 flex gap-4">
                    <Button 
                        className="w-full font-bold" 
                        variant="success"
                        onClick={() => handleRespond('presente', true)}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? <Loader2 className="animate-spin" /> : <span className="font-bold">Presente</span>}
                    </Button>
                    <Button 
                        className="w-full font-bold" 
                        variant="destructive"
                        onClick={() => { handleRespond('assente', true); }}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? <Loader2 className="animate-spin" /> : <span className="font-bold">Assente</span>}
                    </Button>
                </div>
            </Alert>
        );
    }

    if (!todaysLesson || alreadyResponded || alreadySeen) {
    return null; // Non mostrare nulla se non c'è lezione, se ha già risposto o se il flag è presente
    }
    // Se la lezione di oggi è una festività, mostra un messaggio informativo
    if (todaysLesson.status === 'festivita') {
        return (
            <Alert variant="info" className="mb-6 animate-in fade-in-50">
                <PartyPopper className="h-4 w-4" />
                <AlertTitle>Nessuna Lezione Oggi</AlertTitle>
                <AlertDescription>
                    Oggi la palestra è chiusa per festività. Goditi il riposo!
                </AlertDescription>
            </Alert>
        );
    }
    // Prompt classico se non è ancora tempo di toast automatico
    return (
        <Alert className="mb-6 animate-in fade-in-50">
            <CalendarCheck className="h-4 w-4" />
            <AlertTitle className="font-bold">Appello per la lezione di oggi, ogni presenza ti premia!</AlertTitle>
            <AlertDescription>
                Sei dei nostri stasera per la lezione di {userData?.discipline} delle {format(todaysLesson.startTime.toDate(), "HH:mm", { locale: it })}?
            </AlertDescription>
            <div className="mt-4 flex gap-4">
                <Button 
                    className="w-full font-bold" 
                    variant="destructive"
                    onClick={() => handleRespond('assente')}
                    disabled={isSubmitting}
                >
                    {isSubmitting ? <Loader2 className="animate-spin" /> : <span className="font-bold">Assente</span>}
                </Button>
                <Button 
                    className="w-full font-bold" 
                    variant="success"
                    onClick={() => handleRespond('presente')}
                    disabled={isSubmitting}
                >
                    {isSubmitting ? <Loader2 className="animate-spin" /> : <span className="font-bold">Presente</span>}
                </Button>
            </div>
        </Alert>
    );
}
