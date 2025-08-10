
"use client"

import { useState, useEffect } from "react"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, orderBy, Timestamp } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"
import type { VariantProps } from "class-variance-authority"
import { it } from "date-fns/locale"

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge, badgeVariants } from "@/components/ui/badge"
import { Loader2, User, Users, Search, ClipboardCheck } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface Attendance {
    id: string;
    userId: string;
    gymName: string;
    lessonDate: Timestamp;
    lessonTime: string;
    status: 'presente' | 'assente';
}

interface UserProfile {
    uid: string;
    name: string;
    surname: string;
    email: string;
    discipline?: string;
    attendances: Attendance[];
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
    const [profiles, setProfiles] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const { toast } = useToast();

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // 1. Fetch all users
                const usersSnapshot = await getDocs(query(collection(db, "users"), orderBy("surname")));
                const userProfilesMap = new Map<string, UserProfile>();
                usersSnapshot.docs.forEach(doc => {
                    const userData = doc.data();
                    userProfilesMap.set(doc.id, {
                        uid: doc.id,
                        name: userData.name,
                        surname: userData.surname,
                        email: userData.email,
                        discipline: userData.discipline,
                        attendances: []
                    });
                });

                // 2. Fetch all attendances
                const attendancesSnapshot = await getDocs(query(collection(db, "attendances"), orderBy('lessonDate', 'desc')));
                
                // 3. Group attendances by user
                attendancesSnapshot.forEach(doc => {
                    const attendance = { id: doc.id, ...doc.data() } as Attendance;
                    if (userProfilesMap.has(attendance.userId)) {
                        const userProfile = userProfilesMap.get(attendance.userId)!;
                        userProfile.attendances.push(attendance);
                    }
                });

                setProfiles(Array.from(userProfilesMap.values()));

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

        fetchData();
    }, [toast]);
    

    const filteredProfiles = profiles
        .filter(profile => {
            const fullName = `${profile.name} ${profile.surname}`.toLowerCase();
            const email = profile.email.toLowerCase();
            const search = searchTerm.toLowerCase();
            return fullName.includes(search) || email.includes(search);
        });

    return (
        <Card>
            <CardHeader>
                <CardTitle>Gestione Presenze Utenti</CardTitle>
                <CardDescription>
                    Visualizza lo storico delle presenze e assenze per ogni utente.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                     <div className="relative w-full sm:w-auto flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Cerca per nome o email..."
                            className="pl-9 w-full"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    </div>
                ) : (
                    <Accordion type="multiple" className="w-full">
                        {filteredProfiles.length > 0 ? filteredProfiles.map(profile => {
                            const totalPresences = profile.attendances.filter(a => a.status === 'presente').length;

                            return (
                                <AccordionItem value={profile.uid} key={profile.uid}>
                                     <div className="flex items-center hover:bg-muted/50 px-4 rounded-md">
                                        <AccordionTrigger className="flex-1">
                                            <div className="flex flex-1 flex-col sm:flex-row sm:items-center sm:gap-4 text-left">
                                                <div className="flex items-center">
                                                    <User className="h-5 w-5 mr-3 text-primary" />
                                                    <span className="font-bold">{profile.name} {profile.surname}</span>
                                                </div>
                                                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground pl-8 sm:pl-0">
                                                    {profile.discipline && <span>{profile.discipline}</span>}
                                                    <div className="flex items-center gap-2">
                                                        <ClipboardCheck className="h-4 w-4" />
                                                        <span>Totale Presenze: {totalPresences}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </AccordionTrigger>
                                    </div>
                                    <AccordionContent className="p-4 bg-muted/20">
                                        {profile.attendances.length > 0 ? (
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Data</TableHead>
                                                        <TableHead>Orario</TableHead>
                                                        <TableHead>Palestra</TableHead>
                                                        <TableHead className="text-right">Stato</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {profile.attendances.map(a => (
                                                        <TableRow key={a.id}>
                                                            <TableCell>{a.lessonDate ? format(a.lessonDate.toDate(), 'eeee dd/MM/yy', { locale: it }) : 'N/D'}</TableCell>
                                                            <TableCell>{a.lessonTime}</TableCell>
                                                            <TableCell>{a.gymName}</TableCell>
                                                            <TableCell className="text-right">
                                                                <Badge variant={getStatusVariant(a.status)}>
                                                                    {translateStatus(a.status)}
                                                                </Badge>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        ) : (
                                            <p className="text-center text-muted-foreground py-4">Nessuna presenza o assenza registrata per questo utente.</p>
                                        )}
                                    </AccordionContent>
                                </AccordionItem>
                            )
                        }) : (
                             <div className="text-center py-16 text-muted-foreground">
                                <Users className="mx-auto h-12 w-12" />
                                <h3 className="mt-4 text-lg font-semibold">Nessun Utente Trovato</h3>
                                <p className="mt-1 text-sm">Prova a modificare i filtri di ricerca.</p>
                            </div>
                        )}
                    </Accordion>
                )}
            </CardContent>
        </Card>
    );
}

    