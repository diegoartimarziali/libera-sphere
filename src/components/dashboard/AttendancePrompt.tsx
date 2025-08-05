
"use client"

import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, collection, addDoc, serverTimestamp, query, where, getDocs, Timestamp } from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import { format, getDay } from "date-fns";
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

interface Lesson {
    dayOfWeek: string;
    time: string;
}

interface Gym {
    name: string;
    lessons: Lesson[];
}

const dayMapping: { [key: string]: number } = {
    "lunedi": 1, "martedi": 2, "mercoledi": 3, "giovedi": 4, "venerdi": 5, "sabato": 6, "domenica": 0
};

export function AttendancePrompt() {
    const [user] = useAuthState(auth);
    const { toast } = useToast();

    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [userData, setUserData] = useState<UserData | null>(null);
    const [todaysLesson, setTodaysLesson] = useState<Lesson | null>(null);
    const [gymName, setGymName] = useState<string | null>(null);
    const [alreadyResponded, setAlreadyResponded] = useState(false);

    useEffect(() => {
        const checkAttendance = async () => {
            if (!user) {
                setIsLoading(false);
                return;
            }

            try {
                // 1. Controlla se l'utente ha già risposto oggi
                const today = new Date();
                const startOfToday = new Date(today.setHours(0, 0, 0, 0));
                const endOfToday = new Date(today.setHours(23, 59, 59, 999));

                const attendanceQuery = query(
                    collection(db, "attendances"),
                    where("userId", "==", user.uid),
                    where("lessonDate", ">=", startOfToday),
                    where("lessonDate", "<=", endOfToday)
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

                // 4. Recupera i dati della palestra e cerca la lezione di oggi
                if (fetchedUserData.gym) {
                    const gymDocRef = doc(db, "gyms", fetchedUserData.gym);
                    const gymDocSnap = await getDoc(gymDocRef);

                    if (gymDocSnap.exists()) {
                        const gymData = gymDocSnap.data() as Gym;
                        setGymName(gymData.name);

                        const todayDayIndex = getDay(new Date());

                        const lessonForToday = gymData.lessons.find(lesson => {
                            const lessonDayIndex = dayMapping[lesson.dayOfWeek];
                            return lessonDayIndex === todayDayIndex;
                        });

                        if (lessonForToday) {
                            setTodaysLesson(lessonForToday);
                        }
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
        if (!user || !userData || !todaysLesson || !gymName) return;

        setIsSubmitting(true);
        try {
            const today = new Date();
            const startOfToday = new Date(today.setHours(0, 0, 0, 0));

            await addDoc(collection(db, "attendances"), {
                userId: user.uid,
                userName: userData.name,
                userSurname: userData.surname,
                gymId: userData.gym,
                gymName: gymName,
                discipline: userData.discipline,
                lessonDate: Timestamp.fromDate(startOfToday),
                lessonTime: todaysLesson.time,
                status: status,
                recordedAt: serverTimestamp()
            });

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
                Sei dei nostri stasera per la lezione di {userData?.discipline} delle {todaysLesson.time}?
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
