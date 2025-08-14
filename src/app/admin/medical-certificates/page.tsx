
"use client"

import { useState, useEffect } from "react";
import { db, storage } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, Timestamp, doc, updateDoc } from "firebase/firestore";
import { ref, deleteObject } from "firebase/storage";
import { useToast } from "@/hooks/use-toast";
import { differenceInDays, isPast, format, startOfDay } from "date-fns";
import { it } from "date-fns/locale";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Search, Users, FileWarning, ShieldCheck, ShieldAlert, ShieldX, User, MoreHorizontal, Eye, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import Link from "next/link";


interface UserProfile {
    uid: string;
    name: string;
    surname: string;
    email: string;
    medicalInfo?: {
        expiryDate?: Timestamp;
        fileUrl?: string;
        fileName?: string;
    };
    certificateStatus: 'valid' | 'expiring' | 'expired' | 'missing';
    daysToExpire?: number;
}


export default function AdminMedicalCertificatesPage() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [profiles, setProfiles] = useState<UserProfile[]>([]);
    const [searchTerm, setSearchTerm] = useState("");

    const fetchData = async () => {
        setLoading(true);
        try {
            const usersSnapshot = await getDocs(query(collection(db, "users"), orderBy("surname")));

            const profilesList = usersSnapshot.docs.map(doc => {
                const data = doc.data();
                let certificateStatus: UserProfile['certificateStatus'] = 'missing';
                let daysToExpire: number | undefined;

                if (data.medicalInfo?.expiryDate) {
                    const expiry = data.medicalInfo.expiryDate.toDate();
                    const today = startOfDay(new Date());
                    const expiryDate = startOfDay(expiry);
                    const diff = differenceInDays(expiryDate, today);
                    daysToExpire = diff;

                    if (diff < 0) {
                        certificateStatus = 'expired';
                    } else if (diff <= 20) {
                        certificateStatus = 'expiring';
                    } else {
                        certificateStatus = 'valid';
                    }
                }

                return {
                    uid: doc.id,
                    name: data.name,
                    surname: data.surname,
                    email: data.email,
                    medicalInfo: data.medicalInfo,
                    certificateStatus,
                    daysToExpire,
                } as UserProfile;
            });

            setProfiles(profilesList);

        } catch (error) {
            console.error("Error fetching medical certificate data:", error);
            toast({
                variant: "destructive",
                title: "Errore",
                description: "Impossibile caricare i dati dei certificati medici."
            });
        } finally {
            setLoading(false);
        }
    };


    useEffect(() => {
        fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    
    const handleDeleteCertificate = async (profile: UserProfile) => {
        if (!profile.medicalInfo?.fileName) {
            toast({ variant: "destructive", title: "Errore", description: "Nome del file non trovato." });
            return;
        }

        try {
            // 1. Delete file from Storage
            const fileRef = ref(storage, `medical-certificates/${profile.uid}/${profile.medicalInfo.fileName}`);
            await deleteObject(fileRef);
            
            // 2. Remove info from Firestore user document and mark as invalid
            const userDocRef = doc(db, "users", profile.uid);
            await updateDoc(userDocRef, {
                medicalInfo: null,
                medicalCertificateSubmitted: false,
                medicalCertificateStatus: 'invalid'
            });

            toast({
                title: "Certificato Eliminato!",
                description: `Il certificato di ${profile.name} ${profile.surname} è stato rimosso. L'utente sarà notificato.`,
                variant: "success",
            });
            
            // 3. Refresh data
            await fetchData();

        } catch (error) {
            console.error("Error deleting certificate:", error);
            toast({ variant: "destructive", title: "Errore", description: "Impossibile eliminare il certificato. Riprova." });
        }
    };
    
    const getStatusInfo = (profile: UserProfile): { variant: "success" | "warning" | "destructive" | "secondary", icon: React.ElementType, text: string } => {
        switch (profile.certificateStatus) {
            case 'valid':
                return { variant: 'success', icon: ShieldCheck, text: `Valido (scade tra ${profile.daysToExpire} giorni)` };
            case 'expiring':
                return { variant: 'warning', icon: ShieldAlert, text: `In scadenza (tra ${profile.daysToExpire} giorni)` };
            case 'expired':
                return { variant: 'destructive', icon: ShieldX, text: 'Scaduto' };
            case 'missing':
            default:
                return { variant: 'secondary', icon: FileWarning, text: 'Mancante' };
        }
    };

    const filteredProfiles = profiles.filter(profile => {
        const fullName = `${profile.name} ${profile.surname}`.toLowerCase();
        const email = profile.email.toLowerCase();
        const search = searchTerm.toLowerCase();
        return fullName.includes(search) || email.includes(search);
    });

    return (
        <Card>
            <CardHeader>
                <CardTitle>Gestione Certificati Medici</CardTitle>
                <CardDescription>
                    Monitora lo stato di tutti i certificati medici degli utenti e gestisci i file caricati.
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
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Utente</TableHead>
                                    <TableHead>Stato Certificato</TableHead>
                                    <TableHead>Data Scadenza</TableHead>
                                    <TableHead className="text-right">Azioni</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredProfiles.length > 0 ? filteredProfiles.map(profile => {
                                    const statusInfo = getStatusInfo(profile);
                                    return (
                                        <TableRow key={profile.uid}>
                                            <TableCell>
                                                <div className="font-medium">{profile.name} {profile.surname}</div>
                                                <div className="text-sm text-muted-foreground">{profile.email}</div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={statusInfo.variant} className="gap-2">
                                                    <statusInfo.icon className="h-4 w-4" />
                                                    {statusInfo.text}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {profile.medicalInfo?.expiryDate ? format(profile.medicalInfo.expiryDate.toDate(), 'dd/MM/yyyy') : 'N/D'}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {profile.medicalInfo?.fileUrl ? (
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon">
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem asChild>
                                                                <Link href={profile.medicalInfo.fileUrl} target="_blank" rel="noopener noreferrer">
                                                                    <Eye className="mr-2 h-4 w-4" />
                                                                    Visualizza
                                                                </Link>
                                                            </DropdownMenuItem>
                                                            <AlertDialog>
                                                                <AlertDialogTrigger asChild>
                                                                     <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                                        Elimina
                                                                    </DropdownMenuItem>
                                                                </AlertDialogTrigger>
                                                                <AlertDialogContent>
                                                                    <AlertDialogHeader>
                                                                        <AlertDialogTitle>Sei sicuro?</AlertDialogTitle>
                                                                        <AlertDialogDescription>
                                                                            Questa azione è irreversibile. Il certificato di <strong className="mx-1">{profile.name} {profile.surname}</strong> sarà eliminato permanentemente. L'utente sarà invitato a caricarne uno nuovo.
                                                                        </AlertDialogDescription>
                                                                    </AlertDialogHeader>
                                                                    <AlertDialogFooter>
                                                                        <AlertDialogCancel>Annulla</AlertDialogCancel>
                                                                        <AlertDialogAction onClick={() => handleDeleteCertificate(profile)}>
                                                                            Sì, elimina
                                                                        </AlertDialogAction>
                                                                    </AlertDialogFooter>
                                                                </AlertDialogContent>
                                                            </AlertDialog>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">Nessuna azione</span>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    )
                                }) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center h-24">
                                             <div className="text-center py-16 text-muted-foreground">
                                                <Users className="mx-auto h-12 w-12" />
                                                <h3 className="mt-4 text-lg font-semibold">Nessun Utente Trovato</h3>
                                                <p className="mt-1 text-sm">Prova a modificare i filtri di ricerca.</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

    

    