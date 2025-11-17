
"use client"

import { useState, useEffect, Suspense } from "react"
import { db, auth } from "@/lib/firebase"
import { collection, query, orderBy, getDocs, Timestamp } from "firebase/firestore"
import { doc, getDoc } from "firebase/firestore"
import { useAuthState } from "react-firebase-hooks/auth"
import { format } from "date-fns"
import { it } from "date-fns/locale"
import { useSearchParams } from "next/navigation"
import type { VariantProps } from "class-variance-authority"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge, badgeVariants } from "@/components/ui/badge"
import { Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { AttendancePrompt } from "@/components/dashboard/AttendancePrompt"

// Definisco il tipo di dati per una presenza
interface Attendance {
    id: string;
    lessonDate: Timestamp;
    lessonTime: string;
    discipline: string;
    gymName: string;
    status: 'presente' | 'assente';
    eventId?: string;
}

// Funzione helper per ottenere la classe del badge in base allo stato
const getStatusVariant = (status: Attendance['status']): VariantProps<typeof badgeVariants>["variant"] => {
    switch (status) {
        case 'presente': return 'success';
        case 'assente': return 'secondary';
        default: return 'secondary';
    }
}

// Funzione helper per tradurre lo stato
const translateStatus = (status: Attendance['status']): string => {
    switch (status) {
        case 'presente': return 'Presente';
        case 'assente': return 'Assente';
        default: return status;
    }
}


export default function AttendancesPage() {
    const [user] = useAuthState(auth);
    const searchParams = useSearchParams();
    const impersonateId = searchParams.get('impersonate');
    const effectiveUserId = impersonateId || user?.uid;
    
    const [attendances, setAttendances] = useState<Attendance[]>([]);
    const [eventDates, setEventDates] = useState<{[eventId: string]: Timestamp}>({});
    const [loading, setLoading] = useState(true);
    const [totalLessons, setTotalLessons] = useState<number | null>(null);
    const { toast } = useToast();

    useEffect(() => {
        const fetchAttendances = async () => {
            if (!effectiveUserId) {
                setLoading(false);
                return;
            }
            try {
                // Leggi presenze dell'utente
                const attendancesRef = collection(db, 'users', effectiveUserId, 'attendances');
                const q = query(
                    attendancesRef,
                    orderBy('lessonDate', 'desc')
                );
                const querySnapshot = await getDocs(q);
                const attendancesList = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as Attendance));
                setAttendances(attendancesList);

                // Recupera le date degli eventi per le presenze con eventId
                const eventIds = attendancesList.map(a => a.eventId).filter(Boolean);
                const validEventIds = eventIds.filter((id): id is string => typeof id === 'string');
                if (validEventIds.length > 0) {
                    const eventDatesObj: {[eventId: string]: Timestamp} = {};
                    await Promise.all(validEventIds.map(async eventId => {
                        if (!eventDatesObj[eventId]) {
                            const eventDocRef = doc(db, 'events', eventId);
                            const eventDocSnap = await getDoc(eventDocRef);
                            if (eventDocSnap.exists()) {
                                const eventData = eventDocSnap.data();
                                if (eventData.startTime) {
                                    eventDatesObj[eventId] = eventData.startTime;
                                }
                            }
                        }
                    }));
                    setEventDates(eventDatesObj);
                }

                // Leggi totale lezioni effettive dalla sottocollezione (ora corretto con solo lezioni confermate)
                const totalLessonsSnap = await getDocs(collection(db, 'users', effectiveUserId, 'totalLessons'));
                let total = null;
                totalLessonsSnap.forEach(doc => {
                    const data = doc.data();
                    if (typeof data.value === 'number') total = data.value;
                });
                setTotalLessons(total);
            } catch (error) {
                console.error("Error fetching attendances:", error);
                toast({
                    variant: "destructive",
                    title: "Errore",
                    description: "Impossibile caricare lo storico delle presenze."
                });
            } finally {
                setLoading(false);
            }
        };
        fetchAttendances();
    }, [effectiveUserId, toast]);

    // Calcola presenze effettive
    const presentAttendances = attendances.filter(att => att.status === 'presente').length;

    return (
        <>
            {/* Prompt per la gestione presenze, visibile anche in impersonificazione */}
            <AttendancePrompt />
            <div className="w-full max-w-2xl mx-auto mt-6">
                <Card className="bg-white">
                    <CardHeader className="space-y-3">
                        <div>
                            <CardTitle className="text-xl md:text-2xl">Le Mie Presenze</CardTitle>
                            <CardDescription className="text-sm md:text-base">
                                Qui trovi il riepilogo delle tue presenze a lezioni e stage.
                            </CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="p-3 md:p-6">
                        {loading ? (
                            <div className="flex justify-center items-center h-32 md:h-48">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        ) : (
                            <div>
                                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-center sm:text-left">
                                        <div className="text-base md:text-lg font-semibold text-blue-800">
                                            📊 Presenze: {presentAttendances} / {totalLessons ?? 'N/D'}
                                        </div>
                                        {totalLessons && totalLessons > 0 && (
                                            <span className="inline-block px-3 py-1 rounded-full bg-green-100 text-green-700 text-sm font-bold border border-green-300">
                                                {Math.round((presentAttendances / totalLessons) * 100)}%
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-xs md:text-sm text-blue-600 mt-2 text-center sm:text-left">
                                        Basato solo su lezioni effettive (escluse festività)
                                    </div>
                                </div>
                                {/* Layout Card per mobile */}
                                <div className="block md:hidden space-y-3">
                                    {attendances.length > 0 ? attendances.map((attendance) => {
                                        const eventDate = attendance.eventId && eventDates[attendance.eventId] ? eventDates[attendance.eventId] : null;
                                        return (
                                            <div key={attendance.id} className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                                                <div className="flex justify-between items-start mb-3">
                                                    <div>
                                                        <div className="text-sm font-medium text-gray-900 capitalize">
                                                            {/* Mostra la data dello stage se presente, altrimenti lessonDate */}
                                                            {eventDate ? format(eventDate.toDate(), 'eeee dd/MM', { locale: it }) : (attendance.lessonDate ? format(attendance.lessonDate.toDate(), 'eeee dd/MM', { locale: it }) : 'N/D')}
                                                        </div>
                                                        <div className="text-xs text-gray-500 mt-1">
                                                            {attendance.lessonTime} • {attendance.discipline}
                                                        </div>
                                                    </div>
                                                    <Badge variant={getStatusVariant(attendance.status)}
                                                           className={cn({
                                                                'bg-success text-success-foreground hover:bg-success/80': attendance.status === 'presente',
                                                            })}
                                                    >
                                                        {translateStatus(attendance.status)}
                                                    </Badge>
                                                </div>
                                                <div className="text-xs text-gray-600">
                                                    📍 {attendance.gymName}
                                                </div>
                                            </div>
                                        );
                                    }) : (
                                        <div className="p-8 text-center text-gray-500">
                                            <div className="text-4xl mb-2">📋</div>
                                            <div>Nessuna presenza registrata.</div>
                                        </div>
                                    )}
                                </div>
                                {/* Layout Tabella per desktop */}
                                <div className="hidden md:block overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Data</TableHead>
                                                <TableHead>Orario</TableHead>
                                                <TableHead>Disciplina</TableHead>
                                                <TableHead>Palestra</TableHead>
                                                <TableHead className="text-center">Stato</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {attendances.length > 0 ? attendances.map((attendance) => {
                                                const eventDate = attendance.eventId && eventDates[attendance.eventId] ? eventDates[attendance.eventId] : null;
                                                return (
                                                    <TableRow key={attendance.id}>
                                                        <TableCell className="font-medium capitalize">
                                                            {/* Mostra la data dello stage se presente, altrimenti lessonDate */}
                                                            {eventDate ? format(eventDate.toDate(), 'eeee, dd MMMM yyyy', { locale: it }) : (attendance.lessonDate ? format(attendance.lessonDate.toDate(), 'eeee, dd MMMM yyyy', { locale: it }) : 'N/D')}
                                                        </TableCell>
                                                        <TableCell>{attendance.lessonTime}</TableCell>
                                                        <TableCell>{attendance.discipline}</TableCell>
                                                        <TableCell>{attendance.gymName}</TableCell>
                                                        <TableCell className="text-center">
                                                            <Badge variant={getStatusVariant(attendance.status)}>
                                                                {translateStatus(attendance.status)}
                                                            </Badge>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            }) : (
                                                <TableRow>
                                                    <TableCell colSpan={5} className="text-center h-24">
                                                        <div className="flex flex-col items-center text-gray-500">
                                                            <div className="text-4xl mb-2">📋</div>
                                                            <div>Nessuna presenza registrata.</div>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

    