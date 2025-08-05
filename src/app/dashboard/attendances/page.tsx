
"use client"

import { useState, useEffect } from "react"
import { db, auth } from "@/lib/firebase"
import { collection, query, where, orderBy, getDocs, Timestamp } from "firebase/firestore"
import { useAuthState } from "react-firebase-hooks/auth"
import { format } from "date-fns"
import { it } from "date-fns/locale"
import type { VariantProps } from "class-variance-authority"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge, badgeVariants } from "@/components/ui/badge"
import { Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

// Definisco il tipo di dati per una presenza
interface Attendance {
    id: string;
    lessonDate: Timestamp;
    lessonTime: string;
    discipline: string;
    gymName: string;
    status: 'presente' | 'assente';
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
    const [attendances, setAttendances] = useState<Attendance[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        const fetchAttendances = async () => {
            if (!user) {
                setLoading(false);
                return;
            }

            try {
                const attendancesRef = collection(db, 'attendances');
                const q = query(
                    attendancesRef, 
                    where("userId", "==", user.uid), 
                    orderBy('lessonDate', 'desc')
                );
                const querySnapshot = await getDocs(q);

                const attendancesList = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as Attendance));

                setAttendances(attendancesList);

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
    }, [user, toast]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Le Mie Presenze</CardTitle>
                <CardDescription>
                    Qui trovi il riepilogo delle tue presenze a lezioni e stage.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="flex justify-center items-center h-48">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : (
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
                            {attendances.length > 0 ? attendances.map((attendance) => (
                                <TableRow key={attendance.id}>
                                    <TableCell className="font-medium capitalize">
                                        {attendance.lessonDate ? format(attendance.lessonDate.toDate(), 'eeee, dd MMMM yyyy', { locale: it }) : 'N/D'}
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
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center h-24">
                                        Nessuna presenza registrata.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    );
}
