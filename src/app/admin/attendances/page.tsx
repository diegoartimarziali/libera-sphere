"use client"

import { useState, useEffect } from "react"
import { db, auth } from "@/lib/firebase"
import { collection, getDocs, query, orderBy, Timestamp, where, addDoc, deleteDoc, doc, getDoc } from "firebase/firestore"
import { useAuthState } from "react-firebase-hooks/auth"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"
import type { VariantProps } from "class-variance-authority"
import { it } from "date-fns/locale"
import { hasImpersonationAccess, hasFullAdminAccess } from "@/lib/permissions"

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge, badgeVariants } from "@/components/ui/badge"
import { Loader2, User, Users, ClipboardCheck, RefreshCw } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"

interface UserData {
    name: string;
    email: string;
    role?: 'admin' | 'superAdmin' | 'user';
    regulationsAccepted: boolean;
    applicationSubmitted: boolean;
    medicalCertificateSubmitted: boolean;
    isFormerMember: 'yes' | 'no';
    [key: string]: any;
}interface Attendance {
    id: string;
    userId: string;
    gymName: string;
    lessonDate: Timestamp;
    status: 'presente' | 'assente';
    lessonTime?: string;
}

interface UserProfile {
    uid: string;
    name: string;
    surname: string;
    email: string;
    discipline?: string;
    gym?: string;
    attendances: Attendance[];
    totalLessons?: number;
}

interface Gym {
    id: string;
    name: string;
}

// Funzioni helper per tradurre stati e metodi
const getStatusVariant = (status: Attendance['status']): VariantProps<typeof badgeVariants>["variant"] => {
    switch (status) {
        case 'presente': return 'success';
        case 'assente': return 'destructive';
        default: return 'secondary';
    }
}
const translateStatus = (status: Attendance['status']) => {
    switch (status) {
        case 'presente': return 'Presente';
        case 'assente': return 'Assente';
        default: return status;
    }
}


export default function AdminAttendancesPage() {
        // Stato per il form di aggiunta presenza
        const [newAttendanceDate, setNewAttendanceDate] = useState<{[uid: string]: string}>({});
        const [newAttendanceStatus, setNewAttendanceStatus] = useState<{[uid: string]: 'presente' | 'assente' | ""}>({});
        const [addingAttendance, setAddingAttendance] = useState<{[uid: string]: boolean}>({});
        const [deletingAttendance, setDeletingAttendance] = useState<{[attendanceId: string]: boolean}>({});

        // Funzione per aggiungere una presenza manuale
        // Creazione presenza
        const handleAddAttendance = async (uid: string, gymName: string) => {
            if (!newAttendanceDate[uid] || !newAttendanceStatus[uid]) {
                toast({
                    variant: "destructive",
                    title: "Dati mancanti",
                    description: "Seleziona sia la data che lo stato."
                });
                return;
            }
            setAddingAttendance(prev => ({ ...prev, [uid]: true }));
            try {
                const attendanceRef = collection(db, "users", uid, "attendances");
                await addDoc(attendanceRef, {
                    userId: uid,
                    gymName: gymName || "",
                    lessonDate: Timestamp.fromDate(new Date(newAttendanceDate[uid])),
                    status: newAttendanceStatus[uid],
                });
                toast({
                    title: "Presenza aggiunta",
                    description: `Presenza (${newAttendanceStatus[uid]}) aggiunta con successo.`
                });
                setNewAttendanceDate(prev => ({ ...prev, [uid]: "" }));
                setNewAttendanceStatus(prev => ({ ...prev, [uid]: "" }));
                await fetchData();
            } catch (error) {
                toast({
                    variant: "destructive",
                    title: "Errore aggiunta presenza",
                    description: "Controlla la console per dettagli."
                });
                console.error(error);
            } finally {
                setAddingAttendance(prev => ({ ...prev, [uid]: false }));
            }
        };

        // Cancellazione presenza
        const handleDeleteAttendance = async (uid: string, attendanceId: string) => {
            setDeletingAttendance(prev => ({ ...prev, [attendanceId]: true }));
            try {
                const attendanceDocRef = doc(db, "users", uid, "attendances", attendanceId);
                await deleteDoc(attendanceDocRef);
                toast({
                    title: "Presenza eliminata",
                    description: "La presenza è stata eliminata con successo."
                });
                await fetchData();
            } catch (error) {
                toast({
                    variant: "destructive",
                    title: "Errore eliminazione presenza",
                    description: "Controlla la console per dettagli."
                });
                console.error(error);
            } finally {
                setDeletingAttendance(prev => ({ ...prev, [attendanceId]: false }));
            }
        };
    const [user, loadingAuth] = useAuthState(auth);
    const [currentUserData, setCurrentUserData] = useState<UserData | null>(null);
    const [profiles, setProfiles] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [gyms, setGyms] = useState<Gym[]>([]);
    const [gymFilter, setGymFilter] = useState("all");
    const [disciplineFilter, setDisciplineFilter] = useState("all");
    const [isRecalculating, setIsRecalculating] = useState(false);
    const { toast } = useToast();

    // Fetch current user data to check permissions
    useEffect(() => {
        const fetchCurrentUserData = async () => {
            if (user) {
                try {
                    const docRef = doc(db, 'users', user.uid);
                    const docSnap = await getDoc(docRef);
                    if (docSnap.exists()) {
                        setCurrentUserData(docSnap.data() as UserData);
                    }
                } catch (error) {
                    console.error("Error fetching current user data:", error);
                }
            }
        };

        if (!loadingAuth && user) {
            fetchCurrentUserData();
        }
    }, [user, loadingAuth]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // 1. Fetch all users per raccogliere le palestre reali
            const usersSnapshot = await getDocs(query(collection(db, "users"), orderBy("surname")));
            const profiles: UserProfile[] = [];
            const uniqueUserGyms = new Set<string>();
            
            for (const docSnap of usersSnapshot.docs) {
                const userData = docSnap.data();
                const attendances: Attendance[] = [];
                // Leggi le presenze dalla sottocollezione utente
                const attendancesSnap = await getDocs(query(collection(db, "users", docSnap.id, "attendances"), orderBy('lessonDate', 'desc')));
                attendancesSnap.forEach(attSnap => {
                    const attData = attSnap.data();
                    attendances.push({
                        id: attSnap.id,
                        userId: attData.userId,
                        gymName: attData.gymName,
                        lessonDate: attData.lessonDate,
                        status: attData.status,
                    });
                });
                // Leggi il totale lezioni dalla sottocollezione totalLessons
                let totalLessons = undefined;
                const totalLessonsSnap = await getDocs(collection(db, "users", docSnap.id, "totalLessons"));
                totalLessonsSnap.forEach(tlDoc => {
                    const tlData = tlDoc.data();
                    if (typeof tlData.value === 'number') {
                        totalLessons = tlData.value;
                    }
                });
                
                // Raccogli la palestra dell'utente
                let gymName = userData.gym; // Usa direttamente l'ID come nome temporaneo
                if (userData.gym) {
                    uniqueUserGyms.add(userData.gym);
                }
                
                profiles.push({
                    uid: docSnap.id,
                    name: userData.name,
                    surname: userData.surname,
                    email: userData.email,
                    discipline: userData.discipline,
                    gym: gymName,
                    attendances,
                    totalLessons
                });
            }
            
            // Crea gymsList dalle palestre uniche trovate negli utenti
            let gymsArr = Array.from(uniqueUserGyms);
            if (!gymsArr.includes('Villeneuve')) {
                gymsArr.push('Villeneuve');
            }
            const gymsList = gymsArr.sort().map(gymId => ({
                id: gymId,
                name: gymId // Usa l'ID come nome per ora
            }));
            console.log('Palestre trovate dagli utenti:', gymsList);
            setGyms(gymsList);
            setProfiles(profiles);

        } catch (error) {
            console.error("Error fetching admin attendance data: ", error);
            toast({
                variant: "destructive",
                title: "Errore",
                description: "Impossibile caricare i dati degli utenti e delle presenze."
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const recalculateTotalLessons = async () => {
        setIsRecalculating(true);
        try {
            // 1. Ottieni tutti i calendari salvati
            const calendarsSnapshot = await getDocs(collection(db, "calendars"));
            const calendars = calendarsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // 2. Per ogni calendario, conta SOLO le lezioni operative (confermate)
            const calendarLessonsCount: { [key: string]: number } = {};
            for (const calendar of calendars) {
                const calendarData = calendar as any;
                const eventsQuery = query(collection(db, "events"), where("calendarId", "==", calendar.id));
                const eventsSnapshot = await getDocs(eventsQuery);
                
                // CONTA SOLO LEZIONI CONFERMATE (escluse festività e annullate)
                const operationalLessons = eventsSnapshot.docs.filter(doc => {
                    const eventData = doc.data();
                    return eventData.status === 'confermata';
                }).length;
                
                // Chiave univoca per palestra + disciplina
                const calendarKey = `${calendarData.gymId}-${calendarData.discipline}`;
                calendarLessonsCount[calendarKey] = operationalLessons;
                
                console.log(`Calendario ${calendarKey}: ${operationalLessons} lezioni effettive`);
            }

            // 3. Aggiorna il totalLessons per ogni utente
            const usersSnapshot = await getDocs(collection(db, "users"));
            let updatedCount = 0;

            for (const userDoc of usersSnapshot.docs) {
                const userData = userDoc.data();
                const userGym = userData.gym;
                const userDiscipline = userData.discipline;
                
                if (userGym && userDiscipline) {
                    const userKey = `${userGym}-${userDiscipline}`;
                    const newTotalLessons = calendarLessonsCount[userKey] || 0;
                    
                    // Aggiorna o crea il documento totalLessons
                    const totalLessonsRef = collection(db, "users", userDoc.id, "totalLessons");
                    const existingDocs = await getDocs(totalLessonsRef);
                    
                    // Elimina documenti esistenti
                    for (const doc of existingDocs.docs) {
                        await deleteDoc(doc.ref);
                    }
                    
                    // Crea nuovo documento con il valore aggiornato (SOLO LEZIONI EFFETTIVE)
                    if (newTotalLessons > 0) {
                        await addDoc(totalLessonsRef, { value: newTotalLessons });
                        updatedCount++;
                        console.log(`Utente ${userData.name}: ${newTotalLessons} lezioni effettive`);
                    }
                }
            }

            // 4. Ricarica i profili per mostrare i nuovi valori
            await fetchData();
            
            toast({
                title: "Ricalcolo Completato",
                description: `Aggiornato il totale lezioni effettive per ${updatedCount} utenti (escluse festività e annullate).`,
                variant: "default"
            });

        } catch (error) {
            console.error("Error recalculating total lessons:", error);
            toast({
                variant: "destructive",
                title: "Errore Ricalcolo",
                description: "Impossibile ricalcolare il totale lezioni. Controlla la console per dettagli."
            });
        } finally {
            setIsRecalculating(false);
        }
    };
    

    const filteredProfiles = profiles
        .filter(profile => {
            // Filtra per disciplina
            const disciplineMatch = disciplineFilter === "all" || profile.discipline === disciplineFilter;
            
            // Filtra per palestra dell'utente
            let gymMatch = false;
            if (gymFilter === "all") {
                gymMatch = true;
            } else {
                // Usa direttamente l'ID della palestra per il confronto
                gymMatch = profile.gym === gymFilter;
                
                // Debug
                console.log("User:", profile.name, "UserGym ID:", profile.gym, "Filter:", gymFilter, "Match:", gymMatch);
            }
            
            return disciplineMatch && gymMatch;
        });

    const canImpersonate = hasImpersonationAccess(currentUserData);

    return (
        <Card className="bg-card">
            <CardHeader>
                <CardTitle className="text-amber-800">Gestione Presenze Utenti</CardTitle>
                <CardDescription className="text-muted-foreground">
                    Visualizza lo storico delle presenze e assenze per ogni utente.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col gap-4 mb-6">
                    <Select value={gymFilter} onValueChange={setGymFilter}>
                        <SelectTrigger className="w-full bg-white text-black">
                            <SelectValue placeholder="Filtra per palestra..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Tutte le Palestre</SelectItem>
                            {gyms.map(gym => (
                                <SelectItem key={gym.id} value={gym.name}>{gym.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={disciplineFilter} onValueChange={setDisciplineFilter}>
                        <SelectTrigger className="w-full bg-white text-black">
                            <SelectValue placeholder="Filtra per disciplina..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Tutte le Discipline</SelectItem>
                            <SelectItem value="Karate">Karate</SelectItem>
                            <SelectItem value="Aikido">Aikido</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button 
                        onClick={recalculateTotalLessons} 
                        disabled={isRecalculating || !hasFullAdminAccess(currentUserData)}
                        variant="outline"
                        className="bg-transparent text-amber-800 border-amber-800 hover:bg-amber-50 w-full"
                    >
                        {isRecalculating ? <Loader2 className="animate-spin mr-2" /> : <RefreshCw className="mr-2" />}
                        Ricalcola Totali
                    </Button>
                </div>
                                    <Accordion type="multiple" className="w-full">
                                        {(filteredProfiles.length > 0 ? filteredProfiles : profiles).length > 0 ?
                                            (filteredProfiles.length > 0 ? filteredProfiles : profiles).map(profile => {
                                                const totalPresences = profile.attendances.filter(a => a.status === 'presente').length;
                                                return (
                                                    <AccordionItem value={profile.uid} key={profile.uid}>
                                                        <div className="flex items-center gap-2 justify-start mb-2">
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="bg-transparent border-blue-400 text-blue-700 px-2"
                                                                style={{ minWidth: '120px', textAlign: 'left' }}
                                                                onClick={() => window.open(`/dashboard/attendances?impersonate=${profile.uid}`, '_blank')}
                                                                title="Vedi come utente"
                                                            >
                                                                Vedi come utente
                                                            </Button>
                                                            <User className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
                                                            <span className="font-bold text-sm sm:text-base truncate">{profile.name} {profile.surname}</span>
                                                        </div>
                                                        <AccordionTrigger>
                                                            <span className="font-bold text-sm sm:text-base truncate">Dettagli</span>
                                                        </AccordionTrigger>
                                                        <AccordionContent className="p-4 bg-amber-50/30">
                                                            <div className="mb-4 flex flex-col md:flex-row md:items-end gap-2 md:gap-4 bg-white/60 p-2 rounded border border-amber-100">
                                                                <input
                                                                    type="date"
                                                                    className="border rounded px-2 py-1 text-sm"
                                                                    value={newAttendanceDate[profile.uid] || ""}
                                                                    onChange={e => setNewAttendanceDate(prev => ({...prev, [profile.uid]: e.target.value}))}
                                                                />
                                                                <select
                                                                    className="border rounded px-2 py-1 text-sm"
                                                                    value={newAttendanceStatus[profile.uid] || ""}
                                                                    onChange={e => setNewAttendanceStatus(prev => ({...prev, [profile.uid]: e.target.value as 'presente' | 'assente' | ""}))}
                                                                >
                                                                    <option value="">Stato...</option>
                                                                    <option value="presente">Presente</option>
                                                                    <option value="assente">Assente</option>
                                                                </select>
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    className="text-green-800 border-green-700"
                                                                    disabled={addingAttendance[profile.uid]}
                                                                    onClick={() => handleAddAttendance(profile.uid, profile.gym || "")}
                                                                >
                                                                    {addingAttendance[profile.uid] ? <Loader2 className="animate-spin h-4 w-4" /> : "Aggiungi Presenza"}
                                                                </Button>
                                                            </div>
                                                            {profile.attendances.length > 0 ? (
                                                                <>
                                                                    <div className="hidden md:block">
                                                                        <Table>
                                                                            <TableHeader>
                                                                                <TableRow>
                                                                                    <TableHead>Data</TableHead>
                                                                                    <TableHead className="text-right">Stato</TableHead>
                                                                                </TableRow>
                                                                            </TableHeader>
                                                                            <TableBody>
                                                                                {profile.attendances.map(a => (
                                                                                    <TableRow key={a.id}>
                                                                                        <TableCell>{a.lessonDate ? format(a.lessonDate.toDate(), 'eeee dd/MM/yy', { locale: it }) : 'N/D'}</TableCell>
                                                                                        <TableCell className="text-right flex items-center gap-2 justify-end">
                                                                                            <Badge variant={getStatusVariant(a.status)} className={a.status === 'presente' ? 'bg-green-100 text-green-800 border-green-300' : 'bg-red-100 text-red-800 border-red-300'}>
                                                                                                {translateStatus(a.status)}
                                                                                            </Badge>
                                                                                            <Button
                                                                                                size="icon"
                                                                                                variant="ghost"
                                                                                                className="text-red-600 hover:bg-red-100"
                                                                                                title="Elimina presenza"
                                                                                                disabled={deletingAttendance[a.id]}
                                                                                                onClick={() => handleDeleteAttendance(profile.uid, a.id)}
                                                                                            >
                                                                                                {deletingAttendance[a.id] ? <Loader2 className="animate-spin h-4 w-4" /> : "✕"}
                                                                                            </Button>
                                                                                        </TableCell>
                                                                                    </TableRow>
                                                                                ))}
                                                                            </TableBody>
                                                                        </Table>
                                                                    </div>
                                                                    <div className="md:hidden space-y-3">
                                                                        {profile.attendances.map(a => (
                                                                            <Card key={a.id} className={`border-l-4 ${a.status === 'presente' ? 'border-l-green-500' : 'border-l-red-500'}`}>
                                                                                <CardContent className="p-3">
                                                                                    <div className="space-y-2">
                                                                                        <div className="flex justify-between items-start">
                                                                                            <div className="text-sm font-medium">
                                                                                                {a.lessonDate ? format(a.lessonDate.toDate(), 'eeee dd/MM/yy', { locale: it }) : 'N/D'}
                                                                                            </div>
                                                                                            <div className="flex items-center gap-2">
                                                                                                <Badge variant={getStatusVariant(a.status)} className={a.status === 'presente' ? 'bg-green-100 text-green-800 border-green-300' : 'bg-red-100 text-red-800 border-red-300'}>
                                                                                                    {translateStatus(a.status)}
                                                                                                </Badge>
                                                                                                <Button
                                                                                                    size="icon"
                                                                                                    variant="ghost"
                                                                                                    className="text-red-600 hover:bg-red-100"
                                                                                                    title="Elimina presenza"
                                                                                                    disabled={deletingAttendance[a.id]}
                                                                                                    onClick={() => handleDeleteAttendance(profile.uid, a.id)}
                                                                                                >
                                                                                                    {deletingAttendance[a.id] ? <Loader2 className="animate-spin h-4 w-4" /> : "✕"}
                                                                                                </Button>
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                </CardContent>
                                                                            </Card>
                                                                        ))}
                                                                    </div>
                                                                </>
                                                            ) : (
                                                                <p className="text-center text-muted-foreground py-4">Nessuna presenza o assenza registrata per questo utente per i filtri selezionati.</p>
                                                            )}
                                                        </AccordionContent>
                                                    </AccordionItem>
                                                );
                                            })
                                            : (
                                                <div className="text-center py-16 text-muted-foreground">
                                                    <Users className="mx-auto h-12 w-12" />
                                                    <h3 className="mt-4 text-lg font-semibold">Nessun Utente Trovato</h3>
                                                    <p className="mt-1 text-sm">Prova a modificare i filtri di ricerca.</p>
                                                </div>
                                            )
                                        }
                                    </Accordion>
                                </CardContent>
                            </Card>
                        );
                    }
