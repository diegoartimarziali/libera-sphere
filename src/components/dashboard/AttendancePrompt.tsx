
"use client"

import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, collection, addDoc, serverTimestamp, query, where, getDocs, Timestamp, writeBatch, increment, orderBy, limit } from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import { format, isToday } from "date-fns";
import { it } from "date-fns/locale";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Loader2, CalendarCheck } from "lucide-react";
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
}

export function AttendancePrompt() {
    const [user] = useAuthState(auth);
    const { toast } = useToast();

    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [userData, setUserData] = useState<UserData | null>(null);
    const [todaysLesson, setTodaysLesson] = useState<LessonEvent | null>(null);
    const [alreadyResponded, setAlreadyResponded] = useState(false);

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

    const handleRespond = async (status: 'presente' | 'assente') => {
        if (!user || !userData || !todaysLesson) return;

        setIsSubmitting(true);
        try {
            const today_start = new Date();
            today_start.setHours(0, 0, 0, 0);

            // Usa un batch per eseguire entrambe le scritture in modo atomico
            const batch = writeBatch(db);

            // 1. Crea il documento di presenza
            const newAttendanceRef = doc(collection(db, "attendances"));
            batch.set(newAttendanceRef, {
                userId: user.uid,
                userName: userData.name,
                userSurname: userData.surname,
                gymId: todaysLesson.gymId,
                gymName: todaysLesson.gymName,
                discipline: todaysLesson.discipline,
                lessonDate: Timestamp.fromDate(today_start),
                lessonTime: format(todaysLesson.startTime.toDate(), "HH:mm"),
                status: status,
                recordedAt: serverTimestamp(),
                eventId: todaysLesson.id
            });

            // 2. Se l'utente è presente, incrementa il suo contatore. 
            // La logica del moltiplicatore non è più necessaria qui.
            if (status === 'presente') {
                const userDocRef = doc(db, "users", user.uid);
                batch.update(userDocRef, {
                    "progress.presences": increment(1)
                });
            }

            await batch.commit();

            setAlreadyResponded(true); // Nasconde il prompt dopo la risposta
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

    if (!todaysLesson || alreadyResponded) {
        return null; // Non mostrare nulla se non c'è lezione o se ha già risposto
    }

    return (
        <Alert className="mb-6 animate-in fade-in-50">
            <CalendarCheck className="h-4 w-4" />
            <AlertTitle>Appello per la lezione di oggi!</AlertTitle>
            <AlertDescription>
                Sei dei nostri stasera per la lezione di {userData?.discipline} delle {format(todaysLesson.startTime.toDate(), "HH:mm", { locale: it })}?
            </AlertDescription>
            <div className="mt-4 flex gap-4">
                <Button 
                    className="w-full" 
                    variant="destructive"
                    onClick={() => handleRespond('assente')}
                    disabled={isSubmitting}
                >
                    {isSubmitting ? <Loader2 className="animate-spin" /> : "Assente"}
                </Button>
                <Button 
                    className="w-full" 
                    variant="success"
                    onClick={() => handleRespond('presente')}
                    disabled={isSubmitting}
                >
                    {isSubmitting ? <Loader2 className="animate-spin" /> : "Presente"}
                </Button>
            </div>
        </Alert>
    );
}

    