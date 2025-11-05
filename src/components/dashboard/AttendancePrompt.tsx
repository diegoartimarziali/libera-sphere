import { useState, useEffect } from "react";
    import { auth, db } from "@/lib/firebase";
    import { doc, getDoc, collection, serverTimestamp, query, where, getDocs, Timestamp, increment, orderBy, limit, setDoc, writeBatch } from "firebase/firestore";
    import { useAuthState } from "react-firebase-hooks/auth";
    import { format } from "date-fns";
    import { it } from "date-fns/locale";
    import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
    import { Button } from "@/components/ui/button";
    import { Loader2, CalendarCheck, PartyPopper } from "lucide-react";
    import { useToast } from "@/hooks/use-toast";

    export function AttendancePrompt() {
        // 🚨 DEBUG: Forza la visualizzazione del messaggio per test
        const FORCE_SHOW_MESSAGE = false;
        
        const [isLoading, setIsLoading] = useState(true);
        const [isSubmitting, setIsSubmitting] = useState(false);
        const [userData, setUserData] = useState<any>(null);
        const [todaysLesson, setTodaysLesson] = useState<any>(null);
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
                // 1. Recupera i dati utente
                const userDocRef = doc(db, "users", user.uid);
                const userDocSnap = await getDoc(userDocRef);

                if (!userDocSnap.exists()) {
                    setIsLoading(false);
                    return;
                }
                const fetchedUserData = userDocSnap.data();
                
                // 2. Controlla se l'utente è operativo (socio attivo e abbonamento attivo)
                if (fetchedUserData.associationStatus !== 'active' || fetchedUserData.subscriptionAccessStatus !== 'active') {
                    setIsLoading(false);
                    return;
                }
                setUserData(fetchedUserData);

                // 3. Recupera la lezione di oggi dalla collezione events
                let todaysLessonData = null;
                if (fetchedUserData.gym && fetchedUserData.discipline) {
                    const todayStart = new Date();
                    todayStart.setHours(0, 0, 0, 0);
                    const todayEnd = new Date();
                    todayEnd.setHours(23, 59, 59, 999);

                    const eventsQuery = query(
                        collection(db, "events"),
                        where("type", "==", "lesson"),
                        where("gymId", "==", fetchedUserData.gym),
                        where("discipline", "==", fetchedUserData.discipline),
                        where("startTime", ">=", Timestamp.fromDate(todayStart)),
                        where("startTime", "<=", Timestamp.fromDate(todayEnd)),
                        orderBy("startTime"),
                        limit(1)
                    );
                    const eventsSnap = await getDocs(eventsQuery);
                    // ...existing code...
                    if (!eventsSnap.empty) {
                        const lessonDoc = eventsSnap.docs[0];
                        // ...existing code...
                        todaysLessonData = { id: lessonDoc.id, ...lessonDoc.data() };
                        setTodaysLesson(todaysLessonData);
                    }
                }

                // 4. CONTROLLO SPECIFICO: Verifica se ha già risposto per QUESTA lezione specifica
                if (todaysLessonData) {
                    // ...existing code...
                    
                    // Controlla nella sottocollezione utente (eventId specifico)
                    const userAttendanceQuery = query(
                        collection(db, "users", user.uid, "attendances"),
                        where("eventId", "==", todaysLessonData.id)
                    );
                    const userAttendanceSnap = await getDocs(userAttendanceQuery);
                    // ...existing code...

                    // Controlla anche nella collezione generale attendances
                    const globalAttendanceQuery = query(
                        collection(db, "attendances"),
                        where("userId", "==", user.uid),
                        where("eventId", "==", todaysLessonData.id)
                    );
                    const globalAttendanceSnap = await getDocs(globalAttendanceQuery);
                    // ...existing code...

                    // Se esiste una risposta in una delle due collezioni, non mostrare il messaggio
                    if (!userAttendanceSnap.empty || !globalAttendanceSnap.empty) {
                        // ...existing code...
                        setAlreadyResponded(true);
                        setIsLoading(false);
                        return;
                    }
                    
                    // ...existing code...
                    
                    // CONTROLLO ALTERNATIVO: Verifica per data se eventId non trova nulla
                    const todayStart = new Date();
                    todayStart.setHours(0, 0, 0, 0);
                    const todayEnd = new Date();
                    todayEnd.setHours(23, 59, 59, 999);
                    
                    const dateAttendanceQuery = query(
                        collection(db, "users", user.uid, "attendances"),
                        where("lessonDate", ">=", Timestamp.fromDate(todayStart)),
                        where("lessonDate", "<=", Timestamp.fromDate(todayEnd))
                    );
                    const dateAttendanceSnap = await getDocs(dateAttendanceQuery);
                    // ...existing code...
                    
                    if (!dateAttendanceSnap.empty) {
                        // ...existing code...
                        setAlreadyResponded(true);
                        setIsLoading(false);
                        return;
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

    // 🚨 DEBUG: Crea dati fittizi per visualizzare il messaggio
    useEffect(() => {
        if (FORCE_SHOW_MESSAGE && !userData && !todaysLesson) {
            setUserData({
                name: "Mario",
                surname: "Rossi",
                discipline: "Karate",
                gym: "gym1",
                associationStatus: 'active',
                subscriptionAccessStatus: 'active'
            });
            
            const now = new Date();
            const lessonTime = new Date();
            lessonTime.setHours(18, 0, 0, 0); // Lezione alle 18:00
            
            setTodaysLesson({
                id: "debug-lesson",
                startTime: Timestamp.fromDate(lessonTime),
                gymId: "gym1",
                gymName: "Palestra Demo",
                discipline: "Karate",
                type: "lesson"
            });
            
            setIsLoading(false);
        }
    }, [FORCE_SHOW_MESSAGE, userData, todaysLesson]);

    // Dichiarazione unica delle variabili toastKey e alreadySeen
    // Mostra il toast 3 ore prima della lezione e lo nasconde 1 ora dopo se senza risposta
    useEffect(() => {
        if (!todaysLesson) return;
        
        // 🚨 DEBUG: Forza la visualizzazione se in modalità debug
        if (FORCE_SHOW_MESSAGE) {
            setShowAutoToast(true);
            return;
        }
        
        if (alreadyResponded || alreadySeen) {
            setShowAutoToast(false);
            return;
        }
        
        const lessonDate = todaysLesson.startTime.toDate();
        const now = new Date();
        
        // Calcola i tempi di visualizzazione: 3 ore prima e 1 ora dopo la lezione
        const showTime = lessonDate.getTime() - (3 * 60 * 60 * 1000); // 3 ore prima
        const hideTime = lessonDate.getTime() + (1 * 60 * 60 * 1000); // 1 ora dopo
        
        const currentTime = now.getTime();
        
        // Se è nel periodo di visualizzazione (3 ore prima fino a 1 ora dopo)
        if (currentTime >= showTime && currentTime <= hideTime) {
            setShowAutoToast(true);
        } else if (currentTime > hideTime) {
            // Se è passata 1 ora dalla lezione senza risposta, marca come assente automaticamente
            handleRespond('assente', true);
            return;
        } else {
            setShowAutoToast(false);
            // Imposta timer per mostrare il toast quando arriva il momento (3 ore prima)
            const msUntilShow = showTime - currentTime;
            if (msUntilShow > 0) {
                const showTimer = setTimeout(() => {
                    setShowAutoToast(true);
                }, msUntilShow);
                
                // Imposta anche timer per nascondere automaticamente dopo 1 ora dalla lezione
                const msUntilHide = hideTime - currentTime;
                const hideTimer = setTimeout(() => {
                    if (!alreadyResponded) {
                        handleRespond('assente', true);
                    }
                }, msUntilHide);
                
                return () => {
                    clearTimeout(showTimer);
                    clearTimeout(hideTimer);
                };
            }
        }
    }, [todaysLesson, alreadyResponded, alreadySeen]);

    const handleRespond = async (status: 'presente' | 'assente', fromToast = false) => {
        if (!user || !userData || !todaysLesson) return;
        
        // 🚨 DEBUG: Se in modalità debug, simula la risposta senza salvare
        if (FORCE_SHOW_MESSAGE) {
            setIsSubmitting(true);
            setTimeout(() => {
                setAlreadyResponded(true);
                setShowAutoToast(false);
                setIsSubmitting(false);
                toast({
                    title: "🚨 DEBUG MODE - Risposta Simulata!",
                    description: `Status: ${status} (non salvato nel database)`
                });
            }, 1000);
            return;
        }
        
        setIsSubmitting(true);
        try {
            const today_start = new Date();
            today_start.setHours(0, 0, 0, 0);
            const batch = writeBatch(db);
            const newAttendanceRef = doc(collection(db, "users", user.uid, "attendances"));
            const lessonStartTime = todaysLesson.startTime.toDate();
            const attendanceData = {
                userId: user.uid,
                userName: userData.name,
                userSurname: userData.surname,
                gymId: todaysLesson.gymId,
                gymName: todaysLesson.gymName,
                discipline: todaysLesson.discipline,
                lessonDate: Timestamp.fromDate(today_start),
                lessonTime: format(lessonStartTime, "HH:mm", { locale: it }),
                status: status,
                recordedAt: serverTimestamp(),
                eventId: todaysLesson.id  // IMPORTANTE: salva sempre l'eventId
            };
            
            console.log("💾 DEBUG - Saving attendance with eventId:", todaysLesson.id);
            batch.set(newAttendanceRef, attendanceData);
            if (status === 'presente') {
                const userDocRef = doc(db, "users", user.uid);
                batch.update(userDocRef, {
                    progress: { presences: increment(1) }
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

    // Toast automatico 3 ore prima della lezione (nascosto automaticamente 1 ora dopo se senza risposta)
    if (showAutoToast && todaysLesson && !alreadyResponded && !alreadySeen) {
    return (
            <Alert className="mb-6 animate-in fade-in-50 border-[4px] !border-green-600 bg-green-50" style={{borderWidth: 4, borderColor: '#16a34a'}}>
                <CalendarCheck className="h-4 w-4 text-amber-600" />
                <AlertTitle className="font-bold text-amber-600 text-center bg-amber-50 p-2 rounded-lg">Appello per la lezione di oggi, ogni presenza ti premia!</AlertTitle>
                <AlertDescription className="text-amber-600 text-center mt-2">
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
        <Alert className="mb-6 animate-in fade-in-50 bg-green-50">
            <CalendarCheck className="h-4 w-4 text-amber-600" />
            <AlertTitle className="font-bold text-amber-600 text-center bg-amber-50 p-2 rounded-lg">Appello per la lezione di oggi, ogni presenza ti premia!</AlertTitle>
            <AlertDescription className="text-amber-600 text-center mt-2">
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
